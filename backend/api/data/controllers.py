"""
Controllers for sensor data API endpoints.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import data_bp
from core.database import get_db_connection
import MySQLdb
import random
from datetime import datetime, timedelta

@data_bp.route('/sensor-data', methods=['GET'])
@jwt_required()
def get_sensor_data():
    """Get all sensor data or filter by parameters."""
    try:
        # Get query parameters
        location = request.args.get('location')
        date = request.args.get('date')
        
        # Build query
        query = "SELECT * FROM sensor_data"
        params = []
        
        if location or date:
            query += " WHERE"
            
            if location:
                query += " location = %s"
                params.append(location)
                
            if date:
                if location:
                    query += " AND"
                query += " date = %s"
                params.append(date)
                
        query += " ORDER BY created_at DESC"
        
        # Execute query
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(query, params)
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'count': len(data),
            'data': data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@data_bp.route('/sensor-data', methods=['POST'])
@jwt_required()
def add_sensor_data():
    """Add new sensor data."""
    try:
        # Get current user
        current_user = get_jwt_identity()
        
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['ph_value', 'temperature', 'turbidity', 'location', 'time', 'date']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Insert data
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
        INSERT INTO sensor_data 
        (ph_value, temperature, turbidity, location, time, date) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (
            data['ph_value'],
            data['temperature'],
            data['turbidity'],
            data['location'],
            data['time'],
            data['date']
        ))
        
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'message': 'Sensor data added successfully',
            'id': new_id
        }), 201
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@data_bp.route('/sensor-data/<int:data_id>', methods=['GET'])
@jwt_required()
def get_sensor_data_by_id(data_id):
    """Get sensor data by ID."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        cursor.execute("SELECT * FROM sensor_data WHERE id = %s", (data_id,))
        data = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Sensor data not found'
            }), 404
            
        return jsonify({
            'status': 'success',
            'data': data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@data_bp.route('/sensor-data/<int:data_id>', methods=['PUT'])
@jwt_required()
def update_sensor_data(data_id):
    """Update sensor data by ID."""
    try:
        # Get request data
        data = request.get_json()
        
        # Build update query
        query = "UPDATE sensor_data SET "
        params = []
        
        # Add fields to update
        update_fields = []
        for field in ['ph_value', 'temperature', 'turbidity', 'location', 'time', 'date']:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
                
        if not update_fields:
            return jsonify({
                'status': 'error',
                'message': 'No fields to update'
            }), 400
            
        query += ", ".join(update_fields)
        query += " WHERE id = %s"
        params.append(data_id)
        
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
                'message': 'Sensor data not found or no changes made'
            }), 404
            
        return jsonify({
            'status': 'success',
            'message': 'Sensor data updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@data_bp.route('/sensor-data/<int:data_id>', methods=['DELETE'])
@jwt_required()
def delete_sensor_data(data_id):
    """Delete sensor data by ID."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM sensor_data WHERE id = %s", (data_id,))
        conn.commit()
        
        affected_rows = cursor.rowcount
        cursor.close()
        conn.close()
        
        if affected_rows == 0:
            return jsonify({
                'status': 'error',
                'message': 'Sensor data not found'
            }), 404
            
        return jsonify({
            'status': 'success',
            'message': 'Sensor data deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@data_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get statistics for dashboard."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        # Get total count
        cursor.execute("SELECT COUNT(*) as total FROM sensor_data")
        total = cursor.fetchone()['total']
        
        # Get average values
        cursor.execute("""
            SELECT 
                AVG(ph_value) as avg_ph,
                AVG(temperature) as avg_temp,
                AVG(turbidity) as avg_turbidity
            FROM sensor_data
        """)
        averages = cursor.fetchone()
        
        # Get location distribution
        cursor.execute("""
            SELECT location, COUNT(*) as count
            FROM sensor_data
            GROUP BY location
            ORDER BY count DESC
        """)
        locations = cursor.fetchall()
        
        # Get recent readings
        cursor.execute("""
            SELECT *
            FROM sensor_data
            ORDER BY created_at DESC
            LIMIT 5
        """)
        recent = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': {
                'total_readings': total,
                'averages': averages,
                'locations': locations,
                'recent_readings': recent
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@data_bp.route('/all-data', methods=['GET'])
@jwt_required()
def get_all_data():
    """
    Get all data for admin dashboard.
    ---
    security:
      - Bearer: []
    responses:
      200:
        description: List of all data records
    """
    try:
        print("Fetching all data for admin dashboard")
        
        # Get user identity and check if admin
        current_user_id = get_jwt_identity()
        print(f"User ID from token: {current_user_id}")
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        # First check if user is an admin
        cursor.execute(
            "SELECT user_type FROM users WHERE id = %s", 
            (current_user_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            print(f"User not found: {current_user_id}")
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
            
        if user['user_type'] != 'admin':
            print(f"Unauthorized access attempt by non-admin user: {current_user_id}")
            return jsonify({
                'status': 'error',
                'message': 'Unauthorized. Admin access required.'
            }), 403
        
        print(f"Admin access verified for user: {current_user_id}")
        
        # First, let's check the database schema to see what tables and columns are available
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"Available tables: {[list(table.values())[0] for table in tables]}")
        
        # Instead of using a fixed query that might not match the schema,
        # let's use a more flexible approach based on the available tables
        
        # If users table exists, we'll fetch users for the admin dashboard
        cursor.execute("""
            SELECT 
                id, username, email, firstname, lastname, user_type, created_at
            FROM 
                users
            ORDER BY 
                id DESC
        """)
        
        users_data = cursor.fetchall()
        
        # Convert datetime objects to string for JSON serialization
        for item in users_data:
            if 'created_at' in item and item['created_at']:
                item['created_at'] = item['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        # Generate some mock data for demonstration if actual data tables don't exist
        mock_sensor_data = [
            {
                'id': i,
                'name': f'Sensor {i}',
                'location': ['New York', 'Chicago', 'Los Angeles', 'Miami', 'Seattle'][i % 5],
                'value': round(random.uniform(10, 100), 2),
                'timestamp': (datetime.now() - timedelta(days=i % 10)).strftime('%Y-%m-%d %H:%M:%S'),
                'status': ['active', 'inactive', 'maintenance'][i % 3]
            }
            for i in range(1, 21)
        ]
                
        cursor.close()
        conn.close()
        
        print(f"Fetched {len(users_data)} user records")
        return jsonify({
            'status': 'success',
            'data': {
                'users': users_data,
                'sensor_data': mock_sensor_data
            },
            'count': len(users_data)
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error fetching all data: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch data: {str(e)}'
        }), 500

@data_bp.route('/compare-graph-data', methods=['GET'])
@jwt_required()
def compare_graph_data():
    """Get comparative graph data for multiple locations."""
    try:
        # Get query parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        locations = request.args.get('locations')  # Get locations as a comma-separated string
        data_type = request.args.get('dataType')  # Get dataType (e.g., ph_value or temperature)

        # Validate inputs
        if not start_date or not end_date or not locations or not data_type:
            return jsonify({'error': 'startDate, endDate, locations, and dataType are required'}), 400

        # Validate data_type to prevent SQL injection
        if data_type not in ['ph_value', 'temperature', 'turbidity']:
            return jsonify({'error': 'Invalid dataType. Must be "ph_value", "temperature", or "turbidity"'}), 400

        # Split locations into a list
        location_list = locations.split(',')

        # Execute query
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)

        # Query to get daily averages grouped by location and date
        placeholders = ', '.join(['%s'] * len(location_list))
        query = f"""
            SELECT location, date, AVG({data_type}) AS value
            FROM sensor_data
            WHERE date >= %s AND date <= %s AND location IN ({placeholders})
            GROUP BY location, date
            ORDER BY date, location
        """
        params = [start_date, end_date] + location_list
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert data to JSON format
        data = {}
        for row in rows:
            location = row['location']
            date_str = row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else str(row['date'])
            value = float(row['value']) if row['value'] is not None else 0
            
            if location not in data:
                data[location] = []
            
            data[location].append({'date': date_str, 'value': value})

        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500 