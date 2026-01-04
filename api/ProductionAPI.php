<?php
// Production Management API
require_once '../api/DatabaseConfig.php';
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $conn = getDBConnection();

    // Authorization: only Admin or Production Supervisor
    $allowedRoles = ['Admin','Production Supervisor'];
    $currentRole = $_SESSION['role'] ?? null;
    if (!$currentRole && isset($_SESSION['user_id'])) {
        $stmt = $conn->prepare("SELECT ur.role_name FROM users u JOIN user_roles ur ON u.role_id = ur.role_id WHERE u.user_id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $currentRole = $stmt->fetchColumn();
        $_SESSION['role'] = $currentRole; // cache
    }
    if (!isset($_SESSION['user_id']) || !$currentRole || !in_array($currentRole, $allowedRoles)) {
        http_response_code(403);
        echo json_encode(['success'=>false,'message'=>'Unauthorized: Production Supervisor or Admin required']);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'get_production_planning':
                $stmt = $conn->query("
                    SELECT * FROM production_planning_view
                    ORDER BY production_needed DESC
                ");
                $planning = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'planning' => $planning
                ]);
                break;
                
            case 'get_production_recipes':
                $stmt = $conn->query("
                    SELECT pr.*, p.name as product_name
                    FROM production_recipes pr
                    JOIN products p ON pr.finished_product_id = p.product_id
                    WHERE pr.is_active = 1
                    ORDER BY p.name
                ");
                $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'recipes' => $recipes
                ]);
                break;
            
            // ============================================================
            // MASTER RECIPE FLOW: Get recipe requirements for a product
            // Returns the locked recipe with all raw materials needed per unit
            // ============================================================
            case 'get_recipe_for_product':
                $product_id = $_GET['product_id'] ?? null;
                
                if (!$product_id) {
                    throw new Exception('Product ID is required');
                }
                
                // Get the active recipe for this product (including cost threshold info)
                $stmt = $conn->prepare("
                    SELECT pr.recipe_id, pr.recipe_name, pr.batch_size_yield, 
                           pr.production_time_hours, pr.instructions, pr.quality_control_notes,
                           pr.standard_batch_cost, pr.cost_variance_threshold_percent, pr.requires_cost_approval,
                           p.name as product_name, uom.unit_abbreviation as product_unit
                    FROM production_recipes pr
                    JOIN products p ON pr.finished_product_id = p.product_id
                    LEFT JOIN units_of_measure uom ON p.unit_id = uom.unit_id
                    WHERE pr.finished_product_id = ? AND pr.is_active = 1
                    LIMIT 1
                ");
                $stmt->execute([$product_id]);
                $recipe = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$recipe) {
                    echo json_encode([
                        'success' => false,
                        'message' => 'No active recipe found for this product. Contact Finance Officer to set up a Master Recipe.',
                        'has_recipe' => false
                    ]);
                    break;
                }
                
                // Get recipe raw materials with their ratios (quantity per batch)
                $stmt = $conn->prepare("
                    SELECT 
                        rrm.id,
                        rrm.raw_material_id,
                        rrm.quantity_required,
                        rrm.is_critical,
                        rrm.processing_notes,
                        rm.name as material_name,
                        rm.quantity_on_hand as available_qty,
                        uom.unit_abbreviation as unit
                    FROM recipe_raw_materials rrm
                    JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
                    LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                    WHERE rrm.recipe_id = ?
                    ORDER BY rrm.is_critical DESC, rm.name ASC
                ");
                $stmt->execute([$recipe['recipe_id']]);
                $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Calculate quantity_per_unit (for scaling)
                // batch_size_yield = how many units one batch produces
                // quantity_required = how much material is needed for one batch
                // quantity_per_unit = quantity_required / batch_size_yield
                $batch_size = floatval($recipe['batch_size_yield']);
                foreach ($materials as &$mat) {
                    $mat['quantity_per_unit'] = $batch_size > 0 
                        ? floatval($mat['quantity_required']) / $batch_size 
                        : floatval($mat['quantity_required']);
                    
                    // Get batch-level pricing info for transparency (FIFO order)
                    $batchStmt = $conn->prepare("
                        SELECT 
                            rmb.batch_id,
                            rmb.current_quantity,
                            rmb.unit_cost,
                            rmb.received_date
                        FROM raw_material_batches rmb
                        WHERE rmb.raw_material_id = ?
                          AND rmb.current_quantity > 0
                          AND rmb.unit_cost > 0
                          AND rmb.status IN ('RECEIVED', 'APPROVED')
                          AND (rmb.expiry_date IS NULL OR rmb.expiry_date > CURDATE())
                        ORDER BY rmb.received_date ASC, rmb.batch_id ASC
                    ");
                    $batchStmt->execute([$mat['raw_material_id']]);
                    $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Calculate batch pricing summary
                    $mat['batches'] = $batches;
                    $mat['batch_count'] = count($batches);
                    
                    // Check if there are different prices
                    $prices = array_unique(array_column($batches, 'unit_cost'));
                    $mat['has_mixed_prices'] = count($prices) > 1;
                    
                    if (count($batches) > 0) {
                        $mat['lowest_price'] = min($prices);
                        $mat['highest_price'] = max($prices);
                        $mat['fifo_price'] = floatval($batches[0]['unit_cost']); // First batch = FIFO
                    }
                }
                
                echo json_encode([
                    'success' => true,
                    'has_recipe' => true,
                    'recipe' => $recipe,
                    'materials' => $materials
                ]);
                break;
                
            case 'get_batch_details':
                $batch_id = $_GET['batch_id'] ?? null;
                
                if (!$batch_id) {
                    throw new Exception('Batch ID is required');
                }
                
                // Get batch information
                $stmt = $conn->prepare("
                    SELECT 
                        pb.*,
                        pr.recipe_name,
                        COALESCE(p1.name, p2.name) as product_name
                    FROM production_batches pb
                    LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                    LEFT JOIN products p1 ON pr.finished_product_id = p1.product_id
                    LEFT JOIN products p2 ON pb.product_id = p2.product_id
                    WHERE pb.batch_id = ?
                ");
                $stmt->execute([$batch_id]);
                $batch = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$batch) {
                    throw new Exception('Batch not found');
                }
                
                // Get materials used in this batch
                $stmt = $conn->prepare("
                    SELECT 
                        pmu.*,
                        rm.name as material_name,
                        uom.unit_abbreviation as unit_of_measure
                    FROM production_material_usage pmu
                    JOIN raw_materials rm ON pmu.raw_material_id = rm.raw_material_id
                    LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                    WHERE pmu.batch_id = ?
                    ORDER BY pmu.issued_at
                ");
                $stmt->execute([$batch_id]);
                $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'batch' => $batch,
                    'materials' => $materials
                ]);
                break;
                
            case 'check_raw_materials_availability':
                $recipe_id = $_GET['recipe_id'] ?? null;
                $batches_needed = $_GET['batches_needed'] ?? 1;
                
                if (!$recipe_id) {
                    throw new Exception('Recipe ID is required');
                }
                
                $stmt = $conn->prepare("CALL check_raw_materials_availability(?, ?, @can_produce, @missing_materials)");
                $stmt->execute([$recipe_id, $batches_needed]);
                
                $result = $conn->query("SELECT @can_produce as can_produce, @missing_materials as missing_materials")->fetch();
                
                echo json_encode([
                    'success' => true,
                    'can_produce' => (bool)$result['can_produce'],
                    'missing_materials' => $result['missing_materials']
                ]);
                break;
            
            // ============================================================
            // GAP 2-GAP-1 & 2-GAP-3 FIX: Get batch materials used (for wastage linkage)
            // ============================================================
            case 'get_batch_materials_used':
                $batch_id = $_GET['batch_id'] ?? null;
                
                if (!$batch_id) {
                    throw new Exception('Batch ID is required');
                }
                
                // Get materials used with batch traceability from raw_material_consumption
                $stmt = $conn->prepare("
                    SELECT 
                        rmc.consumption_id,
                        rmc.batch_id as rm_batch_id,
                        rmc.highland_fresh_batch_code as batch_code,
                        rmc.quantity_consumed as quantity_issued,
                        rmc.consumption_date,
                        rm.name as material_name,
                        uom.unit_abbreviation as unit
                    FROM raw_material_consumption rmc
                    JOIN raw_materials rm ON rmc.raw_material_id = rm.raw_material_id
                    LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                    WHERE rmc.production_batch_id = ?
                    ORDER BY rmc.consumption_date ASC
                ");
                $stmt->execute([$batch_id]);
                $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // If no data from raw_material_consumption, fall back to production_material_usage
                if (empty($materials)) {
                    $stmt = $conn->prepare("
                        SELECT 
                            pmu.usage_id,
                            pmu.raw_material_id,
                            pmu.quantity_issued,
                            pmu.issued_at,
                            rm.name as material_name,
                            uom.unit_abbreviation as unit,
                            'N/A' as batch_code
                        FROM production_material_usage pmu
                        JOIN raw_materials rm ON pmu.raw_material_id = rm.raw_material_id
                        LEFT JOIN units_of_measure uom ON rm.unit_id = uom.unit_id
                        WHERE pmu.batch_id = ?
                        ORDER BY pmu.issued_at ASC
                    ");
                    $stmt->execute([$batch_id]);
                    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }
                
                echo json_encode([
                    'success' => true,
                    'materials' => $materials
                ]);
                break;
                
            default:
                throw new Exception('Invalid action specified');
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        switch ($action) {
            // ============================================================
            // GAP 2-GAP-1 FIX: FIFO Preview API
            // ============================================================
            case 'preview_fifo_allocation':
                $materials = $input['materials'] ?? [];
                
                if (empty($materials)) {
                    throw new Exception('No materials provided for preview');
                }
                
                $fifo_preview = [];
                
                foreach ($materials as $material) {
                    $raw_material_id = $material['raw_material_id'];
                    $quantity_requested = $material['quantity_requested'];
                    $material_name = $material['material_name'];
                    
                    // Get available batches in FIFO order
                    $stmt = $conn->prepare("
                        SELECT 
                            rmb.batch_id,
                            rmb.highland_fresh_batch_code as batch_code,
                            rmb.current_quantity,
                            rmb.received_date,
                            rmb.expiry_date,
                            rmb.storage_location,
                            COALESCE(rmb.unit_cost, rm.unit_price, 0) as unit_cost
                        FROM raw_material_batches rmb
                        LEFT JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
                        WHERE rmb.raw_material_id = ?
                          AND rmb.current_quantity > 0
                          AND rmb.status IN ('RECEIVED', 'APPROVED')
                          AND (rmb.expiry_date IS NULL OR rmb.expiry_date > CURDATE())
                        ORDER BY rmb.received_date ASC, rmb.batch_id ASC
                    ");
                    $stmt->execute([$raw_material_id]);
                    $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Calculate FIFO allocation
                    $remaining_needed = $quantity_requested;
                    $total_available = 0;
                    $allocation_batches = [];
                    $total_material_cost = 0;
                    
                    foreach ($batches as $batch) {
                        $batch_qty = floatval($batch['current_quantity']);
                        $unit_cost = floatval($batch['unit_cost'] ?? 0);
                        $total_available += $batch_qty;
                        
                        $quantity_to_use = 0;
                        $batch_cost = 0;
                        if ($remaining_needed > 0) {
                            $quantity_to_use = min($batch_qty, $remaining_needed);
                            $remaining_needed -= $quantity_to_use;
                            $batch_cost = $quantity_to_use * $unit_cost;
                            $total_material_cost += $batch_cost;
                        }
                        
                        $allocation_batches[] = [
                            'batch_id' => $batch['batch_id'],
                            'batch_code' => $batch['batch_code'],
                            'received_date' => $batch['received_date'],
                            'expiry_date' => $batch['expiry_date'],
                            'storage_location' => $batch['storage_location'],
                            'current_quantity' => $batch_qty,
                            'quantity_to_use' => $quantity_to_use,
                            'unit_cost' => $unit_cost,
                            'batch_cost' => $batch_cost
                        ];
                    }
                    
                    $fifo_preview[] = [
                        'raw_material_id' => $raw_material_id,
                        'material_name' => $material_name,
                        'quantity_requested' => $quantity_requested,
                        'total_available' => $total_available,
                        'insufficient_stock' => $total_available < $quantity_requested,
                        'total_material_cost' => $total_material_cost,
                        'batches' => $allocation_batches
                    ];
                }
                
                // Calculate grand total production cost
                $grand_total_cost = array_sum(array_column($fifo_preview, 'total_material_cost'));
                
                echo json_encode([
                    'success' => true,
                    'fifo_preview' => $fifo_preview,
                    'total_production_cost' => $grand_total_cost
                ]);
                break;
            
            // ============================================================
            // COST APPROVAL WORKFLOW: Check if approval is needed
            // ============================================================
            case 'check_cost_approval_required':
                $recipe_id = $input['recipe_id'] ?? null;
                $product_id = $input['product_id'] ?? null;
                $planned_quantity = floatval($input['planned_quantity'] ?? 0);
                $estimated_cost = floatval($input['estimated_cost'] ?? 0);
                
                if (!$recipe_id || !$product_id || $planned_quantity <= 0) {
                    throw new Exception('Recipe ID, Product ID, and planned quantity are required');
                }
                
                // Get recipe cost thresholds
                $stmt = $conn->prepare("
                    SELECT standard_batch_cost, cost_variance_threshold_percent, requires_cost_approval, batch_size_yield
                    FROM production_recipes WHERE recipe_id = ?
                ");
                $stmt->execute([$recipe_id]);
                $recipe = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$recipe || !$recipe['standard_batch_cost']) {
                    // No standard cost set - no approval required
                    echo json_encode([
                        'success' => true,
                        'approval_required' => false,
                        'reason' => 'No standard cost set for this recipe'
                    ]);
                    break;
                }
                
                $batch_size = floatval($recipe['batch_size_yield']);
                $num_batches = $batch_size > 0 ? $planned_quantity / $batch_size : 1;
                $standard_total = $num_batches * floatval($recipe['standard_batch_cost']);
                $variance_percent = $standard_total > 0 ? (($estimated_cost - $standard_total) / $standard_total) * 100 : 0;
                $variance_amount = $estimated_cost - $standard_total;
                $threshold = floatval($recipe['cost_variance_threshold_percent']);
                
                $approval_required = $variance_percent > $threshold || $recipe['requires_cost_approval'];
                
                // Check if there's a pending approval already
                $pending_approval = null;
                if ($approval_required) {
                    $stmt = $conn->prepare("
                        SELECT approval_id, status, requested_at, review_notes
                        FROM production_cost_approvals 
                        WHERE recipe_id = ? AND product_id = ? AND planned_quantity = ? 
                          AND status = 'approved'
                          AND requested_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                        ORDER BY requested_at DESC LIMIT 1
                    ");
                    $stmt->execute([$recipe_id, $product_id, $planned_quantity]);
                    $pending_approval = $stmt->fetch(PDO::FETCH_ASSOC);
                }
                
                echo json_encode([
                    'success' => true,
                    'approval_required' => $approval_required && !$pending_approval,
                    'has_valid_approval' => !empty($pending_approval),
                    'approval_id' => $pending_approval['approval_id'] ?? null,
                    'standard_cost' => $standard_total,
                    'estimated_cost' => $estimated_cost,
                    'variance_percent' => round($variance_percent, 2),
                    'variance_amount' => round($variance_amount, 2),
                    'threshold_percent' => $threshold,
                    'reason' => $approval_required 
                        ? "Cost variance of " . round($variance_percent, 1) . "% exceeds threshold of {$threshold}%"
                        : "Within acceptable variance"
                ]);
                break;
            
            // ============================================================
            // COST APPROVAL WORKFLOW: Request approval from Finance
            // ============================================================
            case 'request_cost_approval':
                $recipe_id = $input['recipe_id'] ?? null;
                $product_id = $input['product_id'] ?? null;
                $planned_quantity = floatval($input['planned_quantity'] ?? 0);
                $estimated_cost = floatval($input['estimated_cost'] ?? 0);
                $standard_cost = floatval($input['standard_cost'] ?? 0);
                $variance_percent = floatval($input['variance_percent'] ?? 0);
                $variance_amount = floatval($input['variance_amount'] ?? 0);
                $batch_details = $input['batch_details'] ?? [];
                
                $user_id = $_SESSION['user_id'];
                
                $stmt = $conn->prepare("
                    INSERT INTO production_cost_approvals 
                    (recipe_id, product_id, planned_quantity, estimated_cost, standard_cost, 
                     variance_percent, variance_amount, status, requested_by, batch_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
                ");
                $stmt->execute([
                    $recipe_id, $product_id, $planned_quantity, $estimated_cost, $standard_cost,
                    $variance_percent, $variance_amount, $user_id, json_encode($batch_details)
                ]);
                
                $approval_id = $conn->lastInsertId();
                
                // Also create a notification for Finance
                $product_stmt = $conn->prepare("SELECT name FROM products WHERE product_id = ?");
                $product_stmt->execute([$product_id]);
                $product_name = $product_stmt->fetchColumn();
                
                $stmt = $conn->prepare("
                    INSERT INTO system_notifications 
                    (notification_type, title, message, reference_type, reference_id, created_at)
                    VALUES ('cost_approval_request', ?, ?, 'production_cost_approval', ?, NOW())
                ");
                $title = "Production Cost Approval Required";
                $message = "Production batch for {$product_name} ({$planned_quantity} units) has cost variance of " . 
                           round($variance_percent, 1) . "% (₱" . number_format($variance_amount, 2) . " over standard). " .
                           "Estimated cost: ₱" . number_format($estimated_cost, 2);
                $stmt->execute([$title, $message, $approval_id]);
                
                echo json_encode([
                    'success' => true,
                    'approval_id' => $approval_id,
                    'message' => 'Cost approval request submitted to Finance. You will be notified when approved.'
                ]);
                break;

            case 'issue_materials_and_create_batch':
                // NEW: Direct batch creation with material issuing (no recipe required)
                $product_id = $input['product_id'] ?? null;
                $product_name = $input['product_name'] ?? '';
                $planned_quantity = $input['planned_quantity'] ?? null;
                $operator_name = $input['operator_name'] ?? null;
                $production_date = $input['production_date'] ?? date('Y-m-d');
                $production_notes = $input['production_notes'] ?? '';
                $materials_to_issue = $input['materials_to_issue'] ?? [];
                
                if (!$product_id || !$planned_quantity || !$operator_name) {
                    throw new Exception('Product ID, planned quantity, and operator name are required');
                }
                
                if (empty($materials_to_issue)) {
                    throw new Exception('At least one raw material must be issued');
                }
                
                $conn->beginTransaction();
                
                try {
                    // Generate batch number
                    $batch_number = 'BATCH-' . date('Ymd') . '-' . sprintf('%04d', rand(1000, 9999));
                    
                    // Create production batch without recipe
                    // Note: batch_size is set to planned_quantity for recipe-less batches
                    // Set default expiry date to 7 days from production (dairy products)
                    $expiry_date = date('Y-m-d', strtotime($production_date . ' +7 days'));
                    
                    $stmt = $conn->prepare("
                        INSERT INTO production_batches 
                        (batch_number, recipe_id, batch_size, product_id, planned_quantity, production_date, expiry_date, operator_name, status, production_notes, created_at)
                        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'In Progress', ?, NOW())
                    ");
                    $stmt->execute([$batch_number, $planned_quantity, $product_id, $planned_quantity, $production_date, $expiry_date, $operator_name, $production_notes]);
                    
                    $batch_id = $conn->lastInsertId();
                    
                    // Issue raw materials using FIFO (First-In-First-Out)
                    // This ensures oldest batches are consumed first to prevent spoilage
                    foreach ($materials_to_issue as $material) {
                        $raw_material_id = $material['raw_material_id'];
                        $quantity_issued = $material['quantity_issued'];
                        
                        // ============================================================
                        // FIFO MATERIAL ISSUANCE - Consume oldest batches first
                        // ============================================================
                        
                        // Get available batches in FIFO order (oldest first)
                        $fifoBatchesStmt = $conn->prepare("
                            SELECT 
                                batch_id, highland_fresh_batch_code, current_quantity,
                                received_date, expiry_date, storage_location
                            FROM raw_material_batches
                            WHERE raw_material_id = ?
                              AND current_quantity > 0
                              AND status IN ('RECEIVED', 'APPROVED')
                              AND (expiry_date IS NULL OR expiry_date > CURDATE())
                            ORDER BY received_date ASC, batch_id ASC
                        ");
                        $fifoBatchesStmt->execute([$raw_material_id]);
                        $availableBatches = $fifoBatchesStmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        $remainingToIssue = $quantity_issued;
                        $fifoConsumption = [];
                        
                        foreach ($availableBatches as $rmBatch) {
                            if ($remainingToIssue <= 0) break;
                            
                            $batchQty = floatval($rmBatch['current_quantity']);
                            $takeFromBatch = min($batchQty, $remainingToIssue);
                            $newBatchQty = $batchQty - $takeFromBatch;
                            
                            // Update batch quantity (FIFO deduction)
                            $updateBatchStmt = $conn->prepare("
                                UPDATE raw_material_batches 
                                SET current_quantity = ?,
                                    status = CASE WHEN ? <= 0 THEN 'CONSUMED' ELSE status END,
                                    updated_at = NOW()
                                WHERE batch_id = ?
                            ");
                            $updateBatchStmt->execute([$newBatchQty, $newBatchQty, $rmBatch['batch_id']]);
                            
                            // Record batch consumption for traceability
                            $consumptionStmt = $conn->prepare("
                                INSERT INTO raw_material_consumption (
                                    batch_id, highland_fresh_batch_code, raw_material_id,
                                    production_batch_id, quantity_consumed, consumption_date,
                                    consumption_reason, highland_fresh_traceability
                                ) VALUES (?, ?, ?, ?, ?, NOW(), 'PRODUCTION', ?)
                            ");
                            $traceabilityData = json_encode([
                                'production_batch_number' => $batch_number,
                                'product_id' => $product_id,
                                'fifo_order' => count($fifoConsumption) + 1,
                                'batch_received_date' => $rmBatch['received_date'],
                                'batch_expiry_date' => $rmBatch['expiry_date']
                            ]);
                            $consumptionStmt->execute([
                                $rmBatch['batch_id'],
                                $rmBatch['highland_fresh_batch_code'],
                                $raw_material_id,
                                $batch_id,
                                $takeFromBatch,
                                $traceabilityData
                            ]);
                            
                            $fifoConsumption[] = [
                                'batch_id' => $rmBatch['batch_id'],
                                'batch_code' => $rmBatch['highland_fresh_batch_code'],
                                'quantity_taken' => $takeFromBatch,
                                'remaining_in_batch' => $newBatchQty
                            ];
                            
                            $remainingToIssue -= $takeFromBatch;
                        }
                        
                        // If we couldn't fulfill from batches, we have a problem
                        // This should only happen if batch tracking wasn't properly set up
                        if ($remainingToIssue > 0) {
                            // Fallback: just deduct from total (legacy behavior)
                            // This allows the system to work even without batch records
                            error_log("FIFO Warning: Could not fulfill $remainingToIssue from batches for raw_material_id $raw_material_id - using fallback");
                        }
                        
                        // Record material issuance in production_material_usage
                        // Include FIFO batch info for traceability
                        $stmt = $conn->prepare("
                            INSERT INTO production_material_usage 
                            (batch_id, raw_material_id, quantity_issued, issued_at)
                            VALUES (?, ?, ?, NOW())
                        ");
                        $stmt->execute([$batch_id, $raw_material_id, $quantity_issued]);
                        
                        // Also update raw_materials.quantity_on_hand (keep in sync)
                        $stmt = $conn->prepare("
                            UPDATE raw_materials 
                            SET quantity_on_hand = quantity_on_hand - ?
                            WHERE raw_material_id = ?
                        ");
                        $stmt->execute([$quantity_issued, $raw_material_id]);
                        
                        // ============================================================
                        // END FIFO MATERIAL ISSUANCE
                        // ============================================================
                        
                        // Check if update was successful
                        if ($stmt->rowCount() === 0) {
                            throw new Exception("Raw material ID {$raw_material_id} not found");
                        }
                        
                        // Verify we didn't go negative
                        $stmt = $conn->prepare("SELECT quantity_on_hand FROM raw_materials WHERE raw_material_id = ?");
                        $stmt->execute([$raw_material_id]);
                        $remaining = $stmt->fetchColumn();
                        
                        if ($remaining < 0) {
                            throw new Exception("Insufficient stock for raw material ID {$raw_material_id}");
                        }
                    }
                    
                    $conn->commit();
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Production batch created and materials issued successfully',
                        'batch_id' => $batch_id,
                        'batch_number' => $batch_number
                    ]);
                    
                } catch (Exception $e) {
                    $conn->rollBack();
                    throw $e;
                }
                break;
                
            case 'create_production_batch':
                $recipe_id = $input['recipe_id'] ?? null;
                $batch_size = $input['batch_size'] ?? null;
                $operator_name = $input['operator_name'] ?? null;
                $quality_grade = $input['quality_grade'] ?? 'Standard';
                
                if (!$recipe_id || !$batch_size || !$operator_name) {
                    throw new Exception('Recipe ID, batch size, and operator name are required');
                }
                
                $conn->beginTransaction();
                
                try {
                    // Generate batch number
                    $batch_number = 'BATCH-' . date('Ymd') . '-' . sprintf('%04d', rand(1000, 9999));
                    
                    // Set default expiry date to 7 days from today (dairy products)
                    $expiry_date = date('Y-m-d', strtotime('+7 days'));
                    
                    // Create production batch
                    $stmt = $conn->prepare("
                        INSERT INTO production_batches 
                        (batch_number, recipe_id, batch_size, production_date, expiry_date, start_time, operator_name, status, quality_grade)
                        VALUES (?, ?, ?, CURDATE(), ?, CURTIME(), ?, 'Planned', ?)
                    ");
                    $stmt->execute([$batch_number, $recipe_id, $batch_size, $expiry_date, $operator_name, $quality_grade]);
                    
                    $batch_id = $conn->lastInsertId();
                    
                    $conn->commit();
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Production batch created successfully',
                        'batch_id' => $batch_id,
                        'batch_number' => $batch_number
                    ]);
                    
                } catch (Exception $e) {
                    $conn->rollBack();
                    throw $e;
                }
                break;
                
            case 'start_production_batch':
                $batch_id = $input['batch_id'] ?? null;
                
                if (!$batch_id) {
                    throw new Exception('Batch ID is required');
                }
                
                $stmt = $conn->prepare("
                    UPDATE production_batches 
                    SET status = 'In Progress', start_time = CURTIME(), updated_at = NOW()
                    WHERE batch_id = ? AND status = 'Planned'
                ");
                $stmt->execute([$batch_id]);
                
                if ($stmt->rowCount() === 0) {
                    throw new Exception('Batch not found or not in planned status');
                }
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Production batch started successfully'
                ]);
                break;
                
            case 'complete_production_batch':
                $batch_id = $input['batch_id'] ?? null;
                $yield_quantity = $input['yield_quantity'] ?? null;
                $waste_quantity = $input['waste_quantity'] ?? 0;
                $waste_reason = $input['waste_reason'] ?? '';  // GAP 2-GAP-4 fix
                $production_cost = $input['production_cost'] ?? 0;
                $quality_notes = $input['quality_notes'] ?? '';
                
                if (!$batch_id || !$yield_quantity) {
                    throw new Exception('Batch ID and yield quantity are required');
                }
                
                // Validate waste reason if waste quantity > 0 (GAP 2-GAP-4)
                if ($waste_quantity > 0 && empty($waste_reason)) {
                    throw new Exception('Wastage reason is required when reporting waste');
                }
                
                $conn->beginTransaction();
                
                try {
                    // Build waste notes with reason (GAP 2-GAP-3 & 2-GAP-4)
                    $waste_notes = '';
                    if ($waste_quantity > 0) {
                        $waste_notes = "[WASTAGE] Qty: $waste_quantity, Reason: $waste_reason";
                        if (!empty($quality_notes)) {
                            $quality_notes = $waste_notes . "\n" . $quality_notes;
                        } else {
                            $quality_notes = $waste_notes;
                        }
                    }
                    
                    // Update production batch
                    $stmt = $conn->prepare("
                        UPDATE production_batches 
                        SET status = 'Completed', 
                            end_time = CURTIME(),
                            yield_quantity = ?,
                            quantity_remaining = ?,
                            waste_quantity = ?,
                            production_cost = ?,
                            quality_notes = ?,
                            updated_at = NOW()
                        WHERE batch_id = ? AND status = 'In Progress'
                    ");
                    $stmt->execute([$yield_quantity, $yield_quantity, $waste_quantity, $production_cost, $quality_notes, $batch_id]);
                    
                    if ($stmt->rowCount() === 0) {
                        throw new Exception('Batch not found or not in progress');
                    }
                    
                    // GAP 2-GAP-3: Record wastage with batch linkage if any
                    if ($waste_quantity > 0) {
                        // Get materials used in this batch for wastage linkage
                        $stmt = $conn->prepare("
                            SELECT rmc.batch_id as rm_batch_id, rmc.highland_fresh_batch_code, rmc.raw_material_id
                            FROM raw_material_consumption rmc
                            WHERE rmc.production_batch_id = ?
                            ORDER BY rmc.consumption_date ASC
                            LIMIT 1
                        ");
                        $stmt->execute([$batch_id]);
                        $linked_batch = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        // Log wastage with traceability (insert into a wastage log if table exists, or store in notes)
                        $wastage_traceability = json_encode([
                            'production_batch_id' => $batch_id,
                            'waste_quantity' => $waste_quantity,
                            'waste_reason' => $waste_reason,
                            'linked_rm_batch' => $linked_batch ? $linked_batch['highland_fresh_batch_code'] : null,
                            'recorded_at' => date('Y-m-d H:i:s'),
                            'recorded_by' => $_SESSION['user_id'] ?? null
                        ]);
                        
                        // Try to insert into wastage_log if table exists, otherwise just log
                        try {
                            $stmt = $conn->prepare("
                                INSERT INTO production_wastage_log 
                                (production_batch_id, waste_quantity, waste_reason, linked_rm_batch_code, traceability_data, created_at)
                                VALUES (?, ?, ?, ?, ?, NOW())
                            ");
                            $stmt->execute([
                                $batch_id, 
                                $waste_quantity, 
                                $waste_reason, 
                                $linked_batch ? $linked_batch['highland_fresh_batch_code'] : null,
                                $wastage_traceability
                            ]);
                        } catch (PDOException $e) {
                            // Table doesn't exist yet, just log the wastage info
                            error_log("Wastage logged for batch $batch_id: $wastage_traceability");
                        }
                    }
                    
                    // Get batch details to update finished product inventory
                    // Handle both recipe-based and manual batches
                    $stmt = $conn->prepare("
                        SELECT 
                            COALESCE(pr.finished_product_id, pb.product_id) as product_id,
                            pb.yield_quantity,
                            pb.batch_number,
                            pb.production_date,
                            pb.expiry_date,
                            COALESCE(p1.name, p2.name) as product_name
                        FROM production_batches pb
                        LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                        LEFT JOIN products p1 ON pr.finished_product_id = p1.product_id
                        LEFT JOIN products p2 ON pb.product_id = p2.product_id
                        WHERE pb.batch_id = ?
                    ");
                    $stmt->execute([$batch_id]);
                    $batch_info = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($batch_info && $batch_info['product_id']) {
                        // Update product inventory in products table
                        $stmt = $conn->prepare("
                            UPDATE products
                            SET quantity_on_hand = quantity_on_hand + ?
                            WHERE product_id = ?
                        ");
                        $stmt->execute([$batch_info['yield_quantity'], $batch_info['product_id']]);
                    }
                    
                    $conn->commit();
                    
                    // GAP 2-GAP-2: Return batch info for label printing
                    echo json_encode([
                        'success' => true,
                        'message' => 'Production batch completed and inventory updated',
                        'batch_info' => $batch_info ? [
                            'batch_number' => $batch_info['batch_number'],
                            'product_name' => $batch_info['product_name'],
                            'production_date' => $batch_info['production_date'],
                            'expiry_date' => $batch_info['expiry_date'],
                            'yield_quantity' => $batch_info['yield_quantity']
                        ] : null
                    ]);
                    
                } catch (Exception $e) {
                    $conn->rollBack();
                    throw $e;
                }
                break;
                
            case 'get_production_batches':
                $status_filter = $input['status'] ?? '';
                $date_from = $input['date_from'] ?? '';
                $date_to = $input['date_to'] ?? '';
                
                $sql = "
                    SELECT 
                        pb.*,
                        pr.recipe_name,
                        COALESCE(p1.name, p2.name) as product_name
                    FROM production_batches pb
                    LEFT JOIN production_recipes pr ON pb.recipe_id = pr.recipe_id
                    LEFT JOIN products p1 ON pr.finished_product_id = p1.product_id
                    LEFT JOIN products p2 ON pb.product_id = p2.product_id
                    WHERE 1=1
                ";
                $params = [];
                
                if ($status_filter) {
                    $sql .= " AND pb.status = ?";
                    $params[] = $status_filter;
                }
                
                if ($date_from) {
                    $sql .= " AND pb.production_date >= ?";
                    $params[] = $date_from;
                }
                
                if ($date_to) {
                    $sql .= " AND pb.production_date <= ?";
                    $params[] = $date_to;
                }
                
                $sql .= " ORDER BY pb.production_date DESC, pb.created_at DESC";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'batches' => $batches
                ]);
                break;
                
            default:
                throw new Exception('Invalid action specified');
        }
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    
    // Enhanced error logging for debugging
    error_log("ProductionAPI Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_detail' => $e->getFile() . ':' . $e->getLine()
    ]);
}
?>
