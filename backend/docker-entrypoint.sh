#!/bin/sh
# docker-entrypoint.sh for backend-v2
# Runs as root, adjusts UID/GID, prisma migrate/seed, drops to appuser, starts node

set -e

# Adjust appuser UID/GID to match host if PUID/PGID set
if [ -n "$PUID" ] && [ "$PUID" != "1001" ]; then
    echo "[entrypoint] Updating appuser UID to $PUID"
    usermod -u "$PUID" appuser 2>/dev/null || true
fi
if [ -n "$PGID" ] && [ "$PGID" != "1001" ]; then
    echo "[entrypoint] Updating appuser GID to $PGID"
    groupmod -g "$PGID" appuser 2>/dev/null || true
fi

# Ensure DATA_DIR exists and is owned by appuser
DATA_DIR="${DATA_DIR:-/opt/app-data/chore-ganizer}"
mkdir -p "$DATA_DIR"
chown -R appuser:appuser "$DATA_DIR" 2>/dev/null || true

# Generate Prisma client (idempotent)
echo "[entrypoint] Generating Prisma client"
npx prisma generate >/dev/null 2>&1 || true

# Apply database schema
echo "[entrypoint] Applying database schema"
cd /app
su-exec appuser npx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -5

# Seed database if empty (idempotent — checks if users exist)
echo "[entrypoint] Checking if database needs seeding"
USER_COUNT=$(su-exec appuser node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then(c => { console.log(c); p.\$disconnect(); })")
if [ "$USER_COUNT" = "0" ]; then
    echo "[entrypoint] Seeding database"
    su-exec appuser npx prisma db seed
else
    echo "[entrypoint] Database already has $USER_COUNT users, skipping seed"
fi

echo "[entrypoint] Starting backend on port ${PORT:-3010}"
exec su-exec appuser node dist/server.js
