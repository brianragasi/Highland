// Two-Tier Inventory Dashboard JavaScript
class TwoTierInventoryDashboard {
    constructor() {
        this.rawMaterials = [];
        this.finishedProducts = [];
        this.inventorySummary = null;

        // Pagination properties
        this.currentPage = {
            rawMaterials: 1,
            finishedProducts: 1
        };
        this.itemsPerPage = {
            rawMaterials: 25,
            finishedProducts: 25
        };
        this.searchTerm = {
            rawMaterials: '',
            finishedProducts: ''
        };

        // Low stock filter state
        this.showOnlyLowStock = {
            rawMaterials: false,
            finishedProducts: false
        };

        this.init();
    }

    formatCurrency(amount) {
        // Handle null, undefined, NaN, and invalid values
        if (amount === null || amount === undefined || isNaN(amount) || amount === '') {
            amount = 0;
        }
        // Convert to number and round to nearest whole number
        const numericAmount = Number(amount) || 0;
        const roundedAmount = Math.round(numericAmount);
        return '₱' + roundedAmount.toLocaleString('en-PH');
    }

    async init() {
        try {
            await this.loadInventorySummary();
            await this.loadRawMaterials();
            await this.loadFinishedProducts();
            this.populateCategoryFilters();
            this.setupEventListeners();
            this.setupLowStockToggle();
            this.updateLowStockBadges();
            this.showSuccessMessage();
        } catch (error) {
            console.error('Error initializing inventory dashboard:', error);
            this.showErrorMessage('Failed to load inventory data');
        }
    }

    setupLowStockToggle() {
        // Raw Materials
        const btnRaw = document.getElementById('toggleLowStockRawMaterials');
        if (btnRaw) {
            btnRaw.addEventListener('click', () => {
                this.showOnlyLowStock.rawMaterials = !this.showOnlyLowStock.rawMaterials;
                btnRaw.classList.toggle('active', this.showOnlyLowStock.rawMaterials);
                this.displayRawMaterials();
            });
        }
        // Finished Products
        const btnFinished = document.getElementById('toggleLowStockFinishedProducts');
        if (btnFinished) {
            btnFinished.addEventListener('click', () => {
                this.showOnlyLowStock.finishedProducts = !this.showOnlyLowStock.finishedProducts;
                btnFinished.classList.toggle('active', this.showOnlyLowStock.finishedProducts);
                this.displayFinishedProducts();
            });
        }
    }

    updateLowStockBadges() {
        // Raw Materials
        const badgeRaw = document.getElementById('lowStockCountRawMaterials');
        if (badgeRaw) {
            const count = this.rawMaterials.filter(m => m.stock_status === 'REORDER_NEEDED').length;
            badgeRaw.textContent = count;
        }
        // Finished Products
        const badgeFinished = document.getElementById('lowStockCountFinishedProducts');
        if (badgeFinished) {
            const count = this.finishedProducts.filter(p => p.stock_status === 'PRODUCTION_NEEDED').length;
            badgeFinished.textContent = count;
        }
    }

