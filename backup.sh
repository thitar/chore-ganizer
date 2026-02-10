#!/bin/bash

# ============================================
# Chore-Ganizer Backup Script
# ============================================

# Configuration
BACKUP_DIR="./data/backups"
DB_FILE="./data/chores.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/chores_${TIMESTAMP}.db.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    log "ERROR: Database file not found at $DB_FILE"
    exit 1
fi

# Stop backend to ensure consistent backup
log "Stopping backend container..."
docker-compose stop backend

# Create backup
log "Creating backup: $BACKUP_FILE"
if gzip -c "$DB_FILE" > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "ERROR: Backup creation failed"
    docker-compose start backend
    exit 1
fi

# Start backend
log "Starting backend container..."
docker-compose start backend

# Wait for backend to be healthy
log "Waiting for backend to be healthy..."
sleep 10

# Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_FILE"; then
    log "Backup integrity verified"
else
    log "ERROR: Backup integrity check failed"
    exit 1
fi

# Clean up old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "chores_*.db.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Deleted $DELETED_COUNT old backup(s)"

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "chores_*.db.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "Backup completed successfully"
log "Total backups: $TOTAL_BACKUPS"
log "Total size: $TOTAL_SIZE"
log "Latest backup: $BACKUP_FILE"

exit 0
