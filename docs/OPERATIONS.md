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

`./docker-compose.sh` is a thin wrapper: it extracts `APP_VERSION` from `backend/package.json`, syncs it into `.env` if present and out of date, then forwards all arguments to `docker compose`. Use it whenever the version has just been bumped; otherwise plain `docker compose up -d` is fine if `.env` already has the right `APP_VERSION`.

Frontend serves on `${FRONTEND_PORT:-3002}`, backend on `${PORT:-3010}`.

### What happens on container start

- **Backend** (`backend/docker-entrypoint.sh`): runs as root → adjusts `appuser` UID/GID if `PUID`/`PGID` set → creates and chowns `DATA_DIR` → generates the Prisma client → `prisma db push` (auto-applies schema) → seeds the DB if empty → drops to `appuser` via `su-exec` → starts `node dist/server.js`.
- **Frontend** (`frontend/docker-entrypoint.sh`): generates `/usr/share/nginx/html/config.js` with runtime env vars, substitutes `BACKEND_PORT` into the nginx config via `envsubst` → starts nginx.
- Schema changes and seeding are automatic — no manual migration step on first run or after a schema change. `DATA_DIR` must exist on the host before starting (Docker creates it as root if missing).

## Environment Variables

Single `.env` file at the project root (copy from `backend/.env.example` as a starting point, then add the compose-level vars below — there is no separate frontend `.env.example`).

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `SESSION_SECRET` | **Required** | none | Session cookie signing secret. `app.ts` **fails fast at startup** if `NODE_ENV=production` and this is unset — refuses to run on the insecure dev fallback. Generate with `openssl rand -base64 32`. |
| `APP_VERSION` | **Required** (for Docker tagging) | none | Used by `docker-compose.yml` to tag/pull images and pass `VITE_APP_VERSION` to the frontend build. **Not currently read by any application code** — no runtime version display or version-in-response feature exists yet, despite this being planned. Keep `backend/package.json` and `frontend/package.json` versions identical regardless. |
| `DATABASE_URL` | Optional | `file:${DATA_DIR}/chore-ganizer.db` | SQLite connection string, read directly by Prisma. |
| `DATA_DIR` | Optional | `/opt/app-data/chore-ganizer` | Host path bind-mounted into the backend container for the SQLite file. Must exist on the host (Docker creates it as root if missing). |
| `PORT` | Optional | `3010` | Backend listen port. |
| `FRONTEND_PORT` | Optional | `3002` | Host port mapped to the frontend container's nginx (port 80). |
| `BACKEND_PORT` | Optional | `3010` | Used by the frontend's nginx config (`envsubst` at container start) to know where to proxy `/api/*`. |
| `PUID` / `PGID` | Optional | `1001` | Host UID/GID the backend entrypoint chowns `DATA_DIR` to, for bind-mount file ownership. |
| `NODE_ENV` | Optional | `production` | Also gates the `SESSION_SECRET` fail-fast check and secure-cookie defaults. |
| `SESSION_MAX_AGE` | Optional | `604800000` (7 days, ms) | Session cookie max age. |
| `SAMESITE_POLICY` | Optional | `strict` | `strict` \| `lax` \| `none`. |
| `SECURE_COOKIES` | Optional | `false` (`true` when `NODE_ENV=production` unless explicitly set to `false`) | Marks session/CSRF cookies `Secure` — requires HTTPS. |
| `NTFY_BASE_URL` | Optional | unset (notifications disabled) | Base URL of an ntfy server (e.g. `https://ntfy.sh`). Unset = notifications silently no-op, logged once at startup. |
| `VITE_API_URL` | Optional | empty (relative URLs, nginx proxies `/api/*`) | Set only if the frontend needs to reach a backend on a different origin. |
| `CORS_ORIGIN` | Passed through, **not consumed** | `http://localhost:3002` | Set in `docker-compose.yml` but there is no CORS middleware in `app.ts` currently reading it — see `ARCHITECTURE.md`'s middleware gap note. |
| `LOG_LEVEL` | Passed through, **not consumed** | `info` | No logging library reads this in the current backend (console logging only). |

## Version Bumps

`backend/package.json` and `frontend/package.json` must always carry identical version numbers — this is the single source of truth. After bumping both:

1. Update `.env`'s `APP_VERSION` to match (or just run `./docker-compose.sh up --build -d`, which syncs it automatically)
2. CI/CD workflows read `APP_VERSION` to tag Docker images pushed to `ghcr.io/thitar/chore-ganizer-{backend,frontend}`

Note the root `package.json` (used only for Playwright e2e tooling) has its own independent, currently out-of-sync version field — it is not part of this contract and doesn't need to match.

## Health Checks & Monitoring

Only one health endpoint currently exists:

