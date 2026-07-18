# Production Preparation Design

**Date:** 2026-07-18
**Status:** Approved for planning

## Goal

Prepare Chore-Ganizer for reliable household production use without adding external runtime services. A fresh production database must start with one configured parent account and no demo data. The deployment must take consistent daily SQLite backups, securely issue cookies through the Caddy-to-Nginx-to-Express proxy chain, and validate changes in GitHub Actions before merge.

## Scope

1. Replace automatic production demo seeding with an empty-database first-parent bootstrap.
2. Add a Compose-managed SQLite backup sidecar with daily backups and 14-day retention.
3. Preserve Caddy's forwarded HTTPS protocol through the frontend Nginx proxy.
4. Add PR quality gates for tests, typechecks, production builds, and Docker image builds.
5. Reconcile environment templates and operations documentation.
6. Provide a guarded production rollout and smoke-test procedure.
7. Remove the obsolete task handoff document after its follow-ups are incorporated.

## Non-Goals

- No public registration or setup endpoint.
- No Redis, persistent session-store change, image registry publishing, or automatic deployment.
- No Playwright/UAT run in every PR workflow.
- No host Caddyfile or production `.env` stored in this repository.

## First-Parent Bootstrap

The current `prisma db seed` remains a development/test fixture and continues to create demo users and chores when explicitly run. The backend container entrypoint must no longer invoke it automatically for an empty database.

Instead, an empty database is initialized by a dedicated bootstrap script using these Compose-provided variables:

- `BOOTSTRAP_PARENT_NAME`
- `BOOTSTRAP_PARENT_EMAIL`
- `BOOTSTRAP_PARENT_PASSWORD`
- `BOOTSTRAP_PARENT_COLOR` (optional; application default when omitted)

Behavior:

1. After schema synchronization, startup counts users.
2. When one or more users exist, bootstrap is skipped and bootstrap values are ignored.
3. When no users exist, all required bootstrap values must be present and valid; otherwise startup fails with a clear message instead of creating demo data or an unusable installation.
4. The script bcrypt-hashes the configured password and creates exactly one `PARENT` user. It creates no templates, assignments, recurring chores, points, badges, or notifications.
5. The first parent uses the existing authenticated parent-only UI to create every later family member.

The bootstrap password is plaintext only in the operator's `.env` at initial startup. The database stores only the bcrypt hash. Operators may remove the bootstrap variables after the first successful login; they are not consulted after a user exists.

## Backup Service

Add a repository-built `backup` Compose service:

- Uses a minimal Alpine-based image with `sqlite3` and `crond`.
- Mounts the live `DATA_DIR` read-only and a distinct `BACKUP_DIR` read-write.
- Runs SQLite's `.backup` command against the live database, avoiding unsafe filesystem copying of a database that may be in use.
- Writes timestamped backup files once per day.
- Retains the most recent 14 daily backups and removes older backups.
- Logs successful backups, retention cleanup, and failures to stdout.
- Restarts with `unless-stopped` and does not block frontend/backend startup.

`BACKUP_DIR` and the schedule are documented environment settings. The default schedule runs once daily. Operations documentation includes restore steps using a selected backup and a backend stop/start cycle.

## Secure Cookie Proxy Chain

Caddy terminates HTTPS and normally sets `X-Forwarded-Proto: https`. The frontend Nginx container currently overwrites that value with its internal HTTP scheme before proxying `/api` to Express. Update Nginx to preserve Caddy's incoming forwarded-protocol header.

The backend already uses `app.set('trust proxy', 1)`. With the corrected Nginx header, `SECURE_COOKIES=true` permits `express-session` to issue Secure session cookies, and the existing CSRF cookie uses the same secure-cookie decision.

The host-managed Caddyfile is not changed by this branch. The operations runbook instructs the operator to validate and reload it before the secure-cookie rollout. The expected Caddy behavior is to forward the HTTPS protocol header; its existing `reverse_proxy` configuration already does so by default.

## CI Quality Gates

Add a PR-triggered quality workflow separate from the existing security workflow. It runs:

- Backend: `npm ci`, unit suite, TypeScript typecheck, production build.
- Frontend: `npm ci`, unit suite, TypeScript typecheck, production build.
- Docker: build backend and frontend images without publishing them.

The workflow uses maintained Node versions compatible with the packages. It does not run Docker-backed Playwright/UAT, ntfy delivery checks, or deploy anything. Existing security scans remain unchanged.

## Environment and Documentation

Update root and backend `.env.example` files with bootstrap and backup settings, accurate secure-cookie guidance, local backend port `3010`, and `CORS_ORIGIN` documentation. Remove stale dead-variable documentation. Do not edit real `.env` files from the repository branch.

Update `docs/OPERATIONS.md` with:

- first-parent bootstrap requirements;
- backup location, schedule, retention, verification, and restore;
- Caddy/Nginx forwarded-protocol requirements;
- secure-cookie enablement and rollback;
- deployment and smoke-test commands.

Delete `docs/HANDOFF-2026-07-13.md` once its environment findings are represented in the documentation and implementation.

## Production Rollout

1. Review and merge the production-preparation branch after CI passes.
2. Set the bootstrap variables only if initializing a new, empty production database. Remove them after the first parent can log in.
3. Confirm the host Caddyfile is active and serving HTTPS.
4. Rebuild and restart the stack through the repository deployment wrapper.
5. Confirm the backup container is healthy and produces a readable backup.
6. Set `SECURE_COOKIES=true` and recreate the backend/frontend containers.
7. Immediately verify in a private browser session: login persistence, an authenticated mutation with CSRF protection, chore completion, notification delivery when configured, and health/readiness endpoints.
8. If login does not persist, revert `SECURE_COOKIES=false`, recreate services, and investigate forwarded headers before retrying.

## Verification

- Bootstrap tests prove empty databases create one parent only; missing/invalid bootstrap variables fail safely; non-empty databases skip bootstrap.
- Backup script/container tests or command-level verification prove `.backup` succeeds and retention deletes only expired backups.
- Nginx configuration test or container-level request confirms `X-Forwarded-Proto: https` reaches Express through the full proxy chain.
- Backend and frontend unit tests, typechecks, builds, and Docker image builds pass locally and in the new PR workflow.
- Production smoke test follows the rollout checklist above; it is not automated in per-PR CI.
