# Testing Patterns

**Analysis Date: 2026-07-04**

## Test Framework

**Runner:**
- **Backend**: `jest`
- **Frontend**: `vitest`

**Assertion Library:**
- **Backend**: `expect` (Jest built-in)
- **Frontend**: `expect` (Vitest/JSDom)

**Run Commands:**
```bash
# Backend (cd backend)
npm test                # Run all tests
npm run test:unit       # Unit tests
npm run test:integration # Integration tests (requires real DB)

# Frontend (cd frontend)
npm test                # Run all tests
```

## Test File Organization

**Location:**
- Co-located in `src/__tests__/` directory.

**Naming:**
- `*.test.ts` or `*.test.tsx`.

## Test Structure

**Suite Organization:**
- Uses `describe` blocks to group tests by HTTP verb/path or functionality.
- Uses `it` blocks for individual test cases.

## Mocking

**Framework:** `jest.mock()` / `vi.mock()`.

**Patterns:**
- Backend: Uses `supertest` for integration tests against a real (test) database.
- Backend unit tests mock Prisma via `src/__tests__/__mocks__/` (as per `AGENTS.md`).

## Fixtures and Factories

**Test Data:**
- Handled directly in test setups or helpers.

## Coverage

**Requirements:**
- None explicitly enforced.

## Test Types

**Unit Tests:**
- Used for business logic in services and utility functions.

**Integration Tests:**
- Used for API endpoints (Backend) and page components (Frontend).

**E2E Tests:**
- Playwright is used for E2E tests (run from root: `npm run test:e2e`).

---

*Testing analysis: 2026-07-04*
