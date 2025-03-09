"""
Authentication route handlers.
Implements the authentication API endpoints.
"""
from flask import request, jsonify, current_app
from . import auth_bp
from .services import (
    authenticate_user,
    register_user,
    validate_user_token
)
from utils.auth import token_required
import bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, decode_token
from core.database import get_db_connection
import MySQLdb
from functools import wraps
import jwt
import os
import logging

# Token required decorator for backward compatibility
def token_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        try:
            # Get current user identity from JWT
            user_id = get_jwt_identity()
            print(f"Token required: user_id from token: {user_id}")
            
            # Convert user_id to int if it's a string (depends on your DB schema)
            if isinstance(user_id, str):
                try:
                    user_id = int(user_id)
                    print(f"Converted user_id to int: {user_id}")
                except ValueError:
                    print(f"Could not convert user_id to int, using as is: {user_id}")
            
            # Get user details from database
            conn = get_db_connection()
            cursor = conn.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
            current_user = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not current_user:
                print(f"No user found for ID: {user_id}")
                return jsonify({'message': 'User not found'}), 404
                
            print(f"User authenticated: {current_user['username']}")
            return f(current_user, *args, **kwargs)
        except Exception as e:
            print(f"Token required decorator error: {str(e)}")
            return jsonify({'message': 'Authentication failed'}), 401
    return decorated

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint.
    ---
    parameters:
      - in: body
        name: credentials
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
            password:
              type: string
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            token:
              type: string
            user:
              type: object
      401:
        description: Invalid credentials
    """
    try:
        # Get request data
        data = request.get_json()
        print(f"Login attempt for username: {data.get('username')}")
        
        # Validate required fields
        if 'username' not in data or 'password' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Username and password are required'
            }), 400
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        cursor.execute(
            "SELECT * FROM users WHERE username = %s", 
            (data['username'],)
        )
        
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        # Check if user exists and password is correct
        if not user:
            print(f"User not found: {data.get('username')}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid username or password'
            }), 401
            
        # Verify password
        if not bcrypt.checkpw(
            data['password'].encode('utf-8'), 
            user['password'].encode('utf-8')
        ):
            print(f"Invalid password for user: {data.get('username')}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid username or password'
            }), 401
        
        print(f"Login successful for user: {data.get('username')}")
        
        # Create access token with a string subject (user_id as string)
        # Important: The subject must be a string for JWT decoding to work properly
        user_id_str = str(user['id'])
        print(f"Creating token with subject (user_id): {user_id_str}")
        
        # Additional claims for the token
        additional_claims = {
            'username': user['username'],
            'user_type': user['user_type']
        }
        
        # Create the token with the user_id as string in the subject
        access_token = create_access_token(
            identity=user_id_str,
            additional_claims=additional_claims
        )
        
        print(f"Token created successfully, length: {len(access_token)}")
        
        # Return success response with token and user data
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'token': access_token,
            'access_token': access_token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'firstname': user['firstname'],
                'lastname': user['lastname'],
                'email': user['email'],
                'user_type': user['user_type']
            }
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Login error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    User registration endpoint.
    ---
    parameters:
      - in: body
        name: user
        schema:
          type: object
          required:
            - firstname
            - lastname
            - username
            - email
            - password
          properties:
            firstname:
              type: string
            lastname:
              type: string
            username:
              type: string
            email:
              type: string
            password:
              type: string
            user_type:
              type: string
              enum: [customer, admin]
    responses:
      201:
        description: User created successfully
      400:
        description: Invalid data
      409:
        description: User already exists
    """
    data = request.json
    
    # Register user
    result = register_user(data)
    
    if not result['success']:
        return jsonify({
            'error': 'Registration failed',
            'message': result['message']
        }), result.get('status_code', 400)
    
    # Return success message
    return jsonify({
        'message': 'User registered successfully',
        'user_id': result['user_id']
    }), 201

