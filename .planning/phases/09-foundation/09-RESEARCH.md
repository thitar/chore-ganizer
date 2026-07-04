# Phase 9: Foundation - Research

**Researched:** 2026-06-29
**Domain:** Backend notification infrastructure (ntfy.sh HTTP API integration)
**Confidence:** HIGH

## Summary

Phase 9 establishes the notification transport layer for Chore-Ganizer v3.1. The work is intentionally "boring" — zero new npm packages, zero user-visible behavior changes, zero API changes. The phase creates three new files (`notification.service.ts`, `notification.formatters.ts`, `config/notifications.ts`), updates the Prisma schema with 3 nullable columns, and adds one env var to `.env.example`. The 3 domain wrappers (`notifyChoreAssigned`, `notifyChoreDueSoon`, `notifyChoreCompleted`) are exported but not imported by any service yet — first consumers land in Phases 11–13.

**Primary recommendation:** Use native `fetch` + `AbortSignal.timeout(3000)` with fire-and-forget `void` pattern. No new dependencies. Mirror the existing `config/prisma.ts` + `services/*.service.ts` patterns exactly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `backend/src/services/notification.service.ts` exports `isNtfyConfigured` + `sendNtfy(topic, title, body, opts)` **plus** the 3 domain wrappers `notifyChoreAssigned`, `notifyChoreDueSoon`, `notifyChoreCompleted`. Phases 11–13 become one-liners at the call site (`void notifyChoreAssigned(newAssignment)`); Phase 9 owns the priority/tags/body format choices.
- **D-02:** Split the notification code into two files:
  - `backend/src/services/notification.service.ts` — transport only: env check, `fetch` call, `AbortSignal.timeout(3000)`, fire-and-forget + internal catch.
  - `backend/src/services/notification.formatters.ts` — pure functions returning `{ title, body, priority, tags, click }` per event. No side effects, no env reads, easily unit-testable in isolation.
- **D-03:** Each domain wrapper accepts a **full Prisma object with the includes it needs pre-resolved** (e.g., `ChoreAssignment & { template: { title: string }, assignedTo: { ntfyTopic: string | null } }`). Matches the existing `recurring.service.completeOccurrence` style — caller does the include, the wrapper consumes it.
- **D-04:** Mock `fetch` in `notification.service.test.ts` with `jest.spyOn(global, 'fetch')` and `mockResolvedValue(mockResponse)`. Relies on the existing `clearMocks: true` in `backend/jest.config.js`. `sendNtfy` and the 3 wrappers are tested in the same file; `formatters` are tested separately in `notification.formatters.test.ts` as pure functions.

### the agent's Discretion

- **Log prefix:** Use `[ntfy]` consistently (per research/PITFALLS.md examples).
- **`NTFY_BASE_URL` trailing slash:** Normalize internally (strip trailing `/` before composing the topic URL) so `.env` authors can write either form.
- **Module-load warning:** Read `process.env.NTFY_BASE_URL` at module top-level and log the single warning at import time, not from a separate `init()` call.
- **`formatters.ts` exports shape:** 3 named functions (`assignedBody(a)`, `dueSoonBody(a)`, `completedBody(a, parents)`), one per event, matching the 3 wrappers.

### Deferred Ideas (OUT OF SCOPE)

