/**
 * Highland Fresh Navigation Utilities
 * Provides robust navigation handling to prevent 404 errors and browser cache issues
 */

class HighlandFreshNavigation {
    static basePath = '/HighlandFreshApp';
    
    /**
     * Get absolute URL for any page in the Highland Fresh app
     */
    static getAbsoluteUrl(relativePath) {
        const origin = window.location.protocol + '//' + window.location.host;
        
        // Clean up the relative path
        const cleanPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
        
        return origin + this.basePath + cleanPath;
    }
    
    /**
     * Navigate to a page with multiple fallback strategies
     */
    static navigateTo(page, options = {}) {
        const { 
            useAbsolute = true, 
            clearCache = false, 
            delay = 0,
            fallbackDelay = 100 
        } = options;
        
        console.log(`🧭 Navigation requested to: ${page}`);
        
        // Clear cache if requested
        if (clearCache && typeof Storage !== "undefined") {
            sessionStorage.removeItem('navigation_cache');
            sessionStorage.removeItem('last_error');
        }
        
        // Store navigation intent
        if (typeof Storage !== "undefined") {
            sessionStorage.setItem('navigation_intent', page);
            sessionStorage.setItem('navigation_timestamp', Date.now().toString());
        }
        
        const executeNavigation = () => {
            try {
                if (useAbsolute) {
                    const absoluteUrl = this.getAbsoluteUrl(`/html/${page}`);
                    console.log(`🧭 Navigating to absolute URL: ${absoluteUrl}`);
                    window.location.href = absoluteUrl;
                } else {
                    console.log(`🧭 Navigating to relative path: ${page}`);
                    window.location.href = page;
                }
            } catch (error) {
                console.error('🚨 Navigation error:', error);
                this.handleNavigationError(page, fallbackDelay);
            }
        };
        
        if (delay > 0) {
            setTimeout(executeNavigation, delay);
        } else {
            executeNavigation();
        }
    }
    
    /**
     * Handle navigation errors with fallback strategies
     */
    static handleNavigationError(page, fallbackDelay = 100) {
        console.log('🚨 Implementing navigation fallback strategy');
        
        setTimeout(() => {
            // Try different path variations
            const fallbackPaths = [
                `../html/${page}`,
                `./${page}`,
                page
            ];
            
            for (const path of fallbackPaths) {
                try {
                    console.log(`🧭 Fallback attempt: ${path}`);
                    window.location.href = path;
                    break;
                } catch (error) {
                    console.warn(`🚨 Fallback failed for ${path}:`, error);
                }
            }
        }, fallbackDelay);
    }
    
    /**
     * Navigate to admin dashboard with robust error handling
     */
    static goToDashboard() {
        this.navigateTo('admin-dashboard.html', {
            useAbsolute: true,
            clearCache: true
        });
    }
    
    /**
     * Navigate to login page
     */
    static goToLogin() {
        this.navigateTo('login.html', {
            useAbsolute: true,
            clearCache: true
        });
    }
    
    /**
     * Robust logout with navigation cleanup
     */
    static logout() {
        console.log('🚪 Highland Fresh logout initiated');
        
        try {
            // Clear all session data
            if (typeof Storage !== "undefined") {
                sessionStorage.clear();
                
                // Keep only essential data
                const essentialKeys = ['theme', 'language'];
                essentialKeys.forEach(key => {
                    const value = localStorage.getItem(key);
                    if (value) {
                        localStorage.setItem(key, value);
                    }
                });
                
                // Clear navigation cache
                localStorage.removeItem('navigation_cache');
                localStorage.removeItem('user_session');
            }
            
            // Call existing logout function if available
            if (typeof window.logout === 'function' && window.logout !== this.logout) {
                window.logout();
            } else {
                // Direct navigation to login
                this.goToLogin();
            }
            
        } catch (error) {
            console.error('🚨 Logout error:', error);
            // Force navigation
            window.location.href = this.getAbsoluteUrl('/html/login.html');
        }
    }
    
    /**
     * Check if current navigation is working properly
     */
    static validateNavigation() {
        if (typeof Storage !== "undefined") {
            const lastIntent = sessionStorage.getItem('navigation_intent');
            const lastTimestamp = sessionStorage.getItem('navigation_timestamp');
            
            if (lastIntent && lastTimestamp) {
                const timeSinceNav = Date.now() - parseInt(lastTimestamp);
                
                // If navigation took too long, it might have failed
                if (timeSinceNav > 5000) {
                    console.warn('🚨 Slow navigation detected, clearing cache');
                    sessionStorage.removeItem('navigation_intent');
                    sessionStorage.removeItem('navigation_timestamp');
                }
            }
        }
    }
    
    /**
     * Refresh current page with cache busting
     */
    static refreshPage() {
        const currentUrl = window.location.href;
        const separator = currentUrl.includes('?') ? '&' : '?';
        const cacheBuster = `${separator}_t=${Date.now()}`;
        window.location.href = currentUrl + cacheBuster;
    }
    
    /**
     * Setup navigation error monitoring
     */
    static setupErrorMonitoring() {
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('404')) {
                console.warn('🚨 404 error detected, navigation issue possible');
                this.validateNavigation();
            }
        });
        
        // Monitor for navigation timing issues
        window.addEventListener('beforeunload', () => {
            if (typeof Storage !== "undefined") {
                sessionStorage.setItem('last_page_unload', Date.now().toString());
            }
        });
    }
}

// Auto-initialize error monitoring
document.addEventListener('DOMContentLoaded', () => {
    HighlandFreshNavigation.setupErrorMonitoring();
    HighlandFreshNavigation.validateNavigation();
});

// Make available globally
window.HighlandFreshNavigation = HighlandFreshNavigation;

// Convenience functions
window.navigateToDashboard = function(event) {
    if (event) event.preventDefault();
    HighlandFreshNavigation.goToDashboard();
};

window.robustLogout = function() {
    HighlandFreshNavigation.logout();
};
