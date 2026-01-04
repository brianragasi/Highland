// Sales Officer Dashboard JavaScript
// Handles dashboard data loading, stats, and recent orders display

class SalesDashboard {
    constructor() {
        this.salesAPI = APIResponseHandler.getApiUrl('SalesAPI.php');
        this.paymentsAPI = APIResponseHandler.getApiUrl('PaymentsAPI.php');
        this.paymentMethods = [];
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

        // Display user name
        this.displayUserInfo(user);

        // Load dashboard data
        this.loadDashboardData();
        
        // Load payment methods for the payment modal
        this.loadPaymentMethods();
    }

    displayUserInfo(user) {
        const userWelcome = document.getElementById('userWelcome');
        if (userWelcome && user.full_name) {
            userWelcome.innerHTML = `
                <i class="bi bi-person-circle me-1"></i>Welcome, ${user.full_name}
            `;
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadPendingOrdersCount(),
            this.loadTodayStats(),
            this.loadUnpaidOrdersCount(),
            this.loadPendingOrders(),
            this.loadUnpaidOrders()
        ]);
    }

    async loadPendingOrdersCount() {
        try {
            const response = await axios.get(this.salesAPI, {
                params: { operation: 'getPendingOrdersCount' },
                withCredentials: true
            });

            console.log('Pending Orders Count Response:', response.data);

            if (response.data.success) {
                const count = response.data.data?.count || response.data.count || 0;
                document.getElementById('pendingOrdersCount').textContent = count;
            }
        } catch (error) {
            console.error('Error loading pending orders count:', error);
            console.error('Error details:', error.response?.data);
            document.getElementById('pendingOrdersCount').textContent = '-';
        }
    }

    async loadTodayStats() {
        try {
            const response = await axios.get(this.salesAPI, {
                params: { operation: 'getTodayStats' },
                withCredentials: true
            });

            console.log('Today Stats Response:', response.data);

            if (response.data.success) {
                const stats = response.data.data || response.data;
                
                const orderCount = stats.order_count || stats.orders_count || 0;
                document.getElementById('todayOrdersCount').textContent = orderCount;
                
                const revenue = parseFloat(stats.total_revenue || stats.revenue || 0);
                document.getElementById('todayRevenue').textContent = '₱' + revenue.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        } catch (error) {
            console.error('Error loading today stats:', error);
            console.error('Error details:', error.response?.data);
            document.getElementById('todayOrdersCount').textContent = '-';
            document.getElementById('todayRevenue').textContent = '₱0.00';
        }
    }

    async loadUnpaidOrdersCount() {
        try {
            const response = await axios.get(this.paymentsAPI, {
                params: { operation: 'getUnpaidOrders' },
                withCredentials: true
            });

            console.log('Unpaid Orders Count Response:', response.data);

            if (response.data.success) {
                const data = response.data.data || response.data;
                const count = data.total_count || data.count || (data.orders ? data.orders.length : 0);
                document.getElementById('unpaidOrdersCount').textContent = count;
            }
        } catch (error) {
            console.error('Error loading unpaid orders count:', error);
            console.error('Error details:', error.response?.data);
            document.getElementById('unpaidOrdersCount').textContent = '-';
        }
    }

    async loadPaymentMethods() {
        try {
            const response = await axios.get(this.paymentsAPI, {
                params: { operation: 'getPaymentMethods' },
                withCredentials: true
            });

            console.log('Payment Methods API Response:', response.data);

            if (response.data.success) {
                // Access payment_methods from response.data.data.payment_methods (BaseAPI wraps in data)
                this.paymentMethods = response.data.data?.payment_methods || response.data.payment_methods || [];
                console.log('Payment methods loaded:', this.paymentMethods.length);
                this.populatePaymentMethodsDropdown();
            }
        } catch (error) {
            console.error('Error loading payment methods:', error);
            console.error('Error details:', error.response?.data);
            // Set default payment methods if API fails
            this.paymentMethods = [
                { payment_method_id: 1, method_name: 'Cash' },
                { payment_method_id: 2, method_name: 'Check' },
                { payment_method_id: 3, method_name: 'Bank Transfer' }
            ];
            this.populatePaymentMethodsDropdown();
        }
    }

    populatePaymentMethodsDropdown() {
        const select = document.getElementById('paymentMethodId');
        if (!select) return;

        select.innerHTML = '<option value="">Select payment method...</option>' +
            this.paymentMethods.map(method => 
                `<option value="${method.payment_method_id}">${this.escapeHtml(method.method_name)}</option>`
            ).join('');
    }

    async loadPendingOrders() {
        try {
            const response = await axios.get(this.salesAPI, {
                params: { 
                    operation: 'getPendingOrders',
                    limit: 10
                },
                withCredentials: true
            });

            if (response.data.success) {
                this.renderPendingOrders(response.data.data || []);
            }
        } catch (error) {
            console.error('Error loading pending orders:', error);
        }
    }

    async loadUnpaidOrders() {
        try {
            const response = await axios.get(this.paymentsAPI, {
                params: { operation: 'getUnpaidOrders' },
                withCredentials: true
            });

            console.log('Unpaid Orders API Response:', response.data);

            if (response.data.success) {
                // Access orders from response.data.data.orders (BaseAPI wraps in data)
                const orders = response.data.data?.orders || response.data.orders || [];
                console.log('Unpaid orders count:', orders.length);
                this.renderUnpaidOrders(orders);
            }
        } catch (error) {
            console.error('Error loading unpaid orders:', error);
            console.error('Error details:', error.response?.data);
            const container = document.getElementById('unpaidOrdersContainer');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error loading unpaid orders: ${error.response?.data?.message || error.message}
                    </div>
                `;
            }
        }
    }

    renderUnpaidOrders(orders) {
        const container = document.getElementById('unpaidOrdersContainer');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-check-circle-fill" style="font-size: 3rem; color: var(--hf-success);"></i>
                    <p class="mt-2">All orders have been paid! 🎉</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Customer</th>
                            <th>Invoice #</th>
                            <th>Dispatch Date</th>
                            <th>Total Amount</th>
                            <th>Paid</th>
                            <th>Balance Due</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => {
                            const isOverdue = order.days_overdue > 0;
                            const statusBadge = order.payment_status === 'partially_paid' 
                                ? '<span class="badge bg-warning">Partial</span>' 
                                : isOverdue 
                                    ? `<span class="badge bg-danger">Overdue ${order.days_overdue}d</span>`
                                    : '<span class="badge bg-secondary">Unpaid</span>';
                            
                            return `
                                <tr class="${isOverdue ? 'table-danger' : ''}">
                                    <td><strong>${this.escapeHtml(order.sale_number)}</strong></td>
                                    <td>${this.escapeHtml(order.business_name)}</td>
                                    <td><small>${this.escapeHtml(order.invoice_number || '-')}</small></td>
                                    <td><small>${this.formatDate(order.dispatch_date)}</small></td>
                                    <td><strong>₱${parseFloat(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                                    <td>₱${parseFloat(order.payment_received).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                    <td><strong class="text-danger">₱${parseFloat(order.balance_due).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                                    <td><small>${this.formatDateOnly(order.payment_due_date)}</small></td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <button class="btn btn-success btn-sm" onclick="salesDashboard.openPaymentModal(${order.sale_id})">
                                            <i class="bi bi-cash-coin"></i> Collect
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-3 p-3 bg-light rounded">
                <div class="row">
                    <div class="col-md-6">
                        <strong>Total Outstanding:</strong> 
                        <span class="text-danger fs-5">₱${parseFloat(orders.reduce((sum, o) => sum + parseFloat(o.balance_due), 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="col-md-6 text-end">
                        <strong>Total Orders:</strong> ${orders.length}
                    </div>
                </div>
            </div>
        `;
    }

    async openPaymentModal(saleId) {
        try {
            // Get order details
            const response = await axios.get(this.paymentsAPI, {
                params: { operation: 'getUnpaidOrders' },
                withCredentials: true
            });

            if (response.data.success) {
                // Access orders from response.data.data.orders (BaseAPI wraps in data)
                const orders = response.data.data?.orders || response.data.orders || [];
                const order = orders.find(o => o.sale_id == saleId);
                
                if (!order) {
                    alert('Order not found or already paid');
                    return;
                }

                // Populate modal
                document.getElementById('paymentSaleId').value = order.sale_id;
                document.getElementById('paymentOrderNumber').textContent = order.sale_number;
                document.getElementById('paymentCustomerName').textContent = order.business_name;
                document.getElementById('paymentTotalAmount').textContent = parseFloat(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
                document.getElementById('paymentAlreadyPaid').textContent = parseFloat(order.payment_received || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
                document.getElementById('paymentBalanceDue').textContent = parseFloat(order.balance_due).toLocaleString('en-PH', { minimumFractionDigits: 2 });
                
                // Set default amount to balance due
                document.getElementById('paymentAmount').value = parseFloat(order.balance_due).toFixed(2);
                document.getElementById('paymentAmount').max = parseFloat(order.balance_due).toFixed(2);
                
                // Reset other fields
                document.getElementById('paymentMethodId').value = '';
                document.getElementById('paymentReference').value = '';
                document.getElementById('paymentNotes').value = '';

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('recordPaymentModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error opening payment modal:', error);
            alert('Error loading order details: ' + (error.response?.data?.message || error.message));
        }
    }

    renderPendingOrders(orders) {
        const container = document.getElementById('pendingOrdersContainer');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-check-circle" style="font-size: 3rem;"></i>
                    <p class="mt-2">No pending orders to review</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1"><strong>Order #${this.escapeHtml(order.order_number)}</strong></h6>
                            <p class="text-muted mb-1">
                                <i class="bi bi-person"></i> ${this.escapeHtml(order.customer_name)}
                            </p>
                            <p class="text-muted mb-1">
                                <i class="bi bi-calendar"></i> ${this.formatDate(order.order_date)}
                            </p>
                            <p class="mb-0">
                                <strong class="text-success">₱${parseFloat(order.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                            </p>
                        </div>
                        <div class="text-end">
                            <button class="btn btn-success btn-sm mb-2" onclick="salesDashboard.approveOrder(${order.sale_id}, '${this.escapeHtml(order.order_number)}')">
                                <i class="bi bi-check-circle"></i> Approve
                            </button>
                            <button class="btn btn-danger btn-sm d-block" onclick="salesDashboard.rejectOrder(${order.sale_id}, '${this.escapeHtml(order.order_number)}')">
                                <i class="bi bi-x-circle"></i> Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async approveOrder(orderId, orderNumber) {
        if (!confirm(`Approve order ${orderNumber}?`)) return;

        try {
            const response = await axios.post(this.salesAPI, {
                operation: 'approveOrder',
                order_id: orderId
            }, { withCredentials: true });

            if (response.data.success) {
                this.showNotification('Order approved successfully!', 'success');
                this.loadDashboardData(); // Reload data
            } else {
                this.showNotification(response.data.message || 'Failed to approve order', 'error');
            }
        } catch (error) {
            console.error('Error approving order:', error);
            this.showNotification(error.response?.data?.message || 'Error approving order', 'error');
        }
    }

    async rejectOrder(orderId, orderNumber) {
        const reason = prompt(`Reject order ${orderNumber}?\n\nPlease enter rejection reason:`);
        if (!reason) return;

        try {
            const response = await axios.post(this.salesAPI, {
                operation: 'rejectOrder',
                order_id: orderId,
                reason: reason
            }, { withCredentials: true });

            if (response.data.success) {
                this.showNotification('Order rejected', 'warning');
                this.loadDashboardData(); // Reload data
            } else {
                this.showNotification(response.data.message || 'Failed to reject order', 'error');
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            this.showNotification(error.response?.data?.message || 'Error rejecting order', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertDiv = document.createElement('div');
        
        const bgClass = type === 'success' ? 'bg-success' : 
                       type === 'error' || type === 'danger' ? 'bg-danger' : 
                       type === 'warning' ? 'bg-warning' : 'bg-info';
        
        alertDiv.className = `toast align-items-center text-white ${bgClass} border-0`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        alertContainer.appendChild(alertDiv);
        const toast = new bootstrap.Toast(alertDiv);
        toast.show();
        
        setTimeout(() => alertDiv.remove(), 5000);
    }

    async loadQuickStats() {
        // Removed - stats are loaded by separate functions
    }

    async loadRecentOrders() {
        // Removed - replaced by loadPendingOrders
    }

    renderRecentOrders(orders) {
        // Removed - replaced by renderPendingOrders
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-PH', options);
    }

    formatDateOnly(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('en-PH', options);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global function to submit payment
async function submitPayment() {
    const saleId = document.getElementById('paymentSaleId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentMethodId = document.getElementById('paymentMethodId').value;
    const referenceNumber = document.getElementById('paymentReference').value;
    const notes = document.getElementById('paymentNotes').value;

    if (!amount || amount <= 0) {
        alert('Please enter a valid payment amount');
        return;
    }

    if (!paymentMethodId) {
        alert('Please select a payment method');
        return;
    }

    try {
        const response = await axios.post(window.salesDashboard.paymentsAPI, {
            operation: 'recordPayment',
            sale_id: parseInt(saleId),
            amount_paid: amount,
            payment_method_id: parseInt(paymentMethodId),
            reference_number: referenceNumber || null,
            notes: notes || null
        }, { withCredentials: true });

        if (response.data.success) {
            window.salesDashboard.showNotification(
                `Payment of ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} recorded successfully!`,
                'success'
            );
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('recordPaymentModal'));
            modal.hide();
            
            // Reload dashboard
            window.salesDashboard.loadDashboardData();
        } else {
            alert(response.data.message || 'Failed to record payment');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        alert(error.response?.data?.message || 'Error recording payment');
    }
}

// Global function to refresh unpaid orders
function refreshUnpaidOrders() {
    if (window.salesDashboard) {
        window.salesDashboard.loadUnpaidOrders();
        window.salesDashboard.loadUnpaidOrdersCount();
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.salesDashboard = new SalesDashboard();
});

// Make loadDashboardData available globally for retry button
window.loadDashboardData = function() {
    if (window.salesDashboard) {
        window.salesDashboard.loadDashboardData();
    }
};

// Paid Orders History Functions
let paidOrdersVisible = false;

window.togglePaidOrders = function() {
    const section = document.getElementById('paidOrdersSection');
    const icon = document.getElementById('paidOrdersToggleIcon');
    const text = document.getElementById('paidOrdersToggleText');
    
    paidOrdersVisible = !paidOrdersVisible;
    
    if (paidOrdersVisible) {
        section.style.display = 'block';
        icon.className = 'bi bi-chevron-up me-1';
        text.textContent = 'Hide';
        loadPaidOrders(); // Load data when shown
    } else {
        section.style.display = 'none';
        icon.className = 'bi bi-chevron-down me-1';
        text.textContent = 'Show';
    }
};

window.loadPaidOrders = async function() {
    const container = document.getElementById('paidOrdersContainer');
    const paymentsAPI = APIResponseHandler.getApiUrl('PaymentsAPI.php');
    
    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading paid orders...</p>
        </div>
    `;
    
    try {
        // Get filter values
        const dateFrom = document.getElementById('paidOrdersDateFrom').value;
        const dateTo = document.getElementById('paidOrdersDateTo').value;
        const limit = document.getElementById('paidOrdersLimit').value;
        
        const params = {
            operation: 'getPaidOrders',
            limit: limit
        };
        
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        
        const response = await axios.get(paymentsAPI, {
            params: params,
            withCredentials: true
        });
        
        console.log('Paid orders response:', response.data);
        
        // Handle BaseAPI wrapping
        const orders = response.data.data?.orders || response.data.orders || [];
        const totalCount = response.data.data?.total_count || response.data.total_count || 0;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="bi bi-info-circle me-2"></i>
                    No paid orders found for the selected filters.
                </div>
            `;
            return;
        }
        
        // Render paid orders table
        let html = `
            <div class="alert alert-success mb-3">
                <i class="bi bi-check-circle-fill me-2"></i>
                <strong>${totalCount}</strong> paid order(s) found
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Order #</th>
                            <th>Customer</th>
                            <th>Order Date</th>
                            <th>Amount</th>
                            <th>Last Payment</th>
                            <th>Payments</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        orders.forEach(order => {
            const saleDate = new Date(order.sale_date).toLocaleDateString('en-PH');
            const lastPaymentDate = order.last_payment_date 
                ? new Date(order.last_payment_date).toLocaleDateString('en-PH')
                : '-';
            const amount = parseFloat(order.total_amount).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            html += `
                <tr>
                    <td>
                        <strong class="text-success">${order.sale_number}</strong>
                        <br>
                        <small class="text-muted">
                            <i class="bi bi-building"></i> ${order.business_name || 'N/A'}
                        </small>
                    </td>
                    <td>
                        <div>${order.contact_person || 'N/A'}</div>
                        ${order.phone ? `<small class="text-muted"><i class="bi bi-telephone"></i> ${order.phone}</small>` : ''}
                    </td>
                    <td>
                        <small>${saleDate}</small>
                    </td>
                    <td>
                        <strong class="text-success">₱${amount}</strong>
                        <br>
                        <span class="badge bg-success">
                            <i class="bi bi-check-circle"></i> Fully Paid
                        </span>
                    </td>
                    <td>
                        <small class="text-muted">${lastPaymentDate}</small>
                    </td>
                    <td>
                        <span class="badge bg-info">
                            ${order.payment_count} payment(s)
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewPaymentDetails(${order.sale_id})">
                            <i class="bi bi-receipt"></i> View Details
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading paid orders:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Error loading paid orders: ${error.response?.data?.message || error.message}
                <br>
                <button class="btn btn-sm btn-danger mt-2" onclick="loadPaidOrders()">
                    <i class="bi bi-arrow-clockwise me-1"></i>Retry
                </button>
            </div>
        `;
    }
};

window.viewPaymentDetails = async function(saleId) {
    const paymentsAPI = APIResponseHandler.getApiUrl('PaymentsAPI.php');
    
    try {
        // Fetch the paid orders to get the specific order
        const response = await axios.get(paymentsAPI, {
            params: {
                operation: 'getPaidOrders',
                limit: 1000 // Get all to find the specific order
            },
            withCredentials: true
        });
        
        const orders = response.data.data?.orders || response.data.orders || [];
        const order = orders.find(o => o.sale_id == saleId);
        
        if (!order) {
            alert('Order details not found');
            return;
        }
        
        // Build modal content
        let content = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6 class="text-muted">Order Information</h6>
                    <table class="table table-sm">
                        <tr>
                            <td><strong>Order Number:</strong></td>
                            <td>${order.sale_number}</td>
                        </tr>
                        <tr>
                            <td><strong>Customer:</strong></td>
                            <td>${order.business_name || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td><strong>Contact Person:</strong></td>
                            <td>${order.contact_person || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td><strong>Order Date:</strong></td>
                            <td>${new Date(order.sale_date).toLocaleDateString('en-PH')}</td>
                        </tr>
                        ${order.dispatch_date ? `
                        <tr>
                            <td><strong>Dispatch Date:</strong></td>
                            <td>${new Date(order.dispatch_date).toLocaleDateString('en-PH')}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted">Payment Summary</h6>
                    <table class="table table-sm">
                        <tr>
                            <td><strong>Total Amount:</strong></td>
                            <td class="text-end">₱${parseFloat(order.total_amount).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr>
                            <td><strong>Amount Paid:</strong></td>
                            <td class="text-end">₱${parseFloat(order.payment_received).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr class="table-success">
                            <td><strong>Status:</strong></td>
                            <td class="text-end">
                                <span class="badge bg-success">
                                    <i class="bi bi-check-circle"></i> Fully Paid
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <h6 class="text-muted mb-3">Payment History (${order.payment_count} transaction(s))</h6>
            <div class="table-responsive">
                <table class="table table-bordered table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Recorded By</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (order.payments && order.payments.length > 0) {
            order.payments.forEach((payment, index) => {
                const paymentDate = new Date(payment.payment_date).toLocaleString('en-PH');
                const amount = parseFloat(payment.amount_paid).toLocaleString('en-PH', {minimumFractionDigits: 2});
                
                content += `
                    <tr>
                        <td><small>${paymentDate}</small></td>
                        <td><strong class="text-success">₱${amount}</strong></td>
                        <td>${payment.method_name || 'N/A'}</td>
                        <td>${payment.reference_number || '-'}</td>
                        <td><small>${payment.recorded_by || 'N/A'}</small></td>
                        <td><small>${payment.notes || '-'}</small></td>
                    </tr>
                `;
            });
        } else {
            content += `
                <tr>
                    <td colspan="6" class="text-center text-muted">No payment records found</td>
                </tr>
            `;
        }
        
        content += `
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('paymentDetailsContent').innerHTML = content;
        
        const modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading payment details:', error);
        alert('Failed to load payment details: ' + (error.response?.data?.message || error.message));
    }
};

