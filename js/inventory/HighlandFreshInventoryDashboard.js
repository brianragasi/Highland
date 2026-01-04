/**
 * Highland Fresh Inventory Dashboard
 * Enhanced inventory management with Highland Fresh dairy-specific features
 * 
 * @version 2.0 - Highland Fresh Enhanced
 * @date August 25, 2025
 */

class HighlandFreshInventoryDashboard {
    constructor() {
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
        
        // Initialize integrated components (InventoryRenderer removed due to element mismatch)
        this.filters = null;
        
        // Initialize components
        this.initializeComponents();
    }
    
    initializeComponents() {
        // This will be called when the page is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('Initializing Highland Fresh Inventory Dashboard...');
        this.showLoading();
        // Try to init filters but don't fail hard
        try {
            this.filters = new InventoryFilters((filters) => this.applyFilters(filters));
        } catch (e) {
            console.warn('InventoryFilters unavailable:', e);
        }
        const tasks = [
            this.loadInventoryData(),
            this.loadAlerts(),
            this.loadExpiringProducts(),
            this.loadReorderSuggestions()
        ];
        await Promise.allSettled(tasks);
        this.renderDashboard();
        this.startAutoRefresh();
        this.setupEventHandlers();
        this.hideLoading();
        console.log('Highland Fresh Inventory Dashboard initialized (resilient mode).');
    }
    
