class DashboardManager {
    constructor() {
        this.checkAuthentication();
        this.displayUserInfo();
        this.initializeLogout();
    }
    checkAuthentication() {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        const currentPage = window.location.pathname.split('/').pop();
        const allowedPages = this.getAllowedPages(user.role);
        if (!allowedPages.includes(currentPage)) {
            const defaultPage = this.getDashboardPage(user.role);
            window.location.href = defaultPage;
        }
    }
    getCurrentUser() {
        try {
            const userStr = sessionStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    getDashboardPage(role) {
        switch (role) {
            case 'Admin':
                return 'admin-dashboard.html';
            case 'Cashier':
            case 'Sales Officer':
                return 'sales-dashboard.html';
            case 'Warehouse Staff':
                return 'warehouse-staff-dashboard.html';
            case 'Production Supervisor':
                return 'production-dashboard.html';
            case 'Quality Control Officer':
            case 'QC Officer':
                return 'qc-dashboard.html';
            case 'Finance Officer':
                return 'finance-dashboard.html';
            default:
                return 'login.html';
        }
    }
    getAllowedPages(role) {
        switch (role) {
            case 'Admin':
                return ['admin-dashboard.html', 'products.html', 'suppliers.html', 'users.html', 'returns.html', 'qc-dashboard.html', 'production-dashboard.html', 'sales-dashboard.html', 'warehouse-staff-dashboard.html', 'finance-dashboard.html'];
            case 'Cashier':
            case 'Sales Officer':
                return ['sales-dashboard.html', 'sales-orders.html', 'sales-order-form.html', 'transaction-history.html', 'returns.html', 'dispatch-order.html'];
            case 'Warehouse Staff':
                return ['warehouse-staff-dashboard.html', 'dispatch-order.html', 'products.html', 'sales-orders.html', 'material-issuance.html'];
            case 'Production Supervisor':
                return ['production-dashboard.html', 'production-reports.html', 'material-issuance.html', 'qc-dashboard.html'];
            case 'Quality Control Officer':
            case 'QC Officer':
                return ['qc-dashboard.html'];
            case 'Finance Officer':
                return ['finance-dashboard.html', 'transaction-history.html'];
            default:
                return ['login.html'];
        }
    }
    async displayUserInfo() {
        const user = this.getCurrentUser();
        if (user) {
            // Validate that the session user still exists in database
            try {
                const response = await axios.post(APIResponseHandler.getApiUrl('SessionStatusAPI.php'), {}, {
                    withCredentials: true
                });
                const sessionData = response.data;

                if (!sessionData.success || !sessionData.authenticated) {
                    console.warn('Session validation failed, redirecting to login');
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }

                // Update welcome message with validated user data
                const welcomeElement = document.getElementById('userWelcome');
                if (welcomeElement) {
                    const displayName = sessionData.user.username || user.username;
                    welcomeElement.innerHTML = `<i class="bi bi-person-circle me-1"></i>Welcome, ${displayName}!`;
                }
            } catch (error) {
                console.error('Session validation error:', error);
                // Fall back to session storage data
                const welcomeElement = document.getElementById('userWelcome');
                if (welcomeElement) {
                    welcomeElement.innerHTML = `<i class="bi bi-person-circle me-1"></i>Welcome, ${user.username}!`;
                }
            }
        }
    }
    initializeLogout() {
        window.logout = () => this.logout();
    }
    async logout() {
        try {
            sessionStorage.removeItem('user');
            await this.callLogoutEndpoint();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'login.html';
        }
    }
    async callLogoutEndpoint() {
        try {
            const response = await axios.post(APIResponseHandler.getApiUrl('LogoutAPI.php'), {}, {
                withCredentials: true
            });
            return response.status === 200;
        } catch (error) {
            console.error('Server logout failed:', error);
            return false;
        }
    }
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}
class SessionTimeoutChecker {
    constructor(timeoutMinutes = 30) {
        this.timeoutMinutes = timeoutMinutes;
        this.warningMinutes = 5;
        this.checkInterval = 60000;
        this.startChecking();
    }
    startChecking() {
        setInterval(() => {
            this.checkSessionTimeout();
        }, this.checkInterval);
    }
    checkSessionTimeout() {
        const user = sessionStorage.getItem('user');
        if (!user) return;
        const loginTime = new Date().getTime() - (this.timeoutMinutes * 60 * 1000);
    }
    showTimeoutWarning() {
        if (confirm(`Your session will expire in ${this.warningMinutes} minutes. Do you want to extend your session?`)) {
            console.log('Session extended');
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
    new SessionTimeoutChecker();
});
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const dashboardManager = new DashboardManager();
    }
});