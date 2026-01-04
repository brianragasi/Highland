<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
require_once __DIR__ . '/highland-fresh-business-rules.php';
class PurchaseOrdersAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        if (!$this->requireInventoryProductionOrAdminAuth()) {
            return;
        }
        $method = $this->getMethod();
        $input = $this->getJsonInput() ?? [];
        $operation = $this->getOperation();
        $this->handle(function () use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'GET':
                case 'getAllPurchaseOrders':
                    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
                        $this->getPurchaseOrderDetails();
                    } else {
                        $this->getAllPurchaseOrders($input);
                    }
                    break;
                case 'getActivePOCount':
                    $this->getActivePOCount();
                    break;
                case 'getOpenPOs':
                    $this->getOpenPOs();
                    break;
                case 'getRecentActivity':
                    $this->getRecentActivity();
                    break;
                case 'getPerformanceMetrics':
                    $this->getPerformanceMetrics();
                    break;
                case 'POST':
                case 'createPurchaseOrder':
                    $this->createPurchaseOrder($input);
                    break;
                case 'PUT':
                case 'updatePurchaseOrder':
                    if (isset($_GET['action']) && $_GET['action'] === 'receive_delivery') {
                        $this->receiveDelivery($input);
                    } else {
                        $this->updatePurchaseOrder($input);
                    }
                    break;
                default:
                    $this->respond(['success' => false, 'message' => 'Method not allowed'], 405);
                    break;
            }
        });
    }
    public function getAllPurchaseOrders(array $input = []): void
    {
        $whereConditions = [];
        $params = [];
        if (isset($input['status']) && $input['status'] !== '') {
            $whereConditions[] = 'ts.status_name = ?';
            $params[] = $input['status'];
        }
        if (isset($input['supplier_id']) && is_numeric($input['supplier_id'])) {
            $whereConditions[] = 'po.supplier_id = ?';
            $params[] = (int)$input['supplier_id'];
        }
        if (isset($input['date_from']) && $input['date_from'] !== '') {
            $whereConditions[] = 'DATE(po.order_date) >= ?';
            $params[] = $input['date_from'];
        }
        if (isset($input['date_to']) && $input['date_to'] !== '') {
            $whereConditions[] = 'DATE(po.order_date) <= ?';
            $params[] = $input['date_to'];
        }
        $whereClause = $whereConditions ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
        $sql = "SELECT 
                    po.po_id as purchase_order_id,
                    po.po_number,
                    po.supplier_id,
                    s.name as supplier_name,
                    s.email as supplier_email,
                    s.supplier_type,
                    s.is_nmfdc_member,
                    s.cooperative_code,
                    po.user_id,
                    u.username as created_by,
                    po.total_amount,
                    ts.status_name as status,
                    po.order_date,
                    po.expected_delivery_date,
                    po.received_date,
                    po.purchase_type,
                    po.milk_quality_grade,
                    po.cold_chain_temp_min,
                    po.cold_chain_temp_max,
                    po.cooperative_delivery_time,
                    po.is_nmfdc_cooperative,
                    po.quality_specifications,
                    po.collection_station,
                    po.batch_requirements,
                    po.notes,
                    po.created_at,
                    COUNT(poi.po_item_id) as items_count
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
                LEFT JOIN users u ON po.user_id = u.user_id
                LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
                LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
                $whereClause
                GROUP BY po.po_id
                ORDER BY po.order_date DESC";
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->respond(['success' => true, 'data' => $orders]);
    }
    public function createPurchaseOrder(array $input): void
    {
        try {
            $missing = $this->requireParams($input, ['supplier_id', 'items']);
            if ($missing) {
                $this->respond(['success' => false, 'message' => 'Supplier and items are required'], 400);
                return;
            }
            $supplier_id = (int)$input['supplier_id'];
            $items = $input['items'];
            $expected_delivery_date = $input['expected_delivery_date'] ?? null;
            $notes = isset($input['notes']) ? htmlspecialchars(trim($input['notes']), ENT_QUOTES, 'UTF-8') : null;
            
            // Highland Fresh specific fields
            $purchase_type = $input['purchase_type'] ?? 'raw_milk';
            $milk_quality_grade = $input['milk_quality_grade'] ?? null;
            $cold_chain_temp_min = isset($input['cold_chain_temp_min']) ? (float)$input['cold_chain_temp_min'] : null;
            $cold_chain_temp_max = isset($input['cold_chain_temp_max']) ? (float)$input['cold_chain_temp_max'] : null;
            $cooperative_delivery_time = $input['cooperative_delivery_time'] ?? null;
            $is_nmfdc_cooperative = isset($input['is_nmfdc_cooperative']) ? (int)$input['is_nmfdc_cooperative'] : 0;
            $quality_specifications = isset($input['quality_specifications']) ? htmlspecialchars(trim($input['quality_specifications']), ENT_QUOTES, 'UTF-8') : null;
            $collection_station = isset($input['collection_station']) ? htmlspecialchars(trim($input['collection_station']), ENT_QUOTES, 'UTF-8') : null;
            $batch_requirements = isset($input['batch_requirements']) ? htmlspecialchars(trim($input['batch_requirements']), ENT_QUOTES, 'UTF-8') : null;
            
            $user_id = (int)$_SESSION['user_id'];
            $supplier = $this->validateSupplier($supplier_id);
            if (!$supplier) {
                $this->respond(['success' => false, 'message' => 'Invalid supplier selected'], 400);
                return;
            }
            if (!is_array($items) || empty($items)) {
                $this->respond(['success' => false, 'message' => 'At least one item is required'], 400);
                return;
            }
            
            $validatedItems = $this->validateItems($items);
            if (!$validatedItems['success']) {
                $this->respond(['success' => false, 'message' => $validatedItems['message']], 400);
                return;
            }
            $itemsData = $validatedItems['items'];
            $totalAmount = $validatedItems['total'];
            
            // Validate against Highland Fresh business rules
            try {
                $businessRulesEngine = new HighlandFreshBusinessRuleEngine($this->db());
                $context = [
                    'supplier' => $supplier,
                    'items' => $itemsData,
                    'purchase_type' => $purchase_type,
                    'milk_quality_grade' => $milk_quality_grade,
                    'cold_chain_temp_min' => $cold_chain_temp_min,
                    'cold_chain_temp_max' => $cold_chain_temp_max
                ];
                $validationResult = $businessRulesEngine->validate($context);
                if (!$validationResult['valid']) {
                    $errorMessages = [];
                    foreach ($validationResult['violations'] as $violation) {
                        $errorMessages[] = $violation['message'];
                    }
                    $this->respond(['success' => false, 'message' => 'Business rule violation: ' . implode('; ', $errorMessages)], 400);
                    return;
                }
            } catch (Exception $e) {
                // Temporarily disable business rule validation to test
                error_log('Business rule validation error: ' . $e->getMessage());
                // Continue without validation for now
            }
            
            $this->db()->beginTransaction();
            
            // Try to create PO with retry mechanism for duplicate PO numbers
            $maxRetries = 3;
            $po_id = null;
            $poNumber = null;
            
            for ($retry = 0; $retry < $maxRetries; $retry++) {
                try {
                    $poNumber = $this->generatePONumber();
                    $statusStmt = $this->db()->prepare("SELECT status_id FROM transaction_statuses WHERE status_name = 'PO Sent' LIMIT 1");
                    $statusStmt->execute();
                    $statusResult = $statusStmt->fetch(PDO::FETCH_ASSOC);
                    $status_id = $statusResult ? (int)$statusResult['status_id'] : 11; 
                    
                    // Updated INSERT statement to include Highland Fresh fields
                    $poStmt = $this->db()->prepare(
                        "INSERT INTO purchase_orders (po_number, supplier_id, user_id, total_amount, status_id, expected_delivery_date, 
                         purchase_type, milk_quality_grade, cold_chain_temp_min, cold_chain_temp_max, 
                         cooperative_delivery_time, is_nmfdc_cooperative, quality_specifications, collection_station, 
                         batch_requirements, notes) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                    );
                    $poStmt->execute([
                        $poNumber, $supplier_id, $user_id, $totalAmount, $status_id, $expected_delivery_date,
                        $purchase_type, $milk_quality_grade, $cold_chain_temp_min, $cold_chain_temp_max, 
                        $cooperative_delivery_time, $is_nmfdc_cooperative, 
                        $quality_specifications, $collection_station, $batch_requirements, $notes
                    ]);
                    $po_id = (int)$this->db()->lastInsertId();
                    break; // Success, exit retry loop
                    
                } catch (PDOException $e) {
                    // Check if it's a duplicate entry error for PO number
                    if ($e->getCode() == '23000' && strpos($e->getMessage(), 'po_number') !== false) {
                        if ($retry < $maxRetries - 1) {
                            // Wait a bit and retry with new PO number
                            usleep(100000); // 100ms
                            continue;
                        } else {
                            throw new Exception('Failed to generate unique PO number after ' . $maxRetries . ' attempts');
                        }
                    } else {
                        throw $e; // Re-throw if not a PO number duplicate error
                    }
                }
            }
            
            if (!$po_id) {
                throw new Exception('Failed to create purchase order');
            }
            
            // Insert items - handle both products and raw materials
            foreach ($itemsData as $item) {
                $batch_number = $item['batch_number'] ?? null;
                $milk_source_cooperative = $item['milk_source_cooperative'] ?? null;
                
                if ($item['item_type'] === 'raw_material') {
                    $highland_fresh_batch_code = $this->generateHighlandFreshBatchCode($po_id, null, $item['raw_material_id']);
                    
                    // For raw materials, insert with null product_id
                    $itemStmt = $this->db()->prepare(
                        "INSERT INTO purchase_order_items (po_id, product_id, raw_material_id, ordered_quantity, unit_cost, line_total, 
                         batch_number, milk_source_cooperative, highland_fresh_batch_code) 
                         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)"
                    );
                    $itemStmt->execute([
                        $po_id,
                        $item['raw_material_id'],
                        $item['quantity'],
                        $item['unit_cost'],
                        $item['line_total'],
                        $batch_number,
                        $milk_source_cooperative,
                        $highland_fresh_batch_code
                    ]);
                } else {
                    $highland_fresh_batch_code = $this->generateHighlandFreshBatchCode($po_id, $item['product_id']);
                    
                    // For products, insert with null raw_material_id
                    $itemStmt = $this->db()->prepare(
                        "INSERT INTO purchase_order_items (po_id, product_id, raw_material_id, ordered_quantity, unit_cost, line_total, 
                         batch_number, milk_source_cooperative, highland_fresh_batch_code) 
                         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)"
                    );
                    $itemStmt->execute([
                        $po_id,
                        $item['product_id'],
                        $item['quantity'],
                        $item['unit_cost'],
                        $item['line_total'],
                        $batch_number,
                        $milk_source_cooperative,
                        $highland_fresh_batch_code
                    ]);
                }
            }
            $this->db()->commit();
            $emailResult = ['success' => false, 'message' => 'Email functionality temporarily disabled'];
            $createdPO = $this->getPODetails($po_id);
            $response = [
                'success' => true,
                'message' => 'Highland Fresh purchase order created successfully',
                'data' => $createdPO,
                'email_sent' => $emailResult['success'],
                'email_message' => $emailResult['message']
            ];
            $this->respond($response);
        } catch (Exception $e) {
            if ($this->db() && $this->db()->inTransaction()) {
                $this->db()->rollBack();
            }
            $this->respond(['success' => false, 'message' => 'Failed to create Highland Fresh purchase order: ' . $e->getMessage()], 500);
        }
    }
    public function getPurchaseOrderDetails(): void
    {
        $po_id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null;
        if (!$po_id) {
            $this->respond(['success' => false, 'message' => 'Valid PO ID required'], 400);
            return;
        }
        $po = $this->getPODetails($po_id);
        if (!$po) {
            $this->respond(['success' => false, 'message' => 'Purchase order not found'], 404);
            return;
        }
        $this->respond(['success' => true, 'data' => $po]);
    }
    public function updatePurchaseOrder(array $input): void
    {
        $po_id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null;
        if (!$po_id) {
            $this->respond(['success' => false, 'message' => 'Valid PO ID required'], 400);
            return;
        }
        $po = $this->getPODetails($po_id);
        if (!$po) {
            $this->respond(['success' => false, 'message' => 'Purchase order not found'], 404);
            return;
        }
        $updateFields = [];
        $updateValues = [];
        if (isset($input['status']) && $input['status'] !== '') {
            $statusStmt = $this->db()->prepare("SELECT status_id FROM transaction_statuses WHERE status_name = ? AND status_type = 'Purchase' LIMIT 1");
            $statusStmt->execute([$input['status']]);
            $statusResult = $statusStmt->fetch(PDO::FETCH_ASSOC);
            if (!$statusResult) {
                $this->respond(['success' => false, 'message' => 'Invalid status'], 400);
                return;
            }
            $updateFields[] = 'status_id = ?';
            $updateValues[] = (int)$statusResult['status_id'];
            if ($input['status'] === 'PO Received') {
                $updateFields[] = 'received_date = NOW()';
            }
        }
        if (isset($input['notes'])) {
            $updateFields[] = 'notes = ?';
            $updateValues[] = htmlspecialchars(trim($input['notes']), ENT_QUOTES, 'UTF-8');
        }
        if (empty($updateFields)) {
            $this->respond(['success' => false, 'message' => 'No valid fields to update'], 400);
            return;
        }
        $updateValues[] = $po_id;
        $sql = 'UPDATE purchase_orders SET ' . implode(', ', $updateFields) . ' WHERE po_id = ?';
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($updateValues);
        $updatedPO = $this->getPODetails($po_id);
        $this->respond(['success' => true, 'message' => 'Purchase order updated successfully', 'data' => $updatedPO]);
    }
    public function receiveDelivery(array $input): void
    {
        $po_id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null;
        if (!$po_id) {
            $this->respond(['success' => false, 'message' => 'Valid PO ID required'], 400);
            return;
        }
        $missing = $this->requireParams($input, ['items']);
        if ($missing) {
            $this->respond(['success' => false, 'message' => 'Items with received quantities are required'], 400);
            return;
        }
        $po = $this->getPODetails($po_id);
        if (!$po) {
            $this->respond(['success' => false, 'message' => 'Purchase order not found'], 404);
            return;
        }
        $validStatuses = ['PO Sent', 'PO Confirmed'];
        if (!in_array($po['status'], $validStatuses)) {
            $this->respond(['success' => false, 'message' => 'Purchase order status must be "PO Sent" or "PO Confirmed" to receive delivery'], 400);
            return;
        }
        $items = $input['items'];
        if (!is_array($items) || empty($items)) {
            $this->respond(['success' => false, 'message' => 'At least one item with received quantity is required'], 400);
            return;
        }
        try {
            $this->db()->beginTransaction();
            $allItemsFullyReceived = true;
            $anyItemsReceived = false;
            $debugInfo = [];
            foreach ($items as $item) {
                // Support both old format (received_quantity) and new format (accepted_quantity + rejected_quantity)
                if (!isset($item['po_item_id'])) {
                    $this->db()->rollBack();
                    $this->respond(['success' => false, 'message' => 'Each item must have po_item_id'], 400);
                    return;
                }
                
                $po_item_id = (int)$item['po_item_id'];
                
                // New format: accepted_quantity + rejected_quantity
                if (isset($item['accepted_quantity']) || isset($item['rejected_quantity'])) {
                    $accepted_quantity = isset($item['accepted_quantity']) ? (float)$item['accepted_quantity'] : 0;
                    $rejected_quantity = isset($item['rejected_quantity']) ? (float)$item['rejected_quantity'] : 0;
                    
                    // Get actual unit cost from invoice (if provided), otherwise use PO expected price
                    $actual_unit_cost = isset($item['actual_unit_cost']) ? (float)$item['actual_unit_cost'] : null;
                    
                    if ($accepted_quantity < 0 || $rejected_quantity < 0) {
                        $this->db()->rollBack();
                        $this->respond(['success' => false, 'message' => 'Accepted and rejected quantities cannot be negative'], 400);
                        return;
                    }
                    
                    // Only accepted quantity increases inventory
                    $received_quantity = $accepted_quantity;
                    
                } else if (isset($item['received_quantity'])) {
                    // Old format: received_quantity (backward compatibility)
                    $received_quantity = (float)$item['received_quantity'];
                    $accepted_quantity = $received_quantity;
                    $rejected_quantity = 0;
                    $actual_unit_cost = null;
                    
                    if ($received_quantity < 0) {
                        $this->db()->rollBack();
                        $this->respond(['success' => false, 'message' => 'Received quantity cannot be negative'], 400);
                        return;
                    }
                } else {
                    $this->db()->rollBack();
                    $this->respond(['success' => false, 'message' => 'Each item must have received_quantity OR (accepted_quantity and/or rejected_quantity)'], 400);
                    return;
                }
                $itemStmt = $this->db()->prepare("
                    SELECT 
                        poi.po_item_id,
                        poi.product_id, 
                        poi.raw_material_id,
                        poi.ordered_quantity, 
                        poi.received_quantity,
                        poi.highland_fresh_batch_code,
                        poi.expiry_date,
                        poi.lot_number,
                        poi.batch_number,
                        poi.quality_grade_received,
                        poi.temperature_at_receipt,
                        poi.milk_source_cooperative,
                        poi.unit_cost,
                        po.supplier_id,
                        p.quantity_on_hand as product_stock,
                        rm.quantity_on_hand as raw_material_stock
                    FROM purchase_order_items poi 
                    JOIN purchase_orders po ON poi.po_id = po.po_id
                    LEFT JOIN products p ON poi.product_id = p.product_id 
                    LEFT JOIN raw_materials rm ON poi.raw_material_id = rm.raw_material_id
                    WHERE poi.po_item_id = ? AND poi.po_id = ?
                ");
                $itemStmt->execute([$po_item_id, $po_id]);
                $currentItem = $itemStmt->fetch(PDO::FETCH_ASSOC);
                if (!$currentItem) {
                    $this->db()->rollBack();
                    $this->respond(['success' => false, 'message' => "Invalid item ID: $po_item_id"], 400);
                    return;
                }

                // Determine if this is a product or raw material
                $isRawMaterial = !empty($currentItem['raw_material_id']);
                $currentStock = $isRawMaterial ? $currentItem['raw_material_stock'] : $currentItem['product_stock'];
                $itemId = $isRawMaterial ? $currentItem['raw_material_id'] : $currentItem['product_id'];
                
                // Total received includes both accepted and rejected for tracking
                $totalReceivedForTracking = (float)$currentItem['received_quantity'] + $accepted_quantity + $rejected_quantity;
                $orderedQuantity = (float)$currentItem['ordered_quantity'];
                
                if ($totalReceivedForTracking > $orderedQuantity) {
                    $this->db()->rollBack();
                    $this->respond(['success' => false, 'message' => "Cannot receive more than ordered quantity for item $po_item_id (accepted + rejected exceeds ordered)"], 400);
                    return;
                }
                
                // Update purchase_order_items with all three quantities
                // - received_quantity: total processed (accepted + rejected) 
                // - accepted_quantity: good items (increases inventory)
                // - rejected_quantity: damaged/defective items (tracked only)
                $updateItemStmt = $this->db()->prepare("
                    UPDATE purchase_order_items 
                    SET received_quantity = ?,
                        accepted_quantity = COALESCE(accepted_quantity, 0) + ?,
                        rejected_quantity = COALESCE(rejected_quantity, 0) + ?
                    WHERE po_item_id = ?
                ");
                $updateItemStmt->execute([$totalReceivedForTracking, $accepted_quantity, $rejected_quantity, $po_item_id]);
                
                // Only ACCEPTED quantity increases inventory (CRITICAL BUSINESS RULE)
                if ($accepted_quantity > 0) {
                    $anyItemsReceived = true;
                    $newStockLevel = (float)$currentStock + $accepted_quantity;
                    
                    if ($isRawMaterial) {
                        $updateStockStmt = $this->db()->prepare("
                            UPDATE raw_materials 
                            SET quantity_on_hand = ? 
                            WHERE raw_material_id = ?
                        ");
                        $updateStockStmt->execute([$newStockLevel, $itemId]);
                        
                        // ============================================================
                        // CREATE RAW MATERIAL BATCH RECORD FOR FIFO TRACKING
                        // ============================================================
                        // This creates a batch record in raw_material_batches table
                        // which enables FIFO (First-In-First-Out) inventory management
                        $batchCode = $currentItem['highland_fresh_batch_code'] ?? 
                                     $this->generateHighlandFreshBatchCode($po_id, null, $itemId);
                        
                        // Check if this batch already exists (avoid duplicates)
                        $existingBatchStmt = $this->db()->prepare("
                            SELECT batch_id, current_quantity FROM raw_material_batches 
                            WHERE highland_fresh_batch_code = ? AND raw_material_id = ?
                        ");
                        $existingBatchStmt->execute([$batchCode, $itemId]);
                        $existingBatch = $existingBatchStmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($existingBatch) {
                            // Update existing batch quantity
                            $updateBatchStmt = $this->db()->prepare("
                                UPDATE raw_material_batches 
                                SET current_quantity = current_quantity + ?,
                                    quantity_received = quantity_received + ?,
                                    updated_at = NOW()
                                WHERE batch_id = ?
                            ");
                            $updateBatchStmt->execute([$accepted_quantity, $accepted_quantity, $existingBatch['batch_id']]);
                        } else {
                            // Use ACTUAL unit cost from invoice if provided, otherwise use PO expected price
                            $batchUnitCost = $actual_unit_cost ?? floatval($currentItem['unit_cost'] ?? 0);
                            
                            // Create new batch record for FIFO tracking
                            $createBatchStmt = $this->db()->prepare("
                                INSERT INTO raw_material_batches (
                                    highland_fresh_batch_code, raw_material_id, po_item_id,
                                    supplier_id, quantity_received, current_quantity, unit_cost,
                                    received_date, expiry_date, production_date,
                                    quality_grade_received, temperature_at_receipt,
                                    storage_location, status, highland_fresh_approved,
                                    milk_source_cooperative, lot_number
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, 'RECEIVED', 1, ?, ?)
                            ");
                            $createBatchStmt->execute([
                                $batchCode,
                                $itemId,
                                $po_item_id,
                                $currentItem['supplier_id'],
                                $accepted_quantity,
                                $accepted_quantity,
                                $batchUnitCost,  // USE ACTUAL PRICE FROM INVOICE
                                $currentItem['expiry_date'],
                                $currentItem['production_date'] ?? null,
                                $currentItem['quality_grade_received'],
                                $currentItem['temperature_at_receipt'],
                                null, // storage_location - can be updated later
                                $currentItem['milk_source_cooperative'],
                                $currentItem['lot_number'] ?? $currentItem['batch_number']
                            ]);
                        }
                        // ============================================================
                        // END FIFO BATCH TRACKING
                        // ============================================================
                        
                        // ============================================================
                        // BOM TRIGGER B: Check for material price changes
                        // Uses ACTUAL price from invoice (if provided) to trigger alerts
                        // ============================================================
                        $unitCostForBOM = $actual_unit_cost ?? floatval($currentItem['unit_cost'] ?? 0);
                        if ($unitCostForBOM > 0) {
                            $bomResult = $this->checkPriceChangeAndTriggerBOM($itemId, $unitCostForBOM);
                            if ($bomResult['bom_triggered']) {
                                $debugInfo[] = [
                                    'bom_trigger' => $bomResult,
                                    'material_id' => $itemId,
                                    'expected_price' => floatval($currentItem['unit_cost'] ?? 0),
                                    'actual_price' => $unitCostForBOM
                                ];
                            }
                        }
                        // ============================================================
                        
                    } else {
                        $updateStockStmt = $this->db()->prepare("
                            UPDATE products 
                            SET quantity_on_hand = ? 
                            WHERE product_id = ?
                        ");
                        $updateStockStmt->execute([$newStockLevel, $itemId]);
                    }
                }
                
                if ($totalReceivedForTracking < $orderedQuantity) {
                    $allItemsFullyReceived = false;
                }
                $debugInfo[] = [
                    'po_item_id' => $po_item_id,
                    'ordered_quantity' => $orderedQuantity,
                    'previous_received' => $currentItem['received_quantity'],
                    'accepted_quantity' => $accepted_quantity,
                    'rejected_quantity' => $rejected_quantity,
                    'total_received' => $totalReceivedForTracking,
                    'inventory_increase' => $accepted_quantity,
                    'is_complete' => $totalReceivedForTracking >= $orderedQuantity
                ];
            }
            $allItemsStmt = $this->db()->prepare("
                SELECT 
                    poi.po_item_id, 
                    poi.ordered_quantity, 
                    poi.received_quantity,
                    CASE 
                        WHEN poi.product_id IS NOT NULL THEN p.name
                        WHEN poi.raw_material_id IS NOT NULL THEN rm.name
                        ELSE 'Unknown Item'
                    END as item_name
                FROM purchase_order_items poi 
                LEFT JOIN products p ON poi.product_id = p.product_id 
                LEFT JOIN raw_materials rm ON poi.raw_material_id = rm.raw_material_id
                WHERE poi.po_id = ?
            ");
            $allItemsStmt->execute([$po_id]);
            $allItems = $allItemsStmt->fetchAll(PDO::FETCH_ASSOC);
            $overallComplete = true;
            $overallAnyReceived = false;
            foreach ($allItems as $poItem) {
                $orderedQty = (float)$poItem['ordered_quantity'];
                $receivedQty = (float)$poItem['received_quantity'];
                if ($receivedQty > 0) {
                    $overallAnyReceived = true;
                }
                if ($receivedQty < $orderedQty) {
                    $overallComplete = false;
                }
                $debugInfo[] = [
                    'po_item_id' => $poItem['po_item_id'],
                    'item_name' => $poItem['item_name'],
                    'ordered_quantity' => $orderedQty,
                    'received_quantity' => $receivedQty,
                    'is_item_complete' => $receivedQty >= $orderedQty
                ];
            }
            // Simplified status logic - binary approach (Highland Fresh suppliers always deliver full amounts)
            $newStatus = '';
            if (!$overallAnyReceived) {
                $newStatus = $po['status']; // Keep current status if nothing received
            } else {
                // Highland Fresh business rule: suppliers always deliver full requested amounts
                // When any delivery is received, automatically set all items to fully received
                $newStatus = 'PO Received';
                
                // Auto-complete all items to match received quantities with ordered quantities
                $completeAllItemsStmt = $this->db()->prepare("
                    UPDATE purchase_order_items 
                    SET received_quantity = ordered_quantity 
                    WHERE po_id = ?
                ");
                $completeAllItemsStmt->execute([$po_id]);
                
                // Update stock for any items not yet accounted for in this delivery
                $stockUpdateStmt = $this->db()->prepare("
                    SELECT 
                        poi.po_item_id,
                        poi.product_id,
                        poi.raw_material_id,
                        poi.ordered_quantity,
                        poi.received_quantity,
                        p.quantity_on_hand as product_stock,
                        rm.quantity_on_hand as raw_material_stock
                    FROM purchase_order_items poi
                    LEFT JOIN products p ON poi.product_id = p.product_id
                    LEFT JOIN raw_materials rm ON poi.raw_material_id = rm.raw_material_id
                    WHERE poi.po_id = ?
                ");
                $stockUpdateStmt->execute([$po_id]);
                $stockItems = $stockUpdateStmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($stockItems as $stockItem) {
                    $previouslyReceived = (float)$stockItem['received_quantity'];
                    $orderedQty = (float)$stockItem['ordered_quantity'];
                    $additionalStock = $orderedQty - $previouslyReceived;
                    
                    if ($additionalStock > 0) {
                        if (!empty($stockItem['raw_material_id'])) {
                            // Update raw material stock
                            $updateAdditionalStockStmt = $this->db()->prepare("
                                UPDATE raw_materials 
                                SET quantity_on_hand = quantity_on_hand + ? 
                                WHERE raw_material_id = ?
                            ");
                            $updateAdditionalStockStmt->execute([$additionalStock, $stockItem['raw_material_id']]);
                        } elseif (!empty($stockItem['product_id'])) {
                            // Update product stock
                            $updateAdditionalStockStmt = $this->db()->prepare("
                                UPDATE products 
                                SET quantity_on_hand = quantity_on_hand + ? 
                                WHERE product_id = ?
                            ");
                            $updateAdditionalStockStmt->execute([$additionalStock, $stockItem['product_id']]);
                        }
                    }
                }
            }
            if ($overallAnyReceived) {
                $statusStmt = $this->db()->prepare("SELECT status_id FROM transaction_statuses WHERE status_name = ? AND status_type = 'Purchase'");
                $statusStmt->execute([$newStatus]);
                $statusResult = $statusStmt->fetch(PDO::FETCH_ASSOC);
                if ($statusResult) {
                    $updatePOStmt = $this->db()->prepare("
                        UPDATE purchase_orders 
                        SET status_id = ?, received_date = NOW() 
                        WHERE po_id = ?
                    ");
                    $updatePOStmt->execute([$statusResult['status_id'], $po_id]);
                }
            }
            $this->db()->commit();
            $updatedPO = $this->getPODetails($po_id);
            $this->respond([
                'success' => true, 
                'message' => 'Delivery received successfully', 
                'data' => $updatedPO,
                'status_updated' => $newStatus,
                'debug' => [
                    'all_po_items' => $debugInfo,
                    'overall_any_received' => $overallAnyReceived,
                    'overall_complete' => $overallComplete,
                    'calculated_status' => $newStatus,
                    'items_in_this_delivery' => count($items)
                ]
            ]);
        } catch (Exception $e) {
            $this->db()->rollBack();
            $this->respond(['success' => false, 'message' => 'Failed to process delivery: ' . $e->getMessage()], 500);
        }
    }
    private function validateSupplier(int $supplier_id): ?array
    {
        $stmt = $this->db()->prepare("SELECT supplier_id, name, email, contact_person, supplier_type, highland_fresh_material_category, is_nmfdc_member FROM suppliers WHERE supplier_id = ? AND is_active = 1");
        $stmt->execute([$supplier_id]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Convert is_nmfdc_member to boolean
        if ($supplier) {
            $supplier['is_nmfdc_member'] = isset($supplier['is_nmfdc_member']) ? (bool)$supplier['is_nmfdc_member'] : false;
        }
        
        return $supplier ?: null;
    }
    private function validateItems(array $items): array
    {
        $validatedItems = [];
        $total = 0;
        foreach ($items as $item) {
            // Check if it's a product or raw material based on product_type or ID presence
            $hasProductId = isset($item['product_id']) && $item['product_id'] !== null;
            $hasRawMaterialId = isset($item['raw_material_id']) && $item['raw_material_id'] !== null;
            $productType = $item['product_type'] ?? null;
            
            // If product_type is raw_material, treat product_id as raw_material_id
            if ($productType === 'raw_material') {
                if ($hasProductId && !$hasRawMaterialId) {
                    $item['raw_material_id'] = $item['product_id'];
                    unset($item['product_id']);
                    $hasRawMaterialId = true;
                    $hasProductId = false;
                }
            }
            
            if (!$hasProductId && !$hasRawMaterialId) {
                return ['success' => false, 'message' => 'Each item must have either product_id or raw_material_id'];
            }
            
            if ($hasProductId && $hasRawMaterialId) {
                return ['success' => false, 'message' => 'Each item cannot have both product_id and raw_material_id'];
            }
            
            if (!isset($item['quantity'], $item['unit_cost'])) {
                return ['success' => false, 'message' => 'Each item must have quantity and unit_cost'];
            }
            
            $quantity = (float)$item['quantity'];
            $unit_cost = (float)$item['unit_cost'];
            
            if ($quantity <= 0) {
                return ['success' => false, 'message' => 'Quantity must be greater than 0'];
            }
            
            if ($unit_cost <= 0) {
                return ['success' => false, 'message' => 'Unit cost must be greater than 0'];
            }
            
            $line_total = $quantity * $unit_cost;
            $total += $line_total;
            
            if ($hasProductId) {
                $product_id = (int)$item['product_id'];
                $productStmt = $this->db()->prepare("SELECT product_id, name FROM products WHERE product_id = ?");
                $productStmt->execute([$product_id]);
                $product = $productStmt->fetch(PDO::FETCH_ASSOC);
                if (!$product) {
                    return ['success' => false, 'message' => "Invalid product ID: $product_id"];
                }
                $validatedItems[] = [
                    'product_id' => $product_id,
                    'raw_material_id' => null,
                    'product_name' => $product['name'],
                    'name' => $product['name'],
                    'item_name' => $product['name'],
                    'item_type' => 'product',
                    'quantity' => $quantity,
                    'unit_cost' => $unit_cost,
                    'line_total' => $line_total
                ];
            } else {
                $raw_material_id = (int)$item['raw_material_id'];
                $rawMaterialStmt = $this->db()->prepare("SELECT raw_material_id, name FROM raw_materials WHERE raw_material_id = ?");
                $rawMaterialStmt->execute([$raw_material_id]);
                $rawMaterial = $rawMaterialStmt->fetch(PDO::FETCH_ASSOC);
                if (!$rawMaterial) {
                    return ['success' => false, 'message' => "Invalid raw material ID: $raw_material_id"];
                }
                $validatedItems[] = [
                    'product_id' => null,
                    'raw_material_id' => $raw_material_id,
                    'product_name' => $rawMaterial['name'],
                    'name' => $rawMaterial['name'],
                    'item_name' => $rawMaterial['name'],
                    'item_type' => 'raw_material',
                    'quantity' => $quantity,
                    'unit_cost' => $unit_cost,
                    'line_total' => $line_total
                ];
            }
        }
        return ['success' => true, 'items' => $validatedItems, 'total' => $total];
    }
    private function generatePONumber(): string
    {
        $prefix = 'HF-PO';  // Highland Fresh prefix
        $date = date('Ymd');
        
        // Add microseconds and random number to prevent duplicates
        $timestamp = time();
        $microseconds = microtime(true);
        $random = mt_rand(100, 999);
        
        // Try up to 5 times to generate a unique PO number
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            // Create unique number combining timestamp, microseconds, and random
            $uniqueNum = substr(str_replace('.', '', $microseconds), -3) . $random;
            $poNumber = "$prefix-$date-$uniqueNum";
            
            // Check if this PO number already exists
            $stmt = $this->db()->prepare("SELECT COUNT(*) FROM purchase_orders WHERE po_number = ?");
            $stmt->execute([$poNumber]);
            $exists = $stmt->fetchColumn();
            
            if (!$exists) {
                return $poNumber;
            }
            
            // If it exists, increment random number and try again
            $random = mt_rand(100, 999);
            usleep(1000); // Wait 1ms to ensure different microseconds
        }
        
        // Fallback: use sequential number with lock
        return $this->generateSequentialPONumber($prefix, $date);
    }
    
    private function generateSequentialPONumber(string $prefix, string $date): string
    {
        // Use database lock to prevent race conditions
        $this->db()->exec("LOCK TABLES purchase_orders WRITE");
        
        try {
            $stmt = $this->db()->prepare(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(po_number, 12) AS UNSIGNED)), 0) + 1 as next_num 
                 FROM purchase_orders 
                 WHERE po_number LIKE ?"
            );
            $stmt->execute(["$prefix-$date%"]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $nextNum = str_pad($result['next_num'], 3, '0', STR_PAD_LEFT);
            
            return "$prefix-$date-$nextNum";
        } finally {
            $this->db()->exec("UNLOCK TABLES");
        }
    }

    private function generateHighlandFreshBatchCode(int $po_id, ?int $product_id = null, ?int $raw_material_id = null): string
    {
        $date = date('Ymd');
        $poCode = str_pad($po_id, 3, '0', STR_PAD_LEFT);
        
        if ($raw_material_id !== null) {
            $itemCode = str_pad($raw_material_id, 3, '0', STR_PAD_LEFT);
            $typePrefix = 'RM';
        } elseif ($product_id !== null) {
            $itemCode = str_pad($product_id, 3, '0', STR_PAD_LEFT);
            $typePrefix = 'PR';
        } else {
            $itemCode = '000';
            $typePrefix = 'XX';
        }
        
        return "HF-$date-$poCode-$typePrefix$itemCode";
    }
    private function sendPOEmail(int $po_id, array $supplier, array $items, float $total, string $poNumber): array
    {
        try {
            $to = $supplier['email'];
            $subject = "Highland Fresh Purchase Order - $poNumber";
            $emailBody = $this->generatePOEmailTemplate($poNumber, $supplier, $items, $total);
            $headers = "MIME-Version: 1.0" . "\r\n";
            $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
            $headers .= "From: highland.fresh.orders@gmail.com" . "\r\n";
            $mailSent = mail($to, $subject, $emailBody, $headers);
            if ($mailSent) {
                return ['success' => true, 'message' => 'Email sent successfully using built-in mail function'];
            } else {
                error_log("PO Email Content (not sent): To: $to, Subject: $subject");
                return ['success' => true, 'message' => 'Purchase order created (email logged instead of sent)'];
            }
        } catch (Exception $e) {
            error_log("PO Email failed: " . $e->getMessage());
            return ['success' => true, 'message' => 'Purchase order created (email functionality disabled)'];
        }
    }
    private function generatePOEmailTemplate(string $poNumber, array $supplier, array $items, float $total): string
    {
        $date = date('F j, Y');
        $itemsHtml = '';
        foreach ($items as $item) {
            $itemsHtml .= sprintf(
                '<tr>
                    <td style="padding: 8px; border: 1px solid 
                    <td style="padding: 8px; border: 1px solid 
                    <td style="padding: 8px; border: 1px solid 
                    <td style="padding: 8px; border: 1px solid 
                </tr>',
                htmlspecialchars($item['product_name']),
                $item['quantity'],
                $item['unit_cost'],
                $item['line_total']
            );
        }
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .header { background-color: 
                .content { padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background-color: 
                td { padding: 8px; border: 1px solid 
                .total { font-weight: bold; font-size: 18px; color: 
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>Highland Fresh Daily Products</h1>
                <h2>Purchase Order 
            </div>
            <div class='content'>
                <p><strong>Date:</strong> $date</p>
                <p><strong>Supplier:</strong> {$supplier['name']}</p>
                <p><strong>Contact:</strong> {$supplier['contact_person']}</p>
                <h3>Order Details:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Unit Cost</th>
                            <th>Line Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        $itemsHtml
                        <tr>
                            <td colspan='3' style='text-align: right; font-weight: bold;'>Total Amount:</td>
                            <td style='text-align: right;' class='total'>$" . number_format($total, 2) . "</td>
                        </tr>
                    </tbody>
                </table>
                <p>Please confirm receipt of this order and provide expected delivery date.</p>
                <p>Thank you for your continued partnership.</p>
                <hr>
                <p><small>Highland Fresh Daily Products<br>
                Email: highland.fresh.orders@gmail.com<br>
                This is an automated message.</small></p>
            </div>
        </body>
        </html>";
    }
    private function getPODetails(int $po_id): ?array
    {
        $stmt = $this->db()->prepare(
            "SELECT 
                po.po_id,
                po.po_number,
                po.supplier_id,
                s.name as supplier_name,
                s.email as supplier_email,
                po.user_id,
                u.username as created_by,
                po.total_amount,
                ts.status_name as status,
                po.order_date,
                po.expected_delivery_date,
                po.received_date,
                po.notes,
                po.purchase_type,
                po.highland_fresh_approved,
                po.created_at
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN users u ON po.user_id = u.user_id
            LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
            WHERE po.po_id = ?"
        );
        $stmt->execute([$po_id]);
        $po = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($po) {
            $itemsStmt = $this->db()->prepare(
                "SELECT 
                    poi.po_item_id,
                    poi.product_id,
                    p.name as product_name,
                    p.sku as product_sku,
                    poi.raw_material_id,
                    rm.name as raw_material_name,
                    rm.sku as raw_material_sku,
                    rm.category as raw_material_category,
                    uom.unit_name,
                    poi.ordered_quantity,
                    poi.received_quantity,
                    poi.accepted_quantity,
                    poi.rejected_quantity,
                    poi.unit_cost,
                    poi.line_total,
                    poi.highland_fresh_batch_code,
                    poi.quality_grade_received,
                    poi.temperature_at_receipt,
                    poi.quality_test_passed,
                    CASE 
                        WHEN poi.product_id IS NOT NULL THEN 'product'
                        WHEN poi.raw_material_id IS NOT NULL THEN 'raw_material'
                        ELSE 'unknown'
                    END as item_type
                FROM purchase_order_items poi
                LEFT JOIN products p ON poi.product_id = p.product_id
                LEFT JOIN raw_materials rm ON poi.raw_material_id = rm.raw_material_id
                LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                WHERE poi.po_id = ?
                ORDER BY 
                    CASE 
                        WHEN poi.product_id IS NOT NULL THEN p.name
                        WHEN poi.raw_material_id IS NOT NULL THEN rm.name
                        ELSE 'ZZZ'
                    END"
            );
            $itemsStmt->execute([$po_id]);
            $po['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        return $po ?: null;
    }

    public function getActivePOCount(): void
    {
        try {
            $pdo = $this->db();

            // Active POs are those that are Sent or Confirmed (not yet received or cancelled)
            $sql = "
                SELECT COUNT(*) as count
                FROM purchase_orders po
                LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
                WHERE ts.status_name IN ('PO Sent', 'PO Confirmed', 'Sent', 'Confirmed')
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->respond([
                'success' => true,
                'count' => (int)$result['count']
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve active PO count: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get Open Purchase Orders (waiting to be received by Warehouse Staff)
     * Returns POs with status "PO Sent" or "PO Confirmed"
     */
    public function getOpenPOs(): void
    {
        try {
            $pdo = $this->db();

            $sql = "
                SELECT 
                    po.po_id,
                    po.po_number,
                    po.supplier_id,
                    s.name as supplier_name,
                    s.email as supplier_email,
                    po.total_amount,
                    ts.status_name as status,
                    po.order_date,
                    po.expected_delivery_date,
                    po.notes,
                    po.created_at,
                    u.username as created_by,
                    COUNT(poi.po_item_id) as items_count,
                    DATEDIFF(CURDATE(), po.order_date) as days_since_order,
                    CASE 
                        WHEN po.expected_delivery_date < CURDATE() THEN 1 
                        ELSE 0 
                    END as is_overdue
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
                LEFT JOIN transaction_statuses ts ON po.status_id = ts.status_id
                LEFT JOIN users u ON po.user_id = u.user_id
                LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
                WHERE ts.status_name IN ('PO Sent', 'PO Confirmed', 'Sent', 'Confirmed')
                GROUP BY po.po_id
                ORDER BY 
                    is_overdue DESC,
                    po.expected_delivery_date ASC,
                    po.order_date ASC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respond([
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve open POs: ' . $e->getMessage(), 500);
        }
    }

    public function getRecentActivity(): void
    {
        try {
            $pdo = $this->db();
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

            // Get recent activities from various sources
            $activities = [];

            // 1. Recent Purchase Orders Created
            $poCreatedStmt = $pdo->prepare("
                SELECT 
                    'PO_CREATED' as activity_type,
                    po.po_number as reference,
                    CONCAT('Created PO #', po.po_number) as action,
                    u.username as user,
                    po.created_at as timestamp
                FROM purchase_orders po
                LEFT JOIN users u ON po.user_id = u.user_id
                ORDER BY po.created_at DESC
                LIMIT 5
            ");
            $poCreatedStmt->execute();
            $activities = array_merge($activities, $poCreatedStmt->fetchAll(PDO::FETCH_ASSOC));

            // 2. Recent Purchase Orders Received
            $poReceivedStmt = $pdo->prepare("
                SELECT 
                    'PO_RECEIVED' as activity_type,
                    po.po_number as reference,
                    CONCAT('Received PO #', po.po_number) as action,
                    u.username as user,
                    po.received_date as timestamp
                FROM purchase_orders po
                LEFT JOIN users u ON po.user_id = u.user_id
                WHERE po.received_date IS NOT NULL
                ORDER BY po.received_date DESC
                LIMIT 5
            ");
            $poReceivedStmt->execute();
            $activities = array_merge($activities, $poReceivedStmt->fetchAll(PDO::FETCH_ASSOC));

            // 3. Recent Sales Orders (approved ones)
            $salesStmt = $pdo->prepare("
                SELECT 
                    'ORDER_APPROVED' as activity_type,
                    s.sale_number as reference,
                    CONCAT('Order #', s.sale_number, ' processed') as action,
                    u.username as user,
                    s.sale_date as timestamp
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.user_id
                WHERE s.status_id IN (1, 2)
                ORDER BY s.sale_date DESC
                LIMIT 5
            ");
            $salesStmt->execute();
            $activities = array_merge($activities, $salesStmt->fetchAll(PDO::FETCH_ASSOC));

            // Sort all activities by timestamp
            usort($activities, function($a, $b) {
                return strtotime($b['timestamp']) - strtotime($a['timestamp']);
            });

            // Limit to requested number
            $activities = array_slice($activities, 0, $limit);

            // Format timestamps
            foreach ($activities as &$activity) {
                $timestamp = strtotime($activity['timestamp']);
                $diff = time() - $timestamp;
                
                if ($diff < 60) {
                    $activity['time_ago'] = 'Just now';
                } elseif ($diff < 3600) {
                    $minutes = floor($diff / 60);
                    $activity['time_ago'] = $minutes . ' minute' . ($minutes > 1 ? 's' : '') . ' ago';
                } elseif ($diff < 86400) {
                    $hours = floor($diff / 3600);
                    $activity['time_ago'] = $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
                } else {
                    $days = floor($diff / 86400);
                    $activity['time_ago'] = $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
                }
            }

            $this->respond([
                'success' => true,
                'data' => $activities
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve recent activity: ' . $e->getMessage(), 500);
        }
    }

    public function getPerformanceMetrics(): void
    {
        try {
            $pdo = $this->db();

            // 1. Order Fulfillment Rate (Completed sales vs Total sales in last 30 days)
            $fulfillmentStmt = $pdo->query("
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status_id = 2 THEN 1 ELSE 0 END) as completed_orders
                FROM sales
                WHERE sale_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ");
            $fulfillmentData = $fulfillmentStmt->fetch(PDO::FETCH_ASSOC);
            $fulfillmentRate = $fulfillmentData['total_orders'] > 0 
                ? round(($fulfillmentData['completed_orders'] / $fulfillmentData['total_orders']) * 100, 1)
                : 0;

            // 2. Inventory Accuracy (Products within acceptable stock range)
            $accuracyStmt = $pdo->query("
                SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE 
                        WHEN quantity_on_hand >= reorder_level 
                        AND (max_stock_level IS NULL OR quantity_on_hand <= max_stock_level * 1.2)
                        THEN 1 ELSE 0 
                    END) as accurate_products
                FROM products
                WHERE is_active = 1
            ");
            $accuracyData = $accuracyStmt->fetch(PDO::FETCH_ASSOC);
            $accuracyRate = $accuracyData['total_products'] > 0 
                ? round(($accuracyData['accurate_products'] / $accuracyData['total_products']) * 100, 1)
                : 0;

            // 3. On-Time Purchase Order Deliveries (POs received within expected date)
            $deliveryStmt = $pdo->query("
                SELECT 
                    COUNT(*) as total_received,
                    SUM(CASE 
                        WHEN received_date IS NOT NULL 
                        AND received_date <= expected_delivery_date 
                        THEN 1 ELSE 0 
                    END) as on_time_deliveries
                FROM purchase_orders
                WHERE received_date IS NOT NULL
                AND received_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            ");
            $deliveryData = $deliveryStmt->fetch(PDO::FETCH_ASSOC);
            $deliveryRate = $deliveryData['total_received'] > 0 
                ? round(($deliveryData['on_time_deliveries'] / $deliveryData['total_received']) * 100, 1)
                : 0;

            $this->respond([
                'success' => true,
                'data' => [
                    'fulfillment_rate' => $fulfillmentRate,
                    'accuracy_rate' => $accuracyRate,
                    'delivery_rate' => $deliveryRate
                ]
            ]);
        } catch (Exception $e) {
            $this->respondError('Failed to retrieve performance metrics: ' . $e->getMessage(), 500);
        }
    }

    // ============================================================
    // BOM TRIGGER B: Material Price Change Detection
    // ============================================================

    /**
     * Get previous average cost for a raw material
     * Used to detect significant price changes
     */
    private function getPreviousMaterialCost(int $rawMaterialId): float
    {
        try {
            // First try to get standard_cost from raw_materials
            $stmt = $this->db()->prepare("
                SELECT standard_cost, name FROM raw_materials WHERE raw_material_id = ?
            ");
            $stmt->execute([$rawMaterialId]);
            $material = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($material && floatval($material['standard_cost']) > 0) {
                return floatval($material['standard_cost']);
            }
            
            // Fallback: Get average from recent batches
            $stmt = $this->db()->prepare("
                SELECT AVG(unit_cost) as avg_cost
                FROM raw_material_batches 
                WHERE raw_material_id = ? 
                  AND received_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  AND unit_cost > 0
            ");
            $stmt->execute([$rawMaterialId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return floatval($result['avg_cost'] ?? 0);
        } catch (Exception $e) {
            error_log('getPreviousMaterialCost error: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Check if material price changed significantly and trigger BOM recalculation
     * Threshold: >= 5% change OR >= ₱2 absolute change
     */
    private function checkPriceChangeAndTriggerBOM(int $rawMaterialId, float $newCost): array
    {
        $bomTriggered = false;
        $affectedProducts = [];
        $priceChange = 0;
        $previousCost = 0;
        
        try {
            $pdo = $this->db();
            $previousCost = $this->getPreviousMaterialCost($rawMaterialId);
            
            // If no previous cost, set it now and skip trigger
            if ($previousCost <= 0) {
                $stmt = $pdo->prepare("
                    UPDATE raw_materials SET standard_cost = ? WHERE raw_material_id = ?
                ");
                $stmt->execute([$newCost, $rawMaterialId]);
                
                return [
                    'bom_triggered' => false,
                    'reason' => 'First cost recorded',
                    'new_cost' => round($newCost, 2),
                    'previous_cost' => 0,
                    'price_change' => 0,
                    'affected_products_count' => 0,
                    'affected_products' => []
                ];
            }
            
            // Calculate price difference
            $priceChange = $newCost - $previousCost;
            $percentageChange = abs($priceChange / $previousCost * 100);
            
            // Threshold: 5% or ₱2 change
            if (abs($priceChange) >= 2 || $percentageChange >= 5) {
                $bomTriggered = true;
                
                // Get affected products (those using this raw material in their recipe)
                $affectedProducts = $this->getProductsUsingMaterial($rawMaterialId);
                
                // Update raw_materials.standard_cost
                $stmt = $pdo->prepare("
                    UPDATE raw_materials SET standard_cost = ? WHERE raw_material_id = ?
                ");
                $stmt->execute([$newCost, $rawMaterialId]);
                
                // Get material name for notification
                $stmt = $pdo->prepare("SELECT name FROM raw_materials WHERE raw_material_id = ?");
                $stmt->execute([$rawMaterialId]);
                $material = $stmt->fetch(PDO::FETCH_ASSOC);
                $materialName = $material['name'] ?? 'Unknown Material';
                
                // Create notification for Finance Officer
                $this->createFinanceNotificationForMaterial(
                    $materialName,
                    $rawMaterialId,
                    $previousCost,
                    $newCost,
                    $priceChange,
                    count($affectedProducts)
                );
                
                error_log("[BOM TRIGGER B] Material: {$materialName}, Price: ₱{$previousCost} → ₱{$newCost}, Affected: " . count($affectedProducts));
            }
            
        } catch (Exception $e) {
            error_log('BOM Trigger B Error: ' . $e->getMessage());
        }
        
        return [
            'bom_triggered' => $bomTriggered,
            'price_change' => round($priceChange, 2),
            'percentage_change' => round($percentageChange ?? 0, 1),
            'previous_cost' => round($previousCost, 2),
            'new_cost' => round($newCost, 2),
            'affected_products_count' => count($affectedProducts),
            'affected_products' => $affectedProducts
        ];
    }

    /**
     * Get all products that use a specific raw material in their recipe
     */
    private function getProductsUsingMaterial(int $rawMaterialId): array
    {
        try {
            $stmt = $this->db()->prepare("
                SELECT DISTINCT 
                    pr.recipe_id, 
                    pr.recipe_name, 
                    p.product_id, 
                    p.name as product_name,
                    rrm.quantity_per_batch
                FROM production_recipes pr
                JOIN recipe_raw_materials rrm ON pr.recipe_id = rrm.recipe_id
                LEFT JOIN products p ON pr.product_id = p.product_id
                WHERE rrm.raw_material_id = ?
            ");
            $stmt->execute([$rawMaterialId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log('getProductsUsingMaterial error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Create notification for Finance Officer about material price change
     */
    private function createFinanceNotificationForMaterial(
        string $materialName,
        int $rawMaterialId,
        float $oldCost,
        float $newCost,
        float $change,
        int $affectedCount
    ): void {
        try {
            $pdo = $this->db();
            
            // Check if system_notifications table exists
            $stmt = $pdo->query("SHOW TABLES LIKE 'system_notifications'");
            if ($stmt->rowCount() > 0) {
                $direction = $change > 0 ? 'increased' : 'decreased';
                $percentChange = $oldCost > 0 ? round(abs($change / $oldCost) * 100, 1) : 0;
                $message = sprintf(
                    "%s price %s from ₱%.2f to ₱%.2f (%s%.1f%%, %s₱%.2f). %d product(s) may need cost review.",
                    $materialName,
                    $direction,
                    $oldCost,
                    $newCost,
                    $change > 0 ? '+' : '',
                    $percentChange,
                    $change > 0 ? '+' : '',
                    $change,
                    $affectedCount
                );
                
                $metadata = json_encode([
                    'old_cost' => round($oldCost, 2),
                    'new_cost' => round($newCost, 2),
                    'change' => round($change, 2),
                    'percent_change' => $percentChange,
                    'affected_products' => $affectedCount
                ]);
                
                $stmt = $pdo->prepare("
                    INSERT INTO system_notifications (
                        notification_type, 
                        title, 
                        message,
                        severity,
                        reference_type,
                        reference_id,
                        metadata,
                        target_role, 
                        is_read, 
                        created_at
                    ) VALUES (
                        'BOM_PRICE_CHANGE',
                        'Material Price Change Alert',
                        ?,
                        ?,
                        'raw_material',
                        ?,
                        ?,
                        'Finance Officer',
                        0,
                        NOW()
                    )
                ");
                
                // Severity based on impact
                $severity = 'info';
                if ($percentChange >= 10 || abs($change) >= 5) {
                    $severity = 'critical';
                } elseif ($percentChange >= 5 || abs($change) >= 2) {
                    $severity = 'warning';
                }
                
                $stmt->execute([$message, $severity, $rawMaterialId, $metadata]);
                
                error_log("[FINANCE NOTIFICATION] Created: {$message}");
            } else {
                error_log("[FINANCE NOTIFICATION] Table not found - Material: {$materialName}, Change: ₱{$change}");
            }
        } catch (Exception $e) {
            error_log('createFinanceNotificationForMaterial error: ' . $e->getMessage());
        }
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'PurchaseOrdersAPI.php') {
    $api = new PurchaseOrdersAPI(['methods' => 'GET, POST, PUT, DELETE, OPTIONS']);
    $api->route();
}
?>