# Architecture — ntfy.sh Push Notifications (v3.1)

**Domain:** Family chore app, push notification integration
**Researched:** 2026-06-29
**Mode:** Architecture — integration points only (no re-architecture)
**Overall confidence:** HIGH — every integration point verified against source

## Executive Summary

ntfy.sh integration fits the existing service-layer pattern without introducing new architectural concepts. The work is one new service module (`ntfy.service.ts`), one schema column (`User.ntfyTopic`), one env var (`NTFY_BASE_URL`), three `await sendNtfy(...)` calls inside the services that already orchestrate the events, and one new section in `ProfilePage.tsx`. **No cron. No queue. No background workers.** "Due soon" piggybacks on the existing `GET /api/assignments` path that already runs `generateOccurrences` lazily — the due-soon sweep is one extra loop in that path that has a strict once-per-day de-dupe guard so it stays idempotent and cheap.

The 3 trigger points are unambiguous because they already exist as service functions: `assignment.service.create` (assigned), `assignment.service.getAll` (due-soon sweep, runs on fetch), and `assignment.service.complete` / `recurring.service.completeOccurrence` (completed). Service-to-service call is the only correct integration point — controllers are thin and must stay thin, and Prisma hooks would be invisible to tests.

Failure handling is "fire-and-forget" (background promise, never awaited, errors logged). This is correct for homelab: a 3-second ntfy timeout cannot block the parent's "create assignment" button. The whole notification subsystem is a single env var guard plus a per-user `ntfyTopic` null check — both are `if` statements, not a feature flag subsystem.

## Existing Architecture Recap

| Layer | Location | Role |
|---|---|---|
| Express routes | `backend/src/routes/*.routes.ts` | Thin HTTP handlers; delegate to services |
| Services | `backend/src/services/*.service.ts` | All business logic; orchestrate DB + side effects |
| Prisma client | `backend/src/config/prisma.ts` | Single shared client; `import 'dotenv/config'` at top |
| Env loading | `dotenv` via `import 'dotenv/config'` | Loaded at module import time, read via `process.env` |
| Schemas (Zod) | `backend/src/schemas/*.schema.ts` | Request body validation |
| Frontend API layer | `frontend/src/api/*.api.ts` | Axios; one file per domain; CSRF injected in `client.ts` |
| Frontend hooks | `frontend/src/hooks/use*.tsx` | React Query; auth in `useAuth.tsx` context |
| Frontend pages | `frontend/src/pages/*.tsx` | Lazy-loaded via `React.lazy()` |
| Lazy trigger precedent | `assignment.service.getAll` | Calls `generateOccurrences(from, to)` on every fetch |

**Key constraint to preserve:** services own all business logic. Routes never orchestrate side effects. Tests mock `prisma` at the `config/prisma` module boundary (see `backend/src/__tests__/services/assignment.service.test.ts:1-26`).

## Component Boundaries

| Component | Type | Responsibility | Communicates With |
|---|---|---|---|
| `ntfy.service.ts` | **NEW** | Build ntfy URL, POST notification, timeout, log failures | `process.env.NTFY_BASE_URL`; `fetch` (built-in) |
| `User.ntfyTopic` | **NEW FIELD** | Per-user topic string; nullable | `users.service.ts`, `auth.service.getCurrentUser` |
| `assignment.service.create` | **MODIFIED** | After create, fire `chore-assigned` to recipient's topic | `ntfy.service.sendNtfy` |
| `assignment.service.getAll` | **MODIFIED** | After `generateOccurrences`, sweep for due-today and fire `chore-due-soon` (deduped per-day per-assignment) | `ntfy.service.sendNtfy` |
| `assignment.service.complete` | **MODIFIED** | After commit, fire `chore-completed` to **all parents'** topics (not recipient) | `ntfy.service.sendNtfy` |
| `recurring.service.completeOccurrence` | **MODIFIED** | After commit, fire `chore-completed` to all parents' topics | `ntfy.service.sendNtfy` |
| `users.service.updateNtfyTopic` | **NEW** | Set/clear topic for current user (self-service) | `prisma.user.update` |
| `users.routes.ts` | **MODIFIED** | New `PUT /api/users/me/ntfy-topic` route | `users.service.updateNtfyTopic` |
| `users.api.ts` (frontend) | **MODIFIED** | Add `updateNtfyTopic(topic: string)` | Axios PUT |
| `useAuth.tsx` + `useUsers.tsx` | **MODIFIED** | Surface `ntfyTopic` in the User type / users list | React Query |
| `ProfilePage.tsx` | **MODIFIED** | New "Notifications" section with topic input + save | `usersApi.updateNtfyTopic` |
| `Dockerfile` (backend) | **UNCHANGED** | No new build deps (built-in `fetch`) | — |
| `.env.example` | **MODIFIED** | Replace legacy `NTFY_DEFAULT_*` block with single `NTFY_BASE_URL` line | — |

