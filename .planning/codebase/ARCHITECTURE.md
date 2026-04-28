<!-- refreshed: 2026-04-28 -->
# Architecture

**Analysis Date:** 2026-04-28

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  `frontend/src/`                                           │
├──────────────────┬──────────────────┬───────────────────────┤
│   Components     │   Hooks         │    API Layer          │
│  `components/`  │  `hooks/`       │   `api/`              │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                      │
│  `backend/src/`                                             │
├──────────────────┬──────────────────┬───────────────────────┤
│   Controllers    │   Services       │    Middleware         │
│  `controllers/` │  `services/`     │  `middleware/`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (Prisma + SQLite)                │
│  `backend/prisma/schema.prisma`                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Frontend API Client | CSRF injection, 401 handling, request/response interceptors | `frontend/src/api/client.ts` |
| Auth Context | Session state management, role checks | `frontend/src/hooks/useAuth.tsx` |
| Backend Controllers | Thin HTTP layer, input validation, response formatting | `backend/src/controllers/*.ts` |
| Backend Services | All business logic (auth, chores, pocket money) | `backend/src/services/*.ts` |
| Recurring Chore Job | Daily generation of chore occurrences | `backend/src/jobs/occurrenceJob.ts` |
| Prisma Client | Database access, schema management | `backend/prisma/schema.prisma` |

## Pattern Overview

**Overall:** Monorepo with strict separation of concerns: Frontend (React + Vite) and Backend (Express + TypeScript) as independent packages, communicating via REST API with session-based auth and CSRF protection.

**Key Characteristics:**
- Controllers are thin HTTP layers; all business logic lives in services
- API responses use standardized envelope: `{ "success": boolean, "data": any, "error": null | { message: string, code: string } }`
- Pocket money stored in cents (integer) to avoid floating point errors
- Recurring chores use JSON `recurrenceRule` for flexible scheduling
- Role-based access control (PARENT/CHILD) enforced via middleware

## Layers

**Frontend Layer:**
- Purpose: User interface, state management, API communication
- Location: `frontend/src/`
- Contains: Components (`components/`), Hooks (`hooks/`), API clients (`api/`), Pages (`pages/`)
- Depends on: Backend REST API
- Used by: End users via browser

**Backend API Layer:**
- Purpose: HTTP request handling, business logic orchestration, auth enforcement
- Location: `backend/src/`
- Contains: Controllers (`controllers/`), Services (`services/`), Middleware (`middleware/`), Routes (`routes/`)
- Depends on: Prisma ORM, SQLite database
- Used by: Frontend, external API consumers

**Data Layer:**
- Purpose: Persistent storage, schema management, migrations
- Location: `backend/prisma/`
- Contains: Prisma schema (`schema.prisma`), migrations, seed scripts
- Depends on: SQLite database file (configured via `DATABASE_URL` env var)
- Used by: Backend services via Prisma client

## Data Flow

### Primary Auth Flow
1. `POST /api/auth/login` → validates credentials, sets session cookie (`backend/src/controllers/auth.controller.ts:login`)
2. `GET /api/csrf-token` → returns CSRF token for subsequent mutating requests (`backend/src/routes/index.ts:137`)
3. Frontend stores CSRF token, injects `X-CSRF-Token` header on all POST/PUT/DELETE requests (`frontend/src/api/client.ts:67-72`)
4. Backend middleware validates session + CSRF token on protected routes (`backend/src/middleware/auth.ts:authenticate`, `backend/src/middleware/csrf.ts`)
5. 401 responses trigger `auth:unauthorized` DOM event to auto-logout frontend (`frontend/src/api/client.ts:105-108`)

### Chore Completion Flow
1. Frontend calls `POST /api/chore-assignments/:id/complete` (`frontend/src/api/assignments.api.ts`)
2. Backend controller validates input, calls service (`backend/src/controllers/chore-assignments.controller.ts`)
3. Service updates `ChoreAssignment` status to `COMPLETED`, creates `EARNED` point transaction (`backend/src/services/chore-assignments.service.ts`)
4. Returns updated assignment + point balance in standardized response envelope

### Recurring Chore Generation Flow
1. Daily cron job runs at midnight UTC (`backend/src/jobs/occurrenceJob.ts:7`)
2. Fetches all active `RecurringChore` records with assignees
3. Uses `RecurrenceService` to check if occurrence is due today (`backend/src/services/recurrence.service.ts`)
4. Creates `ChoreOccurrence` records with assigned users based on assignment mode (FIXED/ROUND_ROBIN/MIXED)
5. Skips duplicates via unique constraint on `(recurringChoreId, dueDate)`

