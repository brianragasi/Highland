-- Add batch reservation system for FIFO locking
-- This ensures reserved batches are unavailable for other orders
-- Date: December 2, 2025
-- User 3 FIFO Gap 3: Batch Locking Mechanism

USE highland_fresh_db;

-- Create batch_reservations table for tracking reserved inventory
CREATE TABLE IF NOT EXISTS batch_reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL COMMENT 'FK to production_batches',
    sale_id INT NOT NULL COMMENT 'FK to sales - order that reserved this batch',
    sale_item_id INT NULL COMMENT 'FK to sale_items - specific line item',
    product_id INT NOT NULL COMMENT 'FK to products',
    reserved_quantity DECIMAL(10,3) NOT NULL COMMENT 'Quantity reserved from this batch',
    reservation_status ENUM('active', 'fulfilled', 'released', 'expired') DEFAULT 'active',
    reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reserved_by INT NULL COMMENT 'FK to staff_users',
    fulfilled_at DATETIME NULL COMMENT 'When reservation was fulfilled (dispatch)',
    released_at DATETIME NULL COMMENT 'When reservation was released (cancelled)',
    expiry_time DATETIME NULL COMMENT 'When reservation auto-expires if not fulfilled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    KEY idx_batch_id (batch_id),
    KEY idx_sale_id (sale_id),
    KEY idx_product_id (product_id),
    KEY idx_status (reservation_status),
    KEY idx_expiry (expiry_time),
    
    CONSTRAINT fk_reservation_batch FOREIGN KEY (batch_id) 
        REFERENCES production_batches(batch_id) ON DELETE CASCADE,
    CONSTRAINT fk_reservation_sale FOREIGN KEY (sale_id) 
        REFERENCES sales(sale_id) ON DELETE CASCADE,
    CONSTRAINT fk_reservation_product FOREIGN KEY (product_id) 
        REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Tracks FIFO batch reservations for sales orders - prevents double-selling';

-- Add reserved_quantity column to production_batches if not exists
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS reserved_quantity DECIMAL(10,3) DEFAULT 0.000 
COMMENT 'Total quantity reserved by pending orders (not yet dispatched)' AFTER quantity_remaining;

-- Add product_id column to production_batches if not exists (for non-recipe batches)
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS product_id INT NULL 
COMMENT 'FK to products - for batches not tied to a recipe' AFTER recipe_id;

-- Add expiry_date column to production_batches if not exists
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS expiry_date DATE NULL 
COMMENT 'Expiry date for the batch - calculated from production_date' AFTER production_date;

-- Add highland_fresh_batch_code column to production_batches if not exists
ALTER TABLE production_batches
ADD COLUMN IF NOT EXISTS highland_fresh_batch_code VARCHAR(50) NULL 
COMMENT 'Highland Fresh unique batch code for traceability' AFTER batch_number;

-- Create view for available batch quantity (excluding reservations)
CREATE OR REPLACE VIEW available_batch_inventory AS
SELECT 
    pb.batch_id,
    pb.batch_number,
    pb.highland_fresh_batch_code,
    pb.product_id,
    pr.finished_product_id,
    COALESCE(pb.product_id, pr.finished_product_id) as effective_product_id,
    pb.production_date,
    pb.expiry_date,
    pb.quantity_remaining,
    COALESCE(pb.reserved_quantity, 0) as reserved_quantity,
    (pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) as available_quantity,
    pb.status
FROM production_batches pb
LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
WHERE pb.status = 'Completed'
  AND pb.quantity_remaining > 0
  AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE());

-- Create stored procedure to clean up expired reservations
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS cleanup_expired_reservations()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_reservation_id INT;
    DECLARE v_batch_id INT;
    DECLARE v_reserved_qty DECIMAL(10,3);
    
    -- Cursor for expired active reservations
    DECLARE expired_cursor CURSOR FOR 
        SELECT reservation_id, batch_id, reserved_quantity 
        FROM batch_reservations 
        WHERE reservation_status = 'active' 
          AND expiry_time IS NOT NULL 
          AND expiry_time < NOW();
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN expired_cursor;
    
    cleanup_loop: LOOP
        FETCH expired_cursor INTO v_reservation_id, v_batch_id, v_reserved_qty;
        IF done THEN
            LEAVE cleanup_loop;
        END IF;
        
        -- Release the reservation
        UPDATE batch_reservations 
        SET reservation_status = 'expired', 
            released_at = NOW() 
        WHERE reservation_id = v_reservation_id;
        
        -- Return quantity to batch
        UPDATE production_batches 
        SET reserved_quantity = reserved_quantity - v_reserved_qty 
        WHERE batch_id = v_batch_id;
    END LOOP;
    
    CLOSE expired_cursor;
    
    SELECT ROW_COUNT() as reservations_released;
END //

DELIMITER ;

-- Add index for better FIFO query performance
CREATE INDEX IF NOT EXISTS idx_pb_fifo ON production_batches(production_date ASC, batch_id ASC);

SELECT 'Batch reservation system created successfully!' AS Result;