**No new packages required.** Node 20's built-in `fetch` covers HTTP. No `axios`, no `node-fetch`, no `p-retry`, no `bullmq`.

## Data Flow

### Event 1: chore-assigned

```
Parent clicks "Assign"
  → POST /api/assignments  (existing route)
  → validate(createAssignmentSchema)
  → assignment.service.create({ templateId, assignedToId, dueDate })
       → prisma.choreTemplate.findUnique
       → prisma.choreAssignment.create
       → ntfy.service.sendNtfy(                              ← NEW (fire-and-forget)
             topic: recipient.ntfyTopic,
             title: "New chore assigned",
             body:  "{template.title} due {dueDate}"
           )
  ← 201 response (notification promise NOT awaited)
```

`recipient.ntfyTopic` is fetched alongside the create via a single `prisma.user.findUnique({ where: { id: assignedToId }, select: { ntfyTopic: true } })` — added before the `choreAssignment.create`. One extra round-trip, but it keeps the notification accurate (a user could have changed their topic between the parent opening the form and submitting).

### Event 2: chore-due-soon (lazy, on fetch)

```
Any user opens app / refreshes chore list
  → GET /api/assignments  (existing route)
  → assignment.service.getAll(userId, role, from, to)
       → (existing) compute from/to date range
       → (existing) generateOccurrences(from, to)
       → prisma.choreAssignment.findMany
       → prisma.recurringOccurrence.findMany
       → notifyDueSoonIfNeeded(assignments, occurrences)     ← NEW

  notifyDueSoonIfNeeded:
    today = UTC date string
    candidates = [...assignments, ...occurrences].filter(
      a => a.status === 'PENDING'
        && toUtcDate(a.dueDate) === today
        && !a.dueSoonNotified                              ← NEW FIELD on both models
    )
    for each candidate:
       ntfy.service.sendNtfy(
         topic: candidate.assignedTo.ntfyTopic,
         title: "Chore due today",
         body:  candidate.template.title
       )
    prisma.choreAssignment.updateMany({ where: { id: { in: sentAssignmentIds } }, data: { dueSoonNotified: true } })
    prisma.recurringOccurrence.updateMany({ where: { id: { in: sentOccurrenceIds } }, data: { dueSoonNotified: true } })
```

**Why the `dueSoonNotified` boolean on the models** (not a separate `Notification` table): the v1-archive `Notification` model was retired in the rewrite. A boolean column per assignment is the simplest possible idempotency guard. It costs 1 byte per row, is set in the same service call that already has the row in hand, and self-clears if the user uncompletes-and-recompletes (set to `null` in `uncomplete`).

**Why "on every fetch" is OK** (and why "on app load" alone is wrong): the v1-rewrite uses lazy generation as a general principle (see `generateOccurrences` in `recurring.service.ts:76`). Adding a second lazy pass for due-soon is consistent. Filtering to today's date first means the candidate set is tiny (≤ N assignments where N = family size × max-daily-chores, typically <10). The `dueSoonNotified` boolean makes re-fetches cheap (most fetches find zero candidates). The de-dupe update runs in one `updateMany` call, not per-row.

**Why NOT on app load alone**: a family member who only opens the app at 8 PM and whose only chore is at 9 AM would never get a "due today" notification. Tying the trigger to "any chore fetch" (My Chores page, Calendar, Dashboard widget) catches every case. Dashboard, My Chores, and Calendar all already call `GET /api/assignments` — no new frontend endpoint needed.

### Event 3: chore-completed

