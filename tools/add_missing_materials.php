<?php
/**
 * Add missing raw materials for recipes
 */
$conn = new PDO('mysql:host=localhost;dbname=highland_fresh_db;charset=utf8mb4', 'root', '');
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Based on output: Liter = 5, Kilogram = 1
$literUnit = 5;
$kgUnit = 1;

echo "Using Liter unit_id: $literUnit, Kg unit_id: $kgUnit\n\n";

// Add missing materials using correct column
$materials = [
    ['Chocolate Flavoring', $literUnit, 'Raw Material'],
    ['Yogurt Culture', $literUnit, 'Raw Material'],
    ['Fruit Flavoring', $literUnit, 'Raw Material'],
    ['Cheese Culture', $literUnit, 'Raw Material'],
    ['Salt', $kgUnit, 'Raw Material'],
];

$stmt = $conn->prepare('INSERT INTO raw_materials (name, unit_id, category) VALUES (?, ?, ?)');
foreach ($materials as $m) {
    try {
        $stmt->execute($m);
        echo "✓ Added: {$m[0]}\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "- Skip: {$m[0]} (already exists)\n";
        } else {
            echo "✗ Error: {$m[0]} - " . $e->getMessage() . "\n";
        }
    }
}
echo "\nDone!\n";
