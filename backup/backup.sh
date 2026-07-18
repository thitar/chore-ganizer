#!/bin/sh
set -eu

DATABASE_FILE="${DATABASE_FILE:-/data/chore-ganizer.db}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

test -r "$DATABASE_FILE" || { echo "[backup] Database is not readable: $DATABASE_FILE" >&2; exit 1; }
case "$BACKUP_RETENTION_DAYS" in ''|*[!0-9]*) echo "[backup] BACKUP_RETENTION_DAYS must be a positive integer" >&2; exit 1;; esac
test "$BACKUP_RETENTION_DAYS" -gt 0 || { echo "[backup] BACKUP_RETENTION_DAYS must be positive" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$BACKUP_DIR/chore-ganizer-$timestamp.db"

sqlite3 "$DATABASE_FILE" ".backup '$target'"
sqlite3 "$target" 'pragma integrity_check;' | grep -qx ok
expire_after=$((BACKUP_RETENTION_DAYS - 1))
expired_count=$(find "$BACKUP_DIR" -type f -name 'chore-ganizer-*.db' -mtime +"$expire_after" | wc -l)
find "$BACKUP_DIR" -type f -name 'chore-ganizer-*.db' -mtime +"$expire_after" -delete
test "$expired_count" -gt 0 && echo "[backup] Pruned $expired_count expired backup(s)"
echo "[backup] Created and verified $target"
