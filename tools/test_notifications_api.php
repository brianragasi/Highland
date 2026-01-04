<?php
/**
 * Direct test of SpoilageReportAPI getNotifications
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include the API file
chdir(__DIR__ . '/../api');
require_once 'SpoilageReportAPI.php';

// Simulate the request
$_GET['action'] = 'getNotifications';
$_SERVER['REQUEST_METHOD'] = 'GET';

echo "Testing SpoilageReportAPI getNotifications...\n\n";

// Capture output
ob_start();
$api = new SpoilageReportAPI();
$api->handleRequest();
$output = ob_get_clean();

echo "API Response:\n";
echo $output;
echo "\n\n";

// Parse and pretty print
$data = json_decode($output, true);
if ($data) {
    echo "Parsed Response:\n";
    echo "Success: " . ($data['success'] ? 'true' : 'false') . "\n";
    echo "Notifications count: " . count($data['notifications'] ?? []) . "\n";
    echo "Unread count: " . ($data['unread_count'] ?? 0) . "\n";
}
