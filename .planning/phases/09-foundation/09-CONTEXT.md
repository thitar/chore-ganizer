# Phase 9: Foundation - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend notification infrastructure is in place — `notification.service.ts` + `notification.formatters.ts` + `config/notifications.ts` + `.env.example` + Prisma migration adding 3 nullable columns (`User.ntfyTopic`, `ChoreAssignment.dueNotifiedAt`, `RecurringOccurrence.dueNotifiedAt`). Zero user-visible behavior change in this phase; the 3 domain wrappers are exported but no service consumes them yet. Triggers wire up in Phases 11–13.

**Requirements addressed:** NOTIFY-01 (partial — schema column only), NOTIFY-05, NOTIFY-06, NOTIFY-08.

</domain>

<decisions>
## Implementation Decisions

### Service surface

- **D-01:** `backend/src/services/notification.service.ts` exports `isNtfyConfigured` + `sendNtfy(topic, title, body, opts)` **plus** the 3 domain wrappers `notifyChoreAssigned`, `notifyChoreDueSoon`, `notifyChoreCompleted`. Phases 11–13 become one-liners at the call site (`void notifyChoreAssigned(newAssignment)`); Phase 9 owns the priority/tags/body format choices. Matches `research/SUMMARY.md` recommendation.

### File layout

- **D-02:** Split the notification code into two files:
  - `backend/src/services/notification.service.ts` — transport only: env check, `fetch` call, `AbortSignal.timeout(3000)`, fire-and-forget + internal catch.
  - `backend/src/services/notification.formatters.ts` — pure functions returning `{ title, body, priority, tags, click }` per event. No side effects, no env reads, easily unit-testable in isolation.

### Wrapper signatures

- **D-03:** Each domain wrapper accepts a **full Prisma object with the includes it needs pre-resolved** (e.g., `ChoreAssignment & { template: { title: string }, assignedTo: { ntfyTopic: string | null } }`). Matches the existing `recurring.service.completeOccurrence` style — caller does the include, the wrapper consumes it. The wrapper is not responsible for fetching; it does not need to know which fields the caller pre-loaded because the TS type makes it explicit.

### Test mocking

- **D-04:** Mock `fetch` in `notification.service.test.ts` with `jest.spyOn(global, 'fetch')` and `mockResolvedValue(mockResponse)`. Relies on the existing `clearMocks: true` in `backend/jest.config.js`. No global pollution, no helper-module indirection. `sendNtfy` and the 3 wrappers are tested in the same file; `formatters` are tested separately in `notification.formatters.test.ts` as pure functions (no fetch needed there).

### the agent's Discretion

- **Log prefix:** agent may use `[ntfy]` (per `research/PITFALLS.md` examples) or `[notifications]` — pick one and use consistently. Recommendation: `[ntfy]` to match the existing research wording and stay terse.
- **`NTFY_BASE_URL` trailing slash:** agent normalizes internally (strip trailing `/` before composing the topic URL) so `.env` authors can write either form. Documented in the `.env.example` comment.
- **Module-load warning vs startup-time:** agent reads `process.env.NTFY_BASE_URL` at module top-level (per `config/prisma.ts` pattern) and logs the single warning at import time, not from a separate `init()` call.
- **`formatters.ts` exports shape:** agent picks the cleanest shape — either 3 named functions (`assignedBody(a)`, `dueSoonBody(a)`, `completedBody(a, parents)`) or a single function dispatching on an event enum. Recommendation: 3 named functions, one per event, matching the 3 wrappers.

### Folded Todos

None — no open todos in `STATE.md` to fold.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope

- `.planning/REQUIREMENTS.md` §"Notifications (ntfy.sh)" — NOTIFY-01..08, including the 12–64 char topic regex and the "no user name in body" lock-screen privacy rule
- `.planning/ROADMAP.md` §"Phase 9: Foundation" — success criteria 1–5 (file list, graceful no-op, no unhandled rejection, 3 schema fields, body content rules)
- `.planning/PROJECT.md` §"Active (v3.1 — Notifications)" — high-level product framing

### Research (decisions rationale)

- `.planning/research/SUMMARY.md` — the Phase 1/Foundation recommendation that this phase implements
- `.planning/research/STACK.md` — `native fetch + AbortSignal.timeout(3000)` + zero-deps rationale; rejected `ntfy` npm pkg reasons
- `.planning/research/PITFALLS.md` §1–9, §12, §14 — fire-and-forget pattern, unhandled-rejection prevention, fetch timeout, module-level guard, `User.ntfyTopic @unique`, Zod-validated topic format, relative-path `Click` header
- `.planning/research/FEATURES.md` §"Must have" — per-user topic rationale, dedup via `dueNotifiedAt` (timestamp over boolean)
- `.planning/research/ARCHITECTURE.md` — service-owned side effects, `void sendNtfy(...)` at call sites, lazy due-soon piggyback pattern

### Existing code to mirror

