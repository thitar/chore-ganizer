# External Integrations

**Analysis Date:** 2026-07-04

## APIs & External Services

**Notification / Messaging:**
- ntfy.sh (Optional) - For push notifications (configured via `ERROR_WEBHOOK_*` or `NTFY_*` env vars).
- SMTP (Optional) - For email notifications (configured via `SMTP_*` env vars).

## Data Storage

**Databases:**
- SQLite
  - Connection: `DATABASE_URL` (in `.env`)
  - Client: Prisma ORM (`@prisma/client`)

## Authentication & Identity

**Auth Provider:**
- Custom (Express Sessions + bcrypt)
  - Implementation: Session-based auth, password hashing via `bcrypt`.

## Monitoring & Observability

**Error Tracking:**
- Custom logging, optionally integrated with ntfy.sh for 500-error alerts (configured via `ERROR_WEBHOOK_*`).

**Logs:**
- Standard console logging; backend health/metrics endpoints: `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/metrics`.

## CI/CD & Deployment

**Hosting:**
- Docker / Docker Compose.

**CI Pipeline:**
- Implicitly GitHub Actions (registry usage `ghcr.io/thitar/`).

## Environment Configuration

**Required env vars:**
- `SESSION_SECRET`
- `APP_VERSION`
- `DATABASE_URL`

**Secrets location:**
- `.env` file.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- Error alerts (ntfy.sh).

---

*Integration audit: 2026-07-04*
