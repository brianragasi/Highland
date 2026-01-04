<?php
/**
 * Test getSupplierSummary endpoint
 */
echo "=== TESTING getSupplierSummary ===\n\n";

$_GET['action'] = 'getSupplierSummary';
$_GET['supplier_id'] = 1;

ob_start();
include __DIR__ . '/../api/FarmerPayoutAPI.php';
$output = ob_get_clean();
$data = json_decode($output, true);

if ($data['success']) {
    echo "✓ Success\n\n";
    
    $supplier = $data['data']['supplier'] ?? [];
    echo "Supplier Details:\n";
    echo "  - ID: " . ($supplier['supplier_id'] ?? 'N/A') . "\n";
    echo "  - Name: " . ($supplier['name'] ?? 'N/A') . "\n";
    echo "  - Company Name (alias): " . ($supplier['company_name'] ?? 'MISSING!') . "\n";
    echo "  - Contact Person: " . ($supplier['contact_person'] ?? 'N/A') . "\n";
    echo "  - Phone: " . ($supplier['phone'] ?? 'N/A') . "\n";
    echo "  - Email: " . ($supplier['email'] ?? 'N/A') . "\n";
    
    $summary = $data['data']['summary'] ?? [];
    echo "\nCollection Summary (what UI expects):\n";
    echo "  - Collection Count: " . ($summary['collection_count'] ?? 0) . "\n";
    echo "  - Total Delivered: " . number_format($summary['total_delivered'] ?? 0, 2) . " L\n";
    echo "  - Total Accepted: " . number_format($summary['total_accepted'] ?? 0, 2) . " L\n";
    echo "  - Total Rejected: " . number_format($summary['total_rejected'] ?? 0, 2) . " L\n";
    echo "  - Acceptance Rate: " . ($summary['acceptance_rate'] ?? 0) . "%\n";
    
    // Calculate payout like UI does
    $pricePerLiter = 40.00;
    $grossAmount = ($summary['total_accepted'] ?? 0) * $pricePerLiter;
    echo "\nPayout Calculation:\n";
    echo "  - Price per Liter: ₱" . number_format($pricePerLiter, 2) . "\n";
    echo "  - Gross Amount: ₱" . number_format($grossAmount, 2) . "\n";
    
    echo "\nCollections: " . count($data['data']['collections'] ?? []) . " records\n";
} else {
    echo "✗ Error: " . ($data['message'] ?? 'Unknown error') . "\n";
    echo "Raw output: " . $output . "\n";
}
