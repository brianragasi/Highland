<?php
/**
 * Check actual inventory - which batches still have stock?
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== Linx Ink (ID=13) - All Batches with Stock Status ===\n\n";

$stmt = $conn->query("
    SELECT batch_id, unit_cost, received_date, quantity_received, current_quantity
    FROM raw_material_batches 
    WHERE raw_material_id = 13 
    ORDER BY received_date ASC, batch_id ASC
");

echo sprintf("%-8s %-10s %-15s %-12s %s\n", "Batch", "Cost", "Received", "Received Qty", "Current Qty");
echo str_repeat("-", 60) . "\n";

foreach ($stmt as $r) {
    $status = $r['current_quantity'] > 0 ? " <-- IN STOCK" : "";
    echo sprintf("%-8d P%-9.2f %-15s %-12.2f %.2f%s\n", 
        $r['batch_id'], 
        $r['unit_cost'], 
        $r['received_date'],
        $r['quantity_received'],
        $r['current_quantity'],
        $status
    );
}

echo "\n=== FIFO Logic ===\n";
echo "For costing, we should use the OLDEST batch that still has stock.\n";
echo "This means if you have P50 stock left, you use P50 price for production.\n";
echo "Only when that runs out, you move to the P70 batch.\n";

// What SHOULD the price be?
$stmt = $conn->query("
    SELECT unit_cost, current_quantity 
    FROM raw_material_batches 
    WHERE raw_material_id = 13 AND current_quantity > 0
    ORDER BY received_date ASC, batch_id ASC
    LIMIT 1
");
$fifoPrice = $stmt->fetch(PDO::FETCH_ASSOC);

if ($fifoPrice) {
    echo "\n>>> FIFO Price should be: P" . number_format($fifoPrice['unit_cost'], 2) . " (oldest stock with qty: " . $fifoPrice['current_quantity'] . ")\n";
} else {
    echo "\n>>> No stock available, use latest price.\n";
}
