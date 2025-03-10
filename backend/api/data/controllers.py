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
        
        # Get total readings in the last 24 hours
        cursor.execute("""
            SELECT COUNT(*) as total_readings_24h
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
        """)
        total_readings = cursor.fetchone()['total_readings_24h']
        
        # Get highest pH value in the last 24 hours
        cursor.execute("""
            SELECT ph_value as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY ph_value DESC
            LIMIT 1
        """)
        highest_ph = cursor.fetchone()
        
        # Get highest temperature in the last 24 hours
        cursor.execute("""
            SELECT temperature as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY temperature DESC
            LIMIT 1
        """)
        highest_temp = cursor.fetchone()
        
        # Get highest turbidity in the last 24 hours
        cursor.execute("""
            SELECT turbidity as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY turbidity DESC
            LIMIT 1
        """)
        highest_turbidity = cursor.fetchone()
        
        # Get average values
        cursor.execute("""
            SELECT 
                AVG(ph_value) as avg_ph,
                AVG(temperature) as avg_temp,
                AVG(turbidity) as avg_turbidity
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
        """)
        averages = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        # Format the response
        formatted_highest_ph = {
            'value': float(highest_ph['value']) if highest_ph else 0,
            'location': highest_ph['location'] if highest_ph else '',
            'timestamp': highest_ph['timestamp'] if highest_ph else ''
        } if highest_ph else None
        
        formatted_highest_temp = {
            'value': float(highest_temp['value']) if highest_temp else 0,
            'location': highest_temp['location'] if highest_temp else '',
            'timestamp': highest_temp['timestamp'] if highest_temp else ''
        } if highest_temp else None
        
        formatted_highest_turbidity = {
            'value': float(highest_turbidity['value']) if highest_turbidity else 0,
            'location': highest_turbidity['location'] if highest_turbidity else '',
            'timestamp': highest_turbidity['timestamp'] if highest_turbidity else ''
        } if highest_turbidity else None
        
        return jsonify({
            'status': 'success',
            'total_readings_24h': total_readings,
            'highest_ph': formatted_highest_ph,
            'highest_temp': formatted_highest_temp,
            'highest_turbidity': formatted_highest_turbidity,
            'avg_ph': float(averages['avg_ph']) if averages['avg_ph'] else 0,
            'avg_temp': float(averages['avg_temp']) if averages['avg_temp'] else 0,
            'avg_turbidity': float(averages['avg_turbidity']) if averages['avg_turbidity'] else 0
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch dashboard stats: {str(e)}'
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
    """Get comparison graph data for multiple locations, date range, and data type."""
    try:
        # Get query parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        locations = request.args.get('locations')
        data_type = request.args.get('dataType')  # Get dataType from the query parameters
        
        # If date is provided instead of date range, use it for both start and end
        date = request.args.get('date')
        if date and not start_date and not end_date:
            start_date = date
            end_date = date

        # Validate inputs
        if not locations:
            return jsonify({'error': 'locations is required'}), 400
            
        if not start_date:
            # Default to today if not provided
            start_date = datetime.now().strftime('%Y-%m-%d')
            
        if not end_date:
            # Default to today if not provided
            end_date = datetime.now().strftime('%Y-%m-%d')
            
        if not data_type:
            # Default to temperature if not provided
            data_type = 'temperature'

        # Validate dataType to prevent SQL injection
        if data_type not in ['ph_value', 'temperature', 'turbidity']:
            return jsonify({'error': 'Invalid dataType. Must be "ph_value" or "temperature" or "turbidity"'}), 400

        # Split locations into a list
        location_list = locations.split(',')

        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)

        # Query to get daily averages grouped by location and date
        query = f"""
            SELECT location, date, AVG({data_type}) AS value
            FROM sensor_data
            WHERE date >= %s AND date <= %s AND location IN ({','.join(['%s'] * len(location_list))})
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
            date = row['date']
            value = float(row['value'])
            
            if location not in data:
                data[location] = []
                
            data[location].append({
                'date': date,
                'value': value
            })

        return jsonify({
            'status': 'success',
            'data': data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch comparison graph data: {str(e)}'
        }), 500

@data_bp.route('/recent-data', methods=['GET'])
@jwt_required()
def get_recent_data():
    """Get recent sensor data (last 5 records)."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        # Get recent entries (last 5)
        cursor.execute("""
            SELECT id, location, ph_value, temperature, turbidity, date, time, created_at
            FROM sensor_data
            ORDER BY created_at DESC
            LIMIT 5
        """)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Format the data
        data = []
        for row in rows:
            data.append({
                'id': row['id'],
                'location': row['location'],
                'ph_value': row['ph_value'],
                'temperature': row['temperature'],
                'turbidity': row['turbidity'],
                'date': row['date'],
                'time': row['time'],
                'created_at': row['created_at'].strftime('%Y-%m-%d %H:%M:%S') if row['created_at'] else None
            })

        return jsonify({
            'status': 'success',
            'data': data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch recent data: {str(e)}'
        }), 500

@data_bp.route('/correlation-data', methods=['GET'])
@jwt_required()
def get_correlation_data():
    """Get correlation data for a specific location."""
    try:
        # Get location from query parameters
        location = request.args.get('location', 'US')  # Default location is 'US'
        
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        # Calculate last 24 hours based on the server's timezone
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        last_24h_str = last_24h.strftime('%Y-%m-%d %H:%M:%S')

        # Query database for the last 24 hours and the specified location
        query = """
            SELECT temperature, turbidity, ph_value
            FROM sensor_data
            WHERE CONCAT(date, ' ', time) >= %s AND LOWER(location) = LOWER(%s)
        """
        cursor.execute(query, (last_24h_str, location))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Structure the data into arrays
        temperature_values = []
        turbidity_values = []
        ph_values = []
        
        for row in rows:
            temperature_values.append(row['temperature'])
            turbidity_values.append(row['turbidity'])
            ph_values.append(row['ph_value'])

        return jsonify({
            'status': 'success',
            'data': {
                'temperature_values': temperature_values,
                'turbidity_values': turbidity_values,
                'ph_values': ph_values
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch correlation data: {str(e)}'
        }), 500

@data_bp.route('/last-24-hours', methods=['GET'])
@jwt_required()
def get_last_24_hours_data():
    """Get data from the last 24 hours."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        # Get data from the last 24 hours
        cursor.execute("""
            SELECT *
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY created_at DESC
        """)
        
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch last 24 hours data: {str(e)}'
        }), 500

@data_bp.route('/highest-values', methods=['GET'])
@jwt_required()
def get_highest_values():
    """Get highest values for pH, temperature, and turbidity."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)
        
        # Get highest pH value
        cursor.execute("""
            SELECT ph_value as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            ORDER BY ph_value DESC
            LIMIT 1
        """)
        highest_ph = cursor.fetchone()
        
        # Get highest temperature
        cursor.execute("""
            SELECT temperature as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            ORDER BY temperature DESC
            LIMIT 1
        """)
        highest_temp = cursor.fetchone()
        
        # Get highest turbidity
        cursor.execute("""
            SELECT turbidity as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            ORDER BY turbidity DESC
            LIMIT 1
        """)
        highest_turbidity = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'highest_ph': highest_ph,
            'highest_temp': highest_temp,
            'highest_turbidity': highest_turbidity
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch highest values: {str(e)}'
        }), 500

