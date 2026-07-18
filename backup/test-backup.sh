#!/bin/sh
set -eu
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Create source database
sqlite3 "$tmp/source.db" 'create table check_data (value text); insert into check_data values ("ok");'

# First backup: should create a new backup
DATABASE_FILE="$tmp/source.db" BACKUP_DIR="$tmp/backups" BACKUP_RETENTION_DAYS=14 ./backup.sh
backup1=$(find "$tmp/backups" -name 'chore-ganizer-*.db' -type f)
test -n "$backup1"
test "$(sqlite3 "$backup1" 'select value from check_data;')" = 'ok'

# Simulate an expired backup (20 days old) by touching its timestamp
touch -d "20 days ago" "$backup1"

# Second backup: should create a new one AND prune the expired one
DATABASE_FILE="$tmp/source.db" BACKUP_DIR="$tmp/backups" BACKUP_RETENTION_DAYS=14 ./backup.sh
backup2=$(find "$tmp/backups" -name 'chore-ganizer-*.db' -type f | grep -v "$backup1" || true)
test -n "$backup2"

# Verify old backup was pruned
test ! -f "$backup1"

# Verify new backup is readable
test "$(sqlite3 "$backup2" 'select value from check_data;')" = 'ok'
