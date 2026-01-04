/**
 * Highland Fresh Raw Materials Inventory Tracker
 * Comprehensive inventory management for raw materials separate from finished products
 * 
 * Features:
 * - Batch number tracking for traceability
 * - Expiration date management
 * - Quality test results tracking
 * - Temperature monitoring
 * - Supplier source tracking
 * - Highland Fresh business rule compliance
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

class RawMaterialInventoryTracker {
    constructor(apiEndpoint = null) {
        this.apiEndpoint = apiEndpoint || '/api/RawMaterialInventoryAPI.php';
        this.inventoryData = new Map();
        this.batchTracking = new Map();
        this.expirationAlerts = [];
        this.qualityTestResults = new Map();
        this.temperatureLog = [];
        this.businessRules = window.HighlandFreshBusinessRules || null;
        this.init();
    }

    async init() {
        try {
            await this.loadInventoryData();
            this.setupExpirationMonitoring();
            this.setupTemperatureMonitoring();
            console.log('Highland Fresh Raw Materials Inventory Tracker initialized');
        } catch (error) {
            console.error('Error initializing Raw Material Inventory Tracker:', error);
        }
    }

    // ============================================================================
    // INVENTORY MANAGEMENT
    // ============================================================================

    /**
     * Load raw materials inventory data
     */
    async loadInventoryData() {
        try {
            const response = await axios.get(this.apiEndpoint, {
                params: { action: 'getAllRawMaterials' }
            });
            const result = response.data;
            
            if (result.success) {
                result.data.forEach(item => {
                    this.inventoryData.set(item.raw_material_id, {
                        ...item,
                        last_updated: new Date(),
                        highland_fresh_compliance: this.checkHighlandFreshCompliance(item)
                    });
                });
                
                console.log(`Loaded ${this.inventoryData.size} raw materials for Highland Fresh tracking`);
            } else {
                throw new Error(result.message || 'Failed to load raw materials inventory');
            }
        } catch (error) {
            console.error('Error loading raw materials inventory:', error);
            throw error;
        }
    }

    /**
     * Add new raw material receipt to inventory
     */
    async receiveRawMaterial(receiptData) {
        try {
            // Validate Highland Fresh business rules
            if (this.businessRules) {
                const validationResult = await this.businessRules.validate({
                    items: [receiptData.raw_material],
                    supplier: receiptData.supplier,
                    purchase_type: receiptData.purchase_type,
                    cold_chain_temp_min: receiptData.temperature_at_receipt,
                    cold_chain_temp_max: receiptData.temperature_at_receipt,
                    quality_grade: receiptData.quality_grade_received,
                    batch_tracking_code: receiptData.highland_fresh_batch_code
                });

                if (!validationResult.valid) {
                    throw new Error(`Highland Fresh Business Rule Violation: ${validationResult.violations[0].message}`);
                }
            }

            // Create batch tracking entry
            const batchEntry = {
                batch_id: this.generateBatchId(receiptData),
                highland_fresh_batch_code: receiptData.highland_fresh_batch_code,
                raw_material_id: receiptData.raw_material_id,
                supplier_id: receiptData.supplier_id,
                supplier_name: receiptData.supplier_name,
                received_date: new Date(),
                expiry_date: this.calculateExpiryDate(receiptData),
                quantity_received: receiptData.quantity_received,
                unit_cost: receiptData.unit_cost,
                quality_grade_received: receiptData.quality_grade_received,
                temperature_at_receipt: receiptData.temperature_at_receipt,
                quality_test_required: receiptData.requires_quality_test,
                quality_test_passed: null,
                quality_test_date: null,
                quality_test_notes: null,
                highland_fresh_approved: false,
                storage_location: receiptData.storage_location,
                current_quantity: receiptData.quantity_received,
                status: 'RECEIVED',
                highland_fresh_compliance: {
                    temperature_compliant: this.isTemperatureCompliant(receiptData),
                    quality_grade_acceptable: this.isQualityGradeAcceptable(receiptData),
                    supplier_approved: receiptData.supplier_highland_fresh_approved,
                    batch_code_valid: this.isValidHighlandFreshBatchCode(receiptData.highland_fresh_batch_code)
                }
            };

            // Store batch tracking data
            this.batchTracking.set(batchEntry.batch_id, batchEntry);

            // Update inventory levels
            await this.updateInventoryLevels(receiptData.raw_material_id, receiptData.quantity_received, 'ADD');

            // Schedule quality testing if required
            if (receiptData.requires_quality_test) {
                await this.scheduleQualityTest(batchEntry);
            }

            // Log temperature data
            this.logTemperature(receiptData.raw_material_id, receiptData.temperature_at_receipt, 'RECEIPT');

            // Send to server
            const response = await axios.post(`${this.apiEndpoint}?action=receiveRawMaterial`, batchEntry, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to record raw material receipt');
            }

            console.log(`Highland Fresh: Raw material received - Batch ${batchEntry.highland_fresh_batch_code}`);
            return batchEntry;

        } catch (error) {
            console.error('Error receiving raw material:', error);
            throw error;
        }
    }

    /**
     * Consume raw materials for production
     */
    async consumeRawMaterial(consumptionData) {
        try {
            const { raw_material_id, quantity_consumed, production_batch_id, consumption_reason } = consumptionData;
            
            // Check available inventory
            const availableQuantity = await this.getAvailableQuantity(raw_material_id);
            if (availableQuantity < quantity_consumed) {
                throw new Error(`Highland Fresh: Insufficient raw material inventory. Available: ${availableQuantity}, Requested: ${quantity_consumed}`);
            }

            // Find suitable batches (FIFO - First In, First Out)
            const suitableBatches = await this.findSuitableBatches(raw_material_id, quantity_consumed);
            
            if (suitableBatches.length === 0) {
                throw new Error('Highland Fresh: No suitable batches available for consumption');
            }

            // Process consumption from batches
            let remainingToConsume = quantity_consumed;
            const consumptionRecords = [];

            for (const batch of suitableBatches) {
                if (remainingToConsume <= 0) break;

                const consumeFromBatch = Math.min(remainingToConsume, batch.current_quantity);
                
                // Update batch quantity
                batch.current_quantity -= consumeFromBatch;
                remainingToConsume -= consumeFromBatch;

                // Record consumption
                const consumptionRecord = {
                    consumption_id: this.generateConsumptionId(),
                    batch_id: batch.batch_id,
                    highland_fresh_batch_code: batch.highland_fresh_batch_code,
                    raw_material_id: raw_material_id,
                    quantity_consumed: consumeFromBatch,
                    production_batch_id: production_batch_id,
                    consumption_date: new Date(),
                    consumption_reason: consumption_reason || 'PRODUCTION',
                    consumed_by: 'Highland Fresh Production',
                    highland_fresh_traceability: {
                        source_supplier: batch.supplier_name,
                        source_batch: batch.highland_fresh_batch_code,
                        quality_grade: batch.quality_grade_received,
                        received_date: batch.received_date,
                        production_batch: production_batch_id
                    }
                };

                consumptionRecords.push(consumptionRecord);
                
                // Update batch status if fully consumed
                if (batch.current_quantity <= 0) {
                    batch.status = 'CONSUMED';
                }
            }

            // Update inventory levels
            await this.updateInventoryLevels(raw_material_id, quantity_consumed, 'SUBTRACT');

            // Send to server
            const response = await axios.post(`${this.apiEndpoint}?action=consumeRawMaterial`, {
                raw_material_id: raw_material_id,
                consumption_records: consumptionRecords,
                total_quantity_consumed: quantity_consumed
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to record raw material consumption');
            }

            console.log(`Highland Fresh: Raw material consumed - ${quantity_consumed} units for production batch ${production_batch_id}`);
            return consumptionRecords;

        } catch (error) {
            console.error('Error consuming raw material:', error);
            throw error;
        }
    }

    // ============================================================================
    // BATCH TRACKING & TRACEABILITY
    // ============================================================================

    /**
     * Get complete traceability information for a Highland Fresh batch
     */
    async getHighlandFreshTraceability(batchCode) {
        try {
            const response = await axios.get(`${this.apiEndpoint}?action=getTraceability&batch_code=${encodeURIComponent(batchCode)}`);
            const result = response.data;

            if (result.success) {
                const traceability = {
                    highland_fresh_batch: batchCode,
                    raw_material_sources: result.data.raw_materials || [],
                    supplier_information: result.data.suppliers || [],
                    quality_test_results: result.data.quality_tests || [],
                    temperature_history: result.data.temperature_log || [],
                    production_timeline: result.data.production_steps || [],
                    compliance_status: this.assessComplianceStatus(result.data)
                };

                return traceability;
            } else {
                throw new Error(result.message || 'Failed to retrieve traceability information');
            }
        } catch (error) {
            console.error('Error retrieving Highland Fresh traceability:', error);
            throw error;
        }
    }

    /**
     * Generate Highland Fresh batch ID
     */
    generateBatchId(receiptData) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const sequence = this.getNextSequenceNumber();
        return `HF-BATCH-${date}-${sequence.toString().padStart(3, '0')}`;
    }

    /**
     * Validate Highland Fresh batch code format
     */
    isValidHighlandFreshBatchCode(batchCode) {
        if (!batchCode) return false;
        const pattern = /^HF-BATCH-\d{8}-\d{3}$/;
        return pattern.test(batchCode);
    }

    // ============================================================================
    // QUALITY MANAGEMENT
    // ============================================================================

    /**
     * Schedule quality test for raw material batch
     */
    async scheduleQualityTest(batchEntry) {
        const qualityTest = {
            test_id: this.generateTestId(),
            batch_id: batchEntry.batch_id,
            highland_fresh_batch_code: batchEntry.highland_fresh_batch_code,
            raw_material_id: batchEntry.raw_material_id,
            test_type: this.determineRequiredTests(batchEntry),
            scheduled_date: new Date(),
            priority: this.determineTestPriority(batchEntry),
            highland_fresh_standards: this.getHighlandFreshQualityStandards(batchEntry),
            status: 'SCHEDULED'
        };

        this.qualityTestResults.set(qualityTest.test_id, qualityTest);

        try {
            const response = await axios.post(`${this.apiEndpoint}?action=scheduleQualityTest`, qualityTest, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to schedule quality test');
            }

            console.log(`Highland Fresh: Quality test scheduled for batch ${batchEntry.highland_fresh_batch_code}`);
            return qualityTest;

        } catch (error) {
            console.error('Error scheduling quality test:', error);
            throw error;
        }
    }

    /**
     * Record quality test results
     */
    async recordQualityTestResults(testResults) {
        try {
            const test = this.qualityTestResults.get(testResults.test_id);
            if (!test) {
                throw new Error('Quality test not found');
            }

            // Update test results
            test.status = 'COMPLETED';
            test.completed_date = new Date();
            test.test_results = testResults.results;
            test.pass_fail_status = testResults.passed ? 'PASS' : 'FAIL';
            test.technician = testResults.technician;
            test.notes = testResults.notes;
            test.highland_fresh_compliance = this.assessQualityCompliance(testResults);

            // Update batch approval status
            const batch = this.batchTracking.get(test.batch_id);
            if (batch) {
                batch.quality_test_passed = testResults.passed;
                batch.quality_test_date = new Date();
                batch.quality_test_notes = testResults.notes;
                batch.highland_fresh_approved = testResults.passed && this.isHighlandFreshCompliant(batch);
                
                if (!testResults.passed) {
                    batch.status = 'REJECTED';
                    await this.handleRejectedBatch(batch, testResults.rejection_reason);
                }
            }

            // Send to server
            const response = await axios.post(`${this.apiEndpoint}?action=recordQualityTest`, test, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to record quality test results');
            }

            console.log(`Highland Fresh: Quality test results recorded for batch ${test.highland_fresh_batch_code} - ${test.pass_fail_status}`);
            return test;

        } catch (error) {
            console.error('Error recording quality test results:', error);
            throw error;
        }
    }

    // ============================================================================
    // EXPIRATION & ALERTS
    // ============================================================================

    /**
     * Setup expiration monitoring
     */
    setupExpirationMonitoring() {
        // Check for expiring materials every hour
        setInterval(() => {
            this.checkExpiringMaterials();
        }, 60 * 60 * 1000); // 1 hour

        // Initial check
        this.checkExpiringMaterials();
    }

    /**
     * Check for expiring raw materials
     */
    async checkExpiringMaterials() {
        const alerts = [];
        const now = new Date();
        const warningDays = 7; // Highland Fresh warning period
        const warningDate = new Date(now.getTime() + (warningDays * 24 * 60 * 60 * 1000));

        for (const [batchId, batch] of this.batchTracking) {
            if (batch.status === 'CONSUMED' || batch.status === 'REJECTED') continue;

            const expiryDate = new Date(batch.expiry_date);
            
            if (expiryDate <= now) {
                // Expired
                alerts.push({
                    type: 'EXPIRED',
                    priority: 'CRITICAL',
                    batch_id: batchId,
                    highland_fresh_batch_code: batch.highland_fresh_batch_code,
                    raw_material_name: batch.raw_material_name,
                    expiry_date: expiryDate,
                    current_quantity: batch.current_quantity,
                    message: `Highland Fresh Alert: Raw material batch ${batch.highland_fresh_batch_code} has EXPIRED`,
                    action_required: 'Remove from inventory immediately'
                });

                // Auto-expire the batch
                batch.status = 'EXPIRED';
                
            } else if (expiryDate <= warningDate) {
                // Expiring soon
                const daysUntilExpiry = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));
                alerts.push({
                    type: 'EXPIRING_SOON',
                    priority: 'HIGH',
                    batch_id: batchId,
                    highland_fresh_batch_code: batch.highland_fresh_batch_code,
                    raw_material_name: batch.raw_material_name,
                    expiry_date: expiryDate,
                    days_until_expiry: daysUntilExpiry,
                    current_quantity: batch.current_quantity,
                    message: `Highland Fresh Alert: Raw material batch ${batch.highland_fresh_batch_code} expires in ${daysUntilExpiry} days`,
                    action_required: 'Prioritize for production use'
                });
            }
        }

        if (alerts.length > 0) {
            this.expirationAlerts = alerts;
            await this.sendExpirationAlerts(alerts);
            console.log(`Highland Fresh: ${alerts.length} expiration alerts generated`);
        }
    }

    // ============================================================================
    // TEMPERATURE MONITORING
    // ============================================================================

    /**
     * Setup temperature monitoring
     */
    setupTemperatureMonitoring() {
        // Monitor temperature compliance for stored materials
        setInterval(() => {
            this.checkTemperatureCompliance();
        }, 30 * 60 * 1000); // 30 minutes
    }

    /**
     * Log temperature reading
     */
    logTemperature(rawMaterialId, temperature, eventType = 'MONITORING') {
        const temperatureEntry = {
            log_id: this.generateLogId(),
            raw_material_id: rawMaterialId,
            temperature: parseFloat(temperature),
            event_type: eventType,
            timestamp: new Date(),
            compliance_status: this.assessTemperatureCompliance(rawMaterialId, temperature),
            recorded_by: 'Highland Fresh Inventory System'
        };

        this.temperatureLog.push(temperatureEntry);

        // Keep only last 1000 entries
        if (this.temperatureLog.length > 1000) {
            this.temperatureLog = this.temperatureLog.slice(-1000);
        }

        return temperatureEntry;
    }

    // ============================================================================
    // HIGHLAND FRESH COMPLIANCE
    // ============================================================================

    /**
     * Check Highland Fresh compliance for raw material
     */
    checkHighlandFreshCompliance(rawMaterial) {
        return {
            approved_material: rawMaterial.highland_fresh_approved,
            quality_grade_acceptable: this.isQualityGradeAcceptable(rawMaterial),
            temperature_requirements_met: this.isTemperatureCompliant(rawMaterial),
            shelf_life_acceptable: this.isShelfLifeAcceptable(rawMaterial),
            supplier_approved: rawMaterial.supplier_highland_fresh_approved,
            overall_compliance: this.calculateOverallCompliance(rawMaterial)
        };
    }

    /**
     * Generate Highland Fresh inventory report
     */
    async generateHighlandFreshInventoryReport() {
        const report = {
            report_date: new Date(),
            summary: {
                total_raw_materials: this.inventoryData.size,
                total_batches: this.batchTracking.size,
                highland_fresh_approved_batches: 0,
                non_compliant_batches: 0,
                expiring_soon: 0,
                expired: 0
            },
            raw_materials: [],
            batch_details: [],
            compliance_summary: {
                temperature_violations: 0,
                quality_failures: 0,
                expired_batches: 0,
                non_approved_suppliers: 0
            },
            recommendations: []
        };

        // Analyze inventory data
        for (const [materialId, material] of this.inventoryData) {
            const materialReport = {
                raw_material_id: materialId,
                name: material.name,
                category: material.category,
                current_stock: material.quantity_on_hand,
                reorder_level: material.reorder_level,
                highland_fresh_approved: material.highland_fresh_approved,
                compliance_status: this.checkHighlandFreshCompliance(material)
            };

            report.raw_materials.push(materialReport);
        }

        // Analyze batch data
        for (const [batchId, batch] of this.batchTracking) {
            const batchReport = {
                batch_id: batchId,
                highland_fresh_batch_code: batch.highland_fresh_batch_code,
                raw_material_name: batch.raw_material_name,
                supplier_name: batch.supplier_name,
                received_date: batch.received_date,
                expiry_date: batch.expiry_date,
                current_quantity: batch.current_quantity,
                status: batch.status,
                highland_fresh_compliance: batch.highland_fresh_compliance
            };

            report.batch_details.push(batchReport);

            // Update summary counts
            if (batch.highland_fresh_approved) {
                report.summary.highland_fresh_approved_batches++;
            }
            if (!batch.highland_fresh_compliance.overall_compliance) {
                report.summary.non_compliant_batches++;
            }
            if (batch.status === 'EXPIRED') {
                report.summary.expired++;
                report.compliance_summary.expired_batches++;
            }
        }

        // Generate recommendations
        report.recommendations = this.generateInventoryRecommendations(report);

        console.log('Highland Fresh inventory report generated:', report);
        return report;
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    calculateExpiryDate(receiptData) {
        const receivedDate = new Date(receiptData.received_date || new Date());
        const shelfLifeDays = receiptData.shelf_life_days || 30; // Default 30 days
        return new Date(receivedDate.getTime() + (shelfLifeDays * 24 * 60 * 60 * 1000));
    }

    async updateInventoryLevels(rawMaterialId, quantity, operation) {
        const material = this.inventoryData.get(rawMaterialId);
        if (material) {
            if (operation === 'ADD') {
                material.quantity_on_hand += quantity;
            } else if (operation === 'SUBTRACT') {
                material.quantity_on_hand = Math.max(0, material.quantity_on_hand - quantity);
            }
            material.last_updated = new Date();
        }
    }

    isTemperatureCompliant(data) {
        const temp = parseFloat(data.temperature_at_receipt || data.storage_temp_min || 0);
        const minTemp = parseFloat(data.storage_temp_min || 2.0);
        const maxTemp = parseFloat(data.storage_temp_max || 6.0);
        return temp >= minTemp && temp <= maxTemp;
    }

    isQualityGradeAcceptable(data) {
        const grade = data.quality_grade_received || data.quality_grade;
        const acceptableGrades = ['Premium', 'Standard', 'Grade A', 'Grade B'];
        return acceptableGrades.includes(grade);
    }

    generateConsumptionId() {
        return `HF-CONS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }

    generateTestId() {
        return `HF-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }

    generateLogId() {
        return `HF-LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }

    getNextSequenceNumber() {
        // In production, this would query the database for the next sequence
        return Math.floor(Math.random() * 999) + 1;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RawMaterialInventoryTracker;
} else if (typeof window !== 'undefined') {
    window.RawMaterialInventoryTracker = RawMaterialInventoryTracker;
}
