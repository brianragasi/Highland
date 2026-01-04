<?php
/**
 * Create system_notifications table for Cost Alerts
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== Creating system_notifications table ===\n\n";

$sql = "
CREATE TABLE IF NOT EXISTS system_notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL COMMENT 'PRICE_CHANGE, LOW_STOCK, EXPIRY_WARNING, etc.',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
    reference_type VARCHAR(50) NULL COMMENT 'raw_material, product, batch, etc.',
    reference_id INT NULL COMMENT 'ID of the related entity',
    metadata JSON NULL COMMENT 'Additional data like old_price, new_price, etc.',
    target_role VARCHAR(50) NULL COMMENT 'Finance Officer, Admin, etc.',
    is_read TINYINT(1) DEFAULT 0,
    read_at DATETIME NULL,
    read_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (notification_type),
    INDEX idx_target_role (target_role),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

try {
    $conn->exec($sql);
    echo "✅ system_notifications table created successfully!\n\n";
    
    // Verify
    $stmt = $conn->query("DESCRIBE system_notifications");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Table structure:\n";
    foreach ($cols as $col) {
        echo sprintf("  %-25s %s\n", $col['Field'], $col['Type']);
    }
    
    echo "\n✅ Cost Alerts will now be stored when price changes are detected!\n";
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