```
Child clicks "Mark complete" (or parent on behalf)
  → POST /api/assignments/:id/complete  (existing route)
  → assignment.service.complete(assignmentId, userId)
       → prisma.choreAssignment.findUnique
       → prisma.$transaction:
            choreAssignment.update  (status: COMPLETED)
            pointLog.create         (EARNED)
       → prisma.user.findMany({                                    ← NEW
            where: { role: 'PARENT' },
            select: { id: true, ntfyTopic: true }
         })
       → for each parent:                                          ← NEW
            ntfy.service.sendNtfy(parent.ntfyTopic, ...)

  Same flow for recurring:
  → POST /api/occurrences/:id/complete
  → recurring.service.completeOccurrence(...)
       → (same pattern) → fire chore-completed to all parents
```

**Why "fire to all parents"** (not just the original assigner): either parent can be "on duty" for the day. The original assigner is unknown without a schema change; "all parents with topics" is a one-line `findMany` and fits the homelab model. If no parent has set a topic, the loop is a no-op.

## Patterns to Follow

### Pattern 1: Service-owned side effects, route stays thin

`ntfy.service.sendNtfy(topic, title, body)` is called from inside the service function, never from a route handler. Mirrors the existing `generateOccurrences` call inside `assignment.service.getAll` (line 42). The route's `try/catch/next(err)` chain never sees a notification failure.

### Pattern 2: Module-level env guard, not request-level

`ntfy.service.ts` reads `process.env.NTFY_BASE_URL` at module import time and exports `isNtfyConfigured: boolean`. Every call site does:

```typescript
import { isNtfyConfigured, sendNtfy } from './ntfy.service'
if (isNtfyConfigured) void sendNtfy(topic, title, body)
```

The `if` is one line and trivially mockable in tests by re-importing with a stubbed env. NOTIFY-05 ("log a warning once at startup") is implemented as a single `console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')` at the top of `ntfy.service.ts`, guarded by a module-level boolean so it runs exactly once per process.

### Pattern 3: Fire-and-forget via `void` prefix

```typescript
// Inside a service function, AFTER the DB commit:
void sendNtfy(topic, title, body)
```

`sendNtfy` returns `Promise<void>`, internally wraps `fetch` with a 3-second `AbortController.timeout()` and a `try/catch` that logs and swallows. The `void` keyword tells the reader and TypeScript "I know this is a promise, I'm deliberately not awaiting." The route returns its 201 response immediately; the notification lands 50ms–2s later.

**Alternative considered: `await sendNtfy(...)` in a `try { } catch { /* log */ }` block.** Rejected: adds 50ms–3s to every API response for a non-essential side effect. Also complicates the `complete` transaction's atomicity (the `prisma.$transaction` must complete before the notification fires either way).

### Pattern 4: Lazy trigger piggybacks on existing call sites

The "due soon" sweep is one extra function call inside `assignment.service.getAll` after the existing `generateOccurrences` call. No new routes, no new middleware, no new jobs. The lazy pattern is the explicit v1-rewrite decision (see PROJECT.md Key Decisions: "Lazy occurrence generation — no cron, generate on demand when viewing upcoming period"). Due-soon notifications extend that principle to "generate alerts on demand."

### Pattern 5: Per-row boolean for idempotency

`ChoreAssignment.dueSoonNotified Boolean @default(false)` and `RecurringOccurrence.dueSoonNotified Boolean @default(false)`. Set to `true` in the same call that fires the notification. Reset to `false` in `uncomplete` and `delete_(...)` (the latter is already a hard delete, so no reset needed). No separate `Notification` table, no foreign key cascade, no joins.

## The `ntfy.service.ts` Module

**Location:** `backend/src/services/ntfy.service.ts` (~60 lines including types)

```typescript
// Reads NTFY_BASE_URL at import time. Logs once if missing.
const BASE_URL = (process.env.NTFY_BASE_URL ?? '').replace(/\/$/, '')
export const isNtfyConfigured = BASE_URL.length > 0

if (!isNtfyConfigured) {
  console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')
}

export async function sendNtfy(
  topic: string | null,
  title: string,
  body: string,
  options: { tags?: string[]; priority?: 1|2|3|4|5 } = {}
): Promise<void> {
  if (!isNtfyConfigured || !topic) return
  const url = `${BASE_URL}/${encodeURIComponent(topic)}`
  const headers: Record<string, string> = {
    'Title': title,
    'Priority': String(options.priority ?? 3),
  }
  if (options.tags?.length) headers['Tags'] = options.tags.join(',')
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
    clearTimeout(timeout)
  } catch (err) {
    console.warn(`[ntfy] Failed to send "${title}": ${err instanceof Error ? err.message : String(err)}`)
  }
}
```

