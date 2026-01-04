<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== Raw Materials SKU Check ===\n";
$stmt = $conn->query("SELECT raw_material_id, name, sku FROM raw_materials LIMIT 15");
$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($materials as $m) {
    $sku = $m['sku'] ?: '(NULL/EMPTY)';
    echo "{$m['raw_material_id']}. {$m['name']} - SKU: {$sku}\n";
}

echo "\n=== Products SKU Check ===\n";
$stmt = $conn->query("SELECT product_id, name, sku FROM products LIMIT 10");
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($products as $p) {
    $sku = $p['sku'] ?: '(NULL/EMPTY)';
    echo "{$p['product_id']}. {$p['name']} - SKU: {$sku}\n";
}
