-- Add batch_id column to sale_items for FIFO tracking
-- This is CRITICAL for Highland Fresh's batch tracking and FIFO dispatch enforcement
-- Date: October 22, 2025

USE highland_fresh_db;

-- Add batch_id column to sale_items table
ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS batch_id INT NULL COMMENT 'FK to production_batches - tracks which batch was dispatched (FIFO)' AFTER product_id;

-- Add foreign key constraint
-- Note: Using a separate statement to handle cases where column exists but FK doesn't
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'fk_sale_items_batch' 
    AND TABLE_NAME = 'sale_items' 
    AND TABLE_SCHEMA = 'highland_fresh_db'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE sale_items ADD CONSTRAINT fk_sale_items_batch FOREIGN KEY (batch_id) REFERENCES production_batches(batch_id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists" AS Result'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add dispatched_at column to sales table if not exists
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS dispatched_at DATETIME NULL COMMENT 'Timestamp when order was dispatched by warehouse staff' AFTER approved_at;

-- Add dispatched_by column to sales table if not exists
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS dispatched_by INT NULL COMMENT 'User ID of warehouse staff who dispatched the order' AFTER dispatched_at;

-- Add foreign key for dispatched_by
SET @fk_exists2 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'fk_sales_dispatched_by' 
    AND TABLE_NAME = 'sales' 
    AND TABLE_SCHEMA = 'highland_fresh_db'
);

SET @sql2 = IF(@fk_exists2 = 0,
    'ALTER TABLE sales ADD CONSTRAINT fk_sales_dispatched_by FOREIGN KEY (dispatched_by) REFERENCES staff_users(user_id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists" AS Result'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add quantity_remaining to production_batches if not exists (for FIFO tracking)
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS quantity_remaining DECIMAL(10,3) NULL COMMENT 'Remaining quantity available for dispatch (FIFO)' AFTER yield_quantity;

-- Initialize quantity_remaining with yield_quantity for existing batches
UPDATE production_batches 
SET quantity_remaining = yield_quantity 
WHERE quantity_remaining IS NULL AND yield_quantity IS NOT NULL;

SELECT 'FIFO batch tracking columns added successfully!' AS Result;
