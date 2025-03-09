"""
Authentication business logic.
Implements the core authentication functionality.
"""
from flask import current_app
from core.database import fetch_one, insert
from utils.auth import generate_token, verify_password, hash_password
from datetime import datetime, timedelta

def authenticate_user(username, password):
    """
    Authenticate a user with username and password.
    Returns a dict with success flag, message, and data.
    """
    try:
        # Find user by username
        query = "SELECT * FROM users WHERE username = %s"
        user_data = fetch_one(query, (username,))
        
        # Check if user exists and password is correct
        if not user_data or not verify_password(user_data[4], password):
            return {
                'success': False,
                'message': 'Invalid username or password'
            }
        
        # Generate token
        token = generate_token(user_data[0])
        
        # Create user object (without password)
        user = {
            'id': user_data[0],
            'firstname': user_data[1],
            'lastname': user_data[2],
            'username': user_data[3],
            'email': user_data[5],
            'user_type': user_data[6]
        }
        
        return {
            'success': True,
            'data': {
                'token': token,
                'user': user
            }
        }
    
    except Exception as e:
        current_app.logger.error(f"Authentication error: {e}")
        return {
            'success': False,
            'message': 'An error occurred during authentication'
        }

def register_user(user_data):
    """
    Register a new user.
    Returns a dict with success flag, message, and user_id.
    """
    try:
        # Extract user data
        firstname = user_data.get('firstname')
        lastname = user_data.get('lastname')
        username = user_data.get('username')
        email = user_data.get('email')
        password = user_data.get('password')
        user_type = user_data.get('user_type', 'customer')
        
        # Validate required fields
        if not all([firstname, lastname, username, email, password]):
            return {
                'success': False,
                'message': 'All fields are required',
                'status_code': 400
            }
        
        # Validate password
        if len(password) < 6 or not any(char.isdigit() for char in password):
            return {
                'success': False,
                'message': 'Password must be at least 6 characters long and contain at least one number',
                'status_code': 400
            }
        
        # Validate user type
        if user_type not in ['customer', 'admin']:
            return {
                'success': False,
                'message': 'Invalid user type',
                'status_code': 400
            }
        
        # Check if user already exists
        query = "SELECT * FROM users WHERE username = %s OR email = %s"
        existing_user = fetch_one(query, (username, email))
        
        if existing_user:
            return {
                'success': False,
                'message': 'Username or email already exists',
                'status_code': 409
            }
        
        # Hash password
        hashed_password = hash_password(password)
        
        # Insert user into database
        query = """
            INSERT INTO users (firstname, lastname, username, password, email, user_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        user_id = insert(query, (firstname, lastname, username, hashed_password, email, user_type))
        
        return {
            'success': True,
            'user_id': user_id
        }
    
    except Exception as e:
        current_app.logger.error(f"Registration error: {e}")
        return {
            'success': False,
            'message': 'An error occurred during registration',
            'status_code': 500
        }

def validate_user_token(token):
    """
    Validate a user token.
    Returns a dict with success flag, message, and user data.
    """
    try:
        from utils.auth import decode_token
        
        # Decode token
        payload = decode_token(token)
        if not payload:
            return {
                'success': False,
                'message': 'Invalid or expired token'
            }
        
        # Get user from database
        user_id = payload.get('user_id')
        query = "SELECT id, firstname, lastname, username, email, user_type FROM users WHERE id = %s"
        user_data = fetch_one(query, (user_id,))
        
        if not user_data:
            return {
                'success': False,
                'message': 'User not found'
            }
        
        # Create user object
        user = {
            'id': user_data[0],
            'firstname': user_data[1],
            'lastname': user_data[2],
            'username': user_data[3],
            'email': user_data[4],
            'user_type': user_data[5]
        }
        
        return {
            'success': True,
            'user': user
        }
    
    except Exception as e:
        current_app.logger.error(f"Token validation error: {e}")
        return {
            'success': False,
            'message': 'An error occurred during token validation'
        } 