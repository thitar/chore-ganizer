# Technology Stack: ntfy.sh Push Notifications (v3.1)

**Project:** Chore-Ganizer
**Researched:** 2026-06-29
**Research mode:** Project Research — STACK only (existing app, adding ntfy.sh integration)
**Scale target:** 4-user homelab, single instance, low frequency (≤ dozens of events/day)

---

## TL;DR — The Recommendation

**Add zero new npm dependencies.** Use Node's built-in `fetch` + `AbortSignal.timeout()` behind a thin `services/notification.service.ts` module. Add one nullable column (`ntfyTopic`) to the `User` table. Read a single new env var `NTFY_BASE_URL` (no default) from a new `config/notifications.ts` that mirrors the existing `config/prisma.ts` pattern.

| Question | Answer |
|---|---|
| HTTP client | **Native `fetch`** (Node 18+, already available) |
| ntfy SDK | **None** — call the HTTP API directly |
| New dependencies | **0** packages |
| DB schema | Add `ntfyTopic String?` to `User` |
| Env vars | Add `NTFY_BASE_URL` (no default) |
| Logger | Reuse `console.warn` (matches existing log style) |
| Job queue / cron | **None** — lazy trigger on app load + on-demand endpoint |
| Retry / persistence | **None** — best-effort fire-and-forget |

---

## Existing Stack (do not re-research; verified from `backend/package.json` and `AGENTS.md`)

| Layer | Current | Verified |
|---|---|---|
| Runtime | Node 18+ required (AGENTS.md) | ✓ |
| Backend framework | Express 4.18 + TypeScript 5.3 | ✓ `backend/package.json` |
| ORM | Prisma 5.22 + SQLite | ✓ `backend/prisma/schema.prisma` |
| Auth | express-session + bcrypt + CSRF | ✓ `backend/src/middleware/` |
| Frontend | React 18 + Vite + Tailwind, axios | ✓ `frontend/src/api/*.api.ts` |
| Config pattern | `dotenv/config` imported once in `config/prisma.ts`; `process.env.X` read directly elsewhere | ✓ `backend/src/config/prisma.ts`, `app.ts` |
| Service pattern | Pure functions in `services/*.service.ts`; routes are thin HTTP wrappers | ✓ `backend/src/services/assignment.service.ts` |
| Validation | Zod 4.4 in `schemas/`, called via `validate()` middleware | ✓ `backend/src/schemas/` |
| Test stack | Jest 30 + supertest for backend; Vitest for frontend | ✓ `backend/package.json` |

---

## New Stack Additions (this milestone only)

### 1. HTTP client — **Native `fetch` (no new package)**

| | |
|---|---|
| Source | Node built-in (`globalThis.fetch`) |
| Verified in | `nodejs.org/docs/latest-v20.x/api/globals.html#fetch` (stable since v21, available since v18 behind no flag in v18.0.0+) |
| TypeScript types | `RequestInit`, `Response`, `AbortController`, `AbortSignal.timeout()` all in `@types/node ^20.10.6` (already in `devDependencies`) |
| Backing impl | `undici` (bundled with Node) — no need to install separately |

**Why native fetch, not the alternatives:**

- **`axios` (backend)** — backend has zero `axios` imports; adding it for one POST is the definition of over-engineering. (`axios` belongs on the frontend where it's already used.)
- **`node-fetch`** — deprecated since 2022; upstream literally tells you to use native `fetch`. Adding a deprecated dep for nothing is wrong.
- **`undici` direct** — it's already running under `fetch`. Importing it directly skips zero abstraction and exposes more API surface than we need.
- **`ntfy` npm package v1.15.3** (by `ffflorian`) — checked the npm registry: this is a personal monorepo package, **GPL-3.0** licensed, ESM-only, requires `node >= 21` (this project runs on Node 18–20), single maintainer. The ntfy.sh project itself does **not** ship or recommend a Node SDK — their official docs (`docs.ntfy.sh/publish/`) show a vanilla `fetch()` call in the JavaScript example. The SDK adds licensing risk, Node-version lockout, and a dependency to maintain for what is a 5-line HTTP call.

**Timeout / cancellation:**

```typescript
// Node 17.3+ — works on Node 18+ which is the project floor
const signal = AbortSignal.timeout(5000) // 5s
await fetch(url, { method: 'POST', body, headers, signal })
```

On abort, `fetch` throws `DOMException` (name: `TimeoutError`). Catch and log — never propagate to the caller (notifications are best-effort).

### 2. Notification service — **`backend/src/services/notification.service.ts`** (new)

Single file, ~60 lines, pure functions, no class. Follows the existing `services/*.service.ts` shape (compare to `assignment.service.ts`).

```typescript
// Shape only — final code in implementation phase
import { getNtfyConfig } from '../config/notifications'

const TOPIC_RE = /^[-_A-Za-z0-9]{1,64}$/

export async function sendNtfy(
  topic: string,
  message: string,
  opts: { title?: string; priority?: 1|2|3|4|5; tags?: string[]; click?: string } = {}
): Promise<void> {
  const cfg = getNtfyConfig()
  if (!cfg.enabled) return              // graceful degradation
  if (!TOPIC_RE.test(topic)) return     // malformed topic → drop

  const headers: Record<string, string> = { 'Content-Type': 'text/plain' }
  if (opts.title)    headers['Title']    = opts.title
  if (opts.priority) headers['Priority'] = String(opts.priority)
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.click)    headers['Click']    = opts.click

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/${topic}`, {
      method: 'POST',
      body: message,
      headers,
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.warn(`[ntfy] non-2xx ${res.status} for topic ${topic}`)
  } catch (err) {
    console.warn(`[ntfy] send failed for topic ${topic}:`, err instanceof Error ? err.message : err)
  }
}

