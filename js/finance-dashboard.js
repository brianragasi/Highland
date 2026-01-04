/**
 * Finance Dashboard JavaScript
 * User 5 FIFO Implementation: Finance Officer
 * Handles spoilage tracking, farmer payouts, and FIFO compliance reporting
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================
let dashboardData = {};
let expiredBatches = [];
let spoilageLog = [];
let payouts = [];
let suppliers = [];
let currentTab = 'overview';

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('[Finance Dashboard] Initializing...');

    // Check authentication
    checkAuth();

    // Load initial data
    loadDashboard();

    // Load suppliers for dropdowns
    loadSuppliers();

    // Set default dates for payout generation
    setDefaultPayoutDates();
    
    // Load pending approvals count for badge
    loadPendingCostApprovals();

    console.log('[Finance Dashboard] Initialization complete');
});

function checkAuth() {
    const userData = sessionStorage.getItem('user');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userData);
    document.getElementById('userNameDisplay').textContent = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;
}

function setDefaultPayoutDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    document.getElementById('payoutPeriodStart').value = formatDateForInput(firstDay);
    document.getElementById('payoutPeriodEnd').value = formatDateForInput(today);
}

// =============================================================================
// TAB NAVIGATION
// =============================================================================
function showTab(tabName, eventTarget = null) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Show selected tab
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
        tabElement.style.display = 'block';
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Set active on clicked element or find matching nav link
    if (eventTarget) {
        eventTarget.classList.add('active');
    } else if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Find nav link by tab name
        const navLink = document.querySelector(`a.nav-link[onclick*="'${tabName}'"]`);
        if (navLink) navLink.classList.add('active');
    }

    currentTab = tabName;

    // Load tab-specific data
    switch (tabName) {
        case 'spoilage':
            loadExpiredBatches();
            loadSpoilageLog();
            break;
        case 'payouts':
            loadPayouts();
            loadSuppliersNeedingPayout();
            break;
        case 'fifo':
            loadFifoReport();
            break;
        case 'requisitions':
            loadPendingRequisitions();
            break;
        case 'receivables':
            loadReceivables();
            break;
        case 'alerts':
            loadNotifications();
            break;
        case 'approvals':
            loadPendingCostApprovals();
            break;
        case 'recipes':
            loadRecipes();
            loadMaterialPrices();
            break;
        default:
            loadDashboard();
    }
}

// =============================================================================
// DASHBOARD DATA LOADING
// =============================================================================
async function loadDashboard() {
    try {
        showLoading(true);

        // Load spoilage dashboard data
        const spoilageResponse = await axios.get('../api/SpoilageReportAPI.php', {
            params: { action: 'getDashboard' }
        });

        if (spoilageResponse.data.success) {
            dashboardData.spoilage = spoilageResponse.data.data;
            renderSpoilageStats();
        }

        // Load payout dashboard data
        const payoutResponse = await axios.get('../api/FarmerPayoutAPI.php', {
            params: { action: 'getPayoutDashboard' }
        });

        if (payoutResponse.data.success) {
            dashboardData.payouts = payoutResponse.data.data;
            renderPayoutStats();
        }

        // Load at-risk inventory
        await loadAtRiskInventory();

        // Load recent payouts for overview
        if (dashboardData.payouts?.recent_payouts) {
            renderRecentPayouts(dashboardData.payouts.recent_payouts);
        }

        // Load pending requisitions count for badge (GAP-F1)
        await loadPendingRequisitionBadge();

        // Load cost alerts notification count for badge
        await loadNotificationBadge();

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
        showLoading(false);
    }
}

function renderSpoilageStats() {
    const data = dashboardData.spoilage;

    // Update expired batch count and alert
    const expiredCount = data.expired_batches?.count || 0;
    const expiredValue = data.expired_batches?.total_value || 0;

    document.getElementById('expiredBatchCount').textContent = expiredCount;
    document.getElementById('spoilageBadge').textContent = expiredCount;

    // Update total spoilage loss
    const ytdLoss = data.spoilage_ytd?.total_loss || expiredValue;
    document.getElementById('totalSpoilageLoss').textContent = formatCurrency(ytdLoss);

    // Show/hide expired alert panel
    if (expiredCount > 0) {
        document.getElementById('expiredAlertPanel').style.display = 'block';
        document.getElementById('expiredAlertCount').textContent = expiredCount;
        document.getElementById('expiredAlertValue').textContent = formatCurrency(expiredValue);
    } else {
        document.getElementById('expiredAlertPanel').style.display = 'none';
    }

    // Update FIFO compliance rate
    const fifoCompliance = data.fifo_compliance?.compliance_rate || 100;
    document.getElementById('fifoComplianceRate').textContent = fifoCompliance + '%';
}

function renderPayoutStats() {
    const data = dashboardData.payouts;
    const stats = data.stats || {};

    document.getElementById('pendingPayouts').textContent = formatCurrency(
        parseFloat(stats.pending_amount || 0) + parseFloat(stats.approved_amount || 0)
    );
}

async function loadAtRiskInventory() {
    try {
        const response = await axios.get('../api/SpoilageReportAPI.php', {
            params: { action: 'getInventoryAtRisk', days: 3 }
        });

        if (response.data.success) {
            renderAtRiskTable(response.data.data.batches || []);
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading at-risk inventory:', error);
    }
}

function renderAtRiskTable(batches) {
    const tbody = document.getElementById('atRiskTableBody');

    if (!batches || batches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-check-circle fs-1 text-success"></i>
                    <p class="mt-2">No inventory at risk</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = batches.map(batch => {
        const riskClass = batch.risk_level === 'CRITICAL' ? 'table-danger' :
            batch.risk_level === 'WARNING' ? 'table-warning' : '';
        return `
            <tr class="${riskClass}">
                <td>${batch.product_name}</td>
                <td><code>${batch.batch_number}</code></td>
                <td>
                    ${formatDate(batch.expiry_date)}
                    <br><small class="text-muted">${batch.days_until_expiry} day(s)</small>
                </td>
                <td class="text-end">${formatNumber(batch.quantity_remaining)}</td>
                <td class="text-end">${formatCurrency(batch.value_at_risk)}</td>
            </tr>
        `;
    }).join('');
}

function renderRecentPayouts(payouts) {
    const tbody = document.getElementById('recentPayoutsTableBody');

    if (!payouts || payouts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">No recent payouts</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = payouts.slice(0, 5).map(payout => {
        const statusClass = payout.status === 'Paid' ? 'success' :
            payout.status === 'Approved' ? 'primary' : 'secondary';
        return `
            <tr>
                <td><code>${payout.payout_reference}</code></td>
                <td>${payout.supplier_name}</td>
                <td><small>${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}</small></td>
                <td class="text-end">${formatCurrency(payout.net_amount_payable)}</td>
                <td><span class="badge bg-${statusClass}">${payout.status}</span></td>
            </tr>
        `;
    }).join('');
}

// =============================================================================
// SPOILAGE MANAGEMENT
// =============================================================================
async function loadExpiredBatches() {
    try {
        const response = await axios.get('../api/SpoilageReportAPI.php', {
            params: { action: 'getExpiredBatches' }
        });

        if (response.data.success) {
            expiredBatches = response.data.data.batches || [];
            renderExpiredBatchesTable();

            // Update summary totals
            const summary = response.data.data.summary || {};
            document.getElementById('totalExpiredQty').textContent = formatNumber(summary.total_quantity || 0);
            document.getElementById('totalExpiredValue').textContent = formatCurrency(summary.total_value || 0);
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading expired batches:', error);
        showToast('Error loading expired batches', 'error');
    }
}

function renderExpiredBatchesTable() {
    const tbody = document.getElementById('expiredBatchesTableBody');

    if (expiredBatches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-check-circle fs-1 text-success"></i>
                    <p class="mt-2">No expired batches found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = expiredBatches.map(batch => `
        <tr class="table-expired">
            <td><code>${batch.batch_number}</code></td>
            <td>${batch.product_name}</td>
            <td>${formatDate(batch.production_date)}</td>
            <td>${formatDate(batch.expiry_date)}</td>
            <td><span class="badge bg-danger">${batch.days_expired} days</span></td>
            <td class="text-end">${formatNumber(batch.quantity_remaining)}</td>
            <td class="text-end text-danger fw-bold">${formatCurrency(batch.loss_value || 0)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-danger" onclick="openSpoilageModal(${JSON.stringify(batch).replace(/"/g, '&quot;')})" title="Record Spoilage">
                        <i class="bi bi-trash"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="disposeBatch(${batch.batch_id})" title="Dispose & Write Off">
                        <i class="bi bi-x-octagon"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadSpoilageLog() {
    try {
        const status = document.getElementById('spoilageStatusFilter')?.value || '';
        const type = document.getElementById('spoilageTypeFilter')?.value || '';

        const response = await axios.get('../api/SpoilageReportAPI.php', {
            params: {
                action: 'getSpoilageLog',
                status: status,
                type: type
            }
        });

        if (response.data.success) {
            spoilageLog = response.data.data.entries || [];
            renderSpoilageLogTable();
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading spoilage log:', error);
    }
}

function renderSpoilageLogTable() {
    const tbody = document.getElementById('spoilageLogTableBody');

    if (spoilageLog.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    No spoilage records found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = spoilageLog.map(entry => {
        const statusClass = entry.status === 'APPROVED' ? 'success' :
            entry.status === 'WRITTEN_OFF' ? 'secondary' : 'warning';
        return `
            <tr>
                <td><code>${entry.spoilage_reference}</code></td>
                <td>${formatDate(entry.spoilage_date)}</td>
                <td>${entry.item_name}</td>
                <td><span class="badge bg-secondary">${entry.spoilage_type}</span></td>
                <td class="text-end">${formatNumber(entry.quantity_spoiled)}</td>
                <td class="text-end text-danger">${formatCurrency(entry.total_loss || (entry.quantity_spoiled * entry.unit_cost))}</td>
                <td>
                    ${entry.fifo_bypassed ? '<span class="badge bg-danger">Yes</span>' : '<span class="badge bg-success">No</span>'}
                </td>
                <td><span class="badge bg-${statusClass}">${entry.status}</span></td>
                <td>
                    ${entry.status === 'PENDING' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="approveSpoilage(${entry.spoilage_id})" title="Approve">
                            <i class="bi bi-check-lg"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

async function scanExpiredBatches() {
    try {
        showLoading(true);

        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'scanExpiredBatches'
        });

        if (response.data.success) {
            const data = response.data.data;
            showToast(`Scan complete. Found ${data.scanned} expired batches, recorded ${data.recorded} new spoilage incidents.`, 'success');
            loadExpiredBatches();
            loadSpoilageLog();
        } else {
            showToast(response.data.message || 'Error scanning batches', 'error');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error scanning expired batches:', error);
        showToast('Error scanning expired batches', 'error');
        showLoading(false);
    }
}

function openRecordSpoilageModal() {
    // Clear form
    document.getElementById('spoilageBatchId').value = '';
    document.getElementById('spoilageBatchNumber').value = '';
    document.getElementById('spoilageProductName').value = '';
    document.getElementById('spoilageQuantity').value = '';
    document.getElementById('spoilageAvailableQty').textContent = '0';
    document.getElementById('spoilageReason').value = '';

    const modal = new bootstrap.Modal(document.getElementById('recordSpoilageModal'));
    modal.show();
}

function openSpoilageModal(batch) {
    document.getElementById('spoilageBatchId').value = batch.batch_id;
    document.getElementById('spoilageBatchNumber').value = batch.batch_number;
    document.getElementById('spoilageProductName').value = batch.product_name;
    document.getElementById('spoilageQuantity').value = batch.quantity_remaining;
    document.getElementById('spoilageAvailableQty').textContent = formatNumber(batch.quantity_remaining);
    document.getElementById('spoilageType').value = 'EXPIRED';
    document.getElementById('spoilageReason').value = `Expired ${batch.days_expired} days ago`;

    const modal = new bootstrap.Modal(document.getElementById('recordSpoilageModal'));
    modal.show();
}

async function submitSpoilage() {
    const batchId = document.getElementById('spoilageBatchId').value;
    const quantity = document.getElementById('spoilageQuantity').value;
    const type = document.getElementById('spoilageType').value;
    const reason = document.getElementById('spoilageReason').value;

    if (!batchId) {
        showToast('Please select a batch', 'warning');
        return;
    }

    if (!quantity || quantity <= 0) {
        showToast('Please enter a valid quantity', 'warning');
        return;
    }

    try {
        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'recordSpoilage',
            batch_id: batchId,
            quantity: quantity,
            spoilage_type: type,
            reason: reason
        });

        if (response.data.success) {
            showToast('Spoilage recorded successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('recordSpoilageModal')).hide();
            loadExpiredBatches();
            loadSpoilageLog();
        } else {
            showToast(response.data.message || 'Error recording spoilage', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error recording spoilage:', error);
        showToast('Error recording spoilage', 'error');
    }
}

async function approveSpoilage(spoilageId) {
    if (!confirm('Approve this spoilage write-off?')) return;

    try {
        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'approveSpoilage',
            spoilage_id: spoilageId
        });

        if (response.data.success) {
            showToast('Spoilage approved', 'success');
            loadSpoilageLog();
        } else {
            showToast(response.data.message || 'Error approving spoilage', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error approving spoilage:', error);
        showToast('Error approving spoilage', 'error');
    }
}

async function disposeBatch(batchId) {
    if (!confirm('Dispose of this batch and write off remaining inventory? This action cannot be undone.')) return;

    try {
        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'disposeBatch',
            batch_id: batchId,
            reason: 'Disposed by Finance Officer'
        });

        if (response.data.success) {
            showToast(`Batch disposed. Loss: ${formatCurrency(response.data.data.loss_value)}`, 'success');
            loadExpiredBatches();
            loadDashboard();
        } else {
            showToast(response.data.message || 'Error disposing batch', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error disposing batch:', error);
        showToast('Error disposing batch', 'error');
    }
}

// =============================================================================
// FARMER PAYOUTS
// =============================================================================
async function loadSuppliers() {
    try {
        const response = await axios.get('../api/FarmerPayoutAPI.php', {
            params: { action: 'getDairySuppliers' }
        });

        if (response.data.success) {
            suppliers = response.data.data || [];
            populateSupplierDropdowns();
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading suppliers:', error);
    }
}

function populateSupplierDropdowns() {
    const options = suppliers.map(s =>
        `<option value="${s.supplier_id}">${s.company_name}</option>`
    ).join('');

    // Payout supplier select
    const payoutSelect = document.getElementById('payoutSupplier');
    if (payoutSelect) {
        payoutSelect.innerHTML = '<option value="">Select Supplier...</option>' + options;
    }

    // Filter dropdown
    const filterSelect = document.getElementById('payoutSupplierFilter');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Suppliers</option>' + options;
    }
}

// Load and render suppliers needing payout
async function loadSuppliersNeedingPayout() {
    try {
        const response = await axios.get('../api/FarmerPayoutAPI.php', {
            params: { action: 'getPayoutDashboard' }
        });

        if (response.data.success) {
            const suppliers = response.data.data.suppliers_needing_payout || [];
            renderSuppliersNeedingPayout(suppliers);
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading suppliers needing payout:', error);
    }
}

function renderSuppliersNeedingPayout(suppliers) {
    const tbody = document.getElementById('suppliersNeedingPayoutBody');
    if (!tbody) return;

    if (!suppliers || suppliers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-check-circle fs-1 text-success"></i>
                    <p class="mt-2">All suppliers are up to date</p>
                </td>
            </tr>
        `;
        return;
    }

    const pricePerLiter = 40; // Default price
    tbody.innerHTML = suppliers.map(s => {
        const totalLiters = parseFloat(s.total_liters) || 0;
        const estimatedAmount = totalLiters * pricePerLiter;
        return `
            <tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.contact_person || '-'}</td>
                <td class="text-end">${s.collection_count || 0}</td>
                <td class="text-end">${formatNumber(totalLiters)} L</td>
                <td class="text-end text-success fw-bold">${formatCurrency(estimatedAmount)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-highland" onclick="quickGeneratePayout(${s.supplier_id}, '${escapeHtml(s.name)}')" title="Create Payout for this supplier">
                        <i class="bi bi-plus-circle me-1"></i>Create Payout
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Quick generate payout - opens modal with supplier pre-selected
function quickGeneratePayout(supplierId, supplierName) {
    document.getElementById('generatePayoutForm').reset();
    setDefaultPayoutDates();
    document.getElementById('payoutPreviewSection').style.display = 'none';
    
    // Pre-select the supplier
    const supplierSelect = document.getElementById('payoutSupplier');
    if (supplierSelect) {
        supplierSelect.value = supplierId;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('generatePayoutModal'));
    modal.show();
    
    // Auto-preview after a short delay to allow modal to render
    setTimeout(() => {
        previewPayout();
    }, 300);
}

async function loadPayouts() {
    try {
        const status = document.getElementById('payoutStatusFilter')?.value || '';
        const supplierId = document.getElementById('payoutSupplierFilter')?.value || '';

        const response = await axios.get('../api/FarmerPayoutAPI.php', {
            params: {
                action: 'getPayouts',
                status: status,
                supplier_id: supplierId
            }
        });

        if (response.data.success) {
            payouts = response.data.data || [];
            renderPayoutsTable();
            updatePayoutSummaryCards();
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading payouts:', error);
        showToast('Error loading payouts', 'error');
    }
}

function renderPayoutsTable() {
    const tbody = document.getElementById('payoutsTableBody');

    if (payouts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">No payouts found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = payouts.map(payout => {
        const statusClass = payout.status === 'Paid' ? 'info' :
            payout.status === 'Approved' ? 'success' : 'secondary';
        return `
            <tr>
                <td><code>${payout.payout_reference}</code></td>
                <td>${payout.supplier_name}</td>
                <td>${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}</td>
                <td class="text-end">${formatNumber(payout.total_liters_accepted)} L</td>
                <td class="text-end">${formatCurrency(payout.gross_amount)}</td>
                <td class="text-end text-danger">${formatCurrency(payout.total_transport_deductions)}</td>
                <td class="text-end fw-bold">${formatCurrency(payout.net_amount_payable)}</td>
                <td><span class="badge bg-${statusClass}">${payout.status}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewPayoutDetails(${payout.payout_id})" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${payout.status === 'Draft' ? `
                            <button class="btn btn-outline-success" onclick="approvePayout(${payout.payout_id})" title="Approve for Payment">
                                <i class="bi bi-check-circle"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deletePayout(${payout.payout_id})" title="Delete Draft">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                        ${payout.status === 'Approved' ? `
                            <button class="btn btn-outline-info" onclick="openProcessPaymentModal(${payout.payout_id})" title="Process Payment">
                                <i class="bi bi-bank"></i> Pay
                            </button>
                        ` : ''}
                        ${payout.status === 'Paid' ? `
                            <button class="btn btn-outline-secondary" onclick="printPayoutVoucher(${payout.payout_id})" title="Print Voucher">
                                <i class="bi bi-printer"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updatePayoutSummaryCards() {
    let draftTotal = 0, approvedTotal = 0, paidTotal = 0;

    payouts.forEach(p => {
        const amount = parseFloat(p.net_amount_payable) || 0;
        if (p.status === 'Draft') draftTotal += amount;
        else if (p.status === 'Approved') approvedTotal += amount;
        else if (p.status === 'Paid') paidTotal += amount;
    });

    document.getElementById('payoutDraftAmount').textContent = formatCurrency(draftTotal);
    document.getElementById('payoutApprovedAmount').textContent = formatCurrency(approvedTotal);
    document.getElementById('payoutPaidAmount').textContent = formatCurrency(paidTotal);
}

function openGeneratePayoutModal() {
    document.getElementById('generatePayoutForm').reset();
    setDefaultPayoutDates();
    document.getElementById('payoutPreviewSection').style.display = 'none';
    
    // Disable create button until preview is loaded
    const createBtn = document.getElementById('createPayoutBtn');
    if (createBtn) {
        createBtn.disabled = true;
    }

    const modal = new bootstrap.Modal(document.getElementById('generatePayoutModal'));
    modal.show();
}

async function previewPayout() {
    const supplierId = document.getElementById('payoutSupplier').value;
    const periodStart = document.getElementById('payoutPeriodStart').value;
    const periodEnd = document.getElementById('payoutPeriodEnd').value;
    const pricePerLiter = parseFloat(document.getElementById('payoutPricePerLiter').value) || 40;
    const transportDeduction = parseFloat(document.getElementById('payoutTransportDeduction').value) || 0;

    if (!supplierId || !periodStart || !periodEnd) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    try {
        const response = await axios.get('../api/FarmerPayoutAPI.php', {
            params: {
                action: 'getSupplierSummary',
                supplier_id: supplierId,
                period_start: periodStart,
                period_end: periodEnd
            }
        });

        if (response.data.success) {
            const data = response.data.data;
            const summary = data.summary || {};

            const grossAmount = (summary.total_accepted || 0) * pricePerLiter;
            const netAmount = grossAmount - transportDeduction;

            document.getElementById('payoutPreviewBody').innerHTML = `
                <tr><td>Supplier:</td><td><strong>${data.supplier?.company_name || 'N/A'}</strong></td></tr>
                <tr><td>Period:</td><td>${periodStart} to ${periodEnd}</td></tr>
                <tr><td>Collections:</td><td>${summary.collection_count || 0} deliveries</td></tr>
                <tr><td>Total Delivered:</td><td>${formatNumber(summary.total_delivered || 0)} L</td></tr>
                <tr><td>Total Accepted:</td><td><strong>${formatNumber(summary.total_accepted || 0)} L</strong></td></tr>
                <tr class="text-danger"><td>Total Rejected:</td><td>${formatNumber(summary.total_rejected || 0)} L</td></tr>
                <tr><td>Acceptance Rate:</td><td>${summary.acceptance_rate || 0}%</td></tr>
                <tr><td colspan="2"><hr></td></tr>
                <tr><td>Price per Liter:</td><td>₱${pricePerLiter.toFixed(2)}</td></tr>
                <tr><td>Gross Amount:</td><td>${formatCurrency(grossAmount)}</td></tr>
                <tr class="text-danger"><td>Transport Deduction:</td><td>-${formatCurrency(transportDeduction)}</td></tr>
                <tr class="fw-bold fs-5"><td>Net Payable:</td><td class="text-success">${formatCurrency(netAmount)}</td></tr>
            `;

            document.getElementById('payoutPreviewSection').style.display = 'block';
            
            // Enable the Create button after successful preview
            const createBtn = document.getElementById('createPayoutBtn');
            if (createBtn) {
                createBtn.disabled = false;
            }
        } else {
            showToast(response.data.message || 'Error loading preview', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error previewing payout:', error);
        showToast('Error loading preview', 'error');
    }
}

async function generatePayout() {
    const supplierId = document.getElementById('payoutSupplier').value;
    const periodStart = document.getElementById('payoutPeriodStart').value;
    const periodEnd = document.getElementById('payoutPeriodEnd').value;
    const pricePerLiter = document.getElementById('payoutPricePerLiter').value;
    const transportDeduction = document.getElementById('payoutTransportDeduction').value;

    if (!supplierId || !periodStart || !periodEnd) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    try {
        const response = await axios.post('../api/FarmerPayoutAPI.php', {
            action: 'generatePayout',
            supplier_id: supplierId,
            period_start: periodStart,
            period_end: periodEnd,
            price_per_liter: pricePerLiter,
            transport_deduction: transportDeduction
        });

        if (response.data.success) {
            showToast('Payout generated successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('generatePayoutModal')).hide();
            loadPayouts();
            loadDashboard();
        } else {
            showToast(response.data.message || 'Error generating payout', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error generating payout:', error);
        // Extract the actual error message from the API response
        const errorMessage = error.response?.data?.message || 'Error generating payout';
        showToast(errorMessage, 'error');
    }
}

async function viewPayoutDetails(payoutId) {
    try {
        const response = await axios.get('../api/FarmerPayoutAPI.php', {
            params: { action: 'getPayoutDetails', payout_id: payoutId }
        });

        if (response.data.success) {
            const payout = response.data.data;

            let collectionsHtml = '';
            if (payout.collections && payout.collections.length > 0) {
                collectionsHtml = `
                    <h6 class="mt-4">Collection Details (${payout.collection_count} deliveries)</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead class="table-light">
                                <tr>
                                    <th>RMR #</th>
                                    <th>Date</th>
                                    <th class="text-end">Accepted (L)</th>
                                    <th class="text-end">Rejected (L)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payout.collections.map(c => `
                                    <tr>
                                        <td><code>${c.rmr_number || 'N/A'}</code></td>
                                        <td>${formatDate(c.collection_date)}</td>
                                        <td class="text-end">${formatNumber(c.accepted_liters || c.quantity_liters || 0)}</td>
                                        <td class="text-end text-danger">${formatNumber(c.rejected_liters || 0)}</td>
                                        <td><span class="badge bg-${c.status === 'REJECTED' ? 'danger' : 'success'}">${c.status || 'N/A'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            document.getElementById('payoutDetailsBody').innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Payout Information</h6>
                        <table class="table table-sm">
                            <tr><th>Reference:</th><td><strong>${payout.payout_reference}</strong></td></tr>
                            <tr><th>Period:</th><td>${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}</td></tr>
                            <tr><th>Status:</th><td><span class="badge bg-${payout.status === 'Paid' ? 'info' : payout.status === 'Approved' ? 'success' : 'secondary'}">${payout.status}</span></td></tr>
                            <tr><th>Generated By:</th><td>${payout.generated_by_name || 'System'}</td></tr>
                            <tr><th>Created:</th><td>${formatDateTime(payout.created_at)}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Supplier Information</h6>
                        <table class="table table-sm">
                            <tr><th>Name:</th><td><strong>${payout.supplier_name}</strong></td></tr>
                            <tr><th>Contact:</th><td>${payout.contact_name || 'N/A'}</td></tr>
                            <tr><th>Email:</th><td>${payout.email || 'N/A'}</td></tr>
                            <tr><th>Phone:</th><td>${payout.phone || 'N/A'}</td></tr>
                        </table>
                    </div>
                </div>
                <hr>
                <div class="row">
                    <div class="col-md-6">
                        <h6>Payment Summary</h6>
                        <table class="table table-sm">
                            <tr><th>Total Liters Accepted:</th><td class="text-end">${formatNumber(payout.total_liters_accepted)} L</td></tr>
                            <tr><th>Gross Amount:</th><td class="text-end">${formatCurrency(payout.gross_amount)}</td></tr>
                            <tr class="text-danger"><th>Transport Deductions:</th><td class="text-end">-${formatCurrency(payout.total_transport_deductions)}</td></tr>
                            <tr class="fw-bold fs-5"><th>Net Amount Payable:</th><td class="text-end text-success">${formatCurrency(payout.net_amount_payable)}</td></tr>
                        </table>
                    </div>
                </div>
                ${collectionsHtml}
            `;

            const modal = new bootstrap.Modal(document.getElementById('payoutDetailsModal'));
            modal.show();
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading payout details:', error);
        showToast('Error loading payout details', 'error');
    }
}

async function approvePayout(payoutId) {
    if (!confirm('Approve this payout for payment?')) return;

    try {
        const response = await axios.post('../api/FarmerPayoutAPI.php', {
            action: 'approvePayout',
            payout_id: payoutId
        });

        if (response.data.success) {
            showToast('Payout approved!', 'success');
            loadPayouts();
        } else {
            showToast(response.data.message || 'Error approving payout', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error approving payout:', error);
        showToast('Error approving payout', 'error');
    }
}

// Open Process Payment Modal - proper business flow
function openProcessPaymentModal(payoutId) {
    // Find the payout in our data
    const payout = payouts.find(p => p.payout_id == payoutId);
    if (!payout) {
        showToast('Payout not found', 'error');
        return;
    }
    
    // Populate modal
    document.getElementById('processPaymentId').value = payoutId;
    document.getElementById('paymentSupplierName').textContent = payout.supplier_name;
    document.getElementById('paymentAmount').textContent = formatCurrency(payout.net_amount_payable);
    document.getElementById('paymentDate').value = formatDateForInput(new Date());
    document.getElementById('paymentReference').value = '';
    document.getElementById('paymentNotes').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('processPaymentModal'));
    modal.show();
}

// Confirm and process payment
async function confirmProcessPayment() {
    const payoutId = document.getElementById('processPaymentId').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentReference = document.getElementById('paymentReference').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentNotes = document.getElementById('paymentNotes').value;
    
    if (!paymentDate) {
        showToast('Please enter payment date', 'warning');
        return;
    }

    try {
        const response = await axios.post('../api/FarmerPayoutAPI.php', {
            action: 'markAsPaid',
            payout_id: payoutId,
            payment_method: paymentMethod,
            payment_reference: paymentReference,
            payment_date: paymentDate,
            payment_notes: paymentNotes
        });

        if (response.data.success) {
            showToast('Payment processed successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('processPaymentModal')).hide();
            loadPayouts();
            loadSuppliersNeedingPayout();
        } else {
            showToast(response.data.message || 'Error processing payment', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error processing payment:', error);
        showToast('Error processing payment', 'error');
    }
}

// Delete draft payout
async function deletePayout(payoutId) {
    if (!confirm('Are you sure you want to delete this draft payout? This cannot be undone.')) return;

    try {
        const response = await axios.post('../api/FarmerPayoutAPI.php', {
            action: 'deletePayout',
            payout_id: payoutId
        });

        if (response.data.success) {
            showToast('Draft payout deleted', 'success');
            loadPayouts();
            loadSuppliersNeedingPayout();
        } else {
            showToast(response.data.message || 'Error deleting payout', 'error');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error deleting payout:', error);
        showToast('Error deleting payout', 'error');
    }
}

// Print payout voucher
function printPayoutVoucher(payoutId) {
    const payout = payouts.find(p => p.payout_id == payoutId);
    if (!payout) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Voucher - ${payout.payout_reference}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 30px; font-family: Arial, sans-serif; }
                .voucher-header { border-bottom: 2px solid #198754; padding-bottom: 15px; margin-bottom: 20px; }
                .amount-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="voucher-header text-center">
                <h3 class="text-success">Highland Fresh Dairy</h3>
                <h5>PAYMENT VOUCHER</h5>
                <p class="text-muted mb-0">Reference: <strong>${payout.payout_reference}</strong></p>
            </div>
            <div class="row mb-4">
                <div class="col-6">
                    <p><strong>Payee:</strong> ${payout.supplier_name}</p>
                    <p><strong>Period:</strong> ${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}</p>
                </div>
                <div class="col-6 text-end">
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="badge bg-info">${payout.status}</span></p>
                </div>
            </div>
            <table class="table table-bordered">
                <tr><td>Total Liters Accepted</td><td class="text-end">${formatNumber(payout.total_liters_accepted)} L</td></tr>
                <tr><td>Gross Amount</td><td class="text-end">${formatCurrency(payout.gross_amount)}</td></tr>
                <tr><td>Transport Deductions</td><td class="text-end text-danger">-${formatCurrency(payout.total_transport_deductions)}</td></tr>
                <tr class="table-success"><td><strong>Net Amount Payable</strong></td><td class="text-end"><strong>${formatCurrency(payout.net_amount_payable)}</strong></td></tr>
            </table>
            <div class="row mt-5">
                <div class="col-4 text-center">
                    <div style="border-top: 1px solid #000; padding-top: 5px;">Prepared By</div>
                </div>
                <div class="col-4 text-center">
                    <div style="border-top: 1px solid #000; padding-top: 5px;">Approved By</div>
                </div>
                <div class="col-4 text-center">
                    <div style="border-top: 1px solid #000; padding-top: 5px;">Received By</div>
                </div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
}

// Legacy function - kept for backward compatibility
async function markPayoutPaid(payoutId) {
    openProcessPaymentModal(payoutId);
}

function printPayoutDetails() {
    const content = document.getElementById('payoutDetailsBody').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payout Details - Highland Fresh</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 20px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="text-center mb-4">
                <h3>Highland Fresh Dairy</h3>
                <h5>Farmer Payout Statement</h5>
            </div>
            ${content}
            <script>window.print();</script>
        </body>
        </html>
    `);
}

// =============================================================================
// FIFO COMPLIANCE
// =============================================================================
async function loadFifoReport() {
    try {
        // Load FIFO bypass report
        const bypassResponse = await axios.get('../api/SpoilageReportAPI.php', {
            params: { action: 'getFifoBypassReport' }
        });

        if (bypassResponse.data.success) {
            const data = bypassResponse.data.data;
            renderFifoBypassTable(data.bypasses || []);
        }

        // Get FIFO compliance stats from dashboard data
        if (dashboardData.spoilage?.fifo_compliance) {
            const fc = dashboardData.spoilage.fifo_compliance;
            document.getElementById('fifoTotalDispatches').textContent = fc.total_dispatches || 0;
            document.getElementById('fifoCompliantCount').textContent = fc.compliant_count || 0;
            document.getElementById('fifoBypassCount').textContent = fc.bypass_count || 0;
            document.getElementById('fifoCompliancePercent').textContent = (fc.compliance_rate || 100) + '%';
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading FIFO report:', error);
        showToast('Error loading FIFO report', 'error');
    }
}

function renderFifoBypassTable(bypasses) {
    const tbody = document.getElementById('fifoBypassTableBody');

    if (bypasses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-check-circle fs-1 text-success"></i>
                    <p class="mt-2">No FIFO bypass incidents found - Great job!</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bypasses.map(bypass => {
        const severityClass = bypass.severity === 'CRITICAL' ? 'danger' :
            bypass.severity === 'WARNING' ? 'warning' : 'secondary';
        return `
            <tr>
                <td>${formatDateTime(bypass.dispatch_date || bypass.bypass_date)}</td>
                <td>${bypass.product_name}</td>
                <td><code>${bypass.batch_used || bypass.dispatched_batch_number}</code></td>
                <td>${formatDate(bypass.batch_used_date || bypass.dispatched_batch_production_date)}</td>
                <td><span class="badge bg-danger">${bypass.days_newer || 'N/A'} days</span></td>
                <td>${bypass.sales_order_id ? '#' + bypass.sales_order_id : 'N/A'}</td>
                <td>${bypass.dispatched_by_name || 'Unknown'}</td>
                <td><span class="badge bg-${severityClass}">${bypass.severity || 'UNKNOWN'}</span></td>
            </tr>
        `;
    }).join('');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const bgClass = { success: 'bg-success', error: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }[type] || 'bg-info';

    const toastHtml = `
        <div id="${toastId}" class="toast ${bgClass} text-white" role="alert">
            <div class="toast-body d-flex justify-content-between align-items-center">
                <span>${message}</span>
                <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);

    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function logout() {
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}

// =============================================================================
// ACCOUNTS RECEIVABLE (AR) COLLECTION FUNCTIONS
// =============================================================================
let arData = {
    unpaidOrders: [],
    overdueOrders: [],
    paymentHistory: []
};

async function loadReceivables() {
    try {
        showLoading(true);

        // Load unpaid orders
        const unpaidResponse = await axios.get('../api/PaymentsAPI.php', {
            params: { operation: 'getUnpaidOrders' }
        });

        // Load overdue orders
        const overdueResponse = await axios.get('../api/PaymentsAPI.php', {
            params: { operation: 'getOverdueOrders' }
        });

        if (unpaidResponse.data.success) {
            arData.unpaidOrders = unpaidResponse.data.data?.orders || [];
            renderUnpaidOrders();
            updateARStats();
        }

        if (overdueResponse.data.success) {
            arData.overdueOrders = overdueResponse.data.data?.orders || [];
        }

        // Update AR badge in nav
        const arBadge = document.getElementById('arBadge');
        if (arBadge) {
            arBadge.textContent = arData.unpaidOrders.length;
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error loading receivables:', error);
        showToast('Error loading accounts receivable data', 'error');
        showLoading(false);
    }
}

function updateARStats() {
    const unpaid = arData.unpaidOrders;
    const overdue = arData.overdueOrders;

    // Calculate totals
    const totalUnpaid = unpaid.reduce((sum, order) => {
        const balance = parseFloat(order.total_amount) - parseFloat(order.payment_received || 0);
        return sum + balance;
    }, 0);

    const overdueAmount = overdue.reduce((sum, order) => {
        const balance = parseFloat(order.total_amount) - parseFloat(order.payment_received || 0);
        return sum + balance;
    }, 0);

    // Update UI
    document.getElementById('arTotalUnpaid').textContent = formatCurrency(totalUnpaid);
    document.getElementById('arOverdueAmount').textContent = formatCurrency(overdueAmount);
    document.getElementById('arOverdueCount').textContent = overdue.length;

    // TODO: Calculate collected this month from payment history
    document.getElementById('arCollectedThisMonth').textContent = formatCurrency(0);
}

function renderUnpaidOrders() {
    const tbody = document.getElementById('arUnpaidTableBody');
    if (!tbody) return;

    if (arData.unpaidOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-4">
                    <i class="bi bi-check-circle fs-1 text-success"></i>
                    <p class="mt-2">No unpaid orders - All accounts collected!</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = arData.unpaidOrders.map(order => {
        const total = parseFloat(order.total_amount) || 0;
        const paid = parseFloat(order.payment_received) || 0;
        const balance = total - paid;

        // Calculate days overdue
        const dueDate = order.due_date ? new Date(order.due_date) : null;
        const today = new Date();
        let daysOverdue = 0;
        let overdueClass = '';

        if (dueDate && today > dueDate) {
            daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            overdueClass = daysOverdue > 30 ? 'table-danger' : (daysOverdue > 7 ? 'table-warning' : '');
        }

        const statusBadge = order.payment_status === 'partially_paid'
            ? '<span class="badge bg-warning text-dark">Partial</span>'
            : '<span class="badge bg-secondary">Unpaid</span>';

        return `
            <tr class="${overdueClass}">
                <td><strong>${order.sale_number || order.order_number || 'ORD-' + order.sale_id}</strong></td>
                <td>${order.customer_name || 'N/A'}</td>
                <td>${formatDate(order.order_date || order.created_at)}</td>
                <td>${formatDate(order.due_date)}</td>
                <td class="${daysOverdue > 0 ? 'text-danger fw-bold' : ''}">${daysOverdue > 0 ? daysOverdue + ' days' : '-'}</td>
                <td class="text-end">${formatCurrency(total)}</td>
                <td class="text-end">${formatCurrency(paid)}</td>
                <td class="text-end fw-bold text-danger">${formatCurrency(balance)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="openPaymentModal(${order.sale_id}, '${order.sale_number || order.order_number || ''}', '${order.customer_name || ''}', ${total}, ${balance})">
                        <i class="bi bi-cash me-1"></i>Record Payment
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openPaymentModal(saleId, orderNumber, customerName, totalAmount, balanceDue) {
    document.getElementById('paymentSaleId').value = saleId;
    document.getElementById('paymentOrderNumber').value = orderNumber || 'ORD-' + saleId;
    document.getElementById('paymentCustomerName').value = customerName;
    document.getElementById('paymentTotalAmount').value = formatCurrency(totalAmount);
    document.getElementById('paymentBalanceDue').value = formatCurrency(balanceDue);
    document.getElementById('paymentAmountReceived').value = '';
    document.getElementById('paymentAmountReceived').max = balanceDue;
    document.getElementById('paymentMethodSelect').value = '';
    document.getElementById('paymentReferenceNumber').value = '';
    document.getElementById('paymentNotes').value = '';

    const modal = new bootstrap.Modal(document.getElementById('recordPaymentModal'));
    modal.show();
}

async function submitPayment() {
    const saleId = document.getElementById('paymentSaleId').value;
    const amountPaid = parseFloat(document.getElementById('paymentAmountReceived').value);
    const paymentMethodId = document.getElementById('paymentMethodSelect').value;
    const referenceNumber = document.getElementById('paymentReferenceNumber').value;
    const notes = document.getElementById('paymentNotes').value;

    if (!saleId || !amountPaid || !paymentMethodId) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }

    if (amountPaid <= 0) {
        showToast('Payment amount must be greater than zero', 'warning');
        return;
    }

    try {
        showLoading(true);

        const response = await axios.post('../api/PaymentsAPI.php', {
            operation: 'recordPayment',
            sale_id: saleId,
            amount_paid: amountPaid,
            payment_method_id: paymentMethodId,
            reference_number: referenceNumber,
            notes: notes
        });

        if (response.data.success) {
            showToast('Payment recorded successfully!', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('recordPaymentModal'));
            modal.hide();

            // Reload data
            await loadReceivables();
        } else {
            throw new Error(response.data.message || 'Failed to record payment');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error recording payment:', error);
        showToast(error.response?.data?.message || error.message || 'Failed to record payment', 'error');
        showLoading(false);
    }
}

// =============================================================================
// REQUISITION APPROVAL FUNCTIONS (GAP-F1 Implementation)
// =============================================================================
let currentRequisitionId = null;
let pendingRequisitions = [];

/**
 * Load pending requisitions for Finance Officer approval
 */
