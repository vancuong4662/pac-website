<?php
/**
 * API: Get Package by Access Code
 * GET /api/packages/get-package-by-access-code.php?access_code=TST_1_1762219141_2
 * 
 * Lấy thông tin package từ access_code trong purchased_packages
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Include required files
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/db-pdo.php';

// Set timezone
date_default_timezone_set(DEFAULT_TIMEZONE);

try {
    // Get access_code from query parameters
    $accessCode = $_GET['access_code'] ?? null;
    
    if (!$accessCode) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'access_code parameter is required'
        ]);
        exit;
    }
    
    // Connect to database using existing config
    require_once __DIR__ . '/../../config/db-pdo.php';
    
    // Use the global $conn from db-pdo.php
    global $conn;
    $pdo = $conn;
    
    // Find package info from purchased_packages table - simplified query
    $sql = "
        SELECT 
            pp.package_id,
            pp.access_code,
            pp.status as purchase_status,
            pp.package_name,
            pp.product_name,
            pp.product_type,
            pp.package_price,
            
            -- Quiz package config (if exists)
            qpc.question_count,
            qpc.questions_per_group,
            qpc.time_limit_minutes,
            qpc.report_type,
            qpc.features
            
        FROM purchased_packages pp
        LEFT JOIN quiz_package_configs qpc ON pp.package_id = qpc.package_id
        WHERE pp.access_code = ? AND pp.status = 'active'
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$accessCode]);
    $package = $stmt->fetch();
    
    if (!$package) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Không tìm thấy gói với access_code này hoặc gói đã hết hạn',
            'error_code' => 404
        ]);
        exit;
    }
    
    // Format response - simplified based on purchased_packages data
    $response = [
        'status' => 'success',
        'message' => 'Lấy thông tin gói thành công',
        'data' => [
            'package_id' => $package['package_id'],
            'access_code' => $package['access_code'],
            'purchase_status' => $package['purchase_status'],
            
            'package_info' => [
                'package_name' => $package['package_name'],
                'package_price' => $package['package_price']
            ],
            
            'product_info' => [
                'product_name' => $package['product_name'],
                'product_type' => $package['product_type']
            ],
            
            'quiz_config' => $package['question_count'] ? [
                'question_count' => $package['question_count'],
                'questions_per_group' => $package['questions_per_group'],
                'time_limit_minutes' => $package['time_limit_minutes'],
                'report_type' => $package['report_type'],
                'features' => $package['features'] ? json_decode($package['features'], true) : null
            ] : null
        ]
    ];
    
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Get Package by Access Code API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error_code' => 500,
        'message' => 'Lỗi hệ thống khi lấy thông tin gói',
        'debug' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'message' => $e->getMessage()
        ]
    ], JSON_UNESCAPED_UNICODE);
}

?>