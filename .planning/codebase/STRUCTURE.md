# Codebase Structure

**Analysis Date:** 2026-04-28

## Directory Layout

```
chore-ganizer/
├── backend/                # Express.js backend, Docker image: ghcr.io/thitar/chore-ganizer-backend
│   ├── src/
│   │   ├── __tests__/     # Unit/integration tests
│   │   ├── config/        # Database config (Prisma client singleton)
│   │   ├── constants/     # Shared constants
│   │   ├── controllers/   # Thin HTTP layer, input validation
│   │   ├── jobs/          # Cron jobs (recurring chore generation)
│   │   ├── middleware/    # Auth, CSRF, error handling, rate limiting
│   │   ├── prisma/        # Prisma client, schema, migrations
│   │   ├── routes/        # API route definitions
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── services/      # All business logic
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Shared utilities (logger, asyncHandler)
│   │   ├── app.ts         # Express app configuration
│   │   ├── server.ts      # Server entry point
│   │   └── version.ts     # App version info
│   ├── prisma/
│   │   └── schema.prisma  # Database schema (single source of truth)
│   ├── package.json       # Backend version (must match frontend)
│   └── tsconfig.json      # TypeScript config
├── frontend/               # React + Vite frontend, Docker image: ghcr.io/thitar/chore-ganizer-frontend
│   ├── src/
│   │   ├── api/           # Axios API clients per domain
│   │   ├── components/    # Reusable UI components (common, layout, domain-specific)
│   │   ├── hooks/         # Domain logic hooks (useAuth, useChores)
│   │   ├── pages/         # Route pages (lazy-loaded)
│   │   ├── test/          # Test utilities (renderWithRouter, mock factories)
│   │   ├── types/         # Shared TypeScript types
│   │   ├── utils/         # Frontend utilities
│   │   ├── App.tsx        # Route definitions, ProtectedRoute wrapper
│   │   ├── main.tsx       # Entry point
│   │   └── version.ts     # Frontend version info
│   ├── package.json       # Frontend version (must match backend)
│   └── vite.config.ts     # Vite build config
├── .planning/              # GSD planning artifacts
│   └── codebase/          # Codebase analysis documents (this directory)
├── docker-compose.yml      # Orchestrates backend + frontend containers
├── docker-entrypoint.sh    # Shared container startup script
└── .env                    # Environment variables (DO NOT COMMIT)
```

## Directory Purposes

**`backend/src/controllers/`:**
- Purpose: Thin HTTP layer, input validation, response formatting
- Contains: One controller per domain (auth, chores, users, pocket-money)
- Key files: `pocket-money.controller.ts`, `chore-assignments.controller.ts`, `auth.controller.ts`

**`backend/src/services/`:**
- Purpose: All business logic, database operations
- Contains: Service modules matching controllers, plus `recurrence.service.ts`, `notificationService.ts`
- Key files: `chore-assignments.service.ts`, `auth.service.ts`, `recurrence.service.ts`

**`backend/src/middleware/`:**
- Purpose: Request processing pipeline (auth, CSRF, error handling, rate limiting)
- Contains: Auth (`auth.ts`), CSRF (`csrf.ts`), error handler (`errorHandler.ts`), rate limiter (`rateLimiter.ts`)
- Key files: `errorHandler.ts` (global error handler), `auth.ts` (session auth + role checks)

**`frontend/src/api/`:**
- Purpose: Axios API clients per domain, CSRF handling, error interception
- Contains: One API file per domain, `client.ts` (base Axios instance)
- Key files: `client.ts` (CSRF injection, 401 auto-logout), `auth.api.ts`, `chores.api.ts`

**`frontend/src/hooks/`:**
- Purpose: Domain logic hooks, auth state management
- Contains: `useAuth.tsx` (auth context, session state), `useChores.ts`, `useAssignments.ts`
- Key files: `useAuth.tsx` (wraps React context, provides `isParent`, `isAuthenticated`)

## Key File Locations

**Entry Points:**
- Backend: `backend/src/server.ts` (starts Express app, initializes cron jobs)
- Frontend: `frontend/src/main.tsx` (renders React app, initializes auth provider)
- API Routes: `backend/src/routes/index.ts` (mounts all `/api/*` routers)

**Configuration:**
- Backend env: `.env` (root directory, SESSION_SECRET, APP_VERSION required)
- Backend TS: `backend/tsconfig.json`
- Frontend Vite: `frontend/vite.config.ts`
- Docker Compose: `docker-compose.yml` (root directory)

**Core Logic:**
- DB Schema: `backend/prisma/schema.prisma` (all models, relations, indexes)
- Auth Middleware: `backend/src/middleware/auth.ts` (`authenticate`, `authorize`, `requireParent`)
- Recurring Job: `backend/src/jobs/occurrenceJob.ts` (daily occurrence generation)
- API Client: `frontend/src/api/client.ts` (CSRF, 401 handling)

**Testing:**
- Backend tests: `backend/src/__tests__/` (unit + integration tests)
- Frontend tests: `frontend/src/**/*.test.tsx` (Vitest + React Testing Library)
- E2E tests: `e2e/` (Playwright, `.spec.ts` suffix)

## Naming Conventions

