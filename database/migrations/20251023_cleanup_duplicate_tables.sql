-- Migration: Cleanup Duplicate Tables
-- Date: 2025-10-23
-- Purpose: Remove duplicate tables and migrate data to proper normalized tables

USE highland_fresh_db;

-- ============================================================================
-- STEP 1: Migrate data from raw_material_suppliers to supplier_raw_materials
-- ============================================================================

-- Check what needs to be migrated
SELECT 
    'Records to migrate' as step,
    COUNT(*) as count
FROM raw_material_suppliers rms
LEFT JOIN supplier_raw_materials srm 
    ON rms.supplier_id = srm.supplier_id 
    AND rms.raw_material_id = srm.raw_material_id
WHERE srm.supplier_raw_material_id IS NULL;

-- Migrate missing records
INSERT INTO supplier_raw_materials (
    supplier_id,
    raw_material_id,
    supplier_sku,
    unit_cost,
    minimum_order_quantity,
    lead_time_days,
    is_preferred_supplier,
    is_active,
    created_at
)
SELECT 
    rms.supplier_id,
    rms.raw_material_id,
    rms.supplier_sku,
    rms.unit_cost,
    rms.minimum_order_quantity,
    rms.lead_time_days,
    rms.is_preferred,
    rms.is_active,
    rms.created_at
FROM raw_material_suppliers rms
LEFT JOIN supplier_raw_materials srm 
    ON rms.supplier_id = srm.supplier_id 
    AND rms.raw_material_id = srm.raw_material_id
WHERE srm.supplier_raw_material_id IS NULL;

-- Verify migration
SELECT 'After migration - supplier_raw_materials count' as step, COUNT(*) as count FROM supplier_raw_materials;

-- ============================================================================
-- STEP 2: Drop redundant tables
-- ============================================================================

-- Drop raw_material_suppliers (data now in supplier_raw_materials)
DROP TABLE IF EXISTS raw_material_suppliers;

-- Drop highland_fresh_cooperatives (all 6 cooperatives already in suppliers table)
DROP TABLE IF EXISTS highland_fresh_cooperatives;

-- Drop supplier_contacts (empty and unused)
DROP TABLE IF EXISTS supplier_contacts;

-- Verify tables are dropped
SELECT 'Remaining tables' as step;
SHOW TABLES LIKE '%supplier%';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Final counts' as step;
SELECT COUNT(*) as supplier_raw_materials_count FROM supplier_raw_materials;
SELECT COUNT(*) as suppliers_count FROM suppliers;
SELECT COUNT(*) as dairy_cooperatives_count FROM suppliers WHERE supplier_type = 'Dairy Cooperative';