## Key Abstractions

**AppError:**
- Purpose: Standardized error class with `statusCode` and `code` fields for consistent error responses
- Examples: `backend/src/middleware/errorHandler.ts:5-16`
- Pattern: Thrown in controllers/services, caught by global error handler

**RecurrenceRule:**
- Purpose: JSON-serialized scheduling configuration for recurring chores
- Examples: `backend/prisma/schema.prisma:259` (stored as String in DB)
- Pattern: Parsed by `RecurrenceService` to generate occurrence dates

**PointTransaction:**
- Purpose: Immutable record of point changes (earned, deducted, paid out)
- Examples: `backend/prisma/schema.prisma:198-216`
- Pattern: Created via helper in `backend/src/controllers/pocket-money.controller.ts:69-89`, balance calculated by summing all transactions

## Entry Points

**Backend Server:**
- Location: `backend/src/server.ts`
- Triggers: Docker container start, or `npm run dev` in backend directory
- Responsibilities: Starts Express app, listens on configured port, initializes cron jobs

**Frontend App:**
- Location: `frontend/src/main.tsx`
- Triggers: Vite dev server, or Nginx in Docker container
- Responsibilities: Renders React app, initializes auth provider, sets up API client CSRF token

**API Routes:**
- Location: `backend/src/routes/index.ts`
- Triggers: Incoming HTTP requests to `/api/*`
- Responsibilities: Mounts all domain-specific routers, health endpoints, CSRF token endpoint

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop; cron jobs run asynchronously, no worker threads used
- **Global state:** Session store (SQLite-based via `express-session`), Prisma client instance (singleton in `backend/src/config/database.ts`)
- **Circular imports:** Avoided by using barrel files in `frontend/src/api/index.ts` and explicit imports in backend
- **SQLite limitations:** No native enums (uses String fields for TransactionType, PayoutStatus, assignment modes), no JSON query support (stores recurrence rules as raw JSON strings)

## Anti-Patterns

### Mixed Assignment Mode Logic in Jobs
**What happens:** `getAssignedUserIds` in `occurrenceJob.ts` handles all three assignment modes (FIXED/ROUND_ROBIN/MIXED) in a single switch statement
**Why it's wrong:** Makes the job harder to test and extend for new assignment modes
**Do this instead:** Extract assignment mode handlers into separate service methods in `backend/src/services/recurrence.service.ts`, call them from the job

### Direct Prisma Access in Controllers
**What happens:** Some controllers (e.g., `pocket-money.controller.ts`) directly call Prisma client for simple queries
**Why it's wrong:** Violates separation of concerns, makes testing harder (requires mocking Prisma in controller tests)
**Do this instead:** Move all Prisma access to service layer, controllers should only call services

## Error Handling

**Strategy:** Centralized error handling via `errorHandler` middleware, standardized `AppError` class for known errors.

**Patterns:**
- **Known errors:** Throw `AppError` with appropriate `statusCode` and `code` in controllers/services, caught by global handler and returned in standardized envelope
- **Prisma errors:** Handled explicitly in `errorHandler.ts` (P2002 → 409 Conflict, P2025 → 404 Not Found)
- **Server errors (500):** Logged via `logger`, error webhook sent to `ERROR_WEBHOOK_*` if configured, generic message returned in production
- **401/403:** Returned with `UNAUTHORIZED`/`FORBIDDEN` codes, 401 triggers frontend logout

## Cross-Cutting Concerns

**Logging:** Winston-based logger in `backend/src/utils/logger.ts`, logs requests, errors, cron job activity. Frontend uses `console.log` in debug mode.

**Validation:** Zod schemas in `backend/src/schemas/` used by `validate()` middleware to enforce request body/query/param constraints.

**Authentication:** Session-based via `express-session` with SQLite store, CSRF protection via `csurf` alternative in `backend/src/middleware/csrf.ts`. Role checks via `authorize()` and `requireParent` middleware.

**Cron Jobs:** `node-cron` used for daily recurring chore occurrence generation, started at server boot via `server.ts`.

**Pocket Money System:**
- Points stored as integers (1 point = `pointValue` cents, default 10 = €0.10)
- Transactions: `EARNED` (chore completion), `BONUS`/`DEDUCTION` (parent-added), `PENALTY` (overdue), `PAYOUT` (cash out), `ADVANCE` (negative balance)
- Balance calculated by summing all transactions for a user
- Payouts processed via `createPayout` endpoint, mark points as paid out
- Projected earnings calculated from current balance + upcoming recurring chore points

---

*Architecture analysis: 2026-04-28*