    async loadInventorySummary() {
        try {
            const response = await axios.get('../api/TwoTierInventoryAPI.php', {
                params: { action: 'get_inventory_summary' }
            });
            const data = response.data;
            
            if (data.success) {
                // Ensure we have an array for .find() method
                this.inventorySummary = Array.isArray(data.summary) ? data.summary : [];
                this.displayInventorySummary();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading inventory summary:', error);
        }
    }

    async loadRawMaterials() {
        try {
            const response = await axios.get('../api/RawMaterialsAPI.php', {
                params: { action: 'get_raw_materials_inventory' }
            });
            const data = response.data;
            
            if (data.success) {
                this.rawMaterials = data.inventory;
                this.displayRawMaterials();
                // Update top statistics after loading raw materials
                this.updateTopStatisticsFromLoadedData();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading raw materials:', error);
            this.displayErrorInTab('raw-materials-pane', 'Failed to load raw materials inventory');
        }
    }

    async loadFinishedProducts() {
        try {
            const response = await axios.get('../api/TwoTierInventoryAPI.php', {
                params: { action: 'get_finished_products_inventory' }
            });
            const data = response.data;
            
            if (data.success) {
                // Ensure we have an array for .length method
                this.finishedProducts = Array.isArray(data.inventory) ? data.inventory : [];
                this.displayFinishedProducts();
                // Update top statistics after loading finished products
                this.updateTopStatisticsFromLoadedData();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading finished products:', error);
            this.displayErrorInTab('finished-products-pane', 'Failed to load finished products inventory');
        }
    }

    displayInventorySummary() {
        if (!this.inventorySummary) return;

        const rawMaterials = this.inventorySummary.find(item => item.inventory_type === 'Raw Materials') || {};
        const finishedProducts = this.inventorySummary.find(item => item.inventory_type === 'Finished Products') || {};

        // Update Top Statistics Bar
        this.updateTopStatistics(rawMaterials, finishedProducts);

        // Raw Materials Summary
        document.getElementById('rawMaterialsCount').textContent = rawMaterials.total_items || 0;
        document.getElementById('rawMaterialsValue').textContent = this.formatCurrency(rawMaterials.total_value || 0);
        document.getElementById('rawMaterialsReorderCount').textContent = rawMaterials.items_needing_reorder || 0;
        document.getElementById('rawMaterialsOverstockCount').textContent = rawMaterials.overstocked_items || 0;

        // Finished Products Summary
        document.getElementById('finishedProductsCount').textContent = finishedProducts.total_items || 0;
        document.getElementById('finishedProductsValue').textContent = this.formatCurrency(finishedProducts.total_value || 0);
        document.getElementById('finishedProductsProductionCount').textContent = finishedProducts.items_needing_reorder || 0;
        document.getElementById('finishedProductsOverstockCount').textContent = finishedProducts.overstocked_items || 0;
    }

    updateTopStatistics(rawMaterials, finishedProducts) {
        // Calculate total products (raw materials + finished products)
        const totalProducts = (rawMaterials.total_items || 0) + (finishedProducts.total_items || 0);
        document.getElementById('total-products').textContent = totalProducts;

        // Calculate total low stock items (reorder needed + production needed)
        const lowStockItems = (rawMaterials.items_needing_reorder || 0) + (finishedProducts.items_needing_reorder || 0);
        document.getElementById('low-stock-count').textContent = lowStockItems;

        // Calculate expiring soon (implement based on your business logic)
        // For now, we'll use a placeholder - you can modify this based on actual expiry data
        const expiringSoon = this.calculateExpiringSoon();
        document.getElementById('expiring-soon-count').textContent = expiringSoon;

        // Calculate total value (raw materials + finished products)
        const totalValue = (rawMaterials.total_value || 0) + (finishedProducts.total_value || 0);
        document.getElementById('total-value').textContent = this.formatCurrency(totalValue);
    }

    updateTopStatisticsFromLoadedData() {
        // This method updates statistics using actual loaded data instead of summary
        if (!this.rawMaterials || !this.finishedProducts) {
            return; // Wait until both datasets are loaded
        }

        // Calculate totals from actual loaded data
        const totalProducts = this.rawMaterials.length + this.finishedProducts.length;
        document.getElementById('total-products').textContent = totalProducts;

        // Calculate low stock from actual data
        const rawMaterialsLowStock = this.rawMaterials.filter(m => 
            m.stock_status === 'REORDER_NEEDED' || m.stock_status === 'LOW_STOCK'
        ).length;
        
        const finishedProductsLowStock = this.finishedProducts.filter(p => 
            p.stock_status === 'PRODUCTION_NEEDED' || p.stock_status === 'LOW_STOCK'
        ).length;
        
        const totalLowStock = rawMaterialsLowStock + finishedProductsLowStock;
        document.getElementById('low-stock-count').textContent = totalLowStock;

        // Calculate expiring soon from actual data
        const expiringSoon = this.calculateExpiringSoonFromData();
        document.getElementById('expiring-soon-count').textContent = expiringSoon;

        // Calculate total value from actual data
        const rawMaterialsValue = this.rawMaterials.reduce((sum, m) => {
            const value = parseFloat(m.inventory_value || m.total_value || 0);
            return sum + (isNaN(value) ? 0 : value);
        }, 0);

        const finishedProductsValue = this.finishedProducts.reduce((sum, p) => {
            const value = parseFloat(p.inventory_retail_value || p.retail_value || p.total_value || 0);
            return sum + (isNaN(value) ? 0 : value);
        }, 0);

        const totalValue = rawMaterialsValue + finishedProductsValue;
        document.getElementById('total-value').textContent = this.formatCurrency(totalValue);
    }

    calculateExpiringSoonFromData() {
        // Calculate items expiring within the next 30 days from actual data
        let expiringSoonCount = 0;
        const currentDate = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(currentDate.getDate() + 30);

        // Check raw materials for expiry dates
        if (this.rawMaterials && Array.isArray(this.rawMaterials)) {
            expiringSoonCount += this.rawMaterials.filter(material => {
                // Check multiple possible field names for expiry date
                const expiryField = material.expiry_date || material.expiration_date || 
                                  material.best_before || material.use_by || material.expires_at;
                
                if (expiryField && expiryField !== '' && expiryField !== null) {
                    const expiryDate = new Date(expiryField);
                    // Check if date is valid and within expiry window
                    return !isNaN(expiryDate.getTime()) && 
                           expiryDate <= thirtyDaysFromNow && 
                           expiryDate >= currentDate;
                }
                return false;
            }).length;
        }

        // Check finished products for expiry dates
        if (this.finishedProducts && Array.isArray(this.finishedProducts)) {
            expiringSoonCount += this.finishedProducts.filter(product => {
                // Check multiple possible field names for expiry date
                const expiryField = product.expiry_date || product.expiration_date || 
                                  product.best_before || product.use_by || product.expires_at;
                
                if (expiryField && expiryField !== '' && expiryField !== null) {
                    const expiryDate = new Date(expiryField);
                    // Check if date is valid and within expiry window
                    return !isNaN(expiryDate.getTime()) && 
                           expiryDate <= thirtyDaysFromNow && 
                           expiryDate >= currentDate;
                }
                return false;
            }).length;
        }

        return expiringSoonCount;
    }

    calculateExpiringSoon() {
        // This function calculates items expiring within the next 30 days
        // You can modify this logic based on your specific business requirements
        let expiringSoonCount = 0;
        
        const currentDate = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(currentDate.getDate() + 30);

        // Check raw materials for expiry dates
        if (this.rawMaterials) {
            expiringSoonCount += this.rawMaterials.filter(material => {
                if (material.expiry_date) {
                    const expiryDate = new Date(material.expiry_date);
                    return expiryDate <= thirtyDaysFromNow && expiryDate >= currentDate;
                }
                return false;
            }).length;
        }

        // Check finished products for expiry dates
        if (this.finishedProducts) {
            expiringSoonCount += this.finishedProducts.filter(product => {
                if (product.expiry_date) {
                    const expiryDate = new Date(product.expiry_date);
                    return expiryDate <= thirtyDaysFromNow && expiryDate >= currentDate;
                }
                return false;
            }).length;
        }

        return expiringSoonCount;
    }

    displayRawMaterials() {
        this.displayInventoryTable('rawMaterials', {
            data: this.rawMaterials,
            tableBodyId: 'rawMaterialsTableBody',
            emptyMessage: 'No Raw Materials Found',
            nameField: 'material_name',
            lowStockStatus: 'REORDER_NEEDED',
            rowCreator: 'createRawMaterialTableRow',
            columns: 11
        });
    }

    displayFinishedProducts() {
        this.displayInventoryTable('finishedProducts', {
            data: this.finishedProducts,
            tableBodyId: 'finishedProductsTableBody',
            emptyMessage: 'No Finished Products Found',
            nameField: 'product_name',
            lowStockStatus: 'PRODUCTION_NEEDED',
            rowCreator: 'createFinishedProductTableRow',
            columns: 11
        });
    }

    displayInventoryTable(type, config) {
        const tableBody = document.getElementById(config.tableBodyId);
        if (!tableBody) return;

        if (config.data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="${config.columns}" class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h5 class="mt-2">${config.emptyMessage}</h5>
                        <p class="text-muted">Check your inventory setup or refresh the page.</p>
                    </td>
                </tr>
            `;
            this.updateTableInfo(type, 0, 0, 0);
            return;
        }

        // Apply filters
        let filteredData = this.applyFilters(config.data, type);
        
        // Low stock filter
        if (this.showOnlyLowStock[type]) {
            filteredData = filteredData.filter(item => item.stock_status === config.lowStockStatus);
        }
        
        // Apply search
        if (this.searchTerm[type]) {
            filteredData = filteredData.filter(item => {
                const name = item[config.nameField] || '';
                const sku = item.sku || '';
                const category = item.category_name || item.category || '';
                const searchTerm = this.searchTerm[type].toLowerCase();
                
                return name.toLowerCase().includes(searchTerm) ||
                       sku.toLowerCase().includes(searchTerm) ||
                       category.toLowerCase().includes(searchTerm);
            });
        }
        
        // Sort data
        filteredData = this.applySorting(filteredData, type);
        
        // Calculate pagination
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage[type]);
        const startIndex = (this.currentPage[type] - 1) * this.itemsPerPage[type];
        const endIndex = Math.min(startIndex + this.itemsPerPage[type], totalItems);
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        // Generate table rows
        tableBody.innerHTML = paginatedData.map(item => this[config.rowCreator](item)).join('');
        
        // Update pagination and info
        this.updatePagination(type, totalPages);
        this.updateTableInfo(type, startIndex + 1, endIndex, totalItems);
        this.setupRowSelection(type);
        this.updateLowStockBadges();
    }

    createRawMaterialTableRow(material) {
        const isLowStock = material.stock_status === 'REORDER_NEEDED';
        const shortageAmount = isLowStock ? material.reorder_level - material.quantity_on_hand : 0;
        const statusClass = this.getStatusBadgeClass(material.stock_status);
        const stockLevelClass = this.getStockLevelClass(material.quantity_on_hand, material.reorder_level, material.max_stock_level);

        return `
            <tr class="${isLowStock ? 'table-danger' : ''}" data-material-id="${material.raw_material_id}">
                <td class="text-center">
                    <input type="checkbox" class="form-check-input row-checkbox" data-type="rawMaterials" data-id="${material.raw_material_id}">
                </td>
                <td>
                    <span class="fw-medium">${material.sku}</span>
                </td>
                <td>
                    <div class="fw-medium">${material.material_name}</div>
                    ${isLowStock ? `<small class="text-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i>Shortage: ${shortageAmount} ${material.unit_of_measure || 'units'}</small>` : ''}
                </td>
                <td>
                    <span class="badge bg-secondary">${material.category || 'Uncategorized'}</span>
                </td>
                <td class="text-center">
                    <span class="fw-bold ${stockLevelClass}">${Math.floor(material.quantity_on_hand || 0)}</span>
                </td>
                <td class="text-center">
                    <small class="text-muted">${material.unit_of_measure || 'N/A'}</small>
                </td>
                <td class="text-end">
                    <span class="fw-medium">${this.formatCurrency(material.inventory_value)}</span>
                </td>
                <td>
                    <small class="text-muted">
                        ${material.cheapest_supplier_cost && material.most_expensive_cost ?
                            `${this.formatCurrency(material.cheapest_supplier_cost)} - ${this.formatCurrency(material.most_expensive_cost)}` :
                            'No suppliers'}
                    </small>
                </td>
                <td class="text-center">
                    <span class="status-badge ${statusClass}">${this.getStockStatusText(material.stock_status)}</span>
                </td>
                <td class="text-center">
                    <span class="badge bg-info">${material.available_suppliers || 0}</span>
                </td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary action-btn btn-view" title="View Details"
                                onclick="viewMaterialDetails('${material.raw_material_id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${isLowStock ? `
                        <button class="btn btn-sm btn-danger action-btn btn-reorder" title="Create Purchase Order"
                                onclick="inventoryDashboard.createPurchaseOrder('${material.raw_material_id}', '${material.material_name}', ${shortageAmount}, '${material.unit_of_measure}')">
                            <i class="bi bi-cart-plus"></i>
                        </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-secondary action-btn btn-edit" title="Adjust Stock"
                                onclick="adjustStock('${material.raw_material_id}', '${material.material_name}', ${material.quantity_on_hand})">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    createFinishedProductTableRow(product) {
        const isLowStock = product.stock_status === 'PRODUCTION_NEEDED';
        const statusClass = this.getStatusBadgeClass(product.stock_status);
        const stockLevelClass = this.getStockLevelClass(product.quantity_on_hand, product.reorder_level, product.max_stock_level);

        return `
            <tr class="${isLowStock ? 'table-warning' : ''}" data-product-id="${product.finished_product_id}">
                <td class="text-center">
                    <input type="checkbox" class="form-check-input row-checkbox" data-type="finishedProducts" data-id="${product.finished_product_id}">
                </td>
                <td>
                    <span class="fw-medium">${product.sku}</span>
                </td>
                <td>
                    <div class="fw-medium">${product.product_name}</div>
                    ${product.expiry_status !== 'OK' ? `<small class="text-warning"><i class="bi bi-calendar-x me-1"></i>Expires: ${product.days_until_expiry} days</small>` : ''}
                </td>
                <td>
                    <span class="badge bg-secondary">${product.category_name || product.category || 'Uncategorized'}</span>
                </td>
                <td class="text-center">
                    <span class="fw-bold ${stockLevelClass}">${Math.floor(product.quantity_on_hand || 0)}</span>
                </td>
                <td class="text-center">
                    <small class="text-muted">${product.unit_name || product.unit_of_measure || 'N/A'}</small>
                </td>
                <td class="text-end">
                    <span class="fw-medium">${this.formatCurrency(product.inventory_retail_value)}</span>
                </td>
                <td class="text-end">
                    <span class="fw-medium text-primary">${this.formatCurrency(product.selling_price)}</span>
                </td>
                <td class="text-center">
                    <span class="status-badge ${statusClass}">${this.getStockStatusText(product.stock_status)}</span>
                </td>
                <td class="text-center">
                    <span class="badge ${product.quality_grade === 'Premium' ? 'bg-success' : product.quality_grade === 'Standard' ? 'bg-warning' : 'bg-secondary'}">
                        ${product.quality_grade || 'N/A'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary action-btn btn-view" title="View Details"
                                onclick="viewProductDetails('${product.finished_product_id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${isLowStock ? `
                        <button class="btn btn-sm btn-warning action-btn" title="Schedule Production"
                                onclick="scheduleProduction('${product.finished_product_id}', '${product.product_name}')">
                            <i class="bi bi-gear"></i>
                        </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-secondary action-btn btn-edit" title="Adjust Stock"
                                onclick="adjustStock('${product.finished_product_id}', '${product.product_name}', ${product.quantity_on_hand})">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    groupByCategory(items, categoryField) {
        return items.reduce((groups, item) => {
            const category = item[categoryField] || 'Other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(item);
            return groups;
        }, {});
    }

    getStockStatusClass(status) {
        const statusMap = {
            'REORDER_NEEDED': 'reorder-needed',
            'PRODUCTION_NEEDED': 'production-needed',
            'OVERSTOCKED': 'overstocked',
            'NORMAL': 'normal'
        };
        return statusMap[status] || 'normal';
    }

    getStockStatusText(status) {
        const statusMap = {
            'REORDER_NEEDED': 'Reorder',
            'PRODUCTION_NEEDED': 'Produce',
            'OVERSTOCKED': 'Excess',
            'NORMAL': 'Good'
        };
        return statusMap[status] || 'Good';
    }

    getExpiryStatusClass(status) {
        const statusMap = {
            'URGENT': 'bg-danger',
            'WARNING': 'bg-warning',
            'OK': 'bg-success'
        };
        return statusMap[status] || 'bg-success';
    }

    getEmptyStateHTML(type) {
        return `
            <div class="text-center py-4">
                <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                <h5 class="text-muted mt-2">No ${type} found</h5>
                <p class="text-muted">Check your inventory setup or refresh the page.</p>
            </div>
        `;
    }

    groupByCategory(items, categoryField) {
        return items.reduce((groups, item) => {
            const category = item[categoryField] || 'Other';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(item);
            return groups;
        }, {});
    }

    getEmptyStateHTML(type) {
        return `
            <div class="text-center py-4">
                <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                <h5 class="text-muted mt-2">No ${type} found</h5>
                <p class="text-muted">Check your inventory setup or refresh the page.</p>
            </div>
        `;
    }

    // New table-based methods
    applyFilters(items, type) {
        let filteredItems = [...items];

        // Category filter
        const categoryFilter = document.getElementById(type === 'rawMaterials' ? 'categoryFilter' : 'finishedCategoryFilter');
        if (categoryFilter && categoryFilter.value) {
            filteredItems = filteredItems.filter(item => {
                const categoryField = type === 'rawMaterials' ? 'category' : 'category_name';
                return item[categoryField] === categoryFilter.value;
            });
        }

        // Status filter
        const statusFilter = document.getElementById(type === 'rawMaterials' ? 'statusFilter' : 'finishedStatusFilter');
        if (statusFilter && statusFilter.value) {
            filteredItems = filteredItems.filter(item => item.stock_status === statusFilter.value);
        }

        return filteredItems;
    }

    applySorting(items, type) {
        // For now, return items as-is. Sorting will be implemented with column headers
        return items;
    }

    updatePagination(type, totalPages) {
        const paginationElement = document.getElementById(`${type}Pagination`);
        if (!paginationElement) return;

        const currentPage = this.currentPage[type];
        let paginationHTML = '<ul class="pagination pagination-sm mb-0">';

        // Previous button
        paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" data-type="${type}">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>`;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page if not in range
        if (startPage > 1) {
            paginationHTML += `<li class="page-item">
                <a class="page-link" href="#" data-page="1" data-type="${type}">1</a>
            </li>`;
            if (startPage > 2) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // Visible pages
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}" data-type="${type}">${i}</a>
            </li>`;
        }

        // Last page if not in range
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            paginationHTML += `<li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}" data-type="${type}">${totalPages}</a>
            </li>`;
        }

        // Next button
        paginationHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" data-type="${type}">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>`;

        paginationHTML += '</ul>';
        paginationElement.innerHTML = paginationHTML;

        // Add event listeners
        this.setupPaginationEvents(type);
    }

    updateTableInfo(type, start, end, total) {
        const infoElement = document.getElementById(`${type}Info`);
        if (infoElement) {
            if (total === 0) {
                infoElement.textContent = 'No entries';
            } else {
                infoElement.textContent = `Showing ${start} to ${end} of ${total} entries`;
            }
        }
    }

    setupRowSelection(type) {
        // Select all checkbox
        const selectAllCheckbox = document.getElementById(`selectAll${type === 'rawMaterials' ? 'RawMaterials' : 'FinishedProducts'}`);
        const rowCheckboxes = document.querySelectorAll(`.row-checkbox[data-type="${type}"]`);

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                rowCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
                this.updateBulkActionsVisibility(type);
            });
        }

        // Individual row checkboxes
        rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const checkedBoxes = document.querySelectorAll(`.row-checkbox[data-type="${type}"]:checked`);
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = checkedBoxes.length === rowCheckboxes.length;
                    selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < rowCheckboxes.length;
                }
                this.updateBulkActionsVisibility(type);
            });
        });
    }

    updateBulkActionsVisibility(type) {
        const checkedBoxes = document.querySelectorAll(`.row-checkbox[data-type="${type}"]:checked`);
        const bulkActionsBar = document.querySelector('.bulk-actions-bar');

        if (bulkActionsBar) {
            if (checkedBoxes.length > 0) {
                bulkActionsBar.style.display = 'block';
                // Update bulk actions bar with selected count
                const countElement = bulkActionsBar.querySelector('.selected-count');
                if (countElement) {
                    countElement.textContent = `${checkedBoxes.length} item(s) selected`;
                }
            } else {
                bulkActionsBar.style.display = 'none';
            }
        }
    }

    getStatusBadgeClass(status) {
        const statusMap = {
            'REORDER_NEEDED': 'status-reorder',
            'PRODUCTION_NEEDED': 'status-production-needed',
            'OVERSTOCKED': 'status-overstocked',
            'NORMAL': 'status-normal'
        };
        return statusMap[status] || 'status-normal';
    }

    getStockLevelClass(quantity, reorderLevel, maxLevel) {
        if (quantity <= reorderLevel) return 'stock-low';
        if (quantity >= maxLevel) return 'stock-high';
        return 'stock-normal';
    }

    displayErrorInTab(tabId, message) {
        const container = document.getElementById(tabId.replace('-pane', 'Inventory'));
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                    <h5 class="text-danger mt-2">Error Loading Data</h5>
                    <p class="text-muted">${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise me-1"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const targetTab = event.target.getAttribute('data-bs-target');
                if (targetTab === '#raw-materials-pane') {
                    this.displayRawMaterials();
                } else if (targetTab === '#finished-products-pane') {
                    this.displayFinishedProducts();
                }
            });
        });

        // Search inputs
        const rawMaterialsSearch = document.getElementById('rawMaterialsSearch');
        const finishedProductsSearch = document.getElementById('finishedProductsSearch');

        if (rawMaterialsSearch) {
            rawMaterialsSearch.addEventListener('input', (e) => {
                this.searchTerm.rawMaterials = e.target.value;
                this.currentPage.rawMaterials = 1;
                this.displayRawMaterials();
            });
        }

        if (finishedProductsSearch) {
            finishedProductsSearch.addEventListener('input', (e) => {
                this.searchTerm.finishedProducts = e.target.value;
                this.currentPage.finishedProducts = 1;
                this.displayFinishedProducts();
            });
        }

        // Items per page selectors
        const rawMaterialsPerPage = document.getElementById('rawMaterialsPerPage');
        const finishedProductsPerPage = document.getElementById('finishedProductsPerPage');

        if (rawMaterialsPerPage) {
            rawMaterialsPerPage.addEventListener('change', (e) => {
                this.itemsPerPage.rawMaterials = parseInt(e.target.value);
                this.currentPage.rawMaterials = 1;
                this.displayRawMaterials();
            });
        }

        if (finishedProductsPerPage) {
            finishedProductsPerPage.addEventListener('change', (e) => {
                this.itemsPerPage.finishedProducts = parseInt(e.target.value);
                this.currentPage.finishedProducts = 1;
                this.displayFinishedProducts();
            });
        }

        // Filter dropdowns
        this.setupFilterListeners();
    }

    setupFilterListeners() {
        // Category filters
        const categoryFilter = document.getElementById('categoryFilter');
        const finishedCategoryFilter = document.getElementById('finishedCategoryFilter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.currentPage.rawMaterials = 1;
                this.displayRawMaterials();
            });
        }

        if (finishedCategoryFilter) {
            finishedCategoryFilter.addEventListener('change', () => {
                this.currentPage.finishedProducts = 1;
                this.displayFinishedProducts();
            });
        }

        // Status filters
        const statusFilter = document.getElementById('statusFilter');
        const finishedStatusFilter = document.getElementById('finishedStatusFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentPage.rawMaterials = 1;
                this.displayRawMaterials();
            });
        }

        if (finishedStatusFilter) {
            finishedStatusFilter.addEventListener('change', () => {
                this.currentPage.finishedProducts = 1;
                this.displayFinishedProducts();
            });
        }
    }

    populateCategoryFilters() {
        // Populate raw materials category filter
        const rawMaterialsCategories = [...new Set(this.rawMaterials.map(item => item.category).filter(cat => cat))];
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            rawMaterialsCategories.forEach(category => {
                categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
            });
        }

        // Populate finished products category filter
        const finishedProductsCategories = [...new Set(this.finishedProducts.map(item => item.category_name || item.category).filter(cat => cat))];
        const finishedCategoryFilter = document.getElementById('finishedCategoryFilter');
        if (finishedCategoryFilter) {
            finishedCategoryFilter.innerHTML = '<option value="">All Categories</option>';
            finishedProductsCategories.forEach(category => {
                finishedCategoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
            });
        }
    }

    createPurchaseOrder(materialId, materialName, shortageAmount, unitOfMeasure) {
        console.log('🛒 Creating purchase order for:', { materialId, materialName, shortageAmount, unitOfMeasure });
        
        // Create a purchase order for the low stock item
        const suggestedQuantity = Math.ceil(shortageAmount * 1.2); // Add 20% buffer

        // Find the material to get supplier information
        const material = this.rawMaterials.find(m => m.raw_material_id === materialId);
        const isRawMilk = materialName.toLowerCase().includes('milk') || 
                         materialName.toLowerCase().includes('dairy') ||
                         (material && material.category && material.category.toLowerCase().includes('dairy'));

        // Store the purchase order data in session storage to pre-fill the form
        const purchaseOrderData = {
            materialId: materialId,
            materialName: materialName,
            quantity: suggestedQuantity,
            unitOfMeasure: unitOfMeasure,
            reason: 'Low Stock Alert - Inventory Dashboard',
            source: 'inventory_dashboard',
            // Set appropriate purchase type based on material
            purchaseType: isRawMilk ? 'raw_milk' : 'general_materials',
            // Include supplier information if available
            preferredSupplierId: material?.preferred_supplier_id || null,
            supplierName: material?.preferred_supplier_name || null,
            // Additional material context
            category: material?.category || '',
            currentStock: material?.quantity_on_hand || 0,
            reorderLevel: material?.reorder_level || 0
        };

        sessionStorage.setItem('pendingPurchaseOrder', JSON.stringify(purchaseOrderData));
        console.log('💾 Stored pending purchase order in sessionStorage:', purchaseOrderData);

        // Show confirmation message with more detail
        const purchaseTypeText = isRawMilk ? 'Raw Milk & Dairy' : 'General Raw Materials';
        this.showAlert('success', `Redirecting to create ${purchaseTypeText} requisition for ${materialName}...`, 2000);

        // Small delay to let user see the message, then redirect
        setTimeout(() => {
            // Redirect to inventory requisition page
            window.location.href = 'inventory-requisition.html';
        }, 1000);
    }

    createPaginationControls(type, totalPages) {
        const currentPage = this.currentPage[type];
        let paginationHTML = `
            <nav aria-label="${type} pagination" class="mt-4">
                <ul class="pagination pagination-sm justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}" data-type="${type}">
                            <i class="bi bi-chevron-left"></i>
                        </a>
                    </li>`;

        // Calculate page range to show
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Add first page if not in range
        if (startPage > 1) {
            paginationHTML += `<li class="page-item">
                <a class="page-link" href="#" data-page="1" data-type="${type}">1</a>
            </li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Add visible pages
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}" data-type="${type}">${i}</a>
            </li>`;
        }

        // Add last page if not in range
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}" data-type="${type}">${totalPages}</a>
            </li>`;
        }

        paginationHTML += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}" data-type="${type}">
                            <i class="bi bi-chevron-right"></i>
                        </a>
                    </li>
                </ul>
            </nav>`;

        return paginationHTML;
    }

    setupPaginationEvents(type) {
        // Remove existing event listeners
        document.querySelectorAll(`[data-type="${type}"][data-page]`).forEach(link => {
            link.removeEventListener('click', this.handlePaginationClick);
        });

        // Add new event listeners
        document.querySelectorAll(`[data-type="${type}"][data-page]`).forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.closest('[data-page]').getAttribute('data-page'));
                if (page > 0 && page <= Math.ceil(this[type === 'rawMaterials' ? 'rawMaterials' : 'finishedProducts'].length / this.itemsPerPage[type])) {
                    this.currentPage[type] = page;
                    if (type === 'rawMaterials') {
                        this.displayRawMaterials();
                    } else {
                        this.displayFinishedProducts();
                    }
                }
            });
        });
    }

    handlePaginationClick(e) {
        e.preventDefault();
        const page = parseInt(e.target.closest('[data-page]').getAttribute('data-page'));
        const type = e.target.closest('[data-page]').getAttribute('data-type');

        if (page > 0) {
            this.currentPage[type] = page;
            if (type === 'rawMaterials') {
                this.displayRawMaterials();
            } else {
                this.displayFinishedProducts();
            }
        }
    }

    showSuccessMessage() {
        this.showToast('Two-tier inventory dashboard loaded successfully!', 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();
        
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="bi bi-info-circle text-${type} me-2"></i>
                    <strong class="me-auto">Highland Fresh Inventory</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${message}</div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();
        
        // Remove toast element after it's hidden
        document.getElementById(toastId).addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }

    showAlert(type, message, duration = 3000) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        alertDiv.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after specified duration
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, duration);
    }
}

