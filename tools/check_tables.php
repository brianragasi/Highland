<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
try {
    $pdo = getDBConnection();
    $tables = ['raw_materials', 'suppliers'];
    $result = [];
    foreach ($tables as $t) {
        $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
        $stmt->execute([$t]);
        $exists = (bool)$stmt->fetchColumn();
        $result[$t] = $exists;
    }
    echo json_encode(['ok' => true, 'tables' => $result]);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
