<?php
/**
 * Create Order API
 * Creates a new order from current cart items
 */

// Start session for storing customer info
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db-pdo.php';
require_once '../auth/middleware.php';

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Debug: Check if PDO connection exists
    if (!isset($pdo) || !$pdo) {
        throw new Exception('Database connection not available');
    }
    
    // Get user ID from session (required for orders)
    $user_id = getCurrentUserId();
    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập để đặt hàng']);
        exit();
    }
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
        exit();
    }
    
    // Validate required fields
    $customer_info = $input['customer_info'] ?? [];
    $required_fields = ['first_name', 'last_name', 'email', 'phone'];
    
    foreach ($required_fields as $field) {
        if (empty($customer_info[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Thiếu thông tin: $field"]);
            exit();
        }
    }
    
    $payment_method = $input['payment_method'] ?? 'vnpay';
    $total_amount = $input['total_amount'] ?? 0;
    
    // Validate total amount
    if ($total_amount <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Tổng số tiền không hợp lệ']);
        exit();
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Create order with provided total amount (simplified for checkout from localStorage)
        $order_code = 'PAC' . date('YmdHis') . rand(100, 999);
        
        $stmt = $pdo->prepare("
            INSERT INTO orders (order_code, user_id, total_amount, status, payment_method, created_at)
            VALUES (?, ?, ?, 'pending', ?, NOW())
        ");
        
        $stmt->execute([
            $order_code,
            $user_id,
            $total_amount,
            $payment_method
        ]);
        
        $order_id = $pdo->lastInsertId();
        
        // Store customer info in session for VNPay processing
        $_SESSION['order_customer_info'] = [
            'order_id' => $order_id,
            'first_name' => $customer_info['first_name'],
            'last_name' => $customer_info['last_name'],
            'email' => $customer_info['email'],
            'phone' => $customer_info['phone'],
            'address' => $customer_info['address'] ?? '',
            'city' => $customer_info['city'] ?? '',
            'district' => $customer_info['district'] ?? ''
        ];
        
        // Note: Order items will be populated later when integrating with actual cart system
        // For now, we create a simplified order for VNPay payment testing
        
        // Commit transaction
        $pdo->commit();
        
        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'Đặt hàng thành công',
            'data' => [
                'order_id' => $order_id,
                'order_code' => $order_code,
                'total_amount' => $total_amount,
                'payment_method' => $payment_method
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Create order error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}
?>
