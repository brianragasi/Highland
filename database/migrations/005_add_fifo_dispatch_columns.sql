-- Add missing columns for FIFO dispatch tracking
-- Date: October 22, 2025

USE highland_fresh_db;

-- 1. Add batch_id to sale_items if it doesn't exist
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS batch_id INT NULL COMMENT 'Batch used for this item (FIFO tracking)' AFTER product_id;

-- 2. Add quantity_remaining to production_batches if it doesn't exist
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS quantity_remaining DECIMAL(10,3) DEFAULT 0 COMMENT 'Remaining quantity available for dispatch';

-- 3. Initialize quantity_remaining from yield_quantity for existing batches
UPDATE production_batches 
SET quantity_remaining = yield_quantity 
WHERE quantity_remaining IS NULL OR quantity_remaining = 0;

-- 4. Add dispatch tracking columns to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS dispatch_date DATETIME NULL COMMENT 'When order was dispatched',
ADD COLUMN IF NOT EXISTS dispatched_by INT NULL COMMENT 'User ID who dispatched the order';

SELECT 'FIFO dispatch columns added successfully' AS Result;
