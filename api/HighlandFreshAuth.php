<?php
/**
 * Highland Fresh POS - Centralized Authentication Module
 * Handles all authentication, session management, and security for Highland Fresh POS
 * 
 * Author: Highland Fresh Development Team
 * Date: 2025
 * Version: 2.1
 */

class HighlandFreshAuth {
    
    // Session timeout in seconds (30 minutes)
    private static $SESSION_TIMEOUT = 1800;
    
    // Warning time before session expires (5 minutes)
    private static $WARNING_TIME = 300;
    
    /**
     * Initialize authentication system
     */
    public static function init() {
        // Only initialize if session hasn't been started yet
        if (session_status() === PHP_SESSION_NONE) {
            // Set secure session parameters BEFORE starting session
            self::setSecureSessionParams();
            session_start();
        }
        
        // Set session regeneration tracking
        self::setupSessionRegeneration();
        
        // Clean up expired sessions
        self::cleanupExpiredSessions();
    }
    
    /**
     * Set secure session parameters (must be called before session_start)
     */
    private static function setSecureSessionParams() {
        // Only set parameters if session hasn't started yet
        if (session_status() === PHP_SESSION_NONE) {
            session_set_cookie_params([
                'lifetime' => 0,
                'path' => '/',
                'domain' => '',
                'secure' => isset($_SERVER['HTTPS']),
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }
    }
    
    /**
     * Setup session regeneration (called after session starts)
     */
    private static function setupSessionRegeneration() {
        // Regenerate session ID periodically for security
        if (isset($_SESSION['last_regeneration']) && 
            time() - $_SESSION['last_regeneration'] > 300) {
            session_regenerate_id(true);
            $_SESSION['last_regeneration'] = time();
        } elseif (!isset($_SESSION['last_regeneration'])) {
            $_SESSION['last_regeneration'] = time();
        }
    }
    
    /**
     * Check if user is authenticated
     */
    public static function isAuthenticated() {
        if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
            return false;
        }
        
        // Check session timeout
        if (self::isSessionExpired()) {
            self::logout();
            return false;
        }
        
        // Update session timeout
        self::refreshSession();
        
        return true;
    }
    
    /**
     * Check if session has expired
     */
    public static function isSessionExpired() {
        if (!isset($_SESSION['login_time']) || !isset($_SESSION['last_activity'])) {
            return true;
        }
        
        return (time() - $_SESSION['last_activity']) > self::$SESSION_TIMEOUT;
    }
    
    /**
     * Check if session will expire soon (for warnings)
     */
    public static function isSessionExpiringSoon() {
        if (!isset($_SESSION['last_activity'])) {
            return false;
        }
        
        $timeRemaining = self::$SESSION_TIMEOUT - (time() - $_SESSION['last_activity']);
        return $timeRemaining <= self::$WARNING_TIME && $timeRemaining > 0;
    }
    
    /**
     * Get remaining session time in seconds
     */
    public static function getSessionTimeRemaining() {
        if (!isset($_SESSION['last_activity'])) {
            return 0;
        }
        
        return max(0, self::$SESSION_TIMEOUT - (time() - $_SESSION['last_activity']));
    }
    
    /**
     * Refresh session activity timestamp
     */
    public static function refreshSession() {
        $_SESSION['last_activity'] = time();
    }
    
    /**
     * Login user
     */
    public static function login($userId, $username, $role, $fullName = null) {
        // Regenerate session ID for security
        session_regenerate_id(true);
        
        // Set session data
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = $role;
        $_SESSION['full_name'] = $fullName;
        $_SESSION['login_time'] = time();
        $_SESSION['last_activity'] = time();
        $_SESSION['last_regeneration'] = time();
        
        // Log the login attempt
        self::logSecurityEvent('login_success', [
            'user_id' => $userId,
            'username' => $username,
            'role' => $role,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
        
        return true;
    }
    
    /**
     * Logout user
     */
    public static function logout() {
        // Log the logout
        if (isset($_SESSION['user_id'])) {
            self::logSecurityEvent('logout', [
                'user_id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'] ?? 'unknown',
                'session_duration' => time() - ($_SESSION['login_time'] ?? time())
            ]);
        }
        
        // Clear session data
        $_SESSION = [];
        
        // Delete session cookie
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        
        // Destroy session
        session_destroy();
        
        return true;
    }
    
    /**
     * Check if user has required role
     */
    public static function hasRole($requiredRole) {
        if (!self::isAuthenticated()) {
            return false;
        }
        
        $userRole = $_SESSION['role'];
        
        // Handle array of roles
        if (is_array($requiredRole)) {
            return in_array($userRole, $requiredRole);
        }
        
        // Admin has access to everything
        if ($userRole === 'Admin') {
            return true;
        }
        
        return $userRole === $requiredRole;
    }
    
    /**
     * Get current user data
     */
    public static function getCurrentUser() {
        if (!self::isAuthenticated()) {
            return null;
        }
        
        return [
            'id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'role' => $_SESSION['role'],
            'full_name' => $_SESSION['full_name'] ?? $_SESSION['username'],
            'login_time' => $_SESSION['login_time'],
            'last_activity' => $_SESSION['last_activity'],
            'session_expires_at' => $_SESSION['last_activity'] + self::$SESSION_TIMEOUT,
            'time_remaining' => self::getSessionTimeRemaining()
        ];
    }
    
    /**
     * Require authentication - redirect if not authenticated
     */
    public static function requireAuth($redirectUrl = '/html/login.html') {
        if (!self::isAuthenticated()) {
            // If it's an AJAX request, return JSON response
            if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
                strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                http_response_code(401);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'Authentication required',
                    'redirect' => $redirectUrl
                ]);
                exit;
            }
            
            // Regular request - redirect
            header("Location: $redirectUrl");
            exit;
        }
        
