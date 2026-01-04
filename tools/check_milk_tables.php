<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$tables = ['raw_milk_collections', 'milk_daily_collections'];

echo "=== TABLE CHECK ===\n";
foreach($tables as $t) {
    $r = $pdo->query("SHOW TABLES LIKE '$t'");
    echo "$t: " . ($r->rowCount() > 0 ? 'EXISTS' : 'NOT FOUND') . "\n";
}

// Also test getPayoutCollections logic
echo "\n=== TESTING COLLECTION QUERY ===\n";
$supplierId = 1;
$periodStart = '2025-01-01';
$periodEnd = '2025-12-31';

// Check which table has data
$stmt = $pdo->prepare("SELECT COUNT(*) FROM milk_daily_collections WHERE supplier_id = ? AND collection_date BETWEEN ? AND ?");
$stmt->execute([$supplierId, $periodStart, $periodEnd]);
$count = $stmt->fetchColumn();
echo "milk_daily_collections records for supplier 1: $count\n";

// Get actual collections
$stmt = $pdo->prepare("
    SELECT 
        collection_id,
        rmr_number,
        collection_date,
        liters_delivered as quantity_liters,
        liters_accepted as accepted_liters,
        liters_rejected as rejected_liters
    FROM milk_daily_collections
    WHERE supplier_id = ?
      AND collection_date BETWEEN ? AND ?
");
$stmt->execute([$supplierId, $periodStart, $periodEnd]);
$collections = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "\nCollections found: " . count($collections) . "\n";
foreach($collections as $c) {
    echo "  - {$c['collection_date']}: {$c['quantity_liters']}L delivered, {$c['accepted_liters']}L accepted\n";
}
