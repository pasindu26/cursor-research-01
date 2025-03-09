"""
Authentication API module.
Handles user authentication, registration, and profile management.
"""

from flask import Blueprint

# Create a Blueprint for the auth routes
auth_bp = Blueprint('auth', __name__)

# Import controllers to register routes
from .controllers import *  # This will register all route handlers 