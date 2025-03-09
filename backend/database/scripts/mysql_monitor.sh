#!/bin/bash
# MySQL Monitoring Script
# ----------------------
# This script monitors various MySQL metrics and logs them for analysis.

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/../config/db.conf"

# Create log directory if it doesn't exist
mkdir -p "$MONITOR_LOG_DIR"

# Set log file path
LOG_FILE="$MONITOR_LOG_DIR/mysql_metrics_$(date +%Y-%m-%d).log"

# Function to get MySQL status
get_mysql_status() {
    mysql --user="$APP_USER" --password="$APP_PASSWORD" -e "SHOW GLOBAL STATUS;" 2>/dev/null
}

# Function to get MySQL variables
get_mysql_variables() {
    mysql --user="$APP_USER" --password="$APP_PASSWORD" -e "SHOW GLOBAL VARIABLES;" 2>/dev/null
}

# Function to get MySQL process list
get_mysql_processes() {
    mysql --user="$APP_USER" --password="$APP_PASSWORD" -e "SHOW FULL PROCESSLIST;" 2>/dev/null
}

# Function to get system metrics
get_system_metrics() {
    echo "System Load Average: $(uptime | awk -F'load average:' '{print $2}' | tr -d ',')"
    echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')%"
    echo "Memory Usage: $(free -m | grep Mem | awk '{print "Total: " $2 "MB, Used: " $3 "MB, Free: " $4 "MB"}')"
    echo "Disk Usage: $(df -h / | grep -v Filesystem)"
}

# Start logging
echo "===== MySQL Monitoring Report: $(date) =====" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Check if MySQL is running
if ! systemctl is-active --quiet mysql; then
    echo "ALERT: MySQL service is not running!" >> "$LOG_FILE"
    exit 1
fi

# Get MySQL uptime
UPTIME=$(get_mysql_status | grep "Uptime" | awk '{print $2}')
UPTIME_DAYS=$((UPTIME / 86400))
UPTIME_HOURS=$(((UPTIME % 86400) / 3600))
UPTIME_MINUTES=$(((UPTIME % 3600) / 60))
echo "MySQL Uptime: $UPTIME_DAYS days, $UPTIME_HOURS hours, $UPTIME_MINUTES minutes" >> "$LOG_FILE"

# Get connection statistics
CONNECTIONS=$(get_mysql_status | grep "Threads_connected" | awk '{print $2}')
MAX_CONNECTIONS=$(get_mysql_variables | grep "max_connections" | awk '{print $2}')
echo "Current Connections: $CONNECTIONS / $MAX_CONNECTIONS" >> "$LOG_FILE"

# Alert if connections exceed threshold
if [ "$CONNECTIONS" -gt "$ALERT_THRESHOLD_CONNECTIONS" ]; then
    echo "ALERT: High number of connections: $CONNECTIONS" >> "$LOG_FILE"
fi

# Get query statistics
QUERIES=$(get_mysql_status | grep "Questions" | awk '{print $2}')
SLOW_QUERIES=$(get_mysql_status | grep "Slow_queries" | awk '{print $2}')
echo "Total Queries: $QUERIES" >> "$LOG_FILE"
echo "Slow Queries: $SLOW_QUERIES" >> "$LOG_FILE"

# Get cache statistics
QCACHE_HITS=$(get_mysql_status | grep "Qcache_hits" | awk '{print $2}')
QCACHE_INSERTS=$(get_mysql_status | grep "Qcache_inserts" | awk '{print $2}')
if [ -n "$QCACHE_HITS" ] && [ -n "$QCACHE_INSERTS" ] && [ "$QCACHE_HITS" != "0" ] && [ "$QCACHE_INSERTS" != "0" ]; then
    CACHE_HIT_RATE=$(echo "scale=2; $QCACHE_HITS / ($QCACHE_HITS + $QCACHE_INSERTS) * 100" | bc)
    echo "Query Cache Hit Rate: ${CACHE_HIT_RATE}%" >> "$LOG_FILE"
else
    echo "Query Cache: Disabled or insufficient data" >> "$LOG_FILE"
fi

# Get InnoDB statistics
echo "InnoDB Status:" >> "$LOG_FILE"
get_mysql_status | grep "^Innodb_" | sort >> "$LOG_FILE"

# Get system metrics
echo "" >> "$LOG_FILE"
echo "System Metrics:" >> "$LOG_FILE"
get_system_metrics >> "$LOG_FILE"

# Check for long-running queries
echo "" >> "$LOG_FILE"
echo "Long-Running Queries (>10 seconds):" >> "$LOG_FILE"
get_mysql_processes | grep -v "Sleep" | awk '{if ($6 > 10) print $0}' >> "$LOG_FILE"

# Get table statistics for the main database
echo "" >> "$LOG_FILE"
echo "Table Statistics for $DB_NAME database:" >> "$LOG_FILE"
mysql --user="$APP_USER" --password="$APP_PASSWORD" -e "
    SELECT table_name, 
           table_rows, 
           data_length/1024/1024 as 'Data Size (MB)', 
           index_length/1024/1024 as 'Index Size (MB)' 
    FROM information_schema.tables 
    WHERE table_schema='$DB_NAME' 
    ORDER BY data_length DESC;" 2>/dev/null >> "$LOG_FILE"

echo "" >> "$LOG_FILE"
echo "===== End of Report =====" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Rotate logs (keep 30 days)
find "$MONITOR_LOG_DIR" -name "mysql_metrics_*.log" -type f -mtime +30 -delete

# To set up as a cron job, run: crontab -e and add:
# 0 * * * * /path/to/backend/database/scripts/mysql_monitor.sh >/dev/null 2>&1 