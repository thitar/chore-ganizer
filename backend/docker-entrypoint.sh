#!/bin/sh
set -e

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

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
