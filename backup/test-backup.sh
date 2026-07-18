#!/bin/sh
set -eu
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
sqlite3 "$tmp/source.db" 'create table check_data (value text); insert into check_data values ("ok");'
DATABASE_FILE="$tmp/source.db" BACKUP_DIR="$tmp/backups" BACKUP_RETENTION_DAYS=14 ./backup.sh
backup=$(find "$tmp/backups" -name 'chore-ganizer-*.db' -type f)
test -n "$backup"
test "$(sqlite3 "$backup" 'select value from check_data;')" = 'ok'
