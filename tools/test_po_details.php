<?php
/**
 * Test script for PurchaseOrdersAPI getPurchaseOrderDetails
 */

// Database connection directly
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=highland_fresh_db;charset=utf8mb4',
        'root',
        '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    $po_id = 1;
    
    // Get PO details
    $stmt = $pdo->prepare(
        "SELECT 
            po.po_id,
            po.po_number,
            s.name as supplier_name,
            po.order_date,
            ts.status_name as status
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
        LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
        WHERE po.po_id = ?"
    );
    $stmt->execute([$po_id]);
    $po = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($po) {
        echo "✅ PO Found:\n";
        print_r($po);
        
        // Get items
        $itemsStmt = $pdo->prepare(
            "SELECT 
                poi.po_item_id,
                rm.name as raw_material_name,
                poi.ordered_quantity,
                poi.received_quantity,
                poi.unit_cost
            FROM purchase_order_items poi
            LEFT JOIN raw_materials rm ON poi.raw_material_id = rm.raw_material_id
            WHERE poi.po_id = ?"
        );
        $itemsStmt->execute([$po_id]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\n📦 Items (" . count($items) . "):\n";
        print_r($items);
    } else {
        echo "❌ PO not found\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
