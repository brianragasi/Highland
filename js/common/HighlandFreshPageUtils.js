/**
 * Highland Fresh - Common Page Utilities
 * Shared functionality used across multiple pages
 */

class HighlandFreshPageUtils {
    /**
     * Common logout function used across all pages
     */
    static logout() {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '../html/login.html';
    }

    /**
     * Initialize user display on any page
     */
    static initializeUserDisplay() {
        const user = getCurrentUserFromSession();
        if (user) {
            // Use full_name if available, fallback to username, then to 'User'
            const displayName = user.full_name || user.username || user.name || 'User';
            
            // Update user display elements
            const userElements = document.querySelectorAll('#currentUser, .current-user');
            userElements.forEach(element => {
                if (element) {
                    element.textContent = displayName;
                }
            });

            // Update welcome messages
            const welcomeElements = document.querySelectorAll('.user-welcome');
            welcomeElements.forEach(element => {
                if (element) {
                    element.textContent = `Welcome, ${displayName}!`;
                }
            });
        }
    }

    /**
     * Check if user is authenticated and redirect if not
     */
    static requireAuthentication() {
        const user = getCurrentUserFromSession();
        if (!user) {
            console.log('Not authenticated - redirecting to login');
            window.location.href = '../html/login.html';
            return false;
        }
        return user;
    }

    /**
     * Check if user has required role
     */
    static requireRole(allowedRoles) {
        const user = this.requireAuthentication();
        if (!user) return false;

        if (Array.isArray(allowedRoles)) {
            if (!allowedRoles.includes(user.role)) {
                alert(`Access denied. This page is only available to: ${allowedRoles.join(', ')}`);
                window.location.href = '../html/login.html';
                return false;
            }
        } else {
            if (user.role !== allowedRoles) {
                alert(`Access denied. This page is only available to ${allowedRoles} users.`);
                window.location.href = '../html/login.html';
                return false;
            }
        }
        return user;
    }

    /**
     * Show alert notification
     */
    static showAlert(type, message, autoRemove = true) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        
        const iconMap = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        
        const icon = iconMap[type] || 'info-circle';
        
        alertDiv.innerHTML = `
            <i class="bi bi-${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        if (autoRemove) {
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 5000);
        }
        
        return alertDiv;
    }

    /**
     * Setup common page event listeners
     */
    static setupCommonEventListeners() {
        // Setup logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn') || 
                e.target.closest('.logout-btn') ||
                e.target.getAttribute('onclick') === 'logout()') {
                e.preventDefault();
                this.logout();
            }
        });

        // Setup refresh buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('refresh-btn') || e.target.closest('.refresh-btn')) {
                e.preventDefault();
                window.location.reload();
            }
        });
    }

    /**
     * Format currency for Philippine Peso
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    }

    /**
     * Format date for Philippines locale
     */
    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-PH');
    }

    /**
     * Format date and time for Philippines locale
     */
    static formatDateTime(date) {
        return new Date(date).toLocaleString('en-PH');
    }

    /**
     * Debounce function for search inputs
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Common page initialization
     */
    static initializePage(options = {}) {
        // Setup common event listeners
        this.setupCommonEventListeners();
        
        // Initialize user display
        this.initializeUserDisplay();
        
        // Check authentication if required
        if (options.requireAuth !== false) {
            if (options.requiredRoles) {
                return this.requireRole(options.requiredRoles);
            } else {
                return this.requireAuthentication();
            }
        }
        
        return true;
    }
}

// Make functions available globally for backward compatibility
window.logout = () => HighlandFreshPageUtils.logout();
window.initializeUserDisplay = () => HighlandFreshPageUtils.initializeUserDisplay();

// Export for use in modules
window.HighlandFreshPageUtils = HighlandFreshPageUtils;
