<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$stmt = $pdo->query('DESCRIBE milk_daily_collections');
echo "=== milk_daily_collections structure ===\n";
while($row = $stmt->fetch(PDO::FETCH_ASSOC)) { 
    echo "{$row['Field']} - {$row['Type']} - Null: {$row['Null']} - Default: " . ($row['Default'] ?? 'NULL') . "\n"; 
}
