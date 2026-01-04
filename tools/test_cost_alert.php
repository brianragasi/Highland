<?php
/**
 * Test Cost Alert Notification System
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== Testing Cost Alert System ===\n\n";

// 1. Check table exists
$stmt = $conn->query("SHOW TABLES LIKE 'system_notifications'");
if ($stmt->rowCount() === 0) {
    echo "❌ system_notifications table does not exist!\n";
    exit(1);
}
echo "✅ system_notifications table exists\n\n";

// 2. Create a test notification simulating a price change
echo "--- Inserting Test Notification ---\n";

$message = "Linx Ink price increased from ₱50.00 to ₱70.00 (+40.0%, +₱20.00). 3 product(s) may need cost review.";
$metadata = json_encode([
    'old_cost' => 50.00,
    'new_cost' => 70.00,
    'change' => 20.00,
    'percent_change' => 40.0,
    'affected_products' => 3
]);

$stmt = $conn->prepare("
    INSERT INTO system_notifications (
        notification_type, 
        title, 
        message,
        severity,
        reference_type,
        reference_id,
        metadata,
        target_role, 
        is_read, 
        created_at
    ) VALUES (
        'BOM_PRICE_CHANGE',
        'Material Price Change Alert',
        ?,
        'critical',
        'raw_material',
        2,
        ?,
        'Finance Officer',
        0,
        NOW()
    )
");

try {
    $stmt->execute([$message, $metadata]);
    echo "✅ Test notification inserted (ID: " . $conn->lastInsertId() . ")\n\n";
} catch (PDOException $e) {
    echo "❌ Insert failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 3. Verify notifications in table
echo "--- All Notifications ---\n";
$stmt = $conn->query("
    SELECT notification_id, notification_type, title, message, severity, is_read, target_role, created_at
    FROM system_notifications
    ORDER BY created_at DESC
");
$notifs = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($notifs) === 0) {
    echo "No notifications found.\n";
} else {
    foreach ($notifs as $n) {
        $status = $n['is_read'] ? 'READ' : 'UNREAD';
        echo sprintf(
            "[%d] %s - %s (%s)\n    %s\n    Target: %s | Created: %s\n\n",
            $n['notification_id'],
            $n['notification_type'],
            $n['title'],
            $status,
            $n['message'],
            $n['target_role'],
            $n['created_at']
        );
    }
}

echo "=== Test Complete ===\n";
echo "Now go to Finance Dashboard > Cost Alerts tab to see the notification!\n";
