<?php
/**
 * Add sample milk collections for current month (for thesis demo)
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');

echo "=== ADD SAMPLE COLLECTIONS FOR CURRENT MONTH ===\n\n";

// Get current month dates
$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));
$twoDaysAgo = date('Y-m-d', strtotime('-2 days'));
$threeDaysAgo = date('Y-m-d', strtotime('-3 days'));

echo "Adding collections for dates:\n";
echo "  - $threeDaysAgo\n";
echo "  - $twoDaysAgo\n";
echo "  - $yesterday\n";
echo "  - $today\n\n";

// Sample collections data - realistic dairy farm deliveries
$collections = [
    // Supplier 1: Lacandula Farm - Regular daily deliveries
    ['supplier_id' => 1, 'collection_date' => $threeDaysAgo, 'liters_delivered' => 150.00, 'liters_accepted' => 145.00, 'liters_rejected' => 5.00, 'fat_content' => 3.8],
    ['supplier_id' => 1, 'collection_date' => $twoDaysAgo, 'liters_delivered' => 160.00, 'liters_accepted' => 160.00, 'liters_rejected' => 0.00, 'fat_content' => 4.0],
    ['supplier_id' => 1, 'collection_date' => $yesterday, 'liters_delivered' => 155.00, 'liters_accepted' => 155.00, 'liters_rejected' => 0.00, 'fat_content' => 3.9],
    ['supplier_id' => 1, 'collection_date' => $today, 'liters_delivered' => 148.00, 'liters_accepted' => 148.00, 'liters_rejected' => 0.00, 'fat_content' => 4.1],
    
    // Supplier 2: Galla Farm - Smaller operation
    ['supplier_id' => 2, 'collection_date' => $twoDaysAgo, 'liters_delivered' => 80.00, 'liters_accepted' => 78.00, 'liters_rejected' => 2.00, 'fat_content' => 3.7],
    ['supplier_id' => 2, 'collection_date' => $today, 'liters_delivered' => 85.00, 'liters_accepted' => 85.00, 'liters_rejected' => 0.00, 'fat_content' => 3.8],
    
    // Supplier 3: DMDC - Cooperative, larger volumes
    ['supplier_id' => 3, 'collection_date' => $threeDaysAgo, 'liters_delivered' => 200.00, 'liters_accepted' => 190.00, 'liters_rejected' => 10.00, 'fat_content' => 3.6],
    ['supplier_id' => 3, 'collection_date' => $twoDaysAgo, 'liters_delivered' => 220.00, 'liters_accepted' => 220.00, 'liters_rejected' => 0.00, 'fat_content' => 3.8],
    ['supplier_id' => 3, 'collection_date' => $yesterday, 'liters_delivered' => 210.00, 'liters_accepted' => 205.00, 'liters_rejected' => 5.00, 'fat_content' => 3.7],
    ['supplier_id' => 3, 'collection_date' => $today, 'liters_delivered' => 215.00, 'liters_accepted' => 215.00, 'liters_rejected' => 0.00, 'fat_content' => 3.9],
    
    // Supplier 4: Dumundin - Occasional deliveries
    ['supplier_id' => 4, 'collection_date' => $yesterday, 'liters_delivered' => 50.00, 'liters_accepted' => 50.00, 'liters_rejected' => 0.00, 'fat_content' => 4.2],
];

// Generate RMR numbers
function generateRMR($date, $supplierId, $sequence) {
    return 'RMR-' . date('Ymd', strtotime($date)) . '-' . str_pad($supplierId, 2, '0', STR_PAD_LEFT) . '-' . str_pad($sequence, 3, '0', STR_PAD_LEFT);
}

$sequence = 1;
$inserted = 0;

$stmt = $pdo->prepare("
    INSERT INTO milk_daily_collections 
    (rmr_number, supplier_id, collection_date, liters_delivered, liters_accepted, liters_rejected, fat_content, base_price_per_liter, total_amount, qc_officer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 40.00, ?, 1)
");

foreach ($collections as $c) {
    $rmr = generateRMR($c['collection_date'], $c['supplier_id'], $sequence);
    $totalAmount = $c['liters_accepted'] * 40.00; // Base price per liter
    
    // Check if already exists
    $check = $pdo->prepare("SELECT 1 FROM milk_daily_collections WHERE rmr_number = ?");
    $check->execute([$rmr]);
    
    if (!$check->fetch()) {
        $stmt->execute([
            $rmr,
            $c['supplier_id'],
            $c['collection_date'],
            $c['liters_delivered'],
            $c['liters_accepted'],
            $c['liters_rejected'],
            $c['fat_content'],
            $totalAmount
        ]);
        $inserted++;
        echo "✓ Added: $rmr - Supplier {$c['supplier_id']}, {$c['liters_delivered']}L\n";
    } else {
        echo "- Skipped (exists): $rmr\n";
    }
    
    $sequence++;
}

echo "\n=== SUMMARY ===\n";
echo "Inserted: $inserted new collections\n";

// Verify totals
echo "\nCurrent period collections by supplier:\n";
$periodStart = date('Y-m-01');
$periodEnd = date('Y-m-d');
echo "Period: $periodStart to $periodEnd\n\n";

$stmt = $pdo->prepare("
    SELECT 
        s.supplier_id,
        s.name,
        COUNT(*) as collection_count,
        SUM(mdc.liters_delivered) as total_delivered,
        SUM(mdc.liters_accepted) as total_accepted
    FROM milk_daily_collections mdc
    JOIN suppliers s ON mdc.supplier_id = s.supplier_id
    WHERE mdc.collection_date BETWEEN ? AND ?
    GROUP BY s.supplier_id, s.name
");
$stmt->execute([$periodStart, $periodEnd]);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($results as $r) {
    echo "  [{$r['supplier_id']}] {$r['name']}: {$r['collection_count']} collections, {$r['total_delivered']}L delivered, {$r['total_accepted']}L accepted\n";
}
