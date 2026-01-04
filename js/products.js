let productManager = null;
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing product management system...');
    try {
        productManager = new ProductManager();
        console.log('Product management system initialized successfully');
        window.productManager = productManager;
    } catch (error) {
        console.error('Failed to initialize product management system:', error);
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer) {
            const alert = document.createElement('div');
            alert.className = 'toast align-items-center text-white bg-danger border-0';
            alert.setAttribute('role', 'alert');
            alert.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load products. Please refresh the page.
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            `;
            alertContainer.appendChild(alert);
            const toast = new bootstrap.Toast(alert);
            toast.show();
        }
    }
});
window.showAlert = function(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.log(`${type.toUpperCase()}: ${message}`);
        return;
    }
    const typeMap = {
        'success': 'bg-success',
        'error': 'bg-danger', 
        'danger': 'bg-danger',
        'warning': 'bg-warning',
        'info': 'bg-info'
    };
    const bgClass = typeMap[type] || 'bg-info';
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white border-0 ' + bgClass;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    const iconMap = {
        'success': 'bi-check-circle-fill',
        'error': 'bi-exclamation-triangle-fill',
        'danger': 'bi-exclamation-triangle-fill', 
        'warning': 'bi-exclamation-triangle-fill',
        'info': 'bi-info-circle-fill'
    };
    const iconClass = iconMap[type] || 'bi-info-circle-fill';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="${iconClass} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    alertContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 4000
    });
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
};
window.openAddProductModal = function() {
    if (productManager) {
        productManager.openAddProductModal();
    }
};
window.editProduct = function(productId) {
    if (productManager) {
        productManager.editProduct(productId);
    }
};
window.deleteProduct = function(productId) {
    if (productManager) {
        productManager.deleteProduct(productId);
    }
};
window.logout = function() {
    // Use the enhanced logout function from user-display-utils.js
    if (typeof logout === 'function') {
        logout();
    } else {
        // Fallback if user-display-utils.js is not loaded
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <strong>Logging out...</strong><br>
            You will be redirected to the login page.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            const logoutUrl = APIResponseHandler.getApiUrl('LogoutAPI.php');
            window.location.href = logoutUrl;
        }, 1000);
    }
};