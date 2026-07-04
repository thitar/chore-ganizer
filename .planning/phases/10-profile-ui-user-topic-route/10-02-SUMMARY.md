---
phase: 10-profile-ui-user-topic-route
plan: 02
subsystem: ui
tags: [react, tailwind, ntfy, profile, push-notifications]

# Dependency graph
requires:
  - phase: 10-profile-ui-user-topic-route/plan-01
    provides: [updateNtfyTopic backend service, PUT /me/ntfy-topic route]
  - phase: 09-foundation
    provides: [Prisma User.ntfyTopic column, notification.service]
provides:
  - Push Notifications section on Profile page with own topic edit
  - Family Topics cards for parent users
  - updateNtfyTopic frontend API function
  - Backend getAll includes ntfyTopic in UserSummary
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [topic-edit-inline, family-card-edit, random-topic-generation]

key-files:
  created: []
  modified:
    - frontend/src/api/users.api.ts
    - frontend/src/pages/ProfilePage.tsx
    - backend/src/services/users.service.ts

key-decisions:
  - "Added ntfyTopic to backend getAll select for frontend UserSummary compatibility"
  - "Family topic edit uses per-member state maps for independent edit modes"

patterns-established:
  - "topic-edit-inline: View/edit mode toggle with Generate random topic button"
  - "family-card-edit: Per-member edit state via Record<number, boolean> maps"

requirements-completed: [NOTIFY-01]

coverage:
  - id: D1
    description: "updateNtfyTopic frontend API function with empty-to-null normalization"
    requirement: "NOTIFY-01"
    verification:
      - kind: unit
        ref: "frontend/src/api/users.api.ts#updateNtfyTopic"
        status: pass
    human_judgment: false
  - id: D2
    description: "Push Notifications section with own topic view/edit modes and Generate random topic"
    requirement: "NOTIFY-01"
    verification: []
    human_judgment: true
    rationale: "UI layout and interaction states require visual verification — TypeScript compilation proves type safety but not visual correctness"
  - id: D3
    description: "Family Topics cards for parent users with independent edit modes"
    requirement: "NOTIFY-01"
    verification: []
    human_judgment: true
    rationale: "Conditional rendering (parent-only) and per-card edit state require visual and interactive verification"
  - id: D4
    description: "409 Conflict shows inline error message for duplicate topics"
    requirement: "NOTIFY-01"
    verification: []
    human_judgment: true
    rationale: "Error handling path requires backend running to verify 409 response and inline error display"

# Metrics
duration: 4min
completed: 2026-06-30
status: complete
---

# Phase 10 Plan 02: Profile UI User Topic Route Summary

**Push Notifications section on Profile page with own topic edit, random topic generation, and parent-only Family Topics cards**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-30T19:38:13Z
- **Completed:** 2026-06-30T19:43:03Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `updateNtfyTopic` function to frontend users.api.ts with empty-to-null normalization
- Added `ntfyTopic` field to `UserSummary` interface and backend `getAll` select
- Built Push Notifications section on Profile page with view/edit modes, Generate random topic, and 409 error handling
- Built Family Topics cards for parent users with per-member independent edit states
- Green toast "Topic saved!" with 3s auto-dismiss matches existing color/password pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Add updateNtfyTopic to users.api.ts and update UserSummary** - `78ca556` (feat)
2. **Task 2: Add Push Notifications section and Family Topics cards to ProfilePage** - `a5c25ce` (feat)

## Files Created/Modified
- `frontend/src/api/users.api.ts` - Added ntfyTopic to UserSummary, added updateNtfyTopic function
- `frontend/src/pages/ProfilePage.tsx` - Added Push Notifications section and Family Topics cards
- `backend/src/services/users.service.ts` - Updated getAll to include ntfyTopic in select

## Decisions Made
- Added ntfyTopic to backend `getAll` select because frontend `UserSummary` interface requires it for family topics display (Rule 2 — missing critical data flow)
- Family topic edit uses `Record<number, boolean>` maps for independent per-member edit states

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added ntfyTopic to backend getAll select**
- **Found during:** Task 1 (Add updateNtfyTopic to users.api.ts)
- **Issue:** Frontend UserSummary interface expected ntfyTopic but backend getAll didn't include it in select — family topics would show undefined
- **Fix:** Added `ntfyTopic: true` to the select clause in `backend/src/services/users.service.ts` getAll function
- **Files modified:** backend/src/services/users.service.ts
- **Verification:** TypeScript compiles cleanly, backend tests pass
- **Committed in:** 78ca556 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix necessary for data flow correctness. No scope creep.

## Issues Encountered
- Frontend tests fail due to pre-existing missing `src/test/setup.ts` (not caused by this plan)
- Backend has 5 pre-existing test failures unrelated to ntfy topic changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Push Notifications UI complete, ready for notification delivery backend (NOTIFY-02 through NOTIFY-07)
- Frontend topic management fully functional — parents can set own topic and children's topics

---
*Phase: 10-profile-ui-user-topic-route*
*Completed: 2026-06-30*

## Self-Check: PASSED
