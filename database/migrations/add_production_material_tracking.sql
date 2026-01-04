-- Migration: Add support for recipe-less production batches and material tracking
-- Date: 2025-10-23
-- Purpose: Allow Production Supervisor to create batches without pre-defined recipes

-- 1. Modify production_batches to allow NULL recipe_id (for manual batches)
ALTER TABLE production_batches
MODIFY COLUMN recipe_id INT NULL COMMENT 'Recipe used (NULL for manual production)',
ADD COLUMN product_id INT NULL COMMENT 'Direct product link (for recipe-less batches)' AFTER recipe_id,
ADD COLUMN planned_quantity DECIMAL(10,3) NULL COMMENT 'Planned production quantity' AFTER batch_size,
ADD COLUMN production_notes TEXT NULL COMMENT 'Additional production notes';

-- 2. Add foreign key for product_id
ALTER TABLE production_batches
ADD CONSTRAINT fk_production_batches_product 
FOREIGN KEY (product_id) REFERENCES products(product_id) 
ON DELETE RESTRICT;

-- 3. Create production_material_usage table to track raw materials used
CREATE TABLE IF NOT EXISTS production_material_usage (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL COMMENT 'FK to production_batches',
    raw_material_id INT NOT NULL COMMENT 'FK to raw_materials',
    quantity_issued DECIMAL(10,3) NOT NULL COMMENT 'Quantity of material issued for this batch',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When material was issued',
    FOREIGN KEY (batch_id) REFERENCES production_batches(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (raw_material_id) REFERENCES raw_materials(raw_material_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tracks raw materials issued for production batches';

-- 4. Add index for better query performance
CREATE INDEX idx_batch_materials ON production_material_usage(batch_id);
CREATE INDEX idx_material_usage ON production_material_usage(raw_material_id);

-- Verification
SELECT 'Migration completed successfully' AS status;
