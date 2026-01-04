<?php
/**
 * Debug: Check Yogurt Culture pricing
 */

$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Yogurt Culture in raw_materials ===\n";
$stmt = $pdo->query("SELECT raw_material_id, name, standard_cost FROM raw_materials WHERE name LIKE '%Yogurt%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n=== Yogurt Culture batches ===\n";
$stmt = $pdo->query("
    SELECT batch_id, raw_material_id, unit_cost, current_quantity, received_date, expiry_date
    FROM raw_material_batches 
    WHERE raw_material_id IN (SELECT raw_material_id FROM raw_materials WHERE name LIKE '%Yogurt%')
    ORDER BY received_date ASC
");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n=== FIFO Price Query Result ===\n";
$stmt = $pdo->query("
    SELECT 
        rm.raw_material_id,
        rm.name,
        rm.standard_cost,
        COALESCE(
            (SELECT unit_cost 
             FROM raw_material_batches 
             WHERE raw_material_id = rm.raw_material_id 
               AND unit_cost > 0 
               AND current_quantity > 0
             ORDER BY received_date ASC, batch_id ASC 
             LIMIT 1),
            rm.standard_cost,
            0
        ) as current_price
    FROM raw_materials rm
    WHERE rm.name LIKE '%Yogurt%'
");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\nDone.\n";
