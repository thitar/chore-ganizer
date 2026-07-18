#!/bin/sh
set -eu
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Create source database
sqlite3 "$tmp/source.db" 'create table check_data (value text); insert into check_data values ("ok");'

# Create an expired backup. touch -t works in both GNU coreutils and BusyBox.
mkdir -p "$tmp/backups"
expired_backup="$tmp/backups/chore-ganizer-expired.db"
sqlite3 "$expired_backup" 'create table check_data (value text); insert into check_data values ("expired");'
touch -t 200001010000 "$expired_backup"

# Force identical timestamps so this test always exercises the collision path.
mkdir "$tmp/bin"
cat > "$tmp/bin/date" <<'EOF'
#!/bin/sh
printf '%s\n' '20000101T000000Z'
EOF
chmod +x "$tmp/bin/date"

# Two back-to-back backups must not collide, and each must be readable.
PATH="$tmp/bin:$PATH" DATABASE_FILE="$tmp/source.db" BACKUP_DIR="$tmp/backups" BACKUP_RETENTION_DAYS=14 sh ./backup.sh
PATH="$tmp/bin:$PATH" DATABASE_FILE="$tmp/source.db" BACKUP_DIR="$tmp/backups" BACKUP_RETENTION_DAYS=14 sh ./backup.sh

# The expired backup is pruned while both immediate backups are retained.
test ! -e "$expired_backup"
backups=$(find "$tmp/backups" -name 'chore-ganizer-*.db' -type f)
test "$(printf '%s\n' "$backups" | wc -l)" -eq 2
for backup in $backups; do
  test "$(sqlite3 "$backup" 'select value from check_data;')" = 'ok'
done
