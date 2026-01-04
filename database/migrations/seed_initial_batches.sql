-- Highland Fresh: Seed Initial Raw Material Batches
-- Purpose: Create batch entries for materials that have stock but no batch records
-- This resolves the data inconsistency where FIFO says "No batches found" 
-- but the UI shows stock available

-- Run this ONCE to initialize batch tracking for existing inventory

INSERT INTO raw_material_batches (
    highland_fresh_batch_code,
    raw_material_id,
    supplier_id,
    quantity_received,
    current_quantity,
    unit_cost,
    received_date,
    expiry_date,
    quality_grade_received,
    status,
    highland_fresh_approved,
    notes,
    created_at
)
SELECT 
    CONCAT('INIT-', rm.raw_material_id, '-', DATE_FORMAT(NOW(), '%Y%m%d')) as highland_fresh_batch_code,
    rm.raw_material_id,
    NULL as supplier_id,
    rm.quantity_on_hand as quantity_received,
    rm.quantity_on_hand as current_quantity,
    rm.standard_cost as unit_cost,
    CURDATE() as received_date,
    CASE 
        WHEN rm.shelf_life_days IS NOT NULL THEN DATE_ADD(CURDATE(), INTERVAL rm.shelf_life_days DAY)
        ELSE NULL
    END as expiry_date,
    'Standard' as quality_grade_received,
    'APPROVED' as status,
    1 as highland_fresh_approved,
    CONCAT('Initial batch created for existing inventory on ', NOW(), '. This is the starting balance before batch tracking was enabled.') as notes,
    NOW() as created_at
FROM raw_materials rm
WHERE rm.quantity_on_hand > 0
  AND rm.is_active = 1
  AND rm.raw_material_id NOT IN (
      SELECT DISTINCT raw_material_id FROM raw_material_batches
  );

-- After running, verify with:
-- SELECT rm.name, rm.quantity_on_hand, COUNT(rmb.batch_id) as batch_count, SUM(rmb.current_quantity) as batch_qty
-- FROM raw_materials rm
-- LEFT JOIN raw_material_batches rmb ON rm.raw_material_id = rmb.raw_material_id
-- GROUP BY rm.raw_material_id;
