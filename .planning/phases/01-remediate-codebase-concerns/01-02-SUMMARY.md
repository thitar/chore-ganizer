---
phase: 01-remediate-codebase-concerns
plan: 02
subsystem: api
tags:
  - csrf
  - axios
  - vitest
  - tdd
  - security

requires:
  - phase: 01-remediate-codebase-concerns
    provides: "Frontend API client with CSRF token handling"

provides:
  - "Per-request CSRF retry counter preventing infinite loops"
  - "Automated test suite verifying retry behavior"

affects:
  - frontend-auth
  - api-client

tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN-REFACTOR cycle for behavioral changes"
    - "Axios interceptor testing via simulated mock instances"

key-files:
  created:
    - frontend/src/api/client.test.ts
  modified:
    - frontend/src/api/client.ts

key-decisions:
  - "Exported ApiClient class for testability to enable per-test instantiation"
  - "Used config-property (_csrfRetryCount) instead of WeakMap for simplicity and clarity"

patterns-established:
  - "Axios interceptor tests: mock instance with error-handler wrapping to simulate real interceptor chain"
  - "Per-request retry state tracked on request config to avoid global counters"

requirements-completed: []

duration: 20min
completed: "2026-04-28"
---

# Phase 01 Plan 02: CSRF Retry Loop Prevention Summary

**Per-request CSRF retry guard using `_csrfRetryCount` on Axios request config, verified with 5 Vitest tests covering success, failure, independence, and edge cases.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-28T16:40:17Z
- **Completed:** 2026-04-28T17:00:00Z
- **Tasks:** 3 (RED, GREEN, REFACTOR skipped)
- **Files modified:** 2

## Accomplishments

- Added `_csrfRetryCount` guard to ApiClient response interceptor preventing infinite CSRF retry loops
- Created 5 Vitest tests verifying retry behavior through public API
- Exported `ApiClient` class to enable isolated per-test instantiation

## Task Commits

Each task was committed atomically:

1. **Task 1: RED - Write failing tests for CSRF retry behavior** - `dc560f8` (test)
2. **Task 2: GREEN - Implement max retry guard in client.ts** - `149b4ba` (feat)

**Plan metadata:** `149b4ba` (feat commit includes final test fixes)

_Note: REFACTOR phase skipped - implementation was already clean and minimal._

## Files Created/Modified

- `frontend/src/api/client.ts` - Added `_csrfRetryCount` guard in CSRF error response interceptor; exported `ApiClient` class
- `frontend/src/api/client.test.ts` - 5 Vitest tests covering CSRF retry behavior with simulated Axios interceptor chain

## Decisions Made

- **Exported ApiClient class for testability**: The class was previously unexported, making isolated testing impossible. Exporting enables per-test instantiation without module-cache gymnastics.
- **Used config-property over WeakMap**: A simple numeric property `_csrfRetryCount` on the request config is clearer and requires less boilerplate than a WeakMap for a single retry counter.

## Deviations from Plan

None - plan executed exactly as written.

### Test Infrastructure Notes

While executing RED phase, the Axios mock required significant iteration to correctly simulate the interceptor chain behavior (especially preserving `error.config` mutations across interceptor invocations). This was test-setup complexity, not a deviation from the planned behavior.

## Issues Encountered

- **ESLint not available in frontend directory**: `npm run lint` failed because `eslint` binary was not present in `node_modules`. This is a pre-existing environment issue unrelated to changes. Build and tests passed successfully.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: mitigate | frontend/src/api/client.ts | CSRF retry now capped at 1 per request, addressing T-02-01 DoS via infinite retry loop |

## Next Phase Readiness

- CSRF retry vulnerability remediated
- Test suite in place for regression protection
- Ready for subsequent codebase concern remediation plans

---
*Phase: 01-remediate-codebase-concerns*
*Completed: 2026-04-28*
