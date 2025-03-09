"""
Water360 Backend Application
----------------------------
Main application entry point.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Print environment variables for debugging (will be removed in production)
print(f"JWT_SECRET_KEY set: {'Yes' if os.getenv('JWT_SECRET_KEY') else 'No'}")
print(f"MYSQL_HOST: {os.getenv('MYSQL_HOST')}")
print(f"FRONTEND_URL: {os.getenv('FRONTEND_URL')}")

# Import modules
from core.database import init_db
from api import init_api

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Configure CORS - Allow requests from frontend
    frontend_url = os.getenv('FRONTEND_URL', 'http://3.90.109.69:3000')
    CORS(app, 
         resources={r"/*": {"origins": [frontend_url, "http://localhost:3000"]}},
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization"])
    
    # Configure database
    app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')
    app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'root')
    app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', '')
    app.config['MYSQL_DB'] = os.getenv('MYSQL_DB', 'water360')
    
    # Configure JWT
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'water360-super-secret-key-for-authentication')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400))  # 24 hours by default
    jwt = JWTManager(app)
    
    # Initialize database
    init_db(app)
    
    # Initialize API routes
    init_api(app)
    
    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Health check endpoint."""
        try:
            return jsonify({
                'status': 'healthy',
                'message': 'API is running correctly'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'message': str(e)
            }), 500
    
    # Add a catch-all route for OPTIONS requests to handle CORS preflight
    @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    @app.route('/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        return '', 204
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true')
