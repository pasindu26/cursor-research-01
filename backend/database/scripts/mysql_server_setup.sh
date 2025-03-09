#!/bin/bash
# MySQL Server Setup Script for EC2
# -----------------------------------
# This script installs and configures MySQL Server on an EC2 instance
# allowing secure remote connections from your application server.

set -e  # Exit on error

# Load configuration from config file
source "$(dirname "$0")/../config/db.conf"

# Colorized output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== MySQL Server Setup for Water360 ===${NC}"
echo "This script will install and configure MySQL Server on this EC2 instance."
echo

# 1. Update system packages
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y mysql-server mysql-client ufw

# 2. Secure MySQL installation
echo -e "${YELLOW}[2/8] Securing MySQL installation...${NC}"

# Check if MySQL is already running with a password
if sudo mysql --user=root -e "SELECT 1" &>/dev/null; then
    # MySQL allows root login without password - fresh installation
    echo "Fresh MySQL installation detected. Setting root password..."
    sudo mysql --user=root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${ROOT_PASSWORD}';
FLUSH PRIVILEGES;
EOF
    echo -e "${GREEN}MySQL root password set.${NC}"
else
    # MySQL already has a password set
    echo "Existing MySQL installation detected."
    
    # Ask for the current root password
    read -s -p "Enter current MySQL root password: " CURRENT_ROOT_PASSWORD
    echo
    
    # Test the provided password
    if sudo mysql --user=root --password="${CURRENT_ROOT_PASSWORD}" -e "SELECT 1" &>/dev/null; then
        echo "Password accepted. Updating root password..."
        sudo mysql --user=root --password="${CURRENT_ROOT_PASSWORD}" <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${ROOT_PASSWORD}';
FLUSH PRIVILEGES;
EOF
        echo -e "${GREEN}MySQL root password updated.${NC}"
    else
        echo -e "${RED}Invalid password. Cannot continue.${NC}"
        exit 1
    fi
fi

# Secure the installation without using the interactive mysql_secure_installation
echo -e "${YELLOW}Configuring MySQL security settings...${NC}"

# These commands replicate what mysql_secure_installation does
sudo mysql --user=root --password="${ROOT_PASSWORD}" <<EOF
-- Remove anonymous users
DELETE FROM mysql.user WHERE User='';

-- Remove remote root login
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- Remove test database
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';

-- Reload privilege tables
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}Basic MySQL security configured.${NC}"

# 3. Create database and application user
echo -e "${YELLOW}[3/8] Creating database and application user...${NC}"
sudo mysql --user=root --password="${ROOT_PASSWORD}" <<EOF
-- Create database
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;

-- Create application user with remote access
CREATE USER IF NOT EXISTS '${APP_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${APP_PASSWORD}';
CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED WITH mysql_native_password BY '${APP_PASSWORD}';
CREATE USER IF NOT EXISTS '${APP_USER}'@'${BACKEND_IP}' IDENTIFIED WITH mysql_native_password BY '${APP_PASSWORD}';

-- Grant privileges to the application user (only on the specific database)
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${APP_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${APP_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${APP_USER}'@'${BACKEND_IP}';

FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}Database and user created successfully.${NC}"

# 4. Configure MySQL for remote connections
echo -e "${YELLOW}[4/8] Configuring MySQL for remote connections...${NC}"
sudo tee /etc/mysql/mysql.conf.d/mysqld.cnf > /dev/null <<EOF
[mysqld]
pid-file        = /var/run/mysqld/mysqld.pid
socket          = /var/run/mysqld/mysqld.sock
datadir         = /var/lib/mysql
log-error       = /var/log/mysql/error.log

# Remote connection settings
bind-address            = 0.0.0.0
mysqlx-bind-address     = 0.0.0.0

# Security settings
local_infile=0
max_allowed_packet=16M
default_password_lifetime=180
secure_file_priv=/var/lib/mysql-files

# Performance settings
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
max_connections = 100
key_buffer_size = 32M
thread_cache_size = 8
#query_cache_size = 32M
tmp_table_size = 64M
max_heap_table_size = 64M
table_open_cache = 400

# Character set and collation
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Logging (enable for troubleshooting, disable for production)
general_log = 0
slow_query_log = 1
slow_query_log_file = /var/log/mysql/mysql-slow.log
long_query_time = 2
EOF

echo -e "${GREEN}MySQL configuration updated.${NC}"

# 5. Create database schema
echo -e "${YELLOW}[5/8] Creating database schema...${NC}"
# Load schema from the schema directory
sudo mysql --user=root --password="${ROOT_PASSWORD}" --database="${DB_NAME}" < "$(dirname "$0")/../schema/init.sql"

echo -e "${GREEN}Database schema created successfully.${NC}"

# 6. Configure firewall
echo -e "${YELLOW}[6/8] Configuring firewall...${NC}"

# Configure UFW firewall to allow SSH and MySQL
sudo ufw allow ssh
sudo ufw allow from "${BACKEND_IP}" to any port 3306

# Enable the firewall if it's not already enabled
sudo ufw --force enable

echo -e "${GREEN}Firewall configured to allow SSH and MySQL access from backend server.${NC}"

# 7. Restart MySQL service
echo -e "${YELLOW}[7/8] Restarting MySQL service...${NC}"
sudo systemctl restart mysql
sudo systemctl enable mysql

# Verify MySQL is running
if sudo systemctl is-active --quiet mysql; then
    echo -e "${GREEN}MySQL service is running.${NC}"
else
    echo -e "${RED}MySQL service failed to start.${NC}"
    exit 1
fi

# 8. Display connection information
echo -e "${YELLOW}[8/8] Setup complete!${NC}"
echo
echo -e "${GREEN}=== MySQL Server Information ===${NC}"
echo "Server IP: $(curl -s http://checkip.amazonaws.com)"
echo "Database Name: ${DB_NAME}"
echo "Application Username: ${APP_USER}"
echo "Application Password: ${APP_PASSWORD}"
echo "Root Password: ${ROOT_PASSWORD}"
echo
echo -e "${YELLOW}IMPORTANT: Save these credentials securely. They will be needed to configure your application.${NC}"
echo
echo -e "${GREEN}MySQL Server setup complete! You can now configure your application to connect to this database server.${NC}"

# Save credentials to a secure location
CREDS_FILE="$(dirname "$0")/../config/credentials.conf"
echo "# MySQL Server Credentials - KEEP SECURE" > "$CREDS_FILE"
echo "SERVER_IP=$(curl -s http://checkip.amazonaws.com)" >> "$CREDS_FILE"
echo "DB_NAME=${DB_NAME}" >> "$CREDS_FILE"
echo "APP_USER=${APP_USER}" >> "$CREDS_FILE"
echo "APP_PASSWORD=${APP_PASSWORD}" >> "$CREDS_FILE"
echo "ROOT_PASSWORD=${ROOT_PASSWORD}" >> "$CREDS_FILE"

chmod 600 "$CREDS_FILE"
echo -e "${YELLOW}Credentials saved to $CREDS_FILE${NC}" 