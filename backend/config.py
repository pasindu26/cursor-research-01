# config.py

import os
from dotenv import load_dotenv

load_dotenv()

class BaseConfig:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_default_secret_key')
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DB = os.getenv('MYSQL_DB', 'default_db')
    DEBUG = False
    TESTING = False
    CORS_ORIGIN = os.getenv('CORS_ORIGIN', 'http://localhost:3000')

class DevelopmentConfig(BaseConfig):
    DEBUG = True

class TestingConfig(BaseConfig):
    TESTING = True

class ProductionConfig(BaseConfig):
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY is not set for the production environment!")
    # Add other production configurations here

def get_config():
    environment = os.getenv('FLASK_ENV', 'development').lower()
    if environment == 'development':
        return DevelopmentConfig()
    elif environment == 'testing':
        return TestingConfig()
    elif environment == 'production':
        return ProductionConfig()
    else:
        raise ValueError(f"Invalid FLASK_ENV: {environment}")
