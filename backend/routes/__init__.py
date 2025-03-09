# routes/__init__.py

from flask import Blueprint, request, jsonify, current_app as app
import jwt
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from app import mysql
from models import User

api = Blueprint('api', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # JWT is passed in the request header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
            else:
                token = auth_header
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            user_id = data['user_id']
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
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
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
@token_required
def correlation_data(current_user):
    from app import mysql  # Import here to avoid circular import
    from datetime import datetime, timedelta

    location = request.args.get('location', 'US')  # Default location is 'US'

    try:
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
        data = {'temperature': [], 'turbidity': [], 'ph_value': []}
        for row in rows:
            data['temperature'].append(row[0])
            data['turbidity'].append(row[1])
            data['ph_value'].append(row[2])

        return jsonify(data), 200

    except Exception as e:
        app.logger.error(f"Error retrieving correlation data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500

# for Homepage.js
@api.route('/recent-data', methods=['GET'])
@token_required
def recent_data(current_user):
    from app import mysql  # Import here to avoid circular import
    from datetime import datetime, timedelta

    try:
        cur = mysql.connection.cursor()
        # Get average entries for the last 24 hours
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        last_24h_str = last_24h.strftime('%Y-%m-%d %H:%M:%S')

        cur.execute("""
            SELECT location, AVG(ph_value) AS ph_value, AVG(temperature) AS temperature, AVG(turbidity) AS turbidity, date, time
            FROM sensor_data
            WHERE CONCAT(date, ' ', time) >= %s
            GROUP BY location, date, time
            ORDER BY date DESC, time DESC
        """, (last_24h_str,))
        rows = cur.fetchall()
        cur.close()

        columns = ['location', 'ph_value', 'temperature', 'turbidity', 'date', 'time']
        data = [dict(zip(columns, row)) for row in rows]

        return jsonify(data), 200
    except Exception as e:
        app.logger.error(f"Error retrieving recent data: {e}", exc_info=True)
        return jsonify({'error': 'Internal Server Error'}), 500


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

