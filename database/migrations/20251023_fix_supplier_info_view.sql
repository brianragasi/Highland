-- Fix for supplier_info_view after removing redundant columns
-- Date: 2025-10-23
-- Issue: View referenced deleted columns (city, country, payment_terms text columns)
-- Solution: Updated view to use foreign key columns (city_id, country_id, payment_term_id)

USE highland_fresh_db;

-- Drop the broken view
DROP VIEW IF EXISTS supplier_info_view;

-- Recreate with correct foreign key joins
CREATE VIEW supplier_info_view AS
SELECT 
    s.supplier_id,
    s.name,
    s.contact_person,
    s.email,
    s.phone_number,
    s.address,
    c.city_name,
    co.country_name,
    pt.term_name AS payment_terms,
    pt.days_to_pay,
    s.credit_limit,
    s.is_active,
    s.created_at,
    s.updated_at
FROM suppliers s
LEFT JOIN cities c ON s.city_id = c.city_id
LEFT JOIN countries co ON s.country_id = co.country_id
LEFT JOIN payment_terms pt ON s.payment_term_id = pt.payment_term_id;

-- Verify the view works
SELECT supplier_id, name, city_name, country_name, payment_terms 
FROM supplier_info_view 
LIMIT 5;
