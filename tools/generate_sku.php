<?php
/**
 * Generate SKUs for raw materials that are missing them
 * Format: RM-CATEGORY-XXX where XXX is a sequential number
 */
require_once __DIR__ . '/../api/DatabaseConfig.php';

$conn = getDBConnection();

echo "=== Generating SKUs for Raw Materials ===\n\n";

// Get all raw materials without SKU
$stmt = $conn->query("SELECT raw_material_id, name, category, sku FROM raw_materials WHERE sku IS NULL OR sku = ''");
$materials = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (count($materials) === 0) {
    echo "All raw materials already have SKUs!\n";
    exit;
}

echo "Found " . count($materials) . " materials without SKU:\n\n";

// Category abbreviations
$categoryAbbrev = [
    'Packaging' => 'PKG',
    'Chemicals' => 'CHM', 
    'Dairy' => 'DRY',
    'Ingredients' => 'ING',
    'Consumables' => 'CON',
    'Flavoring' => 'FLV',
    'Culture' => 'CLT',
    'Other' => 'OTH'
];

// Get existing max SKU numbers per category
$skuCounters = [];
$stmt = $conn->query("SELECT sku FROM raw_materials WHERE sku IS NOT NULL AND sku != ''");
$existingSkus = $stmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($existingSkus as $sku) {
    if (preg_match('/RM-([A-Z]+)-(\d+)/', $sku, $matches)) {
        $cat = $matches[1];
        $num = (int)$matches[2];
        if (!isset($skuCounters[$cat]) || $num > $skuCounters[$cat]) {
            $skuCounters[$cat] = $num;
        }
    }
}

$updates = [];
foreach ($materials as $mat) {
    $category = $mat['category'] ?: 'Other';
    $abbrev = $categoryAbbrev[$category] ?? 'OTH';
    
    // Get next number for this category
    if (!isset($skuCounters[$abbrev])) {
        $skuCounters[$abbrev] = 0;
    }
    $skuCounters[$abbrev]++;
    
    $newSku = sprintf("RM-%s-%03d", $abbrev, $skuCounters[$abbrev]);
    
    $updates[] = [
        'id' => $mat['raw_material_id'],
        'name' => $mat['name'],
        'category' => $category,
        'sku' => $newSku
    ];
    
    echo "  {$mat['name']} ({$category}) => {$newSku}\n";
}

echo "\nDo you want to apply these SKUs? (Type 'yes' to confirm)\n";

// Auto-apply for this script
$confirm = 'yes'; // Change to readline() for interactive

if (trim($confirm) === 'yes') {
    $updateStmt = $conn->prepare("UPDATE raw_materials SET sku = ? WHERE raw_material_id = ?");
    
    $conn->beginTransaction();
    try {
        foreach ($updates as $u) {
            $updateStmt->execute([$u['sku'], $u['id']]);
            echo "Updated: {$u['name']} => {$u['sku']}\n";
        }
        $conn->commit();
        echo "\n✅ Successfully updated " . count($updates) . " raw materials with SKUs!\n";
    } catch (Exception $e) {
        $conn->rollBack();
        echo "❌ Error: " . $e->getMessage() . "\n";
    }
} else {
    echo "Cancelled. No changes made.\n";
}
