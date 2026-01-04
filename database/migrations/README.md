# Database Migration Guide - Customer Authentication System

## Overview
This directory contains database migration scripts to implement the customer authentication system for Highland Fresh, addressing the findings in **RBAC-01 Validation Report**.

## Migration Scripts

### 001_create_customers_table.sql
**Purpose:** Creates the customer authentication infrastructure
**Creates:**
- `customers` table - Main customer accounts table
- `customer_order_status` table - Order status tracking
- `customer_login_attempts` table - Security tracking
- `customer_password_reset_tokens` table - Password reset functionality
- `v_customer_details` view - Easy customer data retrieval
- Modifies `sales` table to add `customer_id` foreign key

**Run Time:** ~5 seconds
**Risk Level:** Low (creates new tables, adds optional column)

### 002_migrate_customer_data.sql
**Purpose:** Migrates existing text-based customer names to proper customer records
**Actions:**
- Analyzes existing `customer_name` data in sales table
- Creates customer accounts from unique customer names
- Links sales records to new customer accounts
- Generates migration report

**Run Time:** ~30 seconds (depends on data volume)
**Risk Level:** Medium (modifies existing sales data)

## How to Run Migrations

### Prerequisites
- Backup your database first!
- MySQL/MariaDB 5.7 or higher
- Database user with CREATE, ALTER, INSERT, UPDATE permissions

### Step 1: Backup Database
```bash
# Windows (PowerShell)
cd c:\xampp\mysql\bin
.\mysqldump.exe -u root -p highlandfresh_db > c:\backups\highlandfresh_backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Alternative: Use phpMyAdmin Export feature
```

### Step 2: Run First Migration
```bash
# From PowerShell
cd c:\xampp\htdocs\HighLandFreshApp\database\migrations

# Using mysql command line
c:\xampp\mysql\bin\mysql.exe -u root -p highlandfresh_db < 001_create_customers_table.sql

# Or using phpMyAdmin:
# 1. Open phpMyAdmin
# 2. Select highlandfresh_db database
# 3. Go to SQL tab
# 4. Click "Browse" and select 001_create_customers_table.sql
# 5. Click "Go"
```

**Expected Output:**
```
table_name                          | record_count
------------------------------------|-------------
customers                           | 0
customer_order_status               | 7
customer_login_attempts             | 0
customer_password_reset_tokens      | 0

status: Migration 001_create_customers_table.sql completed successfully!
```

### Step 3: Run Data Migration
```bash
# Using mysql command line
c:\xampp\mysql\bin\mysql.exe -u root -p highlandfresh_db < 002_migrate_customer_data.sql

# Or using phpMyAdmin (same process as above)
```

**Expected Output:**
```
customers_created | sales_linked | sales_remaining
------------------|--------------|----------------
XX                | XXX          | 0

[Migration Report Table]
[Admin Tasks List]

status: Migration 002_migrate_customer_data.sql completed!
```

### Step 4: Verify Migration
```sql
-- Run these queries in phpMyAdmin or mysql command line

-- Check customer count
SELECT COUNT(*) as total_customers FROM customers;

-- Check linked sales
SELECT 
    COUNT(*) as sales_with_customer_id 
FROM sales 
WHERE customer_id IS NOT NULL;

-- Check orphaned sales (should be 0)
SELECT 
    COUNT(*) as sales_without_customer 
FROM sales 
WHERE customer_id IS NULL 
  AND customer_name IS NOT NULL;

-- View migrated customers
SELECT * FROM v_customer_details LIMIT 10;
```

## Post-Migration Tasks

### 1. Review Migrated Customers
```sql
-- See all migrated customers with temporary emails
SELECT 
    customer_id,
    customer_number,
    username,
    email,
    business_name,
    customer_type
FROM customers
WHERE email LIKE '%@highlandfresh.customer.temp'
ORDER BY customer_number;
```

### 2. Update Customer Information
For each migrated customer, update their information:

```sql
-- Update customer email and verify account
UPDATE customers 
SET 
    email = 'actual@email.com',
    phone = '1234567890',
    address = 'Complete business address',
    city_id = 1, -- Select appropriate city
    is_verified = TRUE
WHERE customer_id = ?;
```

