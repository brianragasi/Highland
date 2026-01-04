<?php
$host = 'localhost';
$db = 'highland_fresh_db';
$user = 'root';
$pass = '';
$pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);

echo "=== ADDING COST THRESHOLD COLUMNS TO PRODUCTION_RECIPES ===\n";

// Add cost threshold columns to production_recipes
try {
    $pdo->exec("ALTER TABLE production_recipes 
        ADD COLUMN standard_batch_cost DECIMAL(12,2) DEFAULT NULL COMMENT 'Expected cost per batch at standard prices',
        ADD COLUMN cost_variance_threshold_percent DECIMAL(5,2) DEFAULT 10.00 COMMENT 'Percentage above standard that requires Finance approval',
        ADD COLUMN requires_cost_approval TINYINT(1) DEFAULT 0 COMMENT 'If 1, any cost variance requires approval'
    ");
    echo "Added columns to production_recipes\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column') !== false) {
        echo "Columns already exist\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

echo "\n=== CREATING PRODUCTION_COST_APPROVALS TABLE ===\n";

// Create production cost approvals table
$pdo->exec("
    CREATE TABLE IF NOT EXISTS production_cost_approvals (
        approval_id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        product_id INT NOT NULL,
        planned_quantity DECIMAL(12,3) NOT NULL,
        estimated_cost DECIMAL(12,2) NOT NULL,
        standard_cost DECIMAL(12,2) NOT NULL,
        variance_percent DECIMAL(5,2) NOT NULL,
        variance_amount DECIMAL(12,2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
        requested_by INT NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INT DEFAULT NULL,
        reviewed_at TIMESTAMP NULL,
        review_notes TEXT,
        batch_details JSON COMMENT 'FIFO batch breakdown at time of request',
        FOREIGN KEY (recipe_id) REFERENCES production_recipes(recipe_id),
        FOREIGN KEY (product_id) REFERENCES products(product_id),
        FOREIGN KEY (requested_by) REFERENCES users(user_id),
        FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
    )
");
echo "Created production_cost_approvals table\n";

echo "\n=== SET STANDARD BATCH COST FOR YOGURT PLAIN ===\n";
// Set a standard batch cost for testing - this would normally be calculated by Finance
// For 50 units: 0.1L Yogurt Culture @ P50 = P5 per batch
// So standard_batch_cost = 5.00
$pdo->exec("UPDATE production_recipes SET standard_batch_cost = 5.00, cost_variance_threshold_percent = 20.00 WHERE recipe_name LIKE '%Yogurt Plain%'");
echo "Set standard_batch_cost = P5.00, threshold = 20% for Yogurt Plain\n";

echo "\n=== VERIFY ===\n";
$stmt = $pdo->query("SELECT recipe_id, recipe_name, standard_batch_cost, cost_variance_threshold_percent FROM production_recipes WHERE is_active = 1");
while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "{$row['recipe_name']}: Standard=P{$row['standard_batch_cost']}, Threshold={$row['cost_variance_threshold_percent']}%\n";
}
