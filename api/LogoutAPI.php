<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/HighlandFreshAuth.php';

class LogoutAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        $operation = $this->getOperation() ?: 'logoutUser';
        $input = $this->getJsonInput() ?? [];
        
        $this->handle(function () use ($operation, $input) {
            switch ($operation) {
                case 'logoutUser':
                    $this->logoutUser($input);
                    break;
                default:
                    $this->respondError('Unsupported operation', 400, ['operation' => $operation]);
                    break;
            }
        });
    }
    
    public function logoutUser(array $input = []): void
    {
        try {
            // Use Highland Fresh Auth to handle logout
            $logoutSuccess = HighlandFreshAuth::logout();
            
            if ($logoutSuccess) {
                $this->respond([
                    'success' => true, 
                    'message' => 'Highland Fresh session ended successfully'
                ]);
            } else {
                $this->respond([
                    'success' => false, 
                    'message' => 'Logout completed with warnings'
                ]);
            }
        } catch (Exception $e) {
            error_log('Logout error: ' . $e->getMessage());
            // Even if there's an error, consider logout successful
            $this->respond([
                'success' => true, 
                'message' => 'Session terminated'
            ]);
        }
    }
}

if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'LogoutAPI.php') {
    $api = new LogoutAPI(['methods' => 'POST, OPTIONS']);
    $api->route();
}