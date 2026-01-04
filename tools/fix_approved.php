<?php
/**
 * Fix: Set highland_fresh_approved = 1 for all active raw materials with batches
 * These materials are clearly being used if they have batches received
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Find materials that have batches but are not approved
echo "=== Materials with batches but NOT approved ===\n";
$stmt = $pdo->query("
    SELECT rm.raw_material_id, rm.name, rm.highland_fresh_approved, 
           COUNT(rmb.batch_id) as batch_count,
           SUM(rmb.current_quantity) as total_qty
    FROM raw_materials rm
    JOIN raw_material_batches rmb ON rm.raw_material_id = rmb.raw_material_id
    WHERE rm.highland_fresh_approved = 0 OR rm.highland_fresh_approved IS NULL
    GROUP BY rm.raw_material_id, rm.name, rm.highland_fresh_approved
");
$notApproved = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($notApproved);

if (count($notApproved) > 0) {
    // Fix them - approve all materials that have batches
    $stmt = $pdo->prepare("UPDATE raw_materials SET highland_fresh_approved = 1 WHERE raw_material_id = ?");
    
    foreach ($notApproved as $material) {
        $stmt->execute([$material['raw_material_id']]);
        echo "✅ Approved: {$material['name']} (ID: {$material['raw_material_id']}, {$material['total_qty']} units in stock)\n";
    }
    
    echo "\nFixed " . count($notApproved) . " materials.\n";
} else {
    echo "No materials to fix.\n";
}

echo "\nDone.\n";
