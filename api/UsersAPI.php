<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
class UsersAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        if (!$this->requireAdminAuth()) {
            return;
        }
        $method = $this->getMethod();
        $input = $this->getJsonInput() ?? [];
        $operation = $this->getOperation();
        $this->handle(function () use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'GET':
                    // Check if requesting roles specifically
                    if (isset($_GET['roles']) && $_GET['roles'] === 'true') {
                        $this->getAllRoles();
                        return;
                    }
                    $this->getAllUsers($input);
                    break;
                case 'getAllUsers':
                    $this->getAllUsers($input);
                    break;
                case 'getAllRoles':
                    $this->getAllRoles();
                    break;
                case 'POST':
                case 'insertUser':
                    $this->insertUser($input);
                    break;
                case 'PUT':
                case 'updateUser':
                    $this->updateUser($input);
                    break;
                case 'DELETE':
                case 'deleteUser':
                    $this->deleteUser($input);
                    break;
                default:
                    $this->respond(['success' => false, 'message' => 'Method not allowed'], 405);
                    break;
            }
        });
    }
    public function getAllUsers(array $input = []): void
    {
        $stmt = $this->db()->prepare(
            "SELECT u.user_id, u.username, u.first_name, u.last_name, u.email, ur.role_name as role, u.is_active, u.created_at
             FROM users u
             LEFT JOIN user_roles ur ON u.role_id = ur.role_id
             ORDER BY u.username"
        );
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->respond(['success' => true, 'data' => $users]);
    }
    
    public function getAllRoles(): void
    {
        $stmt = $this->db()->prepare(
            "SELECT role_id, role_name, description 
             FROM user_roles 
             WHERE is_active = 1 
             ORDER BY role_name"
        );
        $stmt->execute();
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Filter to only allowed roles for user management
        // Updated for Manufacturing Plant model per CLIENT_MEETING_PIVOT_ANALYSIS.md
        $allowedRoles = [
            'Admin',                    // Full system access + Finance functions
            'Warehouse Manager',        // Oversee inventory + Approve requisitions
            'Warehouse Staff',          // Physical handling + Batch production
            'Sales Officer',            // Walk-in POS + Mall invoicing (merged with Sales Staff)
            'Production Supervisor',    // Production batch management
            'Quality Control Officer',  // Milk receiving + Lab entry + Quality gates
            'Finance Officer'           // Farmer payroll + AR collection
        ];
        $filteredRoles = array_filter($roles, function($role) use ($allowedRoles) {
            return in_array($role['role_name'], $allowedRoles);
        });
        
        $this->respond(['success' => true, 'data' => array_values($filteredRoles)]);
    }
    
    protected function findRoleByName(string $roleName): ?array
    {
        return $this->getCachedLookup("role_name_{$roleName}", function() use ($roleName) {
            $stmt = $this->prepareStatement('SELECT role_id, role_name FROM user_roles WHERE role_name = ? LIMIT 1');
            $stmt->execute([$roleName]);
            return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        });
    }
    public function insertUser(array $input): void
    {
        $missing = $this->requireParams($input, ['username', 'password', 'role']);
        if ($missing) {
            $this->respond(['success' => false, 'message' => 'Username, password, and role are required'], 400);
            return;
        }
    $username = htmlspecialchars(trim((string)$input['username']), ENT_QUOTES, 'UTF-8');
    $password = trim((string)$input['password']);
    $roleInput = trim((string)$input['role']); 
    $email = isset($input['email']) ? htmlspecialchars(trim((string)$input['email']), ENT_QUOTES, 'UTF-8') : null;
    $first_name = isset($input['firstName']) ? htmlspecialchars(trim((string)$input['firstName']), ENT_QUOTES, 'UTF-8') : 
                  (isset($input['first_name']) ? htmlspecialchars(trim((string)$input['first_name']), ENT_QUOTES, 'UTF-8') : null);
    $last_name = isset($input['lastName']) ? htmlspecialchars(trim((string)$input['lastName']), ENT_QUOTES, 'UTF-8') : 
                 (isset($input['last_name']) ? htmlspecialchars(trim((string)$input['last_name']), ENT_QUOTES, 'UTF-8') : null);
    $is_active  = isset($input['is_active']) ? (int)$input['is_active'] : 1;
        if ($username === '' || strlen($username) < 3 || strlen($username) > 50) {
            $this->respond(['success' => false, 'message' => 'Username must be between 3 and 50 characters'], 400);
            return;
        }
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $username)) {
            $this->respond(['success' => false, 'message' => 'Username can only contain letters, numbers, underscores, and hyphens'], 400);
            return;
        }
        if ($password === '' || strlen($password) < 6) {
            $this->respond(['success' => false, 'message' => 'Password must be at least 6 characters'], 400);
            return;
        }
        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->respond(['success' => false, 'message' => 'Invalid email format'], 400);
            return;
        }
        $roleRow = $this->findRoleByName($roleInput);
        if (!$roleRow) {
            $this->respond(['success' => false, 'message' => 'Invalid role'], 400);
            return;
        }
        $allowedRoles = ['Admin', 'Warehouse Manager', 'Warehouse Staff', 'Sales Officer', 'Production Supervisor', 'Quality Control Officer', 'Finance Officer'];
        if (!in_array($roleRow['role_name'], $allowedRoles)) {
            $this->respond(['success' => false, 'message' => 'Role not allowed. Only Admin, Warehouse Manager, Warehouse Staff, Sales Officer, Production Supervisor, Quality Control Officer, and Finance Officer roles are permitted.'], 400);
            return;
        }
        $role_id = (int)$roleRow['role_id'];
        $role_name = $roleRow['role_name'];
        $stmt = $this->prepareStatement('SELECT user_id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            $this->respond(['success' => false, 'message' => 'Username already exists'], 400);
            return;
        }
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db()->prepare(
            'INSERT INTO users (username, password_hash, role_id, email, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$username, $passwordHash, $role_id, $email, $first_name, $last_name, $is_active]);
        $userId = (int)$this->db()->lastInsertId();
        $stmt = $this->db()->prepare(
            'SELECT u.user_id, u.username, u.first_name, u.last_name, u.email, ur.role_name as role, u.created_at 
             FROM users u 
             LEFT JOIN user_roles ur ON u.role_id = ur.role_id 
             WHERE u.user_id = ?'
        );
        $stmt->execute([$userId]);
        $newUser = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->respond(['success' => true, 'message' => 'User created successfully', 'data' => $newUser]);
    }
    public function updateUser(array $input): void
    {
        $id = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $id = (int)$_GET['id'];
        } elseif (isset($input['id']) && is_numeric($input['id'])) {
            $id = (int)$input['id'];
        }
        if (!$id) {
            $this->respond(['success' => false, 'message' => 'Valid user ID required'], 400);
            return;
        }
        $stmt = $this->db()->prepare(
            'SELECT u.user_id, u.username, ur.role_name as role FROM users u JOIN user_roles ur ON u.role_id = ur.role_id WHERE u.user_id = ?'
        );
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            $this->respond(['success' => false, 'message' => 'User not found'], 404);
            return;
        }
        $updateFields = [];
        $updateValues = [];
        if (array_key_exists('username', $input)) {
            $username = htmlspecialchars(trim((string)$input['username']), ENT_QUOTES, 'UTF-8');
            if ($username === '' || strlen($username) < 3 || strlen($username) > 50) {
                $this->respond(['success' => false, 'message' => 'Username must be between 3 and 50 characters'], 400);
                return;
            }
            if (!preg_match('/^[a-zA-Z0-9_-]+$/', $username)) {
                $this->respond(['success' => false, 'message' => 'Username can only contain letters, numbers, underscores, and hyphens'], 400);
                return;
            }
            $stmt = $this->db()->prepare('SELECT user_id FROM users WHERE username = ? AND user_id != ?');
            $stmt->execute([$username, $id]);
            if ($stmt->fetch()) {
                $this->respond(['success' => false, 'message' => 'Username already exists'], 400);
                return;
            }
            $updateFields[] = 'username = ?';
            $updateValues[] = $username;
        }
        if (array_key_exists('is_active', $input)) {
            $updateFields[] = 'is_active = ?';
            $updateValues[] = (int)$input['is_active'];
        }
        if (array_key_exists('email', $input)) {
            $email = $input['email'] ? htmlspecialchars(trim((string)$input['email']), ENT_QUOTES, 'UTF-8') : null;
            if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->respond(['success' => false, 'message' => 'Invalid email format'], 400);
                return;
            }
            $updateFields[] = 'email = ?';
            $updateValues[] = $email;
        }
        if (array_key_exists('firstName', $input) || array_key_exists('first_name', $input)) {
            $first_name = isset($input['firstName']) ? 
                ($input['firstName'] ? htmlspecialchars(trim((string)$input['firstName']), ENT_QUOTES, 'UTF-8') : null) : 
                ($input['first_name'] ? htmlspecialchars(trim((string)$input['first_name']), ENT_QUOTES, 'UTF-8') : null);
            $updateFields[] = 'first_name = ?';
            $updateValues[] = $first_name;
        }
        if (array_key_exists('lastName', $input) || array_key_exists('last_name', $input)) {
            $last_name = isset($input['lastName']) ? 
                ($input['lastName'] ? htmlspecialchars(trim((string)$input['lastName']), ENT_QUOTES, 'UTF-8') : null) : 
                ($input['last_name'] ? htmlspecialchars(trim((string)$input['last_name']), ENT_QUOTES, 'UTF-8') : null);
            $updateFields[] = 'last_name = ?';
            $updateValues[] = $last_name;
        }
        if (array_key_exists('role', $input)) {
            $roleInput = trim((string)$input['role']);
            $roleLookup = $this->db()->prepare('SELECT role_id, role_name FROM user_roles WHERE role_name = ? LIMIT 1');
            $roleLookup->execute([$roleInput]);
            $roleRow = $roleLookup->fetch(PDO::FETCH_ASSOC);
            if (!$roleRow) {
                $this->respond(['success' => false, 'message' => 'Invalid role'], 400);
                return;
            }
            $allowedRoles = ['Admin', 'Warehouse Manager', 'Warehouse Staff', 'Sales Officer', 'Production Supervisor', 'Quality Control Officer', 'Finance Officer'];
            if (!in_array($roleRow['role_name'], $allowedRoles)) {
                $this->respond(['success' => false, 'message' => 'Role not allowed. Only Admin, Warehouse Manager, Warehouse Staff, Sales Officer, Production Supervisor, Quality Control Officer, and Finance Officer roles are permitted.'], 400);
                return;
            }
            $updateFields[] = 'role_id = ?';
            $updateValues[] = (int)$roleRow['role_id'];
        }
        if (array_key_exists('password', $input) && trim((string)$input['password']) !== '') {
            $password = trim((string)$input['password']);
            if (strlen($password) < 6) {
                $this->respond(['success' => false, 'message' => 'Password must be at least 6 characters'], 400);
                return;
            }
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $updateFields[] = 'password_hash = ?';
            $updateValues[] = $passwordHash;
        }
        if (!$updateFields) {
            $this->respond(['success' => false, 'message' => 'No valid fields to update'], 400);
            return;
        }
        $updateValues[] = $id;
        $sql = 'UPDATE users SET ' . implode(', ', $updateFields) . ' WHERE user_id = ?';
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($updateValues);
        $stmt = $this->db()->prepare(
            'SELECT u.user_id, u.username, u.first_name, u.last_name, u.email, ur.role_name as role, u.created_at 
             FROM users u 
             LEFT JOIN user_roles ur ON u.role_id = ur.role_id 
             WHERE u.user_id = ?'
        );
        $stmt->execute([$id]);
        $updated = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->respond(['success' => true, 'message' => 'User updated successfully', 'data' => $updated]);
    }
    public function deleteUser(array $input): void
    {
        $id = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $id = (int)$_GET['id'];
        } elseif (isset($input['id']) && is_numeric($input['id'])) {
            $id = (int)$input['id'];
        }
        if (!$id) {
            $this->respond(['success' => false, 'message' => 'Valid user ID required'], 400);
            return;
        }
        $currentUserId = (int)($_SESSION['user_id'] ?? 0);
        if ($id === $currentUserId) {
            $this->respond(['success' => false, 'message' => 'Cannot delete your own account'], 400);
            return;
        }
        $stmt = $this->db()->prepare('SELECT user_id, username FROM users WHERE user_id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            $this->respond(['success' => false, 'message' => 'User not found'], 404);
            return;
        }
        $stmt = $this->db()->prepare('DELETE FROM users WHERE user_id = ?');
        $stmt->execute([$id]);
        $this->respond(['success' => true, 'message' => 'User deleted successfully', 'data' => ['user_id' => $id, 'username' => $user['username']]]);
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'UsersAPI.php') {
    $api = new UsersAPI(['methods' => 'GET, POST, PUT, DELETE, OPTIONS']);
    $api->route();
}