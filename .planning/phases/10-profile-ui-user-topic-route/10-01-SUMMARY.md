---
phase: 10-profile-ui-user-topic-route
plan: 01
subsystem: api
tags: [ntfy, prisma, express, tdd]

requires:
  - phase: 09-foundation
    provides: [Prisma User.ntfyTopic column, notification.service]

provides:
  - updateNtfyTopic service function with format validation, uniqueness check, and clear support
  - PUT /me/ntfy-topic authenticated route

affects: [10-02]

tech-stack:
  added: []
  patterns: [ntfy-topic-validation, fire-and-forget-ntfy]

key-files:
  created: []
  modified:
    - backend/src/services/users.service.ts
    - backend/src/routes/users.routes.ts
    - backend/src/__tests__/services/users.service.test.ts

key-decisions:
  - "NTFY_TOPIC_REGEX /^[-_A-Za-z0-9]{12,64}$/ — 12-char minimum because topic is an access token"
  - "Null and empty string both normalize to null for clearing topic"

patterns-established:
  - "ntfy-topic-validation: regex + uniqueness check + null normalization pattern"

requirements-completed: [NOTIFY-01]

coverage:
  - id: D1
    description: "updateNtfyTopic service function with format validation, uniqueness check, and clear support"
    requirement: "NOTIFY-01"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/services/users.service.test.ts#updateNtfyTopic"
        status: pass
    human_judgment: false
  - id: D2
    description: "PUT /me/ntfy-topic route with authenticate middleware"
    requirement: "NOTIFY-01"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/services/users.service.test.ts#updateNtfyTopic"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-06-30
status: complete
---

# Phase 10 Plan 01: updateNtfyTopic Service + Route Summary

**Backend updateNtfyTopic service with regex validation, uniqueness check, and PUT /me/ntfy-topic route — all via TDD (8 tests)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-30T19:32:14Z
- **Completed:** 2026-06-30T19:35:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- updateNtfyTopic service function validates topic format (12-64 chars, alphanumeric + hyphens + underscores), checks uniqueness via findFirst excluding current user, and normalizes null/empty to null
- PUT /me/ntfy-topic route requires authenticate middleware and delegates to the service
- 8 unit tests covering: valid update, null/empty clear, short topic, invalid chars, 409 conflict, no self-conflict, too long

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for updateNtfyTopic** - `2f77162` (test)
2. **Task 2: Implement updateNtfyTopic service + route** - `b5d4afc` (feat)

## Files Created/Modified
- `backend/src/services/users.service.ts` - Added NTFY_TOPIC_REGEX constant and updateNtfyTopic function
- `backend/src/routes/users.routes.ts` - Added PUT /me/ntfy-topic route with authenticate middleware
- `backend/src/__tests__/services/users.service.test.ts` - Added findFirst mock and 8 updateNtfyTopic test cases

## Decisions Made
- NTFY_TOPIC_REGEX `^[-_A-Za-z0-9]{12,64}$` — 12-char minimum because topic is an access token
- Null and empty string both normalize to null for clearing topic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend API contract for ntfy topic is ready for Plan 2 (frontend Profile page integration)
- Plan 2 can consume PUT /me/ntfy-topic and GET /me (with ntfyTopic in select)

---
*Phase: 10-profile-ui-user-topic-route*
*Completed: 2026-06-30*
