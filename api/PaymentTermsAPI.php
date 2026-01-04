<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
class PaymentTermsAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        if (!isAuthenticated()) {
            $this->respond(['success' => false, 'message' => 'Authentication required'], 401);
            return;
        }
        // Allow Admin, Warehouse Manager, and Warehouse Staff to view payment terms
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
                case 'getAllPaymentTerms':
                    $this->getAllPaymentTerms($input);
                    break;
                case 'getPaymentTerm':
                    $this->getAllPaymentTerms($input); 
                    break;
                default:
                    $this->respond(['success' => false, 'message' => 'Method not allowed'], 405);
                    break;
            }
        });
    }
    public function getAllPaymentTerms(array $input = []): void
    {
        $stmt = $this->db()->prepare(
            "SELECT 
                payment_term_id,
                term_code,
                term_name,
                days_to_pay,
                description
             FROM payment_terms 
             WHERE is_active = TRUE 
             ORDER BY days_to_pay ASC, term_code ASC"
        );
        $stmt->execute();
        $paymentTerms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($paymentTerms as &$term) {
            $term['payment_term_id'] = (int)$term['payment_term_id'];
            $term['days_to_pay'] = (int)$term['days_to_pay'];
        }
        $this->respond([
            'success' => true,
            'data' => $paymentTerms,
            'count' => count($paymentTerms)
        ]);
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'PaymentTermsAPI.php') {
    $api = new PaymentTermsAPI(['methods' => 'GET, OPTIONS']);
    $api->route();
}