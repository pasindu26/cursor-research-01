"""
Data API module for handling sensor data operations.
"""

from flask import Blueprint

# Create a Blueprint for the data routes
data_bp = Blueprint('data', __name__)

# Import controllers to register routes
from .controllers import *  # This will register all route handlers 