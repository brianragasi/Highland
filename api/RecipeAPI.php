<?php
/**
 * RecipeAPI.php - Master Recipe Management for Finance Officer
 * 
 * Handles:
 * - Get all recipes with ingredients
 * - Get single recipe details
 * - Update ingredient ratios
 * - Add/remove ingredients
 * - Calculate estimated costs
 */

require_once 'BaseAPI.php';

class RecipeAPI extends BaseAPI {
    
    public function __construct() {
        parent::__construct();
    }
    
    /**
     * Route API requests
     */
    public function handleRequest() {
        $action = $_GET['action'] ?? $_POST['action'] ?? '';
        
        // If no action found, check JSON body
        if (empty($action)) {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
            if ($data && isset($data['action'])) {
                $action = $data['action'];
            }
        }
        
        switch ($action) {
            case 'get_recipes':
                $this->getRecipes();
                break;
            case 'get_recipe_details':
                $this->getRecipeDetails();
                break;
            case 'update_ingredient':
                $this->updateIngredient();
                break;
            case 'add_ingredient':
                $this->addIngredient();
                break;
            case 'remove_ingredient':
                $this->removeIngredient();
                break;
            case 'get_available_materials':
                $this->getAvailableMaterials();
                break;
            case 'get_material_prices':
                $this->getMaterialPrices();
                break;
            case 'getProductsUsingMaterial':
                $this->getProductsUsingMaterial();
                break;
            default:
                $this->respondError('Invalid action', 400);
        }
    }
    
    /**
     * Get all recipes with summary info
     */
    private function getRecipes() {
        try {
            $sql = "
                SELECT 
                    r.recipe_id,
                    r.recipe_name,
                    r.batch_size_yield,
                    r.production_time_hours,
                    r.difficulty_level,
                    r.is_active,
                    r.finished_product_id,
                    p.name as product_name,
                    p.price as selling_price,
                    (
                        SELECT GROUP_CONCAT(
                            CONCAT(rm.name, ': ', rrm.quantity_required)
                            SEPARATOR ', '
                        )
                        FROM recipe_raw_materials rrm
                        JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
                        WHERE rrm.recipe_id = r.recipe_id
                    ) as ingredients_summary,
                    (
                        SELECT COUNT(*) 
                        FROM recipe_raw_materials 
                        WHERE recipe_id = r.recipe_id
                    ) as ingredient_count
                FROM production_recipes r
                LEFT JOIN products p ON r.finished_product_id = p.product_id
                WHERE r.is_active = 1
                ORDER BY r.recipe_id
            ";
            
            $stmt = $this->db()->query($sql);
            $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate estimated cost for each recipe
            foreach ($recipes as &$recipe) {
                $recipe['estimated_cost'] = $this->calculateRecipeCost($recipe['recipe_id']);
                $recipe['margin'] = $recipe['selling_price'] - $recipe['estimated_cost'];
                $recipe['margin_percent'] = $recipe['selling_price'] > 0 
                    ? round(($recipe['margin'] / $recipe['selling_price']) * 100, 1)
                    : 0;
            }
            
            $this->respondSuccess($recipes);
            
        } catch (PDOException $e) {
            error_log("RecipeAPI::getRecipes Error: " . $e->getMessage());
            $this->respondError('Failed to fetch recipes: ' . $e->getMessage());
        }
    }
    
