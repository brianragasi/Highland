-- ============================================================================
-- Migration: Add Expiry Date Tracking to Production Batches
-- Date: October 23, 2025
-- Description: Adds expiry_date column to production_batches table for 
--              food safety compliance (dairy products)
-- ============================================================================

USE highland_fresh_db;

-- Step 1: Add expiry_date column to production_batches
ALTER TABLE production_batches 
ADD COLUMN expiry_date DATE NULL 
COMMENT 'Product expiry date for food safety tracking'
AFTER production_date;

-- Step 2: Set default expiry dates for existing batches (7 days from production for dairy)
UPDATE production_batches 
SET expiry_date = DATE_ADD(production_date, INTERVAL 7 DAY)
WHERE expiry_date IS NULL;

-- Step 3: Add index for performance when querying expired products
ALTER TABLE production_batches 
ADD INDEX idx_expiry_date (expiry_date);

-- Step 4: Verify the changes
DESCRIBE production_batches;

-- Step 5: Show sample batches with expiry dates
SELECT 
    batch_id,
    batch_number,
    production_date,
    expiry_date,
    DATEDIFF(expiry_date, CURDATE()) as days_to_expiry,
    status
FROM production_batches
ORDER BY production_date DESC
LIMIT 10;

-- ============================================================================
-- NOTES:
-- - Default shelf life set to 7 days for dairy products
-- - Products can have different expiry periods based on type
-- - Expiry dates can be updated during batch creation/completion
-- - System will now prevent selling expired products to customers
-- ============================================================================
