// Warehouse Staff Dashboard JavaScript
// Task-oriented interface for receiving and dispatching goods

class WarehouseStaffDashboard {
    constructor() {
        this.init();
    }

    init() {
        // Check authentication and role
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        const user = getLoggedInUser();
        if (!user || (user.role !== 'Warehouse Staff' && user.role !== 'Admin')) {
            alert('Unauthorized access. This page is for Warehouse Staff only.');
            window.location.href = 'login.html';
            return;
        }

        // Display user info
        this.displayUserInfo(user);

        // Update current date/time
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 60000);

        // Load tasks
        this.loadTasks();

        // Setup search functionality
        this.setupSearch();
    }

    displayUserInfo(user) {
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement) {
            const displayName = user.full_name || user.username || 'Staff';
            currentUserElement.textContent = displayName;
        }
    }

    updateDateTime() {
        const dateTimeElement = document.getElementById('currentDateTime');
        if (dateTimeElement) {
            const now = new Date();
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    async loadTasks() {
        await Promise.all([
            this.loadPurchaseOrdersToReceive(),
            this.loadOrdersToDispatch(),
            this.loadCompletedToday()
        ]);
    }

    async loadPurchaseOrdersToReceive() {
        try {
            const response = await axios.get(APIResponseHandler.getApiUrl('PurchaseOrdersAPI.php'), {
                params: {
                    operation: 'getOpenPOs' // POs that need receiving
                },
                withCredentials: true
            });

            const container = document.getElementById('purchaseOrdersList');
            const badge = document.getElementById('receivingCountBadge');
            const stat = document.getElementById('pendingReceivingCount');

            if (response.data.success && response.data.data && response.data.data.length > 0) {
                const pos = response.data.data;
                badge.textContent = pos.length;
                stat.textContent = pos.length;

                let html = `
                    <table class="table data-table mb-0">
                        <thead>
                            <tr>
                                <th style="width: 12%;">PO Number</th>
                                <th style="width: 28%;">Supplier</th>
                                <th style="width: 15%;">Order Date</th>
                                <th style="width: 15%;">Expected Delivery</th>
                                <th style="width: 12%;">Status</th>
                                <th style="width: 18%;" class="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                pos.forEach(po => {
                    const isUrgent = this.isUrgentPO(po);
                    const statusClass = isUrgent ? 'status-urgent' : 'status-normal';
                    const statusText = isUrgent ? 'Urgent' : 'Normal';

                    html += `
                        <tr>
                            <td><span class="order-id">#${po.po_number || po.po_id}</span></td>
                            <td><span class="entity-name">${po.supplier_name || 'N/A'}</span></td>
                            <td><span class="meta-info">${this.formatDate(po.order_date)}</span></td>
                            <td><span class="meta-info">${this.formatDate(po.expected_delivery_date)}</span></td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td class="text-end">
                                <button class="btn action-button btn-receive" onclick="window.warehouseStaffDashboard.openReceiveModal(${po.po_id})">
                                    <i class="bi bi-box-seam me-1"></i>Receive Goods
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;

                container.innerHTML = html;
            } else {
                badge.textContent = '0';
                stat.textContent = '0';
                container.innerHTML = `
                    <div class="empty-workspace">
                        <i class="bi bi-check-circle"></i>
                        <h6>All Caught Up!</h6>
                        <p>No purchase orders waiting to be received.</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading purchase orders:', error);
            document.getElementById('purchaseOrdersList').innerHTML = `
                <div class="alert alert-warning m-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Failed to load purchase orders. Please refresh the page.
                </div>
            `;
        }
    }

    async loadOrdersToDispatch() {
        try {
            const response = await axios.get(APIResponseHandler.getApiUrl('SalesAPI.php'), {
                params: {
                    operation: 'getApprovedOrders' // Approved orders ready for dispatch
                },
                withCredentials: true
            });

            const container = document.getElementById('salesOrdersList');
            const badge = document.getElementById('dispatchCountBadge');
            const stat = document.getElementById('pendingDispatchCount');

            if (response.data.success && response.data.data && response.data.data.length > 0) {
                const orders = response.data.data;
                badge.textContent = orders.length;
                stat.textContent = orders.length;

                let html = `
                    <table class="table data-table mb-0">
                        <thead>
                            <tr>
                                <th style="width: 12%;">Order #</th>
                                <th style="width: 25%;">Customer</th>
                                <th style="width: 15%;">Order Date</th>
                                <th style="width: 15%;">Amount</th>
                                <th style="width: 12%;">Status</th>
                                <th style="width: 21%;" class="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                orders.forEach(order => {
                    const isUrgent = this.isUrgentOrder(order);
                    const statusClass = isUrgent ? 'status-urgent' : 'status-normal';
                    const statusText = isUrgent ? 'Urgent' : 'Normal';

                    html += `
                        <tr>
                            <td data-label="Order"><span class="order-id">#${order.order_number || order.sale_id}</span></td>
                            <td data-label="Customer"><span class="entity-name">${order.customer_name || 'N/A'}</span></td>
                            <td data-label="Date"><span class="meta-info">${this.formatDate(order.order_date || order.created_at)}</span></td>
                            <td data-label="Amount"><span class="amount-display">₱${parseFloat(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></td>
                            <td data-label="Status"><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td data-label="">
                                <button class="btn action-button btn-dispatch" onclick="window.warehouseStaffDashboard.openDispatchModal(${order.sale_id})">
                                    <i class="bi bi-truck me-1"></i>Dispatch
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;

                container.innerHTML = html;
            } else {
                badge.textContent = '0';
                stat.textContent = '0';
                container.innerHTML = `
                    <div class="empty-workspace">
                        <i class="bi bi-check-circle"></i>
                        <h6>All Caught Up!</h6>
                        <p>No orders waiting to be dispatched.</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading sales orders:', error);
            document.getElementById('salesOrdersList').innerHTML = `
                <div class="alert alert-warning m-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Failed to load sales orders. Please refresh the page.
                </div>
            `;
        }
    }

    async loadCompletedToday() {
        try {
            const response = await axios.get(APIResponseHandler.getApiUrl('SalesAPI.php'), {
                params: {
                    operation: 'getCompletedToday' // Orders completed today
                },
                withCredentials: true
            });

            const stat = document.getElementById('completedTodayCount');
            if (stat) {
                if (response.data.success && response.data.count !== undefined) {
                    stat.textContent = response.data.count;
                } else if (response.data.success && response.data.data) {
                    stat.textContent = response.data.data.length;
                } else {
                    stat.textContent = '0';
                }
            }

        } catch (error) {
            console.error('Error loading completed count:', error);
            const stat = document.getElementById('completedTodayCount');
            if (stat) stat.textContent = '0';
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('inventorySearch');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchInventory();
                }
            });
        }
    }

    async searchInventory() {
        const searchTerm = document.getElementById('inventorySearch').value.trim();
        const resultsContainer = document.getElementById('searchResults');

        if (!searchTerm) {
            resultsContainer.innerHTML = '';
            return;
        }

        resultsContainer.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Searching...</span>
                </div>
            </div>
        `;

        try {
            // Search both raw materials and finished products
            const [rawMaterialsResponse, productsResponse] = await Promise.all([
                axios.get(APIResponseHandler.getApiUrl('RawMaterialsAPI.php'), {
                    params: { action: 'get_all' },
                    withCredentials: true
                }),
                axios.get(APIResponseHandler.getApiUrl('ProductsAPI.php'), {
                    params: { operation: 'getAllProducts' },
                    withCredentials: true
                })
            ]);

            // Filter by search term client-side
            const searchLower = searchTerm.toLowerCase();
            let html = '';
            let foundResults = false;

            // Raw Materials Results - filter by search term
            const filteredMaterials = (rawMaterialsResponse.data.data || []).filter(item => 
                (item.name || '').toLowerCase().includes(searchLower) ||
                (item.product_name || '').toLowerCase().includes(searchLower) ||
                (item.barcode || '').toLowerCase().includes(searchLower) ||
                (item.sku || '').toLowerCase().includes(searchLower)
            );
            
            if (filteredMaterials.length > 0) {
                foundResults = true;
                html += `
                    <div class="results-group">
                        <div class="results-group-title"><i class="bi bi-box me-2"></i>Raw Materials</div>
                        <div class="results-data-table">
                            <table class="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>Material Name</th>
                                        <th>SKU</th>
                                        <th>Stock Quantity</th>
                                        <th>Unit</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                rawMaterialsResponse.data.data.forEach(item => {
                    // Skip items not in filtered list
                    if (!filteredMaterials.find(m => m.product_id === item.product_id)) return;
                    
                    const quantity = parseFloat(item.quantity_on_hand || 0);
                    const reorder = parseFloat(item.reorder_level || 0);
                    let statusClass = 'inventory-ok';
                    let statusText = 'In Stock';

                    if (quantity === 0) {
                        statusClass = 'inventory-out';
                        statusText = 'Out of Stock';
                    } else if (quantity <= reorder) {
                        statusClass = 'inventory-low';
                        statusText = 'Low Stock';
                    }

                    html += `
                        <tr>
                            <td><strong>${item.name}</strong></td>
                            <td><code style="font-size: 0.875rem; color: #6c757d;">${item.sku || 'N/A'}</code></td>
                            <td><strong>${quantity.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                            <td>${item.unit_of_measure || 'units'}</td>
                            <td><span class="inventory-badge ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
                });

                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // Finished Products Results - filter by search term
            const filteredProducts = (productsResponse.data.data || []).filter(item => 
                (item.name || '').toLowerCase().includes(searchLower) ||
                (item.product_name || '').toLowerCase().includes(searchLower) ||
                (item.sku || '').toLowerCase().includes(searchLower)
            );
            
            if (filteredProducts.length > 0) {
                foundResults = true;
                html += `
                    <div class="results-group">
                        <div class="results-group-title"><i class="bi bi-droplet me-2"></i>Finished Products</div>
                        <div class="results-data-table">
                            <table class="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th>SKU</th>
                                        <th>Stock Quantity</th>
                                        <th>Unit</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                filteredProducts.forEach(item => {
                    const quantity = parseFloat(item.quantity_on_hand || 0);
                    const reorder = parseFloat(item.reorder_level || 0);
                    let statusClass = 'inventory-ok';
                    let statusText = 'In Stock';

                    if (quantity === 0) {
                        statusClass = 'inventory-out';
                        statusText = 'Out of Stock';
                    } else if (quantity <= reorder) {
                        statusClass = 'inventory-low';
                        statusText = 'Low Stock';
                    }

                    html += `
                        <tr>
                            <td><strong>${item.name}</strong></td>
                            <td><code style="font-size: 0.875rem; color: #6c757d;">${item.sku || 'N/A'}</code></td>
                            <td><strong>${quantity.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                            <td>${item.unit_of_measure || 'units'}</td>
                            <td><span class="inventory-badge ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
                });

                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            if (!foundResults) {
                html = `
                    <div class="empty-workspace">
                        <i class="bi bi-search"></i>
                        <h6>No Results Found</h6>
                        <p>No items found matching "${searchTerm}"</p>
                    </div>
                `;
            }

            resultsContainer.innerHTML = html;

        } catch (error) {
            console.error('Error searching inventory:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Failed to search inventory. Please try again.
                </div>
            `;
        }
    }

    openReceiveModal(poId) {
        // Show receiving modal directly in warehouse dashboard
        this.showReceiveDeliveryModal(poId);
    }

    async showReceiveDeliveryModal(poId) {
        try {
            // Fetch PO details - API expects 'id' parameter for GET request
            const response = await axios.get(APIResponseHandler.getApiUrl('PurchaseOrdersAPI.php'), {
                params: { id: poId },
                withCredentials: true
            });

            if (!response.data.success) {
                this.showToast('error', 'Failed to load purchase order details');
                return;
            }

            const po = response.data.data;
            this.currentReceivingPO = po;

            // Populate modal header info
            document.getElementById('receivePONumber').textContent = po.po_number || `PO-${poId}`;
            document.getElementById('receiveSupplierName').textContent = po.supplier_name || 'N/A';
            document.getElementById('receiveOrderDate').textContent = this.formatDate(po.order_date);

            // Populate items table
            this.populateReceiveItemsTable(po.items || []);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('receiveDeliveryModal'));
            modal.show();

        } catch (error) {
            console.error('Error loading PO details:', error);
            this.showToast('error', 'Error loading purchase order details');
        }
    }

    populateReceiveItemsTable(items) {
        const tableBody = document.getElementById('receiveItemsTableBody');
        
        if (!items || items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No items found</td></tr>`;
            return;
        }

        const formatQty = (num) => {
            const n = parseFloat(num) || 0;
            return n % 1 === 0 ? n.toString() : n.toFixed(3).replace(/\.?0+$/, '');
        };

        const formatCurrency = (num) => {
            return '₱' + parseFloat(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
        };

        const rowsHtml = items.map(item => {
            const orderedQty = parseFloat(item.ordered_quantity || 0);
            const receivedQty = parseFloat(item.received_quantity || 0);
            const remainingQty = orderedQty - receivedQty;
            const unitCost = parseFloat(item.unit_cost || 0);
            const isFullyReceived = receivedQty >= orderedQty;
            
            const itemName = item.raw_material_name || item.product_name || 'Unknown Item';
            const itemSku = item.raw_material_sku || item.product_sku || '';

            return `
                <tr data-item-id="${item.po_item_id}" data-ordered-qty="${orderedQty}" data-remaining-qty="${remainingQty}" data-expected-cost="${unitCost}">
                    <td>
                        <span class="entity-name">${this.escapeHtml(itemName)}</span>
                        ${itemSku ? `<br><code class="meta-info" style="font-size: 0.8rem;">${this.escapeHtml(itemSku)}</code>` : ''}
                    </td>
                    <td class="text-center">
                        <span class="amount-display">${formatQty(orderedQty)}</span>
                        ${receivedQty > 0 ? `<br><small class="text-success" style="font-size: 0.75rem;">Prev: ${formatQty(receivedQty)}</small>` : ''}
                    </td>
                    <td class="text-center">
                        ${isFullyReceived ? 
                            `<span class="status-badge status-normal">Complete</span>` :
                            `<input type="number" class="form-control form-control-sm accepted-qty-input text-center" 
                                    value="${formatQty(remainingQty)}" 
                                    min="0" max="${remainingQty}" step="0.001" 
                                    style="width: 85px; margin: 0 auto; font-weight: 600;"
                                    onchange="window.warehouseStaffDashboard.updateRejectedQty(this)"
                                    oninput="window.warehouseStaffDashboard.updateRejectedQty(this)">`
                        }
                    </td>
                    <td class="text-center">
                        ${isFullyReceived ? 
                            `<span class="meta-info">—</span>` :
                            `<span class="rejected-qty-display" style="color: #dc3545; font-weight: 600;">0</span>
                             <input type="hidden" class="rejected-qty-input" value="0">`
                        }
                    </td>
                    <td class="text-center">
                        ${isFullyReceived ? 
                            `<span class="amount-display">${formatCurrency(unitCost)}</span>` :
                            `<div class="d-flex flex-column align-items-center">
                                <small class="text-muted mb-1">Expected: ${formatCurrency(unitCost)}</small>
                                <input type="number" class="form-control form-control-sm actual-cost-input text-center" 
                                       value="${unitCost.toFixed(2)}" 
                                       min="0" step="0.01" 
                                       style="width: 100px; font-weight: 600;"
                                       title="Enter actual price from invoice"
                                       onchange="window.warehouseStaffDashboard.highlightPriceChange(this, ${unitCost})">
                            </div>`
                        }
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rowsHtml;
    }

    // Auto-calculate rejected quantity when accepted changes
    updateRejectedQty(inputElement) {
        const row = inputElement.closest('tr');
        const remainingQty = parseFloat(row.dataset.remainingQty) || 0;
        const acceptedQty = parseFloat(inputElement.value) || 0;
        
        // Ensure accepted doesn't exceed remaining
        if (acceptedQty > remainingQty) {
            inputElement.value = remainingQty;
        }
        
        // Calculate rejected = remaining - accepted
        const rejectedQty = Math.max(0, remainingQty - (parseFloat(inputElement.value) || 0));
        
        const rejectedDisplay = row.querySelector('.rejected-qty-display');
        const rejectedInput = row.querySelector('.rejected-qty-input');
        
        if (rejectedDisplay) {
            rejectedDisplay.textContent = rejectedQty % 1 === 0 ? rejectedQty.toString() : rejectedQty.toFixed(3).replace(/\.?0+$/, '');
        }
        if (rejectedInput) {
            rejectedInput.value = rejectedQty;
        }
    }

    // Highlight price input if actual differs from expected
    highlightPriceChange(inputElement, expectedCost) {
        const actualCost = parseFloat(inputElement.value) || 0;
        const diff = actualCost - expectedCost;
        const percentChange = expectedCost > 0 ? Math.abs(diff / expectedCost * 100) : 0;
        
        // Clear previous styling
        inputElement.classList.remove('border-danger', 'border-warning', 'border-success');
        
        if (Math.abs(diff) < 0.01) {
            // No change
            inputElement.classList.add('border-success');
            inputElement.title = 'Price matches expected';
        } else if (percentChange >= 10 || Math.abs(diff) >= 10) {
            // Significant change
            inputElement.classList.add('border-danger');
            inputElement.style.borderWidth = '2px';
            inputElement.title = `⚠️ Price changed ${diff > 0 ? '+' : ''}₱${diff.toFixed(2)} (${diff > 0 ? '+' : ''}${percentChange.toFixed(1)}%) - Will trigger Cost Alert!`;
        } else if (percentChange >= 5 || Math.abs(diff) >= 2) {
            // Moderate change - will trigger alert
            inputElement.classList.add('border-warning');
            inputElement.style.borderWidth = '2px';
            inputElement.title = `Price changed ${diff > 0 ? '+' : ''}₱${diff.toFixed(2)} (${diff > 0 ? '+' : ''}${percentChange.toFixed(1)}%) - Will trigger Cost Alert`;
        } else {
            // Small change - no alert
            inputElement.title = `Price changed ${diff > 0 ? '+' : ''}₱${diff.toFixed(2)} (minor, no alert)`;
        }
    }

    async processDeliveryReceipt() {
        try {
            const items = [];
            const tableRows = document.querySelectorAll('#receiveItemsTableBody tr[data-item-id]');
            
            let hasInvalidInput = false;
            let totalAccepted = 0;
            let totalRejected = 0;

            tableRows.forEach((row, index) => {
                const itemId = parseInt(row.dataset.itemId);
                const remainingQty = parseFloat(row.dataset.remainingQty);
                const expectedCost = parseFloat(row.dataset.expectedCost) || 0;
                
                const acceptedInput = row.querySelector('.accepted-qty-input');
                const rejectedInput = row.querySelector('.rejected-qty-input');
                const actualCostInput = row.querySelector('.actual-cost-input');
                
                // Skip if already fully received
                if (!acceptedInput || !rejectedInput) return;
                
                const acceptedQty = parseFloat(acceptedInput.value) || 0;
                const rejectedQty = parseFloat(rejectedInput.value) || 0;
                const actualCost = actualCostInput ? parseFloat(actualCostInput.value) || expectedCost : expectedCost;
                const totalQty = acceptedQty + rejectedQty;
                
                if (acceptedQty < 0 || rejectedQty < 0) {
                    this.showToast('error', `Item ${index + 1}: Quantities cannot be negative`);
                    hasInvalidInput = true;
                    return;
                }
                
                if (totalQty > remainingQty) {
                    this.showToast('error', `Item ${index + 1}: Total exceeds remaining quantity (${remainingQty})`);
                    hasInvalidInput = true;
                    return;
                }
                
                if (totalQty === 0) return; // Skip if no quantities entered
                
                totalAccepted += acceptedQty;
                totalRejected += rejectedQty;
                
                items.push({
                    po_item_id: itemId,
                    accepted_quantity: acceptedQty,
                    rejected_quantity: rejectedQty,
                    actual_unit_cost: actualCost  // Include actual price from invoice
                });
            });

            if (hasInvalidInput) return;
            
            if (items.length === 0) {
                this.showToast('warning', 'Please enter quantities for at least one item');
                return;
            }

            // Disable button during processing
            const confirmBtn = document.getElementById('confirmReceiveBtn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';

            // Call API to process receipt - use PUT with action=receive_delivery
            const poId = this.currentReceivingPO.po_id || this.currentReceivingPO.purchase_order_id;
            const response = await axios.put(
                `${APIResponseHandler.getApiUrl('PurchaseOrdersAPI.php')}?id=${poId}&action=receive_delivery`,
                { items: items },
                { withCredentials: true }
            );

            if (response.data.success) {
                // Close modal
                const modalEl = document.getElementById('receiveDeliveryModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                this.showToast('success', 
                    `Receipt processed: ${totalAccepted.toFixed(2)} accepted, ${totalRejected.toFixed(2)} rejected`
                );

                // Refresh the PO list
                await this.loadPurchaseOrdersToReceive();
            } else {
                this.showToast('error', response.data.message || 'Failed to process delivery');
            }

        } catch (error) {
            console.error('Error processing delivery:', error);
            this.showToast('error', 'Error processing delivery receipt');
        } finally {
            // Re-enable button
            const confirmBtn = document.getElementById('confirmReceiveBtn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="bi bi-clipboard-check me-1"></i>Confirm Receipt';
            }
        }
    }

    showToast(type, message) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            alert(message);
            return;
        }

        const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-warning';
        const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'exclamation-triangle';
        
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-${icon}-fill me-2"></i>${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastEl = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();
        
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openDispatchModal(orderId) {
        // Navigate to FIFO dispatch page with Order ID
        window.location.href = `dispatch-order.html?order_id=${orderId}`;
    }

    isUrgentPO(po) {
        // Consider urgent if expected delivery is within 2 days or overdue
        if (!po.expected_delivery_date) return false;
        const expected = new Date(po.expected_delivery_date);
        const now = new Date();
        const diffDays = Math.ceil((expected - now) / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
    }

    isUrgentOrder(order) {
        // Consider urgent if order is more than 1 day old
        if (!order.order_date && !order.created_at) return false;
        const orderDate = new Date(order.order_date || order.created_at);
        const now = new Date();
        const diffDays = Math.ceil((now - orderDate) / (1000 * 60 * 60 * 24));
        return diffDays >= 1;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Load full inventory for the unified table
    async loadFullInventory() {
        try {
            const typeFilter = document.getElementById('inventoryTypeFilter')?.value || 'all';
            const statusFilter = document.getElementById('inventoryStatusFilter')?.value || 'all';
            
            // Load both raw materials and finished products
            const [rawMaterialsResponse, productsResponse] = await Promise.all([
                axios.get(APIResponseHandler.getApiUrl('RawMaterialsAPI.php'), {
                    params: { action: 'get_all' },
                    withCredentials: true
                }),
                axios.get(APIResponseHandler.getApiUrl('ProductsAPI.php'), {
                    params: { operation: 'getAllProducts' },
                    withCredentials: true
                })
            ]);

            // Combine and normalize data
            let allItems = [];

            // Add raw materials
            if (typeFilter === 'all' || typeFilter === 'raw') {
                const rawMaterials = (rawMaterialsResponse.data.data || []).map(item => ({
                    type: 'Raw Material',
                    typeIcon: 'bi-box',
                    name: item.name || item.product_name,
                    sku: item.barcode || item.sku || 'N/A',
                    quantity: parseFloat(item.quantity_on_hand || 0),
                    reorderLevel: parseFloat(item.reorder_level || 0),
                    unit: item.unit || item.unit_of_measure || 'units',
                    materialId: item.product_id || item.raw_material_id || null  // For batch lookup
                }));
                allItems = allItems.concat(rawMaterials);
            }

            // Add finished products
            if (typeFilter === 'all' || typeFilter === 'finished') {
                const products = (productsResponse.data.data || []).map(item => ({
                    type: 'Finished Product',
                    typeIcon: 'bi-droplet',
                    name: item.name || item.product_name,
                    sku: item.sku || 'N/A',
                    quantity: parseFloat(item.quantity_on_hand || item.stock_quantity || 0),
                    reorderLevel: parseFloat(item.reorder_level || item.min_stock_level || 0),
                    unit: item.unit_of_measure || item.unit || 'units'
                }));
                allItems = allItems.concat(products);
            }

            // Apply status filter
            if (statusFilter === 'low') {
                allItems = allItems.filter(item => item.quantity > 0 && item.quantity <= item.reorderLevel);
            } else if (statusFilter === 'out') {
                allItems = allItems.filter(item => item.quantity === 0);
            }

            // Render the unified table
            this.renderInventoryTable(allItems);
            
            // Update count badge
            const countBadge = document.getElementById('totalInventoryCount');
            if (countBadge) countBadge.textContent = allItems.length;

        } catch (error) {
            console.error('[Warehouse] Error loading inventory:', error);
            this.showToast('Failed to load inventory', 'error');
            
            const tbody = document.getElementById('inventoryTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-danger">
                            <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>
                            <p class="mb-0 mt-2">Failed to load inventory. Please try again.</p>
                        </td>
                    </tr>
                `;
            }
        }
    }

    renderInventoryTable(items) {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        if (!items || items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                        <p class="mb-0 mt-2 text-muted">No inventory items found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map((item, idx) => {
            const { statusClass, statusText } = this.getStockStatus(item.quantity, item.reorderLevel);
            const typeColor = item.type === 'Raw Material' ? 'var(--hf-primary)' : '#6610f2';
            const hasExpand = item.type === 'Raw Material' && item.materialId;
            const expandBtn = hasExpand 
                ? `<button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="toggleBatchDetails(${item.materialId}, ${idx})" title="View Batches (FIFO)">
                       <i class="bi bi-chevron-down" id="expandIcon-${idx}"></i>
                   </button>` 
                : '';

            return `
                <tr>
                    <td>
                        <span style="color: ${typeColor};">
                            <i class="bi ${item.typeIcon} me-1"></i>${item.type}
                        </span>
                    </td>
                    <td><strong>${item.name}</strong> ${expandBtn}</td>
                    <td><code style="font-size: 0.85rem; color: #6c757d;">${item.sku}</code></td>
                    <td class="text-center"><strong>${item.quantity.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                    <td class="text-center">${item.reorderLevel.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td class="text-center">${item.unit}</td>
                    <td class="text-center"><span class="inventory-badge ${statusClass}">${statusText}</span></td>
                </tr>
                <tr id="batchRow-${idx}" class="batch-details-row" style="display: none;">
                    <td colspan="8" class="p-0 bg-light">
                        <div id="batchDetails-${idx}" class="p-2"></div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStockStatus(quantity, reorder) {
        if (quantity === 0) {
            return { statusClass: 'inventory-out', statusText: 'Out of Stock' };
        } else if (quantity <= reorder) {
            return { statusClass: 'inventory-low', statusText: 'Low Stock' };
        }
        return { statusClass: 'inventory-ok', statusText: 'In Stock' };
    }
}

// Global search function
function searchInventory() {
    if (window.warehouseStaffDashboard) {
        window.warehouseStaffDashboard.searchInventory();
    }
}

// Global function to load full inventory
function loadFullInventory() {
    if (window.warehouseStaffDashboard) {
        window.warehouseStaffDashboard.loadFullInventory();
    }
}

// Toggle batch details row (FIFO breakdown)
async function toggleBatchDetails(materialId, rowIdx) {
    const batchRow = document.getElementById(`batchRow-${rowIdx}`);
    const batchDetails = document.getElementById(`batchDetails-${rowIdx}`);
    const expandIcon = document.getElementById(`expandIcon-${rowIdx}`);
    
    if (!batchRow || !batchDetails) return;
    
    const isVisible = batchRow.style.display !== 'none';
    
    if (isVisible) {
        // Collapse
        batchRow.style.display = 'none';
        expandIcon?.classList.replace('bi-chevron-up', 'bi-chevron-down');
    } else {
        // Expand - load batch data
        batchRow.style.display = 'table-row';
        expandIcon?.classList.replace('bi-chevron-down', 'bi-chevron-up');
        batchDetails.innerHTML = '<div class="text-center py-2"><i class="bi bi-arrow-repeat spin"></i> Loading batches...</div>';
        
        try {
            const response = await axios.get(APIResponseHandler.getApiUrl('RawMaterialsAPI.php'), {
                params: { action: 'get_batches_for_material', material_id: materialId },
                withCredentials: true
            });
            
            if (response.data.success && response.data.batches && response.data.batches.length > 0) {
                const batches = response.data.batches;
                batchDetails.innerHTML = `
                    <table class="table table-sm table-bordered mb-0" style="font-size: 0.85rem;">
                        <thead style="background: var(--hf-primary-light);">
                            <tr>
                                <th class="text-center" style="width: 40px;">FIFO</th>
                                <th>Batch Code</th>
                                <th class="text-end">Qty Available</th>
                                <th class="text-end">Unit Cost</th>
                                <th>Received</th>
                                <th>Expiry</th>
                                <th>Supplier</th>
                                <th class="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${batches.map((b, i) => {
                                const isFifo = i === 0;
                                const statusBadge = getFreshnessBadge(b.freshness_status);
                                const expiryDate = b.expiry_date ? formatDate(b.expiry_date) : '<span class="text-muted">N/A</span>';
                                return `
                                    <tr class="${isFifo ? 'table-success' : ''}">
                                        <td class="text-center">${isFifo ? '<i class="bi bi-1-circle-fill text-success" title="Pick This First"></i>' : (i+1)}</td>
                                        <td><code>${b.batch_code || 'N/A'}</code></td>
                                        <td class="text-end"><strong>${parseFloat(b.current_quantity).toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></td>
                                        <td class="text-end">₱${parseFloat(b.unit_cost || 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
                                        <td>${formatDate(b.received_date)}</td>
                                        <td>${expiryDate}</td>
                                        <td>${b.supplier_name || 'N/A'}</td>
                                        <td class="text-center">${statusBadge}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot style="background: #f8f9fa;">
                            <tr>
                                <td colspan="2" class="text-end"><strong>Total:</strong></td>
                                <td class="text-end"><strong>${parseFloat(response.data.total_quantity).toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></td>
                                <td colspan="5"></td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="text-muted small mt-1">
                        <i class="bi bi-info-circle"></i> FIFO: Pick from the highlighted row first (oldest stock)
                    </div>
                `;
            } else {
                batchDetails.innerHTML = '<div class="text-muted text-center py-2">No batches found</div>';
            }
        } catch (error) {
            console.error('[Warehouse] Error loading batches:', error);
            batchDetails.innerHTML = '<div class="text-danger text-center py-2">Failed to load batches</div>';
        }
    }
}

// Helper: Freshness status badge
function getFreshnessBadge(status) {
    const badges = {
        'GOOD': '<span class="badge bg-success">Good</span>',
        'WARNING': '<span class="badge bg-warning text-dark">Warning</span>',
        'CRITICAL': '<span class="badge bg-danger">Critical</span>',
        'EXPIRED': '<span class="badge bg-dark">Expired</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

// Helper: Format date
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    window.warehouseStaffDashboard = new WarehouseStaffDashboard();
    
    // Load full inventory on page load
    setTimeout(() => {
        loadFullInventory();
    }, 500);
});
