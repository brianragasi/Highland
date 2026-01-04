<?php
/**
 * Check recipe table structure
 */
$conn = new PDO('mysql:host=localhost;dbname=highland_fresh_db;charset=utf8mb4', 'root', '');
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== production_recipes STRUCTURE ===\n";
$stmt = $conn->query('SHOW COLUMNS FROM production_recipes');
foreach($stmt as $row) {
    echo "{$row['Field']} ({$row['Type']})\n";
}

echo "\n=== recipe_raw_materials STRUCTURE ===\n";
$stmt = $conn->query('SHOW COLUMNS FROM recipe_raw_materials');
foreach($stmt as $row) {
    echo "{$row['Field']} ({$row['Type']})\n";
}

echo "\n=== production_recipes DATA ===\n";
$stmt = $conn->query('SELECT * FROM production_recipes');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($rows as $row) {
    echo json_encode($row) . "\n";
}

echo "\n=== recipe_raw_materials DATA ===\n";
$stmt = $conn->query('SELECT * FROM recipe_raw_materials');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($rows as $row) {
    echo json_encode($row) . "\n";
}
