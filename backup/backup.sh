#!/bin/bash
# Scheduled PostgreSQL backups. Runs inside the postgres:16 image (pg_dump matches the server version).
# Env: PGHOST PGUSER PGPASSWORD PGDATABASE, BACKUP_INTERVAL_HOURS (default 24), BACKUP_KEEP (default 14).
# The API requests an immediate backup by creating /backups/.trigger.
set -u

INTERVAL=$(( ${BACKUP_INTERVAL_HOURS:-24} * 3600 ))
KEEP=${BACKUP_KEEP:-14}
DIR=/backups
mkdir -p "$DIR"

run_backup() {
  ts=$(date +%Y%m%d_%H%M%S)
  tmp="$DIR/.rfi_$ts.partial"
  if pg_dump --format=custom --file="$tmp"; then
    mv "$tmp" "$DIR/rfi_$ts.dump"
    echo "$(date -Is) backup ok: rfi_$ts.dump"
  else
    rm -f "$tmp"
    echo "$(date -Is) backup FAILED"
  fi
  ls -1t "$DIR"/rfi_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
}

until pg_isready -q; do sleep 2; done
echo "$(date -Is) backup service started: every ${BACKUP_INTERVAL_HOURS:-24}h, keeping $KEEP"

last=0
while true; do
  now=$(date +%s)
  if [ -f "$DIR/.trigger" ]; then
    rm -f "$DIR/.trigger"
    run_backup
    last=$(date +%s)
  elif [ $((now - last)) -ge "$INTERVAL" ]; then
    run_backup
    last=$(date +%s)
  fi
  sleep 10
done
