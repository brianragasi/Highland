<?php
/**
 * Fix: Update standard_cost from existing batch prices
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== Updating Standard Costs from Batch Data ===\n\n";

// Get the latest batch price for each material (FIFO logic but for setting standard cost)
$stmt = $conn->query("
    SELECT 
        rm.raw_material_id,
        rm.name,
        rm.standard_cost as current_std_cost,
        (
            SELECT unit_cost 
            FROM raw_material_batches 
            WHERE raw_material_id = rm.raw_material_id 
              AND unit_cost > 0
            ORDER BY received_date DESC, batch_id DESC
            LIMIT 1
        ) as latest_batch_cost
    FROM raw_materials rm
    WHERE rm.is_active = 1
");

$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
$updated = 0;

foreach ($materials as $m) {
    $stdCost = floatval($m['current_std_cost']);
    $batchCost = floatval($m['latest_batch_cost']);
    
    // If standard_cost is 0 but we have a batch price, update it
    if ($stdCost == 0 && $batchCost > 0) {
        $updateStmt = $conn->prepare("UPDATE raw_materials SET standard_cost = ? WHERE raw_material_id = ?");
        $updateStmt->execute([$batchCost, $m['raw_material_id']]);
        echo "✅ Updated: {$m['name']} -> ₱" . number_format($batchCost, 2) . "\n";
        $updated++;
    } else if ($stdCost > 0) {
        echo "   Skipped: {$m['name']} (already has ₱" . number_format($stdCost, 2) . ")\n";
    } else {
        echo "   No data: {$m['name']} (no batches with price)\n";
    }
}

echo "\n=== Updated $updated materials ===\n";

// Show final state
echo "\nFinal standard_cost values:\n";
$stmt = $conn->query("SELECT raw_material_id, name, standard_cost FROM raw_materials WHERE is_active = 1 ORDER BY name");
$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($materials as $m) {
    $cost = floatval($m['standard_cost']);
    $status = $cost > 0 ? "₱" . number_format($cost, 2) : "❌ ₱0.00";
    echo sprintf("   %-25s %s\n", $m['name'], $status);
}

echo "\n✅ Done! Now when you receive a new batch at a DIFFERENT price, Cost Alert will trigger.\n";
