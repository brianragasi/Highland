-- Create Test Customer Account
-- For testing the customer authentication system
-- Password: test1234

-- Generate password hash for 'test1234'
-- Hash: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT INTO customers (
    customer_number,
    business_name,
    contact_person,
    username,
    email,
    password_hash,
    phone,
    address,
    city_id,
    customer_type,
    payment_term_id,
    credit_limit,
    is_active,
    is_verified,
    email_verified_at
) VALUES (
    'CUST-2025-0001',
    'Test Retail Store',
    'John Doe',
    'testcustomer',
    'test@customer.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '1234567890',
    '123 Test Street',
    (SELECT city_id FROM cities LIMIT 1),
    'retail_outlet',
    (SELECT payment_term_id FROM payment_terms WHERE term_name = 'Net 30' LIMIT 1),
    50000.00,
    TRUE,
    TRUE,
    NOW()
);

-- Verification query
SELECT 
    customer_id,
    customer_number,
    business_name,
    username,
    email,
    customer_type,
    is_active,
    is_verified,
    created_at
FROM customers
WHERE username = 'testcustomer';

-- Test credentials
-- Username: testcustomer
-- Password: test1234
