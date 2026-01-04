/**
 * Transaction History Page Initialization Module
 * Handles authentication and page initialization for transaction-history.html
 * Highland Fresh Dairy Cooperative Management System
 */

class TransactionHistoryPageUtils {
    /**
     * Check user authentication - same approach as POS system
     */
    static async checkAuth() {
        try {
            // First check session storage using getLoggedInUser function
            let user = getLoggedInUser();
            let sessionStorageValid = user && user.role;
            
            // If session storage is empty or invalid, check backend session
            if (!sessionStorageValid) {
                console.log('Session storage empty/invalid, checking backend session...');
                try {
                    const response = await axios.get('../api/SessionStatusAPI.php', {
                        withCredentials: true
                    });
                    const sessionStatus = response.data;
                    if (sessionStatus.success && sessionStatus.authenticated) {
                        // Backend session is valid, update session storage
                        user = sessionStatus.user;
                        sessionStorage.setItem('user', JSON.stringify(user));
                        console.log('Backend session found, updated session storage:', user);
                    } else {
                        console.log('No valid backend session, redirecting to login');
                        alert('Your session has expired. Please login again to access the Transaction History page.');
                        window.location.href = 'login.html';
                        return null;
                    }
                } catch (error) {
                    console.error('Failed to check backend session:', error);
                    alert('Unable to verify your session. Please login again.');
                    window.location.href = 'login.html';
                    return null;
                }
            }
            
            if (!user) {
                console.log('No user data found, redirecting to login');
                alert('Your session has expired. Please login again to access the Transaction History page.');
                window.location.href = 'login.html';
                return null;
            }
            
            console.log('=== Role Authorization Check ===');
            console.log('User role from session:', user.role);
            console.log('Expected roles: Sales Officer or Admin');
            
            // Check if user has Sales Officer or admin role
            if (user.role !== 'Sales Officer' && user.role !== 'Admin') {
                console.log('❌ Access denied for role:', user.role);
                alert(`Access denied. Your role is: "${user.role}". This page is for Sales Officers and Admins only. Please contact your administrator if you believe this is an error.`);
                window.location.href = 'cashier-dashboard.html';
                return null;
            }
            
            console.log('✅ User authenticated and authorized');
            console.log('=== User Info ===');
            console.log('Username:', user.username);
            console.log('Role:', user.role);
            console.log('User ID:', user.id);
            
            // Set username in navbar
            const currentUserSpan = document.getElementById('currentUser');
            if (currentUserSpan) {
                currentUserSpan.textContent = user.username || 'User';
            }
            
            return user;
        } catch (error) {
            console.error('Auth check failed:', error);
            alert('Authentication error. Please login again.');
            window.location.href = 'login.html';
            return null;
        }
    }
    
    static showInitializationError() {
        const loadingState = document.querySelector('#loadingState');
        if (loadingState) {
            loadingState.innerHTML = 
                '<div class="alert alert-danger">Failed to initialize Transaction History. Please refresh the page or contact support.</div>';
        }
    }
}

// Logout function
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Call logout API to clear backend session
            await axios.post('../api/LogoutAPI.php');
        } catch (error) {
            console.error('Logout API error:', error);
        }
        // Clear session storage
        sessionStorage.clear();
        // Redirect to login
        window.location.href = 'login.html';
    }
}

// Main initialization function
async function initializeTransactionHistoryPage() {
    console.log('=== Transaction History Page Initialization ===');
    
    // Check authentication using the same method as POS system
    const user = await TransactionHistoryPageUtils.checkAuth();
    if (!user) return; // Authentication failed
    
    // Wait for jQuery and plugins to load
    setTimeout(() => {
        // Initialize the transaction history page
        try {
            console.log('Initializing ReceiptManager...');
            ReceiptManager.init();
            
            console.log('Initializing TransactionHistory module...');
            TransactionHistory.init();
            console.log('✅ Transaction History initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing TransactionHistory:', error);
            TransactionHistoryPageUtils.showInitializationError();
        }
    }, 100); // Small delay to ensure jQuery is ready
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTransactionHistoryPage);
