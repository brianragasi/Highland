-- Add quantity_remaining to production_batches for FIFO tracking
-- Date: October 22, 2025

USE highland_fresh_db;

-- Check and add quantity_remaining if not exists
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS quantity_remaining DECIMAL(10,3) NULL COMMENT 'Remaining quantity available for dispatch (FIFO)' AFTER yield_quantity;

-- Initialize quantity_remaining with yield_quantity for existing batches
UPDATE production_batches 
SET quantity_remaining = yield_quantity 
WHERE quantity_remaining IS NULL AND yield_quantity IS NOT NULL;

-- For batches without yield_quantity, set to batch_size
UPDATE production_batches 
SET quantity_remaining = batch_size 
WHERE quantity_remaining IS NULL AND batch_size IS NOT NULL;

SELECT 'quantity_remaining column added/updated successfully!' AS Result;
