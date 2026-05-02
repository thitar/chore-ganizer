---
phase: 04-test-coverage-and-gates
plan: 03
subsystem: frontend-testing
tags:
  - coverage
  - frontend
  - vitest
  - ci
requires: []
provides: [TEST-04, TEST-05]
affects:
  - frontend/src/hooks/useAuth.test.tsx
  - frontend/src/pages/Login.test.tsx
  - frontend/src/pages/Dashboard.test.tsx
  - frontend/src/pages/Chores.test.tsx
  - frontend/src/pages/Users.test.tsx
  - frontend/vitest.config.ts
  - .github/workflows/ci-cd.yml
tech-stack:
  added: []
  patterns:
    - "Page tests mock hooks from '../hooks' barrel export"
    - "API mocks from '../api' for direct API calls in components"
    - "Sub-component mocks use vi.importActual for partial mocks"
    - "Form interactions use fireEvent.submit on form element"
key-files:
  created:
    - frontend/src/pages/Login.test.tsx
    - frontend/src/pages/Dashboard.test.tsx
    - frontend/src/pages/Chores.test.tsx
    - frontend/src/pages/Users.test.tsx
  modified:
    - frontend/src/hooks/useAuth.test.tsx
    - frontend/vitest.config.ts
    - .github/workflows/ci-cd.yml
decisions:
  - "Login error display uses toast (showError), not in-page error - tests verify toast mock"
  - "Sub-components (UserTable, Modal, ErrorDisplay) mocked for Users page to avoid deep rendering"
  - "PasswordStrengthIndicator mocked to report full strength synchronously for register tests"
  - "vi.importActual used for partial module mocks (common, debug) to preserve unimplemented exports"
metrics:
  duration: 9m 30s
  tasks-completed: 4
  test-files-before: 3 frontend test files
  test-files-after: 7 frontend test files
  tests-before: 195
  tests-after: 245
  useAuth-branch-coverage: 23.07% → 84.61%
  overall-statement-coverage: 76.41% → 68.05% (includes new uncovered page code)
completed-date: 2026-05-02
---

# Phase 04 Plan 03: Frontend Coverage & Gates Summary

Frontend test coverage increased with enhanced hook tests and 4 new page test files. Vitest coverage thresholds configured and CI updated to enforce them.

## Task Results

| Task | Name                      | Commit | Files                                                    |
| ---- | ------------------------- | ------ | -------------------------------------------------------- |
| 1    | Enhance useAuth coverage  | d52910e | `frontend/src/hooks/useAuth.test.tsx` (MODIFY)           |
| 2    | Login & Dashboard tests   | 980df8a | `frontend/src/pages/Login.test.tsx`, `Dashboard.test.tsx` |
| 3    | Chores & Users tests      | 1051ee6 | `frontend/src/pages/Chores.test.tsx`, `Users.test.tsx`   |
| 4    | Coverage thresholds & CI  | 552c76f | `frontend/vitest.config.ts`, `.github/workflows/ci-cd.yml` |

## Coverage Summary

### useAuth.tsx Branch Coverage: 23.07% → 84.61%

**New test coverage areas:**
- AuthProvider children rendering (authenticated and unauthenticated)
- Login flow transitions (isAuthenticated false→true, network error, error clearing)
- `auth:unauthorized` event edge cases (missing detail, null detail)
- Visibility change and focus re-check branches
- Edge case calls (double logout, register network error, logout API error)
- `useAuth` context error (called outside AuthProvider)
- `refreshUser` success and error paths

### Overall Frontend Coverage

| Metric   | Before | After |
|----------|--------|-------|
| Statements | 76.41% | 68.05% |
| Branches   | 63.61% | 59.27% |
| Functions  | 79.61% | 66.52% |
| Lines      | 77.28% | 69.01% |

Note: Overall coverage % decreased because the new page test files exercise a small % of actual page code, while the uncovered page code (sub-components, error paths, unused branches) is now included in the coverage calculation. The absolute covered LOC increased.

### Page Test Coverage Detail

