# TESTING.md -- Test Structure and Practices

## Backend Test Framework

### Jest Configuration
- **Framework**: Jest 30 with `ts-jest` (v29.3.0) preset
- **Config file**: `backend/jest.config.js`
- **Environment**: `node`
- **Test match pattern**: `**/__tests__/**/*.test.ts`
- **Transform**: `ts-jest` with `isolatedModules: true`
- **clearMocks**: `true` (auto-clears mocks between tests)
- **Coverage collection**: `src/**/*.ts` excluding `*.d.ts`
- **Module system**: CommonJS (`"type": "commonjs"` in package.json)
- **Run command**: `npm test` (or `npm run test:watch` for watch mode)

### Test Environment Details
- Prisma is mocked (not connected to a real database for unit tests)
- CSRF middleware is bypassed (auto-skips when `NODE_ENV === 'test'`)
- Rate limiter middleware is bypassed (auto-skips when `NODE_ENV === 'test'`)
- Integration-style tests (in `__tests__/*.test.ts` at root level) use `supertest` against the real Express app with a real SQLite database

---

## Backend Test Structure

### File Organization
```
backend/src/__tests__/
  services/
    assignment.service.test.ts    (27 tests)
    gamification.service.test.ts  (30 tests)
    notification.service.test.ts  (21 tests)
    notification.formatters.test.ts (9 tests)
    points.service.test.ts        (17 tests)
    recurring.service.test.ts     (14 tests)
    template.service.test.ts      (7 tests)
    users.service.test.ts         (25 tests)
  middleware/
    csrf.test.ts                  (7 tests)
    auth.test.ts                  (8 tests)
  app.test.ts                     (3 tests)
  assignments.test.ts             (21 tests)
  templates.test.ts               (15 tests)
  points.test.ts                  (12 tests)
  users.test.ts                   (19 tests)
  recurring.test.ts               (13 tests)
backend/src/routes/__tests__/
  auth.routes.test.ts             (8 tests)
```

### Test File Naming
- Files use `*.test.ts` suffix
- Service tests are organized in `__tests__/services/` subdirectory
- Route tests are co-located in `__tests__/` at the source root or in `routes/__tests__/`
- Middleware tests are in `middleware/__tests__/`

### Test Categories

**1. Pure Unit Tests** (service tests with mocked Prisma):
- Located in `__tests__/services/*.test.ts`
- Prisma client is fully mocked at the module level
- Tests verify business logic in isolation
- Example: `gamification.service.test.ts` tests `computeLevel()`, `computeStreak()`, `evaluateBadges()`

**2. Integration Tests** (supertest against real app):
- Located in `__tests__/*.test.ts` (at the root of `__tests__/`)
- Use `supertest` to make HTTP requests against the Express app
- Connect to a real SQLite database (`backend/prisma/dev.db`)
- Authenticate via `POST /api/auth/login` in `beforeAll`
- Clean up created resources in `afterAll`
- Example: `assignments.test.ts` tests full CRUD flows through the HTTP layer

**3. Middleware Unit Tests**:
- Located in `__tests__/middleware/*.test.ts` and `middleware/__tests__/*.test.ts`
- Mock req/res/next objects manually
- Verify middleware behavior (auth checks, CSRF validation, etc.)

**4. Route-Level Tests**:
- Located in `routes/__tests__/auth.routes.test.ts`
- Create a minimal Express app with only the route under test
- Mock the service layer
- Use supertest for HTTP assertions

---

## Backend Mocking Patterns

### Prisma Mocking
Every service test file uses the same pattern:
```ts
jest.mock('../../config/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    pointLog: { aggregate: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    choreAssignment: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
    // ... more models as needed
  },
}))
```

### Cache Reset Pattern
Service modules are re-required in `beforeEach` to pick up fresh mocks:
```ts
let someService: typeof import('../../services/some.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/some.service')]
  someService = require('../../services/some.service')
})
```

### $transaction Mocking
The `$transaction` mock is configured in `beforeEach` to invoke the callback with the mocked prisma object:
```ts
prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma))
```

For tests needing a separate transaction context:
```ts
prisma.$transaction.mockImplementation(async (cb: Function) => {
  const tx = {
    choreAssignment: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue(result) },
    pointLog: { create: jest.fn() },
  }
  return cb(tx)
})
```

### Fetch Mocking (Notifications)
```ts
const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
// ... test ...
fetchSpy.mockRestore()
```

