# Domain Pitfalls: Test Coverage Remediation

**Domain:** Expanding test coverage in an Express.js + React + SQLite codebase
**Researched:** 2026-05-01
**Confidence:** HIGH (based on examination of existing test infrastructure and common testing anti-patterns)

---

## Critical Pitfalls

*Mistakes that cause rewrites, systemic test fragility, or false confidence. These must be actively prevented.*

### Pitfall 1: Controller Tests That Mock Prisma Instead of Services

**What goes wrong:** A developer writes a controller test that mocks `prisma.choreAssignment.findMany` directly, asserting that the controller constructs the right Prisma query. When the `PocketMoneyService` is extracted (TECH-03), the controller no longer calls Prisma directly — all tests break.

**Why it happens:** The controller currently has `prisma` calls (notably `pocket-money.controller.ts` with 27 direct calls). Developers see the existing pattern and test it, not realizing the code is being refactored.

**Consequences:** All controller tests become obsolete after service extraction. Rewriting them wastes time. Worse, the tests create false confidence that "the controller works" when the real code path (controller → service → Prisma) is untested.

**Prevention:**
1. Mock services, not Prisma, in every controller test from day one.
2. For `pocket-money.controller.ts` specifically: write tests AFTER TECH-03 extraction, or mock the future service interface now.
3. Add an ESLint rule or code review checklist that flags `jest.mock('../../config/database')` in controller test files.

**Detection:** If a controller test imports `prisma from '../../config/database'`, it's mocking the wrong layer. Controller tests should only import the controller function and the services it calls.

### Pitfall 2: Writing Tests Without Reading test-helpers.ts First

**What goes wrong:** A developer creates a test file and manually constructs mock Express request/response objects, or manually builds a Prisma mock from scratch. The result: inconsistent mock shapes across test files, missing properties, tests that pass locally but fail when fixtures are extended.

**Why it happens:** `test-helpers.ts` is 483 lines and easy to overlook. Developers reach for the familiar pattern: `jest.mock('../../config/database', () => ({ default: { user: { findUnique: jest.fn() } } }))` without knowing `createPrismaMock()` exists.

**Consequences:** If someone adds a new Prisma model reference in a service, tests using manual mocks fail because the mock doesn't have that model. Tests using `createPrismaMock()` continue to pass because the factory includes all models. Manual mocks create brittle, hard-to-maintain tests.

**Prevention:**
1. Document `test-helpers.ts` as the required import for all new backend tests.
2. Add a test template file (`__tests__/TEMPLATE.test.ts`) demonstrating use of helpers.
3. In code review, reject PRs that manually construct Prisma mocks when `createPrismaMock()` would work.

### Pitfall 3: Testing Overly Specific Prisma Query Arguments

**What goes wrong:** A service test asserts the exact Prisma query object, including fields like `select`, `orderBy`, `include` — implementation details that don't affect behavior. When a developer optimizes the query (adds `select` to reduce payload, changes `orderBy`), the test breaks despite identical output.

**Example of brittle assertion:**
```typescript
expect(prisma.user.findMany).toHaveBeenCalledWith({
  select: { id: true, name: true, points: true },
  orderBy: { name: 'asc' },
})
```

**Why it happens:** Developers want to verify "the right thing was called." It's easy to assert everything in the call arguments.

**Consequences:** Tests become refactoring-resistant. Developers learn to ignore test failures or resort to "update snapshots" without understanding what changed.

**Prevention:** For queries, assert only security-critical and behavior-critical parts:
```typescript
expect(prisma.user.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    where: expect.objectContaining({
      role: 'CHILD',       // Security: parent should only see children
      familyId: 'fam-1',    // Security: scoped to family
    }),
  })
)
```

For mutations, assert the side effect rather than the query:
```typescript
// Prefer this (behavioral):
const result = await service.completeAssignment(1, 2)
expect(result.status).toBe('COMPLETED')
expect(result.completedAt).toBeInstanceOf(Date)

// Over this (implementation):
expect(prisma.choreAssignment.update).toHaveBeenCalledWith(...exact query...)
```

**Exception:** Assert exact arguments for `$transaction` calls (atomicity is behavioral, not implementation) and for `where` clauses that enforce RBAC (security is behavioral).

