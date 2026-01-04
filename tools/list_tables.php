<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$stmt = $pdo->query("SHOW TABLES LIKE '%inventory%'");
echo "=== INVENTORY TABLES ===\n";
while($r = $stmt->fetch()) { 
    echo $r[0] . "\n"; 
}

echo "\n=== ALL TABLES ===\n";
$stmt = $pdo->query("SHOW TABLES");
while($r = $stmt->fetch()) { 
    echo $r[0] . "\n"; 
}
