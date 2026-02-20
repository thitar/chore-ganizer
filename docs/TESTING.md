# Chore-Ganizer Testing Guide

This document describes the testing strategy, structure, and best practices for the Chore-Ganizer backend.

## Overview

The Chore-Ganizer backend uses **Jest** as the testing framework with **ts-jest** for TypeScript support. Tests are organized by type (services, middleware, controllers) and use mocking to isolate units of code.

## Test Structure

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── test-helpers.ts           # Shared test utilities and fixtures
│   │   ├── services/
│   │   │   ├── auth.service.test.ts
│   │   │   ├── users.service.test.ts
│   │   │   ├── chore-assignments.service.test.ts
│   │   │   └── notification-settings.service.test.ts
│   │   └── middleware/
│   │       └── auth.test.ts
│   ├── services/
│   ├── controllers/
│   └── middleware/
├── jest.config.js
└── package.json
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

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

### Workflow Configuration

```yaml
- name: Run tests with coverage
  working-directory: backend
  run: npm run test:coverage

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
| Overall | 75% | ~50% |

---

*Last updated: February 2026*
