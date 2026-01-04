/**
 * Highland Fresh POS - Client-Side Session Manager
 * Handles session timeout warnings, auto-refresh, and session validation
 * 
 * Author: Highland Fresh Development Team
 * Date: 2025
 * Version: 2.1
 */

class SessionManager {
    constructor(options = {}) {
        this.options = {
            // Session check interval (30 seconds)
            checkInterval: options.checkInterval || 30000,
            // Warning time before expiry (5 minutes)
            warningTime: options.warningTime || 300,
            // Auto-refresh when this much time remains (10 minutes)
            autoRefreshTime: options.autoRefreshTime || 600,
            // Redirect URL on session expiry
            loginUrl: options.loginUrl || '/html/login.html',
            // API endpoints
            sessionStatusUrl: options.sessionStatusUrl || APIResponseHandler.getApiUrl('SessionStatusAPI.php'),
            refreshSessionUrl: options.refreshSessionUrl || APIResponseHandler.getApiUrl('SessionStatusAPI.php') + '?operation=refreshSession',
            // Callbacks
            onWarning: options.onWarning || this.defaultWarningHandler,
            onExpired: options.onExpired || this.defaultExpiredHandler,
            onRefreshed: options.onRefreshed || this.defaultRefreshHandler
        };
        
        this.warningShown = false;
        this.checkTimer = null;
        this.warningModal = null;
        
        this.init();
    }
    
    init() {
        // Start session monitoring
        this.startMonitoring();
        
        // Create session warning modal
        this.createWarningModal();
        
        // Add activity listeners to refresh session on user activity
        this.addActivityListeners();
        
        console.log('Highland Fresh Session Manager initialized');
    }
    
    startMonitoring() {
        this.checkTimer = setInterval(() => {
            this.checkSessionStatus();
        }, this.options.checkInterval);
        
        // Initial check
        this.checkSessionStatus();
    }
    