    /**
     * Get single recipe with full ingredient details
     */
    private function getRecipeDetails() {
        $recipeId = $_GET['recipe_id'] ?? null;
        
        if (!$recipeId) {
            $this->respondError('Recipe ID required', 400);
            return;
        }
        
        try {
            // Get recipe info
            $stmt = $this->db()->prepare("
                SELECT 
                    r.*,
                    p.name as product_name,
                    p.price as selling_price
                FROM production_recipes r
                LEFT JOIN products p ON r.finished_product_id = p.product_id
                WHERE r.recipe_id = ?
            ");
            $stmt->execute([$recipeId]);
            $recipe = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$recipe) {
                $this->respondError('Recipe not found', 404);
                return;
            }
            
            // Get ingredients with current prices
            $stmt = $this->db()->prepare("
                SELECT 
                    rrm.id as ingredient_id,
                    rrm.recipe_id,
                    rrm.raw_material_id,
                    rrm.quantity_required as ratio,
                    rrm.processing_notes,
                    rrm.is_critical,
                    rm.name as material_name,
                    u.unit_name as unit,
                    (
                        SELECT COALESCE(unit_cost, 0) 
                        FROM raw_material_batches 
                        WHERE raw_material_id = rm.raw_material_id 
                        ORDER BY received_date DESC 
                        LIMIT 1
                    ) as current_price
                FROM recipe_raw_materials rrm
                JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
                LEFT JOIN units_of_measure u ON rm.unit_id = u.unit_id
                WHERE rrm.recipe_id = ?
                ORDER BY rm.name
            ");
            $stmt->execute([$recipeId]);
            $ingredients = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate costs
            $totalCost = 0;
            foreach ($ingredients as &$ing) {
                $ing['cost_per_unit'] = $ing['ratio'] * $ing['current_price'];
                $totalCost += $ing['cost_per_unit'];
            }
            
            $recipe['ingredients'] = $ingredients;
            $recipe['total_material_cost'] = $totalCost;
            $recipe['margin'] = $recipe['selling_price'] - $totalCost;
            $recipe['margin_percent'] = $recipe['selling_price'] > 0 
                ? round(($recipe['margin'] / $recipe['selling_price']) * 100, 1)
                : 0;
            
            $this->respondSuccess($recipe);
            
        } catch (PDOException $e) {
            error_log("RecipeAPI::getRecipeDetails Error: " . $e->getMessage());
            $this->respondError('Failed to fetch recipe details: ' . $e->getMessage());
        }
    }
    
    /**
     * Update an ingredient's ratio
     */
    private function updateIngredient() {
        $this->requireMethod('POST');
        
        $data = json_decode(file_get_contents('php://input'), true);
        $ingredientId = $data['ingredient_id'] ?? null;
        $newRatio = $data['ratio'] ?? null;
        $notes = $data['notes'] ?? null;
        
        if (!$ingredientId || $newRatio === null || $newRatio <= 0) {
            $this->respondError('Valid ingredient ID and ratio required', 400);
            return;
        }
        
        try {
            $sql = "UPDATE recipe_raw_materials SET quantity_required = ?";
            $params = [$newRatio];
            
            if ($notes !== null) {
                $sql .= ", processing_notes = ?";
                $params[] = $notes;
            }
            
            $sql .= " WHERE id = ?";
            $params[] = $ingredientId;
            
            $stmt = $this->db()->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                $this->respondError('Ingredient not found', 404);
                return;
            }
            
            $this->respondSuccess(['message' => 'Ratio updated successfully']);
            
        } catch (PDOException $e) {
            error_log("RecipeAPI::updateIngredient Error: " . $e->getMessage());
            $this->respondError('Failed to update ingredient: ' . $e->getMessage());
        }
    }
    
    /**
     * Add new ingredient to recipe
     */
    private function addIngredient() {
        $this->requireMethod('POST');
        
        $data = json_decode(file_get_contents('php://input'), true);
        $recipeId = $data['recipe_id'] ?? null;
        $materialId = $data['raw_material_id'] ?? null;
        $ratio = $data['ratio'] ?? null;
        $notes = $data['notes'] ?? '';
        $isCritical = $data['is_critical'] ?? 0;
        
        if (!$recipeId || !$materialId || $ratio === null || $ratio <= 0) {
            $this->respondError('Recipe ID, material ID, and valid ratio required', 400);
            return;
        }
        
        try {
            // Check if ingredient already exists
            $check = $this->db()->prepare("
                SELECT id FROM recipe_raw_materials 
                WHERE recipe_id = ? AND raw_material_id = ?
            ");
            $check->execute([$recipeId, $materialId]);
            
            if ($check->fetch()) {
                $this->respondError('This ingredient already exists in the recipe', 400);
                return;
            }
            
            $stmt = $this->db()->prepare("
                INSERT INTO recipe_raw_materials 
                (recipe_id, raw_material_id, quantity_required, processing_notes, is_critical)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$recipeId, $materialId, $ratio, $notes, $isCritical]);
            
            $this->respondSuccess([
                'message' => 'Ingredient added successfully',
                'ingredient_id' => $this->db()->lastInsertId()
            ]);
            
        } catch (PDOException $e) {
            error_log("RecipeAPI::addIngredient Error: " . $e->getMessage());
            $this->respondError('Failed to add ingredient: ' . $e->getMessage());
        }
    }
    
    /**
     * Remove ingredient from recipe
     */
    private function removeIngredient() {
        $this->requireMethod('POST');
        
        $data = json_decode(file_get_contents('php://input'), true);
        $ingredientId = $data['ingredient_id'] ?? null;
        
        if (!$ingredientId) {
            $this->respondError('Ingredient ID required', 400);
            return;
        }
        
        try {
            $stmt = $this->db()->prepare("DELETE FROM recipe_raw_materials WHERE id = ?");
            $stmt->execute([$ingredientId]);
            
            if ($stmt->rowCount() === 0) {
                $this->respondError('Ingredient not found', 404);
                return;
            }
            
            $this->respondSuccess(['message' => 'Ingredient removed successfully']);
            
        } catch (PDOException $e) {
            error_log("RecipeAPI::removeIngredient Error: " . $e->getMessage());
            $this->respondError('Failed to remove ingredient: ' . $e->getMessage());
        }
    }
    