- **`GET /api/health`** — runs `prisma.user.count()` to verify DB connectivity. Returns `200` with `{ success: true, data: { status: 'ok', db: { connected: true, users: N }, uptime, timestamp } }` on success, `503` with `{ success: false, data: { status: 'unhealthy', db: { connected: false } } }` if the DB query throws.

```bash
curl http://localhost:3010/api/health
```

There is currently no `/api/health/live`, `/api/health/ready`, or `/api/metrics` endpoint, despite older docs describing them — the Docker Compose healthchecks for both services rely on the single `/api/health` endpoint (backend) and a plain HTTP GET (frontend nginx).

## Data & Backups

The SQLite database lives at `${DATA_DIR}/chore-ganizer.db` (default `/opt/app-data/chore-ganizer/chore-ganizer.db`), bind-mounted from the host per `docker-compose.yml`. No WAL mode or other journal-mode override is configured — it runs on SQLite's default rollback-journal mode.

**There is no automated backup mechanism in the current codebase** — no cron job, no backup script, nothing scheduled. (An older pre-rewrite backend had `backup-scripts/`; it was removed as dead code during the v1-rewrite and never replaced.) If you need backups, you must do them manually:

```bash
# Manual backup (safe to do live — SQLite's default rollback-journal mode
# handles concurrent readers; for a guaranteed-consistent snapshot under
# write load, stop the backend container first)
cp /opt/app-data/chore-ganizer/chore-ganizer.db /opt/app-data/chore-ganizer/chore-ganizer-$(date +%Y%m%d).db

# Or, for a live database, prefer sqlite3's own backup command over a raw file copy:
sqlite3 /opt/app-data/chore-ganizer/chore-ganizer.db ".backup /opt/app-data/chore-ganizer/chore-ganizer-$(date +%Y%m%d).db"
```

**Restore:** stop the backend, replace the `.db` file with a backup copy, restart:

```bash
docker compose stop backend
cp /opt/app-data/chore-ganizer/chore-ganizer-20260101.db /opt/app-data/chore-ganizer/chore-ganizer.db
docker compose start backend
```

This is a documented gap, not an oversight to paper over — scheduled backups are worth adding as a follow-up (e.g. a host-level cron calling the manual command above), but nothing implements it today.

## Logs

Both containers log to stdout only — `docker compose logs -f backend` / `docker compose logs -f frontend`. There is no separate log file, log rotation config, or structured/JSON logging in the current backend (plain `console.log`/`console.warn`).

## Common Troubleshooting

**`SESSION_SECRET must be set when NODE_ENV=production` at startup**
The backend now fails fast instead of silently falling back to an insecure dev secret (added after a security review). Set `SESSION_SECRET` in `.env` (generate with `openssl rand -base64 32`) and restart.

**CSRF errors on every mutating request (403 "Invalid CSRF token"), UI otherwise looks fine**
Historically caused by a frontend API module using `axios.create()` directly instead of the shared `createApiClient()` — new instances don't inherit the CSRF-token interceptor. If you add a new `frontend/src/api/*.ts` file, it must go through `createApiClient()` (see `docs/project_notes/bugs.md`, 2026-07-08).

**Sessions don't survive a backend restart**
Expected with the current setup — sessions use `express-session`'s default in-memory store (no SQLite/Redis session store is configured), so a container restart logs everyone out. See `ARCHITECTURE.md`'s Auth Flow section.

**`prisma validate` / container fails to start after a schema merge**
Check for accidentally duplicated field declarations in `schema.prisma` (has happened once after a merge — see `docs/project_notes/bugs.md`, 2026-07-04). Run `npx prisma validate` locally before pushing any schema change.

**Notifications never arrive**
Confirm `NTFY_BASE_URL` is set — if unset, ntfy sends are a deliberate silent no-op (logged once at container startup: `[ntfy] NTFY_BASE_URL not set — notifications disabled`), not a bug.

## Notification Setup

Set `NTFY_BASE_URL` (e.g. `https://ntfy.sh` or a self-hosted server) to enable push notifications. Each user optionally gets a unique `ntfyTopic` (set via their profile), which acts as their private notification channel — leaving it blank disables push for that user without affecting others. There's no other notification channel (no email/SMTP, no in-app notification center) in the current backend.

## Upgrading Between Versions

```bash
docker compose pull
docker compose up -d
```

`prisma db push --accept-data-loss` runs automatically in the backend entrypoint on every container start — schema changes apply without a manual migration step. (`--accept-data-loss` is safe here because this is a solo/family deployment where schema changes are reviewed by the same person deploying them, not an unattended production migration path — be aware it will silently drop columns/tables that a schema change removes.) The database is seeded automatically only if it's empty (checked via `prisma.user.count()`).