- Per-user `ntfyBaseUrl` override
- Per-event notification toggles
- Email / Slack / Discord fallback channels
- In-app notification center
- Quiet hours
- Test-from-settings button
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIFY-01 | User can set their own ntfy topic; topic must be 12-64 chars `[A-Za-z0-9_-]` and unique across users | Schema column `User.ntfyTopic String? @unique` added in Phase 9; route + UI in Phase 10 |
| NOTIFY-05 | `NTFY_BASE_URL` env var configures ntfy server; missing/empty disables notifications globally (warning logged once at startup) | `config/notifications.ts` reads env at module load; `notification.service.ts` exports `isNtfyConfigured` |
| NOTIFY-06 | Notification delivery failures are caught and logged; never block the API response | `sendNtfy` wraps fetch in try/catch with `AbortSignal.timeout(3000)`; fire-and-forget `void` pattern |
| NOTIFY-08 | Notification body contains chore summary but never user name (lock-screen privacy); tap opens `/chores/{id}` | `notification.formatters.ts` produces body without names; Click header uses relative path `/chores/{id}` |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HTTP transport (POST to ntfy) | Backend Service | — | `notification.service.ts` owns the fetch call, timeout, error handling |
| Notification formatting (title, body, tags) | Backend Service | — | `notification.formatters.ts` pure functions, no side effects |
| Env var configuration | Backend Config | — | `config/notifications.ts` reads `NTFY_BASE_URL` at module load |
| Schema migration (3 nullable columns) | Database | — | Prisma schema + `prisma db push` on container start |
| Graceful degradation (no-op when unconfigured) | Backend Service | — | `isNtfyConfigured` flag + `sendNtfy` early-return |
| Fire-and-forget pattern | Backend Service | — | `void sendNtfy(...)` at call sites (Phases 11–13) |

## Standard Stack

### Core (no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `fetch` | Node 18+ built-in | HTTP POST to ntfy server | Zero deps; `undici` bundled under the hood; `AbortSignal.timeout()` available since Node 17.3 |
| `AbortSignal.timeout()` | Node 17.3+ built-in | 3-second request timeout | Prevents hang on unreachable ntfy; LAN ntfy responds in <100ms |
| `console.warn` | Node built-in | Startup warning when `NTFY_BASE_URL` unset | Matches existing log convention; no pino/winston needed |
| Jest 30 | Already in `devDependencies` | Unit testing | Existing test framework; `clearMocks: true` resets spies between tests |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Prisma 5.22 | `^5.22.0` | ORM for schema migration | `prisma db push` applies 3 new nullable columns |
| TypeScript 5.3 | `^5.3.3` | Type safety | Wrapper signatures use Prisma includes types |
| Zod 4.4 | Already in deps | Topic format validation | Phase 10 route validates `^[-_A-Za-z0-9]{12,64}$` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` | `ntfy` npm pkg | GPL-3.0 license, ESM-only, `node>=21` required, single maintainer — rejected [CITED: docs.ntfy.sh/publish/] |
| Native `fetch` | `axios` (backend) | Backend has zero axios imports; one POST doesn't justify 500KB dep |
| Native `fetch` | `node-fetch` | Deprecated since 2022; upstream says "use native fetch" |
| `console.warn` | `pino` / `winston` | Existing log convention is `console.warn`; adding a logger is scope creep |

**Installation:** None — zero new npm packages.

## Package Legitimacy Audit

> **Not applicable** — Phase 9 installs zero new npm packages. All functionality uses Node built-ins and already-installed dependencies.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 9: Foundation                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  config/notifications.ts                                     │
│  ┌─────────────────────────────────────┐                    │
│  │ import 'dotenv/config'              │                    │
│  │ const BASE_URL = process.env...     │──→ isNtfyConfigured│
│  │ export getNtfyConfig()              │                    │
│  └─────────────────────────────────────┘                    │
│           │                                                  │
│           ▼                                                  │
│  services/notification.service.ts                            │
│  ┌─────────────────────────────────────┐                    │
│  │ isNtfyConfigured (module-level)     │                    │
│  │ sendNtfy(topic, title, body, opts)  │──→ fetch POST     │
│  │   └─ AbortSignal.timeout(3000)      │    to ntfy server │
│  │   └─ try/catch (never throws)       │                    │
│  │ notifyChoreAssigned(assignment)     │                    │
│  │ notifyChoreDueSoon(assignment)      │                    │
│  │ notifyChoreCompleted(assignment)    │                    │
│  └─────────────────────────────────────┘                    │
│           │                                                  │
│           ▼                                                  │
│  services/notification.formatters.ts                         │
│  ┌─────────────────────────────────────┐                    │
│  │ assignedBody(a) → {title,body,...}  │                    │
│  │ dueSoonBody(a) → {title,body,...}   │                    │
│  │ completedBody(a, parents) → {...}   │                    │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  Prisma Schema: 3 new nullable columns                       │
│  ┌─────────────────────────────────────┐                    │
│  │ User.ntfyTopic String? @unique      │                    │
│  │ ChoreAssignment.dueNotifiedAt DateTime? │                │
│  │ RecurringOccurrence.dueNotifiedAt DateTime? │            │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  .env.example: NTFY_BASE_URL=                               │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
backend/src/
├── config/
│   ├── notifications.ts        # NEW: getNtfyConfig(), reads NTFY_BASE_URL
│   └── prisma.ts               # EXISTING: pattern to mirror
├── services/
│   ├── notification.service.ts  # NEW: sendNtfy + 3 domain wrappers
│   ├── notification.formatters.ts  # NEW: pure functions for title/body/tags
│   ├── assignment.service.ts   # EXISTING: Phase 11–13 will add void notifyXxx calls
│   └── recurring.service.ts    # EXISTING: Phase 13 will add void notifyXxx call
├── __tests__/
│   └── services/
│       ├── notification.service.test.ts      # NEW: mock fetch, test sendNtfy + wrappers
│       └── notification.formatters.test.ts   # NEW: pure function tests, no fetch mock
└── middleware/
    └── errorHandler.ts         # EXISTING: AppError class used by services
```

