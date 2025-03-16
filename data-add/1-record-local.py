import requests
import random
import datetime

# API endpoints
LOGIN_URL = "http://localhost:5000/login"
CREATE_DATA_URL = "http://localhost:5000/api/data/sensor-data"

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
        else:
            print(f"Login failed with status code {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Exception during login: {e}")
    return None

def add_sample_record(token):
    """Add a single sample record."""
    # Sample data ranges
    ph_value = round(random.uniform(6.5, 8.5), 2)
    temperature = round(random.uniform(18.0, 30.0), 2)
    turbidity = round(random.uniform(5.0, 25.0), 2)
    location = random.choice(['uk', 'us', 'eu', 'asia', 'africa'])
    
    # Current timestamp
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    payload = {
        "ph_value": ph_value,
        "temperature": temperature,
        "turbidity": turbidity,
        "location": location,
        "date": date_str,
        "time": time_str
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(CREATE_DATA_URL, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print(f"Sample record added successfully: {payload}")
        else:
            print(f"Failed to add sample record: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception while adding record: {e}")

def main():
    token = login_and_get_token(username, password)
    if token:
        add_sample_record(token)
    else:
        print("Failed to obtain token. Cannot add sample record.")

if __name__ == "__main__":
    main() 