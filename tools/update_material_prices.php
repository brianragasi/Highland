<?php
/**
 * Update Raw Material Prices from Purchase Order Data
 * Based on actual January 2025 purchase orders
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== Updating Raw Material Prices ===\n\n";

// Prices from the Purchase Order document (unit prices)
$materialPrices = [
    'Bottles 1000ml Clear' => 4.38,      // per PCS
    'Bottles 500ml Clear' => 4.38,        // per PCS (same as 1000ml based on PO)
    'Bottles 330ml Clear' => 2.38,        // per PCS
    'Caps' => 0.62,                       // per PCS
    'White Sugar' => 68.00,               // per KG (3,400/50kg sack)
    'Brown Sugar' => 56.00,               // per KG (2,800/50kg sack)
    'Caustic Soda' => 56.00,              // per KG (2,800/50kg sack)
    'Chlorinix' => 800.00,                // per BOX
    'Linol-Liquid Detergent' => 1400.00,  // per BOX
    'Advacip 200' => 390.00,              // per PACK (3,900/10 pack carton)
    'Ribbon Roll' => 680.00,              // per ROLL
    'Linx Solvent' => 2315.25,            // per PIECE/bottle
    'Linx Ink' => 5299.35,                // per PIECE/bottle
    'Raw Milk' => 25.00,                  // per Liter (standard rate)
    'Chocolate Flavoring' => 150.00,      // per Liter (estimate)
    'Yogurt Culture' => 500.00,           // per Liter (estimate - specialized)
    'Fruit Flavoring' => 120.00,          // per Liter (estimate)
    'Cheese Culture' => 600.00,           // per Liter (estimate - specialized)
    'Salt' => 25.00,                      // per KG (estimate)
];

// First, check which materials exist in supplier_raw_materials
$stmt = $conn->query("SELECT rm.raw_material_id, rm.name, srm.unit_cost 
                      FROM raw_materials rm 
                      LEFT JOIN supplier_raw_materials srm ON rm.raw_material_id = srm.raw_material_id AND srm.is_active = 1
                      ORDER BY rm.name");
$existingPrices = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Current Material Prices:\n";
echo str_repeat("-", 60) . "\n";

foreach ($existingPrices as $mat) {
    $price = $mat['unit_cost'] ?? 0;
    echo sprintf("%-30s: ₱%10.2f\n", $mat['name'], $price);
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "Updating prices...\n\n";

// Get a default supplier ID (first active supplier)
$stmt = $conn->query("SELECT supplier_id FROM suppliers WHERE is_active = 1 LIMIT 1");
$defaultSupplierId = $stmt->fetchColumn() ?: 1;

$updated = 0;
$inserted = 0;

foreach ($materialPrices as $materialName => $price) {
    // Find the material
    $stmt = $conn->prepare("SELECT raw_material_id FROM raw_materials WHERE name = ?");
    $stmt->execute([$materialName]);
    $materialId = $stmt->fetchColumn();
    
    if (!$materialId) {
        echo "⚠️  Material not found: $materialName\n";
        continue;
    }
    
    // Check if supplier_raw_materials entry exists
    $stmt = $conn->prepare("SELECT supplier_raw_material_id FROM supplier_raw_materials WHERE raw_material_id = ? LIMIT 1");
    $stmt->execute([$materialId]);
    $srmId = $stmt->fetchColumn();
    
    if ($srmId) {
        // Update existing
        $stmt = $conn->prepare("UPDATE supplier_raw_materials SET unit_cost = ?, last_price_update = CURDATE(), updated_at = NOW() WHERE supplier_raw_material_id = ?");
        $stmt->execute([$price, $srmId]);
        echo "✅ Updated: $materialName => ₱" . number_format($price, 2) . "\n";
        $updated++;
    } else {
        // Insert new supplier_raw_materials entry
        $stmt = $conn->prepare("INSERT INTO supplier_raw_materials (supplier_id, raw_material_id, unit_cost, is_active, highland_fresh_approved, last_price_update, created_at) VALUES (?, ?, ?, 1, 1, CURDATE(), NOW())");
        $stmt->execute([$defaultSupplierId, $materialId, $price]);
        echo "➕ Inserted: $materialName => ₱" . number_format($price, 2) . "\n";
        $inserted++;
    }
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "Summary:\n";
echo "  Updated: $updated\n";
echo "  Inserted: $inserted\n";
echo "\n✅ Done! Refresh the Finance Dashboard to see updated prices.\n";
