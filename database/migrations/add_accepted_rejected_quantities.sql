-- Migration: Add accepted_quantity and rejected_quantity columns to purchase_order_items
-- Date: 2025-10-23
-- Purpose: Track separately the accepted vs rejected quantities when receiving deliveries
--          This allows proper quality control tracking and ensures only accepted quantities
--          increase inventory (as per PROC-03 requirement)

-- Add new columns to purchase_order_items table
ALTER TABLE purchase_order_items
ADD COLUMN accepted_quantity DECIMAL(10,3) DEFAULT 0.00 AFTER received_quantity,
ADD COLUMN rejected_quantity DECIMAL(10,3) DEFAULT 0.00 AFTER accepted_quantity;

-- Add comment to explain the columns
ALTER TABLE purchase_order_items
MODIFY COLUMN received_quantity DECIMAL(10,3) DEFAULT 0.00 COMMENT 'Total processed (accepted + rejected)',
MODIFY COLUMN accepted_quantity DECIMAL(10,3) DEFAULT 0.00 COMMENT 'Quantity accepted (increases inventory)',
MODIFY COLUMN rejected_quantity DECIMAL(10,3) DEFAULT 0.00 COMMENT 'Quantity rejected (quality issues, tracked only)';

-- Update existing records: assume all previously received quantities were accepted
UPDATE purchase_order_items
SET accepted_quantity = received_quantity,
    rejected_quantity = 0
WHERE received_quantity > 0;

-- Verify the migration
SELECT 
    'Migration completed' as status,
    COUNT(*) as total_items,
    SUM(CASE WHEN received_quantity > 0 THEN 1 ELSE 0 END) as items_with_receipts,
    SUM(accepted_quantity) as total_accepted,
    SUM(rejected_quantity) as total_rejected
FROM purchase_order_items;