### Pattern 1: Module-Level Env Guard (from `config/prisma.ts`)

**What:** Read `process.env.NTFY_BASE_URL` once at module import time. Log a single warning if missing. Export a boolean `isNtfyConfigured`.

**When to use:** Every time an optional external service is configured via env var.

**Example:**
```typescript
// Source: backend/src/config/prisma.ts (existing pattern)
// backend/src/config/notifications.ts
import 'dotenv/config'

const BASE_URL = (process.env.NTFY_BASE_URL ?? '').trim().replace(/\/$/, '')
export const isNtfyConfigured = BASE_URL.length > 0

if (!isNtfyConfigured) {
  console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')
}

export function getNtfyConfig() {
  return { enabled: isNtfyConfigured, baseUrl: BASE_URL }
}
```

### Pattern 2: Fire-and-Forget with Internal Error Swallowing

**What:** `sendNtfy` returns `Promise<void>`, wraps `fetch` in try/catch, never throws. Callers use `void sendNtfy(...)` — the `void` keyword signals "I know this is a promise, I'm deliberately not awaiting."

**When to use:** Best-effort side effects that must never block the API response.

**Example:**
```typescript
// Source: research/ARCHITECTURE.md pattern
export async function sendNtfy(
  topic: string | null,
  title: string,
  body: string,
  opts: { priority?: 1|2|3|4|5; tags?: string[]; click?: string } = {}
): Promise<void> {
  if (!isNtfyConfigured || !topic) return
  const url = `${getNtfyConfig().baseUrl}/${encodeURIComponent(topic)}`
  const headers: Record<string, string> = {
    'Title': title,
    'Priority': String(opts.priority ?? 3),
  }
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.click) headers['Click'] = opts.click
  try {
    await fetch(url, {
      method: 'POST',
      body,
      headers,
      signal: AbortSignal.timeout(3000),
    })
  } catch (err) {
    console.warn(`[ntfy] send failed for topic ${topic}: ${err instanceof Error ? err.message : String(err)}`)
  }
}
```

### Pattern 3: Domain Wrappers with Pre-Resolved Includes

**What:** Each wrapper accepts a full Prisma object with includes pre-resolved by the caller. The wrapper consumes the typed object and fires `void sendNtfy(...)`.

**When to use:** When the notification needs data from related models but the caller already has it.