- `backend/prisma/schema.prisma` — current 5 models; Phase 9 adds 3 nullable fields (`User.ntfyTopic String? @unique`, `ChoreAssignment.dueNotifiedAt DateTime?`, `RecurringOccurrence.dueNotifiedAt DateTime?`)
- `backend/src/services/assignment.service.ts` — service pattern (pure functions, `AppError`, no class)
- `backend/src/services/recurring.service.ts` — `completeOccurrence` shows the "caller pre-fetches, service consumes" pattern D-03 mirrors
- `backend/src/services/users.service.ts` — sibling service; `updateColor` is the closest analog for the future `updateNtfyTopic` route (Phase 10)
- `backend/src/config/prisma.ts` — env-read-at-module-load pattern
- `backend/src/__tests__/services/users.service.test.ts` — `jest.mock('../../config/prisma', ...)` pattern for service tests
- `backend/jest.config.js` — confirms `clearMocks: true`; `testMatch` includes `**/__tests__/**/*.test.ts`
- `backend/.env.example` — current 1–2 line comment style; Phase 9 adds `NTFY_BASE_URL` section
- `backend/src/middleware/errorHandler.ts` — `AppError` class used by services

### Locked decisions in `STATE.md`

- `.planning/STATE.md` §"Accumulated Context > Decisions" lines 76–82 — all 7 v3.1 architectural decisions (native fetch, fire-and-forget, lazy due-soon, `User.ntfyTopic` `@unique`, `dueNotifiedAt DateTime?`, topic regex, relative `Click` path) are locked and not re-debated in planning

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`backend/src/services/assignment.service.ts:5-23`** — `create()` shows the pattern for "fetch template, validate, then write". Phase 11's trigger wiring will follow this exact pattern + a `void notifyChoreAssigned(...)` after the `prisma.choreAssignment.create` call.
- **`backend/src/services/recurring.service.ts:107-151`** — `completeOccurrence()` shows the "caller pre-fetches with includes, service consumes the typed object" pattern that D-03's wrapper signatures mirror.
- **`backend/src/config/prisma.ts:1-4`** — 4 lines total. `import 'dotenv/config'` + export a configured client. Phase 9's `config/notifications.ts` follows the same 1-screen-of-code shape.
- **`backend/src/__tests__/services/users.service.test.ts:1-21`** — the `jest.mock('../../config/prisma', () => ({ prisma: { user: { findUnique: jest.fn(), ... } } }))` pattern. `notification.service.test.ts` mocks `global.fetch` instead (D-04) but the structure is the same.

### Established Patterns

- **Service pattern:** every existing service is a flat file of named exports (no class), throws `AppError` for expected errors, returns plain objects. `notification.service.ts` and `notification.formatters.ts` follow the same shape.
- **Log convention:** `console.warn` for startup configuration issues, `console.error` for runtime failures. No structured logger. Prefix all ntfy logs with `[ntfy]` (per agent-discretion item).
- **Env var handling:** read at module top-level, document in `.env.example` with 1–2 line comment, fall back to "disabled" (no default) when unset. `NTFY_BASE_URL` follows this — no default value, module-level guard.
- **Test file location:** `backend/src/__tests__/services/{name}.service.test.ts` (per-phase top-level tests are at `backend/src/__tests__/*.test.ts`; service-specific tests live in `__tests__/services/`). Phase 9 follows the service-test location.
- **Clear mocks:** `clearMocks: true` in `jest.config.js` resets `jest.spyOn` between tests automatically.

### Integration Points

- **`backend/prisma/schema.prisma`** — 3 new nullable fields; applied via `prisma db push` (the existing dev workflow). No migration files in this project; the `docker-entrypoint.sh` already runs `prisma db push` on container start.
- **`backend/.env.example`** — new optional section for `NTFY_BASE_URL`.
- **No new routes, no new controllers, no new frontend files in Phase 9.** The 3 wrappers are exported but not imported by any service yet. First consumer lands in Phase 11.
- **Phase 10** introduces the `PUT /api/users/me/ntfy-topic` route + `users.service.updateNtfyTopic`; the `User.ntfyTopic` column added here is the storage target.
- **Phases 11–13** wire `void notifyChore*` calls into `assignment.service.create` (P11), `assignment.service.getAll` (P12), and `assignment.service.complete` + `recurring.service.completeOccurrence` (P13).

</code_context>

<specifics>
## Specific Ideas

- **Foundation is intentionally "boring"** — the only user-visible change in this phase is the appearance of a single new env var in `.env.example`. No UI change, no API change, no behavior change. Every other notification feature in v3.1 builds on the wrappers created here.
- **Per-event `topic`, `priority`, and `tags` are constants in `formatters.ts`** — Phases 11–13 don't redefine them. If the priority for `chore-due-soon` ever needs to change (e.g., escalate from 4 to 5), it's a one-line edit in one file.
- **No-cron commitment is structural** — the fire-and-forget `void` pattern + the absence of any setInterval/cron dependency in `package.json` is what keeps v3.1 zero-ops. Phase 9 must not introduce `node-cron`, `bull`, or similar.
- **Module-level env read means tests can't change `process.env.NTFY_BASE_URL` mid-test** — tests that exercise the disabled-config path must use `jest.isolateModules` to re-require the module, or split the config read into a `getNtfyConfig()` function. Agent picks the cleanest of the two; the second is more testable.

</specifics>

<deferred>
## Deferred Ideas

None new — the discussion stayed within the Phase 9 scope. Items already deferred in `.planning/STATE.md` ("Per-user `ntfyBaseUrl` override", "Per-event notification toggles", "Email / Slack fallback") remain in the deferred table and are not affected by Phase 9.

</deferred>

---

*Phase: 9-Foundation*
*Context gathered: 2026-06-29*
