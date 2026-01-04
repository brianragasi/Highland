<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
class CitiesAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return;
        }
        // Allow Admin, Warehouse Manager, and Warehouse Staff to view cities
        if (!hasRole('Admin') && !hasRole('Warehouse Manager') && !hasRole('Warehouse Staff')) {
            $this->respond(['success' => false, 'message' => 'Access denied'], 403);
            return;
        }
        $method = $this->getMethod();
        $input = $this->getJsonInput() ?? [];
        $operation = $this->getOperation();
        $this->handle(function () use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'GET':
                case 'getAllCities':
                    $this->getAllCities($input);
                    break;
                case 'getCitiesByCountry':
                    $this->getAllCities($input); 
                    break;
                default:
                    $this->respond(['success' => false, 'message' => 'Method not allowed'], 405);
                    break;
            }
        });
    }
    public function getAllCities(array $input = []): void
    {
        $countryId = null;
        if (isset($_GET['country_id']) && is_numeric($_GET['country_id'])) {
            $countryId = (int)$_GET['country_id'];
        } elseif (isset($input['country_id']) && is_numeric($input['country_id'])) {
            $countryId = (int)$input['country_id'];
        }
        $sql = "
            SELECT 
                c.city_id,
                c.city_name,
                c.region,
                c.postal_code_pattern,
                c.country_id,
                co.country_name,
                co.country_code
            FROM cities c
            LEFT JOIN countries co ON c.country_id = co.country_id
            WHERE c.is_active = TRUE
        ";
        $params = [];
        if ($countryId !== null) {
            $sql .= " AND c.country_id = ?";
            $params[] = $countryId;
        }
        $sql .= " ORDER BY c.city_name ASC";
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($params);
        $cities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cities as &$city) {
            $city['city_id'] = (int)$city['city_id'];
            $city['country_id'] = (int)$city['country_id'];
        }
        $this->respond([
            'success' => true,
            'data' => $cities,
            'count' => count($cities),
            'filtered_by_country' => $countryId !== null ? $countryId : null,
        ]);
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'CitiesAPI.php') {
    $api = new CitiesAPI(['methods' => 'GET, OPTIONS']);
    $api->route();
}