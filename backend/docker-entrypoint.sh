#!/bin/sh
set -e

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
exec node dist/server.js
