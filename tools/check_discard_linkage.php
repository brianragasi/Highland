<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();

echo "=== BATCH #21 DETAILS ===\n";
$stmt = $conn->query("SELECT * FROM raw_material_batches WHERE batch_id = 21");
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== COLLECTION #8 (RMR-20251210-001) - matching batch #21 ===\n";
$stmt = $conn->query("SELECT collection_id, rmr_number FROM milk_daily_collections WHERE rmr_number = 'RMR-20251210-001'");
print_r($stmt->fetch(PDO::FETCH_ASSOC));

echo "\n=== COLLECTION #9 (RMR-20260101-001) - NO batch exists ===\n";
$stmt = $conn->query("SELECT * FROM raw_material_batches WHERE highland_fresh_batch_code = 'RMR-20260101-001' OR highland_fresh_batch_code LIKE '%20260101%'");
$result = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($result ?: "No batch found for this collection");
