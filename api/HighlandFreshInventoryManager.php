<?php
/**
 * Highland Fresh POS System
 * Task 6: Enhanced Inventory Manager
 * 
 * Centralized inventory management service with Highland Fresh dairy-specific features
 * including expiry tracking, cooperative management, and intelligent stock calculations.
 * 
 * @version 1.0
 * @date August 25, 2025
 */

require_once 'DatabaseConfig.php';

class HighlandFreshInventoryManager {
    private $pdo;
    
    public function __construct() {
        $this->pdo = getDBConnection();
    }
    
    /**
     * Get comprehensive stock status with Highland Fresh dairy considerations
     */
    public function getStockStatus($options = []) {
        try {
            $whereConditions = ["p.is_active = 1"];
            $params = [];
            
            // Filter by category if specified
            if (isset($options['category_id'])) {
                $whereConditions[] = "p.category_id = :category_id";
                $params['category_id'] = $options['category_id'];
            }
            
            // Filter by cooperative if specified
            if (isset($options['cooperative'])) {
                $whereConditions[] = "p.milk_source_cooperative = :cooperative";
                $params['cooperative'] = $options['cooperative'];
            }
            
            // Filter by expiry warning days
            $expiryWarningDays = $options['expiry_warning_days'] ?? 7;
            
            $sql = "
                SELECT 
                    p.product_id as id,
                    p.name,
                    p.sku as barcode,
                    p.quantity_on_hand as current_stock,
                    p.quantity_on_hand,
                    p.reorder_level,
                    p.max_stock_level,
                    p.standard_order_quantity,
                    p.cost,
                    p.expiry_date,
                    p.milk_source_cooperative,
                    p.batch_lot_number,
                    p.production_date,
                    p.quality_grade,
                    p.cold_chain_temp_min,
                    p.cold_chain_temp_max,
                    pc.category_name,
                    u.unit_name,
                    -- Stock status calculations
                    CASE 
                        WHEN p.quantity_on_hand <= 0 THEN 'Out of Stock'
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'Low Stock'
                        WHEN p.max_stock_level IS NOT NULL AND p.quantity_on_hand >= p.max_stock_level THEN 'Overstock'
                        ELSE 'Normal'
                    END as stock_status,
                    
                    -- Highland Fresh dairy-specific calculations
                    CASE 
                        WHEN p.expiry_date IS NOT NULL THEN
                            DATEDIFF(p.expiry_date, CURDATE())
                        ELSE NULL
                    END as days_to_expiry,
                    
                    CASE 
                        WHEN p.expiry_date IS NOT NULL AND DATEDIFF(p.expiry_date, CURDATE()) <= $expiryWarningDays THEN 'Expiring Soon'
                        WHEN p.expiry_date IS NOT NULL AND p.expiry_date < CURDATE() THEN 'Expired'
                        WHEN p.production_date IS NOT NULL AND DATEDIFF(CURDATE(), p.production_date) > 30 THEN 'Old Stock'
                        ELSE 'Fresh'
                    END as freshness_status,
                    
                    -- Reorder suggestions
                    CASE 
                        WHEN p.quantity_on_hand <= p.reorder_level THEN
                            GREATEST(p.standard_order_quantity, p.reorder_level * 2, 5.000)
                        ELSE NULL
                    END as suggested_reorder_quantity,
                    
                    -- Highland Fresh priority calculation
                    CASE 
                        WHEN p.quantity_on_hand <= 0 THEN 'Urgent'
                        WHEN p.quantity_on_hand <= p.reorder_level AND p.expiry_date IS NOT NULL 
                             AND DATEDIFF(p.expiry_date, CURDATE()) <= $expiryWarningDays THEN 'High'
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'Medium'
                        WHEN p.expiry_date IS NOT NULL AND DATEDIFF(p.expiry_date, CURDATE()) <= 3 THEN 'High'
                        ELSE 'Low'
                    END as priority_level
                    
                FROM products p
                LEFT JOIN product_categories pc ON p.category_id = pc.category_id
                LEFT JOIN units_of_measure u ON p.unit_id = u.unit_id
                WHERE " . implode(' AND ', $whereConditions) . "
                ORDER BY 
                    FIELD(priority_level, 'Urgent', 'High', 'Medium', 'Low'),
                    p.quantity_on_hand ASC,
                    p.expiry_date ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Add Highland Fresh cooperative information
            foreach ($results as &$product) {
                $product = $this->enhanceWithCooperativeInfo($product);
                $product = $this->calculateInventoryMetrics($product);
            }
            
            return [
                'success' => true,
                'data' => $results,
                'summary' => $this->getStockSummary($results)
            ];
            
        } catch (Exception $e) {
            error_log("Highland Fresh Inventory Manager Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to retrieve stock status',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get low stock alerts with Highland Fresh prioritization
     */
    public function getLowStockAlerts($options = []) {
        try {
            $alertThreshold = $options['threshold_multiplier'] ?? 1.2;
            $expiryWarningDays = $options['expiry_warning_days'] ?? 7;
            
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
                    p.quality_grade,
                    pc.category_name,
                    
                    -- Alert calculations
                    (p.reorder_level * $alertThreshold) as alert_threshold,
                    
                    CASE 
                        WHEN p.quantity_on_hand <= 0 THEN 'Out of Stock'
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'Below Reorder Level'
                        WHEN p.quantity_on_hand <= (p.reorder_level * $alertThreshold) THEN 'Approaching Low Stock'
                        ELSE 'Normal'
                    END as alert_type,
                    
                    CASE 
                        WHEN p.quantity_on_hand <= 0 THEN 'Urgent'
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'High'
                        ELSE 'Medium'
                    END as priority,
                    
                    DATEDIFF(p.expiry_date, CURDATE()) as days_to_expiry,
                    
                    -- Highland Fresh recommended actions
                    CASE 
                        WHEN p.quantity_on_hand <= 0 THEN 'Emergency reorder required'
                        WHEN p.quantity_on_hand <= p.reorder_level AND p.expiry_date IS NOT NULL 
                             AND DATEDIFF(p.expiry_date, CURDATE()) <= $expiryWarningDays THEN 'Urgent: Low stock + expiring soon'
                        WHEN p.quantity_on_hand <= p.reorder_level THEN 'Place reorder now'
                        ELSE 'Monitor closely'
                    END as recommended_action
                    
                FROM products p
                LEFT JOIN product_categories pc ON p.category_id = pc.category_id
                WHERE p.is_active = 1 
                AND p.quantity_on_hand <= (p.reorder_level * $alertThreshold)
                ORDER BY 
                    FIELD(priority, 'Urgent', 'High', 'Medium'),
                    p.quantity_on_hand ASC,
                    p.expiry_date ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            
            $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate suggested production quantities for Highland Fresh products
            foreach ($alerts as &$alert) {
                $alert['suggested_quantity'] = $this->calculateSuggestedQuantity($alert);
                $alert['production_recommendation'] = $this->getProductionRecommendation($alert['product_id']);
            }
            
            return [
                'success' => true,
                'alerts' => $alerts,
                'alert_count' => count($alerts),
                'urgent_count' => count(array_filter($alerts, function($alert) {
                    return $alert['priority'] === 'Urgent';
                }))
            ];
            
        } catch (Exception $e) {
            error_log("Highland Fresh Low Stock Alerts Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to retrieve low stock alerts'
            ];
        }
    }
    
    /**
     * Get expiring products with Highland Fresh dairy focus
     */
    public function getExpiringProducts($warningDays = 7) {
        try {
            $sql = "
                SELECT 
                    p.product_id,
                    p.name,
                    p.sku,
                    p.quantity_on_hand,
                    p.expiry_date,
                    p.production_date,
                    p.milk_source_cooperative,
                    p.batch_lot_number,
                    p.quality_grade,
                    pc.category_name,
                    
                    DATEDIFF(p.expiry_date, CURDATE()) as days_to_expiry,
                    
                    CASE 
                        WHEN p.expiry_date < CURDATE() THEN 'Expired'
                        WHEN DATEDIFF(p.expiry_date, CURDATE()) <= 1 THEN 'Expires Tomorrow'
                        WHEN DATEDIFF(p.expiry_date, CURDATE()) <= 3 THEN 'Expires This Week'
                        ELSE 'Expires Soon'
                    END as expiry_status,
                    
                    -- Highland Fresh recommended actions for dairy products
                    CASE 
                        WHEN p.expiry_date < CURDATE() THEN 'Remove from inventory immediately'
                        WHEN DATEDIFF(p.expiry_date, CURDATE()) <= 1 THEN 'Urgent sale or promotion required'
                        WHEN DATEDIFF(p.expiry_date, CURDATE()) <= 3 THEN 'Consider promotion or quick sale'
                        ELSE 'Monitor and prioritize for sale'
                    END as recommended_action,
                    
                    (p.quantity_on_hand * p.cost) as potential_loss_value
                    
                FROM products p
                LEFT JOIN product_categories pc ON p.category_id = pc.category_id
                WHERE p.is_active = 1 
                AND p.expiry_date IS NOT NULL
                AND DATEDIFF(p.expiry_date, CURDATE()) <= :warning_days
                ORDER BY p.expiry_date ASC, p.quantity_on_hand DESC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(['warning_days' => $warningDays]);
            
            $expiringProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate total potential loss
            $totalPotentialLoss = array_sum(array_column($expiringProducts, 'potential_loss_value'));
            
            return [
                'success' => true,
                'expiring_products' => $expiringProducts,
                'total_items' => count($expiringProducts),
                'total_potential_loss' => $totalPotentialLoss,
                'expired_count' => count(array_filter($expiringProducts, function($product) {
                    return $product['expiry_status'] === 'Expired';
                }))
            ];
            
        } catch (Exception $e) {
            error_log("Highland Fresh Expiring Products Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to retrieve expiring products'
            ];
        }
    }
    
    /**
     * Update product inventory with Highland Fresh business rules
     */
    public function updateInventory($productId, $newQuantity, $reason = 'Manual Update', $userId = 1) {
        try {
            $this->pdo->beginTransaction();
            
            // Get current product info
            $stmt = $this->pdo->prepare("
                SELECT quantity_on_hand, name, cost 
                FROM products 
                WHERE product_id = :product_id AND is_active = 1
            ");
            $stmt->execute(['product_id' => $productId]);
            $currentProduct = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$currentProduct) {
                throw new Exception("Product not found or inactive");
            }
            
            $oldQuantity = $currentProduct['quantity_on_hand'];
            $quantityChange = $newQuantity - $oldQuantity;
            
            // Update product quantity
            $stmt = $this->pdo->prepare("
                UPDATE products 
                SET quantity_on_hand = :new_quantity,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = :product_id
            ");
            
            $stmt->execute([
                'new_quantity' => $newQuantity,
                'product_id' => $productId
            ]);
            
            // Log the inventory adjustment
            $this->logInventoryAdjustment(
                $productId,
                'Manual',
                $quantityChange,
                $reason,
                $userId
            );
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => 'Inventory updated successfully',
                'old_quantity' => $oldQuantity,
                'new_quantity' => $newQuantity,
                'change' => $quantityChange
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Highland Fresh Inventory Update Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to update inventory: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Enhance product data with Highland Fresh cooperative information
     */
    private function enhanceWithCooperativeInfo($product) {
        if ($product['milk_source_cooperative']) {
            try {
                $stmt = $this->pdo->prepare("
                    SELECT 
                        s.name as cooperative_name,
                        s.address as location,
                        c.city_name as region,
                        s.contact_person,
                        s.phone_number,
                        s.is_active,
                        s.daily_milk_capacity_liters,
                        s.cattle_breeds,
                        s.specialization
                    FROM suppliers s
                    LEFT JOIN cities c ON s.city_id = c.city_id
                    WHERE s.name = :cooperative_name 
                    AND s.supplier_type = 'Dairy Cooperative'
                ");
                $stmt->execute(['cooperative_name' => $product['milk_source_cooperative']]);
                $cooperative = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($cooperative) {
                    $product['cooperative_info'] = $cooperative;
                }
            } catch (Exception $e) {
                // Cooperative info not critical, continue without it
                error_log("Cooperative info lookup error: " . $e->getMessage());
            }
        }
        
        return $product;
    }
    
    /**
     * Calculate additional inventory metrics
     */
    private function calculateInventoryMetrics($product) {
        // Calculate inventory value
        $product['inventory_value'] = $product['quantity_on_hand'] * ($product['cost'] ?? 0);
        
        // Calculate stock coverage (days of inventory based on average usage)
        // This would require sales data analysis - placeholder for now
        $product['estimated_days_coverage'] = $product['quantity_on_hand'] > 0 ? 
            max(1, $product['quantity_on_hand'] / max(0.1, $product['reorder_level'] / 7)) : 0;
        
        // Highland Fresh quality indicator
        if ($product['quality_grade']) {
            $product['quality_score'] = [
                'Premium' => 3,
                'Standard' => 2,
                'Economy' => 1
            ][$product['quality_grade']] ?? 2;
        }
        
        return $product;
    }
    
    /**
     * Get stock summary statistics
     */
    private function getStockSummary($products) {
        $summary = [
            'total_products' => count($products),
            'out_of_stock' => 0,
            'low_stock' => 0,
            'normal_stock' => 0,
            'overstock' => 0,
            'expiring_soon' => 0,
            'expired' => 0,
            'total_value' => 0,
            'urgent_items' => 0
        ];
        
        foreach ($products as $product) {
            // Stock status counts
            switch ($product['stock_status']) {
                case 'Out of Stock':
                    $summary['out_of_stock']++;
                    break;
                case 'Low Stock':
                    $summary['low_stock']++;
                    break;
                case 'Normal':
                    $summary['normal_stock']++;
                    break;
                case 'Overstock':
                    $summary['overstock']++;
                    break;
            }
            
            // Freshness status counts
            if ($product['freshness_status'] === 'Expiring Soon') {
                $summary['expiring_soon']++;
            } elseif ($product['freshness_status'] === 'Expired') {
                $summary['expired']++;
            }
            
            // Priority counts
            if ($product['priority_level'] === 'Urgent') {
                $summary['urgent_items']++;
            }
            
            // Total value
            $summary['total_value'] += $product['inventory_value'] ?? 0;
        }
        
        return $summary;
    }
    
    /**
     * Get production recommendation for a product
     */
    private function getProductionRecommendation($productId) {
        try {
            // Check if product has a production recipe
            $stmt = $this->pdo->prepare("
                SELECT 
                    pr.recipe_id,
                    pr.recipe_name,
                    pr.yield_quantity,
                    pr.yield_unit_id,
                    u.unit_name,
                    pr.batch_time_hours,
                    COUNT(rrm.raw_material_id) as raw_materials_count
                FROM production_recipes pr
                LEFT JOIN units_of_measure u ON pr.yield_unit_id = u.unit_id
                LEFT JOIN recipe_raw_materials rrm ON pr.recipe_id = rrm.recipe_id
                WHERE pr.product_id = :product_id 
                AND pr.is_active = 1
                GROUP BY pr.recipe_id
                LIMIT 1
            ");
            $stmt->execute(['product_id' => $productId]);
            $recipe = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$recipe) {
                return [
                    'can_produce' => false,
                    'reason' => 'No active production recipe found'
                ];
            }
            
            // Check if raw materials are available
            $rawMaterialsStmt = $this->pdo->prepare("
                SELECT 
                    rm.name as raw_material_name,
                    rrm.quantity_required,
                    rrm.unit_id,
                    u.unit_name,
                    COALESCE(rm.quantity_on_hand, 0) as available_quantity,
                    CASE 
                        WHEN COALESCE(rm.quantity_on_hand, 0) >= rrm.quantity_required THEN 1
                        ELSE 0
                    END as is_available
                FROM recipe_raw_materials rrm
                JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
                LEFT JOIN units_of_measure u ON rrm.unit_id = u.unit_id
                WHERE rrm.recipe_id = :recipe_id
            ");
            $rawMaterialsStmt->execute(['recipe_id' => $recipe['recipe_id']]);
            $rawMaterials = $rawMaterialsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $allAvailable = true;
            $missingMaterials = [];
            
            foreach ($rawMaterials as $material) {
                if (!$material['is_available']) {
                    $allAvailable = false;
                    $missingMaterials[] = $material['raw_material_name'];
                }
            }
            
            return [
                'can_produce' => $allAvailable,
                'recipe_name' => $recipe['recipe_name'],
                'yield_quantity' => $recipe['yield_quantity'],
                'yield_unit' => $recipe['unit_name'],
                'batch_time_hours' => $recipe['batch_time_hours'],
                'raw_materials_needed' => count($rawMaterials),
                'missing_materials' => $missingMaterials,
                'recommendation' => $allAvailable 
                    ? 'Ready to produce - all raw materials available' 
                    : 'Cannot produce - missing: ' . implode(', ', $missingMaterials)
            ];
            
        } catch (Exception $e) {
            error_log("Production recommendation error: " . $e->getMessage());
            return [
                'can_produce' => false,
                'reason' => 'Error checking production requirements'
            ];
        }
    }
    
    /**
     * Calculate suggested reorder quantity
     */
    private function calculateSuggestedQuantity($product) {
        $baseQuantity = $product['standard_order_quantity'] ?? $product['reorder_level'] * 2;
        
        // Highland Fresh adjustments based on expiry and priority
        if ($product['priority'] === 'Urgent') {
            return max($baseQuantity, 10.000);
        } elseif ($product['days_to_expiry'] !== null && $product['days_to_expiry'] <= 7) {
            // For expiring products, suggest smaller quantities
            return max($baseQuantity * 0.7, 5.000);
        }
        
        return max($baseQuantity, 5.000);
    }
    
    /**
     * Log inventory adjustment
     */
    private function logInventoryAdjustment($productId, $adjustmentType, $quantityChange, $reason, $userId) {
        try {
            // Check if inventory_adjustments table exists, create if not
            $this->createInventoryAdjustmentsTable();
            
            $stmt = $this->pdo->prepare("
                INSERT INTO inventory_adjustments 
                (product_id, adjustment_type, quantity_change, reason, user_id, created_at)
                VALUES (:product_id, :adjustment_type, :quantity_change, :reason, :user_id, NOW())
            ");
            
            $stmt->execute([
                'product_id' => $productId,
                'adjustment_type' => $adjustmentType,
                'quantity_change' => $quantityChange,
                'reason' => $reason,
                'user_id' => $userId
            ]);
            
        } catch (Exception $e) {
            error_log("Inventory adjustment logging error: " . $e->getMessage());
            // Don't throw - logging failure shouldn't break inventory update
        }
    }
    
    /**
     * Create inventory adjustments table if it doesn't exist
     */
    private function createInventoryAdjustmentsTable() {
        try {
            $sql = "
                CREATE TABLE IF NOT EXISTS inventory_adjustments (
                    adjustment_id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    adjustment_type ENUM('Manual','Sale','Return','Purchase','Damage','Expiry','Theft','Count') NOT NULL,
                    quantity_change DECIMAL(10,3) NOT NULL,
                    reason VARCHAR(255),
                    user_id INT NOT NULL,
                    batch_lot_number VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_product_date (product_id, created_at),
                    INDEX idx_adjustment_type (adjustment_type),
                    FOREIGN KEY (product_id) REFERENCES products(product_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
            
            $this->pdo->exec($sql);
            
        } catch (Exception $e) {
            error_log("Error creating inventory_adjustments table: " . $e->getMessage());
        }
    }
}
