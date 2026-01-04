<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$stmt = $pdo->query('SELECT notification_id, metadata, reference_id FROM system_notifications');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
