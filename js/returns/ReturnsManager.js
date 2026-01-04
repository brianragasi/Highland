class ReturnsManager {
    constructor() {
        this.returnsAPI = new ReturnsAPI();
        this.currentSale = null;
        this.returnItems = [];
        this.returnReasons = [
            'Defective Product',
            'Wrong Item Received', 
            'Customer Changed Mind',
            'Expired Product',
            'Damaged During Transport',
            'Quality Issue',
            'Price Discrepancy',
            'Other'
        ];
        this.conditionTypes = [
            { value: 'Good', label: 'Good Condition', restock: true },
            { value: 'Damaged', label: 'Damaged', restock: false },
            { value: 'Expired', label: 'Expired', restock: false }
        ];
    }
    init() {
        console.log('🔄 Returns Manager initialized');
        this.setupEventListeners();
        this.loadReturnHistory();
    }
    setupEventListeners() {
        const receiptForm = document.getElementById('receiptLookupForm');
        if (receiptForm) {
            receiptForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleReceiptLookup();
            });
        }
        const receiptInput = document.getElementById('receiptNumberInput');
        if (receiptInput) {
            receiptInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleReceiptLookup();
                }
            });
        }
        const processReturnBtn = document.getElementById('processReturnBtn');
        if (processReturnBtn) {
            processReturnBtn.addEventListener('click', () => {
                this.processReturn();
            });
        }
        const clearReturnBtn = document.getElementById('clearReturnBtn');
        if (clearReturnBtn) {
            clearReturnBtn.addEventListener('click', () => {
                this.clearReturn();
            });
        }
    }
    async handleReceiptLookup() {
        const receiptInput = document.getElementById('receiptNumberInput');
        const receiptNumber = receiptInput?.value?.trim();
        if (!receiptNumber) {
            this.showError('Please enter a receipt number');
            return;
        }
        try {
            this.showLoading('Looking up receipt...');
            const saleData = await this.returnsAPI.findSaleByReceipt(receiptNumber);
            this.currentSale = saleData.sale;
            this.displaySaleDetails(saleData.sale, saleData.items);
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError(`Receipt not found: ${error.message}`);
            console.error('Receipt lookup error:', error);
        }
    }
    displaySaleDetails(sale, items) {
        const saleDetailsContainer = document.getElementById('saleDetails');
        const returnItemsContainer = document.getElementById('returnItemsSelection');
        if (!saleDetailsContainer || !returnItemsContainer) {
            console.error('Required containers not found');
            return;
        }
        saleDetailsContainer.innerHTML = `
            <div class="main-card">
                <div class="card-header">
                    <h6><i class="bi bi-receipt me-2"></i>Sale Details</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Receipt #:</strong> ${sale.sale_number}</p>
                            <p><strong>Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}</p>
                            <p><strong>Processed By:</strong> ${sale.cashier_name || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</p>
                            <p><strong>Phone:</strong> ${sale.customer_phone || 'N/A'}</p>
                            <p><strong>Total:</strong> ₱${parseFloat(sale.total_amount).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        returnItemsContainer.innerHTML = `
            <div class="main-card">
                <div class="card-header">
                    <h6><i class="bi bi-list-check me-2"></i>Select Items to Return</h6>
                </div>
                <div class="card-body">
                    <div id="returnItemsList">
                        ${items.map(item => this.renderReturnItemRow(item)).join('')}
                    </div>
                    <div class="mt-4">
                        <div class="row">
                            <div class="col-md-6">
                                <label for="returnReason" class="form-label">Return Reason *</label>
                                <select class="form-select" id="returnReason" required>
                                    <option value="">Select reason...</option>
                                    ${this.returnReasons.map(reason => `<option value="${reason}">${reason}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Return Total</label>
                                <div class="alert alert-info">
                                    <strong id="returnTotal">₱0.00</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between mt-4">
                        <button type="button" class="btn btn-outline-secondary" id="clearReturnBtn">
                            <i class="bi bi-x-circle me-1"></i>Clear Return
                        </button>
                        <button type="button" class="btn btn-warning" id="processReturnBtn" disabled>
                            <i class="bi bi-arrow-return-left me-1"></i>Process Return
                        </button>
                    </div>
                </div>
            </div>
        `;
        this.setupReturnItemsListeners();
        this.toggleProcessReturnButton();
        saleDetailsContainer.style.display = 'block';
        returnItemsContainer.style.display = 'block';
    }
    renderReturnItemRow(item) {
        const itemId = `item_${item.sale_item_id}`;
        const maxQuantity = parseFloat(item.returnable_quantity);
        return `
            <div class="return-item-row mb-3 p-3 border rounded" data-sale-item-id="${item.sale_item_id}" data-unit-price="${item.unit_price}">
                <div class="row align-items-center">
                    <div class="col-md-1">
                        <div class="form-check">
                            <input class="form-check-input return-item-checkbox" type="checkbox" 
                                   id="checkbox_${itemId}" data-sale-item-id="${item.sale_item_id}">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <strong>${item.product_name}</strong>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">Original Qty:</small><br>
                        <strong>${item.quantity}</strong>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">Available:</small><br>
                        <strong class="text-success">${maxQuantity}</strong>
                    </div>
                    <div class="col-md-2">
                        <label for="qty_${itemId}" class="form-label small">Return Qty</label>
                        <input type="number" class="form-control return-quantity-input" 
                               id="qty_${itemId}" min="0" max="${maxQuantity}" step="0.1" value="0"
                               data-sale-item-id="${item.sale_item_id}" disabled>
                    </div>
                    <div class="col-md-1">
                        <small class="text-muted">Unit Price:</small><br>
                        <strong>₱${parseFloat(item.unit_price).toFixed(2)}</strong>
                    </div>
                </div>
                <div class="row mt-2" id="options_${itemId}" style="display: none;">
                    <div class="col-md-6">
                        <label for="condition_${itemId}" class="form-label small">Condition</label>
                        <select class="form-select form-select-sm return-condition-select" 
                                id="condition_${itemId}" data-sale-item-id="${item.sale_item_id}">
                            ${this.conditionTypes.map(condition => 
                                `<option value="${condition.value}" data-restock="${condition.restock}">
                                    ${condition.label}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="col-md-6">
                        <div class="form-check mt-4">
                            <input class="form-check-input return-restock-checkbox" type="checkbox" 
                                   id="restock_${itemId}" checked data-sale-item-id="${item.sale_item_id}">
                            <label class="form-check-label small" for="restock_${itemId}">
                                Eligible for Restock
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    setupReturnItemsListeners() {
        document.querySelectorAll('.return-item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleItemSelection(e.target);
            });
        });
        document.querySelectorAll('.return-quantity-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleQuantityChange(e.target);
            });
        });
        document.querySelectorAll('.return-condition-select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleConditionChange(e.target);
            });
        });
        const reasonSelect = document.getElementById('returnReason');
        if (reasonSelect) {
            reasonSelect.addEventListener('change', () => {
                this.toggleProcessReturnButton();
            });
        }
        const clearBtn = document.getElementById('clearReturnBtn');
        const processBtn = document.getElementById('processReturnBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearReturn());
        }
        if (processBtn) {
            processBtn.addEventListener('click', () => this.processReturn());
        }
    }
    handleItemSelection(checkbox) {
        const saleItemId = checkbox.dataset.saleItemId;
        const isChecked = checkbox.checked;
        const quantityInput = document.getElementById(`qty_item_${saleItemId}`);
        const optionsDiv = document.getElementById(`options_item_${saleItemId}`);
        if (quantityInput && optionsDiv) {
            quantityInput.disabled = !isChecked;
            optionsDiv.style.display = isChecked ? 'block' : 'none';
            if (isChecked) {
                const maxQty = parseFloat(quantityInput.max);
                quantityInput.value = maxQty;
                const itemRow = checkbox.closest('.return-item-row');
                if (itemRow) {
                    itemRow.classList.add('selected');
                }
            } else {
                quantityInput.value = 0;
                const itemRow = checkbox.closest('.return-item-row');
                if (itemRow) {
                    itemRow.classList.remove('selected');
                }
            }
            this.updateReturnTotal();
            this.toggleProcessReturnButton();
        }
    }
    handleQuantityChange(input) {
        const quantity = parseFloat(input.value) || 0;
        const maxQuantity = parseFloat(input.max);
        if (quantity > maxQuantity) {
            input.value = maxQuantity;
            this.showWarning(`Maximum returnable quantity is ${maxQuantity}`);
        } else if (quantity < 0) {
            input.value = 0;
        }
        this.updateReturnTotal();
        this.toggleProcessReturnButton();
    }
    handleConditionChange(select) {
        const saleItemId = select.dataset.saleItemId;
        const selectedOption = select.options[select.selectedIndex];
        const canRestock = selectedOption.dataset.restock === 'true';
        const restockCheckbox = document.getElementById(`restock_item_${saleItemId}`);
        if (restockCheckbox) {
            restockCheckbox.checked = canRestock;
            restockCheckbox.disabled = !canRestock;
        }
    }
    updateReturnTotal() {
        let total = 0;
        document.querySelectorAll('.return-item-checkbox:checked').forEach(checkbox => {
            const saleItemId = checkbox.dataset.saleItemId;
            const quantityInput = document.getElementById(`qty_item_${saleItemId}`);
            if (quantityInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const itemRow = quantityInput.closest('.return-item-row');
                const unitPrice = parseFloat(itemRow.dataset.unitPrice) || 0;
                total += quantity * unitPrice;
            }
        });
        const returnTotalElement = document.getElementById('returnTotal');
        if (returnTotalElement) {
            returnTotalElement.textContent = `₱${total.toFixed(2)}`;
        }
    }
    toggleProcessReturnButton() {
        const processBtn = document.getElementById('processReturnBtn');
        const reasonSelect = document.getElementById('returnReason');
        const hasSelectedItems = document.querySelectorAll('.return-item-checkbox:checked').length > 0;
        const hasValidQuantities = this.validateReturnQuantities();
        const hasReason = reasonSelect && reasonSelect.value;
        if (processBtn) {
            processBtn.disabled = !(hasSelectedItems && hasValidQuantities && hasReason);
        }
    }
    validateReturnQuantities() {
        let isValid = true;
        document.querySelectorAll('.return-item-checkbox:checked').forEach(checkbox => {
            const saleItemId = checkbox.dataset.saleItemId;
            const quantityInput = document.getElementById(`qty_item_${saleItemId}`);
            if (quantityInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                if (quantity <= 0) {
                    isValid = false;
                }
            }
        });
        return isValid;
    }
    async processReturn() {
        if (!this.currentSale) {
            this.showError('No sale selected for return');
            return;
        }
        try {
            const returnData = this.gatherReturnData();
            if (!returnData.items.length) {
                this.showError('Please select at least one item to return');
                return;
            }
            if (!await this.confirmReturn(returnData)) {
                return;
            }
            this.showLoading('Processing return...');
            const result = await this.returnsAPI.createReturn(returnData);
            this.hideLoading();
            this.showSuccess(`Return ${result.data.return_number} processed successfully!`);
            this.showReturnReceipt(result.data);
            this.clearReturn();
            this.loadReturnHistory();
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to process return: ${error.message}`);
            console.error('Process return error:', error);
        }
    }
    gatherReturnData() {
        const returnReason = document.getElementById('returnReason').value;
        const items = [];
        document.querySelectorAll('.return-item-checkbox:checked').forEach(checkbox => {
            const saleItemId = checkbox.dataset.saleItemId;
            const quantityInput = document.getElementById(`qty_item_${saleItemId}`);
            const conditionSelect = document.getElementById(`condition_item_${saleItemId}`);
            const restockCheckbox = document.getElementById(`restock_item_${saleItemId}`);
            if (quantityInput && conditionSelect) {
                const quantity = parseFloat(quantityInput.value);
                if (quantity > 0) {
                    items.push({
                        sale_item_id: parseInt(saleItemId),
                        returned_quantity: quantity,
                        condition_type: conditionSelect.value,
                        restock_eligible: restockCheckbox ? restockCheckbox.checked : false
                    });
                }
            }
        });
        return {
            sale_id: this.currentSale.sale_id,
            reason: returnReason,
            items: items
        };
    }
    async confirmReturn(returnData) {
        return new Promise((resolve) => {
            const itemsCount = returnData.items.length;
            const totalAmount = document.getElementById('returnTotal').textContent;
            const detailsContainer = document.getElementById('returnConfirmDetails');
            detailsContainer.innerHTML = `
                <div class="row">
                    <div class="col-6"><strong>Items:</strong></div>
                    <div class="col-6">${itemsCount}</div>
                </div>
                <div class="row">
                    <div class="col-6"><strong>Total:</strong></div>
                    <div class="col-6 text-success fw-bold">${totalAmount}</div>
                </div>
                <div class="row">
                    <div class="col-6"><strong>Reason:</strong></div>
                    <div class="col-6">${returnData.reason}</div>
                </div>
            `;
            const modal = new bootstrap.Modal(document.getElementById('returnConfirmModal'));
            modal.show();
            const confirmBtn = document.getElementById('confirmReturnBtn');
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            newConfirmBtn.addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            document.getElementById('returnConfirmModal').addEventListener('hidden.bs.modal', () => {
                resolve(false);
            }, { once: true });
        });
    }
    showReturnReceipt(returnResult) {
        console.log('Return receipt:', returnResult);
        this.showSuccess(
            `Return processed successfully!<br>` +
            `<strong>Return #:</strong> ${returnResult.return_number}<br>` +
            `<strong>Status:</strong> ${returnResult.status}<br>` +
            `<strong>Total:</strong> ₱${returnResult.total_return_amount.toFixed(2)}`
        );
    }
    clearReturn() {
        this.currentSale = null;
        this.returnItems = [];
        const saleDetailsContainer = document.getElementById('saleDetails');
        const returnItemsContainer = document.getElementById('returnItemsSelection');
        const receiptInput = document.getElementById('receiptNumberInput');
        if (saleDetailsContainer) saleDetailsContainer.style.display = 'none';
        if (returnItemsContainer) returnItemsContainer.style.display = 'none';
        if (receiptInput) receiptInput.value = '';
    }
    async loadReturnHistory() {
        try {
            const historyData = await this.returnsAPI.getReturnHistory({ limit: 10 });
            this.displayReturnHistory(historyData.returns);
        } catch (error) {
            console.error('Failed to load return history:', error);
        }
    }
    displayReturnHistory(returns) {
        const historyContainer = document.getElementById('returnHistoryList');
        if (!historyContainer) return;
        if (!returns.length) {
            historyContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="bi bi-clock-history display-4"></i>
                    <p class="mt-2">No returns found</p>
                </div>
            `;
            return;
        }
        historyContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Return #</th>
                            <th>Original Sale</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${returns.map(returnItem => `
                            <tr>
                                <td><strong>${returnItem.return_number}</strong></td>
                                <td>${returnItem.sale_number}</td>
                                <td>${returnItem.customer_name || 'Walk-in'}</td>
                                <td>₱${parseFloat(returnItem.total_return_amount).toFixed(2)}</td>
                                <td>
                                    <span class="badge ${this.getStatusBadgeClass(returnItem.status)}">
                                        ${returnItem.status}
                                    </span>
                                </td>
                                <td>${new Date(returnItem.return_date).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="returnsManager.viewReturnDetails(${returnItem.return_id})">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    getStatusBadgeClass(status) {
        switch (status) {
            case 'Return Approved':
            case 'Return Completed':
                return 'bg-success';
            case 'Return Pending':
                return 'bg-warning';
            case 'Return Rejected':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }
    async viewReturnDetails(returnId) {
        try {
            const details = await this.returnsAPI.getReturnDetails(returnId);
            console.log('Return details:', details);
            this.showInfo(
                `<strong>Return Details</strong><br>` +
                `<strong>Return #:</strong> ${details.return.return_number}<br>` +
                `<strong>Reason:</strong> ${details.return.reason}<br>` +
                `<strong>Items:</strong> ${details.items.length}`
            );
        } catch (error) {
            this.showError(`Failed to load return details: ${error.message}`);
        }
    }
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    showError(message) {
        this.showMessage(message, 'error');
    }
    showWarning(message) {
        this.showMessage(message, 'warning');
    }
    showMessage(message, type) {
        if (typeof showStatus === 'function') {
            showStatus(message, type);
        } else if (typeof window.showError === 'function' && type === 'error') {
            window.showError(message);
        } else if (typeof window.showSuccess === 'function' && type === 'success') {
            window.showSuccess(message);
        } else if (typeof window.showInfo === 'function') {
            window.showInfo(message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    showLoading(message) {
        console.log('Loading:', message);
    }
    hideLoading() {
        console.log('Loading complete');
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReturnsManager;
} else {
    window.ReturnsManager = ReturnsManager;
}