<?php
// Inventory Data Consistency Diagnostic Tool
require_once '../api/DatabaseConfig.php';
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $conn = getDBConnection();
    
    // Authorization check
    $allowedRoles = ['Admin', 'Warehouse Staff', 'Production Supervisor'];
    $currentRole = $_SESSION['role'] ?? null;
    if (!$currentRole && isset($_SESSION['user_id'])) {
        $stmt = $conn->prepare("SELECT ur.role_name FROM users u JOIN user_roles ur ON u.role_id = ur.role_id WHERE u.user_id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $currentRole = $stmt->fetchColumn();
        $_SESSION['role'] = $currentRole;
    }
    
    if (!isset($_SESSION['user_id']) || !$currentRole || !in_array($currentRole, $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'compare_inventory';
        
        switch ($action) {
            case 'compare_inventory':
                // Compare stock levels between raw_materials and products tables
                $comparison = [];
                
                // Get raw materials stock
                $rawMaterialsStmt = $conn->query("
                    SELECT 
                        rm.raw_material_id,
                        rm.name as raw_material_name,
                        rm.sku,
                        rm.quantity_on_hand as rm_stock,
                        rm.reorder_level as rm_reorder_level,
                        rm.is_active as rm_active
                    FROM raw_materials rm 
                    WHERE rm.is_active = 1
                    ORDER BY rm.name
                ");
                $rawMaterials = $rawMaterialsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get products stock
                $productsStmt = $conn->query("
                    SELECT 
                        p.product_id,
                        p.name as product_name,
                        p.barcode,
                        p.quantity_on_hand as p_stock,
                        p.reorder_level as p_reorder_level,
                        p.is_active as p_active
                    FROM products p 
                    WHERE p.is_active = 1
                    ORDER BY p.name
                ");
                $products = $productsStmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Find potential matches by name/SKU/barcode
                $matches = [];
                $unmatched_raw = [];
                $unmatched_products = [];
                
                foreach ($rawMaterials as $rm) {
                    $matched = false;
                    foreach ($products as $p) {
                        // Match by SKU/barcode or similar name
                        if (($rm['sku'] && $rm['sku'] === $p['barcode']) ||
                            (levenshtein(strtolower($rm['raw_material_name']), strtolower($p['product_name'])) <= 3)) {
                            
                            $stockDifference = floatval($rm['rm_stock']) - floatval($p['p_stock']);
                            
                            $matches[] = [
                                'raw_material_id' => $rm['raw_material_id'],
                                'product_id' => $p['product_id'],
                                'name_rm' => $rm['raw_material_name'],
                                'name_product' => $p['product_name'],
                                'sku_barcode' => $rm['sku'] . ' / ' . $p['barcode'],
                                'stock_rm' => floatval($rm['rm_stock']),
                                'stock_product' => floatval($p['p_stock']),
                                'stock_difference' => $stockDifference,
                                'has_discrepancy' => abs($stockDifference) > 0.01,
                                'reorder_rm' => floatval($rm['rm_reorder_level']),
                                'reorder_product' => floatval($p['p_reorder_level'])
                            ];
                            $matched = true;
                            break;
                        }
                    }
                    if (!$matched) {
                        $unmatched_raw[] = $rm;
                    }
                }
                
                // Find unmatched products
                foreach ($products as $p) {
                    $found = false;
                    foreach ($matches as $match) {
                        if ($match['product_id'] == $p['product_id']) {
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $unmatched_products[] = $p;
                    }
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'matched_items' => $matches,
                        'discrepancies' => array_filter($matches, function($m) { return $m['has_discrepancy']; }),
                        'unmatched_raw_materials' => $unmatched_raw,
                        'unmatched_products' => $unmatched_products,
                        'summary' => [
                            'total_matches' => count($matches),
                            'discrepancies_count' => count(array_filter($matches, function($m) { return $m['has_discrepancy']; })),
                            'unmatched_raw_count' => count($unmatched_raw),
                            'unmatched_products_count' => count($unmatched_products)
                        ]
                    ],
                    'message' => 'Inventory comparison completed'
                ]);
                break;
                
            case 'sync_inventory':
                // Sync inventory from raw_materials to products where applicable
                $syncCount = 0;
                $errors = [];
                
                try {
                    $conn->beginTransaction();
                    
                    // Update products table with raw_materials stock levels where SKU/barcode matches
                    $stmt = $conn->prepare("
                        UPDATE products p 
                        JOIN raw_materials rm ON (
                            p.barcode = rm.sku OR 
                            LOWER(p.name) = LOWER(rm.name)
                        )
                        SET 
                            p.quantity_on_hand = rm.quantity_on_hand,
                            p.reorder_level = COALESCE(rm.reorder_level, p.reorder_level),
                            p.updated_at = NOW()
                        WHERE rm.is_active = 1 AND p.is_active = 1
                    ");
                    
                    $stmt->execute();
                    $syncCount = $stmt->rowCount();
                    
                    $conn->commit();
                    
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'synced_items' => $syncCount
                        ],
                        'message' => "Successfully synchronized {$syncCount} inventory items"
                    ]);
                    
                } catch (Exception $e) {
                    $conn->rollBack();
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to sync inventory: ' . $e->getMessage()
                    ]);
                }
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid action'
                ]);
        }
    }
    
} catch (Exception $e) {
    error_log("InventoryDiagnosticAPI Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'System error: ' . $e->getMessage()
    ]);
}
?>
