#!/bin/sh

# Database Backup Script for Production
# This script is used by the backup service in docker-compose.prod.yml

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="photobooth_backup_${TIMESTAMP}.sql"

# Database connection
PGHOST="${POSTGRES_HOST:-postgres}"
PGDATABASE="${POSTGRES_DB:-photobooth}"
PGUSER="${POSTGRES_USER:-photobooth}"
PGPASSWORD="${POSTGRES_PASSWORD}"

export PGPASSWORD

echo "Starting backup at $(date)"
echo "Backup file: ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}/postgres"

# Perform database backup
pg_dump -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" \
    --no-password \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --if-exists \
    > "${BACKUP_DIR}/postgres/${BACKUP_FILE}"

# Compress the backup
gzip "${BACKUP_DIR}/postgres/${BACKUP_FILE}"
echo "Backup compressed: ${BACKUP_FILE}.gz"

# Get backup size
BACKUP_SIZE=$(ls -lh "${BACKUP_DIR}/postgres/${BACKUP_FILE}.gz" | awk '{print $5}')
echo "Backup size: ${BACKUP_SIZE}"

# Clean old backups
echo "Cleaning backups older than ${BACKUP_KEEP_DAYS} days..."
find "${BACKUP_DIR}/postgres" -name "photobooth_backup_*.sql.gz" -mtime +${BACKUP_KEEP_DAYS} -delete

# List current backups
echo "Current backups:"
ls -la "${BACKUP_DIR}/postgres/photobooth_backup_*.sql.gz" 2>/dev/null || echo "No backups found"

echo "Backup completed successfully at $(date)"