---
phase: 09-foundation
plan: 01
subsystem: database
tags: [prisma, ntfy, notifications, sqlite]

# Dependency graph
requires: []
provides:
  - "Prisma schema with User.ntfyTopic, ChoreAssignment.dueNotifiedAt, RecurringOccurrence.dueNotifiedAt"
  - "Config module (config/notifications.ts) reading NTFY_BASE_URL at module load"
  - "Pure formatter functions producing ntfy message payloads"
affects: [phase-10, phase-11, phase-12, phase-13]

# Tech tracking
tech-stack:
  added: []
  patterns: [module-level-env-guard, pure-formatter-functions]

key-files:
  created:
    - backend/src/config/notifications.ts
    - backend/src/services/notification.formatters.ts
    - backend/src/__tests__/services/notification.formatters.test.ts
  modified:
    - backend/prisma/schema.prisma
    - backend/.env.example

key-decisions:
  - "Module-level env guard reads NTFY_BASE_URL at import time, logs single warning when unset"
  - "Formatter functions are pure (no side effects, no env reads) for easy unit testing"
  - "Click header uses relative path /chores/{id} per NOTIFY-08 lock-screen privacy"

patterns-established:
  - "Module-level env guard: read env at import time, export boolean flag + getter function"
  - "Pure formatter functions: return { title, body, priority, tags, click } without side effects"

requirements-completed: [NOTIFY-05, NOTIFY-08]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Prisma schema with 3 new nullable notification columns applied to database"
    requirement: NOTIFY-01
    verification:
      - kind: unit
        ref: "backend/prisma/schema.prisma (schema inspection)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Config module reading NTFY_BASE_URL at module load with single startup warning"
    requirement: NOTIFY-05
    verification:
      - kind: unit
        ref: "backend/src/config/notifications.ts (module load behavior)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pure formatter functions producing ntfy message payloads without user name"
    requirement: NOTIFY-08
    verification:
      - kind: unit
        ref: "backend/src/__tests__/services/notification.formatters.test.ts (10 tests)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-06-29
status: complete
---

# Phase 9 Plan 1: Foundation Summary

**Prisma schema migration with notification columns, config module for NTFY_BASE_URL, and pure formatter functions for ntfy message payloads**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-29T17:00:00Z
- **Completed:** 2026-06-29T17:08:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Prisma schema updated with User.ntfyTopic, ChoreAssignment.dueNotifiedAt, RecurringOccurrence.dueNotifiedAt
- Config module reads NTFY_BASE_URL at module load, logs single warning when unset
- Pure formatter functions (assignedBody, dueSoonBody, completedBody) produce ntfy payloads
- 10 unit tests covering all formatter functions and edge cases
- .env.example documents NTFY_BASE_URL configuration

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema migration + config module + .env.example** - `4b44b66` (feat)
2. **Task 2: Notification formatters + tests** - `40de321` (feat)

## Files Created/Modified
- `backend/prisma/schema.prisma` - Added 3 nullable notification columns
- `backend/src/config/notifications.ts` - Config module for NTFY_BASE_URL
- `backend/src/services/notification.formatters.ts` - Pure formatter functions
- `backend/src/__tests__/services/notification.formatters.test.ts` - 10 unit tests
- `backend/.env.example` - Added NTFY_BASE_URL documentation

## Decisions Made
- Module-level env guard reads NTFY_BASE_URL at import time, logs single warning when unset
- Formatter functions are pure (no side effects, no env reads) for easy unit testing
- Click header uses relative path /chores/{id} per NOTIFY-08 lock-screen privacy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Prisma schema ready for Phase 10 (Profile UI + User topic route)
- Config module ready for Phase 11-13 (notification triggers)
- Formatters ready for Phase 11-13 (domain wrappers)

---
*Phase: 09-foundation*
*Completed: 2026-06-29*