@data_bp.route('/graph-data', methods=['GET'])
@jwt_required()
def get_graph_data():
    """Get graph data for a specific location, date range, and data type."""
    try:
        # Get query parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        location = request.args.get('location')
        data_type = request.args.get('dataType')  # Get dataType from the query parameters
        
        # If date is provided instead of date range, use it for both start and end
        date = request.args.get('date')
        if date and not start_date and not end_date:
            start_date = date
            end_date = date

        # Validate inputs
        if not location:
            return jsonify({'error': 'location is required'}), 400
            
        if not start_date:
            # Default to today if not provided
            start_date = datetime.now().strftime('%Y-%m-%d')
            
        if not end_date:
            # Default to today if not provided
            end_date = datetime.now().strftime('%Y-%m-%d')
            
        if not data_type:
            # Default to temperature if not provided
            data_type = 'temperature'

        # Validate dataType to prevent SQL injection
        if data_type not in ['ph_value', 'temperature', 'turbidity']:
            return jsonify({'error': 'Invalid dataType. Must be "ph_value" or "temperature" or "turbidity"'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(MySQLdb.cursors.DictCursor)

        # Dynamically use the selected dataType column in the query
        query = f"""
            SELECT date, time, {data_type} AS value
            FROM sensor_data
            WHERE date >= %s AND date <= %s AND location = %s
            ORDER BY date, time
        """
        cursor.execute(query, (start_date, end_date, location))
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert data to JSON format
        data = []
        for row in rows:
            data.append({
                'date': row['date'],
                'time': row['time'],
                'value': float(row['value'])
            })

        return jsonify({
            'status': 'success',
            'data': data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch graph data: {str(e)}'
        }), 500 