        // Refresh session on authenticated request
        self::refreshSession();
    }
    
    /**
     * Require specific role - return error if not authorized
     */
    public static function requireRole($requiredRole, $errorMessage = 'Insufficient privileges') {
        self::requireAuth();
        
        if (!self::hasRole($requiredRole)) {
            // If it's an AJAX request, return JSON response
            if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
                strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                http_response_code(403);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => $errorMessage,
                    'required_role' => $requiredRole,
                    'user_role' => $_SESSION['role'] ?? 'none'
                ]);
                exit;
            }
            
            // Regular request - show error
            http_response_code(403);
            echo "<h1>Access Denied</h1><p>$errorMessage</p>";
            exit;
        }
    }
    
    /**
     * Get session status information
     */
    public static function getSessionStatus() {
        self::init();
        
        if (self::isAuthenticated()) {
            return [
                'authenticated' => true,
                'user' => self::getCurrentUser(),
                'expires_in' => self::getSessionTimeRemaining(),
                'expires_soon' => self::isSessionExpiringSoon(),
                'warning_threshold' => self::$WARNING_TIME
            ];
        } else {
            return [
                'authenticated' => false,
                'user' => null,
                'expires_in' => 0,
                'expires_soon' => false
            ];
        }
    }
    
    /**
     * Clean up expired sessions (called periodically)
     */
    private static function cleanupExpiredSessions() {
        // This would typically clean up database session storage
        // For file-based sessions, PHP handles this automatically
        
        // Log cleanup if sessions were expired
        if (isset($_SESSION['user_id']) && self::isSessionExpired()) {
            self::logSecurityEvent('session_expired', [
                'user_id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'] ?? 'unknown',
                'last_activity' => $_SESSION['last_activity'] ?? 'unknown'
            ]);
        }
    }
    
    /**
     * Log security events
     */
    private static function logSecurityEvent($event, $data = []) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'event' => $event,
            'data' => $data,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        // Log to file (in production, consider using a proper logging system)
        $logFile = __DIR__ . '/../logs/security.log';
        $logDir = dirname($logFile);
        
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        file_put_contents($logFile, json_encode($logEntry) . "\n", FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Validate session token (for AJAX requests)
     */
    public static function validateSessionToken($token = null) {
        if ($token === null) {
            $token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? $_POST['session_token'] ?? null;
        }
        
        if (!$token) {
            return false;
        }
        
        $expectedToken = self::getSessionToken();
        return hash_equals($expectedToken, $token);
    }
    
    /**
     * Get session token for CSRF protection
     */
    public static function getSessionToken() {
        if (!isset($_SESSION['session_token'])) {
            $_SESSION['session_token'] = bin2hex(random_bytes(32));
        }
        
        return $_SESSION['session_token'];
    }
}