// Domain wrappers — typed, single-purpose, fire-and-forget
export function notifyChoreAssigned(assignment: { assignedTo: { ntfyTopic: string|null }, template: { title: string } }): void {
  void sendNtfy(assignment.assignedTo.ntfyTopic ?? '', `New chore: ${assignment.template.title}`, { title: 'Chore-Ganizer', tags: ['broom'], priority: 3 })
}
// notifyChoreCompleted, notifyChoreDueSoon — same pattern
```

**Key design choices:**

- **`void` in front of the call** — fire-and-forget. The route handler returns immediately; the notification POST happens in the background. This avoids blocking `POST /api/assignments` on a slow ntfy server.
- **No `throw` from the service** — caller never needs `try/catch`. Matches the philosophy that notifications are observability, not critical path.
- **Topic validation client-side** — ntfy enforces `[-_A-Za-z0-9]{1,64}` server-side; we mirror the regex so a malformed topic from a stale user record doesn't waste an HTTP call.
- **Single `getNtfyConfig()` call per send** — keeps the env var read cheap and makes the no-op fast path obvious.

### 3. Config — **`backend/src/config/notifications.ts`** (new)

Mirrors `config/prisma.ts` exactly (which is the project's config pattern).

```typescript
import 'dotenv/config'

const BASE_URL = process.env.NTFY_BASE_URL?.trim() || ''

export interface NtfyConfig {
  enabled: boolean       // true iff NTFY_BASE_URL is set
  baseUrl: string
}

export function getNtfyConfig(): NtfyConfig {
  return { enabled: BASE_URL.length > 0, baseUrl: BASE_URL }
}
```

**Why a separate file (not inline in the service):**

- Testability: `getNtfyConfig` is one indirection that unit tests can mock or extend later.
- Single source of truth: only this file reads `process.env.NTFY_BASE_URL`. `app.ts` does NOT read it directly (it doesn't need to — the service handles enabled/disabled).
- Matches `config/prisma.ts` precedent.

**`.env.example` changes** (only if `.env.example` is updated as part of this work):

```diff
- NTFY_DEFAULT_SERVER_URL=https://ntfy.sh
- NTFY_DEFAULT_TOPIC=
- NTFY_DEFAULT_NOTIFY_CHORE_ASSIGNED=true
- NTFY_DEFAULT_NOTIFY_CHORE_DUE_SOON=true
- NTFY_DEFAULT_NOTIFY_CHORE_COMPLETED=true
- NTFY_DEFAULT_NOTIFY_CHORE_OVERDUE=true
- NTFY_DEFAULT_NOTIFY_POINTS_EARNED=true
- NTFY_DEFAULT_REMINDER_HOURS=2
- NTFY_DEFAULT_QUIET_HOURS_START=
- NTFY_DEFAULT_QUIET_HOURS_END=
+ # ntfy.sh self-hosted push notifications (optional)
+ # Leave blank to disable notifications. Example: https://ntfy.sh or http://ntfy.local:2586
+ NTFY_BASE_URL=
```

(The existing `NTFY_DEFAULT_*` envs in `.env.example` are v2-era leftovers — the v3.1 scope replaces them entirely with the simpler per-user topic model. If the user wants to keep the envs as a fallback, that's a FEATURES decision — see `FEATURES.md`.)

### 4. Database schema — **add `ntfyTopic String?` to `User`**

In `backend/prisma/schema.prisma`:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  role      String   @default("CHILD")
  color     String   @default("#3B82F6")
+ ntfyTopic String?                                    // NEW
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ... relations unchanged
}
```

**Why nullable:** users without a configured topic just don't get notifications. `null` = "no notifications" — no magic empty-string behavior. Clear semantics.

