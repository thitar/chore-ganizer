# Testing Patterns

**Analysis Date:** 2026-04-28

## Test Framework

**Backend Runner:**
- Jest `^30.0.0`
- Config: `backend/jest.config.js` (unit tests), `backend/jest.integration.config.js` (integration tests)
- Assertion Library: Jest's built-in `expect`

**Frontend Runner:**
- Vitest `^4.1.0`
- Config: `frontend/vitest.config.ts`
- Assertion Library: Vitest's `expect` extended with `@testing-library/jest-dom` matchers

**E2E Runner:**
- Playwright
- Test suffix: `*.spec.ts` (e.g., `e2e/auth.spec.ts`)

## Run Commands

```bash
# Backend unit tests only
cd backend && npm run test:unit              # Excludes integration tests

# Backend integration tests
cd backend && npm run test:integration       # Serial execution, real DB

# All backend tests with coverage
cd backend && npm run test:coverage

# Frontend tests
cd frontend && npm test                      # Vitest run

# Frontend watch mode with UI
cd frontend && npm run test:ui               # Vitest --ui

# E2E tests (requires running app)
npm run test:e2e                             # All E2E tests
npx playwright test e2e/auth.spec.ts         # Single E2E test file
```

## Test File Organization

**Location:**
- Backend unit tests: Co-located in `backend/src/__tests__/` (e.g., `backend/src/__tests__/services/auth.service.test.ts`)
- Backend integration tests: `backend/src/__tests__/integration/*.integration.test.ts`
- Frontend tests: Co-located with components/hooks in `frontend/src/**/*.test.tsx`
- E2E tests: `e2e/**/*.spec.ts`

**Naming:**
- Backend unit: `*.test.ts`
- Backend integration: `*.integration.test.ts`
- Frontend: `*.test.tsx`
- E2E: `*.spec.ts`

**Structure:**
```
backend/src/
├── __tests__/
│   ├── services/              # Service unit tests
│   ├── middleware/            # Middleware unit tests
│   ├── integration/           # Integration tests (*.integration.test.ts)
│   ├── test-helpers.ts       # Mock factories, fixtures
│   └── __mocks__/            # Jest mocks (e.g., uuid.ts)

frontend/src/
├── components/
│   └── chores/
│       └── ChoreCard.test.tsx # Component tests
├── hooks/
│   └── useAuth.test.tsx       # Hook tests
└── test/
    └── setup.ts               # Vitest setup (cleanup, matchers)
```

## Test Structure

**Backend Unit Test Pattern:**
```typescript
import * as authService from '../../services/auth.service'
import prisma from '../../config/database'

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))

describe('Auth Service', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('login', () => {
    it('should return user if credentials are valid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      // ... test logic
      expect(result).toEqual({ ... })
    })
  })
})
```

**Frontend Test Pattern:**
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './useAuth'
import { authApi } from '../api'

vi.mock('../api', () => ({
  authApi: { getCurrentUser: vi.fn(), login: vi.fn() },
}))

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

describe('useAuth', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should start with loading true', async () => {
    mockedAuthApi.getCurrentUser.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.loading).toBe(true)
  })
})
```

## Mocking

**Backend Framework:** Jest mocking
- Mock Prisma via `jest.mock('../../config/database', () => ({ ... }))`
- Use `createPrismaMock()` from `backend/src/__tests__/test-helpers.ts` for consistent mock structure
- Mock bcrypt, nodemailer via `jest.spyOn()` or additional `jest.mock()` calls

**Frontend Framework:** Vitest mocking
- Mock API modules via `vi.mock('../api', () => ({ ... }))`
- Mock React Query/hook dependencies with vi.fn()

**What to Mock:**
- Backend: Prisma client, external services (bcrypt, nodemailer), session store
- Frontend: All API calls (via vi.mock on api/* modules), external dependencies

**What NOT to Mock:**
- Backend integration tests: Use real SQLite test database
- Frontend: React components, hooks when testing integration between them

## Fixtures and Factories

**Backend Test Data:**
- Location: `backend/src/__tests__/test-helpers.ts`
- Exports: `mockUsers`, `mockTemplates`, `mockAssignments`, `mockRecurringChores`, etc.
- Example: `mockUsers.parent`, `mockAssignments.pending`

**Frontend Test Data:**
- Location: `frontend/src/test/utils` (imported as `mockUser` in test files)
- Provides mock user data for hook/component tests

## Coverage

**Requirements:**
- Backend: Coverage reports generated with `--coverage` flag
- Frontend: Coverage via `@vitest/coverage-v8`

**View Coverage:**
```bash
# Backend (after running test:coverage)
open backend/coverage/lcov-report/index.html

# Frontend (after running test:coverage)
open frontend/coverage/index.html
```

## Test Types

**Unit Tests:**
- Backend: Test services, middleware, schemas in isolation with mocked dependencies
- Frontend: Test components, hooks in isolation with mocked API/context

**Integration Tests:**
- Backend only, run serially (`--runInBand`)
- Use real SQLite test database (created/destroyed per test run)
- Longer timeout (30s vs 10s for unit tests)
- Global setup/teardown: `backend/src/__tests__/integration/global-setup.ts`, `global-teardown.ts`

**E2E Tests:**
- Playwright tests for full user flows (auth, chore management, etc.)
- Require running app (Docker Compose or dev servers)
- Test files in `e2e/` with `*.spec.ts` suffix

## Test Database

**Location:** `backend/test-db/integration-test.db`
- Created by `global-setup.ts` before integration tests run
- Deleted by `global-teardown.ts` after all tests complete
- DATABASE_URL set to `file:test-db/integration-test.db` during integration tests

## CI Scripts

**Backend CI Steps (`.github/workflows/ci-cd.yml`):**
1. `npm ci` (install dependencies)
2. `npm run prisma:generate` (generate Prisma client)
3. `npm run docs:validate` (validate Swagger docs)
4. `npm run test:coverage` (unit tests with coverage)
5. `npm run test:integration` (integration tests)
6. `npm run build` (build backend)

**Frontend CI Steps:**
1. `npm ci` (install dependencies)
2. `npm test` (run Vitest tests)
3. `npm run build` (build frontend)

## Common Patterns

**Async Testing:**
```typescript
// Backend (Jest)
it('should return user', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
  const result = await authService.login({ email, password })
  expect(result).toEqual({ ... })
})

// Frontend (Vitest + React Testing Library)
it('should load user', async () => {
  mockedAuthApi.getCurrentUser.mockResolvedValue(mockUser)
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current.loading).toBe(false))
})
```

**Error Testing:**
```typescript
// Backend
it('should throw on invalid credentials', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
  await expect(authService.login({ email, password })).rejects.toThrow()
})

// Frontend
it('should show error on API failure', async () => {
  mockedAuthApi.login.mockRejectedValue(new Error('Invalid credentials'))
  // ... render component, trigger login, assert error message
})
```

---

*Testing analysis: 2026-04-28*
