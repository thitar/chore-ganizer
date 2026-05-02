<!-- refreshed: 2026-05-01 -->
# Architecture

**Analysis Date:** 2026-05-01

## System Overview

```text
┌───────────────────────────────────────────────────────────────────────┐
│                        Client Browser                                  │
│                React 18 SPA + Tailwind CSS + PWA                      │
│              `frontend/src/`                                           │
├──────────────────┬──────────────────┬─────────────────────────────────┤
│   Pages/         │   Components/    │   Hooks/ + Api/                 │
│   (lazy-loaded)  │   (by domain)    │   (data fetching)               │
│  `src/pages/`    │  `src/components/│   `src/hooks/` `src/api/`       │
└────────┬─────────┴────────┬─────────┴──────────┬──────────────────────┘
         │                  │                     │
         │  HTTP + Axios    │  CSRF Token         │  Session Cookie
         ▼                  ▼                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    Nginx (frontend container)                          │
│         SPA static files + /api/* proxy to backend                     │
│              `frontend/nginx.conf.template`                            │
└───────────────────────────────────────────────────────────────────────┘
         │
         │  /api/* reverse proxy
         ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    Express.js API Server                               │
│              `backend/src/`                                            │
├──────────────────┬──────────────────┬─────────────────────────────────┤
│   Routes/        │   Controllers/    │   Middleware/                   │
│   (OpenAPI docs) │   (HTTP layer)    │   (auth, CSRF, rate, validate) │
│  `src/routes/`   │  `src/controllers/│   `src/middleware/`             │
├──────────────────┼──────────────────┼─────────────────────────────────┤
│   Services/      │   Jobs/           │   Utils/                        │
│   (business logic)│  (cron)          │   (logger, cache, metrics)      │
│  `src/services/`  │  `src/jobs/`     │   `src/utils/`                  │
├──────────────────┼──────────────────┼─────────────────────────────────┤
│   Schemas/       │   Config/         │   Types/                        │
│   (Zod validation)│  (DB singleton)  │   (extended Express types)      │
│  `src/schemas/`   │  `src/config/`   │   `src/types/`                  │
└─────────┬─────────┴────────┬─────────┴──────────┬──────────────────────┘
          │                   │                     │
          ▼                   ▼                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│  SQLite Database (via Prisma ORM)                                      │
│  `backend/prisma/schema.prisma` (16 models)                            │
│  File: `${DATA_DIR}/chore-ganizer.db` (Docker bind mount)              │
└───────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Express App | Configures middleware chain, mounts routes | `backend/src/app.ts` |
| HTTP Server | Creates server, manages graceful shutdown, starts cron jobs | `backend/src/server.ts` |
| Routes | Mounts sub-routers for all API domains, health, Swagger docs | `backend/src/routes/index.ts` |
| Controllers | Thinnest HTTP layer — extracts request data, delegates to services | `backend/src/controllers/*.controller.ts` |
| Services | All business logic, DB queries via Prisma, cross-domain orchestration | `backend/src/services/*.service.ts` |
| Middleware | Auth/CSRF/rate-limit/validation/error-handling/logging/metrics | `backend/src/middleware/*.ts` |
| Zod Schemas | Request body/query/param validation schemas | `backend/src/schemas/validation.schemas.ts` |
| Prisma Schema | Single source of truth for 16 DB models | `backend/prisma/schema.prisma` |
| Cron Jobs | Daily occurrence generation for recurring chores | `backend/src/jobs/occurrenceJob.ts` |
| React App | Route definitions, lazy loading, auth guard, layout | `frontend/src/App.tsx` |
| ApiClient | Axios wrapper with CSRF injection, 401 handling, debug logging | `frontend/src/api/client.ts` |
| API Modules | One file per domain, calls ApiClient methods | `frontend/src/api/*.api.ts` |
| Hooks | Domain logic hooks (useAuth context, useChores, etc.) | `frontend/src/hooks/*.ts` |
| Pages | One file per route, lazy-loaded via React.lazy() | `frontend/src/pages/*.tsx` |
| Components | Organized by domain: chores/, common/, layout/, users/, notifications/, pocket-money/, recurring-chores/ | `frontend/src/components/*/` |
| Nginx | Static file serving, API reverse proxy, SPA fallback, security headers | `frontend/nginx.conf.template` |
| Docker Entrypoint | Backend: user setup → Prisma migrate → seed → gosu appuser → start | `backend/docker-entrypoint.sh` |
| Docker Entrypoint | Frontend: envsubst nginx config → generate runtime config.js → start nginx | `frontend/docker-entrypoint.sh` |

## Pattern Overview

**Overall:** Layered monolith with clear separation of concerns

**Key Characteristics:**
- Backend: Controller → Service → Prisma pattern (thin controllers, fat services)
- Frontend: API module → Hook → Component/Page pattern (centralized data fetching)
- Monorepo: Two independent npm packages with synchronized versions
- No shared code between frontend and backend (independent `node_modules`)
- Docker Compose orchestrates both containers with nginx API proxy
- Auth via session cookies + CSRF tokens (not JWT)

## Layers

**Backend Layer: Middleware (Cross-cutting):**
- Purpose: Security, logging, metrics, error handling for every request
- Location: `backend/src/middleware/`
- Middleware order (security-critical): Helmet → Rate Limiter → CORS → Body Parser → Compression → Request Timer → Shutdown Tracker → Session → CSRF → Request Logger → Metrics
- Depends on: Express app bootstrap
- Used by: All API routes

**Backend Layer: Routes:**
- Purpose: Map HTTP methods and paths to controllers, apply OpenAPI JSDoc
- Location: `backend/src/routes/`
- Contains: 16 route files + 1 index router
- Depends on: Controllers, middleware (authenticate, authorize, validate)
- Used by: Express app via `app.use('/api', routes)`

**Backend Layer: Controllers:**
- Purpose: Extract data from request, call service, format HTTP response
- Location: `backend/src/controllers/`
- Contains: 16 controller files
- Depends on: Services, Prisma (for direct lookups in some cases)
- Used by: Routes

**Backend Layer: Services:**
- Purpose: Business logic, database queries, cross-domain orchestration
- Location: `backend/src/services/`
- Contains: 15 service files including `recurring-chores/` subdirectory (5 files)
- Depends on: Prisma client, other services, utilities
- Used by: Controllers, cron jobs

**Backend Layer: Infrastructure:**
- Purpose: Database config, logging, caching, metrics, error webhooks
- Location: `backend/src/config/`, `backend/src/utils/`
- Depends on: Third-party packages
- Used by: Services, middleware, controllers

**Frontend Layer: API:**
- Purpose: Typed HTTP client wrapper, CSRF token management, response envelope handling
- Location: `frontend/src/api/`
- Contains: 14 API modules + client.ts with Axios interceptors
- Key behavior: `client.ts` automatically injects `X-CSRF-Token` on mutating requests, dispatches `auth:unauthorized` custom event on 401 responses

**Frontend Layer: Hooks:**
- Purpose: Data fetching, state management, auth context
- Location: `frontend/src/hooks/`
- Auth state: React Context (`useAuth.tsx`) — not Zustand
- Data fetching: @tanstack/react-query hooks
- Depends on: API modules
- Used by: Pages

**Frontend Layer: Components:**
- Purpose: Reusable UI components organized by domain
- Location: `frontend/src/components/`
- Subdirectories: `chores/`, `common/`, `layout/`, `users/`, `notifications/`, `pocket-money/`, `recurring-chores/`
- Depends on: Types from `src/types/`, Tailwind CSS
- Used by: Pages

**Frontend Layer: Pages:**
- Purpose: Full-page components, one per route, lazy-loaded
- Location: `frontend/src/pages/`
- Depends on: Hooks, Components
- Used by: React Router in `App.tsx`

## Data Flow

### Primary Request Path (Chore Assignment Completion)

1. User clicks "Complete" on chore card → `frontend/src/components/chores/ChoreCard.tsx`
2. Component calls `useChores` hook → `frontend/src/hooks/useChores.ts`
3. Hook calls `choresApi.completeAssignment()` → `frontend/src/api/chores.api.ts`
4. `ApiClient` injects CSRF token into `X-CSRF-Token` header via Axios interceptor → `frontend/src/api/client.ts` line 67-72
5. Nginx proxies `/api/chore-assignments/:id/complete` to backend container → `frontend/nginx.conf.template` 
6. Express middleware chain processes request → `backend/src/app.ts`
7. Router dispatches to `choreAssignmentsRoutes` → `backend/src/routes/chore-assignments.routes.ts`
8. Controller extracts params and calls service → `backend/src/controllers/chore-assignments.controller.ts`
9. Service updates assignment status, creates point transaction, audits action → `backend/src/services/chore-assignments.service.ts`
10. Prisma executes SQLite query → `backend/src/config/database.ts`
11. Response flows back: Service → Controller → JSON response with `{ success: true, data: {...} }`
12. Frontend receives response, React Query invalidates relevant cache keys → UI updates

### Auth Flow

1. User submits login form → `frontend/src/pages/Login.tsx`
2. `useAuth` hook calls `authApi.login()` → `frontend/src/hooks/useAuth.tsx`
3. Backend receives `POST /api/auth/login` → `backend/src/routes/auth.routes.ts`
4. `authLimiter` rate limiter applied → `backend/src/middleware/rateLimiter.ts`
5. Zod validation via `validate(loginSchema)` → `backend/src/schemas/validation.schemas.ts`
6. Controller calls `authService.login()` → `backend/src/controllers/auth.controller.ts` → `backend/src/services/auth.service.ts`
7. Service checks lockout status, validates bcrypt hash, resets failed attempts
8. Session cookie sent with response (`Set-Cookie: connect.sid`)
9. Frontend calls `GET /api/csrf-token` → stores token in `ApiClient.csrfToken`
10. All subsequent mutating requests include `X-CSRF-Token` header

### Recurring Chore Occurrence Generation (Background)

1. Server starts → `node-cron` schedules job at midnight UTC → `backend/src/jobs/occurrenceJob.ts`
2. At midnight, `generateDailyOccurrences()` queries all active recurring chores
3. For each chore: parses `recurrenceRule` JSON, validates rule structure
4. `RecurrenceService.generateOccurrences()` checks if today should generate an occurrence → `backend/src/services/recurrence.service.ts`
5. If yes: determines assignees via `getAssignedUserIds()` based on assignment mode (FIXED, ROUND_ROBIN, MIXED)
6. Creates `ChoreOccurrence` record with snapshot of assigned user IDs and roundRobinIndex

**State Management:**
- Backend: Stateless HTTP (session state in SQLite, no in-memory user state)
- Frontend: Auth state in React Context (`AuthProvider`), data state via React Query (auto-caching, revalidation, optimistic updates)

## Key Abstractions

**ApiClient:**
- Purpose: Centralized HTTP client with CSRF token management, error handling, debug logging
- Examples: `frontend/src/api/client.ts`
- Pattern: Singleton class with Axios interceptor chain; auto-retries on CSRF token expiry

**AppError:**
- Purpose: Typed error with statusCode and error code for consistent API responses
- Examples: `backend/src/middleware/errorHandler.ts` (AppError class)
- Pattern: `throw new AppError('message', 400, 'VALIDATION_ERROR')` — caught by global error handler

**asyncHandler:**
- Purpose: Wraps async route handlers to catch rejected promises and forward to Express error handler
- Examples: `backend/src/utils/asyncHandler.ts`
- Pattern: Higher-order function wrapping async Express handlers

**Prisma RecurrenceRule Middleware:**
- Purpose: Auto-serialize/deserialize JSON for SQLite (stores `recurrenceRule` as string, reads as object)
- Examples: `backend/src/config/database.ts` lines 15-47
- Pattern: Prisma `$use` middleware intercepting create/update/upsert/find queries

**RecurrenceService:**
- Purpose: Generate occurrence dates from recurrence rules (DAILY, WEEKLY, MONTHLY, YEARLY with intervals and Nth weekday patterns)
- Examples: `backend/src/services/recurrence.service.ts`
- Pattern: Pure function date math, no database dependencies

## Entry Points

**Backend Server:**
- Location: `backend/src/server.ts`
- Triggers: `node dist/server.js` or `npm run dev` (nodemon)
- Responsibilities: Create HTTP server, start background cron jobs, handle graceful shutdown with in-flight request draining

**Frontend App:**
- Location: `frontend/src/main.tsx`
- Triggers: Browser loads `index.html` (dev via Vite, prod via nginx)
- Responsibilities: Mount React app, register PWA service worker, initialize CSRF token

**Docker Entrypoints:**
- Backend: `backend/docker-entrypoint.sh` — adjust UID/GID → prisma db push → seed DB → gosu appuser → start server
- Frontend: `frontend/docker-entrypoint.sh` — envsubst nginx config → generate runtime config.js → start nginx

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop. Express runs synchronously but I/O is async. Cron jobs run on the same process.
- **Global state:** Prisma client singleton in `backend/src/config/database.ts` (uses `globalThis` for dev hot-reload safety). Rate limiter request counter in `backend/src/middleware/rateLimiter.ts` (module-level mutable variable). Cron job task array in `backend/src/jobs/occurrenceJob.ts`.
- **Circular imports:** Not detected in production code.
- **DB isolation:** SQLite is an embedded file-based DB. Single-writer concurrency model — writes are serialized by SQLite. Not suitable for multi-instance horizontal scaling.
- **Session store:** Sessions stored in SQLite (via Prisma), not in-memory. Survives server restarts.
- **No WebSocket/real-time:** All communication is HTTP REST. No server push. Frontend polls via React Query refetch intervals.

## Anti-Patterns

### Dual Prisma Client Initialization

**What happens:** Prisma client is created in BOTH `backend/src/config/database.ts` (with middleware for RecurringChore serialization) AND `backend/src/server.ts` (for graceful shutdown). The `server.ts` instance does NOT have the recurrenceRule middleware attached.
**Why it's wrong:** Two different Prisma instances may behave differently for RecurringChore queries. The `server.ts` instance is only used for `$disconnect()` during shutdown, but this split is fragile.
**Do this instead:** Use the single singleton from `database.ts` everywhere, including shutdown. Move the `$disconnect()` call to reference `prisma from database.ts`.

### Session Handling in Two Files

**What happens:** The Express app configures session middleware in `backend/src/app.ts`, but `backend/src/server.ts` creates its own Prisma client for database shutdown. The app and server have slightly different concerns that bleed into each other.
**Why it's wrong:** The app module should not be responsible for environment validation (SESSION_SECRET check at line 25-31 of `app.ts`) — that should be in server startup. Creates confusion about what's an "app concern" vs. "server concern."
**Do this instead:** Move environment validation to `server.ts`. Keep `app.ts` as pure Express app configuration without side effects.

## Error Handling

**Strategy:** Custom `AppError` class with centralized global error handler

**Patterns:**
- Controllers throw `new AppError('message', statusCode, 'ERROR_CODE')` for known errors
- Global handler in `backend/src/middleware/errorHandler.ts` catches all errors
- Prisma-specific errors: Handles `P2002` (unique constraint → 409) and `P2025` (not found → 404)
- Unknown errors: 500 with `INTERNAL_ERROR` code, triggers error webhook notification
- Production mode: Hides internal error details, returns generic "Internal server error"
- API response envelope: Always `{ success: boolean, data: any, error: { message, code } | null }`
- Frontend: `client.ts` interceptor catches 401 (dispatches `auth:unauthorized` event), 403 CSRF errors (auto-retries once), network errors (standardized error shape)

## Cross-Cutting Concerns

**Logging:** Winston with JSON format, correlation IDs (UUID), colorized console output in development. File: `backend/src/utils/logger.ts`. Frontend: console.log with `[ApiClient]`, `[AuthProvider]` prefixes when debug enabled.

**Validation:** Zod schemas in `backend/src/schemas/validation.schemas.ts`, applied via `validate()` middleware in `backend/src/middleware/validator.ts`. Also used for client-side validation via `zod` in frontend components.

**Authentication:** Session-based (not JWT). Cookie: `connect.sid` (httpOnly, sameSite configurable, secure in production). Middleware: `authenticate` attaches user to `req.user`, `authorize(...roles)` gates by role. File: `backend/src/middleware/auth.ts`.

**Security:** Helmet (CSP, XSS, HSTS, noSniff), CSRF tokens (crypto.randomBytes + timingSafeEqual), rate limiting (configurable windows/max), bcrypt password hashing, account lockout after 5 failures, SSRF protection on ntfy URLs, HTML escaping in email templates.

**Caching:** `node-cache` in-memory for chore templates, categories, notification settings. Cleared on mutations. 10-min default TTL. File: `backend/src/utils/cache.ts`.

---
*Architecture analysis: 2026-05-01*