### Pitfall 4: Not Cleaning Up Fake Timers

**What goes wrong:** A test calls `jest.useFakeTimers()` and sets `jest.setSystemTime(...)` but the `afterEach` doesn't call `jest.useRealTimers()`. The next test (in a different file) runs with fake timers, causing async operations to hang indefinitely and produce timeout errors.

**Why it happens:** `jest.useFakeTimers()` in Jest has process-global scope. It affects ALL subsequent tests, even in different files, until `jest.useRealTimers()` is called.

**Consequences:** Cryptic test failures: "Timeout - Async callback was not invoked within 10000ms." The problematic test is the FIRST one to call fake timers, not the one that fails. Debugging this is extremely painful.

**Prevention:**
1. ALWAYS add to every test file that uses fake timers:
   ```typescript
   afterEach(() => {
     jest.useRealTimers()
   })
   ```
2. Add this pattern to the test template file.
3. Consider adding `jest.useRealTimers()` to `jest-setup.ts` `afterAll()` as a safety net (but this only runs per-file, not per-test — the `afterEach` is still needed).

### Pitfall 5: `vi.mock` Module-Level Hoisting Conflicts

**What goes wrong:** A Vitest test file uses `vi.mock('../api')` at the top level (which is hoisted above imports), but the test also imports the same module to spy on specific functions. Vitest's hoisting moves `vi.mock` above the import, creating a conflict between the mock and the real module import.

**Example of the problem:**
```typescript
// This FAILS because vi.mock hoists above the import
import { authApi } from '../api'
vi.mock('../api', () => ({ authApi: { login: vi.fn() } }))

// Vitest hoists to:
// vi.mock('../api', ...)
// import { authApi } from '../api'  ← now authApi is the mocked version
// But the import statement is ambiguous
```

**Why it happens:** Vitest hoists `vi.mock()` calls to the top of the file. The import statement runs after mocking, so the imported value IS the mock — but the type is still the real module type, causing TypeScript confusion.

**Consequences:** Tests pass in some configurations and fail in others. TypeScript errors about missing properties on mock objects.

**Prevention:** Use the established pattern from existing tests:
```typescript
// Access mocked module via the import
vi.mock('../api', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
  },
}))

// No need to import the real module — use the mock directly
import { authApi } from '../api'
const mockedAuthApi = authApi as any  // Or type it properly
```

---

## Moderate Pitfalls

### Pitfall 6: Testing Component Render in Isolation Without Context Providers

**What goes wrong:** A component test renders a page component (like `Dashboard`) that uses `useAuth()`. The test doesn't wrap it in `<AuthProvider>`, causing a "useAuth must be used within AuthProvider" error.

**Why it happens:** Components expect context providers to be in the tree. Unit tests render components in isolation.

**Prevention:** Use `renderWithRouter` or create a test wrapper that includes all required providers:
```typescript
const TestWrapper = ({ children }) => (
  <AuthProvider>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </AuthProvider>
)
```

### Pitfall 7: Assuming `findMany` Returns Results in a Specific Order by Default

**What goes wrong:** A service test mocks `prisma.choreAssignment.findMany` to return a specific array and asserts the array order. A developer adds `orderBy` to the Prisma call for correctness. The test still passes because the mock ignores `orderBy` — false confidence that ordering works.

**Why it happens:** Prisma mocks don't simulate ordering behavior. They return whatever `mockResolvedValue` provides, regardless of `orderBy` in the arguments.

**Prevention:** For ordering-critical tests, assert that the Prisma call includes the correct `orderBy` argument. For integration tests, insert data in known order and verify the API response order.

### Pitfall 8: Using `toMatchSnapshot()` Without Reviewing Diffs

**What goes wrong:** A test fails with a snapshot mismatch. The developer runs `jest --updateSnapshot` without examining the diff. The snapshot now encodes a bug as the expected output.

**Why it happens:** Snapshot updates are a single flag. It's tempting to "just update" when under time pressure.

**Prevention:** Never auto-update snapshots in CI. Require manual review of snapshot diffs in PRs. Use inline snapshots (`toMatchInlineSnapshot()`) for small, stable outputs where the diff is visible in the PR.

