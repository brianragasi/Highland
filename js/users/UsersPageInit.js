/**
 * Users Page Initialization Module
 * Handles page initialization for users.html
 * Highland Fresh Dairy Cooperative Management System
 */

class UsersPageUtils {
    static setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.btn-outline-danger[onclick*="logout"]');
        if (logoutBtn) {
            logoutBtn.removeAttribute('onclick');
            logoutBtn.addEventListener('click', logout);
        }
        
        // Add user buttons
        const addUserBtns = document.querySelectorAll('[onclick*="openAddUserModal"]');
        addUserBtns.forEach(btn => {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', openAddUserModal);
        });
        
        // Save user button
        const saveUserBtn = document.getElementById('saveUserBtn');
        if (saveUserBtn) {
            saveUserBtn.removeAttribute('onclick');
            saveUserBtn.addEventListener('click', saveUser);
        }
        
        // Confirm delete button
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.removeAttribute('onclick');
            confirmDeleteBtn.addEventListener('click', confirmDeleteUser);
        }
    }
}

// Global functions for users page
function logout() {
    HighlandFreshPageUtils.logout();
}

function openAddUserModal() {
    if (window.userManager) {
        window.userManager.openAddModal();
    }
}

function saveUser() {
    if (window.userManager) {
        window.userManager.saveUser();
    }
}

function confirmDeleteUser() {
    if (window.userManager) {
        window.userManager.confirmDelete();
    }
}

// Main initialization function
function initializeUsersPage() {
    console.log('DOM loaded, initializing user management...');
    
    // Initialize Dashboard Manager (handles authentication and user display)
    try {
        new DashboardManager();
        console.log('✅ Dashboard Manager initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Dashboard Manager:', error);
    }
    
    // Simple authentication check - just try to initialize and let the API handle auth
    try {
        window.userManager = new UserManager();
        window.userManager.init();
        
        // Set up event listeners for buttons
        UsersPageUtils.setupEventListeners();
        
        console.log('✅ User manager initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize user manager:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUsersPage);
