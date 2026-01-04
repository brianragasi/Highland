/**
 * POS Page Initialization Module
 * Handles authentication, DOM validation, keyboard shortcuts, and page initialization
 * Highland Fresh Dairy Cooperative Management System
 */

class POSPageUtils {
    static checkRequiredElements() {
        const requiredElements = [
            'barcodeInput',
            'productGrid',
            'loadingProducts',
            'emptyProducts', 
            'cartItems',
            'itemCount',
            'cartTotals',
            'subtotal',
            'tax',
            'finalTotal',
            'paymentReceived',
            'changeSection',
            'changeAmount',
            'processSaleBtn'
        ];

        console.log('=== DOM Element Check ===');
        let missingElements = [];
        
        requiredElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (!element) {
                missingElements.push(elementId);
                console.error(`❌ Missing element: ${elementId}`);
            } else {
                console.log(`✅ Found element: ${elementId}`);
            }
        });

        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements);
            this.showError('POS interface elements missing. Please refresh the page.');
        } else {
            console.log('✅ All required DOM elements found');
        }
        
        return missingElements.length === 0;
    }
    
    static async checkAuth() {
        try {
            let user = getLoggedInUser();
            console.log('Current user from sessionStorage:', user);
            let sessionStorageValid = user && user.role;

            if (!sessionStorageValid) {
                const response = await axios.get('../api/SessionStatusAPI.php', { 
                    withCredentials: true 
                });
                const sessionStatus = response.data;
                console.log('Server session status:', sessionStatus);
                
                if (sessionStatus.success && sessionStatus.authenticated) {
                    user = sessionStatus.user;
                    sessionStorage.setItem('user', JSON.stringify(user));
                } else {
                    alert('Session expired. Please login again.');
                    window.location.href = 'login.html';
                    return null;
                }
            } else {
                // Verify session with server to ensure data is current
                try {
                    const response = await axios.get('../api/SessionStatusAPI.php', { 
                        withCredentials: true 
                    });
                    const sessionStatus = response.data;
                    console.log('Server session status verification:', sessionStatus);
                    
                    if (sessionStatus.success && sessionStatus.authenticated) {
                        // Update local session with server data if different
                        if (sessionStatus.user.username !== user.username) {
                            console.log('Session mismatch detected, updating local storage');
                            sessionStorage.setItem('user', JSON.stringify(sessionStatus.user));
                            user = sessionStatus.user; // Update current user reference
                        }
                    } else {
                        console.log('Server session not valid, redirecting to login');
                        sessionStorage.clear();
                        alert('Session expired. Please login again.');
                        window.location.href = 'login.html';
                        return null;
                    }
                } catch (sessionError) {
                    console.error('Session validation error:', sessionError);
                    // Continue with local session if server check fails
                }
            }

            if (!user || (user.role !== 'Sales Officer' && user.role !== 'Admin')) {
                alert('Access denied. Sales Officer or Admin access required.');
                window.location.href = 'login.html';
                return null;
            }

            console.log('Setting currentUser display to:', user.username);
            const currentUserEl = document.getElementById('currentUser');
            if (currentUserEl) {
                currentUserEl.textContent = user.username;
            }
            console.log('✅ User authenticated:', user.username, user.role);
            
            return user;
        } catch (error) {
            console.error('Authentication failed:', error);
            window.location.href = 'login.html';
            return null;
        }
    }
    
    static updateCurrentTime() {
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            currentTimeEl.textContent = new Date().toLocaleTimeString();
        }
    }
    
    static setupKeyboardShortcuts() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // F1 - Focus barcode scanner
            if (e.key === 'F1') {
                e.preventDefault();
                const barcodeInput = document.getElementById('barcodeInput');
                if (barcodeInput) barcodeInput.focus();
            }
            // F2 - Process sale
            if (e.key === 'F2') {
                e.preventDefault();
                const processSaleBtn = document.getElementById('processSaleBtn');
                if (processSaleBtn && !processSaleBtn.disabled) {
                    if (window.posManager) {
                        window.posManager.processSale();
                    }
                }
            }
            // F3 - Clear cart
            if (e.key === 'F3') {
                e.preventDefault();
                if (confirm('Clear cart?')) {
                    if (window.posManager) {
                        window.posManager.clearCart();
                    }
                }
            }
            // F4 - Go to Returns
            if (e.key === 'F4') {
                e.preventDefault();
                window.location.href = 'returns.html';
            }
            // Escape - Focus barcode input
            if (e.key === 'Escape') {
                const barcodeInput = document.getElementById('barcodeInput');
                if (barcodeInput) barcodeInput.focus();
            }
        });
    }
    
    static setupEventListeners() {
        // Logout button
        const logoutBtn = document.querySelector('.btn-outline-light[onclick*="logout"]');
        if (logoutBtn) {
            logoutBtn.removeAttribute('onclick');
            logoutBtn.addEventListener('click', logout);
        }
        
        // Clear cart button
        const clearCartBtn = document.querySelector('[onclick*="clearCart"]');
        if (clearCartBtn) {
            clearCartBtn.removeAttribute('onclick');
            clearCartBtn.addEventListener('click', () => {
                if (window.posManager) {
                    window.posManager.clearCart();
                }
            });
        }
        
        // Hold transaction button
        const holdTransactionBtn = document.querySelector('[onclick*="holdTransaction"]');
        if (holdTransactionBtn) {
            holdTransactionBtn.removeAttribute('onclick');
            holdTransactionBtn.addEventListener('click', () => {
                if (window.posManager) {
                    window.posManager.holdTransaction();
                }
            });
        }
        
        // Quick payment buttons
        const exactBtn = document.querySelector('[onclick*="setExactPayment"]');
        if (exactBtn) {
            exactBtn.removeAttribute('onclick');
            exactBtn.addEventListener('click', () => {
                if (window.posManager) {
                    window.posManager.setExactPayment();
                }
            });
        }
        
        // Payment amount buttons
        const paymentButtons = [
            { selector: '[onclick*="addToPayment(20)"]', amount: 20 },
            { selector: '[onclick*="addToPayment(50)"]', amount: 50 },
            { selector: '[onclick*="addToPayment(100)"]', amount: 100 },
            { selector: '[onclick*="addToPayment(500)"]', amount: 500 },
            { selector: '[onclick*="addToPayment(1000)"]', amount: 1000 }
        ];
        
        paymentButtons.forEach(btn => {
            const element = document.querySelector(btn.selector);
            if (element) {
                element.removeAttribute('onclick');
                element.addEventListener('click', () => {
                    if (window.posManager) {
                        window.posManager.addToPayment(btn.amount);
                    }
                });
            }
        });
        
        // Process sale button
        const processSaleBtn = document.getElementById('processSaleBtn');
        if (processSaleBtn) {
            processSaleBtn.removeAttribute('onclick');
            processSaleBtn.addEventListener('click', () => {
                if (window.posManager) {
                    window.posManager.processSale();
                }
            });
        }
        
        // Hide status button
        const hideStatusBtn = document.querySelector('[onclick*="hideStatus"]');
        if (hideStatusBtn) {
            hideStatusBtn.removeAttribute('onclick');
            hideStatusBtn.addEventListener('click', () => {
                if (window.posManager) {
                    window.posManager.hideStatus();
                }
            });
        }
        
        // Print receipt button
        const printReceiptBtn = document.querySelector('[onclick*="printReceipt"]');
        if (printReceiptBtn) {
            printReceiptBtn.removeAttribute('onclick');
            printReceiptBtn.addEventListener('click', () => {
                if (window.posManager) {
                    window.posManager.printReceipt();
                }
            });
        }
    }
    
    static showError(message) {
        console.error(message);
        // You can implement a more sophisticated error display here
        alert(message);
    }
}

