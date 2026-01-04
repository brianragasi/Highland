<?php
/**
 * Highland Fresh POS System
 * Enhanced Inventory API with Highland Fresh dairy-specific features
 * 
 * Provides inventory management endpoints with intelligent stock tracking,
 * expiry management, and Highland Fresh cooperative integration.
 * 
 * @version 1.0
 * @date August 25, 2025
 */

require_once 'BaseAPI.php';
require_once 'HighlandFreshAuth.php';
require_once 'HighlandFreshInventoryManager.php';

class InventoryAPI extends BaseAPI {
    private $inventoryManager;
    
    public function __construct() {
        parent::__construct(['methods' => 'GET, POST, OPTIONS']);
        $this->inventoryManager = new HighlandFreshInventoryManager();
    }
    
    public function route(): void
    {
        // Initialize session
        $this->initializeSession();
        
        // Initialize Highland Fresh Auth if session is active
        if (session_status() === PHP_SESSION_ACTIVE) {
            HighlandFreshAuth::init();
        }

        $operation = $this->getOperation() ?: 'getStockStatus';
        
        $this->handle(function () use ($operation) {
            switch ($operation) {
                case 'getStockStatus':
                    $this->getStockStatus();
                    break;
                    
                case 'getLowStockAlerts':
                    $this->getLowStockAlerts();
                    break;
                    
                case 'getExpiringProducts':
                    $this->getExpiringProducts();
                    break;
                    
                case 'updateInventory':
                    $this->updateInventory();
                    break;
                    
                case 'bulkUpdateInventory':
                    $this->bulkUpdateInventory();
                    break;
                    
                case 'getInventoryHistory':
                    $this->getInventoryHistory();
                    break;
                    
                case 'getCooperativeInventory':
                    $this->getCooperativeInventory();
                    break;
                    
                case 'getInventoryForecast':
                    $this->getInventoryForecast();
                    break;
                    
                case 'getReorderSuggestions':
                    $this->getReorderSuggestions();
                    break;
                    
                default:
                    $this->respondError('Invalid operation', 400, ['operation' => $operation]);
            }
        });
    }
    
    /**
     * Get comprehensive stock status
     */
    private function getStockStatus() {
        $options = [];
        
        // Parse filters
        if (isset($_GET['category_id'])) {
            $options['category_id'] = intval($_GET['category_id']);
        }
        
        if (isset($_GET['cooperative'])) {
            $options['cooperative'] = $_GET['cooperative'];
        }
        
        if (isset($_GET['expiry_warning_days'])) {
            $options['expiry_warning_days'] = intval($_GET['expiry_warning_days']);
        }
        
        $result = $this->inventoryManager->getStockStatus($options);
        
        if ($result['success']) {
            $this->respond($result);
        } else {
            $this->respondError($result['message'] ?? 'Failed to get stock status', 500, $result);
        }
    }
    
    /**
     * Get low stock alerts
     */
    private function getLowStockAlerts() {
        $options = [];
        
        if (isset($_GET['threshold_multiplier'])) {
            $options['threshold_multiplier'] = floatval($_GET['threshold_multiplier']);
        }
        
        if (isset($_GET['expiry_warning_days'])) {
            $options['expiry_warning_days'] = intval($_GET['expiry_warning_days']);
        }
        
        $result = $this->inventoryManager->getLowStockAlerts($options);
        
        $this->respond($result);
    }
    
    /**
     * Get expiring products
     */
    private function getExpiringProducts() {
        $warningDays = isset($_GET['warning_days']) ? intval($_GET['warning_days']) : 7;
        
        $result = $this->inventoryManager->getExpiringProducts($warningDays);
        
        $this->respond($result);
    }
    
