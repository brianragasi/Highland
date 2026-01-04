<?php
/**
 * Deep Diagnostic Check for Finance Dashboard Issues
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');

echo "=== DEEP DIAGNOSTIC CHECK ===\n";
echo "Date: " . date('Y-m-d H:i:s') . "\n\n";

// 1. Check Session Issue
echo "1. SESSION ISSUE CHECK\n";
echo "   - FarmerPayoutAPI needs \$this->initializeSession() in constructor\n";

// Check if FarmerPayoutAPI has initializeSession
$apiFile = file_get_contents(__DIR__ . '/../api/FarmerPayoutAPI.php');
if (strpos($apiFile, 'initializeSession') !== false) {
    echo "   ✓ initializeSession found in FarmerPayoutAPI\n";
} else {
    echo "   ✗ MISSING: initializeSession() call in FarmerPayoutAPI constructor\n";
}

// 2. Check Payouts Table
echo "\n2. PAYOUTS CHECK\n";
$stmt = $pdo->query("SELECT COUNT(*) FROM farmer_payouts");
$payoutCount = $stmt->fetchColumn();
echo "   - Total payouts in database: $payoutCount\n";

if ($payoutCount > 0) {
    $stmt = $pdo->query("SELECT * FROM farmer_payouts ORDER BY created_at DESC LIMIT 5");
    $payouts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "   Recent payouts:\n";
    foreach ($payouts as $p) {
        echo "   - [{$p['payout_reference']}] Supplier {$p['supplier_id']}: ₱" . number_format($p['net_amount_payable'], 2) . " ({$p['status']})\n";
    }
} else {
    echo "   - No payouts generated yet (this is expected if none have been generated)\n";
}

// 3. Check Inventory At Risk
echo "\n3. INVENTORY AT RISK CHECK\n";

// Check finished_goods_inventory for expiring items
$threeDaysFromNow = date('Y-m-d', strtotime('+3 days'));
$stmt = $pdo->prepare("
    SELECT 
        fgi.batch_number,
        p.product_name,
        fgi.quantity,
        fgi.expiry_date,
        DATEDIFF(fgi.expiry_date, CURDATE()) as days_until_expiry
    FROM finished_goods_inventory fgi
    LEFT JOIN products p ON fgi.product_id = p.product_id
    WHERE fgi.expiry_date <= ?
      AND fgi.quantity > 0
    ORDER BY fgi.expiry_date ASC
    LIMIT 10
");
$stmt->execute([$threeDaysFromNow]);
$atRiskItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "   - Items expiring within 3 days: " . count($atRiskItems) . "\n";
if (count($atRiskItems) > 0) {
    foreach ($atRiskItems as $item) {
        echo "   - [{$item['batch_number']}] {$item['product_name']}: {$item['quantity']} units, expires {$item['expiry_date']} ({$item['days_until_expiry']} days)\n";
    }
}

// Check what's in the table
$stmt = $pdo->query("SELECT COUNT(*) FROM finished_goods_inventory WHERE quantity > 0");
$totalFGI = $stmt->fetchColumn();
echo "   - Total FGI batches with stock: $totalFGI\n";

// Check date range in finished_goods_inventory
$stmt = $pdo->query("SELECT MIN(expiry_date) as min_exp, MAX(expiry_date) as max_exp FROM finished_goods_inventory WHERE quantity > 0");
$dateRange = $stmt->fetch(PDO::FETCH_ASSOC);
echo "   - Expiry date range: {$dateRange['min_exp']} to {$dateRange['max_exp']}\n";
echo "   - Current date: " . date('Y-m-d') . "\n";

// 4. Check SpoilageReportAPI
echo "\n4. SPOILAGE REPORT API CHECK\n";
$apiFile = file_get_contents(__DIR__ . '/../api/SpoilageReportAPI.php');
if (strpos($apiFile, 'getInventoryAtRisk') !== false) {
    echo "   ✓ getInventoryAtRisk action exists\n";
} else {
    echo "   ✗ MISSING: getInventoryAtRisk action in SpoilageReportAPI\n";
}

// 5. Check milk collections data
echo "\n5. MILK COLLECTIONS DATA CHECK\n";
$stmt = $pdo->query("SELECT COUNT(*) FROM milk_daily_collections");
$collectionCount = $stmt->fetchColumn();
echo "   - Total milk collections: $collectionCount\n";

$stmt = $pdo->query("
    SELECT 
        s.name,
        COUNT(*) as collections,
        SUM(mdc.liters_accepted) as total_liters
    FROM milk_daily_collections mdc
    JOIN suppliers s ON mdc.supplier_id = s.supplier_id
    GROUP BY s.supplier_id, s.name
");
$bySupplier = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($bySupplier as $s) {
    echo "   - {$s['name']}: {$s['collections']} collections, {$s['total_liters']}L\n";
}

// 6. Recommendations
echo "\n=== RECOMMENDED FIXES ===\n";
echo "1. Add \$this->initializeSession() to FarmerPayoutAPI constructor\n";
echo "2. 'No payouts found' is correct - no payouts have been generated yet\n";
echo "3. Check if SpoilageReportAPI::getInventoryAtRisk query matches table structure\n";
