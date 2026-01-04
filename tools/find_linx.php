<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$s = $pdo->query("SELECT raw_material_id, name FROM raw_materials WHERE name LIKE '%Linx%' OR name LIKE '%Ink%'");
print_r($s->fetchAll(PDO::FETCH_ASSOC));

echo "\n--- Notification reference_ids ---\n";
$s = $pdo->query("SELECT notification_id, reference_id, title FROM system_notifications");
print_r($s->fetchAll(PDO::FETCH_ASSOC));
