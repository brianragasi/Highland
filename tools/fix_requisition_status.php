<?php
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

// Check current status column
$stmt = $conn->query("SHOW COLUMNS FROM purchase_requisitions WHERE Field = 'status'");
$col = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Current status column:\n";
print_r($col);

echo "\nChecking if CANCELLED is allowed...\n";

// Check what values exist
$stmt = $conn->query("SELECT DISTINCT status FROM purchase_requisitions");
$statuses = $stmt->fetchAll(PDO::FETCH_COLUMN);
echo "Existing statuses: " . implode(', ', $statuses) . "\n";

// Fix: Add CANCELLED to the ENUM if needed
echo "\nAttempting to modify column to include CANCELLED...\n";

try {
    $conn->exec("ALTER TABLE purchase_requisitions MODIFY COLUMN status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CONVERTED') DEFAULT 'DRAFT'");
    echo "✅ Status column updated to include CANCELLED\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

// Verify
$stmt = $conn->query("SHOW COLUMNS FROM purchase_requisitions WHERE Field = 'status'");
$col = $stmt->fetch(PDO::FETCH_ASSOC);
echo "\nUpdated status column:\n";
print_r($col);