**Example:**
```typescript
// Source: CONTEXT.md D-03, research/ARCHITECTURE.md
type AssignmentWithIncludes = {
  id: number
  template: { title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
  dueDate: Date
}

export function notifyChoreAssigned(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  void sendNtfy(topic, `New chore: ${assignment.template.title}`,
    `${assignment.template.title} — due ${assignment.dueDate.toISOString().slice(0, 10)}`,
    { priority: 3, tags: ['clipboard', 'bell'], click: `/chores/${assignment.id}` })
}
```

### Anti-Patterns to Avoid

- **Awaiting `sendNtfy` in a route handler:** Adds 50ms–3s to every API call. Surfaces ntfy failures as 500 errors. Use `void sendNtfy(...)` instead.
- **Putting sendNtfy calls in controllers:** Violates the "controllers are thin" pattern. Call from inside the service.
- **Cron job for "due soon":** Violates the explicit v1-rewrite decision ("no cron"). The lazy sweep in `assignment.service.getAll` covers all real cases.
- **Notification table + NotificationService with CRUD:** In-app notification storage was explicitly removed in the v1-rewrite. Push-only.
- **Per-event feature flags:** NOTIFY-01..07 explicitly say "no preferences — all events fire." Single `NTFY_BASE_URL` env var + per-user `ntfyTopic` is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client for one POST | Custom `http.request` wrapper | Native `fetch` | Built-in, zero deps, `AbortSignal.timeout()` |
| Timeout / cancellation | Manual `setTimeout` + `clearTimeout` | `AbortSignal.timeout(3000)` | Cleaner, one line, no cleanup needed |
| Retry / persistence | Custom retry queue with backoff | None (fire-and-forget) | ntfy is best-effort; missed notification isn't catastrophic |
| SSRF guard for ntfy URL | Custom URL validation | Not needed for v3.1 | `NTFY_BASE_URL` is env-only, not user-supplied in Phase 9 |

**Key insight:** The entire notification transport is ~40 lines of code. Any abstraction layer beyond this is over-engineering for a 4-user homelab.

## Common Pitfalls

### Pitfall 1: Notification blocks the API response
**What goes wrong:** `await sendNtfy(...)` in a route handler adds 50ms–3s to every API call.
**Why it happens:** `await` is the natural shape of an Express handler.
**How to avoid:** Use fire-and-forget with `void sendNtfy(...)`. The function catches all rejections internally.
**Warning signs:** `SLOW_REQUEST_THRESHOLD_MS` warnings on `POST /api/assignments` after ntfy goes down.

### Pitfall 2: Unhandled promise rejection terminates Node
**What goes wrong:** `void sendNtfy(...)` without internal catch creates a floating promise. Node 15+ terminates on unhandled rejection.
**Why it happens:** Easy to forget `.catch()` on a void promise.
**How to avoid:** `sendNtfy` catches all errors inside itself; never let a raw fetch escape the module.
**Warning signs:** `docker logs backend | grep UnhandledPromiseRejection`

### Pitfall 3: No fetch timeout → hang forever
**What goes wrong:** Native `fetch()` has no default timeout. A SYN packet to a half-up ntfy container hangs ~75s.
**Why it happens:** Developers accustomed to `axios` (which has `timeout` config) forget.
**How to avoid:** Use `AbortSignal.timeout(3000)` on every fetch call.
**Warning signs:** Memory growth during ntfy outages.

### Pitfall 9: Missing NTFY_BASE_URL logs on every request
**What goes wrong:** Per-request logging of "NTFY_BASE_URL not set" creates 50+ log lines/day.
**Why it happens:** `isNtfyConfigured()` returns false but the check is per-request.
**How to avoid:** Log the warning once at module load time, not per-request.
**Warning signs:** `docker logs backend | grep -c "NTFY_BASE_URL"` returns >1.

