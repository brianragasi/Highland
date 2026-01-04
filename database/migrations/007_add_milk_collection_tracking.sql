-- Add milk collection tracking with RMR numbers and aging alerts
-- User 4 FIFO Implementation: QC Officer Milk Tracking
-- Date: December 2, 2025

USE highland_fresh_db;

-- Create milk_daily_collections table if not exists (or enhance existing)
CREATE TABLE IF NOT EXISTS milk_daily_collections (
    collection_id INT AUTO_INCREMENT PRIMARY KEY,
    rmr_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Raw Milk Receipt number: RMR-YYYYMMDD-XXX',
    supplier_id INT NOT NULL COMMENT 'FK to suppliers (dairy cooperative/farmer)',
    collection_date DATE NOT NULL COMMENT 'Date of milk collection',
    collection_time TIME NOT NULL COMMENT 'Exact time of collection',
    collection_datetime DATETIME GENERATED ALWAYS AS (CONCAT(collection_date, ' ', collection_time)) STORED,
    
    -- Quantities
    liters_delivered DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Total liters delivered',
    liters_accepted DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Liters accepted after QC',
    liters_rejected DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Liters rejected by QC',
    
    -- Quality test results
    temperature DECIMAL(4,2) NULL COMMENT 'Temperature at receipt (°C)',
    fat_content DECIMAL(4,2) NULL COMMENT 'Fat percentage',
    protein_content DECIMAL(4,2) NULL COMMENT 'Protein percentage',
    lactose_content DECIMAL(4,2) NULL COMMENT 'Lactose percentage',
    ph_level DECIMAL(4,2) NULL COMMENT 'pH level',
    titratable_acidity DECIMAL(4,2) NULL COMMENT 'Acidity measurement',
    alcohol_test_passed TINYINT(1) DEFAULT NULL COMMENT '1=Passed, 0=Failed',
    bacterial_count INT NULL COMMENT 'CFU/ml',
    somatic_cell_count INT NULL COMMENT 'cells/ml',
    antibiotics_detected TINYINT(1) DEFAULT 0 COMMENT '1=Detected (REJECT), 0=Not detected',
    
    -- Expiry tracking (CRITICAL for FIFO)
    expiry_hours INT DEFAULT 48 COMMENT 'Hours until expiry (default 48)',
    expiry_datetime DATETIME GENERATED ALWAYS AS (DATE_ADD(collection_datetime, INTERVAL expiry_hours HOUR)) STORED COMMENT 'Auto-calculated expiry',
    
    -- Rejection details
    rejection_reason TEXT NULL COMMENT 'Reason for rejection if any',
    rejection_category ENUM('TEMPERATURE', 'ACIDITY', 'ANTIBIOTICS', 'CONTAMINATION', 'ADULTERATION', 'OTHER') NULL,
    
    -- Pricing
    base_price_per_liter DECIMAL(10,2) DEFAULT 40.00 COMMENT 'Base price per liter',
    quality_bonus DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Quality bonus per liter',
    transport_fee DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Transport deduction',
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (
        (liters_accepted * (base_price_per_liter + quality_bonus)) - transport_fee
    ) STORED COMMENT 'Total payable amount',
    
    -- Processing status
    processing_status ENUM('PENDING', 'IN_PRODUCTION', 'PROCESSED', 'EXPIRED', 'REJECTED') DEFAULT 'PENDING',
    processed_at DATETIME NULL COMMENT 'When milk was sent to production',
    processed_batch_id INT NULL COMMENT 'FK to production_batches if processed',
    
    -- Audit
    qc_officer_id INT NULL COMMENT 'FK to staff_users - QC who received',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    KEY idx_rmr_number (rmr_number),
    KEY idx_supplier_id (supplier_id),
    KEY idx_collection_date (collection_date),
    KEY idx_expiry_datetime (expiry_datetime),
    KEY idx_processing_status (processing_status),
    KEY idx_qc_officer (qc_officer_id),
    
    -- Foreign keys
    CONSTRAINT fk_milk_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    CONSTRAINT fk_milk_qc_officer FOREIGN KEY (qc_officer_id) 
        REFERENCES staff_users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_milk_production_batch FOREIGN KEY (processed_batch_id) 
        REFERENCES production_batches(batch_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Daily milk collections from farmers/cooperatives with QC tracking';

-- Create view for milk aging status (FIFO alert system)
CREATE OR REPLACE VIEW v_milk_aging_status AS
SELECT 
    mc.collection_id,
    mc.rmr_number,
    mc.supplier_id,
    s.company_name as supplier_name,
    s.contact_name as contact_person,
    mc.collection_date,
    mc.collection_time,
    mc.collection_datetime,
    mc.liters_delivered,
    mc.liters_accepted,
    mc.liters_rejected,
    mc.processing_status,
    mc.expiry_datetime,
    
    -- Age calculations
    TIMESTAMPDIFF(HOUR, mc.collection_datetime, NOW()) as age_hours,
    TIMESTAMPDIFF(MINUTE, mc.collection_datetime, NOW()) as age_minutes,
    TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) as hours_until_expiry,
    
    -- Status color coding
    CASE 
        WHEN mc.processing_status IN ('PROCESSED', 'REJECTED', 'EXPIRED') THEN 'COMPLETED'
        WHEN mc.expiry_datetime <= NOW() THEN 'EXPIRED'
        WHEN TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) <= 6 THEN 'CRITICAL'
        WHEN TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) <= 12 THEN 'WARNING'
        WHEN TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) <= 24 THEN 'CAUTION'
        ELSE 'OK'
    END as aging_status,
    
    -- Alert priority
    CASE 
        WHEN mc.expiry_datetime <= NOW() THEN 1
        WHEN TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) <= 6 THEN 2
        WHEN TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) <= 12 THEN 3
        WHEN TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) <= 24 THEN 4
        ELSE 5
    END as alert_priority,
    
    -- Quality data
    mc.temperature,
    mc.fat_content,
    mc.ph_level,
    mc.qc_officer_id,
    mc.created_at
    
