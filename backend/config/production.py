"""Production configuration."""
import os

class ProductionConfig:
    """Production configuration."""
    DEBUG = False
    TESTING = False
    
    # Database configuration
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'mysql')  # Default to service name in Kubernetes
    MYSQL_USER = os.getenv('MYSQL_USER')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD')
    MYSQL_DB = os.getenv('MYSQL_DB', 'water360')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')  # Must be set in env
    JWT_ACCESS_TOKEN_EXPIRES = 24 * 60 * 60  # 24 hours in seconds
    
    # CORS settings - restrict to production domains
    CORS_HEADERS = 'Content-Type,Authorization'
    CORS_ORIGINS = [
        os.getenv('FRONTEND_URL', 'https://water360.example.com')
    ]
    
    # Logging configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO') 