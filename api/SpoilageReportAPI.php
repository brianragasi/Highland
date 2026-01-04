<?php
/**
 * Spoilage Report API
 * User 5 FIFO Implementation: Finance Officer - Spoilage & Loss Tracking
 * 
 * Handles:
 * - Track expired batches
 * - Calculate spoilage losses
 * - Detect FIFO bypass incidents
 * - Generate spoilage reports for finance
 */

// Start session for authentication
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'BaseAPI.php';
require_once 'SessionConfig.php';

class SpoilageReportAPI extends BaseAPI {
    
    public function __construct() {
        parent::__construct();
    }
    
    /**
     * Handle incoming requests
     */
    public function handleRequest(): void {
        try {
            // Get action from GET, POST, or JSON body
            $action = $_GET['action'] ?? $_POST['action'] ?? null;
            
            // If action not in GET/POST, check JSON body
            if (!$action && $_SERVER['REQUEST_METHOD'] === 'POST') {
                $jsonData = $this->getRequestData();
                $action = $jsonData['action'] ?? '';
            }
            
            switch ($action) {
                case 'getDashboard':
                    $this->getDashboard();
                    break;
                    
                case 'getExpiredBatches':
                    $this->getExpiredBatches();
                    break;
                    
                case 'getSpoilageLog':
                    $this->getSpoilageLog();
                    break;
                    
                case 'recordSpoilage':
                    $this->recordSpoilage();
                    break;
                    
                case 'approveSpoilage':
                    $this->approveSpoilage();
                    break;
                    
                case 'getFifoBypassReport':
                    $this->getFifoBypassReport();
                    break;
                    
                case 'getMonthlySummary':
                    $this->getMonthlySummary();
                    break;
                    
                case 'scanExpiredBatches':
                    $this->scanExpiredBatches();
                    break;
                    
                case 'disposeBatch':
                    $this->disposeBatch();
                    break;
                    
                case 'getInventoryAtRisk':
                    $this->getInventoryAtRisk();
                    break;
                    
                case 'getSpoilageDetails':
                    $this->getSpoilageDetails();
                    break;
                    
                // Cost Alert Notifications (BOM Engine)
                case 'getNotifications':
                    $this->getNotifications();
                    break;
                    
                case 'markNotificationRead':
                    $this->markNotificationRead();
                    break;
                    
                case 'getNotificationCount':
                    $this->getNotificationCount();
                    break;
                
                // Production Cost Approval Workflow
                case 'getPendingCostApprovals':
                    $this->getPendingCostApprovals();
                    break;
                    
                case 'approveCostRequest':
                    $this->approveCostRequest();
                    break;
                    
                case 'rejectCostRequest':
                    $this->rejectCostRequest();
                    break;
                    
                default:
                    $this->sendError('Invalid action specified');
            }
        } catch (Exception $e) {
            error_log("[SpoilageReportAPI] Error: " . $e->getMessage());
            $this->sendError($e->getMessage());
        }
    }
    