### bcrypt Mocking
```ts
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))
```

### Service Mocking (Side Effects)
```ts
jest.mock('../../services/gamification.service', () => ({ awardBadges: jest.fn() }))
jest.mock('../../services/notification.service', () => ({
  sendNtfy: jest.fn().mockResolvedValue(true),
  isNtfyConfigured: true,
}))
```

### Assertion Patterns
- `expect(result).toEqual(expected)` for deep equality
- `expect(result).toBe(reference)` for identity checks
- `await expect(fn()).rejects.toThrow(AppError)` for error classes
- `await expect(fn()).rejects.toMatchObject({ statusCode: 404 })` for AppError properties
- `expect(mockFn).toHaveBeenCalledWith(expectedArgs)` for mock call verification

---

## Backend Test Count and Coverage

| Category | Files | Tests |
|----------|-------|-------|
| Service unit tests | 8 | 150 |
| Integration tests (supertest) | 6 | 81 |
| Middleware tests | 2 | 15 |
| Route tests | 1 | 8 |
| App startup tests | 1 | 3 |
| **Backend total** | **17** | **256** |

### Coverage Approach
- Jest `collectCoverageFrom` is configured: `src/**/*.ts` excluding `*.d.ts`
- No coverage thresholds are enforced (no `coverageThreshold` in jest.config.js)
- Coverage is not reported in CI (no CI test job exists)

---

## Frontend Test Framework

### Vitest Configuration
- **Framework**: Vitest 4.1.0 with jsdom environment
- **Config file**: `frontend/vitest.config.ts`
- **Environment**: `jsdom`
- **Globals**: `true` (no need to import `describe`, `it`, `expect` from vitest)
- **Setup file**: `frontend/src/test/setup.ts`
- **Test match pattern**: `src/**/*.{test,spec}.{ts,tsx}`
- **Run command**: `npm test` (or `npm run test:watch` for watch mode)

### Setup File (`frontend/src/test/setup.ts`)
- Extends Vitest's `expect` with `@testing-library/jest-dom` matchers
- Runs `cleanup()` after each test via `afterEach`

### Key Dev Dependencies
- `@testing-library/react` (v16.3.2)
- `@testing-library/jest-dom` (v6.1.5)
- `@testing-library/user-event` (v14.5.1)
- `vitest` (v4.1.0)
- `jsdom` (v23.0.1)

---

## Frontend Test Structure

### File Organization
```
frontend/src/__tests__/
  AssignmentsPage.test.tsx   (7 tests)
  CalendarPage.test.tsx      (10 tests)
  DashboardPage.test.tsx     (11 tests)
  gamification-ui.test.tsx   (5 tests)
  Leaderboard.test.tsx       (3 tests)
  motion.test.tsx            (2 tests)
  MyChoresPage.test.tsx      (12 tests)
  PointsPage.test.tsx        (10 tests)
  ProfilePage.test.tsx       (10 tests)
  RecurringChoresPage.test.tsx (10 tests)
  scaffold.test.tsx          (2 tests)
  TemplatesPage.test.tsx     (8 tests)
  TopNav.test.tsx            (4 tests)
  ui.test.tsx                (4 tests)
  UsersPage.test.tsx         (8 tests)
```

### Test File Naming
- All files use `*.test.tsx` suffix (even tests without JSX, for consistency)
- Tests are organized as a flat list in `__tests__/` (no subdirectories)

### Test Categories

**1. Page Tests** (majority):
- Each page has a corresponding test file
- Tests verify rendering of states: loading, error, empty, data populated
- Tests verify user interactions: form submissions, button clicks, navigation

**2. Component Tests**:
- `TopNav.test.tsx` -- tests Manage dropdown visibility for parent vs child
- `Leaderboard.test.tsx` -- tests rendering with limit prop
- `gamification-ui.test.tsx` -- tests LevelBar, BadgeGrid, GamificationMoments
- `motion.test.tsx` -- tests CountUp and ProgressRing with reduced motion
- `ui.test.tsx` -- tests Button loading state, Avatar initials, Toast role

**3. Integration Tests**:
- `scaffold.test.tsx` -- tests full App render with AuthProvider, verifies redirect to login

---

## Frontend Mocking Patterns

### Hook Mocking with vi.mock
Every page test mocks its hooks:
```ts
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useAssignments', () => ({
  useAssignments: vi.fn(),
}))

// Import AFTER the mock declaration
import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
```

