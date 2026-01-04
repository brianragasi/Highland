<?php
// Phase 1: Update Cashier Role to Sales Officer

header('Content-Type: text/plain');

try {
    $pdo = new PDO('mysql:host=localhost;dbname=highland_fresh_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== PHASE 1: DATABASE UPDATE ===\n\n";
    
    // Step 1: Check current roles
    echo "STEP 1: Current Roles in Database\n";
    echo "-----------------------------------\n";
    $stmt = $pdo->query("SELECT role_id, role_name, description FROM user_roles ORDER BY role_id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "ID {$row['role_id']}: {$row['role_name']}\n";
        echo "   Description: {$row['description']}\n\n";
    }
    
    // Step 2: Check if Cashier exists
    echo "\nSTEP 2: Checking for Cashier Role\n";
    echo "-----------------------------------\n";
    $stmt = $pdo->prepare("SELECT role_id, role_name FROM user_roles WHERE role_name = ?");
    $stmt->execute(['Cashier']);
    $cashierRole = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($cashierRole) {
        echo "✅ Found: Cashier role (ID: {$cashierRole['role_id']})\n";
        
        // Check users with this role
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM users WHERE role_id = ?");
        $stmt->execute([$cashierRole['role_id']]);
        $userCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "   Users with Cashier role: {$userCount}\n";
    } else {
        echo "❌ Cashier role not found\n";
        echo "   This might already be 'Sales Officer' or role doesn't exist\n";
        exit;
    }
    
    // Step 3: Update Cashier to Sales Officer
    echo "\n\nSTEP 3: Updating Cashier → Sales Officer\n";
    echo "-----------------------------------\n";
    
    $updateStmt = $pdo->prepare("
        UPDATE user_roles 
        SET role_name = 'Sales Officer',
            description = 'Creates and manages wholesale sales orders for retail outlets and independent resellers'
        WHERE role_name = 'Cashier'
    ");
    
    $updateStmt->execute();
    $rowsAffected = $updateStmt->rowCount();
    
    if ($rowsAffected > 0) {
        echo "✅ SUCCESS: Updated {$rowsAffected} role(s)\n";
        echo "   Cashier → Sales Officer\n";
    } else {
        echo "⚠️  No rows updated (role might not exist or already updated)\n";
    }
    
    // Step 4: Verify the change
    echo "\n\nSTEP 4: Verification\n";
    echo "-----------------------------------\n";
    $stmt = $pdo->query("SELECT role_id, role_name, description FROM user_roles ORDER BY role_id");
    
    echo "All Roles After Update:\n\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $marker = ($row['role_name'] === 'Sales Officer') ? '✅ ' : '   ';
        echo "{$marker}ID {$row['role_id']}: {$row['role_name']}\n";
        echo "   {$row['description']}\n\n";
    }
    
    // Step 5: Check affected users
    echo "\nSTEP 5: Users with Sales Officer Role\n";
    echo "-----------------------------------\n";
    $stmt = $pdo->query("
        SELECT u.user_id, u.username, u.first_name, u.last_name, u.is_active
        FROM users u
        JOIN user_roles ur ON u.role_id = ur.role_id
        WHERE ur.role_name = 'Sales Officer'
    ");
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($users) > 0) {
        foreach ($users as $user) {
            $status = $user['is_active'] ? 'Active' : 'Inactive';
            echo "✅ {$user['username']} ({$user['first_name']} {$user['last_name']}) - {$status}\n";
        }
    } else {
        echo "⚠️  No users found with Sales Officer role\n";
    }
    
    echo "\n\n=== PHASE 1 COMPLETE ===\n";
    echo "✅ Database successfully updated\n";
    echo "✅ Cashier role changed to Sales Officer\n";
    echo "✅ All existing cashier users are now Sales Officers\n";
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}