**Why no axios / node-fetch:** Node 20.20 is in the runtime (per `backend/package.json` engines + Docker base image), `fetch` is built-in, and the API needs exactly one HTTP verb (POST). Adding a dep would be the only dep added for this feature — not worth it.

**Why no retry:** ntfy is best-effort. A failed push is not worth a retry storm on a homelab. The user will see the chore in the app regardless.

**Why 3-second timeout:** ntfy is normally <100ms LAN. A 3s cap means a misconfigured ntfy server can never block the API by more than 3s. Since we `void` the promise, even that is invisible to the caller.

**Why `topic: string | null`:** callers don't have to null-check first. A parent who never set their topic gets `null` from the DB and the function early-returns. Reduces 5 caller sites' boilerplate to zero.

## Data Flow — Schema Changes

### Prisma schema additions

```prisma
model User {
  // ... existing fields ...
  ntfyTopic      String?    // NEW: optional per-user topic
  // ...
}

model ChoreAssignment {
  // ... existing fields ...
  dueSoonNotified Boolean   @default(false)  // NEW: idempotency for due-soon sweep
}

model RecurringOccurrence {
  // ... existing fields ...
  dueSoonNotified Boolean   @default(false)  // NEW: idempotency for due-soon sweep
}
```

**Migration:** `prisma db push` (the existing entrypoint runs this automatically on container start — see `backend/docker-entrypoint.sh`). No backfill needed: all three columns are nullable / default-false. Existing rows behave as if "never notified" — the next due-soon sweep picks them up once and sets the flag.

### `.env.example` change

Replace the legacy `NTFY_DEFAULT_*` block (lines 100–132 of current `.env.example`) with:

```bash
# ===========================================
# NTFY.SH PUSH NOTIFICATIONS
# ===========================================
# Server URL (no default — must be set in .env to enable).
# Public ntfy.sh: https://ntfy.sh
# Self-hosted:    https://ntfy.yourdomain.com
# LAN homelab:    http://192.168.1.100:8080
# Leave empty to disable all notifications (app works normally without them).
NTFY_BASE_URL=
```

No `NTFY_DEFAULT_TOPIC`, no per-event toggles, no quiet hours, no auth token. v3.1 is intentionally minimal — the v1-archive had 12 NTFY env vars (see `backend-v1-archive/.env.example:92-115`), and most were never read. The new model is "one URL + per-user topic = done."

## Failure Handling

| Failure | Behavior | Why |
|---|---|---|
| `NTFY_BASE_URL` empty | `isNtfyConfigured = false`; all `sendNtfy` calls early-return; warning logged at startup | NOTIFY-05: graceful degradation |
| `User.ntfyTopic` is `null` | `sendNtfy` early-returns on `!topic` | Per-user opt-out by simply not setting a topic |
| ntfy server unreachable | 3s `AbortController.timeout()`; caught + logged; API response unaffected | NOTIFY-06: never block the API |
| ntfy returns 4xx/5xx | Caught by the `try/catch`; logged; API response unaffected | Homelab, best-effort |
| ntfy succeeds after the assignment was already unassigned/deleted | Still sends — ntfy is fire-and-forget; the user just sees a "this chore was assigned" push that no longer exists in the app | Acceptable; race window is sub-second and rare |
| Same fetch fires "due soon" twice (user refreshes) | `dueSoonNotified` boolean prevents re-fire; `updateMany` is idempotent | Idempotency guarantee |

**No error webhooks, no retry queues, no dead-letter tables.** If ntfy is down, the family just doesn't get pushes that day. The chores still appear in the app when they open it.

## Test Patterns

### Unit tests (mock at service boundary, same as existing)

`backend/src/__tests__/services/ntfy.service.test.ts`:
- `isNtfyConfigured` is `false` when `process.env.NTFY_BASE_URL` is unset
- `isNtfyConfigured` is `true` when set; trailing slash stripped
- `sendNtfy` returns early when `topic` is `null`
- `sendNtfy` returns early when `isNtfyConfigured` is `false`
- `sendNtfy` calls `fetch` with the right URL, method, headers, body
- `sendNtfy` catches and logs fetch rejections (does not throw)
- `sendNtfy` catches `AbortError` after 3s

