# External Integrations

**Analysis Date:** 2026-05-01

## APIs & External Services

**Push Notifications (ntfy.sh):**
- ntfy.sh / self-hosted ntfy - Push notification delivery
  - SDK/Client: Custom implementation in `backend/src/services/ntfy.service.ts` using `axios`
  - Auth: Optional Basic Auth (`ntfyUsername`/`ntfyPassword` per user in `UserNotificationSettings`)
  - SSRF protection: URL validation rejects private/internal IPs (`backend/src/services/ntfy.service.ts` lines 41-85)
  - Default server: `https://ntfy.sh`

**Email Notifications:**
- SMTP (any provider: Gmail, SendGrid, custom) - Email notifications for chore assignments, completions, points
  - SDK/Client: `nodemailer` in `backend/src/services/emailService.ts`
  - Auth: `SMTP_USER`, `SMTP_PASS` via environment variables
  - Templates: Pre-built HTML templates for chore assigned, chore completed, points earned

**Error Webhook Alerts:**
- ntfy.sh webhook - Server error notifications (500 errors, DB errors, backup failures, health check failures)
  - Implementation: `backend/src/utils/error-webhook.ts`
  - Config: `ERROR_WEBHOOK_ENABLED`, `ERROR_WEBHOOK_URL`, `ERROR_WEBHOOK_USERNAME`, `ERROR_WEBHOOK_PASSWORD`

## Data Storage

**Databases:**
- SQLite (embedded)
  - Connection: `DATABASE_URL=file:${DATA_DIR}/chore-ganizer.db`
  - Client: Prisma ORM (`@prisma/client` 5.22)
  - Schema: `backend/prisma/schema.prisma` (375 lines, 16 models)
  - Session store: Express sessions stored via Prisma (no separate session DB)

**File Storage:**
- Local filesystem only (no cloud storage)
- Persistent via Docker bind mount: `${DATA_DIR}:/opt/app-data/chore-ganizer`
- Backups stored at `./backups:/backups` within the container

**Caching:**
- In-memory: `node-cache` in `backend/src/utils/cache.ts`
  - TTL: 10 minutes default, with SHORT (5m), MEDIUM (10m), LONG (1h) presets
  - Cache keys: chore templates, categories, notification settings, user preferences

## Authentication & Identity

**Auth Provider:**
- Custom (email + password)
  - Implementation: `backend/src/services/auth.service.ts`
  - Password hashing: `bcrypt` 6.0
  - Session management: `express-session` with rolling sessions
  - Session config: maxAge (7 days default), httpOnly, secure (configurable), sameSite (configurable)
  - CSRF protection: Custom token-based via `backend/src/middleware/csrf.ts`
  - Lockout: Per-user account lockout after 5 failed attempts, 15-min lockout in `backend/src/utils/lockout.ts`

**Role-Based Access Control:**
- `PARENT` role: Full access to all features including user management, chore template creation, settings
- `CHILD` role: Limited to viewing/completing chores, checking pocket money, profile
- Implemented via `authenticate` and `authorize(...roles)` middleware in `backend/src/middleware/auth.ts`

## Monitoring & Observability

**Error Tracking:**
- ntfy.sh error webhook (self-hosted or ntfy.sh) - 500 errors, DB errors, backup failures, health check failures
- Winston JSON logging with correlation IDs (`backend/src/utils/logger.ts`)

**Logs:**
- Winston structured JSON logger with correlation IDs (UUID)
- Console transport with colorized output for readability
- Debug mode: `LOG_LEVEL=debug` enables verbose session/auth debugging
- Request logging: `backend/src/middleware/requestLogger.ts`
- Request timing: `backend/src/middleware/requestTimer.ts` (logs slow requests >1s by default)

**Metrics:**
- Prometheus metrics via `prom-client` in `backend/src/utils/metrics.ts`
- Endpoints: `/api/metrics` (Prometheus scrape target)
- Custom metrics: HTTP request duration histogram, HTTP request counter, active connections gauge, DB query duration histogram, pocket money payouts counter, point transactions counter
- Default metrics: CPU, memory, event loop

**Health Checks:**
- `/api/health` - Full health (DB, memory, disk) (`backend/src/controllers/health.controller.ts`)
- `/api/health/live` - Liveness probe
- `/api/health/ready` - Readiness probe (DB connectivity)
- `/api/health/cache` - Cache statistics
- `/api/version` - API version info

## CI/CD & Deployment

**Hosting:**
- Docker images published to GitHub Container Registry: `ghcr.io/thitar/chore-ganizer/`
- Backend image: `chore-ganizer-backend:{version}` (node:25-slim)
- Frontend image: `chore-ganizer-frontend:{version}` (nginx:alpine)
- Docker Compose with bridge network for container orchestration

**CI Pipeline:**
- GitHub Actions CI/CD: `.github/workflows/ci-cd.yml`
  - Validate version sync (backend/frontend package.json must match)
  - Backend: Prisma generate → Swagger validation → unit tests + coverage → integration tests → TypeScript build
  - Frontend: Install → Vitest tests → Vite build
  - CD (main branch only): Download builds → Docker Buildx → Push to GHCR

**Security Scanning:**
- GitHub Actions: `.github/workflows/security.yml`
  - CodeQL static analysis (JavaScript/TypeScript)
  - npm audit for backend and frontend (moderate+ for dev, high+ for production)
  - Gitleaks secret scanning
  - Semgrep SAST (security-audit, secrets, owasp-top-ten, typescript, javascript)
  - Trivy container vulnerability scanning (CRITICAL+HIGH severity)

## Environment Configuration

**Required env vars:**
- `SESSION_SECRET` - Session encryption key (no default)
- `APP_VERSION` - Must match backend/package.json version

**Secrets location:**
- `.env` file at project root (gitignored, never committed)
- CI secrets: `GITHUB_TOKEN` (auto-provided), `SESSION_SECRET` set in GitHub Actions

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- ntfy.sh webhook for server errors (`backend/src/utils/error-webhook.ts`)
- ntfy.sh push notifications per user (`backend/src/services/ntfy.service.ts`)
- SMTP email notifications (`backend/src/services/emailService.ts`)

---

*Integration audit: 2026-05-01*
