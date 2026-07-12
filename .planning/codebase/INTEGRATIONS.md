---
title: External Integrations
last_mapped_commit: HEAD
date: 2026-07-12
---

# External Integrations

## External APIs/Services

| Service | Protocol | Purpose | Configuration |
|---------|----------|---------|---------------|
| **ntfy.sh** (or self-hosted) | HTTP POST (`fetch()`) | Push notifications | `NTFY_BASE_URL`, `NTFY_DEFAULT_TOPIC`; per-user `ntfyTopic` on `User` model |
| **Sentry** (optional) | SDK placeholder | Error tracking | `SENTRY_DSN` env var; not wired |
| **SMTP** (optional) | Placeholder | Future password reset | `SMTP_HOST/PORT/USER/PASS/FROM` env vars; not wired |
| **FCM** (optional) | Placeholder | Future push | `FCM_SERVER_KEY/PROJECT_ID` env vars; not wired |

## Database Connection

| Property | Value |
|----------|-------|
| Type | SQLite (file-based) |
| Dev path | `file:./dev.db` (relative to `backend/`) |
| Production path | `${DATA_DIR}/chore-ganizer.db` |
| Connection string | Via `DATABASE_URL` env var |
| Persistence | Bind-mount of `DATA_DIR` host directory |
| Backup | supercronic cron inside container; daily at 2 AM; 7-day retention |

## Auth Providers

| Provider | Status |
|----------|--------|
| Custom email/password | Active; bcrypt, express-session, role-based |
| OAuth / SSO | Not implemented |

## Webhooks

| Direction | Type | Details |
|-----------|------|---------|
| Outbound | ntfy push notifications | Fire-and-forget `POST` to ntfy server; triggered on assign, due-soon, complete, badge |
| Outbound | Error webhook (optional) | `ERROR_WEBHOOK_URL` env var; ntfy-based error alerts |
| Inbound | None | No inbound webhook endpoints |

## Third-Party SDKs

| SDK/Service | Usage |
|-------------|-------|
| ntfy | Raw HTTP `fetch()` calls (not an SDK) |
| bcrypt | Password hashing |
| Prisma Client | ORM (generated from `schema.prisma`) |
| axios | Frontend HTTP client via `createApiClient()` factory |
| canvas-confetti | Celebration animation on badge/level achievements |
| lucide-react | Icon library |

## Health Check Endpoints

| Endpoint | Method | Returns |
|----------|--------|---------|
| `GET /api/health` | Express route | `{ status: 'ok', db: { connected: true, users: N }, uptime, timestamp }` or 503 |

## Rate Limiting

| Limiter | Scope | Default | Env var |
|---------|-------|---------|---------|
| General API | All `/api/*` routes | 300 req / 15 min | `RATE_LIMIT_MAX` |
| Auth | `POST /api/auth/login` | 10 req / 15 min | `AUTH_RATE_LIMIT_MAX` |
| Test bypass | Both skip when `NODE_ENV=test` | N/A | Automatic |

## CORS/CSRF

| Mechanism | Details |
|-----------|---------|
| CORS | `origin: CORS_ORIGIN` (default `http://localhost:3002`); `credentials: true` |
| CSRF | Double-submit cookie; `XSRF-TOKEN` cookie + `x-xsrf-token` header on mutating requests |
| Helmet | Global security headers (CSP, X-Content-Type-Options, etc.) |
| Session cookie | `httpOnly`, `secure` in prod, `sameSite` configurable (default `strict`), 7-day max age |
| Body limit | `express.json()` + `express.urlencoded()` both limited to 10KB |
