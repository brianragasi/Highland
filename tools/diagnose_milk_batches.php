<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();

echo "=== RAW MATERIAL BATCHES (Last 10) ===\n";
$stmt = $conn->query("
    SELECT rmb.batch_id, rmb.highland_fresh_batch_code, rm.name as material_name, 
           rmb.current_quantity, rmb.status, rmb.received_date,
           TIMESTAMPDIFF(HOUR, rmb.received_date, NOW()) as age_hours,
           rmb.expiry_date,
           CASE 
               WHEN rmb.expiry_date < NOW() THEN 'EXPIRED'
               WHEN TIMESTAMPDIFF(HOUR, NOW(), rmb.expiry_date) <= 12 THEN 'CRITICAL'
               WHEN TIMESTAMPDIFF(HOUR, NOW(), rmb.expiry_date) <= 24 THEN 'WARNING'
               ELSE 'GOOD'
           END as freshness_status
    FROM raw_material_batches rmb
    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
    ORDER BY rmb.batch_id DESC
    LIMIT 10
");
$batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($batches);

echo "\n=== RAW MATERIALS TABLE ===\n";
$stmt = $conn->query("SELECT raw_material_id, name FROM raw_materials LIMIT 10");
$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($materials);

echo "\n=== MILK COLLECTIONS (Last 5) ===\n";
$stmt = $conn->query("
    SELECT collection_id, cooperative_name, liters_collected, liters_accepted, 
           processing_status, collection_date, 
           DATE_FORMAT(collection_date, '%Y-%m-%d %H:%i') as collected_at
    FROM milk_collections 
    ORDER BY collection_id DESC 
    LIMIT 5
");
$collections = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($collections);

echo "\n=== RAW MILK BATCHES SPECIFICALLY ===\n";
$stmt = $conn->query("
    SELECT rmb.*, rm.name
    FROM raw_material_batches rmb
    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
    WHERE rm.name LIKE '%Milk%' OR rm.name LIKE '%milk%'
    ORDER BY rmb.batch_id DESC
    LIMIT 5
");
$milkBatches = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($milkBatches);
