<?php
$db = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Check if table exists
$stmt = $db->query("SHOW TABLES LIKE 'production_cost_approvals'");
$tables = $stmt->fetchAll();

if (empty($tables)) {
    echo "Table production_cost_approvals does NOT exist!\n";
    echo "Creating it now...\n";
    
    $db->exec("
        CREATE TABLE production_cost_approvals (
            approval_id INT AUTO_INCREMENT PRIMARY KEY,
            recipe_id INT NOT NULL,
            product_id INT NOT NULL,
            planned_quantity DECIMAL(10,2) NOT NULL,
            estimated_cost DECIMAL(10,2) NOT NULL,
            standard_cost DECIMAL(10,2) NOT NULL,
            variance_percent DECIMAL(5,2) NOT NULL,
            variance_amount DECIMAL(10,2) NOT NULL,
            batch_details JSON,
            status ENUM('pending','approved','rejected','expired') DEFAULT 'pending',
            requested_by INT NOT NULL,
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_by INT NULL,
            reviewed_at DATETIME NULL,
            review_notes TEXT NULL,
            FOREIGN KEY (recipe_id) REFERENCES production_recipes(recipe_id),
            FOREIGN KEY (product_id) REFERENCES products(product_id),
            FOREIGN KEY (requested_by) REFERENCES users(user_id),
            FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
        )
    ");
    echo "Table created!\n";
} else {
    echo "Table exists! Checking structure...\n";
    $stmt = $db->query("DESCRIBE production_cost_approvals");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
}

// Also check production_recipes has the new columns
echo "\n\nChecking production_recipes columns...\n";
$stmt = $db->query("SHOW COLUMNS FROM production_recipes LIKE 'standard_batch_cost'");
$col = $stmt->fetch();
if (!$col) {
    echo "Missing standard_batch_cost column! Adding...\n";
    $db->exec("ALTER TABLE production_recipes 
        ADD COLUMN standard_batch_cost DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN cost_variance_threshold_percent DECIMAL(5,2) DEFAULT 20.00,
        ADD COLUMN requires_cost_approval BOOLEAN DEFAULT FALSE");
    echo "Columns added!\n";
} else {
    echo "Columns exist!\n";
}

echo "\nDone!\n";

// Test the actual query
echo "\nTesting the actual API query...\n";
try {
    $stmt = $db->query("
        SELECT 
            pca.*,
            pr.recipe_name,
            p.name as product_name,
            CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) as requested_by_name,
            TIMESTAMPDIFF(HOUR, pca.requested_at, NOW()) as hours_pending
        FROM production_cost_approvals pca
        JOIN production_recipes pr ON pca.recipe_id = pr.recipe_id
        JOIN products p ON pca.product_id = p.product_id
        JOIN users u ON pca.requested_by = u.user_id
        WHERE pca.status = 'pending'
        ORDER BY pca.requested_at DESC
    ");
    $approvals = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Query succeeded! Found " . count($approvals) . " pending approvals.\n";
    print_r($approvals);
} catch (Exception $e) {
    echo "Query FAILED: " . $e->getMessage() . "\n";
}

// Check Yogurt Culture batches
echo "\n\n=== YOGURT CULTURE BATCHES ===\n";
$stmt = $db->query("SELECT batch_id, current_quantity, unit_cost, received_date, status FROM raw_material_batches WHERE raw_material_id = 16 ORDER BY received_date DESC, batch_id DESC");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

// Check latest Purchase Orders for Yogurt Culture
echo "\n\n=== RECENT PURCHASE ORDERS (Yogurt Culture) ===\n";
$stmt = $db->query("
    SELECT po.po_id, po.order_date, poi.quantity, poi.unit_cost 
    FROM purchase_orders po 
    JOIN purchase_order_items poi ON po.po_id = poi.po_id 
    WHERE poi.raw_material_id = 16 
    ORDER BY po.order_date DESC 
    LIMIT 5
");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

// Check latest notifications
echo "\n\n=== LATEST NOTIFICATIONS ===\n";
$stmt = $db->query("SELECT notification_id, notification_type, title, created_at FROM system_notifications ORDER BY created_at DESC LIMIT 10");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
