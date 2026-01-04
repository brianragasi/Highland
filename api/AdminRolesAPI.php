<?php
// Simple Admin Roles API for assigning Production Supervisor role
require_once '../api/DatabaseConfig.php';
session_start();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed');
    }
    $conn = getDBConnection();
    // Auth: Must be Admin
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('Not authenticated');
    }
    $stmt = $conn->prepare("SELECT ur.role_name FROM users u JOIN user_roles ur ON u.role_id = ur.role_id WHERE u.user_id = ? LIMIT 1");
    $stmt->execute([$_SESSION['user_id']]);
    $currentRole = $stmt->fetchColumn();
    if ($currentRole !== 'Admin') {
        throw new Exception('Only Admin can assign roles');
    }
    $payload = json_decode(file_get_contents('php://input'), true) ?? [];
    $userId = $payload['user_id'] ?? null;
    $newRole = $payload['role_name'] ?? null;
    if (!$userId || !$newRole) {
        throw new Exception('user_id and role_name required');
    }
    // Get target role_id
    $stmt = $conn->prepare("SELECT role_id FROM user_roles WHERE role_name = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$newRole]);
    $roleId = $stmt->fetchColumn();
    if (!$roleId) {
        throw new Exception('Role not found or inactive');
    }
    $stmt = $conn->prepare("UPDATE users SET role_id = ? WHERE user_id = ? LIMIT 1");
    $stmt->execute([$roleId, $userId]);
    if ($stmt->rowCount() === 0) {
        throw new Exception('User not updated (check user_id)');
    }
    echo json_encode(['success'=>true,'message'=>'Role updated','user_id'=>$userId,'role_name'=>$newRole]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
?>
