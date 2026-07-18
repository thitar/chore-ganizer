# Docker Configuration

Where things actually live. For runtime behavior (env vars, entrypoint steps, health checks) see [OPERATIONS.md](./OPERATIONS.md) — this file only maps out the Docker file layout so you know where to look.

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` (repo root) | The only compose file — two services, `frontend` and `backend`. No separate dev/prod compose variants. |
| `docker-compose.sh` (repo root) | Wrapper that syncs `APP_VERSION` from `backend/package.json` into `.env`, then forwards to `docker compose`. See [OPERATIONS.md#starting-the-app](./OPERATIONS.md#starting-the-app). |
| `backend/Dockerfile` | Multi-stage build: compiles TypeScript, generates the Prisma client, runs as non-root `appuser`. No `Dockerfile.dev` exists — local dev runs `npm run dev` directly, not in a container. |
| `backend/docker-entrypoint.sh` | Adjusts `appuser` UID/GID to `PUID`/`PGID`, `prisma db push`, seeds if empty, drops privileges, starts the server. Details in [OPERATIONS.md](./OPERATIONS.md#what-happens-on-container-start). |
| `frontend/Dockerfile` | Multi-stage build: Vite build, served by nginx. No `Dockerfile.dev` — local dev runs `npm run dev` (Vite) directly. |
| `frontend/docker-entrypoint.sh` | Writes `config.js` with runtime API URL/version, substitutes `BACKEND_PORT` into the nginx config, starts nginx. |
| `frontend/nginx.conf` | Serves the built SPA and proxies `/api/*` to the backend container. |
| `backend/.env.example` | Starting point for the single project-root `.env` file — see [OPERATIONS.md#environment-variables](./OPERATIONS.md#environment-variables) for the full/authoritative variable list (this file only documents a subset). There is no separate frontend `.env.example`. |

## Ports & network

Both services join a single bridge network, `chore-ganizer-network`. Frontend maps `${FRONTEND_PORT:-3002}:80`; backend maps `${PORT:-3010}:3010`. Frontend's nginx proxies API calls to the backend over the Docker network — the backend port doesn't need to be exposed to the host at all for normal use, but is by default.

## Images

There is no registry publishing pipeline — images are built locally only (`docker compose build` / `./docker-compose.sh up --build -d`). See AGENTS.md's "no CI/CD Docker publishing pipeline" note and [OPERATIONS.md#version-bumps](./OPERATIONS.md#version-bumps).
