"""
API module initialization.
This module initializes all API blueprints and registers them with the Flask app.
"""

from flask import Blueprint

# Create a main API blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api')

def init_api(app):
    """Initialize all API blueprints and register them with the app."""
    # Import blueprints
    from .auth import auth_bp
    from .data import data_bp
    
    # Register blueprints with the main API blueprint
    api_bp.register_blueprint(auth_bp, url_prefix='/auth')
    api_bp.register_blueprint(data_bp, url_prefix='/data')
    
    # Register the main API blueprint with the app
    app.register_blueprint(api_bp)
    
    # Register auth routes directly at the root level for compatibility with frontend
    app.register_blueprint(auth_bp, url_prefix='')
    
    app.logger.info('API routes registered successfully') 