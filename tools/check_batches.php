<?php
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');

echo "=== PRODUCTION BATCHES CHECK ===\n";

// Check table structure
$stmt = $pdo->query("DESCRIBE production_batches");
$cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Columns: " . implode(', ', $cols) . "\n\n";

// Check data
$stmt = $pdo->query("SELECT COUNT(*) FROM production_batches");
$count = $stmt->fetchColumn();
echo "Total batches: $count\n\n";

if ($count > 0) {
    // Check expiry dates
    $stmt = $pdo->query("
        SELECT 
            pb.batch_number,
            p.name as product_name,
            pb.expiry_date,
            pb.quantity_remaining,
            DATEDIFF(pb.expiry_date, CURDATE()) as days_until_expiry,
            pb.status
        FROM production_batches pb
        LEFT JOIN products p ON pb.product_id = p.product_id
        ORDER BY pb.expiry_date ASC
        LIMIT 10
    ");
    $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Batches (first 10 by expiry date):\n";
    foreach ($batches as $b) {
        $daysText = $b['days_until_expiry'] < 0 ? "EXPIRED " . abs($b['days_until_expiry']) . " days ago" : 
                    ($b['days_until_expiry'] == 0 ? "EXPIRES TODAY" : 
                    "expires in {$b['days_until_expiry']} days");
        echo "  - [{$b['batch_number']}] {$b['product_name']}: {$b['quantity_remaining']} qty, {$b['expiry_date']} ($daysText) - {$b['status']}\n";
    }
    
    // Check for items expiring within 3 days
    echo "\n=== ITEMS EXPIRING WITHIN 3 DAYS ===\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as cnt
        FROM production_batches pb
        WHERE pb.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
          AND pb.quantity_remaining > 0
          AND pb.status NOT IN ('EXPIRED', 'DISPOSED')
    ");
    $atRisk = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Items at risk: {$atRisk['cnt']}\n";
    
    if ($atRisk['cnt'] == 0) {
        echo "\nNo items expiring within 3 days - 'No inventory at risk' message is CORRECT.\n";
        echo "Current date: " . date('Y-m-d') . "\n";
        echo "Checking range: " . date('Y-m-d') . " to " . date('Y-m-d', strtotime('+3 days')) . "\n";
    }
}
