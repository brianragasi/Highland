<?php
/**
 * Highland Fresh Quality Control API
 * Server-side API for quality control integration and automation
 * 
 * Features:
 * - Highland Fresh standards management
 * - Automated compliance checking
 * - Quality test scheduling and tracking
 * - Material rejection workflows
 * - Production planning integration
 * - Alert and notification system
 * - Quality trend analysis
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

class QualityControlAPI {
    private $pdo;
    private $businessRules;
    private $highlandFreshStandards;

    public function __construct() {
        $this->pdo = DatabaseConnection::getInstance()->getConnection();
        $this->businessRules = getHighlandFreshBusinessRules();
        $this->loadHighlandFreshStandards();
    }

    public function handleRequest() {
        $action = $_GET['action'] ?? '';

        try {
            switch ($action) {
                case 'getHighlandFreshStandards':
                    return $this->getHighlandFreshStandards();
                case 'performComplianceCheck':
                    return $this->performComplianceCheck();
                case 'scheduleQualityTest':
                    return $this->scheduleQualityTest();
                case 'updateMaterialStatus':
                    return $this->updateMaterialStatus();
                case 'logQualityAction':
                    return $this->logQualityAction();
                case 'sendQualityAlert':
                    return $this->sendQualityAlert();
                case 'getComplianceStatus':
                    return $this->getComplianceStatus();
                case 'getQualityTestResults':
                    return $this->getQualityTestResults();
                case 'updateProductionPlanning':
                    return $this->updateProductionPlanning();
                case 'getQualityTrends':
                    return $this->getQualityTrends();
                default:
                    throw new Exception('Unknown action: ' . $action);
            }
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), 500);
        }
    }

    // ============================================================================
    // HIGHLAND FRESH STANDARDS MANAGEMENT
    // ============================================================================

    private function loadHighlandFreshStandards() {
        $this->highlandFreshStandards = [
            'dairy' => [
                'raw_milk' => [
                    'bacterial_count' => ['max' => 100000, 'unit' => 'CFU/ml', 'critical' => true],
                    'somatic_cell_count' => ['max' => 400000, 'unit' => 'cells/ml', 'critical' => true],
                    'protein' => ['min' => 3.0, 'max' => 4.5, 'unit' => '%', 'critical' => false],
                    'fat' => ['min' => 3.5, 'max' => 5.0, 'unit' => '%', 'critical' => false],
                    'lactose' => ['min' => 4.3, 'max' => 5.0, 'unit' => '%', 'critical' => false],
                    'ph' => ['min' => 6.5, 'max' => 6.8, 'unit' => 'pH', 'critical' => true],
                    'temperature' => ['max' => 4.0, 'unit' => '°C', 'critical' => true],
                    'antibiotics' => ['detected' => false, 'critical' => true],
                    'freezing_point' => ['min' => -0.520, 'max' => -0.505, 'unit' => '°C', 'critical' => false]
                ],
                'cream' => [
                    'fat_content' => ['min' => 35.0, 'unit' => '%', 'critical' => true],
                    'bacterial_count' => ['max' => 50000, 'unit' => 'CFU/ml', 'critical' => true],
                    'temperature' => ['max' => 4.0, 'unit' => '°C', 'critical' => true],
                    'ph' => ['min' => 6.4, 'max' => 6.8, 'unit' => 'pH', 'critical' => false]
                ]
            ],
            'packaging' => [
                'food_grade_certification' => ['required' => true, 'critical' => true],
                'migration_testing' => ['required' => true, 'critical' => true],
                'barrier_properties' => [
                    'oxygen_transmission' => ['max' => 1.0, 'unit' => 'cc/m²/day', 'critical' => false],
                    'water_vapor_transmission' => ['max' => 1.0, 'unit' => 'g/m²/day', 'critical' => false]
                ],
                'physical_properties' => [
                    'tensile_strength' => ['min' => 50, 'unit' => 'MPa', 'critical' => false],
                    'elongation' => ['min' => 300, 'unit' => '%', 'critical' => false]
                ]
            ],
            'cultures' => [
                'viability' => ['min' => 1000000000, 'unit' => 'CFU/g', 'critical' => true], // 10^9 CFU/g
                'purity' => ['min' => 99.0, 'unit' => '%', 'critical' => true],
                'contaminants' => [
                    'yeast' => ['max' => 10, 'unit' => 'CFU/g', 'critical' => true],
                    'mold' => ['max' => 10, 'unit' => 'CFU/g', 'critical' => true],
                    'coliforms' => ['max' => 10, 'unit' => 'CFU/g', 'critical' => true]
                ],
                'storage_temp' => ['max' => -18, 'unit' => '°C', 'critical' => true]
            ]
        ];
    }

    public function getHighlandFreshStandards() {
        try {
            return $this->sendSuccess($this->highlandFreshStandards);
        } catch (Exception $e) {
            return $this->sendError('Error retrieving Highland Fresh standards: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // COMPLIANCE CHECKING
    // ============================================================================

    public function performComplianceCheck() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $materialData = $input['materialData'];
            $standards = $input['standards'] ?? $this->highlandFreshStandards;

            $complianceResult = [
                'compliant' => true,
                'violations' => [],
                'warnings' => [],
                'compliance_score' => 100,
                'highland_fresh_approved' => false,
                'quality_grade' => 'PENDING',
                'recommendations' => []
            ];

            // Determine material category
            $materialCategory = strtolower($materialData['materialCategory'] ?? 'general');
            $materialType = strtolower($materialData['materialType'] ?? 'general');

            // Get applicable standards
            $applicableStandards = $this->getApplicableStandards($materialCategory, $materialType, $standards);

            if (empty($applicableStandards)) {
                $complianceResult['warnings'][] = [
                    'message' => 'No specific Highland Fresh standards found for this material type',
                    'category' => 'standards'
                ];
                return $this->sendSuccess($complianceResult);
            }

            // Evaluate each parameter
            foreach ($materialData['qualityParameters'] ?? [] as $parameter => $value) {
                $parameterResult = $this->evaluateParameter($parameter, $value, $applicableStandards);
                
                if ($parameterResult['violation']) {
                    $complianceResult['violations'][] = $parameterResult['violation'];
                    $complianceResult['compliance_score'] -= $parameterResult['penalty'];
                    
                    if ($parameterResult['violation']['severity'] === 'CRITICAL') {
                        $complianceResult['compliant'] = false;
                    }
                }

                if ($parameterResult['warning']) {
                    $complianceResult['warnings'][] = $parameterResult['warning'];
                }
            }

            // Determine Highland Fresh approval status
            $complianceResult['highland_fresh_approved'] = $this->determineHighlandFreshApproval($complianceResult);
            $complianceResult['quality_grade'] = $this->determineQualityGrade($complianceResult);
            $complianceResult['recommendations'] = $this->generateRecommendations($complianceResult);

            // Log compliance check
            $this->logComplianceCheck($materialData['batchId'] ?? null, $complianceResult);

            return $this->sendSuccess($complianceResult);

        } catch (Exception $e) {
            return $this->sendError('Error performing compliance check: ' . $e->getMessage());
        }
    }

    private function getApplicableStandards($category, $type, $standards) {
        if (isset($standards[$category][$type])) {
            return $standards[$category][$type];
        }
        
        if (isset($standards[$category])) {
            return $standards[$category];
        }

        return [];
    }

    private function evaluateParameter($parameter, $value, $standards) {
        $result = [
            'violation' => null,
            'warning' => null,
            'penalty' => 0
        ];

        $standard = $standards[$parameter] ?? null;
        if (!$standard) {
            return $result;
        }

        $numericValue = is_numeric($value) ? floatval($value) : null;

        // Check minimum values
        if (isset($standard['min']) && $numericValue !== null && $numericValue < $standard['min']) {
            $result['violation'] = [
                'parameter' => $parameter,
                'expected' => '>= ' . $standard['min'] . ' ' . ($standard['unit'] ?? ''),
                'actual' => $value . ' ' . ($standard['unit'] ?? ''),
                'severity' => $standard['critical'] ? 'CRITICAL' : 'MAJOR',
                'category' => $this->categorizeParameter($parameter)
            ];
            $result['penalty'] = $standard['critical'] ? 50 : 20;
        }

        // Check maximum values
        if (isset($standard['max']) && $numericValue !== null && $numericValue > $standard['max']) {
            $result['violation'] = [
                'parameter' => $parameter,
                'expected' => '<= ' . $standard['max'] . ' ' . ($standard['unit'] ?? ''),
                'actual' => $value . ' ' . ($standard['unit'] ?? ''),
                'severity' => $standard['critical'] ? 'CRITICAL' : 'MAJOR',
                'category' => $this->categorizeParameter($parameter)
            ];
            $result['penalty'] = $standard['critical'] ? 50 : 20;
        }

        // Check required boolean values
        if (isset($standard['required']) && $value !== $standard['required']) {
            $result['violation'] = [
                'parameter' => $parameter,
                'expected' => $standard['required'] ? 'Required' : 'Not allowed',
                'actual' => $value ? 'Present' : 'Missing',
                'severity' => 'CRITICAL',
                'category' => 'compliance'
            ];
            $result['penalty'] = 100;
        }

        // Check for warnings (approaching limits)
        if ($numericValue !== null && isset($standard['warning_threshold'])) {
            $threshold = $standard['warning_threshold'];
            if ((isset($standard['max']) && $numericValue > ($standard['max'] * $threshold)) ||
                (isset($standard['min']) && $numericValue < ($standard['min'] * $threshold))) {
                $result['warning'] = [
                    'parameter' => $parameter,
                    'message' => $parameter . ' approaching limit: ' . $value . ' ' . ($standard['unit'] ?? ''),
                    'recommended_action' => 'Monitor closely and consider corrective action'
                ];
            }
        }

        return $result;
    }

    private function categorizeParameter($parameter) {
        $categories = [
            'bacterial_count' => 'microbiological',
            'somatic_cell_count' => 'microbiological',
            'antibiotic_residue' => 'safety',
            'antibiotics' => 'safety',
            'protein' => 'chemical',
            'fat' => 'chemical',
            'fat_content' => 'chemical',
            'lactose' => 'chemical',
            'ph' => 'chemical',
            'temperature' => 'physical',
            'freezing_point' => 'physical',
            'food_grade_certification' => 'compliance',
            'migration_testing' => 'compliance',
            'viability' => 'microbiological',
            'purity' => 'chemical',
            'yeast' => 'microbiological',
            'mold' => 'microbiological',
            'coliforms' => 'microbiological'
        ];

        return $categories[$parameter] ?? 'general';
    }

    private function determineHighlandFreshApproval($complianceResult) {
        // Highland Fresh approval requires:
        // 1. No critical violations
        // 2. Compliance score >= 85
        // 3. No safety-related issues

        $criticalViolations = array_filter($complianceResult['violations'], function($v) {
            return $v['severity'] === 'CRITICAL';
        });

        $safetyViolations = array_filter($complianceResult['violations'], function($v) {
            return $v['category'] === 'safety';
        });

        return empty($criticalViolations) && 
               empty($safetyViolations) && 
               $complianceResult['compliance_score'] >= 85;
    }

    private function determineQualityGrade($complianceResult) {
        $score = $complianceResult['compliance_score'];
        $criticalViolations = array_filter($complianceResult['violations'], function($v) {
            return $v['severity'] === 'CRITICAL';
        });

        if (!empty($criticalViolations)) {
            return 'REJECTED';
        }

        if ($score >= 95) return 'PREMIUM';
        if ($score >= 85) return 'STANDARD';
        if ($score >= 70) return 'CONDITIONAL';
        
        return 'REJECTED';
    }

    // ============================================================================
    // QUALITY TEST MANAGEMENT
    // ============================================================================

    public function scheduleQualityTest() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $sql = "
                INSERT INTO quality_tests (
                    test_id, batch_id, material_id, test_type, priority,
                    scheduled_date, status, auto_reject, highland_fresh_standards,
                    created_date, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['testId'],
                $input['batchId'],
                $input['materialId'],
                json_encode($input['testType']),
                $input['priority'],
                $input['scheduledDate'],
                $input['status'],
                $input['autoReject'] ? 1 : 0,
                json_encode($input['highlandFreshStandards']),
                $input['createdBy']
            ]);

            return $this->sendSuccess(['message' => 'Quality test scheduled successfully', 'testId' => $input['testId']]);

        } catch (Exception $e) {
            return $this->sendError('Error scheduling quality test: ' . $e->getMessage());
        }
    }

    public function getQualityTestResults() {
        try {
            $testId = $_GET['testId'] ?? null;
            $batchId = $_GET['batchId'] ?? null;

            $sql = "
                SELECT 
                    qt.*,
                    rmb.highland_fresh_batch_code,
                    rm.name as material_name,
                    rm.category as material_category
                FROM quality_tests qt
                LEFT JOIN raw_material_batches rmb ON qt.batch_id = rmb.batch_id
                LEFT JOIN raw_materials rm ON qt.material_id = rm.raw_material_id
                WHERE 1=1
            ";

            $params = [];
            if ($testId) {
                $sql .= " AND qt.test_id = ?";
                $params[] = $testId;
            }
            if ($batchId) {
                $sql .= " AND qt.batch_id = ?";
                $params[] = $batchId;
            }

            $sql .= " ORDER BY qt.scheduled_date DESC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->sendSuccess($results);

        } catch (Exception $e) {
            return $this->sendError('Error retrieving quality test results: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // MATERIAL STATUS MANAGEMENT
    // ============================================================================

    public function updateMaterialStatus() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $this->pdo->beginTransaction();

            // Update batch status
            $sql = "
                UPDATE raw_material_batches SET
                    status = ?,
                    quality_notes = ?,
                    highland_fresh_approved = ?,
                    status_updated_date = NOW(),
                    status_updated_by = ?
                WHERE batch_id = ?
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['status'],
                json_encode($input['data']),
                ($input['status'] === 'APPROVED') ? 1 : 0,
                $input['data']['rejectedBy'] ?? 'Highland Fresh Quality System',
                $input['batchId']
            ]);

            // Log status change
            $sql = "
                INSERT INTO material_status_log (
                    batch_id, previous_status, new_status, change_reason,
                    changed_by, change_date, highland_fresh_context
                ) VALUES (?, 
                    (SELECT status FROM raw_material_batches WHERE batch_id = ? LIMIT 1),
                    ?, ?, ?, NOW(), 1
                )
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['batchId'],
                $input['batchId'],
                $input['status'],
                json_encode($input['data']),
                $input['data']['rejectedBy'] ?? 'Highland Fresh Quality System'
            ]);

            $this->pdo->commit();
            return $this->sendSuccess(['message' => 'Material status updated successfully']);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return $this->sendError('Error updating material status: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // QUALITY ACTION LOGGING
    // ============================================================================

    public function logQualityAction() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            $sql = "
                INSERT INTO quality_action_log (
                    action_type, action_data, timestamp, highland_fresh_context
                ) VALUES (?, ?, ?, 1)
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['actionType'],
                json_encode($input['actionData']),
                $input['timestamp']
            ]);

            return $this->sendSuccess(['message' => 'Quality action logged successfully']);

        } catch (Exception $e) {
            return $this->sendError('Error logging quality action: ' . $e->getMessage());
        }
    }

    private function logComplianceCheck($batchId, $complianceResult) {
        try {
            $sql = "
                INSERT INTO compliance_check_log (
                    batch_id, compliance_result, highland_fresh_approved,
                    compliance_score, violations_count, check_date
                ) VALUES (?, ?, ?, ?, ?, NOW())
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $batchId,
                json_encode($complianceResult),
                $complianceResult['highland_fresh_approved'] ? 1 : 0,
                $complianceResult['compliance_score'],
                count($complianceResult['violations'])
            ]);

        } catch (Exception $e) {
            error_log('Error logging compliance check: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // ALERT AND NOTIFICATION SYSTEM
    // ============================================================================

    public function sendQualityAlert() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $alert = $input['alert'];
            $recipients = $input['recipients'] ?? [];
            $channels = $input['channels'] ?? ['email'];

            // Store alert in database
            $sql = "
                INSERT INTO quality_alerts (
                    alert_id, alert_type, severity, timestamp, alert_data,
                    status, highland_fresh_context
                ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', 1)
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $alert['alertId'],
                $alert['type'],
                $alert['severity'],
                $alert['timestamp'],
                json_encode($alert['data'])
            ]);

            // Send notifications (implementation would depend on available services)
            $this->processAlertNotifications($alert, $recipients, $channels);

            return $this->sendSuccess(['message' => 'Quality alert sent successfully']);

        } catch (Exception $e) {
            return $this->sendError('Error sending quality alert: ' . $e->getMessage());
        }
    }

    private function processAlertNotifications($alert, $recipients, $channels) {
        // Implementation would depend on available notification services
        // For now, just log the alert
        error_log("Highland Fresh Quality Alert: " . $alert['type'] . " - " . json_encode($alert['data']));
        
        // In production, this would integrate with:
        // - Email service
        // - SMS service
        // - Push notifications
        // - Slack/Teams integration
        // - Dashboard updates
    }

    // ============================================================================
    // COMPLIANCE STATUS AND REPORTING
    // ============================================================================

    public function getComplianceStatus() {
        try {
            $dateRange = $_GET['dateRange'] ?? '30'; // days

            $sql = "
                SELECT 
                    COUNT(*) as total_batches,
                    SUM(CASE WHEN highland_fresh_approved = 1 THEN 1 ELSE 0 END) as approved_batches,
                    AVG(CASE WHEN ccl.compliance_score IS NOT NULL THEN ccl.compliance_score ELSE 0 END) as avg_compliance_score,
                    COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_batches,
                    COUNT(qa.alert_id) as active_alerts
                FROM raw_material_batches rmb
                LEFT JOIN compliance_check_log ccl ON rmb.batch_id = ccl.batch_id
                LEFT JOIN quality_alerts qa ON qa.status = 'ACTIVE'
                WHERE rmb.received_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$dateRange]);
            $status = $stmt->fetch(PDO::FETCH_ASSOC);

            $complianceStatus = [
                'overall_compliance_rate' => $status['total_batches'] > 0 ? 
                    round(($status['approved_batches'] / $status['total_batches']) * 100, 2) : 0,
                'total_batches' => intval($status['total_batches']),
                'approved_batches' => intval($status['approved_batches']),
                'rejected_batches' => intval($status['rejected_batches']),
                'average_compliance_score' => round(floatval($status['avg_compliance_score']), 2),
                'active_alerts' => intval($status['active_alerts']),
                'highland_fresh_standards_met' => $status['avg_compliance_score'] >= 85
            ];

            return $this->sendSuccess($complianceStatus);

        } catch (Exception $e) {
            return $this->sendError('Error retrieving compliance status: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // PRODUCTION PLANNING INTEGRATION
    // ============================================================================

    public function updateProductionPlanning() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);

            // Log production impact
            $sql = "
                INSERT INTO production_impact_log (
                    rejected_batch_id, affected_products, impact_factor,
                    substitution_possible, lead_time_impact, recommendations,
                    impact_date, highland_fresh_context
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['rejectedBatchId'],
                json_encode($input['affectedProducts']),
                $input['impactFactor'],
                $input['substitutionPossible'] ? 1 : 0,
                $input['leadTimeImpact'],
                json_encode($input['recommendedActions'])
            ]);

            // In a real implementation, this would integrate with production planning system
            // For now, just return success
            return $this->sendSuccess(['message' => 'Production planning updated successfully']);

        } catch (Exception $e) {
            return $this->sendError('Error updating production planning: ' . $e->getMessage());
        }
    }

    // ============================================================================
    // QUALITY TRENDS ANALYSIS
    // ============================================================================

    public function getQualityTrends() {
        try {
            $days = $_GET['days'] ?? 30;

            $sql = "
                SELECT 
                    DATE(ccl.check_date) as check_date,
                    AVG(ccl.compliance_score) as avg_compliance_score,
                    COUNT(*) as total_checks,
                    SUM(CASE WHEN ccl.highland_fresh_approved = 1 THEN 1 ELSE 0 END) as approved_count,
                    SUM(ccl.violations_count) as total_violations
                FROM compliance_check_log ccl
                WHERE ccl.check_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(ccl.check_date)
                ORDER BY check_date
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$days]);
            $trends = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $trendAnalysis = [
                'daily_trends' => $trends,
                'overall_trend' => $this->calculateOverallTrend($trends),
                'improvement_areas' => $this->identifyImprovementAreas($trends)
            ];

            return $this->sendSuccess($trendAnalysis);

        } catch (Exception $e) {
            return $this->sendError('Error retrieving quality trends: ' . $e->getMessage());
        }
    }

    private function calculateOverallTrend($trends) {
        if (count($trends) < 2) {
            return 'INSUFFICIENT_DATA';
        }

        $firstWeek = array_slice($trends, 0, 7);
        $lastWeek = array_slice($trends, -7);

        $firstWeekAvg = array_sum(array_column($firstWeek, 'avg_compliance_score')) / count($firstWeek);
        $lastWeekAvg = array_sum(array_column($lastWeek, 'avg_compliance_score')) / count($lastWeek);

        $difference = $lastWeekAvg - $firstWeekAvg;

        if ($difference > 5) return 'IMPROVING';
        if ($difference < -5) return 'DECLINING';
        return 'STABLE';
    }

    private function identifyImprovementAreas($trends) {
        // This would be more sophisticated in production
        $areas = [];
        
        $avgScore = array_sum(array_column($trends, 'avg_compliance_score')) / count($trends);
        $avgViolations = array_sum(array_column($trends, 'total_violations')) / count($trends);

        if ($avgScore < 90) {
            $areas[] = 'Overall compliance score below Highland Fresh target';
        }
        
        if ($avgViolations > 5) {
            $areas[] = 'High number of quality violations';
        }

        return $areas;
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    private function generateRecommendations($complianceResult) {
        $recommendations = [];

        foreach ($complianceResult['violations'] as $violation) {
            switch ($violation['category']) {
                case 'microbiological':
                    $recommendations[] = 'Review supplier hygiene practices and cold chain management';
                    break;
                case 'safety':
                    $recommendations[] = 'Immediate supplier audit required for safety violations';
                    break;
                case 'chemical':
                    $recommendations[] = 'Verify supplier feed quality and testing procedures';
                    break;
                case 'physical':
                    $recommendations[] = 'Check storage and transportation conditions';
                    break;
                case 'compliance':
                    $recommendations[] = 'Verify supplier certifications and documentation';
                    break;
            }
        }

        return array_unique($recommendations);
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
$api = new QualityControlAPI();
echo $api->handleRequest();
?>
