# Chore-Ganizer Testing Guide

This document describes the testing strategy, structure, and best practices for the Chore-Ganizer backend.

## Overview

The Chore-Ganizer backend uses **Jest** as the testing framework with **ts-jest** for TypeScript support. We have two types of tests:

1. **Unit Tests** - Test individual functions/services in isolation using mocks
2. **Integration Tests** - Test full API endpoints with a real test database

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
├── jest.config.js
└── package.json
```

## Running Tests

```bash
# Run all unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage report
npm run test:coverage

# Run integration tests only
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Run specific test file
npm test -- --testPathPattern=users.service

# Run tests matching a pattern
npm test -- --testNamePattern="getAllUsers"
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
- Be placed in `src/__tests__/` mirroring the source structure
- Use `.test.ts` suffix
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

- name: Upload coverage report
  uses: actions/upload-artifact@v4
  with:
    name: backend-coverage
    path: backend/coverage
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

## Adding New Tests

1. Create test file in appropriate `__tests__` subdirectory
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

---

*Last updated: February 2026*
