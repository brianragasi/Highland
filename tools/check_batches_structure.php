<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db','root','');

echo "raw_material_batches columns:\n";
foreach($pdo->query('SHOW COLUMNS FROM raw_material_batches') as $row) {
    echo "  " . $row['Field'] . "\n";
}
