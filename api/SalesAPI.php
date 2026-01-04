<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
class SalesAPI extends BaseAPI
{
    protected function getAllowedRoles(): array
    {
        // Sales Staff/Officers, Warehouse Staff, and Admins can access this API
        // Warehouse Staff needs to view and dispatch orders
        return ['Admin', 'Sales Officer', 'Sales Staff', 'Warehouse Staff'];
    }

    public function route(): void
    {
        $this->initializeSession();
        
        // Verify authentication
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        // Verify role
        $user = getCurrentUser();
        $userRole = $user['role'] ?? null;
        
        if (!in_array($userRole, $this->getAllowedRoles())) {
            $this->respondError('Unauthorized access. Sales role required.', 403);
            return;
        }

        $method = $this->getMethod();
        $input = $this->getJsonInput() ?? [];
        $operation = $this->getOperation();
        $this->handle(function() use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'GET':
                    $this->getAllSales();
                    break;
                case 'POST':
                    $this->createSale($input);
                    break;
                case 'getPendingOrders':
                    $this->getPendingOrders();
                    break;
                case 'getPendingOrdersCount':
                    $this->getPendingOrdersCount();
                    break;
                case 'getApprovedOrders':
                    $this->getApprovedOrders();
                    break;
                case 'approveOrder':
                    $this->approveOrder($input);
                    break;
                case 'rejectOrder':
                    $this->rejectOrder($input);
                    break;
                case 'history':
                    $this->getTransactionHistory();
                    break;
                case 'details':
                    $this->getTransactionDetails();
                    break;
                case 'receipt':
                    $this->getReceiptData();
                    break;
                case 'getTodayStats':
                    $this->getTodayStats();
                    break;
                case 'getOrderForDispatch':
                    $this->getOrderForDispatch($input);
                    break;
                case 'validateBatchForDispatch':
                    $this->validateBatchForDispatch($input);
                    break;
                case 'completeDispatch':
                    $this->completeDispatch($input);
                    break;
                case 'getCompletedToday':
                    $this->getCompletedToday();
                    break;
                default:
                    $this->respondError('Unsupported operation', 400, ['operation' => $operation ?: $method]);
                    break;
            }
        });
    }
    public function createSale(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required to process sales', 401);
            return;
        }
        if (!hasRole(['Sales', 'Cashier', 'Admin'])) {
            $this->respondError('Sales Staff or Administrator access required to process sales', 403);
            return;
        }
        $required = ['items'];
        $missing = $this->requireParams($input, $required);
        if ($missing) {
            $this->respondError('Missing required fields: ' . implode(', ', $missing), 400);
            return;
        }
        if (empty($input['items']) || !is_array($input['items'])) {
            $this->respondError('Items array is required and must contain at least one item', 400);
            return;
        }
        $pdo = $this->db();
        try {
            $pdo->beginTransaction();
            $saleNumber = $this->generateSaleNumber($pdo);
            $userId = $_SESSION['user_id'];
            $validatedItems = $this->validateSaleItems($input['items'], $pdo);
            $totals = $this->calculateSaleTotals($validatedItems, $input);
            $saleId = $this->insertSaleRecord($pdo, $saleNumber, $userId, $totals, $input);
            $this->insertSaleItems($pdo, $saleId, $validatedItems);
            $pdo->commit();
            $this->respondSuccess([
                'sale_id' => $saleId,
                'sale_number' => $saleNumber,
                'total_amount' => $totals['total_amount'],
                'items_count' => count($validatedItems)
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            $this->respondError('Failed to process sale: ' . $e->getMessage(), 500);
        }
    }
    public function getAllSales(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Admin'])) {
            $this->respondError('Administrator access required to view all sales', 403);
            return;
        }
        $pdo = $this->db();
        try {
            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number,
                    s.customer_name,
                    s.customer_phone,
                    s.subtotal,
                    s.tax_amount,
                    s.discount_amount,
                    s.total_amount,
                    s.payment_received,
                    s.change_amount,
                    s.sale_date,
                    u.username as cashier_name,
                    pm.method_name as payment_method,
                    ts.status_name as status,
                    COUNT(si.sale_item_id) as items_count
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.user_id
                LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                LEFT JOIN transaction_statuses ts ON s.status_id = ts.status_id
                LEFT JOIN sale_items si ON s.sale_id = si.sale_id
                GROUP BY s.sale_id
                ORDER BY s.sale_date DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess($sales);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve sales: ' . $e->getMessage(), 500);
        }
    }
    private function generateSaleNumber(PDO $pdo): string
    {
        $year = date('Y');
        $prefix = "SALE{$year}";
        $sql = "SELECT sale_number FROM sales WHERE sale_number LIKE ? ORDER BY sale_number DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(["{$prefix}%"]);
        $lastSale = $stmt->fetchColumn();
        if ($lastSale) {
            $sequence = intval(substr($lastSale, -4)) + 1;
        } else {
            $sequence = 1;
        }
        return $prefix . sprintf('%04d', $sequence);
    }
    private function validateSaleItems(array $items, PDO $pdo): array
    {
        $validatedItems = [];
        foreach ($items as $index => $item) {
            if (!isset($item['product_id']) || !isset($item['quantity'])) {
                throw new Exception("Item at index {$index}: product_id and quantity are required");
            }
            $productId = (int)$item['product_id'];
            $quantity = (float)$item['quantity'];
            if ($quantity <= 0) {
                throw new Exception("Item at index {$index}: quantity must be greater than 0");
            }
            
            // CRITICAL FOOD SAFETY CHECK: Verify product exists and has no expired batches
            $sql = "SELECT 
                        p.product_id, 
                        p.name, 
                        p.price, 
                        p.quantity_on_hand,
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 FROM production_batches pb 
                                WHERE pb.product_id = p.product_id 
                                AND pb.expiry_date < CURDATE()
                            ) THEN TRUE
                            ELSE FALSE
                        END as has_expired_batches
                    FROM products p 
                    WHERE p.product_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$product) {
                throw new Exception("Item at index {$index}: Product not found (ID: {$productId})");
            }
            
            // FOOD SAFETY: Reject sale if product has expired batches
            if ($product['has_expired_batches']) {
                throw new Exception("Item at index {$index}: Product '{$product['name']}' contains EXPIRED batches and cannot be sold. Please contact inventory management.");
            }
            
            if ($product['quantity_on_hand'] < $quantity) {
                throw new Exception("Item at index {$index}: Insufficient stock for {$product['name']}. Available: {$product['quantity_on_hand']}, Requested: {$quantity}");
            }
            $unitPrice = isset($item['unit_price']) ? (float)$item['unit_price'] : (float)$product['price'];
            $discountPercent = isset($item['discount_percent']) ? (float)$item['discount_percent'] : 0;
            $discountAmount = ($unitPrice * $quantity) * ($discountPercent / 100);
            $lineTotal = ($unitPrice * $quantity) - $discountAmount;
            $validatedItems[] = [
                'product_id' => $productId,
                'product_name' => $product['name'],
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'line_total' => $lineTotal,
                'available_stock' => $product['quantity_on_hand']
            ];
        }
        return $validatedItems;
    }
    private function calculateSaleTotals(array $validatedItems, array $input): array
    {
        $subtotal = array_sum(array_column($validatedItems, 'line_total'));
        $discountAmount = array_sum(array_column($validatedItems, 'discount_amount'));
        $additionalDiscount = isset($input['discount_amount']) ? (float)$input['discount_amount'] : 0;
        $totalDiscount = $discountAmount + $additionalDiscount;
        $taxRate = isset($input['tax_rate']) ? (float)$input['tax_rate'] : 0.12;
        $taxableAmount = $subtotal - $additionalDiscount;
        $taxAmount = $taxableAmount * $taxRate;
        $totalAmount = $subtotal - $additionalDiscount + $taxAmount;
        return [
            'subtotal' => $subtotal,
            'tax_rate' => $taxRate,
            'tax_amount' => $taxAmount,
            'discount_amount' => $totalDiscount,
            'total_amount' => $totalAmount
        ];
    }
    private function insertSaleRecord(PDO $pdo, string $saleNumber, int $userId, array $totals, array $input): int
    {
        $statusSql = "SELECT status_id FROM transaction_statuses WHERE status_name = 'Completed' LIMIT 1";
        $statusStmt = $pdo->prepare($statusSql);
        $statusStmt->execute();
        $statusId = $statusStmt->fetchColumn() ?: 1; 
        
        $paymentSql = "SELECT payment_method_id FROM payment_methods WHERE method_name = 'Cash' LIMIT 1";
        $paymentStmt = $pdo->prepare($paymentSql);
        $paymentStmt->execute();
        $paymentMethodId = $paymentStmt->fetchColumn() ?: 1; 
        
        $paymentReceived = isset($input['payment_received']) ? (float)$input['payment_received'] : $totals['total_amount'];
        $changeAmount = $paymentReceived - $totals['total_amount'];
        
        $sql = "
            INSERT INTO sales (
                sale_number, user_id, customer_name, customer_phone, 
                subtotal, tax_rate, tax_amount, discount_amount, total_amount,
                payment_method_id, status_id, payment_received, change_amount, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $saleNumber,
            $userId,
            $input['customer_name'] ?? null,
            $input['customer_phone'] ?? null,
            $totals['subtotal'],
            $totals['tax_rate'],
            $totals['tax_amount'],
            $totals['discount_amount'],
            $totals['total_amount'],
            $paymentMethodId,
            $statusId,
            $paymentReceived,
            $changeAmount,
            $input['notes'] ?? 'POS Sale'
        ]);
        
        return $pdo->lastInsertId();
    }
    private function insertSaleItems(PDO $pdo, int $saleId, array $validatedItems): void
    {
        $statusSql = "SELECT status_id FROM transaction_statuses WHERE status_name = 'Completed' LIMIT 1";
        $statusStmt = $pdo->prepare($statusSql);
        $statusStmt->execute();
        $statusId = $statusStmt->fetchColumn() ?: 1;
        $itemSql = "
            INSERT INTO sale_items (
                sale_id, product_id, quantity, unit_price, 
                discount_percent, discount_amount, line_total, status_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        $stockSql = "
            UPDATE products 
            SET quantity_on_hand = quantity_on_hand - ? 
            WHERE product_id = ?
        ";
        $itemStmt = $pdo->prepare($itemSql);
        $stockStmt = $pdo->prepare($stockSql);
        foreach ($validatedItems as $item) {
            $itemStmt->execute([
                $saleId,
                $item['product_id'],
                $item['quantity'],
                $item['unit_price'],
                $item['discount_percent'],
                $item['discount_amount'],
                $item['line_total'],
                $statusId
            ]);
            $stockStmt->execute([
                $item['quantity'],
                $item['product_id']
            ]);
        }
    }
    public function getTransactionHistory(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required to view transaction history', 401);
            return;
        }
        if (!hasRole(['Sales', 'Cashier', 'Admin'])) {
            $this->respondError('Sales Staff or Administrator access required', 403);
            return;
        }
        $pdo = $this->db();
        try {
            $currentUserId = $_SESSION['user_id'];
            $userRole = $_SESSION['role'];
            
            // Pagination parameters
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(100, max(5, (int)($_GET['limit'] ?? 20))); 
            $offset = ($page - 1) * $limit;
            
            // Simple filters
            $search = trim($_GET['search'] ?? '');
            $dateFrom = $_GET['dateFrom'] ?? $_GET['date_from'] ?? '';
            $dateTo = $_GET['dateTo'] ?? $_GET['date_to'] ?? '';
            $paymentMethodId = $_GET['payment_method_id'] ?? '';
            
            $whereConditions = [];
            $params = [];
            
            // Role-based access control
            if ($userRole === 'Cashier') {
                $whereConditions[] = 's.user_id = ?';
                $params[] = $currentUserId;
            }
            
            // Simple search
            if (!empty($search)) {
                $whereConditions[] = '(s.sale_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)';
                $searchParam = "%{$search}%";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
            }
            
            if (!empty($dateFrom)) {
                $whereConditions[] = 'DATE(s.sale_date) >= ?';
                $params[] = $dateFrom;
            }
            if (!empty($dateTo)) {
                $whereConditions[] = 'DATE(s.sale_date) <= ?';
                $params[] = $dateTo;
            }
            if (!empty($paymentMethodId)) {
                $whereConditions[] = 's.payment_method_id = ?';
                $params[] = $paymentMethodId;
            }
            
            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            
            // Count total records for pagination
            $countSql = "SELECT COUNT(*) as total FROM sales s {$whereClause}";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = $countStmt->fetch()['total'];
            $totalPages = ceil($totalRecords / $limit);
            
            // Simple sales query
            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number,
                    s.customer_name,
                    s.customer_phone,
                    s.customer_email,
                    s.subtotal,
                    s.tax_amount,
                    s.discount_amount,
                    s.total_amount,
                    s.payment_received,
                    s.change_amount,
                    s.notes,
                    s.sale_date,
                    pm.method_name as payment_method,
                    ts.status_name as status,
                    u.username as cashier_name,
                    COUNT(si.sale_item_id) as item_count
                FROM sales s
                LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                LEFT JOIN transaction_statuses ts ON s.status_id = ts.status_id
                LEFT JOIN users u ON s.user_id = u.user_id
                LEFT JOIN sale_items si ON s.sale_id = si.sale_id
                {$whereClause}
                GROUP BY s.sale_id
                ORDER BY s.sale_date DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Simple statistics
            $statsSql = "
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(total_amount) as total_sales,
                    AVG(total_amount) as avg_transaction,
                    SUM(CASE WHEN DATE(sale_date) = CURDATE() THEN total_amount ELSE 0 END) as today_sales
                FROM sales s
                {$whereClause}
            ";
            $statsStmt = $pdo->prepare($statsSql);
            $statsStmt->execute($params);
            $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
            
            $this->respondSuccess([
                'transactions' => $transactions,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_records' => $totalRecords,
                    'per_page' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ],
                'stats' => [
                    'total_transactions' => $stats['total_transactions'],
                    'total_sales' => number_format($stats['total_sales'], 2),
                    'avg_transaction' => number_format($stats['avg_transaction'], 2),
                    'today_sales' => number_format($stats['today_sales'], 2)
                ],
                'filters_applied' => [
                    'search' => $search,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'payment_method_id' => $paymentMethodId
                ]
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve transaction history: ' . $e->getMessage(), 500);
        }
    }
    public function getTransactionDetails(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Sales', 'Cashier', 'Admin'])) {
            $this->respondError('Sales Staff or Administrator access required', 403);
            return;
        }
        $saleId = $_GET['sale_id'] ?? '';
        if (empty($saleId) || !is_numeric($saleId)) {
            $this->respondError('Valid sale_id is required', 400);
            return;
        }
        $pdo = $this->db();
        try {
            $currentUserId = $_SESSION['user_id'];
            $currentUserRole = $_SESSION['role'] ?? '';
            if ($currentUserRole === 'Admin') {
                $saleSql = "
                    SELECT 
                        s.*,
                        pm.method_name as payment_method,
                        ts.status_name as status,
                        u.username as cashier_name
                    FROM sales s
                    LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                    LEFT JOIN transaction_statuses ts ON s.status_id = ts.status_id
                    LEFT JOIN users u ON s.user_id = u.user_id
                    WHERE s.sale_id = ?
                ";
                $stmt = $pdo->prepare($saleSql);
                $stmt->execute([$saleId]);
            } else {
                $saleSql = "
                    SELECT 
                        s.*,
                        pm.method_name as payment_method,
                        ts.status_name as status,
                        u.username as cashier_name
                    FROM sales s
                    LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                    LEFT JOIN transaction_statuses ts ON s.status_id = ts.status_id
                    LEFT JOIN users u ON s.user_id = u.user_id
                    WHERE s.sale_id = ? AND s.user_id = ?
                ";
                $stmt = $pdo->prepare($saleSql);
                $stmt->execute([$saleId, $currentUserId]);
            }
            $sale = $stmt->fetch();
            if (!$sale) {
                $this->respondError('Transaction not found or access denied', 404);
                return;
            }
            $itemsSql = "
                SELECT 
                    si.*,
                    p.name as product_name,
                    p.barcode as product_barcode
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.product_id
                WHERE si.sale_id = ?
                ORDER BY si.sale_item_id
            ";
            $stmt = $pdo->prepare($itemsSql);
            $stmt->execute([$saleId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess([
                'sale' => $sale,
                'items' => $items
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve transaction details: ' . $e->getMessage(), 500);
        }
    }
    public function getReceiptData(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Sales', 'Cashier', 'Admin'])) {
            $this->respondError('Sales Staff or Administrator access required', 403);
            return;
        }
        $saleId = $_GET['sale_id'] ?? '';
        if (empty($saleId) || !is_numeric($saleId)) {
            $this->respondError('Valid sale_id is required', 400);
            return;
        }
        $pdo = $this->db();
        try {
            $currentUserId = $_SESSION['user_id'];
            $currentUserRole = $_SESSION['role'] ?? '';
            if ($currentUserRole === 'Admin') {
                $saleSql = "
                    SELECT 
                        s.sale_id,
                        s.sale_number,
                        s.customer_name,
                        s.customer_phone,
                        s.subtotal,
                        s.tax_rate,
                        s.tax_amount,
                        s.discount_amount,
                        s.total_amount,
                        s.payment_received,
                        s.change_amount,
                        s.sale_date,
                        pm.method_name as payment_method,
                        u.username as cashier_name
                    FROM sales s
                    LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                    LEFT JOIN users u ON s.user_id = u.user_id
                    WHERE s.sale_id = ?
                ";
                $stmt = $pdo->prepare($saleSql);
                $stmt->execute([$saleId]);
            } else {
                $saleSql = "
                    SELECT 
                        s.sale_id,
                        s.sale_number,
                        s.customer_name,
                        s.customer_phone,
                        s.subtotal,
                        s.tax_rate,
                        s.tax_amount,
                        s.discount_amount,
                        s.total_amount,
                        s.payment_received,
                        s.change_amount,
                        s.sale_date,
                        pm.method_name as payment_method,
                        u.username as cashier_name
                    FROM sales s
                    LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                    LEFT JOIN users u ON s.user_id = u.user_id
                    WHERE s.sale_id = ? AND s.user_id = ?
                ";
                $stmt = $pdo->prepare($saleSql);
                $stmt->execute([$saleId, $currentUserId]);
            }
            $sale = $stmt->fetch();
            if (!$sale) {
                $this->respondError('Transaction not found or access denied', 404);
                return;
            }
            $itemsSql = "
                SELECT 
                    si.quantity,
                    si.unit_price,
                    si.discount_amount,
                    si.line_total,
                    p.name as product_name,
                    p.barcode as product_barcode
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.product_id
                WHERE si.sale_id = ?
                ORDER BY si.sale_item_id
            ";
            $stmt = $pdo->prepare($itemsSql);
            $stmt->execute([$saleId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $receiptData = [
                'sale_number' => $sale['sale_number'],
                'sale_date' => date('Y-m-d', strtotime($sale['sale_date'])),
                'sale_time' => date('H:i:s', strtotime($sale['sale_date'])),
                'customer_name' => $sale['customer_name'] ?? '',
                'customer_phone' => $sale['customer_phone'] ?? '',
                'cashier_name' => $sale['cashier_name'],
                'payment_method' => $sale['payment_method'],
                'subtotal' => '₱' . number_format($sale['subtotal'], 2),
                'tax_rate' => ($sale['tax_rate'] * 100) . '%',
                'tax_amount' => '₱' . number_format($sale['tax_amount'], 2),
                'discount_amount' => '₱' . number_format($sale['discount_amount'], 2),
                'total_amount' => '₱' . number_format($sale['total_amount'], 2),
                'payment_received' => '₱' . number_format($sale['payment_received'], 2),
                'change_amount' => '₱' . number_format($sale['change_amount'], 2),
                'items' => array_map(function($item) {
                    return [
                        'product_name' => $item['product_name'],
                        'product_barcode' => $item['product_barcode'],
                        'quantity' => $item['quantity'],
                        'unit_price' => '₱' . number_format($item['unit_price'], 2),
                        'discount_amount' => '₱' . number_format($item['discount_amount'], 2),
                        'line_total' => '₱' . number_format($item['line_total'], 2)
                    ];
                }, $items)
            ];
            $this->respondSuccess($receiptData);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve receipt data: ' . $e->getMessage(), 500);
        }
    }
    public function getTodayStats(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Sales', 'Cashier', 'Sales Officer', 'Sales Staff', 'Admin'])) {
            $this->respondError('Access denied', 403);
            return;
        }
        try {
            $pdo = $this->db();
            $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
            $sql = "
                SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(total_amount), 0) as total_sales,
                    COALESCE(SUM(items_sold), 0) as items_sold
                FROM (
                    SELECT 
                        s.sale_id,
                        s.total_amount,
                        COUNT(si.sale_item_id) as items_sold
                    FROM sales s
                    LEFT JOIN sale_items si ON s.sale_id = si.sale_id
                    WHERE DATE(s.sale_date) = ?
                    GROUP BY s.sale_id
                ) as daily_stats
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$date]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            $this->respondSuccess([
                'date' => $date,
                'transaction_count' => (int)$stats['transaction_count'],
                'total_sales' => (float)$stats['total_sales'],
                'items_sold' => (int)$stats['items_sold']
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve today\'s statistics: ' . $e->getMessage(), 500);
        }
    }

    public function getPendingOrders(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Sales', 'Sales Officer'])) {
            $this->respondError('Sales Officer or Administrator access required', 403);
            return;
        }

        try {
            $pdo = $this->db();
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number as order_number,
                    s.sale_date as order_date,
                    s.total_amount,
                    cos.status_name as status,
                    COALESCE(c.business_name, s.customer_name, 'Walk-in Customer') as customer_name,
                    c.customer_id,
                    DATE(s.created_at) as created_at
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN customer_order_status cos ON s.status_id = cos.status_id
                WHERE s.status_id = 1
                ORDER BY s.sale_date DESC
                LIMIT ?
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$limit]);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess($orders);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve pending orders: ' . $e->getMessage(), 500);
        }
    }

    public function getPendingOrdersCount(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Sales', 'Sales Officer', 'Sales Staff'])) {
            $this->respondError('Sales Officer or Administrator access required', 403);
            return;
        }

        try {
            $pdo = $this->db();

            $sql = "
                SELECT COUNT(*) as count
                FROM sales
                WHERE status_id = 1
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->respond([
                'success' => true,
                'count' => (int)$result['count']
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve pending orders count: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve a pending customer order (Sales Officer function)
     */
    public function approveOrder(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Sales', 'Sales Officer'])) {
            $this->respondError('Sales Officer or Administrator access required', 403);
            return;
        }

        $orderId = $input['order_id'] ?? null;
        $notes = $input['notes'] ?? null;

        if (!$orderId) {
            $this->respondError('Order ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();

            // Verify order exists and is pending
            $stmt = $pdo->prepare("
                SELECT s.sale_id, s.sale_number, s.status_id, cos.status_name
                FROM sales s
                JOIN customer_order_status cos ON s.status_id = cos.status_id
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $pdo->rollBack();
                $this->respondError('Order not found', 404);
                return;
            }

            if ($order['status_id'] != 1) {
                $pdo->rollBack();
                $this->respondError("Order is already {$order['status_name']} and cannot be approved", 400);
                return;
            }

            // Get "approved" status ID from customer_order_status
            $stmt = $pdo->query("SELECT status_id FROM customer_order_status WHERE status_name = 'approved' LIMIT 1");
            $approvedStatus = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$approvedStatus) {
                $pdo->rollBack();
                $this->respondError('Approved status not found in system', 500);
                return;
            }

            // Update order to Approved
            $stmt = $pdo->prepare("
                UPDATE sales 
                SET status_id = ?, 
                    notes = CONCAT(COALESCE(notes, ''), '\n[APPROVED by ', ?, ' on ', NOW(), '] ', COALESCE(?, ''))
                WHERE sale_id = ?
            ");
            $stmt->execute([
                $approvedStatus['status_id'],
                $_SESSION['username'] ?? 'Sales Officer',
                $notes,
                $orderId
            ]);

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Order approved successfully',
                'order_id' => $orderId,
                'order_number' => $order['sale_number'],
                'new_status' => 'Approved'
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Failed to approve order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject a pending customer order (Sales Officer function)
     */
    public function rejectOrder(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Sales', 'Sales Officer'])) {
            $this->respondError('Sales Officer or Administrator access required', 403);
            return;
        }

        $orderId = $input['order_id'] ?? null;
        $reason = $input['reason'] ?? 'No reason provided';

        if (!$orderId) {
            $this->respondError('Order ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();

            // Verify order exists and is pending
            $stmt = $pdo->prepare("
                SELECT s.sale_id, s.sale_number, s.status_id, cos.status_name
                FROM sales s
                JOIN customer_order_status cos ON s.status_id = cos.status_id
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $pdo->rollBack();
                $this->respondError('Order not found', 404);
                return;
            }

            if ($order['status_id'] != 1) {
                $pdo->rollBack();
                $this->respondError("Order is already {$order['status_name']} and cannot be rejected", 400);
                return;
            }

            // Get "rejected" status ID from customer_order_status
            $stmt = $pdo->query("SELECT status_id FROM customer_order_status WHERE status_name = 'rejected' LIMIT 1");
            $rejectedStatus = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$rejectedStatus) {
                $pdo->rollBack();
                $this->respondError('Rejected status not found in system', 500);
                return;
            }

            // Update order to Rejected with rejection reason
            $stmt = $pdo->prepare("
                UPDATE sales 
                SET status_id = ?, 
                    notes = CONCAT(COALESCE(notes, ''), '\n[REJECTED by ', ?, ' on ', NOW(), '] Reason: ', ?)
                WHERE sale_id = ?
            ");
            $stmt->execute([
                $rejectedStatus['status_id'],
                $_SESSION['username'] ?? 'Sales Officer',
                $reason,
                $orderId
            ]);

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Order rejected successfully',
                'order_id' => $orderId,
                'order_number' => $order['sale_number'],
                'new_status' => 'Cancelled',
                'reason' => $reason
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Failed to reject order: ' . $e->getMessage(), 500);
        }
    }

    public function getApprovedOrders(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Warehouse Staff'])) {
            $this->respondError('Warehouse access required', 403);
            return;
        }

        try {
            $pdo = $this->db();
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;

            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number as order_number,
                    s.sale_date as order_date,
                    s.total_amount,
                    cos.status_name as status,
                    COALESCE(c.business_name, s.customer_name, 'Walk-in Customer') as customer_name,
                    c.customer_id,
                    s.delivery_required,
                    s.delivery_address,
                    s.delivery_date,
                    DATE(s.created_at) as created_at
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN customer_order_status cos ON s.status_id = cos.status_id
                WHERE s.status_id = 2
                ORDER BY s.sale_date DESC
                LIMIT ?
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$limit]);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess($orders);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve approved orders: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get order details for dispatch with FIFO batch information
     * Shows which batch must be used for each product (oldest first)
     */
    public function getOrderForDispatch(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Warehouse Staff'])) {
            $this->respondError('Warehouse access required', 403);
            return;
        }

        $orderId = $input['order_id'] ?? $_GET['order_id'] ?? null;

        if (!$orderId) {
            $this->respondError('Order ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            // Get order details
            $stmt = $pdo->prepare("
                SELECT s.sale_id, s.sale_number, s.sale_date, s.total_amount, s.status_id,
                       cos.status_name,
                       COALESCE(c.business_name, s.customer_name, 'Walk-in Customer') as customer_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN customer_order_status cos ON s.status_id = cos.status_id
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->respondError('Order not found', 404);
                return;
            }

            // Only approved orders can be dispatched (status_id = 2 in customer_order_status)
            if ($order['status_id'] != 2) {
                $this->respondError('Only approved orders can be dispatched', 400);
                return;
            }

            // Get order items with FIFO batch information
            $stmt = $pdo->prepare("
                SELECT 
                    si.sale_item_id,
                    si.product_id,
                    p.sku,
                    p.name as product_name,
                    si.quantity as quantity_needed,
                    si.unit_price,
                    si.line_total,
                    
                    -- Get oldest available batch for this product (FIFO) - EXCLUDE EXPIRED
                    -- Handle both recipe-based and manual batches
                    (SELECT pb.batch_id
                     FROM production_batches pb
                     LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                     WHERE (pr.finished_product_id = si.product_id OR pb.product_id = si.product_id)
                       AND pb.status = 'Completed'
                       AND pb.quantity_remaining > 0
                       AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                     ORDER BY pb.production_date ASC, pb.batch_id ASC
                     LIMIT 1
                    ) as required_batch_id,
                    
                    (SELECT pb.batch_number
                     FROM production_batches pb
                     LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                     WHERE (pr.finished_product_id = si.product_id OR pb.product_id = si.product_id)
                       AND pb.status = 'Completed'
                       AND pb.quantity_remaining > 0
                       AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                     ORDER BY pb.production_date ASC, pb.batch_id ASC
                     LIMIT 1
                    ) as required_batch_number,
                    
                    (SELECT pb.production_date
                     FROM production_batches pb
                     LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                     WHERE (pr.finished_product_id = si.product_id OR pb.product_id = si.product_id)
                       AND pb.status = 'Completed'
                       AND pb.quantity_remaining > 0
                       AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                     ORDER BY pb.production_date ASC, pb.batch_id ASC
                     LIMIT 1
                    ) as batch_production_date,
                    
                    (SELECT pb.quantity_remaining
                     FROM production_batches pb
                     LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                     WHERE (pr.finished_product_id = si.product_id OR pb.product_id = si.product_id)
                       AND pb.status = 'Completed'
                       AND pb.quantity_remaining > 0
                       AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                     ORDER BY pb.production_date ASC, pb.batch_id ASC
                     LIMIT 1
                    ) as batch_available_quantity
                    
                FROM sale_items si
                JOIN products p ON si.product_id = p.product_id
                WHERE si.sale_id = ?
                ORDER BY si.sale_item_id
            ");
            $stmt->execute([$orderId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Check if all products have available batches
            $itemsWithoutBatches = [];
            foreach ($items as &$item) {
                if (!$item['required_batch_id']) {
                    $itemsWithoutBatches[] = $item['product_name'];
                    $item['fifo_status'] = 'NO_BATCH_AVAILABLE';
                } else if ($item['batch_available_quantity'] < $item['quantity_needed']) {
                    $item['fifo_status'] = 'INSUFFICIENT_QUANTITY';
                } else {
                    $item['fifo_status'] = 'OK';
                }
            }

            if (count($itemsWithoutBatches) > 0) {
                $this->respondError(
                    'Some products do not have available batches: ' . implode(', ', $itemsWithoutBatches),
                    400,
                    ['items_without_batches' => $itemsWithoutBatches]
                );
                return;
            }

            $this->respondSuccess([
                'order' => $order,
                'items' => $items
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to retrieve order for dispatch: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Validate that scanned batch is the correct FIFO batch for the product
     */
    public function validateBatchForDispatch(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        $productId = $input['product_id'] ?? null;
        $scannedBatch = $input['scanned_batch'] ?? null;

        if (!$productId || !$scannedBatch) {
            $this->respondError('Product ID and scanned batch are required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            // Get the oldest available batch for this product (FIFO) - EXCLUDE EXPIRED
            // Handle both recipe-based and manual batches
            $stmt = $pdo->prepare("
                SELECT pb.batch_id, pb.batch_number, pb.production_date, pb.expiry_date, pb.quantity_remaining
                FROM production_batches pb
                LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                WHERE (pr.finished_product_id = ? OR pb.product_id = ?)
                  AND pb.status = 'Completed'
                  AND pb.quantity_remaining > 0
                  AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                ORDER BY pb.production_date ASC, pb.batch_id ASC
                LIMIT 1
            ");
            $stmt->execute([$productId, $productId]);
            $correctBatch = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$correctBatch) {
                $this->respondError('No available batches for this product', 404);
                return;
            }

            // Check if scanned batch matches the oldest batch
            $isValid = (strtoupper(trim($scannedBatch)) === strtoupper(trim($correctBatch['batch_number'])));

            if ($isValid) {
                $this->respondSuccess([
                    'valid' => true,
                    'message' => 'Correct batch! FIFO validated.',
                    'batch_id' => $correctBatch['batch_id'],
                    'batch_number' => $correctBatch['batch_number'],
                    'production_date' => $correctBatch['production_date'],
                    'expiry_date' => $correctBatch['expiry_date']
                ]);
            } else {
                $this->respond([
                    'success' => false,
                    'valid' => false,
                    'message' => 'FIFO VIOLATION! Wrong batch scanned.',
                    'scanned_batch' => $scannedBatch,
                    'correct_batch' => $correctBatch['batch_number'],
                    'correct_batch_date' => $correctBatch['production_date'],
                    'correct_expiry_date' => $correctBatch['expiry_date'],
                    'error' => 'You must use the oldest batch first (FIFO rule)'
                ], 400);
            }

        } catch (Exception $e) {
            $this->respondError('Batch validation failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Complete dispatch of an order with FIFO-validated batches
     * Updates inventory and batch quantities
     */
    public function completeDispatch(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Warehouse Staff'])) {
            $this->respondError('Warehouse access required', 403);
            return;
        }

        $orderId = $input['order_id'] ?? null;
        $batchAssignments = $input['batch_assignments'] ?? []; // array of {sale_item_id, batch_id, quantity}

        if (!$orderId || empty($batchAssignments)) {
            $this->respondError('Order ID and batch assignments are required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $user = getCurrentUser();
            $userId = $user['user_id'] ?? null;

            // Start transaction
            $pdo->beginTransaction();

            // Verify order is approved
            $stmt = $pdo->prepare("SELECT status_id FROM sales WHERE sale_id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order || $order['status_id'] != 2) {
                throw new Exception('Order must be approved before dispatch');
            }

            // Process each item dispatch
            foreach ($batchAssignments as $assignment) {
                $saleItemId = $assignment['sale_item_id'];
                $batchId = $assignment['batch_id'];
                $quantity = $assignment['quantity'];

                // Update sale_item with batch_id
                $stmt = $pdo->prepare("
                    UPDATE sale_items 
                    SET batch_id = ? 
                    WHERE sale_item_id = ?
                ");
                $stmt->execute([$batchId, $saleItemId]);

                // Decrease batch quantity_remaining
                $stmt = $pdo->prepare("
                    UPDATE production_batches 
                    SET quantity_remaining = quantity_remaining - ? 
                    WHERE batch_id = ? AND quantity_remaining >= ?
                ");
                $stmt->execute([$quantity, $batchId, $quantity]);

                if ($stmt->rowCount() === 0) {
                    throw new Exception("Insufficient quantity in batch ID $batchId");
                }

                // Decrease product inventory
                $stmt = $pdo->prepare("
                    SELECT product_id FROM sale_items WHERE sale_item_id = ?
                ");
                $stmt->execute([$saleItemId]);
                $item = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($item) {
                    $stmt = $pdo->prepare("
                        UPDATE products 
                        SET quantity_on_hand = quantity_on_hand - ? 
                        WHERE product_id = ?
                    ");
                    $stmt->execute([$quantity, $item['product_id']]);
                }
            }

            // Get customer payment terms to calculate due date
            $stmt = $pdo->prepare("
                SELECT c.payment_term_id, pt.days_to_pay, s.sale_number
                FROM sales s
                JOIN customers c ON s.customer_id = c.customer_id
                JOIN payment_terms pt ON c.payment_term_id = pt.payment_term_id
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$orderId]);
            $paymentInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Calculate payment due date based on customer's payment terms
            $daysToAdd = $paymentInfo['days_to_pay'] ?? 0;
            $paymentDueDate = date('Y-m-d', strtotime("+{$daysToAdd} days"));
            
            // Generate invoice number
            $invoiceNumber = 'INV-' . date('Ym') . '-' . str_pad($orderId, 4, '0', STR_PAD_LEFT);

            // Update sales order status to Completed with payment tracking
            $stmt = $pdo->prepare("
                UPDATE sales 
                SET status_id = (SELECT status_id FROM customer_order_status WHERE status_name = 'completed' LIMIT 1),
                    dispatch_date = NOW(),
                    dispatched_by = ?,
                    payment_status = 'unpaid',
                    payment_due_date = ?,
                    invoice_number = ?
                WHERE sale_id = ?
            ");
            $stmt->execute([$userId, $paymentDueDate, $invoiceNumber, $orderId]);

            // Commit transaction
            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Order dispatched successfully with FIFO compliance',
                'order_id' => $orderId,
                'dispatched_by' => $user['full_name'] ?? $user['username']
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
                        $this->respondError('Dispatch failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get count of orders completed today
     */
    public function getCompletedToday(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Warehouse Staff'])) {
            $this->respondError('Warehouse access required', 403);
            return;
        }

        try {
            $pdo = $this->db();

            $sql = "
                SELECT COUNT(*) as count
                FROM sales s
                WHERE s.status_id = (SELECT status_id FROM customer_order_status WHERE status_name = 'completed' LIMIT 1)
                AND DATE(s.dispatch_date) = CURDATE()
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->respond([
                'success' => true,
                'count' => (int)$result['count']
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve completed count: ' . $e->getMessage(), 500);
        }
    }
}

if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'SalesAPI.php') {
    $api = new SalesAPI();
    $api->route();
}