#!/usr/bin/env python3
"""
Database Connection Test Script
-----------------------------
Tests the connection to the MySQL database and performs basic diagnostics.
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

## Add the backend directory to the Python path
#backend_dir = str(Path(__file__).resolve().parents[3])
#sys.path.append(backend_dir)

## Load environment variables from the backend's .env file
#env_path = os.path.join(backend_dir, '.env')
#load_dotenv(env_path)

load_dotenv('.env')

# Get database configuration from environment variables
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_USER = os.getenv('MYSQL_USER', 'water360user')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DB = os.getenv('MYSQL_DB', 'water360') 

def print_header():
    """Print the test header with connection details."""
    print("\n" + "="*50)
    print("MySQL Connection Test")
    print("="*50)
    print(f"Host: {MYSQL_HOST}")
    print(f"Database: {MYSQL_DB}")
    print(f"User: {MYSQL_USER}")
    print("-"*50 + "\n")

def test_mysql_connection():
    """Test the MySQL database connection and perform basic checks."""
    try:
        import MySQLdb
    except ImportError:
        print("⚠️  MySQLdb not installed. Installing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "mysqlclient"])
        time.sleep(2)
        import MySQLdb

    try:
        print("🔄 Connecting to MySQL server...")
        conn = MySQLdb.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            passwd=MYSQL_PASSWORD,
            db=MYSQL_DB
        )
        print("✅ Connection successful!")
        
        cursor = conn.cursor()
        
        # Test 1: Check MySQL version
        print("\n📊 Running diagnostics:")
        print("-"*30)
        
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()
        print(f"MySQL Version: {version[0]}")
        
        # Test 2: Check database tables
        print("\n📋 Database Tables:")
        print("-"*30)
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        
        if tables:
            for table in tables:
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
                count = cursor.fetchone()[0]
                
                # Get table size
                cursor.execute(f"""
                    SELECT 
                        ROUND(((data_length + index_length) / 1024 / 1024), 2)
                    FROM information_schema.tables
                    WHERE table_schema = '{MYSQL_DB}'
                    AND table_name = '{table[0]}'
                """)
                size = cursor.fetchone()[0]
                
                print(f"✓ {table[0]}:")
                print(f"  - Rows: {count}")
                print(f"  - Size: {size} MB")
        else:
            print("⚠️  No tables found in the database!")
        
        # Test 3: Check user privileges
        print("\n🔐 User Privileges:")
        print("-"*30)
        cursor.execute("SHOW GRANTS")
        grants = cursor.fetchall()
        for grant in grants:
            print(f"✓ {grant[0]}")
        
        cursor.close()
        conn.close()
        
        print("\n✅ All tests completed successfully!")
        
    except MySQLdb.Error as err:
        print(f"\n❌ Error connecting to MySQL: {err}")
        print("\n🔍 Troubleshooting Tips:")
        print("-"*30)
        print("1. Check if MySQL server is running:")
        print("   $ sudo systemctl status mysql")
        print(f"\n2. Verify MySQL host is correct: {MYSQL_HOST}")
        print("\n3. Check credentials in .env file")
        print("\n4. Verify network connectivity:")
        print(f"   $ ping {MYSQL_HOST}")
        print("\n5. Check if MySQL port (3306) is open:")
        print(f"   $ telnet {MYSQL_HOST} 3306")
        print("\n6. Review MySQL error logs:")
        print("   $ sudo tail -f /var/log/mysql/error.log")
        sys.exit(1)

if __name__ == "__main__":
    print_header()
    test_mysql_connection() 