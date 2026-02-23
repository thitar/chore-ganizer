# Chore-Ganizer Testing Guide

## Version 2.0.0

This document describes the testing strategy, structure, and best practices for the Chore-Ganizer application.

## Overview

Chore-Ganizer uses a comprehensive testing strategy with three levels of testing:

1. **Unit Tests** - Test individual functions/services in isolation using mocks
2. **Integration Tests** - Test full API endpoints with a real test database
3. **E2E Tests** - Test complete user flows through the UI with Playwright

**Important:** Each test type uses separate Jest/Playwright configurations to avoid conflicts:
- Unit tests: `jest.config.js` (excludes integration tests)
- Integration tests: `jest.integration.config.js` (includes global setup/teardown)
- E2E tests: `playwright.config.ts` (runs against running application)

## Test Structure

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── utils/
│   │   │   └── test-utils.ts           # Shared test utilities and fixtures
│   │   ├── services/
│   │   │   ├── users.service.test.ts
│   │   │   ├── chore-assignments.service.test.ts
│   │   │   └── notification-settings.service.test.ts
│   │   ├── middleware/
│   │   │   └── auth.test.ts
│   │   └── integration/
│   │       ├── db-setup.ts             # Test database setup/teardown
│   │       ├── api-helpers.ts          # API client helpers
│   │       ├── jest-setup.ts           # Jest configuration for integration tests
│   │       ├── global-setup.ts         # Runs once before all tests
│   │       ├── global-teardown.ts      # Runs once after all tests
│   │       ├── chore-templates.integration.test.ts
│   │       ├── chore-assignments.integration.test.ts
│   │       ├── users.integration.test.ts
│   │       ├── recurring-chores.integration.test.ts
│   │       └── pocket-money.integration.test.ts
│   ├── services/
│   ├── controllers/
│   └── middleware/
├── test-db/                            # Integration test database (gitignored)
├── jest.config.js                      # Unit test configuration
├── jest.integration.config.js          # Integration test configuration
└── package.json

frontend/
├── e2e/
│   ├── fixtures/
│   │   └── test-helpers.ts             # E2E test fixtures and helpers
│   ├── auth.spec.ts                    # Authentication E2E tests
│   ├── dashboard.spec.ts               # Dashboard E2E tests
│   ├── chores.spec.ts                  # Chores management E2E tests
│   ├── templates.spec.ts               # Templates E2E tests
│   ├── calendar.spec.ts                # Calendar E2E tests
│   ├── notifications.spec.ts           # Notifications E2E tests
│   ├── recurring-chores.spec.ts        # Recurring chores E2E tests
│   ├── pocket-money.spec.ts            # Pocket money E2E tests
│   ├── pwa.spec.ts                     # PWA functionality E2E tests
│   └── statistics.spec.ts              # Statistics dashboard E2E tests
├── playwright.config.ts                # Playwright configuration
└── package.json
```

## Running Tests

### Unit and Integration Tests

```bash
# Run all unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage report
npm run test:coverage

# Run integration tests only (runs serially to avoid database conflicts)
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Run specific test file
npm test -- --testPathPattern=users.service

# Run tests matching a pattern
npm test -- --testNamePattern="getAllUsers"
```

### E2E Tests

```bash
# Run E2E tests (requires running application)
npm run test:e2e

# Run E2E tests with UI (interactive mode)
npm run test:e2e:ui

# Run specific E2E test file
npx playwright test e2e/auth.spec.ts

# Run E2E tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run E2E tests in headed mode (see browser)
npx playwright test --headed

# Debug E2E tests
npx playwright test --debug

