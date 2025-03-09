import requests

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

def add_single_record(token):
    # Prepare the data payload
    data = {
        "location": "US",
        "ph_value": 4.5,
        "temperature": 2.0,
        "turbidity": 8.0
    }
    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        response = requests.post(CREATE_DATA_URL, json=data, headers=headers)
        if response.status_code == 201:
            print("Record added successfully.")
            print(f"Response: {response.json()}")
        else:
            print(f"Failed to add record: {response.status_code}, {response.text}")
    except Exception as e:
        print(f"Exception occurred while adding record: {e}")

if __name__ == "__main__":
    token = login_and_get_token(username, password)
    if token:
        add_single_record(token)

