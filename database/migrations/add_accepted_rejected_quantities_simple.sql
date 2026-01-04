-- Migration: Add accepted_quantity and rejected_quantity columns to purchase_order_items
-- Date: 2025-10-23

-- Step 1: Add new columns
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS accepted_quantity DECIMAL(10,3) DEFAULT 0.00 AFTER received_quantity,
ADD COLUMN IF NOT EXISTS rejected_quantity DECIMAL(10,3) DEFAULT 0.00 AFTER accepted_quantity;

-- Step 2: Add comments
ALTER TABLE purchase_order_items
MODIFY COLUMN received_quantity DECIMAL(10,3) DEFAULT 0.00 COMMENT 'Total processed (accepted + rejected)',
MODIFY COLUMN accepted_quantity DECIMAL(10,3) DEFAULT 0.00 COMMENT 'Quantity accepted (increases inventory)',
MODIFY COLUMN rejected_quantity DECIMAL(10,3) DEFAULT 0.00 COMMENT 'Quantity rejected (quality issues, tracked only)';

-- Verification query (run separately if needed)
-- SELECT COUNT(*) as total_items FROM purchase_order_items;
