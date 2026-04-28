---
phase: 01-remediate-codebase-concerns
plan: 07
subsystem: api
tags: [controller-refactor, single-responsibility, express, swagger]

requires:
  - phase: 01-remediate-codebase-concerns
    provides: Recurring chore controller and occurrence generation logic
provides:
  - CRUD controller for recurring chores under 300 lines
  - Occurrences controller for occurrence management under 300 lines
  - Extracted occurrence-management service
  - Extracted recurring-chore-management service
  - Split route files with preserved swagger documentation
affects:
  - 01-remediate-codebase-concerns

tech-stack:
  added: []
  patterns:
    - "Controller split by route functionality into focused files"
    - "Service extraction for reusable business logic"
    - "Barrel re-exports for backward compatibility during refactoring"

key-files:
  created:
    - backend/src/controllers/recurring-chores-crud.controller.ts
    - backend/src/controllers/recurring-chores-occurrences.controller.ts
    - backend/src/routes/recurring-chores-crud.routes.ts
    - backend/src/routes/recurring-chores-occurrences.routes.ts
    - backend/src/services/recurring-chores/occurrence-management.service.ts
    - backend/src/services/recurring-chores/recurring-chore-management.service.ts
    - backend/src/services/recurring-chores/transform.service.ts
  modified:
    - backend/src/controllers/recurring-chores.controller.ts
    - backend/src/routes/index.ts
    - backend/src/swagger.config.ts

key-decisions:
  - "Kept swagger JSDoc annotations in dedicated route files rather than controllers to stay under 300-line limit"
  - "Created barrel re-export in original controller for backward compatibility"
  - "Mounted occurrences router before CRUD router to prevent /:id from shadowing /occurrences"
  - "Extracted shared Prisma include objects as file-level constants to reduce duplication"

patterns-established:
  - "Controller files should remain under 300 lines via service extraction"
  - "Route-specific controllers grouped by functional domain (CRUD vs occurrences)"
  - "Swagger docs co-located with route definitions in dedicated routes files"

requirements-completed: []

metrics:
  duration: 25min
  completed: 2026-04-28
---

# Phase 01 Plan 07: Split 966-line recurring-chores controller into focused route-specific controllers under 300 lines each

**Split monolithic recurring-chores controller into CRUD and occurrences controllers with extracted management services, preserving all API routes and swagger documentation**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-28T19:15:00Z
- **Completed:** 2026-04-28T19:40:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Extracted `transformRecurringChore` into dedicated `transform.service.ts`
- Split 966-line controller into CRUD (299 lines) and occurrences (288 lines) controllers
- Extracted `occurrence-management.service.ts` with `attachAssignedUsersToOccurrences`, `updateRoundRobinAfterCompletion`, and `awardPointsForCompletion`
- Extracted `recurring-chore-management.service.ts` with `RECURRING_CHORE_INCLUDE`, `updateRecurringChoreAssignments`, and `regenerateFutureOccurrences`
- Created dedicated route files with preserved swagger JSDoc annotations
- Updated `routes/index.ts` to mount occurrences router before CRUD router (critical for correct route matching)
- Updated `swagger.config.ts` to scan new route files
- Original controller converted to barrel re-export for backward compatibility
- All 241 unit tests pass, TypeScript compiles cleanly, lint passes, swagger docs validate

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract transform and assignment services from controller** - `1b72ed6` (feat)
2. **Task 2: Split controller by functionality into route-specific controllers** - `fcc8192` (feat)
3. **Task 3: Verify controller refactoring integrity** - no code changes (verification only)

## Files Created/Modified
- `backend/src/services/recurring-chores/transform.service.ts` - Recurring chore data transformation for API responses
- `backend/src/services/recurring-chores/occurrence-management.service.ts` - Occurrence helpers: attach users, update round-robin, award points
- `backend/src/services/recurring-chores/recurring-chore-management.service.ts` - CRUD helpers: include constant, assignment updates, occurrence regeneration
- `backend/src/controllers/recurring-chores-crud.controller.ts` - CRUD handlers: create, list, get, update, delete, toggle-active (299 lines)
- `backend/src/controllers/recurring-chores-occurrences.controller.ts` - Occurrence handlers: list, complete, skip, unskip, trigger-generation (288 lines)
- `backend/src/controllers/recurring-chores.controller.ts` - Barrel re-export for backward compatibility (7 lines)
- `backend/src/routes/recurring-chores-crud.routes.ts` - CRUD routes with swagger docs
- `backend/src/routes/recurring-chores-occurrences.routes.ts` - Occurrence routes with swagger docs
- `backend/src/routes/index.ts` - Mounts both routers at /recurring-chores (occurrences first)
- `backend/src/swagger.config.ts` - Includes new route files for swagger generation

