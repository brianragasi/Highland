<?php
/**
 * Check existing recipe data structure
 */

try {
    $conn = new PDO(
        'mysql:host=localhost;dbname=highland_fresh_db;charset=utf8mb4',
        'root',
        ''
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get all recipes with products
    echo "=== MASTER RECIPE TABLE ===\n\n";
    
    $stmt = $conn->query('
        SELECT r.recipe_id, r.recipe_name, r.product_id, p.name as product_name, 
               p.price as selling_price
        FROM production_recipes r
        LEFT JOIN products p ON r.product_id = p.product_id
        ORDER BY r.recipe_id
    ');
    $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($recipes as $recipe) {
        echo "RECIPE #{$recipe['recipe_id']}: {$recipe['recipe_name']}\n";
        echo "  Product: {$recipe['product_name']} (Selling Price: ₱" . number_format($recipe['selling_price'], 2) . ")\n";
        
        // Get ingredients for this recipe
        $stmt2 = $conn->prepare('
            SELECT rm.raw_material_id, rm.name as material_name, rm.unit_of_measure,
                   rrm.quantity_required, rrm.unit,
                   (SELECT price_per_unit FROM raw_material_batches 
                    WHERE raw_material_id = rm.raw_material_id 
                    ORDER BY date_received DESC LIMIT 1) as current_price
            FROM recipe_raw_materials rrm
            JOIN raw_materials rm ON rrm.raw_material_id = rm.raw_material_id
            WHERE rrm.recipe_id = ?
            ORDER BY rm.name
        ');
        $stmt2->execute([$recipe['recipe_id']]);
        $ingredients = $stmt2->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($ingredients)) {
            echo "  [No ingredients defined]\n";
        } else {
            echo "  Ingredients:\n";
            $totalCost = 0;
            foreach ($ingredients as $ing) {
                $price = $ing['current_price'] ?? 0;
                $cost = $ing['quantity_required'] * $price;
                $totalCost += $cost;
                echo "    - {$ing['material_name']}: {$ing['quantity_required']} {$ing['unit']}";
                echo " x ₱" . number_format($price, 2) . " = ₱" . number_format($cost, 2) . "\n";
            }
            echo "  TOTAL MATERIAL COST: ₱" . number_format($totalCost, 2) . "\n";
            $margin = $recipe['selling_price'] - $totalCost;
            echo "  GROSS MARGIN: ₱" . number_format($margin, 2) . " (" . 
                 number_format(($margin / $recipe['selling_price']) * 100, 1) . "%)\n";
        }
        echo "\n";
    }
    
    echo "\n=== RAW MATERIALS PRICE LIST ===\n";
    $stmt = $conn->query('
        SELECT rm.raw_material_id, rm.name, rm.unit_of_measure,
               (SELECT price_per_unit FROM raw_material_batches 
                WHERE raw_material_id = rm.raw_material_id 
                ORDER BY date_received DESC LIMIT 1) as current_price
        FROM raw_materials rm
        ORDER BY rm.name
    ');
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($materials as $m) {
        echo "  {$m['name']}: ₱" . number_format($m['current_price'] ?? 0, 2) . " per {$m['unit_of_measure']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
