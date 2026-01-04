<?php
require_once __DIR__ . '/DatabaseConfig.php';
class BaseAPI
{
    protected $pdo = null;
    protected static $statementCache = [];
    protected static $maxCacheSize = 50;
    protected static $lookupCache = [];
    protected static $cacheTTL = 300;
    public function __construct(array $options = [])
    {
        if (!$this->isCliOrTest()) {
            $this->setHeaders(
                $options['methods'] ?? 'GET, POST, PUT, DELETE, OPTIONS',
                $options['allowedHeaders'] ?? 'Content-Type, Authorization',
                $options['allowCredentials'] ?? true,
                $options['allowedOrigin'] ?? null
            );
            if ($this->isOptions()) {
                http_response_code(200);
                exit();
            }
        }
    }
    protected function setHeaders(string $methods, string $allowedHeaders, bool $allowCredentials, ?string $allowedOrigin = null): void
    {
        if ($this->isCliOrTest() || headers_sent()) {
            return; 
        }
        header('Content-Type: application/json');
        $origin = $allowedOrigin;
        if ($origin === null) {
            $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'http://localhost';
        }
        header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: ' . $methods);
    header('Access-Control-Allow-Headers: ' . $allowedHeaders);
        if ($allowCredentials) {
            header('Access-Control-Allow-Credentials: true');
        }
    }
    protected function isOptions(): bool
    {
        return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS';
    }
    protected function getMethod(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }
    protected function getOperation(): ?string
    {
        // Check GET parameters
        if ($this->getMethod() === 'GET' && isset($_GET['operation'])) {
            return $_GET['operation'];
        }
        
        // Check POST parameters
        if ($this->getMethod() === 'POST' && isset($_POST['operation'])) {
            return $_POST['operation'];
        }
        
        // Check JSON body for operation
        $jsonInput = $this->getJsonInput();
        if ($jsonInput && isset($jsonInput['operation'])) {
            return $jsonInput['operation'];
        }
        
        // Fallback to REQUEST
        return isset($_REQUEST['operation']) ? $_REQUEST['operation'] : null;
    }
    protected function getJsonParamRaw(): ?string
    {
        if ($this->getMethod() === 'GET' && isset($_GET['json'])) {
            return $_GET['json'];
        }
        if ($this->getMethod() === 'POST' && isset($_POST['json'])) {
            return $_POST['json'];
        }
        return isset($_REQUEST['json']) ? $_REQUEST['json'] : null;
    }
    protected function getJsonInput(): ?array
    {
        $raw = $this->getJsonParamRaw();
        if ($raw !== null && $raw !== '') {
            $decoded = @json_decode($raw, true);
            return is_array($decoded) ? $decoded : null;
        }
        if ($this->isCliOrTest()) {
            if (isset($GLOBALS['mock_input']) && is_string($GLOBALS['mock_input'])) {
                $body = $GLOBALS['mock_input'];
            } elseif (isset($GLOBALS['mockPhpInput']) && is_string($GLOBALS['mockPhpInput'])) {
                $body = $GLOBALS['mockPhpInput'];
            } else {
                $body = @file_get_contents('php://input');
            }
        } else {
            $body = @file_get_contents('php://input');
        }
        if ($body) {
            $decoded = @json_decode($body, true);
            return is_array($decoded) ? $decoded : null;
        }
        return null;
    }
    protected function respond($data, int $status = 200): void
    {
        http_response_code($status);
        echo json_encode($data);
    }
    protected function respondSuccess($data = null, int $status = 200): void
    {
        $payload = ['success' => true];
        if ($data !== null) {
            $payload['data'] = $data;
        }
        $this->respond($payload, $status);
    }
    protected function respondError(string $message, int $status = 400, array $extra = []): void
    {
        $payload = array_merge(['success' => false, 'message' => $message], $extra);
        $this->respond($payload, $status);
    }
    protected function handle(callable $fn): void
    {
        try {
            $fn();
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->respondError('Database error occurred', 500);
        } catch (Exception $e) {
            error_log('General error: ' . $e->getMessage());
            $this->respondError('An unexpected error occurred', 500);
        }
    }
    protected function requireParams(array $data, array $required): ?array
    {
        $missing = [];
        foreach ($required as $key) {
            if (!array_key_exists($key, $data) || $data[$key] === '' || $data[$key] === null) {
                $missing[] = $key;
            }
        }
        return $missing ?: null;
    }
    protected function initializeSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            if (!(defined('TESTING') && TESTING === true)) {
                // Only start session if headers haven't been sent
                if (!headers_sent()) {
                    session_start();
                }
            }
        }
    }
    protected function requireAdminAuth(): bool
    {
        if (!function_exists('isAuthenticated') || !function_exists('hasRole')) {
            $this->respondError('Authentication functions not available', 500);
            return false;
        }
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return false;
        }
        if (!hasRole('Admin')) {
            $this->respond(['success' => false, 'message' => 'Administrator access required'], 403);
            return false;
        }
        return true;
    }
    protected function requireInventoryOrAdminAuth(): bool
    {
        if (!function_exists('isAuthenticated') || !function_exists('hasRole')) {
            $this->respondError('Authentication functions not available', 500);
            return false;
        }
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return false;
        }
        if (!hasRole('Admin') && !hasRole('Warehouse Staff')) {
            $this->respond(['success' => false, 'message' => 'Warehouse Staff or Administrator access required'], 403);
            return false;
        }
        return true;
    }
    protected function requireProductionOrAdminAuth(): bool
    {
        if (!function_exists('isAuthenticated') || !function_exists('hasRole')) {
            $this->respondError('Authentication functions not available', 500);
            return false;
        }
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return false;
        }
        if (!hasRole('Admin') && !hasRole('Production Supervisor')) {
            $this->respond(['success' => false, 'message' => 'Production Supervisor or Administrator access required'], 403);
            return false;
        }
        return true;
    }
    protected function requireInventoryProductionOrAdminAuth(): bool
    {
        if (!function_exists('isAuthenticated') || !function_exists('hasRole')) {
            $this->respondError('Authentication functions not available', 500);
            return false;
        }
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return false;
        }
        if (!hasRole('Admin') && !hasRole('Warehouse Manager') && !hasRole('Warehouse Staff') && !hasRole('Production Supervisor')) {
            $this->respond(['success' => false, 'message' => 'Warehouse Manager, Warehouse Staff, Production Supervisor, or Administrator access required'], 403);
            return false;
        }
        return true;
    }
    protected function requireSalesOfficerInventoryOrAdminAuth(): bool
    {
        if (!function_exists('isAuthenticated') || !function_exists('hasRole')) {
            $this->respondError('Authentication functions not available', 500);
            return false;
        }
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return false;
        }
        if (!hasRole('Admin') && !hasRole('Warehouse Manager') && !hasRole('Warehouse Staff') && !hasRole('Sales') && !hasRole('Sales Officer') && !hasRole('Production Supervisor')) {
            $this->respond(['success' => false, 'message' => 'Sales Staff, Warehouse Manager, Warehouse Staff, Production Supervisor, or Administrator access required'], 403);
            return false;
        }
        return true;
    }
    protected function isCliOrTest(): bool
    {
        return (PHP_SAPI === 'cli') || (defined('TESTING') && TESTING === true);
    }
    protected function db(): PDO
    {
        if (!$this->pdo) {
            $this->pdo = getDBConnection();
        }
        return $this->pdo;
    }
    protected function prepareStatement(string $sql): PDOStatement
    {
        $sqlHash = md5($sql);
        if (isset(self::$statementCache[$sqlHash])) {
            return self::$statementCache[$sqlHash];
        }
        $stmt = $this->db()->prepare($sql);
        if (count(self::$statementCache) < self::$maxCacheSize) {
            self::$statementCache[$sqlHash] = $stmt;
        } else {
            array_shift(self::$statementCache);
            self::$statementCache[$sqlHash] = $stmt;
        }
        return $stmt;
    }
    protected function clearStatementCache(): void
    {
        self::$statementCache = [];
    }
    protected function getCachedLookup(string $key, callable $fetcher)
    {
        $now = time();
        if (isset(self::$lookupCache[$key])) {
            $cached = self::$lookupCache[$key];
            if ($cached['expires'] > $now) {
                return $cached['data'];
            }
            unset(self::$lookupCache[$key]);
        }
        $data = $fetcher();
        self::$lookupCache[$key] = [
            'data' => $data,
            'expires' => $now + self::$cacheTTL
        ];
        return $data;
    }
    protected function clearLookupCache(): void
    {
        self::$lookupCache = [];
    }
    protected function checkDatabaseIndexes(): array
    {
        $recommendations = [];
        try {
            $indexChecks = [
                'products' => [
                    'barcode' => 'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = "products" AND column_name = "barcode"',
                    'category_id' => 'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = "products" AND column_name = "category_id"',
                    'is_active' => 'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = "products" AND column_name = "is_active"'
                ],
                'users' => [
                    'username' => 'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = "users" AND column_name = "username"',
                    'is_active' => 'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = "users" AND column_name = "is_active"'
                ],
                'suppliers' => [
                    'name' => 'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = "suppliers" AND column_name = "name"',
                    'is_active' => 'SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = "suppliers" AND column_name = "is_active"'
                ]
            ];
            foreach ($indexChecks as $table => $columns) {
                foreach ($columns as $column => $query) {
                    $stmt = $this->db()->prepare($query);
                    $stmt->execute();
                    $count = $stmt->fetchColumn();
                    if ($count == 0) {
                        $recommendations[] = "Missing index on {$table}.{$column} - Consider: ALTER TABLE {$table} ADD INDEX idx_{$table}_{$column} ({$column});";
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Index check failed: " . $e->getMessage());
        }
        return $recommendations;
    }
    
    /**
     * Log security event
     * @param string $event_type The type of security event
     * @param array $details Event details to log
     */
    protected function logSecurityEvent(string $event_type, array $details = []): void
    {
        try {
            // Check if security_logs table exists
            $stmt = $this->db()->query(
                "SELECT COUNT(*) FROM information_schema.tables 
                 WHERE table_schema = DATABASE() AND table_name = 'security_logs'"
            );
            $tableExists = $stmt->fetchColumn() > 0;
            
            if ($tableExists) {
                $stmt = $this->db()->prepare(
                    "INSERT INTO security_logs (event_type, details, ip_address, user_agent, created_at) 
                     VALUES (?, ?, ?, ?, NOW())"
                );
                $stmt->execute([
                    $event_type,
                    json_encode($details),
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                    $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
                ]);
            } else {
                // Table doesn't exist, just log to error log
                error_log("Security Event [$event_type]: " . json_encode($details));
            }
        } catch (Exception $e) {
            // Don't fail the request if logging fails, just log the error
            error_log("Failed to log security event [$event_type]: " . $e->getMessage());
        }
    }
}