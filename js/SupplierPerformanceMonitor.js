/**
 * Highland Fresh Supplier Performance Monitoring System
 * Comprehensive supplier scorecards and performance tracking
 * 
 * Features:
 * - Real-time supplier scorecards
 * - Delivery timeliness tracking
 * - Quality compliance monitoring
 * - Raw material consistency analysis
 * - NMFDC member performance tracking
 * - Highland Fresh certification compliance
 * - Performance alerts and notifications
 * - Supplier ranking and evaluation
 * - Automated performance reviews
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

class SupplierPerformanceMonitor {
    constructor() {
        this.apiUrl = 'api/SupplierPerformanceAPI.php';
        this.suppliers = new Map();
        this.performanceMetrics = {};
        this.scorecards = new Map();
        this.performanceAlerts = [];
        this.monitoringEnabled = true;
        this.refreshInterval = 300000; // 5 minutes
        
        this.initializeMonitoring();
    }

    // ============================================================================
    // INITIALIZATION & SETUP
    // ============================================================================

    async initializeMonitoring() {
        try {
            await this.loadSuppliers();
            await this.loadPerformanceMetrics();
            this.setupPerformanceTracking();
            this.setupScoreCards();
            this.setupAlertSystem();
            this.startMonitoring();
            
            console.log('Highland Fresh Supplier Performance Monitoring initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supplier Performance Monitor:', error);
            throw error;
        }
    }

    async loadSuppliers() {
        try {
            const response = await axios.get(`${this.apiUrl}?action=getAllSuppliers`, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            // Store suppliers in map for quick access
            result.data.forEach(supplier => {
                this.suppliers.set(supplier.supplier_id, supplier);
            });

            console.log(`Loaded ${this.suppliers.size} suppliers for monitoring`);
            
        } catch (error) {
            console.error('Error loading suppliers:', error);
            throw error;
        }
    }

    async loadPerformanceMetrics() {
        try {
            const response = await axios.get(`${this.apiUrl}?action=getPerformanceMetrics`, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            this.performanceMetrics = result.data;
            
        } catch (error) {
            console.error('Error loading performance metrics:', error);
            throw error;
        }
    }

    // ============================================================================
    // PERFORMANCE TRACKING SYSTEM
    // ============================================================================

    setupPerformanceTracking() {
        // Define Highland Fresh performance criteria
        this.performanceCriteria = {
            delivery: {
                onTimeDelivery: {
                    weight: 25,
                    excellent: 98, // >= 98% on-time
                    good: 95,      // >= 95% on-time
                    acceptable: 90, // >= 90% on-time
                    poor: 85       // < 85% on-time
                },
                leadTimeConsistency: {
                    weight: 15,
                    excellent: 95, // <= 5% variance
                    good: 90,      // <= 10% variance
                    acceptable: 85, // <= 15% variance
                    poor: 80       // > 15% variance
                },
                emergencyResponse: {
                    weight: 10,
                    excellent: 24, // <= 24 hours
                    good: 48,      // <= 48 hours
                    acceptable: 72, // <= 72 hours
                    poor: 96       // > 72 hours
                }
            },
            quality: {
                batchCompliance: {
                    weight: 30,
                    excellent: 99, // >= 99% compliant
                    good: 95,      // >= 95% compliant
                    acceptable: 90, // >= 90% compliant
                    poor: 85       // < 85% compliant
                },
                highlandFreshStandards: {
                    weight: 25,
                    excellent: 98, // >= 98% Highland Fresh approved
                    good: 95,      // >= 95% Highland Fresh approved
                    acceptable: 90, // >= 90% Highland Fresh approved
                    poor: 85       // < 85% Highland Fresh approved
                },
                defectRate: {
                    weight: 15,
                    excellent: 1,  // <= 1% defect rate
                    good: 2,       // <= 2% defect rate
                    acceptable: 5,  // <= 5% defect rate
                    poor: 10       // > 5% defect rate
                }
            },
            consistency: {
                materialQuality: {
                    weight: 20,
                    excellent: 95, // <= 5% variance
                    good: 90,      // <= 10% variance
                    acceptable: 85, // <= 15% variance
                    poor: 80       // > 15% variance
                },
                pricing: {
                    weight: 10,
                    excellent: 95, // <= 5% variance
                    good: 90,      // <= 10% variance
                    acceptable: 85, // <= 15% variance
                    poor: 80       // > 15% variance
                },
                packaging: {
                    weight: 10,
                    excellent: 98, // <= 2% issues
                    good: 95,      // <= 5% issues
                    acceptable: 90, // <= 10% issues
                    poor: 85       // > 10% issues
                }
            },
            compliance: {
                certifications: {
                    weight: 25,
                    excellent: 100, // All certifications current
                    good: 95,       // Minor certification delays
                    acceptable: 90,  // Some certification issues
                    poor: 85        // Major certification problems
                },
                nmfdcMembership: {
                    weight: 20,
                    excellent: 100, // Active NMFDC member with good standing
                    good: 90,       // NMFDC member with minor issues
                    acceptable: 70,  // Non-NMFDC but compliant
                    poor: 50        // Non-NMFDC with compliance issues
                },
                documentation: {
                    weight: 15,
                    excellent: 98, // >= 98% complete documentation
                    good: 95,      // >= 95% complete documentation
                    acceptable: 90, // >= 90% complete documentation
                    poor: 85       // < 90% complete documentation
                }
            }
        };
    }

    // ============================================================================
    // SCORECARD GENERATION
    // ============================================================================

    setupScoreCards() {
        // Define scorecard structure
        this.scorecardTemplate = {
            supplierId: null,
            supplierName: '',
            supplierType: '',
            isNMFDCMember: false,
            overallScore: 0,
            performanceGrade: '',
            lastUpdated: null,
            categories: {
                delivery: {
                    score: 0,
                    grade: '',
                    metrics: {}
                },
                quality: {
                    score: 0,
                    grade: '',
                    metrics: {}
                },
                consistency: {
                    score: 0,
                    grade: '',
                    metrics: {}
                },
                compliance: {
                    score: 0,
                    grade: '',
                    metrics: {}
                }
            },
            trends: {
                thirtyDay: 0,
                ninetyDay: 0,
                yearToDate: 0
            },
            recommendations: [],
            alerts: [],
            nextReviewDate: null
        };
    }

    async generateSupplierScorecard(supplierId, dateRange = 'last_30_days') {
        try {
            console.log(`Generating scorecard for supplier ${supplierId}`);

            const supplier = this.suppliers.get(supplierId);
            if (!supplier) {
                throw new Error(`Supplier not found: ${supplierId}`);
            }

            // Create scorecard from template
            const scorecard = JSON.parse(JSON.stringify(this.scorecardTemplate));
            scorecard.supplierId = supplierId;
            scorecard.supplierName = supplier.name;
            scorecard.supplierType = supplier.supplier_type;
            scorecard.isNMFDCMember = supplier.is_nmfdc_member === 1;
            scorecard.lastUpdated = new Date().toISOString();

            // Get performance data
            const performanceData = await this.getSupplierPerformanceData(supplierId, dateRange);

            // Calculate delivery performance
            scorecard.categories.delivery = await this.calculateDeliveryScore(performanceData.delivery);

            // Calculate quality performance
            scorecard.categories.quality = await this.calculateQualityScore(performanceData.quality);

            // Calculate consistency performance
            scorecard.categories.consistency = await this.calculateConsistencyScore(performanceData.consistency);

            // Calculate compliance performance
            scorecard.categories.compliance = await this.calculateComplianceScore(performanceData.compliance, supplier);

            // Calculate overall score
            scorecard.overallScore = this.calculateOverallScore(scorecard.categories);
            scorecard.performanceGrade = this.getPerformanceGrade(scorecard.overallScore);

            // Calculate trends
            scorecard.trends = await this.calculatePerformanceTrends(supplierId);

            // Generate recommendations
            scorecard.recommendations = this.generateRecommendations(scorecard);

            // Check for alerts
            scorecard.alerts = this.checkPerformanceAlerts(scorecard);

            // Set next review date
            scorecard.nextReviewDate = this.calculateNextReviewDate(scorecard);

            // Store scorecard
            this.scorecards.set(supplierId, scorecard);

            console.log(`Scorecard generated for ${supplier.name}: ${scorecard.overallScore}/100 (${scorecard.performanceGrade})`);
            return scorecard;

        } catch (error) {
            console.error('Error generating supplier scorecard:', error);
            throw error;
        }
    }

    async getSupplierPerformanceData(supplierId, dateRange) {
        try {
            const response = await axios.get(`${this.apiUrl}?action=getSupplierPerformanceData&supplierId=${supplierId}&dateRange=${dateRange}`, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error fetching supplier performance data:', error);
            throw error;
        }
    }

    // ============================================================================
    // PERFORMANCE CALCULATION METHODS
    // ============================================================================

    async calculateDeliveryScore(deliveryData) {
        const criteria = this.performanceCriteria.delivery;
        const score = {
            score: 0,
            grade: '',
            metrics: {}
        };

        // On-time delivery rate
        const onTimeRate = deliveryData.onTimeDeliveryRate || 0;
        const onTimeScore = this.getMetricScore(onTimeRate, criteria.onTimeDelivery);
        score.metrics.onTimeDelivery = {
            value: onTimeRate,
            score: onTimeScore,
            weight: criteria.onTimeDelivery.weight
        };

        // Lead time consistency
        const leadTimeConsistency = deliveryData.leadTimeConsistency || 0;
        const leadTimeScore = this.getMetricScore(leadTimeConsistency, criteria.leadTimeConsistency);
        score.metrics.leadTimeConsistency = {
            value: leadTimeConsistency,
            score: leadTimeScore,
            weight: criteria.leadTimeConsistency.weight
        };

        // Emergency response time
        const emergencyResponse = deliveryData.averageEmergencyResponse || 96;
        const emergencyScore = this.getMetricScore(emergencyResponse, criteria.emergencyResponse, true); // Lower is better
        score.metrics.emergencyResponse = {
            value: emergencyResponse,
            score: emergencyScore,
            weight: criteria.emergencyResponse.weight
        };

        // Calculate weighted score
        const totalWeight = criteria.onTimeDelivery.weight + criteria.leadTimeConsistency.weight + criteria.emergencyResponse.weight;
        score.score = Math.round(
            (onTimeScore * criteria.onTimeDelivery.weight +
             leadTimeScore * criteria.leadTimeConsistency.weight +
             emergencyScore * criteria.emergencyResponse.weight) / totalWeight
        );

        score.grade = this.getPerformanceGrade(score.score);
        return score;
    }

    async calculateQualityScore(qualityData) {
        const criteria = this.performanceCriteria.quality;
        const score = {
            score: 0,
            grade: '',
            metrics: {}
        };

        // Batch compliance rate
        const batchCompliance = qualityData.batchComplianceRate || 0;
        const batchScore = this.getMetricScore(batchCompliance, criteria.batchCompliance);
        score.metrics.batchCompliance = {
            value: batchCompliance,
            score: batchScore,
            weight: criteria.batchCompliance.weight
        };

        // Highland Fresh standards compliance
        const highlandFreshCompliance = qualityData.highlandFreshApprovalRate || 0;
        const hfScore = this.getMetricScore(highlandFreshCompliance, criteria.highlandFreshStandards);
        score.metrics.highlandFreshStandards = {
            value: highlandFreshCompliance,
            score: hfScore,
            weight: criteria.highlandFreshStandards.weight
        };

        // Defect rate
        const defectRate = qualityData.defectRate || 0;
        const defectScore = this.getMetricScore(defectRate, criteria.defectRate, true); // Lower is better
        score.metrics.defectRate = {
            value: defectRate,
            score: defectScore,
            weight: criteria.defectRate.weight
        };

        // Calculate weighted score
        const totalWeight = criteria.batchCompliance.weight + criteria.highlandFreshStandards.weight + criteria.defectRate.weight;
        score.score = Math.round(
            (batchScore * criteria.batchCompliance.weight +
             hfScore * criteria.highlandFreshStandards.weight +
             defectScore * criteria.defectRate.weight) / totalWeight
        );

        score.grade = this.getPerformanceGrade(score.score);
        return score;
    }

    async calculateConsistencyScore(consistencyData) {
        const criteria = this.performanceCriteria.consistency;
        const score = {
            score: 0,
            grade: '',
            metrics: {}
        };

        // Material quality consistency
        const materialConsistency = consistencyData.materialQualityConsistency || 0;
        const materialScore = this.getMetricScore(materialConsistency, criteria.materialQuality);
        score.metrics.materialQuality = {
            value: materialConsistency,
            score: materialScore,
            weight: criteria.materialQuality.weight
        };

        // Pricing consistency
        const pricingConsistency = consistencyData.pricingConsistency || 0;
        const pricingScore = this.getMetricScore(pricingConsistency, criteria.pricing);
        score.metrics.pricing = {
            value: pricingConsistency,
            score: pricingScore,
            weight: criteria.pricing.weight
        };

        // Packaging consistency
        const packagingConsistency = consistencyData.packagingConsistency || 0;
        const packagingScore = this.getMetricScore(packagingConsistency, criteria.packaging);
        score.metrics.packaging = {
            value: packagingConsistency,
            score: packagingScore,
            weight: criteria.packaging.weight
        };

        // Calculate weighted score
        const totalWeight = criteria.materialQuality.weight + criteria.pricing.weight + criteria.packaging.weight;
        score.score = Math.round(
            (materialScore * criteria.materialQuality.weight +
             pricingScore * criteria.pricing.weight +
             packagingScore * criteria.packaging.weight) / totalWeight
        );

        score.grade = this.getPerformanceGrade(score.score);
        return score;
    }

    async calculateComplianceScore(complianceData, supplier) {
        const criteria = this.performanceCriteria.compliance;
        const score = {
            score: 0,
            grade: '',
            metrics: {}
        };

        // Certifications compliance
        const certificationCompliance = complianceData.certificationCompliance || 0;
        const certScore = this.getMetricScore(certificationCompliance, criteria.certifications);
        score.metrics.certifications = {
            value: certificationCompliance,
            score: certScore,
            weight: criteria.certifications.weight
        };

        // NMFDC membership score
        const nmfdcScore = this.calculateNMFDCScore(supplier, complianceData);
        score.metrics.nmfdcMembership = {
            value: supplier.is_nmfdc_member ? 'Member' : 'Non-Member',
            score: nmfdcScore,
            weight: criteria.nmfdcMembership.weight
        };

        // Documentation compliance
        const documentationCompliance = complianceData.documentationCompliance || 0;
        const docScore = this.getMetricScore(documentationCompliance, criteria.documentation);
        score.metrics.documentation = {
            value: documentationCompliance,
            score: docScore,
            weight: criteria.documentation.weight
        };

        // Calculate weighted score
        const totalWeight = criteria.certifications.weight + criteria.nmfdcMembership.weight + criteria.documentation.weight;
        score.score = Math.round(
            (certScore * criteria.certifications.weight +
             nmfdcScore * criteria.nmfdcMembership.weight +
             docScore * criteria.documentation.weight) / totalWeight
        );

        score.grade = this.getPerformanceGrade(score.score);
        return score;
    }

    calculateNMFDCScore(supplier, complianceData) {
        const criteria = this.performanceCriteria.compliance.nmfdcMembership;
        
        if (supplier.is_nmfdc_member === 1) {
            // NMFDC member - check standing
            const membershipStanding = complianceData.nmfdcStanding || 'good';
            switch (membershipStanding) {
                case 'excellent': return criteria.excellent;
                case 'good': return criteria.good;
                case 'fair': return 80;
                case 'poor': return 60;
                default: return criteria.good;
            }
        } else {
            // Non-NMFDC member - evaluate based on compliance
            const overallCompliance = complianceData.overallCompliance || 0;
            if (overallCompliance >= 95) return criteria.acceptable;
            return criteria.poor;
        }
    }

    // ============================================================================
    // SCORING UTILITY METHODS
    // ============================================================================

    getMetricScore(value, criteria, lowerIsBetter = false) {
        if (lowerIsBetter) {
            if (value <= criteria.excellent) return 100;
            if (value <= criteria.good) return 90;
            if (value <= criteria.acceptable) return 75;
            if (value <= criteria.poor) return 60;
            return 40;
        } else {
            if (value >= criteria.excellent) return 100;
            if (value >= criteria.good) return 90;
            if (value >= criteria.acceptable) return 75;
            if (value >= criteria.poor) return 60;
            return 40;
        }
    }

    calculateOverallScore(categories) {
        const weights = {
            delivery: 25,
            quality: 35,
            consistency: 25,
            compliance: 15
        };

        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        
        return Math.round(
            (categories.delivery.score * weights.delivery +
             categories.quality.score * weights.quality +
             categories.consistency.score * weights.consistency +
             categories.compliance.score * weights.compliance) / totalWeight
        );
    }

    getPerformanceGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'B+';
        if (score >= 80) return 'B';
        if (score >= 75) return 'C+';
        if (score >= 70) return 'C';
        if (score >= 65) return 'D+';
        if (score >= 60) return 'D';
        return 'F';
    }

    // ============================================================================
    // PERFORMANCE TRENDS
    // ============================================================================

    async calculatePerformanceTrends(supplierId) {
        try {
            const response = await axios.get(`${this.apiUrl}?action=getPerformanceTrends&supplierId=${supplierId}`, {
                headers: { 'Content-Type': 'application/json' }
            });

            const result = response.data;
            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Error calculating performance trends:', error);
            return { thirtyDay: 0, ninetyDay: 0, yearToDate: 0 };
        }
    }

    // ============================================================================
    // RECOMMENDATIONS ENGINE
    // ============================================================================

    generateRecommendations(scorecard) {
        const recommendations = [];
        const categories = scorecard.categories;

        // Delivery recommendations
        if (categories.delivery.score < 80) {
            if (categories.delivery.metrics.onTimeDelivery.score < 70) {
                recommendations.push({
                    category: 'delivery',
                    priority: 'HIGH',
                    recommendation: 'Implement delivery schedule optimization and buffer time management',
                    expectedImprovement: '15-20% improvement in on-time delivery'
                });
            }
            if (categories.delivery.metrics.leadTimeConsistency.score < 70) {
                recommendations.push({
                    category: 'delivery',
                    priority: 'MEDIUM',
                    recommendation: 'Establish more predictable production and logistics processes',
                    expectedImprovement: '10-15% improvement in lead time consistency'
                });
            }
        }

        // Quality recommendations
        if (categories.quality.score < 85) {
            if (categories.quality.metrics.batchCompliance.score < 80) {
                recommendations.push({
                    category: 'quality',
                    priority: 'CRITICAL',
                    recommendation: 'Immediate quality control process review and Highland Fresh standards training',
                    expectedImprovement: 'Critical for maintaining Highland Fresh partnership'
                });
            }
            if (categories.quality.metrics.highlandFreshStandards.score < 85) {
                recommendations.push({
                    category: 'quality',
                    priority: 'HIGH',
                    recommendation: 'Review Highland Fresh quality requirements and implement corrective measures',
                    expectedImprovement: 'Maintain Highland Fresh certification status'
                });
            }
        }

        // Consistency recommendations
        if (categories.consistency.score < 80) {
            recommendations.push({
                category: 'consistency',
                priority: 'MEDIUM',
                recommendation: 'Implement statistical process control for improved material consistency',
                expectedImprovement: '10-15% improvement in product consistency'
            });
        }

        // Compliance recommendations
        if (categories.compliance.score < 85) {
            recommendations.push({
                category: 'compliance',
                priority: 'HIGH',
                recommendation: 'Review certification requirements and documentation processes',
                expectedImprovement: 'Ensure continued Highland Fresh compliance'
            });
        }

        // NMFDC membership recommendation
        if (!scorecard.isNMFDCMember && scorecard.supplierType === 'dairy') {
            recommendations.push({
                category: 'strategic',
                priority: 'MEDIUM',
                recommendation: 'Consider NMFDC membership for enhanced partnership opportunities',
                expectedImprovement: 'Potential for improved terms and Highland Fresh priority status'
            });
        }

        return recommendations;
    }

    // ============================================================================
    // ALERT SYSTEM
    // ============================================================================

    setupAlertSystem() {
        this.alertThresholds = {
            overall_performance_critical: 60,
            overall_performance_warning: 75,
            quality_critical: 70,
            delivery_critical: 70,
            highland_fresh_compliance_critical: 85
        };
    }

    checkPerformanceAlerts(scorecard) {
        const alerts = [];

        // Overall performance alerts
        if (scorecard.overallScore < this.alertThresholds.overall_performance_critical) {
            alerts.push({
                type: 'CRITICAL_PERFORMANCE',
                severity: 'CRITICAL',
                message: `Overall performance critically low: ${scorecard.overallScore}/100`,
                action_required: 'Immediate supplier review and corrective action plan'
            });
        } else if (scorecard.overallScore < this.alertThresholds.overall_performance_warning) {
            alerts.push({
                type: 'PERFORMANCE_WARNING',
                severity: 'WARNING',
                message: `Performance below acceptable threshold: ${scorecard.overallScore}/100`,
                action_required: 'Schedule performance improvement discussion'
            });
        }

        // Quality alerts
        if (scorecard.categories.quality.score < this.alertThresholds.quality_critical) {
            alerts.push({
                type: 'QUALITY_CRITICAL',
                severity: 'CRITICAL',
                message: `Quality performance critically low: ${scorecard.categories.quality.score}/100`,
                action_required: 'Immediate quality audit and Highland Fresh standards review'
            });
        }

        // Highland Fresh compliance alerts
        const hfStandardsScore = scorecard.categories.quality.metrics.highlandFreshStandards?.score || 0;
        if (hfStandardsScore < this.alertThresholds.highland_fresh_compliance_critical) {
            alerts.push({
                type: 'HIGHLAND_FRESH_COMPLIANCE',
                severity: 'CRITICAL',
                message: `Highland Fresh standards compliance below threshold: ${hfStandardsScore}/100`,
                action_required: 'Immediate Highland Fresh compliance review required'
            });
        }

        // Delivery alerts
        if (scorecard.categories.delivery.score < this.alertThresholds.delivery_critical) {
            alerts.push({
                type: 'DELIVERY_PERFORMANCE',
                severity: 'HIGH',
                message: `Delivery performance issues: ${scorecard.categories.delivery.score}/100`,
                action_required: 'Review delivery processes and logistics'
            });
        }

        return alerts;
    }

    // ============================================================================
    // MONITORING AND AUTOMATION
    // ============================================================================

    startMonitoring() {
        console.log('Starting Highland Fresh supplier performance monitoring...');

        // Monitor all suppliers periodically
        setInterval(() => {
            this.performScheduledMonitoring();
        }, this.refreshInterval);

        // Daily scorecard updates
        setInterval(() => {
            this.updateAllScorecards();
        }, 86400000); // 24 hours

        // Real-time alert monitoring
        setInterval(() => {
            this.checkRealTimeAlerts();
        }, 60000); // 1 minute
    }

    async performScheduledMonitoring() {
        if (!this.monitoringEnabled) return;

        try {
            console.log('Performing scheduled supplier monitoring...');

            // Update performance data for all suppliers
            for (const [supplierId, supplier] of this.suppliers) {
                try {
                    await this.updateSupplierPerformance(supplierId);
                } catch (error) {
                    console.error(`Error monitoring supplier ${supplierId}:`, error);
                }
            }

            console.log('Scheduled monitoring completed');

        } catch (error) {
            console.error('Error during scheduled monitoring:', error);
        }
    }

    async updateAllScorecards() {
        try {
            console.log('Updating all supplier scorecards...');

            for (const [supplierId] of this.suppliers) {
                try {
                    await this.generateSupplierScorecard(supplierId);
                } catch (error) {
                    console.error(`Error updating scorecard for supplier ${supplierId}:`, error);
                }
            }

            console.log('All scorecards updated');

        } catch (error) {
            console.error('Error updating scorecards:', error);
        }
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    async getSupplierScorecard(supplierId) {
        // Check if we have a current scorecard
        if (this.scorecards.has(supplierId)) {
            const scorecard = this.scorecards.get(supplierId);
            const age = Date.now() - new Date(scorecard.lastUpdated).getTime();
            
            // Return cached scorecard if it's less than 1 hour old
            if (age < 3600000) {
                return scorecard;
            }
        }

        // Generate new scorecard
        return await this.generateSupplierScorecard(supplierId);
    }

    getAllSupplierScorecards() {
        return Array.from(this.scorecards.values());
    }

    getTopPerformingSuppliers(limit = 10) {
        const scorecards = this.getAllSupplierScorecards();
        return scorecards
            .sort((a, b) => b.overallScore - a.overallScore)
            .slice(0, limit);
    }

    getUnderperformingSuppliers(threshold = 75) {
        const scorecards = this.getAllSupplierScorecards();
        return scorecards.filter(scorecard => scorecard.overallScore < threshold);
    }

    getPerformanceAlerts() {
        return this.performanceAlerts.filter(alert => alert.status === 'ACTIVE');
    }

    async exportPerformanceReport(format = 'csv') {
        try {
            const response = await axios.get(`${this.apiUrl}?action=exportPerformanceReport&format=${format}`, {
                headers: { 'Content-Type': 'application/json' },
                responseType: 'blob'
            });

            if (format === 'csv') {
                const blob = response.data;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `highland-fresh-supplier-performance-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            }

        } catch (error) {
            console.error('Error exporting performance report:', error);
            throw error;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    calculateNextReviewDate(scorecard) {
        const baseDate = new Date();
        const score = scorecard.overallScore;

        // Schedule more frequent reviews for underperforming suppliers
        if (score < 70) {
            baseDate.setDate(baseDate.getDate() + 7); // Weekly review
        } else if (score < 85) {
            baseDate.setDate(baseDate.getDate() + 14); // Bi-weekly review
        } else {
            baseDate.setMonth(baseDate.getMonth() + 1); // Monthly review
        }

        return baseDate.toISOString();
    }

    enableMonitoring() {
        this.monitoringEnabled = true;
        console.log('Supplier performance monitoring enabled');
    }

    disableMonitoring() {
        this.monitoringEnabled = false;
        console.log('Supplier performance monitoring disabled');
    }

    async updateSupplierPerformance(supplierId) {
        // This method would typically trigger real-time data collection
        // For now, it's a placeholder for future implementation
        console.log(`Updating performance data for supplier ${supplierId}`);
    }

    async checkRealTimeAlerts() {
        // Check for immediate performance issues
        // Implementation would monitor for critical threshold breaches
        console.log('Checking real-time performance alerts...');
    }
}

// Initialize Supplier Performance Monitor
let supplierPerformanceMonitor;

document.addEventListener('DOMContentLoaded', function() {
    supplierPerformanceMonitor = new SupplierPerformanceMonitor();
});

// Export for global access
window.SupplierPerformanceMonitor = SupplierPerformanceMonitor;
