<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
try {
    $pdo = getDBConnection();

    // Check transaction_statuses for Purchase type
    $stmt = $pdo->query("SELECT * FROM transaction_statuses WHERE status_type = 'Purchase' ORDER BY status_id");
    $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check how many POs exist and their statuses
    $stmt2 = $pdo->query("
        SELECT ts.status_name, COUNT(*) as cnt 
        FROM purchase_orders po 
        LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
        GROUP BY po.status_id, ts.status_name
    ");
    $poByStatus = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // Check for any POs with status "PO Sent"
    $stmt3 = $pdo->query("
        SELECT po.po_id, po.po_number, po.order_date, ts.status_name, po.notes
        FROM purchase_orders po
        LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
        WHERE ts.status_name IN ('PO Sent', 'PO Confirmed', 'Sent', 'Confirmed')
        LIMIT 10
    ");
    $openPOs = $stmt3->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'purchase_statuses' => $statuses,
        'po_counts_by_status' => $poByStatus,
        'open_pos_sample' => $openPOs
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
