<?php
/**
 * Highland Fresh - Purchase Requisition API
 * Module C: Inventory Requisition (from CLIENT_MEETING_PIVOT_ANALYSIS)
 * 
 * Features:
 * - Low stock alerts dashboard
 * - Create purchase requisitions from warehouse staff
 * - Approval workflow for Admin/Finance
 * - Convert approved requisitions to Purchase Orders
 * 
 * Date: December 2, 2025
 */

require_once 'BaseAPI.php';
require_once 'SessionConfig.php';

class RequisitionAPI extends BaseAPI
{
    protected array $allowedRoles = ['Admin', 'Warehouse Staff', 'Production Supervisor', 'Finance Officer'];

    protected function getAllowedRoles(): array
    {
        return $this->allowedRoles;
    }

    public function route(): void
    {
        try {
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
                $this->respondError('Unauthorized access. Required roles: ' . implode(', ', $this->getAllowedRoles()), 403);
                return;
            }
        } catch (Exception $e) {
            error_log('RequisitionAPI auth error: ' . $e->getMessage());
            $this->respondError('Authentication error: ' . $e->getMessage(), 500);
            return;
        }

        $method = $this->getMethod();
        $input = $this->getJsonInput() ?? [];
        $operation = $input['operation'] ?? $_GET['operation'] ?? '';

