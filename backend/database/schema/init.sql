-- Water360 Database Schema
-- -------------------

-- Create sensor_data table
CREATE TABLE IF NOT EXISTS sensor_data (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ph_value FLOAT NOT NULL,
    temperature FLOAT NOT NULL,
    turbidity FLOAT NOT NULL,
    location VARCHAR(255) NOT NULL,
    time VARCHAR(50) NOT NULL,
    date VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location (location),
    INDEX idx_date (date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    user_type ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_user_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a sample admin user if none exists
INSERT INTO users (firstname, lastname, username, password, email, user_type)
SELECT 'Admin', 'User', 'admin', 
       '$2b$12$1xxxxxxxxxxxxxxxxxxxxuZLbwxnG7TcRjGFcQATRrjSIn4/Mxu', -- Default password: admin123
       'admin@water360.com', 'admin'
FROM dual
WHERE NOT EXISTS (SELECT * FROM users WHERE username = 'admin' OR email = 'admin@water360.com');

-- Add sample sensor data if the table is empty
INSERT INTO sensor_data (ph_value, temperature, turbidity, location, time, date)
SELECT 7.2, 25.5, 3.7, 'US', '10:30:00', '2023-03-01'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM sensor_data LIMIT 1); 