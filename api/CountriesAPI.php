<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
class CountriesAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return;
        }
        // Allow Admin, Warehouse Manager, and Warehouse Staff to view countries
        if (!hasRole('Admin') && !hasRole('Warehouse Manager') && !hasRole('Warehouse Staff')) {
            $this->respond(['success' => false, 'message' => 'Access denied'], 403);
            return;
        }
        $method = $this->getMethod();
        $operation = $this->getOperation();
        $input = $this->getJsonInput() ?? [];
        $this->handle(function () use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'GET':
                case 'getAllCountries':
                    $this->getAllCountries($input);
                    break;
                case 'getCountry':
                    $this->getAllCountries($input); 
                    break;
                default:
                    $this->respond(['success' => false, 'message' => 'Method not allowed'], 405);
                    break;
            }
        });
    }
    public function getAllCountries(array $input = []): void
    {
        $stmt = $this->db()->prepare(
            "SELECT 
                country_id,
                country_code,
                country_name,
                phone_prefix,
                currency_code
             FROM countries 
             WHERE is_active = TRUE 
             ORDER BY 
                CASE WHEN country_code = 'PHL' THEN 0 ELSE 1 END,
                country_name ASC"
        );
        $stmt->execute();
        $countries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($countries as &$country) {
            $country['country_id'] = (int)$country['country_id'];
        }
        $this->respond([
            'success' => true,
            'data' => $countries,
            'count' => count($countries)
        ]);
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'CountriesAPI.php') {
    $api = new CountriesAPI(['methods' => 'GET, OPTIONS']);
    $api->route();
}