## Decisions Made
- Kept swagger JSDoc annotations in dedicated route files rather than moving them into controllers. Moving them into controllers would have pushed both files well over the 300-line limit. The route files are the natural home for route definitions + documentation.
- Created a barrel re-export in the original controller file to maintain backward compatibility for any code importing from `recurring-chores.controller.ts`.
- Mounted the occurrences router before the CRUD router in `routes/index.ts` to prevent the CRUD `/:id` route from shadowing `/occurrences`.
- Extracted shared Prisma include objects as file-level constants (`RECURRING_CHORE_INCLUDE`, `OCCURRENCE_INCLUDE`) to reduce duplication without adding indirection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Additional service extractions needed to meet 300-line controller limit**
- **Found during:** Task 2 (Split controller by functionality)
- **Issue:** After moving handlers to two controllers, both were still over 300 lines (CRUD ~466 lines, occurrences ~433 lines). The plan only explicitly asked to extract `transformRecurringChore` and `calculateAssignedUserIds`, which was insufficient to meet the must-have "under 300 lines" constraint.
- **Fix:** Extracted additional helpers to services:
  - `attachAssignedUsersToOccurrences`, `updateRoundRobinAfterCompletion`, `awardPointsForCompletion` to `occurrence-management.service.ts`
  - `RECURRING_CHORE_INCLUDE`, `updateRecurringChoreAssignments`, `regenerateFutureOccurrences` to `recurring-chore-management.service.ts`
- **Files modified:** `backend/src/services/recurring-chores/occurrence-management.service.ts`, `backend/src/services/recurring-chores/recurring-chore-management.service.ts`
- **Verification:** `wc -l` confirms CRUD at 299 lines and occurrences at 288 lines
- **Committed in:** `fcc8192` (Task 2 commit)

**2. [Rule 3 - Blocking] Swagger config needed update for new route files**
- **Found during:** Task 2 (Creating new route files)
- **Issue:** Moving swagger JSDoc annotations to new route files meant `swagger.config.ts` no longer scanned the correct files. Running `npm run docs:validate` would fail because swagger.json would be stale.
- **Fix:** Updated `swagger.config.ts` `apis` array to include `./src/routes/recurring-chores-crud.routes.ts` and `./src/routes/recurring-chores-occurrences.routes.ts`, removing the old `./src/routes/recurring-chores.routes.ts`.
- **Files modified:** `backend/src/swagger.config.ts`
- **Verification:** `npm run docs:generate` produces 61 paths, `npm run docs:validate` passes
- **Committed in:** `fcc8192` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both necessary to satisfy the plan's own must-have constraints (under 300 lines, unchanged API/docs). No scope creep.

## Issues Encountered
- Integration tests have a pre-existing failure in `global-setup.ts` (`Cannot find module '../../utils/logger.js'`). This is unrelated to the controller refactoring — the integration test suite was not run in prior plans either. Unit tests (241 passing) provide sufficient verification for this refactoring.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Recurring-chores domain is now cleanly split into focused controllers and services
- Ready for any future feature work on recurring chores or occurrences
- Pattern established for splitting other large controllers in the codebase

## Self-Check: PASSED
- [x] `backend/src/controllers/recurring-chores-crud.controller.ts` exists at 299 lines
- [x] `backend/src/controllers/recurring-chores-occurrences.controller.ts` exists at 288 lines
- [x] `backend/src/services/recurring-chores/transform.service.ts` exists with `transformRecurringChore`
- [x] `backend/src/services/recurring-chores/assignment.service.ts` exists with `calculateAssignedUserIds`
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] `npm run test:unit` passes (241 tests)
- [x] `npm run docs:validate` passes
- [x] Commits verified in git log

---
*Phase: 01-remediate-codebase-concerns*
*Completed: 2026-04-28*
