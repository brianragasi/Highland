<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();

echo "=== Checking system_notifications table ===\n";
$stmt = $conn->query("SHOW TABLES LIKE 'system_notifications'");
$exists = $stmt->fetch();

if ($exists) {
    echo "✅ Table exists!\n\n";
    $stmt = $conn->query("DESCRIBE system_notifications");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo sprintf("%-30s %s\n", $col['Field'], $col['Type']);
    }
    
    echo "\n=== Recent notifications ===\n";
    $stmt = $conn->query("SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 10");
    $notifs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($notifs);
} else {
    echo "❌ Table does NOT exist!\n";
}

echo "\n=== Checking raw_material_batches for Linx Solvent ===\n";
$stmt = $conn->query("
    SELECT rmb.*, rm.name 
    FROM raw_material_batches rmb 
    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id 
    WHERE rm.name LIKE '%Linx%'
    ORDER BY rmb.received_date DESC
    LIMIT 5
");
$batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($batches) > 0) {
    foreach ($batches as $b) {
        echo "{$b['name']} - Batch: {$b['batch_number']}, Cost: ₱{$b['unit_cost']}, Date: {$b['received_date']}\n";
    }
} else {
    echo "No batches found for Linx materials\n";
}
