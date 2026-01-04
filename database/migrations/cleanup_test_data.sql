-- =====================================================
-- Highland Fresh: Clean Up Test Data
-- Date: October 22, 2025
-- Purpose: Remove test purchase orders and sales orders
-- =====================================================

-- Start transaction for safety
START TRANSACTION;

-- =====================================================
-- 1. DELETE PURCHASE ORDER ITEMS FIRST (Foreign Key)
-- =====================================================
DELETE FROM purchase_order_items 
WHERE purchase_order_id IN (
    SELECT purchase_order_id FROM purchase_orders 
    WHERE po_number IN (
        '#HF-PO-20250825-001',
        '#HF-PO-20250906-634369',
        '#HF-PO-20250827-001',
        '#HF-PO-20250828-996849',
        '#HF-PO-20250828-114649',
        '#HF-PO-20250828-756383',
        '#HF-PO-20250828-374721',
        '#HF-PO-20250906-225970'
    )
);

-- =====================================================
-- 2. DELETE PURCHASE ORDERS
-- =====================================================
DELETE FROM purchase_orders 
WHERE po_number IN (
    '#HF-PO-20250825-001',
    '#HF-PO-20250906-634369',
    '#HF-PO-20250827-001',
    '#HF-PO-20250828-996849',
    '#HF-PO-20250828-114649',
    '#HF-PO-20250828-756383',
    '#HF-PO-20250828-374721',
    '#HF-PO-20250906-225970'
);

-- =====================================================
-- 3. DELETE SALES ORDER ITEMS FIRST (Foreign Key)
-- =====================================================
DELETE FROM sales_order_items 
WHERE sales_order_id IN (
    SELECT sales_order_id FROM sales_orders 
    WHERE order_number IN (
        '#SO-202510-0001',
        '#SALE20250006',
        '#SALE20250005',
        '#SALE20250004',
        '#SALE20250003',
        '#SALE20250002',
        '#SALE20250001'
    )
);

-- =====================================================
-- 4. DELETE SALES ORDERS
-- =====================================================
DELETE FROM sales_orders 
WHERE order_number IN (
    '#SO-202510-0001',
    '#SALE20250006',
    '#SALE20250005',
    '#SALE20250004',
    '#SALE20250003',
    '#SALE20250002',
    '#SALE20250001'
);

-- =====================================================
-- 5. DELETE RELATED TRANSACTIONS (if any)
-- =====================================================
DELETE FROM transactions 
WHERE transaction_id IN (
    SELECT transaction_id FROM transactions 
    WHERE reference_number IN (
        '#HF-PO-20250825-001',
        '#HF-PO-20250906-634369',
        '#HF-PO-20250827-001',
        '#HF-PO-20250828-996849',
        '#HF-PO-20250828-114649',
        '#HF-PO-20250828-756383',
        '#HF-PO-20250828-374721',
        '#HF-PO-20250906-225970',
        '#SO-202510-0001',
        '#SALE20250006',
        '#SALE20250005',
        '#SALE20250004',
        '#SALE20250003',
        '#SALE20250002',
        '#SALE20250001'
    )
);

-- =====================================================
-- 6. VERIFY DELETION
-- =====================================================
SELECT 'Remaining Purchase Orders:' as info, COUNT(*) as count FROM purchase_orders;
SELECT 'Remaining Sales Orders:' as info, COUNT(*) as count FROM sales_orders;

-- =====================================================
-- COMMIT TRANSACTION
-- If everything looks good, commit. Otherwise, ROLLBACK.
-- =====================================================
-- COMMIT;
-- For safety, you need to manually run COMMIT after reviewing the results
-- Or run ROLLBACK if something went wrong

SELECT '⚠️ TRANSACTION NOT COMMITTED YET!' as warning;
SELECT 'Review the results above, then run: COMMIT; or ROLLBACK;' as instructions;