### Mock State Helpers
Tests define helper functions to set up common mock states:
```ts
function mockAuth(user: typeof mockUser | null = mockUser) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

function mockAssignmentsState(overrides: Record<string, unknown> = {}) {
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    assignments: [],
    isLoading: false,
    error: null,
    ...overrides,
  })
}
```

### Rendering with Providers
Tests wrap components in required providers:
```ts
function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PageComponent />
      </MemoryRouter>
    </QueryClientProvider>
  )
}
```

### Fake Timers
Used for time-dependent components:
```ts
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00'), toFake: ['Date'] })
})
afterEach(() => {
  vi.useRealTimers()
})
```

### matchMedia Mock
jsdom has no `matchMedia`. Tests that render `CountUp` or confetti mock it:
```ts
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}
```

### Assertion Patterns
- `expect(screen.getByText('...')).toBeInTheDocument()` -- element exists
- `expect(screen.queryByText('...')).not.toBeInTheDocument()` -- element absent
- `expect(screen.getByRole('button', { name: /.../ })).toBeDisabled()` -- state
- `await waitFor(() => { expect(mockFn).toHaveBeenCalled() })` -- async assertions
- `fireEvent.click(screen.getByText('...'))` -- user interactions
- `userEvent.click(...)` for more realistic interaction testing (in TopNav tests)

---

## Frontend Test Count

| Category | Files | Tests |
|----------|-------|-------|
| Page tests | 10 | 88 |
| Component tests | 4 | 14 |
| UI primitive tests | 1 | 4 |
| Integration (scaffold) | 1 | 2 |
| **Frontend total** | **15** | **106** |

---

## E2E Framework

### Playwright Configuration
- **Framework**: Playwright 1.50.1
- **Two configurations**:
  1. `e2e/playwright.config.ts` -- runs against dev servers (auto-starts backend on :3010 and frontend on :5173)
  2. `e2e/playwright.uat.config.ts` -- runs against Docker-deployed app on :3002 (no webServer, sequential execution)
- **Browser**: Chromium only (single project)
- **Reporter**: HTML + list

### Playwright Config Details

**Dev Config** (`playwright.config.ts`):
- `baseURL: http://localhost:5173`
- `fullyParallel: true` (but effectively sequential due to shared auth setup)
- `retries: 2` on CI, `0` locally
- `workers: 1` on CI
- `webServer` starts backend and frontend dev servers automatically
- `trace: on-first-retry`, `screenshot: only-on-failure`, `video: retain-on-failure`

**UAT Config** (`playwright.uat.config.ts`):
- `baseURL: http://localhost:3002`
- `fullyParallel: false` (many tests mutate shared seeded data)
- `workers: 1`
- `timeout: 60000` (vs 30000 for dev)
- `trace: on` (always collected)

### Auth Setup
- **File**: `e2e/auth.setup.ts`
- Runs as a separate Playwright project (`setup`) that must complete before any spec
- Logs in 4 seeded users via real UI interactions (fills form, clicks submit)
- Saves browser `storageState` (cookies) to `e2e/.auth/{name}.json`
- **Why**: The auth rate limiter (`AUTH_RATE_LIMIT_MAX`, default 10/15min) would reject independent logins in a full suite run
- Specs call `login(page, user)` from `e2e/helpers/auth.ts` to replay saved cookies without driving the login form

### E2E Test Patterns
- **Login**: `await page.goto('/login')`, fill inputs, click submit, wait for redirect
- **Navigation**: Click links/buttons with `page.click('a:has-text("...")')`
- **Assertions**: `await expect(page.locator('...')).toBeVisible()`, `page.waitForSelector()`
- **API calls**: `page.evaluate()` with `fetch()` for direct API interactions, reading CSRF from cookies
- **Screenshots**: `page.screenshot()` for visual evidence
- **Cleanup**: API calls to delete created resources after tests

### E2E Helpers
- `e2e/helpers/auth.ts` -- `login(page, user)` loads saved cookies
- `e2e/helpers/csrf.ts` -- `getCsrfToken(page)` reads XSRF-TOKEN from Playwright cookies
- `e2e/helpers/nav.ts` -- `goToManageLink(page, label)` opens the Manage dropdown then clicks, `logout(page)` clicks the logout button

---

## E2E Test Count

