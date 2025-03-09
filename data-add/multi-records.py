import requests
import random
import time

# API endpoints
LOGIN_URL = "http://54.88.148.135:5000/login"
CREATE_DATA_URL = "http://54.88.148.135:5000/create-data"

# User credentials
username = "admin1"
password = "123456"

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

def add_multiple_records(token):
    # Ranges for random values
    ph_value_range = (5, 10)
    temperature_range = (1, 33)
    turbidity_range = (1, 10)
    locations = ["US", "UK", "LK", "IN"]

    # User input for rows per location
    user_count = 2  # You can change this value as needed

    headers = {
        "Authorization": f"Bearer {token}"
    }

    for location in locations:
        for _ in range(user_count):
            # Generate random values
            ph_value = round(random.uniform(*ph_value_range), 1)
            temperature = round(random.uniform(*temperature_range), 1)
            turbidity = round(random.uniform(*turbidity_range), 1)

            # Prepare the data payload
            data = {
                "location": location,
                "ph_value": ph_value,
                "temperature": temperature,
                "turbidity": turbidity
            }

            try:
                response = requests.post(CREATE_DATA_URL, json=data, headers=headers)
                if response.status_code == 201:
                    print(f"Data inserted successfully: {data}")
                else:
                    print(f"Error inserting data: {response.status_code}, {response.text}")
            except Exception as e:
                print(f"Exception occurred: {e}")

            # Wait 100 milliseconds before the next POST request
            #time.sleep(0.1)
            time.sleep(1)

if __name__ == "__main__":
    token = login_and_get_token(username, password)
    if token:
        add_multiple_records(token)
