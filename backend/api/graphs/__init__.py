"""
Graphs API Blueprint.
Handles graph data and visualization endpoints.
"""
from flask import Blueprint

# Create the graphs blueprint
graphs_bp = Blueprint('graphs', __name__, url_prefix='/graphs')

# Import and register routes
from .controllers import *  # This will register all route handlers 