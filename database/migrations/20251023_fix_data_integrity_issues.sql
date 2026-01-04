-- Migration: Fix Data Integrity and Design Issues
-- Date: 2025-10-23
-- Purpose: Address relationship inconsistencies, deprecated data, and design flaws

USE highland_fresh_db;

-- ============================================================================
-- ISSUE 1: Fix payment_terms in customers table
-- Current: INT(11) with no FK relationship (stores days as integer)
-- Fix: Add proper foreign key to payment_terms table
-- ============================================================================

-- Step 1: Check current payment_terms usage in customers
SELECT 'Current payment_terms distribution in customers:' as info;
SELECT payment_terms, COUNT(*) as customer_count 
FROM customers 
GROUP BY payment_terms;

-- Step 2: Add new column with proper FK
ALTER TABLE customers 
ADD COLUMN payment_term_id INT(11) NULL AFTER payment_terms,
ADD CONSTRAINT fk_customers_payment_terms 
    FOREIGN KEY (payment_term_id) REFERENCES payment_terms(payment_term_id);

-- Step 3: Migrate data - map days to payment_term_id
UPDATE customers c
JOIN payment_terms pt ON pt.days_to_pay = c.payment_terms
SET c.payment_term_id = pt.payment_term_id
WHERE c.payment_terms > 0;

-- Step 4: Set default payment term for customers with 0 or NULL
UPDATE customers c
SET c.payment_term_id = (SELECT payment_term_id FROM payment_terms WHERE term_code = 'NET30' LIMIT 1)
WHERE c.payment_term_id IS NULL;

-- Step 5: Make new column NOT NULL after migration
ALTER TABLE customers MODIFY COLUMN payment_term_id INT(11) NOT NULL;

-- Step 6: Drop old column (after verifying migration)
-- UNCOMMENT AFTER VERIFICATION:
-- ALTER TABLE customers DROP COLUMN payment_terms;

SELECT 'Payment terms migration complete' as status;

-- ============================================================================
-- ISSUE 2: Fix customer_type ENUM (single value is inflexible)
-- Current: ENUM('independent_reseller') - can't add types without ALTER TABLE
-- Fix: Create customer_types lookup table
-- ============================================================================

-- Create customer_types lookup table
CREATE TABLE IF NOT EXISTS customer_types (
    customer_type_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_code (type_code),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert existing and potential customer types
INSERT INTO customer_types (type_code, type_name, description, discount_percentage) VALUES
('INDEPENDENT_RESELLER', 'Independent Reseller', 'Individual business reselling Highland Fresh products', 5.00),
('WHOLESALE_OUTLET', 'Wholesale Outlet', 'Large wholesale distributor', 10.00),
('SUPERMARKET', 'Supermarket Chain', 'Supermarket or grocery store chain', 8.00),
('RETAIL_STORE', 'Retail Store', 'Small retail store or sari-sari store', 3.00),
('RESTAURANT', 'Restaurant/Food Service', 'Restaurant or food service establishment', 5.00)
ON DUPLICATE KEY UPDATE type_name=VALUES(type_name);

-- Add new column to customers table
ALTER TABLE customers 
ADD COLUMN customer_type_id INT(11) NULL AFTER customer_type;

-- Migrate existing data
UPDATE customers 
SET customer_type_id = (SELECT customer_type_id FROM customer_types WHERE type_code = 'INDEPENDENT_RESELLER' LIMIT 1)
WHERE customer_type = 'independent_reseller';

-- Add foreign key constraint
ALTER TABLE customers
ADD CONSTRAINT fk_customers_customer_types 
    FOREIGN KEY (customer_type_id) REFERENCES customer_types(customer_type_id);

-- Make NOT NULL after migration
ALTER TABLE customers MODIFY COLUMN customer_type_id INT(11) NOT NULL;

-- Drop old ENUM column (after verification)
-- UNCOMMENT AFTER VERIFICATION:
-- ALTER TABLE customers DROP COLUMN customer_type;

SELECT 'Customer type migration complete' as status;

-- ============================================================================
-- ISSUE 3: Clean up deprecated and duplicate transaction statuses
-- ============================================================================

-- Delete deprecated status
DELETE FROM transaction_statuses 
WHERE status_name = 'PO Partially Received (DEPRECATED)' AND is_active = 0;

-- Check for duplicate "Received" statuses
SELECT 'Checking for duplicate Received statuses:' as info;
SELECT status_id, status_name, status_type, is_active 
FROM transaction_statuses 
WHERE status_name LIKE '%Received%';

-- Merge duplicate: Update references from 'Received' (75) to 'PO Received' (14)
UPDATE purchase_orders 
SET status_id = 14 
WHERE status_id = 75;

-- Delete duplicate status
DELETE FROM transaction_statuses 
WHERE status_id = 75 AND status_name = 'Received';

SELECT 'Cleaned up deprecated statuses' as status;

-- ============================================================================
-- ISSUE 4: Remove test data from product_categories
-- ============================================================================

-- Check if 'Basta' category is used by any products
SELECT 'Products using Basta category:' as info;
SELECT COUNT(*) as product_count 
FROM products 
WHERE category_id = 114;

-- If no products use it, delete it
DELETE FROM product_categories 
WHERE category_id = 114 AND category_name = 'Basta'
AND NOT EXISTS (SELECT 1 FROM products WHERE category_id = 114);

SELECT 'Removed test data from product_categories' as status;

-- ============================================================================
-- ISSUE 5: Add data retention policy for customer_login_attempts
-- ============================================================================

-- Create cleanup stored procedure
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS cleanup_old_login_attempts(IN retention_days INT)
BEGIN
    DELETE FROM customer_login_attempts 
    WHERE attempt_time < DATE_SUB(NOW(), INTERVAL retention_days DAY);
    
    SELECT ROW_COUNT() as deleted_records;
END//

DELIMITER ;

-- Clean up login attempts older than 90 days
CALL cleanup_old_login_attempts(90);

-- Create event to auto-cleanup monthly (requires event scheduler enabled)
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS monthly_login_attempt_cleanup
-- ON SCHEDULE EVERY 1 MONTH
-- DO CALL cleanup_old_login_attempts(90);

SELECT 'Login attempts cleanup complete' as status;

-- ============================================================================
-- ISSUE 6: Add constraint to prevent ambiguous purchase_order_items
-- Currently: Trigger prevents Highland Fresh products
-- Add: CHECK constraint to prevent both product_id AND raw_material_id
-- ============================================================================

-- Note: MySQL 5.7 doesn't support CHECK constraints (enforced in 8.0+)
-- The existing triggers already handle this, so documented only

SELECT 'purchase_order_items: Existing triggers handle product_id/raw_material_id exclusivity' as status;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'VERIFICATION RESULTS:' as info;

SELECT 'Customers with new payment_term_id:' as check_name, COUNT(*) as count 
FROM customers WHERE payment_term_id IS NOT NULL;

SELECT 'Customers with new customer_type_id:' as check_name, COUNT(*) as count 
FROM customers WHERE customer_type_id IS NOT NULL;

SELECT 'Active transaction statuses:' as check_name, COUNT(*) as count 
FROM transaction_statuses WHERE is_active = 1;

SELECT 'Deprecated statuses:' as check_name, COUNT(*) as count 
FROM transaction_statuses WHERE is_active = 0;

SELECT 'Test categories remaining:' as check_name, COUNT(*) as count 
FROM product_categories WHERE category_name IN ('Basta', 'test', 'Test');

SELECT 'Login attempts (current):' as check_name, COUNT(*) as count 
FROM customer_login_attempts;
