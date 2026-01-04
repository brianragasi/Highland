/**
 * Highland Fresh Quality Control Integration System
 * Automated quality control with Highland Fresh standards enforcement
 * 
 * Features:
 * - Automated quality standards checking
 * - Material rejection workflows
 * - Production planning integration
 * - Quality test scheduling and tracking
 * - Highland Fresh compliance monitoring
 * - Alert and notification system
 * - Quality trend analysis
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

class QualityControlIntegration {
    constructor() {
        this.apiUrl = 'api/QualityControlAPI.php';
        this.highlandFreshStandards = {};
        this.currentQualityTests = new Map();
        this.qualityAlerts = [];
        this.autoRejectionEnabled = true;
        this.productionIntegrationEnabled = true;
        
        this.initializeQualityControl();
    }

    // ============================================================================
    // INITIALIZATION & SETUP
    // ============================================================================

    async initializeQualityControl() {
        try {
            await this.loadHighlandFreshStandards();
            this.setupQualityMonitoring();
            this.setupAutoRejectionSystem();
            this.setupProductionIntegration();
            this.startRealTimeMonitoring();
            
            console.log('Highland Fresh Quality Control Integration initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Quality Control Integration:', error);
            throw error;
        }
    }

    async loadHighlandFreshStandards() {
        try {
            const response = await axios.get(`${this.apiUrl}?action=getHighlandFreshStandards`, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            this.highlandFreshStandards = result.data;
            
            // Set up quality standards for different material categories
            this.setupMaterialStandards();
            
        } catch (error) {
            console.error('Error loading Highland Fresh standards:', error);
            throw error;
        }
    }

    setupMaterialStandards() {
        // Dairy Raw Materials Standards
        this.highlandFreshStandards.dairy = {
            rawMilk: {
                bacterialCount: { max: 100000, unit: 'CFU/ml', critical: true },
                somaticCellCount: { max: 400000, unit: 'cells/ml', critical: true },
                protein: { min: 3.0, max: 4.5, unit: '%', critical: false },
                fat: { min: 3.5, max: 5.0, unit: '%', critical: false },
                lactose: { min: 4.3, max: 5.0, unit: '%', critical: false },
                pH: { min: 6.5, max: 6.8, unit: 'pH', critical: true },
                temperature: { max: 4.0, unit: '°C', critical: true },
                antibiotics: { detected: false, critical: true },
                freezingPoint: { min: -0.520, max: -0.505, unit: '°C', critical: false }
            },
            cream: {
                fatContent: { min: 35.0, unit: '%', critical: true },
                bacterialCount: { max: 50000, unit: 'CFU/ml', critical: true },
                temperature: { max: 4.0, unit: '°C', critical: true },
                pH: { min: 6.4, max: 6.8, unit: 'pH', critical: false }
            }
        };

        // Packaging Materials Standards
        this.highlandFreshStandards.packaging = {
            foodGradeCertification: { required: true, critical: true },
            migrationTesting: { required: true, critical: true },
            barrierProperties: {
                oxygenTransmission: { max: 1.0, unit: 'cc/m²/day', critical: false },
                waterVaporTransmission: { max: 1.0, unit: 'g/m²/day', critical: false }
            },
            physicalProperties: {
                tensileStrength: { min: 50, unit: 'MPa', critical: false },
                elongation: { min: 300, unit: '%', critical: false }
            }
        };

        // Culture Standards
        this.highlandFreshStandards.cultures = {
            viability: { min: 1000000000, unit: 'CFU/g', critical: true }, // 10^9 CFU/g
            purity: { min: 99.0, unit: '%', critical: true },
            contaminants: {
                yeast: { max: 10, unit: 'CFU/g', critical: true },
                mold: { max: 10, unit: 'CFU/g', critical: true },
                coliforms: { max: 10, unit: 'CFU/g', critical: true }
            },
            storageTemp: { max: -18, unit: '°C', critical: true }
        };
    }

    // ============================================================================
    // QUALITY MONITORING SYSTEM
    // ============================================================================

    setupQualityMonitoring() {
        // Set up event listeners for quality test completion
        document.addEventListener('qualityTestCompleted', (event) => {
            this.handleQualityTestCompletion(event.detail);
        });

        // Set up event listeners for material receipt
        document.addEventListener('materialReceived', (event) => {
            this.handleMaterialReceipt(event.detail);
        });

        // Set up periodic quality checks
        setInterval(() => {
            this.performPeriodicQualityChecks();
        }, 300000); // Every 5 minutes
    }

    async handleMaterialReceipt(receiptData) {
        try {
            console.log('Processing material receipt for quality control:', receiptData);

            // Determine required quality tests based on material type
            const requiredTests = this.determineRequiredTests(receiptData);
            
            // Schedule automatic quality tests
            for (const test of requiredTests) {
                await this.scheduleQualityTest({
                    batchId: receiptData.batchId,
                    materialId: receiptData.materialId,
                    testType: test.type,
                    priority: test.priority,
                    scheduledDate: test.scheduledDate,
                    autoReject: test.autoReject
                });
            }

            // Perform immediate compliance check
            const complianceResult = await this.performComplianceCheck(receiptData);
            
            if (!complianceResult.compliant && this.autoRejectionEnabled) {
                await this.initiateAutoRejection(receiptData, complianceResult.violations);
            }

        } catch (error) {
            console.error('Error handling material receipt:', error);
            this.generateQualityAlert('RECEIPT_PROCESSING_ERROR', {
                batchId: receiptData.batchId,
                error: error.message
            });
        }
    }

    determineRequiredTests(receiptData) {
        const materialCategory = receiptData.materialCategory?.toLowerCase() || 'general';
        const tests = [];

        switch (materialCategory) {
            case 'dairy':
                tests.push(
                    {
                        type: 'microbiological',
                        priority: 'HIGH',
                        scheduledDate: new Date(),
                        autoReject: true,
                        tests: ['bacterial_count', 'somatic_cell_count', 'antibiotic_residue']
                    },
                    {
                        type: 'chemical',
                        priority: 'MEDIUM',
                        scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
                        autoReject: false,
                        tests: ['protein', 'fat', 'lactose', 'ph']
                    },
                    {
                        type: 'physical',
                        priority: 'LOW',
                        scheduledDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours later
                        autoReject: false,
                        tests: ['temperature', 'freezing_point']
                    }
                );
                break;

            case 'packaging':
                tests.push(
                    {
                        type: 'certification_check',
                        priority: 'HIGH',
                        scheduledDate: new Date(),
                        autoReject: true,
                        tests: ['food_grade_certification', 'migration_testing']
                    },
                    {
                        type: 'barrier_properties',
                        priority: 'MEDIUM',
                        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours later
                        autoReject: false,
                        tests: ['oxygen_transmission', 'water_vapor_transmission']
                    }
                );
                break;

            case 'cultures':
                tests.push(
                    {
                        type: 'viability_purity',
                        priority: 'HIGH',
                        scheduledDate: new Date(),
                        autoReject: true,
                        tests: ['viability', 'purity', 'contaminants']
                    }
                );
                break;

            default:
                tests.push(
                    {
                        type: 'general_inspection',
                        priority: 'MEDIUM',
                        scheduledDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
                        autoReject: false,
                        tests: ['visual_inspection', 'documentation_check']
                    }
                );
        }

        return tests;
    }

    // ============================================================================
    // AUTOMATED REJECTION SYSTEM
    // ============================================================================

    setupAutoRejectionSystem() {
        this.rejectionCriteria = {
            critical_failure: {
                action: 'IMMEDIATE_REJECTION',
                notification: 'URGENT',
                quarantine: true,
                approval_required: 'QUALITY_MANAGER'
            },
            standard_violation: {
                action: 'CONDITIONAL_REJECTION',
                notification: 'HIGH',
                quarantine: true,
                approval_required: 'SUPERVISOR'
            },
            minor_deviation: {
                action: 'INVESTIGATE',
                notification: 'MEDIUM',
                quarantine: false,
                approval_required: 'TECHNICIAN'
            }
        };
    }

    async performComplianceCheck(materialData) {
        try {
            const response = await axios.post(`${this.apiUrl}?action=performComplianceCheck`, {
                materialData: materialData,
                standards: this.highlandFreshStandards
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error performing compliance check:', error);
            throw error;
        }
    }

    async initiateAutoRejection(materialData, violations) {
        try {
            console.log('Initiating auto-rejection for material:', materialData.batchId);

            const rejectionData = {
                batchId: materialData.batchId,
                materialId: materialData.materialId,
                rejectionReason: 'HIGHLAND_FRESH_STANDARDS_VIOLATION',
                violations: violations,
                autoRejected: true,
                rejectionDate: new Date().toISOString(),
                rejectedBy: 'Highland Fresh Quality Control System',
                quarantineRequired: this.determineQuarantineRequired(violations),
                approvalRequired: this.determineApprovalRequired(violations)
            };

            // Update material status to rejected
            await this.updateMaterialStatus(materialData.batchId, 'REJECTED', rejectionData);

            // Generate rejection notification
            await this.generateRejectionNotification(rejectionData);

            // Update production planning if integrated
            if (this.productionIntegrationEnabled) {
                await this.updateProductionPlanning(rejectionData);
            }

            // Log rejection in quality system
            await this.logQualityAction('AUTO_REJECTION', rejectionData);

            console.log('Auto-rejection completed for batch:', materialData.batchId);

        } catch (error) {
            console.error('Error during auto-rejection:', error);
            throw error;
        }
    }

    determineQuarantineRequired(violations) {
        return violations.some(violation => 
            violation.severity === 'CRITICAL' || 
            violation.category === 'microbiological' ||
            violation.category === 'safety'
        );
    }

    determineApprovalRequired(violations) {
        const criticalViolations = violations.filter(v => v.severity === 'CRITICAL').length;
        const majorViolations = violations.filter(v => v.severity === 'MAJOR').length;

        if (criticalViolations > 0) return 'QUALITY_MANAGER';
        if (majorViolations > 2) return 'SUPERVISOR';
        return 'TECHNICIAN';
    }

    // ============================================================================
    // PRODUCTION PLANNING INTEGRATION
    // ============================================================================

    setupProductionIntegration() {
        this.productionImpactMatrix = {
            'raw_milk': {
                products: ['Highland Fresh Milk', 'Highland Fresh Yogurt', 'Highland Fresh Cheese'],
                impact_factor: 0.8,
                substitution_possible: true,
                lead_time_impact: 24 // hours
            },
            'cream': {
                products: ['Highland Fresh Butter', 'Highland Fresh Ice Cream'],
                impact_factor: 0.9,
                substitution_possible: false,
                lead_time_impact: 48 // hours
            },
            'cultures': {
                products: ['Highland Fresh Yogurt', 'Highland Fresh Cheese'],
                impact_factor: 1.0,
                substitution_possible: true,
                lead_time_impact: 72 // hours
            },
            'packaging': {
                products: ['All Highland Fresh Products'],
                impact_factor: 0.3,
                substitution_possible: true,
                lead_time_impact: 12 // hours
            }
        };
    }

    async updateProductionPlanning(rejectionData) {
        try {
            const materialType = rejectionData.materialType || 'general';
            const productionImpact = this.productionImpactMatrix[materialType];

            if (!productionImpact) {
                console.log('No production impact defined for material type:', materialType);
                return;
            }

            const planningUpdate = {
                rejectedBatchId: rejectionData.batchId,
                affectedProducts: productionImpact.products,
                impactFactor: productionImpact.impact_factor,
                substitutionPossible: productionImpact.substitution_possible,
                leadTimeImpact: productionImpact.lead_time_impact,
                recommendedActions: this.generateProductionRecommendations(rejectionData, productionImpact)
            };

            // Send to production planning system
            await this.notifyProductionPlanning(planningUpdate);

            // Log production impact
            await this.logQualityAction('PRODUCTION_IMPACT', planningUpdate);

        } catch (error) {
            console.error('Error updating production planning:', error);
            throw error;
        }
    }

    generateProductionRecommendations(rejectionData, productionImpact) {
        const recommendations = [];

        if (productionImpact.substitution_possible) {
            recommendations.push({
                action: 'FIND_SUBSTITUTE',
                priority: 'HIGH',
                description: `Find alternative supplier or existing inventory for ${rejectionData.materialType}`,
                estimated_time: productionImpact.lead_time_impact
            });
        }

        if (productionImpact.impact_factor > 0.7) {
            recommendations.push({
                action: 'ADJUST_SCHEDULE',
                priority: 'URGENT',
                description: 'Reschedule production to minimize impact on Highland Fresh product delivery',
                estimated_time: 2
            });
        }

        recommendations.push({
            action: 'INVENTORY_CHECK',
            priority: 'MEDIUM',
            description: 'Check existing inventory levels for affected materials',
            estimated_time: 1
        });

        return recommendations;
    }

    // ============================================================================
    // QUALITY TEST MANAGEMENT
    // ============================================================================

    async scheduleQualityTest(testData) {
        try {
            const testId = this.generateTestId();
            
            const qualityTest = {
                testId: testId,
                batchId: testData.batchId,
                materialId: testData.materialId,
                testType: testData.testType,
                priority: testData.priority,
                scheduledDate: testData.scheduledDate,
                status: 'SCHEDULED',
                autoReject: testData.autoReject,
                highlandFreshStandards: this.getApplicableStandards(testData.materialId, testData.testType),
                createdDate: new Date().toISOString(),
                createdBy: 'Highland Fresh Quality Control System'
            };

            // Store in current tests map
            this.currentQualityTests.set(testId, qualityTest);

            // Send to API for scheduling
            const response = await axios.post(`${this.apiUrl}?action=scheduleQualityTest`, qualityTest, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            console.log(`Quality test scheduled: ${testId} for batch ${testData.batchId}`);
            return testId;

        } catch (error) {
            console.error('Error scheduling quality test:', error);
            throw error;
        }
    }

    async handleQualityTestCompletion(testResults) {
        try {
            const testId = testResults.testId;
            const scheduledTest = this.currentQualityTests.get(testId);

            if (!scheduledTest) {
                throw new Error(`Scheduled test not found: ${testId}`);
            }

            // Evaluate test results against Highland Fresh standards
            const evaluation = await this.evaluateTestResults(testResults, scheduledTest.highlandFreshStandards);

            // Update test status
            scheduledTest.status = 'COMPLETED';
            scheduledTest.completionDate = new Date().toISOString();
            scheduledTest.results = testResults;
            scheduledTest.evaluation = evaluation;

            // Process results based on evaluation
            if (evaluation.overallResult === 'FAIL' && scheduledTest.autoReject) {
                await this.initiateAutoRejection({
                    batchId: scheduledTest.batchId,
                    materialId: scheduledTest.materialId,
                    materialType: testResults.materialType
                }, evaluation.violations);
            }

            // Update material compliance status
            await this.updateMaterialComplianceStatus(scheduledTest.batchId, evaluation);

            // Generate quality alerts if needed
            if (evaluation.alertsRequired.length > 0) {
                for (const alert of evaluation.alertsRequired) {
                    this.generateQualityAlert(alert.type, alert.data);
                }
            }

            // Clean up completed test
            this.currentQualityTests.delete(testId);

            console.log(`Quality test completed and processed: ${testId}`);

        } catch (error) {
            console.error('Error handling quality test completion:', error);
            throw error;
        }
    }

    async evaluateTestResults(testResults, standards) {
        const evaluation = {
            overallResult: 'PASS',
            violations: [],
            warnings: [],
            alertsRequired: [],
            complianceScore: 100,
            recommendations: []
        };

        // Evaluate each test parameter
        for (const [parameter, result] of Object.entries(testResults.results || {})) {
            const standard = standards[parameter];
            if (!standard) continue;

            const parameterEvaluation = this.evaluateParameter(parameter, result, standard);
            
            if (parameterEvaluation.violation) {
                evaluation.violations.push(parameterEvaluation.violation);
                evaluation.complianceScore -= parameterEvaluation.penalty;
                
                if (standard.critical) {
                    evaluation.overallResult = 'FAIL';
                }
            }

            if (parameterEvaluation.warning) {
                evaluation.warnings.push(parameterEvaluation.warning);
            }

            if (parameterEvaluation.alert) {
                evaluation.alertsRequired.push(parameterEvaluation.alert);
            }
        }

        // Generate recommendations based on results
        evaluation.recommendations = this.generateQualityRecommendations(evaluation);

        return evaluation;
    }

    evaluateParameter(parameter, result, standard) {
        const evaluation = {
            violation: null,
            warning: null,
            alert: null,
            penalty: 0
        };

        const value = parseFloat(result.value);
        const isNumeric = !isNaN(value);

        // Check minimum values
        if (standard.min !== undefined && isNumeric && value < standard.min) {
            const violation = {
                parameter: parameter,
                expected: `>= ${standard.min} ${standard.unit}`,
                actual: `${value} ${standard.unit}`,
                severity: standard.critical ? 'CRITICAL' : 'MAJOR',
                category: this.categorizeParameter(parameter)
            };

            evaluation.violation = violation;
            evaluation.penalty = standard.critical ? 50 : 20;

            if (standard.critical) {
                evaluation.alert = {
                    type: 'CRITICAL_VIOLATION',
                    data: { parameter, violation }
                };
            }
        }

        // Check maximum values
        if (standard.max !== undefined && isNumeric && value > standard.max) {
            const violation = {
                parameter: parameter,
                expected: `<= ${standard.max} ${standard.unit}`,
                actual: `${value} ${standard.unit}`,
                severity: standard.critical ? 'CRITICAL' : 'MAJOR',
                category: this.categorizeParameter(parameter)
            };

            evaluation.violation = violation;
            evaluation.penalty = standard.critical ? 50 : 20;

            if (standard.critical) {
                evaluation.alert = {
                    type: 'CRITICAL_VIOLATION',
                    data: { parameter, violation }
                };
            }
        }

        // Check boolean requirements
        if (standard.required !== undefined && result.value !== standard.required) {
            const violation = {
                parameter: parameter,
                expected: standard.required,
                actual: result.value,
                severity: 'CRITICAL',
                category: 'compliance'
            };

            evaluation.violation = violation;
            evaluation.penalty = 100; // Maximum penalty for required items

            evaluation.alert = {
                type: 'COMPLIANCE_VIOLATION',
                data: { parameter, violation }
            };
        }

        // Check for warning conditions (values approaching limits)
        if (standard.warning_threshold && isNumeric) {
            const threshold = standard.warning_threshold;
            if ((standard.max && value > (standard.max * threshold)) ||
                (standard.min && value < (standard.min * threshold))) {
                evaluation.warning = {
                    parameter: parameter,
                    message: `${parameter} approaching limit: ${value} ${standard.unit}`,
                    recommended_action: 'Monitor closely and consider corrective action'
                };
            }
        }

        return evaluation;
    }

    // ============================================================================
    // ALERT AND NOTIFICATION SYSTEM
    // ============================================================================

    generateQualityAlert(alertType, alertData) {
        const alert = {
            alertId: this.generateAlertId(),
            type: alertType,
            severity: this.getAlertSeverity(alertType),
            timestamp: new Date().toISOString(),
            data: alertData,
            status: 'ACTIVE',
            highland_fresh_context: true
        };

        this.qualityAlerts.push(alert);

        // Send notifications based on alert severity
        this.sendAlertNotifications(alert);

        // Update UI if available
        this.updateQualityAlertsUI(alert);

        console.log(`Quality alert generated: ${alertType}`, alert);
    }

    getAlertSeverity(alertType) {
        const severityMap = {
            'CRITICAL_VIOLATION': 'CRITICAL',
            'COMPLIANCE_VIOLATION': 'HIGH',
            'RECEIPT_PROCESSING_ERROR': 'MEDIUM',
            'TEMPERATURE_DEVIATION': 'HIGH',
            'EXPIRATION_WARNING': 'MEDIUM',
            'QUALITY_TREND_DEGRADATION': 'MEDIUM'
        };

        return severityMap[alertType] || 'LOW';
    }

    async sendAlertNotifications(alert) {
        try {
            const notificationData = {
                alert: alert,
                recipients: this.getNotificationRecipients(alert.severity),
                channels: this.getNotificationChannels(alert.severity),
                highland_fresh_urgent: alert.severity === 'CRITICAL'
            };

            await axios.post(`${this.apiUrl}?action=sendQualityAlert`, notificationData, {
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error sending alert notifications:', error);
        }
    }

    // ============================================================================
    // REAL-TIME MONITORING
    // ============================================================================

    startRealTimeMonitoring() {
        // Monitor temperature deviations
        setInterval(() => {
            this.checkTemperatureCompliance();
        }, 60000); // Every minute

        // Monitor quality test schedules
        setInterval(() => {
            this.checkQualityTestSchedules();
        }, 300000); // Every 5 minutes

        // Monitor material expiration
        setInterval(() => {
            this.checkMaterialExpiration();
        }, 3600000); // Every hour

        // Monitor quality trends
        setInterval(() => {
            this.analyzeQualityTrends();
        }, 1800000); // Every 30 minutes
    }

    async performPeriodicQualityChecks() {
        try {
            console.log('Performing periodic Highland Fresh quality checks...');

            // Check all active batches for compliance
            await this.checkActiveBatchCompliance();

            // Update quality trends
            await this.updateQualityTrends();

            // Clean up old alerts
            this.cleanupOldAlerts();

            console.log('Periodic quality checks completed');

        } catch (error) {
            console.error('Error during periodic quality checks:', error);
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    generateTestId() {
        return `HF-QT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    generateAlertId() {
        return `HF-QA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    categorizeParameter(parameter) {
        const categories = {
            'bacterial_count': 'microbiological',
            'somatic_cell_count': 'microbiological',
            'antibiotic_residue': 'safety',
            'protein': 'chemical',
            'fat': 'chemical',
            'ph': 'chemical',
            'temperature': 'physical',
            'food_grade_certification': 'compliance'
        };

        return categories[parameter] || 'general';
    }

    getApplicableStandards(materialId, testType) {
        // This would typically fetch from the Highland Fresh standards database
        // For now, return the loaded standards
        return this.highlandFreshStandards;
    }

    // API Communication Methods
    async updateMaterialStatus(batchId, status, data) {
        try {
            const response = await axios.post(`${this.apiUrl}?action=updateMaterialStatus`, {
                batchId: batchId,
                status: status,
                data: data
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error updating material status:', error);
            throw error;
        }
    }

    async logQualityAction(actionType, actionData) {
        try {
            await axios.post(`${this.apiUrl}?action=logQualityAction`, {
                actionType: actionType,
                actionData: actionData,
                timestamp: new Date().toISOString()
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error logging quality action:', error);
        }
    }

    // Public methods for external integration
    isQualityControlEnabled() {
        return this.autoRejectionEnabled;
    }

    getActiveQualityTests() {
        return Array.from(this.currentQualityTests.values());
    }

    getQualityAlerts() {
        return this.qualityAlerts.filter(alert => alert.status === 'ACTIVE');
    }

    async getHighlandFreshComplianceStatus() {
        try {
            const response = await axios.get(`${this.apiUrl}?action=getComplianceStatus`);
            const result = response.data;
            return result.success ? result.data : null;

        } catch (error) {
            console.error('Error fetching compliance status:', error);
            return null;
        }
    }
}

// Initialize Quality Control Integration
let qualityControlIntegration;

document.addEventListener('DOMContentLoaded', function() {
    qualityControlIntegration = new QualityControlIntegration();
});

// Export for global access
window.QualityControlIntegration = QualityControlIntegration;