@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated."""
    try:
        # Get the JWT token from the Authorization header
        auth_header = request.headers.get('Authorization')
        print(f"Auth header: {auth_header[:20] if auth_header else 'None'}")
        
        if not auth_header:
            return jsonify({
                'status': 'error',
                'message': 'Missing authorization header'
            }), 401
            
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'status': 'error',
                'message': 'Invalid authorization format. Must be Bearer token'
            }), 401
        
        token = auth_header.split(' ')[1]
        print(f"Token extracted: {token[:10]}...")
        
        # Verify the token
        try:
            # Use Flask-JWT-Extended to decode the token
            decoded_token = decode_token(token)
            print(f"Decoded token: {decoded_token}")
            
            # Extract user_id from sub claim
            user_id = decoded_token['sub']
            print(f"User ID from token: {user_id}")
            
            # Convert to int if needed (depends on your database schema)
            try:
                user_id = int(user_id)
                print(f"Converted user_id to int: {user_id}")
            except (ValueError, TypeError):
                print(f"Could not convert user_id to int, using as is: {user_id}")
                
        except jwt.ExpiredSignatureError:
            print("Token expired")
            return jsonify({
                'status': 'error',
                'message': 'Token has expired'
            }), 401
        except jwt.InvalidTokenError as e:
            print(f"Invalid token: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Invalid token: {str(e)}'
            }), 401
        except Exception as e:
            print(f"Token decode error: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Token validation error: {str(e)}'
            }), 401
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT id, username, email, firstname, lastname, user_type FROM users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            print(f"User not found for ID: {user_id}")
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 401
        
        print(f"User found: {user['username']}")
        # Return user data
        return jsonify({
            'status': 'success',
            'user': user
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Check auth error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Authentication check failed: {str(e)}'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """
    User logout endpoint.
    ---
    security:
      - Bearer: []
    responses:
      200:
        description: Logout successful
    """
    # In a stateless JWT setup, the client simply discards the token
    # This endpoint is provided for API consistency and future extensions
    return jsonify({
        'message': 'Logout successful'
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['firstname', 'lastname', 'username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Validate password
        password = data['password']
        if len(password) < 8:
            return jsonify({
                'status': 'error',
                'message': 'Password must be at least 8 characters long'
            }), 400
        
        # Check if username or email already exists
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        cursor.execute(
            "SELECT * FROM users WHERE username = %s OR email = %s", 
            (data['username'], data['email'])
        )
        
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            
            if existing_user['username'] == data['username']:
                return jsonify({
                    'status': 'error',
                    'message': 'Username already exists'
                }), 409
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Email already exists'
                }), 409
        
        # Hash password
        hashed_password = bcrypt.hashpw(
            data['password'].encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Insert new user
        cursor.execute(
            """
            INSERT INTO users 
            (firstname, lastname, username, email, password, user_type) 
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                data['firstname'],
                data['lastname'],
                data['username'],
                data['email'],
                hashed_password,
                data.get('user_type', 'customer')
            )
        )
        
        conn.commit()
        user_id = cursor.lastrowid
        
        cursor.close()
        conn.close()
        
        # Create access token
        access_token = create_access_token(identity={
            'id': user_id,
            'username': data['username'],
            'user_type': data.get('user_type', 'customer')
        })
        
        return jsonify({
            'status': 'success',
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': user_id,
                'username': data['username'],
                'firstname': data['firstname'],
                'lastname': data['lastname'],
                'email': data['email'],
                'user_type': data.get('user_type', 'customer')
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile."""
    try:
        # Get current user
        current_user = get_jwt_identity()
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        cursor.execute(
            "SELECT id, firstname, lastname, username, email, user_type FROM users WHERE id = %s", 
            (current_user['id'],)
        )
        
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'user': user
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile."""
    try:
        # Get current user
        current_user = get_jwt_identity()
        
        # Get request data
        data = request.get_json()
        
        # Build update query
        query = "UPDATE users SET "
        params = []
        
        # Add fields to update
        update_fields = []
        for field in ['firstname', 'lastname', 'email']:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
                
        if 'password' in data:
            update_fields.append("password = %s")
            hashed_password = bcrypt.hashpw(
                data['password'].encode('utf-8'), 
                bcrypt.gensalt()
            ).decode('utf-8')
            params.append(hashed_password)
                
        if not update_fields:
            return jsonify({
                'status': 'error',
                'message': 'No fields to update'
            }), 400
            
        query += ", ".join(update_fields)
        query += " WHERE id = %s"
        params.append(current_user['id'])
        
        # Execute update
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(query, params)
        conn.commit()
        
        affected_rows = cursor.rowcount
        cursor.close()
        conn.close()
        
        if affected_rows == 0:
            return jsonify({
                'status': 'error',
                'message': 'User not found or no changes made'
            }), 404
            
        return jsonify({
            'status': 'success',
            'message': 'Profile updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Add OPTIONS route handlers for CORS preflight requests
@auth_bp.route('/login', methods=['OPTIONS'])
@auth_bp.route('/signup', methods=['OPTIONS'])
@auth_bp.route('/check', methods=['OPTIONS'])
@auth_bp.route('/logout', methods=['OPTIONS'])
def auth_options():
    """Handle preflight requests for auth routes."""
    return '', 204 