**Files:**
- Backend: `kebab-case.ts` (e.g., `chore-assignments.service.ts`, `errorHandler.ts`)
- Frontend: `kebab-case.tsx` for components, `camelCase.ts` for utilities/hooks
- Tests: Co-located with source, `.test.ts` (backend), `.test.tsx` (frontend), `.spec.ts` (E2E)

**Directories:**
- Plural, kebab-case: `controllers/`, `services/`, `components/chores/`

**Functions/Variables:**
- camelCase for functions/variables (backend and frontend)
- PascalCase for React components, TypeScript interfaces/types

## Where to Add New Code

**New Backend Feature:**
- Primary code: `backend/src/services/<feature>.service.ts` (business logic)
- Controller: `backend/src/controllers/<feature>.controller.ts` (HTTP layer)
- Routes: `backend/src/routes/<feature>.routes.ts` (mount in `routes/index.ts`)
- Tests: `backend/src/__tests__/unit/<feature>.test.ts` (unit), `backend/src/__tests__/integration/<feature>.test.ts` (integration)
- Validation schemas: `backend/src/schemas/<feature>.schema.ts`

**New Frontend Feature:**
- Page: `frontend/src/pages/<FeaturePage>.tsx` (lazy-load in `App.tsx`)
- Components: `frontend/src/components/<feature>/` (domain-specific components)
- API: `frontend/src/api/<feature>.api.ts` (add to `api/index.ts` barrel file)
- Hook: `frontend/src/hooks/use<Feature>.ts` (domain logic)

**Shared Utilities:**
- Backend: `backend/src/utils/` (e.g., `logger.ts`, `asyncHandler.ts`)
- Frontend: `frontend/src/utils/` (e.g., date formatting, validation helpers)

## Middleware Ordering (Critical)

Middleware in `backend/src/app.ts` is security-critical. Order from first to last applied:
1. Helmet (security headers) → `app.use(helmet(...))`
2. Rate Limiter (`/api` only) → `app.use('/api', generalLimiter)`
3. CORS → `app.use(cors(...))`
4. Body Parser → `app.use(express.json(...))`, `app.use(express.urlencoded(...))`
5. Compression → `app.use(compressionMiddleware)`
6. Request Timer → `app.use(requestTimerMiddleware)`
7. Shutdown Tracker → `app.use(shutdownMiddleware)`
8. Session → `app.use(session(...))`
9. CSRF Protection → `app.use(csrfMiddleware)`
10. Request Logger → `app.use(requestLogger)`
11. Metrics → `app.use(metricsMiddleware)`
12. Routes → `app.use('/api', routes)`
13. 404 Handler → `app.use(notFoundHandler)`
14. Global Error Handler → `app.use(errorHandler)`

**Never reorder this pipeline** without verifying security implications (e.g., CSRF must come after session, rate limiter before routes).

## Route Definitions

All API routes mounted in `backend/src/routes/index.ts` under `/api` prefix:
| Route Prefix | Router File | Auth Required | Parent-Only |
|--------------|-------------|----------------|--------------|
| `/auth` | `auth.routes.ts` | No | No |
| `/chore-templates` | `chore-templates.routes.ts` | Yes | Yes |
| `/chore-assignments` | `chore-assignments.routes.ts` | Yes | Mixed |
| `/chore-categories` | `chore-categories.routes.ts` | Yes | Yes |
| `/users` | `users.routes.ts` | Yes | Mixed |
| `/notifications` | `notifications.routes.ts` | Yes | No |
| `/notification-settings` | `notification-settings.routes.ts` | Yes | No |
| `/overdue-penalty` | `overdue-penalty.routes.ts` | Yes | Yes |
| `/recurring-chores` | `recurring-chores.routes.ts` | Yes | Yes |
| `/pocket-money` | `pocket-money.routes.ts` | Yes | Mixed |
| `/audit` | `audit.routes.ts` | Yes | Yes |
| `/statistics` | `statistics.routes.ts` | Yes | Yes |
| `/health`, `/version` | `routes/index.ts` | No | No |

## DB Schema Location

Single source of truth: `backend/prisma/schema.prisma`
- Models: `User`, `ChoreTemplate`, `ChoreAssignment`, `RecurringChore`, `ChoreOccurrence`, `PointTransaction`, `Payout`, `PocketMoneyConfig`, `Family`, `Notification`, `UserNotificationSettings`, `AuditLog`
- Migrations: `backend/prisma/migrations/` (generated by `prisma migrate`)
- Seed script: `backend/prisma/seed.ts` (auto-runs on first container start)

## Special Directories

**`backend/src/__tests__/`:**
- Purpose: Unit and integration tests
- Generated: No
- Committed: Yes
- Subdirectories: `unit/`, `integration/`, `__mocks__/` (Prisma mocks)

**`frontend/src/test/`:**
- Purpose: Test utilities (mock factories, `renderWithRouter` helper)
- Generated: No
- Committed: Yes

**`node_modules/`:**
- Purpose: Dependencies (both backend and frontend)
- Generated: Yes (via `npm install`)
- Committed: No (in `.gitignore`)

**`dist/` (backend):**
- Purpose: Compiled TypeScript output
- Generated: Yes (via `npm run build`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-04-28*
