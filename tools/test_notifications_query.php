<?php
/**
 * Test the notifications API query
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Testing Notifications Query ===\n";

$sql = "
    SELECT 
        notification_id,
        notification_type,
        title,
        message,
        target_role,
        reference_type,
        reference_id,
        severity,
        CASE WHEN is_read = 1 THEN 'READ' ELSE 'UNREAD' END as status,
        created_at,
        read_at
    FROM system_notifications
    WHERE target_role IN ('FINANCE', 'Finance Officer', 'FINANCE_OFFICER', 'ALL', NULL)
       OR target_role IS NULL
    ORDER BY created_at DESC
    LIMIT 50
";

$stmt = $pdo->query($sql);
$notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($notifications) . " notifications:\n\n";

foreach ($notifications as $n) {
    echo "ID: {$n['notification_id']} | Type: {$n['notification_type']} | Status: {$n['status']}\n";
    echo "Title: {$n['title']}\n";
    echo "Target: {$n['target_role']} | Severity: {$n['severity']}\n";
    echo "---\n";
}
