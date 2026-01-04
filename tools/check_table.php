<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();

echo "=== supplier_raw_materials table structure ===\n";
$stmt = $conn->query("DESCRIBE supplier_raw_materials");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($cols as $col) {
    echo sprintf("%-30s %s\n", $col['Field'], $col['Type']);
}
