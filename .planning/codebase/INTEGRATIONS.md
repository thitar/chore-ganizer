# External Integrations

**Analysis Date:** 2026-04-28

## APIs & External Services

**Notification Services:**
- ntfy.sh - Push notification delivery for user alerts and error alerts
  - SDK/Client: HTTP API (no official SDK, uses axios/fetch)
  - Auth: `NTFY_TOKEN` env var (optional, for access-controlled topics)
  - Config: `NTFY_DEFAULT_SERVER_URL` (default: https://ntfy.sh), `NTFY_DEFAULT_TOPIC`
  - Triggers: Chore assigned/due/completed/overdue, points earned, 500 errors
- SMTP (Email) - Email notification delivery for user alerts
  - SDK/Client: nodemailer 8.0.x (`backend/package.json`)
  - Auth: `SMTP_USER`, `SMTP_PASS` env vars
  - Config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`

**None:** No third-party business logic APIs (e.g., Stripe, AWS) are integrated.

## Data Storage

**Databases:**
- SQLite 3 (via Prisma ORM 5.22.x)
  - Connection: `DATABASE_URL` env var (dev: `file:./dev.db`, production: `file:${DATA_DIR}/chore-ganizer.db`)
  - Client: @prisma/client 5.22.x (Prisma's generated client)
  - Schema: `backend/prisma/schema.prisma`
  - Migrations: Automatically applied via `prisma db push` on container start

**File Storage:**
- Local filesystem only (persistent data stored in `DATA_DIR` on host, mapped to `/app/data` in backend container)
- Backups stored in `./backups` host directory (mapped to `/backups` in backend container)

**Caching:**
- node-cache 5.1.x - In-memory caching for backend (`backend/package.json`)
  - Used for: Caching frequently accessed data like user sessions, chore templates

## Authentication & Identity

**Auth Provider:**
- Custom implementation using:
  - `express-session` 1.17.x with SQLite session store (sessions persisted in database)
  - `bcrypt` 6.0.x for password hashing
  - CSRF tokens (implemented via custom middleware or deprecated `csurf` replacement)
- Implementation files:
  - `backend/src/middleware/auth.ts` - Session validation and role authorization
  - `backend/src/middleware/csrf.ts` - CSRF token generation and validation
  - `backend/src/services/auth.service.ts` - Authentication business logic

**Roles:**
- `PARENT` and `CHILD` - Enforced via `authorize(...roles)` middleware in `backend/src/middleware/auth.ts`

## Monitoring & Observability

**Error Tracking:**
- ntfy.sh webhook for 500-error alerts (configured via `ERROR_WEBHOOK_URL` env var, uses ntfy.sh integration)

**Logs:**
- Backend: Winston 3.11.x structured logs to stdout (captured by Docker logs)
- Frontend: Browser console logs (APP_VERSION logged on startup)
- Metrics: Prometheus metrics via prom-client 15.1.x, available at `/api/metrics` endpoint (`backend/src/routes/metrics.ts`)

## CI/CD & Deployment

**Hosting:**
- Docker images hosted on GitHub Container Registry (ghcr.io/thitar/chore-ganizer/chore-ganizer-backend, ghcr.io/thitar/chore-ganizer/chore-ganizer-frontend)
- Deployable to any Docker-compatible platform

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci-cd.yml`)
- Steps: Lint, test, Swagger doc validation, Docker image build, push to ghcr.io

## Environment Configuration

**Required env vars:**
- `SESSION_SECRET` - Random string for session encryption (no default)
- `APP_VERSION` - Must match version in `backend/package.json` (2.1.10) and `frontend/package.json` (2.1.10) (no default)

**Optional env vars:**
- `DATA_DIR` - Host path for persistent data (default: `/opt/app-data/chore-ganizer`)
- `PUID`/`PGID` - Host UID/GID for bind mount ownership (default: `1001`)
- `OVERDUE_PENALTY_*` - Auto point deduction configuration for overdue chores
- `SLOW_REQUEST_THRESHOLD_MS` - Log slow requests (default: not set)
- `COMPRESSION_ENABLED` - Toggle gzip/brotli compression (default: enabled via `compression` package)
- `ERROR_WEBHOOK_*` - ntfy.sh webhook for 500 errors
- `SMTP_*` - Email notification configuration
- `NTFY_*` - Push notification configuration
- `BACKEND_PORT` - Backend container port (default: `3010`)
- `VITE_API_URL` - Frontend API URL (default: empty, uses relative URLs)
- `CORS_ORIGIN` - Allowed CORS origins (default: `http://localhost:3002`)
- `SECURE_COOKIES` - Enable secure cookies (default: `false`)
- `SESSION_MAX_AGE` - Session max age in ms (default: `604800000` = 7 days)
- `LOG_LEVEL` - Backend log level (default: `info`)

**Secrets location:**
- `.env` file in project root (excluded from git via `.gitignore`)
- Docker containers inherit env vars from `.env` or system environment

## Webhooks & Callbacks

**Incoming:**
- None (no incoming webhook endpoints documented)

**Outgoing:**
- ntfy.sh push notifications (user alerts, error alerts)
- SMTP email notifications (user alerts)
- `ERROR_WEBHOOK_URL` - ntfy.sh webhook for unhandled 500 errors

## Documentation Integrations

**OpenAPI/Swagger:**
- `docs/swagger.json` - Auto-generated OpenAPI 3.0 spec from JSDoc comments in `backend/src/routes/*.ts`
- Generator: `backend/scripts/generate-swagger.ts` (uses `swagger-jsdoc` 6.2.x)
- Config: `backend/src/swagger.config.ts` (base OpenAPI definition)
- CI Gate: `npm run docs:validate` fails build if `swagger.json` is stale

## Frontend Integrations

**PWA Support:**
- `vite-plugin-pwa` 1.2.x - PWA manifest and service worker generation
- `workbox-window` 7.4.x - Workbox integration for offline support
- `frontend/public/manifest.json` - PWA manifest configuration

**State Management:**
- `@tanstack/react-query` 5.95.x - Server state management for API data fetching
- `zustand` 5.0.x - Client state management (supplemental to React context)

**UI Components:**
- `lucide-react` 0.577.x - Icon library
- `recharts` 3.7.x - Charting library for analytics
- `sonner` 1.3.x - Toast notification system

---

*Integration audit: 2026-04-28*
