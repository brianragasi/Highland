<?php
/**
 * Farmer Payout API
 * User 5 FIFO Implementation: Finance Officer - Farmer Payment Management
 * 
 * Handles:
 * - Generate payout summaries from milk collections
 * - Calculate payments excluding rejected milk
 * - Track transport deductions
 * - Batch-level traceability for audits
 */

require_once 'BaseAPI.php';
require_once 'SessionConfig.php';

class FarmerPayoutAPI extends BaseAPI {
    
    public function __construct() {
        parent::__construct();
        $this->initializeSession();
    }
    
    /**
     * Handle incoming requests
     */
    public function handleRequest(): void {
        try {
            // Check GET, POST, and JSON body for action
            $action = $_GET['action'] ?? $_POST['action'] ?? '';
            
            // If no action found, check JSON body
            if (empty($action)) {
                $json = file_get_contents('php://input');
                $data = json_decode($json, true);
                if ($data && isset($data['action'])) {
                    $action = $data['action'];
                }
            }
            
            switch ($action) {
                case 'getPayouts':
                    $this->getPayouts();
                    break;
                    
                case 'getPayoutDetails':
                    $this->getPayoutDetails();
                    break;
                    
                case 'generatePayout':
                    $this->generatePayout();
                    break;
                    
                case 'approvePayout':
                    $this->approvePayout();
                    break;
                    
                case 'markAsPaid':
                    $this->markAsPaid();
                    break;
                
                case 'deletePayout':
                    $this->deletePayout();
                    break;
                    
                case 'getSupplierSummary':
                    $this->getSupplierSummary();
                    break;
                    
                case 'getPayoutDashboard':
                    $this->getPayoutDashboard();
                    break;
                    
                case 'getCollectionsForPeriod':
                    $this->getCollectionsForPeriod();
                    break;
                    
                case 'getDairySuppliers':
                    $this->getDairySuppliers();
                    break;
                    
                case 'exportPayoutReport':
                    $this->exportPayoutReport();
                    break;
                    
                default:
                    $this->sendError('Invalid action specified');
            }
        } catch (Exception $e) {
            error_log("[FarmerPayoutAPI] Error: " . $e->getMessage());
            $this->sendError($e->getMessage());
        }
    }
    
    /**
     * Get all payouts with filtering
     */
    private function getPayouts(): void {
        $status = $_GET['status'] ?? null;
        $supplierId = $_GET['supplier_id'] ?? null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        
        $sql = "
            SELECT 
                fp.payout_id,
                fp.payout_reference,
                fp.supplier_id,
                s.name as supplier_name,
                s.contact_person as contact_person,
                fp.period_start,
                fp.period_end,
                fp.total_liters_accepted,
                fp.gross_amount,
                fp.total_transport_deductions,
                fp.net_amount_payable,
                fp.status,
                fp.generated_by,
                CONCAT(su.first_name, ' ', su.last_name) as generated_by_name,
                fp.created_at
            FROM farmer_payouts fp
            JOIN suppliers s ON fp.supplier_id = s.supplier_id
            LEFT JOIN users su ON fp.generated_by = su.user_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($status) {
            $sql .= " AND fp.status = ?";
            $params[] = $status;
        }
        
        if ($supplierId) {
            $sql .= " AND fp.supplier_id = ?";
            $params[] = $supplierId;
        }
        
        if ($startDate) {
            $sql .= " AND fp.period_start >= ?";
            $params[] = $startDate;
        }
        
        if ($endDate) {
            $sql .= " AND fp.period_end <= ?";
            $params[] = $endDate;
        }
        
        $sql .= " ORDER BY fp.created_at DESC";
        
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $payouts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendSuccess($payouts);
    }
    
    /**
     * Get detailed payout breakdown with all collections
     */
    private function getPayoutDetails(): void {
        $payoutId = $_GET['payout_id'] ?? null;
        
        if (!$payoutId) {
            $this->sendError('Payout ID required');
            return;
        }
        
        // Get payout header
        $stmt = $this->db()->prepare("
            SELECT 
                fp.*,
                s.name as supplier_name,
                s.contact_person,
                s.email,
                s.phone_number as phone,
                s.address,
                CONCAT(su.first_name, ' ', su.last_name) as generated_by_name
            FROM farmer_payouts fp
            JOIN suppliers s ON fp.supplier_id = s.supplier_id
            LEFT JOIN users su ON fp.generated_by = su.user_id
            WHERE fp.payout_id = ?
        ");
        $stmt->execute([$payoutId]);
        $payout = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$payout) {
            $this->sendError('Payout not found');
            return;
        }
        
        // Get associated collections (from milk_daily_collections if exists)
        // Or calculate from raw_milk_collections
        $collections = $this->getPayoutCollections($payout['supplier_id'], $payout['period_start'], $payout['period_end']);
        
        $payout['collections'] = $collections;
        $payout['collection_count'] = count($collections);
        
        $this->sendSuccess($payout);
    }
    
