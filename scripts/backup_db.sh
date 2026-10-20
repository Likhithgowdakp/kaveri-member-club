#!/usr/bin/env bash
# ==============================================================================
# Kaveri Member Club • Automated Database Backup Script (PostgreSQL)
# Suitable for daily cron execution.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/kaveri_member_club}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/kaveri_db_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup at $(date)..."

# If running via Docker Compose:
if docker ps --format '{{.Names}}' | grep -q "kaveri_postgres"; then
    echo "[INFO] Dumping PostgreSQL from container 'kaveri_postgres'..."
    docker exec -t kaveri_postgres pg_dump -U "${POSTGRES_USER:-kaveri_admin}" "${POSTGRES_DB:-kaveri_db}" | gzip > "${BACKUP_FILE}"
else
    echo "[INFO] Dumping PostgreSQL from local host..."
    pg_dump -U "${POSTGRES_USER:-kaveri_admin}" "${POSTGRES_DB:-kaveri_db}" | gzip > "${BACKUP_FILE}"
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[OK] Backup completed successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Purge backups older than RETENTION_DAYS
echo "[INFO] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "kaveri_db_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete
echo "[OK] Backup cycle complete."
