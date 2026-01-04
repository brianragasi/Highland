<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';
try {
    $pdo = getDBConnection();

    // Test getRawMaterials query
    $stmt = $pdo->query("
        SELECT 
            rm.raw_material_id,
            rm.name,
            rm.category,
            rm.quantity_on_hand,
            COALESCE(rm.reorder_level, 100) as reorder_level,
            COALESCE(uom.unit_name, 'pcs') as unit_of_measure
        FROM raw_materials rm
        LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
        ORDER BY rm.category, rm.name
    ");
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Test getSuppliers query
    $stmt2 = $pdo->query("
        SELECT 
            supplier_id,
            name AS company_name,
            supplier_type,
            CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END AS status
        FROM suppliers
        WHERE is_active = 1
        ORDER BY name
    ");
    $suppliers = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'raw_materials_count' => count($materials),
        'raw_materials_sample' => array_slice($materials, 0, 3),
        'suppliers_count' => count($suppliers),
        'suppliers_sample' => array_slice($suppliers, 0, 3)
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