Mock `fetch` globally: `global.fetch = jest.fn()`. No `nock`, no `msw` — built-in `fetch` is one global, easy to spy.

### Integration tests for the modified services

`backend/src/__tests__/services/assignment.service.test.ts` (existing — extend):
- `create` calls `sendNtfy` with recipient's topic after creating the assignment
- `create` does NOT throw when `sendNtfy` rejects (notification failure is swallowed at the `ntfy.service` layer, so this test just verifies the call is `void`-prefixed — easiest check: assert `prisma.choreAssignment.create` is called and the function returns the assignment)
- `getAll` with assignments due today triggers `sendNtfy` exactly once per assignment, then sets `dueSoonNotified=true`
- `getAll` with assignments already `dueSoonNotified=true` does NOT re-fire
- `complete` fires `sendNtfy` to all parents' topics, not the recipient's
- `uncomplete` resets `dueSoonNotified` to `false`

Mock at the `ntfy.service` module boundary:
```typescript
jest.mock('../../services/ntfy.service', () => ({
  isNtfyConfigured: true,
  sendNtfy: jest.fn().mockResolvedValue(undefined),
}))
```

This pattern is exactly how `generateOccurrences` is already mocked in `assignment.service.test.ts:17-19` — same boundary, same shape.

### Route tests

`backend/src/routes/__tests__/users.routes.test.ts` (new) or extend existing: verify `PUT /api/users/me/ntfy-topic` accepts `{ ntfyTopic: string | null }` and returns the updated user.

### Frontend tests

`frontend/src/pages/__tests__/ProfilePage.test.tsx` (new): verify the ntfy topic input renders, accepts changes, calls `usersApi.updateNtfyTopic`, and shows success/error states following the same pattern as the existing color form (lines 74–88 of `ProfilePage.tsx`).

### E2E

`e2e/notifications.spec.ts` (new, optional): the docker-compose test environment cannot reach a real ntfy server. Skip this layer — unit + integration coverage is sufficient for "did the right code path fire."

## Anti-Patterns to Avoid

