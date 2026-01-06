/**
 * QC Dashboard JavaScript
 * Handles milk collection, aging alerts, and rejection workflows
 * FIFO Implementation: Milk processed in collection_date order (oldest first)
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================
let agingAlerts = [];
let milkCollections = [];
let dashboardStats = {};
let alertRefreshInterval = null;

// Aging status configuration
const AGING_STATUS = {
    OK: { label: 'OK', class: 'success', icon: 'bi-check-circle-fill', maxHours: 18 },
    WARNING: { label: 'Warning', class: 'warning', icon: 'bi-exclamation-triangle-fill', maxHours: 36 },
    CRITICAL: { label: 'Critical', class: 'danger', icon: 'bi-exclamation-octagon-fill', maxHours: 48 },
    EXPIRED: { label: 'Expired', class: 'dark', icon: 'bi-x-octagon-fill', maxHours: Infinity },
    REJECTED: { label: 'Rejected', class: 'secondary', icon: 'bi-slash-circle', maxHours: null }
};

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('[QC Dashboard] Initializing...');

    // Check authentication
    checkAuth();

    // Load initial data
    loadDashboard();

    // Setup event listeners
    setupEventListeners();

    // Start auto-refresh for aging alerts (every 30 seconds)
    startAlertRefresh();

    console.log('[QC Dashboard] Initialization complete');
});

function checkAuth() {
    const userData = sessionStorage.getItem('user');
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userData);
    document.getElementById('userNameDisplay').textContent = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;
    document.getElementById('userRoleDisplay').textContent = user.role || 'QC Officer';
}

function setupEventListeners() {
    // New collection form
    const collectionForm = document.getElementById('newCollectionForm');
    if (collectionForm) {
        collectionForm.addEventListener('submit', handleNewCollection);
    }

    // Rejection form
    const rejectionForm = document.getElementById('rejectionForm');
    if (rejectionForm) {
        rejectionForm.addEventListener('submit', handleRejection);
    }

    // Refresh buttons
    document.querySelectorAll('[data-action="refresh"]').forEach(btn => {
        btn.addEventListener('click', loadDashboard);
    });

    // Filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', function () {
            // Update active state
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Apply combined filters
            applyFilters();
        });
    });

    // Supplier filter dropdown
    const filterSupplier = document.getElementById('filterSupplier');
    if (filterSupplier) {
        filterSupplier.addEventListener('change', applyFilters);
    }

    // Date filter
    const filterDate = document.getElementById('filterDate');
    if (filterDate) {
        filterDate.addEventListener('change', applyFilters);
    }

    // Auto-generate RMR when opening modal
    const newCollectionModal = document.getElementById('newCollectionModal');
    if (newCollectionModal) {
        newCollectionModal.addEventListener('show.bs.modal', generateRmrNumber);
    }
}

function startAlertRefresh() {
    // Refresh aging alerts every 30 seconds
    alertRefreshInterval = setInterval(() => {
        loadAgingAlerts(true); // Silent refresh
    }, 30000);
}

// =============================================================================
// DASHBOARD DATA LOADING
// =============================================================================
async function loadDashboard() {
    try {
        showLoading(true);

        // First, auto-expire any batches older than 48 hours
        await autoExpireOldBatches();

        // Load all dashboard data in parallel
        await Promise.all([
            loadDashboardStats(),
            loadAgingAlerts(),
            loadMilkCollections(),
            loadSuppliers(),
            loadAgingStatusTab()
        ]);

        showLoading(false);
    } catch (error) {
        console.error('[QC Dashboard] Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
        showLoading(false);
    }
}

/**
 * Auto-expire milk batches older than 48 hours
 * This runs automatically on dashboard load to ensure expired milk is flagged
 */
async function autoExpireOldBatches() {
    try {
        const response = await axios.post('../api/MilkCollectionAPI.php',
            new URLSearchParams({ operation: 'expireOldBatches' })
        );

        if (response.data.success && response.data.data.expired_count > 0) {
            const count = response.data.data.expired_count;
            console.log(`[QC Dashboard] Auto-expired ${count} batch(es)`);

            // Show notification about auto-expired batches
            showToast(
                `⚠️ ${count} milk batch${count > 1 ? 'es' : ''} auto-expired (48h+ old). Please discard.`,
                'warning'
            );
        }
    } catch (error) {
        console.error('[QC Dashboard] Error auto-expiring batches:', error);
        // Don't show error to user - this is a background operation
    }
}

async function loadDashboardStats() {
    try {
        const response = await axios.get('../api/MilkCollectionAPI.php', {
            params: { operation: 'getDashboardStats' }
        });

        if (response.data.success) {
            dashboardStats = response.data.data;
            renderDashboardStats();
        }
    } catch (error) {
        console.error('[QC Dashboard] Error loading stats:', error);
    }
}

async function loadAgingAlerts(silent = false) {
    try {
        const response = await axios.get('../api/MilkCollectionAPI.php', {
            params: { operation: 'getAgingAlerts' }
        });

        if (response.data.success) {
            agingAlerts = response.data.data;
            renderAgingAlerts();

            // Update badge counts
            updateAlertBadges();

            // Show notification for critical alerts if not silent
            if (!silent && agingAlerts.filter(a => a.status === 'CRITICAL').length > 0) {
                showCriticalAlert();
            }
        }
    } catch (error) {
        console.error('[QC Dashboard] Error loading alerts:', error);
    }
}

async function loadMilkCollections(filter = 'all') {
    try {
        // Default to last 30 days to capture more data
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const params = {
            operation: 'getCollections',
            date_from: thirtyDaysAgo.toISOString().split('T')[0],
            date_to: today.toISOString().split('T')[0]
        };
        if (filter !== 'all') {
            params.status = filter;
        }

        const response = await axios.get('../api/MilkCollectionAPI.php', { params });

        if (response.data.success) {
            milkCollections = response.data.data;
            renderCollectionsTable();

            // Also render the Pending Discard section
            renderPendingDiscardSection();
        }
    } catch (error) {
        console.error('[QC Dashboard] Error loading collections:', error);
    }
}

