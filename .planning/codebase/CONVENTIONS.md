# Coding Conventions

**Analysis Date:** 2026-04-28

## Naming Patterns

**Files:**
- Frontend: PascalCase for components (e.g., `ChoreCard.tsx`), camelCase for hooks (`useAuth.tsx`), kebab-case for API files (`chores.api.ts`), `*.test.tsx` for test files
- Backend: kebab-case for multi-word modules (e.g., `chore-assignments.service.ts`), `*.test.ts` for unit tests, `*.integration.test.ts` for integration tests
- E2E: `*.spec.ts` suffix (e.g., `e2e/auth.spec.ts`)

**Functions:**
- camelCase (e.g., `getChores`, `createAssignment`, `initCsrfToken`)

**Variables:**
- camelCase (e.g., `csrfToken`, `mockUser`, `apiParams`)

**Types:**
- PascalCase (e.g., `ChoreAssignment`, `CreateAssignmentData`, `ApiResponse`)

## Code Style

**Formatting:**
- Tool: Prettier
- Config: No project-level `.prettierrc` found, uses default Prettier settings
- Run commands: `npm run format` (backend/frontend)

**Linting:**
- Tool: ESLint
- Config: No project-level `.eslintrc` found, uses default ESLint rules
- Run commands: `npm run lint` (backend/frontend)

## Import Organization

**Order:**
1. External library imports (e.g., `import express from 'express'`, `import React from 'react'`)
2. Internal module imports (using path aliases)
3. Relative imports for local files

**Path Aliases:**
- Backend: `@/` maps to `src/` (configured in `backend/jest.config.js` moduleNameMapper)
- Frontend: `@` maps to `src/` (configured in `frontend/vitest.config.ts` resolve.alias)

## Error Handling

**Backend Patterns:**
- `AppError` class with `statusCode` and `code` fields, caught by global error handler in `backend/src/middleware/errorHandler.ts`
- Standard API response envelope: `{ "success": true, "data": { ... }, "error": null }`

**Frontend Patterns:**
- API client (`frontend/src/api/client.ts`) throws error response data
- Error handling via React Query (`@tanstack/react-query`) or try/catch in components

## Logging

**Backend Framework:** Winston (dependency: `winston@^3.11.0`)
- Used for request logging, error tracking, metrics

**Frontend Framework:** Console logging with debug toggle
- Debug mode enabled via `import.meta.env.DEV` or `window.APP_CONFIG?.debug` (see `frontend/src/api/client.ts`)

**Patterns:**
- Log API requests/responses in debug mode
- Log 401/403 errors with context for auth/CSRF issues

## Comments

**When to Comment:**
- JSDoc for services, controllers, and complex utility functions
- Inline comments for non-obvious logic (e.g., CSRF retry flow, parameter mapping)

**JSDoc:**
- Used extensively in `backend/src/__tests__/test-helpers.ts` for mock factories
- Used in service files (e.g., `backend/src/services/auth.service.ts`)

## Function Design

**Size:** Small, single-purpose functions (most functions under 50 lines)

**Parameters:** Prefer objects for multiple parameters (e.g., `create({ email, password })` instead of `create(email, password)`)

**Return Values:** Consistent return patterns (services return data objects, controllers return API response envelopes)

## Module Design

**Exports:** Named exports preferred (e.g., `export const assignmentsApi = { ... }`)

**Barrel Files:**
- Backend: `backend/src/routes/index.ts` as central router barrel
- Frontend: No top-level barrel files, direct imports from domain files (e.g., `import { useAuth } from './hooks'`)

## Frontend-Backend Parameter Mapping

Frontend uses internal naming conventions that map to backend API expectations in the API layer:
- `userId` (frontend) → `assignedToId` (backend): Mapped in `frontend/src/api/assignments.api.ts` line 16
- `templateId` (frontend) → `choreTemplateId` (backend): Handled in assignment creation payloads

Mapping always happens in `frontend/src/api/` layer files, never in components or hooks.

## Pocket Money Storage

- All monetary values stored as integers (cents) to avoid floating-point errors
- `PointTransaction.amount` is `Int` (integer) in Prisma schema (`backend/prisma/schema.prisma` line 202)
- `pointValueInCents` config converts points to currency (see `backend/src/swagger.config.ts` line 486)

## CSRF Flow

Implemented in `frontend/src/api/client.ts`:
1. CSRF token fetched from `GET /api/csrf-token` on app initialization (`initCsrfToken()`)
2. Token added to all state-changing requests (POST/PUT/DELETE/PATCH) via request interceptor
3. 403 CSRF errors trigger token refresh and single retry of original request
4. Token reset on login/logout (`resetCsrfToken()`)

## Auth Redirect Behavior

- Children accessing parent-only routes redirected to `/dashboard` (see `frontend/src/App.tsx` line 36: `return <Navigate to="/dashboard" replace />`)
- 401 Unauthorized responses dispatch `auth:unauthorized` custom DOM event (see `frontend/src/api/client.ts` lines 105-107)
- `AuthContext` listens for `auth:unauthorized` event to trigger logout

## Test Mocking Patterns

**Backend Unit Tests:**
- Mock Prisma client via `jest.mock('../../config/database', () => ({ ... }))` (see `backend/src/__tests__/services/auth.service.test.ts` lines 5-14)
- Use `createPrismaMock()` from `backend/src/__tests__/test-helpers.ts` for consistent Prisma mock structure
- Mock bcrypt/nodemailer via `jest.spyOn()` or additional `jest.mock()` calls

**Frontend Tests:**
- Mock API modules via `vi.mock('../api', () => ({ ... }))` (see `frontend/src/hooks/useAuth.test.tsx` lines 14-21)
- Wrap components with providers (e.g., `AuthProvider` wrapper for auth hook tests)

---

*Convention analysis: 2026-04-28*
