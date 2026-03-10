# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure

- **Backend**: Express/TypeScript API in `backend/` directory
- **Frontend**: React/Vite SPA in `frontend/` directory  
- **Database**: SQLite via Prisma ORM
- **E2E Tests**: Playwright in `e2e/` directory

## Critical Commands

### Running the Application
- Backend: `cd backend && npm run dev` (runs on port 3000)
- Frontend: `cd frontend && npm run dev` (runs on port 5173)
- Both must be running simultaneously for full functionality

### Testing
- Backend unit tests: `cd backend && npm run test:unit`
- Backend integration tests: `cd backend && npm run test:integration`
- Backend all tests: `cd backend && npm run test:all`
- Frontend tests: `cd frontend && npm run test`
- E2E tests: `npm run test:e2e` (auto-starts backend)

### Building
- Backend: `cd backend && npm run build` (outputs to `backend/dist/`)
- Frontend: `cd frontend && npm run build`

### Database
- Generate Prisma client: `cd backend && npm run prisma:generate`
- Run migrations: `cd backend && npm run prisma:migrate`

## Non-Obvious Patterns

1. **Version Synchronization**: Version must be updated in 4 places: `package.json` (root), `backend/package.json`, `frontend/package.json`, and `backend/src/version.ts` reads from `APP_VERSION` env var

2. **Async Handler Wrapper**: All Express route handlers MUST use `asyncHandler` from `backend/src/utils/asyncHandler.ts` to properly catch errors

3. **Session Storage**: Sessions stored in SQLite at `backend/data/sessions.db` (not in memory)

4. **API Prefix**: All API routes have `/api` prefix (e.g., `/api/users`, `/api/chores`)

5. **Test Configuration**: Backend has separate jest configs - unit tests exclude `/integration/` path, integration tests use `jest.integration.config.js`

6. **CORS**: Frontend runs on port 5173 by default, CORS is configured to allow this origin
