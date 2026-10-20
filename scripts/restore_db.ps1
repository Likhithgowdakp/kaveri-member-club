# ==============================================================================
# Kaveri Member Club • Disaster Recovery & Database Restore Script (PowerShell)
# ==============================================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

$confirm = Read-Host "WARNING: This will overwrite current database records! Type 'RESTORE' to proceed"
if ($confirm -ne "RESTORE") {
    Write-Host "[ABORT] Restore cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "[INFO] Restoring database from $BackupFile..." -ForegroundColor Cyan

if ($BackupFile.EndsWith(".db")) {
    Copy-Item $BackupFile -Destination ".\backend\kaveri.db" -Force
    Write-Host "[OK] SQLite database restored." -ForegroundColor Green
} else {
    Get-Content $BackupFile | docker exec -i kaveri_postgres psql -U kaveri_admin -d kaveri_db
    Write-Host "[OK] PostgreSQL database restored." -ForegroundColor Green
}
