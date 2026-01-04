<?php
/**
 * Highland Fresh Purchase Order Reports API
 * Server-side API for comprehensive purchase order reporting
 * 
 * Features:
 * - Overview dashboard data
 * - Raw materials reporting
 * - Supplier performance metrics
 * - Highland Fresh compliance reporting
 * - Production usage analytics
 * - Financial analysis and cost trends
 * - Export functionality (CSV, PDF)
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'DatabaseConnection.php';
require_once 'highland-fresh-business-rules.php';

class PurchaseOrderReportsAPI {
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
                case 'getOverviewReport':
                    return $this->getOverviewReport();
                case 'getMaterialsReport':
                    return $this->getMaterialsReport();
                case 'getSuppliersReport':
                    return $this->getSuppliersReport();
                case 'getComplianceReport':
                    return $this->getComplianceReport();
                case 'getProductionReport':
                    return $this->getProductionReport();
                case 'getFinancialReport':
                    return $this->getFinancialReport();
                case 'exportMaterialsReport':
                    return $this->exportMaterialsReport();
                default:
                    throw new Exception('Unknown action: ' . $action);
            }
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), 500);
        }
    }

    // ============================================================================
    // OVERVIEW REPORT
    // ============================================================================

    public function getOverviewReport() {
        try {
            $filters = $this->getFilters();
            $dateRange = $this->getDateRange($filters['dateRange']);

            $overview = [
                'totalPurchases' => $this->getTotalPurchases($dateRange),
                'totalValue' => $this->getTotalValue($dateRange),
                'complianceRate' => $this->getComplianceRate($dateRange),
                'compliantBatches' => $this->getCompliantBatches($dateRange),
                'totalBatches' => $this->getTotalBatches($dateRange),
                'activeSuppliers' => $this->getActiveSuppliers($dateRange),
                'nmfdcMembers' => $this->getNMFDCMembers($dateRange),
                'materialCategories' => $this->getMaterialCategories($dateRange),
                'totalMaterials' => $this->getTotalMaterials($dateRange),
                'purchaseTrends' => $this->getPurchaseTrends($dateRange),
                'topSuppliers' => $this->getTopSuppliers($dateRange),
                'materialDistribution' => $this->getMaterialDistribution($dateRange),
                'qualityAlerts' => $this->getQualityAlerts($dateRange)
            ];

            return $this->sendSuccess($overview);

        } catch (Exception $e) {
            return $this->sendError('Error generating overview report: ' . $e->getMessage());
        }
    }

    private function getTotalPurchases($dateRange) {
        $sql = "
            SELECT COUNT(*) as total_purchases
            FROM purchase_orders po
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return intval($result['total_purchases']);
    }

    private function getTotalValue($dateRange) {
        $sql = "
            SELECT COALESCE(SUM(po.total_amount), 0) as total_value
            FROM purchase_orders po
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return floatval($result['total_value']);
    }

    private function getComplianceRate($dateRange) {
        $sql = "
            SELECT 
                COUNT(*) as total_batches,
                SUM(CASE WHEN highland_fresh_approved = 1 THEN 1 ELSE 0 END) as compliant_batches
            FROM raw_material_batches rmb
            WHERE rmb.received_date BETWEEN ? AND ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $total = intval($result['total_batches']);
        $compliant = intval($result['compliant_batches']);
        
        return $total > 0 ? round(($compliant / $total) * 100, 1) : 0;
    }

    private function getPurchaseTrends($dateRange) {
        $sql = "
            SELECT 
                DATE(po.order_date) as order_date,
                COUNT(*) as order_count,
                SUM(po.total_amount) as total_value
            FROM purchase_orders po
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
            GROUP BY DATE(po.order_date)
            ORDER BY order_date
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'dates' => array_column($trends, 'order_date'),
            'values' => array_map('floatval', array_column($trends, 'total_value')),
            'counts' => array_map('intval', array_column($trends, 'order_count'))
        ];
    }

    private function getTopSuppliers($dateRange) {
        $sql = "
            SELECT 
                s.name as supplier_name,
                s.supplier_type,
                s.is_nmfdc_member,
                COUNT(po.order_id) as order_count,
                SUM(po.total_amount) as total_value,
                AVG(CASE WHEN rmb.highland_fresh_approved = 1 THEN 100 ELSE 0 END) as compliance_rate
            FROM suppliers s
            INNER JOIN purchase_orders po ON s.supplier_id = po.supplier_id
            LEFT JOIN raw_material_batches rmb ON po.order_id = rmb.order_id
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
            GROUP BY s.supplier_id
            ORDER BY total_value DESC
            LIMIT 10
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================================
    // MATERIALS REPORT
    // ============================================================================

    public function getMaterialsReport() {
        try {
            $filters = $this->getFilters();
            $dateRange = $this->getDateRange($filters['dateRange']);

            $report = [
                'summary' => $this->getMaterialsSummary($dateRange, $filters),
                'materials' => $this->getMaterialsData($dateRange, $filters),
                'costTrends' => $this->getMaterialCostTrends($dateRange, $filters),
                'qualityAnalysis' => $this->getMaterialQualityAnalysis($dateRange, $filters)
            ];

            return $this->sendSuccess($report);

        } catch (Exception $e) {
            return $this->sendError('Error generating materials report: ' . $e->getMessage());
        }
    }

    private function getMaterialsSummary($dateRange, $filters) {
        $sql = "
            SELECT 
                COUNT(DISTINCT rm.category) as total_categories,
                SUM(poi.quantity * poi.unit_cost) as total_spend,
                AVG(DATEDIFF(po.delivery_date, po.order_date)) as average_lead_time,
                AVG(CASE WHEN rmb.quality_test_passed = 1 THEN 100 ELSE 0 END) as quality_pass_rate
            FROM raw_materials rm
            INNER JOIN purchase_order_items poi ON rm.raw_material_id = poi.product_id
            INNER JOIN purchase_orders po ON poi.order_id = po.order_id
            LEFT JOIN raw_material_batches rmb ON poi.order_id = rmb.order_id AND poi.product_id = rmb.raw_material_id
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
        ";
        
        if ($filters['materialCategory'] !== 'all') {
            $sql .= " AND rm.category = ?";
        }
        
        $params = [$dateRange['start'], $dateRange['end']];
        if ($filters['materialCategory'] !== 'all') {
            $params[] = $filters['materialCategory'];
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'totalCategories' => intval($summary['total_categories'] ?? 0),
            'totalSpend' => floatval($summary['total_spend'] ?? 0),
            'averageLeadTime' => round(floatval($summary['average_lead_time'] ?? 0), 1),
            'qualityPassRate' => round(floatval($summary['quality_pass_rate'] ?? 0), 1)
        ];
    }

    private function getMaterialsData($dateRange, $filters) {
        $sql = "
            SELECT 
                rm.raw_material_id,
                rm.name as material_name,
                rm.category,
                SUM(poi.quantity) as total_quantity,
                SUM(poi.quantity * poi.unit_cost) as total_cost,
                AVG(poi.unit_cost) as avg_unit_cost,
                s.name as primary_supplier,
                AVG(CASE WHEN rmb.quality_test_passed = 1 THEN 100 ELSE 0 END) as quality_rate,
                AVG(CASE WHEN rmb.highland_fresh_approved = 1 THEN 1 ELSE 0 END) as highland_fresh_approved_rate,
                u.unit_name
            FROM raw_materials rm
            INNER JOIN purchase_order_items poi ON rm.raw_material_id = poi.product_id
            INNER JOIN purchase_orders po ON poi.order_id = po.order_id
            INNER JOIN suppliers s ON po.supplier_id = s.supplier_id
            LEFT JOIN raw_material_batches rmb ON poi.order_id = rmb.order_id AND poi.product_id = rmb.raw_material_id
            LEFT JOIN units u ON rm.unit_id = u.unit_id
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
        ";
        
        $params = [$dateRange['start'], $dateRange['end']];
        
        if ($filters['materialCategory'] !== 'all') {
            $sql .= " AND rm.category = ?";
            $params[] = $filters['materialCategory'];
        }
        
        if ($filters['supplierType'] !== 'all') {
            $sql .= " AND s.supplier_type = ?";
            $params[] = $filters['supplierType'];
        }
        
        $sql .= "
            GROUP BY rm.raw_material_id, s.supplier_id
            ORDER BY total_cost DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================================
    // SUPPLIERS REPORT
    // ============================================================================

    public function getSuppliersReport() {
        try {
            $filters = $this->getFilters();
            $dateRange = $this->getDateRange($filters['dateRange']);

            $report = [
                'suppliers' => $this->getSuppliersData($dateRange, $filters),
                'deliveryTrends' => $this->getDeliveryTrends($dateRange, $filters),
                'qualityTrends' => $this->getQualityTrends($dateRange, $filters)
            ];

            return $this->sendSuccess($report);

        } catch (Exception $e) {
            return $this->sendError('Error generating suppliers report: ' . $e->getMessage());
        }
    }

    private function getSuppliersData($dateRange, $filters) {
        $sql = "
            SELECT 
                s.supplier_id,
                s.name as supplier_name,
                s.supplier_type,
                s.is_nmfdc_member,
                COUNT(po.order_id) as total_orders,
                SUM(po.total_amount) as total_value,
                AVG(CASE 
                    WHEN po.delivery_date <= po.expected_delivery_date THEN 100 
                    ELSE GREATEST(0, 100 - (DATEDIFF(po.delivery_date, po.expected_delivery_date) * 10))
                END) as delivery_performance,
                AVG(CASE WHEN rmb.quality_test_passed = 1 THEN 100 ELSE 0 END) as quality_score,
                AVG(CASE WHEN rmb.highland_fresh_approved = 1 THEN 100 ELSE 0 END) as compliance_rate,
                MAX(po.order_date) as last_order_date,
                s.status
            FROM suppliers s
            INNER JOIN purchase_orders po ON s.supplier_id = po.supplier_id
            LEFT JOIN raw_material_batches rmb ON po.order_id = rmb.order_id
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
        ";
        
        $params = [$dateRange['start'], $dateRange['end']];
        
        if ($filters['supplierType'] !== 'all') {
            $sql .= " AND s.supplier_type = ?";
            $params[] = $filters['supplierType'];
        }
        
        $sql .= "
            GROUP BY s.supplier_id
            ORDER BY total_value DESC
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ============================================================================
    // COMPLIANCE REPORT
    // ============================================================================

    public function getComplianceReport() {
        try {
            $filters = $this->getFilters();
            $dateRange = $this->getDateRange($filters['dateRange']);

            $report = [
                'overview' => $this->getComplianceOverview($dateRange),
                'businessRules' => $this->getBusinessRulesCompliance($dateRange),
                'issues' => $this->getNonComplianceIssues($dateRange),
                'trends' => $this->getComplianceTrends($dateRange),
                'actionItems' => $this->getPriorityActionItems($dateRange)
            ];

            return $this->sendSuccess($report);

        } catch (Exception $e) {
            return $this->sendError('Error generating compliance report: ' . $e->getMessage());
        }
    }

    private function getComplianceOverview($dateRange) {
        $sql = "
            SELECT 
                AVG(CASE WHEN rmb.highland_fresh_approved = 1 THEN 100 ELSE 0 END) as overall_rate,
                AVG(CASE WHEN rm.highland_fresh_approved = 1 THEN 100 ELSE 0 END) as material_compliance,
                AVG(CASE WHEN s.highland_fresh_approved = 1 THEN 100 ELSE 0 END) as supplier_compliance,
                AVG(CASE WHEN rmb.quality_test_passed = 1 THEN 100 ELSE 0 END) as quality_compliance,
                AVG(CASE WHEN tl.compliance_status = 'COMPLIANT' THEN 100 ELSE 0 END) as temperature_compliance,
                AVG(CASE WHEN rmb.highland_fresh_batch_code IS NOT NULL THEN 100 ELSE 0 END) as traceability_compliance
            FROM raw_material_batches rmb
            LEFT JOIN raw_materials rm ON rmb.raw_material_id = rm.raw_material_id
            LEFT JOIN suppliers s ON rmb.supplier_id = s.supplier_id
            LEFT JOIN raw_material_temperature_log tl ON rmb.raw_material_id = tl.raw_material_id
            WHERE rmb.received_date BETWEEN ? AND ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'overallRate' => round(floatval($result['overall_rate'] ?? 0), 1),
            'materialCompliance' => round(floatval($result['material_compliance'] ?? 0), 1),
            'supplierCompliance' => round(floatval($result['supplier_compliance'] ?? 0), 1),
            'qualityCompliance' => round(floatval($result['quality_compliance'] ?? 0), 1),
            'temperatureCompliance' => round(floatval($result['temperature_compliance'] ?? 0), 1),
            'traceabilityCompliance' => round(floatval($result['traceability_compliance'] ?? 0), 1)
        ];
    }

    private function getBusinessRulesCompliance($dateRange) {
        // Evaluate each Highland Fresh business rule
        $rules = [];
        
        // Rule 1: Highland Fresh products should not be purchased
        $sql = "
            SELECT COUNT(*) as violations
            FROM purchase_order_items poi
            INNER JOIN products p ON poi.product_id = p.product_id
            INNER JOIN purchase_orders po ON poi.order_id = po.order_id
            WHERE po.order_date BETWEEN ? AND ?
                AND p.brand = 'Highland Fresh'
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        $violations = $stmt->fetch(PDO::FETCH_ASSOC)['violations'];
        
        $rules[] = [
            'rule_name' => 'No Highland Fresh Product Purchases',
            'description' => 'Highland Fresh branded products should not be purchased from suppliers',
            'compliance_rate' => $violations == 0 ? 100 : 0,
            'violations' => intval($violations),
            'status' => $violations == 0 ? 'COMPLIANT' : 'NON_COMPLIANT'
        ];
        
        // Rule 2: Supplier-Material Compatibility
        $sql = "
            SELECT 
                COUNT(*) as total_items,
                SUM(CASE WHEN srm.supplier_id IS NOT NULL THEN 1 ELSE 0 END) as compatible_items
            FROM purchase_order_items poi
            INNER JOIN purchase_orders po ON poi.order_id = po.order_id
            LEFT JOIN supplier_raw_materials srm ON po.supplier_id = srm.supplier_id AND poi.product_id = srm.raw_material_id
            WHERE po.order_date BETWEEN ? AND ?
                AND po.order_type = 'raw_materials'
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$dateRange['start'], $dateRange['end']]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $total = intval($result['total_items']);
        $compatible = intval($result['compatible_items']);
        
        $rules[] = [
            'rule_name' => 'Supplier-Material Compatibility',
            'description' => 'Materials should only be purchased from approved suppliers',
            'compliance_rate' => $total > 0 ? round(($compatible / $total) * 100, 1) : 100,
            'violations' => $total - $compatible,
            'status' => ($total == $compatible) ? 'COMPLIANT' : 'NON_COMPLIANT'
        ];
        
        // Add more business rules as needed...
        
        return $rules;
    }

    // ============================================================================
    // PRODUCTION REPORT
    // ============================================================================

    public function getProductionReport() {
        try {
            $filters = $this->getFilters();
            $dateRange = $this->getDateRange($filters['dateRange']);

            $report = [
                'rawMaterialUsage' => $this->getRawMaterialUsage($dateRange),
                'productionEfficiency' => $this->getProductionEfficiency($dateRange),
                'wasteAnalysis' => $this->getWasteAnalysis($dateRange),
                'traceability' => $this->getProductionTraceability($dateRange)
            ];

            return $this->sendSuccess($report);

        } catch (Exception $e) {
            return $this->sendError('Error generating production report: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // FINANCIAL REPORT
    // ============================================================================

    public function getFinancialReport() {
        try {
            $filters = $this->getFilters();
            $dateRange = $this->getDateRange($filters['dateRange']);

            $report = [
                'costAnalysis' => $this->getCostAnalysis($dateRange),
                'budgetVariance' => $this->getBudgetVariance($dateRange),
                'costTrends' => $this->getCostTrends($dateRange),
                'supplierCostComparison' => $this->getSupplierCostComparison($dateRange)
            ];

            return $this->sendSuccess($report);

        } catch (Exception $e) {
            return $this->sendError('Error generating financial report: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // EXPORT FUNCTIONALITY
    // ============================================================================

    public function exportMaterialsReport() {
        $format = $_GET['format'] ?? 'csv';
        $filters = $this->getFilters();
        $dateRange = $this->getDateRange($filters['dateRange']);

        try {
            $materials = $this->getMaterialsData($dateRange, $filters);

            if ($format === 'csv') {
                $this->exportToCSV($materials, 'highland-fresh-materials-report');
            } elseif ($format === 'pdf') {
                $this->exportToPDF($materials, 'Highland Fresh Materials Report');
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
    // UTILITY METHODS
    // ============================================================================

    private function getFilters() {
        return [
            'dateRange' => $_GET['dateRange'] ?? 'last_30_days',
            'supplierType' => $_GET['supplierType'] ?? 'all',
            'materialCategory' => $_GET['materialCategory'] ?? 'all',
            'complianceStatus' => $_GET['complianceStatus'] ?? 'all'
        ];
    }

    private function getDateRange($range) {
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
            case 'last_quarter':
                return [
                    'start' => date('Y-m-d', strtotime('-3 months')),
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
$api = new PurchaseOrderReportsAPI();
echo $api->handleRequest();
?>
