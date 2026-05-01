# Architecture Patterns: Test Coverage Remediation

**Domain:** Testing architecture for Express.js + React codebase quality remediation
**Researched:** 2026-05-01
**Confidence:** HIGH (verified against existing test file structure and conventions)

---

## Recommended Architecture

The testing architecture follows **layered isolation** — each layer tests its own concerns using mocked dependencies from adjacent layers:

```
┌─────────────────────────────────────────────────┐
│                 E2E Tests (Playwright)            │
│  Full app flow: auth → chores → points → logout  │
│  Real browser, real server, real SQLite DB       │
├─────────────────────────────────────────────────┤
│      Integration Tests (Jest, real test DB)       │
│  HTTP endpoint → Express → service → Prisma → DB │
│  Tests: auth, authorization, API contract        │
├─────────────────────────────────────────────────┤
│  Controller Unit Tests (Jest, mock services)      │
│  Request parsing → service call → response format │
│  Tests: parameter coercion, status codes, errors  │
├─────────────────────────────────────────────────┤
│  Service Unit Tests (Jest, mock Prisma)           │
│  Business logic → Prisma queries → return values  │
│  Tests: domain rules, edge cases, error handling  │
├─────────────────────────────────────────────────┤
│  Middleware Tests (Jest, mock req/res)            │
│  auth.ts, csrf.ts, rateLimiter.ts, validate.ts    │
│  Tests: pass-through, block, error response       │
├─────────────────────────────────────────────────┤
│  Frontend Component Tests (Vitest + RTL)          │
│  Render → user interaction → DOM assertions       │
│  Tests: renders, fires events, shows errors       │
├─────────────────────────────────────────────────┤
│  Frontend Hook Tests (Vitest + renderHook)        │
│  Hook → mock API → state transitions              │
│  Tests: loading, data, error, auth states         │
└─────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Controller tests** | Verify HTTP parameter parsing, response envelope formatting, status codes | Mocked service layer (never Prisma directly) |
| **Service tests** | Verify business logic, Prisma query construction, error handling | Mocked Prisma client (`jest.mock('../../config/database')`) |
| **Middleware tests** | Verify auth/CSRF/rate-limit pass-through and blocking | Mocked Request/Response/NextFunction |
| **Integration tests** | Verify full API flow from HTTP to database | Real Express app, real test SQLite database |
| **Hook tests** | Verify React state management and API interaction | Mocked API modules (`vi.mock('../api')`) |
| **Component tests** | Verify DOM rendering and user interaction | Mocked hooks/API, real React components |
| **E2E tests** | Verify complete user journeys | Real browser, real server, real database |

### Data Flow

```
Test scenario: "Child completes a chore"

Controller test flow:
  Mock Request({ params: {id: '1'}, user: mockChild })
  → Controller calls mockService.completeAssignment(1, 2)
  → Mock returns { assignment: {...}, points: 15 }
  → Assert res.json called with { success: true, data: { ... } }

Service test flow:
  Call completeAssignment(assignmentId: 1, userId: 2)
  → Mock prisma.choreAssignment.findUnique returns pending assignment
  → Mock prisma.choreAssignment.update returns completed assignment
  → Mock prisma.$transaction calls callback with mock tx
  → Assert return value has correct points and completedAt

Integration test flow:
  POST /api/auth/login { email, password }
  → Real Prisma writes session to test DB
  GET /api/csrf-token → stores token
  POST /api/chore-assignments/1/complete (with CSRF header)
  → Real Express routes → real service → real Prisma → real SQLite
  Assert 200, response.body.data.assignment.status === 'COMPLETED'
```

---

## Patterns to Follow

### Pattern 1: Service Mock as Controller Dependency

**What:** Controller tests mock the service layer, not the database layer. The controller's job is to parse HTTP input, call the right service method, and format the HTTP output. It should not know about Prisma queries.

**When:** Every controller unit test.

**Example:**
```typescript
// Good: Controller test with service mock
jest.mock('../../services/chore-assignments.service', () => ({
  getAllAssignments: jest.fn(),
  completeAssignment: jest.fn(),
}))

const mockService = require('../../services/chore-assignments.service')

