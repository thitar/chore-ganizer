#!/bin/bash
set -e

# ============================================
# Chore-Ganizer Cron Entrypoint
# ============================================
# This entrypoint starts both the main application
# and cron for scheduled backup tasks

echo "Starting Chore-Ganizer with cron..."

# Create backup directory
mkdir -p /backups

# Copy backup scripts to /app for consistent paths
cp /backup-scripts/backup.sh /app/backup.sh
cp /backup-scripts/restore-test.sh /app/restore-test.sh
chmod +x /app/backup.sh
chmod +x /app/restore-test.sh

# Start the main application in background
echo "Starting backend server..."
node dist/server.js &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to be ready..."
sleep 5

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "ERROR: Backend server failed to start"
    exit 1
fi

echo "Backend server started (PID: $SERVER_PID)"

# Setup cron
echo "Setting up cron jobs..."
cp /crontab /etc/cron.d/chore-ganizer-cron
chmod 0644 /etc/cron.d/chore-ganizer-cron

# Start cron in foreground
echo "Starting cron daemon..."
exec cron -f
