/**
 * Production Dashboard Page Initialization Module
 * Handles authentication and page initialization for production-dashboard.html
 * Highland Fresh Dairy Cooperative Management System
 */

class ProductionDashboardPageUtils {
    static checkProductionManagerAccess() {
        console.log('Checking production supervisor access...');
        const currentUser = getCurrentUserFromSession();
        
        if (!currentUser || !currentUser.role) {
            console.log('No user found or role missing, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        
        const allowedRoles = ['Admin', 'Production Supervisor'];
        if (!allowedRoles.includes(currentUser.role)) {
            // Use a more professional notification instead of alert
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
            errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            errorDiv.innerHTML = `
                <strong>Access Denied</strong><br>
                Production Supervisor or Admin role required
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            document.body.appendChild(errorDiv);

            // Redirect after showing the message
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
            return false;
        }
        
        console.log(`Access granted for user: ${currentUser.username} (${currentUser.role})`);
        return true;
    }
}

// Main initialization function
function initializeProductionDashboardPage() {
    console.log('Production Dashboard page initialization starting...');
    
    // Initialize common page utilities and check authentication
    const user = HighlandFreshPageUtils.initializePage({
        requiredRoles: ['Admin', 'Production Supervisor']
    });
    
    if (!user) return; // Authentication or authorization failed
    
    // Initialize Production Dashboard
    try {
        window.productionDashboard = new ProductionDashboard();
        console.log('✅ Production Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Production Dashboard:', error);
        alert('Error initializing production dashboard. Please refresh the page or contact support.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeProductionDashboardPage);
