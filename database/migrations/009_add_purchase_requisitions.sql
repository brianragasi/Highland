-- =========================================================================
-- Highland Fresh - Purchase Requisition Module
-- Migration 009: Add Purchase Requisitions for Low Stock Alerts
-- Date: December 2, 2025
-- =========================================================================

-- Purchase Requisitions (Request from warehouse to finance for purchasing)
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    requisition_id INT PRIMARY KEY AUTO_INCREMENT,
    requisition_number VARCHAR(50) NOT NULL UNIQUE,
    requested_by INT NOT NULL COMMENT 'FK to staff_users',
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    reason TEXT COMMENT 'Reason for request (e.g., Low Stock Alert)',
    status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CONVERTED') DEFAULT 'PENDING',
    approved_by INT NULL COMMENT 'FK to staff_users (Admin/Finance)',
    approved_date DATETIME NULL,
    rejection_reason TEXT NULL,
    converted_to_po_id INT NULL COMMENT 'FK to purchase_orders if converted',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_requested_by (requested_by),
    INDEX idx_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Purchase requisitions from warehouse staff';

-- Requisition Items (what materials/items are being requested)
CREATE TABLE IF NOT EXISTS purchase_requisition_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    requisition_id INT NOT NULL,
    item_type ENUM('RAW_MATERIAL', 'PACKAGING', 'OTHER') DEFAULT 'RAW_MATERIAL',
    raw_material_id INT NULL COMMENT 'FK to raw_materials if RAW_MATERIAL type',
    item_name VARCHAR(255) NOT NULL COMMENT 'Item name (redundant for display)',
    quantity_requested DECIMAL(10,2) NOT NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    current_stock DECIMAL(10,2) NULL COMMENT 'Stock level at time of request',
    reorder_level DECIMAL(10,2) NULL COMMENT 'Reorder point for reference',
    estimated_unit_cost DECIMAL(10,2) NULL,
    estimated_total_cost DECIMAL(12,2) NULL,
    preferred_supplier_id INT NULL COMMENT 'Suggested supplier',
    notes TEXT NULL,
    
    FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions(requisition_id) ON DELETE CASCADE,
    INDEX idx_requisition (requisition_id),
    INDEX idx_raw_material (raw_material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Items in purchase requisition';

-- Low Stock Alerts (tracking items below reorder level)
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    raw_material_id INT NOT NULL,
    alert_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_quantity DECIMAL(10,2) NOT NULL,
    reorder_level DECIMAL(10,2) NOT NULL,
    shortage_quantity DECIMAL(10,2) GENERATED ALWAYS AS (reorder_level - current_quantity) STORED,
    status ENUM('ACTIVE', 'RESOLVED', 'REQUISITION_CREATED') DEFAULT 'ACTIVE',
    resolved_by_requisition_id INT NULL,
    resolved_date DATETIME NULL,
    
    FOREIGN KEY (raw_material_id) REFERENCES raw_materials(raw_material_id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_raw_material (raw_material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Low stock alerts for dashboard';

-- =========================================================================
-- Trigger: Auto-generate requisition number
-- =========================================================================
DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_requisition_number
BEFORE INSERT ON purchase_requisitions
FOR EACH ROW
BEGIN
    DECLARE next_seq INT;
    
    IF NEW.requisition_number IS NULL OR NEW.requisition_number = '' THEN
        SELECT COALESCE(MAX(requisition_id), 0) + 1 INTO next_seq FROM purchase_requisitions;
        SET NEW.requisition_number = CONCAT('REQ-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(next_seq, 4, '0'));
    END IF;
END//
DELIMITER ;

-- =========================================================================
-- View: Low Stock Items (for dashboard widget)
-- =========================================================================
CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT 
    rm.raw_material_id,
    rm.name AS item_name,
    rm.category,
    rm.quantity_on_hand AS current_stock,
    rm.reorder_level,
    rm.unit_of_measure,
    (rm.reorder_level - rm.quantity_on_hand) AS shortage_qty,
    CASE 
        WHEN rm.quantity_on_hand <= 0 THEN 'OUT_OF_STOCK'
        WHEN rm.quantity_on_hand <= rm.reorder_level * 0.5 THEN 'CRITICAL'
        WHEN rm.quantity_on_hand <= rm.reorder_level THEN 'LOW'
        ELSE 'OK'
    END AS stock_status,
    COALESCE(
        (SELECT s.company_name FROM suppliers s WHERE s.supplier_id = rm.preferred_supplier_id),
        'No Preferred Supplier'
    ) AS preferred_supplier,
    rm.preferred_supplier_id
FROM raw_materials rm
WHERE rm.quantity_on_hand <= rm.reorder_level
ORDER BY 
    CASE 
        WHEN rm.quantity_on_hand <= 0 THEN 1
        WHEN rm.quantity_on_hand <= rm.reorder_level * 0.5 THEN 2
        ELSE 3
    END,
    (rm.reorder_level - rm.quantity_on_hand) DESC;

-- =========================================================================
-- View: Pending Requisitions with Details
-- =========================================================================
CREATE OR REPLACE VIEW v_pending_requisitions AS
SELECT 
    pr.requisition_id,
    pr.requisition_number,
    pr.request_date,
    pr.priority,
    pr.reason,
    pr.status,
    pr.notes,
    u.full_name AS requested_by_name,
    u.username AS requested_by_username,
    COUNT(pri.item_id) AS item_count,
    SUM(pri.estimated_total_cost) AS total_estimated_cost
FROM purchase_requisitions pr
LEFT JOIN staff_users u ON pr.requested_by = u.user_id
LEFT JOIN purchase_requisition_items pri ON pr.requisition_id = pri.requisition_id
WHERE pr.status IN ('PENDING', 'DRAFT')
GROUP BY pr.requisition_id
ORDER BY 
    CASE pr.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
    END,
    pr.request_date ASC;

-- =========================================================================
-- Add reorder_level column to raw_materials if not exists
-- =========================================================================
-- Note: Run this manually if column doesn't exist:
-- ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(10,2) DEFAULT 100;
-- ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS preferred_supplier_id INT NULL;

-- =========================================================================
-- Sample Data (Optional - uncomment to test)
-- =========================================================================
-- INSERT INTO purchase_requisitions (requested_by, priority, reason)
-- VALUES (1, 'HIGH', 'Low Stock Alert: 1L Bottles below reorder level');

-- INSERT INTO purchase_requisition_items (requisition_id, item_type, item_name, quantity_requested, unit_of_measure)
-- VALUES (1, 'PACKAGING', '1L Bottles', 2000, 'pcs');

SELECT 'Migration 009: Purchase Requisitions module created successfully' AS status;