    /**
     * Update single product inventory
     */
    private function updateInventory() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'POST method required'
            ]);
            return;
        }
        
    // Check inventory management permission
    // Allow Admin and Warehouse Staff to perform inventory updates
    if (!$this->auth->hasRole(['Admin', 'Warehouse Staff'])) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Insufficient permissions for inventory updates'
            ]);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $productId = $data['product_id'] ?? null;
        $newQuantity = $data['quantity'] ?? null;
        $reason = $data['reason'] ?? 'Manual Update';
        
        if ($productId === null || $newQuantity === null) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Product ID and quantity are required'
            ]);
            return;
        }
        
        $userId = $this->auth->getCurrentUserId();
        $result = $this->inventoryManager->updateInventory($productId, $newQuantity, $reason, $userId);
        
        if ($result['success']) {
            echo json_encode($result);
        } else {
            http_response_code(500);
            echo json_encode($result);
        }
    }
    
    /**
     * Bulk update multiple products inventory
     */
    private function bulkUpdateInventory() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'POST method required'
            ]);
            return;
        }
        
    // Check inventory management permission
    // Allow Admin and Warehouse Staff to perform bulk inventory updates
    if (!$this->auth->hasRole(['Admin', 'Warehouse Staff'])) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Insufficient permissions for inventory updates'
            ]);
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $updates = $data['updates'] ?? [];
        $reason = $data['reason'] ?? 'Bulk Update';
        
        if (empty($updates)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'No updates provided'
            ]);
            return;
        }
        
        $userId = $this->auth->getCurrentUserId();
        $results = [];
        $successCount = 0;
        $errorCount = 0;
        
        foreach ($updates as $update) {
            $productId = $update['product_id'] ?? null;
            $newQuantity = $update['quantity'] ?? null;
            
            if ($productId && $newQuantity !== null) {
                $result = $this->inventoryManager->updateInventory($productId, $newQuantity, $reason, $userId);
                
                if ($result['success']) {
                    $successCount++;
                } else {
                    $errorCount++;
                }
                
                $results[] = [
                    'product_id' => $productId,
                    'success' => $result['success'],
                    'message' => $result['message'] ?? ''
                ];
            } else {
                $errorCount++;
                $results[] = [
                    'product_id' => $productId,
                    'success' => false,
                    'message' => 'Invalid product ID or quantity'
                ];
            }
        }
        
        echo json_encode([
            'success' => $errorCount === 0,
            'message' => "Bulk update completed: {$successCount} successful, {$errorCount} failed",
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'results' => $results
        ]);
    }
    
    /**
     * Get inventory adjustment history
     */
    private function getInventoryHistory() {
        try {
            require_once 'DatabaseConfig.php';
            $pdo = getDBConnection();
            
            $productId = $_GET['product_id'] ?? null;
            $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
            
            $whereClause = '';
            $params = [];
            
            if ($productId) {
                $whereClause = 'WHERE ia.product_id = :product_id';
                $params['product_id'] = $productId;
            }
            
            $sql = "
                SELECT 
                    ia.adjustment_id,
                    ia.product_id,
                    p.name as product_name,
                    p.sku,
                    ia.adjustment_type,
                    ia.quantity_change,
                    ia.reason,
                    ia.batch_lot_number,
                    ia.created_at,
                    u.username as adjusted_by
                FROM inventory_adjustments ia
                LEFT JOIN products p ON ia.product_id = p.product_id
                LEFT JOIN users u ON ia.user_id = u.user_id
                {$whereClause}
                ORDER BY ia.created_at DESC
                LIMIT :limit
            ";
            
            $stmt = $pdo->prepare($sql);
            $params['limit'] = $limit;
            $stmt->execute($params);
            
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'history' => $history,
                'count' => count($history)
            ]);
            
        } catch (Exception $e) {
            error_log("Inventory history error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to retrieve inventory history'
            ]);
        }
    }
    
    /**
     * Get inventory by Highland Fresh cooperative
     */
    private function getCooperativeInventory() {
        $cooperative = $_GET['cooperative'] ?? null;
        
        if (!$cooperative) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Cooperative name is required'
            ]);
            return;
        }
        
        $result = $this->inventoryManager->getStockStatus(['cooperative' => $cooperative]);
        
        if ($result['success']) {
            // Add cooperative-specific analytics
            $cooperativeData = $result['data'];
            $totalValue = array_sum(array_column($cooperativeData, 'inventory_value'));
            $avgQuality = $this->calculateAverageQualityScore($cooperativeData);
            
            $result['cooperative_analytics'] = [
                'cooperative_name' => $cooperative,
                'total_products' => count($cooperativeData),
                'total_inventory_value' => $totalValue,
                'average_quality_score' => $avgQuality,
                'products_expiring_soon' => count(array_filter($cooperativeData, function($p) {
                    return $p['freshness_status'] === 'Expiring Soon';
                }))
            ];
        }
        
        echo json_encode($result);
    }
    
    /**
     * Get inventory forecast (basic implementation)
     */
    private function getInventoryForecast() {
        try {
            require_once 'DatabaseConfig.php';
            $pdo = getDBConnection();
            
            $days = isset($_GET['days']) ? intval($_GET['days']) : 30;
            
            // Basic forecast based on current stock levels and reorder patterns
            $sql = "
                SELECT 
                    p.product_id,
                    p.name,
                    p.sku,
                    p.quantity_on_hand,
                    p.reorder_level,
                    p.standard_order_quantity,
                    p.expiry_date,
                    pc.category_name,
                    
                    -- Simple forecast calculations
                    CASE 
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'Immediate Reorder Needed'
                        WHEN p.quantity_on_hand <= (p.reorder_level * 1.5) THEN 'Reorder Within Week'
                        WHEN p.quantity_on_hand <= (p.reorder_level * 2) THEN 'Reorder Within Month'
                        ELSE 'Stock Sufficient'
                    END as forecast_status,
                    
                    GREATEST(0, CEIL((p.reorder_level - p.quantity_on_hand) / GREATEST(1, p.reorder_level / 7))) as estimated_stockout_days,
                    
                    p.standard_order_quantity as suggested_order_quantity
                    
                FROM products p
                LEFT JOIN product_categories pc ON p.category_id = pc.category_id
                WHERE p.is_active = 1
                AND (p.quantity_on_hand <= p.reorder_level * 2 OR p.expiry_date IS NOT NULL)
                ORDER BY estimated_stockout_days ASC, p.quantity_on_hand ASC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            
            $forecast = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'forecast' => $forecast,
                'forecast_period_days' => $days,
                'immediate_reorders' => count(array_filter($forecast, function($f) {
                    return $f['forecast_status'] === 'Immediate Reorder Needed';
                }))
            ]);
            
        } catch (Exception $e) {
            error_log("Inventory forecast error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to generate forecast'
            ]);
        }
    }
    
    /**
     * Get automated reorder suggestions
     */
    private function getReorderSuggestions() {
        try {
            require_once 'DatabaseConfig.php';
            $pdo = getDBConnection();
            
            $sql = "
                SELECT 
                    p.product_id,
                    p.name,
                    p.sku,
                    p.quantity_on_hand,
                    p.reorder_level,
                    p.standard_order_quantity,
                    p.expiry_date,
                    p.milk_source_cooperative,
                    pc.category_name,
                    
                    -- Suggestion calculations
                    GREATEST(p.standard_order_quantity, p.reorder_level * 2, 5.000) as suggested_quantity,
                    
                    CASE 
                        WHEN p.quantity_on_hand <= 0 THEN 'Urgent'
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'High'
                        WHEN p.quantity_on_hand <= (p.reorder_level * 1.2) THEN 'Medium'
                        ELSE 'Low'
                    END as priority,
                    
                    CASE 
                        WHEN p.quantity_on_hand <= 0 THEN 'Out of stock - emergency order required'
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'Below reorder level'
                        ELSE 'Proactive reorder recommendation'
                    END as reason,
                    
                    DATEDIFF(p.expiry_date, CURDATE()) as days_to_expiry
                    
                FROM products p
                LEFT JOIN product_categories pc ON p.category_id = pc.category_id
                WHERE p.is_active = 1 
                AND p.quantity_on_hand <= (p.reorder_level * 1.2)
                ORDER BY 
                    FIELD(priority, 'Urgent', 'High', 'Medium', 'Low'),
                    p.quantity_on_hand ASC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            
            $suggestions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Enhance with production recommendations
            foreach ($suggestions as &$suggestion) {
                $suggestion['production_info'] = $this->getProductionInfo($suggestion['product_id']);
            }
            
            $this->respond([
                'success' => true,
                'suggestions' => $suggestions,
                'total_suggestions' => count($suggestions),
                'urgent_suggestions' => count(array_filter($suggestions, function($s) {
                    return $s['priority'] === 'Urgent';
                }))
            ]);
            
        } catch (Exception $e) {
            error_log("Reorder suggestions error: " . $e->getMessage());
            $this->respondError('Failed to generate reorder suggestions', 500);
        }
    }
    
    /**
     * Calculate average quality score for cooperative products
     */
    private function calculateAverageQualityScore($products) {
        if (empty($products)) return 0;
        
        $totalScore = 0;
        $count = 0;
        
        foreach ($products as $product) {
            if (isset($product['quality_score'])) {
                $totalScore += $product['quality_score'];
                $count++;
            }
        }
        
        return $count > 0 ? round($totalScore / $count, 2) : 0;
    }
    
    /**
     * Get suggested suppliers for a product
     */
    /**
     * Get production info for a product
     */
    private function getProductionInfo($productId) {
        try {
            require_once 'DatabaseConfig.php';
            $pdo = getDBConnection();
            
            $stmt = $pdo->prepare("
                SELECT 
                    pr.recipe_id,
                    pr.recipe_name,
                    pr.yield_quantity,
                    u.unit_name as yield_unit
                FROM production_recipes pr
                LEFT JOIN units_of_measure u ON pr.yield_unit_id = u.unit_id
                WHERE pr.product_id = :product_id 
                AND pr.is_active = 1
                LIMIT 1
            ");
            $stmt->execute(['product_id' => $productId]);
            $recipe = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($recipe) {
                return [
                    'has_recipe' => true,
                    'recipe_name' => $recipe['recipe_name'],
                    'yield' => $recipe['yield_quantity'] . ' ' . $recipe['yield_unit']
                ];
            }
            
            return [
                'has_recipe' => false,
                'note' => 'No production recipe configured'
            ];
            
        } catch (Exception $e) {
            error_log("Production info error: " . $e->getMessage());
            return [
                'has_recipe' => false,
                'error' => 'Unable to retrieve production info'
            ];
        }
    }
}

// Handle the request
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'InventoryAPI.php') {
    $api = new InventoryAPI();
    $api->route();
}
