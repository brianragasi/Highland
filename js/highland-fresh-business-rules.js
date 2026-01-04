/**
 * Highland Fresh Business Rule Engine
 * Centralized business logic enforcement for Highland Fresh raw materials procurement
 * 
 * This engine prevents Highland Fresh from purchasing its own branded products
 * and enforces proper raw material sourcing from appropriate supplier categories.
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

class HighlandFreshBusinessRuleEngine {
    constructor() {
        this.rules = new Map();
        this.violations = [];
        this.initializeBusinessRules();
    }

    /**
     * Initialize all Highland Fresh business rules
     */
    initializeBusinessRules() {
        // Rule 1: Highland Fresh Branded Product Purchase Prevention
        this.addRule('NO_HIGHLAND_FRESH_PRODUCTS', {
            description: 'Highland Fresh cannot purchase its own branded products',
            priority: 'CRITICAL',
            category: 'PRODUCT_PROCUREMENT',
            validate: (context) => this.validateNoHighlandFreshProducts(context),
            message: 'Highland Fresh Business Policy: Cannot purchase Highland Fresh branded products. Highland Fresh produces these items, not procures them.'
        });

        // Rule 2: Supplier Type Compatibility
        this.addRule('SUPPLIER_MATERIAL_COMPATIBILITY', {
            description: 'Suppliers can only provide materials matching their category',
            priority: 'HIGH',
            category: 'SUPPLIER_MANAGEMENT',
            validate: (context) => this.validateSupplierMaterialCompatibility(context),
            message: 'Highland Fresh Business Policy: Supplier type does not match requested materials.'
        });

        // Rule 3: NMFDC Membership for Dairy Suppliers
        this.addRule('NMFDC_MEMBERSHIP_REQUIRED', {
            description: 'Dairy suppliers must be NMFDC members',
            priority: 'HIGH',
            category: 'DAIRY_PROCUREMENT',
            validate: (context) => this.validateNMFDCMembership(context),
            message: 'Highland Fresh Policy: Dairy suppliers must be Northern Mindanao Federation of Dairy Cooperatives (NMFDC) members.'
        });

        // Rule 4: Cold Chain Temperature Requirements
        this.addRule('COLD_CHAIN_TEMPERATURE', {
            description: 'Cold chain temperature must be within Highland Fresh standards',
            priority: 'HIGH',
            category: 'QUALITY_ASSURANCE',
            validate: (context) => this.validateColdChainTemperature(context),
            message: 'Highland Fresh Quality Standard: Cold chain temperature must be between 2.0°C and 6.0°C for dairy products.'
        });

        // Rule 5: Quality Grade Requirements
        this.addRule('QUALITY_GRADE_VALIDATION', {
            description: 'Quality grades must match Highland Fresh standards',
            priority: 'MEDIUM',
            category: 'QUALITY_ASSURANCE',
            validate: (context) => this.validateQualityGrade(context),
            message: 'Highland Fresh Quality Standard: Invalid quality grade specified.'
        });

        // Rule 6: Minimum Order Quantities
        this.addRule('MINIMUM_ORDER_QUANTITY', {
            description: 'Orders must meet minimum quantity requirements',
            priority: 'MEDIUM',
            category: 'OPERATIONAL_EFFICIENCY',
            validate: (context) => this.validateMinimumOrderQuantity(context),
            message: 'Highland Fresh Operational Policy: Order quantities must meet minimum requirements for operational efficiency.'
        });

        // Rule 7: Supplier Approval Status
        this.addRule('SUPPLIER_APPROVAL_STATUS', {
            description: 'Only approved suppliers can be used for Highland Fresh procurement',
            priority: 'CRITICAL',
            category: 'SUPPLIER_MANAGEMENT',
            validate: (context) => this.validateSupplierApprovalStatus(context),
            message: 'Highland Fresh Business Policy: Only pre-approved suppliers can be used for Highland Fresh procurement.'
        });

        // Rule 8: Packaging Food Grade Requirements
        this.addRule('PACKAGING_FOOD_GRADE', {
            description: 'Packaging materials must be food grade certified',
            priority: 'CRITICAL',
            category: 'FOOD_SAFETY',
            validate: (context) => this.validatePackagingFoodGrade(context),
            message: 'Highland Fresh Food Safety: All packaging materials must be FDA approved and BPA-free for food contact.'
        });

        // Rule 9: Batch Tracking Code Format
        this.addRule('BATCH_TRACKING_FORMAT', {
            description: 'Batch tracking codes must follow Highland Fresh format',
            priority: 'MEDIUM',
            category: 'TRACEABILITY',
            validate: (context) => this.validateBatchTrackingFormat(context),
            message: 'Highland Fresh Traceability: Batch tracking code must follow format HF-BATCH-YYYYMMDD-XXX.'
        });

        // Rule 10: Raw Material vs Finished Product Distinction
        this.addRule('RAW_MATERIAL_ONLY', {
            description: 'Purchase orders should prioritize raw materials over finished products',
            priority: 'HIGH',
            category: 'PROCUREMENT_STRATEGY',
            validate: (context) => this.validateRawMaterialPriority(context),
            message: 'Highland Fresh Procurement Strategy: Prioritize raw materials procurement over finished product purchases.'
        });
    }

    /**
     * Add a new business rule to the engine
     */
    addRule(ruleId, rule) {
        if (!rule.validate || typeof rule.validate !== 'function') {
            throw new Error('Business rule must have a validate function');
        }
        
        this.rules.set(ruleId, {
            id: ruleId,
            description: rule.description || 'No description provided',
            priority: rule.priority || 'MEDIUM',
            category: rule.category || 'GENERAL',
            validate: rule.validate,
            message: rule.message || 'Business rule violation',
            enabled: rule.enabled !== false,
            createdAt: new Date()
        });
    }

    /**
     * Remove a business rule from the engine
     */
    removeRule(ruleId) {
        return this.rules.delete(ruleId);
    }

    /**
     * Enable or disable a business rule
     */
    toggleRule(ruleId, enabled) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
            return true;
        }
        return false;
    }

    /**
     * Validate a context against all applicable business rules
     */
    async validate(context) {
        this.violations = [];
        const results = {
            valid: true,
            violations: [],
            warnings: [],
            ruleResults: new Map()
        };

        for (const [ruleId, rule] of this.rules) {
            if (!rule.enabled) continue;

            try {
                const ruleResult = await rule.validate(context);
                results.ruleResults.set(ruleId, ruleResult);

                if (!ruleResult.valid) {
                    const violation = {
                        ruleId: ruleId,
                        ruleName: rule.description,
                        priority: rule.priority,
                        category: rule.category,
                        message: ruleResult.message || rule.message,
                        details: ruleResult.details || null,
                        timestamp: new Date()
                    };

                    if (rule.priority === 'CRITICAL' || rule.priority === 'HIGH') {
                        results.violations.push(violation);
                        results.valid = false;
                    } else {
                        results.warnings.push(violation);
                    }

                    this.violations.push(violation);
                }
            } catch (error) {
                console.error(`Error validating rule ${ruleId}:`, error);
                results.warnings.push({
                    ruleId: ruleId,
                    ruleName: rule.description,
                    priority: 'ERROR',
                    category: 'SYSTEM',
                    message: `Rule validation error: ${error.message}`,
                    details: error,
                    timestamp: new Date()
                });
            }
        }

        return results;
    }

    /**
     * Validate specific categories of rules
     */
    async validateCategory(context, category) {
        const categoryRules = new Map();
        for (const [ruleId, rule] of this.rules) {
            if (rule.category === category && rule.enabled) {
                categoryRules.set(ruleId, rule);
            }
        }

        const tempRules = this.rules;
        this.rules = categoryRules;
        const result = await this.validate(context);
        this.rules = tempRules;

        return result;
    }

    /**
     * Get summary of all business rules
     */
    getRulesSummary() {
        const summary = {
            totalRules: this.rules.size,
            enabledRules: 0,
            disabledRules: 0,
            categories: new Map(),
            priorities: new Map()
        };

        for (const rule of this.rules.values()) {
            if (rule.enabled) {
                summary.enabledRules++;
            } else {
                summary.disabledRules++;
            }

            // Count by category
            const categoryCount = summary.categories.get(rule.category) || 0;
            summary.categories.set(rule.category, categoryCount + 1);

            // Count by priority
            const priorityCount = summary.priorities.get(rule.priority) || 0;
            summary.priorities.set(rule.priority, priorityCount + 1);
        }

        return summary;
    }

    // ============================================================================
    // BUSINESS RULE VALIDATION METHODS
    // ============================================================================

    /**
     * Rule 1: Validate no Highland Fresh products are being purchased
     */
    validateNoHighlandFreshProducts(context) {
        const { products, items } = context;
        
        if (!items || !Array.isArray(items)) {
            return { valid: true };
        }

        const highlandFreshProducts = items.filter(item => {
            const name = (item.product_name || item.name || '').toLowerCase();
            return name.includes('highland fresh') || 
                   name.includes('hf-') || 
                   name.includes('hf ') ||
                   name.startsWith('hf');
        });

        if (highlandFreshProducts.length > 0) {
            const productNames = highlandFreshProducts.map(p => p.product_name || p.name).join(', ');
            return {
                valid: false,
                message: `Cannot purchase Highland Fresh branded products: ${productNames}`,
                details: { violatingProducts: highlandFreshProducts }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 2: Validate supplier-material compatibility
     */
    validateSupplierMaterialCompatibility(context) {
        const { supplier, items, purchaseType } = context;
        
        if (!supplier || !items || !Array.isArray(items)) {
            return { valid: true };
        }

        const supplierType = (supplier.supplier_type || '').toLowerCase();
        const supplierCategory = supplier.highland_fresh_material_category || this.categorizeSupplier(supplier);
        
        const incompatibleItems = items.filter(item => {
            return !this.isSupplierItemCompatible(supplierCategory, item, purchaseType);
        });

        if (incompatibleItems.length > 0) {
            const itemNames = incompatibleItems.map(i => i.product_name || i.name).join(', ');
            return {
                valid: false,
                message: `Supplier "${supplier.name}" cannot provide: ${itemNames}`,
                details: { 
                    supplierCategory: supplierCategory,
                    incompatibleItems: incompatibleItems 
                }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 3: Validate NMFDC membership for dairy suppliers
     */
    validateNMFDCMembership(context) {
        const { supplier, purchaseType } = context;
        
        if (purchaseType !== 'raw_milk' || !supplier) {
            return { valid: true };
        }

        const supplierType = (supplier.supplier_type || '').toLowerCase();
        const isDairySupplier = supplierType.includes('dairy') || supplierType.includes('cooperative');
        
        if (isDairySupplier && !supplier.is_nmfdc_member) {
            return {
                valid: false,
                message: `Dairy supplier "${supplier.name}" must be an NMFDC member for raw milk procurement`,
                details: { supplier: supplier }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 4: Validate cold chain temperature requirements
     */
    validateColdChainTemperature(context) {
        const { coldChainTempMin, coldChainTempMax, purchaseType } = context;
        
        if (purchaseType !== 'raw_milk' || (!coldChainTempMin && !coldChainTempMax)) {
            return { valid: true };
        }

        const minTemp = parseFloat(coldChainTempMin);
        const maxTemp = parseFloat(coldChainTempMax);

        if (isNaN(minTemp) || isNaN(maxTemp)) {
            return {
                valid: false,
                message: 'Cold chain temperatures must be valid numbers',
                details: { minTemp: coldChainTempMin, maxTemp: coldChainTempMax }
            };
        }

        if (minTemp < 2.0 || maxTemp > 6.0 || minTemp >= maxTemp) {
            return {
                valid: false,
                message: 'Cold chain temperature must be between 2.0°C and 6.0°C with min < max',
                details: { minTemp: minTemp, maxTemp: maxTemp }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 5: Validate quality grade requirements
     */
    validateQualityGrade(context) {
        const { qualityGrade, purchaseType } = context;
        
        if (!qualityGrade) return { valid: true };

        const validGrades = {
            'raw_milk': ['Grade A', 'Grade B', 'Grade C'],
            'packaging': ['Premium', 'Standard'],
            'cultures': ['Laboratory Grade', 'Commercial Grade']
        };

        const allowedGrades = validGrades[purchaseType] || ['Premium', 'Standard', 'Economy'];
        
        if (!allowedGrades.includes(qualityGrade)) {
            return {
                valid: false,
                message: `Invalid quality grade "${qualityGrade}" for ${purchaseType}. Allowed: ${allowedGrades.join(', ')}`,
                details: { qualityGrade: qualityGrade, allowedGrades: allowedGrades }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 6: Validate minimum order quantities
     */
    validateMinimumOrderQuantity(context) {
        const { items } = context;
        
        if (!items || !Array.isArray(items)) {
            return { valid: true };
        }

        const belowMinimumItems = items.filter(item => {
            const quantity = parseFloat(item.quantity || 0);
            return quantity < 1; // Highland Fresh minimum is 1 unit
        });

        if (belowMinimumItems.length > 0) {
            const itemNames = belowMinimumItems.map(i => i.product_name || i.name).join(', ');
            return {
                valid: false,
                message: `Items below minimum order quantity (1 unit): ${itemNames}`,
                details: { belowMinimumItems: belowMinimumItems }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 7: Validate supplier approval status
     */
    validateSupplierApprovalStatus(context) {
        const { supplier } = context;
        
        if (!supplier) return { valid: true };

        if (supplier.highland_fresh_approved === false || supplier.highland_fresh_approved === 0) {
            return {
                valid: false,
                message: `Supplier "${supplier.name}" is not approved for Highland Fresh procurement`,
                details: { supplier: supplier }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 8: Validate packaging food grade requirements
     */
    validatePackagingFoodGrade(context) {
        const { purchaseType, fdaApproved, bpaFree } = context;
        
        if (purchaseType !== 'packaging') {
            return { valid: true };
        }

        const violations = [];
        
        if (fdaApproved !== true) {
            violations.push('FDA approved for food contact');
        }
        
        if (bpaFree !== true) {
            violations.push('BPA-free certification');
        }

        if (violations.length > 0) {
            return {
                valid: false,
                message: `Packaging materials missing required certifications: ${violations.join(', ')}`,
                details: { missingCertifications: violations }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 9: Validate batch tracking code format
     */
    validateBatchTrackingFormat(context) {
        const { batchTrackingCode } = context;
        
        if (!batchTrackingCode) return { valid: true }; // Optional field

        const batchPattern = /^HF-BATCH-\d{8}-\d{3}$/;
        
        if (!batchPattern.test(batchTrackingCode)) {
            return {
                valid: false,
                message: `Invalid batch tracking code format. Expected: HF-BATCH-YYYYMMDD-XXX, got: ${batchTrackingCode}`,
                details: { batchTrackingCode: batchTrackingCode }
            };
        }

        return { valid: true };
    }

    /**
     * Rule 10: Validate raw material priority
     */
    validateRawMaterialPriority(context) {
        const { items, hasRawMaterials, hasFinishedProducts } = context;
        
        if (!items || !Array.isArray(items)) {
            return { valid: true };
        }

        // Check if mixing raw materials and finished products
        const rawMaterialItems = items.filter(item => item.raw_material_id);
        const finishedProductItems = items.filter(item => item.product_id);

        if (rawMaterialItems.length > 0 && finishedProductItems.length > 0) {
            return {
                valid: false,
                message: 'Highland Fresh Procurement Strategy: Avoid mixing raw materials and finished products in same purchase order',
                details: { 
                    rawMaterialCount: rawMaterialItems.length,
                    finishedProductCount: finishedProductItems.length
                }
            };
        }

        return { valid: true };
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    /**
     * Categorize supplier for Highland Fresh business logic
     */
    categorizeSupplier(supplier) {
        const type = (supplier.supplier_type || '').toLowerCase();
        
        if (type.includes('dairy') || type.includes('cooperative')) {
            return 'dairy_cooperative';
        } else if (type.includes('packaging')) {
            return 'packaging_supplier';
        } else if (type.includes('culture') || type.includes('ingredient')) {
            return 'culture_supplier';
        } else {
            return 'general_supplier';
        }
    }

    /**
     * Check if supplier can provide specific item
     */
    isSupplierItemCompatible(supplierCategory, item, purchaseType) {
        const itemName = (item.product_name || item.name || '').toLowerCase();
        const itemCategory = (item.category || '').toLowerCase();
        
        switch (supplierCategory) {
            case 'dairy_cooperative':
                return itemName.includes('milk') || 
                       itemName.includes('cream') || 
                       itemCategory.includes('dairy') ||
                       purchaseType === 'raw_milk';
                       
            case 'packaging_supplier':
                return itemName.includes('bottle') || 
                       itemName.includes('container') || 
                       itemName.includes('label') ||
                       itemName.includes('cap') ||
                       itemName.includes('seal') ||
                       itemCategory.includes('packaging') ||
                       purchaseType === 'packaging';
                       
            case 'culture_supplier':
                return itemName.includes('culture') || 
                       itemName.includes('starter') ||
                       itemName.includes('additive') ||
                       itemCategory.includes('culture') ||
                       purchaseType === 'cultures';
                       
            default:
                return true; // General suppliers can provide general items
        }
    }

    /**
     * Get violations from last validation
     */
    getViolations() {
        return [...this.violations];
    }

    /**
     * Clear violations history
     */
    clearViolations() {
        this.violations = [];
    }

    /**
     * Export configuration for backup/restore
     */
    exportConfiguration() {
        const config = {
            rules: {},
            version: '1.0.0',
            exportDate: new Date().toISOString()
        };

        for (const [ruleId, rule] of this.rules) {
            config.rules[ruleId] = {
                description: rule.description,
                priority: rule.priority,
                category: rule.category,
                message: rule.message,
                enabled: rule.enabled
                // Note: validate function cannot be serialized
            };
        }

        return config;
    }
}

// Create singleton instance for Highland Fresh business rules
const HighlandFreshBusinessRules = new HighlandFreshBusinessRuleEngine();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HighlandFreshBusinessRuleEngine, HighlandFreshBusinessRules };
} else if (typeof window !== 'undefined') {
    window.HighlandFreshBusinessRuleEngine = HighlandFreshBusinessRuleEngine;
    window.HighlandFreshBusinessRules = HighlandFreshBusinessRules;
}
