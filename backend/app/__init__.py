# app/__init__.py

from flask import Flask
import os
import sys

# Add the parent directory to the Python path to allow importing from the root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Now we can import get_config from the root config.py
from config import get_config

from flask_mysqldb import MySQL
from flask_cors import CORS

# Initialize MySQL
mysql = MySQL()

def create_app():
    app = Flask(__name__)

    # Load configurations
    config = get_config()
    app.config.from_object(config)

    # Enable CORS with proper configuration
    CORS(app, 
         resources={r"/*": {
             "origins": app.config.get('CORS_ORIGIN', 'http://localhost:3000'),
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
             "supports_credentials": True,
             "max_age": 86400  # 24 hours
         }},
         supports_credentials=True
    )

    # Initialize MySQL
    mysql.init_app(app)

    # Register Blueprints
    from routes import api
    app.register_blueprint(api)

    return app
