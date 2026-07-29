#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups/volumes}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
umask 077

backup_volume() {
  volume_name="$1"
  output_file="${BACKUP_DIR}/${volume_name}-${TIMESTAMP}.tar.gz"
  output_name="$(basename "$output_file")"

  echo "Creating volume backup: ${output_file}"
  docker run --rm \
    -v "${volume_name}:/volume:ro" \
    -v "$(pwd)/${BACKUP_DIR}:/backup" \
    alpine:3.20 \
    sh -lc "cd /volume && tar -czf /backup/${output_name} ."

  sha256sum "$output_file" > "${output_file}.sha256"
}

backup_volume "ttk-backend-prod_minio_data"
backup_volume "ttk-backend-prod_meilisearch_data"

find "$BACKUP_DIR" -type f -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name '*.tar.gz.sha256' -mtime +"$RETENTION_DAYS" -delete

echo "Volume backups complete:"
ls -lh "$BACKUP_DIR"/*"${TIMESTAMP}"*.tar.gz
