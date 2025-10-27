<?php
// Debug log
error_log("Create Free Access - Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Create Free Access - Content Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));

// Set headers first
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log("Create Free Access - Handling OPTIONS preflight");
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log("Create Free Access - Invalid method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode([
        'success' => false, 
        'message' => 'Phương thức không được phép',
        'debug' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'expected' => 'POST'
        ]
    ]);
    exit();
}

require_once '../../config/db-pdo.php';
require_once '../../config/db.php';
require_once '../auth/middleware.php';

try {
    // Verify user is authenticated
    $user = requireAuth($conn); // Use MySQLi connection for middleware
    $userId = $user['id'];
    
    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    $packageId = $input['package_id'] ?? null;
    
    if (!$packageId) {
        throw new Exception('Package ID là bắt buộc');
    }
    
    // Verify package exists and is free
    $packageStmt = $pdo->prepare("
        SELECT pp.*, p.name as product_name, p.type as product_type 
        FROM product_packages pp 
        JOIN products p ON pp.product_id = p.id 
        WHERE pp.id = ? AND pp.is_free = 1 AND pp.status = 'active'
    ");
    $packageStmt->execute([$packageId]);
    $package = $packageStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$package) {
        throw new Exception('Gói dịch vụ không tồn tại hoặc không miễn phí');
    }
    
    // Check if user already has access to this package
    $existingStmt = $pdo->prepare("
        SELECT access_code FROM purchased_packages 
        WHERE user_id = ? AND package_id = ? AND status = 'active'
    ");
    $existingStmt->execute([$userId, $packageId]);
    $existingAccess = $existingStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingAccess) {
        // User already has access, return existing access code
        echo json_encode([
            'success' => true,
            'message' => 'Bạn đã có quyền truy cập gói này',
            'data' => [
                'access_code' => $existingAccess['access_code'],
                'package_name' => $package['package_name']
            ]
        ]);
        exit();
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Create a dummy order for the free package (required for foreign key)
        $orderStmt = $pdo->prepare("
            INSERT INTO orders (user_id, total_amount, status, payment_status, payment_method, order_code)
            VALUES (?, 0.00, 'completed', 'paid', 'free', ?)
        ");
        
        // Generate order code
        $orderCode = 'FREE_' . date('YmdHis') . '_' . $userId;
        $orderStmt->execute([$userId, $orderCode]);
        $orderId = $pdo->lastInsertId();
        
        // Create order item
        $orderItemStmt = $pdo->prepare("
            INSERT INTO order_items (order_id, product_id, package_id, quantity, unit_price, total_price, product_name, package_name)
            VALUES (?, ?, ?, 1, 0.00, 0.00, ?, ?)
        ");
        $orderItemStmt->execute([
            $orderId, 
            $package['product_id'], 
            $packageId, 
            $package['product_name'], 
            $package['package_name']
        ]);
        
        // Generate access code (mimicking the database trigger logic)
        $timestamp = time();
        $accessCode = '';
        
        switch ($package['product_type']) {
            case 'course':
                $accessCode = "CRS_{$userId}_{$timestamp}_{$packageId}";
                break;
            case 'career_test':
                $accessCode = "TST_{$userId}_{$timestamp}_{$packageId}";
                break;
            case 'consultation':
                $accessCode = "CON_{$userId}_{$timestamp}_{$packageId}";
                break;
            default:
                $accessCode = "PKG_{$userId}_{$timestamp}_{$packageId}";
                break;
        }
        
        // Create purchased package record
        $purchasedStmt = $pdo->prepare("
            INSERT INTO purchased_packages (
                user_id, order_id, package_id, access_code,
                package_name, product_name, product_type, package_price,
                status, access_starts_at, first_accessed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, 'active', NOW(), NOW())
        ");
        
        $purchasedStmt->execute([
            $userId,
            $orderId,
            $packageId,
            $accessCode,
            $package['package_name'],
            $package['product_name'],
            $package['product_type']
        ]);
        
        // Commit transaction
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Tạo quyền truy cập thành công',
            'data' => [
                'access_code' => $accessCode,
                'package_name' => $package['package_name'],
                'product_type' => $package['product_type']
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Create Free Access Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>