async function loadPendingRequisitions() {
    console.log('[Finance Dashboard] Loading requisitions...');

    const statusFilter = document.getElementById('requisitionStatusFilter')?.value || 'PENDING';

    try {
        showLoading(true);

        // Get requisitions with status filter
        const response = await axios.get('../api/RequisitionAPI.php', {
            params: {
                operation: 'getRequisitions',
                status: statusFilter,
                date_from: getFirstDayOfMonth(),
                date_to: getTodayDate()
            }
        });

        if (response.data.success) {
            pendingRequisitions = response.data.data.requisitions || [];
            renderRequisitionsTable(pendingRequisitions);
            updateRequisitionStats();
            updateRequisitionBadge();
        } else {
            throw new Error(response.data.message || 'Failed to load requisitions');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error loading requisitions:', error);
        showToast(error.response?.data?.message || error.message || 'Failed to load requisitions', 'error');
        showLoading(false);

        // Show empty state
        document.getElementById('requisitionsTableBody').innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-exclamation-circle fs-1"></i>
                    <p class="mt-2">Error loading requisitions. Please try again.</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Update requisition stats cards
 */
async function updateRequisitionStats() {
    try {
        // Get all requisitions to calculate stats
        const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
            axios.get('../api/RequisitionAPI.php', {
                params: { operation: 'getRequisitions', status: 'PENDING', date_from: '2020-01-01', date_to: getTodayDate() }
            }),
            axios.get('../api/RequisitionAPI.php', {
                params: { operation: 'getRequisitions', status: 'APPROVED', date_from: getFirstDayOfMonth(), date_to: getTodayDate() }
            }),
            axios.get('../api/RequisitionAPI.php', {
                params: { operation: 'getRequisitions', status: 'REJECTED', date_from: getFirstDayOfMonth(), date_to: getTodayDate() }
            })
        ]);

        const pendingReqs = pendingRes.data.data?.requisitions || [];
        const approvedReqs = approvedRes.data.data?.requisitions || [];
        const rejectedReqs = rejectedRes.data.data?.requisitions || [];

        document.getElementById('reqPendingCount').textContent = pendingReqs.length;
        document.getElementById('reqApprovedCount').textContent = approvedReqs.length;
        document.getElementById('reqRejectedCount').textContent = rejectedReqs.length;

        // Calculate total estimated cost of pending
        const totalEstCost = pendingReqs.reduce((sum, r) => sum + parseFloat(r.total_estimated_cost || 0), 0);
        document.getElementById('reqTotalEstCost').textContent = formatCurrency(totalEstCost);

    } catch (error) {
        console.error('[Finance Dashboard] Error updating requisition stats:', error);
    }
}

/**
 * Update requisition badge in navbar
 */
function updateRequisitionBadge() {
    const pendingCount = pendingRequisitions.filter(r => r.status === 'PENDING').length;
    const badge = document.getElementById('requisitionBadge');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline' : 'none';
    }
}

