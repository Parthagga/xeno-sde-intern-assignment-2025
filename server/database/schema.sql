-- Mini CRM Platform Database Schema

CREATE DATABASE IF NOT EXISTS mini_crm;
USE mini_crm;

-- Users table for authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP,
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_orders INT DEFAULT 0,
    status ENUM('active', 'inactive', 'churned') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_last_visit (last_visit),
    INDEX idx_total_spent (total_spent)
);

-- Orders table
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    items_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer_id (customer_id),
    INDEX idx_order_date (order_date),
    INDEX idx_total_amount (total_amount)
);

-- Segments table for campaign targeting
CREATE TABLE segments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSON NOT NULL, -- Store the rule logic as JSON
    audience_size INT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by)
);

-- Campaigns table
CREATE TABLE campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_id INT NOT NULL,
    message_template TEXT NOT NULL,
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'failed') DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_segment_id (segment_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Communication log table for tracking message delivery
CREATE TABLE communication_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    customer_id INT NOT NULL,
    message_content TEXT NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    failure_reason TEXT,
    vendor_message_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

-- AI insights table for storing AI-generated content
CREATE TABLE ai_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('segment_suggestion', 'message_suggestion', 'performance_summary', 'scheduling_suggestion') NOT NULL,
    campaign_id INT,
    segment_id INT,
    content JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE,
    INDEX idx_type (type),
    INDEX idx_campaign_id (campaign_id),
    INDEX idx_segment_id (segment_id)
);

-- Insert sample data
INSERT INTO customers (email, name, phone, date_of_birth, registration_date, last_visit, total_spent, total_orders, status) VALUES
('mohit.sharma@example.com', 'Mohit Sharma', '+91-9876543210', '1990-05-15', '2023-01-15 10:30:00', '2023-12-01 14:20:00', 15000.00, 8, 'active'),
('priya.patel@example.com', 'Priya Patel', '+91-9876543211', '1988-08-22', '2023-02-20 09:15:00', '2023-11-28 16:45:00', 8500.00, 5, 'active'),
('raj.kumar@example.com', 'Raj Kumar', '+91-9876543212', '1992-12-10', '2023-03-10 11:00:00', '2023-09-15 12:30:00', 12000.00, 6, 'inactive'),
('sneha.gupta@example.com', 'Sneha Gupta', '+91-9876543213', '1995-03-25', '2023-04-05 14:20:00', '2023-12-05 10:15:00', 25000.00, 12, 'active'),
('vikram.singh@example.com', 'Vikram Singh', '+91-9876543214', '1987-11-08', '2023-01-25 16:45:00', '2023-08-20 15:30:00', 5000.00, 3, 'churned'),
('anita.reddy@example.com', 'Anita Reddy', '+91-9876543215', '1993-07-18', '2023-05-12 13:10:00', '2023-12-03 11:45:00', 18000.00, 9, 'active'),
('suresh.verma@example.com', 'Suresh Verma', '+91-9876543216', '1991-09-30', '2023-06-18 10:25:00', '2023-10-12 14:20:00', 7500.00, 4, 'inactive'),
('kavita.joshi@example.com', 'Kavita Joshi', '+91-9876543217', '1989-04-12', '2023-02-28 15:30:00', '2023-12-02 09:30:00', 22000.00, 11, 'active');

INSERT INTO orders (customer_id, order_date, total_amount, status, items_count) VALUES
(1, '2023-12-01 14:20:00', 2500.00, 'completed', 3),
(1, '2023-11-15 10:30:00', 1800.00, 'completed', 2),
(1, '2023-10-20 16:45:00', 3200.00, 'completed', 4),
(2, '2023-11-28 16:45:00', 1500.00, 'completed', 2),
(2, '2023-10-10 12:20:00', 2200.00, 'completed', 3),
(3, '2023-09-15 12:30:00', 3000.00, 'completed', 3),
(3, '2023-08-05 14:15:00', 1800.00, 'completed', 2),
(4, '2023-12-05 10:15:00', 4500.00, 'completed', 5),
(4, '2023-11-20 11:30:00', 2800.00, 'completed', 3),
(5, '2023-08-20 15:30:00', 1200.00, 'completed', 1),
(6, '2023-12-03 11:45:00', 3200.00, 'completed', 4),
(6, '2023-11-10 13:20:00', 2500.00, 'completed', 3),
(7, '2023-10-12 14:20:00', 1800.00, 'completed', 2),
(8, '2023-12-02 09:30:00', 4100.00, 'completed', 4);