/**
 * Render the Pending Discard section with expired items
 */
function renderPendingDiscardSection() {
    const card = document.getElementById('pendingDiscardCard');
    const tbody = document.getElementById('pendingDiscardTableBody');
    const countBadge = document.getElementById('pendingDiscardCount');

    if (!card || !tbody) return;

    // Filter expired items
    const expiredItems = milkCollections.filter(c => {
        const status = c.status || 'PENDING';
        return status === 'EXPIRED';
    });

    if (expiredItems.length === 0) {
        card.style.display = 'none';
        return;
    }

    // Show the card
    card.style.display = 'block';
    countBadge.textContent = expiredItems.length;

    // Sort by age (oldest first)
    expiredItems.sort((a, b) => new Date(a.collection_date) - new Date(b.collection_date));

    tbody.innerHTML = expiredItems.map(item => {
        const ageHours = item.age_hours || 0;
        const days = Math.floor(ageHours / 24);
        const hours = ageHours % 24;
        const ageDisplay = days > 0 ? `${days}d ${hours}h` : `${ageHours}h`;

        return `
            <tr>
                <td><strong>${item.rmr_number || 'N/A'}</strong></td>
                <td>${item.supplier_name || 'Unknown'}</td>
                <td>${formatDate(item.collection_date)}</td>
                <td class="text-end">${formatNumber(item.liters_accepted || 0)} L</td>
                <td><span class="badge bg-danger">${ageDisplay}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="discardExpiredBatch('${item.collection_id}', '${item.rmr_number}', ${item.liters_accepted || 0})">
                        <i class="bi bi-trash"></i> Discard
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadSuppliers() {
    try {
        const response = await axios.get('../api/MilkCollectionAPI.php', {
            params: { operation: 'getDairySuppliers' }
        });

        if (response.data.success) {
            const suppliers = response.data.data;

            // Populate the form dropdown
            const formSelect = document.getElementById('supplierId');
            if (formSelect) {
                formSelect.innerHTML = '<option value="">Select Supplier/Farmer...</option>';
                suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.supplier_id;
                    option.textContent = `${supplier.name} (${supplier.supplier_type || 'Supplier'})`;
                    formSelect.appendChild(option);
                });
            }

            // Populate the filter dropdown
            const filterSelect = document.getElementById('filterSupplier');
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">All Suppliers</option>';
                suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.supplier_id;
                    option.textContent = supplier.name;
                    filterSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('[QC Dashboard] Error loading suppliers:', error);
    }
}

/**
 * Load and render the Aging Status tab (FIFO inventory view)
 */
async function loadAgingStatusTab() {
    try {
        const response = await axios.get('../api/MilkCollectionAPI.php', {
            params: { operation: 'getMilkAgingStatus' }
        });

        if (response.data.success) {
            const batches = response.data.data.batches || [];
            renderAgingStatusTable(batches);
        } else {
            console.error('[QC Dashboard] Failed to load aging status:', response.data.message);
            renderAgingStatusTable([]);
        }
    } catch (error) {
        console.error('[QC Dashboard] Error loading aging status:', error);
        renderAgingStatusTable([]);
    }
}

/**
 * Render the Aging Status table
 */
function renderAgingStatusTable(batches) {
    const tbody = document.getElementById('agingStatusTableBody');
    if (!tbody) return;

    if (!batches || batches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    No raw milk inventory found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = batches.map((batch, index) => {
        const status = batch.status || 'OK';
        const hoursRemaining = batch.hours_remaining || 0;
        const ageHours = batch.age_hours || 0;
        const isExpired = status === 'EXPIRED' || hoursRemaining <= 0;
        const isProcessable = ['OK', 'CAUTION', 'WARNING', 'CRITICAL'].includes(status) && !isExpired;

        // Status badge configuration
        const statusConfig = {
            'OK': { class: 'success', icon: 'bi-check-circle', label: 'Fresh' },
            'CAUTION': { class: 'info', icon: 'bi-info-circle', label: 'Caution' },
            'WARNING': { class: 'warning', icon: 'bi-exclamation-triangle', label: 'Warning' },
            'CRITICAL': { class: 'danger', icon: 'bi-exclamation-circle', label: 'Critical' },
            'EXPIRED': { class: 'dark', icon: 'bi-x-octagon', label: 'Expired' }
        }[status] || { class: 'secondary', icon: 'bi-question', label: status };

        // Expiry display
        let expiryDisplay = '';
        if (isExpired) {
            expiryDisplay = '<span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Expired</span>';
        } else if (hoursRemaining <= 12) {
            expiryDisplay = `<span class="text-danger fw-bold">${hoursRemaining}h left</span>`;
        } else if (hoursRemaining <= 24) {
            expiryDisplay = `<span class="text-warning">${hoursRemaining}h left</span>`;
        } else {
            expiryDisplay = `<span class="text-muted">${hoursRemaining}h left</span>`;
        }

        // FIFO badge ONLY for the first PROCESSABLE (non-expired) batch
        const firstProcessableIndex = batches.findIndex(b => {
            const s = b.status || 'OK';
            const hr = b.hours_remaining || 0;
            return ['OK', 'CAUTION', 'WARNING', 'CRITICAL'].includes(s) && hr > 0;
        });
        const showFifoBadge = index === firstProcessableIndex && isProcessable;

        // Row styling: Expired gets danger background
        const rowClass = isExpired ? 'table-danger' : (status === 'CRITICAL' ? 'table-warning' : '');

        return `
            <tr class="${rowClass}">
                <td>
                    <strong>${batch.rmr_number || 'N/A'}</strong>
                    ${showFifoBadge ? '<span class="badge bg-info ms-1" title="First In, First Out - Process this batch first">FIFO</span>' : ''}
                    ${isExpired ? '<span class="badge bg-danger ms-1">⚠ Discard</span>' : ''}
                </td>
                <td>${batch.supplier_name || 'Unknown'}</td>
                <td class="text-end">${formatNumber(batch.liters || 0)} L</td>
                <td>${formatDateTime(batch.collection_date)}</td>
                <td>
                    <span class="badge ${ageHours >= 36 ? 'bg-danger' : (ageHours >= 24 ? 'bg-warning text-dark' : 'bg-success')}">
                        ${batch.age_display || ageHours + 'h'}
                    </span>
                </td>
                <td>${expiryDisplay}</td>
                <td>
                    <span class="badge bg-${statusConfig.class}">
                        <i class="bi ${statusConfig.icon} me-1"></i>${statusConfig.label}
                    </span>
                </td>
                <td>
                    ${status === 'EXPIRED' ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="openRejectionModal('${batch.collection_id}', '${batch.rmr_number}', ${batch.liters || 0})" title="Discard expired milk">
                            <i class="bi bi-trash"></i> Discard
                        </button>
                    ` : (status === 'CRITICAL' || status === 'WARNING' ? `
                        <button class="btn btn-sm btn-outline-warning" onclick="prioritizeForProduction('${batch.collection_id}')" title="Prioritize for production">
                            <i class="bi bi-arrow-up-circle"></i> Priority
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-primary" onclick="viewCollectionDetails('${batch.collection_id}')" title="View details">
                            <i class="bi bi-eye"></i>
                        </button>
                    `)}
                </td>
            </tr>
        `;
    }).join('');
}

// =============================================================================
// RENDERING FUNCTIONS
// =============================================================================
function renderDashboardStats() {
    const stats = dashboardStats;

    // Update stat cards - use IDs from HTML
    document.getElementById('statTotalCollections').textContent = stats.total_collections || 0;
    document.getElementById('statTotalLiters').textContent = formatNumber(stats.total_liters || 0);
    document.getElementById('statPendingCount').textContent = stats.pending_count || stats.status_counts?.PENDING || 0;
    document.getElementById('statCriticalCount').textContent = stats.critical_count || stats.status_counts?.CRITICAL || 0;
}

function renderAgingProgressBar() {
    const total = milkCollections.filter(c => c.status !== 'REJECTED').length || 1;
    const counts = {
        OK: milkCollections.filter(c => c.aging_status === 'OK').length,
        WARNING: milkCollections.filter(c => c.aging_status === 'WARNING').length,
        CRITICAL: milkCollections.filter(c => c.aging_status === 'CRITICAL').length,
        EXPIRED: milkCollections.filter(c => c.aging_status === 'EXPIRED').length
    };

    const progressBar = document.getElementById('agingProgressBar');
    if (progressBar) {
        progressBar.innerHTML = `
            <div class="progress-bar bg-success" style="width: ${(counts.OK / total) * 100}%" title="OK: ${counts.OK}"></div>
            <div class="progress-bar bg-warning" style="width: ${(counts.WARNING / total) * 100}%" title="Warning: ${counts.WARNING}"></div>
            <div class="progress-bar bg-danger" style="width: ${(counts.CRITICAL / total) * 100}%" title="Critical: ${counts.CRITICAL}"></div>
            <div class="progress-bar bg-dark" style="width: ${(counts.EXPIRED / total) * 100}%" title="Expired: ${counts.EXPIRED}"></div>
        `;
    }
}

function renderAgingAlerts() {
    const alertsList = document.getElementById('alertsList');
    const noAlertsMessage = document.getElementById('noAlertsMessage');
    const alertCountBadge = document.getElementById('alertCountBadge');

    if (!alertsList) return;

    // Update badge count
    if (alertCountBadge) {
        alertCountBadge.textContent = agingAlerts.length;
    }

    if (agingAlerts.length === 0) {
        // Show "no alerts" message, hide alerts list
        if (noAlertsMessage) noAlertsMessage.classList.remove('d-none');
        alertsList.classList.add('d-none');
        return;
    }

    // Hide "no alerts" message, show alerts list
    if (noAlertsMessage) noAlertsMessage.classList.add('d-none');
    alertsList.classList.remove('d-none');

    // Filter out EXPIRED - they're in the Pending Discard section
    // Only show WARNING, CAUTION, CRITICAL alerts here
    const nonExpiredAlerts = agingAlerts.filter(a => a.aging_status !== 'EXPIRED');

    // Update count badge to reflect only actionable alerts
    if (alertCountBadge) {
        alertCountBadge.textContent = nonExpiredAlerts.length;
    }

    if (nonExpiredAlerts.length === 0) {
        // If only expired alerts, show "no alerts" and hide list
        if (noAlertsMessage) noAlertsMessage.classList.remove('d-none');
        alertsList.classList.add('d-none');
        return;
    }

    // Sort by severity: CRITICAL > WARNING > CAUTION
    const sortedAlerts = [...nonExpiredAlerts].sort((a, b) => {
        const priority = { CRITICAL: 1, WARNING: 2, CAUTION: 3 };
        return (priority[a.aging_status] || 4) - (priority[b.aging_status] || 4);
    });

    alertsList.innerHTML = sortedAlerts.map(alert => {
        const status = alert.aging_status || 'WARNING';
        const statusConfig = AGING_STATUS[status] || AGING_STATUS.WARNING;
        const hoursLeft = alert.hours_until_expiry || 0;
        const expiryText = hoursLeft > 0 ? `${hoursLeft}h left` : 'Near expiry';

        return `
            <div class="alert alert-${statusConfig.class} d-flex align-items-center mb-2" role="alert">
                <i class="bi ${statusConfig.icon} me-2 fs-5"></i>
                <div class="flex-grow-1">
                    <strong>${alert.rmr_number}</strong> - ${alert.supplier_name || 'Unknown Supplier'}<br>
                    <small>${formatNumber(alert.liters_accepted || 0)} L | Age: ${alert.age_hours || 0}h | ${expiryText}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="prioritizeForProduction('${alert.collection_id}')" title="Prioritize for Production">
                        <i class="bi bi-arrow-up-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="openRejectionModal('${alert.collection_id}', '${alert.rmr_number}', ${alert.liters_accepted || 0})" title="Reject">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCollectionsTable() {
    const tbody = document.getElementById('collectionsTableBody');
    if (!tbody) return;

    // Filter out EXPIRED and DISCARDED items - they shouldn't appear in the active list
    const activeCollections = milkCollections.filter(c => {
        const status = c.status || 'PENDING';
        return status !== 'EXPIRED' && status !== 'DISCARDED';
    });

    if (activeCollections.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">No active milk collections</p>
                    <small class="text-muted">Discarded items have been removed from this view</small>
                </td>
            </tr>
        `;
        return;
    }

    // Sort collections: Processable items first (by date ASC), then processed/rejected at bottom
    const sortedCollections = [...activeCollections].sort((a, b) => {
        const statusA = a.status || 'PENDING';
        const statusB = b.status || 'PENDING';

        // Priority: Processable (PENDING, WARNING, CRITICAL) > PROCESSED > REJECTED
        const priority = { 'PENDING': 1, 'WARNING': 2, 'CRITICAL': 3, 'PROCESSED': 4, 'REJECTED': 5 };
        const priorityA = priority[statusA] || 4;
        const priorityB = priority[statusB] || 4;

        if (priorityA !== priorityB) return priorityA - priorityB;

        // Within same priority, sort by date (oldest first for FIFO)
        return new Date(a.collection_date) - new Date(b.collection_date);
    });

    // Find the first processable item for FIFO badge
    const firstProcessableIndex = sortedCollections.findIndex(c => {
        const status = c.status || 'PENDING';
        return status === 'PENDING' || status === 'WARNING' || status === 'CRITICAL';
    });

    tbody.innerHTML = sortedCollections.map((collection, index) => {
        const status = collection.status || 'PENDING';
        const isRejected = status === 'REJECTED';
        const isProcessable = ['PENDING', 'WARNING', 'CRITICAL'].includes(status);

        const statusConfig = {
            'PENDING': { class: 'success', icon: 'bi-clock', label: 'Pending' },
            'WARNING': { class: 'warning', icon: 'bi-exclamation-triangle', label: 'Warning' },
            'CRITICAL': { class: 'danger', icon: 'bi-exclamation-circle', label: 'Critical' },
            'REJECTED': { class: 'secondary', icon: 'bi-slash-circle', label: 'Rejected' },
            'PROCESSED': { class: 'info', icon: 'bi-check-circle', label: 'Processed' }
        }[status] || { class: 'secondary', icon: 'bi-question', label: status };

        const ageHours = collection.age_hours || 0;
        const hoursUntilExpiry = Math.max(0, collection.hours_until_expiry || 0);

        // Age badge color based on hours
        let ageBadgeClass = 'bg-success';
        if (ageHours >= 36) ageBadgeClass = 'bg-danger';
        else if (ageHours >= 24) ageBadgeClass = 'bg-warning text-dark';
        else if (ageHours >= 18) ageBadgeClass = 'bg-info';

        // Row styling based on status
        let rowClass = '';
        if (isRejected) rowClass = 'table-secondary text-decoration-line-through';
        else if (status === 'CRITICAL') rowClass = 'table-warning';

        // FIFO badge only on the first PROCESSABLE item
        const showFifoBadge = index === firstProcessableIndex && isProcessable;

        // Action buttons based on status
        let actionButtons = '';
        if (isRejected) {
            actionButtons = `<span class="text-muted"><i class="bi bi-slash-circle me-1"></i>Rejected</span>`;
        } else if (status === 'PROCESSED') {
            actionButtons = `
                <button class="btn btn-sm btn-outline-secondary" onclick="viewCollectionDetails('${collection.collection_id}')" title="View Details">
                    <i class="bi bi-eye"></i>
                </button>
            `;
        } else {
            // Processable items: View + Reject buttons
            actionButtons = `
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewCollectionDetails('${collection.collection_id}')" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="openRejectionModal('${collection.collection_id}', '${collection.rmr_number}', ${collection.liters_accepted || 0})" title="Reject">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            `;
        }

        return `
            <tr class="${rowClass}">
                <td>
                    <strong>${collection.rmr_number || 'N/A'}</strong>
                    ${showFifoBadge ? '<span class="badge bg-info ms-1">FIFO Next</span>' : ''}
                </td>
                <td>${collection.supplier_name || 'Unknown'}</td>
                <td>${formatDate(collection.collection_date)}</td>
                <td class="text-end">${formatNumber(collection.liters_delivered || 0)} L</td>
                <td class="text-end">${formatNumber(collection.liters_accepted || 0)} L</td>
                <td>${collection.fat_content ? collection.fat_content + '%' : 'N/A'}</td>
                <td>${collection.titratable_acidity ? collection.titratable_acidity + '%' : 'N/A'}</td>
                <td>${collection.alcohol_test_passed === 1 ? '<span class="badge bg-success">Pass</span>' : collection.alcohol_test_passed === 0 ? '<span class="badge bg-danger">Fail</span>' : 'N/A'}</td>
                <td>
                    <span class="badge bg-${statusConfig.class}">
                        <i class="bi ${statusConfig.icon} me-1"></i>${statusConfig.label}
                    </span>
                </td>
                <td>
                    <span class="badge ${ageBadgeClass}">${ageHours}h</span>
                    ${hoursUntilExpiry > 0 ? `<small class="text-muted d-block">${hoursUntilExpiry}h left</small>` : '<small class="text-danger d-block">Near expiry</small>'}
                </td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }).join('');
}

function updateAlertBadges() {
    const criticalCount = agingAlerts.filter(a => a.status === 'CRITICAL').length;
    const warningCount = agingAlerts.filter(a => a.status === 'WARNING').length;
    const expiredCount = agingAlerts.filter(a => a.status === 'EXPIRED').length;

    // Update navbar badge
    const alertBadge = document.getElementById('alertBadge');
    if (alertBadge) {
        const totalAlerts = criticalCount + expiredCount;
        alertBadge.textContent = totalAlerts;
        alertBadge.style.display = totalAlerts > 0 ? 'inline' : 'none';
    }
}

// =============================================================================
// NEW COLLECTION WORKFLOW
// =============================================================================
async function generateRmrNumber() {
    try {
        const response = await axios.get('../api/MilkCollectionAPI.php', {
            params: { operation: 'generateRmrNumber' }
        });

        if (response.data.success) {
            document.getElementById('rmrNumber').value = response.data.data.rmr_number;
        }
    } catch (error) {
        console.error('[QC Dashboard] Error generating RMR:', error);
        showToast('Error generating RMR number', 'error');
    }
}

/**
 * Discard a single expired batch - Opens modal with reason code selection
 * GAP 3 FIX: Now shows reason code selection before discarding
 */
function discardExpiredBatch(collectionId, rmrNumber, liters) {
    // Store collection info for the modal
    window.pendingDiscardCollectionId = collectionId;
    window.pendingDiscardRmrNumber = rmrNumber;
    window.pendingDiscardLiters = liters;
    window.pendingDiscardAll = false;

    // Update modal content
    document.getElementById('discardReasonModalTitle').textContent = `Discard ${rmrNumber}`;
    document.getElementById('discardLitersInfo').textContent = `${liters}L will be logged as spoilage`;

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('discardReasonModal'));
    modal.show();
}

/**
 * Discard all expired batches - Opens modal with reason code selection
 * GAP 3 FIX: Now shows reason code selection before bulk discarding
 */
function discardAllExpired() {
    const expiredItems = milkCollections.filter(c => (c.status || 'PENDING') === 'EXPIRED');

    if (expiredItems.length === 0) {
        showToast('No expired batches to discard', 'info');
        return;
    }

    const totalLiters = expiredItems.reduce((sum, item) => sum + (parseFloat(item.liters_accepted) || 0), 0);

    // Store info for the modal
    window.pendingDiscardCollectionId = null;
    window.pendingDiscardRmrNumber = null;
    window.pendingDiscardLiters = totalLiters;
    window.pendingDiscardAll = true;
    window.pendingDiscardCount = expiredItems.length;

    // Update modal content
    document.getElementById('discardReasonModalTitle').textContent = `Discard All Expired (${expiredItems.length} batches)`;
    document.getElementById('discardLitersInfo').textContent = `${totalLiters.toFixed(1)}L total will be logged as spoilage`;

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('discardReasonModal'));
    modal.show();
}

/**
 * Confirm discard with selected reason code
 * GAP 2 & 3 FIX: Uses new discardExpiredMilk API with spoilage_log write
 */
async function confirmDiscardWithReason() {
    const reasonCode = document.getElementById('discardReasonCode').value;
    const notes = document.getElementById('discardNotes').value;

    if (!reasonCode) {
        showToast('Please select a reason code', 'warning');
        return;
    }

    const discardAll = window.pendingDiscardAll;
    const collectionId = window.pendingDiscardCollectionId;
    const rmrNumber = window.pendingDiscardRmrNumber;
    const liters = window.pendingDiscardLiters;

    // Close the modal
    bootstrap.Modal.getInstance(document.getElementById('discardReasonModal')).hide();

    try {
        // Use URLSearchParams for PHP compatibility
        const params = new URLSearchParams();
        params.append('operation', 'discardExpiredMilk');
        if (collectionId) params.append('collection_id', collectionId);
        params.append('discard_all', discardAll ? '1' : '0');
        params.append('reason_code', reasonCode);
        if (notes) params.append('notes', notes);

        const response = await axios.post('../api/MilkCollectionAPI.php', params);

        if (response.data.success) {
            const msg = discardAll
                ? `✓ Discarded ${response.data.data.discarded_count} batch(es) - ${response.data.data.total_liters}L logged to spoilage`
                : `✓ ${rmrNumber} discarded - ${liters}L logged to spoilage`;
            showToast(msg, 'success');

            // Show BOM trigger result if present
            if (response.data.data.bom_trigger && response.data.data.bom_trigger.bom_triggered) {
                showToast(`📊 BOM recalculated - ${response.data.data.bom_trigger.affected_products_count} products updated`, 'info');
            }

            loadDashboard(); // Refresh all data
        } else {
            showToast(response.data.message || 'Error discarding batch', 'error');
        }
    } catch (error) {
        console.error('[QC Dashboard] Error discarding:', error);
        showToast('Error discarding batch: ' + (error.response?.data?.message || error.message), 'error');
    }
}


async function handleNewCollection(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Gather form data - matching HTML element IDs
    const formData = {
        operation: 'createCollection',
        rmr_number: document.getElementById('rmrNumber').value,
        supplier_id: document.getElementById('supplierId').value,
        collection_date: document.getElementById('collectionDate').value,
        liters_delivered: parseFloat(document.getElementById('litersDelivered').value) || 0,
        liters_rejected: parseFloat(document.getElementById('litersRejected').value) || 0,
        fat_content: parseFloat(document.getElementById('fatContent').value) || null,
        titratable_acidity: parseFloat(document.getElementById('titratableAcidity').value) || null,
        alcohol_test_passed: document.getElementById('alcoholTestPassed').value === '1' ? 1 : (document.getElementById('alcoholTestPassed').value === '0' ? 0 : null),
        base_price_per_liter: parseFloat(document.getElementById('basePricePerLiter').value) || 40.00,
        transport_fee: parseFloat(document.getElementById('transportFee').value) || 0,
        notes: document.getElementById('collectionNotes').value || null
    };

    // Validation
    if (!formData.supplier_id) {
        showToast('Please select a supplier', 'warning');
        return;
    }

    if (!formData.collection_date) {
        showToast('Please enter collection date', 'warning');
        return;
    }

    if (!formData.liters_delivered || formData.liters_delivered <= 0) {
        showToast('Please enter a valid quantity', 'warning');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

        // Convert to URLSearchParams for form-urlencoded POST
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(formData)) {
            if (value !== null && value !== undefined) {
                params.append(key, value);
            }
        }

        const response = await axios.post('../api/MilkCollectionAPI.php', params);

        if (response.data.success) {
            showToast('Milk collection recorded successfully!', 'success');

            // Close modal and reset form
            bootstrap.Modal.getInstance(document.getElementById('newCollectionModal')).hide();
            form.reset();

            // Reload dashboard
            loadDashboard();
        } else {
            showToast(response.data.message || 'Error saving collection', 'error');
        }
    } catch (error) {
        console.error('[QC Dashboard] Error saving collection:', error);
        // Show the actual server error message if available
        const errorMessage = error.response?.data?.message || error.message || 'Error saving milk collection';
        showToast(errorMessage, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Save Collection';
    }
}

// =============================================================================
// REJECTION WORKFLOW
// =============================================================================
function openRejectionModal(collectionId, rmrNumber, litersAccepted = 0) {
    document.getElementById('rejectCollectionId').value = collectionId;
    document.getElementById('rejectRmrNumber').textContent = rmrNumber;
    document.getElementById('rejectMaxLiters').textContent = litersAccepted;
    document.getElementById('rejectLiters').max = litersAccepted;
    document.getElementById('rejectLiters').value = litersAccepted;

    const modal = new bootstrap.Modal(document.getElementById('rejectionModal'));
    modal.show();
}

async function handleRejection(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const collectionId = document.getElementById('rejectCollectionId').value;
    const litersRejected = document.getElementById('rejectLiters').value;
    const reason = document.getElementById('rejectionReason').value;
    const notes = document.getElementById('rejectionNotes').value;

    if (!reason) {
        showToast('Please select a rejection reason', 'warning');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';

        const params = new URLSearchParams();
        params.append('operation', 'rejectMilk');
        params.append('collection_id', collectionId);
        params.append('liters_rejected', litersRejected);
        params.append('rejection_reason', reason);
        if (notes) params.append('notes', notes);

        const response = await axios.post('../api/MilkCollectionAPI.php', params);

        if (response.data.success) {
            showToast('Milk collection rejected and excluded from inventory', 'success');

            // Close modal and reset form
            bootstrap.Modal.getInstance(document.getElementById('rejectionModal')).hide();
            form.reset();

            // Reload dashboard
            loadDashboard();
        } else {
            showToast(response.data.message || 'Error rejecting collection', 'error');
        }
    } catch (error) {
        console.error('[QC Dashboard] Error rejecting collection:', error);
        showToast('Error processing rejection', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Confirm Rejection';
    }
}

// =============================================================================
// COLLECTION ACTIONS
// =============================================================================
function viewCollectionDetails(collectionId) {
    const collection = milkCollections.find(c => c.collection_id == collectionId);
    if (!collection) {
        showToast('Collection not found', 'error');
        return;
    }

    const status = collection.status || 'PENDING';
    const statusConfig = {
        'PENDING': { class: 'success', label: 'Pending' },
        'WARNING': { class: 'warning', label: 'Warning' },
        'CRITICAL': { class: 'danger', label: 'Critical' },
        'EXPIRED': { class: 'dark', label: 'Expired' },
        'REJECTED': { class: 'secondary', label: 'Rejected' },
        'PROCESSED': { class: 'info', label: 'Processed' }
    }[status] || { class: 'secondary', label: status };

    const content = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="border-bottom pb-2"><i class="bi bi-info-circle me-1"></i>Collection Information</h6>
                <table class="table table-sm">
                    <tr><th width="40%">RMR Number:</th><td><strong>${collection.rmr_number}</strong></td></tr>
                    <tr><th>Supplier:</th><td>${collection.supplier_name || 'Unknown'}</td></tr>
                    <tr><th>Contact:</th><td>${collection.contact_person || 'N/A'}</td></tr>
                    <tr><th>Collection Date:</th><td>${formatDate(collection.collection_date)}</td></tr>
                    <tr><th>Milk Type:</th><td>${collection.milk_type || 'Cow'}</td></tr>
                    <tr><th>Liters Delivered:</th><td><strong>${formatNumber(collection.liters_delivered || 0)} L</strong></td></tr>
                    <tr><th>Liters Rejected:</th><td class="text-danger">${formatNumber(collection.liters_rejected || 0)} L</td></tr>
                    <tr><th>Liters Accepted:</th><td class="text-success"><strong>${formatNumber(collection.liters_accepted || 0)} L</strong></td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="border-bottom pb-2"><i class="bi bi-clipboard-check me-1"></i>Quality & Status</h6>
                <table class="table table-sm">
                    <tr><th width="40%">Fat Content:</th><td>${collection.fat_content ? collection.fat_content + '%' : 'N/A'}</td></tr>
                    <tr><th>Titratable Acidity:</th><td>${collection.titratable_acidity ? collection.titratable_acidity + '%' : 'N/A'}</td></tr>
                    <tr><th>Alcohol Test:</th><td>${collection.alcohol_test_passed === 1 ? '<span class="badge bg-success">Passed</span>' : collection.alcohol_test_passed === 0 ? '<span class="badge bg-danger">Failed</span>' : 'N/A'}</td></tr>
                    <tr><th>Age:</th><td>${collection.age_hours || 0} hours</td></tr>
                    <tr><th>Hours Until Expiry:</th><td>${collection.hours_until_expiry > 0 ? collection.hours_until_expiry + ' hours' : '<span class="text-danger">Expired</span>'}</td></tr>
                    <tr>
                        <th>Status:</th>
                        <td><span class="badge bg-${statusConfig.class}">${statusConfig.label}</span></td>
                    </tr>
                </table>
                <h6 class="border-bottom pb-2 mt-3"><span class="me-1">₱</span>Pricing</h6>
                <table class="table table-sm">
                    <tr><th width="40%">Base Price/L:</th><td>₱${formatNumber(collection.base_price_per_liter || 40)}</td></tr>
                    <tr><th>Quality Premium:</th><td>₱${formatNumber(collection.quality_premium || 0)}</td></tr>
                    <tr><th>Transport Fee:</th><td>₱${formatNumber(collection.transport_fee || 0)}</td></tr>
                    <tr><th>Total Amount:</th><td><strong>₱${formatNumber(collection.total_amount || 0)}</strong></td></tr>
                </table>
            </div>
        </div>
    `;

    // Store collection ID for prioritize button
    document.getElementById('btnPrioritize').setAttribute('data-collection-id', collectionId);
    document.getElementById('viewDetailsBody').innerHTML = content;

    const modal = new bootstrap.Modal(document.getElementById('viewDetailsModal'));
    modal.show();
}

function printRmrLabel(collectionId) {
    const collection = milkCollections.find(c => c.collection_id == collectionId);
    if (!collection) return;

    const printWindow = window.open('', '_blank', 'width=400,height=300');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>RMR Label - ${collection.rmr_number}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .label { border: 2px solid #000; padding: 15px; width: 300px; }
                .rmr-number { font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 10px; }
                .barcode { text-align: center; font-family: 'Libre Barcode 39', monospace; font-size: 48px; }
                .details { font-size: 12px; margin-top: 10px; }
                .details td { padding: 2px 5px; }
                .warning { background: #fff3cd; padding: 5px; text-align: center; font-weight: bold; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="label">
                <div class="rmr-number">${collection.rmr_number}</div>
                <div class="barcode">*${collection.rmr_number}*</div>
                <table class="details">
                    <tr><td>Supplier:</td><td>${collection.supplier_name || 'N/A'}</td></tr>
                    <tr><td>Collected:</td><td>${formatDateTime(collection.collection_date)}</td></tr>
                    <tr><td>Quantity:</td><td>${formatNumber(collection.quantity_liters)} L</td></tr>
                    <tr><td>Expiry:</td><td>${formatDateTime(collection.expiry_time)}</td></tr>
                </table>
                <div class="warning">⚠️ FIFO: Use Oldest First</div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
}

async function prioritizeForProduction(collectionId) {
    const collection = milkCollections.find(c => c.collection_id == collectionId);
    if (!collection) {
        showToast('Collection not found', 'error');
        return;
    }

    // Show confirmation
    if (!confirm(`Mark ${collection.rmr_number} as priority for production?\n\nThis will flag it for immediate processing.`)) {
        return;
    }

    try {
        const params = new URLSearchParams();
        params.append('operation', 'prioritizeCollection');
        params.append('collection_id', collectionId);

        const response = await axios.post('../api/MilkCollectionAPI.php', params);

        if (response.data.success) {
            showToast(`${collection.rmr_number} marked as priority`, 'success');
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewDetailsModal'));
            if (modal) modal.hide();
            loadDashboard();
        } else {
            showToast(response.data.message || 'Error prioritizing collection', 'error');
        }
    } catch (error) {
        console.error('[QC Dashboard] Error prioritizing:', error);
        showToast('Error prioritizing collection', 'error');
    }
}

// Called from modal button
function prioritizeFromModal() {
    const collectionId = document.getElementById('btnPrioritize').getAttribute('data-collection-id');
    if (collectionId) {
        prioritizeForProduction(collectionId);
    } else {
        showToast('No collection selected', 'warning');
    }
}

// =============================================================================
// FILTER FUNCTIONS
// =============================================================================
function filterCollections(filter) {
    console.log('[QC Dashboard] Filtering by:', filter);

    if (filter === 'all') {
        renderCollectionsTable();
        return;
    }

    const filtered = milkCollections.filter(c => {
        const status = c.status || 'PENDING';

        // Handle different filter types
        if (filter === 'PENDING') {
            return status === 'PENDING' || status === 'WARNING' || status === 'CRITICAL';
        }
        if (filter === 'PROCESSED') {
            return status === 'PROCESSED';
        }
        if (filter === 'REJECTED') {
            return status === 'REJECTED';
        }
        if (filter === 'EXPIRED') {
            return status === 'EXPIRED';
        }
        // Default - match status directly
        return status === filter.toUpperCase();
    });

    const tbody = document.getElementById('collectionsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3"></i>
                    <p class="mt-2 mb-0">No collections match "${filter}" filter</p>
                </td>
            </tr>
        `;
        return;
    }

    // Temporarily swap and render
    const originalCollections = milkCollections;
    milkCollections = filtered;
    renderCollectionsTable();
    milkCollections = originalCollections;
}

// Multi-criteria filter: Status + Supplier + Date
function applyFilters() {
    const activeStatusBtn = document.querySelector('[data-filter].active');
    const statusFilter = activeStatusBtn ? activeStatusBtn.dataset.filter : 'all';
    const supplierFilter = document.getElementById('filterSupplier')?.value || '';
    const dateFilter = document.getElementById('filterDate')?.value || '';

    console.log('[QC Dashboard] Applying filters - Status:', statusFilter, 'Supplier:', supplierFilter, 'Date:', dateFilter);

    let filtered = [...milkCollections];

    // 1. Apply status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(c => {
            const status = c.status || 'PENDING';
            if (statusFilter === 'PENDING') {
                return status === 'PENDING' || status === 'WARNING' || status === 'CRITICAL';
            }
            if (statusFilter === 'PROCESSED') {
                return status === 'PROCESSED';
            }
            if (statusFilter === 'REJECTED') {
                return status === 'REJECTED';
            }
            if (statusFilter === 'EXPIRED') {
                return status === 'EXPIRED';
            }
            return status === statusFilter.toUpperCase();
        });
    }

    // 2. Apply supplier filter
    if (supplierFilter) {
        console.log('[QC Dashboard] Filtering by supplier_id:', supplierFilter);
        const supplierId = parseInt(supplierFilter, 10);
        filtered = filtered.filter(c => {
            const collectionSupplierId = parseInt(c.supplier_id, 10);
            return collectionSupplierId === supplierId;
        });
        console.log('[QC Dashboard] Filtered results count:', filtered.length);
    }

    // 3. Apply date filter
    if (dateFilter) {
        console.log('[QC Dashboard] Filtering by date:', dateFilter);
        filtered = filtered.filter(c => {
            // Extract just the date part from collection_date (could be datetime format)
            const collectionDateOnly = c.collection_date ? c.collection_date.split(' ')[0].split('T')[0] : '';
            return collectionDateOnly === dateFilter;
        });
        console.log('[QC Dashboard] Filtered results after date filter:', filtered.length);
    }

    const tbody = document.getElementById('collectionsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3"></i>
                    <p class="mt-2 mb-0">No collections match the selected filters</p>
                </td>
            </tr>
        `;
        return;
    }

    // Render filtered data
    const originalCollections = milkCollections;
    milkCollections = filtered;
    renderCollectionsTable();
    milkCollections = originalCollections;
}

/**
 * Clear all filters and show all collections
 */
function clearFilters() {
    // Reset status filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') btn.classList.add('active');
    });

    // Reset date filter
    const dateFilter = document.getElementById('filterDate');
    if (dateFilter) dateFilter.value = '';

    // Reset supplier filter
    const supplierFilter = document.getElementById('filterSupplier');
    if (supplierFilter) supplierFilter.value = '';

    // Re-render with all data
    renderCollectionsTable();

    console.log('[QC Dashboard] All filters cleared');
}

// =============================================================================
// CRITICAL ALERT POPUP
// =============================================================================
function showCriticalAlert() {
    const criticalAlerts = agingAlerts.filter(a => a.status === 'CRITICAL' || a.status === 'EXPIRED');
    if (criticalAlerts.length === 0) return;

    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" 
             style="z-index: 9999; min-width: 400px;" role="alert">
            <h5 class="alert-heading">
                <i class="bi bi-exclamation-octagon-fill me-2"></i>
                Critical Milk Aging Alert!
            </h5>
            <p><strong>${criticalAlerts.length}</strong> milk collection(s) require immediate attention:</p>
            <ul class="mb-0">
                ${criticalAlerts.slice(0, 3).map(a => `
                    <li><strong>${a.rmr_number}</strong> - ${a.hours_elapsed?.toFixed(1)} hrs old</li>
                `).join('')}
                ${criticalAlerts.length > 3 ? `<li>... and ${criticalAlerts.length - 3} more</li>` : ''}
            </ul>
            <hr>
            <p class="mb-0">
                <small>Process immediately or reject if quality compromised.</small>
            </p>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    // Remove existing alert if any
    document.querySelector('.critical-alert-popup')?.remove();

    const div = document.createElement('div');
    div.className = 'critical-alert-popup';
    div.innerHTML = alertHtml;
    document.body.appendChild(div);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        div.querySelector('.alert')?.classList.remove('show');
        setTimeout(() => div.remove(), 300);
    }, 10000);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    // Create toast container if not exists
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const bgClass = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    }[type] || 'bg-info';

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

// Logout function
function logout() {
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}

// =============================================================================
// PRICE CHANGE PREVIEW (GAP FIX)
// =============================================================================

// Store previous price data for comparison
let previousPriceData = null;

/**
 * Load previous milk price when opening the new collection modal
 * Called automatically when modal opens
 */
async function loadPreviousMilkPrice() {
    try {
        const response = await axios.get('../api/MilkCollectionAPI.php', {
            params: { operation: 'getPreviousMilkPrice' },
            withCredentials: true
        });

        if (response.data.success) {
            previousPriceData = response.data.data;

            // Update the preview display
            const avgPrice = previousPriceData.average_price || 40.00;
            const minPrice = previousPriceData.min_price || 38.00;
            const maxPrice = previousPriceData.max_price || 42.00;

            document.getElementById('avgPriceDisplay').textContent = `₱${avgPrice.toFixed(2)}/L`;
            document.getElementById('priceRangeDisplay').textContent = `(Range: ₱${minPrice.toFixed(2)}-${maxPrice.toFixed(2)})`;

            // Show the preview section
            document.getElementById('priceChangePreview').classList.remove('d-none');

            // Check if current entered price differs
            checkPriceChange();

            console.log('[QC Dashboard] Previous milk price loaded:', previousPriceData);
        }
    } catch (error) {
        console.error('[QC Dashboard] Error loading previous milk price:', error);
        // Don't show error to user - this is optional functionality
    }
}

/**
 * Check if the current entered price differs from the average
 * Shows a warning if price change detected
 */
function checkPriceChange() {
    const enteredPrice = parseFloat(document.getElementById('basePricePerLiter').value) || 40.00;
    const warningDiv = document.getElementById('priceChangeWarning');
    const priceChangeText = document.getElementById('priceChangeText');

    if (!previousPriceData || !previousPriceData.average_price) {
        warningDiv.classList.add('d-none');
        return;
    }

    const avgPrice = previousPriceData.average_price;
    const priceDiff = enteredPrice - avgPrice;
    const percentChange = ((priceDiff / avgPrice) * 100).toFixed(1);

    // Show warning if price differs by more than 2%
    if (Math.abs(priceDiff) > avgPrice * 0.02) {
        const direction = priceDiff > 0 ? 'increase' : 'decrease';
        const sign = priceDiff > 0 ? '+' : '';

        priceChangeText.innerHTML = `
            ₱${avgPrice.toFixed(2)} → ₱${enteredPrice.toFixed(2)} 
            (<span class="${direction === 'increase' ? 'text-danger' : 'text-success'}">${sign}${percentChange}%</span>)
        `;

        warningDiv.classList.remove('d-none');
    } else {
        warningDiv.classList.add('d-none');
    }

    // Also update estimated total
    calculateEstimatedTotal();
}

/**
 * Calculate estimated total (enhanced to work with price change check)
 */
function calculateEstimatedTotal() {
    const accepted = parseFloat(document.getElementById('litersAccepted')?.value) || 0;
    const basePrice = parseFloat(document.getElementById('basePricePerLiter')?.value) || 40;
    const transportFee = parseFloat(document.getElementById('transportFee')?.value) || 0;

    const total = accepted * (basePrice - transportFee);
    const estimatedTotalEl = document.getElementById('estimatedTotal');
    if (estimatedTotalEl) {
        estimatedTotalEl.value = '₱' + total.toFixed(2);
    }
}

// Setup modal event listener for price loading
document.addEventListener('DOMContentLoaded', function () {
    const newCollectionModal = document.getElementById('newCollectionModal');
    if (newCollectionModal) {
        newCollectionModal.addEventListener('show.bs.modal', function () {
            // Load previous price data when modal opens
            loadPreviousMilkPrice();
        });

        newCollectionModal.addEventListener('hidden.bs.modal', function () {
            // Hide the warnings when modal closes
            document.getElementById('priceChangePreview')?.classList.add('d-none');
            document.getElementById('priceChangeWarning')?.classList.add('d-none');
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (alertRefreshInterval) {
        clearInterval(alertRefreshInterval);
    }
});

