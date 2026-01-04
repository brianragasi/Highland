<?php
function isAuthenticated() {
    // Check if session is active before accessing $_SESSION
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return false;
    }
    if (!isset($_SESSION['user_id'])) {
        return false;
    }
    if (!isset($_SESSION['timeout'])) {
        $_SESSION['timeout'] = time() + (30 * 60);
    }
    if (time() > $_SESSION['timeout']) {
        destroySession();
        return false;
    }
    $_SESSION['timeout'] = time() + (30 * 60);
    return true;
}
function hasRole($requiredRole) {
    if (!isAuthenticated()) {
        return false;
    }
    $userRole = $_SESSION['role'];
    if (is_array($requiredRole)) {
        return in_array($userRole, $requiredRole);
    }
    return $userRole === $requiredRole;
}
function getCurrentUser() {
    if (!isAuthenticated()) {
        return null;
    }
    return [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'role' => $_SESSION['role'],
    'login_time' => $_SESSION['login_time'] ?? null
    ];
}
function destroySession() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }
}
function requireAuth($loginUrl = '/login.html') {
    if (!isAuthenticated()) {
        header("Location: $loginUrl");
        exit();
    }
}
function requireRole($requiredRole, $jsonResponse = true) {
    if (!hasRole($requiredRole)) {
        if ($jsonResponse) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Insufficient permissions']);
        } else {
            http_response_code(403);
            echo "Access denied: Insufficient permissions";
        }
        exit();
    }
}
function getDashboardUrl($role) {
    switch ($role) {
        case 'Admin':
            return '/admin-dashboard.html';
        case 'Sales':
        case 'Cashier':
        case 'Sales Officer':
            return '/sales-dashboard.html';
        case 'Warehouse Staff':
            return '/warehouse-staff-dashboard.html';
        case 'Production Supervisor':
            return '/production-dashboard.html';
        case 'Quality Control Officer':
        case 'QC Officer':
            return '/qc-dashboard.html';
        case 'Finance Officer':
            return '/finance-dashboard.html';
        default:
            return '/login.html';
    }
}
function setSecureSessionConfig() {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
    ini_set('session.use_strict_mode', 1);
    ini_set('session.cookie_samesite', 'Strict');
}
?>