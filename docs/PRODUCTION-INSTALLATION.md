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

   ```bash
   git clone https://github.com/thitar/chore-ganizer.git
   cd chore-ganizer
   ```

2. **Create `.env`** at the repo root from `.env.example`.

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and set these required values:
   - `SESSION_SECRET` — generate a random 32-character string:

     ```bash
     openssl rand -base64 32
     ```

     Copy the output and paste it into `.env` as `SESSION_SECRET=<paste-here>`

   - `BOOTSTRAP_PARENT_NAME` — your name or account name (e.g., `Your Name`)
   - `BOOTSTRAP_PARENT_EMAIL` — your email address (e.g., `you@example.com`)
   - `BOOTSTRAP_PARENT_PASSWORD` — a strong temporary password (save this, you'll use it to log in)
   - `BOOTSTRAP_PARENT_COLOR` — a hex color (e.g., `#4F46E5`)

   Recommended settings (adjust as needed):
   - `CORS_ORIGIN` — set to your actual frontend URL (e.g., `https://chores.yourdomain.com`)
   - `NODE_ENV=production`
   - `SECURE_COOKIES=true` (if using HTTPS)
   - `PUID` and `PGID` — set to your user/group IDs (`id -u` and `id -g`) to avoid permission issues

   See [OPERATIONS.md#environment-variables](./OPERATIONS.md#environment-variables) for the complete list and defaults.

3. **Create the data directories** on the host.

   ```bash
   mkdir -p /opt/app-data/chore-ganizer
   mkdir -p /opt/app-data/chore-ganizer-backups
   ```

   (or adjust the paths if you changed `DATA_DIR` and `BACKUP_DIR` in `.env`)

4. **Start the stack**.

   ```bash
   ./docker-compose.sh up --build -d
   ```

   (This syncs `APP_VERSION` automatically. Alternatively: `docker compose up --build -d` if `.env` already has the right `APP_VERSION`.)

5. **Verify the backend is running**.

   ```bash
   curl http://localhost:3010/api/health
   ```

   Expected response (pretty-printed):

   ```json
   {
     "success": true,
     "data": {
       "db": {
         "connected": true
       }
     }
   }
   ```

   On first start, the Docker entrypoint will create the initial parent account using your `BOOTSTRAP_PARENT_*` credentials.

6. **Log in** to the frontend at `http://localhost:3002` (or your configured `CORS_ORIGIN`).
   - Email: the value you set as `BOOTSTRAP_PARENT_EMAIL`
   - Password: the value you set as `BOOTSTRAP_PARENT_PASSWORD`

7. **Secure the bootstrap credentials** after first login.

   Remove the `BOOTSTRAP_PARENT_*` lines from `.env`:

   ```bash
   # Edit .env and comment out or delete these lines:
   # BOOTSTRAP_PARENT_NAME=...
   # BOOTSTRAP_PARENT_EMAIL=...
   # BOOTSTRAP_PARENT_PASSWORD=...
   # BOOTSTRAP_PARENT_COLOR=...
   ```

   Then restart the container:

   ```bash
   docker compose restart
   ```

   These are one-time bootstrap values and should not stay in production.

## Notifications (optional)

Set `NTFY_BASE_URL` if you want push notifications — see [NTFY-SETUP-GUIDE.md](./NTFY-SETUP-GUIDE.md).

## Upgrading

See [OPERATIONS.md#upgrading-between-versions](./OPERATIONS.md#upgrading-between-versions) — schema changes and seeding are automatic on every container start, there's no manual migration step.
