# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Manual Testing

When the user asks to run, execute, or retest any manual test case — including prompts like "run P-312", "retest P-312", "test phase 1", or any reference to test IDs in P-XXX or C-XXX format — **always invoke the `cg-tester` skill** before doing anything else. This skill handles all chore-ganizer QA using the Playwright MCP server.

## Project Overview

Chore-Ganizer is a family chore management app with a React frontend and Express/TypeScript backend. It uses SQLite via Prisma ORM and session-based auth with CSRF protection.

## Building & Running

The app is built and run exclusively via Docker Compose. There are three compose files:

| File | Purpose | Ports |
|---|---|---|
| `docker-compose.yml` | Build from source (development) | Frontend: 3002, Backend: 3010 |
| `docker-compose.prod.yml` | Pull pre-built images from `ghcr.io/thitar/` | Frontend: 3002, Backend: 3010 |
| `docker-compose.staging.yml` | Build from source, separate volumes/network | Frontend: 3003, Backend: 3010/3011 |

```bash
# Build from source and start (after code changes)
docker compose up --build -d

# Start without rebuilding (config/env changes only)
docker compose up -d

# Start with automated backup cron jobs
docker compose --profile with-backup up -d

# Staging (builds from source, separate DB, runs alongside production)
docker compose -f docker-compose.staging.yml up --build -d

# Production (pre-built images from registry)
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### What happens on container start
- **Backend entrypoint** (`docker-entrypoint.sh`): runs as root → `prisma db push` (auto-applies schema) → seeds DB if empty → drops to `appuser` via `gosu` → starts `node dist/server.js`
- **Frontend entrypoint** (`docker-entrypoint.sh`): generates `/usr/share/nginx/html/config.js` with runtime env vars → starts nginx
- DB migrations and seeding are **automatic** — no manual steps needed on first run or after schema changes

### Default credentials (auto-seeded on first start)
- Parents: `dad@home.local`, `mom@home.local` | Children: `alice@home.local`, `bob@home.local`
- Password: `password123`

### Tests (CI only — not run via Docker)
```bash
# Backend (cd backend)
npm test                        # Unit tests
npm run test:unit               # Excludes integration tests
npm run test:integration        # Integration tests (serial, real DB)
npm test -- path/to/file.test.ts
npm test -- --testNamePattern="pattern"

# Frontend (cd frontend)
npm test                             # All tests
npm test -- path/to/file.test.tsx

