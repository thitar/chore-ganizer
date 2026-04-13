#!/bin/bash
set -e

# ============================================
# Chore-Ganizer Backup Script (Container Version)
# ============================================
# This script runs inside the Docker container
# to create automated backups of the SQLite database

# Configuration - can be overridden by environment variables
# Check for marker file created by docker-entrypoint.sh for backup directory override
if [ -f "/app/.backup_dir" ]; then
    BACKUP_DIR=$(cat /app/.backup_dir)
else
    BACKUP_DIR="${BACKUP_DIR:-/backups}"
fi
DB_PATH="${DB_PATH:-/opt/app-data/chore-ganizer/chore-ganizer.db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="chore-ganizer_${DATE}.db"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "=========================================="
echo "Starting backup..."
echo "Database: ${DB_PATH}"
echo "Backup directory: ${BACKUP_DIR}"
echo "Retention: ${RETENTION_DAYS} days"
echo "=========================================="

# Create backup directory if it doesn't exist
if ! mkdir -p "${BACKUP_DIR}"; then
    echo "ERROR: Failed to create backup directory: ${BACKUP_DIR}"
    exit 1
fi

# Verify database file exists
if [ ! -f "${DB_PATH}" ]; then
    echo "ERROR: Database file not found at ${DB_PATH}"
    exit 1
fi

# Copy database file using SQLite's .backup command for transactionally consistent backup
# This ensures a consistent snapshot even if the database is being written to
# Using .backup with proper quoting is cleaner and more reliable than the SQL backup command
if ! sqlite3 "${DB_PATH}" ".backup \"${BACKUP_PATH}\"" 2>&1; then
    echo "ERROR: Failed to create database backup"
    exit 1
fi

# Verify backup was created and has content
if [ -f "${BACKUP_PATH}" ] && [ -s "${BACKUP_PATH}" ]; then
    echo "Backup created: ${BACKUP_PATH}"
    
    # Create integrity check
    INTEGRITY=$(sqlite3 "${BACKUP_PATH}" "PRAGMA integrity_check;" 2>&1 || echo "error")
    echo "Integrity check: ${INTEGRITY}"
    echo "${INTEGRITY}" > "${BACKUP_PATH}.gz.integrity"
    
    # Compress backup
    gzip "${BACKUP_PATH}"
    echo "Backup compressed: ${BACKUP_PATH}.gz"
else
    echo "ERROR: Backup failed or file is empty"
    exit 1
fi

# Clean up old backups
OLD_COUNT=$(find "${BACKUP_DIR}" -name "chore-ganizer_*.db.gz" -mtime +${RETENTION_DAYS} -delete -print 2>/dev/null | wc -l)
find "${BACKUP_DIR}" -name "chore-ganizer_*.db.gz.integrity" -mtime +${RETENTION_DAYS} -delete 2>/dev/null
echo "Cleaned up ${OLD_COUNT} old backup(s)"

# Summary
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "chore-ganizer_*.db.gz" 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/chore-ganizer_*.db.gz 2>/dev/null | head -1)

echo "=========================================="
echo "Backup completed successfully!"
echo "Total backups: ${TOTAL_BACKUPS}"
echo "Total size: ${TOTAL_SIZE}"
echo "Latest backup: ${LATEST_BACKUP}"
echo "=========================================="

exit 0
