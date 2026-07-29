#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_FILE="${BACKUP_DIR}/postgres-${TIMESTAMP}.dump"
TMP_FILE="${OUTPUT_FILE}.tmp"

mkdir -p "$BACKUP_DIR"
umask 077

echo "Creating PostgreSQL backup: ${OUTPUT_FILE}"
docker compose exec -T postgres sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=9 --no-owner --no-acl' \
  > "$TMP_FILE"

mv "$TMP_FILE" "$OUTPUT_FILE"
sha256sum "$OUTPUT_FILE" > "${OUTPUT_FILE}.sha256"

find "$BACKUP_DIR" -type f -name 'postgres-*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'postgres-*.dump.sha256' -mtime +"$RETENTION_DAYS" -delete

echo "PostgreSQL backup complete:"
ls -lh "$OUTPUT_FILE" "${OUTPUT_FILE}.sha256"
