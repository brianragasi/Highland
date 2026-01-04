<?php
// TASK 5: Update Purchase Order System Logic - Raw Materials API
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
    // Authorization: allow Admin, Warehouse Manager, Warehouse Staff, Production Supervisor (needs raw materials view)
    $allowedRoles = ['Admin','Warehouse Manager','Warehouse Staff','Production Supervisor'];
    $currentRole = $_SESSION['role'] ?? null;
    if (!$currentRole && isset($_SESSION['user_id'])) {
        $stmt = $conn->prepare("SELECT ur.role_name FROM users u JOIN user_roles ur ON u.role_id = ur.role_id WHERE u.user_id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $currentRole = $stmt->fetchColumn();
        $_SESSION['role'] = $currentRole;
    }
    if (!isset($_SESSION['user_id']) || !$currentRole || !in_array($currentRole, $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['success'=>false,'message'=>'Unauthorized: Admin, Warehouse Manager, Warehouse Staff, or Production Supervisor access required']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'get_all':
                // Get all active raw materials
                $stmt = $conn->query("
                    SELECT
                        rm.raw_material_id as product_id,
                        rm.name as product_name,
                        rm.name,
                        rm.sku,
                        rm.sku as barcode,
                        rm.category,
                        uom.unit_name as unit,
                        rm.quantity_on_hand,
                        rm.reorder_level,
                        rm.standard_order_quantity,
                        COALESCE(MIN(srm.unit_cost), 0) as price,
                        COALESCE(MIN(srm.unit_cost), 0) as unit_cost,
                        'raw_material' as product_type,
                        rm.is_active
                    FROM raw_materials rm
                    LEFT JOIN supplier_raw_materials srm ON rm.raw_material_id = srm.raw_material_id AND srm.is_active = 1
                    LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                    WHERE rm.is_active = 1 AND rm.highland_fresh_approved = 1
                    GROUP BY rm.raw_material_id, rm.name, rm.sku, rm.category, uom.unit_name, rm.quantity_on_hand, rm.reorder_level, rm.standard_order_quantity, rm.is_active
                    ORDER BY rm.category, rm.name
                ");
                $rawMaterials = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'data' => $rawMaterials,
                    'count' => count($rawMaterials),
                    'message' => count($rawMaterials) . ' raw materials available'
                ]);
                break;
                
            case 'get_raw_materials_by_supplier':
                $supplier_id = $_GET['supplier_id'] ?? null;
                if (!$supplier_id) {
                    throw new Exception('Supplier ID is required');
                }
                
                $stmt = $conn->prepare("
                    SELECT 
                        rm.raw_material_id as product_id,
                        rm.name as product_name,
                        rm.sku as product_sku,
                        rm.category,
                        uom.unit_name as unit,
                        srm.unit_cost,
                        srm.minimum_order_quantity,
                        srm.lead_time_days,
                        srm.is_preferred_supplier as is_preferred,
                        rm.quantity_on_hand,
                        rm.reorder_level,
                        'raw_material' as product_type
                    FROM raw_materials rm
                    JOIN supplier_raw_materials srm ON rm.raw_material_id = srm.raw_material_id
                    JOIN suppliers s ON srm.supplier_id = s.supplier_id
                    LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                    WHERE s.supplier_id = ? 
                    AND rm.is_active = 1 
                    AND srm.is_active = 1
                    AND rm.highland_fresh_approved = 1
                    ORDER BY rm.category, rm.name
                ");
                $stmt->execute([$supplier_id]);
                $rawMaterials = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'products' => $rawMaterials,
                    'message' => count($rawMaterials) . ' raw materials available from this supplier'
                ]);
                break;
                
            case 'get_suppliers_with_materials':
                $stmt = $conn->query("
                    SELECT DISTINCT
                        s.supplier_id,
                        s.name as supplier_name,
                        s.supplier_type,
                        s.contact_person,
                        s.email,
                        s.phone_number,
                        COUNT(srm.raw_material_id) as materials_count,
                        AVG(srm.unit_cost) as avg_cost
                    FROM suppliers s
                    JOIN supplier_raw_materials srm ON s.supplier_id = srm.supplier_id
                    WHERE s.is_active = 1 AND srm.is_active = 1 AND s.highland_fresh_approved = 1
                    GROUP BY s.supplier_id
                    ORDER BY s.supplier_type, s.name
                ");
                $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'suppliers' => $suppliers
                ]);
                break;
                
            case 'get_raw_materials_inventory':
                $stmt = $conn->query("
                    SELECT * FROM raw_materials_inventory_view
                    ORDER BY supplier_category, material_name
                ");
                $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'inventory' => $inventory
                ]);
                break;
            
            case 'get_batches_for_material':
                // Get raw material batches for a specific material (for FIFO display)
                $materialName = $_GET['material_name'] ?? null;
                $materialId = $_GET['material_id'] ?? null;
                
                if (!$materialName && !$materialId) {
                    throw new Exception('Material name or ID is required');
                }
                
                // Build query
                // Handle NULL expiry_date: use age-based freshness for raw materials like milk
                $sql = "
                    SELECT 
                        rmb.batch_id,
                        rmb.highland_fresh_batch_code as batch_code,
                        rmb.raw_material_id,
                        rm.name as material_name,
                        rmb.supplier_id,
                        s.name as supplier_name,
                        rmb.quantity_received,
                        rmb.current_quantity,
                        rmb.unit_cost,
                        rmb.received_date,
                        rmb.expiry_date,
                        rmb.quality_grade_received,
                        rmb.status,
                        rmb.notes,
                        TIMESTAMPDIFF(HOUR, rmb.received_date, NOW()) as age_hours,
                        CASE 
                            WHEN rmb.expiry_date IS NULL THEN NULL
                            ELSE TIMESTAMPDIFF(HOUR, NOW(), rmb.expiry_date)
                        END as hours_until_expiry,
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
                    LEFT JOIN suppliers s ON rmb.supplier_id = s.supplier_id
                    WHERE rmb.current_quantity > 0
                      AND rmb.status IN ('RECEIVED', 'APPROVED')
                      -- Exclude expired batches
                      AND NOT (rmb.status = 'EXPIRED')
                      AND NOT (rmb.expiry_date IS NOT NULL AND rmb.expiry_date < NOW())
                      AND NOT (rmb.expiry_date IS NULL AND TIMESTAMPDIFF(HOUR, rmb.received_date, NOW()) >= 48)
                ";
                
                $params = [];
                if ($materialName) {
                    $sql .= " AND rm.name = ?";
                    $params[] = $materialName;
                } elseif ($materialId) {
                    $sql .= " AND rm.raw_material_id = ?";
                    $params[] = $materialId;
                }
                
                $sql .= " ORDER BY rmb.received_date ASC, rmb.batch_id ASC"; // FIFO order
                
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Calculate totals
                $totalQuantity = array_sum(array_column($batches, 'current_quantity'));
                
                echo json_encode([
                    'success' => true,
                    'batches' => $batches,
                    'count' => count($batches),
                    'total_quantity' => $totalQuantity,
                    'message' => count($batches) . ' batches available (FIFO order)'
                ]);
                break;
                
            default:
                throw new Exception('Invalid action specified');
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Handle POST requests
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'update_settings':
                // Update raw material reorder level and standard order quantity
                $materialId = $input['raw_material_id'] ?? null;
                $reorderLevel = $input['reorder_level'] ?? null;
                $stdOrderQty = $input['standard_order_quantity'] ?? null;
                
                if (!$materialId) {
                    throw new Exception('Material ID is required');
                }
                
                $updates = [];
                $params = [];
                
                if ($reorderLevel !== null) {
                    $updates[] = "reorder_level = ?";
                    $params[] = floatval($reorderLevel);
                }
                
                if ($stdOrderQty !== null) {
                    $updates[] = "standard_order_quantity = ?";
                    $params[] = floatval($stdOrderQty);
                }
                
                if (empty($updates)) {
                    throw new Exception('No fields to update');
                }
                
                $params[] = $materialId;
                
                $sql = "UPDATE raw_materials SET " . implode(', ', $updates) . " WHERE raw_material_id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Material settings updated successfully'
                ]);
                break;
                
            default:
                throw new Exception('Invalid POST action specified');
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