    /**
     * Get spoilage dashboard with all key metrics
     */
    private function getDashboard(): void {
        $data = [];
        
        // Get expired batches count and value
        $expiredBatches = $this->getExpiredBatchesData();
        $data['expired_batches'] = [
            'count' => count($expiredBatches),
            'total_quantity' => array_sum(array_column($expiredBatches, 'quantity_remaining')),
            'total_value' => array_sum(array_map(function($b) {
                return floatval($b['quantity_remaining']) * floatval($b['production_cost'] ?? 0);
            }, $expiredBatches))
        ];
        
        // Get inventory at risk (expiring in next 3 days)
        $atRisk = $this->getAtRiskInventory();
        $data['at_risk'] = [
            'count' => count($atRisk),
            'total_quantity' => array_sum(array_column($atRisk, 'quantity_remaining')),
            'total_value' => array_sum(array_map(function($b) {
                return floatval($b['quantity_remaining']) * floatval($b['production_cost'] ?? 0);
            }, $atRisk))
        ];
        
        // Get spoilage log summary (if table exists)
        if ($this->tableExists('spoilage_log')) {
            $stmt = $this->db()->query("
                SELECT 
                    COUNT(*) as total_incidents,
                    SUM(quantity_spoiled * unit_cost) as total_loss,
                    SUM(CASE WHEN fifo_bypassed = 1 THEN 1 ELSE 0 END) as fifo_bypass_count,
                    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count
                FROM spoilage_log
                WHERE YEAR(spoilage_date) = YEAR(CURDATE())
            ");
            $data['spoilage_ytd'] = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $data['spoilage_ytd'] = [
                'total_incidents' => 0,
                'total_loss' => 0,
                'fifo_bypass_count' => 0,
                'pending_count' => 0
            ];
        }
        
        // Get monthly trend (last 6 months)
        $data['monthly_trend'] = $this->getMonthlyTrend();
        
        // Get recent spoilage incidents
        $data['recent_incidents'] = $this->getRecentSpoilage();
        
        // Get FIFO compliance rate
        $data['fifo_compliance'] = $this->getFifoComplianceRate();
        
        $this->sendSuccess($data);
    }
    
    /**
     * Get all expired batches with remaining inventory
     */
    private function getExpiredBatches(): void {
        $batches = $this->getExpiredBatchesData();
        
        // Calculate totals
        $totalQuantity = 0;
        $totalValue = 0;
        
        foreach ($batches as &$batch) {
            $batch['loss_value'] = floatval($batch['quantity_remaining']) * floatval($batch['production_cost'] ?? 0);
            $totalQuantity += floatval($batch['quantity_remaining']);
            $totalValue += $batch['loss_value'];
        }
        
        $this->sendSuccess([
            'batches' => $batches,
            'summary' => [
                'total_batches' => count($batches),
                'total_quantity' => $totalQuantity,
                'total_value' => $totalValue
            ]
        ]);
    }
    
    /**
     * Get expired batches data
     */
    private function getExpiredBatchesData(): array {
        $stmt = $this->db()->query("
            SELECT 
                pb.batch_id,
                pb.batch_number,
                p.product_id,
                p.name as product_name,
                pc.category_name as category,
                pb.production_date,
                pb.expiry_date,
                DATEDIFF(CURDATE(), pb.expiry_date) as days_expired,
                pb.quantity_remaining,
                pb.yield_quantity,
                pb.production_cost,
                pb.status as batch_status
            FROM production_batches pb
            JOIN products p ON pb.product_id = p.product_id LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE pb.expiry_date < CURDATE()
              AND pb.quantity_remaining > 0
            ORDER BY pb.expiry_date ASC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get inventory expiring within X days
     */
    private function getAtRiskInventory(): array {
        $days = 3; // Default 3 days
        
        $stmt = $this->db()->prepare("
            SELECT 
                pb.batch_id,
                pb.batch_number,
                p.product_id,
                p.name as product_name,
                pc.category_name as category,
                pb.production_date,
                pb.expiry_date,
                DATEDIFF(pb.expiry_date, CURDATE()) as days_until_expiry,
                pb.quantity_remaining,
                pb.production_cost,
                pb.status
            FROM production_batches pb
            JOIN products p ON pb.product_id = p.product_id LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE pb.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
              AND pb.quantity_remaining > 0
              AND pb.status NOT IN ('EXPIRED', 'DISPOSED')
            ORDER BY pb.expiry_date ASC
        ");
        $stmt->execute([$days]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get inventory at risk (for dashboard widget)
     */
    private function getInventoryAtRisk(): void {
        $days = $_GET['days'] ?? 3;
        
        $stmt = $this->db()->prepare("
            SELECT 
                pb.batch_id,
                pb.batch_number,
                p.name as product_name,
                pb.expiry_date,
                DATEDIFF(pb.expiry_date, CURDATE()) as days_until_expiry,
                pb.quantity_remaining,
                COALESCE(pb.production_cost, 0) as unit_cost,
                (pb.quantity_remaining * COALESCE(pb.production_cost, 0)) as value_at_risk,
                CASE 
                    WHEN DATEDIFF(pb.expiry_date, CURDATE()) <= 1 THEN 'CRITICAL'
                    WHEN DATEDIFF(pb.expiry_date, CURDATE()) <= 3 THEN 'WARNING'
                    ELSE 'CAUTION'
                END as risk_level
            FROM production_batches pb
            JOIN products p ON pb.product_id = p.product_id LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE pb.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
              AND pb.quantity_remaining > 0
              AND pb.status NOT IN ('EXPIRED', 'DISPOSED')
            ORDER BY pb.expiry_date ASC
        ");
        $stmt->execute([$days]);
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $totalValue = array_sum(array_column($batches, 'value_at_risk'));
        
        $this->sendSuccess([
            'batches' => $batches,
            'summary' => [
                'count' => count($batches),
                'total_value_at_risk' => $totalValue,
                'critical_count' => count(array_filter($batches, fn($b) => $b['risk_level'] === 'CRITICAL')),
                'warning_count' => count(array_filter($batches, fn($b) => $b['risk_level'] === 'WARNING'))
            ]
        ]);
    }
    
    /**
     * Get spoilage log entries
     */
    private function getSpoilageLog(): void {
        if (!$this->tableExists('spoilage_log')) {
            $this->sendSuccess([
                'entries' => [],
                'message' => 'Spoilage log table not yet created. Run migration 008.'
            ]);
            return;
        }
        
        $status = $_GET['status'] ?? null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        $type = $_GET['type'] ?? null;
        
        $sql = "
            SELECT 
                sl.*,
                CONCAT(su_reported.first_name, ' ', su_reported.last_name) as reported_by_name,
                CONCAT(su_approved.first_name, ' ', su_approved.last_name) as approved_by_name
            FROM spoilage_log sl
            LEFT JOIN users su_reported ON sl.reported_by = su_reported.user_id
            LEFT JOIN users su_approved ON sl.approved_by = su_approved.user_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($status) {
            $sql .= " AND sl.status = ?";
            $params[] = $status;
        }
        
        if ($type) {
            $sql .= " AND sl.spoilage_type = ?";
            $params[] = $type;
        }
        
        if ($startDate) {
            $sql .= " AND sl.spoilage_date >= ?";
            $params[] = $startDate;
        }
        
        if ($endDate) {
            $sql .= " AND sl.spoilage_date <= ?";
            $params[] = $endDate;
        }
        
        $sql .= " ORDER BY sl.created_at DESC LIMIT 100";
        
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendSuccess(['entries' => $entries]);
    }
    
    /**
     * Record a new spoilage incident
     */
    private function recordSpoilage(): void {
        $data = $this->getRequestData();
        
        $batchId = $data['batch_id'] ?? null;
        $spoilageType = $data['spoilage_type'] ?? 'EXPIRED';
        $reason = $data['reason'] ?? null;
        $quantity = $data['quantity'] ?? null;
        
        if (!$batchId) {
            $this->sendError('Batch ID is required');
            return;
        }
        
        // Get batch details
        $stmt = $this->db()->prepare("
            SELECT 
                pb.batch_id, pb.batch_number, pb.product_id,
                p.name as product_name, pb.quantity_remaining,
                pb.production_date, pb.expiry_date, pb.production_cost
            FROM production_batches pb
            JOIN products p ON pb.product_id = p.product_id LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE pb.batch_id = ?
        ");
        $stmt->execute([$batchId]);
        $batch = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$batch) {
            $this->sendError('Batch not found');
            return;
        }
        
        $quantityToSpoil = $quantity ?? $batch['quantity_remaining'];
        
        // Check for FIFO bypass
        $fifoBypass = $this->checkFifoBypass($batchId);
        
        // Generate spoilage reference
        $spoilageRef = $this->generateSpoilageReference();
        
        // Check if spoilage_log table exists
        if (!$this->tableExists('spoilage_log')) {
            // Create a simple inventory adjustment instead
            $stmt = $this->db()->prepare("
                INSERT INTO inventory_adjustments (
                    adjustment_number, product_id, user_id, adjustment_type,
                    quantity_before, quantity_change, quantity_after,
                    unit_cost, total_value_change, reason, notes, created_at
                ) VALUES (?, ?, ?, 'SPOILAGE', ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $spoilageRef,
                $batch['product_id'],
                $_SESSION['user_id'] ?? null,
                $batch['quantity_remaining'],
                -$quantityToSpoil,
                $batch['quantity_remaining'] - $quantityToSpoil,
                $batch['production_cost'] ?? 0,
                -($quantityToSpoil * ($batch['production_cost'] ?? 0)),
                $reason ?? "Batch {$batch['batch_number']} spoilage",
                "Batch: {$batch['batch_number']}, Type: $spoilageType"
            ]);
        } else {
            // Insert into spoilage_log
            $stmt = $this->db()->prepare("
                INSERT INTO spoilage_log (
                    spoilage_reference, source_type, batch_id, product_id,
                    batch_number, item_name, spoilage_type, spoilage_reason,
                    quantity_spoiled, unit_of_measure, unit_cost,
                    production_date, expiry_date, spoilage_date,
                    fifo_bypassed, bypass_evidence, reported_by, status
                ) VALUES (?, 'PRODUCTION_BATCH', ?, ?, ?, ?, ?, ?, ?, 'units', ?, ?, ?, CURDATE(), ?, ?, ?, 'PENDING')
            ");
            
            $stmt->execute([
                $spoilageRef,
                $batchId,
                $batch['product_id'],
                $batch['batch_number'],
                $batch['product_name'],
                $spoilageType,
                $reason,
                $quantityToSpoil,
                $batch['production_cost'] ?? 0,
                $batch['production_date'],
                $batch['expiry_date'],
                $fifoBypass['bypassed'] ? 1 : 0,
                $fifoBypass['evidence'] ?? null,
                $_SESSION['user_id'] ?? null
            ]);
        }
        
        // Update batch status if fully spoiled
        if ($quantityToSpoil >= $batch['quantity_remaining']) {
            $stmt = $this->db()->prepare("
                UPDATE production_batches 
                SET status = 'EXPIRED', 
                    quantity_remaining = 0,
                    quality_notes = CONCAT(COALESCE(quality_notes, ''), ' [SPOILAGE RECORDED: ', ?, ']')
                WHERE batch_id = ?
            ");
            $stmt->execute([$spoilageRef, $batchId]);
        } else {
            // Partial spoilage - reduce quantity
            $stmt = $this->db()->prepare("
                UPDATE production_batches 
                SET quantity_remaining = quantity_remaining - ?,
                    quality_notes = CONCAT(COALESCE(quality_notes, ''), ' [PARTIAL SPOILAGE: ', ?, ' units]')
                WHERE batch_id = ?
            ");
            $stmt->execute([$quantityToSpoil, $quantityToSpoil, $batchId]);
        }
        
        $this->sendSuccess([
            'spoilage_reference' => $spoilageRef,
            'quantity_spoiled' => $quantityToSpoil,
            'total_loss' => $quantityToSpoil * ($batch['production_cost'] ?? 0),
            'fifo_bypassed' => $fifoBypass['bypassed'],
            'message' => 'Spoilage recorded successfully'
        ]);
    }
    
    /**
     * Approve a pending spoilage write-off
     */
    private function approveSpoilage(): void {
        $data = $this->getRequestData();
        $spoilageId = $data['spoilage_id'] ?? null;
        
        if (!$spoilageId) {
            $this->sendError('Spoilage ID required');
            return;
        }
        
        if (!$this->tableExists('spoilage_log')) {
            $this->sendError('Spoilage log table not found');
            return;
        }
        
        $stmt = $this->db()->prepare("
            UPDATE spoilage_log 
            SET status = 'APPROVED', 
                approved_by = ?,
                updated_at = NOW()
            WHERE spoilage_id = ? AND status = 'PENDING'
        ");
        $stmt->execute([$_SESSION['user_id'] ?? null, $spoilageId]);
        
        if ($stmt->rowCount() === 0) {
            $this->sendError('Spoilage record not found or not in pending status');
            return;
        }
        
        $this->sendSuccess(['message' => 'Spoilage approved for write-off']);
    }
    
    /**
     * Get FIFO bypass report
     */
    private function getFifoBypassReport(): void {
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-d');
        
        // Check dispatch_audit_log table
        if ($this->tableExists('dispatch_audit_log')) {
            $stmt = $this->db()->prepare("
                SELECT 
                    dal.*,
                    CONCAT(su.first_name, ' ', su.last_name) as dispatched_by_name
                FROM dispatch_audit_log dal
                LEFT JOIN users su ON dal.dispatched_by = su.user_id
                WHERE dal.fifo_compliant = 0
                  AND dal.dispatch_date BETWEEN ? AND ?
                ORDER BY dal.dispatch_date DESC
            ");
            $stmt->execute([$startDate, $endDate . ' 23:59:59']);
            $bypasses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // Fallback: Check spoilage_log for FIFO bypass flags
            if ($this->tableExists('spoilage_log')) {
                $stmt = $this->db()->prepare("
                    SELECT 
                        sl.spoilage_reference,
                        sl.batch_number,
                        sl.item_name as product_name,
                        sl.spoilage_date as bypass_date,
                        sl.bypass_evidence as details,
                        sl.quantity_spoiled,
                        (sl.quantity_spoiled * sl.unit_cost) as loss_value
                    FROM spoilage_log sl
                    WHERE sl.fifo_bypassed = 1
                      AND sl.spoilage_date BETWEEN ? AND ?
                    ORDER BY sl.spoilage_date DESC
                ");
                $stmt->execute([$startDate, $endDate]);
                $bypasses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $bypasses = [];
            }
        }
        
        // Calculate impact
        $totalLoss = 0;
        foreach ($bypasses as $b) {
            $totalLoss += floatval($b['loss_value'] ?? 0);
        }
        
        $this->sendSuccess([
            'bypasses' => $bypasses,
            'summary' => [
                'total_incidents' => count($bypasses),
                'total_loss' => $totalLoss,
                'period' => ['start' => $startDate, 'end' => $endDate]
            ]
        ]);
    }
    
    /**
     * Get monthly spoilage summary
     */
    private function getMonthlySummary(): void {
        $year = $_GET['year'] ?? date('Y');
        
        // Get production batches that expired each month
        $stmt = $this->db()->prepare("
            SELECT 
                MONTH(expiry_date) as month,
                COUNT(*) as batch_count,
                SUM(quantity_remaining) as total_quantity,
                SUM(quantity_remaining * COALESCE(production_cost, 0)) as total_loss
            FROM production_batches
            WHERE YEAR(expiry_date) = ?
              AND expiry_date < CURDATE()
              AND quantity_remaining > 0
            GROUP BY MONTH(expiry_date)
            ORDER BY month
        ");
        $stmt->execute([$year]);
        $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Fill in missing months with zeros
        $fullYear = [];
        for ($m = 1; $m <= 12; $m++) {
            $found = array_filter($monthlyData, fn($d) => intval($d['month']) === $m);
            if (!empty($found)) {
                $fullYear[] = array_values($found)[0];
            } else {
                $fullYear[] = [
                    'month' => $m,
                    'batch_count' => 0,
                    'total_quantity' => 0,
                    'total_loss' => 0
                ];
            }
        }
        
        $this->sendSuccess([
            'year' => $year,
            'monthly_data' => $fullYear,
            'total_loss' => array_sum(array_column($fullYear, 'total_loss'))
        ]);
    }
    
    /**
     * Scan and auto-record expired batches
     */
    private function scanExpiredBatches(): void {
        $expiredBatches = $this->getExpiredBatchesData();
        $recorded = 0;
        $errors = [];
        
        foreach ($expiredBatches as $batch) {
            // Check if already logged
            if ($this->tableExists('spoilage_log')) {
                $stmt = $this->db()->prepare("
                    SELECT 1 FROM spoilage_log 
                    WHERE batch_id = ? AND source_type = 'PRODUCTION_BATCH'
                ");
                $stmt->execute([$batch['batch_id']]);
                if ($stmt->fetch()) {
                    continue; // Already logged
                }
            }
            
            try {
                // Record spoilage
                $_POST['batch_id'] = $batch['batch_id'];
                $_POST['spoilage_type'] = 'EXPIRED';
                $_POST['reason'] = 'Auto-detected expired batch';
                
                // Directly insert instead of calling recordSpoilage to avoid output
                $this->recordBatchSpoilageInternal($batch);
                $recorded++;
            } catch (Exception $e) {
                $errors[] = "Batch {$batch['batch_number']}: " . $e->getMessage();
            }
        }
        
        $this->sendSuccess([
            'scanned' => count($expiredBatches),
            'recorded' => $recorded,
            'errors' => $errors,
            'message' => "Scan complete. Recorded $recorded new spoilage incidents."
        ]);
    }
    
    /**
     * Internal method to record batch spoilage
     */
    private function recordBatchSpoilageInternal(array $batch): void {
        $spoilageRef = $this->generateSpoilageReference();
        $fifoBypass = $this->checkFifoBypass($batch['batch_id']);
        
        if ($this->tableExists('spoilage_log')) {
            $stmt = $this->db()->prepare("
                INSERT INTO spoilage_log (
                    spoilage_reference, source_type, batch_id, product_id,
                    batch_number, item_name, spoilage_type, spoilage_reason,
                    quantity_spoiled, unit_of_measure, unit_cost,
                    production_date, expiry_date, spoilage_date,
                    fifo_bypassed, bypass_evidence, status
                ) VALUES (?, 'PRODUCTION_BATCH', ?, ?, ?, ?, 'EXPIRED', 'Auto-detected expired batch', ?, 'units', ?, ?, ?, CURDATE(), ?, ?, 'PENDING')
            ");
            
            $stmt->execute([
                $spoilageRef,
                $batch['batch_id'],
                $batch['product_id'],
                $batch['batch_number'],
                $batch['product_name'],
                $batch['quantity_remaining'],
                $batch['production_cost'] ?? 0,
                $batch['production_date'],
                $batch['expiry_date'],
                $fifoBypass['bypassed'] ? 1 : 0,
                $fifoBypass['evidence'] ?? null
            ]);
        }
        
        // Update batch status
        $stmt = $this->db()->prepare("
            UPDATE production_batches 
            SET status = 'EXPIRED',
                quality_notes = CONCAT(COALESCE(quality_notes, ''), ' [AUTO-EXPIRED: ', ?, ']')
            WHERE batch_id = ?
        ");
        $stmt->execute([$spoilageRef, $batch['batch_id']]);
    }
    
    /**
     * Dispose of a batch (complete write-off)
     */
    private function disposeBatch(): void {
        $data = $this->getRequestData();
        $batchId = $data['batch_id'] ?? null;
        $reason = $data['reason'] ?? 'Disposed by finance';
        
        if (!$batchId) {
            $this->sendError('Batch ID required');
            return;
        }
        
        // Get batch details first
        $stmt = $this->db()->prepare("
            SELECT pb.*, p.name as product_name 
            FROM production_batches pb
            JOIN products p ON pb.product_id = p.product_id LEFT JOIN product_categories pc ON p.category_id = pc.category_id
            WHERE pb.batch_id = ?
        ");
        $stmt->execute([$batchId]);
        $batch = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$batch) {
            $this->sendError('Batch not found');
            return;
        }
        
        // Update product inventory
        $stmt = $this->db()->prepare("
            UPDATE products 
            SET quantity_on_hand = quantity_on_hand - ?
            WHERE product_id = ?
        ");
        $stmt->execute([$batch['quantity_remaining'], $batch['product_id']]);
        
        // Update batch status
        $stmt = $this->db()->prepare("
            UPDATE production_batches 
            SET status = 'DISPOSED',
                quantity_remaining = 0,
                quality_notes = CONCAT(COALESCE(quality_notes, ''), ' [DISPOSED: ', ?, ']')
            WHERE batch_id = ?
        ");
        $stmt->execute([$reason, $batchId]);
        
        // Update spoilage log if exists
        if ($this->tableExists('spoilage_log')) {
            $stmt = $this->db()->prepare("
                UPDATE spoilage_log 
                SET status = 'WRITTEN_OFF'
                WHERE batch_id = ? AND source_type = 'PRODUCTION_BATCH'
            ");
            $stmt->execute([$batchId]);
        }
        
        $this->sendSuccess([
            'message' => 'Batch disposed successfully',
            'batch_number' => $batch['batch_number'],
            'quantity_disposed' => $batch['quantity_remaining'],
            'loss_value' => $batch['quantity_remaining'] * ($batch['production_cost'] ?? 0)
        ]);
    }
    
    /**
     * Get spoilage details
     */
    private function getSpoilageDetails(): void {
        $spoilageId = $_GET['spoilage_id'] ?? null;
        
        if (!$spoilageId) {
            $this->sendError('Spoilage ID required');
            return;
        }
        
        if (!$this->tableExists('spoilage_log')) {
            $this->sendError('Spoilage log table not found');
            return;
        }
        
        $stmt = $this->db()->prepare("
            SELECT 
                sl.*,
                CONCAT(su_reported.first_name, ' ', su_reported.last_name) as reported_by_name,
                CONCAT(su_approved.first_name, ' ', su_approved.last_name) as approved_by_name
            FROM spoilage_log sl
            LEFT JOIN users su_reported ON sl.reported_by = su_reported.user_id
            LEFT JOIN users su_approved ON sl.approved_by = su_approved.user_id
            WHERE sl.spoilage_id = ?
        ");
        $stmt->execute([$spoilageId]);
        $spoilage = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$spoilage) {
            $this->sendError('Spoilage record not found');
            return;
        }
        
        $this->sendSuccess($spoilage);
    }
    
    /**
     * Check if FIFO was bypassed for a batch
     */
    private function checkFifoBypass(int $batchId): array {
        // Check if there were dispatches that skipped this batch
        if ($this->tableExists('dispatch_audit_log')) {
            $stmt = $this->db()->prepare("
                SELECT 
                    sales_order_id,
                    dispatched_batch_number,
                    dispatch_date
                FROM dispatch_audit_log
                WHERE oldest_available_batch_id = ?
                  AND fifo_compliant = 0
            ");
            $stmt->execute([$batchId]);
            $bypasses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (!empty($bypasses)) {
                $evidence = array_map(function($b) {
                    return "Order #{$b['sales_order_id']} on " . date('Y-m-d', strtotime($b['dispatch_date'])) . 
                           " used {$b['dispatched_batch_number']} instead";
                }, $bypasses);
                
                return [
                    'bypassed' => true,
                    'evidence' => implode('; ', $evidence),
                    'incidents' => count($bypasses)
                ];
            }
        }
        
        return ['bypassed' => false, 'evidence' => null];
    }
    
    /**
     * Get monthly trend data for chart
     */
    private function getMonthlyTrend(): array {
        $stmt = $this->db()->query("
            SELECT 
                DATE_FORMAT(expiry_date, '%Y-%m') as month,
                COUNT(*) as batch_count,
                SUM(quantity_remaining * COALESCE(production_cost, 0)) as loss_value
            FROM production_batches
            WHERE expiry_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
              AND expiry_date < CURDATE()
              AND quantity_remaining > 0
            GROUP BY DATE_FORMAT(expiry_date, '%Y-%m')
            ORDER BY month DESC
            LIMIT 6
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get recent spoilage incidents
     */
    private function getRecentSpoilage(): array {
        if ($this->tableExists('spoilage_log')) {
            $stmt = $this->db()->query("
                SELECT 
                    spoilage_reference,
                    item_name,
                    spoilage_type,
                    quantity_spoiled,
                    (quantity_spoiled * unit_cost) as loss_value,
                    spoilage_date,
                    status,
                    fifo_bypassed
                FROM spoilage_log
                ORDER BY created_at DESC
                LIMIT 10
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Fallback: use expired batches
        return $this->getExpiredBatchesData();
    }
    
    /**
     * Get FIFO compliance rate
     */
    private function getFifoComplianceRate(): array {
        if ($this->tableExists('dispatch_audit_log')) {
            $stmt = $this->db()->query("
                SELECT 
                    COUNT(*) as total_dispatches,
                    SUM(CASE WHEN fifo_compliant = 1 THEN 1 ELSE 0 END) as compliant_count,
                    SUM(CASE WHEN fifo_compliant = 0 THEN 1 ELSE 0 END) as bypass_count
                FROM dispatch_audit_log
                WHERE dispatch_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ");
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $total = intval($data['total_dispatches']);
            $compliant = intval($data['compliant_count']);
            
            return [
                'total_dispatches' => $total,
                'compliant_count' => $compliant,
                'bypass_count' => intval($data['bypass_count']),
                'compliance_rate' => $total > 0 ? round(($compliant / $total) * 100, 2) : 100
            ];
        }
        
        return [
            'total_dispatches' => 0,
            'compliant_count' => 0,
            'bypass_count' => 0,
            'compliance_rate' => 100,
            'message' => 'Dispatch audit log not available'
        ];
    }
    
    /**
     * Generate unique spoilage reference
     */
    private function generateSpoilageReference(): string {
        $date = date('Ymd');
        
        if ($this->tableExists('spoilage_log')) {
            $stmt = $this->db()->prepare("
                SELECT COUNT(*) + 1 as seq 
                FROM spoilage_log 
                WHERE DATE(created_at) = CURDATE()
            ");
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $seq = $result['seq'] ?? 1;
        } else {
            $seq = rand(1, 999);
        }
        
        return 'SPL-' . $date . '-' . str_pad($seq, 3, '0', STR_PAD_LEFT);
    }
    
    // =========================================================================
    // COST ALERT NOTIFICATIONS (BOM Engine Integration)
    // =========================================================================
    
    /**
     * Get notifications for Finance Officer (BOM cost changes, etc.)
     */
    private function getNotifications(): void {
        if (!$this->tableExists('system_notifications')) {
            $this->sendSuccess([
                'notifications' => [],
                'unread_count' => 0,
                'message' => 'Notification system not yet initialized'
            ]);
            return;
        }
        
        $readFilter = $_GET['status'] ?? null; // 'UNREAD', 'READ', or null for all
        $limit = intval($_GET['limit'] ?? 50);
        
        $sql = "
            SELECT 
                notification_id,
                notification_type,
                title,
                message,
                target_role,
                reference_type,
                reference_id,
                severity,
                metadata,
                CASE WHEN is_read = 1 THEN 'READ' ELSE 'UNREAD' END as status,
                created_at,
                read_at
            FROM system_notifications
            WHERE target_role IN ('FINANCE', 'Finance Officer', 'FINANCE_OFFICER', 'ALL', NULL)
               OR target_role IS NULL
        ";
        
        $params = [];
        
        if ($readFilter === 'UNREAD') {
            $sql .= " AND is_read = 0";
        } elseif ($readFilter === 'READ') {
            $sql .= " AND is_read = 1";
        }
        
        $sql .= " ORDER BY created_at DESC LIMIT ?";
        $params[] = $limit;
        
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get unread count
        $countStmt = $this->db()->query("
            SELECT COUNT(*) as count 
            FROM system_notifications 
            WHERE (target_role IN ('FINANCE', 'Finance Officer', 'FINANCE_OFFICER', 'ALL') OR target_role IS NULL)
              AND is_read = 0
        ");
        $unreadCount = $countStmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
        
        $this->sendSuccess([
            'notifications' => $notifications,
            'unread_count' => intval($unreadCount)
        ]);
    }
    
    /**
     * Mark a notification as read
     */
    private function markNotificationRead(): void {
        $data = $this->getRequestData();
        $notificationId = $data['notification_id'] ?? null;
        $markAll = $data['mark_all'] ?? false;
        
        if (!$this->tableExists('system_notifications')) {
            $this->sendError('Notification system not yet initialized');
            return;
        }
        
        if ($markAll) {
            // Mark all notifications as read for Finance
            $stmt = $this->db()->prepare("
                UPDATE system_notifications 
                SET is_read = 1, read_at = NOW()
                WHERE (target_role IN ('FINANCE', 'Finance Officer', 'FINANCE_OFFICER', 'ALL') OR target_role IS NULL)
                  AND is_read = 0
            ");
            $stmt->execute();
            $this->sendSuccess(['message' => 'All notifications marked as read', 'count' => $stmt->rowCount()]);
        } else {
            if (!$notificationId) {
                $this->sendError('Notification ID required');
                return;
            }
            
            $stmt = $this->db()->prepare("
                UPDATE system_notifications 
                SET is_read = 1, read_at = NOW()
                WHERE notification_id = ? AND is_read = 0
            ");
            $stmt->execute([$notificationId]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Notification not found or already read');
                return;
            }
            
            $this->sendSuccess(['message' => 'Notification marked as read']);
        }
    }
    
    /**
     * Get unread notification count only (for badge)
     */
    private function getNotificationCount(): void {
        if (!$this->tableExists('system_notifications')) {
            $this->sendSuccess(['count' => 0]);
            return;
        }
        
        $stmt = $this->db()->query("
            SELECT COUNT(*) as count 
            FROM system_notifications 
            WHERE (target_role IN ('FINANCE', 'Finance Officer', 'FINANCE_OFFICER', 'ALL') OR target_role IS NULL)
              AND is_read = 0
        ");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $this->sendSuccess(['count' => intval($result['count'] ?? 0)]);
    }
    
    /**
     * Check if a table exists
     */
    private function tableExists(string $tableName): bool {
        // Use query with escaped table name since SHOW TABLES LIKE doesn't support placeholders
        $escapedName = preg_replace('/[^a-zA-Z0-9_]/', '', $tableName);
        $stmt = $this->db()->query("SHOW TABLES LIKE '$escapedName'");
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Get request data
     */
    private function getRequestData(): array {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        return $data ?: $_POST;
    }

    /**
     * Send error response (alias for respondError)
     */
    private function sendError(string $message, int $code = 400): void {
        $this->respondError($message, $code);
    }

    /**
     * Send success response (alias for respondSuccess)
     */
    private function sendSuccess($data): void {
        $this->respondSuccess($data);
    }
    
    // ============================================================
    // PRODUCTION COST APPROVAL WORKFLOW (Finance Actions)
    // ============================================================
    
    /**
     * Get pending production cost approval requests for Finance to review
     */
    private function getPendingCostApprovals(): void {
        $stmt = $this->db()->query("
            SELECT 
                pca.*,
                pr.recipe_name,
                p.name as product_name,
                CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as requested_by_name,
                TIMESTAMPDIFF(HOUR, pca.requested_at, NOW()) as hours_pending
            FROM production_cost_approvals pca
            JOIN production_recipes pr ON pca.recipe_id = pr.recipe_id
            JOIN products p ON pca.product_id = p.product_id
            JOIN users u ON pca.requested_by = u.user_id
            WHERE pca.status = 'pending'
            ORDER BY pca.requested_at DESC
        ");
        $approvals = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decode batch_details JSON for each
        foreach ($approvals as &$approval) {
            $approval['batch_details'] = json_decode($approval['batch_details'], true);
        }
        
        $this->sendSuccess([
            'approvals' => $approvals,
            'pending_count' => count($approvals)
        ]);
    }
    
    /**
     * Approve a production cost request
     */
    private function approveCostRequest(): void {
        $input = $this->getRequestData();
        $approval_id = $input['approval_id'] ?? null;
        $review_notes = $input['review_notes'] ?? '';
        
        if (!$approval_id) {
            $this->sendError('Approval ID is required');
            return;
        }
        
        $user_id = $_SESSION['user_id'] ?? null;
        if (!$user_id) {
            $this->sendError('Not authenticated', 401);
            return;
        }
        
        $stmt = $this->db()->prepare("
            UPDATE production_cost_approvals 
            SET status = 'approved', 
                reviewed_by = ?, 
                reviewed_at = NOW(),
                review_notes = ?
            WHERE approval_id = ? AND status = 'pending'
        ");
        $stmt->execute([$user_id, $review_notes, $approval_id]);
        
        if ($stmt->rowCount() === 0) {
            $this->sendError('Approval not found or already processed');
            return;
        }
        
        // Create notification for the requester
        $stmt = $this->db()->prepare("
            SELECT pca.requested_by, p.name as product_name, pca.planned_quantity
            FROM production_cost_approvals pca
            JOIN products p ON pca.product_id = p.product_id
            WHERE pca.approval_id = ?
        ");
        $stmt->execute([$approval_id]);
        $approval = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $stmt = $this->db()->prepare("
            INSERT INTO system_notifications 
            (notification_type, title, message, reference_type, reference_id, created_at)
            VALUES ('cost_approval_approved', ?, ?, 'production_cost_approval', ?, NOW())
        ");
        $title = "Production Cost Approved";
        $message = "Your production request for {$approval['product_name']} ({$approval['planned_quantity']} units) has been approved. You may now proceed with production.";
        $stmt->execute([$title, $message, $approval_id]);
        
        $this->sendSuccess([
            'message' => 'Cost approval granted',
            'approval_id' => $approval_id
        ]);
    }
    
    /**
     * Reject a production cost request
     */
    private function rejectCostRequest(): void {
        $input = $this->getRequestData();
        $approval_id = $input['approval_id'] ?? null;
        $review_notes = $input['review_notes'] ?? '';
        
        if (!$approval_id) {
            $this->sendError('Approval ID is required');
            return;
        }
        
        if (empty($review_notes)) {
            $this->sendError('Rejection reason is required');
            return;
        }
        
        $user_id = $_SESSION['user_id'] ?? null;
        if (!$user_id) {
            $this->sendError('Not authenticated', 401);
            return;
        }
        
        $stmt = $this->db()->prepare("
            UPDATE production_cost_approvals 
            SET status = 'rejected', 
                reviewed_by = ?, 
                reviewed_at = NOW(),
                review_notes = ?
            WHERE approval_id = ? AND status = 'pending'
        ");
        $stmt->execute([$user_id, $review_notes, $approval_id]);
        
        if ($stmt->rowCount() === 0) {
            $this->sendError('Approval not found or already processed');
            return;
        }
        
        // Get details for notification
        $stmt = $this->db()->prepare("
            SELECT pca.requested_by, p.name as product_name, pca.planned_quantity
            FROM production_cost_approvals pca
            JOIN products p ON pca.product_id = p.product_id
            WHERE pca.approval_id = ?
        ");
        $stmt->execute([$approval_id]);
        $approval = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Create notification for the requester
        $stmt = $this->db()->prepare("
            INSERT INTO system_notifications 
            (notification_type, title, message, reference_type, reference_id, created_at)
            VALUES ('cost_approval_rejected', ?, ?, 'production_cost_approval', ?, NOW())
        ");
        $title = "Production Cost Rejected";
        $message = "Your production request for {$approval['product_name']} ({$approval['planned_quantity']} units) was rejected. Reason: {$review_notes}";
        $stmt->execute([$title, $message, $approval_id]);
        
        $this->sendSuccess([
            'message' => 'Cost request rejected',
            'approval_id' => $approval_id
        ]);
    }
}

// Initialize and handle request
$api = new SpoilageReportAPI();
$api->handleRequest();
