import os
import time
import random
from datetime import datetime, timedelta

# Define ranges and options
ph_value_range = (5, 10)
temperature_range = (1, 33)
turbidity_range = (1, 10)
locations = ["US", "UK", "LK", "IN"]
times = ["6:00", "10:00", "14:00", "18:00"]
start_date = datetime.strptime("2024-11-01", "%Y-%m-%d")
end_date = datetime.strptime("2024-11-30", "%Y-%m-%d")

# Function to generate a random date between two dates
def random_date(start, end):
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y-%m-%d")

# Send 100 rows
for i in range(40):
    # Generate random values within the defined ranges
    ph_value = round(random.uniform(*ph_value_range), 1)
    temperature = round(random.uniform(*temperature_range), 1)
    turbidity = round(random.uniform(*turbidity_range), 1)
    location = random.choice(locations)
    time_value = random.choice(times)
    date_value = random_date(start_date, end_date)

    # Create the curl command
    curl_command = (
        f'curl -X POST "http://52.91.221.166:5000/data" '
        f'-H "Content-Type: application/x-www-form-urlencoded" '
        f'-d "ph_value={ph_value}&temperature={temperature}&turbidity={turbidity}&'
        f'location={location}&time={time_value}&date={date_value}"'
    )

    # Execute the curl command
    os.system(curl_command)

    # Wait for 2ms
    time.sleep(0.002)

print("Data posting completed!")