    /**
     * Get collections for a payout period
     */
    private function getPayoutCollections(int $supplierId, string $periodStart, string $periodEnd): array {
        // First check if raw_milk_collections table exists
        $tableExists = $this->tableExists('raw_milk_collections');
        
        if ($tableExists) {
            $stmt = $this->db()->prepare("
                SELECT 
                    rmc.collection_id,
                    rmc.rmr_number,
                    rmc.collection_date,
                    rmc.quantity_liters,
                    rmc.temperature,
                    rmc.fat_content,
                    rmc.status,
                    rmc.aging_status,
                    CASE WHEN rmc.status = 'REJECTED' THEN 0 ELSE rmc.quantity_liters END as accepted_liters,
                    CASE WHEN rmc.status = 'REJECTED' THEN rmc.quantity_liters ELSE 0 END as rejected_liters
                FROM raw_milk_collections rmc
                WHERE rmc.supplier_id = ?
                  AND DATE(rmc.collection_date) BETWEEN ? AND ?
                ORDER BY rmc.collection_date ASC
            ");
            $stmt->execute([$supplierId, $periodStart, $periodEnd]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        // Fallback to milk_daily_collections if it exists
        if ($this->tableExists('milk_daily_collections')) {
            $stmt = $this->db()->prepare("
                SELECT 
                    mdc.collection_id,
                    mdc.rmr_number,
                    mdc.collection_date,
                    mdc.liters_delivered as quantity_liters,
                    mdc.liters_accepted as accepted_liters,
                    mdc.liters_rejected as rejected_liters,
                    mdc.fat_content,
                    'ACCEPTED' as status
                FROM milk_daily_collections mdc
                WHERE mdc.supplier_id = ?
                  AND mdc.collection_date BETWEEN ? AND ?
                ORDER BY mdc.collection_date ASC
            ");
            $stmt->execute([$supplierId, $periodStart, $periodEnd]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        return [];
    }
    
    /**
     * Generate a new payout for a supplier and period
     */
    private function generatePayout(): void {
        $data = $this->getRequestData();
        
        $supplierId = $data['supplier_id'] ?? null;
        $periodStart = $data['period_start'] ?? null;
        $periodEnd = $data['period_end'] ?? null;
        $pricePerLiter = $data['price_per_liter'] ?? 40.00;
        $transportDeduction = $data['transport_deduction'] ?? 0.00;
        
        if (!$supplierId || !$periodStart || !$periodEnd) {
            $this->sendError('Supplier ID, period start, and period end are required');
            return;
        }
        
        // Check for existing payout in this period
        $stmt = $this->db()->prepare("
            SELECT payout_id FROM farmer_payouts 
            WHERE supplier_id = ? 
              AND period_start = ? 
              AND period_end = ?
        ");
        $stmt->execute([$supplierId, $periodStart, $periodEnd]);
        if ($stmt->fetch()) {
            $this->sendError('A payout already exists for this supplier and period');
            return;
        }
        
        // Calculate totals from collections
        $collections = $this->getPayoutCollections($supplierId, $periodStart, $periodEnd);
        
        $totalLitersAccepted = 0;
        $totalLitersRejected = 0;
        
        foreach ($collections as $collection) {
            $totalLitersAccepted += floatval($collection['accepted_liters'] ?? $collection['quantity_liters'] ?? 0);
            $totalLitersRejected += floatval($collection['rejected_liters'] ?? 0);
        }
        
        if ($totalLitersAccepted <= 0) {
            $this->sendError('No accepted milk collections found for supplier in the selected period (' . $periodStart . ' to ' . $periodEnd . '). Please verify that milk deliveries have been recorded for this supplier.');
            return;
        }
        
        // Calculate amounts
        $grossAmount = $totalLitersAccepted * $pricePerLiter;
        $netAmount = $grossAmount - $transportDeduction;
        
        // Generate reference number
        $payoutRef = $this->generatePayoutReference();
        
        // Get current user - require authentication
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            $this->sendError('User session required to generate payout', 401);
            return;
        }
        
        // Insert payout record
        $stmt = $this->db()->prepare("
            INSERT INTO farmer_payouts (
                payout_reference, supplier_id, period_start, period_end,
                total_liters_accepted, gross_amount, total_transport_deductions,
                net_amount_payable, status, generated_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, NOW())
        ");
        
        $stmt->execute([
            $payoutRef,
            $supplierId,
            $periodStart,
            $periodEnd,
            $totalLitersAccepted,
            $grossAmount,
            $transportDeduction,
            $netAmount,
            $userId
        ]);
        
        $payoutId = $this->db()->lastInsertId();
        
        $this->sendSuccess([
            'payout_id' => $payoutId,
            'payout_reference' => $payoutRef,
            'total_liters_accepted' => $totalLitersAccepted,
            'total_liters_rejected' => $totalLitersRejected,
            'gross_amount' => $grossAmount,
            'transport_deduction' => $transportDeduction,
            'net_amount' => $netAmount,
            'collection_count' => count($collections),
            'message' => 'Payout generated successfully'
        ]);
    }
    
    /**
     * Approve a draft payout
     */
    private function approvePayout(): void {
        $data = $this->getRequestData();
        $payoutId = $data['payout_id'] ?? null;
        
        if (!$payoutId) {
            $this->sendError('Payout ID required');
            return;
        }
        
        $stmt = $this->db()->prepare("
            UPDATE farmer_payouts 
            SET status = 'Approved'
            WHERE payout_id = ? AND status = 'Draft'
        ");
        $stmt->execute([$payoutId]);
        
        if ($stmt->rowCount() === 0) {
            $this->sendError('Payout not found or not in Draft status');
            return;
        }
        
        $this->sendSuccess(['message' => 'Payout approved successfully']);
    }
    
    /**
     * Mark payout as paid with payment details
     */
    private function markAsPaid(): void {
        $data = $this->getRequestData();
        $payoutId = $data['payout_id'] ?? null;
        $paymentMethod = $data['payment_method'] ?? 'Bank Transfer';
        $paymentReference = $data['payment_reference'] ?? null;
        $paymentDate = $data['payment_date'] ?? date('Y-m-d');
        $paymentNotes = $data['payment_notes'] ?? null;
        
        if (!$payoutId) {
            $this->sendError('Payout ID required');
            return;
        }
        
        // Update payout status to Paid
        $stmt = $this->db()->prepare("
            UPDATE farmer_payouts 
            SET status = 'Paid'
            WHERE payout_id = ? AND status = 'Approved'
        ");
        $stmt->execute([$payoutId]);
        
        if ($stmt->rowCount() === 0) {
            $this->sendError('Payout not found or not in Approved status');
            return;
        }
        
        $this->sendSuccess([
            'message' => 'Payment processed successfully',
            'payment_method' => $paymentMethod,
            'payment_reference' => $paymentReference,
            'payment_date' => $paymentDate
        ]);
    }
    
    /**
     * Delete a draft payout
     */
    private function deletePayout(): void {
        $data = $this->getRequestData();
        $payoutId = $data['payout_id'] ?? null;
        
        if (!$payoutId) {
            $this->sendError('Payout ID required');
            return;
        }
        
        // Only allow deleting Draft payouts
        $stmt = $this->db()->prepare("
            DELETE FROM farmer_payouts 
            WHERE payout_id = ? AND status = 'Draft'
        ");
        $stmt->execute([$payoutId]);
        
        if ($stmt->rowCount() === 0) {
            $this->sendError('Payout not found or cannot be deleted (only Draft payouts can be deleted)');
            return;
        }
        
        $this->sendSuccess(['message' => 'Draft payout deleted']);
    }
    
    /**
     * Get supplier summary for payout generation
     */
    private function getSupplierSummary(): void {
        $supplierId = $_GET['supplier_id'] ?? null;
        $periodStart = $_GET['period_start'] ?? date('Y-m-01'); // Default to start of month
        $periodEnd = $_GET['period_end'] ?? date('Y-m-d'); // Default to today
        
        if (!$supplierId) {
            $this->sendError('Supplier ID required');
            return;
        }
        
        // Get supplier info
        $stmt = $this->db()->prepare("
            SELECT supplier_id, name, name as company_name, contact_person, email, phone_number as phone
            FROM suppliers WHERE supplier_id = ?
        ");
        $stmt->execute([$supplierId]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$supplier) {
            $this->sendError('Supplier not found');
            return;
        }
        
        // Get collections summary
        $collections = $this->getPayoutCollections($supplierId, $periodStart, $periodEnd);
        
        $totalDelivered = 0;
        $totalAccepted = 0;
        $totalRejected = 0;
        
        foreach ($collections as $c) {
            $totalDelivered += floatval($c['quantity_liters'] ?? 0);
            $totalAccepted += floatval($c['accepted_liters'] ?? $c['quantity_liters'] ?? 0);
            $totalRejected += floatval($c['rejected_liters'] ?? 0);
        }
        
        $this->sendSuccess([
            'supplier' => $supplier,
            'period' => [
                'start' => $periodStart,
                'end' => $periodEnd
            ],
            'summary' => [
                'collection_count' => count($collections),
                'total_delivered' => $totalDelivered,
                'total_accepted' => $totalAccepted,
                'total_rejected' => $totalRejected,
                'acceptance_rate' => $totalDelivered > 0 ? round(($totalAccepted / $totalDelivered) * 100, 2) : 0
            ],
            'collections' => $collections
        ]);
    }
    
    /**
     * Get payout dashboard statistics
     */
    private function getPayoutDashboard(): void {
        // Get summary stats
        $stmt = $this->db()->query("
            SELECT 
                COUNT(*) as total_payouts,
                SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft_count,
                SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status = 'Draft' THEN net_amount_payable ELSE 0 END) as pending_amount,
                SUM(CASE WHEN status = 'Approved' THEN net_amount_payable ELSE 0 END) as approved_amount,
                SUM(CASE WHEN status = 'Paid' THEN net_amount_payable ELSE 0 END) as paid_amount,
                SUM(total_liters_accepted) as total_liters_all_time
            FROM farmer_payouts
        ");
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get recent payouts
        $stmt = $this->db()->query("
            SELECT 
                fp.payout_id,
                fp.payout_reference,
                s.name as supplier_name,
                fp.period_start,
                fp.period_end,
                fp.net_amount_payable,
                fp.status,
                fp.created_at
            FROM farmer_payouts fp
            JOIN suppliers s ON fp.supplier_id = s.supplier_id
            ORDER BY fp.created_at DESC
            LIMIT 10
        ");
        $recentPayouts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get suppliers with pending collections (no payout generated)
        $suppliersNeedingPayout = $this->getSuppliersNeedingPayout();
        
        $this->sendSuccess([
            'stats' => $stats,
            'recent_payouts' => $recentPayouts,
            'suppliers_needing_payout' => $suppliersNeedingPayout
        ]);
    }
    
    /**
     * Get suppliers that have collections without payouts
     */
    private function getSuppliersNeedingPayout(): array {
        // Check which collection table exists
        $collectionTable = $this->tableExists('raw_milk_collections') 
            ? 'raw_milk_collections' 
            : ($this->tableExists('milk_daily_collections') ? 'milk_daily_collections' : null);
        
        if (!$collectionTable) {
            return [];
        }
        
        // Determine column names based on table
        $litersColumn = $collectionTable === 'milk_daily_collections' ? 'liters_accepted' : 'quantity_liters';
        
        $currentMonth = date('Y-m-01');
        
        // Get suppliers with milk collections but no payout this month
        $stmt = $this->db()->prepare("
            SELECT DISTINCT 
                s.supplier_id,
                s.name,
                s.contact_person,
                (SELECT COUNT(*) FROM {$collectionTable} mc WHERE mc.supplier_id = s.supplier_id) as collection_count,
                (SELECT SUM(COALESCE(mc2.{$litersColumn}, 0)) 
                 FROM {$collectionTable} mc2 WHERE mc2.supplier_id = s.supplier_id) as total_liters
            FROM suppliers s
            WHERE EXISTS (
                SELECT 1 FROM {$collectionTable} mc WHERE mc.supplier_id = s.supplier_id
            )
            AND NOT EXISTS (
                SELECT 1 FROM farmer_payouts fp 
                WHERE fp.supplier_id = s.supplier_id 
                AND fp.period_start >= ?
            )
            ORDER BY s.name
        ");
        $stmt->execute([$currentMonth]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get collections for a specific period (for preview before generating payout)
     */
    private function getCollectionsForPeriod(): void {
        $supplierId = $_GET['supplier_id'] ?? null;
        $periodStart = $_GET['period_start'] ?? null;
        $periodEnd = $_GET['period_end'] ?? null;
        
        if (!$supplierId || !$periodStart || !$periodEnd) {
            $this->sendError('Supplier ID, period start, and period end are required');
            return;
        }
        
        $collections = $this->getPayoutCollections($supplierId, $periodStart, $periodEnd);
        
        $this->sendSuccess([
            'collections' => $collections,
            'count' => count($collections)
        ]);
    }
    
    /**
     * Get all dairy cooperative suppliers with collection counts
     */
    private function getDairySuppliers(): void {
        // Check which collection table exists
        $collectionTable = $this->tableExists('raw_milk_collections') 
            ? 'raw_milk_collections' 
            : ($this->tableExists('milk_daily_collections') ? 'milk_daily_collections' : null);
        
        if ($collectionTable) {
            $litersColumn = $collectionTable === 'milk_daily_collections' ? 'liters_accepted' : 'quantity_liters';
            $stmt = $this->db()->query("
                SELECT 
                    s.supplier_id,
                    s.name,
                    s.name as company_name,
                    s.contact_person,
                    s.email,
                    s.phone_number as phone,
                    s.address,
                    s.supplier_type,
                    COUNT(mc.collection_id) as total_collections,
                    COALESCE(SUM(mc.{$litersColumn}), 0) as total_liters_collected,
                    MAX(mc.collection_date) as last_collection_date
                FROM suppliers s
                LEFT JOIN {$collectionTable} mc ON s.supplier_id = mc.supplier_id
                WHERE s.supplier_type = 'Dairy Cooperative'
                   OR s.supplier_type LIKE '%Dairy%'
                   OR s.supplier_type LIKE '%Farm%'
                GROUP BY s.supplier_id, s.name, s.contact_person, s.email, s.phone_number, s.address, s.supplier_type
                ORDER BY s.name
            ");
        } else {
            $stmt = $this->db()->query("
                SELECT 
                    s.supplier_id,
                    s.name,
                    s.name as company_name,
                    s.contact_person,
                    s.email,
                    s.phone_number as phone,
                    s.address,
                    s.supplier_type,
                    0 as total_collections,
                    0 as total_liters_collected,
                    NULL as last_collection_date
                FROM suppliers s
                WHERE s.supplier_type = 'Dairy Cooperative'
                   OR s.supplier_type LIKE '%Dairy%'
                   OR s.supplier_type LIKE '%Farm%'
                ORDER BY s.name
            ");
        }
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendSuccess($suppliers);
    }
    
    /**
     * Export payout report (returns data for CSV/PDF generation)
     */
    private function exportPayoutReport(): void {
        $payoutId = $_GET['payout_id'] ?? null;
        
        if (!$payoutId) {
            $this->sendError('Payout ID required');
            return;
        }
        
        // Get full payout details
        $stmt = $this->db()->prepare("
            SELECT 
                fp.*,
                s.name as supplier_name,
                s.contact_person,
                s.email,
                s.phone_number as phone,
                s.address,
                CONCAT(su.first_name, ' ', su.last_name) as generated_by_name
            FROM farmer_payouts fp
            JOIN suppliers s ON fp.supplier_id = s.supplier_id
            LEFT JOIN users su ON fp.generated_by = su.user_id
            WHERE fp.payout_id = ?
        ");
        $stmt->execute([$payoutId]);
        $payout = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$payout) {
            $this->sendError('Payout not found');
            return;
        }
        
        // Get collections
        $collections = $this->getPayoutCollections(
            $payout['supplier_id'], 
            $payout['period_start'], 
            $payout['period_end']
        );
        
        $this->sendSuccess([
            'payout' => $payout,
            'collections' => $collections,
            'export_date' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Generate unique payout reference number
     */
    private function generatePayoutReference(): string {
        $date = date('Ymd');
        
        $stmt = $this->db()->prepare("
            SELECT COUNT(*) + 1 as seq 
            FROM farmer_payouts 
            WHERE DATE(created_at) = CURDATE()
        ");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $seq = $result['seq'] ?? 1;
        
        return 'PAY-' . $date . '-' . str_pad($seq, 3, '0', STR_PAD_LEFT);
    }
    
    /**
     * Check if a table exists in the database
     */
    private function tableExists(string $tableName): bool {
        // Use direct query with escaped table name since SHOW TABLES LIKE doesn't support placeholders
        $escapedName = preg_replace('/[^a-zA-Z0-9_]/', '', $tableName);
        $stmt = $this->db()->query("SHOW TABLES LIKE '$escapedName'");
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Get request data from POST body
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
}

// Initialize and handle request
$api = new FarmerPayoutAPI();
$api->handleRequest();
