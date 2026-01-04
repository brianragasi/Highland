<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';

class PaymentsAPI extends BaseAPI
{
    protected function getAllowedRoles(): array
    {
        // Sales Staff/Officers, Finance Officers and Admins can access payment operations
        return ['Admin', 'Sales Officer', 'Sales Staff', 'Finance Officer'];
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
            $this->respondError('Unauthorized access. Your role: ' . ($userRole ?? 'none') . '. Allowed: ' . implode(', ', $this->getAllowedRoles()), 403);
            return;
        }

        $method = $this->getMethod();
        $input = $this->getJsonInput() ?? [];
        $operation = $this->getOperation();

        $this->handle(function() use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'recordPayment':
                    $this->recordPayment($input);
                    break;
                case 'getUnpaidOrders':
                    $this->getUnpaidOrders();
                    break;
                case 'getPaymentHistory':
                    $this->getPaymentHistory($input);
                    break;
                case 'getOverdueOrders':
                    $this->getOverdueOrders();
                    break;
                case 'getPaymentMethods':
                    $this->getPaymentMethods();
                    break;
                case 'getPaidOrders':
                    $this->getPaidOrders();
                    break;
                default:
                    $this->respondError('Invalid operation', 400);
            }
        });
    }

    /**
     * Record a customer payment
     */
    public function recordPayment(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Sales Officer', 'Sales Staff', 'Finance Officer'])) {
            $this->respondError('Sales or Finance access required', 403);
            return;
        }

        $saleId = $input['sale_id'] ?? null;
        $amountPaid = $input['amount_paid'] ?? null;
        $paymentMethodId = $input['payment_method_id'] ?? null;
        $referenceNumber = $input['reference_number'] ?? null;
        $notes = $input['notes'] ?? null;

        if (!$saleId || !$amountPaid || !$paymentMethodId) {
            $this->respondError('Sale ID, amount, and payment method are required', 400);
            return;
        }

        if ($amountPaid <= 0) {
            $this->respondError('Payment amount must be greater than zero', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $user = getCurrentUser();
            $userId = $user['id'] ?? null;

            if (!$userId) {
                throw new Exception('User ID not found in session');
            }

            $pdo->beginTransaction();

            // Get sale details
            $stmt = $pdo->prepare("
                SELECT s.sale_id, s.customer_id, s.total_amount, s.payment_received, s.payment_status
                FROM sales s
                WHERE s.sale_id = ?
            ");
            $stmt->execute([$saleId]);
            $sale = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sale) {
                throw new Exception('Order not found');
            }

            // Check if already fully paid
            if ($sale['payment_status'] === 'paid') {
                throw new Exception('Order is already fully paid');
            }

            // Calculate new total paid
            $previousPaid = (float)$sale['payment_received'];
            $totalPaid = $previousPaid + (float)$amountPaid;
            $totalAmount = (float)$sale['total_amount'];

            // Validate not overpaying
            if ($totalPaid > $totalAmount) {
                throw new Exception('Payment amount exceeds order total');
            }

            // Determine payment status
            if ($totalPaid >= $totalAmount) {
                $paymentStatus = 'paid';
            } else if ($totalPaid > 0) {
                $paymentStatus = 'partially_paid';
            } else {
                $paymentStatus = 'unpaid';
            }

            // Record payment transaction
            $stmt = $pdo->prepare("
                INSERT INTO customer_payments 
                (sale_id, customer_id, amount_paid, payment_method_id, reference_number, notes, recorded_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $saleId,
                $sale['customer_id'],
                $amountPaid,
                $paymentMethodId,
                $referenceNumber,
                $notes,
                $userId
            ]);

            // Update sales record
            $stmt = $pdo->prepare("
                UPDATE sales 
                SET payment_received = ?,
                    payment_status = ?,
                    paid_at = " . ($paymentStatus === 'paid' ? 'NOW()' : 'paid_at') . "
                WHERE sale_id = ?
            ");
            $stmt->execute([$totalPaid, $paymentStatus, $saleId]);

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Payment recorded successfully',
                'payment_id' => $pdo->lastInsertId(),
                'total_paid' => $totalPaid,
                'remaining_balance' => $totalAmount - $totalPaid,
                'payment_status' => $paymentStatus,
                'recorded_by' => $user['full_name'] ?? $user['username']
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Payment recording failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get unpaid/partially paid orders
     */
    public function getUnpaidOrders(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Sales Officer', 'Sales Staff', 'Finance Officer'])) {
            $this->respondError('Sales or Finance access required', 403);
            return;
        }

        try {
            $pdo = $this->db();

            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number,
                    s.sale_date,
                    s.total_amount,
                    COALESCE(s.payment_received, 0) as payment_received,
                    (s.total_amount - COALESCE(s.payment_received, 0)) as balance_due,
                    s.payment_status,
                    s.payment_due_date,
                    s.invoice_number,
                    s.dispatch_date,
                    c.customer_id,
                    c.business_name,
                    c.contact_person,
                    c.phone,
                    pt.term_name as payment_terms,
                    pt.days_to_pay,
                    DATEDIFF(CURDATE(), s.payment_due_date) as days_overdue,
                    cos.status_name as order_status
                FROM sales s
                JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN payment_terms pt ON c.payment_term_id = pt.payment_term_id
                LEFT JOIN transaction_statuses cos ON s.status_id = cos.status_id
                WHERE (s.payment_status = 'unpaid' OR s.payment_status = 'partially_paid')
                AND s.status_id = 5
                ORDER BY s.dispatch_date DESC, s.sale_date DESC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess([
                'orders' => $orders,
                'total_count' => count($orders),
                'total_outstanding' => array_sum(array_column($orders, 'balance_due'))
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to retrieve unpaid orders: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get payment history for an order
     */
    public function getPaymentHistory(array $input): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        $saleId = $input['sale_id'] ?? $_GET['sale_id'] ?? null;

        if (!$saleId) {
            $this->respondError('Sale ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            $sql = "
                SELECT 
                    cp.payment_id,
                    cp.payment_date,
                    cp.amount_paid,
                    cp.reference_number,
                    cp.notes,
                    pm.method_name as payment_method,
                    CONCAT(u.first_name, ' ', u.last_name) as recorded_by
                FROM customer_payments cp
                JOIN payment_methods pm ON cp.payment_method_id = pm.payment_method_id
                JOIN users u ON cp.recorded_by = u.user_id
                WHERE cp.sale_id = ?
                ORDER BY cp.payment_date DESC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$saleId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess([
                'payments' => $payments,
                'total_payments' => count($payments),
                'total_amount_paid' => array_sum(array_column($payments, 'amount_paid'))
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to retrieve payment history: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get overdue orders
     */
    public function getOverdueOrders(): void
    {
        if (!isAuthenticated()) {
            $this->respondError('Authentication required', 401);
            return;
        }

        if (!hasRole(['Admin', 'Sales Officer', 'Sales Staff', 'Finance Officer'])) {
            $this->respondError('Sales or Finance access required', 403);
            return;
        }

        try {
            $pdo = $this->db();

            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number,
                    s.sale_date,
                    s.total_amount,
                    s.payment_received,
                    (s.total_amount - s.payment_received) as balance_due,
                    s.payment_status,
                    s.payment_due_date,
                    s.invoice_number,
                    c.customer_id,
                    c.business_name,
                    c.contact_person,
                    c.phone,
                    pt.term_name as payment_terms,
                    DATEDIFF(CURDATE(), s.payment_due_date) as days_overdue
                FROM sales s
                JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN payment_terms pt ON c.payment_term_id = pt.payment_term_id
                WHERE s.payment_status IN ('unpaid', 'partially_paid')
                AND s.payment_due_date < CURDATE()
                AND s.status_id = (SELECT status_id FROM transaction_statuses WHERE status_name = 'completed' LIMIT 1)
                ORDER BY s.payment_due_date ASC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess([
                'overdue_orders' => $orders,
                'total_count' => count($orders),
                'total_overdue_amount' => array_sum(array_column($orders, 'balance_due'))
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to retrieve overdue orders: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get available payment methods
     */
    public function getPaymentMethods(): void
    {
        try {
            $pdo = $this->db();

            $sql = "SELECT payment_method_id, method_name FROM payment_methods ORDER BY method_name";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess([
                'payment_methods' => $methods
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to retrieve payment methods: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all fully paid orders (payment history)
     */
    public function getPaidOrders(): void
    {
        try {
            $pdo = $this->db();

            // Get filters from query parameters
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            $dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : null;
            $dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : null;
            $customerId = isset($_GET['customer_id']) ? (int)$_GET['customer_id'] : null;

            $whereConditions = ["s.payment_status = 'paid'"];
            $params = [];

            if ($dateFrom) {
                $whereConditions[] = "DATE(s.sale_date) >= ?";
                $params[] = $dateFrom;
            }

            if ($dateTo) {
                $whereConditions[] = "DATE(s.sale_date) <= ?";
                $params[] = $dateTo;
            }

            if ($customerId) {
                $whereConditions[] = "s.customer_id = ?";
                $params[] = $customerId;
            }

            $whereClause = implode(' AND ', $whereConditions);

            $sql = "
                SELECT 
                    s.sale_id,
                    s.sale_number,
                    s.customer_id,
                    c.business_name,
                    c.contact_person,
                    c.phone,
                    s.sale_date,
                    s.dispatch_date,
                    s.total_amount,
                    s.payment_received,
                    s.payment_status,
                    cos.status_name as order_status,
                    pm.method_name as payment_method,
                    -- Get the date of the last payment
                    (SELECT MAX(payment_date) 
                     FROM customer_payments 
                     WHERE sale_id = s.sale_id) as last_payment_date,
                    -- Get total number of payments made
                    (SELECT COUNT(*) 
                     FROM customer_payments 
                     WHERE sale_id = s.sale_id) as payment_count
                FROM sales s
                JOIN customers c ON s.customer_id = c.customer_id
                LEFT JOIN transaction_statuses cos ON s.status_id = cos.status_id
                LEFT JOIN payment_methods pm ON s.payment_method_id = pm.payment_method_id
                WHERE $whereClause
                ORDER BY 
                    COALESCE(
                        (SELECT MAX(payment_date) FROM customer_payments WHERE sale_id = s.sale_id),
                        s.sale_date
                    ) DESC
                LIMIT ? OFFSET ?
            ";

            $params[] = $limit;
            $params[] = $offset;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count for pagination
            $countSql = "
                SELECT COUNT(*) as total
                FROM sales s
                WHERE $whereClause
            ";
            $countParams = array_slice($params, 0, -2); // Remove limit and offset
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute($countParams);
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get payment details for each order
            foreach ($orders as &$order) {
                $paymentStmt = $pdo->prepare("
                    SELECT 
                        cp.payment_id,
                        cp.amount_paid,
                        cp.payment_date,
                        cp.reference_number,
                        cp.notes,
                        pm.method_name,
                        u.username as recorded_by
                    FROM customer_payments cp
                    LEFT JOIN payment_methods pm ON cp.payment_method_id = pm.payment_method_id
                    LEFT JOIN users u ON cp.recorded_by = u.user_id
                    WHERE cp.sale_id = ?
                    ORDER BY cp.payment_date ASC
                ");
                $paymentStmt->execute([$order['sale_id']]);
                $order['payments'] = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            $this->respondSuccess([
                'orders' => $orders,
                'total_count' => (int)$totalCount,
                'limit' => $limit,
                'offset' => $offset
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to retrieve paid orders: ' . $e->getMessage(), 500);
        }
    }
}

if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'PaymentsAPI.php') {
    $api = new PaymentsAPI();
    $api->route();
}
