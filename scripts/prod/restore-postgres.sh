#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: scripts/prod/restore-postgres.sh ./backups/postgres/postgres-YYYYMMDDTHHMMSSZ.dump"
  exit 2
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 2
fi

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "This will replace the current production database."
  echo "Run again with CONFIRM_RESTORE=yes to continue."
  exit 2
fi

echo "Stopping API and workers before restore..."
docker compose stop api email-worker search-worker

echo "Restoring PostgreSQL backup: ${BACKUP_FILE}"
docker compose exec -T postgres sh -lc \
  'dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'

docker compose exec -T postgres sh -lc \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' \
  < "$BACKUP_FILE"

echo "Starting API and workers..."
docker compose up -d api email-worker search-worker

echo "PostgreSQL restore complete."