    async loadInventoryData() {
        try {
            const options = {
                expiry_warning_days: this.alertThresholds.expiryWarning
            };
            
            if (this.selectedCooperative) {
                options.cooperative = this.selectedCooperative;
            }
            
            const response = await axios.get(APIResponseHandler.getApiUrl('InventoryAPI.php'), {
                params: { operation: 'getStockStatus', ...options },
                withCredentials: true
            });
            const data = response.data;
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load inventory data');
            }
            
            this.inventoryData = data.data || [];
            this.statsData = data.summary || {};
            this.filteredData = [...this.inventoryData];
            
            // Render inventory table and update count
            this.renderInventoryTable();
            this.updateFilteredCount();
            
        } catch (error) {
            console.error('Error loading inventory data:', error);
            throw error;
        }
    }
    
    async loadAlerts() {
        try {
            const options = {
                threshold_multiplier: this.alertThresholds.lowStock,
                expiry_warning_days: this.alertThresholds.expiryWarning
            };
            
            const response = await axios.get(APIResponseHandler.getApiUrl('InventoryAPI.php'), {
                params: { operation: 'getLowStockAlerts', ...options },
                withCredentials: true
            });
            const data = response.data;
            
            if (data.success) {
                this.alertsData = data.alerts || [];
            }
            
        } catch (error) {
            console.error('Error loading alerts:', error);
            this.alertsData = [];
        }
    }
    
    async loadExpiringProducts() {
        try {
            const options = {
                warning_days: this.alertThresholds.expiryWarning
            };
            
            const response = await axios.get(APIResponseHandler.getApiUrl('InventoryAPI.php'), {
                params: { operation: 'getExpiringProducts', ...options },
                withCredentials: true
            });
            const data = response.data;
            
            if (data.success) {
                this.expiringData = data.expiring_products || [];
            }
            
        } catch (error) {
            console.error('Error loading expiring products:', error);
            this.expiringData = [];
        }
    }
    
    async loadReorderSuggestions() {
        try {
            const response = await axios.get(APIResponseHandler.getApiUrl('InventoryAPI.php'), {
                params: { operation: 'getReorderSuggestions' },
                withCredentials: true
            });
            const data = response.data;
            
            if (data.success) {
                this.suggestionsData = data.suggestions || [];
            }
            
        } catch (error) {
            console.error('Error loading reorder suggestions:', error);
            this.suggestionsData = [];
        }
    }
    
    renderDashboard() {
        this.hideLoading();
        this.renderStatistics();
        this.renderAlerts();
        this.renderInventoryTable();
        this.renderExpiringProducts();
        this.renderReorderSuggestions();
    }
    
    renderStatistics() {
        if (!this.statsData) return;
        
        // Update individual stat elements
        const totalProducts = document.getElementById('total-products');
        const lowStockCount = document.getElementById('low-stock-count');
        const expiringSoonCount = document.getElementById('expiring-soon-count');
        const totalValue = document.getElementById('total-value');
        
        if (totalProducts) {
            totalProducts.textContent = this.statsData.total_products || 0;
        }
        
        if (lowStockCount) {
            lowStockCount.textContent = this.statsData.low_stock || 0;
        }
        
        if (expiringSoonCount) {
            expiringSoonCount.textContent = this.statsData.expiring_soon || 0;
        }
        
        if (totalValue) {
            const value = this.statsData.total_value || 0;
            totalValue.textContent = new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                minimumFractionDigits: 0
            }).format(value);
        }
    }
    
    renderAlerts() {
        const alertsContainer = document.getElementById('inventory-alerts');
        if (!alertsContainer) return;
        
        if (this.alertsData.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>
                    No inventory alerts at this time.
                </div>
            `;
            return;
        }
        
        const alertsHtml = this.alertsData.slice(0, 5).map(alert => `
            <div class="alert alert-${this.getAlertClass(alert.priority)} d-flex justify-content-between align-items-center">
                <div>
                    <strong>${alert.name}</strong>
                    <span class="badge bg-secondary ms-2">${alert.alert_type}</span>
                    <div class="small text-muted">
                        ${alert.recommended_action}
                        ${alert.milk_source_cooperative ? ` • ${alert.milk_source_cooperative}` : ''}
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold">${alert.quantity_on_hand} / ${alert.reorder_level}</div>
                    <div class="small text-muted">${alert.quality_grade || 'Standard'}</div>
                </div>
            </div>
        `).join('');
        
        alertsContainer.innerHTML = alertsHtml;
    }
    
    renderInventoryTable() {
        const tableContainer = document.getElementById('inventory-table');
        if (!tableContainer) return;
        
        const tableHtml = `
            <div class="table-responsive inventory-table">
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Current Stock</th>
                            <th>Status</th>
                            <th>Cooperative</th>
                            <th>Expiry Date</th>
                            <th>Quality</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderInventoryRows()}
                    </tbody>
                </table>
            </div>
        `;
        
        tableContainer.innerHTML = tableHtml;
    }
    
    renderInventoryRows() {
        if (this.filteredData.length === 0) {
            return `<tr><td colspan="7" class="text-center">No inventory data available</td></tr>`;
        }
        
        return this.filteredData.map(product => `
            <tr data-product-id="${product.id}">
                <td>
                    <div class="fw-bold">${product.name}</div>
                    <div class="small text-muted">${product.category_name || 'Uncategorized'}</div>
                </td>
                <td><code>${product.barcode}</code></td>
                <td>
                    <div class="d-flex justify-content-between">
                        <span>${product.current_stock} ${product.unit_name || ''}</span>
                        <small class="text-muted">/${product.reorder_level}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${this.getStatusBadgeClass(product.stock_status)}">
                        ${product.stock_status}
                    </span>
                    ${product.freshness_status !== 'Fresh' ? 
                        `<span class="badge bg-warning ms-1">${product.freshness_status}</span>` : ''}
                </td>
                <td class="small">${product.milk_source_cooperative || '-'}</td>
                <td>
                    ${product.expiry_date ? 
                        `<div>${new Date(product.expiry_date).toLocaleDateString()}</div>
                         <div class="small text-muted">${product.days_to_expiry} days</div>` : 
                        '-'}
                </td>
                <td>
                    <span class="badge bg-${this.getQualityBadgeClass(product.quality_grade)}">
                        ${product.quality_grade || 'Standard'}
                    </span>
                </td>
            </tr>
        `).join('');
    }
    
    updateFilteredCount() {
        // This function updates any filtered count displays if needed
        // For now, it can be a simple placeholder that could show filtered vs total counts
        console.log(`Displaying ${this.filteredData?.length || 0} of ${this.inventoryData?.length || 0} products`);
    }
    
    renderExpiringProducts() {
        const container = document.getElementById('expiring-products');
        if (!container) return;
        
        if (this.expiringData.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-calendar-check fs-1"></i>
                    <p class="mt-2">No products expiring soon</p>
                </div>
            `;
            return;
        }
        
        const expiringHtml = this.expiringData.slice(0, 5).map(product => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <div class="fw-bold">${product.name}</div>
                    <div class="small text-muted">
                        Expires: ${new Date(product.expiry_date).toLocaleDateString()}
                        (${product.days_to_expiry} days)
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge bg-${this.getExpiryBadgeClass(product.expiry_status)}">
                        ${product.expiry_status}
                    </span>
                    <div class="small">${product.quantity_on_hand} units</div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = expiringHtml;
    }
    
    renderReorderSuggestions() {
        const container = document.getElementById('reorder-suggestions');
        if (!container) return;
        
        if (this.suggestionsData.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-cart-check fs-1"></i>
                    <p class="mt-2">No reorder suggestions</p>
                </div>
            `;
            return;
        }
        
        const suggestionsHtml = this.suggestionsData.slice(0, 5).map(suggestion => `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <div class="fw-bold">${suggestion.name}</div>
                    <div class="small text-muted">${suggestion.reason}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold">Suggest: ${suggestion.suggested_quantity}</div>
                    <span class="badge bg-${this.getPriorityBadgeClass(suggestion.priority)}">
                        ${suggestion.priority}
                    </span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = suggestionsHtml;
    }
    
    setupEventHandlers() {
        // Cooperative filter
        const cooperativeSelect = document.getElementById('cooperative-filter');
        if (cooperativeSelect) {
            cooperativeSelect.addEventListener('change', (e) => {
                this.selectedCooperative = e.target.value || null;
                this.refresh();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-inventory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        // Export button
        const exportBtn = document.getElementById('export-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToCSV());
        }

        // Refresh table button
        const refreshTableBtn = document.getElementById('refresh-table');
        if (refreshTableBtn) {
            refreshTableBtn.addEventListener('click', () => this.refresh());
        }
    }
    
    async refresh() {
        try {
            // Don't show loading overlay for background refresh
            const tasks = [
                this.loadInventoryData(),
                this.loadAlerts(),
                this.loadExpiringProducts(),
                this.loadReorderSuggestions()
            ];
            await Promise.allSettled(tasks);
            this.renderDashboard();
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showError('Failed to refresh data');
        }
    }
    
    startAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, this.refreshInterval);
    }
    
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
    
    exportToCSV() {
        const headers = ['Product Name', 'SKU', 'Current Stock', 'Status', 'Cooperative', 'Expiry Date', 'Quality Grade'];
        const csvContent = [
            headers.join(','),
            ...this.filteredData.map(product => [
                `"${product.name}"`,
                `"${product.barcode}"`,
                product.current_stock,
                `"${product.stock_status}"`,
                `"${product.milk_source_cooperative || ''}"`,
                `"${product.expiry_date || ''}"`,
                `"${product.quality_grade || 'Standard'}"`
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `highland-fresh-inventory-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    // Helper methods for CSS classes
    getAlertClass(priority) {
        const classes = {
            'Urgent': 'danger',
            'High': 'warning',
            'Medium': 'info',
            'Low': 'secondary'
        };
        return classes[priority] || 'secondary';
    }
    
    getStatusBadgeClass(status) {
        const classes = {
            'Out of Stock': 'danger',
            'Low Stock': 'warning',
            'Normal': 'success',
            'Overstock': 'info'
        };
        return classes[status] || 'secondary';
    }
    
    getQualityBadgeClass(quality) {
        const classes = {
            'Premium': 'success',
            'Standard': 'primary',
            'Economy': 'secondary'
        };
        return classes[quality] || 'primary';
    }
    
    getExpiryBadgeClass(status) {
        const classes = {
            'Expired': 'danger',
            'Expires Tomorrow': 'danger',
            'Expires This Week': 'warning',
            'Expires Soon': 'info'
        };
        return classes[status] || 'secondary';
    }
    
    getPriorityBadgeClass(priority) {
        const classes = {
            'Urgent': 'danger',
            'High': 'warning',
            'Medium': 'info',
            'Low': 'success'
        };
        return classes[priority] || 'secondary';
    }
    
    showLoading() {
        // Show main loading overlay
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    }
    
    hideLoading() {
        // Hide main loading overlay
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
    
    showError(message) {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    }

    // Filter and inventory table methods (legacy duplicate table - REMOVED)
    applyFilters(filters) {
        if (!this.inventoryData || this.inventoryData.length === 0) {
            return;
        }

        let filtered = [...this.inventoryData];

        // Apply search filter if filters object exists
        if (filters && filters.searchTerm && filters.searchTerm.trim()) {
            const searchTerm = filters.searchTerm.toLowerCase().trim();
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                (product.barcode && product.barcode.toLowerCase().includes(searchTerm)) ||
                (product.category_name && product.category_name.toLowerCase().includes(searchTerm))
            );
        }

        this.filteredData = filtered;
        this.renderInventoryTable();
    }
    
    destroy() {
        this.stopAutoRefresh();
    }
}

// Global functions - Manual editing removed for proper inventory control
function editInventory(productId) {
    alert('Manual inventory editing is disabled.\n\nInventory is automatically updated through:\n• Purchase Order Receipts\n• Sales Transactions\n• Returns Processing\n\nPlease use proper business transactions to adjust inventory levels.');
}

function viewProductHistory(productId) {
    console.log('View history for product:', productId);
    // Future implementation: Navigate to product history page
    alert('Product history feature coming soon!');
}

function viewDetails(productId) {
    if (window.highlandFreshInventoryDashboard) {
        const product = window.highlandFreshInventoryDashboard.inventoryData.find(p => p.id == productId);
        if (product && window.highlandFreshInventoryDashboard.viewDetails) {
            // Call the existing viewDetails function from the HTML
            window.viewDetails(productId);
        }
    }
}

// Initialize dashboard when page loads
const highlandFreshInventoryDashboard = new HighlandFreshInventoryDashboard();
