-- Add approval tracking columns to sales table (without foreign keys)
-- For Warehouse Manager order approval workflow  
-- Date: October 22, 2025

USE highland_fresh_db;

-- Add columns only if they don't exist
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS approved_by INT NULL COMMENT 'User ID of approver (Warehouse Manager/Admin)' AFTER status_id,
ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL COMMENT 'Timestamp when order was approved' AFTER approved_by,
ADD COLUMN IF NOT EXISTS rejected_by INT NULL COMMENT 'User ID of rejector (Warehouse Manager/Admin)' AFTER approved_at,
ADD COLUMN IF NOT EXISTS rejected_at DATETIME NULL COMMENT 'Timestamp when order was rejected' AFTER rejected_by,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL COMMENT 'Reason provided for order rejection' AFTER rejected_at;

SELECT 'Approval tracking columns added to sales table' AS Result;