it('should return assignments with correct filters', async () => {
  mockService.getAllAssignments.mockResolvedValue([mockAssignments.pending])

  const req = createMockRequest({
    query: { userId: '2', status: 'PENDING' },
  })
  const res = createMockResponse()

  await getAssignments(req as Request, res as Response, jest.fn())

  expect(mockService.getAllAssignments).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 2, status: 'PENDING' })
  )
  expectResponse(res, 200, {
    success: true,
    data: { assignments: [mockAssignments.pending] },
  })
})
```

### Pattern 2: Prisma Mock via createPrismaMock() for Services

**What:** Service tests mock the Prisma client to isolate business logic. Use the existing `createPrismaMock()` factory for comprehensive model coverage.

**When:** Every service unit test that calls Prisma.

**Example:**
```typescript
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: createPrismaMock(),
}))
import prisma from '../../config/database'

it('should return filtered assignments', async () => {
  ;(prisma.choreAssignment.findMany as jest.Mock).mockResolvedValue([mockAssignments.pending])

  const result = await assignmentsService.getAllAssignments({ status: 'PENDING' })

  expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) })
  )
  expect(result).toEqual([mockAssignments.pending])
})
```

### Pattern 3: Request/Response/Next Mock Trio for Middleware

**What:** Middleware tests use `createMockRequest()` / `createMockResponse()` / `createMockNext()` from test-helpers.ts. Assert pass-through via `expect(next).toHaveBeenCalled()` and blocking via `expect(res.status).toHaveBeenCalledWith(403)`.

**When:** Every middleware test.

**Example:**
```typescript
it('should block request without session', async () => {
  const req = createMockRequest({ session: undefined })
  const res = createMockResponse()
  const next = createMockNext()

  await authenticate(req as Request, res as Response, next)

  expect(res.status).toHaveBeenCalledWith(401)
  expect(next).not.toHaveBeenCalled()
})
```

### Pattern 4: Fake Timers for Time-Dependent Tests

**What:** Use `jest.useFakeTimers()` + `jest.setSystemTime()` for all time-sensitive tests. ALWAYS call `jest.useRealTimers()` in `afterEach` to prevent test pollution.

**When:** Tests involving due dates, overdue calculations, recurrence schedules, DST boundaries, leap years.

**Example:**
```typescript
afterEach(() => {
  jest.useRealTimers()   // CRITICAL: restore real timers
})

it('should mark chore as overdue after midnight UTC', async () => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2024-01-16T00:01:00Z'))

  const mockAssignment = { ...mockAssignments.pending, dueDate: new Date('2024-01-15T23:59:00Z') }
  ;(prisma.choreAssignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment)

  const result = await overdueService.getAssignmentPenaltyStatus(1)

  expect(result.isOverdue).toBe(true)
})
```

### Pattern 5: Axios Instance Mock That Invokes Interceptors

**What:** When testing Axios interceptors (CSRF retry, 401 events), use a mock Axios instance that actually captures and invokes registered response error handlers. The `createMockAxiosInstance()` pattern from `client.test.ts` is the reference implementation.

**When:** Testing `ApiClient` constructor, interceptor behavior, CSRF retry logic, auth event dispatch.

**Example:** (from existing `client.test.ts`, lines 8–84 — this pattern is already established and working)

### Pattern 6: Hook Testing with AuthProvider Wrapper

**What:** When testing hooks that depend on React context (AuthProvider, QueryClientProvider), wrap them with the real provider. Mock API calls at the module level, not the provider level.

**When:** Testing `useAuth`, `useChores`, `useNotifications`, or any hook that needs auth context.

**Example:**
```typescript
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

it('should load user data', async () => {
  mockedAuthApi.getCurrentUser.mockResolvedValue({ data: { user: mockUser() } })
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.isAuthenticated).toBe(true)
})
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Prisma Mock in Controller Tests

**What:** Using `jest.mock('../../config/database')` in a controller test.

**Why bad:** Controllers call services, not Prisma. Mocking Prisma at the controller level means the test knows about implementation details two layers deep. Controller tests become brittle — if a service refactors its Prisma queries, the controller test breaks despite no behavioral change.

**Instead:** Mock the service. Controller tests verify parameter parsing → service invocation → response formatting. Service tests verify business logic → Prisma interaction.

### Anti-Pattern 2: Testing Prisma Query Arguments in Service Tests for Non-Transactional Ops

**What:** Asserting exact Prisma query arguments for every `findUnique`/`findMany` call.

