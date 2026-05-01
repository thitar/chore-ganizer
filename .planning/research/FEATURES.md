# Feature Landscape: Test Coverage Remediation

**Domain:** Codebase quality — focused test expansion for Express.js + React chore management app
**Researched:** 2026-05-01
**Confidence:** HIGH (verified against actual codebase test infrastructure)

---

## Executive Context

The Chore-Ganizer codebase has established test infrastructure (Jest 30, Vitest 4.1, Playwright, Prisma mocking, integration DB lifecycle) but significant coverage gaps: zero controller unit tests across 15 controllers, 8 untested services (especially the recurring-chores subsystem), 22% frontend coverage, and untested critical paths like CSRF retry logic and overdue penalty edge cases. The CONCERNS.md audit identified these gaps as HIGH priority for the recurring-chores and overdue-penalty areas. This document maps what to build, in what order, and what to avoid.

The existing test infrastructure is solid — `test-helpers.ts` provides `createPrismaMock()`, `createMockRequest()`, `createMockResponse()`, and comprehensive fixture factories. The integration test suite has a proper DB lifecycle (`global-setup.ts` / `global-teardown.ts`). The frontend `client.test.ts` demonstrates a sophisticated Axios interceptor mock pattern. This remediation builds on strong foundations.

---

## Table Stakes

*Features that must exist for the project to be considered production-grade in testing rigor. Missing any of these leaves the codebase fragile to regressions.*

### 1. Controller Unit Tests — HTTP Layer Isolation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Test all 15 controllers for parameter parsing | Controllers are the HTTP boundary — malformed params are the #1 source of 400/500 errors | **Medium** | Test pattern already exists in test-helpers (`createMockRequest`, `createMockResponse`, `createMockNext`, `expectResponse`) |
| Test response envelope format (success/error) | Ensures API contract consistency: `{ success, data, error }` | **Low** | Simple snapshot or object match assertions |
| Test authorization checks in controllers | Prevents privilege escalation regressions | **Medium** | Mock `req.user` with different roles; verify 403 responses |
| Test query parameter coercion (string → number → Date) | Controllers do `Number(req.query.userId)` and `new Date(dueDateFrom)` — no validation of parse failures | **Medium** | Need tests for `NaN`, `Invalid Date`, missing params |

**Pattern (already established in codebase):**
```typescript
// From test-helpers.ts
const req = createMockRequest({
  query: { userId: '2', status: 'PENDING' },
  user: mockUsers.parent,
})
const res = createMockResponse()

await getAssignments(req as Request, res as Response, jest.fn())

expect(res.status).toHaveBeenCalledWith(200)
expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({ success: true })
)
```

**Controllers to test (priority order):**
1. `chore-assignments.controller.ts` — parameter mapping (`userId` → `assignedToId`), date coercion
2. `recurring-chores-occurrences.controller.ts` — nested ternary extraction, date range parsing
3. `pocket-money.controller.ts` — pagination params, balance calculations (this is the fattest controller at 817 lines, but pre-extraction to `PocketMoneyService` per TECH-03)
4. `recurring-chores-crud.controller.ts` — CRUD operations
5. `overdue-penalty.controller.ts` — penalty trigger params
6. `chore-templates.controller.ts`, `chore-categories.controller.ts` — basic CRUD
7. `users.controller.ts` — role-based gates
8. `notification-settings.controller.ts` — settings persistence
9. `statistics.controller.ts` — aggregation params
10. `auth.controller.ts` — session management
11. `notifications.controller.ts` — polling/pagination
12. `health.controller.ts` — DB check, memory check
13. `metrics.controller.ts` — prometheus formatting
14. `audit.controller.ts` — log retrieval

