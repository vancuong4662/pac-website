<?php
/**
 * Simple test for payment-history API
 */

// Enable error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

try {
    // Test database connection
    require_once __DIR__ . '/../../config/db-pdo.php';
    
    if (!isset($pdo)) {
        throw new Exception('Database connection not available');
    }
    
    // Test auth
    require_once __DIR__ . '/../auth/middleware.php';
    
    // Check if user is logged in
    $user = getCurrentUser();
    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'Not authenticated',
            'debug' => 'No user session found'
        ]);
        exit;
    }
    
    // Simple query test
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    $orderCount = $stmt->fetchColumn();
    
    echo json_encode([
        'success' => true,
        'message' => 'API working',
        'data' => [
            'user_id' => $user['id'],
            'username' => $user['username'],
            'order_count' => $orderCount
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}
?>