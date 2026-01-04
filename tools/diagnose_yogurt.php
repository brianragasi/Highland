<?php
$conn = new PDO("mysql:host=localhost;dbname=highland_fresh_db", "root", "");

echo "=== ALL ACTIVE RAW MATERIALS ===\n";
$stmt = $conn->query("SELECT raw_material_id, name, sku FROM raw_materials WHERE is_active = 1 ORDER BY name");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n=== CHECK THE API QUERY ===\n";
// This is the query used by RawMaterialsAPI get_all
$stmt = $conn->query("
    SELECT 
        rm.raw_material_id,
        rm.name,
        rm.sku,
        rm.category,
        COALESCE(SUM(rmb.current_quantity), 0) as quantity_on_hand,
        rm.reorder_level
    FROM raw_materials rm
    LEFT JOIN raw_material_batches rmb ON rm.raw_material_id = rmb.raw_material_id
    WHERE rm.is_active = 1
    GROUP BY rm.raw_material_id
    ORDER BY rm.name
");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Found " . count($results) . " materials\n\n";

// Check if Yogurt is there
foreach ($results as $r) {
    if (stripos($r['name'], 'yogurt') !== false) {
        echo "FOUND YOGURT: ";
        print_r($r);
    }
}
