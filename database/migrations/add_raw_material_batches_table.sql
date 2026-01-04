-- Migration: Add raw_material_batches table for FIFO tracking
-- Date: December 2, 2025
-- Purpose: Enable FIFO (First-In-First-Out) inventory management for raw materials

-- ============================================================================
-- CREATE RAW MATERIAL BATCHES TABLE
-- ============================================================================
-- This table tracks individual batches of raw materials received from suppliers.
-- Each batch has its own received_date, expiry_date, and current_quantity
-- to enable FIFO consumption (oldest batches used first).

CREATE TABLE IF NOT EXISTS raw_material_batches (
    batch_id INT(11) NOT NULL AUTO_INCREMENT,
    highland_fresh_batch_code VARCHAR(50) NOT NULL,
    raw_material_id INT(11) NOT NULL,
    po_item_id INT(11) NULL COMMENT 'Reference to purchase_order_items',
    supplier_id INT(11) NULL,
    
    -- Quantity tracking
    quantity_received DECIMAL(10,3) NOT NULL DEFAULT 0,
    current_quantity DECIMAL(10,3) NOT NULL DEFAULT 0 COMMENT 'Remaining quantity after consumption',
    unit_cost DECIMAL(10,2) NULL,
    
    -- Date tracking for FIFO
    received_date DATE NOT NULL COMMENT 'When batch was received - used for FIFO ordering',
    expiry_date DATE NULL COMMENT 'Expiration date - also used for FIFO priority',
    production_date DATE NULL COMMENT 'Manufacturing/production date from supplier',
    
    -- Quality tracking
    quality_grade_received ENUM('Grade A', 'Grade B', 'Grade C', 'Premium', 'Standard') NULL,
    temperature_at_receipt DECIMAL(4,1) NULL,
    quality_test_required TINYINT(1) DEFAULT 0,
    quality_test_passed TINYINT(1) NULL,
    quality_test_date DATETIME NULL,
    quality_test_notes TEXT NULL,
    
    -- Storage
    storage_location VARCHAR(100) NULL COMMENT 'Physical location in warehouse',
    
    -- Status
    status ENUM('RECEIVED', 'IN_QC', 'APPROVED', 'REJECTED', 'CONSUMED', 'EXPIRED') DEFAULT 'RECEIVED',
    highland_fresh_approved TINYINT(1) DEFAULT 0,
    
    -- Traceability
    milk_source_cooperative VARCHAR(255) NULL,
    lot_number VARCHAR(50) NULL,
    
    -- Metadata
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT(11) NULL,
    
    PRIMARY KEY (batch_id),
    INDEX idx_raw_material_id (raw_material_id),
    INDEX idx_highland_fresh_batch_code (highland_fresh_batch_code),
    INDEX idx_received_date (received_date),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_status (status),
    INDEX idx_current_quantity (current_quantity),
    INDEX idx_fifo_order (raw_material_id, received_date, batch_id),
    
    CONSTRAINT fk_rmb_raw_material FOREIGN KEY (raw_material_id) 
        REFERENCES raw_materials(raw_material_id) ON DELETE RESTRICT,
    CONSTRAINT fk_rmb_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    CONSTRAINT fk_rmb_po_item FOREIGN KEY (po_item_id) 
        REFERENCES purchase_order_items(po_item_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Raw material batch tracking for FIFO inventory management';

-- ============================================================================
-- CREATE RAW MATERIAL CONSUMPTION TABLE  
-- ============================================================================
-- Tracks consumption of raw material batches for production
-- Maintains traceability from raw material batch to production batch

CREATE TABLE IF NOT EXISTS raw_material_consumption (
    consumption_id INT(11) NOT NULL AUTO_INCREMENT,
    batch_id INT(11) NOT NULL COMMENT 'Reference to raw_material_batches',
    highland_fresh_batch_code VARCHAR(50) NOT NULL,
    raw_material_id INT(11) NOT NULL,
    production_batch_id INT(11) NULL COMMENT 'Reference to production_batches',
    
    quantity_consumed DECIMAL(10,3) NOT NULL,
    consumption_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumption_reason ENUM('PRODUCTION', 'WASTAGE', 'EXPIRED', 'QUALITY_REJECT', 'ADJUSTMENT') DEFAULT 'PRODUCTION',
    
    consumed_by INT(11) NULL COMMENT 'User who performed the consumption',
    verified_by INT(11) NULL COMMENT 'User who verified FIFO compliance',
    
    -- Traceability JSON
    highland_fresh_traceability JSON NULL COMMENT 'Full traceability data for audit',
    
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (consumption_id),
    INDEX idx_batch_id (batch_id),
    INDEX idx_raw_material_id (raw_material_id),
    INDEX idx_production_batch_id (production_batch_id),
    INDEX idx_consumption_date (consumption_date),
    
    CONSTRAINT fk_rmc_batch FOREIGN KEY (batch_id) 
        REFERENCES raw_material_batches(batch_id) ON DELETE RESTRICT,
    CONSTRAINT fk_rmc_raw_material FOREIGN KEY (raw_material_id) 
        REFERENCES raw_materials(raw_material_id) ON DELETE RESTRICT,
    CONSTRAINT fk_rmc_production_batch FOREIGN KEY (production_batch_id) 
        REFERENCES production_batches(batch_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Raw material consumption tracking for FIFO traceability';

-- ============================================================================
-- CREATE RAW MATERIAL TEMPERATURE LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_material_temperature_log (
    log_id INT(11) NOT NULL AUTO_INCREMENT,
    raw_material_id INT(11) NOT NULL,
    batch_id INT(11) NULL,
    temperature DECIMAL(4,1) NOT NULL,
    event_type ENUM('RECEIPT', 'STORAGE', 'MONITORING', 'TRANSFER', 'ISSUANCE') DEFAULT 'MONITORING',
    compliance_status ENUM('COMPLIANT', 'NON_COMPLIANT', 'WARNING', 'UNKNOWN') DEFAULT 'UNKNOWN',
    recorded_by VARCHAR(100) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    
    PRIMARY KEY (log_id),
    INDEX idx_raw_material_id (raw_material_id),
    INDEX idx_batch_id (batch_id),
    INDEX idx_timestamp (timestamp),
    
    CONSTRAINT fk_rmtl_raw_material FOREIGN KEY (raw_material_id) 
        REFERENCES raw_materials(raw_material_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Temperature monitoring log for cold chain compliance';

-- ============================================================================
-- CREATE RAW MATERIAL QUALITY TESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_material_quality_tests (
    test_id INT(11) NOT NULL AUTO_INCREMENT,
    batch_id INT(11) NOT NULL,
    highland_fresh_batch_code VARCHAR(50) NOT NULL,
    raw_material_id INT(11) NOT NULL,
    
    test_type JSON NULL COMMENT 'Types of tests performed',
    scheduled_date DATE NULL,
    completed_date DATETIME NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    
    test_results JSON NULL,
    pass_fail_status ENUM('PENDING', 'PASS', 'FAIL', 'CONDITIONAL') DEFAULT 'PENDING',
    
    technician VARCHAR(100) NULL,
    highland_fresh_standards JSON NULL,
    highland_fresh_compliance JSON NULL,
    
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (test_id),
    INDEX idx_batch_id (batch_id),
    INDEX idx_raw_material_id (raw_material_id),
    INDEX idx_status (status),
    
    CONSTRAINT fk_rmqt_batch FOREIGN KEY (batch_id) 
        REFERENCES raw_material_batches(batch_id) ON DELETE CASCADE,
    CONSTRAINT fk_rmqt_raw_material FOREIGN KEY (raw_material_id) 
        REFERENCES raw_materials(raw_material_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Quality test tracking for raw material batches';

-- ============================================================================
-- ADD storage_temp columns to raw_materials if not exists
-- ============================================================================

-- Check and add storage_temp_min
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'raw_materials' 
               AND COLUMN_NAME = 'storage_temp_min');
SET @query := IF(@exist = 0, 
    'ALTER TABLE raw_materials ADD COLUMN storage_temp_min DECIMAL(4,1) NULL DEFAULT 2.0 COMMENT ''Min storage temp in Celsius''',
    'SELECT ''Column storage_temp_min already exists'' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add storage_temp_max
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'raw_materials' 
               AND COLUMN_NAME = 'storage_temp_max');
SET @query := IF(@exist = 0, 
    'ALTER TABLE raw_materials ADD COLUMN storage_temp_max DECIMAL(4,1) NULL DEFAULT 6.0 COMMENT ''Max storage temp in Celsius''',
    'SELECT ''Column storage_temp_max already exists'' AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- INSERT SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Note: Uncomment below to insert test data
/*
INSERT INTO raw_material_batches (
    highland_fresh_batch_code, raw_material_id, supplier_id,
    quantity_received, current_quantity, unit_cost,
    received_date, expiry_date, quality_grade_received,
    storage_location, status, highland_fresh_approved
) 
SELECT 
    CONCAT('HF-RM-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', raw_material_id, '-001'),
    raw_material_id,
    (SELECT supplier_id FROM suppliers WHERE is_active = 1 LIMIT 1),
    quantity_on_hand,
    quantity_on_hand,
    cost_per_unit,
    DATE_SUB(CURDATE(), INTERVAL 5 DAY),
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    'Grade A',
    'Warehouse A - Shelf 1',
    'APPROVED',
    1
FROM raw_materials 
WHERE quantity_on_hand > 0
LIMIT 5;
*/

SELECT 'Migration completed successfully!' AS status;
