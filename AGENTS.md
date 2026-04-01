# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure

- **Backend**: Express/TypeScript API in `backend/` (controllers → services → routes)
- **Frontend**: React/Vite SPA in `frontend/` (components, hooks, pages, api client)
- **Database**: SQLite via Prisma ORM (`backend/prisma/schema.prisma`)
- **E2E Tests**: Playwright in `e2e/` directory

## Commands

### Running the Application
- Backend: `cd backend && npm run dev` (port 3000)
- Frontend: `cd frontend && npm run dev` (port 5173)
- Both must run simultaneously for full functionality

### Testing — Single Test
- Backend by file: `cd backend && npx jest src/__tests__/services/chore-assignments.service.test.ts`
- Backend by name: `cd backend && npx jest -t "should return all assignments"`
- Backend by pattern: `cd backend && npx jest --testPathPattern="auth" --testNamePattern="login"`
- Frontend by file: `cd frontend && npx vitest run src/components/common/Button.test.tsx`
- Frontend by name: `cd frontend && npx vitest run -t "renders children correctly"`
- E2E: `npm run test:e2e` or `npm run test:e2e:debug`

### Testing — Full Suites
- Backend unit: `cd backend && npm run test:unit`
- Backend integration: `cd backend && npm run test:integration`
- Backend all: `cd backend && npm run test:all`
- Frontend: `cd frontend && npm run test`
- E2E: `npm run test:e2e` (auto-starts backend)

### Building
- Backend: `cd backend && npm run build` (outputs to `backend/dist/`)
- Frontend: `cd frontend && npm run build`
- Lint frontend: `cd frontend && npm run lint`

### Database
- Generate Prisma client: `cd backend && npm run prisma:generate`
- Run migrations: `cd backend && npm run prisma:migrate`
- Seed: `cd backend && npm run prisma:seed`
- GUI: `cd backend && npm run prisma:studio`

## Code Style

### Formatting
- 2-space indentation, single quotes, no semicolons, trailing commas
- No ESLint or Prettier config files — follow existing code patterns

### Imports
- **Backend**: Use `.js` extension on relative imports (e.g., `from '../services/foo.service.js'`). Group external imports first, then relative. Use `import * as` namespace imports for services.
- **Frontend**: No file extensions on relative imports. Use `import type` for type-only imports. Barrel exports via `index.ts` in `hooks/` and `components/`.

### Naming Conventions
- Files: kebab-case in backend (`chore-assignments.controller.ts`), PascalCase for frontend components (`Button.tsx`), camelCase for hooks (`useAuth.ts`)
- Tests: `.test.ts` (backend), `.test.tsx` (frontend React), `.integration.test.ts` (backend integration), `.spec.ts` (E2E)
- Variables/functions: camelCase. Classes/interfaces/components: PascalCase. Constants: UPPER_SNAKE_CASE
- Interfaces use descriptive suffixes: `CreateAssignmentData`, `ButtonProps`, `AssignmentFilters`

### Types
- Strict TypeScript in backend (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`)
- Frontend relaxed: `noUnusedLocals: false`, `noUnusedParameters: false`
- Frontend uses `@/` path alias (maps to `./src`)

### Error Handling
- **Backend**: Custom `AppError` class with `statusCode` and `code`. All route handlers MUST use `asyncHandler` from `backend/src/utils/asyncHandler.ts`. Global error handler catches all errors. Prisma errors mapped (P2002→409, P2025→404).
- **Frontend**: Error Boundary wrapping app. API client throws `{ success: false, error: { message, code } }`. User-facing messages via Sonner toast. Custom `auth:unauthorized` event for session expiry.

### API Response Pattern
All API responses: `{ success: true, data: { ... } }` or `{ success: false, error: { message, code } }`

## Non-Obvious Patterns

1. **Version Synchronization**: Version in 4 places: `package.json` (root), `backend/package.json`, `frontend/package.json`, and `backend/src/version.ts` reads `APP_VERSION` env var
2. **Session Storage**: Sessions in SQLite at `backend/data/sessions.db` (not in memory), with CSRF protection
3. **API Prefix**: All routes have `/api` prefix (e.g., `/api/users`, `/api/chores`)
4. **Controller-Service Separation**: Controllers handle HTTP layer only; business logic lives in services
5. **Zod Validation**: Request validation via Zod schemas in middleware
6. **Background Jobs**: `node-cron` for recurring chore occurrence generation
7. **PUID/PGID**: Container adjusts `appuser` UID/GID at startup via env vars for bind mount ownership

## Test Patterns

- **Backend (Jest)**: Mock Prisma at module level with `jest.mock()`. Shared fixtures in `__tests__/test-helpers.ts`. Integration tests use real DB with global setup/teardown, run serially (`--runInBand`).
- **Frontend (Vitest)**: Globals enabled but imports are explicit (`describe`, `it`, `expect`, `vi`). Use `@testing-library/react`. Custom render wrapper with `BrowserRouter` from `test/utils.tsx`.
- **E2E (Playwright)**: Setup via API fixtures. Cleanup in `afterEach`. Mix of API and UI testing.
