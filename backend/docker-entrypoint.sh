#!/bin/sh
set -e

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Push any schema changes that don't have migrations
# This ensures the database is always in sync with the schema
echo "Syncing database schema..."
npx prisma db push --skip-generate

# Run seed if database is empty
echo "Checking if database needs seeding..."
USER_COUNT=$(sqlite3 /app/data/chore-ganizer.db "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
if [ "$USER_COUNT" = "0" ]; then
  echo "Seeding database..."
  npx prisma db seed
else
  echo "Database already seeded ($USER_COUNT users found)"
fi

# Start the application
exec node dist/server.js
