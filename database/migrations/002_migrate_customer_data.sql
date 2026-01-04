-- ============================================================================
-- Highland Fresh System - Customer Data Migration
-- Migration Script: Convert customer_name text data to customer records
-- Version: 1.0
-- Date: October 19, 2025
-- 
-- Purpose: Migrate existing sales with text-based customer_name to proper
--          customer records with foreign key relationships
-- 
-- IMPORTANT: Run this AFTER 001_create_customers_table.sql
-- ============================================================================

-- ============================================================================
-- Step 1: Create temporary table to analyze existing customer data
-- ============================================================================

CREATE TEMPORARY TABLE temp_unique_customers AS
SELECT DISTINCT 
    TRIM(customer_name) as customer_name,
    COUNT(*) as order_count,
    MIN(sale_date) as first_order_date,
    MAX(sale_date) as last_order_date,
    SUM(total_amount) as total_spent
FROM sales
WHERE customer_name IS NOT NULL 
  AND TRIM(customer_name) != ''
  AND customer_id IS NULL -- Only process sales not yet linked to customers
GROUP BY TRIM(customer_name)
ORDER BY order_count DESC;

-- Show summary of data to be migrated
SELECT 
    'Total unique customers to migrate' as metric,
    COUNT(*) as value
FROM temp_unique_customers;

-- ============================================================================
-- Step 2: Create customers from existing sales data
-- This uses a stored procedure to handle the migration safely
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_customers_from_sales$$

CREATE PROCEDURE migrate_customers_from_sales()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_customer_name VARCHAR(255);
    DECLARE v_order_count INT;
    DECLARE v_total_spent DECIMAL(10,2);
    DECLARE v_customer_number VARCHAR(50);
    DECLARE v_username VARCHAR(50);
    DECLARE v_email VARCHAR(255);
    DECLARE v_customer_id INT;
    DECLARE v_counter INT DEFAULT 1;
    
    -- Cursor to iterate through unique customers
    DECLARE customer_cursor CURSOR FOR 
        SELECT customer_name, order_count, total_spent 
        FROM temp_unique_customers;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN customer_cursor;
    
    customer_loop: LOOP
        FETCH customer_cursor INTO v_customer_name, v_order_count, v_total_spent;
        
        IF done THEN
            LEAVE customer_loop;
        END IF;
        
        -- Generate customer number
        SET v_customer_number = CONCAT('CUST-', YEAR(NOW()), '-', LPAD(v_counter, 4, '0'));
        
        -- Generate username from customer name (remove spaces, make lowercase)
        SET v_username = LOWER(REPLACE(REPLACE(v_customer_name, ' ', '_'), '.', ''));
        SET v_username = SUBSTRING(v_username, 1, 50); -- Limit to 50 chars
        
        -- Ensure username is unique by appending number if needed
        WHILE EXISTS (SELECT 1 FROM customers WHERE username = v_username) DO
            SET v_username = CONCAT(SUBSTRING(v_username, 1, 47), '_', v_counter);
        END WHILE;
        
        -- Generate email (will need to be updated by customer)
        SET v_email = CONCAT(v_username, '@highlandfresh.customer.temp');
        
        -- Ensure email is unique
        WHILE EXISTS (SELECT 1 FROM customers WHERE email = v_email) DO
            SET v_email = CONCAT(v_username, v_counter, '@highlandfresh.customer.temp');
        END WHILE;
        
        -- Insert customer record
        -- Note: password_hash is set to a random string that cannot be used for login
        -- Customer will need to use "forgot password" or be set up by admin
        INSERT INTO customers (
            customer_number,
            username,
            email,
            password_hash,
            business_name,
            contact_person,
            customer_type,
            is_active,
            is_verified,
            created_at
        ) VALUES (
            v_customer_number,
            v_username,
            v_email,
            '$2y$10$MIGRATION.TEMP.PASSWORD.HASH.CANNOT.LOGIN.XXXXXXXXXXXXXXXXXXXXX', -- Invalid hash
            v_customer_name,
            v_customer_name,
            -- Heuristic: If spent > 50000, likely retail outlet, else independent reseller
            IF(v_total_spent > 50000, 'retail_outlet', 'independent_reseller'),
            TRUE,
            FALSE, -- Not verified, needs admin verification
            NOW()
        );
        
        SET v_customer_id = LAST_INSERT_ID();
        
        -- Update sales records to link to this customer
        UPDATE sales 
        SET customer_id = v_customer_id 
        WHERE TRIM(customer_name) = v_customer_name 
          AND customer_id IS NULL;
        
        SET v_counter = v_counter + 1;
        
    END LOOP customer_loop;
    
    CLOSE customer_cursor;
    
    -- Return migration summary
    SELECT 
        v_counter - 1 as customers_created,
        (SELECT COUNT(*) FROM sales WHERE customer_id IS NOT NULL) as sales_linked,
        (SELECT COUNT(*) FROM sales WHERE customer_id IS NULL AND customer_name IS NOT NULL) as sales_remaining;
    
