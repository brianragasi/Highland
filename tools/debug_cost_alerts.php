<?php
/**
 * Debug Cost Alert System
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== COST ALERT SYSTEM DEBUG ===\n\n";

// 1. Check notifications in database
echo "1. NOTIFICATIONS IN DATABASE:\n";
$stmt = $conn->query("SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 10");
$notifs = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($notifs) === 0) {
    echo "   ❌ No notifications found!\n";
} else {
    foreach ($notifs as $n) {
        echo sprintf("   [%d] %s - %s\n       %s\n       Created: %s | Read: %s\n\n",
            $n['notification_id'],
            $n['notification_type'],
            $n['title'],
            substr($n['message'], 0, 80) . '...',
            $n['created_at'],
            $n['is_read'] ? 'Yes' : 'No'
        );
    }
}

// 2. Check recent batch receipts with prices
echo "\n2. RECENT BATCH RECEIPTS (last 10):\n";
$stmt = $conn->query("
    SELECT 
        rmb.batch_id,
        rm.name as material_name,
        rmb.unit_cost,
        rmb.received_date,
        rmb.quantity_received
    FROM raw_material_batches rmb
    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
    ORDER BY rmb.received_date DESC, rmb.batch_id DESC
    LIMIT 10
");
$batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($batches as $b) {
    echo sprintf("   Batch %d: %s - ₱%.2f on %s (qty: %.2f)\n",
        $b['batch_id'],
        $b['material_name'],
        $b['unit_cost'],
        $b['received_date'],
        $b['quantity_received']
    );
}

// 3. Check raw_materials.standard_cost (this is what gets compared)
echo "\n3. STANDARD COSTS (for comparison):\n";
$stmt = $conn->query("SELECT raw_material_id, name, standard_cost FROM raw_materials WHERE is_active = 1 ORDER BY name");
$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($materials as $m) {
    echo sprintf("   %d. %-25s ₱%.2f\n", $m['raw_material_id'], $m['name'], $m['standard_cost'] ?? 0);
}

echo "\n=== HOW COST ALERTS WORK ===\n";
echo "
1. When you RECEIVE a Purchase Order batch:
   - System gets the NEW unit cost from the PO
   - System gets the PREVIOUS cost from raw_materials.standard_cost
   
2. If price changed ≥5% OR ≥₱2:
   - Creates notification in system_notifications table
   - Updates raw_materials.standard_cost to new price
   
3. Finance Dashboard > Cost Alerts tab:
   - Loads from system_notifications table
   - Shows unread count as badge
   
ISSUE: If standard_cost is 0, first receipt sets it without alert.
       Alerts only trigger on SUBSEQUENT receipts with price changes.
";

echo "\n=== DONE ===\n";
