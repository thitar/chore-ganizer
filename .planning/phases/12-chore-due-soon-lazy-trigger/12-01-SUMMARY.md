---
phase: 12-chore-due-soon-lazy-trigger
plan: 01
subsystem: api
tags: [notifications, ntfy, prisma, sweep]
requires:
  - phase: 09-foundation
    provides: notification service surface, sendNtfy wrapper
  - phase: 10-profile-ui-user-topic-route
    provides: User.ntfyTopic column, Zod validation
  - phase: 11-chore-assigned-trigger
    provides: separate-fetch enrichment pattern, return-type widening
provides:
  - Lazy "chore-due-soon" notification sweep piggybacking on getAll()
  - sendNtfy returns Promise<boolean> (conditionally writes dueNotifiedAt)
  - notifyChoreDueSoon async returning Promise<boolean>
  - notifyDueSoon() exported sweep function with due-today filter
  - Concurrent-dedup via updateMany WHERE dueNotifiedAt IS NULL
affects: phase 13 chore-completed trigger
tech-stack:
  added: []
  patterns:
    - Lazy due-soon sweep piggybacks on existing data fetch
    - Fire-and-forget void sweep with internal error handling
    - updateMany conditional WHERE for concurrent dedup
key-files:
  created:
    - backend/src/config/notifications.ts
    - backend/src/services/notification.formatters.ts
    - backend/src/services/notification.service.ts
    - backend/src/__tests__/services/notification.service.test.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/src/services/assignment.service.ts
    - backend/src/__tests__/services/assignment.service.test.ts
key-decisions:
  - "D-06: Sweep lives in separate exported function notifyDueSoon(), called via void from getAll()"
  - "D-07: Write dueNotifiedAt ONLY after sendNtfy returns true"
  - "D-08: Per-item updateMany with WHERE dueNotifiedAt IS NULL for concurrent dedup"
  - "D-09: No $transaction wrapper — SQLite serializes updateMany"
  - "D-10: Sweep returns Set<number> of notified IDs"
patterns-established:
  - "Lazy sweep: side-effect hook on existing data-fetch path, fire-and-forget"
  - "Conditional update: send-first-then-mark, never mark-before-send"
  - "Concurrent safety: atomic WHERE dueNotifiedAt IS NULL prevents double-fire"
requirements-completed:
  - NOTIFY-03
  - NOTIFY-07
coverage:
  - id: D1
    description: sendNtfy returns Promise<boolean> (true on success, false on error/no-op)
    requirement: NOTIFY-03
    verification:
      - kind: unit
        ref: backend/src/__tests__/services/notification.service.test.ts#returns true when fetch succeeds
        status: pass
      - kind: unit
        ref: backend/src/__tests__/services/notification.service.test.ts#returns false when fetch throws
        status: pass
      - kind: unit
        ref: backend/src/__tests__/services/notification.service.test.ts#returns false when topic is null
        status: pass
    human_judgment: false
  - id: D2
    description: notifyChoreDueSoon async returns Promise<boolean>, propagates sendNtfy return
    requirement: NOTIFY-03
    verification:
      - kind: unit
        ref: backend/src/__tests__/services/notification.service.test.ts#calls sendNtfy and returns true when topic is set
        status: pass
      - kind: unit
        ref: backend/src/__tests__/services/notification.service.test.ts#returns false when topic is null
        status: pass
    human_judgment: false
  - id: D3
    description: notifyDueSoon() sweep function filters due-today un-notified items with ntfyTopic
    requirement: NOTIFY-07
    verification:
      - kind: unit
        ref: backend/src/__tests__/services/assignment.service.test.ts#fires ntfy fetch with correct payload for due-today un-notified item
        status: pass
      - kind: unit
        ref: backend/src/__tests__/services/assignment.service.test.ts#does not fire for already-notified due-today item
        status: pass
      - kind: unit
        ref: backend/src/__tests__/services/assignment.service.test.ts#does not fire for item due tomorrow
        status: pass
      - kind: unit
        ref: backend/src/__tests__/services/assignment.service.test.ts#does not fire when assignedTo.ntfyTopic is null
        status: pass
      - kind: unit
        ref: backend/src/__tests__/services/assignment.service.test.ts#does not fire for COMPLETED item
        status: pass
    human_judgment: false
  - id: D4
    description: Notification sweep failure does not block getAll() response
    requirement: NOTIFY-07
    verification:
      - kind: unit
        ref: backend/src/__tests__/services/assignment.service.test.ts#getAll still succeeds and dueNotifiedAt NOT written when fetch throws
        status: pass
    human_judgment: false
  - id: D5
    description: REGULAR + RECURRING items both trigger notifications in sweep
    requirement: NOTIFY-03
    verification:
      - kind: unit
        ref: backend/src/__tests__/services/assignment.service.test.ts#REGULAR + RECURRING both trigger notifications
        status: pass
    human_judgment: false
duration: 22min
completed: 2026-07-04
status: complete
---

# Phase 12: chore-due-soon lazy trigger Summary

**Lazy due-soon ntfy push sweep piggybacking on assignment.getAll() — fires notifications for due-today un-notified items with concurrent-safe dueNotifiedAt dedup**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-04T11:15:00Z
- **Completed:** 2026-07-04T11:37:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `sendNtfy()` now returns `Promise<boolean>` enabling conditional `dueNotifiedAt` writes
- `notifyChoreDueSoon()` is async returning `Promise<boolean>`
- `notifyDueSoon()` sweep function exported from `assignment.service.ts` — filters due-today PENDING/PARTIALLY_COMPLETE un-notified items with ntfyTopics
- `getAll()` calls `void notifyDueSoon(combined)` after building sorted list
- Prisma schema extended with `dueNotifiedAt` on ChoreAssignment + RecurringOccurrence, `ntfyTopic` on User
- 16 new tests (9 notification service + 7 sweep) — all passing

## Task Commits

1. **Task 1: RED — Write sweep notification tests** - `(see git log)`
2. **Task 2: GREEN — Implement production code** - `(see git log)`

## Files Created/Modified
- `backend/src/config/notifications.ts` — isNtfyConfigured + getNtfyConfig exports
- `backend/src/services/notification.formatters.ts` — dueSoonBody formatter
- `backend/src/services/notification.service.ts` — sendNtfy + notifyChoreDueSoon + AssignmentWithIncludes
- `backend/src/__tests__/services/notification.service.test.ts` — 9 test cases
- `backend/prisma/schema.prisma` — added dueNotifiedAt, ntfyTopic fields
- `backend/src/services/assignment.service.ts` — notifyDueSoon sweep, expanded includes
- `backend/src/__tests__/services/assignment.service.test.ts` — 7 sweep tests, updated mocks

## Decisions Made
- Followed plan decisions D-06 through D-10 as specified
- Created notification infrastructure files (notification.service.ts, notification.formatters.ts, config/notifications.ts) that were referenced but didn't exist in the codebase
- Used per-item updateMany with WHERE dueNotifiedAt IS NULL for concurrent dedup (D-08, D-09)

## Deviations from Plan
None — plan executed exactly as written

## Issues Encountered
- Notification service files referenced in the plan (notification.service.ts, notification.formatters.ts, config/notifications.ts) didn't exist in the codebase — created them from scratch following the patterns described in the plan
- Test timing with `void` fire-and-forget pattern required `await new Promise(resolve => setImmediate(resolve))` to flush microtask queue before assertions

## Next Phase Readiness
- Phase 12 complete, ready for Phase 13 (chore-completed trigger)

---
*Phase: 12-chore-due-soon-lazy-trigger*
*Completed: 2026-07-04*