    /**
     * Get available raw materials for adding to recipes
     */
    private function getAvailableMaterials() {
        try {
            $stmt = $this->db()->query("
                SELECT 
                    rm.raw_material_id,
                    rm.name,
                    u.unit_name as unit,
                    (
                        SELECT COALESCE(unit_cost, 0) 
                        FROM raw_material_batches 
                        WHERE raw_material_id = rm.raw_material_id 
                        ORDER BY received_date DESC 
                        LIMIT 1
                    ) as current_price
                FROM raw_materials rm
                LEFT JOIN units_of_measure u ON rm.unit_id = u.unit_id
                WHERE rm.is_active = 1
                ORDER BY rm.name
            ");
            
            $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess($materials);
            
        } catch (PDOException $e) {
            error_log("RecipeAPI::getAvailableMaterials Error: " . $e->getMessage());
            $this->respondError('Failed to fetch materials: ' . $e->getMessage());
        }
    }
    
    /**
     * Get current prices of all materials (for display)
     * Uses FIFO: Price from oldest batch that still has stock
     */
    private function getMaterialPrices() {
        try {
            // FIFO: Get price from the oldest batch that still has stock (current_quantity > 0)
            // If no stock, fall back to the most recent batch price
            $stmt = $this->db()->query("
                SELECT 
                    rm.raw_material_id,
                    rm.name,
                    u.unit_name as unit,
                    COALESCE(fifo.unit_cost, latest.unit_cost) as current_price,
                    COALESCE(fifo.received_date, latest.received_date) as last_updated
                FROM raw_materials rm
                LEFT JOIN units_of_measure u ON rm.unit_id = u.unit_id
                -- FIFO: Oldest batch with stock > 0 and valid price
                LEFT JOIN (
                    SELECT raw_material_id, unit_cost, received_date,
                           ROW_NUMBER() OVER (PARTITION BY raw_material_id ORDER BY received_date ASC, batch_id ASC) as rn
                    FROM raw_material_batches
                    WHERE unit_cost > 0 AND current_quantity > 0
                ) fifo ON rm.raw_material_id = fifo.raw_material_id AND fifo.rn = 1
                -- Fallback: Latest batch if no stock available
                LEFT JOIN (
                    SELECT raw_material_id, unit_cost, received_date,
                           ROW_NUMBER() OVER (PARTITION BY raw_material_id ORDER BY received_date DESC) as rn
                    FROM raw_material_batches
                    WHERE unit_cost > 0
                ) latest ON rm.raw_material_id = latest.raw_material_id AND latest.rn = 1
                WHERE rm.is_active = 1
                ORDER BY rm.name
            ");
            
            $prices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess($prices);
            
        } catch (PDOException $e) {
            error_log("RecipeAPI::getMaterialPrices Error: " . $e->getMessage());
            $this->respondError('Failed to fetch material prices: ' . $e->getMessage());
        }
    }
    
    /**
     * Calculate total material cost for a recipe
     * Uses FIFO: Price from oldest batch that still has stock
     */
    private function calculateRecipeCost($recipeId) {
        $stmt = $this->db()->prepare("
            SELECT 
                rrm.quantity_required,
                COALESCE(
                    -- FIFO: Oldest batch with stock
                    (SELECT unit_cost 
                     FROM raw_material_batches 
                     WHERE raw_material_id = rrm.raw_material_id 
                       AND unit_cost > 0 
                       AND current_quantity > 0
                     ORDER BY received_date ASC, batch_id ASC 
                     LIMIT 1),
                    -- Fallback: Latest batch if no stock
                    (SELECT unit_cost 
                     FROM raw_material_batches 
                     WHERE raw_material_id = rrm.raw_material_id 
                       AND unit_cost > 0
                     ORDER BY received_date DESC 
                     LIMIT 1),
                    0
                ) as price
            FROM recipe_raw_materials rrm
            WHERE rrm.recipe_id = ?
        ");
        $stmt->execute([$recipeId]);
        $ingredients = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $total = 0;
        foreach ($ingredients as $ing) {
            $total += $ing['quantity_required'] * $ing['price'];
        }
        
        return round($total, 2);
    }
    
    /**
     * Require POST method
     */
    private function requireMethod($method) {
        if ($_SERVER['REQUEST_METHOD'] !== $method) {
            $this->respondError("Method $method required", 405);
            exit;
        }
    }

    /**
     * Get all products/recipes that use a specific raw material
     * Used for Cost Alert "View Affected Products" feature
     */
    private function getProductsUsingMaterial() {
        try {
            $rawMaterialId = $_GET['raw_material_id'] ?? null;
            
            if (!$rawMaterialId) {
                $this->respondError('raw_material_id is required', 400);
                return;
            }

            // Get material name and unit
            $stmt = $this->db()->prepare("
                SELECT rm.name, rm.standard_cost, COALESCE(uom.unit_name, 'units') as unit_name
                FROM raw_materials rm
                LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                WHERE rm.raw_material_id = ?
            ");
            $stmt->execute([$rawMaterialId]);
            $material = $stmt->fetch(PDO::FETCH_ASSOC);
            $materialName = $material['name'] ?? 'Unknown Material';
            $materialUnit = $material['unit_name'] ?? 'units';

            // Get ALL batches with stock for this material (for transparency)
            $stmt = $this->db()->prepare("
                SELECT 
                    batch_id,
                    highland_fresh_batch_code,
                    current_quantity,
                    unit_cost,
                    received_date,
                    expiry_date
                FROM raw_material_batches 
                WHERE raw_material_id = ? 
                  AND current_quantity > 0 
                  AND unit_cost > 0
                ORDER BY received_date ASC, batch_id ASC
            ");
            $stmt->execute([$rawMaterialId]);
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate pricing transparency
            $currentFifoPrice = 0;
            $newestBatchPrice = 0;
            $totalStockAtCurrentPrice = 0;
            $totalStockAtHigherPrice = 0;
            $priceImpactDate = null;

            if (count($batches) > 0) {
                // Current FIFO price (oldest batch)
                $currentFifoPrice = floatval($batches[0]['unit_cost']);
                
                // Find batches at current price and at higher prices
                foreach ($batches as $batch) {
                    $batchPrice = floatval($batch['unit_cost']);
                    $batchQty = floatval($batch['current_quantity']);
                    
                    if (abs($batchPrice - $currentFifoPrice) < 0.01) {
                        // Same price as FIFO
                        $totalStockAtCurrentPrice += $batchQty;
                    } else if ($batchPrice > $currentFifoPrice) {
                        // Higher price batch waiting
                        $totalStockAtHigherPrice += $batchQty;
                        if ($newestBatchPrice == 0 || $batchPrice > $newestBatchPrice) {
                            $newestBatchPrice = $batchPrice;
                        }
                    }
                }
                
                // If no higher price batch, newest = current
                if ($newestBatchPrice == 0) {
                    $newestBatchPrice = $currentFifoPrice;
                }
            } else {
                // No batches, use standard cost
                $currentFifoPrice = floatval($material['standard_cost'] ?? 0);
                $newestBatchPrice = $currentFifoPrice;
            }

            // Get all products using this material
            $stmt = $this->db()->prepare("
                SELECT DISTINCT 
                    pr.recipe_id, 
                    pr.recipe_name, 
                    p.product_id, 
                    p.name as product_name,
                    p.price as selling_price,
                    rrm.quantity_required as quantity_per_batch,
                    COALESCE(uom.unit_name, 'units') as unit_name
                FROM production_recipes pr
                JOIN recipe_raw_materials rrm ON pr.recipe_id = rrm.recipe_id
                LEFT JOIN products p ON pr.finished_product_id = p.product_id
                LEFT JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
                LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                WHERE rrm.raw_material_id = ?
                  AND pr.is_active = 1
                ORDER BY pr.recipe_name
            ");
            $stmt->execute([$rawMaterialId]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Add current AND future price to each product for cost comparison
            foreach ($products as &$product) {
                $qtyPerBatch = floatval($product['quantity_per_batch']);
                $product['current_fifo_price'] = $currentFifoPrice;
                $product['future_price'] = $newestBatchPrice;
                $product['current_material_cost'] = round($qtyPerBatch * $currentFifoPrice, 2);
                $product['future_material_cost'] = round($qtyPerBatch * $newestBatchPrice, 2);
                $product['cost_increase'] = round($product['future_material_cost'] - $product['current_material_cost'], 2);
            }

            $this->respondSuccess([
                'material_name' => $materialName,
                'material_unit' => $materialUnit,
                'current_fifo_price' => $currentFifoPrice,
                'newest_batch_price' => $newestBatchPrice,
                'price_difference' => round($newestBatchPrice - $currentFifoPrice, 2),
                'price_change_percent' => $currentFifoPrice > 0 ? round(($newestBatchPrice - $currentFifoPrice) / $currentFifoPrice * 100, 1) : 0,
                'stock_at_current_price' => round($totalStockAtCurrentPrice, 2),
                'stock_at_higher_price' => round($totalStockAtHigherPrice, 2),
                'batches' => $batches,
                'products' => $products,
                'count' => count($products)
            ]);

        } catch (Exception $e) {
            error_log('RecipeAPI getProductsUsingMaterial error: ' . $e->getMessage());
            $this->respondError('Failed to get affected products: ' . $e->getMessage(), 500);
        }
    }
}

// Initialize and handle request
$api = new RecipeAPI();
$api->handleRequest();
