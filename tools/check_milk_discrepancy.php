<?php
$db = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== MILK_DAILY_COLLECTIONS COLUMNS ===\n";
$stmt = $db->query("DESCRIBE milk_daily_collections");
print_r(array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field'));
$stmt = $db->query("
    SELECT batch_id, highland_fresh_batch_code, current_quantity, received_date, status, supplier_id 
    FROM raw_material_batches 
    WHERE raw_material_id = 14 
    ORDER BY received_date DESC 
    LIMIT 10
");
$batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($batches);
echo "Total batches: " . count($batches) . "\n";
echo "Total quantity: " . array_sum(array_column($batches, 'current_quantity')) . " L\n";

echo "\n\n=== MILK DAILY COLLECTIONS (milk_daily_collections table) ===\n";
$stmt = $db->query("DESCRIBE milk_daily_collections");
echo "Columns: ";
print_r(array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field'));

$stmt = $db->query("
    SELECT * 
    FROM milk_daily_collections 
    ORDER BY collection_date DESC 
    LIMIT 15
");
$collections = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($collections);
echo "Total collections: " . count($collections) . "\n";

echo "\n\n=== COMPARISON ===\n";
echo "Raw Material Batches shows: " . array_sum(array_column($batches, 'current_quantity')) . " L\n";
echo "Milk Collections shows: " . array_sum(array_column($collections, 'liters_accepted')) . " L\n";
echo "DISCREPANCY!\n";
