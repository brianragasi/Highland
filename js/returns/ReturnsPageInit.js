/**
 * Returns Page Initialization Module
 * Handles authentication, alerts, and page initialization for returns.html
 * Highland Fresh Dairy Cooperative Management System
 */

class ReturnsPageUtils {
    static setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.btn-outline-danger[onclick*="logout"]');
        if (logoutBtn) {
            logoutBtn.removeAttribute('onclick');
            logoutBtn.addEventListener('click', logout);
        }
    }
    
    static async initializeReturnsPage() {
        try {
            // Check if user is authenticated
            if (!isAuthenticated()) {
                this.showError('Please log in to access returns.');
                window.location.href = '../html/login.html';
                return;
            }

            const user = getLoggedInUser();
            console.log('Current user from sessionStorage:', user);
            
            if (!user) {
                this.showError('Failed to get user information. Please log in again.');
                window.location.href = '../html/login.html';
                return;
            }

            // Verify session with server to ensure data is current
            try {
                const response = await axios.get('../api/SessionStatusAPI.php', { 
                    withCredentials: true 
                });
                const sessionStatus = response.data;
                console.log('Server session status:', sessionStatus);
                
                if (sessionStatus.success && sessionStatus.authenticated) {
                    // Update local session with server data if different
                    if (sessionStatus.user.username !== user.username) {
                        console.log('Session mismatch detected, updating local storage');
                        sessionStorage.setItem('user', JSON.stringify(sessionStatus.user));
                        window.location.reload(); // Reload to reflect changes
                        return;
                    }
                } else {
                    console.log('Server session not valid, redirecting to login');
                    sessionStorage.clear();
                    window.location.href = '../html/login.html';
                    return;
                }
            } catch (sessionError) {
                console.error('Session validation error:', sessionError);
                // Continue with local session if server check fails
            }
            
            // Check user role (admin, sales officer, or warehouse staff only)
            const userRole = user.role || '';
            if (!['Admin', 'Sales Officer', 'Warehouse Staff'].includes(userRole)) {
                this.showError('Access denied. Only Admin, Sales Officer, and Warehouse Staff users can access returns.');
                window.location.href = '../html/admin-dashboard.html';
                return;
            }
            
            // Update welcome message
            this.updateWelcomeMessage();

            window.returnsManager = new ReturnsManager();
            window.returnsManager.init();
            
            // Set up event listeners for buttons
            this.setupEventListeners();
            
            console.log('Returns system initialized successfully');
            
        } catch (error) {
            console.error('Error initializing returns page:', error);
            this.showError('Failed to initialize returns page. Please refresh and try again.');
        }
    }
    
    static updateWelcomeMessage() {
        const user = getLoggedInUser();
        console.log('Updating welcome message with user:', user);
        
        const userWelcomeEl = document.getElementById('userWelcome');
        if (userWelcomeEl) {
            if (user) {
                const displayName = user.username || 'User';
                console.log('Setting welcome message for:', displayName);
                userWelcomeEl.innerHTML = `<i class="bi bi-person-circle me-1"></i>Welcome, ${displayName}`;
            } else {
                console.log('No user found, setting default welcome message');
                userWelcomeEl.innerHTML = `<i class="bi bi-person-circle me-1"></i>Welcome, Guest`;
            }
        }
    }
    
    static showAlert(type, message, duration = 5000) {
        const alertContainer = document.createElement('div');
        alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertContainer.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertContainer);
        
        setTimeout(() => {
            if (alertContainer && alertContainer.parentNode) {
                alertContainer.remove();
            }
        }, duration);
    }

    static showSuccess(message, duration = 5000) {
        this.showAlert('success', `<i class="bi bi-check-circle me-2"></i>${message}`, duration);
    }

    static showError(message, duration = 7000) {
        this.showAlert('danger', `<i class="bi bi-exclamation-triangle me-2"></i>${message}`, duration);
    }

    static showInfo(message, duration = 5000) {
        this.showAlert('info', `<i class="bi bi-info-circle me-2"></i>${message}`, duration);
    }

    static showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('.visually-hidden').textContent = message;
            overlay.classList.remove('d-none');
        }
    }

    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('d-none');
        }
    }
}

// Global utility functions
function showSuccess(message, duration = 5000) {
    ReturnsPageUtils.showSuccess(message, duration);
}

function showError(message, duration = 7000) {
    ReturnsPageUtils.showError(message, duration);
}

function showInfo(message, duration = 5000) {
    ReturnsPageUtils.showInfo(message, duration);
}

function showLoading(message = 'Processing...') {
    ReturnsPageUtils.showLoading(message);
}

function hideLoading() {
    ReturnsPageUtils.hideLoading();
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        authLogout();
    }
}

// Make functions available globally
window.showSuccess = showSuccess;
window.showError = showError;
window.showInfo = showInfo;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.logout = logout;

// Main initialization function
function initializeReturnsPage() {
    console.log('Returns page initialization starting...');
    ReturnsPageUtils.initializeReturnsPage();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeReturnsPage);
