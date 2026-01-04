-- ============================================================================
-- Highland Fresh System - Customer Authentication System
-- Migration Script: Create CUSTOMERS Table and Update SALES
-- Version: 1.0
-- Date: October 19, 2025
-- 
-- Purpose: Implement customer login system to support Independent Resellers
--          placing orders through customer portal
-- 
-- Related: RBAC-01 Validation Findings
-- ============================================================================

-- Step 1: Create CUSTOMERS table
-- This table stores customer account information for both Retail Outlets
-- and Independent Resellers who need to log in and place orders

CREATE TABLE IF NOT EXISTS customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique customer identifier (e.g., CUST-2025-001)',
    
    -- Authentication credentials
    username VARCHAR(50) UNIQUE NOT NULL COMMENT 'Username for customer login',
    email VARCHAR(255) UNIQUE NOT NULL COMMENT 'Customer email address',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    
    -- Business information
    business_name VARCHAR(255) NOT NULL COMMENT 'Name of retail outlet or reseller business',
    contact_person VARCHAR(255) NOT NULL COMMENT 'Primary contact person name',
    phone VARCHAR(20) COMMENT 'Contact phone number',
    customer_type ENUM('retail_outlet', 'independent_reseller') NOT NULL COMMENT 'Type of customer',
    
    -- Address information
    address TEXT COMMENT 'Complete business address',
    city_id INT COMMENT 'Foreign key to cities table',
    
    -- Business terms
    credit_limit DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Maximum credit allowed for customer',
    payment_terms INT DEFAULT 0 COMMENT 'Payment terms in days (0 = cash only)',
    
    -- Status and tracking
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether customer account is active',
    is_verified BOOLEAN DEFAULT FALSE COMMENT 'Whether email/business has been verified',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL COMMENT 'Last successful login timestamp',
    
    -- Foreign keys
    FOREIGN KEY (city_id) REFERENCES cities(city_id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_customer_number (customer_number),
    INDEX idx_customer_type (customer_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer accounts for login and order placement';

-- ============================================================================
-- Step 2: Add customer_id to SALES table
-- This links sales to customer accounts instead of using plain text names
-- ============================================================================

-- Check if customer_id column already exists, if not add it
SET @dbname = DATABASE();
SET @tablename = 'sales';
SET @columnname = 'customer_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL AFTER user_id')
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key constraint if not already exists
SET @fkname = 'fk_sales_customer';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND CONSTRAINT_NAME = @fkname
  ) > 0,
  'SELECT 1', -- FK exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD CONSTRAINT ', @fkname, ' FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL')
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for performance
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = 'idx_customer_id'
  ) > 0,
  'SELECT 1', -- Index exists, do nothing
  CONCAT('CREATE INDEX idx_customer_id ON ', @tablename, '(customer_id)')
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================================================
-- Step 3: Create customer order status tracking table
-- Tracks status of customer-initiated orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_order_status (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Status options for customer orders';

-- Insert default customer order statuses
INSERT INTO customer_order_status (status_name, description, display_order) VALUES
('pending_approval', 'Order submitted by customer, waiting for staff approval', 1),
('approved', 'Order approved by staff, ready for fulfillment', 2),
('in_preparation', 'Order is being prepared in warehouse', 3),
('ready_for_pickup', 'Order is ready for customer pickup or delivery', 4),
('completed', 'Order has been picked up or delivered', 5),
('cancelled', 'Order was cancelled', 6),
('rejected', 'Order was rejected by staff', 7)
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- ============================================================================
-- Step 4: Create customer login attempts tracking table (Security)
-- Track failed login attempts to prevent brute force attacks
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_login_attempts (
    attempt_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NOT NULL COMMENT 'IPv4 or IPv6 address',
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    failure_reason VARCHAR(100),
    
    INDEX idx_username_time (username, attempt_time),
    INDEX idx_ip_time (ip_address, attempt_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track customer login attempts for security';

-- ============================================================================
-- Step 5: Create customer password reset tokens table
-- For "Forgot Password" functionality
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_password_reset_tokens (
    token_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL COMMENT 'Secure random token',
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Password reset tokens for customer accounts';

-- ============================================================================
-- Step 6: Create view for easy customer information retrieval
-- ============================================================================

CREATE OR REPLACE VIEW v_customer_details AS
SELECT 
    c.customer_id,
    c.customer_number,
    c.username,
    c.email,
    c.business_name,
    c.contact_person,
    c.phone,
    c.customer_type,
    c.address,
    c.credit_limit,
    c.payment_terms,
    c.is_active,
    c.is_verified,
    c.created_at,
    c.last_login,
    ct.city_name,
    ct.country_id,
    co.country_name,
    -- Calculate total orders
    (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.customer_id) as total_orders,
    -- Calculate total amount spent
    (SELECT COALESCE(SUM(total_amount), 0) FROM sales s WHERE s.customer_id = c.customer_id) as total_spent,
    -- Last order date
    (SELECT MAX(sale_date) FROM sales s WHERE s.customer_id = c.customer_id) as last_order_date
FROM customers c
LEFT JOIN cities ct ON c.city_id = ct.city_id
LEFT JOIN countries co ON ct.country_id = co.country_id;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if tables were created successfully
SELECT 'customers' as table_name, COUNT(*) as record_count FROM customers
UNION ALL
SELECT 'customer_order_status', COUNT(*) FROM customer_order_status
UNION ALL
SELECT 'customer_login_attempts', COUNT(*) FROM customer_login_attempts
UNION ALL
SELECT 'customer_password_reset_tokens', COUNT(*) FROM customer_password_reset_tokens;

-- Check if sales table was modified
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'sales' 
AND COLUMN_NAME IN ('customer_id', 'customer_name');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 
    'Migration 001_create_customers_table.sql completed successfully!' as status,
    NOW() as completed_at;
