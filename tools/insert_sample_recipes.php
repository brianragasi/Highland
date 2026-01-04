<?php
/**
 * Insert Sample Recipe Raw Material Ratios
 * For Highland Fresh Defense Demo
 * 
 * BUSINESS LOGIC:
 * - Finance sets the RATIO (quantity per unit)
 * - Warehouse inputs the PRICE
 * - System calculates: RATIO × PRICE = MATERIAL COST
 */

$conn = new PDO('mysql:host=localhost;dbname=highland_fresh_db;charset=utf8mb4', 'root', '');
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== INSERTING SAMPLE RECIPE RATIOS ===\n\n";

// First, get raw material IDs
$materials = $conn->query('SELECT raw_material_id, name FROM raw_materials')->fetchAll(PDO::FETCH_KEY_PAIR);
echo "Available Materials:\n";
foreach ($materials as $id => $name) {
    echo "  [$id] $name\n";
}

// Flip for easy lookup
$materialIds = array_flip($materials);

echo "\n";

// Define realistic ratios per product (per 1 unit of finished product)
$recipeIngredients = [
    // Recipe 1: Chocolate Milk 500ml (batch_size_yield: 200 bottles)
    // Ratio = quantity needed for 1 bottle
    1 => [
        'Raw Milk' => ['qty' => 0.5, 'unit' => 'L', 'note' => '0.5L milk per 500ml bottle'],
        'Sugar' => ['qty' => 0.015, 'unit' => 'kg', 'note' => '15g sugar per bottle'],
        'Chocolate Flavoring' => ['qty' => 0.01, 'unit' => 'L', 'note' => '10ml flavoring per bottle'],
    ],
    
    // Recipe 2: Fresh Milk 1L (batch_size_yield: 100 bottles)
    2 => [
        'Raw Milk' => ['qty' => 1.05, 'unit' => 'L', 'note' => '1.05L raw milk per 1L bottle (accounts for loss)'],
    ],
    
    // Recipe 3: Strawberry Yogurt 500g (batch_size_yield: 50 tubs)
    3 => [
        'Raw Milk' => ['qty' => 0.45, 'unit' => 'L', 'note' => '0.45L milk per 500g tub'],
        'Yogurt Culture' => ['qty' => 0.005, 'unit' => 'L', 'note' => '5ml culture per tub'],
        'Sugar' => ['qty' => 0.03, 'unit' => 'kg', 'note' => '30g sugar per tub'],
        'Fruit Flavoring' => ['qty' => 0.05, 'unit' => 'L', 'note' => '50ml strawberry flavoring per tub'],
    ],
    
    // Recipe 4: White Cheese 200g (batch_size_yield: 25 packs)
    4 => [
        'Raw Milk' => ['qty' => 2.0, 'unit' => 'L', 'note' => '2L milk per 200g cheese (high yield loss)'],
        'Cheese Culture' => ['qty' => 0.01, 'unit' => 'L', 'note' => '10ml culture per pack'],
        'Salt' => ['qty' => 0.005, 'unit' => 'kg', 'note' => '5g salt per pack'],
    ],
    
    // Recipe 5: Plain Yogurt 500g (batch_size_yield: 50 tubs)
    5 => [
        'Raw Milk' => ['qty' => 0.5, 'unit' => 'L', 'note' => '0.5L milk per 500g tub'],
        'Yogurt Culture' => ['qty' => 0.005, 'unit' => 'L', 'note' => '5ml culture per tub'],
    ],
];

// Clear existing recipe materials
$conn->exec('DELETE FROM recipe_raw_materials');
echo "Cleared existing recipe materials.\n\n";

// Insert new ratios
$insertStmt = $conn->prepare('
    INSERT INTO recipe_raw_materials 
    (recipe_id, raw_material_id, quantity_required, processing_notes, is_critical) 
    VALUES (?, ?, ?, ?, ?)
');

$inserted = 0;
$missing = [];

foreach ($recipeIngredients as $recipeId => $ingredients) {
    // Get recipe name
    $recipeName = $conn->query("SELECT recipe_name FROM production_recipes WHERE recipe_id = $recipeId")->fetchColumn();
    echo "Recipe #$recipeId: $recipeName\n";
    
    foreach ($ingredients as $materialName => $details) {
        // Find material ID
        $materialId = null;
        foreach ($materials as $id => $name) {
            if (stripos($name, $materialName) !== false || stripos($materialName, $name) !== false) {
                $materialId = $id;
                break;
            }
        }
        
        if ($materialId) {
            $insertStmt->execute([
                $recipeId,
                $materialId,
                $details['qty'],
                $details['note'],
                ($materialName === 'Raw Milk') ? 1 : 0  // Milk is always critical
            ]);
            $inserted++;
            echo "  ✓ Added: {$materialName} - {$details['qty']} {$details['unit']} per unit\n";
        } else {
            $missing[] = $materialName;
            echo "  ✗ Material not found: {$materialName}\n";
        }
    }
    echo "\n";
}

echo "=== SUMMARY ===\n";
echo "Inserted: $inserted ingredient ratios\n";
if (!empty($missing)) {
    echo "Missing materials: " . implode(', ', array_unique($missing)) . "\n";
    echo "\nYou may need to add these materials to raw_materials table.\n";
}

// Show final result
echo "\n=== FINAL MASTER RECIPE TABLE ===\n";
$results = $conn->query('
    SELECT 
        r.recipe_id,
        r.recipe_name,
        p.name as product_name,
        p.price as selling_price,
        rm.name as material_name,
        rrm.quantity_required as ratio,
        rrm.processing_notes as notes,
        rrm.is_critical
    FROM production_recipes r
    JOIN finished_products p ON r.finished_product_id = p.finished_product_id
    LEFT JOIN recipe_raw_materials rrm ON r.recipe_id = rrm.recipe_id
    LEFT JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
    ORDER BY r.recipe_id, rm.name
')->fetchAll(PDO::FETCH_ASSOC);

$currentRecipe = null;
foreach ($results as $row) {
    if ($currentRecipe !== $row['recipe_id']) {
        if ($currentRecipe !== null) echo "\n";
        $currentRecipe = $row['recipe_id'];
        echo "📦 {$row['product_name']} (₱" . number_format($row['selling_price'], 2) . ")\n";
        echo "   Recipe: {$row['recipe_name']}\n";
        echo "   Ingredients (per 1 unit):\n";
    }
    if ($row['material_name']) {
        $critical = $row['is_critical'] ? ' [CRITICAL]' : '';
        echo "   • {$row['material_name']}: {$row['ratio']} - {$row['notes']}{$critical}\n";
    }
}

echo "\n✅ Sample ratios inserted successfully!\n";
echo "Finance Officer can now manage these in the Recipe Management tab.\n";
