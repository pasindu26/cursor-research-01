# routes/__init__.py

from flask import Blueprint, request, jsonify, current_app as app
import jwt
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from app import mysql
from models import User
from flask_jwt_extended import jwt_required, get_jwt_identity

api = Blueprint('api', __name__)

def token_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        try:
            # Get current user identity from JWT
            user_id = get_jwt_identity()
            
            # Convert user_id to int if it's a string
            if isinstance(user_id, str):
                try:
                    user_id = int(user_id)
                except ValueError:
                    return jsonify({'message': 'Invalid user ID in token'}), 401
            
            # Fetch the user from the database
            cur = mysql.connection.cursor()
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user_data = cur.fetchone()
            cur.close()
            
            if not user_data:
                return jsonify({'message': 'User not found'}), 401
                
            current_user = User(
                id=user_data[0],
                firstname=user_data[1],
                lastname=user_data[2],
                username=user_data[3],
                password=user_data[4],
                email=user_data[5],
                user_type=user_data[6]
            )
            
            return f(current_user, *args, **kwargs)
        except Exception as e:
            return jsonify({'message': f'Authentication failed: {str(e)}'}), 401
    return decorated

# Add preflight request handler for all routes
@api.route('/<path:path>', methods=['OPTIONS'])
def handle_preflight(path):
    return '', 204

# Add auth verification endpoint
@api.route('/check', methods=['GET', 'OPTIONS'])
def check_auth():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 204
    
    @token_required
    def verify_token(current_user):
        user = {
            'id': current_user.id,
            'firstname': current_user.firstname,
            'lastname': current_user.lastname,
            'username': current_user.username,
            'email': current_user.email,
            'user_type': current_user.user_type
        }
        return jsonify({'message': 'Token is valid', 'user': user}), 200
    
    return verify_token()

