/**
 * Highland Fresh Purchase Order Reports System
 * Comprehensive reporting for raw materials procurement
 * 
 * Features:
 * - Raw material purchase reports
 * - Supplier performance metrics
 * - Highland Fresh compliance reporting
 * - Production usage analytics
 * - Cost analysis and trends
 * - NMFDC cooperative reporting
 * 
 * Date: August 28, 2025
 * Author: Highland Fresh System Administrator
 */

class PurchaseOrderReports {
    constructor() {
        this.apiUrl = 'api/PurchaseOrderReportsAPI.php';
        this.chartColors = {
            primary: '#0066cc',
            secondary: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8',
            highland: '#2c5530' // Highland Fresh brand color
        };
        this.dateFormat = 'YYYY-MM-DD';
        this.currentReportType = 'overview';
        this.filters = {
            dateRange: 'last_30_days',
            supplierType: 'all',
            materialCategory: 'all',
            complianceStatus: 'all'
        };
        
        this.initializeReports();
    }

    // ============================================================================
    // INITIALIZATION & SETUP
    // ============================================================================

    initializeReports() {
        this.setupReportTabs();
        this.setupDateRangePickers();
        this.setupFilters();
        this.loadDefaultReport();
        this.setupRealtimeUpdates();
    }

    setupReportTabs() {
        const tabContainer = document.getElementById('purchase-order-reports-tabs');
        if (!tabContainer) return;

        const tabs = [
            { id: 'overview', name: 'Overview', icon: 'dashboard' },
            { id: 'materials', name: 'Raw Materials', icon: 'inventory' },
            { id: 'suppliers', name: 'Supplier Performance', icon: 'group' },
            { id: 'compliance', name: 'Highland Fresh Compliance', icon: 'verified' },
            { id: 'production', name: 'Production Usage', icon: 'manufacturing' },
            { id: 'financial', name: 'Cost Analysis', icon: 'analytics' }
        ];

        let tabsHtml = '<div class="nav nav-tabs" id="reportTabs" role="tablist">';
        tabs.forEach((tab, index) => {
            const active = index === 0 ? 'active' : '';
            tabsHtml += `
                <a class="nav-link ${active}" id="${tab.id}-tab" data-bs-toggle="tab" 
                   href="#${tab.id}-content" role="tab" onclick="purchaseOrderReports.switchReport('${tab.id}')">
                    <i class="material-icons">${tab.icon}</i>
                    ${tab.name}
                </a>
            `;
        });
        tabsHtml += '</div>';

        tabContainer.innerHTML = tabsHtml;
    }

