import requests
import random
import time
from datetime import datetime, timedelta

# API endpoint
url = "http://52.91.221.166:5000/data"

# Ranges for random values
ph_value_range = (5, 10)
temperature_range = (1, 33)
turbidity_range = (1, 10)
locations = ["US", "UK", "LK", "IN"]
times = ["6:00", "10:00", "14:00", "18:00"] 
start_date = "2024-11-01"
end_date = "2024-11-30"

# User input for rows per combination
user_count = 2  # Replace this with user input

# Convert date range to datetime objects
start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")

# Generate data for each day within the range
current_date = start_date_obj
while current_date <= end_date_obj:
    for time_of_day in times:  # Iterate through each time
        for location in locations:  # Iterate through each location
            for _ in range(user_count):  # Generate rows based on user_count
                # Generate random values
                ph_value = round(random.uniform(*ph_value_range), 1)
                temperature = round(random.uniform(*temperature_range), 1)
                turbidity = round(random.uniform(*turbidity_range), 1)
                
                # Prepare the data payload
                data = {
                    "ph_value": ph_value,
                    "temperature": temperature,
                    "turbidity": turbidity,
                    "location": location,
                    "time": time_of_day,
                    "date": current_date.strftime("%Y-%m-%d")
                }
                
                # Send POST request
                try:
                    response = requests.post(url, data=data)
                    if response.status_code in [200, 201]:
                        print(f"Data inserted successfully: {data}")
                    else:
                        print(f"Error inserting data: {response.status_code}, {response.text}")
                except Exception as e:
                    print(f"Exception occurred: {e}")
                
                # Wait 2 milliseconds before the next POST request
                time.sleep(0.002)

    # Move to the next date
    current_date += timedelta(days=1)


# Here’s the updated Python script that generates rows based on the user-provided user_count. 
# For each date, time, and location, it creates the specified number of rows with random values 
# for ph_value, temperature, and turbidity within the given range.