| Spec File | Tests | Purpose |
|-----------|-------|---------|
| `uat-checklist.spec.ts` | 65 | Full automated UAT walkthrough (10 sections) |
| `phase-04-uat.spec.ts` | 16 | Phase 4 feature UAT |
| `phase-05-uat.spec.ts` | 14 | Phase 5 feature UAT |
| `phase-05-points-happy-path.spec.ts` | 2 | Points happy-path regression |
| `phase-06-uat.spec.ts` | 12 | Phase 6 feature UAT |
| `phase-07-uat.spec.ts` | 9 | Phase 7 feature UAT |
| `phase-10-uat.spec.ts` | 10 | Phase 10 (notifications) UAT |
| `m1-the-look.spec.ts` | 4 | M1 visual regression tests |
| `m2-the-game.spec.ts` | 6 | M2 gamification tests |
| `path-a-regression.spec.ts` | 4 | Path-A regression tests |
| **E2E total** | **142** | |

---

## Test Data Patterns

### Seeding
- **Backend**: `prisma/seed.ts` creates idempotent seed data:
  - 4 users (dad, mom, alice, bob) with bcrypt-hashed passwords
  - 4 chore templates (Wash Dishes, Take Out Trash, Clean Room, Make Bed)
  - 4 point log entries
  - 2 recurring chores (daily Make Bed for Alice, weekly Take Out Trash for Bob)
- **Seed command**: `npm run prisma:seed`

### Fixtures / Factories
- **No formal fixture or factory system** exists. Test data is constructed inline in each test file.
- Backend service tests define inline mock data objects (e.g. `mockAssignment`, `defaultTemplate`).
- Frontend tests define `defaultAssignment`, `defaultUsers`, `mockUser` objects.
- E2E tests use the seeded database state plus dynamically created resources.

### Test Data Cleanup
- **Backend integration tests**: `afterAll` hooks delete created resources via API calls.
- **Backend unit tests**: No cleanup needed (mocked Prisma).
- **Frontend tests**: No cleanup needed (mocked hooks).
- **E2E tests**: Dynamic resources created during tests are cleaned up via API calls within the test or at the end.

---

## CI Test Integration

### What Runs in CI
- **`.github/workflows/security.yml`** is the only CI workflow. It runs:
  - CodeQL security analysis
  - `npm audit`
  - Gitleaks secret scanning
  - Semgrep static analysis
  - Trivy container scanning
- **No test jobs exist in CI.** No `npm test`, no `vitest`, no `playwright test` is run in any workflow.
- **No build verification** is run in CI.

### What Runs Locally
- `cd backend && npm test` -- 256 backend unit/integration tests
- `cd frontend && npm test` -- 106 frontend unit tests
- `npm run test:e2e` -- E2E tests against running dev servers
- `npm run test:e2e:uat` -- UAT checklist against Docker deployment

---

## Test Coverage Gaps

### No Integration Test Suite for Backend
- No `jest.integration.config.js`, no test database configuration, no `test:integration` npm script.
- The "integration" tests in `__tests__/*.test.ts` (assignments, templates, points, users, recurring) run against the real app with a real SQLite database, but there is no separation between unit and integration test configurations. All run via a single `npm test` command.

### No CI Test Pipeline
- Tests are only run locally. There is no automated test execution in CI/CD. This is the most significant gap.

### Frontend Coverage Gaps
- **No hooks are tested in isolation** -- hooks are only tested indirectly through the pages that use them.
- **No test for `AppShell`** component (layout wrapper).
- **No test for `FilterBar`** component.
- **No test for `StatusBadge`** component in isolation (tested indirectly).
- **No test for `ConfirmDelete`** component in isolation.
- **`LoginPage`** has no dedicated test file.

### Backend Coverage Gaps
- **`auth.service.ts`** has no dedicated service-level unit test (tested only via route-level tests).
- **No test for `health.routes.ts`** in isolation.
- **No test for `occurrences.routes.ts`** in isolation (tested via integration tests).
- **No test for `rateLimiter.ts`** middleware.

### E2E Coverage Gaps
- **No CI integration** for E2E tests.
- **UAT checklist is sequential and fragile** -- many tests mutate shared seeded data.
- **No visual regression testing** (screenshots are captured but not compared).
- **No mobile-specific E2E tests** beyond viewport sizing in the UAT checklist.

### General Observations
- **No code coverage enforcement** -- no thresholds in jest.config.js or vitest.config.ts.
- **No lint/format checks** in CI or pre-commit hooks.
- **No property-based or fuzz testing**.
- **No snapshot testing**.
