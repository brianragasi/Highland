<?php
require_once __DIR__ . '/BaseAPI.php';
require_once __DIR__ . '/SessionConfig.php';
class SuppliersAPI extends BaseAPI
{
    public function route(): void
    {
        $this->initializeSession();
        $method = $this->getMethod();
        if ($method === 'GET') {
            if (!$this->requireInventoryProductionOrAdminAuth()) {
                return;
            }
        } else {
            
            if (!hasRole('Admin')) {
                $this->respond(['success' => false, 'message' => 'Administrator access required'], 403);
                return;
            }
        }
        $input = $this->getJsonInput() ?? [];
        $operation = $this->getOperation();
        $this->handle(function () use ($method, $operation, $input) {
            switch ($operation ?: $method) {
                case 'GET':
                case 'getAllSuppliers':
                    // Check if requesting a specific supplier
                    if (isset($_GET['action']) && $_GET['action'] === 'get_supplier' && isset($_GET['supplier_id'])) {
                        $this->getSupplier((int)$_GET['supplier_id']);
                    } else {
                        $this->getAllSuppliers($input);
                    }
                    break;
                case 'POST':
                case 'insertSupplier':
                    $this->insertSupplier($input);
                    break;
                case 'PUT':
                case 'updateSupplier':
                    $this->updateSupplier($input);
                    break;
                case 'DELETE':
                case 'deleteSupplier':
                    $this->deleteSupplier($input);
                    break;
                default:
                    $this->respond(['success' => false, 'message' => 'Method not allowed'], 405);
                    break;
            }
        });
    }
    public function getAllSuppliers(array $input = []): void
    {
        $stmt = $this->db()->prepare(
            "SELECT 
                s.*,
                pt.term_code,
                pt.term_name,
                pt.days_to_pay,
                c.city_name,
                c.region,
                co.country_name,
                co.country_code
            FROM suppliers s
            LEFT JOIN payment_terms pt ON s.payment_term_id = pt.payment_term_id
            LEFT JOIN cities c ON s.city_id = c.city_id
            LEFT JOIN countries co ON s.country_id = co.country_id
            ORDER BY s.name ASC"
        );
        $stmt->execute();
        $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($suppliers as &$supplier) {
            $supplier['supplier_id'] = (int)$supplier['supplier_id'];
            if (isset($supplier['payment_term_id']) && $supplier['payment_term_id'] !== null) {
                $supplier['payment_term_id'] = (int)$supplier['payment_term_id'];
            }
            if (isset($supplier['days_to_pay']) && $supplier['days_to_pay'] !== null) {
                $supplier['days_to_pay'] = (int)$supplier['days_to_pay'];
            }
            if (isset($supplier['country_id']) && $supplier['country_id'] !== null) {
                $supplier['country_id'] = (int)$supplier['country_id'];
            }
            if (isset($supplier['city_id']) && $supplier['city_id'] !== null) {
                $supplier['city_id'] = (int)$supplier['city_id'];
            }
            // Convert is_nmfdc_member to boolean
            $supplier['is_nmfdc_member'] = isset($supplier['is_nmfdc_member']) ? (bool)$supplier['is_nmfdc_member'] : false;
        }
        $this->respond(['success' => true, 'data' => $suppliers, 'count' => count($suppliers)]);
    }

    public function getSupplier(int $supplierId): void
    {
        $stmt = $this->db()->prepare(
            "SELECT 
                s.*,
                pt.term_code,
                pt.term_name,
                pt.days_to_pay,
                c.city_name,
                c.region,
                co.country_name,
                co.country_code
            FROM suppliers s
            LEFT JOIN payment_terms pt ON s.payment_term_id = pt.payment_term_id
            LEFT JOIN cities c ON s.city_id = c.city_id
            LEFT JOIN countries co ON s.country_id = co.country_id
            WHERE s.supplier_id = ?
            LIMIT 1"
        );
        $stmt->execute([$supplierId]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$supplier) {
            $this->respond(['success' => false, 'message' => 'Supplier not found'], 404);
            return;
        }
        
        // Convert numeric fields
        $supplier['supplier_id'] = (int)$supplier['supplier_id'];
        if (isset($supplier['payment_term_id']) && $supplier['payment_term_id'] !== null) {
            $supplier['payment_term_id'] = (int)$supplier['payment_term_id'];
        }
        if (isset($supplier['days_to_pay']) && $supplier['days_to_pay'] !== null) {
            $supplier['days_to_pay'] = (int)$supplier['days_to_pay'];
        }
        if (isset($supplier['country_id']) && $supplier['country_id'] !== null) {
            $supplier['country_id'] = (int)$supplier['country_id'];
        }
        if (isset($supplier['city_id']) && $supplier['city_id'] !== null) {
            $supplier['city_id'] = (int)$supplier['city_id'];
        }
        // Convert is_nmfdc_member to boolean
        $supplier['is_nmfdc_member'] = isset($supplier['is_nmfdc_member']) ? (bool)$supplier['is_nmfdc_member'] : false;
        
        $this->respond(['success' => true, 'supplier' => $supplier]);
    }

