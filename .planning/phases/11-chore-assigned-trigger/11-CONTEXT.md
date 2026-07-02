# Phase 11: chore-assigned trigger - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

When a parent assigns a chore to a child, the recipient receives a `chore-assigned` push notification via ntfy if they have an ntfy topic configured. The ROADMAP locks the call site (`assignment.service.create`) and the requirement (NOTIFY-02). This is a wiring phase — the notification infrastructure (`notifyChoreAssigned` wrapper, `sendNtfy`, formatters) already exists from Phase 9.

**Requirements addressed:** NOTIFY-02

</domain>

<decisions>
## Implementation Decisions

### Data enrichment strategy
- **D-01:** `assignment.service.create()` currently returns a bare `ChoreAssignment` without `assignedTo` or `template` includes. `notifyChoreAssigned()` needs `{ id, template: { title, points }, assignedTo: { ntfyTopic }, dueDate }`. Use a **separate fetch after create** — call `prisma.choreAssignment.findUnique` with the needed includes after the assignment is created, then pass the enriched object to `notifyChoreAssigned`. Keeps `create()` minimal.

### Notification call location
- **D-02:** The notification fires in the **last lines of `create()`**, before the return statement. After `prisma.choreAssignment.create`, do a `findUnique` with includes, call `void notifyChoreAssigned(enrichedAssignment)`, then return the enriched object. Callers get the enriched assignment back; notification fires automatically. No import needed in the controller.

### Test approach
- **D-03:** In `assignment.service.test.ts`, mock `global.fetch` (same pattern as `notification.service.test.ts`) with `jest.spyOn(global, 'fetch')`. Verify the **full notification payload** — URL includes the correct ntfy topic, body contains the chore title, priority is 3, tags include `clipboard` and `bell`, click path is `/chores/{id}`.
- **D-04:** Test the **null-topic path** — when `assignedTo.ntfyTopic` is null, no fetch is called and the assignment still succeeds.
- **D-05:** Test the **ntfy-disabled path** — when `NTFY_BASE_URL` is unset, `isNtfyConfigured` is false, no fetch is called, assignment succeeds. Requires `jest.isolateModules` to re-require `assignment.service` with the config module reset.
- **D-06:** Test the **server-unreachable path** — when `fetch` throws, the assignment still succeeds (201) and the error is logged but not surfaced to the client.

### the agent's Discretion
- **Import placement:** Import `notifyChoreAssigned` from `./notification.service` at the top of `assignment.service.ts`. Standard named import.
- **Log prefix:** Use `[ntfy]` consistently (per Phase 9 convention).
- **Return type change:** `create()` return type changes from `ChoreAssignment` to `ChoreAssignment & { template: ..., assignedTo: ... }`. This is a breaking change to the function signature — callers (the controller) will receive the enriched object but can ignore the extra fields if they don't need them.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §"Notifications (ntfy.sh)" — NOTIFY-02 (chore-assigned push to recipient's topic)
- `.planning/ROADMAP.md` §"Phase 11: chore-assigned trigger" — success criteria 1-4 (push fires, no-topic silent, server-unreachable graceful, tap opens /chores/{id})
- `.planning/PROJECT.md` §"Active (v3.1 — Notifications)" — high-level product framing

### Existing code to wire
- `backend/src/services/notification.service.ts` — `notifyChoreAssigned(assignment)` wrapper, ready to call. Needs `{ id, template: { title, points }, assignedTo: { ntfyTopic }, dueDate }`.
- `backend/src/services/assignment.service.ts` — `create()` function (lines 5-23). Needs includes added and notification call appended.
- `backend/src/services/notification.formatters.ts` — `assignedBody()` defines the payload shape (title, body, priority 3, tags, click path).

### Test patterns to mirror
- `backend/src/__tests__/services/notification.service.test.ts` — `jest.spyOn(global, 'fetch')` pattern for testing ntfy calls.
- `backend/src/__tests__/services/assignment.service.test.ts` — existing test structure for assignment service (add notification tests here).

### Locked decisions from prior phases
- `.planning/phases/09-foundation/09-CONTEXT.md` — notification service surface, wrapper signatures, fire-and-forget pattern, test mocking approach
- `.planning/phases/10-profile-ui-user-topic-route/10-CONTEXT.md` — topic storage (User.ntfyTopic), Zod validation
- `.planning/STATE.md` §"Accumulated Context > Decisions" — native fetch, fire-and-forget, User.ntfyTopic @unique, dueNotifiedAt, topic regex, relative Click path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`backend/src/services/notification.service.ts:44-49`** — `notifyChoreAssigned()` wrapper. Accepts `AssignmentWithIncludes`, extracts topic, calls `void sendNtfy(...)`. Ready to import and call.
- **`backend/src/services/notification.formatters.ts:11-18`** — `assignedBody()` returns `{ title: 'Chore-Ganizer', body, priority: 3, tags: ['clipboard', 'bell'], click: /chores/{id} }`. Test verifies this exact shape.
- **`backend/src/services/assignment.service.ts:5-23`** — `create()` function. Currently does `prisma.choreAssignment.create` and returns bare result. Needs includes + notification call.
- **`backend/src/__tests__/services/notification.service.test.ts`** — shows `jest.spyOn(global, 'fetch')` + `mockResolvedValue` pattern for testing ntfy calls.

### Established Patterns
- **Service pattern:** flat file of named exports, throws `AppError` for expected errors, returns plain objects.
- **Fire-and-forget:** `void sendNtfy(...)` — never await in a route/service, all errors caught inside the wrapper.
- **Test pattern:** `jest.mock('../../config/prisma', ...)` for Prisma, `jest.spyOn(global, 'fetch')` for ntfy HTTP calls.

### Integration Points
- **`backend/src/services/assignment.service.ts:create()`** — add `notifyChoreAssigned` call after the assignment is created.
- **`backend/src/__tests__/services/assignment.service.test.ts`** — add notification wiring tests.
- **No controller changes needed** — controller already calls `assignment.service.create()` and returns its result. The enriched return type flows through automatically.

</code_context>

<specifics>
## Specific Ideas

- **Separate fetch keeps create() clean** — the create function does one thing (write), then a second query fetches the enriched object for notification. Two queries is negligible for SQLite at this scale (4 users).
- **Return type widening is safe** — TypeScript structural typing means callers that don't use the extra fields are unaffected. The controller just passes the result back to the frontend.
- **Full payload verification in tests** — confirms the formatter choices (priority 3, tags, click path) are correct end-to-end, not just in isolation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-chore-assigned trigger*
*Context gathered: 2026-07-01*
