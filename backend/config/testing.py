"""Testing configuration."""
import os

class TestingConfig:
    """Testing configuration."""
    DEBUG = True
    TESTING = True
    
    # Use an in-memory database for testing
    MYSQL_HOST = os.getenv('TEST_MYSQL_HOST', 'localhost')
    MYSQL_USER = os.getenv('TEST_MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('TEST_MYSQL_PASSWORD', '')
    MYSQL_DB = os.getenv('TEST_MYSQL_DB', 'water360_test')
    
    # JWT Configuration with shorter expiration for testing
    JWT_SECRET_KEY = 'test-jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60  # 1 hour for testing
    
    # CORS settings
    CORS_HEADERS = 'Content-Type,Authorization'
    CORS_ORIGINS = ['*']  # Allow all origins in testing
    
    # Logging configuration
    LOG_LEVEL = 'DEBUG' 