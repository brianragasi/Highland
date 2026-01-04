-- ============================================================================
-- Highland Fresh Payment Tracking Implementation (Cash on Delivery)
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Implement payment tracking for customer orders with COD workflow
-- User confirmed: Only INDEPENDENT_RESELLER and INDEPENDENT_RETAIL customers
-- ============================================================================

-- Step 1: Add payment tracking columns to sales table
-- ============================================================================
ALTER TABLE sales
ADD COLUMN payment_status ENUM('unpaid', 'partially_paid', 'paid') DEFAULT 'unpaid' AFTER payment_method_id,
ADD COLUMN payment_due_date DATE DEFAULT NULL AFTER payment_status,
ADD COLUMN payment_received DECIMAL(10,2) DEFAULT 0.00 AFTER payment_due_date,
ADD COLUMN invoice_number VARCHAR(50) DEFAULT NULL AFTER payment_received,
ADD COLUMN paid_at DATETIME DEFAULT NULL AFTER invoice_number;

-- Note: payment_received column already exists, so above will add other columns


-- Step 2: Create customer_payments table to track payment transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    customer_id INT NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method_id INT NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL COMMENT 'Check number, bank ref, receipt number',
    notes TEXT DEFAULT NULL,
    recorded_by INT NOT NULL COMMENT 'User who recorded the payment',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id),
    FOREIGN KEY (recorded_by) REFERENCES users(user_id),
    
    INDEX idx_sale_id (sale_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COMMENT='Tracks individual payment transactions for customer orders';


-- Step 3: Update customer types based on business requirements
-- ============================================================================
-- User confirmed: Only resellers and independent retail businesses
-- Rename RETAIL_STORE to INDEPENDENT_RETAIL
UPDATE customer_types 
SET type_code = 'INDEPENDENT_RETAIL',
    type_name = 'Independent Retail',
    description = 'Independent retail business selling Highland Fresh products'
WHERE customer_type_id = 4;

-- Deactivate unused customer types
UPDATE customer_types 
SET is_active = 0 
WHERE customer_type_id IN (2, 3, 5);
-- 2 = WHOLESALE_OUTLET (not used)
-- 3 = SUPERMARKET (not used)
-- 5 = RESTAURANT (not used)


-- ============================================================================
-- CURRENT ACTIVE CUSTOMER TYPES:
-- ============================================================================
-- 1. INDEPENDENT_RESELLER (5% discount) - Active, in use
-- 4. INDEPENDENT_RETAIL (3% discount)   - Active, available


-- ============================================================================
-- PAYMENT WORKFLOW:
-- ============================================================================
-- 1. Customer places order online → pending_approval
-- 2. Sales Officer approves → approved
-- 3. Warehouse dispatches → completed
--    - System sets payment_status = 'unpaid'
--    - Calculates payment_due_date based on customer's payment terms
--    - Generates invoice_number (INV-YYYYMM-XXXX)
-- 4. Customer picks up order at Highland Fresh
-- 5. Sales Staff collects payment (cash/check/bank transfer)
-- 6. Sales Staff records payment via PaymentsAPI.recordPayment()
--    - Creates record in customer_payments table
--    - Updates sales.payment_received
--    - Updates sales.payment_status (unpaid → partially_paid → paid)
--    - Sets sales.paid_at when fully paid


-- ============================================================================
-- VERIFICATION QUERIES:
-- ============================================================================

-- View active customer types
SELECT customer_type_id, type_code, type_name, discount_percentage, is_active 
FROM customer_types 
WHERE is_active = 1;

-- View unpaid/partially paid orders
SELECT 
    s.sale_number,
    c.business_name,
    s.total_amount,
    s.payment_received,
    (s.total_amount - s.payment_received) as balance_due,
    s.payment_status,
    s.payment_due_date,
    s.invoice_number
FROM sales s
JOIN customers c ON s.customer_id = c.customer_id
WHERE s.payment_status IN ('unpaid', 'partially_paid')
ORDER BY s.payment_due_date;

-- View payment history for an order
-- SELECT 
--     cp.payment_date,
--     cp.amount_paid,
--     pm.method_name,
--     cp.reference_number,
--     u.full_name as recorded_by
-- FROM customer_payments cp
-- JOIN payment_methods pm ON cp.payment_method_id = pm.payment_method_id
-- JOIN users u ON cp.recorded_by = u.user_id
-- WHERE cp.sale_id = ?;


-- ============================================================================
-- ROLLBACK (if needed):
-- ============================================================================

-- DROP TABLE IF EXISTS customer_payments;

-- ALTER TABLE sales
-- DROP COLUMN payment_status,
-- DROP COLUMN payment_due_date,
-- DROP COLUMN invoice_number,
-- DROP COLUMN paid_at;

-- UPDATE customer_types SET type_code = 'RETAIL_STORE', type_name = 'Retail Store' WHERE customer_type_id = 4;
-- UPDATE customer_types SET is_active = 1 WHERE customer_type_id IN (2, 3, 5);
