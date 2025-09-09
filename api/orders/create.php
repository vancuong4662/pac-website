<?php
/**
 * Create Order API
 * Creates a new order from current cart items
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db.php';
require_once '../auth/middleware.php';

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
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
    
    $payment_method = $input['payment_method'] ?? 'bank_transfer';
    $notes = $input['notes'] ?? '';
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Get current cart items
        $stmt = $pdo->prepare("
            SELECT ci.*, p.name as product_name, p.price, p.type as product_type, p.image as product_image,
                   p.description as product_description, ci.package_type
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
        ");
        $stmt->execute([$user_id]);
        $cart_items = $stmt->fetchAll();
        
        if (empty($cart_items)) {
            throw new Exception('Giỏ hàng trống');
        }
        
        // Calculate total amount
        $total_amount = 0;
        foreach ($cart_items as $item) {
            $total_amount += $item['price'] * $item['quantity'];
        }
        
        // Create order
        $order_id = 'ORD_' . date('YmdHis') . '_' . rand(1000, 9999);
        
        $stmt = $pdo->prepare("
            INSERT INTO orders (id, user_id, total_amount, status, payment_method, 
                              customer_first_name, customer_last_name, customer_email, 
                              customer_phone, customer_address, customer_city, 
                              customer_district, notes, created_at)
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $order_id,
            $user_id,
            $total_amount,
            $payment_method,
            $customer_info['first_name'],
            $customer_info['last_name'],
            $customer_info['email'],
            $customer_info['phone'],
            $customer_info['address'] ?? '',
            $customer_info['city'] ?? '',
            $customer_info['district'] ?? '',
            $notes
        ]);
        
        // Create order items
        foreach ($cart_items as $item) {
            $stmt = $pdo->prepare("
                INSERT INTO order_items (order_id, product_id, product_name, product_type, 
                                       package_type, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $order_id,
                $item['product_id'],
                $item['product_name'],
                $item['product_type'],
                $item['package_type'],
                $item['quantity'],
                $item['price'],
                $item['price'] * $item['quantity']
            ]);
        }
        
        // Clear cart
        $stmt = $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?");
        $stmt->execute([$user_id]);
        
        // Commit transaction
        $pdo->commit();
        
        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'Đặt hàng thành công',
            'data' => [
                'order_id' => $order_id,
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
