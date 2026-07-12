# Production Installation

First-time setup checklist. For day-to-day operation (env vars, backups, troubleshooting) see [OPERATIONS.md](./OPERATIONS.md) — this file only covers getting the stack running the first time.

## Prerequisites

| Resource | Minimum | Notes |
|----------|---------|-------|
| CPU | 1 core | Sufficient for family-scale use |
| RAM | 1 GB | Node.js + SQLite are lightweight |
| Storage | 5 GB | Database is small; leave room for manual backups |
| Docker | 20.10+ | |
| Docker Compose | v2 (`docker compose`, not the standalone `docker-compose` binary) | |

There are no pre-built images to pull — see [OPERATIONS.md#version-bumps](./OPERATIONS.md#version-bumps). You need the source to build locally.

## Steps

1. **Clone the repo** onto the target host.
2. **Create `.env`** at the repo root from `backend/.env.example`, then set at minimum:
   - `SESSION_SECRET` — generate with `openssl rand -base64 32`; the backend refuses to start in production without it.
   - `CORS_ORIGIN` — your actual frontend origin if it's not `http://localhost:3002`.
   - See [OPERATIONS.md#environment-variables](./OPERATIONS.md#environment-variables) for the complete list and defaults.
3. **Create the data directory** on the host: `mkdir -p /opt/app-data/chore-ganizer` (or wherever `DATA_DIR` points) — Docker will create it as root if missing, but you likely want the right ownership up front via `PUID`/`PGID`.
4. **Start the stack**: `./docker-compose.sh up --build -d` (syncs `APP_VERSION` automatically) or plain `docker compose up --build -d` if `.env` already has the right `APP_VERSION`.
5. **Verify**: `curl http://localhost:3010/api/health` should return `200` with `db.connected: true`. The database is seeded automatically on first start if empty.
6. **Log in** with a seeded account — check `backend/prisma/seed.ts` for the current seed credentials.

## Notifications (optional)

Set `NTFY_BASE_URL` if you want push notifications — see [NTFY-SETUP-GUIDE.md](./NTFY-SETUP-GUIDE.md).

## Upgrading

See [OPERATIONS.md#upgrading-between-versions](./OPERATIONS.md#upgrading-between-versions) — schema changes and seeding are automatic on every container start, there's no manual migration step.
