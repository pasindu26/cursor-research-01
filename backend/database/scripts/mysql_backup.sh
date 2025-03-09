#!/bin/bash
# MySQL Automated Backup Script
# -----------------------------
# This script creates automated backups of your MySQL database.

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/../config/db.conf"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Set permissions on backup directory
chmod 700 "$BACKUP_DIR"

# Generate timestamp for backup file
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Backup the database
echo "Creating backup of $DB_NAME database..."
mysqldump --user="$APP_USER" --password="$APP_PASSWORD" \
    --single-transaction --quick --lock-tables=false \
    --routines --events --triggers \
    "$DB_NAME" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    
    # Set secure permissions on backup file
    chmod 600 "$BACKUP_FILE"
    
    # Remove backups older than BACKUP_RETENTION_DAYS
    echo "Removing backups older than $BACKUP_RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
    
    # Create a symlink to the latest backup
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.sql.gz"
    
    # Display backup information
    echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo "Total backup storage used: $(du -h "$BACKUP_DIR" | tail -n 1 | cut -f1)"
    echo "Oldest backup: $(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | sort | head -n 1)"
    echo "Newest backup: $BACKUP_FILE"
else
    echo "Backup failed!"
    exit 1
fi

# Optional: Copy backup to a remote server or S3 bucket
# Uncomment and configure the following section to enable remote backups

# Copy to remote server via SCP
# scp -i /path/to/key.pem "$BACKUP_FILE" user@remote_server:/path/to/backup/dir/

# Copy to AWS S3 bucket (requires aws cli)
# aws s3 cp "$BACKUP_FILE" s3://your-bucket-name/mysql-backups/

echo "Backup process completed at $(date)"

# To set up as a cron job, run: crontab -e and add:
# 0 2 * * * /path/to/backend/database/scripts/mysql_backup.sh > /path/to/backend/database/logs/mysql_backup.log 2>&1 