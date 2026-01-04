/**
 * Production Reports Page Initialization Module
 * Handles report generation, authentication, and page functionality for production-reports.html
 * Highland Fresh Dairy Cooperative Management System
 */

class ProductionReportsManager {
    constructor() {
        this.reportData = {
            today: { batches: 3, production: 145, efficiency: 92, waste: 1.8 },
            week: { batches: 18, production: 1247, efficiency: 94, waste: 2.1 },
            month: { batches: 72, production: 4891, efficiency: 93, waste: 2.3 },
            quarter: { batches: 216, production: 14673, efficiency: 95, waste: 1.9 },
            year: { batches: 864, production: 58692, efficiency: 94, waste: 2.0 }
        };
        
        this.init();
    }
    
    init() {
        console.log('Initializing Production Reports Manager...');
        this.setupEventListeners();
        this.loadReportData();
    }
    
    setupEventListeners() {
        // Setup report period change listener
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', () => this.updateStatistics());
        }
    }
    
    loadReportData() {
        console.log('Loading production report data...');
        // Simulate loading real data
        setTimeout(() => {
            this.updateStatistics();
        }, 1000);
    }
    
    updateStatistics() {
        console.log('Updating production statistics...');
        // Get current period selection
        const period = document.getElementById('reportPeriod')?.value || 'month';
        
        // Get data for selected period
        const currentData = this.reportData[period] || this.reportData.month;
        
        // Update UI elements
        this.updateElement('totalBatches', currentData.batches);
        this.updateElement('totalProduction', currentData.production.toLocaleString());
        this.updateElement('efficiencyRate', currentData.efficiency + '%');
        this.updateElement('wasteRate', currentData.waste + '%');
    }
    
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    refreshReports() {
        console.log('Refreshing production reports...');
        this.loadReportData();
    }
    
    generateProductionSummary() {
        this.showReportModal('Production Summary', 'Generating comprehensive production summary...');
    }
    
    generateBatchAnalysis() {
        this.showReportModal('Batch Analysis', 'Analyzing batch performance data...');
    }
    
    generateQualityReport() {
        this.showReportModal('Quality Control Report', 'Compiling quality metrics...');
    }
    
    generateMaterialUsage() {
        this.showReportModal('Material Usage Report', 'Calculating material consumption...');
    }
    
    generateProductivityReport() {
        this.showReportModal('Productivity Report', 'Evaluating productivity trends...');
    }
    
    generateCustomReport() {
        this.showReportModal('Custom Report Builder', 'Loading report configuration options...');
    }
    
    showReportModal(title, message) {
        // Set modal title and initial content
        const modalTitle = document.getElementById('reportModalTitle');
        const reportContent = document.getElementById('reportContent');
        
        if (modalTitle) {
            modalTitle.textContent = title;
        }
        
        if (reportContent) {
            reportContent.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-highland-primary" role="status"></div>
                    <p class="mt-2">${message}</p>
                </div>
            `;
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('reportModal'));
        modal.show();
        
        // Simulate report generation
        setTimeout(() => {
            this.displayGeneratedReport(title);
        }, 2000);
    }
    
    displayGeneratedReport(title) {
        const reportContent = document.getElementById('reportContent');
        const reportPeriod = document.getElementById('reportPeriod');
        
        if (reportContent && reportPeriod) {
            const selectedText = reportPeriod.options[reportPeriod.selectedIndex].text;
            
            reportContent.innerHTML = `
                <div class="alert alert-success">
                    <h5><i class="bi bi-check-circle"></i> Report Generated Successfully</h5>
                    <p>Your ${title.toLowerCase()} has been generated and is ready for download.</p>
                </div>
                <div class="report-preview">
                    <h6>Report Preview:</h6>
                    <div class="bg-light p-3 rounded">
                        <p><strong>Report Type:</strong> ${title}</p>
                        <p><strong>Period:</strong> ${selectedText}</p>
                        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                        <p><strong>Status:</strong> <span class="badge bg-success">Ready</span></p>
                    </div>
                </div>
            `;
        }
    }
    
    downloadReport() {
        alert('Report download functionality would be implemented here. The report would be generated as PDF or Excel file.');
    }
}

class ProductionReportsPageUtils {
    static checkProductionManagerAccess() {
        console.log('Checking production supervisor access...');
        const currentUser = getCurrentUser();
        
        if (!currentUser || !currentUser.role) {
            console.log('No user found or role missing, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        
        const allowedRoles = ['Admin', 'Production Supervisor'];
        if (!allowedRoles.includes(currentUser.role)) {
            alert('Access denied: Production Supervisor or Admin role required');
            window.location.href = 'login.html';
            return false;
        }
        
        console.log(`Access granted for user: ${currentUser.username} (${currentUser.role})`);
        return true;
    }
}

// Global functions for onclick handlers
function refreshReports() {
    if (window.productionReportsManager) {
        window.productionReportsManager.refreshReports();
    }
}

function generateProductionSummary() {
    if (window.productionReportsManager) {
        window.productionReportsManager.generateProductionSummary();
    }
}

function generateBatchAnalysis() {
    if (window.productionReportsManager) {
        window.productionReportsManager.generateBatchAnalysis();
    }
}

function generateQualityReport() {
    if (window.productionReportsManager) {
        window.productionReportsManager.generateQualityReport();
    }
}

function generateMaterialUsage() {
    if (window.productionReportsManager) {
        window.productionReportsManager.generateMaterialUsage();
    }
}

function generateProductivityReport() {
    if (window.productionReportsManager) {
        window.productionReportsManager.generateProductivityReport();
    }
}

function generateCustomReport() {
    if (window.productionReportsManager) {
        window.productionReportsManager.generateCustomReport();
    }
}

function downloadReport() {
    if (window.productionReportsManager) {
        window.productionReportsManager.downloadReport();
    }
}

// Main initialization function
function initializeProductionReportsPage() {
    console.log('Production Reports page initialization starting...');
    
    // Initialize common page utilities and check authentication
    const user = HighlandFreshPageUtils.initializePage({
        requiredRoles: ['Admin', 'Production Supervisor']
    });
    
    if (!user) return; // Authentication or authorization failed
    
    // Initialize Production Reports Manager
    try {
        window.productionReportsManager = new ProductionReportsManager();
        console.log('✅ Production Reports Manager initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Production Reports Manager:', error);
        alert('Error initializing production reports system. Please refresh the page or contact support.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeProductionReportsPage);
