# Highland Fresh Database Cleanup Analysis
Date: October 23, 2025

## Issues Identified

### 1. DUPLICATE TABLES - CRITICAL

#### A. `raw_material_suppliers` (41 rows) vs `supplier_raw_materials` (28 rows)
**Problem:** Two tables doing the SAME thing - linking suppliers to raw materials with pricing

**raw_material_suppliers structure:**
- id, supplier_id, raw_material_id, supplier_sku, unit_cost, minimum_order_quantity, lead_time_days, is_preferred, is_active

**supplier_raw_materials structure:**
- supplier_raw_material_id, supplier_id, raw_material_id, supplier_sku, unit_cost, minimum_order_quantity, maximum_order_quantity, lead_time_days, is_preferred_supplier, highland_fresh_approved, quality_certification, last_price_update, is_active

**Current Usage:**
- ✅ `supplier_raw_materials` - ACTIVELY USED in RawMaterialsAPI.php, PurchaseOrderReportsAPI.php
- ❌ `raw_material_suppliers` - NOT FOUND in any API code

**Recommendation:** 
- **DROP `raw_material_suppliers` table** (41 rows should be migrated to `supplier_raw_materials` if needed)
- Keep `supplier_raw_materials` (more complete with highland_fresh fields)

---

#### B. `highland_fresh_cooperatives` (6 rows) vs `suppliers` table
**Problem:** Duplicate data - cooperatives are already in suppliers table with supplier_type='Dairy Cooperative'

**highland_fresh_cooperatives columns:**
- cooperative_id, cooperative_name, location, region, contact_person, phone_number, email, established_year, member_farmers_count, cattle_count, daily_milk_capacity_liters, cattle_breeds, specialization, nmfdc_member_since, is_active

**suppliers table already has:**
- supplier_type ENUM including 'Dairy Cooperative'
- daily_milk_capacity_liters
- number_of_cows (same as cattle_count)
- cattle_breeds
- specialization
- nmfdc_member_since
- established_year

**Current Usage:**
- ✅ Used in HighlandFreshInventoryManager.php line 382

**Recommendation:**
- **MIGRATE** the 6 cooperatives to `suppliers` table if they're not already there
- **DROP `highland_fresh_cooperatives`** table after migration
- Update HighlandFreshInventoryManager.php to query suppliers WHERE supplier_type='Dairy Cooperative'

---

### 2. EMPTY UNUSED TABLES

#### A. `supplier_contacts` (0 rows)
**Purpose:** Appears to store multiple contacts per supplier
**Problem:** Empty and unused
**Current Usage:** NOT FOUND in any API

**Recommendation:** 
- If multi-contact functionality needed, keep structure
- Otherwise, **DROP** this table (suppliers table has contact_person, email, phone_number)

---

#### B. `supplier_products` (0 rows) 
**Problem:** Empty but IS USED in code!

**Current Usage:**
- ProductsAPI.php - Creates entries when products are added
- InventoryAPI.php - Queries this table
- HighlandFreshInventoryManager.php - Uses in queries

**Recommendation:** 
- **KEEP** - This is actively used for finished products
- Note: `supplier_products` is for finished products, `supplier_raw_materials` is for raw materials

---

### 3. POTENTIAL ORPHANED DATA

Need to check for:
- Purchase orders referencing deleted suppliers
- Products referencing deleted categories
- Batches referencing deleted recipes
- Sale items referencing deleted products

---

## Recommended Actions

### Phase 1: Remove Duplicate Tables (IMMEDIATE)

1. **Migrate data from `raw_material_suppliers` to `supplier_raw_materials`**
   ```sql
   -- Check for records in raw_material_suppliers NOT in supplier_raw_materials
   SELECT rms.* 
   FROM raw_material_suppliers rms
   LEFT JOIN supplier_raw_materials srm 
       ON rms.supplier_id = srm.supplier_id 
       AND rms.raw_material_id = srm.raw_material_id
   WHERE srm.supplier_raw_material_id IS NULL;
   ```

2. **Migrate cooperatives to suppliers table**
   ```sql
   -- Check if cooperatives exist in suppliers
   SELECT c.cooperative_name, s.name
   FROM highland_fresh_cooperatives c
   LEFT JOIN suppliers s ON c.cooperative_name = s.name
   WHERE s.supplier_id IS NULL;
   ```

3. **Drop redundant tables**
   ```sql
   DROP TABLE IF EXISTS raw_material_suppliers;
   DROP TABLE IF EXISTS highland_fresh_cooperatives;
   DROP TABLE IF EXISTS supplier_contacts;
   ```

### Phase 2: Check Foreign Key Integrity

Run referential integrity checks to find orphaned records.

### Phase 3: Update Application Code

- Update HighlandFreshInventoryManager.php line 382 to use suppliers table
- Remove any references to raw_material_suppliers
- Verify all supplier-related queries use correct tables

---

## Tables Summary

### Keep (Core Business Logic)
- ✅ suppliers
- ✅ supplier_raw_materials
- ✅ supplier_products (even if empty, actively used)
- ✅ customers
- ✅ sales, sale_items
- ✅ purchase_orders, purchase_order_items
- ✅ products, raw_materials
- ✅ production_batches, production_recipes
- ✅ inventory_adjustments
- ✅ returns, return_items
- ✅ All reference tables (cities, countries, payment_terms, etc.)

### Drop (Redundant/Unused)
- ❌ raw_material_suppliers (duplicate of supplier_raw_materials)
- ❌ highland_fresh_cooperatives (data should be in suppliers)
- ❌ supplier_contacts (empty, unused)

### Investigate Further
- ⚠️ product_attributes, product_attribute_values (check if used)
- ⚠️ tax_rates (check if used in sales calculations)
