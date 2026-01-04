<?php
/**
 * Check and fix farmer payout synchronization
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db','root','');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== FARMER PAYOUT SYNC FIX ===\n\n";

// 1. Check if farmer_payouts table exists
echo "1. Checking farmer_payouts table...\n";
$tables = $pdo->query("SHOW TABLES LIKE 'farmer_payouts'")->fetchAll();
if (empty($tables)) {
    echo "   ✗ farmer_payouts table DOES NOT EXIST!\n";
    echo "   Creating farmer_payouts table...\n";
    
    $pdo->exec("
        CREATE TABLE farmer_payouts (
            payout_id INT AUTO_INCREMENT PRIMARY KEY,
            payout_reference VARCHAR(50) NOT NULL UNIQUE,
            supplier_id INT NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            total_liters_accepted DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_liters_rejected DECIMAL(12,2) DEFAULT 0,
            price_per_liter DECIMAL(10,2) DEFAULT 40.00,
            gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_transport_deductions DECIMAL(12,2) DEFAULT 0,
            net_amount_payable DECIMAL(12,2) NOT NULL DEFAULT 0,
            status ENUM('Draft', 'Approved', 'Paid', 'Cancelled') DEFAULT 'Draft',
            generated_by INT,
            approved_by INT,
            approved_at DATETIME,
            paid_by INT,
            paid_at DATETIME,
            payment_reference VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
            FOREIGN KEY (generated_by) REFERENCES users(user_id),
            INDEX idx_supplier (supplier_id),
            INDEX idx_period (period_start, period_end),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo "   ✓ farmer_payouts table created!\n";
} else {
    echo "   ✓ farmer_payouts table exists\n";
    
    // Show structure
    echo "   Columns: ";
    $cols = $pdo->query('SHOW COLUMNS FROM farmer_payouts')->fetchAll(PDO::FETCH_COLUMN);
    echo implode(', ', $cols) . "\n";
}

// 2. Check milk_daily_collections data
echo "\n2. Checking milk_daily_collections data...\n";
$stmt = $pdo->query('
    SELECT 
        c.supplier_id,
        s.name as supplier_name,
        COUNT(*) as collection_count,
        SUM(c.liters_accepted) as total_liters
    FROM milk_daily_collections c
    JOIN suppliers s ON c.supplier_id = s.supplier_id
    GROUP BY c.supplier_id
    ORDER BY total_liters DESC
');
$supplierCollections = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "   Found " . count($supplierCollections) . " suppliers with collections:\n";
foreach ($supplierCollections as $sc) {
    echo "   - [{$sc['supplier_id']}] {$sc['supplier_name']}: {$sc['collection_count']} collections, {$sc['total_liters']}L\n";
}

// 3. Check for any existing payouts
echo "\n3. Existing payouts:\n";
$payouts = $pdo->query('SELECT * FROM farmer_payouts ORDER BY created_at DESC LIMIT 5')->fetchAll(PDO::FETCH_ASSOC);
if (empty($payouts)) {
    echo "   No payouts generated yet.\n";
} else {
    foreach ($payouts as $p) {
        echo "   [{$p['payout_id']}] {$p['payout_reference']} - ₱" . number_format($p['net_amount_payable'], 2) . " ({$p['status']})\n";
    }
}

// 4. Verify FarmerPayoutAPI getDairySuppliers will work
echo "\n4. Testing getDairySuppliers query...\n";
$stmt = $pdo->query("
    SELECT 
        s.supplier_id,
        s.name,
        s.supplier_type,
        (SELECT COUNT(*) FROM milk_daily_collections mdc WHERE mdc.supplier_id = s.supplier_id) as collection_count,
        (SELECT SUM(liters_accepted) FROM milk_daily_collections mdc WHERE mdc.supplier_id = s.supplier_id) as total_liters
    FROM suppliers s
    WHERE s.supplier_type = 'Dairy Cooperative' OR s.supplier_type LIKE '%milk%' OR s.supplier_type LIKE '%farm%'
    OR s.name LIKE '%farm%' OR s.name LIKE '%dairy%' OR s.name LIKE '%cooperative%'
");
$dairySuppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "   Found " . count($dairySuppliers) . " dairy suppliers:\n";
foreach ($dairySuppliers as $ds) {
    echo "   - [{$ds['supplier_id']}] {$ds['name']} ({$ds['supplier_type']}): {$ds['collection_count']} collections\n";
}

echo "\n=== SYNC CHECK COMPLETE ===\n";