### Anti-Pattern 1: Cron job for "due soon"
**What:** Adding `node-cron` or `bullmq` to schedule daily due-soon sweeps.
**Why bad:** Violates the explicit v1-rewrite decision ("no cron"). Adds a new failure mode (cron doesn't run if container restarts at wrong time). Adds a dep. Adds 12+ lines of scheduler config.
**Instead:** The lazy sweep in `assignment.service.getAll` covers all real cases. Calendar, My Chores, and Dashboard all fetch assignments. A family who never opens the app doesn't need a notification they wouldn't see anyway.

### Anti-Pattern 2: Notification table + NotificationService with CRUD
**What:** Re-introducing the v1-archive `Notification` model with mark-as-read endpoints.
**Why bad:** In-app notification storage was explicitly removed in the v1-rewrite. The homelab use case is "push only" — if the user is in the app, they see the chore directly. A persistent in-app feed is a different feature.
**Instead:** Push-only. `dueSoonNotified` boolean on the chore itself is the only state we need.

### Anti-Pattern 3: Per-event feature flags
**What:** `NOTIFY_CHORE_ASSIGNED`, `NOTIFY_CHORE_DUE_SOON`, `NOTIFY_CHORE_COMPLETED` env vars (as the v1-archive had).
**Why bad:** NOTIFY-01..07 explicitly say "no preferences — all events fire." Feature flags are a different feature; they add 9 env vars and a settings UI for no current value.
**Instead:** Single `NTFY_BASE_URL` env var (on/off for the whole subsystem) + per-user `ntfyTopic` (per-recipient opt-out). Two controls, not ten.

### Anti-Pattern 4: Awaiting notifications in request handlers
**What:** `const result = await sendNtfy(...); return result` style.
**Why bad:** Adds 50ms–3s to every API call. Surfaces ntfy failures as 500 errors to the user. Couples ntfy availability to chore functionality.
**Instead:** `void sendNtfy(...)` — fire and forget, errors swallowed in the service. Same pattern as `console.log` for request logs (best-effort, never blocking).

### Anti-Pattern 5: Putting sendNtfy calls in controllers
**What:** Route handler calls `ntfy.service.sendNtfy` after `await assignmentService.create(...)`.
**Why bad:** Violates the "controllers are thin" pattern (every existing route handler is 4–6 lines). Makes notification testing depend on HTTP layer.
**Instead:** Call from inside the service. The route stays 4–6 lines; tests mock the service, not the route.

### Anti-Pattern 6: New `UserNotificationSettings` model
**What:** Separate model with ntfy settings, quiet hours, reminder hours, etc. (as the v1-archive had).
**Why bad:** v1-rewrite explicitly collapsed the user settings model. The v3.1 design is "topic is the only setting." A separate model invites feature creep.
**Instead:** One nullable `String` column on `User`.

## Build Order

The order is forced by data dependencies. Each phase has explicit "depends on" and "produces" notes for the planner.

### Phase 1: Foundation (env + service module + schema)
**Goal:** The `sendNtfy` function works in isolation; missing config is silent; tests pass.
**Depends on:** Nothing.
**Produces:** `backend/src/services/ntfy.service.ts`, `backend/src/__tests__/services/ntfy.service.test.ts`, updated `.env.example`.
**Rationale:** Zero blast radius. Can be merged and deployed without affecting any user-visible behavior. NOTIFY-05 satisfied.

### Phase 2: Schema + User topic field
**Goal:** `User.ntfyTopic` exists, is mutable via a route, surfaces in the auth/users responses.
**Depends on:** Phase 1 (service module must exist for callers to wire up).
**Produces:**
- `prisma/schema.prisma` — add `ntfyTopic String?` to `User`, `dueSoonNotified Boolean @default(false)` to `ChoreAssignment` and `RecurringOccurrence`
- `db push` (auto on container start)
- `users.service.updateNtfyTopic(userId, topic | null)` — new function
- `users.routes.ts` — new `PUT /api/users/me/ntfy-topic` route
- `frontend/src/api/users.api.ts` — add `updateNtfyTopic`
- `frontend/src/hooks/useAuth.tsx` + `useUsers.tsx` — surface the field (mostly type updates)
**Rationale:** The User model change must land BEFORE the assignment/complete code starts reading `ntfyTopic`, or the field is undefined. Phase 1 is independent because the service is pure functions of env + topic string; no User field needed yet.

### Phase 3: Wire up `assignment.service.create` → chore-assigned
**Goal:** Creating an assignment fires a push to the recipient's topic. Failure does not block.
**Depends on:** Phase 1 (service module), Phase 2 (User.ntfyTopic field).
**Produces:**
- `assignment.service.create` — add `prisma.user.findUnique` to fetch topic + `void sendNtfy(...)` after the create
- Tests in `assignment.service.test.ts` — assert `sendNtfy` called once with the right args; assert no throw when `sendNtfy` rejects
**Rationale:** First end-to-end smoke test of the integration. Lowest-risk event (fires once, on a parent action). NOTIFY-02 satisfied.

### Phase 4: Wire up `complete` + `completeOccurrence` → chore-completed
**Goal:** Completing a chore fires pushes to all parents with topics. Two completion paths covered.
**Depends on:** Phase 3 (same call pattern; ntfy service is proven).
**Produces:**
- `assignment.service.complete` — add `prisma.user.findMany({ where: { role: 'PARENT' } })` + loop of `void sendNtfy(...)`
- `recurring.service.completeOccurrence` — same pattern
- Tests for both services
**Rationale:** Same `void sendNtfy` pattern, just different recipient selection. NOTIFY-04 satisfied.

### Phase 5: Wire up "due soon" lazy sweep in `getAll`
**Goal:** Fetching assignments once per day-per-assignment fires a "due today" push.
**Depends on:** Phase 2 (the `dueSoonNotified` boolean columns from Phase 2), Phase 4 (the call pattern is proven).
**Produces:**
- `assignment.service.getAll` — new internal `notifyDueSoonIfNeeded(assignments, occurrences, occurrencesInDateRange)` after `generateOccurrences`
- `assignment.service.uncomplete` — reset `dueSoonNotified = false`
- Tests: due-soon fires for today's assignments, does not re-fire, respects `dueSoonNotified` flag
**Rationale:** Most complex of the three events (idempotency, two row types, lazy trigger). Putting it last lets the simpler events validate the ntfy module first. NOTIFY-03 + NOTIFY-07 satisfied.

### Phase 6: Frontend Profile UI
**Goal:** User can set their ntfy topic from the Profile page.
**Depends on:** Phase 2 (route + service function must exist).
**Produces:**
- `frontend/src/pages/ProfilePage.tsx` — new "Notifications" section (input + Save button), following the same form pattern as the color form (lines 141–154)
- Frontend test for the form
**Rationale:** No new logic; pure UI. Can ship in parallel with backend phases 3–5 if the route is in place, but conventionally lives after the backend is proven. NOTIFY-01 satisfied.

### Phase 7: E2E smoke (optional, low priority)
**Goal:** A Playwright spec that hits the running app, sets a topic via the UI, and asserts the request was made (via `route` interception stubbing ntfy.sh).
**Depends on:** Phases 1–6.

### Why this order
- Phase 1 is zero-blast-radius — can be merged independently and reverted without touching any user data.
- Phase 2 introduces the schema; must land before any code reads the new column.
- Phases 3–4–5 are independent events sharing the same `void sendNtfy` pattern; ordering by complexity (assigned → completed → due-soon) means each phase reuses the previous one's testing approach.
- Phase 6 (frontend) is pure UI over Phase 2's route.
- No new architectural patterns introduced; every phase is a small, well-isolated change.

## Scalability Considerations

| Concern | At 4 users | At 10 users | At 40 users |
|---|---|---|---|
| ntfy HTTP latency on parent API call | <1% (10–100ms LAN) | <1% | n/a (out of scope — 4-user homelab) |
| `findMany({role: 'PARENT'})` in `complete` | 1–2 rows | 1–2 rows | n/a |
| Due-soon sweep in `getAll` | ≤ 10 candidates filtered to today | same | n/a |
| `updateMany` for `dueSoonNotified` | 1 query for the whole batch | same | n/a |
| Build artifacts | No change (no new deps) | same | same |

**Bottleneck analysis:** the only synchronous cost added to API calls is the `prisma.user.findUnique` for the topic on `create` (one extra round-trip). All HTTP to ntfy is `void` (no latency). The `updateMany` for `dueSoonNotified` runs only on a fetch that found un-notified due-today rows, which is rare (once per day per chore). All comfortably within the homelab scale.

## Migration / Rollout Notes

- `prisma db push` runs automatically on container start (existing behavior, see `backend/docker-entrypoint.sh`). No manual migration step.
- Existing rows get `ntfyTopic = null` and `dueSoonNotified = false` by default. Old assignments will be picked up by the next due-soon sweep and the assignment will be notified once, then flagged. Acceptable; matches the v1-rewrite "lazy generation works on existing data" precedent (`recurring.service.generateOccurrences` operates on existing `RecurringChore` rows with no backfill).
- Feature is opt-in per family: set `NTFY_BASE_URL` in `.env` and each user sets their topic in their profile. Both are required to actually receive pushes.
- Feature is fully off when `NTFY_BASE_URL` is empty: no warning in logs after the startup line, no API errors, no behavior change for any existing route.

## Sources

- `backend/src/services/assignment.service.ts` (existing service pattern reference)
- `backend/src/services/recurring.service.ts` (lazy generation precedent)
- `backend/src/services/users.service.ts` (user update pattern)
- `backend/src/routes/assignments.routes.ts` (thin controller pattern)
- `backend/src/routes/users.routes.ts` (self-service `PUT /me/...` pattern)
- `backend/prisma/schema.prisma` (current model)
- `backend/src/__tests__/services/assignment.service.test.ts:1-26` (mock-at-prisma pattern)
- `frontend/src/pages/ProfilePage.tsx:74-88, 141-154` (color form pattern to mirror)
- `frontend/src/api/users.api.ts:45-48` (`updateColor` pattern to mirror)
- `.planning/PROJECT.md` (NOTIFY-01..07 requirements, v1-rewrite Key Decisions)
- `.planning/research/PITFALLS.md` (existing pitfalls, esp. lazy-generation rationale)
- `backend-v1-archive/src/services/notificationService.ts` (previous implementation for comparison — confirms the simplification is intentional)
- `docs/archive/ntfy-integration-plan.md` (v1 design doc — explicit list of features dropped for v3.1: separate settings model, quiet hours, reminder scheduling, per-event toggles, auth tokens)
