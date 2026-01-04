-- Spoilage Tracking and FIFO Bypass Detection
-- User 5 FIFO Implementation: Finance Officer Reports
-- Date: December 2, 2025

USE highland_fresh_db;

-- =============================================================================
-- SPOILAGE LOG TABLE
-- Track all expired batches and spoilage incidents
-- =============================================================================
CREATE TABLE IF NOT EXISTS spoilage_log (
    spoilage_id INT AUTO_INCREMENT PRIMARY KEY,
    spoilage_reference VARCHAR(50) NOT NULL UNIQUE COMMENT 'SPL-YYYYMMDD-XXX',
    
    -- Source identification
    source_type ENUM('PRODUCTION_BATCH', 'RAW_MATERIAL', 'RAW_MILK') NOT NULL,
    batch_id INT NULL COMMENT 'FK to production_batches if finished goods',
    raw_material_batch_id INT NULL COMMENT 'FK to raw_material_batches if raw material',
    milk_collection_id INT NULL COMMENT 'FK to milk_daily_collections if raw milk',
    
    -- Product/Material info
    product_id INT NULL COMMENT 'FK to products',
    raw_material_id INT NULL COMMENT 'FK to raw_materials',
    batch_number VARCHAR(100) NULL COMMENT 'Batch code for reference',
    item_name VARCHAR(255) NOT NULL COMMENT 'Product or material name',
    
    -- Spoilage details
    spoilage_type ENUM('EXPIRED', 'DAMAGED', 'CONTAMINATED', 'QUALITY_REJECT', 'FIFO_BYPASS') NOT NULL,
    spoilage_reason TEXT NULL COMMENT 'Detailed reason for spoilage',
    
    -- Quantities
    quantity_spoiled DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(20) DEFAULT 'units',
    
    -- Cost calculation
    unit_cost DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Cost per unit',
    total_loss DECIMAL(14,2) GENERATED ALWAYS AS (quantity_spoiled * unit_cost) STORED COMMENT 'Total financial loss',
    
    -- Dates
    production_date DATE NULL COMMENT 'When item was produced/received',
    expiry_date DATE NULL COMMENT 'Original expiry date',
    spoilage_date DATE NOT NULL COMMENT 'When spoilage was recorded',
    days_expired INT GENERATED ALWAYS AS (DATEDIFF(spoilage_date, expiry_date)) STORED COMMENT 'Days past expiry',
    
    -- FIFO Bypass tracking
    fifo_bypassed TINYINT(1) DEFAULT 0 COMMENT '1 if newer batch was used before this one',
    bypass_evidence TEXT NULL COMMENT 'Details of FIFO bypass if detected',
    bypassing_batch_id INT NULL COMMENT 'ID of batch that was incorrectly used first',
    bypass_date DATETIME NULL COMMENT 'When FIFO was bypassed',
    
    -- Responsibility
    responsible_user_id INT NULL COMMENT 'Staff responsible (if identifiable)',
    reported_by INT NULL COMMENT 'User who reported the spoilage',
    approved_by INT NULL COMMENT 'Finance officer who approved write-off',
    
    -- Status
    status ENUM('PENDING', 'VERIFIED', 'APPROVED', 'WRITTEN_OFF', 'RECOVERED') DEFAULT 'PENDING',
    recovery_amount DECIMAL(14,2) DEFAULT 0.00 COMMENT 'Any recovered value',
    net_loss DECIMAL(14,2) GENERATED ALWAYS AS (quantity_spoiled * unit_cost - recovery_amount) STORED,
    
    -- Insurance/Recovery
    insurance_claim_filed TINYINT(1) DEFAULT 0,
    insurance_claim_number VARCHAR(100) NULL,
    
    -- Audit
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    KEY idx_spoilage_ref (spoilage_reference),
    KEY idx_source_type (source_type),
    KEY idx_batch_id (batch_id),
    KEY idx_spoilage_type (spoilage_type),
    KEY idx_spoilage_date (spoilage_date),
    KEY idx_status (status),
    KEY idx_fifo_bypassed (fifo_bypassed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Track spoilage incidents for finance reporting and FIFO compliance';

-- =============================================================================
-- DISPATCH AUDIT LOG TABLE
-- Track all dispatches for FIFO bypass detection
-- =============================================================================
CREATE TABLE IF NOT EXISTS dispatch_audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Order info
    sales_order_id INT NOT NULL,
    order_item_id INT NULL,
    
    -- Product dispatched
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Batch dispatched
    dispatched_batch_id INT NOT NULL COMMENT 'Batch that was actually dispatched',
    dispatched_batch_number VARCHAR(100) NOT NULL,
    dispatched_batch_production_date DATE NOT NULL,
    dispatched_batch_expiry_date DATE NOT NULL,
    
    -- Oldest available batch at time of dispatch
    oldest_available_batch_id INT NULL COMMENT 'Batch that SHOULD have been dispatched (FIFO)',
    oldest_batch_production_date DATE NULL,
    oldest_batch_expiry_date DATE NULL,
    
    -- FIFO compliance
    fifo_compliant TINYINT(1) DEFAULT 1 COMMENT '1=Correct batch used, 0=FIFO bypassed',
    days_newer INT NULL COMMENT 'If bypassed, how many days newer was dispatched batch',
    
    -- Dispatch details
    quantity_dispatched DECIMAL(12,2) NOT NULL,
    dispatch_date DATETIME NOT NULL,
    dispatched_by INT NULL COMMENT 'Staff who performed dispatch',
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    KEY idx_order_id (sales_order_id),
    KEY idx_product_id (product_id),
    KEY idx_dispatched_batch (dispatched_batch_id),
    KEY idx_fifo_compliant (fifo_compliant),
    KEY idx_dispatch_date (dispatch_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
COMMENT='Audit log for dispatch FIFO compliance tracking';

-- =============================================================================
-- VIEW: Expired Batches Summary
-- Real-time view of all expired inventory
-- =============================================================================
CREATE OR REPLACE VIEW v_expired_batches AS
SELECT 
    pb.batch_id,
    pb.batch_number,
    p.product_id,
    p.name as product_name,
    p.category,
    pb.production_date,
    pb.expiry_date,
    DATEDIFF(CURDATE(), pb.expiry_date) as days_expired,
    pb.quantity_remaining as quantity_expired,
    pb.production_cost as unit_cost,
    (pb.quantity_remaining * COALESCE(pb.production_cost, 0)) as total_loss_value,
    pb.status as batch_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM dispatch_audit_log dal 
            WHERE dal.oldest_available_batch_id = pb.batch_id 
            AND dal.fifo_compliant = 0
        ) THEN 1 ELSE 0 
    END as fifo_was_bypassed,
    'PRODUCTION_BATCH' as source_type
FROM production_batches pb
JOIN products p ON pb.product_id = p.product_id
WHERE pb.expiry_date < CURDATE()
  AND pb.quantity_remaining > 0;

-- =============================================================================
-- VIEW: FIFO Bypass Report
-- Track all instances where FIFO was not followed
-- =============================================================================
CREATE OR REPLACE VIEW v_fifo_bypass_report AS
SELECT 
    dal.audit_id,
    dal.dispatch_date,
    dal.product_name,
    dal.dispatched_batch_number as batch_used,
    dal.dispatched_batch_production_date as batch_used_date,
    dal.oldest_batch_production_date as should_have_used_date,
    dal.days_newer,
    dal.quantity_dispatched,
    dal.sales_order_id,
    su.full_name as dispatched_by_name,
    CASE 
        WHEN dal.days_newer > 7 THEN 'CRITICAL'
        WHEN dal.days_newer > 3 THEN 'WARNING'
        ELSE 'MINOR'
    END as severity
FROM dispatch_audit_log dal
LEFT JOIN staff_users su ON dal.dispatched_by = su.user_id
WHERE dal.fifo_compliant = 0
ORDER BY dal.dispatch_date DESC;

-- =============================================================================
-- VIEW: Monthly Spoilage Summary
-- Aggregated spoilage data by month
-- =============================================================================
CREATE OR REPLACE VIEW v_monthly_spoilage_summary AS
SELECT 
    YEAR(spoilage_date) as year,
    MONTH(spoilage_date) as month,
    DATE_FORMAT(spoilage_date, '%Y-%m') as period,
    spoilage_type,
    source_type,
    COUNT(*) as incident_count,
    SUM(quantity_spoiled) as total_quantity_spoiled,
    SUM(quantity_spoiled * unit_cost) as total_loss_value,
    SUM(CASE WHEN fifo_bypassed = 1 THEN 1 ELSE 0 END) as fifo_bypass_count,
    AVG(days_expired) as avg_days_expired
FROM spoilage_log
GROUP BY YEAR(spoilage_date), MONTH(spoilage_date), spoilage_type, source_type
ORDER BY year DESC, month DESC;

-- =============================================================================
-- STORED PROCEDURE: Record Spoilage
-- Automatically log spoilage when batch expires
-- =============================================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_record_batch_spoilage(
    IN p_batch_id INT,
    IN p_reported_by INT,
    IN p_reason TEXT
)
BEGIN
    DECLARE v_product_name VARCHAR(255);
    DECLARE v_batch_number VARCHAR(100);
    DECLARE v_quantity DECIMAL(12,2);
    DECLARE v_unit_cost DECIMAL(12,2);
    DECLARE v_production_date DATE;
    DECLARE v_expiry_date DATE;
    DECLARE v_product_id INT;
    DECLARE v_spoilage_ref VARCHAR(50);
    DECLARE v_fifo_bypassed TINYINT(1) DEFAULT 0;
    DECLARE v_bypass_evidence TEXT DEFAULT NULL;
    
    -- Get batch details
    SELECT 
        p.name, pb.batch_number, pb.quantity_remaining, 
        COALESCE(pb.production_cost, 0), pb.production_date, 
        pb.expiry_date, pb.product_id
    INTO 
        v_product_name, v_batch_number, v_quantity,
        v_unit_cost, v_production_date, v_expiry_date, v_product_id
    FROM production_batches pb
    JOIN products p ON pb.product_id = p.product_id
    WHERE pb.batch_id = p_batch_id;
    
    -- Check for FIFO bypass
    IF EXISTS (
        SELECT 1 FROM dispatch_audit_log 
        WHERE oldest_available_batch_id = p_batch_id 
        AND fifo_compliant = 0
    ) THEN
        SET v_fifo_bypassed = 1;
        SELECT GROUP_CONCAT(
            CONCAT('Order #', sales_order_id, ' on ', DATE(dispatch_date), 
                   ' used batch ', dispatched_batch_number, ' instead')
            SEPARATOR '; '
        ) INTO v_bypass_evidence
        FROM dispatch_audit_log
        WHERE oldest_available_batch_id = p_batch_id 
        AND fifo_compliant = 0;
    END IF;
    
    -- Generate reference number
    SET v_spoilage_ref = CONCAT('SPL-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', 
        LPAD((SELECT COALESCE(MAX(spoilage_id), 0) + 1 FROM spoilage_log), 3, '0'));
    
    -- Insert spoilage record
    INSERT INTO spoilage_log (
        spoilage_reference, source_type, batch_id, product_id,
        batch_number, item_name, spoilage_type, spoilage_reason,
        quantity_spoiled, unit_of_measure, unit_cost,
        production_date, expiry_date, spoilage_date,
        fifo_bypassed, bypass_evidence, reported_by, status
    ) VALUES (
        v_spoilage_ref, 'PRODUCTION_BATCH', p_batch_id, v_product_id,
        v_batch_number, v_product_name, 'EXPIRED', p_reason,
        v_quantity, 'units', v_unit_cost,
        v_production_date, v_expiry_date, CURDATE(),
        v_fifo_bypassed, v_bypass_evidence, p_reported_by, 'PENDING'
    );
    
    -- Update batch status
    UPDATE production_batches 
    SET status = 'EXPIRED', quality_notes = CONCAT(COALESCE(quality_notes, ''), ' [EXPIRED - Logged as spoilage]')
    WHERE batch_id = p_batch_id;
    
    SELECT v_spoilage_ref as spoilage_reference, v_quantity * v_unit_cost as total_loss;
END //

DELIMITER ;

-- =============================================================================
-- STORED PROCEDURE: Scan for Expired Batches
-- Run daily to identify and log expired inventory
-- =============================================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS sp_scan_expired_batches()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_batch_id INT;
    DECLARE v_batch_number VARCHAR(100);
    DECLARE v_product_name VARCHAR(255);
    DECLARE v_quantity DECIMAL(12,2);
    DECLARE v_expiry_date DATE;
    DECLARE v_count INT DEFAULT 0;
    
    DECLARE expired_cursor CURSOR FOR
        SELECT pb.batch_id, pb.batch_number, p.name, pb.quantity_remaining, pb.expiry_date
        FROM production_batches pb
        JOIN products p ON pb.product_id = p.product_id
        WHERE pb.expiry_date < CURDATE()
          AND pb.quantity_remaining > 0
          AND pb.status NOT IN ('EXPIRED', 'DISPOSED')
          AND NOT EXISTS (
              SELECT 1 FROM spoilage_log sl 
              WHERE sl.batch_id = pb.batch_id 
              AND sl.source_type = 'PRODUCTION_BATCH'
          );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN expired_cursor;
    
    read_loop: LOOP
        FETCH expired_cursor INTO v_batch_id, v_batch_number, v_product_name, v_quantity, v_expiry_date;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Record spoilage for each expired batch
        CALL sp_record_batch_spoilage(v_batch_id, NULL, CONCAT('Auto-detected expired batch: ', v_batch_number));
        SET v_count = v_count + 1;
    END LOOP;
    
    CLOSE expired_cursor;
    
    SELECT v_count as batches_logged, 'Expired batch scan complete' as message;
END //

DELIMITER ;

-- =============================================================================
-- Initial Data: Run expired batch scan
-- =============================================================================
-- CALL sp_scan_expired_batches();

SELECT 'Migration 008: Spoilage tracking tables created successfully' as status;