    stopMonitoring() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
    }
    
    async checkSessionStatus() {
        try {
            const response = await axios.get(this.options.sessionStatusUrl, {
                withCredentials: true,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const data = response.data;
            
            if (!data.success) {
                console.error('Session status check failed:', data.message);
                return;
            }
            
            if (!data.authenticated) {
                // Session expired
                this.handleSessionExpired();
                return;
            }
            
            const expiresIn = data.session_info.expires_in;
            const expiresSoon = data.session_info.expires_soon;
            
            // Handle session warning
            if (expiresSoon && expiresIn <= this.options.warningTime && !this.warningShown) {
                this.showSessionWarning(expiresIn);
            }
            
            // Auto-refresh if needed
            if (expiresIn <= this.options.autoRefreshTime && expiresIn > this.options.warningTime) {
                this.refreshSession();
            }
            
        } catch (error) {
            console.error('Session status check failed:', error);
        }
    }
    
    async refreshSession() {
        try {
            const response = await axios.post(this.options.refreshSessionUrl, {}, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const data = response.data;
            
            if (data.success) {
                this.options.onRefreshed(data.expires_in);
                this.hideSessionWarning();
            } else {
                console.error('Session refresh failed:', data.message);
            }
            
        } catch (error) {
            console.error('Session refresh failed:', error);
        }
    }
    
    showSessionWarning(timeRemaining) {
        this.warningShown = true;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        this.options.onWarning(timeRemaining, minutes, seconds);
        
        // Show the warning modal
        if (this.warningModal) {
            const timeDisplay = document.getElementById('sessionTimeRemaining');
            if (timeDisplay) {
                timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            this.warningModal.show();
            
            // Update countdown
            this.startWarningCountdown(timeRemaining);
        }
    }
    
    startWarningCountdown(initialTime) {
        let timeLeft = initialTime;
        
        const countdownTimer = setInterval(() => {
            timeLeft--;
            
            if (timeLeft <= 0) {
                clearInterval(countdownTimer);
                this.handleSessionExpired();
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            const timeDisplay = document.getElementById('sessionTimeRemaining');
            if (timeDisplay) {
                timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
        
        // Store timer reference to clear it if session is extended
        this.countdownTimer = countdownTimer;
    }
    
    hideSessionWarning() {
        this.warningShown = false;
        
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        
        if (this.warningModal) {
            this.warningModal.hide();
        }
    }
    
    handleSessionExpired() {
        this.stopMonitoring();
        this.options.onExpired();
    }
    
    extendSession() {
        this.refreshSession();
    }
    
    addActivityListeners() {
        // List of events that indicate user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        let lastActivity = Date.now();
        
        const throttledRefresh = this.throttle(() => {
            const now = Date.now();
            // Only refresh if it's been more than 5 minutes since last refresh
            if (now - lastActivity > 300000) {
                this.refreshSession();
                lastActivity = now;
            }
        }, 60000); // Throttle to once per minute max
        
        activityEvents.forEach(event => {
            document.addEventListener(event, throttledRefresh, true);
        });
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    createWarningModal() {
        // Create the session warning modal HTML
        const modalHtml = `
            <div class="modal fade" id="sessionWarningModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-warning">
                        <div class="modal-header bg-warning bg-opacity-10">
                            <h5 class="modal-title">
                                <i class="bi bi-clock-history me-2 text-warning"></i>
                                Session Expiring Soon
                            </h5>
                        </div>
                        <div class="modal-body text-center">
                            <div class="mb-3">
                                <i class="bi bi-hourglass-split text-warning" style="font-size: 3rem;"></i>
                            </div>
                            <h6>Your Highland Fresh POS session will expire in:</h6>
                            <div class="fs-2 fw-bold text-warning mb-3" id="sessionTimeRemaining">5:00</div>
                            <p class="mb-0">
                                Click "Stay Logged In" to extend your session, or you will be automatically logged out.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" onclick="sessionManager.extendSession()">
                                <i class="bi bi-clock-history me-1"></i>Stay Logged In
                            </button>
                            <button type="button" class="btn btn-outline-secondary" onclick="sessionManager.handleSessionExpired()">
                                <i class="bi bi-box-arrow-right me-1"></i>Logout Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if present
        const existingModal = document.getElementById('sessionWarningModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Initialize Bootstrap modal
        const modalElement = document.getElementById('sessionWarningModal');
        if (modalElement && window.bootstrap) {
            this.warningModal = new bootstrap.Modal(modalElement, {
                backdrop: 'static',
                keyboard: false
            });
        }
    }
    
    // Default event handlers
    defaultWarningHandler(timeRemaining, minutes, seconds) {
        console.warn(`Highland Fresh session expires in ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    
    defaultExpiredHandler() {
        // Use professional notification instead of alert
        const notification = document.createElement('div');
        notification.className = 'alert alert-warning alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 350px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        notification.innerHTML = `
            <strong>Session Expired</strong><br>
            Your Highland Fresh session has expired. You will be redirected to the login page.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(notification);

        // Redirect after showing the message
        setTimeout(() => {
            window.location.href = this.options.loginUrl;
        }, 3000);
    }
    
    defaultRefreshHandler(expiresIn) {
        console.log(`Highland Fresh session refreshed. Expires in ${Math.floor(expiresIn / 60)} minutes.`);
    }
    
    // Public method to manually destroy session
    destroy() {
        this.stopMonitoring();
        this.hideSessionWarning();
        
        if (this.warningModal) {
            const modalElement = document.getElementById('sessionWarningModal');
            if (modalElement) {
                modalElement.remove();
            }
        }
    }
}

// Auto-initialize session manager when page loads
window.addEventListener('DOMContentLoaded', function() {
    // Only initialize on protected pages (not login page)
    if (!window.location.pathname.includes('login.html')) {
        window.sessionManager = new SessionManager({
            loginUrl: '/html/login.html'
        });
    }
});

// Export for manual initialization if needed
window.SessionManager = SessionManager;