// Global functions for button clicks and external access
function refreshInventory() {
    if (window.inventoryDashboard) {
        window.inventoryDashboard.loadInventorySummary();
        window.inventoryDashboard.loadRawMaterials();
        window.inventoryDashboard.loadFinishedProducts();
        // Force update statistics after refresh
        setTimeout(() => {
            window.inventoryDashboard.updateTopStatisticsFromLoadedData();
        }, 500);
    } else {
        location.reload();
    }
}

function viewRawMaterials() {
    const tab = document.getElementById('raw-materials-tab');
    if (tab) {
        const tabInstance = new bootstrap.Tab(tab);
        tabInstance.show();
    }
}

function viewFinishedProducts() {
    const tab = document.getElementById('finished-products-tab');
    if (tab) {
        const tabInstance = new bootstrap.Tab(tab);
        tabInstance.show();
    }
}

function logout() {
    // Implement logout functionality
    window.location.href = '../html/login.html';
}

// Action functions for table rows
function viewMaterialDetails(materialId) {
    // Implement view material details
    console.log('View material details:', materialId);
    // You can implement a modal or redirect to a detail page
}

function viewProductDetails(productId) {
    // Implement view product details
    console.log('View product details:', productId);
    // You can implement a modal or redirect to a detail page
}

function adjustStock(id, name, currentStock) {
    // Implement stock adjustment
    const newStock = prompt(`Adjust stock for "${name}"\nCurrent stock: ${currentStock}\n\nEnter new stock level:`, currentStock);
    if (newStock !== null && newStock !== currentStock) {
        console.log('Adjust stock:', id, name, currentStock, '->', newStock);
        // Implement the actual stock adjustment logic
    }
}

