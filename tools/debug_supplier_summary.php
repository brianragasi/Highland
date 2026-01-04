<?php
/**
 * Debug the getSupplierSummary flow
 */

$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');

$supplierId = 1;
$periodStart = date('Y-m-01'); // Default to start of month
$periodEnd = date('Y-m-d'); // Default to today

echo "=== DEBUG getSupplierSummary ===\n\n";
echo "Period: $periodStart to $periodEnd\n";
echo "Supplier ID: $supplierId\n\n";

// Check table existence
$tableCheck = function($tableName) use ($pdo) {
    $stmt = $pdo->query("SHOW TABLES LIKE '$tableName'");
    return $stmt->rowCount() > 0;
};

$rawMilkExists = $tableCheck('raw_milk_collections');
$milkDailyExists = $tableCheck('milk_daily_collections');

echo "raw_milk_collections exists: " . ($rawMilkExists ? 'YES' : 'NO') . "\n";
echo "milk_daily_collections exists: " . ($milkDailyExists ? 'YES' : 'NO') . "\n\n";

// Query using the same logic as getPayoutCollections
if (!$rawMilkExists && $milkDailyExists) {
    echo "Using milk_daily_collections...\n\n";
    
    $stmt = $pdo->prepare("
        SELECT 
            mdc.collection_id,
            mdc.rmr_number,
            mdc.collection_date,
            mdc.liters_delivered as quantity_liters,
            mdc.liters_accepted as accepted_liters,
            mdc.liters_rejected as rejected_liters,
            mdc.fat_content,
            'ACCEPTED' as status
        FROM milk_daily_collections mdc
        WHERE mdc.supplier_id = ?
          AND mdc.collection_date BETWEEN ? AND ?
        ORDER BY mdc.collection_date ASC
    ");
    $stmt->execute([$supplierId, $periodStart, $periodEnd]);
    $collections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Collections found: " . count($collections) . "\n";
    
    // Calculate totals like getSupplierSummary does
    $totalDelivered = 0;
    $totalAccepted = 0;
    $totalRejected = 0;
    
    foreach ($collections as $c) {
        echo "  Row: " . json_encode($c) . "\n";
        $totalDelivered += floatval($c['quantity_liters'] ?? 0);
        $totalAccepted += floatval($c['accepted_liters'] ?? $c['quantity_liters'] ?? 0);
        $totalRejected += floatval($c['rejected_liters'] ?? 0);
    }
    
    echo "\nTotals:\n";
    echo "  - Delivered: $totalDelivered L\n";
    echo "  - Accepted: $totalAccepted L\n";
    echo "  - Rejected: $totalRejected L\n";
}

// Also check all collections for this supplier
echo "\n=== ALL COLLECTIONS FOR SUPPLIER 1 ===\n";
$stmt = $pdo->prepare("SELECT collection_date FROM milk_daily_collections WHERE supplier_id = ? ORDER BY collection_date");
$stmt->execute([$supplierId]);
$dates = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "All collection dates: " . implode(', ', $dates) . "\n";
echo "Current month range: $periodStart to $periodEnd\n";