# Generate E2E test code
npx playwright codegen http://localhost:3002
```

## Test Coverage

The project aims for **80% code coverage** for services and middleware. Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI tools

### Coverage Exclusions

The following are excluded from coverage:
- Test files (`*.test.ts`, `*.spec.ts`)
- Type definitions (`src/types/**`)
- Test helpers (`src/__tests__/test-helpers.ts`)

## Writing Tests

### Test File Naming

Test files should:
- Be placed in `src/__tests__/` mirroring the source structure (unit/integration)
- Be placed in `e2e/` for E2E tests
- Use `.test.ts` suffix for unit/integration tests
- Use `.spec.ts` suffix for E2E tests
- Match the source file name (e.g., `users.service.ts` → `users.service.test.ts`)

### Test Structure

Use the `describe/it` pattern:

```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  describe('functionName', () => {
    it('should do something specific', async () => {
      // Arrange
      const mockData = { ... }
      mockPrisma.method.mockResolvedValue(mockData)

      // Act
      const result = await service.functionName()

      // Assert
      expect(result).toBeDefined()
      expect(mockPrisma.method).toHaveBeenCalledWith(expectedArgs)
    })
  })
})
```

### Using Test Helpers

Import shared fixtures and utilities from `test-helpers.ts`:

```typescript
import { mockUsers, mockAssignments, createMockRequest, createMockResponse } from '../test-helpers'

// Use mock data
const user = mockUsers.parent

// Use mock factories
const req = createMockRequest({ body: { name: 'Test' } })
const res = createMockResponse()
```

### Mocking Prisma

Mock the database module at the top of your test file:

```typescript
import prisma from '../../config/database'

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Add other models as needed
  },
}))
```

### Mocking External Services

For external services like ntfy:

```typescript
jest.mock('../../services/ntfy.service.js', () => ({
  sendNtfyNotification: jest.fn(),
  NotificationPriorities: { HIGH: 'high', DEFAULT: 'default' },
  NotificationTags: { WARNING: 'warning', INFO: 'info' },
}))
```

## Test Categories

### 1. Service Tests

Test business logic in service files:

```typescript
describe('Users Service', () => {
  describe('getAllUsers', () => {
    it('should return all users ordered by name', async () => {
      // Test implementation
    })
  })
})
```

### 2. Middleware Tests

Test Express middleware:

```typescript
describe('Auth Middleware', () => {
  describe('authenticate', () => {
    it('should return 401 if no session exists', async () => {
      const req = createMockRequest()
      const res = createMockResponse()
      const next = jest.fn()

      await authenticate(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
```

### 3. Controller Tests

Test HTTP request handling:

```typescript
describe('Users Controller', () => {
  describe('getUsers', () => {
    it('should return users as JSON', async () => {
      const req = createMockRequest()
      const res = createMockResponse()

      await getUsers(req as Request, res as Response)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      )
    })
  })
})
```

### 4. Integration Tests

Integration tests use a real test database and make actual HTTP requests via supertest:

```typescript
import { setupTestDatabase, seedTestDatabase, teardownTestDatabase, TestData } from './db-setup.js'
import { createApiClient, ApiClient } from './api-helpers.js'

describe('Chore Templates API Integration Tests', () => {
  let testData: TestData
  let api: ApiClient

  beforeAll(async () => {
    await setupTestDatabase()
    testData = await seedTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(() => {
    api = createApiClient()
  })

  describe('GET /api/chore-templates', () => {
    it('should return all templates', async () => {
      await api.login(testData.users.parent)
      const response = await api.getTemplates()
      expect(response.status).toBe(200)
    })
  })
})
```

#### Integration Test Infrastructure

- **db-setup.ts** - Creates test database, runs migrations, seeds test data
- **api-helpers.ts** - `ApiClient` class with methods for all API endpoints
- **global-setup.ts** - Runs once before all tests (creates test-db directory)
- **global-teardown.ts** - Runs once after all tests (cleans up test database)
- **jest-setup.ts** - Runs before each test file (sets timeouts, suppresses logs)

#### Test Database

Integration tests use a separate SQLite database at `test-db/integration-test.db`:
- Created fresh for each test run
- Seeded with consistent test data (family, users, categories, templates)
- Automatically cleaned up after tests

### 5. E2E Tests

E2E tests use Playwright to test complete user flows through the UI:

```typescript
import { test, expect } from '@playwright/test'
import { TestUtils } from './fixtures/test-helpers'

test.describe('Authentication', () => {
  let utils: TestUtils

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page)
    await page.goto('/')
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await utils.login('dad@home', 'password123')
    
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Dad')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('[name="email"]', 'dad@home')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.error-message')).toBeVisible()
  })
})
```

#### E2E Test Fixtures

Create reusable test fixtures in `e2e/fixtures/test-helpers.ts`:

```typescript
import { Page } from '@playwright/test'

export class TestUtils {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email)
    await this.page.fill('[name="password"]', password)
    await this.page.click('button[type="submit"]')
    await this.page.waitForURL(/.*dashboard/)
  }

  async createChoreTemplate(title: string, points: number) {
    await this.page.click('[data-testid="templates-link"]')
    await this.page.click('[data-testid="create-template"]')
    await this.page.fill('[name="title"]', title)
    await this.page.fill('[name="points"]', points.toString())
    await this.page.click('button[type="submit"]')
  }

  async assignChore(templateId: string, userId: string) {
    // Implementation
  }
}
```

#### E2E Test Scenarios

| Test File | Description | Test Count |
|-----------|-------------|------------|
| `auth.spec.ts` | Login, logout, session handling | ~8 tests |
| `dashboard.spec.ts` | Dashboard display, personal view | ~6 tests |
| `chores.spec.ts` | CRUD operations, completion, filtering | ~12 tests |
| `templates.spec.ts` | Template management | ~8 tests |
| `calendar.spec.ts` | Calendar view, navigation | ~6 tests |
| `notifications.spec.ts` | Notification bell, marking read | ~5 tests |
| `recurring-chores.spec.ts` | Recurring chore management | ~10 tests |
| `pocket-money.spec.ts` | Pocket money system | ~8 tests |
| `pwa.spec.ts` | PWA installation, offline mode | ~7 tests |
| `statistics.spec.ts` | Statistics dashboard | ~8 tests |

**Total: 78 E2E tests**

#### E2E Test Best Practices

1. **Use data-testid attributes** for reliable selectors:
   ```typescript
   await page.click('[data-testid="create-chore-button"]')
   ```

2. **Wait for navigation/state changes:**
   ```typescript
   await page.waitForURL(/.*dashboard/)
   await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' })
   ```

3. **Use Page Object Model for complex flows:**
   ```typescript
   const chorePage = new ChorePage(page)
   await chorePage.createChore({ title: 'Test', points: 10 })
   ```

4. **Test accessibility:**
   ```typescript
   await expect(page).toBeAccessible()
   ```

5. **Test responsive design:**
   ```typescript
   test('mobile view', async ({ page }) => {
     await page.setViewportSize({ width: 375, height: 667 })
     // Test mobile-specific behavior
   })
   ```

## Best Practices

### 1. Isolate Units

- Mock all external dependencies (database, services, APIs)
- Don't rely on actual database connections
- Use `jest.clearAllMocks()` in `beforeEach`

### 2. Test Edge Cases

- Empty results
- Null/undefined values
- Error conditions
- Boundary values

### 3. Use Descriptive Names

```typescript
// Good
it('should throw error when user not found', async () => { ... })

// Bad
it('throws', async () => { ... })
```

### 4. Test Behavior, Not Implementation

```typescript
// Good - tests the behavior
expect(result).toEqual(expectedUser)

// Avoid - tests implementation details
expect(prisma.user.findUnique).toHaveBeenCalledTimes(1)
```

### 5. Keep Tests Independent

Each test should:
- Set up its own data
- Not depend on other tests
- Clean up after itself (if needed)

## CI/CD Integration

Tests are automatically run in GitHub Actions:

1. On every push to any branch
2. On pull requests to main
3. Coverage reports are uploaded as artifacts
4. Integration tests run after unit tests
5. E2E tests run against a test environment

### Workflow Configuration

```yaml
- name: Run unit tests with coverage
  working-directory: backend
  run: npm run test:coverage

- name: Run integration tests
  working-directory: backend
  run: npm run test:integration
  env:
    NODE_ENV: test
    SESSION_SECRET: test-session-secret-for-ci

- name: Install Playwright browsers
  working-directory: frontend
  run: npx playwright install --with-deps

- name: Run E2E tests
  working-directory: frontend
  run: npm run test:e2e
  env:
    CI: true

- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: backend-coverage
    path: backend/coverage

- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: frontend/playwright-report/
```

## Troubleshooting

### Tests Fail with "Cannot find name 'jest'"

This is an IDE warning, not a runtime error. The tests will run correctly with Jest. To fix IDE warnings, ensure `@types/jest` is installed.

### Mock Not Working

1. Ensure the mock path matches the import path exactly
2. Use `__esModule: true` for default exports
3. Clear mocks between tests with `jest.clearAllMocks()`

### Database Errors in Tests

Tests should never connect to a real database. Ensure:
- Prisma is properly mocked
- No actual database calls are made
- Use `jest.mock()` at the top of the file

### Playwright Tests Flaky

1. Use proper wait strategies:
   ```typescript
   // Wait for element to be visible
   await expect(page.locator('.item')).toBeVisible()
   
   // Wait for network idle
   await page.waitForLoadState('networkidle')
   ```

2. Avoid fixed timeouts:
   ```typescript
   // Bad
   await page.waitForTimeout(1000)
   
   // Good
   await page.waitForSelector('.loaded')
   ```

3. Use test isolation - each test should be independent

## Adding New Tests

1. Create test file in appropriate directory
2. Import the module to test
3. Mock dependencies
4. Write test cases following the structure above
5. Run tests to verify

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Services | 80% | ~60% |
| Middleware | 90% | 85% |
| Controllers | 70% | 0% |
| Integration Tests | 100% endpoints | ~150 test cases |
| E2E Tests | All user flows | 78 tests |
| Overall | 75% | ~50% |

## Integration Test Coverage

The integration test suite covers:

| API Area | Test File | Test Count |
|----------|-----------|------------|
| Chore Templates | `chore-templates.integration.test.ts` | ~30 tests |
| Chore Assignments | `chore-assignments.integration.test.ts` | ~35 tests |
| Users | `users.integration.test.ts` | ~30 tests |
| Recurring Chores | `recurring-chores.integration.test.ts` | ~40 tests |
| Pocket Money | `pocket-money.integration.test.ts` | ~25 tests |

### Test Scenarios Covered

- **Authentication & Authorization** - Session-based auth, role-based access
- **CRUD Operations** - Create, Read, Update, Delete for all entities
- **Validation** - Required fields, type validation, business rules
- **Edge Cases** - Empty data, large values, special characters
- **Business Logic** - Points awarding, round-robin assignment, recurrence generation
- **Error Handling** - 404, 403, 400, 500 responses

## E2E Test Coverage

The E2E test suite covers:

| Feature Area | Test File | Test Count |
|--------------|-----------|------------|
| Authentication | `auth.spec.ts` | ~8 tests |
| Dashboard | `dashboard.spec.ts` | ~6 tests |
| Chores Management | `chores.spec.ts` | ~12 tests |
| Templates | `templates.spec.ts` | ~8 tests |
| Calendar | `calendar.spec.ts` | ~6 tests |
| Notifications | `notifications.spec.ts` | ~5 tests |
| Recurring Chores | `recurring-chores.spec.ts` | ~10 tests |
| Pocket Money | `pocket-money.spec.ts` | ~8 tests |
| PWA Features | `pwa.spec.ts` | ~7 tests |
| Statistics Dashboard | `statistics.spec.ts` | ~8 tests |

**Total: 78 E2E tests**

### E2E Test Scenarios Covered

- **User Authentication** - Login, logout, session persistence
- **Chore Lifecycle** - Create, assign, complete, partial completion
- **Template Management** - CRUD operations for templates
- **Calendar Navigation** - Month navigation, event display
- **Recurring Chores** - Create, edit, occurrence management
- **Pocket Money** - Balance tracking, transactions
- **PWA Features** - Installation, offline mode, caching
- **Statistics** - Dashboard display, charts, activity feed
- **Responsive Design** - Mobile, tablet, desktop views
- **Accessibility** - Keyboard navigation, screen reader support

---

*Last updated: February 2026 - Version 2.0.0*
