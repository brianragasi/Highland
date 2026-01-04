<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$stmt = $pdo->query('DESCRIBE farmer_payouts');
echo "=== farmer_payouts structure ===\n";
while($r = $stmt->fetch(PDO::FETCH_ASSOC)) { 
    echo "{$r['Field']} - {$r['Type']}\n"; 
}