/**
 * Render requisitions table
 */
function renderRequisitionsTable(requisitions) {
    const tbody = document.getElementById('requisitionsTableBody');

    if (!requisitions || requisitions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">No requisitions found for the selected status.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = requisitions.map(req => {
        const priorityBadge = getPriorityBadge(req.priority);
        const statusBadge = getStatusBadge(req.status);
        const isPending = req.status === 'PENDING';

        return `
            <tr>
                <td>
                    <a href="#" onclick="viewRequisitionDetail(${req.requisition_id})" class="text-decoration-none fw-bold" style="color: var(--hf-primary);">
                        ${escapeHtml(req.requisition_number || 'N/A')}
                    </a>
                </td>
                <td>${formatDate(req.request_date)}</td>
                <td>${escapeHtml(req.requested_by_name || 'Unknown')}</td>
                <td><span class="badge" style="background-color: var(--hf-primary-light); color: var(--hf-primary);">${req.item_count || 0} items</span></td>
                <td class="fw-bold">${formatCurrency(req.total_estimated_cost || 0)}</td>
                <td>${priorityBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm btn-group-actions">
                        <button class="btn btn-view" onclick="viewRequisitionDetail(${req.requisition_id})" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${isPending ? `
                            <button class="btn btn-approve" onclick="approveRequisition(${req.requisition_id})" title="Approve">
                                <i class="bi bi-check-lg me-1"></i>Approve
                            </button>
                            <button class="btn btn-reject" onclick="rejectRequisition(${req.requisition_id})" title="Reject">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get priority badge HTML - Clean unified style
 */
function getPriorityBadge(priority) {
    const badges = {
        'URGENT': '<span class="badge badge-priority-high"><i class="bi bi-exclamation-triangle me-1"></i>Urgent</span>',
        'HIGH': '<span class="badge badge-priority-high">High</span>',
        'MEDIUM': '<span class="badge badge-priority-medium">Medium</span>',
        'LOW': '<span class="badge badge-priority-low">Low</span>'
    };
    return badges[priority?.toUpperCase()] || '<span class="badge badge-priority-low">Normal</span>';
}

/**
 * Get status badge HTML - Clean unified style
 */
function getStatusBadge(status) {
    const badges = {
        'PENDING': '<span class="badge badge-status-pending">Pending</span>',
        'APPROVED': '<span class="badge badge-status-approved">Approved</span>',
        'REJECTED': '<span class="badge badge-status-rejected">Rejected</span>',
        'CONVERTED': '<span class="badge badge-status-approved">Converted to PO</span>',
        'CANCELLED': '<span class="badge badge-status-pending">Cancelled</span>'
    };
    return badges[status?.toUpperCase()] || '<span class="badge badge-status-pending">Unknown</span>';
}

/**
 * View requisition detail in modal
 */
async function viewRequisitionDetail(requisitionId) {
    currentRequisitionId = requisitionId;

    try {
        showLoading(true);

        const response = await axios.get('../api/RequisitionAPI.php', {
            params: {
                operation: 'getRequisition',
                requisition_id: requisitionId
            }
        });

        if (response.data.success) {
            const req = response.data.data.requisition;
            const items = req.items || [];

            const isPending = req.status === 'PENDING';

            // Update modal buttons visibility
            document.getElementById('modalApproveBtn').style.display = isPending ? 'inline-block' : 'none';
            document.getElementById('modalRejectBtn').style.display = isPending ? 'inline-block' : 'none';

            // Build detail content
            document.getElementById('requisitionDetailContent').innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>Requisition #:</strong> ${escapeHtml(req.requisition_number)}</p>
                        <p><strong>Request Date:</strong> ${formatDate(req.request_date)}</p>
                        <p><strong>Requested By:</strong> ${escapeHtml(req.requested_by_name || 'Unknown')}</p>
                        <p><strong>Priority:</strong> ${getPriorityBadge(req.priority)}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Status:</strong> ${getStatusBadge(req.status)}</p>
                        ${req.approved_by_name ? `<p><strong>Approved By:</strong> ${escapeHtml(req.approved_by_name)}</p>` : ''}
                        ${req.approved_date ? `<p><strong>Approved Date:</strong> ${formatDate(req.approved_date)}</p>` : ''}
                        ${req.rejection_reason ? `<p><strong>Rejection Reason:</strong> ${escapeHtml(req.rejection_reason)}</p>` : ''}
                    </div>
                </div>
                ${req.reason ? `<div class="mb-3"><strong>Reason for Request:</strong><br>${escapeHtml(req.reason)}</div>` : ''}
                ${req.notes ? `<div class="mb-3"><strong>Notes:</strong><br>${escapeHtml(req.notes)}</div>` : ''}
                
                <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-list-ul me-2"></i>Requested Items</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>Item</th>
                                <th class="text-center">Qty Requested</th>
                                <th class="text-center">Unit</th>
                                <th class="text-end">Est. Unit Cost</th>
                                <th class="text-end">Est. Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${escapeHtml(item.item_name || item.material_name || 'Unknown')}</td>
                                    <td class="text-center">${item.quantity_requested || 0}</td>
                                    <td class="text-center">${escapeHtml(item.unit_of_measure || 'units')}</td>
                                    <td class="text-end">${formatCurrency(item.estimated_unit_cost || 0)}</td>
                                    <td class="text-end fw-bold">${formatCurrency(item.estimated_total_cost || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="table-light">
                            <tr>
                                <th colspan="4" class="text-end">Total Estimated Cost:</th>
                                <th class="text-end">${formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.estimated_total_cost || 0), 0))}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('requisitionDetailModal'));
            modal.show();
        } else {
            throw new Error(response.data.message || 'Failed to load requisition details');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error loading requisition detail:', error);
        showToast(error.response?.data?.message || error.message || 'Failed to load requisition details', 'error');
        showLoading(false);
    }
}

/**
 * Approve requisition and auto-create PO
 */
async function approveRequisition(requisitionId) {
    if (!confirm('Approve this requisition and automatically send the Purchase Order to the supplier?')) {
        return;
    }

    try {
        showLoading(true);

        const response = await axios.post('../api/RequisitionAPI.php', {
            operation: 'approveRequisition',
            requisition_id: requisitionId
        });

        if (response.data.success) {
            const poNumber = response.data.po_number || 'N/A';
            showToast(`✅ Approved! PO ${poNumber} created and sent to supplier.`, 'success');
            await loadPendingRequisitions();
        } else {
            throw new Error(response.data.message || 'Failed to approve requisition');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error approving requisition:', error);
        showToast(error.response?.data?.message || error.message || 'Failed to approve requisition', 'error');
        showLoading(false);
    }
}

/**
 * Approve from modal
 */
async function approveFromModal() {
    if (!currentRequisitionId) return;

    // Close detail modal
    const detailModal = bootstrap.Modal.getInstance(document.getElementById('requisitionDetailModal'));
    detailModal.hide();

    await approveRequisition(currentRequisitionId);
}

/**
 * Reject requisition - show reason modal
 */
function rejectRequisition(requisitionId) {
    currentRequisitionId = requisitionId;
    document.getElementById('rejectionReasonText').value = '';

    const modal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
    modal.show();
}

/**
 * Show reject modal from detail modal
 */
function showRejectModal() {
    // Close detail modal
    const detailModal = bootstrap.Modal.getInstance(document.getElementById('requisitionDetailModal'));
    detailModal.hide();

    // Show reject reason modal
    document.getElementById('rejectionReasonText').value = '';
    const rejectModal = new bootstrap.Modal(document.getElementById('rejectReasonModal'));
    rejectModal.show();
}

/**
 * Confirm rejection with reason
 */
async function confirmRejectRequisition() {
    const reason = document.getElementById('rejectionReasonText').value.trim();

    if (!reason) {
        showToast('Please provide a reason for rejection', 'warning');
        return;
    }

    if (!currentRequisitionId) {
        showToast('No requisition selected', 'error');
        return;
    }

    try {
        showLoading(true);

        const response = await axios.post('../api/RequisitionAPI.php', {
            operation: 'rejectRequisition',
            requisition_id: currentRequisitionId,
            rejection_reason: reason
        });

        if (response.data.success) {
            showToast('Requisition rejected successfully!', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('rejectReasonModal'));
            modal.hide();

            await loadPendingRequisitions();
        } else {
            throw new Error(response.data.message || 'Failed to reject requisition');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error rejecting requisition:', error);
        showToast(error.response?.data?.message || error.message || 'Failed to reject requisition', 'error');
        showLoading(false);
    }
}

/**
 * Helper: Get first day of current month (YYYY-MM-DD)
 */
function getFirstDayOfMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Helper: Get today's date (YYYY-MM-DD)
 */
function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Helper: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Load pending requisition count for badge (called from loadDashboard)
 */
async function loadPendingRequisitionBadge() {
    try {
        const response = await axios.get('../api/RequisitionAPI.php', {
            params: {
                operation: 'getRequisitions',
                status: 'PENDING',
                date_from: '2020-01-01',
                date_to: getTodayDate()
            }
        });

        if (response.data.success) {
            const pendingCount = response.data.data.requisitions?.length || 0;
            const badge = document.getElementById('requisitionBadge');
            if (badge) {
                badge.textContent = pendingCount;
                badge.style.display = pendingCount > 0 ? 'inline' : 'none';
            }
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading requisition badge:', error);
    }
}

// =============================================================================
// COST ALERTS / NOTIFICATIONS (BOM Engine Integration)
// =============================================================================
let notificationsData = [];

/**
 * Load notifications for Cost Alerts tab
 */
async function loadNotifications() {
    try {
        showLoading(true);

        const response = await axios.get('../api/SpoilageReportAPI.php', {
            params: { action: 'getNotifications' },
            withCredentials: true
        });

        console.log('[Finance Dashboard] Notifications response:', response.data);

        if (response.data.success) {
            // API returns { success: true, data: { notifications: [...], unread_count: N } }
            const apiData = response.data.data || response.data;
            notificationsData = apiData.notifications || [];
            const unreadCount = apiData.unread_count || 0;

            // Update stats
            const totalCount = notificationsData.length;
            const readCount = totalCount - unreadCount;

            document.getElementById('alertsUnreadCount').textContent = unreadCount;
            document.getElementById('alertsTotalCount').textContent = totalCount;
            document.getElementById('alertsReadCount').textContent = readCount;

            // Update badge
            updateNotificationBadge(unreadCount);

            // Render notifications
            renderNotifications();
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error loading notifications:', error);
        showToast('Error loading cost alerts', 'error');
        showLoading(false);
    }
}

/**
 * Render notifications list
 */
function renderNotifications() {
    const container = document.getElementById('notificationsList');

    if (!notificationsData || notificationsData.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-bell-slash fs-1"></i>
                <p class="mt-2">No cost alerts at this time.</p>
                <small>Alerts appear when material prices change significantly (≥5% or ≥₱2)</small>
            </div>
        `;
        return;
    }

    let html = '<div class="list-group">';

    notificationsData.forEach(notification => {
        const isUnread = notification.status === 'UNREAD';
        const unreadClass = isUnread ? 'list-group-item-warning' : '';
        const priority = notification.priority || 'NORMAL';
        const priorityBadge = getPriorityBadgeForNotification(priority);
        const createdDate = formatDateTime(notification.created_at);

        // Parse notification type for icon
        let icon = 'bi-bell';
        if (notification.notification_type === 'BOM_PRICE_CHANGE') {
            icon = 'bi-graph-up-arrow';
        } else if (notification.notification_type === 'COST_ALERT') {
            icon = 'bi-currency-exchange';
        }

        // Parse metadata for affected products info
        let metadata = {};
        try {
            metadata = notification.metadata ? JSON.parse(notification.metadata) : {};
        } catch (e) { }

        // Build action buttons
        let actionButtons = '';
        if (notification.notification_type === 'BOM_PRICE_CHANGE' && notification.reference_id) {
            actionButtons = `
                <button class="btn btn-sm btn-outline-primary me-2" onclick="viewAffectedProducts(${notification.reference_id}, '${escapeHtml(notification.title)}')">
                    <i class="bi bi-search"></i> View Affected Products
                </button>
            `;
        }

        html += `
            <div class="list-group-item ${unreadClass}" id="notification-${notification.notification_id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="ms-2 me-auto">
                        <div class="d-flex align-items-center mb-1">
                            <i class="bi ${icon} me-2 text-warning"></i>
                            <strong>${escapeHtml(notification.title)}</strong>
                            ${notification.severity === 'critical' ? '<span class="badge bg-danger ms-2">CRITICAL</span>' : ''}
                            ${isUnread ? '<span class="badge bg-warning text-dark ms-2">NEW</span>' : ''}
                        </div>
                        <p class="mb-1">${escapeHtml(notification.message)}</p>
                        <small class="text-muted">
                            <i class="bi bi-clock me-1"></i>${createdDate}
                        </small>
                    </div>
                    ${isUnread ? `
                        <button class="btn btn-sm btn-outline-secondary" onclick="markNotificationRead(${notification.notification_id})">
                            <i class="bi bi-check"></i> Mark Read
                        </button>
                    ` : `
                        <span class="badge bg-light text-muted"><i class="bi bi-check-circle"></i> Read</span>
                    `}
                </div>
                ${metadata.affected_products > 0 ? `
                    <div class="mt-2 pt-2 border-top">
                        ${actionButtons}
                        <small class="text-muted">
                            <i class="bi bi-box-seam me-1"></i>${metadata.affected_products} product(s) use this material
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Get priority badge for notification
 */
function getPriorityBadgeForNotification(priority) {
    switch (priority?.toUpperCase()) {
        case 'HIGH':
        case 'URGENT':
            return '<span class="badge bg-danger ms-2">HIGH</span>';
        case 'MEDIUM':
            return '<span class="badge bg-warning text-dark ms-2">MEDIUM</span>';
        default:
            return '';
    }
}

/**
 * Mark single notification as read
 */
async function markNotificationRead(notificationId) {
    try {
        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'markNotificationRead',
            notification_id: notificationId
        });

        if (response.data.success) {
            // Update UI immediately
            const element = document.getElementById(`notification-${notificationId}`);
            if (element) {
                element.classList.remove('list-group-item-warning');
                element.querySelector('.badge.bg-warning')?.remove();
                const btn = element.querySelector('button');
                if (btn) {
                    btn.outerHTML = '<span class="badge bg-light text-muted"><i class="bi bi-check-circle"></i> Read</span>';
                }
            }

            // Update counts
            const unreadEl = document.getElementById('alertsUnreadCount');
            const readEl = document.getElementById('alertsReadCount');
            if (unreadEl) {
                const newUnread = Math.max(0, parseInt(unreadEl.textContent) - 1);
                unreadEl.textContent = newUnread;
                updateNotificationBadge(newUnread);
            }
            if (readEl) {
                readEl.textContent = parseInt(readEl.textContent) + 1;
            }

            showToast('Notification marked as read', 'success');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error marking notification read:', error);
        showToast('Error updating notification', 'error');
    }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsRead() {
    if (!confirm('Mark all notifications as read?')) return;

    try {
        showLoading(true);

        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'markNotificationRead',
            mark_all: true
        });

        if (response.data.success) {
            showToast(`Marked ${response.data.count || 'all'} notifications as read`, 'success');
            loadNotifications(); // Reload to refresh UI
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error marking all notifications:', error);
        showToast('Error updating notifications', 'error');
        showLoading(false);
    }
}

/**
 * Update notification badge in navbar
 */
function updateNotificationBadge(count) {
    const badge = document.getElementById('alertsBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

/**
 * Update approvals badge in navbar
 */
function updateApprovalsBadge(count) {
    const badge = document.getElementById('approvalsBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// =============================================================================
// PRODUCTION COST APPROVAL WORKFLOW
// =============================================================================

/**
 * Load pending production cost approval requests
 */
async function loadPendingCostApprovals() {
    try {
        showLoading(true);
        
        const response = await axios.get('../api/SpoilageReportAPI.php', {
            params: { action: 'getPendingCostApprovals' },
            withCredentials: true
        });
        
        showLoading(false);
        
        const container = document.getElementById('approvalsContent');
        
        const data = response.data.data || response.data;
        const approvals = data.approvals || [];
        
        // Update badge count
        updateApprovalsBadge(approvals.length);
        
        if (!container) {
            console.log('[loadPendingCostApprovals] Container not found, but badge updated');
            return;
        }
        
        if (approvals.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-check-circle fs-1 text-success"></i>
                    <p class="mt-3">No pending cost approvals at this time.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="alert alert-info mb-4">
                <i class="bi bi-info-circle me-2"></i>
                <strong>${approvals.length} pending approval${approvals.length > 1 ? 's' : ''}</strong> - 
                Production is blocked until you approve or reject these requests.
            </div>
        `;
        
        approvals.forEach(approval => {
            const varianceClass = approval.variance_percent > 50 ? 'danger' : 'warning';
            const hoursAgo = approval.hours_pending || 0;
            const urgencyBadge = hoursAgo > 4 ? '<span class="badge bg-danger ms-2">Urgent</span>' : '';
            
            // Parse batch details if available
            let batchBreakdownHtml = '';
            if (approval.batch_details && approval.batch_details.length > 0) {
                batchBreakdownHtml = `
                    <div class="mt-3">
                        <h6 class="mb-2">FIFO Batch Breakdown:</h6>
                        <table class="table table-sm table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th>Material</th>
                                    <th>Qty Needed</th>
                                    <th>Batches</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${approval.batch_details.map(mat => `
                                    <tr>
                                        <td>${escapeHtml(mat.material_name)}</td>
                                        <td>${mat.quantity_per_unit} ${mat.unit}</td>
                                        <td>${mat.batches ? mat.batches.map(b => 
                                            `${parseFloat(b.current_quantity).toFixed(1)} @ ₱${parseFloat(b.unit_cost).toFixed(2)}`
                                        ).join(', ') : 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            html += `
                <div class="card mb-3 border-${varianceClass}">
                    <div class="card-header bg-${varianceClass} bg-opacity-25 d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-0">
                                <i class="bi bi-box-seam me-2"></i>${escapeHtml(approval.product_name)}
                                ${urgencyBadge}
                            </h5>
                            <small class="text-muted">
                                Requested by ${escapeHtml(approval.requested_by_name)} - ${hoursAgo}h ago
                            </small>
                        </div>
                        <span class="badge bg-${varianceClass} fs-6">+${approval.variance_percent}% over standard</span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <table class="table table-sm table-borderless">
                                    <tr>
                                        <td class="text-muted">Recipe:</td>
                                        <td>${escapeHtml(approval.recipe_name)}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Planned Quantity:</td>
                                        <td><strong>${parseFloat(approval.planned_quantity).toLocaleString('en-PH')} units</strong></td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <table class="table table-sm table-borderless">
                                    <tr>
                                        <td class="text-muted">Standard Cost:</td>
                                        <td>₱${parseFloat(approval.standard_cost).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Estimated Cost:</td>
                                        <td class="text-danger fw-bold">₱${parseFloat(approval.estimated_cost).toFixed(2)}</td>
                                    </tr>
                                    <tr class="border-top">
                                        <td class="text-muted">Variance:</td>
                                        <td class="text-${varianceClass}">
                                            +₱${parseFloat(approval.variance_amount).toFixed(2)}
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        
                        ${batchBreakdownHtml}
                        
                        <hr>
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-outline-danger" onclick="rejectCostApproval(${approval.approval_id})">
                                <i class="bi bi-x-circle me-1"></i>Reject
                            </button>
                            <button class="btn btn-success" onclick="approveCostApproval(${approval.approval_id}, '${escapeHtml(approval.product_name)}')">
                                <i class="bi bi-check-circle me-1"></i>Approve Production
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading cost approvals:', error);
        showLoading(false);
        const container = document.getElementById('approvalsContent');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Failed to load cost approvals: ${error.message}
                </div>
            `;
        }
    }
}

/**
 * Approve a production cost request
 */
async function approveCostApproval(approvalId, productName) {
    const notes = prompt(`Approve production for ${productName}?\n\nOptional notes for Production team:`, '');
    if (notes === null) return; // Cancelled
    
    try {
        showLoading(true);
        
        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'approveCostRequest',
            approval_id: approvalId,
            review_notes: notes
        }, {
            withCredentials: true
        });
        
        showLoading(false);
        
        if (response.data.success) {
            showToast(`Production approved for ${productName}`, 'success');
            loadPendingCostApprovals(); // Reload list
        } else {
            showToast(response.data.message || 'Failed to approve', 'error');
        }
    } catch (error) {
        console.error('Error approving cost:', error);
        showLoading(false);
        showToast('Error approving production', 'error');
    }
}

/**
 * Reject a production cost request
 */
async function rejectCostApproval(approvalId) {
    const reason = prompt('Reason for rejection (required):');
    if (!reason) {
        showToast('Rejection reason is required', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await axios.post('../api/SpoilageReportAPI.php', {
            action: 'rejectCostRequest',
            approval_id: approvalId,
            review_notes: reason
        }, {
            withCredentials: true
        });
        
        showLoading(false);
        
        if (response.data.success) {
            showToast('Production request rejected', 'success');
            loadPendingCostApprovals(); // Reload list
        } else {
            showToast(response.data.message || 'Failed to reject', 'error');
        }
    } catch (error) {
        console.error('Error rejecting cost:', error);
        showLoading(false);
        showToast('Error rejecting production', 'error');
    }
}

/**
 * View products affected by a material price change
 * Opens a modal showing which recipes/products use this material
 */
async function viewAffectedProducts(rawMaterialId, alertTitle) {
    try {
        showLoading(true);
        
        // Fetch products using this material from RecipeAPI
        const response = await axios.get('../api/RecipeAPI.php', {
            params: { 
                action: 'getProductsUsingMaterial',
                raw_material_id: rawMaterialId
            },
            withCredentials: true
        });

        showLoading(false);

        const apiData = response.data.data || response.data;
        const products = apiData.products || [];
        const materialName = apiData.material_name || 'this material';
        const materialUnit = apiData.material_unit || 'units';
        const currentFifoPrice = parseFloat(apiData.current_fifo_price) || 0;
        const newestBatchPrice = parseFloat(apiData.newest_batch_price) || 0;
        const priceDiff = parseFloat(apiData.price_difference) || 0;
        const priceChangePercent = parseFloat(apiData.price_change_percent) || 0;
        const stockAtCurrentPrice = parseFloat(apiData.stock_at_current_price) || 0;
        const stockAtHigherPrice = parseFloat(apiData.stock_at_higher_price) || 0;
        const hasPriceIncrease = priceDiff > 0.01;

        // Show modal with affected products - Highland Fresh Green Theme
        let modalHtml = `
            <div class="modal fade" id="affectedProductsModal" tabindex="-1">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header" style="background: var(--hf-primary, #2d5016); color: white;">
                            <h5 class="modal-title">
                                <i class="bi bi-graph-up-arrow me-2"></i>Cost Impact Analysis - ${escapeHtml(materialName)}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            
                            <!-- FIFO Price Transparency Section -->
                            <div class="row mb-4">
                                <div class="col-md-4">
                                    <div class="card h-100" style="border-left: 4px solid #28a745;">
                                        <div class="card-body text-center">
                                            <h6 class="text-muted mb-2">
                                                <i class="bi bi-1-circle me-1"></i>Current FIFO Price
                                            </h6>
                                            <h2 class="text-success mb-1">₱${currentFifoPrice.toFixed(2)}</h2>
                                            <small class="text-muted">Using now (oldest batch)</small>
                                            ${stockAtCurrentPrice > 0 ? `
                                                <div class="mt-2 pt-2 border-top">
                                                    <strong class="text-success">${stockAtCurrentPrice.toLocaleString('en-PH')} ${materialUnit}</strong>
                                                    <br><small>remaining at this price</small>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card h-100" style="border-left: 4px solid ${hasPriceIncrease ? '#dc3545' : '#28a745'};">
                                        <div class="card-body text-center">
                                            <h6 class="text-muted mb-2">
                                                <i class="bi bi-2-circle me-1"></i>Newest Batch Price
                                            </h6>
                                            <h2 class="${hasPriceIncrease ? 'text-danger' : 'text-success'} mb-1">₱${newestBatchPrice.toFixed(2)}</h2>
                                            <small class="text-muted">Next in line (FIFO queue)</small>
                                            ${stockAtHigherPrice > 0 ? `
                                                <div class="mt-2 pt-2 border-top">
                                                    <strong class="${hasPriceIncrease ? 'text-danger' : 'text-muted'}">${stockAtHigherPrice.toLocaleString('en-PH')} ${materialUnit}</strong>
                                                    <br><small>at higher price</small>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card h-100" style="border-left: 4px solid ${hasPriceIncrease ? '#ffc107' : '#6c757d'};">
                                        <div class="card-body text-center">
                                            <h6 class="text-muted mb-2">
                                                <i class="bi bi-arrow-right-circle me-1"></i>Price Impact
                                            </h6>
                                            ${hasPriceIncrease ? `
                                                <h2 class="text-warning mb-1">+₱${priceDiff.toFixed(2)}</h2>
                                                <small class="text-danger">(+${priceChangePercent.toFixed(1)}% increase)</small>
                                                <div class="mt-2 pt-2 border-top">
                                                    <span class="badge bg-warning text-dark">
                                                        <i class="bi bi-clock me-1"></i>Impact after ${stockAtCurrentPrice.toLocaleString('en-PH')} ${materialUnit} used
                                                    </span>
                                                </div>
                                            ` : `
                                                <h2 class="text-muted mb-1">No Change</h2>
                                                <small class="text-muted">Prices are stable</small>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${hasPriceIncrease ? `
                                <div class="alert alert-warning mb-4">
                                    <i class="bi bi-exclamation-triangle me-2"></i>
                                    <strong>Heads Up!</strong> You still have <strong>${stockAtCurrentPrice.toLocaleString('en-PH')} ${materialUnit}</strong> at the old price (₱${currentFifoPrice.toFixed(2)}). 
                                    The price increase to ₱${newestBatchPrice.toFixed(2)} will only affect production costs <strong>after</strong> you use up the current stock.
                                </div>
                            ` : ''}
                            
                            ${products.length > 0 ? `
                                <h6 class="mb-3"><i class="bi bi-box-seam me-2"></i>Affected Products - Current vs Future Cost (${products.length})</h6>
                                
                                <div class="table-responsive">
                                    <table class="table table-sm table-hover align-middle">
                                        <thead style="background: var(--hf-primary-light, #f0f5eb);">
                                            <tr>
                                                <th>Product</th>
                                                <th class="text-center">Usage/Batch</th>
                                                <th class="text-center">Current Cost</th>
                                                <th class="text-center">Future Cost</th>
                                                <th class="text-center">Increase</th>
                                                <th class="text-center">Selling Price</th>
                                                <th class="text-center">Future Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${products.map(p => {
                                                const currentCost = parseFloat(p.current_material_cost) || 0;
                                                const futureCost = parseFloat(p.future_material_cost) || 0;
                                                const costIncrease = parseFloat(p.cost_increase) || 0;
                                                const sellingPrice = parseFloat(p.selling_price) || 0;
                                                const futureMargin = sellingPrice > 0 ? ((sellingPrice - futureCost) / sellingPrice * 100) : 0;
                                                const marginClass = futureMargin < 20 ? 'bg-danger' : futureMargin < 40 ? 'bg-warning text-dark' : 'bg-success';
                                                
                                                return `
                                                    <tr>
                                                        <td>
                                                            <strong>${escapeHtml(p.product_name || 'N/A')}</strong>
                                                            <br><small class="text-muted">${escapeHtml(p.recipe_name || '')}</small>
                                                        </td>
                                                        <td class="text-center">${p.quantity_per_batch || 0} ${p.unit_name || 'units'}</td>
                                                        <td class="text-center text-success">₱${currentCost.toFixed(2)}</td>
                                                        <td class="text-center ${costIncrease > 0 ? 'text-danger fw-bold' : ''}">₱${futureCost.toFixed(2)}</td>
                                                        <td class="text-center">
                                                            ${costIncrease > 0 ? `<span class="badge bg-danger">+₱${costIncrease.toFixed(2)}</span>` : '<span class="text-muted">—</span>'}
                                                        </td>
                                                        <td class="text-center">₱${sellingPrice.toFixed(2)}</td>
                                                        <td class="text-center">
                                                            <span class="badge ${marginClass}">${futureMargin.toFixed(1)}%</span>
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div class="alert alert-light mt-3 mb-0" style="border-left: 3px solid var(--hf-primary, #2d5016);">
                                    <h6 class="alert-heading"><i class="bi bi-lightbulb me-2"></i>Recommended Actions</h6>
                                    <div class="row">
                                        <div class="col-md-4">
                                            <strong class="text-danger">🔴 Margin &lt;20%</strong>
                                            <p class="small mb-0">Immediate price adjustment needed or find alternative supplier</p>
                                        </div>
                                        <div class="col-md-4">
                                            <strong class="text-warning">🟡 Margin 20-40%</strong>
                                            <p class="small mb-0">Monitor closely, consider gradual price increase</p>
                                        </div>
                                        <div class="col-md-4">
                                            <strong class="text-success">🟢 Margin &gt;40%</strong>
                                            <p class="small mb-0">Healthy margin, absorb cost increase if needed</p>
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <div class="text-center text-muted py-4">
                                    <i class="bi bi-check-circle fs-1" style="color: var(--hf-primary, #2d5016);"></i>
                                    <p class="mt-2">No products are currently using this material in their recipes.</p>
                                    <p class="small">This price change has no impact on product costs.</p>
                                </div>
                            `}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-lg me-1"></i>Close
                            </button>
                            <button type="button" class="btn" style="background: var(--hf-primary, #2d5016); color: white;" onclick="goToRecipesTab()">
                                <i class="bi bi-journal-bookmark me-1"></i>Go to Recipe Management
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        document.getElementById('affectedProductsModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = new bootstrap.Modal(document.getElementById('affectedProductsModal'));
        modal.show();

    } catch (error) {
        console.error('[Finance Dashboard] Error loading affected products:', error);
        showToast('Error loading affected products', 'error');
        showLoading(false);
    }
}

/**
 * Navigate to a specific recipe for editing
 */
function goToRecipe(recipeId) {
    // Close modal
    const modal = document.getElementById('affectedProductsModal');
    if (modal) {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
    
    // Switch to recipes tab using showTab function directly
    showTab('recipes');
    
    // After tab loads, scroll to and highlight the recipe
    setTimeout(() => {
        const recipeRow = document.querySelector(`[data-recipe-id="${recipeId}"]`);
        if (recipeRow) {
            recipeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            recipeRow.classList.add('table-warning');
            setTimeout(() => recipeRow.classList.remove('table-warning'), 3000);
        }
    }, 800);
}

/**
 * Navigate to recipes tab
 */
function goToRecipesTab() {
    const modal = document.getElementById('affectedProductsModal');
    if (modal) {
        bootstrap.Modal.getInstance(modal)?.hide();
    }
    
    // Use showTab directly and update nav link
    showTab('recipes');
    
    // Update nav link active state
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const recipesLink = document.querySelector('a.nav-link[onclick*="recipes"]');
    if (recipesLink) recipesLink.classList.add('active');
}

/**
 * Load notification count for badge (called from loadDashboard)
 */
async function loadNotificationBadge() {
    try {
        const response = await axios.get('../api/SpoilageReportAPI.php', {
            params: { action: 'getNotificationCount' },
            withCredentials: true
        });

        if (response.data.success) {
            // API returns { success: true, data: { count: N } }
            const apiData = response.data.data || response.data;
            updateNotificationBadge(apiData.count || 0);
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading notification badge:', error);
    }
}
// =============================================================================
// MASTER RECIPE MANAGEMENT
// =============================================================================

/**
 * Global state for recipe editing
 */
let currentRecipe = null;
let availableMaterials = [];

/**
 * Load all recipes for display
 */
async function loadRecipes() {
    console.log('[Finance Dashboard] Loading recipes...');
    const tbody = document.getElementById('recipesTableBody');
    
    try {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    Loading recipes...
                </td>
            </tr>
        `;

        const response = await axios.get('../api/RecipeAPI.php', {
            params: { action: 'get_recipes' }
        });

        if (response.data.success) {
            const recipes = response.data.data || [];
            
            if (recipes.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-4">
                            <i class="bi bi-journal-x fs-3 d-block mb-2"></i>
                            No recipes found.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = recipes.map(recipe => `
                <tr>
                    <td class="fw-bold">#${recipe.recipe_id}</td>
                    <td>
                        <div class="fw-semibold">${escapeHtml(recipe.product_name || 'Unknown Product')}</div>
                        <small class="text-muted">${escapeHtml(recipe.recipe_name)}</small>
                    </td>
                    <td>
                        <span class="badge bg-light text-dark">${recipe.batch_size_yield} units</span>
                    </td>
                    <td>
                        ${recipe.ingredients_summary 
                            ? `<small class="text-muted">${escapeHtml(recipe.ingredients_summary.substring(0, 80))}${recipe.ingredients_summary.length > 80 ? '...' : ''}</small>`
                            : '<span class="text-danger small">No ingredients</span>'
                        }
                        <br><span class="badge bg-secondary">${recipe.ingredient_count || 0} ingredients</span>
                    </td>
                    <td>
                        <div class="fw-bold text-hf-primary">₱${formatNumber(recipe.estimated_cost)}</div>
                        <small class="text-muted">
                            Margin: ${recipe.margin_percent >= 0 
                                ? `<span class="text-success">${recipe.margin_percent}%</span>` 
                                : `<span class="text-danger">${recipe.margin_percent}%</span>`
                            }
                        </small>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-highland" onclick="openRecipeEditor(${recipe.recipe_id})" 
                                title="Edit Recipe Ratios">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            console.log(`[Finance Dashboard] Loaded ${recipes.length} recipes`);
        } else {
            throw new Error(response.data.message || 'Failed to load recipes');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading recipes:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
                    Failed to load recipes: ${error.message}
                </td>
            </tr>
        `;
    }
}

/**
 * Load current material prices for reference
 */
async function loadMaterialPrices() {
    console.log('[Finance Dashboard] Loading material prices...');
    const grid = document.getElementById('materialPricesGrid');
    
    try {
        const response = await axios.get('../api/RecipeAPI.php', {
            params: { action: 'get_material_prices' }
        });

        if (response.data.success) {
            const materials = response.data.data || [];
            
            if (materials.length === 0) {
                grid.innerHTML = '<div class="col-12 text-center text-muted py-3">No materials found</div>';
                return;
            }

            grid.innerHTML = materials.map(m => `
                <div class="col-md-3 col-sm-6">
                    <div class="card card-stat h-100">
                        <div class="card-body p-2">
                            <div class="small fw-semibold text-truncate" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</div>
                            <div class="text-hf-primary fw-bold">
                                ₱${formatNumber(m.current_price || 0)}
                                <small class="text-muted fw-normal">/${m.unit || 'unit'}</small>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error loading material prices:', error);
        grid.innerHTML = '<div class="col-12 text-center text-danger py-3">Failed to load prices</div>';
    }
}

/**
 * Open recipe editor modal
 */
async function openRecipeEditor(recipeId) {
    console.log('[Finance Dashboard] Opening recipe editor for ID:', recipeId);
    
    try {
        showLoading(true);

        // Load recipe details
        const response = await axios.get('../api/RecipeAPI.php', {
            params: { action: 'get_recipe_details', recipe_id: recipeId }
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to load recipe');
        }

        currentRecipe = response.data.data;
        
        // Also load available materials for "Add Ingredient" dropdown
        const materialsResponse = await axios.get('../api/RecipeAPI.php', {
            params: { action: 'get_available_materials' }
        });
        
        if (materialsResponse.data.success) {
            availableMaterials = materialsResponse.data.data || [];
        }

        // Populate modal
        document.getElementById('editRecipeId').value = currentRecipe.recipe_id;
        document.getElementById('editRecipeProductName').textContent = currentRecipe.product_name || 'Unknown Product';
        document.getElementById('editRecipeDescription').textContent = 
            `${currentRecipe.recipe_name} | Batch Yield: ${currentRecipe.batch_size_yield} units | Selling Price: ₱${formatNumber(currentRecipe.selling_price)}`;

        // Populate ingredients table
        renderRecipeIngredients();

        // Populate "Add Ingredient" dropdown (excluding already-added materials)
        populateMaterialsDropdown();

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editRecipeModal'));
        modal.show();

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error opening recipe editor:', error);
        showToast('Failed to load recipe: ' + error.message, 'error');
        showLoading(false);
    }
}

/**
 * Render ingredients in the edit modal
 */
function renderRecipeIngredients() {
    const tbody = document.getElementById('recipeIngredientsBody');
    const ingredients = currentRecipe.ingredients || [];

    if (ingredients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-3">
                    No ingredients defined. Add ingredients below.
                </td>
            </tr>
        `;
        document.getElementById('totalMaterialCost').textContent = '₱0.00';
        return;
    }

    tbody.innerHTML = ingredients.map(ing => `
        <tr data-ingredient-id="${ing.ingredient_id}">
            <td>
                <span class="fw-semibold">${escapeHtml(ing.material_name)}</span>
                ${ing.is_critical ? '<span class="badge bg-danger ms-1">Critical</span>' : ''}
            </td>
            <td>
                <input type="number" class="form-control form-control-sm ratio-input" 
                       value="${ing.ratio}" step="0.001" min="0.001"
                       data-original="${ing.ratio}"
                       onchange="saveRatioChange(this, ${ing.ingredient_id})">
            </td>
            <td class="text-muted">${ing.unit || 'unit'}</td>
            <td class="text-muted">₱${formatNumber(ing.current_price || 0)}</td>
            <td class="ingredient-cost fw-bold">₱${formatNumber(ing.cost_per_unit || 0)}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="removeIngredient(${ing.ingredient_id})" 
                        title="Remove Ingredient">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Update total
    document.getElementById('totalMaterialCost').textContent = `₱${formatNumber(currentRecipe.total_material_cost || 0)}`;
}

/**
 * Populate materials dropdown for adding ingredients
 */
function populateMaterialsDropdown() {
    const select = document.getElementById('newIngredientMaterial');
    const existingMaterialIds = (currentRecipe.ingredients || []).map(i => i.raw_material_id);

    // Filter out already-added materials
    const available = availableMaterials.filter(m => !existingMaterialIds.includes(m.raw_material_id));

    select.innerHTML = '<option value="">Select material...</option>' +
        available.map(m => `
            <option value="${m.raw_material_id}" data-unit="${m.unit || 'unit'}" data-price="${m.current_price || 0}">
                ${escapeHtml(m.name)} (₱${formatNumber(m.current_price || 0)}/${m.unit || 'unit'})
            </option>
        `).join('');

    // Auto-fill unit when material selected
    select.onchange = function() {
        const option = this.options[this.selectedIndex];
        document.getElementById('newIngredientUnit').value = option.dataset.unit || '';
    };
}

/**
 * Save ratio change immediately when user changes the value
 */
async function saveRatioChange(input, ingredientId) {
    const newValue = parseFloat(input.value);
    const originalValue = parseFloat(input.dataset.original);
    
    // Only save if value actually changed and is valid
    if (newValue === originalValue || !newValue || newValue <= 0) {
        input.classList.remove('border-warning', 'bg-warning-subtle');
        return;
    }
    
    input.classList.add('border-warning');
    input.disabled = true;
    
    try {
        const response = await axios.post('../api/RecipeAPI.php', {
            action: 'update_ingredient',
            ingredient_id: ingredientId,
            ratio: newValue
        });

        if (response.data.success) {
            // Update original value to new value
            input.dataset.original = newValue;
            input.classList.remove('border-warning');
            input.classList.add('border-success');
            
            // Update cost display for this row
            const row = input.closest('tr');
            const ingredient = currentRecipe.ingredients.find(i => i.ingredient_id === ingredientId);
            if (ingredient) {
                ingredient.ratio = newValue; // Update local data
                const newCost = newValue * (ingredient.current_price || 0);
                row.querySelector('.ingredient-cost').textContent = `₱${formatNumber(newCost)}`;
            }
            
            // Recalculate total
            recalculateTotalCost();
            
            // Brief success indicator
            setTimeout(() => {
                input.classList.remove('border-success');
            }, 1500);
            
            // Reload main recipes list in background
            loadRecipes();
        } else {
            throw new Error(response.data.message || 'Failed to save');
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error saving ratio:', error);
        input.classList.add('border-danger');
        showToast('Failed to save ratio change', 'error');
        // Revert to original value
        input.value = originalValue;
    } finally {
        input.disabled = false;
    }
}

/**
 * Recalculate total material cost
 */
function recalculateTotalCost() {
    let total = 0;
    document.querySelectorAll('#recipeIngredientsBody tr').forEach(row => {
        const ratioInput = row.querySelector('.ratio-input');
        const ingredientId = parseInt(row.dataset.ingredientId);
        const ingredient = currentRecipe.ingredients.find(i => i.ingredient_id === ingredientId);
        
        if (ratioInput && ingredient) {
            const ratio = parseFloat(ratioInput.value) || 0;
            total += ratio * (ingredient.current_price || 0);
        }
    });
    
    document.getElementById('totalMaterialCost').textContent = `₱${formatNumber(total)}`;
}

/**
 * Add new ingredient to recipe
 */
async function addRecipeIngredient() {
    const materialId = document.getElementById('newIngredientMaterial').value;
    const ratio = parseFloat(document.getElementById('newIngredientRatio').value);
    
    if (!materialId) {
        showToast('Please select a raw material', 'error');
        return;
    }
    
    if (!ratio || ratio <= 0) {
        showToast('Please enter a valid ratio (greater than 0)', 'error');
        return;
    }
    
    try {
        showLoading(true);

        const response = await axios.post('../api/RecipeAPI.php', {
            action: 'add_ingredient',
            recipe_id: currentRecipe.recipe_id,
            raw_material_id: parseInt(materialId),
            ratio: ratio,
            notes: ''
        });

        if (response.data.success) {
            showToast('Ingredient added successfully', 'success');
            
            // Reload recipe to get updated data
            await refreshCurrentRecipe();
            
            // Clear inputs
            document.getElementById('newIngredientMaterial').value = '';
            document.getElementById('newIngredientRatio').value = '';
            document.getElementById('newIngredientUnit').value = '';
        } else {
            throw new Error(response.data.message || 'Failed to add ingredient');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error adding ingredient:', error);
        showToast('Failed to add ingredient: ' + error.message, 'error');
        showLoading(false);
    }
}

/**
 * Remove ingredient from recipe
 */
async function removeIngredient(ingredientId) {
    if (!confirm('Are you sure you want to remove this ingredient from the recipe?')) {
        return;
    }
    
    try {
        showLoading(true);

        const response = await axios.post('../api/RecipeAPI.php', {
            action: 'remove_ingredient',
            ingredient_id: ingredientId
        });

        if (response.data.success) {
            showToast('Ingredient removed', 'success');
            await refreshCurrentRecipe();
        } else {
            throw new Error(response.data.message || 'Failed to remove ingredient');
        }

        showLoading(false);
    } catch (error) {
        console.error('[Finance Dashboard] Error removing ingredient:', error);
        showToast('Failed to remove ingredient: ' + error.message, 'error');
        showLoading(false);
    }
}

/**
 * Refresh current recipe data
 */
async function refreshCurrentRecipe() {
    if (!currentRecipe) return;
    
    try {
        const response = await axios.get('../api/RecipeAPI.php', {
            params: { action: 'get_recipe_details', recipe_id: currentRecipe.recipe_id }
        });

        if (response.data.success) {
            currentRecipe = response.data.data;
            renderRecipeIngredients();
            populateMaterialsDropdown();
        }
    } catch (error) {
        console.error('[Finance Dashboard] Error refreshing recipe:', error);
    }
}

/**
 * Helper: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Format number with commas and decimals
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '0.00';
    return parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}