"""
Database connection module.
Provides functions for connecting to the MySQL database.
"""

import os
import MySQLdb
from flask import current_app, g
import logging

# Configure logger
logger = logging.getLogger('database')

def get_db_connection():
    """Get a connection to the MySQL database."""
    try:
        connection = MySQLdb.connect(
            host=os.getenv('MYSQL_HOST', 'localhost'),
            user=os.getenv('MYSQL_USER', 'root'),
            passwd=os.getenv('MYSQL_PASSWORD', ''),
            db=os.getenv('MYSQL_DB', 'water360'),
            charset='utf8mb4'
        )
        return connection
    except Exception as e:
        logger.error(f"Failed to connect to MySQL database: {str(e)}")
        raise

def get_db():
    """Get database connection from Flask application context."""
    if 'db' not in g:
        g.db = get_db_connection()
    return g.db

def close_db(e=None):
    """Close database connection."""
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db(app):
    """Initialize database connection."""
    app.teardown_appcontext(close_db)
    
    # Test connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        cursor.close()
        conn.close()
        app.logger.info("Database connection successful")
    except Exception as e:
        app.logger.error(f"Database connection failed: {str(e)}")
        raise

def execute_query(query, params=None, commit=False):
    """Execute a database query and optionally commit changes."""
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute(query, params)
        if commit:
            conn.commit()
        return cursor
    except Exception as e:
        logger.error(f"Query execution failed: {str(e)}")
        raise

def fetch_one(query, params=None):
    """Execute a query and fetch one result."""
    cursor = execute_query(query, params)
    result = cursor.fetchone()
    cursor.close()
    return result

def fetch_all(query, params=None):
    """Execute a query and fetch all results."""
    cursor = execute_query(query, params)
    result = cursor.fetchall()
    cursor.close()
    return result

def insert(query, params=None):
    """Insert data and return the last inserted ID."""
    cursor = execute_query(query, params, commit=True)
    last_id = cursor.lastrowid
    cursor.close()
    return last_id

def update(query, params=None):
    """Update data and return the number of affected rows."""
    cursor = execute_query(query, params, commit=True)
    affected_rows = cursor.rowcount
    cursor.close()
    return affected_rows

def delete(query, params=None):
    """Delete data and return the number of affected rows."""
    cursor = execute_query(query, params, commit=True)
    affected_rows = cursor.rowcount
    cursor.close()
    return affected_rows 