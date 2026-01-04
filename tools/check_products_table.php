<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db','root','');

echo "Products columns:\n";
foreach($pdo->query('SHOW COLUMNS FROM products') as $row) {
    echo "  " . $row['Field'] . "\n";
}

echo "\nSample recipe join:\n";
$stmt = $pdo->query('
    SELECT r.recipe_id, r.finished_product_id, p.product_id, p.name as product_name
    FROM production_recipes r
    LEFT JOIN products p ON r.finished_product_id = p.product_id
    LIMIT 5
');
foreach($stmt as $row) {
    print_r($row);
}
