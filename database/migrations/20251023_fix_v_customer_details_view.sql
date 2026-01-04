-- Fix v_customer_details view after dropping old columns
-- Date: 2025-10-23
-- Issue: View referenced deleted columns (customer_type ENUM, payment_terms INT)
-- Solution: Updated view to use FK columns (customer_type_id, payment_term_id)

USE highland_fresh_db;

-- Drop the broken view
DROP VIEW IF EXISTS v_customer_details;

-- Recreate with correct foreign key joins
CREATE VIEW v_customer_details AS
SELECT 
    c.customer_id,
    c.customer_number,
    c.username,
    c.email,
    c.business_name,
    c.contact_person,
    c.phone,
    c.customer_type_id,
    ctype.type_code as customer_type,
    ctype.type_name as customer_type_name,
    ctype.discount_percentage,
    c.address,
    c.credit_limit,
    c.payment_term_id,
    pt.term_name as payment_terms,
    pt.term_code as payment_term_code,
    pt.days_to_pay,
    c.is_active,
    c.is_verified,
    c.created_at,
    c.last_login,
    ct.city_name,
    ct.country_id,
    co.country_name,
    (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.customer_id) AS total_orders,
    (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.customer_id = c.customer_id) AS total_spent,
    (SELECT MAX(s.sale_date) FROM sales s WHERE s.customer_id = c.customer_id) AS last_order_date
FROM customers c
LEFT JOIN customer_types ctype ON c.customer_type_id = ctype.customer_type_id
LEFT JOIN payment_terms pt ON c.payment_term_id = pt.payment_term_id
LEFT JOIN cities ct ON c.city_id = ct.city_id
LEFT JOIN countries co ON ct.country_id = co.country_id;

-- Verify the view works
SELECT customer_id, business_name, customer_type, customer_type_name, payment_terms, days_to_pay
FROM v_customer_details 
LIMIT 3;