    public function insertSupplier(array $input): void
    {
        $required = ['name', 'contact_person', 'email', 'phone_number'];
        $missing = $this->requireParams($input, $required);
        if ($missing) {
            $this->respond(['success' => false, 'message' => "Field '" . $missing[0] . "' is required"], 400);
            return;
        }
        if (!filter_var((string)$input['email'], FILTER_VALIDATE_EMAIL)) {
            $this->respond(['success' => false, 'message' => 'Invalid email format'], 400);
            return;
        }
        $name = trim((string)$input['name']);
        $contact_person = trim((string)$input['contact_person']);
        $email = trim(strtolower((string)$input['email']));
        $phone_number = trim((string)$input['phone_number']);
    $payment_term_id = isset($input['payment_term_id']) && $input['payment_term_id'] !== '' ? (int)$input['payment_term_id'] : null;
        $address = isset($input['address']) ? trim((string)$input['address']) : null;
        $country_id = isset($input['country_id']) && $input['country_id'] !== '' ? (int)$input['country_id'] : null;
        $city_id = isset($input['city_id']) && $input['city_id'] !== '' ? (int)$input['city_id'] : null;
        $postal_code = isset($input['postal_code']) ? trim((string)$input['postal_code']) : null;
        $tax_id = isset($input['tax_id']) ? trim((string)$input['tax_id']) : null;
        $supplier_type = isset($input['supplier_type']) ? trim((string)$input['supplier_type']) : 'Dairy Cooperative';
        $cooperative_code = isset($input['cooperative_code']) ? trim((string)$input['cooperative_code']) : null;
        $daily_milk_capacity_liters = isset($input['daily_milk_capacity_liters']) && $input['daily_milk_capacity_liters'] !== '' ? (float)$input['daily_milk_capacity_liters'] : null;
        $number_of_cows = isset($input['number_of_cows']) && $input['number_of_cows'] !== '' ? (int)$input['number_of_cows'] : null;
        $milk_quality_grade = isset($input['milk_quality_grade']) ? trim((string)$input['milk_quality_grade']) : 'Grade A';
        $delivery_schedule = isset($input['delivery_schedule']) ? trim((string)$input['delivery_schedule']) : 'Daily';
        $established_year = isset($input['established_year']) && $input['established_year'] !== '' ? (int)$input['established_year'] : null;
        if ($established_year !== null && ($established_year < 1901 || $established_year > 2155 || $established_year == 0)) {
            $established_year = null;
        }
        $collection_station_address = isset($input['collection_station_address']) ? trim((string)$input['collection_station_address']) : null;
        $is_nmfdc_member = isset($input['is_nmfdc_member']) ? (bool)$input['is_nmfdc_member'] : false;
        $is_nmfdc_member = $is_nmfdc_member ? 1 : 0;
        if (strlen($name) > 255 || strlen($contact_person) > 255 || strlen($email) > 255 || strlen($phone_number) > 20) {
            $this->respond(['success' => false, 'message' => 'One or more fields exceed maximum length'], 400);
            return;
        }
        if ($address && strlen($address) > 500) { $this->respond(['success'=>false,'message'=>'Address exceeds maximum length'],400); return; }
        if ($postal_code && strlen($postal_code) > 20) { $this->respond(['success'=>false,'message'=>'Postal code exceeds maximum length'],400); return; }
        if ($tax_id && strlen($tax_id) > 50) { $this->respond(['success'=>false,'message'=>'Tax ID exceeds maximum length'],400); return; }
        if ($payment_term_id === null) {
            $pt = $this->db()->prepare("SELECT payment_term_id FROM payment_terms WHERE term_code = 'NET30' LIMIT 1");
            try { $pt->execute(); $row = $pt->fetch(PDO::FETCH_ASSOC); } catch (Throwable $e) { $row = false; }
            if ($row && isset($row['payment_term_id'])) {
                $payment_term_id = (int)$row['payment_term_id'];
            } else {
                $pt2 = $this->db()->prepare('SELECT payment_term_id FROM payment_terms ORDER BY payment_term_id ASC LIMIT 1');
                try { $pt2->execute(); $row2 = $pt2->fetch(PDO::FETCH_ASSOC); } catch (Throwable $e) { $row2 = false; }
                if ($row2 && isset($row2['payment_term_id'])) {
                    $payment_term_id = (int)$row2['payment_term_id'];
                }
            }
        }
        $stmt = $this->db()->prepare(
            'INSERT INTO suppliers (name, contact_person, email, phone_number, payment_term_id, address, country_id, city_id, postal_code, tax_id, supplier_type, cooperative_code, daily_milk_capacity_liters, number_of_cows, milk_quality_grade, delivery_schedule, established_year, collection_station_address, is_nmfdc_member)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$name, $contact_person, $email, $phone_number, $payment_term_id, $address, $country_id, $city_id, $postal_code, $tax_id, $supplier_type, $cooperative_code, $daily_milk_capacity_liters, $number_of_cows, $milk_quality_grade, $delivery_schedule, $established_year, $collection_station_address, $is_nmfdc_member]);
        $newId = (int)$this->db()->lastInsertId();
        $fetch = $this->db()->prepare(
            "SELECT 
                s.*,
                pt.term_code,
                pt.term_name,
                pt.days_to_pay,
                c.city_name,
                c.region,
                co.country_name,
                co.country_code
            FROM suppliers s
            LEFT JOIN payment_terms pt ON s.payment_term_id = pt.payment_term_id
            LEFT JOIN cities c ON s.city_id = c.city_id
            LEFT JOIN countries co ON s.country_id = co.country_id
            WHERE s.supplier_id = ?"
        );
        $fetch->execute([$newId]);
        $supplier = $fetch->fetch(PDO::FETCH_ASSOC);
        $supplier['supplier_id'] = (int)$supplier['supplier_id'];
        if (isset($supplier['payment_term_id']) && $supplier['payment_term_id'] !== null) {
            $supplier['payment_term_id'] = (int)$supplier['payment_term_id'];
        }
        if (isset($supplier['country_id']) && $supplier['country_id'] !== null) {
            $supplier['country_id'] = (int)$supplier['country_id'];
        }
        if (isset($supplier['city_id']) && $supplier['city_id'] !== null) {
            $supplier['city_id'] = (int)$supplier['city_id'];
        }
        if (isset($supplier['days_to_pay']) && $supplier['days_to_pay'] !== null) {
            $supplier['days_to_pay'] = (int)$supplier['days_to_pay'];
        }
        // Convert is_nmfdc_member to boolean
        $supplier['is_nmfdc_member'] = isset($supplier['is_nmfdc_member']) ? (bool)$supplier['is_nmfdc_member'] : false;
        $this->respond(['success' => true, 'message' => 'Supplier created successfully', 'data' => $supplier], 201);
    }
    public function updateSupplier(array $input): void
    {
        $id = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) { $id = (int)$_GET['id']; }
        elseif (isset($input['id']) && is_numeric($input['id'])) { $id = (int)$input['id']; }
        if (!$id) { $this->respond(['success'=>false,'message'=>'Valid supplier ID is required'],400); return; }
        $check = $this->db()->prepare('SELECT supplier_id FROM suppliers WHERE supplier_id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) { $this->respond(['success'=>false,'message'=>'Supplier not found'],404); return; }
        $required = ['name', 'contact_person', 'email', 'phone_number'];
        $missing = $this->requireParams($input, $required);
        if ($missing) { $this->respond(['success'=>false,'message'=>"Field '".$missing[0]."' is required"],400); return; }
        if (!filter_var((string)$input['email'], FILTER_VALIDATE_EMAIL)) { $this->respond(['success'=>false,'message'=>'Invalid email format'],400); return; }
        $name = trim((string)$input['name']);
        $contact_person = trim((string)$input['contact_person']);
        $email = trim(strtolower((string)$input['email']));
        $phone_number = trim((string)$input['phone_number']);
        $address = isset($input['address']) ? trim((string)$input['address']) : null;
        $country_id = isset($input['country_id']) && $input['country_id'] !== '' ? (int)$input['country_id'] : null;
        $city_id = isset($input['city_id']) && $input['city_id'] !== '' ? (int)$input['city_id'] : null;
        $postal_code = isset($input['postal_code']) ? trim((string)$input['postal_code']) : null;
        $tax_id = isset($input['tax_id']) ? trim((string)$input['tax_id']) : null;
        if (strlen($name) > 255 || strlen($contact_person) > 255 || strlen($email) > 255 || strlen($phone_number) > 20) { $this->respond(['success'=>false,'message'=>'One or more fields exceed maximum length'],400); return; }
        if ($address && strlen($address) > 500) { $this->respond(['success'=>false,'message'=>'Address exceeds maximum length'],400); return; }
        if ($postal_code && strlen($postal_code) > 20) { $this->respond(['success'=>false,'message'=>'Postal code exceeds maximum length'],400); return; }
        if ($tax_id && strlen($tax_id) > 50) { $this->respond(['success'=>false,'message'=>'Tax ID exceeds maximum length'],400); return; }
        $fields = ['name' => $name, 'contact_person' => $contact_person, 'email' => $email, 'phone_number' => $phone_number];
        if (array_key_exists('payment_term_id', $input)) {
            $pti = $input['payment_term_id'] !== '' ? (int)$input['payment_term_id'] : null;
            if ($pti !== null) {
                $fields['payment_term_id'] = $pti;
            }
        } else {
            $ex = $this->db()->prepare('SELECT payment_term_id FROM suppliers WHERE supplier_id = ?');
            $ex->execute([$id]);
            $cur = $ex->fetch(PDO::FETCH_ASSOC);
            if ($cur && isset($cur['payment_term_id'])) {
                $fields['payment_term_id'] = (int)$cur['payment_term_id'];
            }
        }
        if (array_key_exists('address', $input)) { $fields['address'] = $address; }
        if (array_key_exists('country_id', $input)) { $fields['country_id'] = $country_id; }
        if (array_key_exists('city_id', $input)) { $fields['city_id'] = $city_id; }
        if (array_key_exists('postal_code', $input)) { $fields['postal_code'] = $postal_code; }
        if (array_key_exists('tax_id', $input)) { $fields['tax_id'] = $tax_id; }
        if (array_key_exists('supplier_type', $input)) {
            $fields['supplier_type'] = isset($input['supplier_type']) ? trim((string)$input['supplier_type']) : 'Dairy Cooperative';
        }
        if (array_key_exists('cooperative_code', $input)) {
            $fields['cooperative_code'] = isset($input['cooperative_code']) ? trim((string)$input['cooperative_code']) : null;
        }
        if (array_key_exists('daily_milk_capacity_liters', $input)) {
            $fields['daily_milk_capacity_liters'] = isset($input['daily_milk_capacity_liters']) && $input['daily_milk_capacity_liters'] !== '' ? (float)$input['daily_milk_capacity_liters'] : null;
        }
        if (array_key_exists('number_of_cows', $input)) {
            $fields['number_of_cows'] = isset($input['number_of_cows']) && $input['number_of_cows'] !== '' ? (int)$input['number_of_cows'] : null;
        }
        if (array_key_exists('milk_quality_grade', $input)) {
            $fields['milk_quality_grade'] = isset($input['milk_quality_grade']) ? trim((string)$input['milk_quality_grade']) : 'Grade A';
        }
        if (array_key_exists('delivery_schedule', $input)) {
            $fields['delivery_schedule'] = isset($input['delivery_schedule']) ? trim((string)$input['delivery_schedule']) : 'Daily';
        }
        if (array_key_exists('established_year', $input)) {
            $established_year = isset($input['established_year']) && $input['established_year'] !== '' ? (int)$input['established_year'] : null;
            if ($established_year !== null && ($established_year < 1901 || $established_year > 2155 || $established_year == 0)) {
                $established_year = null;
            }
            $fields['established_year'] = $established_year;
        }
        if (array_key_exists('collection_station_address', $input)) {
            $fields['collection_station_address'] = isset($input['collection_station_address']) ? trim((string)$input['collection_station_address']) : null;
        }
        if (array_key_exists('is_nmfdc_member', $input)) {
            $fields['is_nmfdc_member'] = isset($input['is_nmfdc_member']) ? (bool)$input['is_nmfdc_member'] : false;
        }
        $setParts = [];
        $values = [];
        foreach ($fields as $col => $val) { $setParts[] = "$col = ?"; $values[] = $val; }
        $setParts[] = 'updated_at = CURRENT_TIMESTAMP';
        $values[] = $id;
        $sql = 'UPDATE suppliers SET ' . implode(', ', $setParts) . ' WHERE supplier_id = ?';
        $stmt = $this->db()->prepare($sql);
        $stmt->execute($values);
        $fetch = $this->db()->prepare(
            "SELECT 
                s.*,
                pt.term_code,
                pt.term_name,
                pt.days_to_pay,
                c.city_name,
                c.region,
                co.country_name,
                co.country_code
            FROM suppliers s
            LEFT JOIN payment_terms pt ON s.payment_term_id = pt.payment_term_id
            LEFT JOIN cities c ON s.city_id = c.city_id
            LEFT JOIN countries co ON s.country_id = co.country_id
            WHERE s.supplier_id = ?"
        );
        $fetch->execute([$id]);
        $supplier = $fetch->fetch(PDO::FETCH_ASSOC);
        $supplier['supplier_id'] = (int)$supplier['supplier_id'];
        if (isset($supplier['payment_term_id']) && $supplier['payment_term_id'] !== null) {
            $supplier['payment_term_id'] = (int)$supplier['payment_term_id'];
        }
        if (isset($supplier['country_id']) && $supplier['country_id'] !== null) {
            $supplier['country_id'] = (int)$supplier['country_id'];
        }
        if (isset($supplier['city_id']) && $supplier['city_id'] !== null) {
            $supplier['city_id'] = (int)$supplier['city_id'];
        }
        if (isset($supplier['days_to_pay']) && $supplier['days_to_pay'] !== null) {
            $supplier['days_to_pay'] = (int)$supplier['days_to_pay'];
        }
        // Convert is_nmfdc_member to boolean
        $supplier['is_nmfdc_member'] = isset($supplier['is_nmfdc_member']) ? (bool)$supplier['is_nmfdc_member'] : false;
        $this->respond(['success' => true, 'message' => 'Supplier updated successfully', 'data' => $supplier]);
    }
    public function deleteSupplier(array $input): void
    {
        $id = null;
        if (isset($_GET['id']) && is_numeric($_GET['id'])) { $id = (int)$_GET['id']; }
        elseif (isset($input['id']) && is_numeric($input['id'])) { $id = (int)$input['id']; }
        if (!$id) { $this->respond(['success'=>false,'message'=>'Valid supplier ID is required'],400); return; }
        $check = $this->db()->prepare('SELECT supplier_id, name FROM suppliers WHERE supplier_id = ?');
        $check->execute([$id]);
        $supplier = $check->fetch(PDO::FETCH_ASSOC);
        if (!$supplier) { $this->respond(['success'=>false,'message'=>'Supplier not found'],404); return; }
        try {
            $del = $this->db()->prepare('DELETE FROM suppliers WHERE supplier_id = ?');
            $del->execute([$id]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                $this->respond(['success' => false, 'message' => 'Cannot delete supplier: there are related purchase orders'], 409);
                return;
            }
            throw $e;
        }
        $this->respond(['success' => true, 'message' => "Supplier '" . $supplier['name'] . "' deleted successfully" ]);
    }
}
if (!defined('TESTING') && basename($_SERVER['SCRIPT_NAME']) === 'SuppliersAPI.php') {
    $api = new SuppliersAPI(['methods' => 'GET, POST, PUT, DELETE, OPTIONS']);
    $api->route();
}