-- Add batch_id column to sale_items for FIFO tracking (simplified)
-- Date: October 22, 2025

USE highland_fresh_db;

-- Add batch_id column to sale_items table
ALTER TABLE sale_items 
ADD COLUMN batch_id INT NULL COMMENT 'FK to production_batches - tracks which batch was dispatched (FIFO)' AFTER product_id;

-- Add foreign key constraint for batch_id
ALTER TABLE sale_items 
ADD CONSTRAINT fk_sale_items_batch 
FOREIGN KEY (batch_id) REFERENCES production_batches(batch_id) 
ON DELETE SET NULL;

-- Add quantity_remaining to production_batches for FIFO tracking
ALTER TABLE production_batches
ADD COLUMN quantity_remaining DECIMAL(10,3) NULL COMMENT 'Remaining quantity available for dispatch (FIFO)' AFTER yield_quantity;

-- Initialize quantity_remaining with yield_quantity for existing batches
UPDATE production_batches 
SET quantity_remaining = yield_quantity 
WHERE quantity_remaining IS NULL AND yield_quantity IS NOT NULL;

SELECT 'FIFO batch tracking columns added successfully!' AS Result;
