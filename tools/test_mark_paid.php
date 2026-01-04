<?php
/**
 * Test markAsPaid action
 */
echo "=== TESTING markAsPaid ===\n\n";

// Simulate POST with JSON body
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';

// Create test data
$testData = json_encode([
    'action' => 'markAsPaid',
    'payout_id' => 2,
    'payment_method' => 'Bank Transfer',
    'payment_reference' => 'TEST-REF-001',
    'payment_date' => '2026-01-04',
    'payment_notes' => 'Test payment'
]);

// Write to php://input simulation
// We need to check how the API reads the input

echo "Test data: $testData\n\n";

// Check if there are any approved payouts
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$stmt = $pdo->query("SELECT payout_id, payout_reference, status FROM farmer_payouts");
$payouts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Current payouts:\n";
foreach ($payouts as $p) {
    echo "  - [{$p['payout_id']}] {$p['payout_reference']}: {$p['status']}\n";
}

echo "\n";

// Find an approved payout
$approvedPayout = null;
foreach ($payouts as $p) {
    if ($p['status'] === 'Approved') {
        $approvedPayout = $p;
        break;
    }
}

if ($approvedPayout) {
    echo "Found approved payout: {$approvedPayout['payout_reference']}\n";
} else {
    echo "No approved payouts found. Need to create one first.\n";
}
