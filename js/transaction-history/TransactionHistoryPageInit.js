/**
 * Transaction History Page Initialization Module
 * Handles transaction history functionality and page initialization
 * Highland Fresh Dairy Cooperative Management System
 */

class TransactionHistoryPageUtils {
    static setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.btn-outline-danger[onclick*="logout"]');
        if (logoutBtn) {
            logoutBtn.removeAttribute('onclick');
            logoutBtn.addEventListener('click', logout);
        }
        
        // Refresh transactions button
        const refreshBtn = document.querySelector('[onclick*="refreshTransactions"]');
        if (refreshBtn) {
            refreshBtn.removeAttribute('onclick');
            refreshBtn.addEventListener('click', refreshTransactions);
        }
        
        // Clear filters button
        const clearFiltersBtn = document.querySelector('[onclick*="clearFilters"]');
        if (clearFiltersBtn) {
            clearFiltersBtn.removeAttribute('onclick');
            clearFiltersBtn.addEventListener('click', clearFilters);
        }
        
        // Export transactions button
        const exportBtn = document.querySelector('[onclick*="exportTransactions"]');
        if (exportBtn) {
            exportBtn.removeAttribute('onclick');
            exportBtn.addEventListener('click', exportTransactions);
        }
        
        // Print receipt button
        const printReceiptBtn = document.querySelector('[onclick*="printReceipt"]');
        if (printReceiptBtn) {
            printReceiptBtn.removeAttribute('onclick');
            printReceiptBtn.addEventListener('click', printReceipt);
        }
    }
    
    static showInitializationError(error) {
        console.error('Failed to initialize transaction history manager:', error);
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            const alertHtml = `
                <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header bg-danger text-white">
                        <strong class="me-auto">Initialization Error</strong>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body">
                        Failed to initialize transaction history. Please refresh the page.
                    </div>
                </div>
            `;
            alertContainer.innerHTML = alertHtml;
            const toast = new bootstrap.Toast(alertContainer.querySelector('.toast'));
            toast.show();
        }
    }
}

// Global functions for transaction history page
function logout() {
    HighlandFreshPageUtils.logout();
}

function refreshTransactions() {
    if (window.transactionHistory) {
        window.transactionHistory.refreshTransactions();
    }
}

function clearFilters() {
    if (window.transactionHistory) {
        window.transactionHistory.clearFilters();
    }
}

function exportTransactions() {
    if (window.transactionHistory) {
        window.transactionHistory.exportTransactions();
    }
}

function printReceipt() {
    if (window.transactionHistory) {
        window.transactionHistory.printReceipt();
    }
}

// Main initialization function
function initializeTransactionHistoryPage() {
    console.log('DOM loaded, initializing transaction history...');
    
    // Initialize common page utilities and check authentication
    const user = HighlandFreshPageUtils.initializePage({
        requiredRoles: ['Admin', 'Sales Officer']
    });
    
    if (!user) return; // Authentication or authorization failed
    
    // Initialize Dashboard Manager (handles authentication and user display)
    try {
        new DashboardManager();
        console.log('✅ Dashboard Manager initialized');
    } catch (error) {
        console.warn('DashboardManager not found, using common utilities only');
    }
    
    try {
        // Initialize transaction history manager
        if (typeof TransactionHistoryManager !== 'undefined') {
            window.transactionHistory = new TransactionHistoryManager();
            window.transactionHistory.init();
            console.log('Transaction history manager initialized successfully');
        }
        
        // Set up event listeners for buttons
        TransactionHistoryPageUtils.setupEventListeners();
        
        console.log('✅ Transaction history page initialized successfully');
        
    } catch (error) {
        TransactionHistoryPageUtils.showInitializationError(error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTransactionHistoryPage);
