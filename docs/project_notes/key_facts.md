# Key Facts

Non-sensitive project configuration and reference information.

## ⚠️ Security Warning

**NEVER store passwords, API keys, or sensitive credentials in this file.**

Store secrets in `.env` (excluded via `.gitignore`) or a password manager.

---

### Project Overview

- **Name**: Chore-Ganizer
- **Stack**: Express.js + TypeScript / React 18 + TypeScript / SQLite / Prisma
- **Auth**: Express sessions (in-memory `MemoryStore` — no SQLite/Redis session store configured; sessions do not survive a backend restart), bcrypt, double-submit-cookie CSRF tokens
- **Roles**: `PARENT`, `CHILD`

### Local Development

**Backend:**
- URL: `http://localhost:3010`
- Dev command: `npm run dev` (from `backend/`)
- Build command: `npm run build`

**Frontend:**
- URL: `http://localhost:5173` (Vite dev server)
- Dev command: `npm run dev` (from `frontend/`)
- Build command: `npm run build`

**API Proxy:** Frontend proxies `/api/*` to backend automatically

### Docker

**Registry:** `ghcr.io/thitar/`
**Images:**
- Backend: `ghcr.io/thitar/chore-ganizer-backend:VERSION`
- Frontend: `ghcr.io/thitar/chore-ganizer-frontend:VERSION`

**Compose file:** `docker-compose.yml` (single file, no separate prod/dev compose files)
**Helper script:** `./docker-compose.sh` (syncs `APP_VERSION` from `backend/package.json` into `.env`, then forwards to `docker compose`)

**Ports:**
- Frontend: `3002` (host, maps to nginx port 80 in the container)
- Backend: `3010`

### Environment Variables

Full reference: [docs/OPERATIONS.md#environment-variables](../OPERATIONS.md#environment-variables). Highlights:

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | No default — backend fails fast at startup if unset and `NODE_ENV=production` |
| `APP_VERSION` | Must match `backend/package.json` version. Only used for Docker image tagging — not read by app code |
| `DATA_DIR` | Host path for the SQLite file (default: `/opt/app-data/chore-ganizer`) |
| `PUID` / `PGID` | Host UID/GID for bind mount file ownership (default: `1001`) |
| `RATE_LIMIT_MAX` | General rate limiter max requests/15min (default: `300`) |
| `AUTH_RATE_LIMIT_MAX` | Auth (login) rate limiter max requests/15min (default: `10`) |
| `NTFY_BASE_URL` | Base URL of an ntfy server; unset = push notifications silently disabled |
| `BACKEND_PORT` | Backend port, used by frontend's nginx proxy config (default: `3010`) |
| `VITE_API_URL` | Frontend API URL override (empty = relative/proxy) |
| `CORS_ORIGIN` | Frontend origin for CORS (default: `http://localhost:3002`) |

There is no `OVERDUE_PENALTY_*`, `SLOW_REQUEST_THRESHOLD_MS`, `COMPRESSION_ENABLED`, `ERROR_WEBHOOK_*`, or `SMTP_*` in the current backend — those were pre-rewrite features that did not carry over into the v1-rewrite.

### Health & Observability

- `/api/health` — the **only** health endpoint. Runs `prisma.user.count()`; `200` if the DB responds, `503` if it throws.
- There is no `/api/health/live`, `/api/health/ready`, or `/api/metrics` endpoint in the current backend.
- Logging is plain `console.log`/`console.warn` to stdout — no structured/JSON logging, no log file, no rotation config.

### API Response Envelope

```json
{ "success": true, "data": { ... }, "error": null }
```

### Testing

**Backend:**
- Unit tests: `npm test` (mocked Prisma via inline `jest.mock('../../config/prisma', ...)` per test file)
- No integration test suite exists — no `jest.integration.config.js`, no test database, no `test:unit`/`test:integration` scripts

**Frontend:**
- Tests: `npm test` (Vitest). `src/test/setup.ts` only wires up `jest-dom` + `cleanup()` — no shared `utils.tsx` mock-data-factory helper
- API calls mocked per-test via `vi.mock()`

**E2E:**
- Playwright tests in `e2e/`, run via `npm run test:e2e` from the repo root
- `e2e/auth.setup.ts` logs in once per seeded user and saves `storageState`; specs replay it via `login()` in `e2e/helpers/auth.ts` rather than re-driving the login form (works around the auth rate limiter)

### Default Credentials (Dev Only)

- Parents: `dad@home.local`, `mom@home.local`
- Children: `alice@home.local`, `bob@home.local`
- Password: `password123`

### Domain Concepts

- **ChoreTemplate** — reusable chore definition (`title`, `points`, `category`), owned by its creating parent
- **ChoreAssignment** — one-off instance of a template assigned to a user
- **RecurringChore** — recurrence rule (`frequency`, `dayOfWeek`, `dayOfMonth`) assigned to one fixed user; round-robin/mixed rotation is a deferred, unimplemented feature
- **RecurringOccurrence** — a generated instance of a `RecurringChore` for a specific due date, generated lazily on read (`generateOccurrences()` in `assignment.service.ts`), not by a scheduled/cron background job
- **Chore statuses**: `PENDING`, `COMPLETED`, `PARTIALLY_COMPLETE`
- **PointLog** — append-only ledger (not a `PointTransaction` model). `type` values in use: `EARNED`, `BONUS`, `ADJUSTMENT`, `RECURRING`, `REGULAR`, `REVERSED`
- **No pocket-money/currency conversion feature** — that, plus `OverduePenalty`, existed in a pre-rewrite backend and was not carried over
- **Gamification**: `streakCount`/`streakComputedAt` (lazy weekly streak) and `lifetimePoints`/`lifetimePointsSyncedAt` (lazy self-healing cache of the `PointLog` total) on `User`; badges via `UserBadge` + `BADGE_CATALOG` in `gamification.service.ts`

### Frontend-Backend Parameter Mapping

| Frontend | Backend | File |
|---|---|---|
| `userId` | `assignedToId` | `frontend/src/api/assignments.api.ts` |
| `templateId` | `choreTemplateId` | `frontend/src/api/assignments.api.ts` |

Mapping happens in `frontend/src/api/` files, never in components or hooks. (`calendar.api.ts` uses plain `from`/`to` query params — no renaming needed there.)

### Monorepo Structure

```
chore-ganizer/
├── backend/     # Express.js + TypeScript
├── frontend/    # React + Vite
├── e2e/         # Playwright tests
├── docker-compose.yml
└── AGENTS.md    # AI agent instructions
```
