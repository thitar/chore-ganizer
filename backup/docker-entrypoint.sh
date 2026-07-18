#!/bin/sh
set -eu

schedule="${BACKUP_SCHEDULE:-0 3 * * *}"
printf '%s /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1\n' "$schedule" > /etc/crontabs/root
echo "[backup] Scheduled '$schedule'; retaining ${BACKUP_RETENTION_DAYS:-14} days"
exec crond -f -l 2
