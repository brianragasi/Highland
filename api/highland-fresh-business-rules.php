<?php
/**
 * Highland Fresh Business Rule Engine (PHP)
 * Server-side business logic enforcement for Highland Fresh raw materials procurement
 * 
 * This engine prevents Highland Fresh from purchasing its own branded products
 * and enforces proper raw material sourcing from appropriate supplier categories.
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

class HighlandFreshBusinessRuleEngine {
    private $rules = [];
    private $violations = [];
    private $pdo;

    public function __construct($pdo = null) {
        $this->pdo = $pdo;
        $this->initializeBusinessRules();
    }

    /**
     * Initialize all Highland Fresh business rules
     */
    private function initializeBusinessRules() {
        // Rule 1: Highland Fresh Branded Product Purchase Prevention
        $this->addRule('NO_HIGHLAND_FRESH_PRODUCTS', [
            'description' => 'Highland Fresh cannot purchase its own branded products',
            'priority' => 'CRITICAL',
            'category' => 'PRODUCT_PROCUREMENT',
            'validate' => [$this, 'validateNoHighlandFreshProducts'],
            'message' => 'Highland Fresh Business Policy: Cannot purchase Highland Fresh branded products. Highland Fresh produces these items, not procures them.'
        ]);

        // Rule 2: Supplier Type Compatibility
        $this->addRule('SUPPLIER_MATERIAL_COMPATIBILITY', [
            'description' => 'Suppliers can only provide materials matching their category',
            'priority' => 'HIGH',
            'category' => 'SUPPLIER_MANAGEMENT',
            'validate' => [$this, 'validateSupplierMaterialCompatibility'],
            'message' => 'Highland Fresh Business Policy: Supplier type does not match requested materials.'
        ]);

        // Rule 3: NMFDC Membership for Dairy Suppliers
        $this->addRule('NMFDC_MEMBERSHIP_REQUIRED', [
            'description' => 'Dairy suppliers must be NMFDC members',
            'priority' => 'HIGH',
            'category' => 'DAIRY_PROCUREMENT',
            'validate' => [$this, 'validateNMFDCMembership'],
            'message' => 'Highland Fresh Policy: Dairy suppliers must be Northern Mindanao Federation of Dairy Cooperatives (NMFDC) members.'
        ]);

        // Rule 4: Cold Chain Temperature Requirements
        $this->addRule('COLD_CHAIN_TEMPERATURE', [
            'description' => 'Cold chain temperature must be within Highland Fresh standards',
            'priority' => 'HIGH',
            'category' => 'QUALITY_ASSURANCE',
            'validate' => [$this, 'validateColdChainTemperature'],
            'message' => 'Highland Fresh Quality Standard: Cold chain temperature must be between 2.0°C and 6.0°C for dairy products.'
        ]);

        // Rule 5: Quality Grade Requirements
        $this->addRule('QUALITY_GRADE_VALIDATION', [
            'description' => 'Quality grades must match Highland Fresh standards',
            'priority' => 'MEDIUM',
            'category' => 'QUALITY_ASSURANCE',
            'validate' => [$this, 'validateQualityGrade'],
            'message' => 'Highland Fresh Quality Standard: Invalid quality grade specified.'
        ]);

        // Rule 6: Minimum Order Quantities
        $this->addRule('MINIMUM_ORDER_QUANTITY', [
            'description' => 'Orders must meet minimum quantity requirements',
            'priority' => 'MEDIUM',
            'category' => 'OPERATIONAL_EFFICIENCY',
            'validate' => [$this, 'validateMinimumOrderQuantity'],
            'message' => 'Highland Fresh Operational Policy: Order quantities must meet minimum requirements for operational efficiency.'
        ]);

        // Rule 7: Supplier Approval Status
        $this->addRule('SUPPLIER_APPROVAL_STATUS', [
            'description' => 'Only approved suppliers can be used for Highland Fresh procurement',
            'priority' => 'CRITICAL',
            'category' => 'SUPPLIER_MANAGEMENT',
            'validate' => [$this, 'validateSupplierApprovalStatus'],
            'message' => 'Highland Fresh Business Policy: Only pre-approved suppliers can be used for Highland Fresh procurement.'
        ]);

        // Rule 8: Packaging Food Grade Requirements
        $this->addRule('PACKAGING_FOOD_GRADE', [
            'description' => 'Packaging materials must be food grade certified',
            'priority' => 'CRITICAL',
            'category' => 'FOOD_SAFETY',
            'validate' => [$this, 'validatePackagingFoodGrade'],
            'message' => 'Highland Fresh Food Safety: All packaging materials must be FDA approved and BPA-free for food contact.'
        ]);

        // Rule 9: Batch Tracking Code Format
        $this->addRule('BATCH_TRACKING_FORMAT', [
            'description' => 'Batch tracking codes must follow Highland Fresh format',
            'priority' => 'MEDIUM',
            'category' => 'TRACEABILITY',
            'validate' => [$this, 'validateBatchTrackingFormat'],
            'message' => 'Highland Fresh Traceability: Batch tracking code must follow format HF-BATCH-YYYYMMDD-XXX.'
        ]);

        // Rule 10: Raw Material vs Finished Product Distinction
        $this->addRule('RAW_MATERIAL_ONLY', [
            'description' => 'Purchase orders should prioritize raw materials over finished products',
            'priority' => 'HIGH',
            'category' => 'PROCUREMENT_STRATEGY',
            'validate' => [$this, 'validateRawMaterialPriority'],
            'message' => 'Highland Fresh Procurement Strategy: Prioritize raw materials procurement over finished product purchases.'
        ]);
    }

    /**
     * Add a new business rule to the engine
     */
    public function addRule($ruleId, $rule) {
        if (!isset($rule['validate']) || !is_callable($rule['validate'])) {
            throw new Exception('Business rule must have a callable validate function');
        }
        
        $this->rules[$ruleId] = [
            'id' => $ruleId,
            'description' => $rule['description'] ?? 'No description provided',
            'priority' => $rule['priority'] ?? 'MEDIUM',
            'category' => $rule['category'] ?? 'GENERAL',
            'validate' => $rule['validate'],
            'message' => $rule['message'] ?? 'Business rule violation',
            'enabled' => $rule['enabled'] ?? true,
            'created_at' => new DateTime()
        ];
    }

    /**
     * Validate a context against all applicable business rules
     */
    public function validate($context) {
        $this->violations = [];
        $results = [
            'valid' => true,
            'violations' => [],
            'warnings' => [],
            'rule_results' => []
        ];

        foreach ($this->rules as $ruleId => $rule) {
            if (!$rule['enabled']) continue;

            try {
                $ruleResult = call_user_func($rule['validate'], $context);
                $results['rule_results'][$ruleId] = $ruleResult;

                if (!$ruleResult['valid']) {
                    $violation = [
                        'rule_id' => $ruleId,
                        'rule_name' => $rule['description'],
                        'priority' => $rule['priority'],
                        'category' => $rule['category'],
                        'message' => $ruleResult['message'] ?? $rule['message'],
                        'details' => $ruleResult['details'] ?? null,
                        'timestamp' => new DateTime()
                    ];

                    if ($rule['priority'] === 'CRITICAL' || $rule['priority'] === 'HIGH') {
                        $results['violations'][] = $violation;
                        $results['valid'] = false;
                    } else {
                        $results['warnings'][] = $violation;
                    }

                    $this->violations[] = $violation;
                }
            } catch (Exception $e) {
                error_log("Error validating rule {$ruleId}: " . $e->getMessage());
                $results['warnings'][] = [
                    'rule_id' => $ruleId,
                    'rule_name' => $rule['description'],
                    'priority' => 'ERROR',
                    'category' => 'SYSTEM',
                    'message' => "Rule validation error: " . $e->getMessage(),
                    'details' => $e,
                    'timestamp' => new DateTime()
                ];
            }
        }

        return $results;
    }

    // ============================================================================
    // BUSINESS RULE VALIDATION METHODS
    // ============================================================================

    /**
     * Rule 1: Validate no Highland Fresh products are being purchased
     */
    public function validateNoHighlandFreshProducts($context) {
        $items = $context['items'] ?? [];
        
        if (!is_array($items)) {
            return ['valid' => true];
        }

        $highlandFreshProducts = [];
        foreach ($items as $item) {
            $name = strtolower($item['product_name'] ?? $item['name'] ?? '');
            if (strpos($name, 'highland fresh') !== false || 
                strpos($name, 'hf-') !== false || 
                strpos($name, 'hf ') !== false ||
                strpos($name, 'hf') === 0) {
                $highlandFreshProducts[] = $item;
            }
        }

        if (!empty($highlandFreshProducts)) {
            $productNames = array_map(function($p) {
                return $p['product_name'] ?? $p['name'];
            }, $highlandFreshProducts);
            
            return [
                'valid' => false,
                'message' => 'Cannot purchase Highland Fresh branded products: ' . implode(', ', $productNames),
                'details' => ['violating_products' => $highlandFreshProducts]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 2: Validate supplier-material compatibility
     */
    public function validateSupplierMaterialCompatibility($context) {
        $supplier = $context['supplier'] ?? null;
        $items = $context['items'] ?? [];
        $purchaseType = $context['purchase_type'] ?? null;
        
        if (!$supplier || !is_array($items)) {
            return ['valid' => true];
        }

        $supplierType = strtolower($supplier['supplier_type'] ?? '');
        $supplierCategory = $supplier['highland_fresh_material_category'] ?? $this->categorizeSupplier($supplier);
        
        $incompatibleItems = [];
        foreach ($items as $item) {
            if (!$this->isSupplierItemCompatible($supplierCategory, $item, $purchaseType)) {
                $incompatibleItems[] = $item;
            }
        }

        if (!empty($incompatibleItems)) {
            $itemNames = array_map(function($i) {
                return $i['product_name'] ?? $i['name'];
            }, $incompatibleItems);
            
            return [
                'valid' => false,
                'message' => "Supplier \"{$supplier['name']}\" cannot provide: " . implode(', ', $itemNames),
                'details' => [
                    'supplier_category' => $supplierCategory,
                    'incompatible_items' => $incompatibleItems
                ]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 3: Validate NMFDC membership for dairy suppliers
     */
    public function validateNMFDCMembership($context) {
        $supplier = $context['supplier'] ?? null;
        $purchaseType = $context['purchase_type'] ?? null;
        
        if ($purchaseType !== 'raw_milk' || !$supplier) {
            return ['valid' => true];
        }

        $supplierType = strtolower($supplier['supplier_type'] ?? '');
        $isDairySupplier = strpos($supplierType, 'dairy') !== false || strpos($supplierType, 'cooperative') !== false;
        
        if ($isDairySupplier && !($supplier['is_nmfdc_member'] ?? false)) {
            return [
                'valid' => false,
                'message' => "Dairy supplier \"{$supplier['name']}\" must be an NMFDC member for raw milk procurement",
                'details' => ['supplier' => $supplier]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 4: Validate cold chain temperature requirements
     */
    public function validateColdChainTemperature($context) {
        $coldChainTempMin = $context['cold_chain_temp_min'] ?? null;
        $coldChainTempMax = $context['cold_chain_temp_max'] ?? null;
        $purchaseType = $context['purchase_type'] ?? null;
        
        if ($purchaseType !== 'raw_milk' || (!$coldChainTempMin && !$coldChainTempMax)) {
            return ['valid' => true];
        }

        $minTemp = floatval($coldChainTempMin);
        $maxTemp = floatval($coldChainTempMax);

        if (!is_numeric($coldChainTempMin) || !is_numeric($coldChainTempMax)) {
            return [
                'valid' => false,
                'message' => 'Cold chain temperatures must be valid numbers',
                'details' => ['min_temp' => $coldChainTempMin, 'max_temp' => $coldChainTempMax]
            ];
        }

        if ($minTemp < 2.0 || $maxTemp > 6.0 || $minTemp >= $maxTemp) {
            return [
                'valid' => false,
                'message' => 'Cold chain temperature must be between 2.0°C and 6.0°C with min < max',
                'details' => ['min_temp' => $minTemp, 'max_temp' => $maxTemp]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 5: Validate quality grade requirements
     */
    public function validateQualityGrade($context) {
        $qualityGrade = $context['quality_grade'] ?? null;
        $purchaseType = $context['purchase_type'] ?? null;
        
        if (!$qualityGrade) {
            return ['valid' => true];
        }

        $validGrades = [
            'raw_milk' => ['Grade A', 'Grade B', 'Grade C'],
            'packaging' => ['Premium', 'Standard'],
            'cultures' => ['Laboratory Grade', 'Commercial Grade']
        ];

        $allowedGrades = $validGrades[$purchaseType] ?? ['Premium', 'Standard', 'Economy'];
        
        if (!in_array($qualityGrade, $allowedGrades)) {
            return [
                'valid' => false,
                'message' => "Invalid quality grade \"{$qualityGrade}\" for {$purchaseType}. Allowed: " . implode(', ', $allowedGrades),
                'details' => ['quality_grade' => $qualityGrade, 'allowed_grades' => $allowedGrades]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 6: Validate minimum order quantities
     */
    public function validateMinimumOrderQuantity($context) {
        $items = $context['items'] ?? [];
        
        if (!is_array($items)) {
            return ['valid' => true];
        }

        $belowMinimumItems = [];
        foreach ($items as $item) {
            $quantity = floatval($item['quantity'] ?? 0);
            if ($quantity < 1) { // Highland Fresh minimum is 1 unit
                $belowMinimumItems[] = $item;
            }
        }

        if (!empty($belowMinimumItems)) {
            $itemNames = array_map(function($i) {
                return $i['product_name'] ?? $i['name'];
            }, $belowMinimumItems);
            
            return [
                'valid' => false,
                'message' => 'Items below minimum order quantity (1 unit): ' . implode(', ', $itemNames),
                'details' => ['below_minimum_items' => $belowMinimumItems]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 7: Validate supplier approval status
     */
    public function validateSupplierApprovalStatus($context) {
        $supplier = $context['supplier'] ?? null;
        
        if (!$supplier) {
            return ['valid' => true];
        }

        if (!($supplier['highland_fresh_approved'] ?? true)) {
            return [
                'valid' => false,
                'message' => "Supplier \"{$supplier['name']}\" is not approved for Highland Fresh procurement",
                'details' => ['supplier' => $supplier]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 8: Validate packaging food grade requirements
     */
    public function validatePackagingFoodGrade($context) {
        $purchaseType = $context['purchase_type'] ?? null;
        $fdaApproved = $context['fda_approved'] ?? null;
        $bpaFree = $context['bpa_free'] ?? null;
        
        if ($purchaseType !== 'packaging') {
            return ['valid' => true];
        }

        $violations = [];
        
        if (!$fdaApproved) {
            $violations[] = 'FDA approved for food contact';
        }
        
        if (!$bpaFree) {
            $violations[] = 'BPA-free certification';
        }

        if (!empty($violations)) {
            return [
                'valid' => false,
                'message' => 'Packaging materials missing required certifications: ' . implode(', ', $violations),
                'details' => ['missing_certifications' => $violations]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 9: Validate batch tracking code format
     */
    public function validateBatchTrackingFormat($context) {
        $batchTrackingCode = $context['batch_tracking_code'] ?? null;
        
        if (!$batchTrackingCode) {
            return ['valid' => true]; // Optional field
        }

        $batchPattern = '/^HF-BATCH-\d{8}-\d{3}$/';
        
        if (!preg_match($batchPattern, $batchTrackingCode)) {
            return [
                'valid' => false,
                'message' => "Invalid batch tracking code format. Expected: HF-BATCH-YYYYMMDD-XXX, got: {$batchTrackingCode}",
                'details' => ['batch_tracking_code' => $batchTrackingCode]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Rule 10: Validate raw material priority
     */
    public function validateRawMaterialPriority($context) {
        $items = $context['items'] ?? [];
        
        if (!is_array($items)) {
            return ['valid' => true];
        }

        $rawMaterialItems = [];
        $finishedProductItems = [];
        
        foreach ($items as $item) {
            if (isset($item['raw_material_id'])) {
                $rawMaterialItems[] = $item;
            } elseif (isset($item['product_id'])) {
                $finishedProductItems[] = $item;
            }
        }

        if (!empty($rawMaterialItems) && !empty($finishedProductItems)) {
            return [
                'valid' => false,
                'message' => 'Highland Fresh Procurement Strategy: Avoid mixing raw materials and finished products in same purchase order',
                'details' => [
                    'raw_material_count' => count($rawMaterialItems),
                    'finished_product_count' => count($finishedProductItems)
                ]
            ];
        }

        return ['valid' => true];
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    /**
     * Categorize supplier for Highland Fresh business logic
     */
    private function categorizeSupplier($supplier) {
        $type = strtolower($supplier['supplier_type'] ?? '');
        
        if (strpos($type, 'dairy') !== false || strpos($type, 'cooperative') !== false) {
            return 'dairy_cooperative';
        } elseif (strpos($type, 'packaging') !== false) {
            return 'packaging_supplier';
        } elseif (strpos($type, 'culture') !== false || strpos($type, 'ingredient') !== false) {
            return 'culture_supplier';
        } else {
            return 'general_supplier';
        }
    }

    /**
     * Check if supplier can provide specific item
     */
    private function isSupplierItemCompatible($supplierCategory, $item, $purchaseType) {
        $itemName = strtolower($item['product_name'] ?? $item['name'] ?? '');
        $itemCategory = strtolower($item['category'] ?? '');
        
        switch ($supplierCategory) {
            case 'dairy_cooperative':
                return strpos($itemName, 'milk') !== false || 
                       strpos($itemName, 'cream') !== false || 
                       strpos($itemCategory, 'dairy') !== false ||
                       $purchaseType === 'raw_milk';
                       
            case 'packaging_supplier':
                return strpos($itemName, 'bottle') !== false || 
                       strpos($itemName, 'container') !== false || 
                       strpos($itemName, 'label') !== false ||
                       strpos($itemName, 'cap') !== false ||
                       strpos($itemName, 'seal') !== false ||
                       strpos($itemCategory, 'packaging') !== false ||
                       $purchaseType === 'packaging';
                       
            case 'culture_supplier':
                return strpos($itemName, 'culture') !== false || 
                       strpos($itemName, 'starter') !== false ||
                       strpos($itemName, 'additive') !== false ||
                       strpos($itemCategory, 'culture') !== false ||
                       $purchaseType === 'cultures';
                       
            default:
                return true; // General suppliers can provide general items
        }
    }

    /**
     * Get violations from last validation
     */
    public function getViolations() {
        return $this->violations;
    }

    /**
     * Clear violations history
     */
    public function clearViolations() {
        $this->violations = [];
    }

    /**
     * Get rules summary
     */
    public function getRulesSummary() {
        $summary = [
            'total_rules' => count($this->rules),
            'enabled_rules' => 0,
            'disabled_rules' => 0,
            'categories' => [],
            'priorities' => []
        ];

        foreach ($this->rules as $rule) {
            if ($rule['enabled']) {
                $summary['enabled_rules']++;
            } else {
                $summary['disabled_rules']++;
            }

            // Count by category
            $summary['categories'][$rule['category']] = ($summary['categories'][$rule['category']] ?? 0) + 1;

            // Count by priority
            $summary['priorities'][$rule['priority']] = ($summary['priorities'][$rule['priority']] ?? 0) + 1;
        }

        return $summary;
    }
}

// Create singleton instance for Highland Fresh business rules
$GLOBALS['HighlandFreshBusinessRules'] = new HighlandFreshBusinessRuleEngine();

/**
 * Helper function to get the global business rule engine instance
 */
function getHighlandFreshBusinessRules() {
    return $GLOBALS['HighlandFreshBusinessRules'];
}

?>
