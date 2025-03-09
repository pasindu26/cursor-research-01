#!/bin/bash

# Fix MySQL authentication issues
# This script addresses common authentication problems, especially with MySQL 8.0+

set -e  # Exit on error

echo "MySQL Authentication Fixer"
echo "=========================="

# Load environment variables from .env if present
if [[ -f backend/.env ]]; then
    source backend/.env
elif [[ -f .env ]]; then
    source .env
fi

# Get MySQL credentials
MYSQL_USER=${MYSQL_USER:-"water360user"}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-"securepassword"}
MYSQL_ROOT_PASSWORD=""

# Ask for root password
read -s -p "Enter MySQL root password: " MYSQL_ROOT_PASSWORD
echo

# Fix root authentication method
echo "1. Fixing root authentication method..."
if sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 'Root access works';" &> /dev/null; then
    echo "   ✅ Root access already working"
else
    echo "   ⚠️ Root password seems incorrect or root is using auth_socket"
    echo "   Attempting to fix with auth_socket method..."
    # Try using auth_socket to access MySQL
    sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
    echo "   Root authentication method updated."
fi

# Verify and update application user
echo "2. Verifying application user ($MYSQL_USER)..."
if sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT User FROM mysql.user WHERE User='$MYSQL_USER';" | grep -q "$MYSQL_USER"; then
    echo "   ✅ User $MYSQL_USER exists"
    
    # Update password to ensure it matches .env
    echo "   Updating password for $MYSQL_USER..."
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "ALTER USER '$MYSQL_USER'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASSWORD';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "ALTER USER '$MYSQL_USER'@'%' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASSWORD';" 2>/dev/null || true
    echo "   Password updated."
else
    echo "   ⚠️ User $MYSQL_USER does not exist"
    echo "   Creating user $MYSQL_USER..."
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER '$MYSQL_USER'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASSWORD';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER '$MYSQL_USER'@'%' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASSWORD';" 2>/dev/null || true
    echo "   User created."
fi

# Grant privileges to application user
echo "3. Granting privileges to $MYSQL_USER..."
MYSQL_DB=${MYSQL_DB:-"water360"}
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\`;"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON \`$MYSQL_DB\`.* TO '$MYSQL_USER'@'localhost';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON \`$MYSQL_DB\`.* TO '$MYSQL_USER'@'%';" 2>/dev/null || true
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"
echo "   Privileges granted."

echo "4. Testing connection with application user..."
if mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 'Connection successful';" &> /dev/null; then
    echo "   ✅ Application user connection successful!"
else
    echo "   ❌ Application user connection failed. Further troubleshooting needed."
    echo "   Try running the database_setup.sh script or check MySQL logs."
fi

echo 
echo "MySQL authentication fix completed!"
echo "You can now try running the Flask application or the check_db_connection.py script." 