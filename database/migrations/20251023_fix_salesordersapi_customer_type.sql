-- ============================================================================
-- Fix SalesOrdersAPI queries after customer_type column removal
-- ============================================================================
-- Date: October 23, 2025
-- Issue: SalesOrdersAPI still referencing dropped c.customer_type column
-- Error: SQLSTATE[42S22]: Column not found: 1054 Unknown column 'c.customer_type'
-- ============================================================================

-- AFFECTED FILES (already fixed in code):
-- 1. api/SalesOrdersAPI.php - getOrders() method - line 416
-- 2. api/SalesOrdersAPI.php - getOrderById() method - line 512
-- 3. api/diagnose_customer_auth.php - line 19

-- CHANGES MADE:
-- Changed: c.customer_type
-- To: ct.type_code as customer_type
-- Added JOIN: LEFT JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id

-- ============================================================================
-- VERIFICATION QUERY:
-- ============================================================================
-- This query should work without errors after the fix:

SELECT 
    s.sale_id,
    s.sale_number,
    s.sale_date,
    s.total_amount,
    c.customer_id,
    c.business_name as customer_name,
    ct.type_code as customer_type,  -- Fixed: using FK join instead of dropped column
    cos.status_name as status,
    cos.status_id,
    u.username as created_by
FROM sales s
INNER JOIN customers c ON s.customer_id = c.customer_id
LEFT JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
LEFT JOIN customer_order_status cos ON s.status_id = cos.status_id
LEFT JOIN users u ON s.user_id = u.user_id
LIMIT 5;

-- Expected result: Should return sales orders with customer_type showing values like:
-- 'INDEPENDENT_RESELLER', 'INDEPENDENT_RETAIL', etc.

-- ============================================================================
-- REMINDER FOR FUTURE DEVELOPMENT:
-- ============================================================================
-- When querying customer data, always use:
--   c.customer_type_id (FK to customer_types table)
--   ct.type_code as customer_type (for display)
--   ct.type_name (for full name)
--
-- DO NOT use:
--   c.customer_type (column dropped)
--   c.payment_terms (column dropped)
--
-- These columns were dropped in migration: 20251023_fix_data_integrity_issues.sql
