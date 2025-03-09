"""
Middleware components for the application.
Contains CORS configuration, error handlers, and other middleware.
"""
from flask import Flask, jsonify, request
from flask_cors import CORS

def init_middleware(app: Flask) -> None:
    """Initialize middleware components."""
    # Configure CORS
    configure_cors(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Add request hooks
    register_request_hooks(app)

def configure_cors(app: Flask) -> None:
    """Configure CORS for the application."""
    # Get CORS configuration from app config
    origins = app.config.get('CORS_ORIGINS', ['*'])
    headers = app.config.get('CORS_HEADERS', 'Content-Type,Authorization')
    methods = app.config.get('CORS_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Initialize CORS
    CORS(app, resources={
        r"/*": {
            "origins": origins,
            "allow_headers": headers,
            "methods": methods,
            "supports_credentials": True
        }
    })
    
    # Log CORS configuration
    app.logger.info(f"CORS configured with origins: {origins}")

def register_error_handlers(app: Flask) -> None:
    """Register error handlers."""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors."""
        return jsonify({
            'error': 'Bad Request',
            'message': str(error) or 'Invalid request parameters'
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 Unauthorized errors."""
        return jsonify({
            'error': 'Unauthorized',
            'message': str(error) or 'Authentication required'
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 Forbidden errors."""
        return jsonify({
            'error': 'Forbidden',
            'message': str(error) or 'You do not have permission to access this resource'
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors."""
        return jsonify({
            'error': 'Not Found',
            'message': str(error) or 'Resource not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error errors."""
        # Log the error for debugging
        app.logger.error(f"Internal Server Error: {error}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500

def register_request_hooks(app: Flask) -> None:
    """Register request hooks."""
    
    @app.before_request
    def log_request_info():
        """Log request information."""
        if app.debug:
            app.logger.debug(f"Request: {request.method} {request.path}")
    
    @app.after_request
    def add_security_headers(response):
        """Add security headers to responses."""
        # Add security headers if not in debug mode
        if not app.debug:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'SAMEORIGIN'
            response.headers['X-XSS-Protection'] = '1; mode=block'
        return response 