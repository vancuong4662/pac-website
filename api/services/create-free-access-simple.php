<?php
// Simple test to check if includes work
error_log("Testing create-free-access-simple...");

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false, 
        'message' => 'Phương thức không được phép',
        'method' => $_SERVER['REQUEST_METHOD']
    ]);
    exit();
}

// Test file paths
$configPath = '../../config/db-pdo.php';
$middlewarePath = '../auth/middleware.php';

if (!file_exists($configPath)) {
    echo json_encode([
        'success' => false,
        'message' => 'Config file not found',
        'path' => $configPath,
        'realpath' => realpath($configPath),
        'cwd' => getcwd()
    ]);
    exit();
}

if (!file_exists($middlewarePath)) {
    echo json_encode([
        'success' => false,
        'message' => 'Middleware file not found',
        'path' => $middlewarePath,
        'realpath' => realpath($middlewarePath),
        'cwd' => getcwd()
    ]);
    exit();
}

try {
    require_once $configPath;
    require_once $middlewarePath;
    
    echo json_encode([
        'success' => true,
        'message' => 'Files included successfully',
        'data' => [
            'config_path' => realpath($configPath),
            'middleware_path' => realpath($middlewarePath),
            'cwd' => getcwd(),
            'input' => file_get_contents('php://input')
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Include error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>