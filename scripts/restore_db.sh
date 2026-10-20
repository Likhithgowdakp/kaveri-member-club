#!/usr/bin/env bash
# ==============================================================================
# Kaveri Member Club • Disaster Recovery & Database Restore Script
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: ./scripts/restore_db.sh /path/to/backup.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "[WARNING] This will overwrite the current database '${POSTGRES_DB:-kaveri_db}'!"
read -p "Type 'RESTORE' to proceed: " CONFIRM
if [ "${CONFIRM}" != "RESTORE" ]; then
    echo "[ABORT] Restore operation cancelled."
    exit 0
fi

echo "[INFO] Restoring database from ${BACKUP_FILE}..."

if docker ps --format '{{.Names}}' | grep -q "kaveri_postgres"; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i kaveri_postgres psql -U "${POSTGRES_USER:-kaveri_admin}" -d "${POSTGRES_DB:-kaveri_db}"
else
    gunzip -c "${BACKUP_FILE}" | psql -U "${POSTGRES_USER:-kaveri_admin}" -d "${POSTGRES_DB:-kaveri_db}"
fi

echo "[OK] Database restore completed successfully."
