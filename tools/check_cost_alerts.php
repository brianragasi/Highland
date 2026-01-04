<?php
/**
 * Check Cost Alerts in the system
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== All Cost Alert Notifications ===\n";
$stmt = $pdo->query("
    SELECT notification_id, title, message, severity, is_read, created_at
    FROM system_notifications 
    WHERE notification_type = 'cost_alert'
    ORDER BY created_at DESC
");
$alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($alerts) === 0) {
    echo "No cost alerts found.\n";
} else {
    foreach ($alerts as $alert) {
        $status = $alert['is_read'] ? 'READ' : 'UNREAD';
        echo "----------------------------------------\n";
        echo "ID: {$alert['notification_id']} | Status: $status\n";
        echo "Severity: {$alert['severity']}\n";
        echo "Title: {$alert['title']}\n";
        echo "Message: {$alert['message']}\n";
        echo "Created: {$alert['created_at']}\n";
    }
}

echo "\n=== Total: " . count($alerts) . " cost alerts ===\n";
