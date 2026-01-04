<?php
/**
 * Stock Integrity Check
 * Verifies if quantity_on_hand in raw_materials matches actual batch inventory
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();

echo "=== STOCK INTEGRITY CHECK ===\n";
echo "Comparing raw_materials.quantity_on_hand vs actual batch inventory\n\n";

$stmt = $conn->query("
    SELECT 
        rm.raw_material_id,
        rm.name,
        rm.quantity_on_hand as reported_stock,
        rm.reorder_level,
        COALESCE(batch_totals.actual_stock, 0) as actual_batch_stock,
        rm.quantity_on_hand - COALESCE(batch_totals.actual_stock, 0) as discrepancy
    FROM raw_materials rm
    LEFT JOIN (
        SELECT 
            raw_material_id,
            SUM(current_quantity) as actual_stock
        FROM raw_material_batches
        WHERE status IN ('RECEIVED', 'APPROVED')
          AND current_quantity > 0
        GROUP BY raw_material_id
    ) batch_totals ON rm.raw_material_id = batch_totals.raw_material_id
    ORDER BY rm.name
");

$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo str_pad("Material", 30) . str_pad("Reported", 12) . str_pad("Actual", 12) . str_pad("Discrepancy", 12) . "Status\n";
echo str_repeat("-", 80) . "\n";

$issues = [];
foreach ($results as $row) {
    $reported = floatval($row['reported_stock']);
    $actual = floatval($row['actual_batch_stock']);
    $discrepancy = $reported - $actual;
    
    $status = "✅ OK";
    if (abs($discrepancy) > 0.01) {
        $status = "❌ MISMATCH";
        $issues[] = $row;
    }
    if ($reported > 0 && $actual == 0) {
        $status = "⚠️ PHANTOM STOCK";
        $issues[] = $row;
    }
    
    echo str_pad($row['name'], 30);
    echo str_pad(number_format($reported, 2), 12);
    echo str_pad(number_format($actual, 2), 12);
    echo str_pad(number_format($discrepancy, 2), 12);
    echo $status . "\n";
}

echo "\n=== SUMMARY ===\n";
echo "Total materials: " . count($results) . "\n";
echo "Issues found: " . count($issues) . "\n";

if (count($issues) > 0) {
    echo "\n⚠️ PHANTOM STOCK DETECTED!\n";
    echo "These materials show stock in raw_materials but have NO actual batches:\n";
    foreach ($issues as $issue) {
        if (floatval($issue['actual_batch_stock']) == 0 && floatval($issue['reported_stock']) > 0) {
            echo "  - {$issue['name']}: Shows {$issue['reported_stock']} but no batches exist\n";
        }
    }
}

echo "\n=== RAW MATERIAL BATCHES (Active) ===\n";
$stmt = $conn->query("
    SELECT 
        rm.name,
        rmb.highland_fresh_batch_code,
        rmb.current_quantity,
        rmb.status,
        rmb.received_date
    FROM raw_material_batches rmb
    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
    WHERE rmb.current_quantity > 0 AND rmb.status IN ('RECEIVED', 'APPROVED')
    ORDER BY rm.name, rmb.received_date
");
$batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($batches) == 0) {
    echo "NO ACTIVE BATCHES FOUND!\n";
} else {
    echo str_pad("Material", 25) . str_pad("Batch Code", 25) . str_pad("Qty", 10) . str_pad("Status", 12) . "Received\n";
    echo str_repeat("-", 85) . "\n";
    foreach ($batches as $b) {
        echo str_pad($b['name'], 25);
        echo str_pad($b['highland_fresh_batch_code'], 25);
        echo str_pad(number_format($b['current_quantity'], 2), 10);
        echo str_pad($b['status'], 12);
        echo $b['received_date'] . "\n";
    }
}
