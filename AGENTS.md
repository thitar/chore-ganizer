# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Manual Testing

When the user asks to run, execute, or retest any manual test case — including prompts like "run P-312", "retest P-312", "test phase 1", or any reference to test IDs in P-XXX or C-XXX format — **always invoke the `cg-tester` skill** before doing anything else. This skill handles all chore-ganizer QA using the Playwright MCP server.

## Project Overview

Chore-Ganizer is a family chore management app with a React frontend and Express/TypeScript backend. It uses SQLite via Prisma ORM and session-based auth with CSRF protection.

## Quick Start

```bash
# Start with pre-built Docker images (easiest)
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Access at http://localhost:3002 (frontend) or http://localhost:3010 (backend)
# Default credentials: dad@home.local / password123 (or alice@home.local for child)
```

## Version Management

**Single source of truth**: `backend/package.json` and `frontend/package.json` define the version (must be identical).

**How APP_VERSION is used**:
- **Backend**: Included in API responses (metrics endpoint, logs, health checks) so clients know what version they're talking to
- **Frontend**: Displayed in browser console on startup as `Chore-Ganizer Frontend v{VERSION}+{BUILD_DATE}` 
- **Docker images**: Tagged with the version for the registry (`ghcr.io/thitar/chore-ganizer-backend:2.1.9`)

**Keeping versions in sync**:
When you update the version in `backend/package.json` and `frontend/package.json`, you **must** also update:
- `APP_VERSION` in `.env` file (or set it before running docker-compose)
- CI/CD workflows use `APP_VERSION` to tag Docker images

**Recommended workflow**:
```bash
# 1. Update version in package.json files
# 2. Use the helper script which auto-reads from backend/package.json:
./docker-compose.sh up --build -d

# Or manually set APP_VERSION before running:
export APP_VERSION=$(grep '"version"' backend/package.json | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
docker compose up --build -d
```

## Environment Setup

Create a `.env` file in the project root (copy from `.env.example` if available):

```bash
# Required
SESSION_SECRET=<generate-a-random-string-for-session-encryption>
APP_VERSION=2.1.9

# Optional
DATA_DIR=/opt/app-data/chore-ganizer
PUID=1001
PGID=1001
VITE_API_URL=
BACKEND_PORT=3010
```

**Generating SESSION_SECRET:**
```bash
openssl rand -base64 32
```

## Building & Running

The app is built and run via Docker Compose. There is a single compose file:

| File | Purpose | Ports |
|---|---|---|
| `docker-compose.yml` | Pull pre-built images from `ghcr.io/thitar/` | Frontend: 3002, Backend: 3010 |

```bash
# Start (pre-built images from registry)
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### What happens on container start
- **Backend entrypoint** (`docker-entrypoint.sh`): runs as root → adjusts appuser UID/GID if PUID/PGID set → `prisma db push` (auto-applies schema) → seeds DB if empty → drops to `appuser` via `gosu` → starts `node dist/server.js`
- **Frontend entrypoint** (`docker-entrypoint.sh`): generates `/usr/share/nginx/html/config.js` with runtime env vars → starts nginx
- DB migrations and seeding are **automatic** — no manual steps needed on first run or after schema changes. The `DATA_DIR` path must exist on the host before starting (Docker creates it as root if missing).

### Default credentials (auto-seeded on first start)
- Parents: `dad@home.local`, `mom@home.local` | Children: `alice@home.local`, `bob@home.local`
- Password: `password123`

## Local Development

Run frontend and backend dev servers locally (requires Node.js 18+):

```bash
# Install dependencies (in each directory)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Terminal 1: Backend dev server (watches for changes)
cd backend
npm run dev

# Terminal 2: Frontend dev server (with Vite HMR)
cd frontend
npm run dev
```

Backend runs on `http://localhost:3010`, frontend on `http://localhost:5173`. The frontend automatically proxies `/api/*` requests to the backend.

### Available npm Scripts

**Backend** (`backend/`):
```bash
npm run dev              # Start dev server with auto-reload
npm run build            # Compile TypeScript to dist/
npm run start            # Run built server
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests (requires real DB)
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

**Frontend** (`frontend/`):
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build locally
npm test                 # Run Vitest
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

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

**Runtime config**: The frontend Dockerfile builds with a placeholder API URL. At container start, `docker-entrypoint.sh` generates `/usr/share/nginx/html/config.js` which sets `window.APP_CONFIG.apiUrl` from the `VITE_API_URL` env var. If `VITE_API_URL` is empty (default), the frontend uses relative URLs and nginx proxies `/api/*` to the backend. The backend port is configurable via `BACKEND_PORT` env var (default: `3010`) — `nginx.conf.template` uses `envsubst` at startup to substitute the port. Config changes only need a container restart, not a rebuild.

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

### Monorepo Structure
This is a monorepo with two independent npm packages:
- **`backend/`** — Express.js server; produces Docker image `ghcr.io/thitar/chore-ganizer-backend:VERSION`
- **`frontend/`** — React + Vite web app; produces Docker image `ghcr.io/thitar/chore-ganizer-frontend:VERSION`

Both must have identical version numbers in their `package.json` files. Docker Compose orchestrates both containers, nginx in frontend proxies `/api/*` to backend.

### Notable Environment Variables
| Variable | Purpose |
|---|---|
| `APP_VERSION` | **Required** — must match `backend/package.json` version; set via `./docker-compose.sh` or export before running `docker compose` |
| `SESSION_SECRET` | **No default** — must be explicitly set in `.env` |
| `DATA_DIR` | Host path for persistent data (default: `/opt/app-data/chore-ganizer`) |
| `PUID` / `PGID` | Host UID/GID for bind mount file ownership (default: `1001`) |
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
