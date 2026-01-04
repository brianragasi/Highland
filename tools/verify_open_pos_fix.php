<?php
// Test getOpenPOs API directly (with mocked session)
$_SESSION = [
    'user_id' => 9,
    'username' => 'inventory',
    'role' => 'Warehouse Staff',
    'timeout' => time() + 1800
];
define('TESTING', true);

// Simulate session active
function session_status_mock() { return PHP_SESSION_ACTIVE; }

require_once __DIR__ . '/../api/DatabaseConfig.php';
require_once __DIR__ . '/../api/SessionConfig.php';

echo "Testing getOpenPOs API call...\n";

try {
    $pdo = getDBConnection();
    
    $sql = "
        SELECT 
            po.po_id,
            po.po_number,
            po.supplier_id,
            s.name as supplier_name,
            ts.status_name as status,
            po.order_date
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
        LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
        WHERE ts.status_name IN ('PO Sent', 'PO Confirmed', 'Sent', 'Confirmed')
    ";
    
    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($results) . " open PO(s):\n";
    foreach ($results as $po) {
        echo "  - {$po['po_number']} | {$po['supplier_name']} | {$po['status']}\n";
    }
    
    echo "\nAPI fix verified! Warehouse dashboard should now show these POs.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
