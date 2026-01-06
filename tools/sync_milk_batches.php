<?php
/**
 * Sync milk_daily_collections to raw_material_batches
 * This fixes the discrepancy where collections exist but batches don't
 */

$db = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== MILK COLLECTION TO RAW MATERIAL BATCH SYNC ===\n\n";

// Find collections that have accepted milk but no corresponding batch
$stmt = $db->query("
    SELECT mc.*, 
           TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) as age_hours,
           s.name as supplier_name
    FROM milk_daily_collections mc
    LEFT JOIN raw_material_batches rmb ON mc.rmr_number = rmb.highland_fresh_batch_code
    LEFT JOIN suppliers s ON mc.supplier_id = s.supplier_id
    WHERE mc.liters_accepted > 0 
      AND rmb.batch_id IS NULL
    ORDER BY mc.collection_date ASC
");

$missingCollections = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($missingCollections) . " collections without corresponding batches:\n\n";

foreach ($missingCollections as $c) {
    echo "- {$c['rmr_number']} | {$c['supplier_name']} | {$c['liters_accepted']}L | Age: {$c['age_hours']}h\n";
}

if (count($missingCollections) === 0) {
    echo "All collections are synced!\n";
    exit;
}

echo "\n\nSyncing to raw_material_batches...\n";

// Get Raw Milk material ID
$stmt = $db->query("SELECT raw_material_id FROM raw_materials WHERE name = 'Raw Milk' LIMIT 1");
$rawMilk = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$rawMilk) {
    die("ERROR: Raw Milk material not found!\n");
}

$rawMilkId = $rawMilk['raw_material_id'];
echo "Raw Milk material ID: {$rawMilkId}\n\n";

$db->beginTransaction();

try {
    $insertStmt = $db->prepare("
        INSERT INTO raw_material_batches (
            highland_fresh_batch_code,
            raw_material_id,
            supplier_id,
            quantity_received,
            current_quantity,
            unit_cost,
            received_date,
            expiry_date,
            quality_grade_received,
            status,
            highland_fresh_approved,
            milk_source_cooperative,
            notes,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Highland Fresh', ?, NOW())
    ");

    $synced = 0;
    $expired = 0;
    $totalLiters = 0;

    foreach ($missingCollections as $c) {
        $ageHours = $c['age_hours'];
        $expiryDate = date('Y-m-d H:i:s', strtotime($c['collection_date'] . ' +48 hours'));
        
        // Determine status based on age
        if ($ageHours >= 48) {
            $status = 'EXPIRED';
            $expired++;
        } else {
            $status = 'RECEIVED';
            $synced++;
            $totalLiters += $c['liters_accepted'];
        }

        $insertStmt->execute([
            $c['rmr_number'],
            $rawMilkId,
            $c['supplier_id'],
            $c['liters_accepted'],
            $c['liters_accepted'], // current_quantity = liters_accepted initially
            $c['base_price_per_liter'] ?? 40.00,
            $c['collection_date'],
            $expiryDate,
            'Grade A', // QC accepted = Grade A
            $status,
            "Synced from milk_daily_collections {$c['rmr_number']}"
        ]);

        echo ($status === 'EXPIRED' ? "⚠️" : "✅") . " {$c['rmr_number']} - {$c['liters_accepted']}L ({$status})\n";
    }

    // Update Raw Milk total quantity
    $db->exec("
        UPDATE raw_materials 
        SET quantity_on_hand = (
            SELECT COALESCE(SUM(current_quantity), 0) 
            FROM raw_material_batches 
            WHERE raw_material_id = {$rawMilkId} 
              AND status IN ('RECEIVED', 'APPROVED') 
              AND current_quantity > 0
        )
        WHERE raw_material_id = {$rawMilkId}
    ");

    $db->commit();

    echo "\n=== SYNC COMPLETE ===\n";
    echo "✅ Synced as RECEIVED: {$synced} batches ({$totalLiters}L)\n";
    echo "⚠️ Synced as EXPIRED: {$expired} batches\n";

    // Show new totals
    $stmt = $db->query("
        SELECT COUNT(*) as count, SUM(current_quantity) as total 
        FROM raw_material_batches 
        WHERE raw_material_id = {$rawMilkId} 
          AND status IN ('RECEIVED', 'APPROVED') 
          AND current_quantity > 0
    ");
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\n📊 Production now has: {$totals['count']} batches with {$totals['total']}L available\n";

} catch (Exception $e) {
    $db->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
