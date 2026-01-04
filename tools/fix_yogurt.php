<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();
$conn->exec("UPDATE raw_materials SET standard_cost = 50.00 WHERE name = 'Yogurt Culture'");
echo "Fixed Yogurt Culture standard_cost to ₱50.00\n";