### 3. Set Customer Business Terms
```sql
-- For retail outlets with credit terms
UPDATE customers 
SET 
    credit_limit = 100000.00,
    payment_terms = 30  -- 30 days credit
WHERE customer_type = 'retail_outlet' 
  AND customer_id = ?;
```

### 4. Generate Password Reset Tokens
For customers to set their initial passwords:

```sql
-- Generate reset token (valid for 7 days)
INSERT INTO customer_password_reset_tokens (customer_id, token, expires_at) 
VALUES (
    ?,  -- customer_id
    SHA2(CONCAT(UUID(), NOW()), 256),
    DATE_ADD(NOW(), INTERVAL 7 DAY)
);

-- Retrieve the token to send to customer
SELECT token, expires_at 
FROM customer_password_reset_tokens 
WHERE customer_id = ? 
  AND used = FALSE 
  AND expires_at > NOW()
ORDER BY created_at DESC 
LIMIT 1;
```

## Rollback Instructions

If you need to rollback the migration:

### Rollback Step 1: Restore sales.customer_id
```sql
-- Remove customer_id foreign key
ALTER TABLE sales DROP FOREIGN KEY fk_sales_customer;

-- Remove customer_id column
ALTER TABLE sales DROP COLUMN customer_id;
```

### Rollback Step 2: Drop customer tables
```sql
-- Drop in reverse order due to foreign keys
DROP VIEW IF EXISTS v_customer_details;
DROP TABLE IF EXISTS customer_password_reset_tokens;
DROP TABLE IF EXISTS customer_login_attempts;
DROP TABLE IF EXISTS customer_order_status;
DROP TABLE IF EXISTS customers;
```

### Rollback Step 3: Restore from backup
```bash
# Restore full database backup
c:\xampp\mysql\bin\mysql.exe -u root -p highlandfresh_db < c:\backups\highlandfresh_backup_YYYYMMDD_HHMMSS.sql
```

## Troubleshooting

### Issue: "Table 'customers' already exists"
**Solution:** The migration checks for existing tables. If you get this error:
```sql
-- Check if partially completed
SHOW TABLES LIKE 'customer%';

-- If needed, drop and re-run
DROP TABLE IF EXISTS customer_password_reset_tokens;
DROP TABLE IF EXISTS customer_login_attempts;
DROP TABLE IF EXISTS customer_order_status;
DROP TABLE IF EXISTS customers;
```

### Issue: "Cannot add foreign key constraint"
**Solution:** This means some sales have customer_name values that couldn't be migrated.
```sql
-- Find problematic records
SELECT sale_id, customer_name 
FROM sales 
WHERE customer_id IS NULL 
  AND customer_name IS NOT NULL;

-- Manually create customers or set to NULL
UPDATE sales SET customer_name = NULL WHERE customer_id IS NULL;
```

### Issue: Duplicate username errors
**Solution:** The migration handles this automatically, but if you manually insert:
```sql
-- Check for duplicates
SELECT username, COUNT(*) 
FROM customers 
GROUP BY username 
HAVING COUNT(*) > 1;

-- Update duplicates
UPDATE customers 
SET username = CONCAT(username, '_', customer_id) 
WHERE customer_id = ?;
```

## Next Steps

After completing the database migration:

1. ✅ Database schema is ready
2. ⬜ Create Customer Authentication API (`api/CustomerAuthAPI.php`)
3. ⬜ Create Customer Login Page (`html/customer-login.html`)
4. ⬜ Create Customer Portal Dashboard
5. ⬜ Update Sales API to accept customer-initiated orders
6. ⬜ Test customer login and order placement

See: **RBAC-01_Validation_Findings.md** for complete implementation plan.

## Support

If you encounter issues:
1. Check the database error log
2. Review the verification queries above
3. Ensure you have proper database permissions
4. Check that all prerequisite tables (cities, countries) exist

---

**Migration Version:** 1.0  
**Last Updated:** October 19, 2025  
**Author:** Highland Fresh Development Team
