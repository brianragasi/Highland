<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
try {
    $pdo = getDBConnection();
    $stmt = $pdo->query('DESCRIBE raw_materials');
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['ok' => true, 'columns' => array_column($cols, 'Field')], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
