<?php
// Enhanced Two-Tier Inventory API
require_once __DIR__ . '/DatabaseConfig.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $conn = getDBConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'get_inventory_summary':
                $stmt = $conn->query("SELECT * FROM inventory_summary_view");
                $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'summary' => $summary
                ]);
                break;
                
            case 'get_finished_products_inventory':
                $stmt = $conn->query("
                    SELECT * FROM finished_products_inventory_view
                    ORDER BY 
                        CASE stock_status 
                            WHEN 'PRODUCTION_NEEDED' THEN 1 
                            WHEN 'OVERSTOCKED' THEN 2 
                            ELSE 3 
                        END,
                        product_name
                ");
                $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'inventory' => $inventory
                ]);
                break;
                
            case 'get_low_stock_products':
                // Get products that need production (low stock)
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                
                $stmt = $conn->prepare("
                    SELECT 
                        product_id,
                        product_name,
                        sku,
                        category_name,
                        unit_name,
                        quantity_on_hand,
                        reorder_level,
                        stock_status,
                        selling_price
                    FROM finished_products_inventory_view
                    WHERE stock_status = 'PRODUCTION_NEEDED'
                    ORDER BY 
                        (quantity_on_hand / NULLIF(reorder_level, 0)) ASC,
                        product_name
                    LIMIT ?
                ");
                $stmt->execute([$limit]);
                $lowStock = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Also get count of all low stock items
                $countStmt = $conn->query("
                    SELECT COUNT(*) as count 
                    FROM finished_products_inventory_view 
                    WHERE stock_status = 'PRODUCTION_NEEDED'
                ");
                $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'data' => $lowStock,
                    'total_count' => (int)$countResult['count']
                ]);
                break;
                
            case 'get_low_stock_raw_materials':
                // Get raw materials that need reordering (low stock)
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                
                $stmt = $conn->prepare("
                    SELECT 
                        raw_material_id,
                        material_name,
                        category,
                        unit_of_measure,
                        quantity_on_hand,
                        reorder_level,
                        stock_status
                    FROM raw_materials_inventory_view
                    WHERE stock_status = 'REORDER_NEEDED'
                    ORDER BY 
                        (quantity_on_hand / NULLIF(reorder_level, 0)) ASC,
                        material_name
                    LIMIT ?
                ");
                $stmt->execute([$limit]);
                $lowStock = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Also get count of all low stock raw materials
                $countStmt = $conn->query("
                    SELECT COUNT(*) as count 
                    FROM raw_materials_inventory_view 
                    WHERE stock_status = 'REORDER_NEEDED'
                ");
                $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'data' => $lowStock,
                    'total_count' => (int)$countResult['count']
                ]);
                break;
                
            case 'get_all_low_stock':
                // Get both low stock finished products AND raw materials
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                
                // Get low stock finished products
                $productsStmt = $conn->query("
                    SELECT 
                        product_id as id,
                        product_name as name,
                        'product' as type,
                        category_name as category,
                        unit_name as unit,
                        quantity_on_hand,
                        reorder_level,
                        stock_status
                    FROM finished_products_inventory_view
                    WHERE stock_status = 'PRODUCTION_NEEDED'
                ");
                $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get low stock raw materials
                $rawMaterialsStmt = $conn->query("
                    SELECT 
                        raw_material_id as id,
                        material_name as name,
                        'raw_material' as type,
                        category,
                        unit_of_measure as unit,
                        quantity_on_hand,
                        reorder_level,
                        stock_status
                    FROM raw_materials_inventory_view
                    WHERE stock_status = 'REORDER_NEEDED'
                ");
                $rawMaterials = $rawMaterialsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Combine and sort by urgency (lowest percentage of reorder level first)
                $allLowStock = array_merge($products, $rawMaterials);
                usort($allLowStock, function($a, $b) {
                    $aPercentage = $a['reorder_level'] > 0 ? ($a['quantity_on_hand'] / $a['reorder_level']) : 999;
                    $bPercentage = $b['reorder_level'] > 0 ? ($b['quantity_on_hand'] / $b['reorder_level']) : 999;
                    return $aPercentage <=> $bPercentage;
                });
                
                // Limit results
                $limitedLowStock = array_slice($allLowStock, 0, $limit);
                
                echo json_encode([
                    'success' => true,
                    'data' => $limitedLowStock,
                    'total_count' => count($allLowStock),
                    'products_count' => count($products),
                    'raw_materials_count' => count($rawMaterials)
                ]);
                break;
                
            default:
                throw new Exception('Invalid action specified');
        }
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