function scheduleProduction(productId, productName) {
    // Implement production scheduling
    console.log('Schedule production for:', productId, productName);
    // You can implement a modal or redirect to production planning
}

function bulkReorderSelected() {
    const selectedMaterials = document.querySelectorAll('.row-checkbox[data-type="rawMaterials"]:checked');
    if (selectedMaterials.length === 0) {
        alert('Please select materials to reorder');
        return;
    }

    const materialIds = Array.from(selectedMaterials).map(cb => cb.getAttribute('data-id'));
    console.log('Bulk reorder materials:', materialIds);
    
    // Store bulk reorder data
    const bulkOrderData = {
        materialIds: materialIds,
        reason: 'Bulk Reorder from Inventory Dashboard',
        source: 'inventory_dashboard_bulk'
    };

    sessionStorage.setItem('pendingBulkPurchaseOrder', JSON.stringify(bulkOrderData));
    
    // Show confirmation and redirect
    if (window.inventoryDashboard) {
        window.inventoryDashboard.showAlert('success', `Redirecting to create bulk requisition for ${materialIds.length} materials...`, 2000);
    }
    
    setTimeout(() => {
        window.location.href = 'inventory-requisition.html';
    }, 1000);
}

function exportSelected() {
    const selectedRawMaterials = document.querySelectorAll('.row-checkbox[data-type="rawMaterials"]:checked');
    const selectedFinishedProducts = document.querySelectorAll('.row-checkbox[data-type="finishedProducts"]:checked');

    if (selectedRawMaterials.length === 0 && selectedFinishedProducts.length === 0) {
        alert('Please select items to export');
        return;
    }

    console.log('Export selected items');
    // Implement export logic
}

