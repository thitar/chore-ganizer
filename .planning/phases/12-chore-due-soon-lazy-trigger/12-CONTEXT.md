# Phase 12: chore-due-soon lazy trigger - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

When a user fetches their assignments (chore list / calendar view), the system checks for pending due-today items that haven't been notified yet, fires `chore-due-soon` push notifications (priority 4, tags ⚠️⏰) to the recipient's ntfy topic, and records `dueNotifiedAt` to prevent re-notification. This is a lazy trigger piggybacking on `assignment.service.getAll()` — no cron, no background job.

**Requirements addressed:** NOTIFY-03, NOTIFY-07

</domain>

<decisions>
## Implementation Decisions

### Sweep scope
- **D-01:** Sweep covers both `ChoreAssignment` (regular) AND `RecurringOccurrence` items — a user's due-today items include both types.
- **D-02:** The role filter from `getAll()` is respected — parents sweeping all assignments trigger notifications for all users' due-today items; children only trigger for their own.
- **D-03:** Statuses included: `PENDING` and `PARTIALLY_COMPLETE` (completed items are not "due soon").
- **D-04:** Only items due **today** (server local date) trigger notifications — viewing next week's calendar does not fire notifications for next week's items.

### Enrichment strategy
- **D-05:** Expand `getAll()`'s existing Prisma includes to add `dueNotifiedAt` to both `ChoreAssignment` and `RecurringOccurrence` queries, and `ntfyTopic` to the `assignedTo` relation select. The sweep iterates the already-fetched combined list.
- **D-06:** Sweep logic lives in a **separate exported function** (e.g., `notifyDueSoon(items, userId)`) that `getAll()` calls after building the combined sorted list. Keeps `getAll()` query-focused and the sweep independently testable.

### dueNotifiedAt update timing
- **D-07:** Write `dueNotifiedAt` ONLY after the notification send succeeds — the notification fires first, then `updateMany` writes the timestamp. If ntfy is unreachable, the item is not marked notified and will retry on next view.
- **D-08:** Per-item `updateMany({ where: { id, dueNotifiedAt: null }, data: { dueNotifiedAt: new Date() } })`. The conditional `WHERE dueNotifiedAt IS NULL` is the concurrent-dedup mechanism.

### Concurrent dedup
- **D-09:** No explicit `$transaction` wrapper needed — `updateMany` with the conditional `where` clause is atomic in SQLite. Two concurrent calls: one matches 1 row (writes), the other matches 0 rows (silently no-ops).

### Reusable suffix function
- **D-10:** The sweep function also returns a list of notified item IDs so `getAll()` can build a combined response without re-querying. The sweep function handles filtering (due today + un-notified + has topic), notifying, and marking — `getAll()` just calls it.

### the agent's Discretion
- **Where to add the sweep import:** Import `notifyDueSoon` (or whatever the function is named) into `assignment.service.ts` — same pattern as Phase 11's `import { notifyChoreAssigned }`.
- **Return value shape of sweep function:** Agent picks the cleanest signature. Recommendation: `notifyDueSoon(assignments: CombinedItem[], userId: number, role: string): Promise<Set<number>>` returning the set of IDs that were notified.
- **Log prefix:** Use `[ntfy]` consistently (per Phase 9-11 convention).
- **Server "today" definition:** Use the server's local timezone for determining "due today". SQLite stores dates as strings; compare against `new Date().toISOString().slice(0, 10)`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §"Notifications (ntfy.sh)" — NOTIFY-03 (due-soon push), NOTIFY-07 (lazy trigger)
- `.planning/ROADMAP.md` §"Phase 12: chore-due-soon lazy trigger" — success criteria 1-5 (dedup, dueNotifiedAt, graceful degradation, concurrent safety)
- `.planning/PROJECT.md` §"Active (v3.1 — Notifications)" — high-level product framing

### Locked decisions from prior phases
- `.planning/phases/09-foundation/09-CONTEXT.md` — notification service surface, wrapper signatures, fire-and-forget pattern, test mocking approach
- `.planning/phases/10-profile-ui-user-topic-route/10-CONTEXT.md` — topic storage (User.ntfyTopic), Zod validation
- `.planning/phases/11-chore-assigned-trigger/11-CONTEXT.md` — separate-fetch enrichment pattern (D-01 matched by D-05), return-type widening
- `.planning/STATE.md` §"Accumulated Context > Decisions" — native fetch, fire-and-forget, dueNotifiedAt DateTime? over boolean, lazy piggyback on getAll, concurrent-dedup via conditional update