    setupDateRangePickers() {
        const dateRangeSelector = document.getElementById('report-date-range');
        if (!dateRangeSelector) return;

        const ranges = [
            { value: 'last_7_days', text: 'Last 7 Days' },
            { value: 'last_30_days', text: 'Last 30 Days' },
            { value: 'last_quarter', text: 'Last Quarter' },
            { value: 'year_to_date', text: 'Year to Date' },
            { value: 'custom', text: 'Custom Range' }
        ];

        let optionsHtml = '';
        ranges.forEach(range => {
            const selected = range.value === this.filters.dateRange ? 'selected' : '';
            optionsHtml += `<option value="${range.value}" ${selected}>${range.text}</option>`;
        });

        dateRangeSelector.innerHTML = optionsHtml;
        dateRangeSelector.addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.refreshCurrentReport();
        });
    }

    setupFilters() {
        this.setupSupplierTypeFilter();
        this.setupMaterialCategoryFilter();
        this.setupComplianceStatusFilter();
    }

    // ============================================================================
    // REPORT GENERATION
    // ============================================================================

    async switchReport(reportType) {
        this.currentReportType = reportType;
        const contentContainer = document.getElementById(`${reportType}-content`);
        
        if (!contentContainer) {
            console.error(`Report container not found: ${reportType}-content`);
            return;
        }

        // Show loading state
        contentContainer.innerHTML = this.generateLoadingHTML();

        try {
            switch (reportType) {
                case 'overview':
                    await this.generateOverviewReport(contentContainer);
                    break;
                case 'materials':
                    await this.generateMaterialsReport(contentContainer);
                    break;
                case 'suppliers':
                    await this.generateSuppliersReport(contentContainer);
                    break;
                case 'compliance':
                    await this.generateComplianceReport(contentContainer);
                    break;
                case 'production':
                    await this.generateProductionReport(contentContainer);
                    break;
                case 'financial':
                    await this.generateFinancialReport(contentContainer);
                    break;
                default:
                    throw new Error(`Unknown report type: ${reportType}`);
            }
        } catch (error) {
            console.error('Error generating report:', error);
            contentContainer.innerHTML = this.generateErrorHTML(error.message);
        }
    }

    // ============================================================================
    // OVERVIEW REPORT
    // ============================================================================

    async generateOverviewReport(container) {
        try {
            const overviewData = await this.fetchReportData('overview', this.filters);
            
            const html = `
                <div class="row">
                    <!-- Key Metrics Cards -->
                    <div class="col-md-3">
                        <div class="card text-white bg-primary">
                            <div class="card-header">
                                <i class="material-icons">shopping_cart</i>
                                Total Raw Material Purchases
                            </div>
                            <div class="card-body">
                                <h4 class="card-title">${overviewData.totalPurchases}</h4>
                                <p class="card-text">₱${overviewData.totalValue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-white bg-success">
                            <div class="card-header">
                                <i class="material-icons">verified</i>
                                Highland Fresh Compliance
                            </div>
                            <div class="card-body">
                                <h4 class="card-title">${overviewData.complianceRate}%</h4>
                                <p class="card-text">${overviewData.compliantBatches} of ${overviewData.totalBatches} batches</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-white bg-info">
                            <div class="card-header">
                                <i class="material-icons">group</i>
                                Active Suppliers
                            </div>
                            <div class="card-body">
                                <h4 class="card-title">${overviewData.activeSuppliers}</h4>
                                <p class="card-text">${overviewData.nmfdcMembers} NMFDC Members</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-white bg-warning">
                            <div class="card-header">
                                <i class="material-icons">inventory</i>
                                Raw Material Categories
                            </div>
                            <div class="card-body">
                                <h4 class="card-title">${overviewData.materialCategories}</h4>
                                <p class="card-text">${overviewData.totalMaterials} total materials</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <!-- Purchase Trends Chart -->
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5>Raw Material Purchase Trends</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="purchaseTrendsChart" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Top Suppliers -->
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5>Top Highland Fresh Suppliers</h5>
                            </div>
                            <div class="card-body">
                                ${this.generateTopSuppliersHTML(overviewData.topSuppliers)}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <!-- Material Category Distribution -->
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5>Raw Material Distribution</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="materialDistributionChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recent Quality Issues -->
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5>Quality & Compliance Alerts</h5>
                            </div>
                            <div class="card-body">
                                ${this.generateQualityAlertsHTML(overviewData.qualityAlerts)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            
            // Initialize charts
            this.initializePurchaseTrendsChart(overviewData.purchaseTrends);
            this.initializeMaterialDistributionChart(overviewData.materialDistribution);

        } catch (error) {
            throw new Error(`Failed to generate overview report: ${error.message}`);
        }
    }

    // ============================================================================
    // MATERIALS REPORT
    // ============================================================================

    async generateMaterialsReport(container) {
        try {
            const materialsData = await this.fetchReportData('materials', this.filters);

            const html = `
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5>Raw Materials Purchase Analysis</h5>
                                <div class="btn-group" role="group">
                                    <button type="button" class="btn btn-outline-primary btn-sm" 
                                            onclick="purchaseOrderReports.exportMaterialsReport('csv')">
                                        <i class="material-icons">download</i> Export CSV
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" 
                                            onclick="purchaseOrderReports.exportMaterialsReport('pdf')">
                                        <i class="material-icons">picture_as_pdf</i> Export PDF
                                    </button>
                                </div>
                            </div>
                            <div class="card-body">
                                <!-- Materials Summary -->
                                <div class="row mb-4">
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-primary">${materialsData.summary.totalCategories}</h4>
                                            <small class="text-muted">Material Categories</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-success">₱${materialsData.summary.totalSpend.toLocaleString()}</h4>
                                            <small class="text-muted">Total Spend</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-info">${materialsData.summary.averageLeadTime}</h4>
                                            <small class="text-muted">Avg Lead Time (days)</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="text-center">
                                            <h4 class="text-warning">${materialsData.summary.qualityPassRate}%</h4>
                                            <small class="text-muted">Quality Pass Rate</small>
                                        </div>
                                    </div>
                                </div>

                                <!-- Materials Table -->
                                <div class="table-responsive">
                                    <table class="table table-striped table-hover" id="materialsTable">
                                        <thead class="table-dark">
                                            <tr>
                                                <th>Material Name</th>
                                                <th>Category</th>
                                                <th>Quantity Purchased</th>
                                                <th>Total Cost</th>
                                                <th>Avg Unit Cost</th>
                                                <th>Primary Supplier</th>
                                                <th>Quality Rate</th>
                                                <th>Highland Fresh Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.generateMaterialsTableRows(materialsData.materials)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <!-- Material Cost Trends -->
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5>Material Cost Trends</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="materialCostTrendsChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quality Analysis -->
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5>Quality Analysis</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="qualityAnalysisChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            
            // Initialize DataTable
            $('#materialsTable').DataTable({
                order: [[3, 'desc']], // Sort by Total Cost descending
                pageLength: 25,
                responsive: true
            });

            // Initialize charts
            this.initializeMaterialCostTrendsChart(materialsData.costTrends);
            this.initializeQualityAnalysisChart(materialsData.qualityAnalysis);

        } catch (error) {
            throw new Error(`Failed to generate materials report: ${error.message}`);
        }
    }

    // ============================================================================
    // SUPPLIERS REPORT
    // ============================================================================

    async generateSuppliersReport(container) {
        try {
            const suppliersData = await this.fetchReportData('suppliers', this.filters);

            const html = `
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5>Highland Fresh Supplier Performance Dashboard</h5>
                            </div>
                            <div class="card-body">
                                <!-- Supplier Performance Scorecard -->
                                <div class="row">
                                    ${this.generateSupplierScorecards(suppliersData.suppliers)}
                                </div>

                                <!-- Performance Metrics Table -->
                                <div class="table-responsive mt-4">
                                    <table class="table table-striped" id="suppliersTable">
                                        <thead class="table-dark">
                                            <tr>
                                                <th>Supplier Name</th>
                                                <th>Type</th>
                                                <th>NMFDC Member</th>
                                                <th>Delivery Performance</th>
                                                <th>Quality Score</th>
                                                <th>Compliance Rate</th>
                                                <th>Total Orders</th>
                                                <th>Total Value</th>
                                                <th>Last Order</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.generateSuppliersTableRows(suppliersData.suppliers)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <!-- Delivery Performance -->
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5>Delivery Performance Trends</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="deliveryPerformanceChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quality Trends -->
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5>Quality Score Trends</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="qualityTrendsChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            
            // Initialize DataTable
            $('#suppliersTable').DataTable({
                order: [[6, 'desc']], // Sort by Total Orders descending
                pageLength: 25,
                responsive: true
            });

            // Initialize charts
            this.initializeDeliveryPerformanceChart(suppliersData.deliveryTrends);
            this.initializeQualityTrendsChart(suppliersData.qualityTrends);

        } catch (error) {
            throw new Error(`Failed to generate suppliers report: ${error.message}`);
        }
    }

    // ============================================================================
    // HIGHLAND FRESH COMPLIANCE REPORT
    // ============================================================================

    async generateComplianceReport(container) {
        try {
            const complianceData = await this.fetchReportData('compliance', this.filters);

            const html = `
                <div class="row">
                    <div class="col-12">
                        <div class="card border-success">
                            <div class="card-header bg-success text-white">
                                <h5><i class="material-icons">verified</i> Highland Fresh Compliance Dashboard</h5>
                            </div>
                            <div class="card-body">
                                <!-- Compliance Overview -->
                                <div class="row mb-4">
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="display-4 text-success">${complianceData.overview.overallRate}%</div>
                                            <small class="text-muted">Overall Compliance</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h4 text-primary">${complianceData.overview.materialCompliance}%</div>
                                            <small class="text-muted">Material Compliance</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h4 text-info">${complianceData.overview.supplierCompliance}%</div>
                                            <small class="text-muted">Supplier Compliance</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h4 text-warning">${complianceData.overview.qualityCompliance}%</div>
                                            <small class="text-muted">Quality Compliance</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h4 text-secondary">${complianceData.overview.temperatureCompliance}%</div>
                                            <small class="text-muted">Temperature Compliance</small>
                                        </div>
                                    </div>
                                    <div class="col-md-2">
                                        <div class="text-center">
                                            <div class="h4 text-dark">${complianceData.overview.traceabilityCompliance}%</div>
                                            <small class="text-muted">Traceability Compliance</small>
                                        </div>
                                    </div>
                                </div>

                                <!-- Business Rules Compliance -->
                                <h6 class="mb-3">Highland Fresh Business Rules Compliance</h6>
                                <div class="row">
                                    ${this.generateBusinessRulesCompliance(complianceData.businessRules)}
                                </div>

                                <!-- Non-Compliance Issues -->
                                <div class="mt-4">
                                    <h6>Non-Compliance Issues Requiring Attention</h6>
                                    <div class="table-responsive">
                                        <table class="table table-striped">
                                            <thead class="table-danger">
                                                <tr>
                                                    <th>Issue Type</th>
                                                    <th>Description</th>
                                                    <th>Affected Items</th>
                                                    <th>Severity</th>
                                                    <th>Required Action</th>
                                                    <th>Due Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${this.generateNonComplianceIssues(complianceData.issues)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <!-- Compliance Trends -->
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5>Highland Fresh Compliance Trends</h5>
                            </div>
                            <div class="card-body">
                                <canvas id="complianceTrendsChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Items -->
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5>Priority Action Items</h5>
                            </div>
                            <div class="card-body">
                                ${this.generatePriorityActionItems(complianceData.actionItems)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            
            // Initialize compliance trends chart
            this.initializeComplianceTrendsChart(complianceData.trends);

        } catch (error) {
            throw new Error(`Failed to generate compliance report: ${error.message}`);
        }
    }

    // ============================================================================
    // CHART INITIALIZATION METHODS
    // ============================================================================

    initializePurchaseTrendsChart(trendData) {
        const ctx = document.getElementById('purchaseTrendsChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.dates,
                datasets: [{
                    label: 'Purchase Orders Value',
                    data: trendData.values,
                    borderColor: this.chartColors.primary,
                    backgroundColor: this.chartColors.primary + '20',
                    tension: 0.4
                }, {
                    label: 'Order Count',
                    data: trendData.counts,
                    borderColor: this.chartColors.secondary,
                    backgroundColor: this.chartColors.secondary + '20',
                    yAxisID: 'y1',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Value (₱)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Order Count'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    // ============================================================================
    // DATA FETCHING & API COMMUNICATION
    // ============================================================================

    async fetchReportData(reportType, filters) {
        try {
            const params = {
                action: `get${reportType.charAt(0).toUpperCase() + reportType.slice(1)}Report`,
                ...filters
            };

            const response = await axios.get(this.apiUrl, {
                params: params,
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = response.data;
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch report data');
            }

            return result.data;

        } catch (error) {
            console.error('Error fetching report data:', error);
            throw new Error(`Failed to fetch ${reportType} report data: ${error.message}`);
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    generateLoadingHTML() {
        return `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 300px;">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="mt-2">Loading Highland Fresh Reports...</div>
                </div>
            </div>
        `;
    }

    generateErrorHTML(message) {
        return `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Report Error</h4>
                <p>Unable to generate report: ${message}</p>
                <hr>
                <p class="mb-0">Please check your connection and try again.</p>
            </div>
        `;
    }

    async refreshCurrentReport() {
        await this.switchReport(this.currentReportType);
    }

    loadDefaultReport() {
        this.switchReport('overview');
    }

    setupRealtimeUpdates() {
        // Update reports every 5 minutes
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.refreshCurrentReport();
            }
        }, 300000);
    }

    // Export functionality
    async exportMaterialsReport(format) {
        try {
            const params = {
                action: 'exportMaterialsReport',
                format: format,
                ...this.filters
            };

            const response = await axios.get(this.apiUrl, {
                params: params,
                responseType: 'blob'
            });
            
            if (format === 'csv') {
                const blob = response.data;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `highland-fresh-materials-report-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else if (format === 'pdf') {
                const blob = response.data;
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            }

        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export report: ' + error.message);
        }
    }
}

// Initialize the Purchase Order Reports system
let purchaseOrderReports;

document.addEventListener('DOMContentLoaded', function() {
    purchaseOrderReports = new PurchaseOrderReports();
});

// Export for global access
window.PurchaseOrderReports = PurchaseOrderReports;
