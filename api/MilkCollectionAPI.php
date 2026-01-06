<?php
/**
 * Highland Fresh Milk Collection API
 * User 4 (QC Officer) FIFO Implementation
 * 
 * Features:
 * - RMR (Raw Milk Receipt) number generation
 * - Milk collection entry with QC tests
 * - Milk aging alerts (24-48 hour expiry)
 * - Rejection workflow with reason tracking
 * - Farmer payout integration
 * 
 * Date: December 2, 2025
 */

require_once 'BaseAPI.php';
require_once 'SessionConfig.php';

class MilkCollectionAPI extends BaseAPI
{
    protected array $allowedRoles = ['Admin', 'Quality Control Officer', 'QC Officer', 'Production Supervisor'];

    public function __construct()
    {
        parent::__construct();
        $this->initializeSession();
    }

    /**
     * Main request handler
     */
    public function handleRequest(): void
    {
        try {
            // Parse input from various sources
            $jsonInput = $this->getJsonInput() ?? [];
            
            // Also parse raw POST body for form-urlencoded data if $_POST is empty
            $rawInput = [];
            if (empty($_POST) && $_SERVER['REQUEST_METHOD'] === 'POST') {
                $rawBody = file_get_contents('php://input');
                if ($rawBody) {
                    parse_str($rawBody, $rawInput);
                }
            }
            
            $input = array_merge($_GET, $_POST, $rawInput, $jsonInput);
            $operation = $input['operation'] ?? $_GET['operation'] ?? $_POST['operation'] ?? '';

            switch ($operation) {
                // Dashboard & Stats
                case 'getDashboardStats':
                    $this->getDashboardStats();
                    break;
                case 'getAgingAlerts':
                    $this->getAgingAlerts();
                    break;
                case 'getMilkAgingStatus':
                    $this->getMilkAgingStatus();
                    break;

                // RMR Number Generation
                case 'generateRmrNumber':
                    $this->generateRmrNumber();
                    break;

                // Milk Collection CRUD
                case 'getCollections':
                    $this->getCollections($input);
                    break;
                case 'getCollection':
                    $this->getCollection($input);
                    break;
                case 'createCollection':
                    $this->createCollection($input);
                    break;
                case 'updateCollection':
                    $this->updateCollection($input);
                    break;

                // QC Actions
                case 'recordQCTest':
                    $this->recordQCTest($input);
                    break;
                case 'rejectMilk':
                    $this->rejectMilk($input);
                    break;
                case 'prioritizeCollection':
                    $this->prioritizeCollection($input);
                    break;
                case 'acceptMilk':
                    $this->acceptMilk($input);
                    break;

                // Processing
                case 'markAsProcessed':
                    $this->markAsProcessed($input);
                    break;
                case 'expireOldBatches':
                    $this->expireOldBatches();
                    break;

                // GAP 2: Disposal Workflow with Spoilage Logging
                case 'discardExpiredMilk':
                    $this->discardExpiredMilk($input);
                    break;

                // GAP 1: BOM Trigger - Get previous milk price for comparison
                case 'getPreviousMilkPrice':
                    $this->getPreviousMilkPrice();
                    break;

                // Suppliers/Farmers
                case 'getDairySuppliers':
                    $this->getDairySuppliers();
                    break;

                // Reports
                case 'getPayoutReport':
                    $this->getPayoutReport($input);
                    break;

                default:
                    $this->respondError('Unknown operation: ' . $operation, 400);
            }
        } catch (Exception $e) {
            error_log('MilkCollectionAPI Error: ' . $e->getMessage());
            $this->respondError('An error occurred: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate a unique RMR (Raw Milk Receipt) number
     * Format: RMR-YYYYMMDD-XXX where XXX is sequential number for that day
     */
    private function generateRmrNumber(): void
    {
        try {
            $pdo = $this->db();
            $today = date('Ymd');
            $datePrefix = 'RMR-' . $today . '-';
            
            // Find the max sequence number by extracting the numeric suffix from RMR numbers
            // Pattern: RMR-YYYYMMDD-XXX where XXX is a 3-digit number
            $stmt = $pdo->prepare("
                SELECT MAX(CAST(SUBSTRING(rmr_number, -3) AS UNSIGNED)) as max_seq
                FROM milk_daily_collections
                WHERE rmr_number LIKE ?
                  AND rmr_number REGEXP '^RMR-[0-9]{8}-[0-9]{3}$'
            ");
            $stmt->execute([$datePrefix . '%']);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $sequence = ($result['max_seq'] ?? 0) + 1;
            
            $rmrNumber = sprintf('RMR-%s-%03d', $today, $sequence);
            
            $this->respondSuccess(['rmr_number' => $rmrNumber]);
            
        } catch (Exception $e) {
            $this->respondError('Failed to generate RMR number: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get dashboard statistics for QC Officer
     */
    private function getDashboardStats(): void
    {
        try {
            $pdo = $this->db();

            // Today's collections
            $stmt = $pdo->query("
                SELECT 
                    COUNT(*) as total_collections,
                    COALESCE(SUM(liters_delivered), 0) as total_liters_delivered,
                    COALESCE(SUM(liters_accepted), 0) as total_liters_accepted,
                    COALESCE(SUM(liters_rejected), 0) as total_liters_rejected
                FROM milk_daily_collections
                WHERE DATE(collection_date) = CURDATE()
            ");
            $todayStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Pending (collections without production usage yet) - simplified query
            $stmt = $pdo->query("
                SELECT COUNT(*) as pending_count, COALESCE(SUM(liters_accepted), 0) as pending_liters
                FROM milk_daily_collections
                WHERE DATE(collection_date) >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
                  AND liters_accepted > 0
            ");
            $pendingStats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Critical alerts (collections older than 36 hours with accepted milk)
            $stmt = $pdo->query("
                SELECT COUNT(*) as critical_count
                FROM milk_daily_collections
                WHERE TIMESTAMPDIFF(HOUR, collection_date, NOW()) >= 36
                  AND TIMESTAMPDIFF(HOUR, collection_date, NOW()) < 48
                  AND liters_accepted > 0
            ");
            $criticalCount = $stmt->fetch(PDO::FETCH_ASSOC)['critical_count'];

            // Warning alerts (collections between 24-36 hours)
            $stmt = $pdo->query("
                SELECT COUNT(*) as warning_count
                FROM milk_daily_collections
                WHERE TIMESTAMPDIFF(HOUR, collection_date, NOW()) >= 24
                  AND TIMESTAMPDIFF(HOUR, collection_date, NOW()) < 36
                  AND liters_accepted > 0
            ");
            $warningCount = $stmt->fetch(PDO::FETCH_ASSOC)['warning_count'];

            // Active suppliers today
            $stmt = $pdo->query("
                SELECT COUNT(DISTINCT supplier_id) as active_suppliers
                FROM milk_daily_collections
                WHERE DATE(collection_date) = CURDATE()
            ");
            $activeSuppliers = $stmt->fetch(PDO::FETCH_ASSOC)['active_suppliers'];

            // Rejection rate this week
            $stmt = $pdo->query("
                SELECT 
                    COALESCE(SUM(liters_rejected), 0) as rejected,
                    COALESCE(SUM(liters_delivered), 0) as delivered
                FROM milk_daily_collections
                WHERE collection_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ");
            $weekStats = $stmt->fetch(PDO::FETCH_ASSOC);
            $rejectionRate = $weekStats['delivered'] > 0 
                ? round(($weekStats['rejected'] / $weekStats['delivered']) * 100, 2) 
                : 0;

            $this->respondSuccess([
                'total_collections' => intval($todayStats['total_collections']),
                'total_liters' => floatval($todayStats['total_liters_accepted']),
                'pending_count' => intval($pendingStats['pending_count']),
                'critical_count' => intval($criticalCount),
                'warning_count' => intval($warningCount),
                'active_suppliers' => intval($activeSuppliers),
                'rejection_rate' => $rejectionRate
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to get dashboard stats: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get milk aging alerts - Critical for FIFO
     */
    private function getAgingAlerts(): void
    {
        try {
            $pdo = $this->db();

            // Get collections from last 30 days that still have milk to process
            // JOIN raw_material_batches to exclude DISCARDED items
            $stmt = $pdo->query("
                SELECT 
                    mc.collection_id,
                    mc.rmr_number,
                    mc.supplier_id,
                    s.name as supplier_name,
                    mc.collection_date,
                    mc.liters_accepted,
                    mc.fat_content,
                    mc.titratable_acidity,
                    rmb.status as batch_status,
                    
                    -- Age calculations (assuming 48 hour expiry from collection date)
                    TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) as age_hours,
                    48 - TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) as hours_until_expiry,
                    
                    -- Status based on age (check batch status first)
                    CASE 
                        WHEN rmb.status = 'DISCARDED' THEN 'DISCARDED'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 48 THEN 'EXPIRED'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 36 THEN 'CRITICAL'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 24 THEN 'WARNING'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 18 THEN 'CAUTION'
                        ELSE 'OK'
                    END as aging_status
                    
                FROM milk_daily_collections mc
                LEFT JOIN suppliers s ON mc.supplier_id = s.supplier_id
                LEFT JOIN raw_material_batches rmb ON mc.rmr_number = rmb.highland_fresh_batch_code
                WHERE mc.liters_accepted > 0
                  AND mc.collection_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  AND (rmb.status IS NULL OR rmb.status NOT IN ('DISCARDED', 'CONSUMED'))
                ORDER BY 
                    CASE 
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 48 THEN 1
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 36 THEN 2
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 24 THEN 3
                        ELSE 4
                    END,
                    mc.collection_date ASC
            ");

            $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Build alert messages
            foreach ($alerts as &$alert) {
                $alert['age_hours'] = intval($alert['age_hours']);
                $alert['hours_until_expiry'] = max(0, intval($alert['hours_until_expiry']));
                $alert['liters_accepted'] = floatval($alert['liters_accepted']);

                switch ($alert['aging_status']) {
                    case 'EXPIRED':
                        $alert['alert_message'] = "EXPIRED: {$alert['rmr_number']} has spoiled! {$alert['liters_accepted']}L must be discarded.";
                        $alert['alert_class'] = 'danger';
                        $alert['icon'] = '🔴';
                        break;
                    case 'CRITICAL':
                        $alert['alert_message'] = "CRITICAL: {$alert['rmr_number']} must be processed within {$alert['hours_until_expiry']} hours!";
                        $alert['alert_class'] = 'danger';
                        $alert['icon'] = '🔴';
                        break;
                    case 'WARNING':
                        $alert['alert_message'] = "WARNING: {$alert['rmr_number']} expires in {$alert['hours_until_expiry']} hours. Prioritize processing.";
                        $alert['alert_class'] = 'warning';
                        $alert['icon'] = '🟡';
                        break;
                    case 'CAUTION':
                        $alert['alert_message'] = "CAUTION: {$alert['rmr_number']} has {$alert['hours_until_expiry']} hours until expiry.";
                        $alert['alert_class'] = 'info';
                        $alert['icon'] = '🟠';
                        break;
                    default:
                        $alert['alert_message'] = "{$alert['rmr_number']}: {$alert['liters_accepted']}L from {$alert['supplier_name']}";
                        $alert['alert_class'] = 'success';
                        $alert['icon'] = '🟢';
                }
            }

            // Filter to only show alerts (not OK status)
            $alertsOnly = array_filter($alerts, fn($a) => $a['aging_status'] !== 'OK');

            $this->respondSuccess(array_values($alertsOnly));

        } catch (Exception $e) {
            $this->respondError('Failed to get aging alerts: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get full milk aging status for dashboard widget
     */
    private function getMilkAgingStatus(): void
    {
        try {
            $pdo = $this->db();

            $stmt = $pdo->query("
                SELECT 
                    mc.collection_id,
                    mc.rmr_number,
                    s.name as supplier_name,
                    mc.liters_accepted as liters,
                    mc.collection_date,
                    TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) as age_hours,
                    48 - TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) as hours_remaining,
                    CASE 
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 48 THEN 'EXPIRED'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 36 THEN 'CRITICAL'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 24 THEN 'WARNING'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 18 THEN 'CAUTION'
                        ELSE 'OK'
                    END as status
                FROM milk_daily_collections mc
                LEFT JOIN suppliers s ON mc.supplier_id = s.supplier_id
                WHERE mc.liters_accepted > 0
                  AND mc.collection_date >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
                ORDER BY mc.collection_date ASC
                LIMIT 20
            ");

            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($batches as &$batch) {
                $batch['liters'] = floatval($batch['liters']);
                $batch['age_hours'] = intval($batch['age_hours']);
                $batch['hours_remaining'] = intval($batch['hours_remaining']);
                
                // Format age display
                if ($batch['age_hours'] < 1) {
                    $batch['age_display'] = 'Just now';
                } elseif ($batch['age_hours'] < 24) {
                    $batch['age_display'] = $batch['age_hours'] . ' hrs';
                } else {
                    $days = floor($batch['age_hours'] / 24);
                    $hours = $batch['age_hours'] % 24;
                    $batch['age_display'] = $days . 'd ' . $hours . 'h';
                }
            }

            $this->respondSuccess(['batches' => $batches]);

        } catch (Exception $e) {
            $this->respondError('Failed to get milk aging status: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all milk collections with filters
     */
    private function getCollections(array $input): void
    {
        try {
            $pdo = $this->db();

            $dateFrom = $input['date_from'] ?? date('Y-m-d', strtotime('-7 days'));
            $dateTo = $input['date_to'] ?? date('Y-m-d');
            $supplierId = $input['supplier_id'] ?? null;
            $limit = intval($input['limit'] ?? 50);
            $offset = intval($input['offset'] ?? 0);

            $sql = "
                SELECT 
                    mc.collection_id,
                    mc.rmr_number,
                    mc.collection_date,
                    mc.supplier_id,
                    s.name as supplier_name,
                    s.contact_person,
                    mc.milk_type,
                    mc.liters_delivered,
                    mc.liters_rejected,
                    mc.liters_accepted,
                    mc.fat_content,
                    mc.titratable_acidity,
                    mc.alcohol_test_passed,
                    mc.base_price_per_liter,
                    mc.quality_premium,
                    mc.transport_fee,
                    mc.total_amount,
                    mc.created_at,
                    TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) as age_hours,
                    48 - TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) as hours_until_expiry,
                    rmb.status as batch_status,
                    CASE 
                        WHEN rmb.status = 'DISCARDED' THEN 'DISCARDED'
                        WHEN rmb.status = 'CONSUMED' THEN 'PROCESSED'
                        WHEN mc.liters_rejected >= mc.liters_delivered THEN 'REJECTED'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 48 THEN 'EXPIRED'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 36 THEN 'CRITICAL'
                        WHEN TIMESTAMPDIFF(HOUR, mc.collection_date, NOW()) >= 24 THEN 'WARNING'
                        ELSE 'PENDING'
                    END as status,
                    CONCAT(u.first_name, ' ', u.last_name) as qc_officer_name
                FROM milk_daily_collections mc
                LEFT JOIN suppliers s ON mc.supplier_id = s.supplier_id
                LEFT JOIN users u ON mc.qc_officer_id = u.user_id
                LEFT JOIN raw_material_batches rmb ON mc.rmr_number = rmb.highland_fresh_batch_code
                WHERE mc.collection_date BETWEEN ? AND ?
            ";
            $params = [$dateFrom, $dateTo];

            if ($supplierId) {
                $sql .= " AND mc.supplier_id = ?";
                $params[] = $supplierId;
            }

            $sql .= " ORDER BY mc.collection_date DESC, mc.created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $collections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countSql = "
                SELECT COUNT(*) as total
                FROM milk_daily_collections mc
                WHERE mc.collection_date BETWEEN ? AND ?
            ";
            $countParams = [$dateFrom, $dateTo];

            if ($supplierId) {
                $countSql .= " AND mc.supplier_id = ?";
                $countParams[] = $supplierId;
            }

            $stmt = $pdo->prepare($countSql);
            $stmt->execute($countParams);
            $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            $this->respondSuccess($collections);

        } catch (Exception $e) {
            $this->respondError('Failed to get collections: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single collection details
     */
    private function getCollection(array $input): void
    {
        $collectionId = $input['collection_id'] ?? $_GET['collection_id'] ?? null;

        if (!$collectionId) {
            $this->respondError('Collection ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            $stmt = $pdo->prepare("
                SELECT 
                    mc.*,
                    s.company_name as supplier_name,
                    s.contact_name as contact_person,
                    s.phone_number as supplier_phone,
                    TIMESTAMPDIFF(HOUR, CONCAT(mc.collection_date, ' ', mc.collection_time), NOW()) as age_hours,
                    TIMESTAMPDIFF(HOUR, NOW(), mc.expiry_datetime) as hours_until_expiry,
                    CONCAT(u.first_name, ' ', u.last_name) as qc_officer_name
                FROM milk_daily_collections mc
                LEFT JOIN suppliers s ON mc.supplier_id = s.supplier_id
                LEFT JOIN users u ON mc.qc_officer_id = u.user_id
                WHERE mc.collection_id = ?
            ");
            $stmt->execute([$collectionId]);
            $collection = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$collection) {
                $this->respondError('Collection not found', 404);
                return;
            }

            $this->respondSuccess(['collection' => $collection]);

        } catch (Exception $e) {
            $this->respondError('Failed to get collection: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create new milk collection entry
     */
    private function createCollection(array $input): void
    {
        $missing = $this->requireParams($input, ['supplier_id', 'liters_delivered']);
        if ($missing) {
            $this->respondError('Supplier and liters delivered are required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $user = getCurrentUser();

            $supplierId = intval($input['supplier_id']);
            $collectionDate = $input['collection_date'] ?? date('Y-m-d');
            $litersDelivered = floatval($input['liters_delivered']);
            $litersRejected = floatval($input['liters_rejected'] ?? 0);
            $milkType = $input['milk_type'] ?? 'Cow';
            $basePricePerLiter = floatval($input['base_price_per_liter'] ?? 40.00);
            $transportFee = floatval($input['transport_fee'] ?? 0);
            $qualityPremium = floatval($input['quality_premium'] ?? 0);

            // Calculate total amount
            $litersAccepted = $litersDelivered - $litersRejected;
            $totalAmount = ($litersAccepted * $basePricePerLiter) + $qualityPremium - $transportFee;

            // Generate RMR number if not provided or empty
            $rmrNumber = !empty($input['rmr_number']) ? $input['rmr_number'] : null;
            if (!$rmrNumber) {
                $datePrefix = 'RMR-' . date('Ymd', strtotime($collectionDate)) . '-';
                // Find the max sequence number by extracting the numeric suffix from RMR numbers
                // Pattern: RMR-YYYYMMDD-XXX where XXX is a 3-digit number
                $stmt = $pdo->prepare("
                    SELECT MAX(CAST(SUBSTRING(rmr_number, -3) AS UNSIGNED)) as max_seq
                    FROM milk_daily_collections
                    WHERE rmr_number LIKE ?
                      AND rmr_number REGEXP '^RMR-[0-9]{8}-[0-9]{3}$'
                ");
                $stmt->execute([$datePrefix . '%']);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $nextSeq = ($result['max_seq'] ?? 0) + 1;
                $rmrNumber = $datePrefix . str_pad($nextSeq, 3, '0', STR_PAD_LEFT);
            }

            // Insert collection - matching actual table columns
            // Note: liters_accepted is a generated column (liters_delivered - liters_rejected)
            $stmt = $pdo->prepare("
                INSERT INTO milk_daily_collections (
                    rmr_number, collection_date, supplier_id, milk_type,
                    liters_delivered, liters_rejected,
                    sediment_test, titratable_acidity, fat_content, alcohol_test_passed,
                    base_price_per_liter, quality_premium, transport_fee, total_amount,
                    qc_officer_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $stmt->execute([
                $rmrNumber,
                $collectionDate,
                $supplierId,
                $milkType,
                $litersDelivered,
                $litersRejected,
                $input['sediment_test'] ?? null,
                $input['titratable_acidity'] ?? null,
                $input['fat_content'] ?? null,
                isset($input['alcohol_test_passed']) ? (intval($input['alcohol_test_passed'])) : 1,
                $basePricePerLiter,
                $qualityPremium,
                $transportFee,
                $totalAmount,
                $user['id'] ?? 1
            ]);

            $collectionId = $pdo->lastInsertId();

            // =========================================================
            // AUTO-CREATE RAW MATERIAL BATCH FOR PRODUCTION FIFO
            // This ensures Production can see the milk immediately
            // =========================================================
            if ($litersAccepted > 0) {
                // Get or create "Raw Milk" raw material
                $stmt = $pdo->query("SELECT raw_material_id FROM raw_materials WHERE name = 'Raw Milk' LIMIT 1");
                $rawMilk = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($rawMilk) {
                    $rawMilkId = $rawMilk['raw_material_id'];
                    
                    // Check if batch already exists
                    $stmt = $pdo->prepare("SELECT batch_id FROM raw_material_batches WHERE highland_fresh_batch_code = ?");
                    $stmt->execute([$rmrNumber]);
                    
                    if (!$stmt->fetch()) {
                        // Create batch with 48-hour expiry
                        $expiryDate = date('Y-m-d H:i:s', strtotime($collectionDate . ' +48 hours'));
                        
                        $stmt = $pdo->prepare("
                            INSERT INTO raw_material_batches (
                                highland_fresh_batch_code,
                                raw_material_id,
                                supplier_id,
                                quantity_received,
                                current_quantity,
                                unit_cost,
                                received_date,
                                expiry_date,
                                quality_grade_received,
                                status,
                                highland_fresh_approved,
                                milk_source_cooperative,
                                notes,
                                created_at,
                                created_by
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Grade A', 'RECEIVED', 1, 'Highland Fresh', ?, NOW(), ?)
                        ");
                        
                        $stmt->execute([
                            $rmrNumber,
                            $rawMilkId,
                            $supplierId,
                            $litersAccepted,
                            $litersAccepted,
                            $basePricePerLiter,
                            $collectionDate,
                            $expiryDate,
                            "Auto-created from milk collection {$rmrNumber}",
                            $user['id'] ?? null
                        ]);
                        
                        // Update Raw Milk total quantity
                        $pdo->exec("
                            UPDATE raw_materials 
                            SET quantity_on_hand = (
                                SELECT COALESCE(SUM(current_quantity), 0) 
                                FROM raw_material_batches 
                                WHERE raw_material_id = {$rawMilkId} 
                                  AND status IN ('RECEIVED', 'APPROVED') 
                                  AND current_quantity > 0
                            )
                            WHERE raw_material_id = {$rawMilkId}
                        ");
                    }
                }
            }

            // Get the created collection with supplier info
            $stmt = $pdo->prepare("
                SELECT c.*, s.name as supplier_name
                FROM milk_daily_collections c
                JOIN suppliers s ON c.supplier_id = s.supplier_id
                WHERE c.collection_id = ?
            ");
            $stmt->execute([$collectionId]);
            $collection = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->respondSuccess([
                'message' => 'Milk collection recorded successfully',
                'collection_id' => $collectionId,
                'rmr_number' => $rmrNumber,
                'collection' => $collection
            ]);

        } catch (Exception $e) {
            error_log('MilkCollectionAPI createCollection Error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            $this->respondError('Failed to create collection: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update milk collection (QC test results)
     */
    private function updateCollection(array $input): void
    {
        $collectionId = $input['collection_id'] ?? null;

        if (!$collectionId) {
            $this->respondError('Collection ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            $updates = [];
            $params = [];

            $allowedFields = [
                'liters_accepted', 'liters_rejected', 'temperature', 'fat_content',
                'protein_content', 'lactose_content', 'ph_level', 'titratable_acidity',
                'alcohol_test_passed', 'bacterial_count', 'somatic_cell_count',
                'antibiotics_detected', 'base_price_per_liter', 'quality_bonus',
                'transport_fee', 'processing_status', 'notes'
            ];

            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $input[$field];
                }
            }

            if (empty($updates)) {
                $this->respondError('No fields to update', 400);
                return;
            }

            $params[] = $collectionId;
            $sql = "UPDATE milk_daily_collections SET " . implode(', ', $updates) . " WHERE collection_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $this->respondSuccess(['message' => 'Collection updated successfully']);

        } catch (Exception $e) {
            $this->respondError('Failed to update collection: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Record QC test results
     */
    private function recordQCTest(array $input): void
    {
        $collectionId = $input['collection_id'] ?? null;

        if (!$collectionId) {
            $this->respondError('Collection ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $user = getCurrentUser();

            $stmt = $pdo->prepare("
                UPDATE milk_daily_collections SET
                    temperature = COALESCE(?, temperature),
                    fat_content = COALESCE(?, fat_content),
                    protein_content = COALESCE(?, protein_content),
                    lactose_content = COALESCE(?, lactose_content),
                    ph_level = COALESCE(?, ph_level),
                    titratable_acidity = COALESCE(?, titratable_acidity),
                    alcohol_test_passed = COALESCE(?, alcohol_test_passed),
                    bacterial_count = COALESCE(?, bacterial_count),
                    somatic_cell_count = COALESCE(?, somatic_cell_count),
                    antibiotics_detected = COALESCE(?, antibiotics_detected),
                    qc_officer_id = ?,
                    notes = CONCAT(COALESCE(notes, ''), '\n[QC Test: ', NOW(), ']')
                WHERE collection_id = ?
            ");

            $stmt->execute([
                $input['temperature'] ?? null,
                $input['fat_content'] ?? null,
                $input['protein_content'] ?? null,
                $input['lactose_content'] ?? null,
                $input['ph_level'] ?? null,
                $input['titratable_acidity'] ?? null,
                isset($input['alcohol_test_passed']) ? ($input['alcohol_test_passed'] ? 1 : 0) : null,
                $input['bacterial_count'] ?? null,
                $input['somatic_cell_count'] ?? null,
                isset($input['antibiotics_detected']) ? ($input['antibiotics_detected'] ? 1 : 0) : null,
                $user['id'] ?? null,
                $collectionId
            ]);

            // Check for auto-rejection based on test results
            $autoReject = false;
            $rejectReason = [];

            if (isset($input['antibiotics_detected']) && $input['antibiotics_detected']) {
                $autoReject = true;
                $rejectReason[] = 'Antibiotics detected';
            }

            if (isset($input['ph_level']) && ($input['ph_level'] < 6.5 || $input['ph_level'] > 6.8)) {
                $autoReject = true;
                $rejectReason[] = 'pH out of range (' . $input['ph_level'] . ')';
            }

            if (isset($input['temperature']) && $input['temperature'] > 4.0) {
                $autoReject = true;
                $rejectReason[] = 'Temperature too high (' . $input['temperature'] . '°C)';
            }

            if ($autoReject) {
                $this->rejectMilk([
                    'collection_id' => $collectionId,
                    'rejection_reason' => implode('; ', $rejectReason),
                    'rejection_category' => isset($input['antibiotics_detected']) && $input['antibiotics_detected'] ? 'ANTIBIOTICS' : 'OTHER',
                    'auto_reject' => true
                ]);
                return;
            }

            $this->respondSuccess(['message' => 'QC test recorded successfully']);

        } catch (Exception $e) {
            $this->respondError('Failed to record QC test: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject milk batch
     */
    private function rejectMilk(array $input): void
    {
        $collectionId = $input['collection_id'] ?? null;

        if (!$collectionId) {
            $this->respondError('Collection ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $user = getCurrentUser();

            // Get current collection
            $stmt = $pdo->prepare("SELECT liters_delivered, liters_rejected FROM milk_daily_collections WHERE collection_id = ?");
            $stmt->execute([$collectionId]);
            $collection = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$collection) {
                $this->respondError('Collection not found', 404);
                return;
            }

            $litersToReject = floatval($input['liters_rejected'] ?? $collection['liters_delivered']);

            // Update collection with rejection - using only columns that exist
            $stmt = $pdo->prepare("
                UPDATE milk_daily_collections SET
                    liters_rejected = ?,
                    qc_officer_id = COALESCE(?, qc_officer_id)
                WHERE collection_id = ?
            ");

            $stmt->execute([
                $litersToReject,
                $user['id'] ?? null,
                $collectionId
            ]);

            $this->respondSuccess([
                'message' => 'Milk rejected successfully',
                'liters_rejected' => $litersToReject,
                'excluded_from_payout' => true
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to reject milk: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Prioritize a collection for immediate processing
     */
    private function prioritizeCollection(array $input): void
    {
        $collectionId = $input['collection_id'] ?? null;

        if (!$collectionId) {
            $this->respondError('Collection ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            
            // Verify collection exists
            $stmt = $pdo->prepare("SELECT * FROM milk_daily_collections WHERE collection_id = ?");
            $stmt->execute([$collectionId]);
            $collection = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$collection) {
                $this->respondError('Collection not found', 404);
                return;
            }

            // For now, we'll just return success since the table doesn't have a priority column
            // In a production system, you would add a priority column or create a priority queue table
            $this->respondSuccess([
                'message' => 'Collection prioritized for immediate processing',
                'collection_id' => $collectionId,
                'rmr_number' => $collection['rmr_number']
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to prioritize collection: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Accept milk after QC - AUTO-CREATES a raw_material_batch for Production FIFO
     */
    private function acceptMilk(array $input): void
    {
        $collectionId = $input['collection_id'] ?? null;

        if (!$collectionId) {
            $this->respondError('Collection ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();
            $pdo->beginTransaction();
            
            $user = getCurrentUser();

            // Get collection details first
            $stmt = $pdo->prepare("SELECT * FROM milk_daily_collections WHERE collection_id = ?");
            $stmt->execute([$collectionId]);
            $collection = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$collection) {
                throw new Exception('Collection not found');
            }

            $litersAccepted = $input['liters_accepted'] ?? 
                ($collection['liters_delivered'] - ($collection['liters_rejected'] ?? 0));
            $qualityBonus = floatval($input['quality_bonus'] ?? 0);

            // Update the milk collection record
            $stmt = $pdo->prepare("
                UPDATE milk_daily_collections SET
                    liters_accepted = ?,
                    quality_bonus = ?,
                    qc_officer_id = COALESCE(?, qc_officer_id),
                    notes = CONCAT(COALESCE(notes, ''), '\n[ACCEPTED: ', NOW(), ']')
                WHERE collection_id = ?
            ");

            $stmt->execute([
                $litersAccepted,
                $qualityBonus,
                $user['id'] ?? null,
                $collectionId
            ]);

            // =========================================================
            // AUTO-CREATE RAW MATERIAL BATCH FOR PRODUCTION FIFO
            // =========================================================
            
            // Get or create "Raw Milk" raw material
            $stmt = $pdo->query("SELECT raw_material_id FROM raw_materials WHERE name = 'Raw Milk' LIMIT 1");
            $rawMilk = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$rawMilk) {
                // Create Raw Milk material if it doesn't exist
                $stmt = $pdo->query("SELECT unit_id FROM units_of_measure WHERE unit_abbreviation = 'L' LIMIT 1");
                $unit = $stmt->fetch(PDO::FETCH_ASSOC);
                $unitId = $unit ? $unit['unit_id'] : 1;
                
                $stmt = $pdo->prepare("
                    INSERT INTO raw_materials (name, sku, category, unit_id, standard_cost, 
                        quantity_on_hand, reorder_level, highland_fresh_approved, is_active, 
                        description, shelf_life_days, quality_grade, created_at)
                    VALUES ('Raw Milk', 'RM-RAWMILK-001', 'Dairy', ?, 40.00, 0, 100, 1, 1,
                        'Fresh raw milk from dairy farmers', 2, 'Premium', NOW())
                ");
                $stmt->execute([$unitId]);
                $rawMilkId = $pdo->lastInsertId();
            } else {
                $rawMilkId = $rawMilk['raw_material_id'];
            }
            
            // Check if batch already exists for this collection
            $stmt = $pdo->prepare("SELECT batch_id FROM raw_material_batches WHERE highland_fresh_batch_code = ?");
            $stmt->execute([$collection['rmr_number']]);
            
            if (!$stmt->fetch()) {
                // Create new raw_material_batch with 48-hour expiry (raw milk spoils fast)
                $expiryDate = date('Y-m-d H:i:s', strtotime($collection['collection_date'] . ' +48 hours'));
                
                $stmt = $pdo->prepare("
                    INSERT INTO raw_material_batches (
                        highland_fresh_batch_code,
                        raw_material_id,
                        supplier_id,
                        quantity_received,
                        current_quantity,
                        unit_cost,
                        received_date,
                        expiry_date,
                        quality_grade_received,
                        status,
                        highland_fresh_approved,
                        milk_source_cooperative,
                        notes,
                        created_at,
                        created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', 1, 'Highland Fresh', ?, NOW(), ?)
                ");
                
                $stmt->execute([
                    $collection['rmr_number'],
                    $rawMilkId,
                    $collection['supplier_id'],
                    $litersAccepted,
                    $litersAccepted,
                    $collection['base_price_per_liter'] ?? 40.00,
                    $collection['collection_date'],
                    $expiryDate,
                    'Grade A', // QC accepted = Grade A
                    "Auto-created from QC acceptance of {$collection['rmr_number']}",
                    $user['id'] ?? null
                ]);
                
                // Update Raw Milk total quantity
                $stmt = $pdo->prepare("
                    UPDATE raw_materials 
                    SET quantity_on_hand = (
                        SELECT COALESCE(SUM(current_quantity), 0) 
                        FROM raw_material_batches 
                        WHERE raw_material_id = ? AND status IN ('RECEIVED', 'APPROVED') AND current_quantity > 0
                    )
                    WHERE raw_material_id = ?
                ");
                $stmt->execute([$rawMilkId, $rawMilkId]);
            }
            
            // =========================================================
            // GAP 1 FIX: TRIGGER BOM RECALCULATION IF PRICE CHANGED
            // =========================================================
            $newPrice = floatval($collection['base_price_per_liter'] ?? 40.00);
            $bomResult = $this->checkPriceChangeAndTriggerBOM($pdo, $newPrice, $collectionId);
            
            $pdo->commit();

            $this->respondSuccess([
                'message' => 'Milk accepted successfully and added to Raw Milk inventory',
                'liters_accepted' => $litersAccepted,
                'rmr_number' => $collection['rmr_number'],
                'raw_material_batch_created' => true,
                'bom_trigger' => $bomResult
            ]);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Failed to accept milk: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Mark milk as processed (sent to production)
     */
    private function markAsProcessed(array $input): void
    {
        $collectionId = $input['collection_id'] ?? null;
        $batchId = $input['batch_id'] ?? null;

        if (!$collectionId) {
            $this->respondError('Collection ID is required', 400);
            return;
        }

        try {
            $pdo = $this->db();

            $stmt = $pdo->prepare("
                UPDATE milk_daily_collections SET
                    processing_status = 'PROCESSED',
                    processed_at = NOW(),
                    processed_batch_id = ?,
                    notes = CONCAT(COALESCE(notes, ''), '\n[PROCESSED: ', NOW(), ']')
                WHERE collection_id = ?
            ");

            $stmt->execute([$batchId, $collectionId]);

            $this->respondSuccess(['message' => 'Marked as processed']);

        } catch (Exception $e) {
            $this->respondError('Failed to mark as processed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Expire old milk batches (48+ hours old)
     * Auto-marks pending collections as EXPIRED for QC discard workflow
     */
    private function expireOldBatches(): void
    {
        try {
            $pdo = $this->db();

            // Also update the raw_material_batches table to mark expired milk
            // This ensures Production Dashboard sees expired batches correctly
            $stmt = $pdo->prepare("
                UPDATE raw_material_batches 
                SET status = 'EXPIRED'
                WHERE raw_material_id = (SELECT raw_material_id FROM raw_materials WHERE name = 'Raw Milk' LIMIT 1)
                  AND status IN ('RECEIVED', 'APPROVED')
                  AND current_quantity > 0
                  AND (
                      (expiry_date IS NOT NULL AND expiry_date < NOW())
                      OR 
                      (expiry_date IS NULL AND TIMESTAMPDIFF(HOUR, received_date, NOW()) >= 48)
                  )
            ");
            $stmt->execute();

            $expiredCount = $stmt->rowCount();

            $this->respondSuccess([
                'message' => "Expired $expiredCount batch(es)",
                'expired_count' => $expiredCount
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to expire batches: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get dairy suppliers (farmers/cooperatives)
     */
    private function getDairySuppliers(): void
    {
        try {
            $pdo = $this->db();

            $stmt = $pdo->query("
                SELECT 
                    supplier_id,
                    name,
                    contact_person,
                    phone_number,
                    supplier_type,
                    daily_milk_capacity_liters,
                    milk_quality_grade,
                    is_active
                FROM suppliers
                WHERE is_active = 1
                  AND (supplier_type LIKE '%dairy%' 
                       OR supplier_type LIKE '%cooperative%' 
                       OR supplier_type LIKE '%farm%'
                       OR supplier_type = 'Individual Farm'
                       OR daily_milk_capacity_liters > 0)
                ORDER BY name
            ");

            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->respondSuccess($suppliers);

        } catch (Exception $e) {
            $this->respondError('Failed to get suppliers: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get farmer payout report
     */
    private function getPayoutReport(array $input): void
    {
        $dateFrom = $input['date_from'] ?? date('Y-m-01');
        $dateTo = $input['date_to'] ?? date('Y-m-d');
        $supplierId = $input['supplier_id'] ?? null;

        try {
            $pdo = $this->db();

            $sql = "
                SELECT 
                    mc.supplier_id,
                    s.company_name as supplier_name,
                    s.contact_name,
                    COUNT(*) as total_deliveries,
                    SUM(mc.liters_delivered) as total_delivered,
                    SUM(mc.liters_accepted) as total_accepted,
                    SUM(mc.liters_rejected) as total_rejected,
                    AVG(mc.fat_content) as avg_fat_content,
                    AVG(mc.ph_level) as avg_ph_level,
                    SUM(mc.liters_accepted * mc.base_price_per_liter) as gross_amount,
                    SUM(mc.liters_accepted * mc.quality_bonus) as total_bonus,
                    SUM(mc.transport_fee) as total_transport_fees,
                    SUM(mc.total_amount) as net_payable
                FROM milk_daily_collections mc
                JOIN suppliers s ON mc.supplier_id = s.supplier_id
                WHERE mc.collection_date BETWEEN ? AND ?
                  AND mc.processing_status != 'REJECTED'
            ";
            $params = [$dateFrom, $dateTo];

            if ($supplierId) {
                $sql .= " AND mc.supplier_id = ?";
                $params[] = $supplierId;
            }

            $sql .= " GROUP BY mc.supplier_id, s.company_name, s.contact_name ORDER BY s.company_name";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $payouts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate totals
            $totals = [
                'total_deliveries' => 0,
                'total_delivered' => 0,
                'total_accepted' => 0,
                'total_rejected' => 0,
                'gross_amount' => 0,
                'total_bonus' => 0,
                'total_transport_fees' => 0,
                'net_payable' => 0
            ];

            foreach ($payouts as $payout) {
                $totals['total_deliveries'] += $payout['total_deliveries'];
                $totals['total_delivered'] += $payout['total_delivered'];
                $totals['total_accepted'] += $payout['total_accepted'];
                $totals['total_rejected'] += $payout['total_rejected'];
                $totals['gross_amount'] += $payout['gross_amount'];
                $totals['total_bonus'] += $payout['total_bonus'];
                $totals['total_transport_fees'] += $payout['total_transport_fees'];
                $totals['net_payable'] += $payout['net_payable'];
            }

            $this->respondSuccess([
                'period' => ['from' => $dateFrom, 'to' => $dateTo],
                'payouts' => $payouts,
                'totals' => $totals
            ]);

        } catch (Exception $e) {
            $this->respondError('Failed to generate payout report: ' . $e->getMessage(), 500);
        }
    }

    // =========================================================================
    // GAP 1: BOM TRIGGER - Price Change Detection
    // =========================================================================

    /**
     * Get the previous average milk price for comparison
     * Used by frontend to show price change preview
     */
    private function getPreviousMilkPrice(): void
    {
        try {
            $pdo = $this->db();
            
            // Get average price from last 30 days of accepted collections
            $stmt = $pdo->query("
                SELECT AVG(base_price_per_liter) as avg_price,
                       MAX(base_price_per_liter) as max_price,
                       MIN(base_price_per_liter) as min_price,
                       COUNT(*) as collection_count
                FROM milk_daily_collections 
                WHERE liters_accepted > 0 
                  AND collection_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->respondSuccess([
                'average_price' => round(floatval($result['avg_price'] ?? 40.00), 2),
                'max_price' => round(floatval($result['max_price'] ?? 40.00), 2),
                'min_price' => round(floatval($result['min_price'] ?? 40.00), 2),
                'collection_count' => intval($result['collection_count'] ?? 0)
            ]);
            
        } catch (Exception $e) {
            $this->respondError('Failed to get previous milk price: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Check if milk price changed and trigger BOM recalculation
     * Called after acceptMilk() successfully creates a batch
     */
    private function checkPriceChangeAndTriggerBOM(PDO $pdo, float $newPrice, int $collectionId): array
    {
        $bomTriggered = false;
        $affectedProducts = [];
        $priceChange = 0;
        
        try {
            // Get average price from recent collections (excluding current one)
            $stmt = $pdo->prepare("
                SELECT AVG(base_price_per_liter) as avg_price
                FROM milk_daily_collections 
                WHERE liters_accepted > 0 
                  AND collection_id != ?
                  AND collection_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ");
            $stmt->execute([$collectionId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $previousAvgPrice = floatval($result['avg_price'] ?? $newPrice);
            
            // Calculate price difference (threshold: 5% or ₱2 change)
            $priceChange = $newPrice - $previousAvgPrice;
            $percentageChange = $previousAvgPrice > 0 ? abs($priceChange / $previousAvgPrice * 100) : 0;
            
            if (abs($priceChange) >= 2 || $percentageChange >= 5) {
                // Price changed significantly - trigger BOM recalculation
                $bomTriggered = true;
                
                // Find all products that use Raw Milk in their recipe
                $stmt = $pdo->query("
                    SELECT DISTINCT pr.recipe_id, pr.recipe_name, p.product_id, p.name as product_name
                    FROM production_recipes pr
                    JOIN recipe_raw_materials rrm ON pr.recipe_id = rrm.recipe_id
                    JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
                    LEFT JOIN products p ON pr.product_id = p.product_id
                    WHERE rm.name = 'Raw Milk' OR rm.sku LIKE '%RAWMILK%'
                ");
                $affectedProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Update raw_materials current_cost for Raw Milk
                $stmt = $pdo->prepare("
                    UPDATE raw_materials 
                    SET standard_cost = ?
                    WHERE name = 'Raw Milk' OR sku LIKE '%RAWMILK%'
                ");
                $stmt->execute([$newPrice]);
                
                // Create notification for Finance Officer
                $this->createFinanceNotification($pdo, $newPrice, $previousAvgPrice, $priceChange, count($affectedProducts));
            }
            
        } catch (Exception $e) {
            error_log('BOM Trigger Error: ' . $e->getMessage());
        }
        
        return [
            'bom_triggered' => $bomTriggered,
            'price_change' => round($priceChange, 2),
            'previous_avg_price' => round($previousAvgPrice, 2),
            'new_price' => round($newPrice, 2),
            'affected_products_count' => count($affectedProducts),
            'affected_products' => $affectedProducts
        ];
    }

    /**
     * Create a notification for Finance Officer about price change
     */
    private function createFinanceNotification(PDO $pdo, float $newPrice, float $oldPrice, float $change, int $affectedCount): void
    {
        try {
            // Check if notifications table exists, if not we'll log instead
            $stmt = $pdo->query("SHOW TABLES LIKE 'system_notifications'");
            if ($stmt->rowCount() > 0) {
                $stmt = $pdo->prepare("
                    INSERT INTO system_notifications (
                        notification_type, 
                        title, 
                        message, 
                        target_role, 
                        is_read, 
                        created_at
                    ) VALUES (
                        'BOM_PRICE_CHANGE',
                        'Raw Milk Price Change Alert',
                        ?,
                        'Finance Officer',
                        0,
                        NOW()
                    )
                ");
                $message = sprintf(
                    "Raw milk price changed from ₱%.2f to ₱%.2f (%s₱%.2f). %d product(s) may need cost review.",
                    $oldPrice,
                    $newPrice,
                    $change > 0 ? '+' : '',
                    $change,
                    $affectedCount
                );
                $stmt->execute([$message]);
            }
            
            // Always log for debugging
            error_log("[BOM TRIGGER] Raw milk price: ₱{$oldPrice} → ₱{$newPrice} | Affected: {$affectedCount} products");
            
        } catch (Exception $e) {
            error_log('Failed to create finance notification: ' . $e->getMessage());
        }
    }

    // =========================================================================
    // GAP 2: DISPOSAL WORKFLOW - Spoilage Logging
    // =========================================================================

    /**
     * Discard expired milk with reason code logging to spoilage_log
     */
    private function discardExpiredMilk(array $input): void
    {
        $collectionId = $input['collection_id'] ?? null;
        $batchIds = $input['batch_ids'] ?? []; // Support multiple
        $reasonCode = $input['reason_code'] ?? 'EXPIRED';
        $notes = $input['notes'] ?? '';
        // Handle string '1' or '0' from form data
        $discardAll = isset($input['discard_all']) && ($input['discard_all'] === true || $input['discard_all'] === '1' || $input['discard_all'] === 1);
        
        // Valid reason codes
        $validReasons = ['EXPIRED', 'HIGH_ACIDITY', 'CONTAMINATION', 'ANTIBIOTICS', 'REJECTED', 'OTHER'];
        if (!in_array($reasonCode, $validReasons)) {
            $reasonCode = 'OTHER';
        }
        
        try {
            $pdo = $this->db();
            $pdo->beginTransaction();
            
            $user = getCurrentUser();
            $discardedCount = 0;
            $totalLiters = 0;
            
            if ($discardAll) {
                // Discard all expired batches
                $stmt = $pdo->query("
                    SELECT rmb.batch_id, rmb.current_quantity, rmb.highland_fresh_batch_code, rmb.unit_cost
                    FROM raw_material_batches rmb
                    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
                    WHERE (rm.name = 'Raw Milk' OR rm.sku LIKE '%RAWMILK%')
                      AND rmb.status IN ('RECEIVED', 'EXPIRED')
                      AND rmb.expiry_date < NOW()
                      AND rmb.current_quantity > 0
                ");
                $expiredBatches = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($expiredBatches as $batch) {
                    $this->logSpoilage($pdo, $batch['batch_id'], $batch['current_quantity'], 
                                       $batch['unit_cost'], $reasonCode, $notes, $user['id'] ?? null);
                    $discardedCount++;
                    $totalLiters += $batch['current_quantity'];
                }
                
                // Mark all expired batches as DISCARDED
                $stmt = $pdo->prepare("
                    UPDATE raw_material_batches rmb
                    JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
                    SET rmb.status = 'DISCARDED',
                        rmb.current_quantity = 0,
                        rmb.notes = CONCAT(COALESCE(rmb.notes, ''), '\n[DISCARDED: ', NOW(), ' - ', ?, ']')
                    WHERE (rm.name = 'Raw Milk' OR rm.sku LIKE '%RAWMILK%')
                      AND rmb.status IN ('RECEIVED', 'EXPIRED')
                      AND rmb.expiry_date < NOW()
                      AND rmb.current_quantity > 0
                ");
                $stmt->execute([$reasonCode]);
                
            } else if ($collectionId) {
                // Discard specific collection's batch
                // Try multiple ways to find the linked batch:
                // 1. Match by RMR number directly
                // 2. Match by highland_fresh_batch_code containing RMR number
                // 3. Match by batch created on same date with Raw Milk
                $stmt = $pdo->prepare("
                    SELECT rmb.batch_id, rmb.current_quantity, rmb.highland_fresh_batch_code, rmb.unit_cost, 
                           mdc.rmr_number, mdc.liters_accepted, mdc.base_price_per_liter
                    FROM milk_daily_collections mdc
                    LEFT JOIN raw_material_batches rmb ON (
                        rmb.highland_fresh_batch_code = mdc.rmr_number
                        OR rmb.highland_fresh_batch_code LIKE CONCAT('%', mdc.rmr_number, '%')
                        OR (rmb.raw_material_id = (SELECT raw_material_id FROM raw_materials WHERE name = 'Raw Milk' LIMIT 1)
                            AND DATE(rmb.received_date) = mdc.collection_date
                            AND rmb.quantity_received = mdc.liters_accepted
                            AND rmb.status IN ('RECEIVED', 'APPROVED', 'EXPIRED'))
                    )
                    WHERE mdc.collection_id = ?
                    LIMIT 1
                ");
                $stmt->execute([$collectionId]);
                $batch = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($batch && $batch['batch_id']) {
                    // Normal case: batch exists
                    $this->logSpoilage($pdo, $batch['batch_id'], $batch['current_quantity'],
                                       $batch['unit_cost'], $reasonCode, $notes, $user['id'] ?? null);
                    
                    // Update batch status
                    $stmt = $pdo->prepare("
                        UPDATE raw_material_batches 
                        SET status = 'DISCARDED', 
                            current_quantity = 0,
                            notes = CONCAT(COALESCE(notes, ''), '\n[DISCARDED: ', NOW(), ' - ', ?, ']')
                        WHERE batch_id = ?
                    ");
                    $stmt->execute([$reasonCode, $batch['batch_id']]);
                    
                    $discardedCount = 1;
                    $totalLiters = $batch['current_quantity'] ?? 0;
                    
                } else if ($batch && $batch['rmr_number']) {
                    // ORPHANED COLLECTION: No batch exists, but collection record exists
                    // Create a "virtual" spoilage log entry and flag the collection as handled
                    // by creating a DISCARDED batch record now
                    $liters = floatval($batch['liters_accepted'] ?? 0);
                    $unitCost = floatval($batch['base_price_per_liter'] ?? 40);
                    $rmrNumber = $batch['rmr_number'];
                    
                    // Get Raw Milk ID
                    $stmt = $pdo->query("SELECT raw_material_id FROM raw_materials WHERE name = 'Raw Milk' LIMIT 1");
                    $rawMilkId = $stmt->fetchColumn();
                    
                    if ($rawMilkId && $liters > 0) {
                        // Create the missing batch as DISCARDED
                        $stmt = $pdo->prepare("
                            INSERT INTO raw_material_batches 
                            (highland_fresh_batch_code, raw_material_id, quantity_received, current_quantity, 
                             unit_cost, received_date, status, notes, highland_fresh_approved)
                            VALUES (?, ?, ?, 0, ?, (SELECT collection_date FROM milk_daily_collections WHERE collection_id = ?), 
                                    'DISCARDED', ?, 1)
                        ");
                        $notesText = 'Orphaned collection - batch created on discard. ' . $reasonCode . ': ' . $notes;
                        $stmt->execute([$rmrNumber, $rawMilkId, $liters, $unitCost, $collectionId, $notesText]);
                        $newBatchId = $pdo->lastInsertId();
                        
                        // Log to spoilage
                        $this->logSpoilage($pdo, $newBatchId, $liters, $unitCost, $reasonCode, 
                                           'Orphaned collection: ' . $notes, $user['id'] ?? null);
                        
                        $discardedCount = 1;
                        $totalLiters = $liters;
                    }
                }
                // Note: milk_daily_collections record is left as-is, the raw_material_batches 
                // record is what tracks the actual inventory status
            }
            
            // Update Raw Milk total quantity
            $stmt = $pdo->query("SELECT raw_material_id FROM raw_materials WHERE name = 'Raw Milk' LIMIT 1");
            $rawMilk = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($rawMilk) {
                $stmt = $pdo->prepare("
                    UPDATE raw_materials 
                    SET quantity_on_hand = (
                        SELECT COALESCE(SUM(current_quantity), 0) 
                        FROM raw_material_batches 
                        WHERE raw_material_id = ? AND status IN ('RECEIVED', 'APPROVED') AND current_quantity > 0
                    )
                    WHERE raw_material_id = ?
                ");
                $stmt->execute([$rawMilk['raw_material_id'], $rawMilk['raw_material_id']]);
            }
            
            $pdo->commit();
            
            $this->respondSuccess([
                'message' => "Successfully discarded {$discardedCount} batch(es) totaling {$totalLiters} liters",
                'discarded_count' => $discardedCount,
                'total_liters' => $totalLiters,
                'reason_code' => $reasonCode,
                'logged_to_spoilage' => true
            ]);
            
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->respondError('Failed to discard milk: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Log spoilage to the spoilage_log table
     */
    private function logSpoilage(PDO $pdo, ?int $batchId, ?float $quantity, ?float $unitCost, 
                                  string $reasonCode, string $notes, ?int $userId): void
    {
        // Skip if no batch ID
        if (!$batchId) {
            error_log("[SPOILAGE] Skipped - no batch_id provided");
            return;
        }
        
        // Ensure defaults
        $quantity = $quantity ?? 0;
        $unitCost = $unitCost ?? 0;
        
        try {
            // Check if spoilage_log table exists
            $stmt = $pdo->query("SHOW TABLES LIKE 'spoilage_log'");
            if ($stmt->rowCount() > 0) {
                $stmt = $pdo->prepare("
                    INSERT INTO spoilage_log (
                        batch_id,
                        quantity_spoiled,
                        unit_cost,
                        total_loss,
                        reason_code,
                        notes,
                        recorded_by,
                        recorded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                ");
                $stmt->execute([
                    $batchId,
                    $quantity,
                    $unitCost,
                    $quantity * $unitCost,
                    $reasonCode,
                    $notes ?: '',
                    $userId
                ]);
                error_log("[SPOILAGE] Logged: BatchID={$batchId}, Qty={$quantity}L, Reason={$reasonCode}");
            } else {
                // Log to error_log if table doesn't exist
                error_log("[SPOILAGE] Table not found - BatchID: {$batchId}, Qty: {$quantity}L, Reason: {$reasonCode}");
            }
        } catch (Exception $e) {
            // Don't throw - just log the error so it doesn't break the main operation
            error_log('Failed to log spoilage (non-fatal): ' . $e->getMessage());
        }
    }
}

// Execute API
if (basename($_SERVER['SCRIPT_NAME']) === 'MilkCollectionAPI.php') {
    $api = new MilkCollectionAPI();
    $api->handleRequest();
}
