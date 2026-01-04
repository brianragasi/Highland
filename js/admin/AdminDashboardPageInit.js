/**
 * Admin Dashboard Page Initialization Module
 * Handles dashboard statistics loading and page functionality for admin-dashboard.html
 * Highland Fresh Dairy Cooperative Management System
 */

class AdminDashboardManager {
    constructor() {
        this.init();
    }
    
    async init() {
        console.log('Initializing Admin Dashboard Manager...');
        
        try {
            // Load real Highland Fresh statistics
            await this.loadDashboardStats();
        } catch (error) {
            console.error('Error loading Highland Fresh dashboard stats:', error);
            // Show fallback message instead of fake numbers
            this.setStatValue('userCount', '0');
            this.setStatValue('productCount', '0');
            this.setStatValue('supplierCount', '0');
            this.setStatValue('monthlyRevenue', '₱0');
        }
    }
    
    setStatValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    async loadDashboardStats() {
        console.log('Loading Highland Fresh dashboard statistics...');
        
        try {
            const response = await axios.get('../api/DashboardStatsAPI.php');
            const result = response.data;
            
            if (result.success && result.data) {
                const data = result.data;
                
                console.log('Highland Fresh stats loaded:', data);
                
                // Update Highland Fresh real statistics
                this.setStatValue('userCount', data.users || 0);
                this.setStatValue('productCount', data.products || 0);
                this.setStatValue('supplierCount', data.suppliers || 0);
                
                // Format monthly sales in Philippine Peso
                const monthlySales = parseFloat(data.monthly_sales) || 0;
                const formattedSales = `₱${monthlySales.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`;
                this.setStatValue('monthlyRevenue', formattedSales);
            } else {
                console.warn('Highland Fresh API returned no data');
                // Show zeros if API call fails
                this.setStatValue('userCount', '0');
                this.setStatValue('productCount', '0');
                this.setStatValue('supplierCount', '0');
                this.setStatValue('monthlyRevenue', '₱0.00');
            }
        } catch (error) {
            console.error('Highland Fresh dashboard stats error:', error);
            // Show zeros on error
            this.setStatValue('userCount', '0');
            this.setStatValue('productCount', '0');
            this.setStatValue('supplierCount', '0');
            this.setStatValue('monthlyRevenue', '₱0.00');
        }
    }
}

// Main initialization function
function initializeAdminDashboardPage() {
    console.log('Admin Dashboard page initialization starting...');
    
    // Initialize common page utilities and check authentication
    const user = HighlandFreshPageUtils.initializePage({
        requiredRoles: ['Admin']
    });
    
    if (!user) return; // Authentication or authorization failed
    
    // Initialize Dashboard Manager (this handles user display)
    try {
        new DashboardManager();
        console.log('✅ Dashboard Manager initialized');
    } catch (error) {
        console.warn('DashboardManager not found, using common utilities only');
    }
    
    // Initialize Admin Dashboard Manager
    try {
        window.adminDashboardManager = new AdminDashboardManager();
        console.log('✅ Admin Dashboard Manager initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Admin Dashboard Manager:', error);
        alert('Error loading dashboard statistics. Please refresh the page or contact support.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAdminDashboardPage);
