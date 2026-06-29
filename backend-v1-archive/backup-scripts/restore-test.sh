#!/bin/bash
set -e

# ============================================
# Chore-Ganizer Restore Test Script
# ============================================
# This script tests the latest backup by
# decompressing it and running integrity checks

BACKUP_DIR="${BACKUP_DIR:-/backups}"
# Check for marker file created by docker-entrypoint.sh for backup directory override
if [ -f "/app/.backup_dir" ]; then
    BACKUP_DIR=$(cat /app/.backup_dir)
fi
TEST_DB_PATH="/tmp/test_restore_$$.db"

echo "=========================================="
echo "Testing database restore..."
echo "Backup directory: ${BACKUP_DIR}"
echo "=========================================="

# Find latest backup
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/chore-ganizer_*.db.gz 2>/dev/null | head -1)

if [ -z "${LATEST_BACKUP}" ]; then
    echo "INFO: No backup found to test - this is expected on first day of deployment"
    echo "Backup system will be tested after first backup is created (runs at 2 AM)"
    # Exit with success - no backup to test is not an error
    exit 0
fi

echo "Using backup: ${LATEST_BACKUP}"
BACKUP_SIZE=$(du -h "${LATEST_BACKUP}" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Decompress to temp location
echo "Decompressing backup..."
if ! gunzip -c "${LATEST_BACKUP}" > "${TEST_DB_PATH}"; then
    echo "ERROR: Decompression failed"
    rm -f "${TEST_DB_PATH}"
    exit 1
fi

# Verify decompressed file
if [ ! -s "${TEST_DB_PATH}" ]; then
    echo "ERROR: Decompression failed or file is empty"
    rm -f "${TEST_DB_PATH}"
    exit 1
fi

# Test integrity
echo "Running integrity check..."
INTEGRITY=$(sqlite3 "${TEST_DB_PATH}" "PRAGMA integrity_check;" 2>&1)
echo "Integrity check result: ${INTEGRITY}"

# Try to read some basic table info
echo "Verifying database schema..."
TABLE_COUNT=$(sqlite3 "${TEST_DB_PATH}" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>&1)
echo "Found ${TABLE_COUNT} tables"

# Cleanup
rm -f "${TEST_DB_PATH}"

if [ "${INTEGRITY}" = "ok" ]; then
    echo "=========================================="
    echo "Restore test PASSED"
    echo "=========================================="
    exit 0
else
    echo "=========================================="
    echo "Restore test FAILED"
    echo "Integrity check: ${INTEGRITY}"
    echo "=========================================="
    exit 1
fi
