# ==============================================================================
# Kaveri Member Club • Automated Database Backup Script (PowerShell for Windows)
# ==============================================================================

param (
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$BackupFile = Join-Path $BackupDir "kaveri_db_backup_$Timestamp.sql"

Write-Host "[INFO] Starting database backup..." -ForegroundColor Cyan

# Check for SQLite vs Postgres
if (Test-Path ".\backend\kaveri.db") {
    $SqliteBackup = Join-Path $BackupDir "kaveri_sqlite_$Timestamp.db"
    Copy-Item ".\backend\kaveri.db" -Destination $SqliteBackup -Force
    Write-Host "[OK] SQLite database backup saved to: $SqliteBackup" -ForegroundColor Green
} else {
    Write-Host "[INFO] Backing up PostgreSQL via docker..." -ForegroundColor Cyan
    docker exec -t kaveri_postgres pg_dump -U kaveri_admin kaveri_db > $BackupFile
    Write-Host "[OK] PostgreSQL database backup saved to: $BackupFile" -ForegroundColor Green
}

# Purge older backups
$Cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "kaveri_*" | Where-Object { $_.LastWriteTime -lt $Cutoff } | Remove-Item -Force
Write-Host "[OK] Backup maintenance complete." -ForegroundColor Green
