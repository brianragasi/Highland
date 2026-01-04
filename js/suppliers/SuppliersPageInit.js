/**
 * Suppliers Page Initialization Module
 * Handles dairy supplier functionality and page initialization
 * Highland Fresh Dairy Cooperative Management System
 */

class SuppliersPageUtils {
    static initializeDairySupplierFields() {
        const supplierTypeSelect = document.getElementById('supplierType');
        const dairyFields = document.querySelectorAll('.dairy-fields');
        
        if (supplierTypeSelect) {
            supplierTypeSelect.addEventListener('change', function() {
                const isDairySupplier = this.value === 'Dairy Cooperative' || this.value === 'Individual Farm';
                
                dairyFields.forEach(fieldGroup => {
                    if (isDairySupplier) {
                        fieldGroup.style.display = 'flex';
                    } else {
                        fieldGroup.style.display = 'none';
                        // Clear dairy-specific field values when hidden
                        const inputs = fieldGroup.querySelectorAll('input, select, textarea');
                        inputs.forEach(input => {
                            if (input.type === 'checkbox') {
                                input.checked = false;
                            } else {
                                input.value = '';
                            }
                        });
                    }
                });
                
                // Handle cooperative code field visibility
                const cooperativeCodeEl = document.getElementById('cooperativeCode');
                if (cooperativeCodeEl) {
                    const cooperativeCodeGroup = cooperativeCodeEl.closest('.mb-3');
                    if (this.value === 'Dairy Cooperative') {
                        cooperativeCodeGroup.style.display = 'block';
                        cooperativeCodeEl.required = true;
                    } else {
                        cooperativeCodeGroup.style.display = 'none';
                        cooperativeCodeEl.required = false;
                        cooperativeCodeEl.value = '';
                    }
                }
            });
            
            // Trigger change event to set initial state
            supplierTypeSelect.dispatchEvent(new Event('change'));
        }
    }
    
    static setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.btn-outline-danger[onclick*="logout"]');
        if (logoutBtn) {
            logoutBtn.removeAttribute('onclick');
            logoutBtn.addEventListener('click', logout);
        }
        
        // Add supplier buttons
        const addSupplierBtns = document.querySelectorAll('[onclick*="openAddSupplierModal"]');
        addSupplierBtns.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', openAddSupplierModal);
        });
        
        // Save supplier button
        const saveSupplierBtn = document.getElementById('saveSupplierBtn');
        if (saveSupplierBtn) {
            saveSupplierBtn.removeAttribute('onclick');
            saveSupplierBtn.addEventListener('click', saveSupplier);
        }
        
        // Confirm delete button
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.removeAttribute('onclick');
            confirmDeleteBtn.addEventListener('click', confirmDeleteSupplier);
        }
    }
    
    static showInitializationError(error) {
        console.error('Failed to initialize supplier manager:', error);
        // Show error to user
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            const alertHtml = `
                <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header bg-danger text-white">
                        <strong class="me-auto">Initialization Error</strong>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body">
                        Failed to initialize supplier management. Please refresh the page.
                    </div>
                </div>
            `;
            alertContainer.innerHTML = alertHtml;
            const toast = new bootstrap.Toast(alertContainer.querySelector('.toast'));
            toast.show();
        }
    }
}

// Global functions for suppliers page
function logout() {
    HighlandFreshPageUtils.logout();
}

function openAddSupplierModal() {
    if (window.supplierManager) {
        window.supplierManager.openAddModal();
    }
}

function saveSupplier() {
    if (window.supplierManager) {
        window.supplierManager.saveSupplier();
    }
}

function confirmDeleteSupplier() {
    if (window.supplierManager) {
        window.supplierManager.confirmDelete();
    }
}

// Main initialization function
function initializeSuppliersPage() {
    console.log('DOM loaded, initializing supplier management...');
    
    // Initialize common page utilities and check authentication
    const user = HighlandFreshPageUtils.initializePage({
        requiredRoles: ['Admin', 'Warehouse Manager']
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
        window.supplierManager = new SupplierManager();
        supplierManager.init();
        console.log('Supplier manager initialized successfully');
        
        // Initialize dairy supplier type functionality
        SuppliersPageUtils.initializeDairySupplierFields();
        
        // Set up event listeners for buttons
        SuppliersPageUtils.setupEventListeners();
        
        console.log('✅ Suppliers page initialized successfully');
        
    } catch (error) {
        SuppliersPageUtils.showInitializationError(error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSuppliersPage);
