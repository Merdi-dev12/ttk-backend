#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

"${SCRIPT_DIR}/backup-postgres.sh"
"${SCRIPT_DIR}/backup-volumes.sh"

echo "All production backups complete."
