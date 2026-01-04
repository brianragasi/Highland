<?php
/**
 * Highland Fresh Supplier Performance API
 * Server-side API for supplier performance monitoring and scorecard generation
 * 
 * Features:
 * - Supplier performance data collection
 * - Scorecard calculation and storage
 * - Performance trend analysis
 * - Alert generation and notification
 * - NMFDC member tracking
 * - Highland Fresh compliance monitoring
 * - Performance reporting and export
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

class SupplierPerformanceAPI {
    private $pdo;
    private $businessRules;

    public function __construct() {
        $this->pdo = DatabaseConnection::getInstance()->getConnection();
        $this->businessRules = getHighlandFreshBusinessRules();
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        try {
            switch ($action) {
                case 'getAllSuppliers':
                    return $this->getAllSuppliers();
                case 'getPerformanceMetrics':
                    return $this->getPerformanceMetrics();
                case 'getSupplierPerformanceData':
                    return $this->getSupplierPerformanceData();
                case 'getPerformanceTrends':
                    return $this->getPerformanceTrends();
                case 'saveScorecard':
                    return $this->saveScorecard();
                case 'getScorecard':
                    return $this->getScorecard();
                case 'generatePerformanceReport':
                    return $this->generatePerformanceReport();
                case 'exportPerformanceReport':
                    return $this->exportPerformanceReport();
                case 'updatePerformanceAlert':
                    return $this->updatePerformanceAlert();
                case 'getSupplierRankings':
                    return $this->getSupplierRankings();
                default:
                    throw new Exception('Unknown action: ' . $action);
            }
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), 500);
        }
    }

    // ============================================================================
    // SUPPLIER DATA MANAGEMENT
    // ============================================================================

    public function getAllSuppliers() {
        try {
            $sql = "
                SELECT 
                    s.*,
                    COUNT(po.order_id) as total_orders,
                    MAX(po.order_date) as last_order_date,
                    AVG(CASE WHEN po.delivery_date <= po.expected_delivery_date THEN 1 ELSE 0 END * 100) as on_time_delivery_rate
                FROM suppliers s
                LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id
                WHERE s.status = 'ACTIVE'
                GROUP BY s.supplier_id
                ORDER BY s.name
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->sendSuccess($suppliers);

        } catch (Exception $e) {
            return $this->sendError('Error fetching suppliers: ' . $e->getMessage());
        }
    }

    public function getPerformanceMetrics() {
        try {
            // Define Highland Fresh performance metrics structure
            $metrics = [
                'delivery' => [
                    'on_time_delivery_rate' => [
                        'name' => 'On-Time Delivery Rate',
                        'unit' => '%',
                        'target' => 95,
                        'weight' => 25
                    ],
                    'lead_time_consistency' => [
                        'name' => 'Lead Time Consistency',
                        'unit' => '%',
                        'target' => 90,
                        'weight' => 15
                    ],
                    'emergency_response_time' => [
                        'name' => 'Emergency Response Time',
                        'unit' => 'hours',
                        'target' => 24,
                        'weight' => 10
                    ]
                ],
                'quality' => [
                    'batch_compliance_rate' => [
                        'name' => 'Batch Compliance Rate',
                        'unit' => '%',
                        'target' => 95,
                        'weight' => 30
                    ],
                    'highland_fresh_approval_rate' => [
                        'name' => 'Highland Fresh Approval Rate',
                        'unit' => '%',
                        'target' => 98,
                        'weight' => 25
                    ],
                    'defect_rate' => [
                        'name' => 'Defect Rate',
                        'unit' => '%',
                        'target' => 2,
                        'weight' => 15
                    ]
                ],
                'consistency' => [
                    'material_quality_variance' => [
                        'name' => 'Material Quality Variance',
                        'unit' => '%',
                        'target' => 5,
                        'weight' => 20
                    ],
                    'pricing_variance' => [
                        'name' => 'Pricing Variance',
                        'unit' => '%',
                        'target' => 5,
                        'weight' => 10
                    ],
                    'packaging_consistency' => [
                        'name' => 'Packaging Consistency',
                        'unit' => '%',
                        'target' => 98,
                        'weight' => 10
                    ]
                ],
                'compliance' => [
                    'certification_compliance' => [
                        'name' => 'Certification Compliance',
                        'unit' => '%',
                        'target' => 100,
                        'weight' => 25
                    ],
                    'documentation_completeness' => [
                        'name' => 'Documentation Completeness',
                        'unit' => '%',
                        'target' => 98,
                        'weight' => 15
                    ],
                    'nmfdc_membership_status' => [
                        'name' => 'NMFDC Membership Status',
                        'unit' => 'status',
                        'target' => 'active',
                        'weight' => 20
                    ]
                ]
            ];

            return $this->sendSuccess($metrics);

        } catch (Exception $e) {
            return $this->sendError('Error fetching performance metrics: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // PERFORMANCE DATA COLLECTION
    // ============================================================================

    public function getSupplierPerformanceData() {
        try {
            $supplierId = $_GET['supplierId'] ?? null;
            $dateRange = $_GET['dateRange'] ?? 'last_30_days';

            if (!$supplierId) {
                throw new Exception('Supplier ID is required');
            }

            $dateFilter = $this->getDateRangeFilter($dateRange);

            $performanceData = [
                'delivery' => $this->getDeliveryPerformance($supplierId, $dateFilter),
                'quality' => $this->getQualityPerformance($supplierId, $dateFilter),
                'consistency' => $this->getConsistencyPerformance($supplierId, $dateFilter),
                'compliance' => $this->getCompliancePerformance($supplierId, $dateFilter)
            ];

            return $this->sendSuccess($performanceData);

        } catch (Exception $e) {
            return $this->sendError('Error fetching supplier performance data: ' . $e->getMessage());
        }
    }

    private function getDeliveryPerformance($supplierId, $dateFilter) {
        // On-time delivery rate
        $sql = "
            SELECT 
                COUNT(*) as total_deliveries,
                SUM(CASE WHEN delivery_date <= expected_delivery_date THEN 1 ELSE 0 END) as on_time_deliveries,
                AVG(DATEDIFF(delivery_date, order_date)) as avg_lead_time,
                STDDEV(DATEDIFF(delivery_date, order_date)) as lead_time_variance,
                AVG(CASE WHEN emergency_order = 1 THEN DATEDIFF(delivery_date, order_date) * 24 ELSE NULL END) as avg_emergency_response_hours
            FROM purchase_orders 
            WHERE supplier_id = ? 
                AND order_date BETWEEN ? AND ?
                AND status IN ('DELIVERED', 'COMPLETED')
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$supplierId, $dateFilter['start'], $dateFilter['end']]);
        $deliveryData = $stmt->fetch(PDO::FETCH_ASSOC);

        $onTimeRate = $deliveryData['total_deliveries'] > 0 ? 
            ($deliveryData['on_time_deliveries'] / $deliveryData['total_deliveries']) * 100 : 0;

        $leadTimeConsistency = $deliveryData['avg_lead_time'] > 0 ? 
            (1 - ($deliveryData['lead_time_variance'] / $deliveryData['avg_lead_time'])) * 100 : 0;

        return [
            'onTimeDeliveryRate' => round($onTimeRate, 2),
            'leadTimeConsistency' => round(max(0, $leadTimeConsistency), 2),
            'averageLeadTime' => round(floatval($deliveryData['avg_lead_time']), 1),
            'averageEmergencyResponse' => round(floatval($deliveryData['avg_emergency_response_hours']), 1),
            'totalDeliveries' => intval($deliveryData['total_deliveries'])
        ];
    }

    private function getQualityPerformance($supplierId, $dateFilter) {
        // Batch compliance and Highland Fresh approval rates
        $sql = "
            SELECT 
                COUNT(*) as total_batches,
                SUM(CASE WHEN highland_fresh_approved = 1 THEN 1 ELSE 0 END) as highland_fresh_approved_batches,
                SUM(CASE WHEN quality_test_passed = 1 THEN 1 ELSE 0 END) as quality_passed_batches,
                SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_batches
            FROM raw_material_batches rmb
            INNER JOIN purchase_orders po ON rmb.order_id = po.order_id
            WHERE po.supplier_id = ? 
                AND rmb.received_date BETWEEN ? AND ?
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$supplierId, $dateFilter['start'], $dateFilter['end']]);
        $qualityData = $stmt->fetch(PDO::FETCH_ASSOC);

        $totalBatches = intval($qualityData['total_batches']);
        $batchComplianceRate = $totalBatches > 0 ? 
            (intval($qualityData['quality_passed_batches']) / $totalBatches) * 100 : 0;

        $highlandFreshApprovalRate = $totalBatches > 0 ? 
            (intval($qualityData['highland_fresh_approved_batches']) / $totalBatches) * 100 : 0;

        $defectRate = $totalBatches > 0 ? 
            (intval($qualityData['rejected_batches']) / $totalBatches) * 100 : 0;

        return [
            'batchComplianceRate' => round($batchComplianceRate, 2),
            'highlandFreshApprovalRate' => round($highlandFreshApprovalRate, 2),
            'defectRate' => round($defectRate, 2),
            'totalBatches' => $totalBatches,
            'qualityPassedBatches' => intval($qualityData['quality_passed_batches']),
            'rejectedBatches' => intval($qualityData['rejected_batches'])
        ];
    }

    private function getConsistencyPerformance($supplierId, $dateFilter) {
        // Material quality variance, pricing consistency, packaging issues
        $sql = "
            SELECT 
                AVG(poi.unit_cost) as avg_unit_cost,
                STDDEV(poi.unit_cost) as unit_cost_variance,
                COUNT(DISTINCT rmb.quality_grade_received) as quality_grade_variance,
                COUNT(*) as total_items,
                SUM(CASE WHEN packaging_issues = 1 THEN 1 ELSE 0 END) as packaging_issues
            FROM purchase_order_items poi
            INNER JOIN purchase_orders po ON poi.order_id = po.order_id
            LEFT JOIN raw_material_batches rmb ON po.order_id = rmb.order_id AND poi.product_id = rmb.raw_material_id
            WHERE po.supplier_id = ? 
                AND po.order_date BETWEEN ? AND ?
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$supplierId, $dateFilter['start'], $dateFilter['end']]);
        $consistencyData = $stmt->fetch(PDO::FETCH_ASSOC);

        $avgCost = floatval($consistencyData['avg_unit_cost']);
        $pricingConsistency = $avgCost > 0 ? 
            (1 - (floatval($consistencyData['unit_cost_variance']) / $avgCost)) * 100 : 100;

        $materialQualityConsistency = intval($consistencyData['quality_grade_variance']) <= 2 ? 95 : 
            (intval($consistencyData['quality_grade_variance']) <= 3 ? 85 : 75);

        $totalItems = intval($consistencyData['total_items']);
        $packagingConsistency = $totalItems > 0 ? 
            (1 - (intval($consistencyData['packaging_issues']) / $totalItems)) * 100 : 100;

        return [
            'materialQualityConsistency' => round($materialQualityConsistency, 2),
            'pricingConsistency' => round(max(0, $pricingConsistency), 2),
            'packagingConsistency' => round($packagingConsistency, 2),
            'averageUnitCost' => round($avgCost, 2),
            'priceVariance' => round(floatval($consistencyData['unit_cost_variance']), 2),
            'qualityGradeVariance' => intval($consistencyData['quality_grade_variance'])
        ];
    }

    private function getCompliancePerformance($supplierId, $dateFilter) {
        // Certification status, documentation, NMFDC membership
        $sql = "
            SELECT 
                s.is_nmfdc_member,
                s.certification_status,
                s.nmfdc_membership_status,
                COUNT(po.order_id) as total_orders,
                SUM(CASE WHEN po.documentation_complete = 1 THEN 1 ELSE 0 END) as complete_documentation_orders
            FROM suppliers s
            LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id 
                AND po.order_date BETWEEN ? AND ?
            WHERE s.supplier_id = ?
            GROUP BY s.supplier_id
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateFilter['start'], $dateFilter['end'], $supplierId]);
        $complianceData = $stmt->fetch(PDO::FETCH_ASSOC);

        // Certification compliance (simplified - would be more complex in production)
        $certificationCompliance = $complianceData['certification_status'] === 'CURRENT' ? 100 : 
            ($complianceData['certification_status'] === 'EXPIRING' ? 85 : 50);

        // Documentation compliance
        $totalOrders = intval($complianceData['total_orders']);
        $documentationCompliance = $totalOrders > 0 ? 
            (intval($complianceData['complete_documentation_orders']) / $totalOrders) * 100 : 100;

        // NMFDC membership standing
        $nmfdcStanding = 'good'; // Would be calculated based on actual criteria
        if (intval($complianceData['is_nmfdc_member']) === 1) {
            $nmfdcStanding = $complianceData['nmfdc_membership_status'] ?? 'good';
        }

        return [
            'certificationCompliance' => round($certificationCompliance, 2),
            'documentationCompliance' => round($documentationCompliance, 2),
            'nmfdcMember' => intval($complianceData['is_nmfdc_member']) === 1,
            'nmfdcStanding' => $nmfdcStanding,
            'overallCompliance' => round(($certificationCompliance + $documentationCompliance) / 2, 2)
        ];
    }

    // ============================================================================
    // PERFORMANCE TRENDS
    // ============================================================================

    public function getPerformanceTrends() {
        try {
            $supplierId = $_GET['supplierId'] ?? null;

            if (!$supplierId) {
                throw new Exception('Supplier ID is required');
            }

            // Calculate trends for different time periods
            $trends = [
                'thirtyDay' => $this->calculatePeriodScore($supplierId, 30),
                'ninetyDay' => $this->calculatePeriodScore($supplierId, 90),
                'yearToDate' => $this->calculateYearToDateScore($supplierId)
            ];

            return $this->sendSuccess($trends);

        } catch (Exception $e) {
            return $this->sendError('Error calculating performance trends: ' . $e->getMessage());
        }
    }

    private function calculatePeriodScore($supplierId, $days) {
        $dateFilter = $this->getDateRangeFilter("last_{$days}_days");
        
        // Get simplified performance score for the period
        $sql = "
            SELECT 
                AVG(CASE WHEN po.delivery_date <= po.expected_delivery_date THEN 100 ELSE 0 END) as delivery_score,
                AVG(CASE WHEN rmb.highland_fresh_approved = 1 THEN 100 ELSE 0 END) as quality_score
            FROM purchase_orders po
            LEFT JOIN raw_material_batches rmb ON po.order_id = rmb.order_id
            WHERE po.supplier_id = ? 
                AND po.order_date BETWEEN ? AND ?
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$supplierId, $dateFilter['start'], $dateFilter['end']]);
        $scores = $stmt->fetch(PDO::FETCH_ASSOC);

        $deliveryScore = floatval($scores['delivery_score'] ?? 0);
        $qualityScore = floatval($scores['quality_score'] ?? 0);

        // Weighted average (quality weighted higher)
        return round(($deliveryScore * 0.4 + $qualityScore * 0.6), 1);
    }

    private function calculateYearToDateScore($supplierId) {
        $yearStart = date('Y-01-01');
        $today = date('Y-m-d');

        $sql = "
            SELECT 
                AVG(CASE WHEN po.delivery_date <= po.expected_delivery_date THEN 100 ELSE 0 END) as delivery_score,
                AVG(CASE WHEN rmb.highland_fresh_approved = 1 THEN 100 ELSE 0 END) as quality_score
            FROM purchase_orders po
            LEFT JOIN raw_material_batches rmb ON po.order_id = rmb.order_id
            WHERE po.supplier_id = ? 
                AND po.order_date BETWEEN ? AND ?
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$supplierId, $yearStart, $today]);
        $scores = $stmt->fetch(PDO::FETCH_ASSOC);

        $deliveryScore = floatval($scores['delivery_score'] ?? 0);
        $qualityScore = floatval($scores['quality_score'] ?? 0);

        return round(($deliveryScore * 0.4 + $qualityScore * 0.6), 1);
    }

    // ============================================================================
    // SCORECARD MANAGEMENT
    // ============================================================================

    public function saveScorecard() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $sql = "
                INSERT INTO supplier_scorecards (
                    supplier_id, scorecard_data, overall_score, performance_grade,
                    created_date, valid_until, highland_fresh_context
                ) VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 1)
                ON DUPLICATE KEY UPDATE
                    scorecard_data = VALUES(scorecard_data),
                    overall_score = VALUES(overall_score),
                    performance_grade = VALUES(performance_grade),
                    updated_date = NOW()
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['supplierId'],
                json_encode($input['scorecardData']),
                $input['overallScore'],
                $input['performanceGrade']
            ]);

            return $this->sendSuccess(['message' => 'Scorecard saved successfully']);

        } catch (Exception $e) {
            return $this->sendError('Error saving scorecard: ' . $e->getMessage());
        }
    }

    public function getScorecard() {
        try {
            $supplierId = $_GET['supplierId'] ?? null;

            if (!$supplierId) {
                throw new Exception('Supplier ID is required');
            }

            $sql = "
                SELECT * FROM supplier_scorecards 
                WHERE supplier_id = ? 
                ORDER BY created_date DESC 
                LIMIT 1
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$supplierId]);
            $scorecard = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($scorecard) {
                $scorecard['scorecard_data'] = json_decode($scorecard['scorecard_data'], true);
            }

            return $this->sendSuccess($scorecard);

        } catch (Exception $e) {
            return $this->sendError('Error retrieving scorecard: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // SUPPLIER RANKINGS
    // ============================================================================

    public function getSupplierRankings() {
        try {
            $sql = "
                SELECT 
                    s.supplier_id,
                    s.name as supplier_name,
                    s.supplier_type,
                    s.is_nmfdc_member,
                    sc.overall_score,
                    sc.performance_grade,
                    sc.created_date as scorecard_date,
                    RANK() OVER (ORDER BY sc.overall_score DESC) as ranking
                FROM suppliers s
                INNER JOIN supplier_scorecards sc ON s.supplier_id = sc.supplier_id
                WHERE s.status = 'ACTIVE'
                    AND sc.created_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY sc.overall_score DESC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $rankings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->sendSuccess($rankings);

        } catch (Exception $e) {
            return $this->sendError('Error fetching supplier rankings: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // PERFORMANCE REPORTING
    // ============================================================================

    public function generatePerformanceReport() {
        try {
            $reportType = $_GET['type'] ?? 'summary';
            $dateRange = $_GET['dateRange'] ?? 'last_30_days';

            switch ($reportType) {
                case 'summary':
                    $report = $this->generateSummaryReport($dateRange);
                    break;
                case 'detailed':
                    $report = $this->generateDetailedReport($dateRange);
                    break;
                case 'nmfdc':
                    $report = $this->generateNMFDCReport($dateRange);
                    break;
                default:
                    throw new Exception('Unknown report type: ' . $reportType);
            }

            return $this->sendSuccess($report);

        } catch (Exception $e) {
            return $this->sendError('Error generating performance report: ' . $e->getMessage());
        }
    }

    private function generateSummaryReport($dateRange) {
        $dateFilter = $this->getDateRangeFilter($dateRange);

        $sql = "
            SELECT 
                COUNT(DISTINCT s.supplier_id) as total_suppliers,
                COUNT(DISTINCT CASE WHEN s.is_nmfdc_member = 1 THEN s.supplier_id END) as nmfdc_suppliers,
                AVG(sc.overall_score) as avg_performance_score,
                COUNT(CASE WHEN sc.overall_score >= 90 THEN 1 END) as high_performers,
                COUNT(CASE WHEN sc.overall_score < 70 THEN 1 END) as underperformers
            FROM suppliers s
            LEFT JOIN supplier_scorecards sc ON s.supplier_id = sc.supplier_id
            WHERE s.status = 'ACTIVE'
                AND (sc.created_date IS NULL OR sc.created_date BETWEEN ? AND ?)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateFilter['start'], $dateFilter['end']]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'summary' => $summary,
            'period' => $dateRange,
            'generated_date' => date('Y-m-d H:i:s')
        ];
    }

    // ============================================================================
    // EXPORT FUNCTIONALITY
    // ============================================================================

    public function exportPerformanceReport() {
        $format = $_GET['format'] ?? 'csv';

        try {
            $sql = "
                SELECT 
                    s.name as supplier_name,
                    s.supplier_type,
                    s.is_nmfdc_member,
                    sc.overall_score,
                    sc.performance_grade,
                    sc.created_date
                FROM suppliers s
                LEFT JOIN supplier_scorecards sc ON s.supplier_id = sc.supplier_id
                WHERE s.status = 'ACTIVE'
                ORDER BY sc.overall_score DESC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($format === 'csv') {
                $this->exportToCSV($data, 'highland-fresh-supplier-performance');
            }

        } catch (Exception $e) {
            return $this->sendError('Export failed: ' . $e->getMessage());
        }
    }

    private function exportToCSV($data, $filename) {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '-' . date('Y-m-d') . '.csv"');

        $output = fopen('php://output', 'w');
        
        if (!empty($data)) {
            // Write headers
            fputcsv($output, array_keys($data[0]));
            
            // Write data
            foreach ($data as $row) {
                fputcsv($output, $row);
            }
        }
        
        fclose($output);
        exit();
    }

    // ============================================================================
    // ALERT MANAGEMENT
    // ============================================================================

    public function updatePerformanceAlert() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $sql = "
                INSERT INTO supplier_performance_alerts (
                    supplier_id, alert_type, severity, alert_data,
                    created_date, status, highland_fresh_context
                ) VALUES (?, ?, ?, ?, NOW(), 'ACTIVE', 1)
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['supplierId'],
                $input['alertType'],
                $input['severity'],
                json_encode($input['alertData'])
            ]);

            return $this->sendSuccess(['message' => 'Performance alert updated successfully']);

        } catch (Exception $e) {
            return $this->sendError('Error updating performance alert: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    private function getDateRangeFilter($range) {
        switch ($range) {
            case 'last_7_days':
                return [
                    'start' => date('Y-m-d', strtotime('-7 days')),
                    'end' => date('Y-m-d')
                ];
            case 'last_30_days':
                return [
                    'start' => date('Y-m-d', strtotime('-30 days')),
                    'end' => date('Y-m-d')
                ];
            case 'last_90_days':
                return [
                    'start' => date('Y-m-d', strtotime('-90 days')),
                    'end' => date('Y-m-d')
                ];
            case 'year_to_date':
                return [
                    'start' => date('Y-01-01'),
                    'end' => date('Y-m-d')
                ];
            default:
                return [
                    'start' => $_GET['startDate'] ?? date('Y-m-d', strtotime('-30 days')),
                    'end' => $_GET['endDate'] ?? date('Y-m-d')
                ];
        }
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
$api = new SupplierPerformanceAPI();
echo $api->handleRequest();
?>
