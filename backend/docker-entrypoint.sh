#!/bin/sh
set -e

# ============================================
# Chore-Ganizer Docker Entrypoint
# ============================================
# Handles database migrations, starts supercronic for cron jobs,
# and runs the Node.js server

# Check if we're running as root
if [ "$(id -u)" = "0" ]; then
    # We're running as root - run migrations first
    
    # Create log directory for backup logs
    # Note: Logs are now redirected to stdout/stderr in supercronic.conf
    # for Docker's log management
    # mkdir -p /var/log
    
    # Run Prisma migrations
    echo "Running database migrations..."
    npx prisma migrate deploy

    # Push any schema changes that don't have migrations
    # This ensures the database is always in sync with the schema
    echo "Syncing database schema..."
    npx prisma db push --skip-generate

    # Run seed if database is empty
    echo "Checking if database needs seeding..."
    DB_PATH=${DATABASE_URL:-file:/app/data/chore-ganizer.db}
    
    # Parse database file path from DATABASE_URL (supports file: and sqlite: prefixes)
    # Handle various formats: file:/path, file:///path, sqlite:/path, sqlite://path
    DB_FILE=$(echo "$DB_PATH" | sed -E 's#^(file|sqlite):/{2,3}(.*)#\2#')
    
    # Validate database path was parsed correctly
    if [ -z "$DB_FILE" ]; then
        echo "ERROR: Could not parse database path from DATABASE_URL: $DB_PATH"
        exit 1
    fi
    
    # Validate path doesn't contain suspicious characters
    if echo "$DB_FILE" | grep -qE '[][$\`"\\|;&><[:space:]]'; then
        echo "ERROR: Database path contains invalid characters: $DB_FILE"
        exit 1
    fi
    
    # Check if database file exists
    if [ ! -f "$DB_FILE" ]; then
        echo "WARNING: Database file not found at $DB_FILE"
    fi
    
    USER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
    if [ "$USER_COUNT" = "0" ]; then
      echo "Seeding database..."
      npx prisma db seed
    else
      echo "Database already seeded ($USER_COUNT users found)"
    fi
    
    # Ensure backup directory exists and has correct permissions for appuser
    # This handles the case where /backups is mounted from host with different ownership
    echo "Setting up backup directory permissions..."
    BACKUP_DIR=${BACKUP_DIR:-/backups}
    mkdir -p "$BACKUP_DIR"
    
    # Create a subdirectory owned by appuser if the main directory isn't writable
    # This ensures backups can be created even when mounted volumes have restrictive permissions
    if [ ! -w "$BACKUP_DIR" ]; then
        echo "WARNING: Backups directory is not writable by appuser, creating subdirectory..."
        mkdir -p "$BACKUP_DIR/appuser"
        chown -R appuser:appuser "$BACKUP_DIR/appuser"
        # Export effective backup directory for backup scripts to use
        export BACKUP_DIR="$BACKUP_DIR/appuser"
        echo "INFO: Backups will be stored in $BACKUP_DIR/"
        # Create marker file so backup scripts know to use this subdirectory
        echo "$BACKUP_DIR" > /app/.backup_dir
    else
        chown -R appuser:appuser "$BACKUP_DIR"
        # Export the default backup directory
        export BACKUP_DIR="$BACKUP_DIR"
        echo "$BACKUP_DIR" > /app/.backup_dir
    fi
    
    # Switch to appuser and run the rest of the script
    echo "Switching to appuser..."
    exec su-exec appuser "$0" "$@"
fi

# ============================================
# Running as appuser
# ============================================

# Start supercronic in the background for cron jobs
# Use setsid to create a new process group for proper cleanup
echo "Starting supercronic for scheduled backup jobs..."
setsid supercronic /app/supercronic.conf &
SUPERCRONIC_PID=$!

echo "Supercronic started with PID: $SUPERCRONIC_PID"

# Validate supercronic actually started
sleep 1
if ! kill -0 $SUPERCRONIC_PID 2>/dev/null; then
    echo "ERROR: Failed to start supercronic"
    exit 1
fi

# ============================================
# Supercronic Health Monitoring Loop
# ============================================
# Periodically checks if supercronic is still running
# Logs any exits for debugging purposes
# Now runs in its own process group using setsid for proper cleanup
SUPERCRONIC_CHECK_INTERVAL=${SUPERCRONIC_CHECK_INTERVAL:-300}  # Default: 5 minutes

echo "Starting supercronic health monitor (interval: ${SUPERCRONIC_CHECK_INTERVAL}s)"

# Start the health monitor in its own process group using setsid
# This ensures the cleanup function can properly kill all child processes
# Pass SUPERCRONIC_PID and INTERVAL as arguments to the subshell
setsid sh -c '
    SUPERCRONIC_PID=$1
    INTERVAL=$2
    while true; do
        # Check supercronic immediately on each iteration (before first sleep too)
        # This ensures we detect failures quickly and don'\''t wait for sleep to complete
        
        # Check if supercronic process is still running
        if kill -0 $SUPERCRONIC_PID 2>/dev/null; then
            echo "[HEALTH] Supercronic is running (PID: $SUPERCRONIC_PID)"
        else
            # Process died, try to get exit status
            wait $SUPERCRONIC_PID 2>/dev/null && EXIT_CODE=0 || EXIT_CODE=$?
            
            # Log the failure with actual exit code
            if [ "$EXIT_CODE" = "0" ] || [ "$EXIT_CODE" = "" ]; then
                echo "[ERROR] Supercronic has stopped unexpectedly (PID: $SUPERCRONIC_PID)" >&2
            else
                echo "[ERROR] Supercronic has stopped with exit code: $EXIT_CODE (PID: $SUPERCRONIC_PID)" >&2
            fi
            echo "[ERROR] Backup scheduled jobs will not run until container is restarted" >&2
            # Alert to stderr for visibility in Docker logs
            echo "[ALERT] Backup system failure detected!" >&2
            # Exit with error to alert operators (container will restart)
            exit 1
        fi
        
        # Sleep between health checks
        sleep $INTERVAL
    done
' $SUPERCRONIC_PID $SUPERCRONIC_CHECK_INTERVAL &
MONITOR_PID=$!
echo "Health monitor started with PID: $MONITOR_PID"

# Trap to ensure supercronic is stopped on container shutdown
cleanup() {
    echo "Shutting down..."
    echo "Stopping supercronic health monitor (PID: $MONITOR_PID)..."
    # Kill the entire process group to ensure all child processes are terminated
    kill -TERM -$MONITOR_PID 2>/dev/null || kill -TERM $MONITOR_PID 2>/dev/null || true
    echo "Shutting down supercronic (PID: $SUPERCRONIC_PID)..."
    kill -TERM -$SUPERCRONIC_PID 2>/dev/null || kill -TERM $SUPERCRONIC_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGTERM SIGINT

# Start the Node.js server in the foreground
echo "Starting Node.js server..."
exec node dist/server.js
