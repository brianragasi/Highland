/**
 * Cashier Dashboard Page Initialization Module
 * Handles authentication and dashboard statistics loading
 * Highland Fresh Dairy Cooperative Management System
 */

class CashierDashboardPageUtils {
    static setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.btn-outline-danger[onclick*="logout"]');
        if (logoutBtn) {
            logoutBtn.removeAttribute('onclick');
            logoutBtn.addEventListener('click', logout);
        }
        
        // POS navigation card
        const posCard = document.querySelector('[onclick*="pos.html"]');
        if (posCard) {
            posCard.removeAttribute('onclick');
            posCard.style.cursor = 'pointer';
            posCard.addEventListener('click', () => {
                window.location.href = 'pos.html';
            });
        }
        
        // Transaction History navigation card
        const transactionCard = document.querySelector('[onclick*="transaction-history.html"]');
        if (transactionCard) {
            transactionCard.removeAttribute('onclick');
            transactionCard.style.cursor = 'pointer';
            transactionCard.addEventListener('click', () => {
                window.location.href = 'transaction-history.html';
            });
        }
    }
}

class CashierDashboardManager {
    constructor() {
        this.init();
    }
    
    async init() {
        console.log('Initializing Cashier Dashboard...');
        
        // Check authentication
        await this.checkAuth();
        
        // Load real dashboard data
        await this.loadTodayStats();
    }
    
    async checkAuth() {
        try {
            let user = getLoggedInUser();
            let sessionStorageValid = user && user.role;

            if (!sessionStorageValid) {
                // Check server-side session
                const response = await axios.get('../api/SessionStatusAPI.php', { 
                    withCredentials: true 
                });
                const sessionStatus = response.data;
                
                if (sessionStatus.success && sessionStatus.authenticated) {
                    user = sessionStatus.user;
                    sessionStorage.setItem('user', JSON.stringify(user));
                } else {
                    console.log('Session not valid, redirecting to login');
                    alert('Session expired. Please login again.');
                    window.location.href = 'login.html';
                    return;
                }
            }

            if (!user || (user.role !== 'Sales Officer' && user.role !== 'Admin')) {
                console.log('User role not authorized:', user ? user.role : 'no user');
                alert('Access denied. Sales Officer or Admin access required.');
                window.location.href = 'login.html';
                return;
            }

            const userWelcomeEl = document.getElementById('userWelcome');
            if (userWelcomeEl) {
                userWelcomeEl.innerHTML = `<i class="bi bi-person-circle me-1"></i>Welcome, ${user.username}`;
            }
            console.log('User authenticated:', user.username, user.role);
        } catch (error) {
            console.error('Auth check failed:', error);
            alert('Authentication error. Please login again.');
            window.location.href = 'login.html';
        }
    }

    async loadTodayStats() {
        try {
            // Get today's sales data
            const today = new Date().toISOString().split('T')[0];
            const response = await axios.get(`../api/SalesAPI.php?operation=getTodayStats&date=${today}`, {
                withCredentials: true
            });
            
            if (response.status === 200) {
                const result = response.data;
                if (result.success && result.data) {
                    const stats = result.data;
                    
                    // Update with real data
                    this.updateStatElement('todaySales', `₱${parseFloat(stats.total_sales || 0).toLocaleString('en-PH', {minimumFractionDigits: 2})}`);
                    this.updateStatElement('todayTransactions', (stats.transaction_count || 0).toString());
                    this.updateStatElement('itemsSold', (stats.items_sold || 0).toString());
                    
                    // Calculate average transaction
                    const avgTransaction = stats.transaction_count > 0 ? (stats.total_sales / stats.transaction_count) : 0;
                    this.updateStatElement('avgTransaction', `₱${avgTransaction.toLocaleString('en-PH', {minimumFractionDigits: 2})}`);
                }
            } else {
                console.log('Could not load today stats, using defaults');
                this.setDefaultStats();
            }
        } catch (error) {
            console.error('Error loading today stats:', error);
            this.setDefaultStats();
        }
    }
    
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    setDefaultStats() {
        this.updateStatElement('todaySales', '₱0.00');
        this.updateStatElement('todayTransactions', '0');
        this.updateStatElement('avgTransaction', '₱0.00');
        this.updateStatElement('itemsSold', '0');
    }
}

// Logout function
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await axios.post('../api/LogoutAPI.php');
            sessionStorage.clear();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'login.html';
        }
    }
}

// Main initialization function
function initializeCashierDashboardPage() {
    console.log('Cashier Dashboard page initialization starting...');
    
    try {
        // Initialize Cashier Dashboard Manager
        window.cashierDashboardManager = new CashierDashboardManager();
        
        // Set up event listeners for navigation
        CashierDashboardPageUtils.setupEventListeners();
        
        console.log('✅ Cashier Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Cashier Dashboard:', error);
        alert('Error initializing dashboard. Please refresh the page or contact support.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeCashierDashboardPage);
