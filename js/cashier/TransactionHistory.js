class TransactionHistory {
    constructor() {
        this.currentPage = 1;
        this.recordsPerPage = 20;
        this.totalRecords = 0;
        this.totalPages = 0;
        this.currentFilters = {
            search: '',
            dateFrom: '',
            dateTo: '',
            paymentMethod: '',
            customerType: '',
            transactionType: '',
            coldChain: '',
            deliveryRequired: '',
            qualityCheck: '',
            cooperativeCode: ''
        };
        this.transactions = [];
        this.isLoading = false;
    }
    static init() {
        window.transactionHistory = new TransactionHistory();
        window.transactionHistory.setupEventListeners();
        window.transactionHistory.trySetupDateRangePicker();
        window.transactionHistory.loadTransactions();
        window.refreshTransactions = () => window.transactionHistory.refreshTransactions();
        window.applyFilters = () => window.transactionHistory.applyFilters();
        window.clearFilters = () => window.transactionHistory.clearFilters();
        window.viewTransactionDetails = (saleId) => window.transactionHistory.viewTransactionDetails(saleId);
        window.printReceipt = () => window.transactionHistory.printCurrentReceipt();
        window.goToPage = (page) => window.transactionHistory.goToPage(page);
        window.exportTransactions = () => window.transactionHistory.exportTransactions();
    }
    trySetupDateRangePicker(retries = 3) {
        if (typeof $ !== 'undefined' && $.fn.daterangepicker) {
            this.setupDateRangePicker();
        } else if (retries > 0) {
            console.log(`jQuery/daterangepicker not ready, retrying... (${retries} attempts left)`);
            setTimeout(() => this.trySetupDateRangePicker(retries - 1), 200);
        } else {
            console.warn('Failed to setup daterangepicker after multiple attempts');
        }
    }
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentFilters.search = searchInput.value.trim();
                this.applyFilters();
            }, 500);
        });

        const recordsPerPage = document.getElementById('recordsPerPage');
        recordsPerPage.addEventListener('change', () => {
            this.recordsPerPage = parseInt(recordsPerPage.value);
            this.currentPage = 1;
            this.loadTransactions();
        });

        // Highland Fresh Enhanced Filters
        const paymentMethodFilter = document.getElementById('paymentMethodFilter');
        paymentMethodFilter.addEventListener('change', () => {
            this.currentFilters.paymentMethod = paymentMethodFilter.value;
            this.applyFilters();
        });
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }
    setupDateRangePicker() {
        if (typeof $ === 'undefined') {
            console.warn('jQuery not available, skipping daterangepicker setup');
            return;
        }
        if (!$.fn.daterangepicker) {
            console.warn('daterangepicker plugin not available, skipping setup');
            return;
        }
        const dateRange = $('#dateRange');
        if (dateRange.length === 0) {
            console.warn('dateRange element not found');
            return;
        }
        dateRange.daterangepicker({
            opens: 'left',
            autoUpdateInput: false,
            locale: {
                cancelLabel: 'Clear',
                format: 'YYYY-MM-DD'
            },
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            }
        });
        dateRange.on('apply.daterangepicker', (ev, picker) => {
            dateRange.val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));
            this.currentFilters.dateFrom = picker.startDate.format('YYYY-MM-DD');
            this.currentFilters.dateTo = picker.endDate.format('YYYY-MM-DD');
            this.applyFilters();
        });
        dateRange.on('cancel.daterangepicker', () => {
            dateRange.val('');
            this.currentFilters.dateFrom = '';
            this.currentFilters.dateTo = '';
            this.applyFilters();
        });
    }
    async loadTransactions() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.showLoading();

        try {
            const params = new URLSearchParams({
                operation: 'history',
                page: this.currentPage,
                limit: this.recordsPerPage
            });

            // Basic filters
            if (this.currentFilters.search) {
                params.append('search', this.currentFilters.search);
            }
            if (this.currentFilters.dateFrom) {
                params.append('date_from', this.currentFilters.dateFrom);
            }
            if (this.currentFilters.dateTo) {
                params.append('date_to', this.currentFilters.dateTo);
            }

            // Payment method mapping
            if (this.currentFilters.paymentMethod) {
                const paymentMethodMap = {
                    'Cash': '1',
                    'Credit Card': '2',
                    'Debit Card': '3',
                    'Digital Wallet': '4',
                    'Bank Transfer': '5',
                    'Cooperative Credit': '6'
                };
                const paymentMethodId = paymentMethodMap[this.currentFilters.paymentMethod];
                if (paymentMethodId) {
                    params.append('payment_method_id', paymentMethodId);
                }
            }

            const response = await axios.get('../api/SalesAPI.php', {
                params: Object.fromEntries(params),
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true
            });

            const result = response.data;
            console.log('API Response:', result);
            if (result.success) {
                this.transactions = result.data.transactions;
                console.log('Loaded transactions:', this.transactions.length);
                this.updatePagination(result.data.pagination);
                this.displayTransactions();
                this.updateStatistics(result.data.stats);
            } else {
                console.log('API Error:', result.message);
                this.showError(result.message || 'Failed to load Highland Fresh transactions');
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showError('Network error. Please check your connection and try again.');
            this.showEmptyState();
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }
    displayTransactions() {
        if (this.transactions.length === 0) {
            this.showEmptyState();
            return;
        }
        this.hideEmptyState();
        this.displayTransactionTable();
        this.displayTransactionCards();
        this.updateTransactionCount();
    }
    displayTransactionTable() {
        const tableBody = document.getElementById('transactionTableBody');
        tableBody.innerHTML = '';

        this.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${transaction.sale_number}</strong>
                    ${transaction.highland_fresh_receipt_number ?
                    `<br><small class="text-muted">HF: ${transaction.highland_fresh_receipt_number}</small>` : ''}
                </td>
                <td>
                    <div>${this.formatDate(transaction.sale_date)}</div>
                    <small class="text-muted">${this.formatTime(transaction.sale_date)}</small>
                </td>
                <td>
                    ${transaction.customer_name ?
                    `<div>${transaction.customer_name}</div>
                         ${transaction.customer_phone ? `<small class="text-muted">${transaction.customer_phone}</small>` : ''}`
                    : '<span class="text-muted">Walk-in Customer</span>'}
                </td>
                <td>
                    <span class="badge bg-info">${transaction.item_count} items</span>
                </td>
                <td>
                    <span class="badge bg-secondary">
                        <i class="bi bi-${this.getPaymentIcon(transaction.payment_method)}"></i>
                        ${transaction.payment_method}
                    </span>
                </td>
                <td>
                    <strong class="text-success">₱${this.formatCurrency(transaction.total_amount)}</strong>
                </td>
                <td>
                    <span class="text-muted">${transaction.cashier_name || 'Unknown'}</span>
                </td>
                <td>
                    <span class="badge bg-success">Completed</span>
                </td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-outline-success btn-sm" onclick="viewTransactionDetails(${transaction.sale_id})" 
                                title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-primary btn-sm" onclick="ReceiptManager.printReceipt(${transaction.sale_id})" 
                                title="Print Receipt">
                            <i class="bi bi-printer"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.getElementById('transactionTable').style.display = 'block';
    }
    displayTransactionCards() {
        const cardsContainer = document.getElementById('transactionCardsContainer');
        cardsContainer.innerHTML = '';
        this.transactions.forEach(transaction => {
            const card = document.createElement('div');
            card.className = 'transaction-card-mobile';
            card.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0">${transaction.sale_number}</h6>
                                <small class="opacity-75">
                                    <i class="fas fa-calendar me-1"></i> ${this.formatDate(transaction.sale_date)} 
                                    <i class="fas fa-clock ms-2 me-1"></i> ${this.formatTime(transaction.sale_date)}
                                </small>
                            </div>
                            <span class="badge bg-light text-dark">${transaction.status}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">
                                <i class="fas fa-user me-1"></i> Customer
                            </span>
                            <span class="transaction-info-value">
                                ${transaction.customer_name || 'Walk-in Customer'}
                            </span>
                        </div>
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">
                                <i class="fas fa-shopping-cart me-1"></i> Items
                            </span>
                            <span class="transaction-info-value">
                                ${transaction.item_count} items
                            </span>
                        </div>
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">
                                <i class="fas fa-credit-card me-1"></i> Payment
                            </span>
                            <span class="transaction-info-value">
                                <span class="badge bg-secondary">
                                    <i class="fas fa-${this.getPaymentIcon(transaction.payment_method)} me-1"></i>
                                    ${transaction.payment_method}
                                </span>
                            </span>
                        </div>
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">
                                <i class="fas fa-peso-sign me-1"></i> Total Amount
                            </span>
                            <span class="transaction-info-value transaction-amount">
                                ₱${this.formatCurrency(transaction.total_amount)}
                            </span>
                        </div>
                        <div class="d-flex gap-2 mt-3">
                            <button class="btn btn-outline-success btn-sm flex-fill" onclick="viewTransactionDetails(${transaction.sale_id})">
                                <i class="bi bi-eye me-1"></i> View Details
                            </button>
                            <button class="btn btn-outline-primary btn-sm flex-fill" onclick="ReceiptManager.printReceipt(${transaction.sale_id})">
                                <i class="bi bi-printer me-1"></i> Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(card);
        });
        document.getElementById('transactionCards').style.display = 'block';
    }
    updatePagination(pagination) {
        this.currentPage = pagination.current_page;
        this.totalPages = pagination.total_pages;
        this.totalRecords = pagination.total_records;
        const start = ((this.currentPage - 1) * pagination.per_page) + 1;
        const end = Math.min(this.currentPage * pagination.per_page, this.totalRecords);
        document.getElementById('paginationInfo').textContent =
            `Showing ${start}-${end} of ${this.totalRecords} results`;
        this.generatePaginationControls(pagination);
        if (this.totalPages > 1) {
            document.getElementById('paginationContainer').style.display = 'flex';
        } else {
            document.getElementById('paginationContainer').style.display = 'none';
        }
    }
    generatePaginationControls(pagination) {
        const paginationControls = document.getElementById('paginationControls');
        paginationControls.innerHTML = '';
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${!pagination.has_prev ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link" href="#" onclick="goToPage(${this.currentPage - 1})" ${!pagination.has_prev ? 'tabindex="-1"' : ''}>
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        paginationControls.appendChild(prevLi);
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>`;
            paginationControls.appendChild(pageLi);
        }
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${!pagination.has_next ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link" href="#" onclick="goToPage(${this.currentPage + 1})" ${!pagination.has_next ? 'tabindex="-1"' : ''}>
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        paginationControls.appendChild(nextLi);
    }
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        this.currentPage = page;
        this.loadTransactions();
    }
    applyFilters() {
        this.currentPage = 1;
        this.updateActiveFiltersCount();
        this.loadTransactions();
    }
    updateActiveFiltersCount() {
        const activeFilters = [];
        if (this.currentFilters.search) activeFilters.push('search');
        if (this.currentFilters.dateFrom) activeFilters.push('date range');
        if (this.currentFilters.paymentMethod) activeFilters.push('payment method');
        const badge = document.getElementById('activeFiltersCount');
        if (activeFilters.length > 0) {
            badge.textContent = `${activeFilters.length} filter${activeFilters.length > 1 ? 's' : ''} active`;
            badge.classList.remove('d-none', 'bg-secondary');
            badge.classList.add('bg-success');
        } else {
            badge.classList.add('d-none');
            badge.classList.remove('bg-success');
            badge.classList.add('bg-secondary');
        }
    }
    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('dateRange').value = '';
        document.getElementById('paymentMethodFilter').selectedIndex = 0;
        this.currentFilters = {
            search: '',
            dateFrom: '',
            dateTo: '',
            paymentMethod: ''
        };
        this.applyFilters();
    }
    refreshTransactions() {
        this.loadTransactions();
        this.showSuccess('Transactions refreshed successfully');
    }
    async viewTransactionDetails(saleId) {
        const content = document.getElementById('transactionDetailsContent');
        content.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading transaction details...</p>
            </div>
        `;
        const modal = new bootstrap.Modal(document.getElementById('transactionDetailsModal'));
        modal.show();
        try {
            const response = await axios.get('../api/SalesAPI.php', {
                params: { operation: 'details', sale_id: saleId },
                withCredentials: true
            });

            const result = response.data;
            if (result.success) {
                this.displayTransactionDetailsModal(result.data);
                this.currentSaleId = saleId;
            } else {
                content.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Error:</strong> ${result.message || 'Failed to load transaction details'}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading transaction details:', error);
            content.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Network Error:</strong> Failed to load transaction details. Please check your connection and try again.
                    <br><small class="text-muted">Error: ${error.message}</small>
                </div>
            `;
        }
    }
    displayTransactionDetailsModal(data) {
        const content = document.getElementById('transactionDetailsContent');
        if (!data || !data.sale) {
            content.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Warning:</strong> Transaction data is incomplete or invalid.
                </div>
            `;
            return;
        }
        const sale = data.sale;
        const items = data.items || [];
        content.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6 mb-3">
                    <h6 class="text-success"><i class="fas fa-receipt me-2"></i>Transaction Information</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-borderless">
                            <tr>
                                <td class="fw-bold text-muted">Sale Number:</td>
                                <td><code class="bg-light px-2 py-1 rounded">${sale.sale_number || 'N/A'}</code></td>
                            </tr>
                            <tr>
                                <td class="fw-bold text-muted">Date & Time:</td>
                                <td>${this.formatDateTime(sale.sale_date)}</td>
                            </tr>
                            <tr>
                                <td class="fw-bold text-muted">Processed By:</td>
                                <td><i class="fas fa-user-tie me-1"></i>${sale.cashier_name || 'Unknown'}</td>
                            </tr>
                            <tr>
                                <td class="fw-bold text-muted">Status:</td>
                                <td><span class="badge bg-${this.getStatusColor(sale.status)}">${sale.status || 'Unknown'}</span></td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <h6 class="text-primary"><i class="fas fa-user me-2"></i>Customer Information</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-borderless">
                            <tr>
                                <td class="fw-bold text-muted">Name:</td>
                                <td><i class="fas fa-user me-1"></i>${sale.customer_name || 'Walk-in Customer'}</td>
                            </tr>
                            <tr>
                                <td class="fw-bold text-muted">Phone:</td>
                                <td><i class="fas fa-phone me-1"></i>${sale.customer_phone || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td class="fw-bold text-muted">Payment Method:</td>
                                <td>
                                    <span class="badge bg-secondary">
                                        <i class="fas fa-${this.getPaymentIcon(sale.payment_method)} me-1"></i>
                                        ${sale.payment_method || 'Unknown'}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
            <div class="mb-4">
                <h6 class="text-info"><i class="fas fa-shopping-cart me-2"></i>Items Sold ${items.length > 0 ? `(${items.length} items)` : ''}</h6>
                ${items.length > 0 ? `
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-success">
                                <tr>
                                    <th><i class="fas fa-box me-1"></i>Product</th>
                                    <th class="text-center"><i class="fas fa-barcode me-1"></i>Barcode</th>
                                    <th class="text-center"><i class="fas fa-sort-numeric-up me-1"></i>Qty</th>
                                    <th class="text-end"><i class="fas fa-peso-sign me-1"></i>Unit Price</th>
                                    <th class="text-end"><i class="fas fa-percentage me-1"></i>Discount</th>
                                    <th class="text-end"><i class="fas fa-calculator me-1"></i>Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>
                                            <strong>${item.product_name || 'Unknown Product'}</strong>
                                            ${item.product_description ? `<br><small class="text-muted">${item.product_description}</small>` : ''}
                                        </td>
                                        <td class="text-center">
                                            <code class="bg-light px-2 py-1 rounded">${item.product_barcode || 'N/A'}</code>
                                        </td>
                                        <td class="text-center">
                                            <span class="badge bg-info">${item.quantity || 0}</span>
                                        </td>
                                        <td class="text-end">₱${this.formatCurrency(item.unit_price || 0)}</td>
                                        <td class="text-end">
                                            ${item.discount_amount && parseFloat(item.discount_amount) > 0 ?
                `<span class="text-warning">-₱${this.formatCurrency(item.discount_amount)}</span>` :
                '<span class="text-muted">₱0.00</span>'
            }
                                        </td>
                                        <td class="text-end">
                                            <strong class="text-success">₱${this.formatCurrency(item.line_total || 0)}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        No item details available for this transaction.
                    </div>
                `}
            </div>
            <div class="row mt-4">
                <div class="col-md-8 col-lg-6 offset-md-4 offset-lg-6">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="fas fa-calculator me-2"></i>Transaction Summary</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm mb-0">
                                <tr>
                                    <td class="fw-bold">Subtotal:</td>
                                    <td class="text-end">₱${this.formatCurrency(sale.subtotal || sale.total_amount || 0)}</td>
                                </tr>
                                ${sale.tax_rate ? `
                                    <tr>
                                        <td class="fw-bold">Tax (${(parseFloat(sale.tax_rate) * 100).toFixed(1)}%):</td>
                                        <td class="text-end">₱${this.formatCurrency(sale.tax_amount || 0)}</td>
                                    </tr>
                                ` : ''}
                                ${sale.discount_amount && parseFloat(sale.discount_amount) > 0 ? `
                                    <tr class="text-warning">
                                        <td class="fw-bold">Discount:</td>
                                        <td class="text-end">-₱${this.formatCurrency(sale.discount_amount)}</td>
                                    </tr>
                                ` : ''}
                                <tr class="table-success border-top-2">
                                    <td class="fw-bold fs-6">Total Amount:</td>
                                    <td class="text-end fw-bold fs-6 text-success">₱${this.formatCurrency(sale.total_amount || 0)}</td>
                                </tr>
                                ${sale.payment_received ? `
                                    <tr>
                                        <td class="fw-bold">Payment Received:</td>
                                        <td class="text-end">₱${this.formatCurrency(sale.payment_received)}</td>
                                    </tr>
                                ` : ''}
                                ${sale.change_amount ? `
                                    <tr>
                                        <td class="fw-bold">Change Given:</td>
                                        <td class="text-end">₱${this.formatCurrency(sale.change_amount)}</td>
                                    </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    printCurrentReceipt() {
        if (this.currentSaleId) {
            if (window.receiptManager && window.receiptManager.printReceipt) {
                window.receiptManager.printReceipt(this.currentSaleId);
            } else if (window.printReceipt) {
                window.printReceipt(this.currentSaleId);
            } else {
                console.error('ReceiptManager not available');
                this.showError('Receipt printing is not available. Please refresh the page.');
            }
        } else {
            this.showError('No transaction selected for printing.');
        }
    }
    updateStatistics() {
        if (this.transactions.length === 0) {
            document.getElementById('totalTransactions').textContent = '0';
            document.getElementById('totalSales').textContent = '₱0.00';
            document.getElementById('todaysSales').textContent = '₱0.00';
            document.getElementById('avgTransaction').textContent = '₱0.00';
            return;
        }
        const totalAmount = this.transactions.reduce((sum, t) => sum + parseFloat(t.total_amount), 0);
        const avgTransaction = totalAmount / this.transactions.length;
        const today = new Date().toISOString().split('T')[0];
        const todaysTransactions = this.transactions.filter(t => t.sale_date.startsWith(today));
        const todaysSales = todaysTransactions.reduce((sum, t) => sum + parseFloat(t.total_amount), 0);
        document.getElementById('totalTransactions').textContent = this.totalRecords.toLocaleString();
        document.getElementById('totalSales').textContent = `₱${this.formatCurrency(totalAmount)}`;
        document.getElementById('todaysSales').textContent = `₱${this.formatCurrency(todaysSales)}`;
        document.getElementById('avgTransaction').textContent = `₱${this.formatCurrency(avgTransaction)}`;
    }
    updateTransactionCount() {
        const count = this.transactions.length;
        const text = count === 1 ? '1 transaction' : `${count} transactions`;
        document.getElementById('transactionCount').textContent = text;
    }
    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('transactionTable').style.display = 'none';
        document.getElementById('transactionCards').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
    }
    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }
    showEmptyState() {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('transactionTable').style.display = 'none';
        document.getElementById('transactionCards').style.display = 'none';
        document.getElementById('paginationContainer').style.display = 'none';
    }
    hideEmptyState() {
        document.getElementById('emptyState').style.display = 'none';
    }
    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorAlert.style.display = 'block';
        errorAlert.classList.add('show');
        setTimeout(() => {
            errorAlert.classList.remove('show');
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, 150);
        }, 5000);
    }
    showSuccess(message) {
        const successAlert = document.getElementById('successAlert');
        const successMessage = document.getElementById('successMessage');
        successMessage.textContent = message;
        successAlert.style.display = 'block';
        successAlert.classList.add('show');
        setTimeout(() => {
            successAlert.classList.remove('show');
            setTimeout(() => {
                successAlert.style.display = 'none';
            }, 150);
        }, 3000);
    }
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    formatDateTime(dateString) {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    formatCurrency(amount) {
        return parseFloat(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    getPaymentIcon(paymentMethod) {
        const icons = {
            'Cash': 'cash-stack',
            'Credit Card': 'credit-card',
            'Debit Card': 'credit-card',
            'Digital Wallet': 'phone',
            'Bank Transfer': 'bank',
            'Cooperative Credit': 'building'
        };
        return icons[paymentMethod] || 'cash-coin';
    }

    getStatusColor(status) {
        const colors = {
            'Completed': 'success',
            'Pending': 'warning',
            'Cancelled': 'danger',
            'Refunded': 'info'
        };
        return colors[status] || 'secondary';
    }

    // Highland Fresh specific helper methods
    getCustomerTypeBadgeClass(customerType) {
        const classes = {
            'Walk-in': 'bg-secondary',
            'Regular': 'bg-primary',
            'Wholesale': 'bg-info',
            'Cooperative Member': 'bg-warning text-dark',
            'NMFDC Member': 'bg-success'
        };
        return classes[customerType] || 'bg-secondary';
    }

    getTransactionTypeBadgeClass(transactionType) {
        const classes = {
            'Retail Sale': 'bg-primary',
            'Wholesale': 'bg-info',
            'Cooperative Order': 'bg-warning text-dark',
            'Milk Collection Payment': 'bg-success',
            'Product Distribution': 'bg-dark'
        };
        return classes[transactionType] || 'bg-primary';
    }

    formatBatchCodes(batchCodes) {
        if (!batchCodes) return '';
        try {
            const codes = JSON.parse(batchCodes);
            if (Array.isArray(codes)) {
                return codes.slice(0, 2).join(', ') + (codes.length > 2 ? '...' : '');
            }
            return batchCodes.substring(0, 20);
        } catch (e) {
            return batchCodes.substring(0, 20);
        }
    }

    formatCooperativeCodes(cooperativeCodes) {
        if (!cooperativeCodes) return '';
        return cooperativeCodes.split(',').slice(0, 2).join(', ');
    }

    updateStatistics(stats) {
        if (!stats) return;

        document.getElementById('totalTransactions').textContent = stats.total_transactions || '-';
        document.getElementById('totalSales').textContent = `₱${stats.total_sales || '0.00'}`;
        document.getElementById('todaysSales').textContent = `₱${stats.today_sales || '0.00'}`;
        document.getElementById('avgTransaction').textContent = `₱${stats.avg_transaction || '0.00'}`;
    }

    clearFilters() {
        // Reset all filter values
        this.currentFilters = {
            search: '',
            dateFrom: '',
            dateTo: '',
            paymentMethod: ''
        };

        // Reset UI elements
        document.getElementById('searchInput').value = '';
        document.getElementById('dateRange').value = '';
        document.getElementById('paymentMethodFilter').value = '';

        // Reload transactions
        this.currentPage = 1;
        this.loadTransactions();
    }

    exportTransactions() {
        // Highland Fresh Transaction Export
        if (this.transactions.length === 0) {
            alert('No transactions to export');
            return;
        }

        try {
            const csvData = this.generateCSVData();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);

            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute('download', `highland_fresh_transactions_${dateStr}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showSuccess('Highland Fresh transactions exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export transactions');
        }
    }

    generateCSVData() {
        const headers = [
            'Sale Number', 'Date', 'Customer Name', 'Total Amount', 'Payment Method', 'Items', 'Processed By'
        ];

        const rows = this.transactions.map(t => [
            t.sale_number || '',
            t.sale_date || '',
            t.customer_name || 'Walk-in',
            t.total_amount || '0.00',
            t.payment_method || '',
            t.item_count || '0',
            t.cashier_name || ''
        ]);

        return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    }
}
window.TransactionHistory = TransactionHistory;