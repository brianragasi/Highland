<?php
// Simulate the exact API call made by warehouse-staff-dashboard.js
require_once __DIR__ . '/../api/DatabaseConfig.php';
try {
    $pdo = getDBConnection();

    $sql = "
        SELECT 
            po.po_id,
            po.po_number,
            po.supplier_id,
            s.name as supplier_name,
            s.email as supplier_email,
            po.total_amount,
            ts.status_name as status,
            po.order_date,
            po.expected_delivery_date,
            po.notes,
            po.created_at,
            u.username as created_by,
            COUNT(poi.po_item_id) as items_count,
            DATEDIFF(CURDATE(), po.order_date) as days_since_order,
            CASE 
                WHEN po.expected_delivery_date < CURDATE() THEN 1 
                ELSE 0 
            END as is_overdue
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
        LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
        LEFT JOIN users u ON po.user_id = u.user_id
        LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
        WHERE ts.status_name IN ('PO Sent', 'PO Confirmed', 'Sent', 'Confirmed')
        GROUP BY po.po_id
        ORDER BY 
            is_overdue DESC,
            po.expected_delivery_date ASC,
            po.order_date ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $results,
        'count' => count($results)
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
