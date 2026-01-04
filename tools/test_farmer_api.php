<?php
/**
 * Test FarmerPayoutAPI endpoints
 */
echo "=== TESTING FarmerPayoutAPI ===\n\n";

// Test 1: getPayoutDashboard
echo "1. Testing getPayoutDashboard:\n";
$_GET['action'] = 'getPayoutDashboard';
ob_start();
include __DIR__ . '/../api/FarmerPayoutAPI.php';
$output = ob_get_clean();
$data = json_decode($output, true);
if ($data['success']) {
    echo "   ✓ Success\n";
    echo "   Stats: " . json_encode($data['data']['stats']) . "\n";
    echo "   Recent Payouts: " . count($data['data']['recent_payouts'] ?? []) . "\n";
    echo "   Suppliers Needing Payout: " . count($data['data']['suppliers_needing_payout'] ?? []) . "\n";
    
    // Show suppliers needing payout
    $suppliers = $data['data']['suppliers_needing_payout'] ?? [];
    if (count($suppliers) > 0) {
        echo "\n   Suppliers Needing Payout Details:\n";
        foreach ($suppliers as $s) {
            echo "   - [{$s['supplier_id']}] {$s['name']}: {$s['total_liters']}L, ₱" . number_format($s['pending_amount'], 2) . "\n";
        }
    }
} else {
    echo "   ✗ Error: " . ($data['message'] ?? $output) . "\n";
}

