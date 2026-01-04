-- Migration: Add loss_factor column to recipe_raw_materials
-- Date: 2026-01-01
-- Purpose: Support processing loss calculation for BOM (Bill of Materials)
-- Reference: Professor's concern about fixed volume ratios with loss accounting

-- Add loss_factor column to account for processing losses (spillage, evaporation, etc.)
ALTER TABLE recipe_raw_materials
ADD COLUMN loss_factor DECIMAL(5,2) DEFAULT 0.00 
COMMENT 'Percentage loss during processing (e.g., 2.00 for 2% loss)';

-- Update existing recipes with estimated loss factors based on processing_notes
-- Raw Milk typically has 2% processing loss
UPDATE recipe_raw_materials 
SET loss_factor = 2.00 
WHERE raw_material_id IN (SELECT raw_material_id FROM raw_materials WHERE category = 'Raw Milk');

-- Packaging materials have 0% loss (discrete items)
UPDATE recipe_raw_materials 
SET loss_factor = 0.00 
WHERE raw_material_id IN (SELECT raw_material_id FROM raw_materials WHERE category IN ('Packaging', 'Labels'));

-- Flavorings and additives typically have 1% loss
UPDATE recipe_raw_materials 
SET loss_factor = 1.00 
WHERE raw_material_id IN (SELECT raw_material_id FROM raw_materials WHERE category IN ('Flavoring', 'Additives', 'Cultures'));

-- Verification
SELECT 
    pr.recipe_name,
    rm.name AS raw_material,
    rrm.quantity_required,
    rrm.loss_factor,
    ROUND(rrm.quantity_required * (1 + rrm.loss_factor/100), 3) AS effective_quantity
FROM recipe_raw_materials rrm
JOIN production_recipes pr ON rrm.recipe_id = pr.recipe_id
JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
ORDER BY pr.recipe_id, rrm.id;

SELECT 'Migration 010_add_recipe_loss_factor completed successfully' AS status;
