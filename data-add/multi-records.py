import requests
import random
import time
import datetime

# API endpoints
LOGIN_URL = "http://54.242.42.31:5000/login"
CREATE_DATA_URL = "http://54.242.42.31:5000/api/data/sensor-data"

# User credentials
username = "admin5"
password = "245789fdAWSsfdf@#"

def login_and_get_token(username, password):
    login_payload = {
        "username": username,
        "password": password
    }
    try:
        response = requests.post(LOGIN_URL, json=login_payload)
        if response.status_code == 200:
            token = response.json().get('token')
            if token:
                print("Login successful. Token obtained.")
                return token
            else:
                print("Login failed: Token not found in response.")
                return None
        else:
            print(f"Login failed with status code {response.status_code}: {response.text}")
            return None
    except Exception as e:
        print(f"Exception during login: {e}")
        return None

def add_multiple_records(token, hours=24):
    # Ranges for random values
    ph_range = (6.5, 8.5)
    temperature_range = (18.0, 30.0)
    turbidity_range = (5.0, 25.0)
    
    # Locations
    locations = ['uk', 'us', 'eu', 'asia', 'africa']
    
    # Current time
    now = datetime.datetime.now()
    
    # Headers with token
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Number of records to add (one per hour for the last 24 hours)
    total_records = hours
    records_added = 0
    
    print(f"Adding {total_records} records for the last {hours} hours...")
    
    # Add records for each hour in the past 24 hours
    for hour in range(hours):
        # Calculate timestamp for this record (now - hour)
        record_time = now - datetime.timedelta(hours=hour)
        date_str = record_time.strftime("%Y-%m-%d")
        time_str = record_time.strftime("%H:%M:%S")
        
        # For each hour, add 1-3 records with different locations
        for _ in range(random.randint(1, 3)):
            # Generate random data
            ph_value = round(random.uniform(*ph_range), 2)
            temperature = round(random.uniform(*temperature_range), 2)
            turbidity = round(random.uniform(*turbidity_range), 2)
            location = random.choice(locations)
            
            # Create payload
            payload = {
                "ph_value": ph_value,
                "temperature": temperature,
                "turbidity": turbidity,
                "location": location,
                "date": date_str,
                "time": time_str
            }
            
            try:
                # Send request
                response = requests.post(CREATE_DATA_URL, json=payload, headers=headers)
                
                if response.status_code == 201 or response.status_code == 200:
                    records_added += 1
                    print(f"Record {records_added} added: {payload}")
                else:
                    print(f"Failed to add record: {response.status_code} - {response.text}")
                
                # Sleep to avoid overwhelming the server
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Exception while adding record: {e}")
    
    print(f"Added {records_added} records successfully.")

def add_extreme_values(token):
    """Add some extreme values to test highest value display"""
    # Headers with token
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Current time
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # Extreme values
    extreme_records = [
        {
            "ph_value": 8.9,  # High pH
            "temperature": 25.0,
            "turbidity": 15.0,
            "location": "uk",
            "date": date_str,
            "time": time_str
        },
        {
            "ph_value": 7.2,
            "temperature": 32.5,  # High temperature
            "turbidity": 18.0,
            "location": "us",
            "date": date_str,
            "time": time_str
        },
        {
            "ph_value": 7.5,
            "temperature": 24.0,
            "turbidity": 28.7,  # High turbidity
            "location": "eu",
            "date": date_str,
            "time": time_str
        }
    ]
    
    print("Adding extreme values for testing highest values display...")
    
    for record in extreme_records:
        try:
            response = requests.post(CREATE_DATA_URL, json=record, headers=headers)
            
            if response.status_code == 201 or response.status_code == 200:
                print(f"Extreme record added: {record}")
            else:
                print(f"Failed to add extreme record: {response.status_code} - {response.text}")
            
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Exception while adding extreme record: {e}")

def main():
    # Login and get token
    token = login_and_get_token(username, password)
    
    if token:
        # Add multiple records for the last 24 hours
        add_multiple_records(token)
        
        # Add some extreme values to test highest value display
        add_extreme_values(token)
    else:
        print("Failed to obtain token. Cannot add records.")

if __name__ == "__main__":
    main()
