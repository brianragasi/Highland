<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
class ReturnsAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        if (!$this->requireSalesOfficerInventoryOrAdminAuth()) {
            return;
        }
        $method = $this->getMethod();
        $input = $this->getJsonInput() ?? [];
        $operation = $this->getOperation();
        $this->handle(function() use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'POST':
                    $this->createReturn($input);
                    break;
                case 'GET':
                    $this->getAllReturns();
                    break;
                case 'getReturnDetails':
                    $this->getReturnDetails();
                    break;
                case 'getReturnHistory':
                    $this->getReturnHistory();
                    break;
                case 'approveReturn':
                    $this->approveReturn();
                    break;
                case 'rejectReturn':
                    $this->rejectReturn();
                    break;
                case 'getEligibleSales':
                    $this->getEligibleSales();
                    break;
                case 'findSaleByReceipt':
                    $this->findSaleByReceipt();
                    break;
                default:
                    $this->respondError('Unsupported operation', 400, ['operation' => $operation ?: $method]);
                    break;
            }
        });
    }
    public function createReturn(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required to process returns', 401);
            return;
        }
        if (!hasRole(['Sales Officer', 'Admin', 'Warehouse Staff'])) {
            $this->respondError('Sales Staff or Administrator access required to process returns', 403);
            return;
        }
        $required = ['sale_id', 'items', 'reason'];
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
            $sale = $this->validateSaleForReturn($pdo, $input['sale_id']);
            if (!$sale) {
                throw new Exception("Sale not found or not eligible for return");
            }
            $returnNumber = $this->generateReturnNumber($pdo);
            $userId = $_SESSION['user_id'];
            $validatedItems = $this->validateReturnItems($input['items'], $input['sale_id'], $pdo);
            $totalReturnAmount = array_sum(array_column($validatedItems, 'return_amount'));
            $needsApproval = $this->needsManagerApproval($totalReturnAmount, $sale);
            $statusId = $needsApproval ? $this->getStatusId($pdo, 'Return Pending') : $this->getStatusId($pdo, 'Return Approved');
            $returnId = $this->insertReturnRecord($pdo, $returnNumber, $input['sale_id'], $userId, $totalReturnAmount, $input['reason'], $statusId);
            $this->insertReturnItems($pdo, $returnId, $validatedItems);
            if (!$needsApproval) {
                $this->processInventoryAdjustments($pdo, $returnId, $validatedItems, $userId);
            }
            $pdo->commit();
            $this->respondSuccess([
                'return_id' => $returnId,
                'return_number' => $returnNumber,
                'total_return_amount' => $totalReturnAmount,
                'needs_approval' => $needsApproval,
                'items_count' => count($validatedItems),
                'status' => $needsApproval ? 'Pending Approval' : 'Approved'
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            $this->respondError('Failed to process return: ' . $e->getMessage(), 500);
        }
    }
    public function getAllReturns(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Admin'])) {
            $this->respondError('Administrator access required to view all returns', 403);
            return;
        }
        $pdo = $this->db();
        try {
            $sql = "
                SELECT 
                    r.return_id,
                    r.return_number,
                    r.total_return_amount,
                    r.reason,
                    r.return_date,
                    s.sale_number,
                    s.customer_name,
                    s.customer_phone,
                    u.username as processed_by,
                    approver.username as approved_by,
                    ts.status_name as status,
                    COUNT(ri.return_item_id) as items_count
                FROM returns r
                LEFT JOIN sales s ON r.sale_id = s.sale_id
                LEFT JOIN users u ON r.user_id = u.user_id
                LEFT JOIN users approver ON r.approved_by = approver.user_id
                LEFT JOIN transaction_statuses ts ON r.status_id = ts.status_id
                LEFT JOIN return_items ri ON r.return_id = ri.return_id
                GROUP BY r.return_id
                ORDER BY r.return_date DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $returns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess($returns);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve returns: ' . $e->getMessage(), 500);
        }
    }
    public function getReturnDetails(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Sales Officer', 'Admin', 'Warehouse Staff'])) {
            $this->respondError('Sales Officer, Warehouse Staff or Administrator access required', 403);
            return;
        }
        $returnId = $_GET['return_id'] ?? '';
        if (empty($returnId) || !is_numeric($returnId)) {
            $this->respondError('Valid return_id is required', 400);
            return;
        }
        $pdo = $this->db();
        try {
            $sql = "
                SELECT 
                    r.*,
                    s.sale_number,
                    s.customer_name,
                    s.customer_phone,
                    s.sale_date,
                    u.username as processed_by,
                    approver.username as approved_by,
                    ts.status_name as status
                FROM returns r
                LEFT JOIN sales s ON r.sale_id = s.sale_id
                LEFT JOIN users u ON r.user_id = u.user_id
                LEFT JOIN users approver ON r.approved_by = approver.user_id
                LEFT JOIN transaction_statuses ts ON r.status_id = ts.status_id
                WHERE r.return_id = ?
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$returnId]);
            $return = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$return) {
                $this->respondError('Return not found', 404);
                return;
            }
            $itemsSql = "
                SELECT 
                    ri.*,
                    p.name as product_name,
                    p.barcode as product_barcode,
                    si.unit_price as original_unit_price,
                    si.quantity as original_quantity
                FROM return_items ri
                LEFT JOIN products p ON ri.product_id = p.product_id
                LEFT JOIN sale_items si ON ri.sale_item_id = si.sale_item_id
                WHERE ri.return_id = ?
                ORDER BY ri.return_item_id
            ";
            $stmt = $pdo->prepare($itemsSql);
            $stmt->execute([$returnId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess([
                'return' => $return,
                'items' => $items
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve return details: ' . $e->getMessage(), 500);
        }
    }
    public function getReturnHistory(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Sales Officer', 'Admin', 'Warehouse Staff'])) {
            $this->respondError('Sales Officer, Warehouse Staff or Administrator access required', 403);
            return;
        }
        $pdo = $this->db();
        try {
            $currentUserId = $_SESSION['user_id'];
            $userRole = $_SESSION['role'];
            $page = max(1, (int)($_GET['page'] ?? 1));
            $limit = min(100, max(5, (int)($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;
            $search = trim($_GET['search'] ?? '');
            $dateFrom = $_GET['dateFrom'] ?? $_GET['date_from'] ?? '';
            $dateTo = $_GET['dateTo'] ?? $_GET['date_to'] ?? '';
            $status = $_GET['status'] ?? '';
            $whereConditions = [];
            $params = [];
            if ($userRole === 'Sales Officer') {
                $whereConditions[] = 'r.user_id = ?';
                $params[] = $currentUserId;
            }
            if (!empty($search)) {
                $whereConditions[] = '(r.return_number LIKE ? OR s.sale_number LIKE ? OR s.customer_name LIKE ?)';
                $searchParam = "%{$search}%";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
            }
            if (!empty($dateFrom)) {
                $whereConditions[] = 'DATE(r.return_date) >= ?';
                $params[] = $dateFrom;
            }
            if (!empty($dateTo)) {
                $whereConditions[] = 'DATE(r.return_date) <= ?';
                $params[] = $dateTo;
            }
            if (!empty($status)) {
                $whereConditions[] = 'ts.status_name = ?';
                $params[] = $status;
            }
            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            $countSql = "
                SELECT COUNT(*) as total 
                FROM returns r
                LEFT JOIN sales s ON r.sale_id = s.sale_id
                LEFT JOIN transaction_statuses ts ON r.status_id = ts.status_id
                {$whereClause}
            ";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalRecords = $countStmt->fetch()['total'];
            $totalPages = ceil($totalRecords / $limit);
            $sql = "
                SELECT 
                    r.return_id,
                    r.return_number,
                    r.total_return_amount,
                    r.reason,
                    r.return_date,
                    s.sale_number,
                    s.customer_name,
                    ts.status_name as status,
                    COUNT(ri.return_item_id) as items_count
                FROM returns r
                LEFT JOIN sales s ON r.sale_id = s.sale_id
                LEFT JOIN transaction_statuses ts ON r.status_id = ts.status_id
                LEFT JOIN return_items ri ON r.return_id = ri.return_id
                {$whereClause}
                GROUP BY r.return_id
                ORDER BY r.return_date DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $returns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess([
                'returns' => $returns,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_records' => $totalRecords,
                    'per_page' => $limit,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve return history: ' . $e->getMessage(), 500);
        }
    }
    public function approveReturn(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Admin'])) {
            $this->respondError('Administrator access required to approve returns', 403);
            return;
        }
        $returnId = $_GET['return_id'] ?? $_POST['return_id'] ?? '';
        if (empty($returnId) || !is_numeric($returnId)) {
            $this->respondError('Valid return_id is required', 400);
            return;
        }
        $pdo = $this->db();
        try {
            $pdo->beginTransaction();
            $sql = "SELECT * FROM returns WHERE return_id = ? AND status_id = ?";
            $pendingStatusId = $this->getStatusId($pdo, 'Return Pending');
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$returnId, $pendingStatusId]);
            $return = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$return) {
                throw new Exception("Return not found or not in pending status");
            }
            $approvedStatusId = $this->getStatusId($pdo, 'Return Approved');
            $updateSql = "UPDATE returns SET status_id = ?, approved_by = ? WHERE return_id = ?";
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([$approvedStatusId, $_SESSION['user_id'], $returnId]);
            $itemsSql = "
                SELECT ri.*, p.name as product_name
                FROM return_items ri
                LEFT JOIN products p ON ri.product_id = p.product_id
                WHERE ri.return_id = ?
            ";
            $stmt = $pdo->prepare($itemsSql);
            $stmt->execute([$returnId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->processInventoryAdjustments($pdo, $returnId, $items, $_SESSION['user_id']);
            $pdo->commit();
            $this->respondSuccess([
                'return_id' => $returnId,
                'status' => 'Approved',
                'approved_by' => $_SESSION['username'] ?? 'Admin'
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            $this->respondError('Failed to approve return: ' . $e->getMessage(), 500);
        }
    }
    public function rejectReturn(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Admin'])) {
            $this->respondError('Administrator access required to reject returns', 403);
            return;
        }
        $returnId = $_GET['return_id'] ?? $_POST['return_id'] ?? '';
        if (empty($returnId) || !is_numeric($returnId)) {
            $this->respondError('Valid return_id is required', 400);
            return;
        }
        $pdo = $this->db();
        try {
            $sql = "SELECT * FROM returns WHERE return_id = ? AND status_id = ?";
            $pendingStatusId = $this->getStatusId($pdo, 'Return Pending');
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$returnId, $pendingStatusId]);
            $return = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$return) {
                $this->respondError("Return not found or not in pending status", 404);
                return;
            }
            $rejectedStatusId = $this->getStatusId($pdo, 'Return Rejected');
            $updateSql = "UPDATE returns SET status_id = ?, approved_by = ? WHERE return_id = ?";
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([$rejectedStatusId, $_SESSION['user_id'], $returnId]);
            $this->respondSuccess([
                'return_id' => $returnId,
                'status' => 'Rejected',
                'rejected_by' => $_SESSION['username'] ?? 'Admin'
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to reject return: ' . $e->getMessage(), 500);
        }
    }
    public function getEligibleSales(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Sales Officer', 'Admin', 'Warehouse Staff'])) {
            $this->respondError('Sales Officer, Warehouse Staff or Administrator access required', 403);
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
                    s.total_amount,
                    s.sale_date,
                    COUNT(si.sale_item_id) as items_count,
                    COALESCE(SUM(ri.return_amount), 0) as returned_amount
                FROM sales s
                LEFT JOIN sale_items si ON s.sale_id = si.sale_id
                LEFT JOIN return_items ri ON si.sale_item_id = ri.sale_item_id
                LEFT JOIN returns r ON ri.return_id = r.return_id AND r.status_id IN (
                    SELECT status_id FROM transaction_statuses WHERE status_name IN ('Return Approved', 'Return Completed')
                )
                WHERE s.status_id = (SELECT status_id FROM transaction_statuses WHERE status_name = 'Completed')
                AND s.sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY s.sale_id
                HAVING (s.total_amount - returned_amount) > 0
                ORDER BY s.sale_date DESC
                LIMIT 50
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess($sales);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve eligible sales: ' . $e->getMessage(), 500);
        }
    }
    public function findSaleByReceipt(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }
        if (!hasRole(['Cashier', 'Admin', 'Warehouse Staff'])) {
            $this->respondError('Cashier, Warehouse Staff or Administrator access required', 403);
            return;
        }
        $receiptNumber = $_GET['receipt_number'] ?? '';
        if (empty($receiptNumber)) {
            $this->respondError('Receipt number is required', 400);
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
                    s.total_amount,
                    s.sale_date,
                    u.username as cashier_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.user_id
                WHERE s.sale_number = ?
                AND s.status_id = (SELECT status_id FROM transaction_statuses WHERE status_name = 'Completed')
                AND s.sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$receiptNumber]);
            $sale = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$sale) {
                $this->respondError('Sale not found or not eligible for return', 404);
                return;
            }
            $itemsSql = "
                SELECT 
                    si.sale_item_id,
                    si.product_id,
                    si.quantity,
                    si.unit_price,
                    si.line_total,
                    p.name as product_name,
                    p.barcode,
                    COALESCE(returned.returned_quantity, 0) as returned_quantity,
                    (si.quantity - COALESCE(returned.returned_quantity, 0)) as returnable_quantity
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.product_id
                LEFT JOIN (
                    SELECT 
                        ri.sale_item_id,
                        SUM(ri.returned_quantity) as returned_quantity
                    FROM return_items ri
                    LEFT JOIN returns r ON ri.return_id = r.return_id
                    WHERE r.status_id IN (
                        SELECT status_id FROM transaction_statuses 
                        WHERE status_name IN ('Return Approved', 'Return Completed')
                    )
                    GROUP BY ri.sale_item_id
                ) returned ON si.sale_item_id = returned.sale_item_id
                WHERE si.sale_id = ?
                AND (si.quantity - COALESCE(returned.returned_quantity, 0)) > 0
                ORDER BY si.sale_item_id
            ";
            $stmt = $pdo->prepare($itemsSql);
            $stmt->execute([$sale['sale_id']]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->respondSuccess([
                'sale' => $sale,
                'items' => $items
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to find sale: ' . $e->getMessage(), 500);
        }
    }
    private function generateReturnNumber(PDO $pdo): string
    {
        $year = date('Y');
        $prefix = "RET{$year}";
        $sql = "SELECT return_number FROM returns WHERE return_number LIKE ? ORDER BY return_number DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(["{$prefix}%"]);
        $lastReturn = $stmt->fetchColumn();
        if ($lastReturn) {
            $sequence = intval(substr($lastReturn, -4)) + 1;
        } else {
            $sequence = 1;
        }
        return $prefix . sprintf('%04d', $sequence);
    }
    private function validateSaleForReturn(PDO $pdo, int $saleId): ?array
    {
        $sql = "
            SELECT s.*, ts.status_name 
            FROM sales s 
            LEFT JOIN transaction_statuses ts ON s.status_id = ts.status_id
            WHERE s.sale_id = ? 
            AND ts.status_name = 'Completed'
            AND s.sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$saleId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    private function validateReturnItems(array $items, int $saleId, PDO $pdo): array
    {
        $validatedItems = [];
        foreach ($items as $index => $item) {
            if (!isset($item['sale_item_id']) || !isset($item['returned_quantity'])) {
                throw new Exception("Item at index {$index}: sale_item_id and returned_quantity are required");
            }
            $saleItemId = (int)$item['sale_item_id'];
            $returnedQuantity = (float)$item['returned_quantity'];
            $condition = $item['condition_type'] ?? 'Good';
            $restockEligible = isset($item['restock_eligible']) ? (bool)$item['restock_eligible'] : true;
            if ($returnedQuantity <= 0) {
                throw new Exception("Item at index {$index}: returned_quantity must be greater than 0");
            }
            $sql = "
                SELECT si.*, p.name as product_name
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.product_id
                WHERE si.sale_item_id = ? AND si.sale_id = ?
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$saleItemId, $saleId]);
            $saleItem = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$saleItem) {
                throw new Exception("Item at index {$index}: Sale item not found");
            }
            $returnedSql = "
                SELECT COALESCE(SUM(ri.returned_quantity), 0) as already_returned
                FROM return_items ri
                LEFT JOIN returns r ON ri.return_id = r.return_id
                WHERE ri.sale_item_id = ?
                AND r.status_id IN (
                    SELECT status_id FROM transaction_statuses 
                    WHERE status_name IN ('Return Approved', 'Return Completed')
                )
            ";
            $stmt = $pdo->prepare($returnedSql);
            $stmt->execute([$saleItemId]);
            $alreadyReturned = $stmt->fetchColumn();
            $availableQuantity = $saleItem['quantity'] - $alreadyReturned;
            if ($returnedQuantity > $availableQuantity) {
                throw new Exception("Item at index {$index}: Cannot return {$returnedQuantity} units. Only {$availableQuantity} units available for return");
            }
            $returnAmount = ($saleItem['unit_price'] * $returnedQuantity);
            $validatedItems[] = [
                'sale_item_id' => $saleItemId,
                'product_id' => $saleItem['product_id'],
                'product_name' => $saleItem['product_name'],
                'returned_quantity' => $returnedQuantity,
                'unit_price' => $saleItem['unit_price'],
                'return_amount' => $returnAmount,
                'condition_type' => $condition,
                'restock_eligible' => $restockEligible && ($condition === 'Good')
            ];
        }
        return $validatedItems;
    }
    private function needsManagerApproval(float $totalAmount, array $sale): bool
    {
        return $totalAmount >= 100.00;
    }
    private function insertReturnRecord(PDO $pdo, string $returnNumber, int $saleId, int $userId, float $totalAmount, string $reason, int $statusId): int
    {
        $sql = "
            INSERT INTO returns (return_number, sale_id, user_id, total_return_amount, reason, status_id, return_date)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $returnNumber,
            $saleId,
            $userId,
            $totalAmount,
            $reason,
            $statusId
        ]);
        return $pdo->lastInsertId();
    }
    private function insertReturnItems(PDO $pdo, int $returnId, array $validatedItems): void
    {
        $sql = "
            INSERT INTO return_items (return_id, sale_item_id, product_id, returned_quantity, unit_price, return_amount, condition_type, restock_eligible)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        $stmt = $pdo->prepare($sql);
        foreach ($validatedItems as $item) {
            $stmt->execute([
                $returnId,
                $item['sale_item_id'],
                $item['product_id'],
                $item['returned_quantity'],
                $item['unit_price'],
                $item['return_amount'],
                $item['condition_type'],
                $item['restock_eligible'] ? 1 : 0
            ]);
        }
    }
    private function processInventoryAdjustments(PDO $pdo, int $returnId, array $items, int $userId): void
    {
        foreach ($items as $item) {
            if ($item['restock_eligible']) {
                $updateSql = "UPDATE products SET quantity_on_hand = quantity_on_hand + ? WHERE product_id = ?";
                $stmt = $pdo->prepare($updateSql);
                $stmt->execute([$item['returned_quantity'], $item['product_id']]);
                $adjustmentNumber = $this->generateAdjustmentNumber($pdo);
                $adjustmentSql = "
                    INSERT INTO inventory_adjustments (
                        adjustment_number, product_id, user_id, adjustment_type, quantity_before, quantity_change, 
                        quantity_after, unit_cost, reason, reference_id, reference_type, approved_by
                    ) VALUES (?, ?, ?, 'Return', 
                        (SELECT quantity_on_hand - ? FROM products WHERE product_id = ?), 
                        ?, 
                        (SELECT quantity_on_hand FROM products WHERE product_id = ?), 
                        ?, CONCAT('Customer Return - ', ?), ?, 'Return', ?)
                ";
                $stmt = $pdo->prepare($adjustmentSql);
                $stmt->execute([
                    $adjustmentNumber,
                    $item['product_id'],
                    $userId,
                    $item['returned_quantity'],
                    $item['product_id'],
                    $item['returned_quantity'],
                    $item['product_id'],
                    $item['unit_price'],
                    $item['product_name'],
                    $returnId,
                    $userId
                ]);
            }
        }
    }
    private function generateAdjustmentNumber(PDO $pdo): string
    {
        $year = date('Y');
        $prefix = "ADJ{$year}";
        $sql = "SELECT adjustment_number FROM inventory_adjustments WHERE adjustment_number LIKE ? ORDER BY adjustment_number DESC LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(["{$prefix}%"]);
        $lastAdjustment = $stmt->fetchColumn();
        if ($lastAdjustment) {
            $sequence = intval(substr($lastAdjustment, -4)) + 1;
        } else {
            $sequence = 1;
        }
        return $prefix . sprintf('%04d', $sequence);
    }
    private function getStatusId(PDO $pdo, string $statusName): int
    {
        $sql = "SELECT status_id FROM transaction_statuses WHERE status_name = ? LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$statusName]);
        $statusId = $stmt->fetchColumn();
        if (!$statusId) {
            throw new Exception("Status '{$statusName}' not found");
        }
        return $statusId;
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'ReturnsAPI.php') {
    $api = new ReturnsAPI();
    $api->route();
}
?>