| Page       | Stmts | Branch | Funcs | Lines |
|------------|-------|--------|-------|-------|
| Dashboard  | 80.85% | 57.83% | 65.21% | 82.14% |
| Login      | 80.64% | 75.43% | 80.00% | 80.64% |
| Chores     | 48.48% | 39.39% | 36.36% | 50.00% |
| Users      | 25.64% | 27.50% | 7.14%  | 26.31% |

Chores and Users have lower coverage because they delegate rendering to complex sub-components (ChoreList, ChoreForm, UserTable, Modal) which contain most of the rendering logic. The integration between the page and sub-components is tested.

## Deviations from Plan

### Rule 1 - Bug fixes

**1. Login tests: button count mismatch**
- **Found during:** Task 2
- **Issue:** Login page has 4 buttons (2 toggle tabs + 1 submit + 1 mode link), not 3 as initially assumed
- **Fix:** Updated button count to 4, used `querySelector('form')` + `fireEvent.submit` for form interactions instead of button click
- **Files modified:** `frontend/src/pages/Login.test.tsx`

**2. Login error rendered via toast, not inline**
- **Found during:** Task 2
- **Issue:** Login `handleSubmit` calls `showError()` (toast notification) for login failures, not `setErrors({ general: ... })`
- **Fix:** Test verifies `showError` mock was called with the error message instead of searching for in-page text
- **Files modified:** `frontend/src/pages/Login.test.tsx`

**3. Password strength validation blocks register flow**
- **Found during:** Task 2
- **Issue:** `validateForm()` checks `passwordStrength < 100` in register mode, but PasswordStrengthIndicator calls `onStrengthChange` asynchronously via useEffect
- **Fix:** Mocked PasswordStrengthIndicator to call `onStrengthChange(100)` synchronously on mount using `vi.importActual`
- **Files modified:** `frontend/src/pages/Login.test.tsx`

**4. Logout tests need waitFor for state flush**
- **Found during:** Task 1
- **Issue:** React 18 batches state updates - `setUser(null)` in logout's finally block causes stale closure when accessing `result.current.user` immediately after await
- **Fix:** Wrapped user assertions in `waitFor` to wait for state flush
- **Files modified:** `frontend/src/hooks/useAuth.test.tsx`

**5. Missing render import in useAuth test**
- **Found during:** Task 1
- **Issue:** AuthProvider children tests used `render()` without importing it
- **Fix:** Changed import from `@testing-library/react` to `../test/utils` which re-exports `render`
- **Files modified:** `frontend/src/hooks/useAuth.test.tsx`

### Rule 2 - Missing functionality

**6. Missing `../utils/debug` full export mock**
- **Found during:** Task 3
- **Issue:** Mocking only `debugError` broke `assignments.api.ts` which imports `debugLog` from the same module
- **Fix:** Used `vi.importActual` to preserve all exports while overriding `debugError` with a spy
- **Files modified:** `frontend/src/pages/Chores.test.tsx`

### Rule 3 - Blocking issues

None encountered beyond the above fixes.

## Known Stubs

None identified - all test files contain real assertions against actual component behavior.

## Threat Flags

None identified.

## Self-Check: PASSED

| Check | Status |
|-------|--------|
| useAuth.test.tsx exists | ✓ (19985 bytes, >200 lines) |
| Login.test.tsx exists | ✓ (6071 bytes, >80 lines) |
| Dashboard.test.tsx exists | ✓ (5737 bytes, >80 lines) |
| Chores.test.tsx exists | ✓ (5786 bytes, >80 lines) |
| Users.test.tsx exists | ✓ (5164 bytes, >80 lines) |
| useAuth coverage ≥80% | ✓ (84.61%) |
| Coverage thresholds in vitest.config.ts | ✓ (statements≥50, branches≥40, functions≥45, lines≥50) |
| CI updated to `npm run test:coverage` | ✓ |
| Coverage gate summary step added | ✓ |
| `npm run test:coverage` passes | ✓ (245 tests, all thresholds met) |
| All 4 commits exist | ✓ (d52910e, 980df8a, 1051ee6, 552c76f) |
