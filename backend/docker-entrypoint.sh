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
    # Use db push instead of migrate deploy for reliable schema creation
    # This avoids migration ordering issues with fresh databases
    echo "Pushing database schema..."
    npx prisma db push --skip-generate

    # Run seed if database is empty
    echo "Checking if database needs seeding..."
    DB_PATH=${DATABASE_URL:-file:/app/data/chore-ganizer.db}
    
    # Parse database file path from DATABASE_URL (supports file: and sqlite: prefixes)
    # Handle various formats: file:/path, file:///path, sqlite:/path, sqlite://path
    DB_FILE=$(echo "$DB_PATH" | sed -E 's#^(file|sqlite):/{1,3}(.*)#\2#')
    
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
    
    # Check if database file exists (handle both absolute paths and file: URLs)
    # After db push, the file will be at /app/data/chore-ganizer.db or the staging variant
    if [ ! -f "$DB_FILE" ]; then
        # Try with common database paths if using file: URL
        if [ -f "/app/data/chore-ganizer.db" ]; then
            DB_FILE="/app/data/chore-ganizer.db"
            echo "Database found at /app/data/chore-ganizer.db"
        elif [ -f "/app/data/chore-ganizer-staging.db" ]; then
            DB_FILE="/app/data/chore-ganizer-staging.db"
            echo "Database found at /app/data/chore-ganizer-staging.db"
        else
            echo "WARNING: Database file not found at $DB_FILE or /app/data/chore-ganizer*.db"
        fi
    fi
    
    # Check if we need to seed - only if the database exists and is empty
    if [ -f "$DB_FILE" ]; then
        USER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0")
        if [ "$USER_COUNT" = "0" ]; then
          echo "Seeding database..."
          # Try to run seed, but don't fail if not configured - just create default users
          npx prisma db seed 2>/dev/null || {
            echo "Seed not configured, creating default users manually..."
            # Create default users matching the seed file: dad, mom, alice, bob
            # bcrypt hash of 'password123'
            sqlite3 "$DB_FILE" "INSERT INTO User (email, password, name, role, points) VALUES ('dad@home.local', '\$2b\$10\$bkyJ7xor27r27AuHxE3HPOAxxnPiFXyJ7/bfywomtsK.s7vN8UkP2', 'Dad', 'PARENT', 0);"
            sqlite3 "$DB_FILE" "INSERT INTO User (email, password, name, role, points) VALUES ('mom@home.local', '\$2b\$10\$bkyJ7xor27r27AuHxE3HPOAxxnPiFXyJ7/bfywomtsK.s7vN8UkP2', 'Mom', 'PARENT', 0);"
            sqlite3 "$DB_FILE" "INSERT INTO User (email, password, name, role, points) VALUES ('alice@home.local', '\$2b\$10\$bkyJ7xor27r27AuHxE3HPOAxxnPiFXyJ7/bfywomtsK.s7vN8UkP2', 'Alice', 'CHILD', 0);"
            sqlite3 "$DB_FILE" "INSERT INTO User (email, password, name, role, points) VALUES ('bob@home.local', '\$2b\$10\$bkyJ7xor27r27AuHxE3HPOAxxnPiFXyJ7/bfywomtsK.s7vN8UkP2', 'Bob', 'CHILD', 0);"
          }
        else
          echo "Database already seeded ($USER_COUNT users found)"
        fi
    else
        echo "WARNING: Database file not found, skipping seed check"
    fi
    
    # Fix database file permissions for appuser
    echo "Setting database file permissions..."
    if [ -f "$DB_FILE" ]; then
        chown appuser:appuser "$DB_FILE"
        chmod 664 "$DB_FILE"
    fi
    
    # Also fix permissions on the data directory
    chown appuser:appuser /app/data
    chmod 775 /app/data
    
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
    exec gosu appuser "$0" "$@"
fi

# ============================================
# Running as appuser
# ============================================

# Start supercronic in the background for cron jobs (optional for testing)
# Use setsid to create a new process group for proper cleanup
if command -v supercronic &> /dev/null && [ -f /app/supercronic.conf ]; then
    echo "Starting supercronic for scheduled backup jobs..."
    setsid supercronic /app/supercronic.conf &
    SUPERCRONIC_PID=$!

    echo "Supercronic started with PID: $SUPERCRONIC_PID"

    # Validate supercronic actually started
    sleep 1
    if ! kill -0 $SUPERCRONIC_PID 2>/dev/null; then
        echo "WARNING: Failed to start supercronic, continuing without cron..."
        unset SUPERCRONIC_PID
    fi
else
    echo "WARNING: Supercronic not available, skipping cron jobs..."
    unset SUPERCRONIC_PID
fi

# ============================================
# Supercronic Health Monitoring Loop (only if supercronic is running)
# ============================================
if [ -n "$SUPERCRONIC_PID" ]; then
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
fi

# Trap to ensure processes are stopped on container shutdown
# Using numeric signal codes for compatibility
cleanup() {
    echo "Shutting down..."
    if [ -n "$MONITOR_PID" ]; then
        echo "Stopping supercronic health monitor (PID: $MONITOR_PID)..."
        kill -15 -$MONITOR_PID 2>/dev/null || kill -15 $MONITOR_PID 2>/dev/null || true
    fi
    if [ -n "$SUPERCRONIC_PID" ]; then
        echo "Shutting down supercronic (PID: $SUPERCRONIC_PID)..."
        kill -15 -$SUPERCRONIC_PID 2>/dev/null || kill -15 $SUPERCRONIC_PID 2>/dev/null || true
    fi
    exit 0
}
trap cleanup 15 2 EXIT

# Start the Node.js server in the foreground
echo "Starting Node.js server..."
exec node dist/server.js
