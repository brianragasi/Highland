<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/HighlandFreshAuth.php';

class AuthAPI extends BaseAPI
{
    public function route(): void
    {
        // Initialize session first, then Highland Fresh Auth
        $this->initializeSession();
        
        // Only initialize Highland Fresh Auth if session was successfully started
        if (session_status() === PHP_SESSION_ACTIVE) {
            HighlandFreshAuth::init();
        }
        
        $operation = $this->getOperation() ?: 'authenticateUser';
        $input = $this->getJsonInput() ?? [];
        
        $this->handle(function () use ($operation, $input) {
            switch ($operation) {
                case 'authenticateUser':
                    $this->authenticateUser($input);
                    break;
                default:
                    $this->respondError('Unsupported operation', 400, ['operation' => $operation]);
                    break;
            }
        });
    }
    
    public function authenticateUser(array $input): void
    {
        // Validate required parameters
        $missing = $this->requireParams($input, ['username', 'password']);
        if ($missing) {
            $this->respondError('Username and password are required', 400, ['missing' => $missing]);
            return;
        }
        
        $username = trim((string)$input['username']);
        $password = (string)$input['password'];
        
        // Validate input
        if ($username === '' || $password === '') {
            $this->respondError('Username and password cannot be empty', 400);
            return;
        }
        
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            $this->respondError('Invalid username format', 400);
            return;
        }
        
        try {
            // Query user from database
            $stmt = $this->db()->prepare(
                "SELECT u.user_id, u.username, u.password_hash, u.is_active, 
                        CONCAT(u.first_name, ' ', u.last_name) as full_name,
                        ur.role_name as role 
                 FROM users u 
                 JOIN user_roles ur ON u.role_id = ur.role_id 
                 WHERE u.username = ? AND u.is_active = 1 
                 LIMIT 1"
            );
            $stmt->execute([$username]);
            $user = $stmt->fetch();
            
            // Verify credentials
            if (!$user || !$user['is_active'] || !password_verify($password, $user['password_hash'])) {
                // Log failed login attempt
                $this->logSecurityEvent('login_failed', [
                    'username' => $username,
                    'reason' => 'invalid_credentials',
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
                
                $this->respondError('Invalid credentials', 401);
                return;
            }
            
            // Use Highland Fresh Auth to create session
            $loginSuccess = HighlandFreshAuth::login(
                $user['user_id'], 
                $user['username'], 
                $user['role'],
                $user['full_name']
            );
            
            if (!$loginSuccess) {
                $this->respondError('Failed to create session', 500);
                return;
            }
            
            // Get session status for response
            $sessionStatus = HighlandFreshAuth::getSessionStatus();
            
            // Successful login response
            $this->respond([
                'success' => true,
                'message' => 'Login successful',
                'user' => $sessionStatus['user'],
                'session_info' => [
                    'expires_in' => $sessionStatus['expires_in'],
                    'login_time' => time()
                ]
            ]);
            
        } catch (Exception $e) {
            error_log('Authentication error: ' . $e->getMessage());
            $this->respondError('Authentication failed', 500);
        }
    }
}

if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'AuthAPI.php') {
    $api = new AuthAPI(['methods' => 'POST, OPTIONS']);
    $api->route();
}