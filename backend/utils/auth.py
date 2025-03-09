"""
Authentication utilities.
Provides token validation and user authentication functions.
"""
import jwt
from functools import wraps
from flask import request, jsonify, current_app
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

def get_token_from_header():
    """Extract the token from the Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ')[1]

def decode_token(token):
    """Decode a JWT token and return the payload."""
    try:
        return jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
    except jwt.ExpiredSignatureError:
        current_app.logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        current_app.logger.warning(f"Invalid token: {e}")
        return None

def generate_token(user_id, expiry=None):
    """Generate a JWT token for a user."""
    if expiry is None:
        expiry = datetime.utcnow() + timedelta(
            seconds=current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 24 * 60 * 60)
        )
    
    payload = {
        'user_id': user_id,
        'exp': expiry
    }
    
    return jwt.encode(
        payload,
        current_app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )

def token_required(f):
    """Decorator to protect routes with JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({'error': 'Token is missing', 'message': 'Authentication required'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired', 'message': 'Authentication required'}), 401
        
        # Get user from database
        from core.database import fetch_one
        
        user_id = payload.get('user_id')
        query = "SELECT id, firstname, lastname, username, email, user_type FROM users WHERE id = %s"
        user_data = fetch_one(query, (user_id,))
        
        if not user_data:
            return jsonify({'error': 'User not found', 'message': 'Authentication failed'}), 401
        
        # Create user object
        current_user = {
            'id': user_data[0],
            'firstname': user_data[1],
            'lastname': user_data[2],
            'username': user_data[3],
            'email': user_data[4],
            'user_type': user_data[5]
        }
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to protect routes that require admin privileges."""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('user_type') != 'admin':
            return jsonify({
                'error': 'Admin privileges required',
                'message': 'You do not have permission to access this resource'
            }), 403
        return f(current_user, *args, **kwargs)
    
    return decorated

def hash_password(password):
    """Hash a password using werkzeug's generate_password_hash."""
    return generate_password_hash(password)

def verify_password(hashed_password, password):
    """Verify a password against its hash using werkzeug's check_password_hash."""
    return check_password_hash(hashed_password, password) 