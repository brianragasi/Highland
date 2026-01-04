<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
$conn = getDBConnection();

echo "=== RAW MILK BATCHES WITH UPDATED FRESHNESS CHECK ===\n";
$stmt = $conn->query("
    SELECT 
        rmb.batch_id,
        rm.name,
        rmb.current_quantity,
        rmb.status,
        rmb.expiry_date,
        TIMESTAMPDIFF(HOUR, rmb.received_date, NOW()) as age_hours,
        CASE 
            WHEN rmb.status = 'EXPIRED' THEN 'EXPIRED'
            WHEN rmb.expiry_date IS NOT NULL AND rmb.expiry_date < NOW() THEN 'EXPIRED'
            WHEN rmb.expiry_date IS NOT NULL AND TIMESTAMPDIFF(HOUR, NOW(), rmb.expiry_date) <= 12 THEN 'CRITICAL'
            WHEN rmb.expiry_date IS NOT NULL AND TIMESTAMPDIFF(HOUR, NOW(), rmb.expiry_date) <= 24 THEN 'WARNING'
            WHEN rmb.expiry_date IS NULL AND TIMESTAMPDIFF(HOUR, rmb.received_date, NOW()) >= 48 THEN 'EXPIRED'
            WHEN rmb.expiry_date IS NULL AND TIMESTAMPDIFF(HOUR, rmb.received_date, NOW()) >= 36 THEN 'CRITICAL'
            WHEN rmb.expiry_date IS NULL AND TIMESTAMPDIFF(HOUR, rmb.received_date, NOW()) >= 24 THEN 'WARNING'
            ELSE 'GOOD'
        END as freshness_status
    FROM raw_material_batches rmb
    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
    WHERE rm.name = 'Raw Milk' AND rmb.current_quantity > 0
    ORDER BY rmb.batch_id DESC
");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