#from loginpage.js
@api.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Please provide both username and password'}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s", (username,))
        user_data = cur.fetchone()
        cur.close()

        if user_data and check_password_hash(user_data[4], password):
            token = jwt.encode(
                {'user_id': user_data[0], 'exp': datetime.utcnow() + timedelta(hours=24)},
                app.config['SECRET_KEY'],
                algorithm='HS256'
            )
            user = {
                'id': user_data[0],
                'firstname': user_data[1],
                'lastname': user_data[2],
                'username': user_data[3],
                'email': user_data[5],
                'user_type': user_data[6]
            }
            return jsonify({'token': token, 'user': user}), 200
        else:
            return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        app.logger.error(f"Error during login: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

#from signup.js
@api.route('/signup', methods=['POST'])
def signup():
    data = request.json
    firstname = data.get('firstname')
    lastname = data.get('lastname')
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    user_type = data.get('user_type', 'customer')

    if not all([firstname, lastname, username, password, email]):
        return jsonify({'error': 'Please fill in all required fields.'}), 400

    if len(password) < 6 or not any(char.isdigit() for char in password):
        return jsonify({'error': 'Password must be at least 6 characters long and contain numbers.'}), 400

    if user_type not in ['customer', 'admin']:
        return jsonify({'error': 'Invalid user type.'}), 400

    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s OR email = %s", (username, email))
        existing_user = cur.fetchone()
        if existing_user:
            return jsonify({'error': 'Username or email already exists.'}), 400

        hashed_password = generate_password_hash(password)

        cur.execute("""
            INSERT INTO users (firstname, lastname, username, password, email, user_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (firstname, lastname, username, hashed_password, email, user_type))
        mysql.connection.commit()
        cur.close()

        return jsonify({'message': 'User registered successfully.'}), 201
    except Exception as e:
        app.logger.error(f"Error during signup: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

# for Homepage.js
@api.route('/summary-insights', methods=['GET'])
@token_required
def summary_insights(current_user):
    try:
        cur = mysql.connection.cursor()
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        last_24h_str = last_24h.strftime('%Y-%m-%d %H:%M:%S')

        parameters = ['ph_value', 'temperature', 'turbidity']
        summary = {}

        for param in parameters:
            cur.execute(f"""
                SELECT {param}, location
                FROM sensor_data
                WHERE CONCAT(date, ' ', time) >= %s
                AND {param} = (SELECT MAX({param}) FROM sensor_data WHERE CONCAT(date, ' ', time) >= %s)
            """, (last_24h_str, last_24h_str))
            highest = cur.fetchall()

            cur.execute(f"""
                SELECT {param}, location
                FROM sensor_data
                WHERE CONCAT(date, ' ', time) >= %s
                AND {param} = (SELECT MIN({param}) FROM sensor_data WHERE CONCAT(date, ' ', time) >= %s)
            """, (last_24h_str, last_24h_str))
            lowest = cur.fetchall()

            summary[param] = {
                'highest': [{'value': row[0], 'location': row[1]} for row in highest],
                'lowest': [{'value': row[0], 'location': row[1]} for row in lowest]
            }

        cur.close()
        return jsonify(summary), 200
    except Exception as e:
        app.logger.error(f"Error retrieving summary insights: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

# Similarly update other protected routes using @token_required

# For example, the 'warnings' route:
@api.route('/warnings', methods=['GET'])
@token_required
def get_warnings(current_user):
    try:
        cur = mysql.connection.cursor()
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        last_24h_str = last_24h.strftime('%Y-%m-%d %H:%M:%S')

        thresholds = {
            'ph_value': (6.5, 8.5),
            'temperature': (0, 33),
            'turbidity': (1, 5)
        }

        warnings = []

        for param, (min_val, max_val) in thresholds.items():
            cur.execute(f"""
                SELECT DISTINCT location
                FROM sensor_data
                WHERE CONCAT(date, ' ', time) >= %s
                AND ({param} < %s OR {param} > %s)
            """, (last_24h_str, min_val, max_val))
            locations = [row[0] for row in cur.fetchall()]
            if locations:
                warnings.append({
                    'parameter': param,
                    'locations': locations,
                    'message': f"{param.replace('_', ' ').title()} out of safe limits in: {', '.join(locations)}"
                })

        cur.close()
        return jsonify(warnings), 200
    except Exception as e:
        app.logger.error(f"Error retrieving warnings: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

# Continue updating other routes like 'correlation-data', 'recent-data' similarly 
'''
# for Homepage.js
@api.route('/correlation-data', methods=['GET'])
@token_required
def correlation_data(current_user):
    from app import mysql  # Import here to avoid circular import
    from datetime import datetime, timedelta

    location = request.args.get('location')
    if not location:
        location = 'US'  # Default location

    try:
        cur = mysql.connection.cursor()
        # Get data from the last 24 hours for the given location
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        last_24h_str = last_24h.strftime('%Y-%m-%d %H:%M:%S')

        cur.execute("""
            SELECT temperature, turbidity, ph_value
            FROM sensor_data
            WHERE CONCAT(date, ' ', time) >= %s AND location = %s
        """, (last_24h_str, location))
        rows = cur.fetchall()
        cur.close()

        data = {
            'temperature': [],
            'turbidity': [],
            'ph_value': []
        }
        for row in rows:
            data['temperature'].append(row[0])
            data['turbidity'].append(row[1])
            data['ph_value'].append(row[2])

        return jsonify(data), 200
    except Exception as e:
        app.logger.error(f"Error retrieving correlation data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500
'''

@api.route('/correlation-data', methods=['GET'])
@jwt_required()
def correlation_data_route():
    try:
        # Get user ID from JWT token
        user_id = get_jwt_identity()
        
        # Get location from query parameters
        location = request.args.get('location', 'US')  # Default location is 'US'
        
        # Now fetch the correlation data
        cur = mysql.connection.cursor()
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
        cur.execute(query, (last_24h_str, location))
        rows = cur.fetchall()
        cur.close()

        # Structure the data into arrays
        temperature_values = []
        turbidity_values = []
        ph_values = []
        
        for row in rows:
            temperature_values.append(row[0])
            turbidity_values.append(row[1])
            ph_values.append(row[2])

        return jsonify({
            'status': 'success',
            'data': {
                'temperature_values': temperature_values,
                'turbidity_values': turbidity_values,
                'ph_values': ph_values
            }
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error retrieving correlation data: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch correlation data: {str(e)}'
        }), 500

# for Homepage.js
@api.route('/recent-data', methods=['GET'])
@jwt_required()
def recent_data_route():
    try:
        # Get user ID from JWT token
        user_id = get_jwt_identity()
        
        # Now fetch the recent data
        cur = mysql.connection.cursor()
        # Get recent entries (last 5)
        cur.execute("""
            SELECT id, location, ph_value, temperature, turbidity, date, time, created_at
            FROM sensor_data
            ORDER BY created_at DESC
            LIMIT 5
        """)
        rows = cur.fetchall()
        cur.close()

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
        app.logger.error(f"Error retrieving recent data: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch recent data: {str(e)}'
        }), 500


#-------------------------------------

# live-update nav page
@api.route('/data', methods=['GET'])
@token_required
def get_data(current_user):
    from app import mysql  # Import here to avoid circular import

    date_filter = request.args.get('date')
    location_filter = request.args.get('location')

    try:
        cur = mysql.connection.cursor()
        query = "SELECT * FROM sensor_data"
        filters = []
        params = []

        # Add filters if provided
        if date_filter:
            filters.append("date = %s")
            params.append(date_filter)
        if location_filter:
            filters.append("location = %s")
            params.append(location_filter)

        # Append filters to the query if any
        if filters:
            query += " WHERE " + " AND ".join(filters)

        # Add ORDER BY clause to sort by id in descending order
        query += " ORDER BY id DESC"

        cur.execute(query, params)
        rows = cur.fetchall()

        # Handle cases where no rows are returned
        if not rows:
            return jsonify({'message': 'No data found'}), 404

        # Ensure cur.description is not None
        if cur.description:
            columns = [desc[0] for desc in cur.description]
            data = [dict(zip(columns, row)) for row in rows]
        else:
            data = []

        cur.close()
        return jsonify(data), 200
    except Exception as e:
        app.logger.error(f"Error retrieving data: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500


#from the graph  from NAV 
@api.route('/graph-data', methods=['GET'])
@token_required
def get_graph_data(current_user):
    from app import mysql  # Import here to avoid circular import

    # Get query parameters
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    location = request.args.get('location')
    data_type = request.args.get('dataType')  # Get dataType from the query parameters

    # Validate inputs
    if not start_date or not end_date or not location or not data_type:
        return jsonify({'error': 'startDate, endDate, location, and dataType are required'}), 400

    # Validate dataType to prevent SQL injection
    if data_type not in ['ph_value', 'temperature', 'turbidity']:
        return jsonify({'error': 'Invalid dataType. Must be "ph_value" or "temperature" or "turbidity"'}), 400

    try:
        cur = mysql.connection.cursor()

        # Dynamically use the selected dataType column in the query
        query = f"""
            SELECT date, AVG({data_type}) AS value
            FROM sensor_data
            WHERE date >= %s AND date <= %s AND location = %s
            GROUP BY date
            ORDER BY date
        """
        cur.execute(query, (start_date, end_date, location))
        rows = cur.fetchall()
        cur.close()

        # Convert data to JSON format
        data = [{'date': row[0], 'value': row[1]} for row in rows]

        return jsonify(data), 200
    except Exception as e:
        app.logger.error(f"Error retrieving graph data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500


# compare_graph NAV
@api.route('/compare-graph-data', methods=['GET'])
@token_required
def compare_graph_data(current_user):
    from app import mysql  # Import here to avoid circular import

    # Get query parameters
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    locations = request.args.get('locations')  # Get locations as a comma-separated string
    data_type = request.args.get('dataType')  # Get dataType (e.g., ph_value or temperature)

    # Validate inputs
    if not start_date or not end_date or not locations or not data_type:
        return jsonify({'error': 'startDate, endDate, locations, and dataType are required'}), 400

    # Validate data_type to prevent SQL injection
    if data_type not in ['ph_value', 'temperature','turbidity']:
        return jsonify({'error': 'Invalid dataType. Must be "ph_value" or "temperature" or "turbidity"'}), 400

    try:
        # Split locations into a list
        location_list = locations.split(',')

        cur = mysql.connection.cursor()

        # Query to get daily averages grouped by location and date
        query = f"""
            SELECT location, date, AVG({data_type}) AS value
            FROM sensor_data
            WHERE date >= %s AND date <= %s AND location IN ({','.join(['%s'] * len(location_list))})
            GROUP BY location, date
            ORDER BY date, location
        """
        params = [start_date, end_date] + location_list
        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()

        # Convert data to JSON format
        data = {}
        for row in rows:
            location, date, value = row
            if location not in data:
                data[location] = []
            data[location].append({'date': date, 'value': value})

        return jsonify(data), 200
    except Exception as e:
        app.logger.error(f"Error retrieving comparison graph data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500
    
#-------------------------------------------------------------------

@api.route('/all-data', methods=['GET'])
@token_required
def all_data(current_user):
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, location, ph_value, temperature, turbidity, date, time
            FROM sensor_data
            ORDER BY date DESC, time DESC
        """)
        rows = cur.fetchall()
        cur.close()

        columns = ['id', 'location', 'ph_value', 'temperature', 'turbidity', 'date', 'time']
        data = [dict(zip(columns, row)) for row in rows]

        return jsonify(data), 200
    except Exception as e:
        app.logger.error(f"Error retrieving all data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500


@api.route('/create-data', methods=['POST'])
@token_required
def create_data(current_user):
    from app import mysql
    from datetime import datetime

    try:
        data = request.json
        location = data.get('location')
        ph_value = data.get('ph_value')
        temperature = data.get('temperature')
        turbidity = data.get('turbidity')

        if not all([location, ph_value, temperature, turbidity]):
            return jsonify({'error': 'All fields are required'}), 400

        now = datetime.now()
        date = now.strftime('%Y-%m-%d')
        time = now.strftime('%H:%M:%S')

        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO sensor_data (location, ph_value, temperature, turbidity, date, time)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (location, ph_value, temperature, turbidity, date, time))
        mysql.connection.commit()
        cur.close()

        return jsonify({'message': 'Record created successfully'}), 201
    except Exception as e:
        app.logger.error(f"Error creating new record: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500



@api.route('/delete-data/<int:id>', methods=['OPTIONS', 'DELETE'])
@token_required
def delete_data(current_user, id):
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM sensor_data WHERE id = %s", (id,))
        mysql.connection.commit()
        affected_rows = cur.rowcount
        cur.close()

        if affected_rows == 0:
            return jsonify({'message': 'No record found with that ID'}), 404

        return jsonify({'message': 'Record deleted successfully'}), 200
    except Exception as e:
        app.logger.error(f"Error deleting data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

@api.route('/update-data/<int:id>', methods=['OPTIONS', 'PUT'])
@token_required
def update_data(current_user, id):
    try:
        data = request.get_json()
        location = data.get('location')
        ph_value = data.get('ph_value')
        temperature = data.get('temperature')
        turbidity = data.get('turbidity')

        if not all([location, ph_value, temperature, turbidity]):
            return jsonify({'error': 'All fields are required'}), 400

        cur = mysql.connection.cursor()
        cur.execute("""
            UPDATE sensor_data
            SET location = %s, ph_value = %s, temperature = %s, turbidity = %s
            WHERE id = %s
        """, (location, ph_value, temperature, turbidity, id))
        mysql.connection.commit()
        affected_rows = cur.rowcount
        cur.close()

        if affected_rows == 0:
            return jsonify({'message': 'No record found with that ID or no changes made'}), 404

        return jsonify({'message': 'Record updated successfully'}), 200
    except Exception as e:
        app.logger.error(f"Error updating data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500



#------------------------------for project using JOSN FORMAT

@api.route('/test-create-data', methods=['POST'])
def test_create_data():
    from app import mysql
    from datetime import datetime

    try:
        # Extract data from the request
        data = request.json
        location = data.get('location')
        ph_value = data.get('ph_value')
        temperature = data.get('temperature')
        turbidity = data.get('turbidity')

        # Validate required fields
        if not all([location, ph_value, temperature, turbidity]):
            return jsonify({'error': 'All fields are required'}), 400

        # Automatically set current date and time
        now = datetime.now()
        date = now.strftime('%Y-%m-%d')
        time = now.strftime('%H:%M:%S')

        # Insert data into the database
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO sensor_data (location, ph_value, temperature, turbidity, date, time)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (location, ph_value, temperature, turbidity, date, time))
        mysql.connection.commit()
        cur.close()

        return jsonify({'message': 'Record added successfully for testing'}), 201
    except Exception as e:
        app.logger.error(f"Error creating test record: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500


#------------------------------for project using JOSN FORMAT

@api.route('/test-create-data-url', methods=['GET'])
def test_create_data_url():
    from app import mysql
    from datetime import datetime

    try:
        # Extract data from query parameters
        location = request.args.get('location')
        ph_value = request.args.get('ph_value')
        temperature = request.args.get('temperature')
        turbidity = request.args.get('turbidity')

        # Validate required fields
        if not all([location, ph_value, temperature, turbidity]):
            return jsonify({'error': 'All query parameters are required'}), 400

        # Automatically set current date and time
        now = datetime.now()
        date = now.strftime('%Y-%m-%d')
        time = now.strftime('%H:%M:%S')

        # Insert data into the database
        cur = mysql.connection.cursor()
        cur.execute("""
            INSERT INTO sensor_data (location, ph_value, temperature, turbidity, date, time)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (location, ph_value, temperature, turbidity, date, time))
        mysql.connection.commit()
        cur.close()

        return jsonify({'message': 'Record added successfully via URL'}), 201
    except Exception as e:
        app.logger.error(f"Error creating record via URL: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500


@api.route('/data-old', methods=['POST'])
def data_old():
    from app import mysql

    try:
        # Extract data from the POST request
        data = request.form

        location = data.get('location')
        ph_value = data.get('ph_value')
        temperature = data.get('temperature')
        turbidity = data.get('turbidity')
        date = data.get('date')
        time = data.get('time')

        # Validate required fields
        if not all([location, ph_value, temperature, turbidity, date, time]):
            return jsonify({'error': 'All fields (location, ph_value, temperature, turbidity, date, time) are required'}), 400

        # Insert data into the database
        cur = mysql.connection.cursor()
        query = """
            INSERT INTO sensor_data (location, ph_value, temperature, turbidity, date, time)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cur.execute(query, (location, ph_value, temperature, turbidity, date, time))
        mysql.connection.commit()
        cur.close()

        return jsonify({'message': 'Data inserted successfully'}), 201
    except Exception as e:
        app.logger.error(f"Error in /data-old: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

# Dashboard stats
@api.route('/api/data/dashboard/stats', methods=['GET'])
@token_required
def dashboard_stats(current_user):
    from app import mysql  # Import here to avoid circular import
    
    try:
        cur = mysql.connection.cursor()
        
        # Get total readings in the last 24 hours
        cur.execute("""
            SELECT COUNT(*) as total_readings_24h
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
        """)
        total_readings = cur.fetchone()['total_readings_24h']
        
        # Get highest pH value in the last 24 hours
        cur.execute("""
            SELECT ph_value as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY ph_value DESC
            LIMIT 1
        """)
        highest_ph = cur.fetchone()
        
        # Get highest temperature in the last 24 hours
        cur.execute("""
            SELECT temperature as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY temperature DESC
            LIMIT 1
        """)
        highest_temp = cur.fetchone()
        
        # Get highest turbidity in the last 24 hours
        cur.execute("""
            SELECT turbidity as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY turbidity DESC
            LIMIT 1
        """)
        highest_turbidity = cur.fetchone()
        
        # Get average values
        cur.execute("""
            SELECT 
                AVG(ph_value) as avg_ph,
                AVG(temperature) as avg_temp,
                AVG(turbidity) as avg_turbidity
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
        """)
        averages = cur.fetchone()
        
        cur.close()
        
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
        app.logger.error(f"Error retrieving dashboard stats: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch dashboard stats: {str(e)}'
        }), 500

# Last 24 hours data
@api.route('/api/data/last-24-hours', methods=['GET'])
@token_required
def last_24_hours_data(current_user):
    from app import mysql  # Import here to avoid circular import
    
    try:
        cur = mysql.connection.cursor()
        
        # Get data from the last 24 hours
        cur.execute("""
            SELECT *
            FROM sensor_data
            WHERE created_at >= NOW() - INTERVAL 24 HOUR
            ORDER BY created_at DESC
        """)
        
        data = cur.fetchall()
        cur.close()
        
        return jsonify({
            'status': 'success',
            'data': data
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error retrieving last 24 hours data: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch last 24 hours data: {str(e)}'
        }), 500

# Highest values
@api.route('/api/data/highest-values', methods=['GET'])
@token_required
def highest_values(current_user):
    from app import mysql  # Import here to avoid circular import
    
    try:
        cur = mysql.connection.cursor()
        
        # Get highest pH value
        cur.execute("""
            SELECT ph_value as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            ORDER BY ph_value DESC
            LIMIT 1
        """)
        highest_ph = cur.fetchone()
        
        # Get highest temperature
        cur.execute("""
            SELECT temperature as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            ORDER BY temperature DESC
            LIMIT 1
        """)
        highest_temp = cur.fetchone()
        
        # Get highest turbidity
        cur.execute("""
            SELECT turbidity as value, location, CONCAT(date, ' ', time) as timestamp
            FROM sensor_data
            ORDER BY turbidity DESC
            LIMIT 1
        """)
        highest_turbidity = cur.fetchone()
        
        cur.close()
        
        return jsonify({
            'status': 'success',
            'highest_ph': highest_ph,
            'highest_temp': highest_temp,
            'highest_turbidity': highest_turbidity
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error retrieving highest values: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch highest values: {str(e)}'
        }), 500

