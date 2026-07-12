# Integrations — External Services and APIs

## External APIs / Services

| Service | Purpose | Configuration | Code |
|---------|---------|---------------|------|
| **ntfy.sh** | Push notifications (chore assigned, due soon, completed, badges) | `NTFY_BASE_URL` env var; per-user `ntfyTopic` field | `backend/src/config/notifications.ts`, `backend/src/services/notification.service.ts` |
| **Sentry** (optional, placeholder) | Error tracking | `SENTRY_DSN` env var (listed in `.env.example` but not wired in code) | `.env.example` only |

### ntfy.sh Integration Details

- **Protocol**: Plain HTTP POST to `{NTFY_BASE_URL}/{topic}` with headers for title, priority, tags, click URL
- **No SDK**: Uses native `fetch()` with a 3-second timeout per request
- **Fire-and-forget**: Notifications are sent with `void` (non-blocking); failures logged as warnings
- **Per-user topics**: Each user has their own `ntfyTopic` field; notifications sent to the user's topic
- **Notification types**: chore assigned, chore due soon, chore completed, badge earned
- **Default server**: Configurable via `NTFY_DEFAULT_SERVER_URL` (default: `https://ntfy.sh`)
- **Message formatting**: Custom formatters in `backend/src/services/notification.formatters.ts` produce structured ntfy payloads with title, body, priority, tags (emoji), and click URL

## Database Connection

| Aspect | Detail |
|--------|--------|
| Engine | **SQLite** |
| Connection string | `DATABASE_URL` env var, format: `file:/path/to/chore-ganizer.db` |
| Default (Docker) | `file:${DATA_DIR}/chore-ganizer.db` where `DATA_DIR=/opt/app-data/chore-ganizer` |
| Default (local dev) | `file:./dev.db` (in `backend/` directory) |
| ORM client init | `backend/src/config/prisma.ts` — single `PrismaClient` instance exported |
| Schema push | `prisma db push --skip-generate --accept-data-loss` at container startup |
| Seeding | Idempotent: checks user count, seeds if zero users found via `prisma/seed.ts` |
| Indexes | Composite and single-field indexes on ChoreAssignment, PointLog, RecurringChore, RecurringOccurrence, UserBadge for query performance |

## Auth Providers

**None.** Authentication is entirely self-contained:

- Email/password login (bcrypt-hashed)
- Server-side sessions via `express-session` (MemoryStore)
- No OAuth, no JWT, no external identity providers
- No password reset flow implemented (placeholder SMTP config in `.env.example` for future use)

## Webhooks

### Inbound Webhooks

**None.** The application has no inbound webhook endpoints.

### Outbound Notifications (ntfy.sh)

| Trigger | Recipient Topic | Priority | Click URL |
|---------|----------------|----------|-----------|
| Chore assigned | Assigned user's `ntfyTopic` | 3 (normal) | `/chores/{id}` |
| Chore due soon | Assigned user's `ntfyTopic` | 4 (high) | `/chores/{id}` |
| Chore completed | Parent users' `ntfyTopic` | 2 (low) | `/chores/{id}` |
| Badge earned | User's `ntfyTopic` | 3 (normal) | `/profile` |

### Error Webhook (configured but not wired)

- `ERROR_WEBHOOK_ENABLED`, `ERROR_WEBHOOK_URL`, `ERROR_WEBHOOK_USERNAME`, `ERROR_WEBHOOK_PASSWORD`, `ERROR_WEBHOOK_MIN_PRIORITY` exist in `.env.example` but are not implemented in code

## Third-Party SDKs

**None.** All external communication uses native APIs:

- `fetch()` for ntfy.sh HTTP POST
- No ntfy client library installed
- No Sentry SDK installed (placeholder DSN only)

## Health Check Endpoints

| Endpoint | Method | Returns | Used By |
|----------|--------|---------|---------|
| `/api/health` | GET | `{ success, data: { status, db: { connected, users }, uptime, timestamp }, error }` | Docker healthcheck (backend), Playwright webServer startup detection |

- Returns `200` with DB connectivity status and user count when healthy
- Returns `503` with error message when DB is unavailable
- Backend Docker healthcheck: `node -e "require('http').get('http://localhost:3010/api/health', ...)"`
- Frontend Docker healthcheck: `curl -f http://localhost:80`

## Rate Limiting Configuration

| Limiter | Scope | Window | Max Requests | Env Var | Default |
|---------|-------|--------|-------------|---------|---------|
| `generalLimiter` | All `/api/*` routes | 15 minutes | 300 | `RATE_LIMIT_MAX` | 300 |
| `authLimiter` | `POST /api/auth/login` only | 15 minutes | 10 | `AUTH_RATE_LIMIT_MAX` | 10 |

- Both use `express-rate-limit` with `standardHeaders: true` (returns rate limit info in `RateLimit-*` headers)
- Legacy headers (`X-RateLimit-*`) are disabled
- **Skipped entirely in test environment** (`NODE_ENV=test`)
- Auth limiter custom error message: `{ success: false, error: { message: "Too many login attempts, please try again later" } }`
- Rate limits are intentionally raised in e2e test environments to accommodate Playwright suite volumes

