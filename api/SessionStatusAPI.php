<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/HighlandFreshAuth.php';

class SessionStatusAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        $method = $this->getMethod();
        $operation = $this->getOperation() ?: 'getSessionStatus';
        
        $this->handle(function () use ($method, $operation) {
            switch ($operation) {
                case 'getSessionStatus':
                    $this->getSessionStatus();
                    break;
                case 'refreshSession':
                    $this->refreshSession();
                    break;
                case 'extendSession':
                    $this->extendSession();
                    break;
                default:
                    $this->respondError('Unsupported operation', 400, ['operation' => $operation]);
                    break;
            }
        });
    }
    
    public function getSessionStatus(): void
    {
        try {
            $status = HighlandFreshAuth::getSessionStatus();
            $this->respond([
                'success' => true,
                'authenticated' => $status['authenticated'],
                'user' => $status['user'],
                'session_info' => [
                    'expires_in' => $status['expires_in'],
                    'expires_soon' => $status['expires_soon'],
                    'warning_threshold' => $status['warning_threshold'] ?? 300
                ]
            ]);
        } catch (Exception $e) {
            $this->respondError('Session check failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function refreshSession(): void
    {
        try {
            if (HighlandFreshAuth::isAuthenticated()) {
                HighlandFreshAuth::refreshSession();
                $status = HighlandFreshAuth::getSessionStatus();
                
                $this->respond([
                    'success' => true,
                    'message' => 'Session refreshed successfully',
                    'expires_in' => $status['expires_in']
                ]);
            } else {
                $this->respond([
                    'success' => false,
                    'message' => 'No active session to refresh'
                ]);
            }
        } catch (Exception $e) {
            $this->respondError('Session refresh failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function extendSession(): void
    {
        try {
            if (HighlandFreshAuth::isAuthenticated()) {
                // Refresh the session (extends timeout)
                HighlandFreshAuth::refreshSession();
                $status = HighlandFreshAuth::getSessionStatus();
                
                $this->respond([
                    'success' => true,
                    'message' => 'Session extended successfully',
                    'expires_in' => $status['expires_in']
                ]);
            } else {
                $this->respond([
                    'success' => false,
                    'message' => 'No active session to extend'
                ]);
            }
        } catch (Exception $e) {
            $this->respondError('Session extension failed: ' . $e->getMessage(), 500);
        }
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'SessionStatusAPI.php') {
    $api = new SessionStatusAPI(['methods' => 'GET, OPTIONS']);
    $api->route();
}
?>