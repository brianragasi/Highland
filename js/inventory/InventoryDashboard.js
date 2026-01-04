class HighlandFreshInventoryDashboard {
    constructor() {
        this.api = new HighlandFreshInventoryAPI();
        this.renderer = new InventoryRenderer();
        this.filters = new InventoryFilters((filters) => this.handleFilterChange(filters));
        this.inventoryData = [];
        this.filteredData = [];
        this.alertsData = [];
        this.expiringData = [];
        this.suggestionsData = [];
        this.statsData = null;
        this.isLoading = false;
        this.refreshInterval = 30000; 
        this.refreshTimer = null;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        // Highland Fresh specific features
        this.selectedCooperative = null;
        this.showExpiryAlerts = true;
        this.alertThresholds = {
            lowStock: 1.2,
            expiryWarning: 7
        }; 
    }
    
    async init() {
        try {
            console.log('Initializing Highland Fresh Inventory Dashboard...');
            this.renderer.showLoading();
            
            // Load all Highland Fresh inventory data
            await Promise.all([
                this.loadInventoryData(),
                this.loadAlerts(),
                this.loadExpiringProducts(),
                this.loadReorderSuggestions()
            ]);
            
            this.startAutoRefresh();
            this.setupKeyboardShortcuts();
            this.setupHighlandFreshFeatures();
            
            console.log('Highland Fresh Inventory Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Highland Fresh inventory dashboard:', error);
            this.renderer.showError('Failed to load Highland Fresh inventory dashboard. Please refresh the page.');
        }
    }
    
    async loadInventoryData(retryOnFailure = true) {
        if (this.isLoading) {
            console.log('Load already in progress, skipping...');
            return;
        }
        
        this.isLoading = true;
        let retryCount = 0;
        
        while (retryCount <= this.maxRetries) {
            try {
                console.log(`Loading Highland Fresh inventory data (attempt ${retryCount + 1})...`);
                
                const options = {};
                if (this.selectedCooperative) {
                    options.cooperative = this.selectedCooperative;
                }
                
                const inventoryResponse = await this.api.getStockStatus(options);
                
                if (!inventoryResponse.success) {
                    throw new Error(inventoryResponse.message || 'Failed to load Highland Fresh inventory data');
                }
                
                this.inventoryData = inventoryResponse.data || [];
                this.statsData = inventoryResponse.summary || {};
                this.filteredData = [...this.inventoryData];
                
                this.renderDashboard();
                this.isLoading = false;
                return;
                
            } catch (error) {
                console.error(`Attempt ${retryCount + 1} failed:`, error);
                retryCount++;
                
                if (retryCount <= this.maxRetries) {
                    console.log(`Retrying in ${this.retryDelay}ms...`);
                    await this.delay(this.retryDelay);
                    this.retryDelay *= 2;
                } else {
                    this.isLoading = false;
                    if (retryOnFailure) {
                        this.renderer.showError(`Failed to load Highland Fresh inventory data after ${this.maxRetries} attempts: ${error.message}`);
                    }
                    throw error;
                }
            }
        }
        this.isLoading = false;
    }
    handleFilterChange(filters) {
        console.log('Filters changed:', filters);
        this.applyCurrentFilters();
        this.renderInventoryTable();
    }
    applyCurrentFilters() {
        const currentFilters = this.filters.getCurrentFilters();
        this.filteredData = this.filters.filterInventoryData(this.inventoryData, currentFilters);
        console.log(`Filtered ${this.inventoryData.length} items to ${this.filteredData.length} items`);
    }
    renderAll() {
        this.renderStatistics();
        this.renderInventoryTable();
    }
    renderStatistics() {
        if (this.statsData) {
            this.renderer.renderStatistics(this.statsData);
        }
    }
    renderInventoryTable() {
        this.renderer.renderInventoryTable(this.filteredData);
    }
    async refresh() {
        console.log('Manual refresh triggered');
        this.renderer.showLoading();
        await this.loadInventoryData();
        this.renderer.showSuccess('Inventory data refreshed successfully');
    }
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            console.log('Auto-refresh triggered');
            this.loadInventoryData(false); 
        }, this.refreshInterval);
        console.log(`Auto-refresh started (${this.refreshInterval / 1000}s interval)`);
    }
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('Auto-refresh stopped');
        }
    }
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                event.preventDefault();
                this.refresh();
            }
            if (event.ctrlKey && event.shiftKey && event.key === 'R') {
                window.location.reload();
            }
        });
        this.filters.addKeyboardShortcuts();
    }
    getInventoryItemById(productId) {
        return this.inventoryData.find(item => item.product_id === productId) || null;
    }
    exportToCSV() {
        if (!this.filteredData.length) {
            throw new Error('No data to export');
        }
        const headers = [
            'Product Name', 'Barcode', 'Category', 'Supplier', 'Current Stock', 
            'Reorder Level', 'Unit', 'Status', 'Price', 'Last Updated'
        ];
        const rows = this.filteredData.map(product => [
            this.escapeCsvValue(product.name),
            this.escapeCsvValue(product.barcode),
            this.escapeCsvValue(product.category || ''),
            this.escapeCsvValue(product.supplier_name || ''),
            product.quantity_on_hand,
            product.reorder_level,
            this.escapeCsvValue(product.unit || ''),
            this.getStockStatusText(product),
            product.price,
            product.updated_at || ''
        ]);
        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
        return csvContent;
    }
    downloadCSV() {
        try {
            const csvContent = this.exportToCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `inventory_${new Date().toISOString().slice(0, 10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.renderer.showSuccess('Inventory data exported successfully');
            } else {
                throw new Error('CSV download not supported in this browser');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.renderer.showError('Failed to export inventory data: ' + error.message);
        }
    }
    getDashboardStats() {
        return {
            totalItems: this.inventoryData.length,
            filteredItems: this.filteredData.length,
            statsData: this.statsData,
            lastUpdated: new Date().toISOString(),
            activeFilters: this.filters.getFilterSummary()
        };
    }
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        let userMessage = 'An unexpected error occurred';
        if (error.message.includes('Authentication')) {
            userMessage = 'Please log in again to continue';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else if (error.message.includes('Access denied')) {
            userMessage = 'You do not have permission to access this feature';
        } else if (error.message.includes('Network')) {
            userMessage = 'Network connection issue. Please check your connection and try again';
        }
        this.renderer.showError(userMessage);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    escapeCsvValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }
    getStockStatusText(product) {
        if (product.quantity_on_hand === 0) {
            return 'Out of Stock';
        } else if (product.low_stock) {
            return 'Low Stock';
        } else {
            return 'Healthy';
        }
    }
    destroy() {
        console.log('Destroying Inventory Dashboard...');
        this.stopAutoRefresh();
        this.inventoryData = [];
        this.filteredData = [];
        this.statsData = null;
        if (this.filters && typeof this.filters.destroy === 'function') {
            this.filters.destroy();
        }
        if (this.renderer) {
            this.renderer.clear();
        }
        console.log('Inventory Dashboard destroyed');
    }
}
window.viewProductDetails = function(productId) {
    console.log('View product details:', productId);
    alert(`View details for product ID: ${productId}\n(Feature to be implemented in future stories)`);
};
window.editProduct = function(productId) {
    console.log('Edit product:', productId);
    alert(`Edit product ID: ${productId}\n(Feature to be implemented in future stories)`);
};
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryDashboard;
}