**Migration:** `prisma db push` runs automatically on container start (per AGENTS.md, `docker-entrypoint.sh` runs `prisma db push` before seeding). No manual migration step.

**Type / service exposure:**

- `auth.service.getCurrentUser()` — already returns all User fields. Add `ntfyTopic` to the `select` (it already returns the whole user minus password; just need to keep the field).
- `users.service.updateColor` pattern — new `users.service.updateNtfyTopic(userId, topic)`:
  - Validation: match `TOPIC_RE` or empty string → `null`
  - Trim whitespace
  - Return updated user
- `users.routes.ts` — new `PUT /api/users/me/ntfy-topic` (any authenticated user can edit their own)
- Zod schema in `schemas/users.schema.ts` for the body

### 5. Frontend — **edit `ProfilePage.tsx` + `users.api.ts`**

- `frontend/src/api/users.api.ts` — add `updateNtfyTopic(topic: string)` mirroring `updateColor` (axios PUT, returns `UserWithEmail`).
- `frontend/src/pages/ProfilePage.tsx` — add a third form **"Push Notifications"** below the Color form, same pattern (state, submit, success/error message, 3s timeout, `queryClient.invalidateQueries({ queryKey: ['auth','me'] })` on success).
- Input: `<input type="text">` with placeholder `e.g. chores-alice-3f9b` and helper text linking to `https://ntfy.sh` install instructions. Optional field (empty = disabled).

**No new frontend dependencies.** React, axios, `@tanstack/react-query` already cover this.

### 6. Integration points — where `notifyXxx` gets called

| Service / route | Event | Call site |
|---|---|---|
| `assignment.service.create()` | chore assigned | after `prisma.choreAssignment.create()` returns, before return |
| `assignment.service.complete()` | chore completed (one-off) | after the `prisma.$transaction` resolves |
| `recurring.service.completeOccurrence()` | chore completed (recurring) | after the `prisma.$transaction` resolves |
| `auth.service.getCurrentUser()` (or a new lightweight endpoint) | lazy "due soon" | after the user lookup, fire due-soon notifier (see below) |
| New `POST /api/notifications/check-due-soon` (parent-only, authorize('PARENT')) | explicit on-demand | one route + one service function |

**Lazy "due soon" semantics** (per the milestone scope — no cron):

- "Due soon" = `dueDate` is today (UTC date string match against the Date type already in the schema).
- On app load: piggyback on `GET /api/auth/me` (called by `useAuth` on every page load). The server checks the requesting user's `ntfyTopic`, finds pending chores due today for that user, fires a single digest notification ("You have 3 chores due today: …"). Idempotent: include a stable `Tags` value with today's date so the ntfy dedup-up logic can collapse repeats.
- On demand: `POST /api/notifications/check-due-soon` (parent-only) — walks all children and fires for each child who has a topic set and pending-due-today chores. Useful when a parent wants to nudge everyone at 5pm without waiting for someone to load the app.
- A small in-memory or per-process "last sent at" cache (Map keyed by `${userId}:${dateStr}`) prevents spamming the same user 10 times if they reload the page 10 times. This is **not** a DB table — just a module-level `Map` in `notification.service.ts`. Resets on container restart, which is fine.

### 7. ntfy API headers used (verified from `docs.ntfy.sh/publish/`)

| Header | Use in this app | Example |
|---|---|---|
| `Title` | App name | `Chore-Ganizer` |
| `Priority` | `3` (default) for assigned/completed, `4` (high) for due soon | `4` |
| `Tags` | Emoji shortcodes for visual cue | `broom` (assigned), `tada` (completed), `loudspeaker` (due soon) |
| `Click` | Deep link to chore detail (frontend route) | `https://chore-ganizer.local/chores/123` |
| `Authorization` | **Only if** self-hosted ntfy requires it (out of scope — defer to a future milestone) | `Bearer tk_…` |
| Body | Plain text message | `New chore: Take out trash (10 pts)` |

**Priority and Tag values are NOT validated client-side by ntfy** — unknown values are accepted silently. Stick to documented emoji shortcodes from `docs.ntfy.sh/emojis/` for Tags.

### 8. Tests (extend existing patterns — no new test framework)

- **Unit** (`backend/src/__tests__/services/notification.service.test.ts`): mock `getNtfyConfig` and global `fetch` (use `vi`-style `jest.fn()` like the existing `users.service.test.ts` mocks Prisma).
- **Integration** (`backend/src/__tests__/notifications.test.ts`): the existing integration test infra (`jest.integration.config.js`, `test-db/integration-test.db`) is reused. Add a route test for `PUT /me/ntfy-topic` (validation, persistence, auth).
- **E2E** (optional, `e2e/notifications.spec.ts`): a Playwright test that walks through setting a topic in Profile and verifies the in-memory "due soon" map is populated. Existing Playwright infra at `playwright.config.ts` covers this.

