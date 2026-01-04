<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
if (!class_exists('ProductsAPI')) {
class ProductsAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        if (isset($_GET['inventory']) || isset($_GET['inventory_stats'])) {
            if (!$this->requireInventoryProductionOrAdminAuth()) {
                return;
            }
        }
        $method = $this->getMethod();
        $operation = $_GET['operation'] ?? null;
        $input = $this->getJsonInput() ?? [];
        if ($method === 'GET') {
            if (!$this->requireSalesOfficerInventoryOrAdminAuth()) {
                return;
            }
        } else {
            // Allow Admin and Warehouse Manager for write operations
            if (!hasRole('Admin') && !hasRole('Warehouse Manager')) {
                $this->respond(['success' => false, 'message' => 'Warehouse Manager or Administrator access required'], 403);
                return;
            }
        }
        $this->handle(function () use ($method, $operation, $input) {
            if (($method === 'GET') && isset($_GET['categories'])) {
                $this->getCategories();
                return;
            }
            if (($method === 'GET') && isset($_GET['units'])) {
                $this->getUnits();
                return;
            }
            if (($method === 'GET') && isset($_GET['inventory'])) {
                $this->getInventory($input);
                return;
            }
            if (($method === 'GET') && isset($_GET['inventory_stats'])) {
                $this->getInventoryStats();
                return;
            }
            if (($method === 'GET') && isset($_GET['defaults'])) {
                $this->getProductDefaults();
                return;
            }
            if (($method === 'GET') && isset($_GET['suggested_quantity'])) {
                $this->getProductSuggestedQuantity();
                return;
            }
            switch ($operation ?: $method) {
                case 'GET':
                case 'getAllProducts':
                    $this->getAllProducts($input);
                    break;
                case 'POST':
                case 'insertProduct':
                    $this->insertProduct($input);
                    break;
                case 'PUT':
                case 'updateProduct':
                    $this->updateProduct($input);
                    break;
                case 'DELETE':
                case 'deleteProduct':
                    $this->deleteProduct($input);
                    break;
                case 'getCategories':
                    $this->getCategories();
                    break;
                case 'getUnits':
                    $this->getUnits();
                    break;
                case 'create_category':
                    if ($method !== 'POST') {
                        $this->respond(['success' => false, 'message' => 'Method not allowed for category creation'], 405);
                        return;
                    }
                    $this->createCategory($input);
                    break;
                case 'update_category':
                    if ($method !== 'PUT') {
                        $this->respond(['success' => false, 'message' => 'Method not allowed for category update'], 405);
                        return;
                    }
                    $this->updateCategory($input);
                    break;
                case 'delete_category':
                    if ($method !== 'DELETE') {
                        $this->respond(['success' => false, 'message' => 'Method not allowed for category deletion'], 405);
                        return;
                    }
                    $this->deleteCategory($input);
                    break;
                case 'get_categories_with_stats':
                    if ($method !== 'GET') {
                        $this->respond(['success' => false, 'message' => 'Method not allowed for category stats'], 405);
                        return;
                    }
                    $this->getCategoriesWithStats();
                    break;
                default:
                    $this->respond(['success' => false, 'message' => 'Method not allowed'], 405);
                    break;
            }
        });
    }
    public function getAllProducts(array $input = []): void
    {
        $searchTerm = $_GET['search'] ?? null;
        $barcode = $_GET['barcode'] ?? null;
        $active = $_GET['active'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
        $includeHighlandFresh = isset($_GET['include_highland_fresh']) ? (bool)$_GET['include_highland_fresh'] : false;
        $whereConditions = ['p.is_active = 1'];
        $params = [];
        
        // Exclude Highland Fresh branded products by default unless specifically requested
        if (!$includeHighlandFresh) {
            $whereConditions[] = 'p.name NOT LIKE ?';
            $params[] = '%Highland Fresh%';
        }
        
        if ($searchTerm) {
            $whereConditions[] = '(p.name LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)';
            $searchPattern = '%' . $searchTerm . '%';
            $params = array_merge($params, [$searchPattern, $searchPattern, $searchPattern]);
        }
        if ($barcode) {
            $whereConditions[] = 'p.barcode = ?';
            $params[] = $barcode;
        }
        if ($active !== null) {
            $whereConditions[0] = 'p.is_active = ?';
            $params = array_merge([$active], $params);
        }
        $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
        $limitClause = $limit ? "LIMIT $limit" : '';
        $stmt = $this->db()->prepare(
            "SELECT 
                p.product_id,
                p.name,
                p.barcode,
                p.category_id,
                pc.category_name AS category,
                p.unit_id,
                u.unit_name AS unit,
                u.unit_abbreviation,
                p.price,
                p.cost,
                p.quantity_on_hand,
                p.reorder_level,
                p.max_stock_level,
                p.standard_order_quantity,
                p.auto_reorder_quantity,
                p.description,
                p.is_active,
                p.created_at,
                p.updated_at
            FROM products p
            JOIN product_categories pc ON p.category_id = pc.category_id
            JOIN units_of_measure u ON p.unit_id = u.unit_id
            $whereClause
            ORDER BY p.name ASC
            $limitClause"
        );
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($products as &$product) {
            $product['product_id'] = (int)$product['product_id'];
            $product['category_id'] = (int)$product['category_id'];
            $product['unit_id'] = (int)$product['unit_id'];
            $product['price'] = (float)$product['price'];
            $product['cost'] = isset($product['cost']) ? (float)$product['cost'] : 0.0;
            $product['quantity_on_hand'] = (float)$product['quantity_on_hand'];
            $product['reorder_level'] = (float)$product['reorder_level'];
            $product['max_stock_level'] = isset($product['max_stock_level']) && $product['max_stock_level'] !== null ? (float)$product['max_stock_level'] : null;
            $product['standard_order_quantity'] = isset($product['standard_order_quantity']) && $product['standard_order_quantity'] !== null ? (float)$product['standard_order_quantity'] : null;
            $product['auto_reorder_quantity'] = isset($product['auto_reorder_quantity']) && $product['auto_reorder_quantity'] !== null ? (float)$product['auto_reorder_quantity'] : null;
            $product['is_active'] = (bool)$product['is_active'];
        }
        $this->respond(['success' => true, 'data' => $products, 'count' => count($products)]);
    }
    public function getCategories(): void
    {
        $stmt = $this->db()->prepare(
            'SELECT category_id, category_name, description, is_active 
             FROM product_categories 
             WHERE is_active = 1 
             ORDER BY category_name ASC'
        );
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($categories as &$category) {
            $category['category_id'] = (int)$category['category_id'];
            $category['is_active'] = (bool)$category['is_active'];
        }
        $this->respond(['success' => true, 'data' => $categories, 'count' => count($categories)]);
    }
    public function getUnits(): void
    {
        $stmt = $this->db()->prepare(
            'SELECT unit_id, unit_name, unit_abbreviation, description, unit_type 
             FROM units_of_measure 
             WHERE is_active = 1 
             ORDER BY unit_type ASC, unit_name ASC'
        );
        $stmt->execute();
        $units = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($units as &$unit) {
            $unit['unit_id'] = (int)$unit['unit_id'];
        }
        $this->respond(['success' => true, 'data' => $units, 'count' => count($units)]);
    }
    public function getInventory(array $input = []): void
    {
        $lowStockOnly = isset($_GET['low_stock_only']) && $_GET['low_stock_only'] == '1';
        $whereClause = 'WHERE p.is_active = 1';
        if ($lowStockOnly) {
            $whereClause .= ' AND p.quantity_on_hand <= p.reorder_level';
        }
        $stmt = $this->db()->prepare(
            "SELECT 
                p.product_id,
                p.name,
                p.barcode,
                p.category_id,
                pc.category_name AS category,
                p.unit_id,
                u.unit_name AS unit,
                u.unit_abbreviation,
                sp.supplier_id,
                s.name AS supplier_name,
                p.price,
                p.cost,
                p.quantity_on_hand,
                p.reorder_level,
                p.max_stock_level,
                p.description,
                p.expiry_date,
                p.is_active,
                p.created_at,
                p.updated_at,
                CASE WHEN p.quantity_on_hand <= p.reorder_level THEN 1 ELSE 0 END AS low_stock
            FROM products p
            JOIN product_categories pc ON p.category_id = pc.category_id
            JOIN units_of_measure u ON p.unit_id = u.unit_id
            {$whereClause}
            ORDER BY 
                CASE WHEN p.quantity_on_hand <= p.reorder_level THEN 0 ELSE 1 END,
                p.name ASC"
        );
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($products as &$product) {
            $product['product_id'] = (int)$product['product_id'];
            $product['category_id'] = (int)$product['category_id'];
            $product['unit_id'] = (int)$product['unit_id'];
            $product['price'] = (float)$product['price'];
            $product['cost'] = isset($product['cost']) ? (float)$product['cost'] : 0.0;
            $product['quantity_on_hand'] = (float)$product['quantity_on_hand'];
            $product['reorder_level'] = (float)$product['reorder_level'];
            $product['max_stock_level'] = isset($product['max_stock_level']) && $product['max_stock_level'] !== null ? (float)$product['max_stock_level'] : null;
            $product['is_active'] = (bool)$product['is_active'];
            $product['supplier_id'] = isset($product['supplier_id']) && $product['supplier_id'] !== null ? (int)$product['supplier_id'] : null;
            $product['low_stock'] = (bool)$product['low_stock'];
        }
        $this->respond(['success' => true, 'data' => $products, 'count' => count($products)]);
    }
    public function getInventoryStats(): void
    {
        $stmt = $this->db()->prepare(
            'SELECT COUNT(*) as total_products,
                    SUM(CASE WHEN quantity_on_hand <= reorder_level THEN 1 ELSE 0 END) as low_stock_count,
                    SUM(CASE WHEN quantity_on_hand = 0 THEN 1 ELSE 0 END) as out_of_stock_count
             FROM products 
             WHERE is_active = 1'
        );
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        $totalProducts = (int)$stats['total_products'];
        $lowStockCount = (int)$stats['low_stock_count'];
        $outOfStockCount = (int)$stats['out_of_stock_count'];
        $lowStockPercentage = $totalProducts > 0 ? round(($lowStockCount / $totalProducts) * 100, 1) : 0;
        $outOfStockPercentage = $totalProducts > 0 ? round(($outOfStockCount / $totalProducts) * 100, 1) : 0;
        $this->respond([
            'success' => true, 
            'data' => [
                'total_products' => $totalProducts,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'low_stock_percentage' => $lowStockPercentage,
                'out_of_stock_percentage' => $outOfStockPercentage,
                'healthy_stock_count' => $totalProducts - $lowStockCount
            ]
        ]);
    }
    protected function findCategoryId(string $categoryName): ?int
    {
        return $this->getCachedLookup("category_name_{$categoryName}", function() use ($categoryName) {
            $stmt = $this->prepareStatement('SELECT category_id FROM product_categories WHERE category_name = ? AND is_active = 1 LIMIT 1');
            $stmt->execute([$categoryName]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ? (int)$result['category_id'] : null;
        });
    }
    protected function findUnitId(string $unitName, string $field = 'unit_name'): ?int
    {
        return $this->getCachedLookup("unit_{$field}_{$unitName}", function() use ($unitName, $field) {
            $stmt = $this->prepareStatement("SELECT unit_id FROM units_of_measure WHERE {$field} = ? AND is_active = 1 LIMIT 1");
            $stmt->execute([$unitName]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result ? (int)$result['unit_id'] : null;
        });
    }
    public function insertProduct(array $input): void
    {
        if (!isset($input['category_id']) && isset($input['category']) && is_string($input['category'])) {
            $catName = trim((string)$input['category']);
            if ($catName !== '') {
                $categoryId = $this->findCategoryId($catName);
                if ($categoryId) {
                    $input['category_id'] = $categoryId;
                } else {
                    $fallbackId = $this->findCategoryId('Other');
                    if ($fallbackId) {
                        $input['category_id'] = $fallbackId;
                    }
                }
            }
        }
        if (!isset($input['unit_id'])) {
            if (isset($input['unit_name']) && is_string($input['unit_name'])) {
                $unitName = trim((string)$input['unit_name']);
                $unitId = $this->findUnitId($unitName, 'unit_name');
                if ($unitId) {
                    $input['unit_id'] = $unitId;
                }
            } elseif (isset($input['unit_abbreviation']) && is_string($input['unit_abbreviation'])) {
                $unitAbbr = trim((string)$input['unit_abbreviation']);
                $unitId = $this->findUnitId($unitAbbr, 'unit_abbreviation');
                if ($unitId) {
                    $input['unit_id'] = $unitId;
                }
            } else {
                $unitId = $this->findUnitId('Piece', 'unit_name');
                if ($unitId) {
                    $input['unit_id'] = $unitId;
                }
            }
        }
        $required = ['name', 'barcode', 'category_id', 'unit_id', 'price', 'quantity_on_hand', 'reorder_level'];
        $missing = $this->requireParams($input, $required);
        if ($missing) {
            $this->respond(['success' => false, 'message' => "Field '" . $missing[0] . "' is required"], 400);
            return;
        }
        $name = trim((string)$input['name']);
        $barcode = strtoupper(trim((string)$input['barcode']));
        $category_id = (int)$input['category_id'];
        $unit_id = (int)$input['unit_id'];
        $price = (float)$input['price'];
        $cost = isset($input['cost']) ? (float)$input['cost'] : 0.0;
        $quantity = (float)$input['quantity_on_hand'];
        $reorder_level = (float)$input['reorder_level'];
        $max_stock_level = isset($input['max_stock_level']) && $input['max_stock_level'] !== '' ? (float)$input['max_stock_level'] : null;
        $description = isset($input['description']) ? trim((string)$input['description']) : null;
        $supplier_id = isset($input['supplier_id']) && $input['supplier_id'] !== '' ? (int)$input['supplier_id'] : null;
        $expiry_date = isset($input['expiry_date']) && $input['expiry_date'] !== '' ? trim((string)$input['expiry_date']) : null;
        if (strlen($name) < 1 || strlen($name) > 100) {
            $this->respond(['success' => false, 'message' => 'Product name must be between 1 and 100 characters'], 400);
            return;
        }
        if (strlen($barcode) < 1 || strlen($barcode) > 50) {
            $this->respond(['success' => false, 'message' => 'Barcode must be between 1 and 50 characters'], 400);
            return;
        }
        if ($category_id <= 0) { $this->respond(['success' => false, 'message' => 'Valid category must be selected'], 400); return; }
        if ($unit_id <= 0) { $this->respond(['success' => false, 'message' => 'Valid unit must be selected'], 400); return; }
        if ($price <= 0) { $this->respond(['success' => false, 'message' => 'Price must be greater than 0'], 400); return; }
        if ($quantity < 0) { $this->respond(['success' => false, 'message' => 'Quantity on hand cannot be negative'], 400); return; }
        if ($reorder_level < 0) { $this->respond(['success' => false, 'message' => 'Reorder level cannot be negative'], 400); return; }
        if ($expiry_date && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiry_date)) {
            $this->respond(['success' => false, 'message' => 'Invalid expiry date format (expected YYYY-MM-DD)'], 400);
            return;
        }
    if ($supplier_id) {
            $supplierStmt = $this->db()->prepare('SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1');
            $supplierStmt->execute([$supplier_id]);
            if (!$supplierStmt->fetch()) {
                $this->respond(['success' => false, 'message' => 'Invalid supplier selected'], 400);
                return;
            }
        }
        $checkStmt = $this->db()->prepare('SELECT product_id FROM products WHERE barcode = ? LIMIT 1');
        $checkStmt->execute([$barcode]);
        if ($checkStmt->fetch()) { $this->respond(['success' => false, 'message' => 'Barcode already exists'], 409); return; }
        
        // Use barcode as SKU for compatibility with legacy database structure
        $sku = $barcode;
        
        $stmt = $this->db()->prepare('INSERT INTO products (name, sku, barcode, category_id, unit_id, price, cost, quantity_on_hand, reorder_level, max_stock_level, description, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$name, $sku, $barcode, $category_id, $unit_id, $price, $cost, $quantity, $reorder_level, $max_stock_level, $description, $expiry_date]);
        $productId = (int)$this->db()->lastInsertId();
        
        $createdStmt = $this->db()->prepare('SELECT 
            p.product_id, p.name, p.sku, p.barcode, p.category_id, pc.category_name AS category, p.unit_id, u.unit_name AS unit, u.unit_abbreviation,
            p.price, p.cost, p.quantity_on_hand, p.reorder_level, p.max_stock_level, p.description,
            p.expiry_date, p.is_active, p.created_at, p.updated_at
            FROM products p 
            JOIN product_categories pc ON p.category_id = pc.category_id 
            JOIN units_of_measure u ON p.unit_id = u.unit_id 
            WHERE p.product_id = ?');
        $createdStmt->execute([$productId]);
        $product = $createdStmt->fetch(PDO::FETCH_ASSOC);
        $product['product_id'] = (int)$product['product_id'];
        $product['category_id'] = (int)$product['category_id'];
        $product['unit_id'] = (int)$product['unit_id'];
        $product['price'] = (float)$product['price'];
        $product['cost'] = (float)$product['cost'];
        $product['quantity_on_hand'] = (float)$product['quantity_on_hand'];
        $product['reorder_level'] = (float)$product['reorder_level'];
        $product['max_stock_level'] = $product['max_stock_level'] ? (float)$product['max_stock_level'] : null;
        $product['is_active'] = (bool)$product['is_active'];
        $product['supplier_id'] = $product['supplier_id'] ? (int)$product['supplier_id'] : null;
        $this->respond(['success' => true, 'message' => 'Product created successfully', 'data' => $product], 201);
    }
    public function updateProduct(array $input): void
    {
        $id = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) { $id = (int)$_GET['id']; }
        elseif (isset($input['id']) && is_numeric($input['id'])) { $id = (int)$input['id']; }
        if (!$id) { $this->respond(['success' => false, 'message' => 'Valid product ID is required'], 400); return; }
        $checkStmt = $this->db()->prepare('SELECT product_id FROM products WHERE product_id = ? LIMIT 1');
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) { $this->respond(['success' => false, 'message' => 'Product not found'], 404); return; }
        $updateFields = [];
        $updateValues = [];
        if (array_key_exists('name', $input)) {
            $name = trim((string)$input['name']);
            if (strlen($name) < 1 || strlen($name) > 100) { $this->respond(['success'=>false,'message'=>'Product name must be between 1 and 100 characters'],400); return; }
            $updateFields[] = 'name = ?'; $updateValues[] = $name;
        }
        if (array_key_exists('barcode', $input)) {
            $barcode = strtoupper(trim((string)$input['barcode']));
            if (strlen($barcode) < 1 || strlen($barcode) > 50) { $this->respond(['success'=>false,'message'=>'Barcode must be between 1 and 50 characters'],400); return; }
            $checkBarcodeStmt = $this->db()->prepare('SELECT product_id FROM products WHERE barcode = ? AND product_id != ? LIMIT 1');
            $checkBarcodeStmt->execute([$barcode, $id]);
            if ($checkBarcodeStmt->fetch()) { $this->respond(['success'=>false,'message'=>'Barcode already exists'],409); return; }
            $updateFields[] = 'barcode = ?'; $updateValues[] = $barcode;
        }
        if (array_key_exists('category_id', $input)) {
            $cat = (int)$input['category_id']; if ($cat <= 0) { $this->respond(['success'=>false,'message'=>'Valid category must be selected'],400); return; }
            $updateFields[] = 'category_id = ?'; $updateValues[] = $cat;
        }
        if (array_key_exists('unit_id', $input)) {
            $unit = (int)$input['unit_id']; if ($unit <= 0) { $this->respond(['success'=>false,'message'=>'Valid unit must be selected'],400); return; }
            $updateFields[] = 'unit_id = ?'; $updateValues[] = $unit;
        }
        if (array_key_exists('price', $input)) {
            $price = (float)$input['price']; if ($price <= 0) { $this->respond(['success'=>false,'message'=>'Price must be greater than 0'],400); return; }
            $updateFields[] = 'price = ?'; $updateValues[] = $price;
        }
        if (array_key_exists('quantity_on_hand', $input)) {
            $quantity = (float)$input['quantity_on_hand']; if ($quantity < 0) { $this->respond(['success'=>false,'message'=>'Quantity on hand cannot be negative'],400); return; }
            $updateFields[] = 'quantity_on_hand = ?'; $updateValues[] = $quantity;
        }
        if (array_key_exists('reorder_level', $input)) {
            $reorder = (float)$input['reorder_level']; if ($reorder < 0) { $this->respond(['success'=>false,'message'=>'Reorder level cannot be negative'],400); return; }
            $updateFields[] = 'reorder_level = ?'; $updateValues[] = $reorder;
        }
        if (array_key_exists('supplier_id', $input)) {
            $supplier_id = $input['supplier_id'] !== '' ? (int)$input['supplier_id'] : null;
            if ($supplier_id) { 
                $supplierStmt = $this->db()->prepare('SELECT supplier_id FROM suppliers WHERE supplier_id = ? LIMIT 1'); 
                $supplierStmt->execute([$supplier_id]); 
                if (!$supplierStmt->fetch()) { 
                    $this->respond(['success'=>false,'message'=>'Invalid supplier selected'],400); 
                    return; 
                } 
            }
            // Handle supplier relationship through supplier_products table separately
            // We'll update this after the main product update
        }
        if (array_key_exists('expiry_date', $input)) {
            $expiry = trim((string)$input['expiry_date']); if ($expiry !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiry)) { $this->respond(['success'=>false,'message'=>'Invalid expiry date format (expected YYYY-MM-DD)'],400); return; }
            $updateFields[] = 'expiry_date = ?'; $updateValues[] = $expiry === '' ? null : $expiry;
        }
        if (array_key_exists('description', $input)) {
            $desc = trim((string)$input['description']); $updateFields[] = 'description = ?'; $updateValues[] = $desc;
        }
        if (!$updateFields) { $this->respond(['success'=>false,'message'=>'No valid fields to update'],400); return; }
        $updateFields[] = 'updated_at = CURRENT_TIMESTAMP';
        $updateValues[] = $id;
        $sql = 'UPDATE products SET ' . implode(', ', $updateFields) . ' WHERE product_id = ?';
        
        try {
            $stmt = $this->db()->prepare($sql); 
            $stmt->execute($updateValues);
        } catch (Exception $e) {
            error_log("UPDATE query failed: " . $e->getMessage() . " | SQL: " . $sql . " | Values: " . json_encode($updateValues));
            $this->respond(['success' => false, 'message' => 'Update failed: ' . $e->getMessage()], 500);
            return;
        }
        
        try {
            $updatedStmt = $this->db()->prepare('SELECT 
                p.product_id,
                p.name,
                p.sku,
                p.barcode,
                p.category_id,
                pc.category_name AS category,
                p.unit_id,
                u.unit_name AS unit,
                u.unit_abbreviation,
                p.price,
                p.cost,
                p.quantity_on_hand,
                p.reorder_level,
                p.max_stock_level,
                p.description,
                p.expiry_date,
                p.is_active,
                p.created_at,
                p.updated_at
            FROM products p
            JOIN product_categories pc ON p.category_id = pc.category_id
            JOIN units_of_measure u ON p.unit_id = u.unit_id
            WHERE p.product_id = ?');
            $updatedStmt->execute([$id]);
            $product = $updatedStmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("SELECT query failed: " . $e->getMessage());
            $this->respond(['success' => false, 'message' => 'Failed to retrieve updated product: ' . $e->getMessage()], 500);
            return;
        }
        if ($product) {
            $product['product_id'] = (int)$product['product_id'];
            $product['category_id'] = (int)$product['category_id'];
            $product['unit_id'] = (int)$product['unit_id'];
            $product['price'] = (float)$product['price'];
            $product['cost'] = isset($product['cost']) ? (float)$product['cost'] : 0.0;
            $product['quantity_on_hand'] = (float)$product['quantity_on_hand'];
            $product['reorder_level'] = (float)$product['reorder_level'];
            $product['max_stock_level'] = isset($product['max_stock_level']) && $product['max_stock_level'] !== null ? (float)$product['max_stock_level'] : null;
            $product['is_active'] = (bool)$product['is_active'];
            $product['supplier_id'] = isset($product['supplier_id']) && $product['supplier_id'] !== null ? (int)$product['supplier_id'] : null;
        }
        $this->respond(['success' => true, 'message' => 'Product updated successfully', 'data' => $product]);
    }
    public function deleteProduct(array $input): void
    {
        $id = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) { $id = (int)$_GET['id']; }
        elseif (isset($input['id']) && is_numeric($input['id'])) { $id = (int)$input['id']; }
        if (!$id) { $this->respond(['success'=>false,'message'=>'Valid product ID is required'],400); return; }
        $checkStmt = $this->prepareStatement('SELECT product_id, name, barcode FROM products WHERE product_id = ? LIMIT 1');
        $checkStmt->execute([$id]);
        $product = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$product) { $this->respond(['success'=>false,'message'=>'Product not found'],404); return; }
        $deleteStmt = $this->prepareStatement('DELETE FROM products WHERE product_id = ?');
        $deleteStmt->execute([$id]);
        $this->respond(['success'=>true,'message'=>'Product deleted successfully','data'=>[
            'product_id' => (int)$product['product_id'],
            'name' => $product['name'],
            'barcode' => $product['barcode'],
        ]]);
    }
    private function validateAndSanitizeCategoryInput(array $input, string $operation = 'create'): array
    {
        $sanitized = [];
        if (isset($input['category_name'])) {
            $categoryName = trim($input['category_name']);
            if (preg_match('/[<>"\'\\\;\(\)=]/', $categoryName)) {
                throw new Exception('Category name contains invalid characters');
            }
            if (strlen($categoryName) < 1 || strlen($categoryName) > 100) {
                throw new Exception('Category name must be between 1 and 100 characters');
            }
            $sanitized['category_name'] = $categoryName;
        } elseif ($operation === 'create') {
            throw new Exception('Category name is required');
        }
        if (array_key_exists('description', $input)) {
            $description = $input['description'] ? trim($input['description']) : null;
            if ($description) {
                $description = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');
                if (strlen($description) > 255) {
                    throw new Exception('Description must be 255 characters or less');
                }
            }
            $sanitized['description'] = $description;
        }
        if (isset($input['is_active'])) {
            $sanitized['is_active'] = filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($sanitized['is_active'] === null) {
                throw new Exception('is_active must be a boolean value');
            }
        }
        return $sanitized;
    }
    private function requireCategoryManagementAuth(): bool
    {
        if (!$this->requireAdminAuth()) {
            return false;
        }
        $this->logCategoryOperation();
        return true;
    }
    private function logCategoryOperation(string $operation = null, $categoryId = null, array $context = []): void
    {
        $operation = $operation ?? $_GET['operation'] ?? 'unknown';
        $categoryId = $categoryId ?? $_GET['id'] ?? 'new';
        $userId = $_SESSION['user_id'] ?? 'unknown';
        $username = $_SESSION['username'] ?? 'unknown';
        $contextStr = !empty($context) ? ' Context: ' . json_encode($context) : '';
        error_log("CATEGORY_AUDIT: User {$username} (ID: {$userId}) performing {$operation} on category {$categoryId} at " . date('Y-m-d H:i:s') . $contextStr);
    }
    public function createCategory(array $input): void
    {
        if (!$this->requireCategoryManagementAuth()) {
            return;
        }
        try {
            $sanitized = $this->validateAndSanitizeCategoryInput($input, 'create');
            $categoryName = $sanitized['category_name'];
            $description = $sanitized['description'] ?? null;
            $this->db()->beginTransaction();
            $checkStmt = $this->db()->prepare('SELECT category_id, is_active FROM product_categories WHERE LOWER(category_name) = LOWER(?) LIMIT 1');
            $checkStmt->execute([$categoryName]);
            if ($existing = $checkStmt->fetch(PDO::FETCH_ASSOC)) {
                $this->db()->rollBack();
                $this->respond([
                    'success' => true,
                    'message' => 'Category already existed; returning existing record',
                    'data' => [
                        'category_id' => (int)$existing['category_id'],
                        'category_name' => $categoryName,
                        'description' => $description,
                        'is_active' => (bool)$existing['is_active']
                    ]
                ], 200);
                return;
            }
            $insertStmt = $this->db()->prepare(
                'INSERT INTO product_categories (category_name, description) VALUES (?, ?)'
            );
            $insertStmt->execute([$categoryName, $description]);
            $categoryId = (int)$this->db()->lastInsertId();
            $this->db()->commit();
            $createdStmt = $this->db()->prepare(
                'SELECT category_id, category_name, description, is_active, created_at 
                 FROM product_categories WHERE category_id = ?'
            );
            $createdStmt->execute([$categoryId]);
            $category = $createdStmt->fetch(PDO::FETCH_ASSOC);
            $category['category_id'] = (int)$category['category_id'];
            $category['is_active'] = (bool)$category['is_active'];
            $this->respond([
                'success' => true, 
                'message' => 'Category created successfully', 
                'data' => $category
            ]);
            $this->logCategoryOperation('create', $category['category_id'], [
                'category_name' => $category['category_name']
            ]);
        } catch (Exception $e) {
            if ($this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            $this->respond(['success' => false, 'message' => 'Failed to create category: ' . $e->getMessage()], 400);
        }
    }
    public function updateCategory(array $input): void
    {
        if (!$this->requireCategoryManagementAuth()) {
            return;
        }
        $categoryId = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $categoryId = (int)$_GET['id'];
        } elseif (isset($input['id']) && is_numeric($input['id'])) {
            $categoryId = (int)$input['id'];
        }
        if (!$categoryId) {
            $this->respond(['success' => false, 'message' => 'Valid category ID is required'], 400);
            return;
        }
        try {
            $this->db()->beginTransaction();
            $checkStmt = $this->db()->prepare('SELECT category_id, category_name FROM product_categories WHERE category_id = ?');
            $checkStmt->execute([$categoryId]);
            $existingCategory = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if (!$existingCategory) {
                $this->db()->rollBack();
                $this->respond(['success' => false, 'message' => 'Category not found'], 404);
                return;
            }
            $sanitized = $this->validateAndSanitizeCategoryInput($input, 'update');
            $updateFields = [];
            $updateValues = [];
            if (isset($sanitized['category_name'])) {
                $categoryName = $sanitized['category_name'];
                $uniqueStmt = $this->db()->prepare(
                    'SELECT category_id FROM product_categories WHERE category_name = ? AND category_id != ? AND is_active = 1'
                );
                $uniqueStmt->execute([$categoryName, $categoryId]);
                if ($uniqueStmt->fetch()) {
                    $this->db()->rollBack();
                    $this->respond(['success' => false, 'message' => 'Category name already exists'], 409);
                    return;
                }
                $updateFields[] = 'category_name = ?';
                $updateValues[] = $categoryName;
            }
            if (array_key_exists('description', $sanitized)) {
                $updateFields[] = 'description = ?';
                $updateValues[] = $sanitized['description'];
            }
            if (isset($sanitized['is_active'])) {
                $updateFields[] = 'is_active = ?';
                $updateValues[] = $sanitized['is_active'] ? 1 : 0;
            }
            if (empty($updateFields)) {
                $this->db()->rollBack();
                $this->respond(['success' => false, 'message' => 'No valid fields to update'], 400);
                return;
            }
            $updateValues[] = $categoryId;
            $sql = 'UPDATE product_categories SET ' . implode(', ', $updateFields) . ' WHERE category_id = ?';
            $stmt = $this->db()->prepare($sql);
            $stmt->execute($updateValues);
            $this->db()->commit();
            $updatedStmt = $this->db()->prepare(
                'SELECT category_id, category_name, description, is_active, created_at 
                 FROM product_categories WHERE category_id = ?'
            );
            $updatedStmt->execute([$categoryId]);
            $category = $updatedStmt->fetch(PDO::FETCH_ASSOC);
            $category['category_id'] = (int)$category['category_id'];
            $category['is_active'] = (bool)$category['is_active'];
            $this->respond([
                'success' => true, 
                'message' => 'Category updated successfully', 
                'data' => $category
            ]);
            $this->logCategoryOperation('update', $category['category_id'], [
                'category_name' => $category['category_name']
            ]);
        } catch (Exception $e) {
            if ($this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            $this->respond(['success' => false, 'message' => 'Failed to update category: ' . $e->getMessage()], 400);
        }
    }
    public function deleteCategory(array $input): void
    {
        if (!$this->requireCategoryManagementAuth()) {
            return;
        }
        $categoryId = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $categoryId = (int)$_GET['id'];
        } elseif (isset($input['id']) && is_numeric($input['id'])) {
            $categoryId = (int)$input['id'];
        }
        if (!$categoryId) {
            $this->respond(['success' => false, 'message' => 'Valid category ID is required'], 400);
            return;
        }
        $hardDelete = isset($input['hard_delete']) && filter_var($input['hard_delete'], FILTER_VALIDATE_BOOLEAN);
        $forceDelete = isset($input['force']) && filter_var($input['force'], FILTER_VALIDATE_BOOLEAN);
        try {
            $this->db()->beginTransaction();
            $checkStmt = $this->db()->prepare('SELECT category_id, category_name, is_active FROM product_categories WHERE category_id = ?');
            $checkStmt->execute([$categoryId]);
            $category = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if (!$category) {
                $this->db()->rollBack();
                $this->respond(['success' => false, 'message' => 'Category not found'], 404);
                return;
            }
            $productCountStmt = $this->db()->prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1');
            $productCountStmt->execute([$categoryId]);
            $productCount = $productCountStmt->fetch(PDO::FETCH_ASSOC)['count'];
            $childCountStmt = $this->db()->prepare('SELECT COUNT(*) as count FROM product_categories WHERE parent_category_id = ? AND is_active = 1');
            $childCountStmt->execute([$categoryId]);
            $childCount = $childCountStmt->fetch(PDO::FETCH_ASSOC)['count'];
            if (($productCount > 0 || $childCount > 0) && !$forceDelete) {
                $this->db()->rollBack();
                $dependencies = [];
                if ($productCount > 0) $dependencies[] = "{$productCount} product(s)";
                if ($childCount > 0) $dependencies[] = "{$childCount} subcategory(ies)";
                $this->respond([
                    'success' => false, 
                    'message' => 'Cannot delete category: has ' . implode(' and ', $dependencies) . '. Use force=true to override.',
                    'dependencies' => [
                        'products' => (int)$productCount,
                        'subcategories' => (int)$childCount
                    ]
                ], 409);
                return;
            }
            if ($hardDelete) {
                if ($forceDelete) {
                    if ($productCount > 0) {
                        $updateProductsStmt = $this->db()->prepare('UPDATE products SET category_id = NULL WHERE category_id = ?');
                        $updateProductsStmt->execute([$categoryId]);
                    }
                    if ($childCount > 0) {
                        $updateChildrenStmt = $this->db()->prepare('UPDATE product_categories SET parent_category_id = NULL WHERE parent_category_id = ?');
                        $updateChildrenStmt->execute([$categoryId]);
                    }
                }
                $deleteStmt = $this->db()->prepare('DELETE FROM product_categories WHERE category_id = ?');
                $deleteStmt->execute([$categoryId]);
                $this->respond(['success' => true, 'message' => 'Category permanently deleted']);
            } else {
                if ($forceDelete && ($productCount > 0 || $childCount > 0)) {
                    if ($productCount > 0) {
                        $deactivateProductsStmt = $this->db()->prepare('UPDATE products SET is_active = 0 WHERE category_id = ?');
                        $deactivateProductsStmt->execute([$categoryId]);
                    }
                    if ($childCount > 0) {
                        $deactivateChildrenStmt = $this->db()->prepare('UPDATE product_categories SET is_active = 0 WHERE parent_category_id = ?');
                        $deactivateChildrenStmt->execute([$categoryId]);
                    }
                }
                $softDeleteStmt = $this->db()->prepare('UPDATE product_categories SET is_active = 0 WHERE category_id = ?');
                $softDeleteStmt->execute([$categoryId]);
                $this->respond(['success' => true, 'message' => 'Category deactivated successfully']);
            }
            $this->db()->commit();
            $this->logCategoryOperation('delete', $categoryId, [
                'mode' => $hardDelete ? 'hard' : 'soft',
                'force' => $forceDelete,
                'category_name' => $category['category_name']
            ]);
        } catch (Exception $e) {
            if ($this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            $this->respond(['success' => false, 'message' => 'Failed to delete category: ' . $e->getMessage()], 500);
        }
    }
    public function getCategoriesWithStats(): void
    {
        try {
            $stmt = $this->db()->prepare(
                'SELECT 
                    c.category_id,
                    c.category_name,
                    c.description,
                    c.is_active,
                    c.created_at,
                    COUNT(p.product_id) as product_count
                FROM product_categories c
                LEFT JOIN products p ON c.category_id = p.category_id AND p.is_active = 1
                WHERE c.is_active = 1
                GROUP BY c.category_id, c.category_name, c.description, c.is_active, c.created_at
                ORDER BY c.category_name ASC'
            );
            $stmt->execute();
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($categories as &$category) {
                $category['category_id'] = (int)$category['category_id'];
                $category['is_active'] = (bool)$category['is_active'];
                $category['product_count'] = (int)$category['product_count'];
            }
            $this->respond([
                'success' => true, 
                'data' => $categories, 
                'count' => count($categories)
            ]);
        } catch (Exception $e) {
            $this->respond(['success' => false, 'message' => 'Failed to load categories: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Get product defaults with calculated suggestions based on supplier and usage patterns
     */
    public function getProductDefaults(): void
    {
        try {
            $supplier_id = $_GET['supplier_id'] ?? null;
            
            $stmt = $this->db()->prepare(
                "SELECT 
                    product_id,
                    product_name,
                    category_id,
                    category_name,
                    unit,
                    unit_cost,
                    standard_order_quantity,
                    auto_reorder_quantity,
                    min_order_quantity,
                    max_order_quantity,
                    last_order_quantity,
                    avg_monthly_usage,
                    quantity_on_hand,
                    reorder_level,
                    stock_status,
                    suggested_quantity
                FROM product_defaults 
                ORDER BY product_name ASC"
            );
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // If supplier_id provided, adjust suggestions based on supplier capacity
            if ($supplier_id) {
                $supplierStmt = $this->db()->prepare(
                    "SELECT supplier_type, daily_milk_capacity_liters, max_single_order_quantity, quantity_unit 
                     FROM suppliers WHERE supplier_id = ?"
                );
                $supplierStmt->execute([$supplier_id]);
                $supplier = $supplierStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($supplier) {
                    foreach ($products as &$product) {
                        $product['supplier_adjusted_quantity'] = $this->calculateSupplierBasedQuantity(
                            $product, $supplier
                        );
                    }
                }
            }
            
            $this->respond([
                'success' => true, 
                'data' => $products, 
                'count' => count($products),
                'supplier_id' => $supplier_id
            ]);
        } catch (Exception $e) {
            $this->respond(['success' => false, 'message' => 'Failed to load product defaults: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Get suggested quantity for a specific product based on supplier and current stock
     */
    public function getProductSuggestedQuantity(): void
    {
        try {
            $product_id = $_GET['product_id'] ?? null;
            $supplier_id = $_GET['supplier_id'] ?? null;
            
            if (!$product_id) {
                $this->respond(['success' => false, 'message' => 'Product ID is required'], 400);
                return;
            }
            
            // Get product details
            $productStmt = $this->db()->prepare(
                "SELECT * FROM product_defaults WHERE product_id = ?"
            );
            $productStmt->execute([$product_id]);
            $product = $productStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                $this->respond(['success' => false, 'message' => 'Product not found'], 404);
                return;
            }
            
            $suggested_quantity = $product['suggested_quantity'];
            $quantity_source = 'default';
            $explanation = 'Standard default quantity';
            
            // Adjust based on supplier if provided
            if ($supplier_id) {
                $supplierStmt = $this->db()->prepare(
                    "SELECT supplier_type, daily_milk_capacity_liters, max_single_order_quantity, quantity_unit 
                     FROM suppliers WHERE supplier_id = ?"
                );
                $supplierStmt->execute([$supplier_id]);
                $supplier = $supplierStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($supplier) {
                    $supplier_quantity = $this->calculateSupplierBasedQuantity($product, $supplier);
                    if ($supplier_quantity !== $suggested_quantity) {
                        $suggested_quantity = $supplier_quantity;
                        $quantity_source = 'supplier_based';
                        $explanation = 'Adjusted based on supplier capacity and limits';
                    }
                }
            }
            
            // Check if product is low stock and adjust accordingly
            if ($product['stock_status'] === 'Low Stock' && $product['auto_reorder_quantity']) {
                $suggested_quantity = max($suggested_quantity, $product['auto_reorder_quantity']);
                $quantity_source = 'usage_based';
                $explanation = 'Increased due to low stock level';
            }
            
            $this->respond([
                'success' => true,
                'data' => [
                    'product_id' => $product_id,
                    'product_name' => $product['product_name'],
                    'suggested_quantity' => $suggested_quantity,
                    'quantity_source' => $quantity_source,
                    'explanation' => $explanation,
                    'stock_status' => $product['stock_status'],
                    'current_stock' => $product['quantity_on_hand'],
                    'reorder_level' => $product['reorder_level'],
                    'min_order_quantity' => $product['min_order_quantity'],
                    'max_order_quantity' => $product['max_order_quantity']
                ]
            ]);
        } catch (Exception $e) {
            $this->respond(['success' => false, 'message' => 'Failed to calculate suggested quantity: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Calculate supplier-based quantity suggestion
     * Phase 3: Enhanced with Highland Fresh business logic, seasonal adjustments, and specific supplier limits
     */
    private function calculateSupplierBasedQuantity(array $product, array $supplier): float
    {
        $base_quantity = $product['suggested_quantity'] ?? 1;
        
        // Phase 3: Highland Fresh dairy-specific business logic
        $base_quantity = $this->applyHighlandFreshDairyLogic($product, $base_quantity);
        
        // Phase 3: Apply seasonal adjustments
        $base_quantity = $this->applySeasonalAdjustments($base_quantity);
        
        // Phase 3: Apply specific supplier capacity limits
        $base_quantity = $this->applySupplierCapacityLimits($product, $supplier, $base_quantity);
        
        // Ensure minimum order quantities are respected
        if ($product['min_order_quantity']) {
            $base_quantity = max($base_quantity, $product['min_order_quantity']);
        }
        
        return $base_quantity;
    }

    /**
     * Phase 3: Apply Highland Fresh dairy-specific business logic
     */
    private function applyHighlandFreshDairyLogic(array $product, float $baseQuantity): float
    {
        $productName = strtolower($product['product_name']);
        
        // Highland Fresh Dairy Products - Supply Day Calculations
        if (strpos($productName, 'milk') !== false || strpos($productName, 'fresh milk') !== false) {
            // Fresh Milk: 2-3 days supply (assuming 8-10 liters/day consumption)
            return $this->calculateSupplyDaysQuantity($product, 2.5, 25.0);
        }
        
        if (strpos($productName, 'cheese') !== false) {
            // Cheese: 1 week supply (assuming 2-3 units/day consumption)
            return $this->calculateSupplyDaysQuantity($product, 7, 18.0);
        }
        
        if (strpos($productName, 'yogurt') !== false || strpos($productName, 'yoghurt') !== false) {
            // Yogurt: 3-4 days supply (assuming 4-5 units/day consumption)
            return $this->calculateSupplyDaysQuantity($product, 3.5, 16.0);
        }
        
        if (strpos($productName, 'butter') !== false) {
            // Butter: 2 weeks supply (longer shelf life, lower consumption)
            return $this->calculateSupplyDaysQuantity($product, 14, 12.0);
        }
        
        if (strpos($productName, 'cream') !== false) {
            // Cream: 2-3 days supply (perishable)
            return $this->calculateSupplyDaysQuantity($product, 2.5, 8.0);
        }
        
        // Non-dairy Highland Fresh products
        if (strpos($productName, 'packaging') !== false || 
            strpos($productName, 'container') !== false || 
            strpos($productName, 'bottle') !== false) {
            return 100.0; // Packaging materials - bulk order
        }
        
        return $baseQuantity; // Default for other products
    }

    /**
     * Phase 3: Calculate quantity based on supply days and estimated daily consumption
     */
    private function calculateSupplyDaysQuantity(array $product, float $supplyDays, float $baseQuantity): float
    {
        // If we have historical data, use it to estimate daily consumption
        $reorderLevel = floatval($product['reorder_level'] ?? 0);
        
        // If reorder level exists, estimate daily consumption
        if ($reorderLevel > 0) {
            // Assume reorder level represents ~3 days of safety stock
            $estimatedDailyConsumption = $reorderLevel / 3;
            return max($estimatedDailyConsumption * $supplyDays, $baseQuantity);
        }
        
        return $baseQuantity;
    }

    /**
     * Phase 3: Apply seasonal adjustments
     */
    private function applySeasonalAdjustments(float $baseQuantity): float
    {
        $currentMonth = (int)date('n'); // 1-12
        
        // Peak Season (December-February): +50%
        if ($currentMonth === 12 || $currentMonth === 1 || $currentMonth === 2) {
            return $baseQuantity * 1.50;
        }
        // Low Season (June-August): -25%
        else if ($currentMonth >= 6 && $currentMonth <= 8) {
            return $baseQuantity * 0.75;
        }
        
        return $baseQuantity; // No adjustment for other months
    }

    /**
     * Phase 3: Apply supplier-specific capacity limits
     */
    private function applySupplierCapacityLimits(array $product, array $supplier, float $baseQuantity): float
    {
        $supplierName = strtolower($supplier['name'] ?? $supplier['supplier_name'] ?? '');
        $productName = strtolower($product['product_name']);
        
        // Dalwangan Dairy (800L capacity): Max 640L per order
        if (strpos($supplierName, 'dalwangan') !== false && strpos($productName, 'milk') !== false) {
            return min($baseQuantity, 640.0);
        }
        
        // Bukidnon Dairy (950L capacity): Max 760L per order
        if (strpos($supplierName, 'bukidnon') !== false && strpos($productName, 'milk') !== false) {
            return min($baseQuantity, 760.0);
        }
        
        // General supplier capacity limit from database
        if ($supplier['daily_milk_capacity_liters'] && strpos($productName, 'milk') !== false) {
            // Use 80% of daily capacity as max per order (leave 20% for other customers)
            $maxOrderLiters = floor($supplier['daily_milk_capacity_liters'] * 0.80);
            $baseQuantity = min($baseQuantity, $maxOrderLiters);
        }
        
        // Apply supplier max_single_order_quantity if available
        if ($supplier['max_single_order_quantity']) {
            $baseQuantity = min($baseQuantity, $supplier['max_single_order_quantity']);
        }
        
        return $baseQuantity;
    }
}
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'ProductsAPI.php') {
    $api = new ProductsAPI(['methods' => 'GET, POST, PUT, DELETE, OPTIONS']);
    $api->route();
}