## CORS Configuration

| Setting | Value | Env Var |
|---------|-------|---------|
| Origin | `http://localhost:3002` (default) | `CORS_ORIGIN` |
| Credentials | `true` (always) | — |
| Applies to | All routes (app-level middleware) | — |

- CORS is primarily relevant when frontend is NOT served same-origin via nginx proxy
- In production Docker setup, nginx proxies `/api/*` to the backend, so CORS headers are typically not needed
- Credentials are always allowed because auth relies on session + CSRF cookies

## CSRF Configuration

| Aspect | Detail |
|--------|--------|
| Pattern | **Double-submit cookie** |
| Cookie name | `XSRF-TOKEN` (inline literal, not a const — CodeQL compliance, see AGENTS.md) |
| Header name | `x-xsrf-token` |
| Cookie attributes | `httpOnly: false` (client must read it), `sameSite: strict`, `secure` (production only), `path: /` |
| Token length | 32 bytes (64 hex characters) |
| Token generation | `crypto.randomBytes(32).toString('hex')` |
| Validation | Header value must match cookie value on mutating requests (POST, PUT, DELETE, PATCH) |
| Skip conditions | Safe methods (GET, HEAD, OPTIONS); test environment (`NODE_ENV=test`) |
| Scope | All `/api/*` routes (mounted in `app.ts`) |
| Frontend implementation | `frontend/src/lib/csrf.ts` — reads cookie from `document.cookie`, attaches `x-xsrf-token` header via axios interceptor |
| Frontend entry point | `frontend/src/lib/apiClient.ts` — `createApiClient()` wraps every API module's axios instance with the CSRF interceptor |

## Session Configuration

| Setting | Value | Env Var |
|---------|-------|---------|
| Secret | Required in production (app refuses to start without it) | `SESSION_SECRET` |
| Max age | 7 days (604800000 ms) | `SESSION_MAX_AGE` |
| Rolling | `true` (extends expiry on each request) | — |
| Secure | `true` in production (unless `SECURE_COOKIES=false`) | `SECURE_COOKIES` |
| httpOnly | `true` | — |
| SameSite | `strict` (configurable: strict/lax/none) | `SAMESITE_POLICY` |
| Store | Default MemoryStore (in-process, lost on restart) | — |
| Cookie name | `connect.sid` (Express session default) | — |

## Security Headers (Helmet)

Helmet is applied globally with default settings, which includes:

- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (when HTTPS)
- Referrer-Policy
- X-XSS-Protection
- Other default security headers from Helmet 8.x

## Body Parsing

| Setting | Value |
|---------|-------|
| JSON limit | 10 KB |
| URL-encoded limit | 10 KB |
| Cookie parsing | `cookie-parser` middleware |

## Trust Proxy

`app.set('trust proxy', 1)` — enabled for production behind nginx reverse proxy. Ensures `X-Forwarded-For` headers are respected for rate limiting and logging.

## Nginx Proxy Configuration (Frontend Docker)

| Route | Behavior |
|-------|----------|
| `/api/*` | Reverse proxy to `http://backend:${BACKEND_PORT}` with standard forwarding headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) |
| `/config.js` | No-cache header; file generated at container start with runtime env vars |
| `/` (SPA catch-all) | `try_files $uri $uri/ /index.html` for React Router client-side routing |
| Static assets (`*.js`, `*.css`, `*.png`, `*.jpg`, etc.) | 1-year cache with `Cache-Control: public, immutable` |
| Gzip compression | Enabled for text, CSS, JS, JSON, XML types; minimum 1024 bytes |

## Backend API Routes Summary

| Route | Methods | Auth | Validation |
|-------|---------|------|-----------|
| `/api/health` | GET | None | None |
| `/api/auth/login` | POST | None (rate-limited) | None (reads body directly) |
| `/api/auth/logout` | POST | Session | None |
| `/api/auth/me` | GET | `authenticate` | None |
| `/api/templates` | CRUD | `authenticate` + `authorize` | Zod schemas |
| `/api/assignments` | CRUD | `authenticate` + `authorize` | Zod schemas |
| `/api/points` | POST, GET | `authenticate` + `authorize` | Zod schemas |
| `/api/users` | GET, etc. | `authenticate` + `authorize` | None (reads body directly) |
| `/api/recurring` | CRUD | `authenticate` + `authorize` | None (reads body directly) |
| `/api/occurrences` | CRUD | `authenticate` + `authorize` | None (reads body directly) |

### Zod Validation

Only three route groups use Zod schema validation via the `validate(schema)` middleware:

- `assignments.routes.ts` — `createAssignmentSchema`, `updateAssignmentSchema`
- `points.routes.ts` — `adjustPointsSchema`
- `templates.routes.ts` — `createTemplateSchema`, `updateTemplateSchema`

All other routes read `req.body` directly without validation.