### 2. Service Unit Tests — Business Logic Isolation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Test all 8 untested services with mocked Prisma | Services contain 100% of business logic per architectural convention | **High** (recurrence logic is date-heavy) | Use `createPrismaMock()` from test-helpers |
| Test transform.service.ts input type safety | Currently takes `dbRecord: any` — fragile to Prisma query changes | **Low** | Verify transformation output shape with valid and invalid inputs |
| Test occurrence-management.service.ts safeParse error path | Catches JSON parse errors but consumes original data — data corruption goes undetected | **Medium** | Test with malformed JSON to verify error message includes context |

**Pattern:**
```typescript
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    recurringChore: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      // ... specific to service under test
    },
  },
}))
```

### 3. Overdue Penalty Edge Case Testing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Test $transaction atomicity for penalty application | Currently read-then-write without transaction → race condition (PERF-01) | **High** | Must mock `prisma.$transaction` to verify both operations execute atomically |
| Test double-penalty prevention | `penaltyApplied` flag must prevent re-penalization even with concurrent calls | **High** | Test that second penalty attempt throws when `penaltyApplied === true` |
| Test timezone boundary conditions | Due dates at 23:59 UTC vs 00:01 next day; DST transitions | **High** | Use `jest.useFakeTimers()` + `jest.setSystemTime()` as existing tests do |
| Test integer rounding for penalty multipliers | Penalty = `Math.round(points * multiplier)` — fractional multipliers must produce integer penalties | **Medium** | Already partially tested; need 1.25x, 1.5x, 1.75x multipliers |

**Existing coverage in this area:** `overdue-penalty.service.test.ts` has 18 tests covering double-penalty guard, integer math, DST transitions, leap years. The gap is the `$transaction` wrapper and `processAllOverdue` integration.

### 4. CSRF Token Retry Logic Testing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Test CSRF retry with fresh token succeeds | Core resilience mechanism against expired CSRF tokens | **Medium** | `client.test.ts` already covers this with `createMockAxiosInstance()` |
| Test CSRF retry fails after max attempts (1 retry) | Prevents infinite loops | **Medium** | Already covered in existing test: "should fail after one retry if CSRF error persists" |
| Test CSRF not retried for non-CSRF 403 errors | Avoids unnecessary retries on FORBIDDEN, ROLE_RESTRICTED | **Medium** | Already covered in existing test |
| Test CSRF_TOKEN_MISSING triggers retry (not just INVALID) | Both error codes should trigger token refresh | **Medium** | Already covered in existing test |

**Current coverage assessment:** The 5 CSRF tests in `client.test.ts` already cover the critical paths. The `as any` cast on `_csrfRetryCount` (line 118, 125 of client.ts) is a type-safety issue (DEPS-04) rather than a test gap. No additional CSRF tests are urgently needed — the existing ones are thorough.

### 5. 401 Auto-Logout Event Dispatch Testing

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Test that 401 responses dispatch `auth:unauthorized` DOM event | Core session-expiry handling — untested path | **Medium** | Already covered in `client.test.ts` "should dispatch auth:unauthorized event on 401 response" |
| Test that `useAuth` hook clears state on `auth:unauthorized` event | Frontend auth state must reset on logout | **Medium** | Already covered in `useAuth.test.tsx` "should clear auth state when auth:unauthorized event is dispatched" |
| Test event listener cleanup on unmount | Prevents memory leaks and state corruption | **Medium** | Already covered in `useAuth.test.tsx` "should remove event listener on unmount" |

**Current coverage assessment:** The 401 auto-logout flow is actually well-tested across `client.test.ts` and `useAuth.test.tsx`. The CONCERNS.md reported this as untested but the tests exist. No additional tests needed.

### 6. Frontend Test Expansion (22% → 50%)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add page-level tests for untested pages (13 of 14 missing) | Pages are the integration point for hooks + components + API | **High** (13 files) | Focus on smoke tests first: renders without error, shows loading state |
| Test hook-level tests for `useChores`, `useNotifications`, `usePocketMoney` | Custom hooks encapsulate domain logic and API interaction | **Medium** | Pattern: mock API module, renderHook, verify state transitions |
| Test form submission error handling | Form validation errors, API errors, network errors must show user feedback | **Medium** | Test that error messages appear in DOM after mock rejection |
| Test loading states for all async components | UI must show loading indicators during API calls — currently untested | **Low** | Simple assertion: loading spinner visible before mock resolves |

