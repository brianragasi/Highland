<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();

echo "=== RAW MATERIALS WITH STOCK LEVELS ===\n";
$stmt = $conn->query("
    SELECT 
        raw_material_id, 
        name, 
        quantity_on_hand, 
        COALESCE(reorder_level, 100) as reorder_level,
        (COALESCE(reorder_level, 100) - quantity_on_hand) as shortage,
        CASE 
            WHEN quantity_on_hand <= 0 THEN 'OUT_OF_STOCK'
            WHEN quantity_on_hand <= COALESCE(reorder_level, 100) * 0.5 THEN 'CRITICAL'
            WHEN quantity_on_hand <= COALESCE(reorder_level, 100) THEN 'LOW'
            ELSE 'OK'
        END AS stock_status
    FROM raw_materials 
    ORDER BY (COALESCE(reorder_level, 100) - quantity_on_hand) DESC
");
$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo str_pad("Material", 30) . str_pad("Stock", 12) . str_pad("Reorder", 12) . str_pad("Shortage", 12) . "Status\n";
echo str_repeat("-", 80) . "\n";

foreach ($materials as $m) {
    echo str_pad($m['name'], 30);
    echo str_pad($m['quantity_on_hand'], 12);
    echo str_pad($m['reorder_level'], 12);
    echo str_pad($m['shortage'], 12);
    echo $m['stock_status'] . "\n";
}

echo "\n=== ITEMS THAT SHOULD SHOW AS LOW STOCK ===\n";
$stmt = $conn->query("
    SELECT name, quantity_on_hand, COALESCE(reorder_level, 100) as reorder_level
    FROM raw_materials 
    WHERE quantity_on_hand <= COALESCE(reorder_level, 100)
");
$lowStock = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($lowStock)) {
    echo "No items below reorder level\n";
} else {
    print_r($lowStock);
}

echo "\n=== CHECK v_low_stock_items VIEW ===\n";
try {
    $stmt = $conn->query("SELECT * FROM v_low_stock_items LIMIT 5");
    $viewData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($viewData);
} catch (PDOException $e) {
    echo "View doesn't exist: " . $e->getMessage() . "\n";
}