**Why bad:** A refactor to `$queryRaw` or a query optimization (adding `select` to reduce payload) breaks tests even though behavior is identical. Tests should verify what the service *does*, not how it *queries*.

**Instead:** Assert behavioral outputs (returned objects, side effects, error conditions). Only assert on query arguments for critical correctness guarantees: `where` clauses for authorization, `$transaction` wrapping for atomicity, `include` for relational data needed by downstream code.

**Exception:** In RBAC contexts (services that gate data by user role), asserting the `where` clause includes the correct user filter IS appropriate — that's a security behavior, not an implementation detail.

### Anti-Pattern 3: Integration Tests for Simple Data Retrieval

**What:** Writing an integration test for `GET /api/chore-templates` with no auth or filtering logic.

**Why bad:** Integration tests cost 100x more than unit tests in execution time. A unit test covering the controller's parameter handling + a unit test covering the service's findAll logic achieves equivalent coverage at 1% of the cost.

**Instead:** Reserve integration tests for: (1) auth/authorization flows, (2) mutations that span multiple models (transaction integrity), (3) end-to-end user journeys.

### Anti-Pattern 4: `as any` on Prisma Mock Calls

**What:** `(prisma.user.findUnique as any).mockResolvedValue(...)` in every test file.

**Why bad:** TypeScript should validate that the mocked method actually exists on the Prisma model. `as any` bypasses this guard.

**Instead:** Use `as jest.Mock` for type-safe type narrowing:
```typescript
(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
// or for methods that aren't jest.Mock by default:
jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)
```

### Anti-Pattern 5: Forgetting `jest.useRealTimers()` in afterEach

**What:** Calling `jest.useFakeTimers()` in a test but not restoring real timers.

**Why bad:** Subsequent tests run with fake timers, causing timeouts, hanging promises, and impossible-to-debug failures. This is the #1 source of "works in isolation, fails in suite" bugs.

**Instead:** ALWAYS add:
```typescript
afterEach(() => {
  jest.useRealTimers()
})
```

### Anti-Pattern 6: Global Test State Pollution

**What:** A test modifies a shared fixture object (like `mockUsers.parent`) and the next test sees the modified state.

**Why bad:** Tests become order-dependent. "Passes when run alone, fails when run with others."

**Instead:** Deep-clone fixtures that will be modified, or use factory functions instead of static objects:
```typescript
// Bad: shared mutable object
const user = mockUsers.parent

// Good: factory returns new object each call
function createTestUser(overrides = {}) {
  return { ...mockUsers.parent, ...overrides }
}
```

---

## Scalability Considerations

| Concern | Current (22% coverage) | After Remediation (50%+) | Future (80%+) |
|---------|------------------------|--------------------------|---------------|
| Mock management | Manual `createPrismaMock()` per test file | Extract shared mock factories per domain | Auto-generated mocks from Prisma schema types |
| Test execution speed | ~30s backend, ~15s frontend | ~60s backend, ~30s frontend | Parallel suites, test sharding in CI |
| Fixture maintenance | Central `test-helpers.ts`, shared fixtures | Domain-specific fixture files (`chore-fixtures.ts`, `user-fixtures.ts`) | Factory-bot style builders with `faker` for random data |
| Coverage reporting | Manual (open HTML report) | CI gate with `coverageThreshold` | Per-PR coverage diff via CodeCov integration |
| Integration test DB | Single test DB, serial execution | Same (SQLite handles single-family scale) | Parallel test DBs with unique files per worker |
| Test discoverability | Co-located tests, consistent naming | Same pattern at scale | Test list generation for planning sessions |

---

## Sources

- **`backend/src/__tests__/` structure** (HIGH): Verified 21 test files across services, middleware, integration, utils
- **`frontend/src/` test files** (HIGH): Verified 18 test files across components, hooks, API
- **`backend/src/__tests__/test-helpers.ts`** (HIGH): Verified mock factories, fixture objects, assertion helpers
- **`backend/src/__tests__/services/overdue-penalty.service.test.ts`** (HIGH): Reference for timezone/DST/leap-year fake timer patterns
- **`frontend/src/api/client.test.ts`** (HIGH): Reference for Axios interceptor mocking pattern
- **`frontend/src/hooks/useAuth.test.tsx`** (HIGH): Reference for hook testing with React context and DOM events
- **`backend/src/__tests__/integration/`** (HIGH): Verified integration test infrastructure (db-setup, api-helpers, global setup/teardown)
