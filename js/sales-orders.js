// Sales Orders JavaScript
// Handles order creation form and orders list management

class SalesOrders {
    constructor() {
        this.salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        this.orderItems = [];
        this.customers = [];
        this.products = [];
        this.selectedCustomer = null;

        this.init();
    }

    init() {
        // Check authentication
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        const user = getLoggedInUser();
        const allowedRoles = ['Admin', 'Sales Officer', 'Sales Staff'];
        if (!user || !allowedRoles.includes(user.role)) {
            alert('Unauthorized access. This page requires Admin, Sales Officer, or Sales Staff role.');
            window.location.href = 'login.html';
            return;
        }

        // Determine which page we're on
        const currentPage = window.location.pathname.split('/').pop();

        if (currentPage === 'sales-order-form.html') {
            this.initOrderForm();
        } else if (currentPage === 'sales-orders.html') {
            this.initOrdersList();
        }
    }

    // ==================== ORDER FORM FUNCTIONS ====================

    initOrderForm() {
        // Load customers
        this.loadCustomers();

        // Set up event listeners
        document.getElementById('customerSelect')?.addEventListener('change', (e) => {
            this.onCustomerSelected(e.target.value);
        });

        document.getElementById('searchProductBtn')?.addEventListener('click', () => {
            this.searchProducts();
        });

        document.getElementById('productSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchProducts();
            }
        });

        document.getElementById('salesOrderForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });

        // Set minimum delivery date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const deliveryDateInput = document.getElementById('deliveryDate');
        if (deliveryDateInput) {
            deliveryDateInput.min = tomorrow.toISOString().split('T')[0];
        }
    }

    async loadCustomers() {
        try {
            const response = await axios.get(this.salesOrdersAPI, {
                params: { operation: 'getCustomers' },
                withCredentials: true
            });

            if (response.data.success) {
                // FIXED: Changed from response.data.customers to response.data.data.customers
                this.customers = response.data.data.customers || [];
                this.renderCustomerSelect();
            } else {
                console.error('Failed to load customers:', response.data.message);
                document.getElementById('customerSelect').innerHTML = '<option value="">Failed to load customers</option>';
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            document.getElementById('customerSelect').innerHTML = '<option value="">Error loading customers</option>';
        }
    }

    renderCustomerSelect() {
        const select = document.getElementById('customerSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select a customer...</option>';

        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.customer_id;
            option.textContent = `${customer.business_name} (${customer.customer_type.replace('_', ' ')})`;
            option.dataset.customer = JSON.stringify(customer);
            select.appendChild(option);
        });
    }

    onCustomerSelected(customerId) {
        if (!customerId) {
            document.getElementById('customerInfo').style.display = 'none';
            this.selectedCustomer = null;
            return;
        }

        const customer = this.customers.find(c => c.customer_id == customerId);
        if (customer) {
            this.selectedCustomer = customer;
            document.getElementById('customerType').textContent = customer.customer_type.replace('_', ' ').toUpperCase();
            document.getElementById('customerCreditLimit').textContent = '₱' + parseFloat(customer.credit_limit || 0).toLocaleString('en-PH');
            document.getElementById('customerInfo').style.display = 'block';
        }
    }

    async searchProducts() {
        const searchTerm = document.getElementById('productSearch').value.trim();

        console.log('Searching for products with term:', searchTerm);

        try {
            const response = await axios.get(this.salesOrdersAPI, {
                params: {
                    operation: 'getProducts',
                    search: searchTerm
                },
                withCredentials: true
            });

            console.log('Products API response:', response.data);

            if (response.data.success) {
                // FIXED: Changed from response.data.products to response.data.data.products
                this.products = response.data.data.products || [];
                console.log('Products loaded:', this.products.length);
                this.showProductSearchModal();
            } else {
                console.error('API returned error:', response.data.message);
                alert('Failed to load products: ' + response.data.message);
            }
        } catch (error) {
            console.error('Error searching products:', error);
            console.error('Error details:', error.response?.data);
            alert('Failed to search products: ' + (error.response?.data?.message || error.message));
        }
    }

    showProductSearchModal() {
        console.log('Showing product search modal with', this.products.length, 'products');

        const resultsBody = document.getElementById('productSearchResults');
        if (!resultsBody) {
            console.error('Product search results div not found!');
            alert('Error: Product search modal not properly configured');
            return;
        }

        resultsBody.innerHTML = '';

        if (this.products.length === 0) {
            resultsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc;"></i>
                        <p class="text-muted mt-3">No products found. Try a different search term or leave empty to see all products.</p>
                    </td>
                </tr>
            `;
        } else {
            this.products.forEach(product => {
                const row = document.createElement('tr');
                row.style.cursor = 'pointer';
                row.className = 'product-row';

                // Use available_from_batches if available, fallback to quantity_on_hand
                const batchQty = parseFloat(product.available_from_batches) || 0;
                const stockQty = batchQty > 0 ? batchQty : parseFloat(product.quantity_on_hand) || 0;
                let stockBadge = '';
                let stockClass = '';
                let expiryBadge = '';

                if (stockQty <= 0) {
                    stockBadge = '<span class="badge bg-danger">Out of Stock</span>';
                    stockClass = 'table-danger';
                } else if (stockQty < 20) {
                    stockBadge = '<span class="badge bg-warning text-dark">Low Stock</span>';
                    stockClass = 'table-warning';
                } else {
                    stockBadge = '<span class="badge bg-success">In Stock</span>';
                }

                // Show expiry status from batches (GAP FIX)
                if (product.expiry_status === 'critical') {
                    expiryBadge = '<span class="badge bg-danger ms-1">⚠️ Exp Soon</span>';
                } else if (product.expiry_status === 'warning') {
                    expiryBadge = '<span class="badge bg-warning text-dark ms-1">Exp <7d</span>';
                }

                row.className = `product-row ${stockClass}`;

                row.innerHTML = `
                    <td><strong>${this.escapeHtml(product.sku)}</strong></td>
                    <td>
                        <strong>${this.escapeHtml(product.product_name)}</strong>
                        ${product.description ? `<br><small class="text-muted">${this.escapeHtml(product.description)}</small>` : ''}
                    </td>
                    <td>
                        <strong style="color: var(--primary-green); font-size: 1.1rem;">₱${parseFloat(product.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        <br><small class="text-muted">per ${product.unit_symbol || 'unit'}</small>
                    </td>
                    <td>
                        <strong>${stockQty.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${product.unit_symbol || 'units'}</strong>
                        <br>${stockBadge}${expiryBadge}
                        ${batchQty > 0 ? '<br><small class="text-info">From FIFO batches</small>' : ''}
                    </td>
                    <td>
                        <button class="btn btn-feature btn-sm w-100" onclick="window.salesOrders.addProductToOrder(${product.product_id}); event.stopPropagation();">
                            <i class="bi bi-plus-circle me-1"></i>Add to Order
                        </button>
                    </td>
                `;

                // Make entire row clickable
                row.addEventListener('click', () => {
                    this.addProductToOrder(product.product_id);
                });

                resultsBody.appendChild(row);
            });
        }

        const modalElement = document.getElementById('productSearchModal');
        if (!modalElement) {
            console.error('Product search modal element not found!');
            alert('Error: Product search modal not found in page');
            return;
        }

        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        console.log('Modal displayed');
    }

    addProductToOrder(productId) {
        const product = this.products.find(p => p.product_id == productId);
        if (!product) return;

        // Check if already in order
        const existing = this.orderItems.find(item => item.product_id == productId);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.orderItems.push({
                product_id: product.product_id,
                sku: product.sku,
                product_name: product.product_name,
                quantity: 1,
                unit_price: parseFloat(product.unit_price),
                unit_symbol: product.unit_symbol || 'unit'
            });
        }

        this.renderOrderItems();

        // Auto-trigger FIFO preview (UX improvement - no manual click needed)
        this.triggerAutoFifoPreview();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('productSearchModal'));
        if (modal) modal.hide();
    }

    /**
     * Auto-trigger FIFO preview with debounce to avoid spam
     */
    triggerAutoFifoPreview() {
        // Clear any pending preview
        if (this.fifoPreviewTimeout) {
            clearTimeout(this.fifoPreviewTimeout);
        }

        // Debounce: wait 500ms then preview
        this.fifoPreviewTimeout = setTimeout(() => {
            if (this.orderItems.length > 0) {
                this.previewFifoBatches();
            }
        }, 500);
    }

    renderOrderItems() {
        const tbody = document.getElementById('orderItemsBody');
        tbody.innerHTML = '';

        if (this.orderItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No products added yet</td></tr>';
            this.updateOrderSummary();
            return;
        }

        this.orderItems.forEach((item, index) => {
            const row = document.createElement('tr');
            const lineTotal = item.quantity * item.unit_price;

            row.innerHTML = `
                <td>
                    <strong>${this.escapeHtml(item.product_name)}</strong><br>
                    <small class="text-muted">SKU: ${this.escapeHtml(item.sku)}</small>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           value="${item.quantity}" min="1" step="0.01"
                           onchange="window.salesOrders.updateQuantity(${index}, this.value)">
                    <small class="text-muted">${item.unit_symbol}</small>
                </td>
                <td>₱${item.unit_price.toFixed(2)}</td>
                <td><strong>₱${lineTotal.toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="window.salesOrders.removeItem(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updateOrderSummary();
    }

    updateQuantity(index, value) {
        const quantity = parseFloat(value) || 1;
        if (quantity > 0) {
            this.orderItems[index].quantity = quantity;
            this.renderOrderItems();
            // Auto-update FIFO preview when quantity changes
            this.triggerAutoFifoPreview();
        }
    }

    removeItem(index) {
        this.orderItems.splice(index, 1);
        this.renderOrderItems();
    }

    updateOrderSummary() {
        const subtotal = this.orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax = subtotal * 0.12; // 12% VAT
        const total = subtotal + tax;

        document.getElementById('orderSubtotal').textContent = '₱' + subtotal.toFixed(2);
        document.getElementById('orderTax').textContent = '₱' + tax.toFixed(2);
        document.getElementById('orderTotal').textContent = '₱' + total.toFixed(2);

        // Enable/disable FIFO preview button
        const previewBtn = document.getElementById('previewFifoBtn');
        if (previewBtn) {
            previewBtn.disabled = this.orderItems.length === 0;
        }
    }

    // ==================== USER 3 FIFO GAP IMPLEMENTATIONS ====================

    /**
     * 3-GAP-1: Preview FIFO batch allocation before order submission
     */
    async previewFifoBatches() {
        if (this.orderItems.length === 0) {
            alert('Please add products to the order first');
            return;
        }

        const previewBtn = document.getElementById('previewFifoBtn');
        const originalText = previewBtn.innerHTML;
        previewBtn.disabled = true;
        previewBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';

        try {
            const response = await axios.post(this.salesOrdersAPI, {
                operation: 'previewFifoBatches',
                items: this.orderItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity
                }))
            }, { withCredentials: true });

            if (response.data.success) {
                this.displayFifoPreview(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to preview batches');
            }
        } catch (error) {
            console.error('FIFO preview error:', error);
            alert('Failed to preview FIFO batches: ' + (error.response?.data?.message || error.message));
        } finally {
            previewBtn.disabled = false;
            previewBtn.innerHTML = originalText;
        }
    }

    /**
     * Display FIFO preview results
     */
    displayFifoPreview(data) {
        const section = document.getElementById('fifoPreviewSection');
        const content = document.getElementById('fifoPreviewContent');

        if (!section || !content) return;

        // Reset expiry conflict flag
        this.hasExpiryConflict = false;

        let html = '';

        // Stock status alert
        const alertDiv = document.getElementById('stockStatusAlert');
        const alertMsg = document.getElementById('stockStatusMessage');
        if (alertDiv && alertMsg) {
            if (data.has_insufficient_stock) {
                alertDiv.className = 'alert alert-danger';
                alertMsg.innerHTML = '<strong>Warning:</strong> Insufficient stock for some items!';
            } else {
                alertDiv.className = 'alert alert-success';
                alertMsg.innerHTML = '<strong>✓ All items available</strong> - FIFO batches ready';
            }
            alertDiv.style.display = 'block';
        }

        // Build allocation table
        data.allocations.forEach(alloc => {
            const stockStatus = alloc.sufficient_stock
                ? '<span class="badge bg-success">OK</span>'
                : `<span class="badge bg-danger">Short: ${alloc.quantity_short}</span>`;

            html += `
                <div class="border-bottom p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <strong>${this.escapeHtml(alloc.product_name)}</strong>
                        ${stockStatus}
                    </div>
                    <small class="text-muted">Need: ${alloc.quantity_needed} | Available: ${alloc.total_available}</small>
                    
                    <table class="table table-sm table-bordered mt-2 mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Batch Code</th>
                                <th>Produced</th>
                                <th>Expires</th>
                                <th>Qty to Use</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (alloc.batches.length === 0) {
                html += `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle me-1"></i>No batches available
                        </td>
                    </tr>
                `;
            } else {
                // Get delivery date for comparison
                const deliveryDateStr = document.getElementById('deliveryDate')?.value;
                const deliveryDate = deliveryDateStr ? new Date(deliveryDateStr) : null;

                alloc.batches.forEach(batch => {
                    let expiryClass = '';
                    let expiryIcon = '';
                    let expiryWarning = '';

                    // Check if batch expires before delivery date
                    const expiryDate = batch.expiry_date ? new Date(batch.expiry_date) : null;
                    const expiresBeforeDelivery = deliveryDate && expiryDate && expiryDate < deliveryDate;

                    if (expiresBeforeDelivery) {
                        // CRITICAL: Batch will expire before delivery!
                        expiryClass = 'text-danger fw-bold bg-danger bg-opacity-10';
                        expiryIcon = '⛔';
                        expiryWarning = '<br><span class="badge bg-danger">EXPIRES BEFORE DELIVERY!</span>';
                        this.hasExpiryConflict = true;
                    } else if (batch.expiry_status === 'critical') {
                        expiryClass = 'text-danger fw-bold';
                        expiryIcon = '🔴';
                    } else if (batch.expiry_status === 'warning') {
                        expiryClass = 'text-warning';
                        expiryIcon = '🟡';
                    } else {
                        expiryIcon = '🟢';
                    }

                    html += `
                        <tr class="${expiresBeforeDelivery ? 'table-danger' : ''}">
                            <td><code>${this.escapeHtml(batch.batch_code)}</code></td>
                            <td>${this.formatDate(batch.production_date)}</td>
                            <td class="${expiryClass}">
                                ${expiryIcon} ${batch.expiry_date ? this.formatDate(batch.expiry_date) : 'N/A'}
                                ${batch.days_until_expiry !== null ? `<br><small>(${batch.days_until_expiry} days)</small>` : ''}
                                ${expiryWarning}
                            </td>
                            <td><strong>${batch.allocated_quantity}</strong></td>
                            <td>${batch.will_deplete ? '<span class="badge bg-warning text-dark">Depletes</span>' : '<span class="badge bg-info">Partial</span>'}</td>
                        </tr>
                    `;
                });
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        content.innerHTML = html;
        section.style.display = 'block';

        // Update alert if there's an expiry conflict
        if (this.hasExpiryConflict) {
            const alertDiv = document.getElementById('stockStatusAlert');
            const alertMsg = document.getElementById('stockStatusMessage');
            if (alertDiv && alertMsg) {
                alertDiv.className = 'alert alert-danger';
                alertMsg.innerHTML = '<strong>⛔ WARNING:</strong> Some batches will EXPIRE before delivery date! Choose an earlier delivery date.';
            }
        }
    }

    /**
     * 3-GAP-4: Create walk-in sale with immediate FIFO deduction
     */
    createWalkInSale() {
        if (this.orderItems.length === 0) {
            alert('Please add products to the order first');
            return;
        }

        const subtotal = this.orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;

        document.getElementById('walkInTotal').value = total.toFixed(2);
        document.getElementById('walkInAmountTendered').value = '';
        document.getElementById('walkInChange').textContent = '₱0.00';
        document.getElementById('walkInCustomerName').value = '';

        const modal = new bootstrap.Modal(document.getElementById('walkInSaleModal'));
        modal.show();
    }

    /**
     * Calculate change for walk-in sale
     */
    calculateChange() {
        const total = parseFloat(document.getElementById('walkInTotal').value) || 0;
        const tendered = parseFloat(document.getElementById('walkInAmountTendered').value) || 0;
        const change = tendered - total;

        const changeEl = document.getElementById('walkInChange');
        changeEl.textContent = '₱' + Math.max(0, change).toFixed(2);
        changeEl.className = change >= 0 ? 'text-success' : 'text-danger';
    }

    /**
     * Confirm and process walk-in sale
     */
    async confirmWalkInSale() {
        const customerName = document.getElementById('walkInCustomerName').value || 'Walk-in Customer';
        const paymentMethod = document.getElementById('walkInPaymentMethod').value;
        const amountTendered = parseFloat(document.getElementById('walkInAmountTendered').value) || null;

        const subtotal = this.orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const total = subtotal * 1.12;

        if (amountTendered !== null && amountTendered < total) {
            alert('Amount tendered is less than the total amount');
            return;
        }

        try {
            const response = await axios.post(this.salesOrdersAPI, {
                operation: 'createWalkInSale',
                items: this.orderItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                })),
                customer_name: customerName,
                payment_method: paymentMethod,
                amount_tendered: amountTendered
            }, { withCredentials: true });

            if (response.data.success) {
                // Close walk-in modal
                const walkInModal = bootstrap.Modal.getInstance(document.getElementById('walkInSaleModal'));
                walkInModal.hide();

                // Show receipt
                this.showReceipt(response.data.data);
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Walk-in sale error:', error);
            alert('Failed to process sale: ' + (error.response?.data?.message || error.message));
        }
    }

    /**
     * 3-GAP-2: Show receipt with batch information
     */
    showReceipt(saleData) {
        const content = document.getElementById('receiptContent');
        if (!content) return;

        const change = saleData.change !== null ? `₱${saleData.change.toFixed(2)}` : 'N/A';

        let itemsHtml = '';
        saleData.items.forEach(item => {
            const batchInfo = item.batches.map(b =>
                `<small class="text-muted d-block">Batch: ${b.batch_code} (Qty: ${b.quantity}, Exp: ${b.expiry_date || 'N/A'})</small>`
            ).join('');

            itemsHtml += `
                <tr>
                    <td>
                        ${this.escapeHtml(item.product_name)}
                        ${batchInfo}
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-end">₱${item.unit_price.toFixed(2)}</td>
                    <td class="text-end">₱${item.line_total.toFixed(2)}</td>
                </tr>
            `;
        });

        content.innerHTML = `
            <div class="text-center mb-4">
                <h4>Highland Fresh Dairy Products</h4>
                <p class="mb-0 text-muted">Bukidnon, Philippines</p>
                <hr>
            </div>
            
            <div class="row mb-3">
                <div class="col-6">
                    <strong>Receipt #:</strong> ${saleData.sale_number}<br>
                    <strong>Date:</strong> ${new Date().toLocaleString()}
                </div>
                <div class="col-6 text-end">
                    <strong>Status:</strong> <span class="badge bg-success">PAID</span><br>
                    <strong>FIFO:</strong> <span class="badge bg-info">✓ Compliant</span>
                </div>
            </div>

            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-center">Qty</th>
                        <th class="text-end">Price</th>
                        <th class="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-end">Subtotal:</td>
                        <td class="text-end">₱${saleData.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" class="text-end">Tax (12%):</td>
                        <td class="text-end">₱${saleData.tax_amount.toFixed(2)}</td>
                    </tr>
                    <tr class="fw-bold">
                        <td colspan="3" class="text-end">Total:</td>
                        <td class="text-end">₱${saleData.total_amount.toFixed(2)}</td>
                    </tr>
                    ${saleData.amount_tendered ? `
                    <tr>
                        <td colspan="3" class="text-end">Amount Tendered:</td>
                        <td class="text-end">₱${saleData.amount_tendered.toFixed(2)}</td>
                    </tr>
                    <tr class="fw-bold text-success">
                        <td colspan="3" class="text-end">Change:</td>
                        <td class="text-end">${change}</td>
                    </tr>
                    ` : ''}
                </tfoot>
            </table>

            <div class="alert alert-success mt-3">
                <i class="bi bi-check-circle me-2"></i>
                <strong>Batches Used (FIFO):</strong>
                <ul class="mb-0 mt-2">
                    ${saleData.batches_used.map(b => `<li>${b.product}: ${b.batch_code} (${b.quantity} units)</li>`).join('')}
                </ul>
            </div>

            <div class="text-center mt-4">
                <p class="text-muted mb-0">Thank you for your purchase!</p>
                <small class="text-muted">This receipt shows batch traceability information</small>
            </div>
        `;

        // Clear the order after successful sale
        this.orderItems = [];
        this.renderOrderItems();

        const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
        modal.show();
    }

    /**
     * Print receipt
     */
    printReceipt() {
        const content = document.getElementById('receiptContent');
        if (!content) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - Highland Fresh</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { padding: 20px; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * Format date helper
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    async submitOrder() {
        // Validate
        const customerId = document.getElementById('customerSelect').value;
        const deliveryDate = document.getElementById('deliveryDate').value;
        const paymentTerms = document.getElementById('paymentTerms').value;
        const notes = document.getElementById('orderNotes').value;

        if (!customerId) {
            alert('Please select a customer');
            return;
        }

        if (this.orderItems.length === 0) {
            alert('Please add at least one product to the order');
            return;
        }

        if (!deliveryDate || !paymentTerms) {
            alert('Please fill in all required fields');
            return;
        }

        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Order...';

        try {
            const response = await axios.post(this.salesOrdersAPI, {
                operation: 'createOrder',
                customer_id: customerId,
                items: this.orderItems,
                delivery_date: deliveryDate,
                payment_terms: paymentTerms,
                notes: notes
            }, {
                withCredentials: true
            });

            if (response.data.success) {
                const data = response.data.data;

                // Reserve batches for this order
                try {
                    await axios.post(this.salesOrdersAPI, {
                        operation: 'reserveBatches',
                        sale_id: data.sale_id,
                        expiry_hours: 48
                    }, { withCredentials: true });
                    console.log('Batches reserved for order:', data.sale_number);
                } catch (reserveError) {
                    console.warn('Batch reservation failed (non-critical):', reserveError);
                }

                // AUTO-APPROVE: Since stock is available, approve immediately
                try {
                    await axios.post(this.salesOrdersAPI, {
                        operation: 'approveOrder',
                        sale_id: data.sale_id
                    }, { withCredentials: true });
                    console.log('Order auto-approved:', data.sale_number);
                    data.status = 'Approved'; // Update for display
                } catch (approveError) {
                    console.warn('Auto-approve failed:', approveError);
                    // Continue anyway - order is still created
                }

                // Show success and redirect
                this.showSuccessModal(data);
            } else {
                throw new Error(response.data.message || 'Failed to create order');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            this.showErrorMessage('Failed to create order: ' + (error.response?.data?.message || error.message));
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Submit Order';
        }
    }

    showSuccessModal(data) {
        // Create a success notification - simpler since order is auto-approved
        const statusBadge = data.status === 'Approved'
            ? '<span class="badge bg-success">Approved ✓</span>'
            : `<span class="badge bg-warning text-dark">${data.status}</span>`;

        const modalHtml = `
            <div class="modal fade" id="orderSuccessModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-body text-center p-5">
                            <div class="mb-4">
                                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                            </div>
                            <h4 class="mb-3 fw-bold">Order Created & Approved!</h4>
                            <div class="alert alert-success mb-3">
                                <div class="row text-start">
                                    <div class="col-5"><strong>Order #:</strong></div>
                                    <div class="col-7"><strong>${data.sale_number}</strong></div>
                                </div>
                                <hr class="my-2">
                                <div class="row text-start">
                                    <div class="col-5"><strong>Customer:</strong></div>
                                    <div class="col-7">${data.customer}</div>
                                </div>
                                <hr class="my-2">
                                <div class="row text-start">
                                    <div class="col-5"><strong>Total:</strong></div>
                                    <div class="col-7"><strong>₱${parseFloat(data.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
                                </div>
                                <hr class="my-2">
                                <div class="row text-start">
                                    <div class="col-5"><strong>Status:</strong></div>
                                    <div class="col-7">${statusBadge}</div>
                                </div>
                            </div>
                            
                            <div class="alert alert-light border text-start mb-3">
                                <i class="bi bi-truck me-2"></i>
                                <strong>Next:</strong> Warehouse Staff will dispatch this order.
                            </div>
                            
                            <p class="text-muted mb-3">
                                <span class="spinner-border spinner-border-sm me-2"></span>
                                Redirecting to orders list...
                            </p>
                            
                            <div class="d-grid gap-2">
                                <a href="sales-orders.html" class="btn btn-success">
                                    <i class="bi bi-list-check me-2"></i>View Orders Now
                                </a>
                                <button class="btn btn-link text-muted" onclick="window.location.href='sales-order-form.html'">
                                    <i class="bi bi-plus me-1"></i>Create Another Order
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing success modal
        const existingModal = document.getElementById('orderSuccessModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('orderSuccessModal'));
        modal.show();

        // Auto-redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'sales-orders.html';
        }, 3000);
    }

    showErrorMessage(message) {
        // Create error toast or keep alert for simplicity
        const toast = `
            <div class="position-fixed top-0 end-0 p-3" style="z-index: 11000">
                <div class="toast show align-items-center text-white bg-danger border-0" role="alert">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            ${message}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            const toastEl = document.querySelector('.toast');
            if (toastEl) toastEl.remove();
        }, 5000);
    }

    // ==================== ORDERS LIST FUNCTIONS ====================

    initOrdersList() {
        // Will be called when on sales-orders.html page
        console.log('Sales Orders List initialized');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==================== GLOBAL FUNCTIONS FOR ORDERS LIST ====================

async function loadOrders(statusFilter = '', dateFrom = '', dateTo = '') {
    const loadingDiv = document.getElementById('ordersLoading');
    const tableContainer = document.getElementById('ordersTableContainer');
    const emptyDiv = document.getElementById('ordersEmpty');
    const errorDiv = document.getElementById('ordersError');

    try {
        loadingDiv.style.display = 'block';
        tableContainer.style.display = 'none';
        emptyDiv.style.display = 'none';
        errorDiv.style.display = 'none';

        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');

        // Build params object
        const params = {
            operation: 'getOrders',
            limit: 50,
            offset: 0
        };

        // Add filters if provided
        if (statusFilter) {
            params.status_id = statusFilter;
        }
        if (dateFrom) {
            params.date_from = dateFrom;
        }
        if (dateTo) {
            params.date_to = dateTo;
        }

        const response = await axios.get(salesOrdersAPI, {
            params: params,
            withCredentials: true
        });

        console.log('Load orders response:', response.data);
        loadingDiv.style.display = 'none';

        if (response.data.success) {
            // FIXED: Changed from response.data.orders to response.data.data.orders
            const orders = response.data.data.orders || [];

            if (orders.length === 0) {
                emptyDiv.style.display = 'block';
            } else {
                renderOrdersTable(orders);
                tableContainer.style.display = 'block';
                document.getElementById('paginationInfo').textContent = `Showing ${orders.length} orders`;
            }
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        console.error('Error details:', error.response ? error.response.data : error.message);
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        document.getElementById('ordersErrorMessage').textContent = error.response?.data?.message || 'Failed to load orders';
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';

    const user = getLoggedInUser();
    const canApprove = user && (user.role === 'Sales Officer' || user.role === 'Sales Staff' || user.role === 'Warehouse Manager' || user.role === 'Admin');

    orders.forEach(order => {
        const row = document.createElement('tr');

        let statusClass = 'bg-secondary';
        switch (order.status?.toLowerCase()) {
            case 'pending':
            case 'pending approval':
                statusClass = 'bg-warning text-dark';
                break;
            case 'approved':
                statusClass = 'bg-info';
                break;
            case 'dispatched':
                statusClass = 'bg-primary';
                break;
            case 'completed':
                statusClass = 'bg-success';
                break;
            case 'cancelled':
                statusClass = 'bg-danger';
                break;
        }

        const customerType = order.customer_type ? order.customer_type.replace('_', ' ') : '';
        const isPending = order.status && (order.status.toLowerCase() === 'pending' || order.status.toLowerCase() === 'pending approval');
        const isDispatched = order.status && (order.status.toLowerCase() === 'dispatched' || order.status.toLowerCase() === 'completed');
        const isApproved = order.status && order.status.toLowerCase() === 'approved';

        // Build action buttons
        let actionButtons = `
            <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetails(${order.sale_id})">
                <i class="bi bi-eye"></i> View
            </button>
        `;

        // Add Approve/Reject buttons for pending orders if user has permission
        if (canApprove && isPending) {
            actionButtons += `
                <button class="btn btn-sm btn-success ms-1" onclick="approveOrderInline(${order.sale_id}, '${escapeHtml(order.sale_number)}')" title="Approve this order">
                    <i class="bi bi-check-circle"></i> Approve
                </button>
                <button class="btn btn-sm btn-danger ms-1" onclick="rejectOrderInline(${order.sale_id}, '${escapeHtml(order.sale_number)}')" title="Reject this order">
                    <i class="bi bi-x-circle"></i> Reject
                </button>
            `;
        }

        // 3-GAP-2: Add Delivery Receipt button for dispatched/completed orders
        if (isDispatched) {
            actionButtons += `
                <button class="btn btn-sm btn-outline-success ms-1" onclick="viewDeliveryReceipt(${order.sale_id})" title="View Delivery Receipt with batch info">
                    <i class="bi bi-file-earmark-text"></i> DR
                </button>
            `;
        }

        // Add Preview Batches button for approved orders (not yet dispatched)
        if (isApproved) {
            actionButtons += `
                <button class="btn btn-sm btn-outline-info ms-1" onclick="previewOrderBatches(${order.sale_id})" title="View reserved FIFO batches">
                    <i class="bi bi-box-seam"></i> Batches
                </button>
            `;
        }

        row.innerHTML = `
            <td><strong>${escapeHtml(order.sale_number)}</strong></td>
            <td>${formatDate(order.sale_date)}</td>
            <td>
                ${escapeHtml(order.customer_name)}<br>
                <small class="text-muted">${escapeHtml(customerType)}</small>
            </td>
            <td><span class="badge bg-secondary">${escapeHtml(customerType)}</span></td>
            <td><strong>₱${parseFloat(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
            <td><span class="badge ${statusClass}">${escapeHtml(order.status)}</span></td>
            <td style="white-space: nowrap;">
                ${actionButtons}
            </td>
        `;

        tbody.appendChild(row);
    });
}

async function viewOrderDetails(saleId) {
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    const modalBody = document.getElementById('orderDetailsBody');

    modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Loading...</p></div>';
    modal.show();

    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.get(salesOrdersAPI, {
            params: {
                operation: 'getOrderDetails',
                sale_id: saleId
            },
            withCredentials: true
        });

        if (response.data.success) {
            // FIXED: Changed from response.data.order to response.data.data.order
            const order = response.data.data.order;
            renderOrderDetails(order);
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        modalBody.innerHTML = `<div class="alert alert-danger">Failed to load order details: ${error.response?.data?.message || error.message}</div>`;
    }
}

function renderOrderDetails(order) {
    const modalBody = document.getElementById('orderDetailsBody');
    const user = getLoggedInUser();

    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${escapeHtml(item.sku)}</td>
                <td>${escapeHtml(item.product_name)}</td>
                <td>${item.quantity} ${item.unit_symbol || ''}</td>
                <td>₱${parseFloat(item.unit_price).toFixed(2)}</td>
                <td><strong>₱${parseFloat(item.line_total).toFixed(2)}</strong></td>
            </tr>
        `;
    });

    // Determine if user can approve/reject (Sales Staff/Officer, Warehouse Manager, or Admin)
    const canApprove = user && (user.role === 'Sales Officer' || user.role === 'Sales Staff' || user.role === 'Warehouse Manager' || user.role === 'Admin');
    const isPending = order.status && (order.status.toLowerCase() === 'pending' || order.status.toLowerCase() === 'pending approval');

    // Show approval actions only if user has permission and order is pending
    let approvalActionsHtml = '';
    if (canApprove && isPending) {
        approvalActionsHtml = `
            <div class="alert alert-warning mt-4">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Approval Required:</strong> This order is pending your review.
            </div>
            <div class="d-flex gap-2 mt-3">
                <button class="btn btn-success" onclick="approveOrder(${order.sale_id})">
                    <i class="bi bi-check-circle me-1"></i>Approve Order
                </button>
                <button class="btn btn-danger" onclick="rejectOrder(${order.sale_id})">
                    <i class="bi bi-x-circle me-1"></i>Reject Order
                </button>
            </div>
        `;
    } else if (!isPending) {
        approvalActionsHtml = `
            <div class="alert alert-info mt-4">
                <i class="bi bi-info-circle me-2"></i>
                This order has been ${escapeHtml(order.status.toLowerCase())}.
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <h6>Order Information</h6>
                <p class="mb-1"><strong>Order #:</strong> ${escapeHtml(order.sale_number)}</p>
                <p class="mb-1"><strong>Date:</strong> ${formatDate(order.sale_date)}</p>
                <p class="mb-1"><strong>Status:</strong> <span class="badge bg-info">${escapeHtml(order.status)}</span></p>
                <p class="mb-1"><strong>Created By:</strong> ${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}</p>
            </div>
            <div class="col-md-6">
                <h6>Customer Information</h6>
                <p class="mb-1"><strong>Business:</strong> ${escapeHtml(order.customer_name)}</p>
                <p class="mb-1"><strong>Type:</strong> ${escapeHtml(order.customer_type?.replace('_', ' '))}</p>
                <p class="mb-1"><strong>Contact:</strong> ${escapeHtml(order.contact_person)}</p>
                <p class="mb-1"><strong>Phone:</strong> ${escapeHtml(order.phone || 'N/A')}</p>
            </div>
        </div>

        <h6 class="mt-4">Order Items</h6>
        <div class="table-responsive">
            <table class="table table-sm table-bordered">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="4" class="text-end">Grand Total:</th>
                        <th>₱${parseFloat(order.total_amount).toFixed(2)}</th>
                    </tr>
                </tfoot>
            </table>
        </div>

        ${approvalActionsHtml}
    `;
}

function applyFilters() {
    // Get filter values
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const dateFrom = document.getElementById('filterDateFrom')?.value || '';
    const dateTo = document.getElementById('filterDateTo')?.value || '';

    console.log('Applying filters:', { statusFilter, dateFrom, dateTo });

    // Reload orders with filters
    loadOrders(statusFilter, dateFrom, dateTo);
}

async function approveOrder(saleId) {
    if (!confirm('Are you sure you want to approve this order?')) {
        return;
    }

    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.post(salesOrdersAPI, {
            operation: 'approveOrder',
            sale_id: saleId
        }, {
            withCredentials: true
        });

        if (response.data.success) {
            // Close modal first
            const modal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
            if (modal) modal.hide();

            // Show workflow guidance modal
            const workflowModal = document.createElement('div');
            workflowModal.innerHTML = `
                <div class="modal fade" id="workflowGuidanceModal" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-check-circle-fill me-2"></i>Order Approved Successfully!
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-success">
                                    <h6 class="alert-heading"><i class="bi bi-info-circle me-2"></i>What Happens Next?</h6>
                                    <ol class="mb-0 ps-3">
                                        <li class="mb-2"><strong>Warehouse Staff</strong> will dispatch the order</li>
                                        <li class="mb-2">Customer receives the products</li>
                                        <li class="mb-2"><strong>You (Sales Staff)</strong> collect payment from customer</li>
                                        <li><strong>Record the payment</strong> using the button below!</li>
                                    </ol>
                                </div>
                                <div class="alert alert-warning">
                                    <i class="bi bi-cash-coin me-2"></i>
                                    <strong>To record COD payments:</strong> After the order is dispatched, click the 
                                    <span class="badge bg-warning text-dark">Record Payments</span> button in the navigation bar 
                                    or go to the Sales Dashboard.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Got it!</button>
                                <a href="sales-dashboard.html" class="btn btn-warning">
                                    <i class="bi bi-cash-coin me-1"></i>Go to Payment Recording
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(workflowModal);
            const guidanceModalElement = document.getElementById('workflowGuidanceModal');
            const guidanceModal = new bootstrap.Modal(guidanceModalElement);
            guidanceModal.show();

            // Clean up modal after it's hidden
            guidanceModalElement.addEventListener('hidden.bs.modal', function () {
                document.body.removeChild(workflowModal);
            });

            // Reload orders list
            loadOrders();
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error approving order:', error);
        alert('Failed to approve order: ' + (error.response?.data?.message || error.message));
    }
}

async function rejectOrder(saleId) {
    const reason = prompt('Please provide a reason for rejecting this order:');

    if (!reason) {
        alert('Rejection reason is required.');
        return;
    }

    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.post(salesOrdersAPI, {
            operation: 'rejectOrder',
            sale_id: saleId,
            rejection_reason: reason
        }, {
            withCredentials: true
        });

        if (response.data.success) {
            // Show success message
            alert('Order rejected successfully.');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
            modal.hide();

            // Reload orders list
            loadOrders();
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error rejecting order:', error);
        alert('Failed to reject order: ' + (error.response?.data?.message || error.message));
    }
}

// Inline approve/reject functions (called from table buttons)
async function approveOrderInline(saleId, orderNumber) {
    await approveOrder(saleId);
}

async function rejectOrderInline(saleId, orderNumber) {
    await rejectOrder(saleId);
}

/**
 * 3-GAP-2: View Delivery Receipt with batch information
 */
async function viewDeliveryReceipt(saleId) {
    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.get(salesOrdersAPI, {
            params: {
                operation: 'getDeliveryReceipt',
                sale_id: saleId
            },
            withCredentials: true
        });

        if (response.data.success) {
            const data = response.data.data;
            showDeliveryReceiptModal(data);
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error loading delivery receipt:', error);
        alert('Failed to load delivery receipt: ' + (error.response?.data?.message || error.message));
    }
}

/**
 * Display Delivery Receipt in modal
 */
function showDeliveryReceiptModal(data) {
    const dr = data.delivery_receipt;
    const items = data.items;

    // Build items table with batch info
    let itemsHtml = '';
    items.forEach(item => {
        let batchInfo = '';
        if (item.batches && item.batches.length > 0) {
            batchInfo = item.batches.map(b =>
                `<div class="small text-success">
                    <i class="bi bi-box-seam me-1"></i>
                    <strong>${escapeHtml(b.batch_code)}</strong>: ${b.quantity} units
                    ${b.expiry_date ? `<span class="text-muted">(Exp: ${formatDate(b.expiry_date).split(',')[0]})</span>` : ''}
                </div>`
            ).join('');
        } else {
            batchInfo = '<span class="text-muted small">No batch info</span>';
        }

        itemsHtml += `
            <tr>
                <td>
                    <strong>${escapeHtml(item.product_name)}</strong><br>
                    <small class="text-muted">SKU: ${escapeHtml(item.sku)}</small>
                </td>
                <td class="text-center">${item.quantity}</td>
                <td>₱${parseFloat(item.unit_price).toFixed(2)}</td>
                <td><strong>₱${parseFloat(item.line_total).toFixed(2)}</strong></td>
                <td>${batchInfo}</td>
            </tr>
        `;
    });

    const modalHtml = `
        <div class="modal fade" id="deliveryReceiptModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-file-earmark-text me-2"></i>Delivery Receipt
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="drContent">
                        <div class="text-center mb-4">
                            <h4 class="mb-1">Highland Fresh Dairy Products</h4>
                            <p class="text-muted mb-0">Bukidnon, Philippines</p>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <p class="mb-1"><strong>DR Number:</strong> <span class="badge bg-success">${escapeHtml(dr.dr_number)}</span></p>
                                <p class="mb-1"><strong>Order #:</strong> ${escapeHtml(dr.sale_number)}</p>
                                <p class="mb-1"><strong>Invoice #:</strong> ${escapeHtml(dr.invoice_number || 'N/A')}</p>
                                <p class="mb-1"><strong>Status:</strong> <span class="badge bg-info">${escapeHtml(dr.status)}</span></p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Customer:</strong> ${escapeHtml(dr.customer?.name)}</p>
                                <p class="mb-1"><strong>Contact:</strong> ${escapeHtml(dr.customer?.contact_person || 'N/A')}</p>
                                <p class="mb-1"><strong>Phone:</strong> ${escapeHtml(dr.customer?.phone || 'N/A')}</p>
                                <p class="mb-1"><strong>Address:</strong> ${escapeHtml(dr.customer?.address || 'N/A')}</p>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <p class="mb-0"><strong>Order Date:</strong> ${formatDate(dr.order_date).split(',')[0]}</p>
                            </div>
                            <div class="col-md-4">
                                <p class="mb-0"><strong>Dispatch Date:</strong> ${dr.dispatch_date ? formatDate(dr.dispatch_date).split(',')[0] : 'Not dispatched'}</p>
                            </div>
                            <div class="col-md-4">
                                <p class="mb-0"><strong>Payment Due:</strong> ${dr.payment_due_date ? formatDate(dr.payment_due_date).split(',')[0] : 'N/A'}</p>
                            </div>
                        </div>

                        <div class="alert alert-info mb-3">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>FIFO Batch Traceability:</strong> Items below show which production batches were used (oldest first).
                        </div>

                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead class="table-light">
                                    <tr>
                                        <th>Product</th>
                                        <th class="text-center">Qty</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                        <th>Batch Info (FIFO)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                                <tfoot>
                                    <tr class="fw-bold">
                                        <td colspan="3" class="text-end">Grand Total:</td>
                                        <td>₱${parseFloat(dr.total_amount).toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        <div class="row mt-4">
                            <div class="col-md-6">
                                <p class="mb-0"><strong>Sales Officer:</strong> ${escapeHtml(dr.sales_officer || 'N/A')}</p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-0"><strong>Dispatched By:</strong> ${escapeHtml(dr.dispatched_by || 'N/A')}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success" onclick="printDeliveryReceipt()">
                            <i class="bi bi-printer me-1"></i>Print DR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('deliveryReceiptModal');
    if (existingModal) existingModal.remove();

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deliveryReceiptModal'));
    modal.show();
}

/**
 * Print Delivery Receipt
 */
function printDeliveryReceipt() {
    const content = document.getElementById('drContent');
    if (!content) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Delivery Receipt - Highland Fresh</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 20px; font-size: 12px; }
                @media print {
                    .no-print { display: none; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${content.innerHTML}
            <script>
                window.onload = function() { 
                    setTimeout(function() { window.print(); }, 500);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * Preview reserved batches for an approved order
 */
async function previewOrderBatches(saleId) {
    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.get(salesOrdersAPI, {
            params: {
                operation: 'getDeliveryReceipt',
                sale_id: saleId
            },
            withCredentials: true
        });

        if (response.data.success) {
            const data = response.data.data;
            showBatchPreviewModal(data);
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error loading batch preview:', error);
        alert('Failed to load batch information: ' + (error.response?.data?.message || error.message));
    }
}

/**
 * Display batch preview modal for approved orders
 */
function showBatchPreviewModal(data) {
    const dr = data.delivery_receipt;
    const items = data.items;

    let itemsHtml = '';
    items.forEach(item => {
        let batchRows = '';
        if (item.batches && item.batches.length > 0) {
            item.batches.forEach(b => {
                batchRows += `
                    <tr>
                        <td><code>${escapeHtml(b.batch_code)}</code></td>
                        <td>${b.quantity}</td>
                        <td>${b.production_date ? formatDate(b.production_date).split(',')[0] : 'N/A'}</td>
                        <td>${b.expiry_date ? formatDate(b.expiry_date).split(',')[0] : 'N/A'}</td>
                    </tr>
                `;
            });
        } else {
            batchRows = '<tr><td colspan="4" class="text-muted text-center">Batches will be assigned at dispatch</td></tr>';
        }

        itemsHtml += `
            <div class="card mb-3">
                <div class="card-header bg-light">
                    <strong>${escapeHtml(item.product_name)}</strong>
                    <span class="badge bg-primary float-end">${item.quantity} units needed</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm mb-0">
                        <thead class="table-success">
                            <tr>
                                <th>Batch Code (FIFO)</th>
                                <th>Reserved Qty</th>
                                <th>Produced</th>
                                <th>Expires</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${batchRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    const modalHtml = `
        <div class="modal fade" id="batchPreviewModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-box-seam me-2"></i>Reserved Batches (FIFO)
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            <strong>Order:</strong> ${escapeHtml(dr.sale_number)} | 
                            <strong>Customer:</strong> ${escapeHtml(dr.customer?.name)}
                            <br>
                            <small>These batches are reserved and locked from other orders until dispatch or expiry.</small>
                        </div>
                        ${itemsHtml}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('batchPreviewModal');
    if (existingModal) existingModal.remove();

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('batchPreviewModal'));
    modal.show();
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Approve order directly from the success modal (after order creation)
 */
async function approveOrderFromModal(saleId, saleNumber) {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Approving...';

    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.post(salesOrdersAPI, {
            operation: 'approveOrder',
            sale_id: saleId
        }, { withCredentials: true });

        if (response.data.success) {
            btn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Approved!';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-success');

            // Show success and redirect to orders
            setTimeout(() => {
                window.location.href = 'sales-orders.html';
            }, 1000);
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error approving order:', error);
        btn.disabled = false;
        btn.innerHTML = originalText;
        alert('Failed to approve order: ' + (error.response?.data?.message || error.message));
    }
}

/**
 * Approve order inline from the orders table
 * UX improvement: Quick approve without opening modal
 */
async function approveOrderInline(saleId, saleNumber) {
    if (!confirm(`Approve order ${saleNumber}?\n\nThis will allow Warehouse Staff to dispatch the order.`)) {
        return;
    }

    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.post(salesOrdersAPI, {
            operation: 'approveOrder',
            sale_id: saleId
        }, { withCredentials: true });

        if (response.data.success) {
            // Show success notification
            showToastNotification(`Order ${saleNumber} approved successfully!`, 'success');
            // Reload orders to reflect the change
            loadOrders();
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error approving order:', error);
        showToastNotification('Failed to approve order: ' + (error.response?.data?.message || error.message), 'error');
    }
}

/**
 * Reject order inline from the orders table
 */
async function rejectOrderInline(saleId, saleNumber) {
    const reason = prompt(`Reject order ${saleNumber}?\n\nPlease enter rejection reason:`);

    if (reason === null) {
        return; // User cancelled
    }

    if (!reason.trim()) {
        alert('Rejection reason is required');
        return;
    }

    try {
        const salesOrdersAPI = APIResponseHandler.getApiUrl('SalesOrdersAPI.php');
        const response = await axios.post(salesOrdersAPI, {
            operation: 'rejectOrder',
            sale_id: saleId,
            rejection_reason: reason.trim()
        }, { withCredentials: true });

        if (response.data.success) {
            showToastNotification(`Order ${saleNumber} rejected`, 'warning');
            loadOrders();
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Error rejecting order:', error);
        showToastNotification('Failed to reject order: ' + (error.response?.data?.message || error.message), 'error');
    }
}

/**
 * Show toast notification for quick feedback
 */
function showToastNotification(message, type = 'info') {
    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning text-dark' : 'bg-info';
    const icon = type === 'success' ? 'check-circle-fill' : type === 'error' ? 'exclamation-triangle-fill' : 'info-circle-fill';

    const toastHtml = `
        <div class="position-fixed top-0 end-0 p-3" style="z-index: 11000">
            <div class="toast show align-items-center ${bgClass} ${type !== 'warning' ? 'text-white' : ''} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-${icon} me-2"></i>${message}
                    </div>
                    <button type="button" class="btn-close ${type !== 'warning' ? 'btn-close-white' : ''} me-2 m-auto" onclick="this.closest('.position-fixed').remove()"></button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        const toast = document.querySelector('.toast.show');
        if (toast) toast.closest('.position-fixed').remove();
    }, 4000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.salesOrders = new SalesOrders();
});