**Frontend test priorities (by impact per test):**
1. `useChores` hook — highest domain logic concentration
2. `ChoreAssignmentModal` (if exists) or equivalent — form validation + API integration
3. `PocketMoney` page — points display, transaction history
4. `RecurringChores` page — recurrence config, occurrence display
5. `Notifications` page — polling behavior, notification list

### 7. Integration Test DB Lifecycle Robustness

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Test DB health check before test run starts | Prevents cryptic failures from stale/corrupt test DB | **Low** | Add `prisma.$queryRaw\`SELECT 1\`` to `global-setup.ts` |
| Test DB teardown verification | Ensures `test-db/` is cleaned even if tests crash | **Medium** | Current teardown uses try/catch but doesn't verify deletion |
| SQLite WAL/journal cleanup in teardown | SQLite creates `-journal` and `-wal` files that must be cleaned | **Low** | Already handled in `global-teardown.ts` lines 27–34 |

---

## Differentiators

*Features that would make this project's test suite exceptional. Not required for production-readiness but deliver outsized value.*

### 1. Race Condition Simulation Tests

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Concurrent penalty processing test | Verify `$transaction` prevents double-penalization under parallel execution | **High** | Use `Promise.all([applyPenalty(id), applyPenalty(id)])` — second must throw |
| Concurrent point transaction test | Pocket money operations must be atomic (points are integer, stored in cents) | **High** | Test that concurrent point deductions don't produce wrong balance |

**Implementation approach:**
```typescript
it('should prevent double-penalty under concurrent calls', async () => {
  (prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue({
    id: 1, penaltyApplied: false, /* ... */
  })

  const results = await Promise.allSettled([
    overdueService.applyOverduePenalty(1, 2),
    overdueService.applyOverduePenalty(1, 2),
  ])

  const fulfilled = results.filter(r => r.status === 'fulfilled')
  const rejected = results.filter(r => r.status === 'rejected')
  expect(fulfilled).toHaveLength(1)
  expect(rejected).toHaveLength(1)
})
```

### 2. Snapshot Testing for API Response Contracts

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Response shape snapshots for all endpoints | Catches inadvertent API contract changes in CI | **Low** | Add `toMatchSnapshot()` for each controller's success response |
| Swagger/OpenAPI spec validation against response snapshots | Ensures docs stay in sync with actual responses | **Medium** | CI already runs `docs:validate` — snapshots add response shape verification |

**Warning:** Snapshot tests are brittle if response shapes change intentionally. Use only for stable endpoints and update snapshots as part of API versioning.

### 3. Property-Based Testing for Recurrence Logic

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Test recurrence rule generation with random inputs | Catches edge cases in date arithmetic that manual tests miss | **High** | Use `fast-check` or similar library; feed random `recurrenceRule` JSON and verify output invariants |
| Test round-robin assignment fairness | Verify round-robin distributes chores evenly over many iterations | **High** | Run 100 rounds, assert each user gets ~equal assignments (±1) |

