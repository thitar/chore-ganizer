# Operations

How to run, configure, and maintain Chore-Ganizer day to day. For system design, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Starting the App

Two ways to run via Docker Compose (single `docker-compose.yml`, no separate prod/dev compose files):

```bash
# Local build from source
./docker-compose.sh up --build -d    # auto-reads APP_VERSION from backend/package.json

# Equivalent, manual
export APP_VERSION=$(grep '"version"' backend/package.json | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
docker compose up --build -d
```

`./docker-compose.sh` is a thin wrapper: it extracts `APP_VERSION` from `backend/package.json`, syncs it into `.env` if present and out of date, then forwards all arguments to `docker compose`. Use it whenever the version has just been bumped; otherwise plain `docker compose up -d` is fine if `.env` already has the right `APP_VERSION`. Both images are built locally from `./backend/Dockerfile` and `./frontend/Dockerfile` — there is no registry pull step wired up (see [Version Bumps](#version-bumps) below).

Frontend serves on `${FRONTEND_PORT:-3002}`, backend on `${PORT:-3010}`.

### What happens on container start

- **Backend** (`backend/docker-entrypoint.sh`): runs as root → adjusts `appuser` UID/GID if `PUID`/`PGID` differ from the image default (`1001`) → creates and chowns `DATA_DIR` → generates the Prisma client → `prisma db push --accept-data-loss` (auto-applies schema, dropping any column/table a schema change removed) → if `prisma.user.count()` is `0`, runs `bootstrap-parent.js` which creates exactly one PARENT from `BOOTSTRAP_PARENT_*` env vars (fails fast if vars are missing); if users exist, skips bootstrap entirely → drops to `appuser` via `su-exec` → starts `node dist/server.js`.
- **Frontend** (`frontend/docker-entrypoint.sh`): writes `/usr/share/nginx/html/config.js` (`window.APP_CONFIG = { apiUrl, debug, appVersion }` from `VITE_API_URL`/`VITE_DEBUG`/`VITE_APP_VERSION`), substitutes `BACKEND_PORT` into the nginx config via `envsubst`, then starts nginx.
- Schema changes and bootstrap are automatic — no manual migration step on first run or after a schema change. Demo fixtures remain available only through explicit `npx prisma db seed` in development. `DATA_DIR` must exist on the host before starting (Docker creates it as root if missing).

## Environment Variables

Single `.env` file at the project root for Docker Compose — copy the root `.env.example` (it documents every variable the app actually reads; there is no separate frontend `.env.example`). `backend/.env.example` is a different, smaller file for running the backend alone without Docker (`cd backend && npm run dev`, which loads `backend/.env` via `dotenv/config` relative to its own CWD) — don't confuse the two or use one to seed the other.

For a new production database, uncomment and replace all three required `BOOTSTRAP_PARENT_*` placeholders with real, unique values before starting the stack. The backend refuses to start while the database has no users and any required bootstrap value is absent or invalid; it never creates a default parent account. After the first parent signs in, remove the bootstrap values because they are ignored once a user exists.

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `SESSION_SECRET` | **Required** | none | Session cookie signing secret. `app.ts` **fails fast at startup** if `NODE_ENV=production` and this is unset — refuses to run on the insecure dev fallback (`'dev-secret'`). Generate with `openssl rand -base64 32`. |
| `BOOTSTRAP_PARENT_NAME` | **Required** (first start only) | none | Name for the first PARENT user. Only used when `prisma.user.count()` is 0. |
| `BOOTSTRAP_PARENT_EMAIL` | **Required** (first start only) | none | Email for the first PARENT user. |
| `BOOTSTRAP_PARENT_PASSWORD` | **Required** (first start only) | none | Temporary password for the first PARENT. Bcrypt-hashed at creation. Remove after first login. |
| `BOOTSTRAP_PARENT_COLOR` | Optional | `#4F46E5` | Hex color for the first PARENT user. |
| `APP_VERSION` | **Required** (for Docker tagging) | none | Passed through to `VITE_APP_VERSION` for the frontend build/runtime config. **Not currently read by any backend application code** — no runtime version display or version-in-response feature exists yet. Keep `backend/package.json` and `frontend/package.json` versions identical regardless. |
| `DATABASE_URL` | Optional | `file:${DATA_DIR}/chore-ganizer.db` | SQLite connection string, read directly by Prisma (`schema.prisma`'s `datasource db`). In Docker Compose, it must be a `file:` path to a database file under `DATA_DIR`; arbitrary host directories are not mounted. |
| `DATA_DIR` | Optional | `/opt/app-data/chore-ganizer` | Host path bind-mounted into the backend container for the SQLite file. Must exist on the host (Docker creates it as root if missing). |
| `PORT` | Optional | `3010` | Backend listen port (`server.ts`). |
| `HOST` | Optional | `0.0.0.0` | Backend bind address (`server.ts`). Not surfaced in `docker-compose.yml`'s environment block — only relevant if running the backend outside Docker. |
| `FRONTEND_PORT` | Optional | `3002` | Host port mapped to the frontend container's nginx (port 80). |
| `BACKEND_PORT` | Optional | `3010` | Used by the frontend's nginx config (`envsubst` at container start) to know where to proxy `/api/*`. |
| `PUID` / `PGID` | Optional | `1001` | Host UID/GID the backend entrypoint chowns `DATA_DIR` to, for bind-mount file ownership. |
| `NODE_ENV` | Optional | `production` | Also gates the `SESSION_SECRET` fail-fast check and secure-cookie defaults. |
| `SESSION_MAX_AGE` | Optional | `604800000` (7 days, ms) | Session cookie max age. Invalid/non-positive values silently fall back to the default (`app.ts`). |
| `SAMESITE_POLICY` | Optional | `strict` | Controls the session cookie only; the CSRF cookie remains `Strict`. Values: `strict` \| `lax` \| `none`. Any other value silently falls back to `strict`. `none` requires `SECURE_COOKIES=true`; the invalid combination fails startup. |
| `SECURE_COOKIES` | Optional | `false` (`true` when `NODE_ENV=production` unless explicitly set to `false`) | Marks session/CSRF cookies `Secure` — requires HTTPS. |
| `RATE_LIMIT_MAX` | Optional | `300` | Max requests per 15-minute window for the general API rate limiter (`backend/src/middleware/rateLimiter.ts`), mounted on all of `/api`. |
| `AUTH_RATE_LIMIT_MAX` | Optional | `10` | Max requests per 15-minute window for the stricter auth rate limiter (`POST /api/auth/login`). Raise this for e2e/load-testing runs that legitimately log in many times in one window — see `AGENTS.md`'s Testing Patterns. |
| `NTFY_BASE_URL` | Optional | unset (notifications disabled) | Base URL of an ntfy server (e.g. `https://ntfy.sh`). Unset = notifications silently no-op, logged once at startup. |
| `SMTP_HOST` | Optional | empty (password recovery disabled) | SMTP server hostname for password reset emails (e.g. `smtp.gmail.com`). All five SMTP vars must be set to enable password recovery. |
| `SMTP_PORT` | Optional | `465` | SMTP server port. Use `465` for SSL or `587` for STARTTLS. |
| `SMTP_USER` | Optional | empty | SMTP username (e.g. full Gmail address). |
| `SMTP_PASS` | Optional | empty | SMTP password or App Password (for Gmail: generate at https://myaccount.google.com/apppasswords with 2FA enabled). |
| `SMTP_FROM` | Optional | same as `SMTP_USER` | Sender email address for password reset emails. |
| `FRONTEND_URL` | Optional | empty | Public frontend URL used in password reset email links (e.g. `https://chore.thitar.ovh`). Required when SMTP is configured. |
| `VITE_API_URL` | Optional | empty (relative URLs, nginx proxies `/api/*`) | Set only if the frontend needs to reach a backend on a different origin. |
| `VITE_DEBUG` | Optional | `false` | Written into the frontend's runtime `window.APP_CONFIG.debug` by `frontend/docker-entrypoint.sh`. |
| `CORS_ORIGIN` | Optional | `http://localhost:3002` | Consumed by the CORS middleware in `app.ts` (fixed 2026-07-10 — was passed through but ignored since the v1-rewrite). Set it to your actual frontend origin if it differs from the default. |
| `BACKUP_DIR` | Optional | `/opt/app-data/chore-ganizer-backups` | Host path for SQLite backup files. |
| `BACKUP_DATABASE_FILE` | Optional | `chore-ganizer.db` | SQLite filename within `DATA_DIR`, mounted read-only at `/data` by the backup container. Set it to the filename used by a custom Compose `DATABASE_URL`; this is not a host path. |
| `BACKUP_SCHEDULE` | Optional | `0 3 * * *` | Cron schedule for backups (crond format). |
| `BACKUP_RETENTION_DAYS` | Optional | `14` | Days to retain backup files. |

## Version Bumps

`backend/package.json` and `frontend/package.json` must always carry identical version numbers — this is the single source of truth. After bumping both:

1. Update `.env`'s `APP_VERSION` to match (or just run `./docker-compose.sh up --build -d`, which syncs it automatically)
2. Rebuild and (if publishing) push images yourself — **there is no CI/CD workflow that builds, tags, or pushes Docker images** to `ghcr.io/thitar/chore-ganizer-{backend,frontend}` despite the image naming convention implying a registry pipeline. `.github/workflows/security.yml` runs CodeQL, `npm audit`, Gitleaks, Semgrep, and a Trivy filesystem scan; `.github/workflows/quality.yml` runs pull-request backend/frontend test and build validation plus Docker image builds. Neither workflow publishes images or deploys. If you want published images, that pipeline needs to be built; today, `APP_VERSION` only flows into local image tags via `docker-compose.sh`/`docker compose build`.

Note the root `package.json` (used only for Playwright e2e tooling) has its own independent, currently out-of-sync version field — it is not part of this contract and doesn't need to match.

## Health Checks & Monitoring

Only one health endpoint currently exists:

- **`GET /api/health`** — runs `prisma.user.count()` to verify DB connectivity. Returns `200` with `{ success: true, data: { status: 'ok', db: { connected: true, users: N }, uptime, timestamp } }` on success, `503` with `{ success: false, data: { status: 'unhealthy', db: { connected: false } } }` if the DB query throws.

```bash
curl http://localhost:3010/api/health
```

There is currently no `/api/health/live`, `/api/health/ready`, or `/api/metrics` endpoint, despite older docs describing them — the Docker Compose healthchecks for both services rely on the single `/api/health` endpoint (backend) and a plain HTTP GET (frontend nginx).

## Data & Backups

The SQLite database lives at the `file:` path configured by `DATABASE_URL`, which in Docker Compose must be under `${DATA_DIR}`. By default it is `${DATA_DIR}/chore-ganizer.db` (`/opt/app-data/chore-ganizer/chore-ganizer.db`), bind-mounted from the host per `docker-compose.yml`.

### Automated Backups

A `backup` Compose service runs daily, creating online SQLite backups via `.backup` (safe against concurrent writes) and retaining the most recent 14 days. It mounts `DATA_DIR` read-only as its database source and the backup destination as a separate writable mount. Configure `BACKUP_DIR`, `BACKUP_SCHEDULE`, and `BACKUP_RETENTION_DAYS` in your `.env`. If Compose `DATABASE_URL` uses a different filename under `DATA_DIR`, set `BACKUP_DATABASE_FILE` to the same filename.

```bash
# View backup logs
docker compose logs backup

# Trigger an immediate backup
docker compose exec backup /usr/local/bin/backup.sh

# List available backups
ls -lh "${BACKUP_DIR}"
```

### Restore from Backup

```bash
docker compose stop backend
cp "${BACKUP_DIR}/chore-ganizer-YYYYMMDDTHHMMSSZ.db" "${DATA_DIR}/${BACKUP_DATABASE_FILE:-chore-ganizer.db}"
docker compose start backend
```

## Logs

Both containers log to stdout only — `docker compose logs -f backend` / `docker compose logs -f frontend`. There is no separate log file, log rotation config, or structured/JSON logging in the current backend (plain `console.log`/`console.warn`).

## Common Troubleshooting

**`SESSION_SECRET must be set when NODE_ENV=production` at startup**
The backend fails fast instead of silently falling back to the insecure dev secret (added after a security review). Set `SESSION_SECRET` in `.env` (generate with `openssl rand -base64 32`) and restart.

**CSRF errors on every mutating request (403 "Invalid CSRF token"), UI otherwise looks fine**
Historically caused by a frontend API module using `axios.create()` directly instead of the shared `createApiClient()` — new instances don't inherit the CSRF-token interceptor. If you add a new `frontend/src/api/*.ts` file, it must go through `createApiClient()` (see `docs/project_notes/bugs.md`, 2026-07-08).

**Sessions don't survive a backend restart**
Expected with the current setup — sessions use `express-session`'s default in-memory `MemoryStore` (no SQLite/Redis session store is configured), so a container restart logs everyone out. See `ARCHITECTURE.md`'s Auth Flow section.

**`prisma validate` / container fails to start after a schema merge**
Check for accidentally duplicated field declarations in `schema.prisma` (has happened once after a merge — see `docs/project_notes/bugs.md`, 2026-07-04). Run `npx prisma validate` locally before pushing any schema change.

**Notifications never arrive**
Confirm `NTFY_BASE_URL` is set — if unset, ntfy sends are a deliberate silent no-op (logged once at container startup: `[ntfy] NTFY_BASE_URL not set — notifications disabled`), not a bug.

**Login/e2e requests getting 403'd unexpectedly**
Check `AUTH_RATE_LIMIT_MAX` (default 10/15min) and `RATE_LIMIT_MAX` (default 300/15min) — a full automated test run or a burst of legitimate traffic can exhaust either. Both are configurable via env for exactly this reason.

## Notification Setup

Set `NTFY_BASE_URL` (e.g. `https://ntfy.sh` or a self-hosted server) to enable push notifications. Each user optionally gets a unique `ntfyTopic` (set via their profile), which acts as their private notification channel — leaving it blank disables push for that user without affecting others.

For password recovery, configure SMTP via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. When all five are set, a "Forgot password?" link appears on the login page and users can reset their password via email. When unset, password recovery is disabled and the link is hidden. See the Environment Variables table above for details.

## Secure Cookie Rollout

Production is HTTPS behind Caddy. `SECURE_COOKIES` must be enabled manually after verifying the proxy chain.

### Prerequisites

- Caddy terminates HTTPS and forwards `X-Forwarded-Proto: https` (default behavior).
- Frontend Nginx preserves Caddy's `X-Forwarded-Proto` header (fixed in this release).
- Do not expose port 3002 directly to untrusted clients; public traffic must reach the app through Caddy. Nginx relies on Caddy-supplied `X-Forwarded-Proto`.

### Rollout Steps

1. Validate and reload the host Caddyfile; confirm it serves HTTPS.
2. Deploy with `./docker-compose.sh up --build -d`.
3. Confirm Nginx forwards the header: `docker compose exec frontend nginx -T | grep X-Forwarded-Proto` (should show `$http_x_forwarded_proto`).
4. Set `SECURE_COOKIES=true` in the host `.env` and recreate backend/frontend.
5. In a **private browser window**, verify: persistent login, one mutating request (CSRF), chore completion, notification delivery (if configured), and `/api/health`.
6. If login does not persist, revert `SECURE_COOKIES=false`, recreate services, and investigate forwarded headers.

## Upgrading Between Versions

```bash
docker compose pull
docker compose up -d
```

`docker compose pull` only does something useful if you're pulling pre-built images from a registry you've published to yourself — see [Version Bumps](#version-bumps) above; there is no upstream registry to pull from out of the box. `prisma db push --accept-data-loss` runs automatically in the backend entrypoint on every container start — schema changes apply without a manual migration step. (`--accept-data-loss` is safe here because this is a solo/family deployment where schema changes are reviewed by the same person deploying them, not an unattended production migration path — be aware it will silently drop columns/tables that a schema change removes.) The first parent user is bootstrapped automatically only if the database is empty (checked via `prisma.user.count()`).
