<?php
/**
 * Diagnose Farmer Payout Synchronization Issues
 */
$pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db','root','');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== FARMER PAYOUT DIAGNOSTIC ===\n\n";

// 0. Check table structures
echo "0. TABLE STRUCTURES:\n";
echo "Suppliers columns: ";
$cols = $pdo->query('SHOW COLUMNS FROM suppliers')->fetchAll(PDO::FETCH_COLUMN);
echo implode(', ', $cols) . "\n\n";

// 1. Check milk_daily_collections
echo "1. MILK DAILY COLLECTIONS:\n";
$stmt = $pdo->query('
    SELECT c.*, s.name as supplier_name
    FROM milk_daily_collections c
    LEFT JOIN suppliers s ON c.supplier_id = s.supplier_id
    ORDER BY c.collection_date DESC
    LIMIT 10
');
$collections = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Total recent collections: " . count($collections) . "\n";
foreach ($collections as $c) {
    echo "  [{$c['collection_id']}] {$c['collection_date']} - {$c['supplier_name']}: {$c['quantity_liters']}L - Status: {$c['status']}\n";
}

// 2. Check farmer_payouts table
echo "\n2. FARMER PAYOUTS TABLE:\n";
try {
    $stmt = $pdo->query('SELECT * FROM farmer_payouts ORDER BY created_at DESC LIMIT 10');
    $payouts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Total recent payouts: " . count($payouts) . "\n";
    foreach ($payouts as $p) {
        echo "  [{$p['payout_id']}] Supplier {$p['supplier_id']}: ₱" . number_format($p['total_amount'], 2) . " - Status: {$p['status']}\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// 3. Check if collections have payout_id linked
echo "\n3. COLLECTIONS WITH PAYOUT LINKS:\n";
try {
    $stmt = $pdo->query('SHOW COLUMNS FROM milk_daily_collections');
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Columns: " . implode(', ', $columns) . "\n";
    
    if (in_array('payout_id', $columns)) {
        $stmt = $pdo->query('
            SELECT payout_id, COUNT(*) as count 
            FROM milk_daily_collections 
            GROUP BY payout_id
        ');
        $links = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($links as $l) {
            $payoutLabel = $l['payout_id'] ? "Payout #{$l['payout_id']}" : "NOT LINKED";
            echo "  $payoutLabel: {$l['count']} collections\n";
        }
    } else {
        echo "  WARNING: No payout_id column in milk_daily_collections!\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// 4. Check suppliers with milk category
echo "\n4. DAIRY SUPPLIERS:\n";
$stmt = $pdo->query("
    SELECT supplier_id, company_name, supplier_category 
    FROM suppliers 
    WHERE supplier_category LIKE '%milk%' OR supplier_category LIKE '%dairy%' OR supplier_category LIKE '%farm%'
    OR company_name LIKE '%farm%' OR company_name LIKE '%dairy%' OR company_name LIKE '%cooperative%'
");
$dairySuppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Total dairy suppliers: " . count($dairySuppliers) . "\n";
foreach ($dairySuppliers as $s) {
    echo "  [{$s['supplier_id']}] {$s['company_name']} ({$s['supplier_category']})\n";
}

// 5. Check collections by status
echo "\n5. COLLECTIONS BY STATUS:\n";
$stmt = $pdo->query('
    SELECT status, COUNT(*) as count, SUM(quantity_liters) as total_liters
    FROM milk_daily_collections
    GROUP BY status
');
$byStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($byStatus as $s) {
    echo "  {$s['status']}: {$s['count']} collections ({$s['total_liters']}L)\n";
}

// 6. Check for unpaid ACCEPTED collections
echo "\n6. UNPAID ACCEPTED COLLECTIONS:\n";
$columns = $pdo->query('SHOW COLUMNS FROM milk_daily_collections')->fetchAll(PDO::FETCH_COLUMN);
if (in_array('payout_id', $columns)) {
    $stmt = $pdo->query("
        SELECT c.*, s.company_name
        FROM milk_daily_collections c
        LEFT JOIN suppliers s ON c.supplier_id = s.supplier_id
        WHERE c.status = 'ACCEPTED' AND (c.payout_id IS NULL OR c.payout_id = 0)
        ORDER BY c.collection_date DESC
    ");
    $unpaid = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Total unpaid ACCEPTED: " . count($unpaid) . "\n";
    foreach ($unpaid as $u) {
        echo "  [{$u['collection_id']}] {$u['collection_date']} - {$u['company_name']}: {$u['quantity_liters']}L\n";
    }
} else {
    $stmt = $pdo->query("
        SELECT c.*, s.company_name
        FROM milk_daily_collections c
        LEFT JOIN suppliers s ON c.supplier_id = s.supplier_id
        WHERE c.status = 'ACCEPTED'
        ORDER BY c.collection_date DESC
    ");
    $accepted = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Total ACCEPTED (no payout tracking): " . count($accepted) . "\n";
    foreach ($accepted as $a) {
        echo "  [{$a['collection_id']}] {$a['collection_date']} - {$a['company_name']}: {$a['quantity_liters']}L\n";
    }
}

echo "\n=== END DIAGNOSTIC ===\n";