# E2E (root, requires running app)
npm run test:e2e
npx playwright test e2e/auth.spec.ts
npx playwright test -g "pattern"
```

## Architecture

### Stack
- **Backend**: Express.js + TypeScript, Prisma ORM, SQLite, Jest
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Vitest
- **Auth**: Express sessions (SQLite store), bcrypt, CSRF tokens
- **Roles**: `PARENT` and `CHILD` — many routes are parent-only

### Backend Structure (`backend/src/`)
- **`app.ts`** — Express app config; middleware ordering is security-critical (Helmet → rate limiter → CORS → session → CSRF → routes)
- **`routes/index.ts`** — Central router mounting all `/api/*` routes
- **`controllers/`** — Thin HTTP layer; delegates to services
- **`services/`** — All business logic lives here
- **`middleware/`** — auth.ts, csrf.ts, errorHandler.ts, rateLimiter.ts, validator.ts
- **`schemas/`** — Zod validation schemas used by `validate()` middleware
- **`jobs/`** — Cron jobs (recurring chore occurrence generation)
- **`prisma/schema.prisma`** — Single source of truth for DB models

**API response envelope:**
```json
{ "success": true, "data": { ... }, "error": null }
```

**Error handling**: `AppError` class with `statusCode` and `code` fields; caught by global error handler in `middleware/errorHandler.ts`.

### Frontend Structure (`frontend/src/`)
- **`api/`** — One file per domain (auth, chores, users, etc.) using Axios. `client.ts` handles CSRF token injection and 401/403 error events.
- **`hooks/`** — Domain logic hooks (useChores, useAuth, etc.); auth state lives in `useAuth.tsx` context, not Zustand.
- **`components/`** — Organized by domain: `common/`, `layout/`, `chores/`, `users/`, `notifications/`, `recurring-chores/`, `pocket-money/`
- **`pages/`** — One file per route, lazy-loaded via `React.lazy()`
- **`App.tsx`** — Route definitions; parent-only routes wrapped in `ProtectedRoute`

**Runtime config**: The frontend Dockerfile builds with a placeholder API URL. At container start, `docker-entrypoint.sh` generates `/usr/share/nginx/html/config.js` which sets `window.APP_CONFIG.apiUrl` from the `VITE_API_URL` env var. If `VITE_API_URL` is empty (default), the frontend uses relative URLs and nginx proxies `/api/*` to the backend. The backend port is **hardcoded to 3010 in `frontend/nginx.conf`** — the `BACKEND_PORT` env var is ignored by nginx. Config changes only need a container restart, not a rebuild.

### Auth Flow
1. `POST /api/auth/login` → sets session cookie
2. `GET /api/csrf-token` → frontend stores CSRF token
3. All mutating requests include `X-CSRF-Token` header (injected by Axios interceptor in `client.ts`)
4. `middleware/auth.ts` → `authenticate` validates session; `authorize(...roles)` gates routes

### Testing Patterns
- **Backend unit tests**: Mock Prisma via `src/__tests__/__mocks__/`; import `{ prismaMock }` from test-helpers
- **Backend integration tests**: Use a real test database; run serially (`--runInBand`); global setup/teardown in `jest.integration.config.js`
- **Frontend tests**: `src/test/utils.tsx` provides mock data factories and a `renderWithRouter` helper; API calls mocked via `vi.mock()`

### Key Domain Concepts
- **ChoreTemplate** — Reusable chore definition; **ChoreAssignment** — one-off instance assigned to a user
- **RecurringChore** — Defines recurrence rule with JSON `recurrenceRule` field; **ChoreOccurrence** — instances pre-generated daily by background job
- **RecurringChore assignment modes**: `FIXED` (same person), `ROUND_ROBIN` (rotation via `roundRobinIndex`), `MIXED`
- **Chore statuses**: `PENDING`, `COMPLETED`, `PARTIALLY_COMPLETE` (a distinct state, not just progress)
- **PointTransaction types**: `EARNED`, `BONUS`, `DEDUCTION`, `PENALTY`, `PAYOUT`, `ADVANCE`, `ADJUSTMENT`
- **Pocket money is stored in cents** (integer), not floats — `pointValueInCents` converts points to currency
- **OverduePenalty** — Auto point deduction for overdue chores; uses `penaltyApplied` flag to prevent double-penalizing

### Non-Obvious Conventions
- **Frontend API parameter mapping**: frontend uses `userId`/`templateId` internally, but backend expects `assignedToId`/`choreTemplateId` — mapping happens in the `api/` layer
- **Children accessing parent-only routes** are silently redirected to dashboard (no error page)
- **401 responses** trigger auto-logout via a `auth:unauthorized` custom DOM event (see `client.ts`)
- **Integration test DB** lives at `test-db/integration-test.db` — created/destroyed per test run by global setup/teardown
- **E2E tests** use `.spec.ts` suffix; unit/integration tests use `.test.ts`

### Notable Environment Variables
| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | **No default in `docker-compose.prod.yml`** — must be explicitly set; staging has a fallback default |
| `OVERDUE_PENALTY_*` | Enable/configure automatic overdue point deductions |
| `SLOW_REQUEST_THRESHOLD_MS` | Log requests slower than this threshold |
| `COMPRESSION_ENABLED` | Toggle gzip/brotli response compression |
| `ERROR_WEBHOOK_*` | ntfy.sh webhook URL for 500-error alerts |
| `SMTP_*` / `NTFY_*` | Email and push notification config |

### Health & Observability
- `/api/health` — Full health check (DB, memory, disk)
- `/api/health/live` — Liveness probe
- `/api/health/ready` — Readiness probe (DB connectivity)
- `/api/metrics` — Prometheus metrics endpoint
