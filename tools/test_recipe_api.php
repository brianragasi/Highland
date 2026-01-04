<?php
/**
 * Test RecipeAPI - getProductsUsingMaterial
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

$_GET['action'] = 'getProductsUsingMaterial';
$_GET['raw_material_id'] = 13;  // Linx Ink

ob_start();
include __DIR__ . '/../api/RecipeAPI.php';
echo ob_get_clean();