function exportToCSV(type) {
    console.log('Export to CSV:', type);
    // Implement CSV export
}

function exportToPDF(type) {
    console.log('Export to PDF:', type);
    // Implement PDF export
}

function printInventory(type) {
    console.log('Print inventory:', type);
    // Implement print functionality
    window.print();
}

function clearSelection() {
    // Clear all checkboxes
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    // Clear select all checkboxes
    document.querySelectorAll('#selectAllRawMaterials, #selectAllFinishedProducts').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.indeterminate = false;
    });

    // Hide bulk actions bar
    const bulkActionsBar = document.querySelector('.bulk-actions-bar');
    if (bulkActionsBar) {
        bulkActionsBar.style.display = 'none';
    }
}

// Missing functions for complete functionality
function deleteSelected() {
    const selectedRawMaterials = document.querySelectorAll('.row-checkbox[data-type="rawMaterials"]:checked');
    const selectedFinishedProducts = document.querySelectorAll('.row-checkbox[data-type="finishedProducts"]:checked');

    if (selectedRawMaterials.length === 0 && selectedFinishedProducts.length === 0) {
        alert('Please select items to delete');
        return;
    }

    if (confirm('Are you sure you want to delete the selected items? This action cannot be undone.')) {
        console.log('Delete selected items');
        // Implement delete logic here
    }
}

function sortTable(tableType, column) {
    console.log('Sort table:', tableType, 'by column:', column);
    // Implement table sorting logic
    if (window.inventoryDashboard) {
        // Call the dashboard instance sorting method if available
        if (tableType === 'rawMaterials') {
            window.inventoryDashboard.displayRawMaterials();
        } else if (tableType === 'finishedProducts') {
            window.inventoryDashboard.displayFinishedProducts();
        }
    }
}

function bulkProduceSelected() {
    const selectedProducts = document.querySelectorAll('.row-checkbox[data-type="finishedProducts"]:checked');
    if (selectedProducts.length === 0) {
        alert('Please select finished products for bulk production');
        return;
    }

    const productIds = Array.from(selectedProducts).map(cb => cb.getAttribute('data-id'));
    console.log('Bulk produce products:', productIds);
    // Implement bulk production logic
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.inventoryDashboard = new TwoTierInventoryDashboard();
    console.log('Two-Tier Inventory Dashboard initialized');
});
