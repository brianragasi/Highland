<?php
require __DIR__ . '/../api/DatabaseConfig.php';

try {
    $pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check purchase_requisitions table structure
    $stmt = $pdo->query('DESCRIBE purchase_requisitions');
    echo "purchase_requisitions columns:\n";
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo '  - ' . $row['Field'] . ' (' . $row['Type'] . ")\n";
    }
    
    // Check if requisition 2 exists
    $stmt = $pdo->query('SELECT * FROM purchase_requisitions WHERE requisition_id = 2');
    $req = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\nRequisition 2: " . ($req ? json_encode($req) : 'NOT FOUND') . "\n";
    
    // Check purchase_requisition_items table structure
    $stmt = $pdo->query('DESCRIBE purchase_requisition_items');
    echo "\npurchase_requisition_items columns:\n";
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo '  - ' . $row['Field'] . ' (' . $row['Type'] . ")\n";
    }

    // Try the actual query
    echo "\n--- Testing actual query ---\n";
    $stmt = $pdo->prepare("
        SELECT 
            pri.*,
            rm.name AS material_name,
            rm.category AS material_category,
            s.name AS supplier_name
        FROM purchase_requisition_items pri
        LEFT JOIN raw_materials rm ON pri.raw_material_id = rm.raw_material_id
        LEFT JOIN suppliers s ON pri.preferred_supplier_id = s.supplier_id
        WHERE pri.requisition_id = ?
    ");
    $stmt->execute([2]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Items found: " . count($items) . "\n";
    
} catch(Exception $e) {
    echo 'Error: ' . $e->getMessage() . "\n";
    echo 'Trace: ' . $e->getTraceAsString() . "\n";
}
