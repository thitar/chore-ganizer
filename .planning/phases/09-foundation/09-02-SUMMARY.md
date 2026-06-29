---
phase: 09-foundation
plan: 02
subsystem: api
tags: [ntfy, notifications, fire-and-forget, fetch]

# Dependency graph
requires:
  - phase: 09-01
    provides: "Config module (config/notifications.ts) and formatters (notification.formatters.ts)"
provides:
  - "Notification transport service (sendNtfy) with fire-and-forget pattern"
  - "Domain wrappers (notifyChoreAssigned, notifyChoreDueSoon, notifyChoreCompleted)"
affects: [phase-11, phase-12, phase-13]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget, internal-error-swallowing, domain-wrappers]

key-files:
  created:
    - backend/src/services/notification.service.ts
    - backend/src/__tests__/services/notification.service.test.ts
  modified: []

key-decisions:
  - "sendNtfy wraps fetch in try/catch with AbortSignal.timeout(3000), never throws"
  - "Domain wrappers accept pre-resolved Prisma objects, fire void sendNtfy"
  - "notifyChoreCompleted fans out to all parents' topics, skipping null"

patterns-established:
  - "Fire-and-forget: void sendNtfy(...) at call sites, errors caught internally"
  - "Domain wrappers: accept typed Prisma objects, extract topic, fire notification"

requirements-completed: [NOTIFY-01, NOTIFY-05, NOTIFY-06, NOTIFY-08]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Notification transport service with fire-and-forget pattern and 3s timeout"
    requirement: NOTIFY-06
    verification:
      - kind: unit
        ref: "backend/src/__tests__/services/notification.service.test.ts (8 sendNtfy tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Domain wrappers routing notifications to correct topics"
    requirement: NOTIFY-01
    verification:
      - kind: unit
        ref: "backend/src/__tests__/services/notification.service.test.ts (12 wrapper tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Graceful degradation when NTFY_BASE_URL is unset"
    requirement: NOTIFY-05
    verification:
      - kind: unit
        ref: "backend/src/__tests__/services/notification.service.test.ts (unconfigured tests)"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-06-29
status: complete
---

# Phase 9 Plan 2: Notification Transport Summary

**Notification transport service with fire-and-forget pattern, 3s timeout, and domain wrappers for chore events**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-29T17:08:00Z
- **Completed:** 2026-06-29T17:13:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- sendNtfy POSTs to ntfy with correct URL, headers, body, and 3s timeout
- sendNtfy catches all errors internally — no unhandled rejection
- When NTFY_BASE_URL unset, sendNtfy silently no-ops (no fetch call)
- notifyChoreAssigned fires to assigned user's topic
- notifyChoreDueSoon fires to assigned user's topic
- notifyChoreCompleted fans out to all parents with topics, skips null
- 20 unit tests covering configured, unconfigured, error, and wrapper paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Notification transport service** - `12fe7cf` (feat)
2. **Task 2: Service tests** - `12fe7cf` (feat)

## Files Created/Modified
- `backend/src/services/notification.service.ts` - Transport service + domain wrappers
- `backend/src/__tests__/services/notification.service.test.ts` - 20 unit tests

## Decisions Made
- sendNtfy wraps fetch in try/catch with AbortSignal.timeout(3000), never throws
- Domain wrappers accept pre-resolved Prisma objects, fire void sendNtfy
- notifyChoreCompleted fans out to all parents' topics, skipping null

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Notification transport complete, ready for Phase 11 (chore-assigned trigger)
- Domain wrappers ready to be called from assignment.service.create
- Full notification stack ready for integration

---
*Phase: 09-foundation*
*Completed: 2026-06-29*
