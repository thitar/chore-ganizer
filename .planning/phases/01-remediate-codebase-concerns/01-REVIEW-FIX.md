---
phase: 01-remediate-codebase-concerns
fixed_at: 2026-04-28T00:00:00Z
review_path: .planning/phases/01-remediate-codebase-concerns/01-REVIEW.md
iteration: 1
findings_in_scope: 18
fixed: 17
skipped: 1
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-28T00:00:00Z
**Source review:** .planning/phases/01-remediate-codebase-concerns/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 18
- Fixed: 17
- Skipped: 1

## Fixed Issues

### CR-02: SSRF Vulnerability via Ntfy Notification URL

**Files modified:** `backend/src/services/ntfy.service.ts`, `backend/src/services/notification-settings.service.ts`
**Commit:** cd96e49
**Applied fix:** Added `validateNtfyServerUrl()` helper that rejects private/internal IPs and non-HTTP(S) protocols. Called in `sendNtfyNotification`, `checkNtfyConnection`, and `updateSettings` before persisting or using URLs.

### CR-03: Uncaught Exception in Logout Callback

**Files modified:** `backend/src/controllers/auth.controller.ts`
**Commit:** 87f8248
**Applied fix:** Promisified `req.session.destroy()` so errors are properly caught by Express async error handling instead of throwing inside a callback context.

### CR-04: Unrestricted Parent Role Registration

**Files modified:** `backend/src/controllers/auth.controller.ts`
**Commit:** 886b372
**Applied fix:** Restricted public registration to `CHILD` role only by ignoring any `role` field from the request body.

### WR-01: Cannot Set Penalty Multiplier to Zero

**Files modified:** `backend/src/controllers/overdue-penalty.controller.ts`
**Commit:** 907f062
**Applied fix:** Changed truthy check to explicit `!== undefined` so `0` is accepted as a valid multiplier value.

### WR-02: Debug Logs Leak Session Cookies

**Files modified:** `backend/src/middleware/auth.ts`
**Commit:** 10bf3b2
**Applied fix:** Removed `cookies: req.headers.cookie` from debug log payload to prevent session ID disclosure.

### WR-03: API Response Format Inconsistency

**Files modified:** `backend/src/controllers/overdue-penalty.controller.ts`
**Commit:** 6780417
**Applied fix:** Standardized all controller responses to the `{ success, data, error: { message, code } }` envelope format.

### WR-04: JSON.parse Without Error Handling

**Files modified:** `backend/src/services/recurring-chores/transform.service.ts`, `backend/src/services/recurring-chores/occurrence-management.service.ts`, `backend/src/controllers/recurring-chores-occurrences.controller.ts`
**Commit:** 5450603
**Applied fix:** Wrapped all `JSON.parse` calls for `assignedUserIds` and `recurrenceRule` in try-catch blocks, throwing `AppError` with `DATA_INTEGRITY_ERROR` code on failure.

### WR-05: N+1 Query in Overdue Penalty Processing

**Files modified:** `backend/src/services/overdue-penalty.service.ts`
**Commit:** b590d0c
**Applied fix:** Moved `getAllParents()` call outside the `for...of` loop so parents are fetched once total instead of once per overdue chore.

### WR-06: Wrong Notification Type for Penalty

**Files modified:** `backend/src/services/overdue-penalty.service.ts`, `backend/src/services/ntfy.service.ts`, `backend/src/services/notification-settings.service.ts`
**Commit:** 967da6a
**Applied fix:** Added `PENALTY` to `NotificationPriorities` and `NotificationTags`, mapped it to `notifyChoreOverdue` in the type enabled map, added switch case for penalty notification content, and updated `notifyChildOfPenalty` to use `PENALTY` type instead of `POINTS_EARNED`.

### WR-07: Jest Mock Path Mismatch

**Files modified:** `backend/src/__tests__/services/overdue-penalty.service.test.ts`
**Commit:** 540f8f7
**Applied fix:** Removed `.js` extensions from `jest.mock` paths so they match the import paths used in the test file.

### WR-08: unhandledRejection Handler Masks Test Failures

**Files modified:** `backend/src/__tests__/integration/jest-setup.ts`
**Commit:** 4bba40a
**Applied fix:** Added `throw reason` to the global `unhandledRejection` handler so test failures are not masked.

### WR-09: Empty Object Cast as ChoreAssignment

**Files modified:** `frontend/src/api/assignments.api.ts`
**Commit:** ab9b82e
**Applied fix:** Replaced empty-object fallback with an explicit error throw when the response is missing assignment data.

### WR-10: Session Configuration Not Validated

**Files modified:** `backend/src/app.ts`
**Commit:** 6e19653
**Applied fix:** Added runtime validation for `SESSION_MAX_AGE` (exits on NaN or <= 0) and `SAMESITE_POLICY` (falls back to `strict` for invalid values).

### WR-11: Route Mounting Ambiguity for Recurring Chores

**Files modified:** `backend/src/routes/recurring-chores-occurrences.routes.ts`
**Commit:** 5723c13
**Applied fix:** Added a catch-all 404 handler at the end of the occurrences router to prevent unmatched occurrence paths from falling through to the CRUD router.

### WR-12: Missing asyncHandler on Several Routes

**Files modified:** `backend/src/routes/index.ts`, `backend/src/app.ts`
**Commit:** 3c17939
**Applied fix:** Wrapped `/health/live`, `/health/cache`, `/.well-known/security.txt`, and `/api/csrf-token` route handlers in `asyncHandler`.

### WR-13: Swagger Schema Missing YEARLY Frequency

**Files modified:** `backend/src/swagger.config.ts`
**Commit:** e478649
**Applied fix:** Added `'YEARLY'` to the `RecurrenceFrequency` enum in the OpenAPI schema definition.

### WR-14: Import Missing .js Extension

**Files modified:** `backend/src/swagger.config.ts`
**Commit:** 8ade690
**Applied fix:** Added `.js` extension to the `./version` import to align with ESM conventions used throughout the project.

## Skipped Issues

### CR-01: Malformed CI/CD Workflow YAML

**File:** `.github/workflows/ci-cd.yml:69`
**Reason:** code context differs from review — the "Validate Swagger documentation" step is already properly indented under the `backend` job's `steps:` block in the current codebase. No fix was needed.
**Original issue:** The step was reported as a top-level YAML list item that would cause GitHub Actions parsing to fail.

---

_Fixed: 2026-04-28T00:00:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
