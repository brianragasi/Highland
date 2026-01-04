<?php
/**
 * Check if Yogurt Culture is approved
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$stmt = $pdo->query("SELECT raw_material_id, name, is_active, highland_fresh_approved FROM raw_materials WHERE name LIKE '%Yogurt%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
