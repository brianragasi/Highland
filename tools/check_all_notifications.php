<?php
/**
 * Check all notifications
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$stmt = $pdo->query('SELECT * FROM system_notifications ORDER BY created_at DESC');
$all = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Total notifications: " . count($all) . "\n";
print_r($all);