FROM milk_daily_collections mc
LEFT JOIN suppliers s ON mc.supplier_id = s.supplier_id
WHERE mc.processing_status NOT IN ('REJECTED')
ORDER BY alert_priority ASC, mc.collection_datetime ASC;

-- Create stored procedure to auto-expire old milk
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS expire_old_milk_batches()
BEGIN
    UPDATE milk_daily_collections 
    SET processing_status = 'EXPIRED',
        notes = CONCAT(COALESCE(notes, ''), ' [AUTO-EXPIRED: ', NOW(), ']')
    WHERE processing_status = 'PENDING'
      AND expiry_datetime < NOW();
    
    SELECT ROW_COUNT() as batches_expired;
END //

DELIMITER ;

-- Create trigger to auto-generate RMR number
DELIMITER //

CREATE TRIGGER IF NOT EXISTS trg_generate_rmr_number
BEFORE INSERT ON milk_daily_collections
FOR EACH ROW
BEGIN
    DECLARE next_seq INT;
    
    IF NEW.rmr_number IS NULL OR NEW.rmr_number = '' THEN
        -- Get next sequence number for today
        SELECT COALESCE(MAX(
            CAST(SUBSTRING_INDEX(rmr_number, '-', -1) AS UNSIGNED)
        ), 0) + 1 INTO next_seq
        FROM milk_daily_collections
        WHERE DATE(collection_date) = NEW.collection_date;
        
        SET NEW.rmr_number = CONCAT('RMR-', DATE_FORMAT(NEW.collection_date, '%Y%m%d'), '-', LPAD(next_seq, 3, '0'));
    END IF;
END //

DELIMITER ;

-- Insert sample data for testing (optional)
-- INSERT INTO milk_daily_collections (supplier_id, collection_date, collection_time, liters_delivered, liters_accepted, temperature, fat_content, ph_level, qc_officer_id)
-- VALUES 
-- (1, CURDATE(), '06:00:00', 100, 100, 4.0, 3.8, 6.6, 1),
-- (1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '06:30:00', 150, 145, 4.2, 3.9, 6.5, 1);

SELECT 'Milk collection tracking migration completed successfully' as status;
