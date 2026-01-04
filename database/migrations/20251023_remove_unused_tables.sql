-- Migration: Remove Unused and Redundant Tables
-- Date: 2025-10-23
-- Purpose: Clean up tables that don't fit Highland Fresh business model or are unused

USE highland_fresh_db;

-- ============================================================================
-- BACKUP DATA (if needed later)
-- ============================================================================

-- Backup milk deliveries data before dropping (6 rows)
CREATE TABLE IF NOT EXISTS _backup_highland_fresh_milk_deliveries_20251023 AS 
SELECT * FROM highland_fresh_milk_deliveries;

SELECT 'Backed up 6 milk delivery records' as step;

-- ============================================================================
-- DROP TABLES THAT DON'T FIT BUSINESS MODEL
-- ============================================================================

-- 1. supplier_products: Highland Fresh MANUFACTURES products, doesn't buy them
--    - Triggers prevent purchasing Highland Fresh branded products
--    - Business logic: they buy raw materials, produce finished goods
DROP TABLE IF EXISTS supplier_products;

-- ============================================================================
-- DROP UNUSED/UNIMPLEMENTED FEATURE TABLES
-- ============================================================================

-- 2. product_attributes and product_attribute_values
--    - product_attribute_values is empty (0 rows)
--    - product_attributes has 6 rows but never used in code
--    - Feature not implemented
DROP TABLE IF EXISTS product_attribute_values;
DROP TABLE IF EXISTS product_attributes;

-- 3. returns and return_items
--    - Both tables empty (0 rows)
--    - Returns management not implemented
DROP TABLE IF EXISTS return_items;
DROP TABLE IF EXISTS returns;

-- 4. customer_password_reset_tokens
--    - Empty table (0 rows)
--    - Password reset feature not implemented
DROP TABLE IF EXISTS customer_password_reset_tokens;

-- 5. highland_fresh_milk_deliveries
--    - Redundant: purchase_orders system captures same data
--    - purchase_order_items has quality fields: quality_grade_received, 
--      temperature_on_receipt, fat_content_percent, protein_content_percent
--    - Purchase orders are more comprehensive
DROP TABLE IF EXISTS highland_fresh_milk_deliveries;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Tables dropped successfully' as step;

-- Show remaining tables
SELECT 'Remaining supplier-related tables:' as info;
SHOW TABLES LIKE '%supplier%';

SELECT 'Remaining product-related tables:' as info;
SHOW TABLES LIKE '%product%';

SELECT 'Remaining return-related tables:' as info;
SHOW TABLES LIKE '%return%';

-- Verify critical tables still exist
SELECT 'Critical tables verification:' as info;
SELECT 
    CASE WHEN COUNT(*) = 6 THEN 'OK' ELSE 'ERROR' END as status
FROM information_schema.tables 
WHERE table_schema = 'highland_fresh_db' 
AND table_name IN (
    'suppliers',
    'supplier_raw_materials',
    'purchase_orders',
    'purchase_order_items',
    'products',
    'production_batches'
);
