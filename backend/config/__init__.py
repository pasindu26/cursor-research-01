"""
Configuration management for the application.
This module loads the appropriate configuration based on the environment.
"""
import os
from flask import Flask

# Determine which config to load based on environment variable
ENV = os.getenv('FLASK_ENV', 'development')

# Import the appropriate config class
if ENV == 'production':
    from .production import ProductionConfig as Config
elif ENV == 'testing':
    from .testing import TestingConfig as Config
else:
    from .development import DevelopmentConfig as Config

def configure_app(app: Flask) -> None:
    """Apply configuration to Flask app instance."""
    app.config.from_object(Config)
    
    # Load configuration from environment variables prefixed with FLASK_
    app.config.from_prefixed_env()
    
    # Ensure the secret key is set
    if not app.config.get('SECRET_KEY'):
        app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
        if ENV == 'production':
            app.logger.warning('Using default SECRET_KEY in production. This is insecure.')
    
    # Configure logging based on environment
    if not app.debug:
        # In production, you might want to configure more robust logging
        import logging
        from logging.handlers import RotatingFileHandler
        
        log_dir = app.config.get('LOG_DIR', 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, 'app.log'),
            maxBytes=10485760,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s '
            '[in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO) 