        $this->handle(function() use ($method, $input, $operation) {
            switch ($operation) {
                // Low Stock Alerts
                case 'getLowStockItems':
                    $this->getLowStockItems();
                    break;
                case 'getLowStockAlerts':
                    $this->getLowStockAlerts();
                    break;
                case 'dismissAlert':
                    $this->dismissAlert($input);
                    break;

                // Requisitions CRUD
                case 'getRequisitions':
                    $this->getRequisitions($input);
                    break;
                case 'getRequisition':
                    $this->getRequisition($input);
                    break;
                case 'createRequisition':
                    $this->createRequisition($input);
                    break;
                case 'updateRequisition':
                    $this->updateRequisition($input);
                    break;
                case 'deleteRequisition':
                    $this->deleteRequisition($input);
                    break;

                // Approval Workflow
                case 'approveRequisition':
                    $this->approveRequisition($input);
                    break;
                case 'rejectRequisition':
                    $this->rejectRequisition($input);
                    break;
                case 'cancelRequisition':
                    $this->cancelRequisition($input);
                    break;
                case 'convertToPurchaseOrder':
                    $this->convertToPurchaseOrder($input);
                    break;

                // Dashboard Stats
                case 'getDashboardStats':
                    $this->getDashboardStats();
                    break;

                // Raw Materials for dropdown
                case 'getRawMaterials':
                    $this->getRawMaterials();
                    break;

                // Suppliers for dropdown
                case 'getSuppliers':
                    $this->getSuppliers();
                    break;

                default:
                    $this->respondError('Unknown operation: ' . $operation, 400);
            }
        });
    }

    /**
     * Get items below reorder level
     */
    private function getLowStockItems(): void
    {
        try {
            $pdo = $this->db();

            // Try to use the view first, fall back to direct query
            try {
                $stmt = $pdo->query("SELECT * FROM v_low_stock_items");
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                // View doesn't exist, use direct query
                $stmt = $pdo->query("
                    SELECT 
                        rm.raw_material_id,
                        rm.name AS item_name,
                        rm.category,
                        rm.quantity_on_hand AS current_stock,
                        COALESCE(rm.reorder_level, 100) AS reorder_level,
                        COALESCE(uom.unit_name, 'pcs') AS unit_of_measure,
                        (COALESCE(rm.reorder_level, 100) - rm.quantity_on_hand) AS shortage_qty,
                        CASE 
                            WHEN rm.quantity_on_hand <= 0 THEN 'OUT_OF_STOCK'
                            WHEN rm.quantity_on_hand <= COALESCE(rm.reorder_level, 100) * 0.5 THEN 'CRITICAL'
                            WHEN rm.quantity_on_hand <= COALESCE(rm.reorder_level, 100) THEN 'LOW'
                            ELSE 'OK'
                        END AS stock_status
                    FROM raw_materials rm
                    LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                    WHERE rm.quantity_on_hand <= COALESCE(rm.reorder_level, 100)
                    ORDER BY 
                        CASE 
                            WHEN rm.quantity_on_hand <= 0 THEN 1
                            WHEN rm.quantity_on_hand <= COALESCE(rm.reorder_level, 100) * 0.5 THEN 2
                            ELSE 3
                        END,
                        (COALESCE(rm.reorder_level, 100) - rm.quantity_on_hand) DESC
                ");
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // Format numbers
            foreach ($items as &$item) {
                $item['current_stock'] = floatval($item['current_stock']);
                $item['reorder_level'] = floatval($item['reorder_level']);
                $item['shortage_qty'] = floatval($item['shortage_qty']);
            }

            $this->respondSuccess([
                'items' => $items,
                'count' => count($items),
                'summary' => [
                    'out_of_stock' => count(array_filter($items, fn($i) => $i['stock_status'] === 'OUT_OF_STOCK')),
                    'critical' => count(array_filter($items, fn($i) => $i['stock_status'] === 'CRITICAL')),
                    'low' => count(array_filter($items, fn($i) => $i['stock_status'] === 'LOW'))
                ]
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to get low stock items: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get active low stock alerts
     */
    private function getLowStockAlerts(): void
    {
        try {
            $pdo = $this->db();

            // Check if low_stock_alerts table exists
            $tableExists = false;
            try {
                $pdo->query("SELECT 1 FROM low_stock_alerts LIMIT 1");
                $tableExists = true;
            } catch (PDOException $e) {
                // Table doesn't exist
            }

            if ($tableExists) {
                $stmt = $pdo->query("
                    SELECT 
                        lsa.*,
                        rm.name AS item_name,
                        rm.category,
                        COALESCE(uom.unit_name, 'pcs') AS unit_of_measure
                    FROM low_stock_alerts lsa
                    JOIN raw_materials rm ON lsa.raw_material_id = rm.raw_material_id
                    LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                    WHERE lsa.status = 'ACTIVE'
                    ORDER BY lsa.shortage_quantity DESC
                ");
                $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // Generate alerts dynamically from raw_materials
                $alerts = [];
            }

            $this->respondSuccess(['alerts' => $alerts]);

        } catch (Exception $e) {
            $this->respondError('Failed to get alerts: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all requisitions with filters
     */
    private function getRequisitions(array $input): void
    {
        try {
            $pdo = $this->db();

            $status = $input['status'] ?? $_GET['status'] ?? '';
            $dateFrom = $input['date_from'] ?? $_GET['date_from'] ?? date('Y-m-01');
            $dateTo = $input['date_to'] ?? $_GET['date_to'] ?? date('Y-m-d');
            $limit = intval($input['limit'] ?? $_GET['limit'] ?? 50);
            $offset = intval($input['offset'] ?? $_GET['offset'] ?? 0);

            $sql = "
                SELECT 
                    pr.requisition_id,
                    pr.requisition_number,
                    pr.request_date,
                    pr.requested_by,
                    pr.priority,
                    pr.reason,
                    pr.status,
                    pr.notes,
                    pr.approved_date,
                    pr.rejection_reason,
                    pr.converted_to_po_id,
                    CONCAT(u1.first_name, ' ', u1.last_name) AS requested_by_name,
                    CONCAT(u2.first_name, ' ', u2.last_name) AS approved_by_name,
                    (SELECT COUNT(*) FROM purchase_requisition_items WHERE requisition_id = pr.requisition_id) AS item_count,
                    (SELECT COALESCE(SUM(estimated_total_cost), 0) FROM purchase_requisition_items WHERE requisition_id = pr.requisition_id) AS total_estimated_cost
                FROM purchase_requisitions pr
                LEFT JOIN users u1 ON pr.requested_by = u1.user_id
                LEFT JOIN users u2 ON pr.approved_by = u2.user_id
                WHERE DATE(pr.request_date) BETWEEN ? AND ?
            ";
            $params = [$dateFrom, $dateTo];

            if ($status) {
                $sql .= " AND pr.status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY pr.request_date DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $requisitions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countSql = "
                SELECT COUNT(*) as total
                FROM purchase_requisitions pr
                WHERE DATE(pr.request_date) BETWEEN ? AND ?
            ";
            $countParams = [$dateFrom, $dateTo];
            if ($status) {
                $countSql .= " AND pr.status = ?";
                $countParams[] = $status;
            }
            $stmt = $pdo->prepare($countSql);
            $stmt->execute($countParams);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $this->respondSuccess([
                'requisitions' => $requisitions,
                'total' => intval($total),
                'limit' => $limit,
                'offset' => $offset
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to get requisitions: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single requisition with items
     */
    private function getRequisition(array $input): void
    {
        $requisitionId = $input['requisition_id'] ?? $_GET['requisition_id'] ?? null;

        if (!$requisitionId) {
            $this->respondError('Requisition ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            // Get requisition header
            $stmt = $pdo->prepare("
                SELECT 
                    pr.*,
                    CONCAT(u1.first_name, ' ', u1.last_name) AS requested_by_name,
                    CONCAT(u2.first_name, ' ', u2.last_name) AS approved_by_name
                FROM purchase_requisitions pr
                LEFT JOIN users u1 ON pr.requested_by = u1.user_id
                LEFT JOIN users u2 ON pr.approved_by = u2.user_id
                WHERE pr.requisition_id = ?
            ");
            $stmt->execute([$requisitionId]);
            $requisition = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$requisition) {
                $this->respondError('Requisition not found', 404);
                return;
            }

            // Get items
            $stmt = $pdo->prepare("
                SELECT 
                    pri.*,
                    rm.name AS material_name,
                    rm.category AS material_category,
                    s.name AS supplier_name
                FROM purchase_requisition_items pri
                LEFT JOIN raw_materials rm ON pri.raw_material_id = rm.raw_material_id
                LEFT JOIN suppliers s ON pri.preferred_supplier_id = s.supplier_id
                WHERE pri.requisition_id = ?
            ");
            $stmt->execute([$requisitionId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $requisition['items'] = $items;

            $this->respondSuccess(['requisition' => $requisition]);

        } catch (Exception $e) {
            $this->respondError('Failed to get requisition: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create new requisition
     */
    private function createRequisition(array $input): void
    {
        $missing = $this->requireParams($input, ['items']);
        if ($missing) {
            $this->respondError('Items are required', 400);
            return;
        }

        $items = $input['items'];
        if (!is_array($items) || empty($items)) {
            $this->respondError('At least one item is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();
            $user = getCurrentUser();

            // Generate requisition number
            $stmt = $pdo->query("SELECT COALESCE(MAX(requisition_id), 0) + 1 as next_id FROM purchase_requisitions");
            $nextId = $stmt->fetch(PDO::FETCH_ASSOC)['next_id'];
            $requisitionNumber = 'REQ-' . date('Ymd') . '-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

            // Insert requisition header
            $stmt = $pdo->prepare("
                INSERT INTO purchase_requisitions (
                    requisition_number, requested_by, priority, reason, status, notes
                ) VALUES (?, ?, ?, ?, 'PENDING', ?)
            ");
            $stmt->execute([
                $requisitionNumber,
                $user['id'] ?? 1,
                $input['priority'] ?? 'MEDIUM',
                $input['reason'] ?? 'Low Stock Alert',
                $input['notes'] ?? null
            ]);
            $requisitionId = $pdo->lastInsertId();

            // Insert items
            $itemStmt = $pdo->prepare("
                INSERT INTO purchase_requisition_items (
                    requisition_id, item_type, raw_material_id, item_name,
                    quantity_requested, unit_of_measure, current_stock, reorder_level,
                    estimated_unit_cost, estimated_total_cost, preferred_supplier_id, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach ($items as $item) {
                $qtyRequested = floatval($item['quantity_requested'] ?? 0);
                $unitCost = floatval($item['estimated_unit_cost'] ?? 0);
                $totalCost = $qtyRequested * $unitCost;

                $itemStmt->execute([
                    $requisitionId,
                    $item['item_type'] ?? 'RAW_MATERIAL',
                    $item['raw_material_id'] ?? null,
                    $item['item_name'] ?? 'Unknown Item',
                    $qtyRequested,
                    $item['unit_of_measure'] ?? 'pcs',
                    $item['current_stock'] ?? null,
                    $item['reorder_level'] ?? null,
                    $unitCost,
                    $totalCost,
                    $item['preferred_supplier_id'] ?? null,
                    $item['notes'] ?? null
                ]);
            }

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Requisition created successfully',
                'requisition_id' => intval($requisitionId),
                'requisition_number' => $requisitionNumber
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            $this->respondError('Failed to create requisition: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve requisition AND auto-create Purchase Order
     * Streamlined flow: Finance Officer clicks "Approve & Send" -> PR approved + PO created
     */
    private function approveRequisition(array $input): void
    {
        $requisitionId = $input['requisition_id'] ?? null;

        if (!$requisitionId) {
            $this->respondError('Requisition ID is required', 400);
            return;
        }

        // Check if user has approval permission
        $user = getCurrentUser();
        $allowedApprovers = ['Admin', 'Finance Officer'];
        if (!in_array($user['role'] ?? '', $allowedApprovers)) {
            $this->respondError('You do not have permission to approve requisitions', 403);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();

            // Check current status and get requisition details
            $stmt = $pdo->prepare("
                SELECT pr.*, pri.raw_material_id, pri.item_name, pri.quantity_requested, 
                       pri.estimated_unit_cost, pri.estimated_total_cost, pri.preferred_supplier_id,
                       pri.unit_of_measure
                FROM purchase_requisitions pr
                LEFT JOIN purchase_requisition_items pri ON pr.requisition_id = pri.requisition_id
                WHERE pr.requisition_id = ?
            ");
            $stmt->execute([$requisitionId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($items)) {
                $this->respondError('Requisition not found', 404);
                return;
            }

            $requisition = $items[0];

            if ($requisition['status'] !== 'PENDING') {
                $this->respondError('Only pending requisitions can be approved', 400);
                return;
            }

            // Update requisition status to APPROVED
            $stmt = $pdo->prepare("
                UPDATE purchase_requisitions
                SET status = 'APPROVED', approved_by = ?, approved_date = NOW()
                WHERE requisition_id = ?
            ");
            $stmt->execute([$user['id'] ?? 1, $requisitionId]);

            // ==================================================================
            // AUTO-CREATE PURCHASE ORDER (Streamlined Flow)
            // ==================================================================
            
            // Determine supplier from items
            $supplierId = null;
            foreach ($items as $item) {
                if (!empty($item['preferred_supplier_id'])) {
                    $supplierId = $item['preferred_supplier_id'];
                    break;
                }
            }

            // If no preferred supplier, get first available supplier
            if (!$supplierId) {
                $stmt = $pdo->query("SELECT supplier_id FROM suppliers WHERE is_active = 1 LIMIT 1");
                $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
                $supplierId = $supplier['supplier_id'] ?? 1;
            }

            // Get "PO Sent" status ID
            $stmt = $pdo->prepare("SELECT status_id FROM transaction_statuses WHERE status_name = 'PO Sent' AND status_type = 'Purchase' LIMIT 1");
            $stmt->execute();
            $statusResult = $stmt->fetch(PDO::FETCH_ASSOC);
            $poStatusId = $statusResult['status_id'] ?? 1;

            // Generate PO number
            $poNumber = 'HF-PO-' . date('Ymd') . '-' . str_pad($requisitionId, 3, '0', STR_PAD_LEFT);

            // Calculate total
            $totalAmount = 0;
            foreach ($items as $item) {
                $totalAmount += floatval($item['estimated_total_cost'] ?? 0);
            }

            // Create Purchase Order
            $stmt = $pdo->prepare("
                INSERT INTO purchase_orders (
                    po_number, supplier_id, user_id, total_amount, 
                    status_id, order_date, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW())
            ");
            $stmt->execute([
                $poNumber,
                $supplierId,
                $user['id'] ?? 1,
                $totalAmount,
                $poStatusId,
                'Auto-generated from Requisition #' . $requisition['requisition_number']
            ]);
            $poId = $pdo->lastInsertId();

            // Create PO Items
            foreach ($items as $item) {
                if (!empty($item['raw_material_id'])) {
                    $batchCode = 'HF-' . date('Ymd') . '-' . str_pad($poId, 3, '0', STR_PAD_LEFT) . '-RM' . str_pad($item['raw_material_id'], 3, '0', STR_PAD_LEFT);
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO purchase_order_items (
                            po_id, raw_material_id, ordered_quantity, unit_cost, 
                            line_total, highland_fresh_batch_code
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $poId,
                        $item['raw_material_id'],
                        $item['quantity_requested'],
                        $item['estimated_unit_cost'] ?? 0,
                        $item['estimated_total_cost'] ?? 0,
                        $batchCode
                    ]);
                }
            }

            // Update requisition with PO reference
            $stmt = $pdo->prepare("
                UPDATE purchase_requisitions
                SET status = 'CONVERTED', converted_to_po_id = ?
                WHERE requisition_id = ?
            ");
            $stmt->execute([$poId, $requisitionId]);

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Requisition approved and Purchase Order created!',
                'requisition_id' => intval($requisitionId),
                'purchase_order_id' => intval($poId),
                'po_number' => $poNumber,
                'total_amount' => $totalAmount
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Failed to approve requisition: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject requisition
     */
    private function rejectRequisition(array $input): void
    {
        $requisitionId = $input['requisition_id'] ?? null;
        $reason = $input['rejection_reason'] ?? '';

        if (!$requisitionId) {
            $this->respondError('Requisition ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $user = getCurrentUser();

            $stmt = $pdo->prepare("
                UPDATE purchase_requisitions
                SET status = 'REJECTED', 
                    approved_by = ?, 
                    approved_date = NOW(),
                    rejection_reason = ?
                WHERE requisition_id = ? AND status = 'PENDING'
            ");
            $stmt->execute([$user['id'] ?? 1, $reason, $requisitionId]);

            if ($stmt->rowCount() === 0) {
                $this->respondError('Requisition not found or not in pending status', 400);
                return;
            }

            $this->respondSuccess(['message' => 'Requisition rejected']);

        } catch (Exception $e) {
            $this->respondError('Failed to reject requisition: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cancel own pending requisition (requester only)
     */
    private function cancelRequisition(array $input): void
    {
        $requisitionId = $input['requisition_id'] ?? null;

        if (!$requisitionId) {
            $this->respondError('Requisition ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $user = getCurrentUser();
            $userId = $user['id'] ?? null;

            if (!$userId) {
                $this->respondError('User session required', 401);
                return;
            }

            // First check if requisition exists and get its details
            $checkStmt = $pdo->prepare("
                SELECT requisition_id, status, requested_by 
                FROM purchase_requisitions 
                WHERE requisition_id = ?
            ");
            $checkStmt->execute([$requisitionId]);
            $req = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                $this->respondError('Requisition not found', 404);
                return;
            }

            if ($req['status'] !== 'PENDING') {
                $this->respondError('Only pending requisitions can be cancelled. Current status: ' . $req['status'], 400);
                return;
            }

            // Cast both to int for comparison
            if ((int)$req['requested_by'] !== (int)$userId) {
                $this->respondError('You can only cancel your own requisitions', 403);
                return;
            }

            // Update to cancelled
            $stmt = $pdo->prepare("
                UPDATE purchase_requisitions
                SET status = 'CANCELLED'
                WHERE requisition_id = ?
            ");
            $stmt->execute([$requisitionId]);

            $this->respondSuccess(['message' => 'Requisition cancelled']);

        } catch (Exception $e) {
            error_log('Cancel requisition error: ' . $e->getMessage());
            $this->respondError('Failed to cancel requisition: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Convert approved requisition to Purchase Order
     */
    private function convertToPurchaseOrder(array $input): void
    {
        $requisitionId = $input['requisition_id'] ?? null;
        $supplierId = $input['supplier_id'] ?? null;

        if (!$requisitionId) {
            $this->respondError('Requisition ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();
            $user = getCurrentUser();

            // Get requisition with items
            $stmt = $pdo->prepare("
                SELECT pr.*, pri.*
                FROM purchase_requisitions pr
                JOIN purchase_requisition_items pri ON pr.requisition_id = pri.requisition_id
                WHERE pr.requisition_id = ? AND pr.status = 'APPROVED'
            ");
            $stmt->execute([$requisitionId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($items)) {
                $this->respondError('Approved requisition not found or has no items', 404);
                return;
            }

            // Determine supplier
            if (!$supplierId) {
                $supplierId = $items[0]['preferred_supplier_id'] ?? null;
            }

            if (!$supplierId) {
                $this->respondError('Supplier ID is required for PO creation', 400);
                return;
            }

            // Generate PO number
            $stmt = $pdo->query("SELECT COALESCE(MAX(purchase_order_id), 0) + 1 as next_id FROM purchase_orders");
            $nextId = $stmt->fetch(PDO::FETCH_ASSOC)['next_id'];
            $poNumber = 'PO-' . date('Ymd') . '-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

            // Calculate total
            $totalAmount = 0;
            foreach ($items as $item) {
                $totalAmount += floatval($item['estimated_total_cost']);
            }

            // Create Purchase Order
            $stmt = $pdo->prepare("
                INSERT INTO purchase_orders (
                    purchase_order_number, supplier_id, order_date, 
                    total_amount, status, created_by, notes
                ) VALUES (?, ?, NOW(), ?, 'Pending', ?, ?)
            ");
            $stmt->execute([
                $poNumber,
                $supplierId,
                $totalAmount,
                $user['id'] ?? 1,
                'Generated from Requisition #' . $items[0]['requisition_number']
            ]);
            $poId = $pdo->lastInsertId();

            // Create PO Items
            $itemStmt = $pdo->prepare("
                INSERT INTO purchase_order_items (
                    purchase_order_id, raw_material_id, quantity_ordered, unit_price
                ) VALUES (?, ?, ?, ?)
            ");

            foreach ($items as $item) {
                if ($item['raw_material_id']) {
                    $itemStmt->execute([
                        $poId,
                        $item['raw_material_id'],
                        $item['quantity_requested'],
                        $item['estimated_unit_cost'] ?? 0
                    ]);
                }
            }

            // Update requisition status
            $stmt = $pdo->prepare("
                UPDATE purchase_requisitions
                SET status = 'CONVERTED', converted_to_po_id = ?
                WHERE requisition_id = ?
            ");
            $stmt->execute([$poId, $requisitionId]);

            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Purchase Order created successfully',
                'purchase_order_id' => intval($poId),
                'purchase_order_number' => $poNumber
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            $this->respondError('Failed to create PO: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    private function getDashboardStats(): void
    {
        try {
            $pdo = $this->db();

            // Low stock count (using raw_materials directly)
            $stmt = $pdo->query("
                SELECT COUNT(*) as low_stock_count
                FROM raw_materials 
                WHERE quantity_on_hand <= COALESCE(reorder_level, 100)
            ");
            $lowStockCount = $stmt->fetch(PDO::FETCH_ASSOC)['low_stock_count'];

            // Out of stock count
            $stmt = $pdo->query("
                SELECT COUNT(*) as out_of_stock_count
                FROM raw_materials 
                WHERE quantity_on_hand <= 0
            ");
            $outOfStockCount = $stmt->fetch(PDO::FETCH_ASSOC)['out_of_stock_count'];

            // Pending requisitions
            $pendingCount = 0;
            try {
                $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM purchase_requisitions WHERE status = 'PENDING'");
                $pendingCount = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
            } catch (PDOException $e) {
                // Table doesn't exist yet
            }

            // Approved this month
            $approvedCount = 0;
            try {
                $stmt = $pdo->query("
                    SELECT COUNT(*) as cnt 
                    FROM purchase_requisitions 
                    WHERE status = 'APPROVED' 
                      AND MONTH(approved_date) = MONTH(CURDATE())
                ");
                $approvedCount = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
            } catch (PDOException $e) {
                // Table doesn't exist yet
            }

            $this->respondSuccess([
                'low_stock_count' => intval($lowStockCount),
                'out_of_stock_count' => intval($outOfStockCount),
                'pending_requisitions' => intval($pendingCount),
                'approved_this_month' => intval($approvedCount)
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to get dashboard stats: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get raw materials for dropdown
     * BUSINESS RULE: Exclude 'Raw Milk' - it comes from farmers via QC Milk Collection, not via purchase orders
     */
    private function getRawMaterials(): void
    {
        try {
            $pdo = $this->db();

            // Get raw materials with current FIFO price from batches
            $stmt = $pdo->query("
                SELECT 
                    rm.raw_material_id,
                    rm.name,
                    rm.category,
                    rm.quantity_on_hand,
                    COALESCE(rm.reorder_level, 100) as reorder_level,
                    COALESCE(uom.unit_name, 'pcs') as unit_of_measure,
                    COALESCE(
                        (SELECT unit_cost 
                         FROM raw_material_batches 
                         WHERE raw_material_id = rm.raw_material_id 
                           AND unit_cost > 0 
                           AND current_quantity > 0
                         ORDER BY received_date ASC, batch_id ASC 
                         LIMIT 1),
                        rm.standard_cost,
                        0
                    ) as current_price
                FROM raw_materials rm
                LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                WHERE rm.name NOT IN ('Raw Milk', 'raw milk')
                  AND (rm.sku IS NULL OR rm.sku NOT LIKE '%RAWMILK%')
                ORDER BY rm.category, rm.name
            ");
            $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess(['raw_materials' => $materials]);

        } catch (Exception $e) {
            error_log('RequisitionAPI getRawMaterials error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            $this->respondError('Failed to get raw materials: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get suppliers for dropdown
     */
    private function getSuppliers(): void
    {
        try {
            $pdo = $this->db();

            $stmt = $pdo->query("
                SELECT 
                    supplier_id,
                    name AS company_name,
                    supplier_type,
                    CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END AS status
                FROM suppliers
                WHERE is_active = 1
                ORDER BY name
            ");
            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess(['suppliers' => $suppliers]);

        } catch (Exception $e) {
            error_log('RequisitionAPI getSuppliers error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            $this->respondError('Failed to get suppliers: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete/Cancel a draft requisition
     */
    private function deleteRequisition(array $input): void
    {
        $requisitionId = $input['requisition_id'] ?? null;

        if (!$requisitionId) {
            $this->respondError('Requisition ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            // Only allow deletion of DRAFT or PENDING requisitions
            $stmt = $pdo->prepare("
                DELETE FROM purchase_requisitions
                WHERE requisition_id = ? AND status IN ('DRAFT', 'PENDING')
            ");
            $stmt->execute([$requisitionId]);

            if ($stmt->rowCount() === 0) {
                $this->respondError('Requisition not found or cannot be deleted', 400);
                return;
            }

            $this->respondSuccess(['message' => 'Requisition deleted successfully']);

        } catch (Exception $e) {
            $this->respondError('Failed to delete requisition: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update a draft requisition
     */
    private function updateRequisition(array $input): void
    {
        $requisitionId = $input['requisition_id'] ?? null;

        if (!$requisitionId) {
            $this->respondError('Requisition ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();

            // Check if requisition can be updated
            $stmt = $pdo->prepare("SELECT status FROM purchase_requisitions WHERE requisition_id = ?");
            $stmt->execute([$requisitionId]);
            $requisition = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$requisition || !in_array($requisition['status'], ['DRAFT', 'PENDING'])) {
                $this->respondError('Requisition cannot be updated', 400);
                return;
            }

            // Update header
            $stmt = $pdo->prepare("
                UPDATE purchase_requisitions
                SET priority = ?, reason = ?, notes = ?
                WHERE requisition_id = ?
            ");
            $stmt->execute([
                $input['priority'] ?? 'MEDIUM',
                $input['reason'] ?? null,
                $input['notes'] ?? null,
                $requisitionId
            ]);

            // Update items if provided
            if (!empty($input['items'])) {
                // Delete existing items
                $stmt = $pdo->prepare("DELETE FROM purchase_requisition_items WHERE requisition_id = ?");
                $stmt->execute([$requisitionId]);

                // Insert new items
                $itemStmt = $pdo->prepare("
                    INSERT INTO purchase_requisition_items (
                        requisition_id, item_type, raw_material_id, item_name,
                        quantity_requested, unit_of_measure, current_stock, reorder_level,
                        estimated_unit_cost, estimated_total_cost, preferred_supplier_id, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");

                foreach ($input['items'] as $item) {
                    $qtyRequested = floatval($item['quantity_requested'] ?? 0);
                    $unitCost = floatval($item['estimated_unit_cost'] ?? 0);
                    $totalCost = $qtyRequested * $unitCost;

                    $itemStmt->execute([
                        $requisitionId,
                        $item['item_type'] ?? 'RAW_MATERIAL',
                        $item['raw_material_id'] ?? null,
                        $item['item_name'] ?? 'Unknown Item',
                        $qtyRequested,
                        $item['unit_of_measure'] ?? 'pcs',
                        $item['current_stock'] ?? null,
                        $item['reorder_level'] ?? null,
                        $unitCost,
                        $totalCost,
                        $item['preferred_supplier_id'] ?? null,
                        $item['notes'] ?? null
                    ]);
                }
            }

            $pdo->commit();

            $this->respondSuccess(['message' => 'Requisition updated successfully']);

        } catch (Exception $e) {
            $pdo->rollBack();
            $this->respondError('Failed to update requisition: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Dismiss a low stock alert
     */
    private function dismissAlert(array $input): void
    {
        $alertId = $input['alert_id'] ?? null;

        if (!$alertId) {
            $this->respondError('Alert ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            $stmt = $pdo->prepare("
                UPDATE low_stock_alerts
                SET status = 'RESOLVED', resolved_date = NOW()
                WHERE alert_id = ?
            ");
            $stmt->execute([$alertId]);

            $this->respondSuccess(['message' => 'Alert dismissed']);

        } catch (Exception $e) {
            $this->respondError('Failed to dismiss alert: ' . $e->getMessage(), 500);
        }
    }
}

// Instantiate and run
if (basename($_SERVER['SCRIPT_NAME']) === 'RequisitionAPI.php') {
    $api = new RequisitionAPI();
    $api->route();
}
