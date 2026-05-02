---
phase: 04-test-coverage-and-gates
plan: 02
tags: [test, coverage, unit-tests, service-layer, ci-gates]
requires: [03-03, 03-04]
affects: [jest.config.js, .github/workflows/ci-cd.yml]
tech-stack:
  added: []
  patterns:
    - "Prisma mocking per-model with jest.mock factory functions"
    - "$transaction atomicity tests via mockTx object"
    - "Cache mocking with getFromCache/setInCache/removeFromCache"
    - "`jest.resetAllMocks()` in beforeEach to prevent mockResolvedValueOnce leakage"
key-files:
  created:
    - backend/src/__tests__/services/pocket-money-balance.service.test.ts
    - backend/src/__tests__/services/pocket-money-points.service.test.ts
    - backend/src/__tests__/services/pocket-money-payouts.service.test.ts
    - backend/src/__tests__/services/pocket-money-config.service.test.ts
    - backend/src/__tests__/services/recurring-chore-management.service.test.ts
    - backend/src/__tests__/services/occurrence.service.test.ts
    - backend/src/__tests__/services/occurrence-management.service.test.ts
    - backend/src/__tests__/services/assignment.service.test.ts
    - backend/src/__tests__/services/transform.service.test.ts
    - backend/src/__tests__/services/chore-categories.service.test.ts
    - backend/src/__tests__/services/chore-templates.service.test.ts
  modified:
    - backend/src/__tests__/services/overdue-penalty.service.test.ts
    - backend/src/__tests__/services/notification-settings.service.test.ts
    - backend/src/__tests__/services/notifications.service.test.ts
    - backend/jest.config.js
    - .github/workflows/ci-cd.yml
decisions:
  - "Use jest.resetAllMocks() instead of clearAllMocks() to prevent mockResolvedValueOnce leakage between tests"
  - "Add coverageThreshold to jest.config.js rather than separate CI enforcement (Jest exit code handles it)"
  - "50/40/45/50 thresholds are conservative, matching ROADMAP ≥50% target"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-02"
  tests_before: "~520 passing"
  tests_after: "652 passing (43 suites)"
  coverage_statements: 72.26%
  coverage_branches: 69.15%
  coverage_functions: 73.69%
  coverage_lines: 71.04%
---

# Phase 04 Plan 02: Service Tests & Coverage Gates

Created 11 new service test files and enhanced 3 existing ones, increasing overall backend coverage from ~55% to ~72% statements. Added coverage thresholds (50/40/45/50) enforced by Jest exit code in CI.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jest `--testPathPattern` option renamed**
- **Found during:** Task 3 verification
- **Issue:** Jest 30 renamed `--testPathPattern` to `--testPathPatterns`
- **Fix:** Used `--testPathPatterns` instead
- **Files modified:** (CLI usage only)

**2. [Rule 1 - Bug] Unused AppError imports in 4 test files causing TS6133**
- **Found during:** Full test suite run
- **Issue:** Imported `AppError` but never used it in test assertions
- **Fix:** Removed unused imports from config, payouts, occurrence-management, and recurring-chore-management test files

**3. [Rule 1 - Bug] transformRecurringChore doesn't parse JSON recurrenceRule**
- **Found during:** Test failure
- **Issue:** Test expected JSON string parsing but function passes through Prisma's already-parsed value
- **Fix:** Updated test to pass pre-parsed object and document the pass-through behavior

**4. [Rule 1 - Bug] Incorrect call index for findMany in transaction history tests**
- **Found during:** Test failure (getTransactionHistory filter assertions)
- **Issue:** When `skip=0`, the priorTransactions call is skipped, shifting the main query to index 1 not 2
- **Fix:** Updated assertion indexes and simplified mock setup to match actual call pattern

**5. [Rule 1 - Bug] Missing 4th findUnique mock in getPointBalance parent-access test**
- **Found during:** Test failure (USD/EUR assertion)
- **Issue:** `getPointBalance` + internal `calculatePointBalance` make 4 `findUnique` calls but test only set up 3
- **Fix:** Added 4th `mockResolvedValueOnce` for the currency display lookup

**6. [Rule 1 - Bug] MockResolvedValueOnce leakage between tests**
- **Found during:** notification-service test failures
- **Issue:** `jest.clearAllMocks()` doesn't clear `mockResolvedValueOnce` queues, causing stale values to leak
- **Fix:** Switched to `jest.resetAllMocks()` in the notifications test file

**7. [Rule 3 - Blocking] $transaction mock corruption in overdue-penalty tests**
- **Found during:** Multiple tests failing after "throw and rollback" test
- **Issue:** Test changed `$transaction` mock implementation, breaking all subsequent tests
- **Fix:** Restored `mockImplementation` in `beforeEach` and made the "throw" test use `mockTx.user.update.mockRejectedValue` instead

## Coverage Results

| Metric | Before | After | Threshold | Status |
|--------|--------|-------|-----------|--------|
| Statements | ~55% | **72.26%** | ≥50% | ✅ |
| Branches | ~50% | **69.15%** | ≥40% | ✅ |
| Functions | ~55% | **73.69%** | ≥45% | ✅ |
| Lines | ~52% | **71.04%** | ≥50% | ✅ |

## Service Coverage Breakdown

| Service Directory | Coverage |
|------------------|----------|
| `src/services/` (top-level) | **87.66%** |
| `src/services/pocket-money/` | **93.48%** |
| `src/services/recurring-chores/` | **100%** |

## Commits

| Hash | Message |
|------|---------|
| 97d8458 | fix(04-02): fix test compilation and logic issues |
| 81aeb0e | feat(04-02): add coverage thresholds and CI gate |
| e3d1d67 | test(04-02): enhance overdue-penalty, notification-settings, notifications tests |
| 882e358 | test(04-02): add recurring-chore, category, template service tests |
| 7973641 | test(04-02): add pocket-money service unit tests |

## Self-Check: PASSED

All 11 new test files confirmed via `ls`:
- pocket-money-balance.service.test.ts ✅
- pocket-money-points.service.test.ts ✅
- pocket-money-payouts.service.test.ts ✅
- pocket-money-config.service.test.ts ✅
- recurring-chore-management.service.test.ts ✅
- occurrence.service.test.ts ✅
- occurrence-management.service.test.ts ✅
- assignment.service.test.ts ✅
- transform.service.test.ts ✅
- chore-categories.service.test.ts ✅
- chore-templates.service.test.ts ✅

All 3 enhanced files confirmed modified:
- overdue-penalty.service.test.ts ✅
- notification-settings.service.test.ts ✅
- notifications.service.test.ts ✅

All commits verified in git log ✅
`npx tsc --noEmit` passes ✅
`npm run test:coverage` passes with thresholds met (72.26% > 50%) ✅