---

## What NOT to Add (rationale for each rejection)

| Considered | Verdict | Why not |
|---|---|---|
| `ntfy` npm package (v1.15.3) | ❌ Reject | GPL-3.0 license; ESM-only; `node>=21` required (project runs 18+); single-maintainer monorepo; the upstream ntfy project itself doesn't recommend it. |
| `axios` (backend) | ❌ Reject | Frontend already uses it; backend has zero axios. One `fetch` call doesn't justify adding a 500KB dep. |
| `node-fetch` | ❌ Reject | Deprecated by upstream in 2022. The maintainer says "use Node's built-in fetch." |
| `undici` (direct) | ❌ Reject | Already bundled with Node 20+; you only need to import it directly if you want a custom dispatcher or Agent. We don't. |
| `bull` / `bullmq` (job queue) | ❌ Reject | Over-engineered for fire-and-forget HTTP POSTs at 4-user scale. Adds Redis dependency. Out of scope. |
| `node-cron` / `cron` | ❌ Reject | Explicitly excluded by milestone scope ("no cron, lazy trigger on app load + on demand"). |
| `nodemailer` (SMTP) | ❌ Reject | Explicitly excluded by milestone scope ("No email, no in-app notifications"). |
| `pino` / `winston` | ❌ Reject | `console.warn` is the existing log convention. The app already uses it; adding a logger is scope creep. |
| `nanoid` / `uuid` for topic generation | ❌ Reject | Topics are user-chosen (per ntfy convention: "topic is essentially a password"). Don't auto-generate. |
| `helmet` policy changes for outgoing fetch | ❌ N/A | Helmet governs HTTP **response** headers from Express, not outbound requests. No conflict. |
| New DB table `Notification` | ❌ Reject | Explicitly excluded ("No in-app notifications"). ntfy is the only store. |
| New DB table `UserNotificationPreference` | ❌ Reject | Explicitly excluded ("No per-event preferences — all events fire when applicable"). |
| WebSocket / SSE server for browser push | ❌ Reject | ntfy handles browser push via its own web app. Backend doesn't need to push to the browser. |
| Retry library (`async-retry`, `p-retry`) | ❌ Reject | ntfy.sh has built-in idempotency via `Tags` for dedup. Manual retry for a 4-user homelab adds complexity for negligible value. If the homelab ntfy is down, the next event will succeed; a missed notification isn't catastrophic. |
| New env vars for per-event toggles | ❌ Reject | Explicitly excluded. Single boolean: "NTFY_BASE_URL set" = notifications on. |

---

## Alternatives Considered (comparison matrix)

| HTTP client choice | Lines of code | New deps | License risk | TypeScript support | Verdict |
|---|---|---|---|---|---|
| **Native `fetch` (recommended)** | ~5 | 0 | none | full via @types/node | ✅ use this |
| `ntfy` npm package | ~3 (call site) | 1 (with GPL-3.0) | GPL-3.0 | yes | ❌ |
| `axios` | ~4 | 1 (MIT) | none | yes | ❌ redundant with existing frontend usage |
| `node-fetch` | ~5 | 1 (MIT) | none | @types/node-fetch needed | ❌ deprecated |
| `undici` direct | ~6 | 0 (bundled) | none | yes | ⚠ works but exposes more than needed |
| `got` | ~4 | 1 (MIT) | none | yes | ❌ yet another dep for one POST |

---

## Versions Verified (as of 2026-06-29)

| Item | Version | Source |
|---|---|---|
| Node.js fetch stability | stable in v21.0.0, available in v18.0.0+ | `nodejs.org/docs/latest-v20.x/api/globals.html#fetch` |
| `AbortSignal.timeout()` | v17.3.0 / v16.14.0 | `nodejs.org` globals docs |
| `ntfy` npm package (NOT recommended) | 1.15.3 | `registry.npmjs.org/ntfy/latest` |
| `@types/node` (already installed) | ^20.10.6 | `backend/package.json` |
| `prisma` / `@prisma/client` (already installed) | ^5.22.0 | `backend/package.json` |
| `typescript` (already installed) | ^5.3.3 | `backend/package.json` |

No new versions to track for this milestone.

---

## Summary for the roadmap

**Stack delta for v3.1 ntfy integration = zero npm packages, one nullable column, one env var, one new service file, one new config file, one new endpoint (on-demand), one new form on ProfilePage.**

That's it. No new transitive dependencies, no new build steps, no new test framework, no license review needed. The 4-user homelab use case doesn't justify any more.
