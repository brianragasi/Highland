<?php
/**
 * Highland Fresh Raw Material Inventory API
 * Server-side API for raw materials inventory management
 * 
 * Features:
 * - Raw material receipt processing
 * - Batch tracking and traceability
 * - Quality test management
 * - Expiration monitoring
 * - Temperature logging
 * - Highland Fresh compliance tracking
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'DatabaseConnection.php';
require_once 'highland-fresh-business-rules.php';

class RawMaterialInventoryAPI {
    private $pdo;
    private $businessRules;

    public function __construct() {
        $this->pdo = DatabaseConnection::getInstance()->getConnection();
        $this->businessRules = getHighlandFreshBusinessRules();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';

        try {
            switch ($method) {
                case 'GET':
                    return $this->handleGetRequest($action);
                case 'POST':
                    return $this->handlePostRequest($action);
                case 'PUT':
                    return $this->handlePutRequest($action);
                case 'DELETE':
                    return $this->handleDeleteRequest($action);
                default:
                    throw new Exception('Method not allowed');
            }
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), 500);
        }
    }

    // ============================================================================
    // GET REQUEST HANDLERS
    // ============================================================================

    private function handleGetRequest($action) {
        switch ($action) {
            case 'getAllRawMaterials':
                return $this->getAllRawMaterials();
            case 'getRawMaterial':
                return $this->getRawMaterial($_GET['id']);
            case 'getBatchTracking':
                return $this->getBatchTracking($_GET['batch_id'] ?? null);
            case 'getTraceability':
                return $this->getTraceability($_GET['batch_code']);
            case 'getExpirationAlerts':
                return $this->getExpirationAlerts();
            case 'getQualityTests':
                return $this->getQualityTests($_GET['batch_id'] ?? null);
            case 'getTemperatureLog':
                return $this->getTemperatureLog($_GET['raw_material_id'] ?? null);
            case 'getInventoryReport':
                return $this->getInventoryReport();
            case 'getComplianceStatus':
                return $this->getComplianceStatus();
            
            // FIFO Material Issuance endpoints
            case 'getAvailableBatches':
                return $this->sendSuccess(
                    $this->getAvailableBatches(
                        $_GET['raw_material_id'] ?? null,
                        $_GET['quantity_needed'] ?? null
                    )
                );
            case 'getFIFOPickInstructions':
                return $this->sendSuccess(
                    $this->getFIFOPickInstructions(
                        $_GET['raw_material_id'] ?? null,
                        $_GET['quantity_needed'] ?? null
                    )
                );
            case 'validateFIFOBatch':
                return $this->sendSuccess(
                    $this->validateFIFOBatch(
                        $_GET['raw_material_id'] ?? null,
                        $_GET['scanned_batch_code'] ?? '',
                        $_GET['expected_step'] ?? 1
                    )
                );
            case 'getRecentConsumptions':
                return $this->getRecentConsumptions();
                
            default:
                throw new Exception('Unknown action: ' . $action);
        }
    }

    // ============================================================================
    // POST REQUEST HANDLERS
    // ============================================================================

    private function handlePostRequest($action) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($action) {
            case 'receiveRawMaterial':
                return $this->receiveRawMaterial($input);
            case 'consumeRawMaterial':
                return $this->consumeRawMaterial($input);
            case 'scheduleQualityTest':
                return $this->scheduleQualityTest($input);
            case 'recordQualityTest':
                return $this->recordQualityTestResults($input);
            case 'logTemperature':
                return $this->logTemperature($input);
            case 'updateInventoryLevels':
                return $this->updateInventoryLevels($input);
            case 'recordFIFOIssuance':
                return $this->recordFIFOIssuance($input);
            default:
                throw new Exception('Unknown action: ' . $action);
        }
    }

    // ============================================================================
    // RAW MATERIAL INVENTORY METHODS
    // ============================================================================

    /**
     * Get all raw materials with Highland Fresh approval status
     */
    public function getAllRawMaterials() {
        try {
            $sql = "
                SELECT 
                    rm.*,
                    u.unit_name,
                    CASE 
                        WHEN rm.highland_fresh_approved = 1 THEN 'APPROVED'
                        ELSE 'PENDING_APPROVAL'
                    END as approval_status
                FROM raw_materials rm
                LEFT JOIN units u ON rm.unit_id = u.unit_id
                WHERE rm.is_active = 1
                ORDER BY rm.category, rm.name
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Add Highland Fresh compliance information
            foreach ($materials as &$material) {
                $material['highland_fresh_compliance'] = $this->checkHighlandFreshCompliance($material);
            }

            return $this->sendSuccess($materials);
        } catch (Exception $e) {
            return $this->sendError('Error fetching raw materials: ' . $e->getMessage());
        }
    }

    /**
     * Receive raw material into inventory with Highland Fresh business rule validation
     */
    public function receiveRawMaterial($receiptData) {
        try {
            $this->pdo->beginTransaction();

            // Validate Highland Fresh business rules
            $validationContext = [
                'items' => [['raw_material_id' => $receiptData['raw_material_id']]],
                'supplier' => $this->getSupplierById($receiptData['supplier_id']),
                'purchase_type' => $receiptData['purchase_type'] ?? 'general',
                'cold_chain_temp_min' => $receiptData['temperature_at_receipt'],
                'cold_chain_temp_max' => $receiptData['temperature_at_receipt'],
                'quality_grade' => $receiptData['quality_grade_received'],
                'batch_tracking_code' => $receiptData['highland_fresh_batch_code']
            ];

            $validationResult = $this->businessRules->validate($validationContext);
            if (!$validationResult['valid']) {
                throw new Exception('Highland Fresh Business Rule Violation: ' . $validationResult['violations'][0]['message']);
            }

            // Insert batch tracking record
            $sql = "
                INSERT INTO raw_material_batches (
                    batch_id, highland_fresh_batch_code, raw_material_id, supplier_id,
                    received_date, expiry_date, quantity_received, unit_cost,
                    quality_grade_received, temperature_at_receipt, 
                    quality_test_required, storage_location, current_quantity,
                    status, highland_fresh_approved, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, NOW())
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $receiptData['batch_id'],
                $receiptData['highland_fresh_batch_code'],
                $receiptData['raw_material_id'],
                $receiptData['supplier_id'],
                $receiptData['received_date'],
                $receiptData['expiry_date'],
                $receiptData['quantity_received'],
                $receiptData['unit_cost'],
                $receiptData['quality_grade_received'],
                $receiptData['temperature_at_receipt'],
                $receiptData['quality_test_required'] ? 1 : 0,
                $receiptData['storage_location'],
                $receiptData['quantity_received'],
                $receiptData['highland_fresh_compliance']['overall_compliance'] ? 1 : 0
            ]);

            // Update raw material inventory levels
            $this->updateRawMaterialStock($receiptData['raw_material_id'], $receiptData['quantity_received'], 'ADD');

            // Log temperature
            $this->insertTemperatureLog($receiptData['raw_material_id'], $receiptData['temperature_at_receipt'], 'RECEIPT');

            // Schedule quality test if required
            if ($receiptData['quality_test_required']) {
                $this->insertQualityTestSchedule($receiptData);
            }

            $this->pdo->commit();
            return $this->sendSuccess(['message' => 'Raw material received successfully', 'batch_id' => $receiptData['batch_id']]);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return $this->sendError('Error receiving raw material: ' . $e->getMessage());
        }
    }

    /**
     * Consume raw materials for production
     */
    public function consumeRawMaterial($consumptionData) {
        try {
            $this->pdo->beginTransaction();

            // Get available batches using FIFO
            $batches = $this->getAvailableBatches($consumptionData['raw_material_id'], $consumptionData['total_quantity_consumed']);

            if (empty($batches)) {
                throw new Exception('Highland Fresh: No suitable batches available for consumption');
            }

            // Process consumption records
            foreach ($consumptionData['consumption_records'] as $record) {
                $sql = "
                    INSERT INTO raw_material_consumption (
                        consumption_id, batch_id, highland_fresh_batch_code,
                        raw_material_id, quantity_consumed, production_batch_id,
                        consumption_date, consumption_reason, consumed_by,
                        highland_fresh_traceability, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ";

                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    $record['consumption_id'],
                    $record['batch_id'],
                    $record['highland_fresh_batch_code'],
                    $record['raw_material_id'],
                    $record['quantity_consumed'],
                    $record['production_batch_id'],
                    $record['consumption_date'],
                    $record['consumption_reason'],
                    $record['consumed_by'],
                    json_encode($record['highland_fresh_traceability'])
                ]);

                // Update batch quantity
                $this->updateBatchQuantity($record['batch_id'], $record['quantity_consumed']);
            }

            // Update raw material inventory levels
            $this->updateRawMaterialStock($consumptionData['raw_material_id'], $consumptionData['total_quantity_consumed'], 'SUBTRACT');

            $this->pdo->commit();
            return $this->sendSuccess(['message' => 'Raw material consumption recorded successfully']);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return $this->sendError('Error consuming raw material: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // BATCH TRACKING & TRACEABILITY
    // ============================================================================

    /**
     * Get complete traceability for Highland Fresh batch
     */
    public function getTraceability($batchCode) {
        try {
            // Get batch information
            $sql = "
                SELECT 
                    b.*,
                    rm.name as raw_material_name,
                    rm.category,
                    s.name as supplier_name,
                    s.supplier_type,
                    s.is_nmfdc_member
                FROM raw_material_batches b
                LEFT JOIN raw_materials rm ON b.raw_material_id = rm.raw_material_id
                LEFT JOIN suppliers s ON b.supplier_id = s.supplier_id
                WHERE b.highland_fresh_batch_code = ?
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$batchCode]);
            $batch = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$batch) {
                throw new Exception('Highland Fresh batch not found: ' . $batchCode);
            }

            // Get consumption history
            $sql = "
                SELECT * FROM raw_material_consumption 
                WHERE highland_fresh_batch_code = ?
                ORDER BY consumption_date
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$batchCode]);
            $consumption = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get quality test results
            $sql = "
                SELECT * FROM raw_material_quality_tests 
                WHERE highland_fresh_batch_code = ?
                ORDER BY test_date
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$batchCode]);
            $qualityTests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get temperature log
            $sql = "
                SELECT * FROM raw_material_temperature_log 
                WHERE raw_material_id = ? AND timestamp BETWEEN ? AND ?
                ORDER BY timestamp
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $batch['raw_material_id'],
                $batch['received_date'],
                date('Y-m-d H:i:s')
            ]);
            $temperatureLog = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $traceability = [
                'batch_info' => $batch,
                'consumption_history' => $consumption,
                'quality_tests' => $qualityTests,
                'temperature_log' => $temperatureLog,
                'highland_fresh_compliance' => $this->assessBatchCompliance($batch, $qualityTests, $temperatureLog)
            ];

            return $this->sendSuccess($traceability);

        } catch (Exception $e) {
            return $this->sendError('Error retrieving traceability: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // QUALITY MANAGEMENT
    // ============================================================================

    /**
     * Schedule quality test for raw material batch
     */
    public function scheduleQualityTest($testData) {
        try {
            $sql = "
                INSERT INTO raw_material_quality_tests (
                    test_id, batch_id, highland_fresh_batch_code, raw_material_id,
                    test_type, scheduled_date, priority, highland_fresh_standards,
                    status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', NOW())
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $testData['test_id'],
                $testData['batch_id'],
                $testData['highland_fresh_batch_code'],
                $testData['raw_material_id'],
                json_encode($testData['test_type']),
                $testData['scheduled_date'],
                $testData['priority'],
                json_encode($testData['highland_fresh_standards'])
            ]);

            return $this->sendSuccess(['message' => 'Quality test scheduled successfully', 'test_id' => $testData['test_id']]);

        } catch (Exception $e) {
            return $this->sendError('Error scheduling quality test: ' . $e->getMessage());
        }
    }

    /**
     * Record quality test results
     */
    public function recordQualityTestResults($testResults) {
        try {
            $this->pdo->beginTransaction();

            // Update quality test record
            $sql = "
                UPDATE raw_material_quality_tests SET
                    status = 'COMPLETED',
                    completed_date = NOW(),
                    test_results = ?,
                    pass_fail_status = ?,
                    technician = ?,
                    notes = ?,
                    highland_fresh_compliance = ?
                WHERE test_id = ?
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                json_encode($testResults['test_results']),
                $testResults['pass_fail_status'],
                $testResults['technician'],
                $testResults['notes'],
                json_encode($testResults['highland_fresh_compliance']),
                $testResults['test_id']
            ]);

            // Update batch approval status
            $sql = "
                UPDATE raw_material_batches SET
                    quality_test_passed = ?,
                    quality_test_date = NOW(),
                    quality_test_notes = ?,
                    highland_fresh_approved = ?,
                    status = CASE WHEN ? = 'PASS' THEN status ELSE 'REJECTED' END
                WHERE batch_id = ?
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $testResults['pass_fail_status'] === 'PASS' ? 1 : 0,
                $testResults['notes'],
                $testResults['highland_fresh_compliance']['overall_compliance'] ? 1 : 0,
                $testResults['pass_fail_status'],
                $testResults['batch_id']
            ]);

            $this->pdo->commit();
            return $this->sendSuccess(['message' => 'Quality test results recorded successfully']);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return $this->sendError('Error recording quality test results: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // EXPIRATION & ALERTS
    // ============================================================================

    /**
     * Get expiration alerts for Highland Fresh raw materials
     */
    public function getExpirationAlerts() {
        try {
            $sql = "
                SELECT 
                    b.*,
                    rm.name as raw_material_name,
                    s.name as supplier_name,
                    DATEDIFF(b.expiry_date, NOW()) as days_until_expiry,
                    CASE 
                        WHEN b.expiry_date <= NOW() THEN 'EXPIRED'
                        WHEN DATEDIFF(b.expiry_date, NOW()) <= 7 THEN 'EXPIRING_SOON'
                        ELSE 'OK'
                    END as alert_type
                FROM raw_material_batches b
                LEFT JOIN raw_materials rm ON b.raw_material_id = rm.raw_material_id
                LEFT JOIN suppliers s ON b.supplier_id = s.supplier_id
                WHERE b.status IN ('RECEIVED', 'APPROVED') 
                    AND b.current_quantity > 0
                    AND DATEDIFF(b.expiry_date, NOW()) <= 7
                ORDER BY b.expiry_date ASC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format alerts with Highland Fresh context
            foreach ($alerts as &$alert) {
                $alert['message'] = $this->generateAlertMessage($alert);
                $alert['action_required'] = $this->getRequiredAction($alert);
                $alert['priority'] = $alert['alert_type'] === 'EXPIRED' ? 'CRITICAL' : 'HIGH';
            }

            return $this->sendSuccess($alerts);

        } catch (Exception $e) {
            return $this->sendError('Error fetching expiration alerts: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // TEMPERATURE MONITORING
    // ============================================================================

    /**
     * Log temperature reading
     */
    public function logTemperature($tempData) {
        try {
            $this->insertTemperatureLog(
                $tempData['raw_material_id'],
                $tempData['temperature'],
                $tempData['event_type'] ?? 'MONITORING'
            );

            return $this->sendSuccess(['message' => 'Temperature logged successfully']);

        } catch (Exception $e) {
            return $this->sendError('Error logging temperature: ' . $e->getMessage());
        }
    }

    /**
     * Get temperature log for raw material
     */
    public function getTemperatureLog($rawMaterialId = null) {
        try {
            $sql = "
                SELECT 
                    tl.*,
                    rm.name as raw_material_name,
                    rm.storage_temp_min,
                    rm.storage_temp_max
                FROM raw_material_temperature_log tl
                LEFT JOIN raw_materials rm ON tl.raw_material_id = rm.raw_material_id
            ";

            $params = [];
            if ($rawMaterialId) {
                $sql .= " WHERE tl.raw_material_id = ?";
                $params[] = $rawMaterialId;
            }

            $sql .= " ORDER BY tl.timestamp DESC LIMIT 1000";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $temperatureLog = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->sendSuccess($temperatureLog);

        } catch (Exception $e) {
            return $this->sendError('Error fetching temperature log: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // HIGHLAND FRESH COMPLIANCE & REPORTING
    // ============================================================================

    /**
     * Get Highland Fresh compliance status
     */
    public function getComplianceStatus() {
        try {
            $compliance = [
                'overall_compliance_rate' => 0,
                'raw_materials_compliance' => [],
                'supplier_compliance' => [],
                'batch_compliance' => [],
                'quality_test_pass_rate' => 0,
                'temperature_compliance_rate' => 0,
                'expiration_management' => []
            ];

            // Calculate overall compliance metrics
            $sql = "
                SELECT 
                    COUNT(*) as total_batches,
                    SUM(CASE WHEN highland_fresh_approved = 1 THEN 1 ELSE 0 END) as approved_batches,
                    SUM(CASE WHEN quality_test_passed = 1 THEN 1 ELSE 0 END) as passed_tests,
                    COUNT(CASE WHEN quality_test_passed IS NOT NULL THEN 1 END) as total_tests
                FROM raw_material_batches
                WHERE status NOT IN ('EXPIRED', 'REJECTED')
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            $compliance['overall_compliance_rate'] = $stats['total_batches'] > 0 ? 
                round(($stats['approved_batches'] / $stats['total_batches']) * 100, 2) : 0;

            $compliance['quality_test_pass_rate'] = $stats['total_tests'] > 0 ? 
                round(($stats['passed_tests'] / $stats['total_tests']) * 100, 2) : 0;

            return $this->sendSuccess($compliance);

        } catch (Exception $e) {
            return $this->sendError('Error fetching compliance status: ' . $e->getMessage());
        }
    }

    /**
     * Generate Highland Fresh inventory report
     */
    public function getInventoryReport() {
        try {
            $report = [
                'report_date' => date('Y-m-d H:i:s'),
                'summary' => $this->getInventorySummary(),
                'raw_materials' => $this->getRawMaterialsStatus(),
                'batch_details' => $this->getBatchDetails(),
                'expiration_analysis' => $this->getExpirationAnalysis(),
                'quality_analysis' => $this->getQualityAnalysis(),
                'temperature_analysis' => $this->getTemperatureAnalysis(),
                'recommendations' => $this->generateRecommendations()
            ];

            return $this->sendSuccess($report);

        } catch (Exception $e) {
            return $this->sendError('Error generating inventory report: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // FIFO BATCH SELECTION METHODS (CRITICAL FOR INVENTORY MANAGEMENT)
    // ============================================================================

    /**
     * Get available batches for consumption using FIFO (First-In-First-Out)
     * Returns batches ordered by received_date ASC (oldest first)
     * 
     * @param int $rawMaterialId - The raw material to get batches for
     * @param float $quantityNeeded - Total quantity needed (optional, for validation)
     * @param bool $splitAcrossBatches - Whether to calculate multi-batch fulfillment
     * @return array - Array of available batches with FIFO allocation
     */
    public function getAvailableBatches($rawMaterialId, $quantityNeeded = null, $splitAcrossBatches = true) {
        try {
            // FIFO Query: ORDER BY received_date ASC, batch_id ASC
            $sql = "
                SELECT 
                    rmb.batch_id,
                    rmb.highland_fresh_batch_code,
                    rmb.raw_material_id,
                    rmb.po_item_id,
                    rmb.supplier_id,
                    rmb.quantity_received,
                    rmb.current_quantity,
                    rmb.unit_cost,
                    rmb.received_date,
                    rmb.expiry_date,
                    rmb.production_date,
                    rmb.quality_grade_received,
                    rmb.storage_location,
                    rmb.status,
                    rmb.highland_fresh_approved,
                    rmb.lot_number,
                    rm.name as raw_material_name,
                    rm.category,
                    u.unit_name,
                    s.name as supplier_name,
                    DATEDIFF(rmb.expiry_date, CURDATE()) as days_until_expiry
                FROM raw_material_batches rmb
                LEFT JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
                LEFT JOIN units u ON rm.unit_id = u.unit_id
                LEFT JOIN suppliers s ON rmb.supplier_id = s.supplier_id
                WHERE rmb.raw_material_id = ?
                  AND rmb.current_quantity > 0
                  AND rmb.status IN ('RECEIVED', 'APPROVED')
                  AND (rmb.expiry_date IS NULL OR rmb.expiry_date > CURDATE())
                ORDER BY rmb.received_date ASC, rmb.batch_id ASC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$rawMaterialId]);
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // If quantity needed is specified, calculate FIFO allocation
            if ($quantityNeeded !== null && $splitAcrossBatches) {
                $remaining = floatval($quantityNeeded);
                $allocation = [];
                $totalAvailable = 0;

                foreach ($batches as &$batch) {
                    $totalAvailable += floatval($batch['current_quantity']);
                    
                    if ($remaining > 0) {
                        $batchQty = floatval($batch['current_quantity']);
                        $takeQty = min($batchQty, $remaining);
                        
                        $batch['fifo_allocation'] = [
                            'quantity_to_take' => $takeQty,
                            'remaining_after' => $batchQty - $takeQty,
                            'fifo_order' => count($allocation) + 1,
                            'is_depleted' => ($batchQty - $takeQty) <= 0
                        ];
                        
                        $allocation[] = $batch;
                        $remaining -= $takeQty;
                    }
                }

                return [
                    'success' => true,
                    'can_fulfill' => $remaining <= 0,
                    'quantity_requested' => $quantityNeeded,
                    'total_available' => $totalAvailable,
                    'shortage' => max(0, $remaining),
                    'batches' => $allocation,
                    'fifo_message' => $remaining <= 0 
                        ? 'FIFO allocation successful - pick batches in order shown'
                        : 'Insufficient stock - cannot fulfill request'
                ];
            }

            return [
                'success' => true,
                'batches' => $batches,
                'total_batches' => count($batches)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error getting available batches: ' . $e->getMessage(),
                'batches' => []
            ];
        }
    }

    /**
     * Update batch quantity after consumption (decrement)
     * 
     * @param int $batchId - The batch to update
     * @param float $quantityConsumed - Amount to subtract from current_quantity
     * @return bool - Success/failure
     */
    public function updateBatchQuantity($batchId, $quantityConsumed) {
        try {
            // First verify the batch exists and has enough quantity
            $checkSql = "SELECT current_quantity, status FROM raw_material_batches WHERE batch_id = ?";
            $checkStmt = $this->pdo->prepare($checkSql);
            $checkStmt->execute([$batchId]);
            $batch = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$batch) {
                throw new Exception("Batch ID $batchId not found");
            }

            $currentQty = floatval($batch['current_quantity']);
            $consumeQty = floatval($quantityConsumed);

            if ($consumeQty > $currentQty) {
                throw new Exception("Cannot consume $consumeQty - only $currentQty available in batch $batchId");
            }

            $newQuantity = $currentQty - $consumeQty;
            $newStatus = $newQuantity <= 0 ? 'CONSUMED' : $batch['status'];

            $updateSql = "
                UPDATE raw_material_batches 
                SET current_quantity = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE batch_id = ?
            ";

            $updateStmt = $this->pdo->prepare($updateSql);
            $updateStmt->execute([$newQuantity, $newStatus, $batchId]);

            return true;

        } catch (Exception $e) {
            error_log("Error updating batch quantity: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Record consumption of raw material batch (for traceability)
     * 
     * @param array $consumptionData - Consumption details
     * @return int - Consumption record ID
     */
    public function recordBatchConsumption($consumptionData) {
        $sql = "
            INSERT INTO raw_material_consumption (
                batch_id, highland_fresh_batch_code, raw_material_id,
                production_batch_id, quantity_consumed, consumption_date,
                consumption_reason, consumed_by, highland_fresh_traceability, notes
            ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $consumptionData['batch_id'],
            $consumptionData['highland_fresh_batch_code'],
            $consumptionData['raw_material_id'],
            $consumptionData['production_batch_id'] ?? null,
            $consumptionData['quantity_consumed'],
            $consumptionData['consumption_reason'] ?? 'PRODUCTION',
            $consumptionData['consumed_by'] ?? null,
            json_encode($consumptionData['traceability'] ?? []),
            $consumptionData['notes'] ?? null
        ]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Get FIFO pick instructions for material issuance
     * This is used by the Material Issuance UI to guide warehouse staff
     * 
     * @param int $rawMaterialId - Material requested
     * @param float $quantityNeeded - Amount requested
     * @return array - Pick instructions with batch details
     */
    public function getFIFOPickInstructions($rawMaterialId, $quantityNeeded) {
        $allocation = $this->getAvailableBatches($rawMaterialId, $quantityNeeded, true);
        
        if (!$allocation['success'] || !$allocation['can_fulfill']) {
            return [
                'success' => false,
                'message' => $allocation['fifo_message'] ?? 'Cannot fulfill request',
                'shortage' => $allocation['shortage'] ?? $quantityNeeded,
                'pick_instructions' => []
            ];
        }

        $instructions = [];
        foreach ($allocation['batches'] as $index => $batch) {
            $instructions[] = [
                'step' => $index + 1,
                'batch_id' => $batch['batch_id'],
                'highland_fresh_batch_code' => $batch['highland_fresh_batch_code'],
                'quantity_to_pick' => $batch['fifo_allocation']['quantity_to_take'],
                'storage_location' => $batch['storage_location'] ?? 'Not specified',
                'received_date' => $batch['received_date'],
                'expiry_date' => $batch['expiry_date'],
                'days_until_expiry' => $batch['days_until_expiry'],
                'current_quantity' => $batch['current_quantity'],
                'remaining_after_pick' => $batch['fifo_allocation']['remaining_after'],
                'is_batch_depleted' => $batch['fifo_allocation']['is_depleted'],
                'raw_material_name' => $batch['raw_material_name'],
                'unit_name' => $batch['unit_name'],
                'supplier_name' => $batch['supplier_name'],
                'quality_grade' => $batch['quality_grade_received']
            ];
        }

        return [
            'success' => true,
            'message' => 'FIFO pick instructions generated - follow steps in order',
            'quantity_requested' => $quantityNeeded,
            'total_steps' => count($instructions),
            'pick_instructions' => $instructions
        ];
    }

    /**
     * Validate that a scanned batch matches the expected FIFO batch
     * 
     * @param int $rawMaterialId - Material being issued
     * @param string $scannedBatchCode - Batch code scanned by warehouse staff
     * @param int $expectedStep - Which step in FIFO sequence (1 = first/oldest)
     * @return array - Validation result
     */
    public function validateFIFOBatch($rawMaterialId, $scannedBatchCode, $expectedStep = 1) {
        // Get the correct batch for this step
        $sql = "
            SELECT 
                batch_id, highland_fresh_batch_code, current_quantity,
                received_date, expiry_date, storage_location
            FROM raw_material_batches
            WHERE raw_material_id = ?
              AND current_quantity > 0
              AND status IN ('RECEIVED', 'APPROVED')
              AND (expiry_date IS NULL OR expiry_date > CURDATE())
            ORDER BY received_date ASC, batch_id ASC
            LIMIT 1 OFFSET ?
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$rawMaterialId, $expectedStep - 1]);
        $expectedBatch = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$expectedBatch) {
            return [
                'valid' => false,
                'message' => 'No batch available at this FIFO position',
                'expected_batch_code' => null,
                'scanned_batch_code' => $scannedBatchCode
            ];
        }

        $isMatch = strtoupper(trim($expectedBatch['highland_fresh_batch_code'])) === strtoupper(trim($scannedBatchCode));

        if ($isMatch) {
            return [
                'valid' => true,
                'message' => 'FIFO validated - correct batch scanned',
                'batch_id' => $expectedBatch['batch_id'],
                'batch_code' => $expectedBatch['highland_fresh_batch_code'],
                'available_quantity' => $expectedBatch['current_quantity'],
                'storage_location' => $expectedBatch['storage_location']
            ];
        } else {
            return [
                'valid' => false,
                'message' => 'WRONG BATCH! You must pick the oldest batch first (FIFO)',
                'expected_batch_code' => $expectedBatch['highland_fresh_batch_code'],
                'expected_location' => $expectedBatch['storage_location'],
                'expected_received_date' => $expectedBatch['received_date'],
                'scanned_batch_code' => $scannedBatchCode,
                'instruction' => 'Please locate and scan batch: ' . $expectedBatch['highland_fresh_batch_code']
            ];
        }
    }

    /**
     * Record FIFO material issuance to production
     * This is the main method called when warehouse staff completes material issuance
     * 
     * @param array $input - Issuance data including batches and production info
     * @return string JSON response
     */
    public function recordFIFOIssuance($input) {
        try {
            // Validate required fields
            if (empty($input['raw_material_id']) || empty($input['batches'])) {
                return $this->sendError('raw_material_id and batches are required');
            }

            $rawMaterialId = intval($input['raw_material_id']);
            $productionBatchId = $input['production_batch_id'] ?? null;
            $consumedBy = $input['consumed_by'] ?? null;
            $reason = $input['reason'] ?? 'PRODUCTION';
            $notes = $input['notes'] ?? null;

            $this->pdo->beginTransaction();

            $totalConsumed = 0;
            $consumptionRecords = [];

            foreach ($input['batches'] as $batch) {
                $batchId = intval($batch['batch_id']);
                $quantityConsumed = floatval($batch['quantity_consumed']);
                $batchCode = $batch['highland_fresh_batch_code'] ?? '';

                // Validate batch exists and has enough quantity
                $checkSql = "SELECT current_quantity, highland_fresh_batch_code FROM raw_material_batches WHERE batch_id = ?";
                $checkStmt = $this->pdo->prepare($checkSql);
                $checkStmt->execute([$batchId]);
                $batchData = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if (!$batchData) {
                    throw new Exception("Batch ID $batchId not found");
                }

                if ($quantityConsumed > $batchData['current_quantity']) {
                    throw new Exception("Cannot consume $quantityConsumed from batch $batchId - only {$batchData['current_quantity']} available");
                }

                // Update batch quantity
                $this->updateBatchQuantity($batchId, $quantityConsumed);

                // Record consumption for traceability
                $consumptionId = $this->recordBatchConsumption([
                    'batch_id' => $batchId,
                    'highland_fresh_batch_code' => $batchCode ?: $batchData['highland_fresh_batch_code'],
                    'raw_material_id' => $rawMaterialId,
                    'production_batch_id' => $productionBatchId,
                    'quantity_consumed' => $quantityConsumed,
                    'consumption_reason' => $reason,
                    'consumed_by' => $consumedBy,
                    'traceability' => [
                        'issuance_time' => date('Y-m-d H:i:s'),
                        'fifo_validated' => true
                    ],
                    'notes' => $notes
                ]);

                $totalConsumed += $quantityConsumed;
                $consumptionRecords[] = [
                    'consumption_id' => $consumptionId,
                    'batch_id' => $batchId,
                    'batch_code' => $batchCode ?: $batchData['highland_fresh_batch_code'],
                    'quantity_consumed' => $quantityConsumed
                ];
            }

            // Update raw_materials.quantity_on_hand
            $this->updateRawMaterialStock($rawMaterialId, $totalConsumed, 'SUBTRACT');

            $this->pdo->commit();

            return $this->sendSuccess([
                'message' => 'FIFO material issuance recorded successfully',
                'raw_material_id' => $rawMaterialId,
                'total_consumed' => $totalConsumed,
                'batches_consumed' => count($consumptionRecords),
                'consumption_records' => $consumptionRecords,
                'production_batch_id' => $productionBatchId
            ]);

        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            return $this->sendError('Error recording FIFO issuance: ' . $e->getMessage());
        }
    }

    /**
     * Get recent raw material consumptions for display
     * 
     * @return string JSON response with recent consumptions
     */
    public function getRecentConsumptions() {
        try {
            $sql = "
                SELECT 
                    rmc.consumption_id,
                    rmc.batch_id,
                    rmc.highland_fresh_batch_code,
                    rmc.raw_material_id,
                    rmc.production_batch_id,
                    rmc.quantity_consumed,
                    rmc.consumption_date,
                    rmc.consumption_reason,
                    rmc.notes,
                    rm.name as raw_material_name,
                    u.unit_name,
                    pb.batch_number as production_batch_number,
                    usr.username as consumed_by_name
                FROM raw_material_consumption rmc
                LEFT JOIN raw_materials rm ON rmc.raw_material_id = rm.raw_material_id
                LEFT JOIN units u ON rm.unit_id = u.unit_id
                LEFT JOIN production_batches pb ON rmc.production_batch_id = pb.batch_id
                LEFT JOIN users usr ON rmc.consumed_by = usr.user_id
                ORDER BY rmc.consumption_date DESC
                LIMIT 50
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $consumptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->sendSuccess($consumptions);

        } catch (Exception $e) {
            return $this->sendError('Error getting recent consumptions: ' . $e->getMessage());
        }
    }

    /**
     * Insert a quality test schedule record
     */
    private function insertQualityTestSchedule($receiptData) {
        $sql = "
            INSERT INTO raw_material_quality_tests (
                batch_id, highland_fresh_batch_code, raw_material_id,
                test_type, scheduled_date, priority, status
            ) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'HIGH', 'SCHEDULED')
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $receiptData['batch_id'],
            $receiptData['highland_fresh_batch_code'],
            $receiptData['raw_material_id'],
            json_encode(['standard_quality_test'])
        ]);
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private function insertTemperatureLog($rawMaterialId, $temperature, $eventType) {
        $sql = "
            INSERT INTO raw_material_temperature_log (
                raw_material_id, temperature, event_type, timestamp, 
                compliance_status, recorded_by
            ) VALUES (?, ?, ?, NOW(), ?, 'Highland Fresh Inventory System')
        ";

        $complianceStatus = $this->assessTemperatureCompliance($rawMaterialId, $temperature);

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $rawMaterialId,
            $temperature,
            $eventType,
            $complianceStatus
        ]);
    }

    private function updateRawMaterialStock($rawMaterialId, $quantity, $operation) {
        $sql = $operation === 'ADD' ? 
            "UPDATE raw_materials SET quantity_on_hand = quantity_on_hand + ? WHERE raw_material_id = ?" :
            "UPDATE raw_materials SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?) WHERE raw_material_id = ?";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$quantity, $rawMaterialId]);
    }

    private function checkHighlandFreshCompliance($material) {
        return [
            'approved_material' => $material['highland_fresh_approved'] == 1,
            'quality_grade_acceptable' => in_array($material['quality_grade'], ['Premium', 'Standard']),
            'temperature_requirements_met' => true, // Would check against actual temp data
            'overall_compliance' => $material['highland_fresh_approved'] == 1
        ];
    }

    private function assessTemperatureCompliance($rawMaterialId, $temperature) {
        // Get material temperature requirements
        $sql = "SELECT storage_temp_min, storage_temp_max FROM raw_materials WHERE raw_material_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$rawMaterialId]);
        $material = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$material) return 'UNKNOWN';

        $temp = floatval($temperature);
        $minTemp = floatval($material['storage_temp_min'] ?? 2.0);
        $maxTemp = floatval($material['storage_temp_max'] ?? 6.0);

        return ($temp >= $minTemp && $temp <= $maxTemp) ? 'COMPLIANT' : 'NON_COMPLIANT';
    }

    private function getSupplierById($supplierId) {
        $sql = "SELECT * FROM suppliers WHERE supplier_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$supplierId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function sendSuccess($data = null, $message = 'Success') {
        return json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }

    private function sendError($message, $code = 400) {
        http_response_code($code);
        return json_encode([
            'success' => false,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

// Handle the request
$api = new RawMaterialInventoryAPI();
echo $api->handleRequest();
?>