END$$

DELIMITER ;

-- ============================================================================
-- Step 3: Execute the migration
-- ============================================================================

CALL migrate_customers_from_sales();

-- ============================================================================
-- Step 4: Create a report of migrated customers
-- Save this for admin review
-- ============================================================================

CREATE TEMPORARY TABLE temp_migration_report AS
SELECT 
    c.customer_id,
    c.customer_number,
    c.username,
    c.email,
    c.business_name,
    c.customer_type,
    COUNT(s.sale_id) as linked_orders,
    COALESCE(SUM(s.total_amount), 0) as total_order_value
FROM customers c
LEFT JOIN sales s ON c.customer_id = s.customer_id
WHERE c.email LIKE '%@highlandfresh.customer.temp'
GROUP BY c.customer_id
ORDER BY linked_orders DESC;

-- Show migration report
SELECT 
    'MIGRATION REPORT - Review and update these customer accounts' as notice;

SELECT * FROM temp_migration_report;

-- ============================================================================
-- Step 5: Identify sales that still need manual review
-- ============================================================================

SELECT 
    'Sales requiring manual customer assignment' as notice,
    COUNT(*) as count
FROM sales
WHERE customer_id IS NULL 
  AND (customer_name IS NULL OR TRIM(customer_name) = '');

-- Show details of sales needing manual review
SELECT 
    sale_id,
    sale_number,
    sale_date,
    customer_name,
    total_amount
FROM sales
WHERE customer_id IS NULL
  AND customer_name IS NOT NULL
  AND TRIM(customer_name) != ''
ORDER BY sale_date DESC
LIMIT 20;

-- ============================================================================
-- Step 6: Create admin todo list for post-migration
-- ============================================================================

SELECT '
POST-MIGRATION ADMIN TASKS:
============================

1. VERIFY CUSTOMER DATA
   - Review the migration report above
   - Verify customer_type classification (retail_outlet vs independent_reseller)
   - Update customer contact information

2. SET UP CUSTOMER ACCOUNTS
   - Update customer email addresses to real emails
   - Generate password reset tokens for customers
   - Send welcome emails with login instructions

3. UPDATE CUSTOMER INFORMATION
   - Add phone numbers
   - Add complete addresses
   - Set credit limits if applicable
   - Assign to correct cities

4. MANUAL REVIEW
   - Review any sales that could not be auto-assigned
   - Create customer accounts for those sales
   - Link them to customer_id

5. VERIFY DATA INTEGRITY
   - Run the verification queries below
   - Ensure no orphaned sales remain

6. COMMUNICATE WITH CUSTOMERS
   - Inform customers about the new portal
   - Provide login credentials
   - Train customers on how to use the system

QUERY TO CHECK MIGRATION STATUS:
================================

SELECT 
    "Total Customers" as metric,
    COUNT(*) as value
FROM customers
UNION ALL
SELECT 
    "Sales with customer_id",
    COUNT(*)
FROM sales WHERE customer_id IS NOT NULL
UNION ALL
SELECT 
    "Sales without customer_id",
    COUNT(*)
FROM sales WHERE customer_id IS NULL
UNION ALL
SELECT 
    "Migrated customers needing email update",
    COUNT(*)
FROM customers WHERE email LIKE "%@highlandfresh.customer.temp";

' as admin_tasks;

-- ============================================================================
-- Step 7: Create helper queries for admins
-- ============================================================================

-- Query to update a customer email
-- UPDATE customers SET email = 'real@email.com', is_verified = TRUE WHERE customer_id = ?;

-- Query to generate password reset token (to be used by admin to send to customer)
-- INSERT INTO customer_password_reset_tokens (customer_id, token, expires_at) 
-- VALUES (?, SHA2(CONCAT(UUID(), NOW()), 256), DATE_ADD(NOW(), INTERVAL 7 DAY));

-- Query to check customer login readiness
-- SELECT 
--     customer_id,
--     username,
--     email,
--     CASE 
--         WHEN email LIKE '%@highlandfresh.customer.temp' THEN 'Email needs updating'
--         WHEN is_verified = FALSE THEN 'Account needs verification'
--         ELSE 'Ready for login'
--     END as login_status
-- FROM customers;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
    'Migration 002_migrate_customer_data.sql completed!' as status,
    NOW() as completed_at,
    'Please review the migration report above and complete admin tasks' as next_steps;