// Global logout function for POS
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
async function initializePOSPage() {
    console.log('=== Highland Fresh POS System Initialization ===');
    
    // Check all required DOM elements first
    if (!POSPageUtils.checkRequiredElements()) {
        return; // Cannot proceed without required elements
    }
    
    // Check authentication first
    const user = await POSPageUtils.checkAuth();
    if (!user) {
        return; // Authentication failed
    }
    
    try {
        // Initialize POS components
        console.log('Initializing POS components...');
        
        // Initialize POS Manager
        window.posManager = new POSManager();
        
        // Initialize Product Manager
        window.posProductManager = new POSProductManager(window.posManager);
        
        // Load products
        await window.posProductManager.loadHighlandFreshProducts();
        
        // Setup keyboard shortcuts
        POSPageUtils.setupKeyboardShortcuts();
        
        // Setup event listeners for buttons
        POSPageUtils.setupEventListeners();
        
        // Update current time and set interval
        POSPageUtils.updateCurrentTime();
        setInterval(POSPageUtils.updateCurrentTime, 1000);
        
        // Focus on barcode scanner
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) barcodeInput.focus();
        
        console.log('✅ Highland Fresh POS System ready!');
        
    } catch (error) {
        console.error('❌ Error during POS initialization:', error);
        POSPageUtils.showError('Failed to initialize POS system. Please refresh the page or contact support.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePOSPage);
