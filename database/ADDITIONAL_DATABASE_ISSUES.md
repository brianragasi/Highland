# Additional Database Issues Analysis
Date: October 23, 2025

## Tables With Data But NOT USED in Application Code

### 1. ❌ `product_attributes` (6 rows) + `product_attribute_values` (0 rows)
**Status:** ORPHANED - Not referenced in any PHP code

**What it contains:**
- Brand, Expiry Date, Origin Country, Organic Certified, Cut Type, Storage Temperature
- Has foreign key relationship between the two tables
- Has foreign keys to product_categories

**Usage in code:** 
- ✗ NOT FOUND in any API files
- ✗ NOT FOUND in any JavaScript files  
- ✗ NOT USED anywhere in the application

**Recommendation:** 
- **DROP BOTH TABLES** - Appears to be a planned feature that was never implemented
- If you want product attributes in the future, rebuild with actual requirements

```sql
DROP TABLE IF EXISTS product_attribute_values;
DROP TABLE IF EXISTS product_attributes;
```

---

### 2. ⚠️ `tax_rates` (5 rows) - UNUSED but MAY BE INTENDED
**Status:** Data exists but NOT actively used

**What it contains:**
- VAT_STD (12%), VAT_ZERO (0%), VAT_EXEMPT (0%)
- Withholding Tax rates for Corporation (2%) and Individual (1%)

**Current Application Behavior:**
- Sales table has `tax_rate` column (decimal 5,4) with default 0.12
- SalesAPI.php hardcodes tax rate: `$taxRate = isset($input['tax_rate']) ? (float)$input['tax_rate'] : 0.12;`
- **NO JOIN** to tax_rates table anywhere
- Tax is calculated directly, not looked up from table

**Problem:**
- Table exists with proper tax data, but application ignores it
- Hardcoded 12% VAT means you can't:
  - Apply different tax rates per product category
  - Handle VAT-exempt products
  - Track historical tax rate changes
  - Apply withholding taxes on purchases

**Recommendation - CHOOSE ONE:**

**Option A: DROP the table** (if you don't need complex tax handling)
```sql
DROP TABLE IF EXISTS tax_rates;
```

**Option B: IMPLEMENT proper tax rate usage** (recommended for proper accounting)
- Add `tax_rate_id` column to sales table
- Update SalesAPI to lookup tax rates from tax_rates table
- Allow products to have different tax classifications
- This is better for Philippine BIR compliance

---

### 3. ✅ `payment_methods` (7 rows) - ACTIVELY USED
**Status:** KEEP - Used in SalesAPI

**What it contains:**
- Cash, Credit Card, Debit Card, GCash, Maya, Bank Transfer, Check

**Usage:**
- ✓ Used in SalesAPI.php (7 references)
- ✓ Properly joined in ORDER queries
- ✓ Default "Cash" payment method looked up from table

**Recommendation:** **KEEP** - This is working correctly

---

### 4. ✅ `supplier_products` (0 rows but USED) - KEEP
**Status:** Empty but actively used in code

**Usage:**
- ✓ ProductsAPI.php - Inserts when products are created with supplier
- ✓ InventoryAPI.php - Queries for supplier-product relationships  
- ✓ HighlandFreshInventoryManager.php - Uses in queries

**Recommendation:** **KEEP** - Table is empty because you haven't assigned finished product suppliers yet

---

## Summary of Issues

### UNUSED TABLES (Safe to drop):
1. ❌ `product_attributes` (6 rows)
2. ❌ `product_attribute_values` (0 rows)

### UNUSED DATA (Decision needed):
3. ⚠️ `tax_rates` (5 rows) - Table exists but application doesn't use it

### WORKING CORRECTLY:
4. ✅ `payment_methods` (7 rows) - Actively used
5. ✅ `supplier_products` (0 rows) - Used in code, just empty

---

## Recommended Actions

### Immediate (Safe to drop):
```sql
-- These are 100% unused
DROP TABLE IF EXISTS product_attribute_values;
DROP TABLE IF EXISTS product_attributes;
```

### Review & Decide:
**`tax_rates` table:**
- If you need simple flat 12% VAT on everything → DROP the table
- If you need proper Philippine tax handling (VAT exempt items, withholding tax, etc.) → IMPLEMENT usage in SalesAPI

Current hardcoded approach:
```php
$taxRate = isset($input['tax_rate']) ? (float)$input['tax_rate'] : 0.12;
```

Proper approach would be:
```php
$taxRateQuery = "SELECT rate_percentage FROM tax_rates 
                 WHERE rate_code = 'VAT_STD' AND is_active = 1";
$taxRate = // lookup from database
```

---

## Other Potential Issues to Check

1. **Orphaned records:**
   - Products with deleted category_id
   - Sales with deleted customer_id
   - Production batches with deleted recipe_id

2. **Unused indexes:**
   - Some tables may have indexes on columns that are never queried

3. **Overly complex views:**
   - Some views may be joining too many tables and slowing down queries

Would you like me to check for orphaned records or analyze view performance?
