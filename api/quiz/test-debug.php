<?php
/**
 * Simple test for get-result.php API debugging
 */

// Set error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== API Test Debug ===\n";

// Test 1: Check if files exist
echo "1. Checking required files:\n";
$files = [
    '../../config/db-pdo.php',
    '../../config/error-codes.php',
    '../../config/quiz-config.php'
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "✅ $file exists\n";
    } else {
        echo "❌ $file NOT FOUND\n";
    }
}

// Test 2: Start session and set mock data
echo "\n2. Setting up mock session:\n";
session_start();
$_SESSION['user_id'] = 1;
echo "✅ Session started, user_id = 1\n";

// Test 3: Set GET parameter
$_GET['exam_code'] = 'TEST123';
echo "✅ exam_code = TEST123\n";

// Test 4: Include required files
echo "\n3. Including required files:\n";
try {
    require_once '../../config/db-pdo.php';
    echo "✅ db-pdo.php included\n";
} catch (Exception $e) {
    echo "❌ db-pdo.php error: " . $e->getMessage() . "\n";
}

try {
    require_once '../../config/error-codes.php';
    echo "✅ error-codes.php included\n";
} catch (Exception $e) {
    echo "❌ error-codes.php error: " . $e->getMessage() . "\n";
}

try {
    require_once '../../config/quiz-config.php';
    echo "✅ quiz-config.php included\n";
} catch (Exception $e) {
    echo "❌ quiz-config.php error: " . $e->getMessage() . "\n";
}

// Test 5: Test functions
echo "\n4. Testing functions:\n";
try {
    $errorResponse = generateErrorResponse(ERROR_NOT_FOUND, 'Test error');
    echo "✅ generateErrorResponse works\n";
} catch (Exception $e) {
    echo "❌ generateErrorResponse error: " . $e->getMessage() . "\n";
}

try {
    $successResponse = generateSuccessResponse(['test' => 'data'], 'Test success');
    echo "✅ generateSuccessResponse works\n";
} catch (Exception $e) {
    echo "❌ generateSuccessResponse error: " . $e->getMessage() . "\n";
}

// Test 6: Test database connection
echo "\n5. Testing database connection:\n";
try {
    if (isset($pdo)) {
        $stmt = $pdo->query("SELECT 1");
        echo "✅ Database connection works\n";
    } else {
        echo "❌ PDO object not available\n";
    }
} catch (Exception $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}

echo "\n=== Test completed ===\n";
?>