### Existing code to wire
- `backend/src/services/notification.service.ts:51-56` — `notifyChoreDueSoon(assignment)` wrapper. Takes `AssignmentWithIncludes` (needs `dueNotifiedAt` added to type). Ready to call.
- `backend/src/services/notification.formatters.ts:21-29` — `dueSoonBody()`. Returns priority 4, tags `['warning', 'alarm_clock']`, click `/chores/{id}`.
- `backend/src/services/assignment.service.ts:38-118` — `getAll()` function. The sweep function is called here after the combined list is built and sorted (line 117).
- `backend/src/services/recurring.service.ts:76-105` — `generateOccurrences()`. Called at line 55 of `getAll()` before any sweep logic.
- `backend/prisma/schema.prisma:53` — `ChoreAssignment.dueNotifiedAt DateTime?`
- `backend/prisma/schema.prisma:107` — `RecurringOccurrence.dueNotifiedAt DateTime?`

### Test patterns to mirror
- `backend/src/__tests__/services/assignment.service.test.ts` — existing test structure. Add notification wiring tests here.
- `backend/src/__tests__/services/notification.service.test.ts` — `jest.spyOn(global, 'fetch')` pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`backend/src/services/notification.service.ts:51-56`** — `notifyChoreDueSoon()` wrapper exists and is ready to call. Needs `AssignmentWithIncludes` type updated to include `dueNotifiedAt: Date | null`.
- **`backend/src/services/notification.formatters.ts:21-29`** — `dueSoonBody()` formatter ready. Returns `{ title, body, priority: 4, tags: ['warning', 'alarm_clock'], click: '/chores/{id}' }`.
- **`backend/src/services/assignment.service.ts:38-118`** — `getAll()` function. Builds combined sorted array of regular + recurring items at lines 85-117. Sweep function called after the sort at line 117, before the return.
- **`backend/src/services/assignment.service.ts:62-83`** — Current Prisma queries. Need `dueNotifiedAt` added to both ChoreAssignment's and RecurringOccurrence's root-level selects, and `ntfyTopic` added to both `assignedTo` relation selects.

### Established Patterns
- **Fire-and-forget:** `void sendNtfy(...)` — never await in a route/service.
- **Separate fetch:** Phase 11's `create()` uses `findUnique` after create for notification data. Phase 12's sweep mirrors this with the expand-includes approach instead (D-05).
- **Test pattern:** `jest.mock('../../config/notifications', ...)` for ntfy config, `jest.spyOn(global, 'fetch')` for ntfy HTTP calls.
- **Log prefix:** `[ntfy]` is consistent across Phases 9-11.

### Integration Points
- **`backend/src/services/assignment.service.ts:getAll()`** — The sweep function call is inserted after the combined list is sorted (line 117), before the return.
- **`backend/src/services/notification.service.ts:37-42`** — `AssignmentWithIncludes` type needs `dueNotifiedAt: Date | null` added. The sweep function also needs the `status` field to filter PENDING/PARTIALLY_COMPLETE.
- **`backend/src/__tests__/services/assignment.service.test.ts`** — Add notification sweep tests (verify fetch is called for due-today un-notified items, not called for already-notified items, not called when ntfy is disabled, concurrent dedup via updateMany).
- **No controller changes needed** — `getAll()` is called by the controller, returns the combined list. The sweep is a side effect.

</code_context>

<specifics>
## Specific Ideas

- **Today detection uses `dueDate.toISOString().slice(0, 10)` comparison** — the sweep function filters items where `item.dueDate.slice(0, 10) === new Date().toISOString().slice(0, 10)` after the combined list is built (the `dueDate` is already a `YYYY-MM-DD` string at that point, from the `.split('T')[0]` at lines 90 and 107).
- **`AssignmentWithIncludes` type should be extended** or a new `AssignmentWithDueNotified` type created. The existing type (`notification.service.ts:37-42`) omits `dueNotifiedAt` and `status`. The sweep function needs both.
- **Sweep is purely a side effect** — the return value of `getAll()` is unchanged. The sweep fires notifications and writes `dueNotifiedAt`, but the data returned to the client is the same as before.
- **No new calls to `notifyChoreDueSoon` needed** beyond what the sweep function does — Phase 13 handles the `chore-completed` trigger separately.
- **Graceful degradation** — if ntfy is unreachable, the sweep logs the error and does NOT write `dueNotifiedAt`, so the notification will retry on the next app open.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-chore-due-soon lazy trigger*
*Context gathered: 2026-07-02*