### Pitfall 9: Integration Tests That Depend on Test Execution Order

**What goes wrong:** Test B creates data that Test A expects to find. If run in reverse order, Test A fails. This happens when tests share a database without cleanup between cases.

**Why it happens:** The integration test suite uses a real SQLite database. Without `beforeEach` cleanup, test data accumulates.

**Prevention:** Follow the existing patterns in `pocket-money.integration.test.ts`:
```typescript
beforeAll(async () => {
  await setupTestDatabase()
  testData = await seedTestDatabase()  // Fresh seed for the file
})

// Clean up between test cases if needed
beforeEach(async () => {
  // Reset specific state
})
```

### Pitfall 10: Mocking `console.error` Without Restoring It

**What goes wrong:** A test mocks `console.error` to suppress expected error output. If not restored, subsequent tests lose real error output, making debugging impossible.

**Prevention:** Use `jest.spyOn(console, 'error').mockImplementation(() => {})` (not `console.error = jest.fn()`) so `.mockRestore()` works correctly. Or restore in `afterEach`.

---

## Minor Pitfalls

### Pitfall 11: Hardcoding `localhost:3010` in Test URLs

**What goes wrong:** Tests hardcode `http://localhost:3010/api/...` as the base URL. When the dev server uses a different port (e.g., `PORT=0` for random port in tests), tests fail.

**Prevention:** Use relative URLs or extract base URL from environment/config. The integration test `api-helpers.js` already handles this correctly.

### Pitfall 12: Using `waitFor` Timeout Without Understanding Why

**What goes wrong:** A test flakes with `waitFor` timeouts. The developer increases the timeout from 1000ms to 5000ms. The test now passes, but the underlying slow operation is masked.

**Prevention:** Investigate WHY `waitFor` times out before increasing the timeout. Common causes: missing mock resolution, unhandled promise rejection, unresolved state update.

### Pitfall 13: Not Testing `null` Return from `findUnique`

**What goes wrong:** A service test only tests the happy path where `findUnique` returns data. The controller code that handles "assignment not found" (throws `AppError` or returns 404) is untested.

**Prevention:** For every `findUnique` call in a service, test both the found and not-found cases. This is mandatory for all controller tests that call services returning `null`.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Controller unit tests | Mocking Prisma instead of services (Pitfall #1) | Code review checklist: controller tests must mock service layer only |
| Service unit tests (recurring-chores) | Testing Prisma query details instead of behavior (Pitfall #3) | Assert output shape and side effects; only assert query arguments for security/atomicity |
| Overdue penalty race condition tests | Forgetting `jest.useRealTimers()` in afterEach (Pitfall #4) | Template file includes `afterEach(() => { jest.useRealTimers() })` |
| Frontend component tests | Missing context providers (Pitfall #6) | Create `renderWithProviders()` test utility |
| CSRF/Auth interceptor tests | `vi.mock` hoisting conflicts (Pitfall #5) | Follow existing `client.test.ts` pattern exactly |
| Coverage gate setup | Snapshot auto-updates in CI (Pitfall #8) | Disable `--updateSnapshot` in CI workflow |
| Service extraction (TECH-03) prep | Tests written against to-be-removed code (Pitfall #1) | Write service tests first, controller tests after extraction |

---

## Sources

- **`backend/src/__tests__/services/overdue-penalty.service.test.ts`** (HIGH): Reference for correct fake timer cleanup pattern (line 104: `jest.useRealTimers()`)
- **`backend/src/__tests__/test-helpers.ts`** (HIGH): Reference for `createPrismaMock()`, fixture factories, mock request/response helpers
- **`frontend/src/api/client.test.ts`** (HIGH): Reference for correct `vi.doMock` + `vi.resetModules` pattern for fresh module imports
- **`backend/src/__tests__/integration/pocket-money.integration.test.ts`** (HIGH): Reference for correct integration test DB lifecycle (beforeAll seed, beforeEach reset)
- **Common Jest/Vitest documentation** (MEDIUM): Established patterns for `jest.useFakeTimers()`, `vi.mock` hoisting, `waitFor` usage
- **`CONCERNS.md` "Fragile Areas" section** (HIGH): Identifies existing fragile patterns that tests must avoid replicating