**Verdict:** Defer to future milestone. The recurring-chores service unit tests (Table Stakes #2) should cover deterministic edge cases first. Property-based testing is valuable but adds complexity to the test infrastructure.

### 4. Axios Interceptor Type Safety (Remove `as any` Casts)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Type the `_csrfRetryCount` property via Axios config extension | Eliminates `as any` cast on `originalRequest._csrfRetryCount` | **Low** | Annotate test pattern; implementation is in source code |
| Type the `error.response.data` via Axios error type guard | Eliminates `as any` cast in CSRF error code check | **Medium** | Define `interface CsrfErrorData { error: { code: string } }` |

**Implementation:**
```typescript
// In client.ts (source change, not test change)
import { AxiosError, InternalAxiosRequestConfig } from 'axios'

interface CsrfRetryConfig extends InternalAxiosRequestConfig {
  _csrfRetryCount?: number
}

// Then in interceptor:
const originalRequest = error.config as CsrfRetryConfig
const retryCount = originalRequest._csrfRetryCount || 0
```

This should be tested by verifying that TypeScript compilation succeeds without errors — the existing CSRF retry tests suffice for behavior.

### 5. Backend Coverage Gate in CI

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Set minimum coverage thresholds in `jest.config.js` | Prevents coverage regression on PRs | **Low** | Add `coverageThreshold` to jest config |
| Per-domain coverage targets | Controllers: 80%, Services: 90%, Middleware: 95% | **Low** | Configure `global`, `branches`, `functions`, `lines`, `statements` |

**Configuration:**
```javascript
// jest.config.js addition
coverageThreshold: {
  global: {
    branches: 60,
    functions: 70,
    lines: 70,
    statements: 70,
  },
  './src/controllers/': {
    branches: 70,
    functions: 80,
    lines: 80,
  },
  './src/services/': {
    branches: 80,
    functions: 90,
    lines: 90,
  },
}
```

---

## Anti-Features

*Testing approaches to explicitly avoid. These cause harm: brittle tests, false confidence, maintenance burden.*

### 1. Mocking Prisma at the Controller Level

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Mocking Prisma in controller tests to test business logic | Controller tests should verify HTTP parameter handling and response formatting — not business logic. Mocking Prisma in controllers creates brittle tests that break when service signatures change. | Mock the *service* layer, not Prisma. Controllers call services — mock `jest.mock('../services/chore-assignments.service')`. Let service tests handle Prisma mocking. |

**Bad:**
```typescript
jest.mock('../../config/database') // Mock Prisma directly in controller test
// Controller test now couples to Prisma query structure
```

**Good:**
```typescript
jest.mock('../../services/chore-assignments.service', () => ({
  getAllAssignments: jest.fn(),
  // ... only the functions the controller calls
}))
const mockService = require('../../services/chore-assignments.service')
// Controller test only verifies: service called with right args, response formatted correctly
```

### 2. Integration Tests for Error Handling That Unit Tests Cover

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Writing integration tests for every 400/403/404/500 scenario | Integration tests are 100x slower than unit tests. Testing every error permutation via HTTP is wasteful when the error handling logic is identical. | Test one error path per controller via unit test (mocked service throws `AppError`). Test the global error handler via a focused middleware test. Use integration tests only for end-to-end flows that span multiple layers. |

### 3. Snapshot Testing Dynamic Data

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Taking snapshots of responses containing `createdAt`, `updatedAt`, auto-generated IDs | Snapshots break on every test run due to timestamp differences. Creates noisy CI failures and snapshot-update fatigue. | Use `expect.objectContaining()` or `expect.any(Date)` for dynamic fields. Only snapshot static response structures. |

### 4. Testing Implementation Details vs. Behavior

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Asserting that `prisma.user.update` was called with specific arguments | Tests implementation details — if the service refactors to use `prisma.$executeRaw` instead, tests break even though behavior is identical. | Assert output behavior: "user now has -20 points" rather than "update was called with increment: -20". For services, test the return value and side effects visible to callers. Only assert on mock calls for critical transactional guarantees (e.g., $transaction wrapping). |

**Exception:** For security-critical paths (auth, CSRF, RBAC), asserting exact mock call arguments is appropriate. For business logic, prefer behavior assertions.

### 5. Testing React Component Internal State

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Testing `useState` values, refs, or internal variables directly | These are implementation details. React refactors (useReducer → useState, state lifting) break tests. | Test what the user sees: DOM output, aria labels, text content. Use `screen.getByText()`, `screen.getByRole()` not `component.state` or `wrapper.instance()`. |

### 6. Skipping `act()` Warnings with `waitFor` Overuse

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Wrapping every assertion in `waitFor()` to suppress act() warnings | Masks genuine state update bugs. Tests pass but app may have rendering issues. | Fix the root cause: ensure all state updates are wrapped in `act()` (React Testing Library does this automatically for `fireEvent` and `userEvent`). Only use `waitFor` for truly async operations. |

### 7. Mocking `Date.now()` Instead of Using Fake Timers

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| `jest.spyOn(Date, 'now').mockReturnValue(...)` for time-dependent tests | Doesn't affect `setTimeout`, `new Date()`, or `Date.parse()`. Gives false confidence that time is controlled. | Use `jest.useFakeTimers()` + `jest.setSystemTime()`. The overdue-penalty tests already use this correctly — follow that pattern everywhere. |

---

## Feature Dependencies

```
Controller tests (Table Stakes #1)
    ← depends on → Service mocks exist (already satisfied by test-helpers.ts)
    ← should be written AFTER → Service extraction (TECH-03: PocketMoneyService)

Service tests (Table Stakes #2)
    ← depends on → createPrismaMock() (already exists in test-helpers.ts)
    ← depends on → Prisma $use → $extends migration (TECH-02) for transform.service.ts tests

Overdue penalty tests (Table Stakes #3)
    ← depends on → $transaction refactoring (PERF-01)
    ← blocks nothing (existing tests are adequate for regression)

Frontend expansion (Table Stakes #6)
    ← depends on → API mocks (vi.mock pattern already established)
    ← can start immediately — no blocking dependencies

Coverage gates (Differentiator #5)
    ← depends on → All Table Stakes completed
    ← should be LAST step before milestone completion
```

---

## MVP Recommendation

**Immediate priorities (must-do for this milestone):**

1. **Controller unit tests for the 5 highest-impact controllers** (Table Stakes #1):
   - `chore-assignments.controller.ts` — parameter mapping, date coercion
   - `recurring-chores-occurrences.controller.ts` — nested ternary extraction
   - `pocket-money.controller.ts` — after TECH-03 extraction
   - `overdue-penalty.controller.ts` — trigger params
   - `recurring-chores-crud.controller.ts` — CRUD validation

2. **Service unit tests for the 4 highest-risk untested services** (Table Stakes #2):
   - `recurring-chores/transform.service.ts` — type safety
   - `recurring-chores/occurrence-management.service.ts` — data validation error path
   - `recurring-chores/occurrence.service.ts` — occurrence generation logic
   - `recurring-chores/recurring-chore-management.service.ts` — CRUD + round-robin

3. **Overdue penalty $transaction coverage** (Table Stakes #3):
   - `processAllOverdue` with mocked `$transaction`
   - Concurrent penalty prevention test

**Defer to after Table Stakes complete:**
- Property-based testing for recurrence logic — complex setup, uncertain ROI
- Full 50% frontend coverage — target the 3-4 highest-impact hooks/pages first, then re-evaluate
- Remaining 9 controller tests — lower risk, can be added incrementally

**Out of scope for this milestone (already adequate):**
- CSRF retry logic tests — already tested in `client.test.ts`
- 401 auto-logout tests — already tested in `client.test.ts` and `useAuth.test.tsx`
- Additional integration tests — existing 4 integration test files cover core flows

---

## Sources

- **Codebase analysis** (HIGH): Examined `backend/src/__tests__/`, `frontend/src/**/*.test.tsx`, `e2e/`, `jest.config.js`, `jest.integration.config.js`, `CONCERNS.md`, `TESTING.md` — actual test infrastructure verified
- **Existing test patterns** (HIGH): `overdue-penalty.service.test.ts` (18 tests, comprehensive timezone/rounding/leap-year coverage), `auth.service.test.ts`, `client.test.ts` (376 lines, robust Axios interceptor mocking), `useAuth.test.tsx` (286 lines, 401 event + cleanup testing)
- **CONCERNS.md** (HIGH): Identifies 15 untested controllers, 8 untested services, overdue penalty edge cases, 22% frontend coverage
- **PROJECT.md** (HIGH): Confirms TEST-01 through TEST-05 as active requirements for this milestone
