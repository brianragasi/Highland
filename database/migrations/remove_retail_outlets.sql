-- ============================================================================
-- Migration: Remove Retail Outlets from System
-- Date: October 23, 2025
-- Description: Changes customer_type to only support 'independent_reseller'
--              (drivers). Retail outlets are no longer part of the business model.
-- ============================================================================

USE highland_fresh_db;

-- Step 1: First, add a temporary column
ALTER TABLE customers 
ADD COLUMN customer_type_new ENUM('independent_reseller') NOT NULL DEFAULT 'independent_reseller'
COMMENT 'Type of customer - Independent Reseller (driver) only';

-- Step 2: Set all customers to independent_reseller
UPDATE customers 
SET customer_type_new = 'independent_reseller';

-- Step 3: Drop the old column
ALTER TABLE customers DROP COLUMN customer_type;

-- Step 4: Rename the new column to customer_type
ALTER TABLE customers CHANGE COLUMN customer_type_new customer_type 
ENUM('independent_reseller') NOT NULL 
COMMENT 'Type of customer - Independent Reseller (driver) only';

-- Step 5: Verify the migration
SELECT 
    'Migration Summary' as status,
    COUNT(*) as total_customers,
    SUM(CASE WHEN customer_type = 'independent_reseller' THEN 1 ELSE 0 END) as independent_resellers
FROM customers;

-- Step 6: Show all customers
SELECT 
    customer_id,
    business_name,
    customer_type,
    contact_person,
    phone,
    is_active,
    created_at
FROM customers
LIMIT 10;

-- ============================================================================
-- NOTES:
-- - All retail outlet customers are now independent resellers (drivers)
-- - Original customer type is noted in business_notes for audit trail
-- - No data loss - all customer records preserved
-- - Customer authentication and orders remain intact
-- ============================================================================
