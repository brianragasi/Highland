-- Migration: Remove redundant columns from suppliers table
-- Date: 2025-10-23
-- Purpose: Remove duplicate text columns that conflict with foreign key relationships
-- Impact: Removes city, country, and payment_terms varchar columns in favor of _id columns

USE highland_fresh_db;

-- Step 1: Verify foreign key columns have data
-- (This is a safety check - migration will fail if there are NULLs in required FK columns)
SELECT 
    'Data Check' as step,
    COUNT(*) as total_suppliers,
    COUNT(city_id) as suppliers_with_city_id,
    COUNT(country_id) as suppliers_with_country_id,
    COUNT(payment_term_id) as suppliers_with_payment_term_id
FROM suppliers;

-- Step 2: Show what will be removed (for review)
SELECT 
    'Before Migration' as step,
    supplier_id,
    name,
    city as city_text_TO_BE_REMOVED,
    city_id as city_id_KEEPING,
    country as country_text_TO_BE_REMOVED,
    country_id as country_id_KEEPING,
    payment_terms as payment_terms_text_TO_BE_REMOVED,
    payment_term_id as payment_term_id_KEEPING
FROM suppliers
ORDER BY supplier_id;

-- Step 3: Drop the redundant columns
-- NOTE: Uncomment the lines below to actually execute the migration

-- ALTER TABLE suppliers
-- DROP COLUMN city,
-- DROP COLUMN country,
-- DROP COLUMN payment_terms;

-- Step 4: Verify the migration (uncomment after running Step 3)
-- SELECT 
--     'After Migration' as step,
--     COUNT(*) as total_suppliers,
--     COUNT(city_id) as suppliers_with_city_id,
--     COUNT(country_id) as suppliers_with_country_id,
--     COUNT(payment_term_id) as suppliers_with_payment_term_id
-- FROM suppliers;

-- Step 5: Show new schema (uncomment after running Step 3)
-- SHOW CREATE TABLE suppliers\G

-- ROLLBACK INSTRUCTIONS:
-- If you need to restore the columns (NOT RECOMMENDED - defeats normalization):
-- ALTER TABLE suppliers
-- ADD COLUMN city varchar(100) DEFAULT NULL AFTER city_id,
-- ADD COLUMN country varchar(100) DEFAULT 'Philippines' AFTER country_id,
-- ADD COLUMN payment_terms varchar(100) DEFAULT 'Net 30' AFTER payment_term_id;
