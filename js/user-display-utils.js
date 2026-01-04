// Highland Fresh POS - Enhanced User Display Utility
// Integrated with centralized authentication and session management
// Author: Highland Fresh Development Team
// Date: 2025
// Version: 2.1

/**
 * Initialize user display with enhanced session validation
 */
function initializeUserDisplay() {
    try {
        // Check if we're on the login page - skip authentication
        if (window.location.pathname.includes('login.html')) {
            return;
        }
        
        validateAndDisplayUser();
        
    } catch (error) {
        console.error('Error initializing user display:', error);
        handleAuthenticationError();
    }
}

/**
 * Validate session and display user information
 */
async function validateAndDisplayUser() {
    try {
        // First check local session storage
        const localUser = getCurrentUserFromSession();
        
        // Then validate with server
        const response = await axios.get(APIResponseHandler.getApiUrl('SessionStatusAPI.php'), {
            withCredentials: true,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = response.data;
        
        if (!data.success || !data.authenticated) {
            // Session invalid - redirect to login
            console.warn('Session validation failed - redirecting to login');
            redirectToLogin();
            return;
        }
        
        // Update user display with validated data
        const user = data.user;
        const displayName = user.full_name || user.username || 'User';
        updateUserWelcomeMessage(displayName, user.role);
        
        // Update local session storage with fresh data
        updateLocalUserSession(user);
        
        console.log('User display updated:', displayName, 'Role:', user.role);
        
    } catch (error) {
        console.error('Session validation error:', error);
        
        // Fall back to local session data if server is unreachable
        const localUser = getCurrentUserFromSession();
        if (localUser) {
            const displayName = localUser.full_name || localUser.username || 'User';
            updateUserWelcomeMessage(displayName, localUser.role);
            console.warn('Using cached user data due to validation error');
        } else {
            handleAuthenticationError();
        }
    }
}

/**
 * Get current user from session storage
 */
function getCurrentUserFromSession() {
    try {
        const userStr = sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

/**
 * Update local session storage with fresh user data
 */
function updateLocalUserSession(user) {
    try {
        sessionStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
        console.error('Error updating local user session:', error);
    }
}

/**
 * Update user welcome message with role information
 */
function updateUserWelcomeMessage(username, role = null) {
    const welcomeElement = document.getElementById('userWelcome');
    const currentUserElement = document.getElementById('currentUser');
    
    if (welcomeElement) {
        // Enhanced welcome message with role badge
        const roleDisplay = role ? getRoleDisplayBadge(role) : '';
        welcomeElement.innerHTML = `
            <i class="bi bi-person-circle me-1"></i>
            Welcome, <span id="currentUser">${escapeHtml(username)}</span>!
            ${roleDisplay}
        `;
    } else if (currentUserElement) {
        // Fallback if only currentUser element exists
        currentUserElement.textContent = username;
    }
}

/**
 * Get role display badge
 */
function getRoleDisplayBadge(role) {
    const roleConfig = {
        'Admin': { class: 'bg-danger', icon: 'bi-shield-fill-check', text: 'Administrator' },
        'Warehouse Staff': { class: 'bg-warning text-dark', icon: 'bi-boxes', text: 'Warehouse Staff' },
        'Cashier': { class: 'bg-success', icon: 'bi-cash-register', text: 'Sales Officer' },
        'Sales Officer': { class: 'bg-success', icon: 'bi-cash-register', text: 'Sales Officer' }
    };
    
    const config = roleConfig[role] || { class: 'bg-secondary', icon: 'bi-person', text: role };
    
    return `<span class="badge ${config.class} ms-2" style="font-size: 0.7em;">
        <i class="${config.icon} me-1"></i>${config.text}
    </span>`;
}

/**
 * Enhanced logout function with session cleanup
 */
function logout() {
    // Show logout confirmation modal
    const modal = document.getElementById('logoutModal');
    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } else {
        // Fallback to professional notification
        showUserError('Are you sure you want to logout? This will redirect you to the login page.', 'info');
        // Auto-logout after 3 seconds if no modal available
        setTimeout(() => performLogout(), 3000);
    }
}

/**
 * Perform the actual logout process
 */
function performLogout() {
    try {
        // Clear local storage
        sessionStorage.clear();
        localStorage.clear();

        // Notify server of logout
        axios.post('/api/LogoutAPI.php', {}, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).catch(error => {
            console.warn('Logout API call failed:', error);
        });

        // Redirect to login
        redirectToLogin();

    } catch (error) {
        console.error('Error during logout:', error);
        // Force redirect even if cleanup fails
        redirectToLogin();
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    window.location.href = '/html/login.html';
}

/**
 * Handle authentication errors
 */
function handleAuthenticationError() {
    console.warn('Authentication error - redirecting to login');
    redirectToLogin();
}

/**
 * Check if user has required role
 */
function hasRole(requiredRole) {
    const user = getCurrentUserFromSession();
    if (!user || !user.role) {
        return false;
    }
    
    // Admin has access to everything
    if (user.role === 'Admin') {
        return true;
    }
    
    // Handle array of roles
    if (Array.isArray(requiredRole)) {
        return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
}

/**
 * Require authentication - redirect if not authenticated
 */
function requireAuth() {
    const user = getCurrentUserFromSession();
    if (!user) {
        handleAuthenticationError();
        return false;
    }
    return true;
}

/**
 * Require specific role - show error if not authorized
 */
function requireRole(requiredRole, errorMessage = 'Insufficient privileges for this action') {
    if (!requireAuth()) {
        return false;
    }

    if (!hasRole(requiredRole)) {
        showUserError(errorMessage, 'error');
        return false;
    }

    return true;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Show user-friendly error message
 */
function showUserError(message, type = 'error') {
    // Try to use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }

    // Try to use production dashboard notification if available
    if (window.productionDashboard && window.productionDashboard.showErrorMessage) {
        if (type === 'error') {
            window.productionDashboard.showErrorMessage(message);
        } else {
            window.productionDashboard.showInfoMessage(message);
        }
        return;
    }

    // Try to use Bootstrap toast if available
    if (typeof bootstrap !== 'undefined' && document.querySelector('.toast-container')) {
        const toastContainer = document.querySelector('.toast-container') || createToastContainer();
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'info'} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-${type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                        ${escapeHtml(message)}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
        toast.show();
        return;
    }

    // Final fallback - create a professional styled notification
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    notification.innerHTML = `
        <strong>${type === 'error' ? 'Error' : 'Notice'}:</strong> ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

// Export functions for global access
window.initializeUserDisplay = initializeUserDisplay;
window.getCurrentUserFromSession = getCurrentUserFromSession;
window.updateUserWelcomeMessage = updateUserWelcomeMessage;
window.logout = logout;
window.performLogout = performLogout;
window.hasRole = hasRole;
window.requireAuth = requireAuth;
window.requireRole = requireRole;

// Add event listener for logout confirmation button
document.addEventListener('DOMContentLoaded', function() {
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', function() {
            // Hide the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('logoutModal'));
            if (modal) {
                modal.hide();
            }
            // Perform logout
            performLogout();
        });
    }
});
