<?php
/**
 * Debug material prices - check what getMaterialPrices returns vs actual batches
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

// First check table structure
echo "=== Table Structure ===\n";
$stmt = $conn->query('DESCRIBE raw_material_batches');
$cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Columns: " . implode(', ', $cols) . "\n\n";

echo "=== All Batches (Most Recent First) ===\n\n";

$stmt = $conn->query('SELECT batch_id, raw_material_id, unit_cost, received_date, quantity_received FROM raw_material_batches ORDER BY received_date DESC, batch_id DESC LIMIT 30');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo sprintf("%-6s %-5s %-10s %-15s %s\n", 'Batch', 'MatID', 'Cost', 'Received', 'Qty');
echo str_repeat('-', 50) . "\n";
foreach ($rows as $r) {
    echo sprintf("%-6d %-5d P%-9.2f %-15s %.2f\n", $r['batch_id'], $r['raw_material_id'], $r['unit_cost'], $r['received_date'], $r['quantity_received']);
}

echo "\n=== Material Prices Summary ===\n";
echo "--- Comparing: Latest Batch Price vs Standard Cost ---\n\n";

$stmt = $conn->query("
    SELECT rm.raw_material_id, rm.name, 
           (SELECT unit_cost FROM raw_material_batches WHERE raw_material_id = rm.raw_material_id ORDER BY received_date DESC LIMIT 1) as latest_batch_price,
           rm.standard_cost
    FROM raw_materials rm
    WHERE rm.is_active = 1
");
$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo sprintf("%-3s %-25s %-15s %s\n", "ID", "Material", "Latest Batch", "Standard Cost");
echo str_repeat('-', 60) . "\n";
foreach ($materials as $m) {
    echo sprintf("%-3d %-25s P%-14.2f P%.2f\n", 
        $m['raw_material_id'], 
        substr($m['name'], 0, 24),
        $m['latest_batch_price'] ?? 0,
        $m['standard_cost'] ?? 0
    );
}

echo "\n=== Done ===\n";