### Pitfall 14: Topic format validation too lax
**What goes wrong:** User enters `"alice's topic"` with apostrophe. ntfy returns 400 with no helpful message.
**Why it happens:** No Zod validation on topic format.
**How to avoid:** Phase 10 route validates `^[-_A-Za-z0-9]{12,64}$`. Phase 9's `sendNtfy` also validates before sending.
**Warning signs:** User reports "notification didn't work" without error details.

## Code Examples

### Config Module
```typescript
// backend/src/config/notifications.ts
// Source: backend/src/config/prisma.ts (existing pattern)
import 'dotenv/config'

const BASE_URL = (process.env.NTFY_BASE_URL ?? '').trim().replace(/\/$/, '')
export const isNtfyConfigured = BASE_URL.length > 0

if (!isNtfyConfigured) {
  console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')
}

export function getNtfyConfig() {
  return { enabled: isNtfyConfigured, baseUrl: BASE_URL }
}
```

### Transport Service
```typescript
// backend/src/services/notification.service.ts
// Source: research/ARCHITECTURE.md, ntfy.sh publish API docs
import { isNtfyConfigured, getNtfyConfig } from '../config/notifications'

export { isNtfyConfigured }

export async function sendNtfy(
  topic: string | null,
  title: string,
  body: string,
  opts: { priority?: 1|2|3|4|5; tags?: string[]; click?: string } = {}
): Promise<void> {
  if (!isNtfyConfigured || !topic) return
  const { baseUrl } = getNtfyConfig()
  const url = `${baseUrl}/${encodeURIComponent(topic)}`
  const headers: Record<string, string> = {
    'Title': title,
    'Priority': String(opts.priority ?? 3),
  }
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.click) headers['Click'] = opts.click
  try {
    await fetch(url, {
      method: 'POST',
      body,
      headers,
      signal: AbortSignal.timeout(3000),
    })
  } catch (err) {
    console.warn(`[ntfy] send failed for topic ${topic}: ${err instanceof Error ? err.message : String(err)}`)
  }
}
```

### Formatters (Pure Functions)
```typescript
// backend/src/services/notification.formatters.ts
// Source: research/FEATURES.md event specifications
import { relativeChoreUrl } from './notification.service'

interface AssignmentInfo {
  id: number
  template: { title: string; points: number }
  dueDate: Date
}

interface UserInfo {
  name: string
}

export function assignedBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — due ${a.dueDate.toISOString().slice(0, 10)}`,
    priority: 3 as const,
    tags: ['clipboard', 'bell'],
    click: relativeChoreUrl(a.id),
  }
}

export function dueSoonBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — ${a.template.points} pts, due today`,
    priority: 4 as const,
    tags: ['warning', 'alarm_clock'],
    click: relativeChoreUrl(a.id),
  }
}

export function completedBody(a: AssignmentInfo, completer: UserInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — +${a.template.points} points earned`,
    priority: 2 as const,
    tags: ['white_check_mark', 'star'],
    click: relativeChoreUrl(a.id),
  }
}
```

### Domain Wrappers
```typescript
// backend/src/services/notification.service.ts (continued)
// Source: CONTEXT.md D-01, D-03
import { assignedBody, dueSoonBody, completedBody } from './notification.formatters'

export function relativeChoreUrl(id: number): string {
  return `/chores/${id}`
}

