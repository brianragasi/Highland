<?php
/**
 * Highland Fresh Sales Orders API
 * Allows Sales Officers to create and manage wholesale orders on behalf of customers
 * 
 * This is different from CustomerOrdersAPI:
 * - CustomerOrdersAPI: Customers create their own orders
 * - SalesOrdersAPI: Sales Officers create orders for customers
 * 
 * Version: 1.0
 * Date: October 20, 2025
 * Related: RBAC-02 Implementation - Sales Officer Role
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';

class SalesOrdersAPI extends BaseAPI
{
    protected function getAllowedRoles(): array
    {
        // Sales Staff/Officers and Admins can access this API
        // Sales Staff and Sales Officers can create and approve orders
        return ['Admin', 'Sales Officer', 'Sales Staff'];
    }

    public function route(): void
    {
        // Verify authentication
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        // Verify role
        $user = getCurrentUser();
        $userRole = $user['role'] ?? null;
        
        if (!in_array($userRole, $this->getAllowedRoles())) {
            $this->respondError('Unauthorized access. Sales Officer role required.', 403);
            return;
        }

        $operation = $this->getOperation() ?: 'getOrders';

        // For GET requests, use query parameters; for POST, use JSON body
        if ($this->getMethod() === 'GET') {
            $input = $_GET;
        } else {
            $input = $this->getJsonInput() ?? [];
        }

        $this->handle(function () use ($operation, $input) {
            switch ($operation) {
                case 'getDashboardStats':
                    $this->getDashboardStats();
                    break;

                case 'getCustomers':
                    $this->getCustomers($input);
                    break;

                case 'getProducts':
                    $this->getProducts($input);
                    break;

                case 'createOrder':
                case 'submitOrder':
                    $this->createOrder($input);
                    break;

                case 'getOrders':
                case 'listOrders':
                    $this->getOrders($input);
                    break;

                case 'getOrder':
                case 'getOrderDetails':
                    $this->getOrderDetails($input);
                    break;

                case 'updateOrder':
                    $this->updateOrder($input);
                    break;

                case 'cancelOrder':
                    $this->cancelOrder($input);
                    break;

                case 'approveOrder':
                    $this->approveOrder($input);
                    break;

                case 'rejectOrder':
                    $this->rejectOrder($input);
                    break;

                // User 3 FIFO Gap Implementations
                case 'previewFifoBatches':
                    $this->previewFifoBatches($input);
                    break;

                case 'reserveBatches':
                    $this->reserveBatches($input);
                    break;

                case 'releaseReservations':
                    $this->releaseReservations($input);
                    break;

                case 'getDeliveryReceipt':
                    $this->getDeliveryReceipt($input);
                    break;

                case 'getReceipt':
                    $this->getReceipt($input);
                    break;

                case 'createWalkInSale':
                    $this->createWalkInSale($input);
                    break;

                default:
                    $this->respondError('Unsupported operation', 400, ['operation' => $operation]);
                    break;
            }
        });
    }

    /**
     * Get dashboard statistics for Sales Officer
     */
    private function getDashboardStats(): void
    {
        try {
            // Pending orders count
            $stmt = $this->db()->prepare("
                SELECT COUNT(*) as count 
                FROM sales 
                WHERE status_id = 1
            ");
            $stmt->execute();
            $pendingOrders = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Today's orders count
            $stmt = $this->db()->prepare("
                SELECT COUNT(*) as count 
                FROM sales 
                WHERE DATE(sale_date) = CURDATE()
            ");
            $stmt->execute();
            $todayOrders = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Today's revenue
            $stmt = $this->db()->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as revenue 
                FROM sales 
                WHERE DATE(sale_date) = CURDATE()
            ");
            $stmt->execute();
            $todayRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['revenue'];

            // Total active customers
            $stmt = $this->db()->prepare("
                SELECT COUNT(*) as count 
                FROM customers 
                WHERE is_active = 1
            ");
            $stmt->execute();
            $totalCustomers = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            $this->respondSuccess([
                'stats' => [
                    'pending_orders' => $pendingOrders,
                    'today_orders' => $todayOrders,
                    'today_revenue' => $todayRevenue,
                    'total_customers' => $totalCustomers
                ]
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to load dashboard stats: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get list of customers for dropdown
     */
    private function getCustomers(array $input): void
    {
        try {
            $stmt = $this->db()->prepare("
                SELECT 
                    c.customer_id,
                    c.customer_number,
                    c.business_name,
                    COALESCE(ct.type_code, 'unknown') as customer_type,
                    c.credit_limit,
                    c.contact_person,
                    c.phone,
                    c.email
                FROM customers c
                LEFT JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
                WHERE c.is_active = 1
                ORDER BY c.business_name ASC
            ");
            $stmt->execute();
            $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess([
                'customers' => $customers,
                'count' => count($customers)
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to load customers: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get list of products for order form
     * GAP FIX: Filters out products where all remaining stock expires within 24 hours
     * GAP FIX: Shows actual available quantity from production batches (FIFO-friendly)
     */
    private function getProducts(array $input): void
    {
        try {
            $search = $input['search'] ?? '';
            
            // Products with available stock that expires AFTER 24 hours from now
            // Uses production_batches to get actual available inventory
            $sql = "
                SELECT 
                    p.product_id,
                    p.sku,
                    p.name as product_name,
                    p.description,
                    p.price as unit_price,
                    p.quantity_on_hand,
                    u.unit_name,
                    u.unit_abbreviation as unit_symbol,
                    c.category_name,
                    COALESCE(batch_info.available_quantity, 0) as available_from_batches,
                    batch_info.earliest_expiry,
                    CASE 
                        WHEN batch_info.days_until_expiry <= 3 THEN 'critical'
                        WHEN batch_info.days_until_expiry <= 7 THEN 'warning'
                        ELSE 'ok'
                    END as expiry_status
                FROM products p
                LEFT JOIN units_of_measure u ON p.unit_id = u.unit_id
                LEFT JOIN product_categories c ON p.category_id = c.category_id
                LEFT JOIN (
                    SELECT 
                        COALESCE(pr.finished_product_id, pb.product_id) as product_id,
                        SUM(pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) as available_quantity,
                        MIN(pb.expiry_date) as earliest_expiry,
                        MIN(DATEDIFF(pb.expiry_date, CURDATE())) as days_until_expiry
                    FROM production_batches pb
                    LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                    WHERE pb.status = 'Completed'
                      AND pb.quantity_remaining > 0
                      AND (pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) > 0
                      AND (pb.expiry_date IS NULL OR pb.expiry_date > DATE_ADD(CURDATE(), INTERVAL 1 DAY))
                    GROUP BY COALESCE(pr.finished_product_id, pb.product_id)
                ) batch_info ON p.product_id = batch_info.product_id
                WHERE p.is_active = 1
                  AND (batch_info.available_quantity > 0 OR p.quantity_on_hand > 0)
            ";

            $params = [];

            if (!empty($search)) {
                $sql .= " AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }

            $sql .= " ORDER BY p.name ASC LIMIT 50";

            $stmt = $this->db()->prepare($sql);
            $stmt->execute($params);

            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess([
                'products' => $products,
                'count' => count($products),
                'filter_applied' => 'near_expiry_24h_excluded'
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to load products: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new order on behalf of a customer
     */
    private function createOrder(array $input): void
    {
        $missing = $this->requireParams($input, ['customer_id', 'items']);
        if ($missing) {
            $this->respondError('Customer and order items are required', 400);
            return;
        }

        $customerId = $input['customer_id'];
        $items = $input['items'];
        $deliveryDate = $input['delivery_date'] ?? null;
        $paymentTerms = $input['payment_terms'] ?? null;
        $notes = $input['notes'] ?? null;

        if (!is_array($items) || empty($items)) {
            $this->respondError('Order must contain at least one item', 400);
            return;
        }

        try {
            // Begin transaction
            $this->db()->beginTransaction();

            // Get Sales Officer user ID
            $user = getCurrentUser();
            $userId = $user['id'] ?? null;
            
            if (!$userId) {
                throw new Exception('User ID not found in session');
            }

            // Validate customer exists
            $stmt = $this->db()->prepare("SELECT customer_id, business_name FROM customers WHERE customer_id = ? AND is_active = 1");
            $stmt->execute([$customerId]);
            $customer = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$customer) {
                throw new Exception('Invalid customer');
            }

            // Validate all products and calculate total
            $orderItems = [];
            $totalAmount = 0;

            foreach ($items as $item) {
                if (empty($item['product_id']) || empty($item['quantity'])) {
                    throw new Exception('Invalid item data');
                }

                $stmt = $this->db()->prepare("
                    SELECT product_id, name as product_name, sku, price as unit_price, quantity_on_hand 
                    FROM products 
                    WHERE product_id = ? AND is_active = 1
                ");
                $stmt->execute([$item['product_id']]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    throw new Exception('Product not found: ' . $item['product_id']);
                }

                $quantity = floatval($item['quantity']);
                $unitPrice = isset($item['unit_price']) ? floatval($item['unit_price']) : floatval($product['unit_price']);
                $lineTotal = $quantity * $unitPrice;

                $orderItems[] = [
                    'product_id' => $product['product_id'],
                    'product_name' => $product['product_name'],
                    'sku' => $product['sku'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal
                ];

                $totalAmount += $lineTotal;
            }

            // Generate sale number
            $stmt = $this->db()->query("SELECT MAX(sale_id) as max_id FROM sales");
            $maxId = $stmt->fetch(PDO::FETCH_ASSOC)['max_id'] ?? 0;
            $newId = $maxId + 1;
            $saleNumber = 'SO-' . date('Ym') . '-' . str_pad($newId, 4, '0', STR_PAD_LEFT);

            // Calculate subtotal and tax (12% VAT)
            $subtotal = $totalAmount;
            $taxAmount = $subtotal * 0.12;
            $totalAmountWithTax = $subtotal + $taxAmount;

            // Insert sale record with status "Pending Approval" (status_id = 1)
            $stmt = $this->db()->prepare("
                INSERT INTO sales (
                    sale_number, 
                    customer_id, 
                    user_id,
                    subtotal,
                    tax_amount,
                    total_amount, 
                    status_id,
                    payment_method_id,
                    payment_status,
                    sale_date
                ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'unpaid', NOW())
            ");
            $stmt->execute([
                $saleNumber,
                $customerId,
                $userId,
                $subtotal,
                $taxAmount,
                $totalAmountWithTax,
                $paymentTerms
            ]);

            $saleId = $this->db()->lastInsertId();

            // Insert sale items
            $stmt = $this->db()->prepare("
                INSERT INTO sale_items (
                    sale_id, 
                    product_id, 
                    quantity, 
                    unit_price, 
                    line_total,
                    status_id
                ) VALUES (?, ?, ?, ?, ?, 1)
            ");

            foreach ($orderItems as $item) {
                $stmt->execute([
                    $saleId,
                    $item['product_id'],
                    $item['quantity'],
                    $item['unit_price'],
                    $item['line_total']
                ]);
            }

            // Commit transaction
            $this->db()->commit();

            $this->respondSuccess([
                'message' => 'Order created successfully',
                'sale_id' => $saleId,
                'sale_number' => $saleNumber,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmountWithTax,
                'customer' => $customer['business_name'],
                'status' => 'Pending Approval'
            ]);

        } catch (Exception $e) {
            $this->db()->rollBack();
            $this->respondError('Failed to create order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get list of orders
     */
    private function getOrders(array $input): void
    {
        try {
            $limit = isset($input['limit']) ? intval($input['limit']) : 50;
            $offset = isset($input['offset']) ? intval($input['offset']) : 0;
            $statusId = $input['status_id'] ?? null;
            $dateFrom = $input['date_from'] ?? null;
            $dateTo = $input['date_to'] ?? null;

            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number,
                    s.sale_date,
                    s.total_amount,
                    c.customer_id,
                    c.business_name as customer_name,
                    ct.type_code as customer_type,
                    cos.status_name as status,
                    cos.status_id,
                    u.username as created_by
                FROM sales s
                INNER JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
                LEFT JOIN customer_order_status cos ON s.status_id = cos.status_id
                LEFT JOIN users u ON s.user_id = u.user_id
                WHERE 1=1
            ";

            $params = [];

            if ($statusId) {
                $sql .= " AND s.status_id = ?";
                $params[] = $statusId;
            }

            if ($dateFrom) {
                $sql .= " AND DATE(s.sale_date) >= ?";
                $params[] = $dateFrom;
            }

            if ($dateTo) {
                $sql .= " AND DATE(s.sale_date) <= ?";
                $params[] = $dateTo;
            }

            $sql .= " ORDER BY s.sale_date DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $this->db()->prepare($sql);
            $stmt->execute($params);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM sales s WHERE 1=1";
            $countParams = [];

            if ($statusId) {
                $countSql .= " AND s.status_id = ?";
                $countParams[] = $statusId;
            }

            if ($dateFrom) {
                $countSql .= " AND DATE(s.sale_date) >= ?";
                $countParams[] = $dateFrom;
            }

            if ($dateTo) {
                $countSql .= " AND DATE(s.sale_date) <= ?";
                $countParams[] = $dateTo;
            }

            $stmt = $this->db()->prepare($countSql);
            $stmt->execute($countParams);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $this->respondSuccess([
                'orders' => $orders,
                'pagination' => [
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => ($offset + $limit) < $total
                ]
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to load orders: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get order details
     */
    private function getOrderDetails(array $input): void
    {
        $saleId = $input['sale_id'] ?? null;

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            // Get order header
            $stmt = $this->db()->prepare("
                SELECT 
                    s.sale_id,
                    s.sale_number,
                    s.sale_date,
                    s.total_amount,
                    c.customer_id,
                    c.business_name as customer_name,
                    ct.type_code as customer_type,
                    c.contact_person,
                    c.phone,
                    c.email,
                    cos.status_name as status,
                    u.username as created_by,
                    u.first_name,
                    u.last_name
                FROM sales s
                INNER JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN customer_types ct ON c.customer_type_id = ct.customer_type_id
                LEFT JOIN customer_order_status cos ON s.status_id = cos.status_id
                LEFT JOIN users u ON s.user_id = u.user_id
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->respondError('Order not found', 404);
                return;
            }

            // Get order items
            $stmt = $this->db()->prepare("
                SELECT 
                    si.sale_item_id,
                    si.product_id,
                    p.sku,
                    p.name as product_name,
                    si.quantity,
                    si.unit_price,
                    si.line_total,
                    u.unit_name,
                    u.unit_abbreviation as unit_symbol
                FROM sale_items si
                INNER JOIN products p ON si.product_id = p.product_id
                LEFT JOIN units_of_measure u ON p.unit_id = u.unit_id
                WHERE si.sale_id = ?
                ORDER BY si.sale_item_id ASC
            ");
            $stmt->execute([$saleId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $order['items'] = $items;
            $order['items_count'] = count($items);

            $this->respondSuccess(['order' => $order]);

        } catch (Exception $e) {
            $this->respondError('Failed to load order details: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update an existing order (only if status is Pending)
     */
    private function updateOrder(array $input): void
    {
        // Implementation for updating orders
        // Only allow updates for pending orders
        $this->respondError('Update order functionality not yet implemented', 501);
    }

    /**
     * Cancel an order
     */
    private function cancelOrder(array $input): void
    {
        $saleId = $input['sale_id'] ?? null;
        $reason = $input['reason'] ?? 'Cancelled by Sales Officer';

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            // Check if order exists and is pending
            $stmt = $this->db()->prepare("SELECT sale_id, status_id FROM sales WHERE sale_id = ?");
            $stmt->execute([$saleId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->respondError('Order not found', 404);
                return;
            }

            if ($order['status_id'] != 1) {
                $this->respondError('Only pending orders can be cancelled', 400);
                return;
            }

            // Update status to cancelled (assuming status_id 5 = Cancelled)
            $stmt = $this->db()->prepare("UPDATE sales SET status_id = 5 WHERE sale_id = ?");
            $stmt->execute([$saleId]);

            $this->respondSuccess([
                'message' => 'Order cancelled successfully',
                'sale_id' => $saleId
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to cancel order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve a pending sales order
     * Sales Officer or Admin
     */
    private function approveOrder(array $input): void
    {
        $saleId = $input['sale_id'] ?? null;

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            $user = getCurrentUser();
            $userId = $user['id'] ?? null;

            // Verify user is Sales Staff/Officer or Admin
            if (!in_array($user['role'], ['Sales Officer', 'Sales Staff', 'Admin'])) {
                $this->respondError('Only Sales Staff/Officers or Admins can approve orders', 403);
                return;
            }

            // Check if order exists and is pending
            $stmt = $this->db()->prepare("
                SELECT sale_id, status_id, sale_number 
                FROM sales 
                WHERE sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->respondError('Order not found', 404);
                return;
            }

            // Status 1 = Pending Approval
            if ($order['status_id'] != 1) {
                $this->respondError('Only pending orders can be approved', 400);
                return;
            }

            // Update status to Approved (status_id = 2)
            $stmt = $this->db()->prepare("
                UPDATE sales 
                SET status_id = 2,
                    approved_by = ?,
                    approved_at = NOW()
                WHERE sale_id = ?
            ");
            $stmt->execute([$userId, $saleId]);

            $this->respondSuccess([
                'message' => 'Order approved successfully',
                'sale_id' => $saleId,
                'sale_number' => $order['sale_number'],
                'approved_by' => $user['full_name'] ?? $user['username']
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to approve order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject a pending sales order
     * Sales Officer or Admin
     */
    private function rejectOrder(array $input): void
    {
        $saleId = $input['sale_id'] ?? null;
        $rejectionReason = $input['rejection_reason'] ?? null;

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        if (!$rejectionReason) {
            $this->respondError('Rejection reason is required', 400);
            return;
        }

        try {
            $user = getCurrentUser();
            $userId = $user['id'] ?? null;

            // Verify user is Sales Staff/Officer or Admin
            if (!in_array($user['role'], ['Sales Officer', 'Sales Staff', 'Admin'])) {
                $this->respondError('Only Sales Staff/Officers or Admins can reject orders', 403);
                return;
            }

            // Check if order exists and is pending
            $stmt = $this->db()->prepare("
                SELECT sale_id, status_id, sale_number 
                FROM sales 
                WHERE sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->respondError('Order not found', 404);
                return;
            }

            // Status 1 = Pending Approval
            if ($order['status_id'] != 1) {
                $this->respondError('Only pending orders can be rejected', 400);
                return;
            }

            // Update status to Rejected (status_id = 6, or use Cancelled = 5)
            // Assuming status_id 5 = Cancelled/Rejected
            $stmt = $this->db()->prepare("
                UPDATE sales 
                SET status_id = 5,
                    rejection_reason = ?,
                    rejected_by = ?,
                    rejected_at = NOW()
                WHERE sale_id = ?
            ");
            $stmt->execute([$rejectionReason, $userId, $saleId]);

            $this->respondSuccess([
                'message' => 'Order rejected successfully',
                'sale_id' => $saleId,
                'sale_number' => $order['sale_number'],
                'rejection_reason' => $rejectionReason,
                'rejected_by' => $user['full_name'] ?? $user['username']
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to reject order: ' . $e->getMessage(), 500);
        }
    }

    // ========================================
    // USER 3 FIFO GAP IMPLEMENTATIONS
    // ========================================

    /**
     * 3-GAP-1: Preview FIFO batch allocation for order items
     * Shows which batches will be used BEFORE order creation
     */
    private function previewFifoBatches(array $input): void
    {
        $items = $input['items'] ?? [];

        if (empty($items)) {
            $this->respondError('Items are required for FIFO preview', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $allocations = [];
            $insufficientStock = [];

            foreach ($items as $item) {
                $productId = $item['product_id'] ?? null;
                $quantityNeeded = floatval($item['quantity'] ?? 0);

                if (!$productId || $quantityNeeded <= 0) continue;

                // Get product info
                $stmt = $pdo->prepare("SELECT name, sku FROM products WHERE product_id = ?");
                $stmt->execute([$productId]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) continue;

                // Get available batches in FIFO order (oldest first)
                // Exclude already reserved quantities
                $stmt = $pdo->prepare("
                    SELECT 
                        pb.batch_id,
                        pb.batch_number,
                        pb.batch_number as batch_code,
                        pb.production_date,
                        pb.expiry_date,
                        pb.quantity_remaining,
                        COALESCE(pb.reserved_quantity, 0) as reserved_quantity,
                        (pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) as available_quantity,
                        DATEDIFF(pb.expiry_date, CURDATE()) as days_until_expiry
                    FROM production_batches pb
                    LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                    WHERE (pr.finished_product_id = ? OR pb.product_id = ?)
                      AND pb.status = 'Completed'
                      AND pb.quantity_remaining > 0
                      AND (pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) > 0
                      AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                    ORDER BY pb.production_date ASC, pb.batch_id ASC
                ");
                $stmt->execute([$productId, $productId]);
                $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Allocate from batches (FIFO)
                $remaining = $quantityNeeded;
                $batchAllocation = [];
                $totalAvailable = 0;

                foreach ($batches as $batch) {
                    $available = floatval($batch['available_quantity']);
                    $totalAvailable += $available;

                    if ($remaining <= 0) break;

                    $toAllocate = min($remaining, $available);
                    if ($toAllocate > 0) {
                        $expiryStatus = 'ok';
                        $daysUntilExpiry = $batch['days_until_expiry'];
                        
                        if ($daysUntilExpiry !== null) {
                            if ($daysUntilExpiry <= 3) {
                                $expiryStatus = 'critical';
                            } elseif ($daysUntilExpiry <= 7) {
                                $expiryStatus = 'warning';
                            }
                        }

                        $batchAllocation[] = [
                            'batch_id' => $batch['batch_id'],
                            'batch_number' => $batch['batch_number'],
                            'batch_code' => $batch['batch_code'],
                            'production_date' => $batch['production_date'],
                            'expiry_date' => $batch['expiry_date'],
                            'days_until_expiry' => $daysUntilExpiry,
                            'expiry_status' => $expiryStatus,
                            'available_quantity' => $available,
                            'allocated_quantity' => $toAllocate,
                            'will_deplete' => ($toAllocate >= $available)
                        ];
                        $remaining -= $toAllocate;
                    }
                }

                $productAllocation = [
                    'product_id' => $productId,
                    'product_name' => $product['name'],
                    'sku' => $product['sku'],
                    'quantity_needed' => $quantityNeeded,
                    'total_available' => $totalAvailable,
                    'quantity_allocated' => $quantityNeeded - $remaining,
                    'quantity_short' => max(0, $remaining),
                    'sufficient_stock' => ($remaining <= 0),
                    'batches' => $batchAllocation
                ];

                $allocations[] = $productAllocation;

                if ($remaining > 0) {
                    $insufficientStock[] = [
                        'product_name' => $product['name'],
                        'needed' => $quantityNeeded,
                        'available' => $totalAvailable,
                        'shortage' => $remaining
                    ];
                }
            }

            $this->respondSuccess([
                'allocations' => $allocations,
                'has_insufficient_stock' => count($insufficientStock) > 0,
                'insufficient_items' => $insufficientStock,
                'fifo_compliant' => true,
                'message' => count($insufficientStock) > 0 
                    ? 'Warning: Some items have insufficient stock' 
                    : 'All items can be fulfilled from available batches (FIFO)'
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to preview FIFO batches: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 3-GAP-3: Reserve batches for an order (batch locking)
     * Called after order creation to lock inventory
     */
    private function reserveBatches(array $input): void
    {
        $saleId = $input['sale_id'] ?? null;
        $expiryHours = $input['expiry_hours'] ?? 48; // Default 48 hour reservation

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();

            $user = getCurrentUser();
            $userId = $user['id'] ?? null;

            // Get order items
            $stmt = $pdo->prepare("
                SELECT si.sale_item_id, si.product_id, si.quantity
                FROM sale_items si
                WHERE si.sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $reservations = [];
            $expiryTime = date('Y-m-d H:i:s', strtotime("+{$expiryHours} hours"));

            foreach ($items as $item) {
                $productId = $item['product_id'];
                $saleItemId = $item['sale_item_id'];
                $remaining = floatval($item['quantity']);

                // Get available batches in FIFO order
                $stmt = $pdo->prepare("
                    SELECT 
                        pb.batch_id,
                        pb.batch_number,
                        pb.quantity_remaining,
                        COALESCE(pb.reserved_quantity, 0) as reserved_quantity,
                        (pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) as available
                    FROM production_batches pb
                    LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                    WHERE (pr.finished_product_id = ? OR pb.product_id = ?)
                      AND pb.status = 'Completed'
                      AND pb.quantity_remaining > 0
                      AND (pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) > 0
                      AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                    ORDER BY pb.production_date ASC, pb.batch_id ASC
                    FOR UPDATE
                ");
                $stmt->execute([$productId, $productId]);
                $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($batches as $batch) {
                    if ($remaining <= 0) break;

                    $available = floatval($batch['available']);
                    $toReserve = min($remaining, $available);

                    if ($toReserve > 0) {
                        // Create reservation record
                        $stmt = $pdo->prepare("
                            INSERT INTO batch_reservations 
                            (batch_id, sale_id, sale_item_id, product_id, reserved_quantity, 
                             reservation_status, reserved_by, expiry_time)
                            VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
                        ");
                        $stmt->execute([
                            $batch['batch_id'],
                            $saleId,
                            $saleItemId,
                            $productId,
                            $toReserve,
                            $userId,
                            $expiryTime
                        ]);

                        // Update batch reserved quantity
                        $stmt = $pdo->prepare("
                            UPDATE production_batches 
                            SET reserved_quantity = COALESCE(reserved_quantity, 0) + ?
                            WHERE batch_id = ?
                        ");
                        $stmt->execute([$toReserve, $batch['batch_id']]);

                        $reservations[] = [
                            'batch_id' => $batch['batch_id'],
                            'batch_number' => $batch['batch_number'],
                            'reserved_quantity' => $toReserve
                        ];

                        $remaining -= $toReserve;
                    }
                }

                if ($remaining > 0) {
                    $pdo->rollBack();
                    $this->respondError("Insufficient stock for product ID: $productId. Shortage: $remaining", 400);
                    return;
                }
            }

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Batches reserved successfully',
                'sale_id' => $saleId,
                'reservations' => $reservations,
                'expiry_time' => $expiryTime
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Failed to reserve batches: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 3-GAP-3: Release reservations for a cancelled/rejected order
     */
    private function releaseReservations(array $input): void
    {
        $saleId = $input['sale_id'] ?? null;

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();

            // Get active reservations for this order
            $stmt = $pdo->prepare("
                SELECT reservation_id, batch_id, reserved_quantity
                FROM batch_reservations
                WHERE sale_id = ? AND reservation_status = 'active'
            ");
            $stmt->execute([$saleId]);
            $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($reservations as $res) {
                // Release reservation
                $stmt = $pdo->prepare("
                    UPDATE batch_reservations 
                    SET reservation_status = 'released', released_at = NOW()
                    WHERE reservation_id = ?
                ");
                $stmt->execute([$res['reservation_id']]);

                // Return quantity to batch
                $stmt = $pdo->prepare("
                    UPDATE production_batches 
                    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - ?)
                    WHERE batch_id = ?
                ");
                $stmt->execute([$res['reserved_quantity'], $res['batch_id']]);
            }

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Reservations released successfully',
                'sale_id' => $saleId,
                'released_count' => count($reservations)
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Failed to release reservations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 3-GAP-2: Generate Delivery Receipt with batch information
     */
    private function getDeliveryReceipt(array $input): void
    {
        $saleId = $input['sale_id'] ?? $_GET['sale_id'] ?? null;

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            // Get order details
            $stmt = $pdo->prepare("
                SELECT 
                    s.sale_id, s.sale_number, s.sale_date, s.total_amount, s.status_id,
                    s.invoice_number, s.dispatch_date, s.payment_due_date,
                    COALESCE(c.business_name, s.customer_name, 'Walk-in Customer') as customer_name,
                    c.contact_person, c.phone, c.address,
                    ct.city_name,
                    cos.status_name,
                    CONCAT(u.first_name, ' ', u.last_name) as sales_officer,
                    CONCAT(u2.first_name, ' ', u2.last_name) as dispatched_by_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN cities ct ON c.city_id = ct.city_id
                LEFT JOIN customer_order_status cos ON s.status_id = cos.status_id
                LEFT JOIN users u ON s.user_id = u.user_id
                LEFT JOIN users u2 ON s.dispatched_by = u2.user_id
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                $this->respondError('Order not found', 404);
                return;
            }

            // Get order items with batch information
            $stmt = $pdo->prepare("
                SELECT 
                    si.sale_item_id,
                    si.product_id,
                    p.name as product_name,
                    p.sku,
                    si.quantity,
                    si.unit_price,
                    si.line_total,
                    si.batch_id,
                    pb.batch_number,
                    pb.batch_number as batch_code,
                    pb.production_date,
                    pb.expiry_date
                FROM sale_items si
                JOIN products p ON si.product_id = p.product_id
                LEFT JOIN production_batches pb ON si.batch_id = pb.batch_id
                WHERE si.sale_id = ?
                ORDER BY si.sale_item_id
            ");
            $stmt->execute([$saleId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get batch reservations if not yet dispatched
            $batchInfo = [];
            if (!$order['dispatch_date']) {
                $stmt = $pdo->prepare("
                    SELECT 
                        br.sale_item_id,
                        br.batch_id,
                        pb.batch_number,
                        pb.batch_number as batch_code,
                        br.reserved_quantity,
                        pb.production_date,
                        pb.expiry_date
                    FROM batch_reservations br
                    JOIN production_batches pb ON br.batch_id = pb.batch_id
                    WHERE br.sale_id = ? AND br.reservation_status = 'active'
                    ORDER BY br.sale_item_id, pb.production_date ASC
                ");
                $stmt->execute([$saleId]);
                $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($reservations as $res) {
                    $itemId = $res['sale_item_id'];
                    if (!isset($batchInfo[$itemId])) {
                        $batchInfo[$itemId] = [];
                    }
                    $batchInfo[$itemId][] = $res;
                }
            }

            // Generate DR number if not exists
            $drNumber = 'DR-' . date('Ym', strtotime($order['sale_date'])) . '-' . str_pad($saleId, 4, '0', STR_PAD_LEFT);

            $this->respondSuccess([
                'delivery_receipt' => [
                    'dr_number' => $drNumber,
                    'sale_number' => $order['sale_number'],
                    'invoice_number' => $order['invoice_number'],
                    'order_date' => $order['sale_date'],
                    'dispatch_date' => $order['dispatch_date'],
                    'status' => $order['status_name'],
                    'customer' => [
                        'name' => $order['customer_name'],
                        'contact_person' => $order['contact_person'],
                        'phone' => $order['phone'],
                        'address' => $order['address'],
                        'city' => $order['city_name']
                    ],
                    'sales_officer' => $order['sales_officer'],
                    'dispatched_by' => $order['dispatched_by_name'],
                    'payment_due_date' => $order['payment_due_date'],
                    'total_amount' => $order['total_amount']
                ],
                'items' => array_map(function($item) use ($batchInfo) {
                    $itemBatches = [];
                    
                    // If dispatched, use the actual batch_id
                    if ($item['batch_id']) {
                        $itemBatches[] = [
                            'batch_code' => $item['batch_code'],
                            'batch_number' => $item['batch_number'],
                            'quantity' => $item['quantity'],
                            'production_date' => $item['production_date'],
                            'expiry_date' => $item['expiry_date']
                        ];
                    } 
                    // Otherwise use reserved batches
                    elseif (isset($batchInfo[$item['sale_item_id']])) {
                        foreach ($batchInfo[$item['sale_item_id']] as $res) {
                            $itemBatches[] = [
                                'batch_code' => $res['batch_code'],
                                'batch_number' => $res['batch_number'],
                                'quantity' => $res['reserved_quantity'],
                                'production_date' => $res['production_date'],
                                'expiry_date' => $res['expiry_date']
                            ];
                        }
                    }

                    return [
                        'product_name' => $item['product_name'],
                        'sku' => $item['sku'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'line_total' => $item['line_total'],
                        'batches' => $itemBatches
                    ];
                }, $items)
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to generate delivery receipt: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 3-GAP-2: Generate simple receipt (walk-in sales)
     */
    private function getReceipt(array $input): void
    {
        $saleId = $input['sale_id'] ?? $_GET['sale_id'] ?? null;

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            // Get sale details
            $stmt = $pdo->prepare("
                SELECT 
                    s.sale_id, s.sale_number, s.sale_date, 
                    s.subtotal, s.tax_amount, s.total_amount,
                    s.payment_method_id, s.payment_status,
                    pm.method_name as payment_method,
                    COALESCE(c.business_name, 'Walk-in Customer') as customer_name,
                    CONCAT(u.first_name, ' ', u.last_name) as cashier_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                LEFT JOIN users u ON s.user_id = u.user_id
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $sale = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sale) {
                $this->respondError('Sale not found', 404);
                return;
            }

            // Get sale items with batch info
            $stmt = $pdo->prepare("
                SELECT 
                    p.name as product_name,
                    p.sku,
                    si.quantity,
                    si.unit_price,
                    si.line_total,
                    pb.batch_number,
                    pb.batch_number as batch_code,
                    pb.expiry_date
                FROM sale_items si
                JOIN products p ON si.product_id = p.product_id
                LEFT JOIN production_batches pb ON si.batch_id = pb.batch_id
                WHERE si.sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Generate receipt number
            $receiptNumber = 'RCP-' . date('Ymd', strtotime($sale['sale_date'])) . '-' . str_pad($saleId, 5, '0', STR_PAD_LEFT);

            $this->respondSuccess([
                'receipt' => [
                    'receipt_number' => $receiptNumber,
                    'sale_number' => $sale['sale_number'],
                    'date' => $sale['sale_date'],
                    'customer' => $sale['customer_name'],
                    'cashier' => $sale['cashier_name'],
                    'payment_method' => $sale['payment_method'] ?? 'Cash',
                    'payment_status' => $sale['payment_status'],
                    'subtotal' => $sale['subtotal'],
                    'tax' => $sale['tax_amount'],
                    'total' => $sale['total_amount']
                ],
                'items' => array_map(function($item) {
                    return [
                        'product' => $item['product_name'],
                        'sku' => $item['sku'],
                        'qty' => $item['quantity'],
                        'price' => $item['unit_price'],
                        'total' => $item['line_total'],
                        'batch' => $item['batch_code'],
                        'expiry' => $item['expiry_date']
                    ];
                }, $items),
                'company' => [
                    'name' => 'Highland Fresh Dairy Products',
                    'address' => 'Bukidnon, Philippines',
                    'tin' => 'TIN: XXX-XXX-XXX-XXX'
                ]
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to generate receipt: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 3-GAP-4: Create walk-in sale with immediate FIFO deduction
     * For cash sales at the store
     */
    private function createWalkInSale(array $input): void
    {
        $items = $input['items'] ?? [];
        $paymentMethod = $input['payment_method'] ?? 'Cash';
        $customerName = $input['customer_name'] ?? 'Walk-in Customer';
        $amountTendered = $input['amount_tendered'] ?? null;

        if (empty($items)) {
            $this->respondError('Items are required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();

            $user = getCurrentUser();
            $userId = $user['id'] ?? null;

            // Validate and calculate totals
            $orderItems = [];
            $totalAmount = 0;

            foreach ($items as $item) {
                $productId = $item['product_id'] ?? null;
                $quantity = floatval($item['quantity'] ?? 0);

                if (!$productId || $quantity <= 0) {
                    throw new Exception('Invalid item data');
                }

                // Get product info
                $stmt = $pdo->prepare("
                    SELECT product_id, name, sku, price as unit_price 
                    FROM products WHERE product_id = ? AND is_active = 1
                ");
                $stmt->execute([$productId]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    throw new Exception("Product not found: $productId");
                }

                $unitPrice = isset($item['unit_price']) ? floatval($item['unit_price']) : floatval($product['unit_price']);
                $lineTotal = $quantity * $unitPrice;

                $orderItems[] = [
                    'product_id' => $productId,
                    'product_name' => $product['name'],
                    'sku' => $product['sku'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'batches' => [] // Will be filled with FIFO allocation
                ];

                $totalAmount += $lineTotal;
            }

            // Generate sale number
            $stmt = $pdo->query("SELECT MAX(sale_id) as max_id FROM sales");
            $maxId = $stmt->fetch(PDO::FETCH_ASSOC)['max_id'] ?? 0;
            $newId = $maxId + 1;
            $saleNumber = 'POS-' . date('Ymd') . '-' . str_pad($newId, 4, '0', STR_PAD_LEFT);

            // Calculate tax
            $subtotal = $totalAmount;
            $taxAmount = $subtotal * 0.12;
            $totalWithTax = $subtotal + $taxAmount;

            // Get payment method ID
            $stmt = $pdo->prepare("SELECT payment_method_id FROM payment_methods WHERE method_name LIKE ? LIMIT 1");
            $stmt->execute(['%' . $paymentMethod . '%']);
            $pm = $stmt->fetch(PDO::FETCH_ASSOC);
            $paymentMethodId = $pm['payment_method_id'] ?? 1;

            // Create sale record (status = completed for walk-in)
            $stmt = $pdo->prepare("
                INSERT INTO sales (
                    sale_number, customer_name, user_id, subtotal, tax_amount, total_amount,
                    status_id, payment_method_id, payment_status, sale_date, dispatch_date, dispatched_by
                ) VALUES (?, ?, ?, ?, ?, ?, 
                    (SELECT status_id FROM customer_order_status WHERE status_name LIKE '%completed%' LIMIT 1),
                    ?, 'paid', NOW(), NOW(), ?)
            ");
            $stmt->execute([
                $saleNumber,
                $customerName,
                $userId,
                $subtotal,
                $taxAmount,
                $totalWithTax,
                $paymentMethodId,
                $userId
            ]);
            $saleId = $pdo->lastInsertId();

            // Process each item with FIFO deduction
            $batchesUsed = [];

            foreach ($orderItems as &$orderItem) {
                $productId = $orderItem['product_id'];
                $remaining = $orderItem['quantity'];

                // Get available batches in FIFO order
                $stmt = $pdo->prepare("
                    SELECT 
                        pb.batch_id,
                        pb.batch_number,
                        pb.batch_number as batch_code,
                        pb.quantity_remaining,
                        COALESCE(pb.reserved_quantity, 0) as reserved_quantity,
                        pb.production_date,
                        pb.expiry_date
                    FROM production_batches pb
                    LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                    WHERE (pr.finished_product_id = ? OR pb.product_id = ?)
                      AND pb.status = 'Completed'
                      AND pb.quantity_remaining > 0
                      AND (pb.quantity_remaining - COALESCE(pb.reserved_quantity, 0)) > 0
                      AND (pb.expiry_date IS NULL OR pb.expiry_date >= CURDATE())
                    ORDER BY pb.production_date ASC, pb.batch_id ASC
                    FOR UPDATE
                ");
                $stmt->execute([$productId, $productId]);
                $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $firstBatchId = null;

                foreach ($batches as $batch) {
                    if ($remaining <= 0) break;

                    $available = floatval($batch['quantity_remaining']) - floatval($batch['reserved_quantity']);
                    $toDeduct = min($remaining, $available);

                    if ($toDeduct > 0) {
                        if ($firstBatchId === null) {
                            $firstBatchId = $batch['batch_id'];
                        }

                        // Deduct from batch
                        $stmt = $pdo->prepare("
                            UPDATE production_batches 
                            SET quantity_remaining = quantity_remaining - ?
                            WHERE batch_id = ?
                        ");
                        $stmt->execute([$toDeduct, $batch['batch_id']]);

                        // Deduct from product inventory
                        $stmt = $pdo->prepare("
                            UPDATE products 
                            SET quantity_on_hand = quantity_on_hand - ?
                            WHERE product_id = ?
                        ");
                        $stmt->execute([$toDeduct, $productId]);

                        $orderItem['batches'][] = [
                            'batch_id' => $batch['batch_id'],
                            'batch_code' => $batch['batch_code'],
                            'quantity' => $toDeduct,
                            'expiry_date' => $batch['expiry_date']
                        ];

                        $batchesUsed[] = [
                            'product' => $orderItem['product_name'],
                            'batch_code' => $batch['batch_code'],
                            'quantity' => $toDeduct
                        ];

                        $remaining -= $toDeduct;
                    }
                }

                if ($remaining > 0) {
                    throw new Exception("Insufficient stock for {$orderItem['product_name']}. Short by: $remaining");
                }

                // Insert sale item (use first batch for primary reference)
                $stmt = $pdo->prepare("
                    INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, line_total, status_id)
                    VALUES (?, ?, ?, ?, ?, ?, 
                        (SELECT status_id FROM customer_order_status WHERE status_name LIKE '%completed%' LIMIT 1))
                ");
                $stmt->execute([
                    $saleId,
                    $productId,
                    $firstBatchId,
                    $orderItem['quantity'],
                    $orderItem['unit_price'],
                    $orderItem['line_total']
                ]);
            }

            $pdo->commit();

            // Calculate change if amount tendered
            $change = null;
            if ($amountTendered !== null) {
                $change = floatval($amountTendered) - $totalWithTax;
            }

            $this->respondSuccess([
                'message' => 'Walk-in sale completed successfully',
                'sale_id' => $saleId,
                'sale_number' => $saleNumber,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalWithTax,
                'amount_tendered' => $amountTendered,
                'change' => $change,
                'payment_status' => 'paid',
                'batches_used' => $batchesUsed,
                'fifo_compliant' => true,
                'items' => $orderItems
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Walk-in sale failed: ' . $e->getMessage(), 500);
        }
    }
}

// Execute API
$api = new SalesOrdersAPI();
$api->route();