type AssignmentWithIncludes = {
  id: number
  template: { title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
  dueDate: Date
}

export function notifyChoreAssigned(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  const { title, body, priority, tags, click } = assignedBody(assignment)
  void sendNtfy(topic, title, body, { priority, tags, click })
}

export function notifyChoreDueSoon(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  const { title, body, priority, tags, click } = dueSoonBody(assignment)
  void sendNtfy(topic, title, body, { priority, tags, click })
}

export function notifyChoreCompleted(
  assignment: AssignmentWithIncludes,
  parents: { ntfyTopic: string | null }[]
): void {
  for (const parent of parents) {
    const topic = parent.ntfyTopic
    if (!topic) continue
    const { title, body, priority, tags, click } = completedBody(assignment, { name: '' })
    void sendNtfy(topic, title, body, { priority, tags, click })
  }
}
```

### Test Pattern (Mock fetch)
```typescript
// backend/src/__tests__/services/notification.service.test.ts
// Source: CONTEXT.md D-04, existing test patterns
describe('sendNtfy', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
  })

  it('calls fetch with correct URL and headers', async () => {
    await sendNtfy('test-topic', 'Test Title', 'Test body', { priority: 4, tags: ['warning'] })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-topic'),
      expect.objectContaining({
        method: 'POST',
        body: 'Test body',
        headers: expect.objectContaining({
          'Title': 'Test Title',
          'Priority': '4',
          'Tags': 'warning',
        }),
      })
    )
  })

  it('does not throw on fetch rejection', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    await expect(sendNtfy('test-topic', 'Title', 'body')).resolves.not.toThrow()
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ntfy` npm package (GPL-3.0) | Native `fetch` | v3.1 research (2026-06-29) | Zero new deps, no license risk |
| `axios` backend HTTP | Native `fetch` | v3.1 research (2026-06-29) | Backend stays zero-axios |
| `Notification` table (v1-archive) | Fire-and-forget push only | v1-rewrite (2026) | No in-app notification storage |
| `UserNotificationSettings` model (27 columns) | `User.ntfyTopic String?` | v3.1 research (2026-06-29) | 2 columns vs 27; simpler |
| Per-event toggles | Single `NTFY_BASE_URL` env var | v3.1 research (2026-06-29) | 1 toggle vs 9 |

**Deprecated/outdated:**
- `NTFY_DEFAULT_*` env vars (v2-era leftovers): replaced by single `NTFY_BASE_URL` + per-user topic model
- `validateNtfyServerUrl` SSRF guard: not needed for v3.1 (env-only URL, not user-supplied)

## Assumptions Log

> All claims in this research were verified or cited from official documentation or existing codebase patterns. No user confirmation needed.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | (none — all claims verified) | — | — |

## Open Questions

1. **Click header relative path behavior**
   - What we know: ntfy supports relative paths in `Click` header; it resolves against `base-url` server-side
   - What's unclear: Exact behavior when `base-url` is not configured on self-hosted ntfy
   - Recommendation: Test with the actual ntfy instance; fall back to absolute URL if relative path doesn't work

2. **Topic encoding in URL**
   - What we know: Topics can contain `-` and `_`; `encodeURIComponent` will encode `_` but not `-`
   - What's unclear: Whether ntfy expects encoded or raw topic in URL path
   - Recommendation: Use `encodeURIComponent(topic)` per ntfy docs; test with special chars

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 20.20.0 | — |
| npm | Package manager | ✓ | 11.13.0 | — |
| Prisma | ORM / schema migration | ✓ | 5.22.0 | — |
| Jest | Testing | ✓ | 30.0.0 | — |
| ntfy server | Notification delivery | ✗ | — | Graceful no-op when `NTFY_BASE_URL` unset |

**Missing dependencies with no fallback:**
- ntfy server — out of code scope (developer ops task); notifications silently disabled when not configured

**Missing dependencies with fallback:**
- ntfy server — `NTFY_BASE_URL` unset = all `sendNtfy` calls early-return; app works normally without notifications

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.0.0 |
| Config file | `backend/jest.config.js` |
| Quick run command | `cd backend && npm test -- --testPathPattern="notification"` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIFY-05 | `sendNtfy` no-ops when `NTFY_BASE_URL` unset | unit | `cd backend && npm test -- notification.service` | ❌ Wave 0 |
| NOTIFY-05 | Warning logged once at module load | unit | `cd backend && npm test -- notification.service` | ❌ Wave 0 |
| NOTIFY-06 | `sendNtfy` catches fetch errors, never throws | unit | `cd backend && npm test -- notification.service` | ❌ Wave 0 |
| NOTIFY-06 | `AbortSignal.timeout(3000)` applied to every fetch | unit | `cd backend && npm test -- notification.service` | ❌ Wave 0 |
| NOTIFY-08 | Body contains chore summary, no user name | unit | `cd backend && npm test -- notification.formatters` | ❌ Wave 0 |
| NOTIFY-08 | Click header is relative path `/chores/{id}` | unit | `cd backend && npm test -- notification.formatters` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm test -- --testPathPattern="notification"`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/__tests__/services/notification.service.test.ts` — covers NOTIFY-05, NOTIFY-06
- [ ] `backend/src/__tests__/services/notification.formatters.test.ts` — covers NOTIFY-08
- [ ] `backend/src/config/notifications.ts` — new config module
- [ ] `backend/src/services/notification.service.ts` — new service module
- [ ] `backend/src/services/notification.formatters.ts` — new formatters module
- [ ] Prisma schema update — 3 new nullable columns

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Notifications are fire-and-forget; no auth on ntfy POST |
| V3 Session Management | no | No session involvement in notification transport |
| V4 Access Control | no | Phase 9 has no routes; Phase 10 adds self-service route |
| V5 Input Validation | yes | Topic validated via `encodeURIComponent()`; formatters produce fixed strings |
| V6 Cryptography | no | No encryption; ntfy transport is HTTPS when configured |

### Known Threat Patterns for Node.js + ntfy

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF via user-supplied ntfy URL | Information Disclosure | Not applicable in Phase 9 (env-only URL); revisit if per-user URL override added |
| Topic enumeration | Information Disclosure | Topic is `@unique` on `User` table; 12-char minimum prevents brute force |
| Notification body PII leak | Information Disclosure | Body contains chore summary only, never user name (NOTIFY-08) |
| Unhandled promise rejection | Denial of Service | `sendNtfy` catches all errors internally; never throws |

## Sources

### Primary (HIGH confidence)
- [CITED: docs.ntfy.sh/publish/] ntfy.sh publish API — Title, Priority, Tags, Click headers; topic name rules `[-_A-Za-z0-9]` max 64 chars; "topic is essentially a password"
- [CITED: docs.ntfy.sh/emojis/] ntfy.sh emoji shortcodes — clipboard, bell, warning, alarm_clock, white_check_mark, star
- [CITED: nodejs.org/api/globals.html#fetch] Node.js globals — fetch stable since v21, available in v18+; AbortSignal.timeout() since v17.3
- [VERIFIED: backend/src/config/prisma.ts] Config pattern — `import 'dotenv/config'` + export configured client
- [VERIFIED: backend/src/services/assignment.service.ts] Service pattern — pure functions, AppError, no class
- [VERIFIED: backend/src/services/recurring.service.ts] Lazy generation precedent — `generateOccurrences` on fetch
- [VERIFIED: backend/prisma/schema.prisma] Current schema — 5 models, no ntfy columns yet
- [VERIFIED: backend/src/__tests__/services/assignment.service.test.ts] Test pattern — jest.mock at module boundary

### Secondary (MEDIUM confidence)
- [CITED: .planning/research/SUMMARY.md] Phase 1/Foundation recommendation
- [CITED: .planning/research/STACK.md] Native fetch + AbortSignal.timeout(3000) rationale
- [CITED: .planning/research/PITFALLS.md] Fire-and-forget pattern, unhandled-rejection prevention
- [CITED: .planning/research/ARCHITECTURE.md] Service-owned side effects, void sendNtfy pattern

### Tertiary (LOW confidence)
- None — all findings verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — Native fetch verified against Node.js docs; no new packages needed
- Architecture: HIGH — Integration points verified against current source; patterns match existing codebase
- Pitfalls: HIGH — All pitfalls sourced from official ntfy docs, Node.js globals docs, and existing codebase patterns

**Research date:** 2026-06-29
**Valid until:** 30 days (stable — native fetch and ntfy API are stable)
