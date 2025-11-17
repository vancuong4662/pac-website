<?php
/**
 * Test VNPay - Create Test Order
 * Tạo đơn hàng test 1000 VND để thử nghiệm VNPay
 */

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

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
        exit();
    }
    
    // Get or create test user
    $pdo = getPDOConnection();
    
    // Check if test user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = 'test@vnpay.com' LIMIT 1");
    $stmt->execute();
    $testUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$testUser) {
        // Create test user
        $createUserStmt = $pdo->prepare("
            INSERT INTO users (username, email, password, fullname, phone, role, email_verified, created_at)
            VALUES ('testvnpay', 'test@vnpay.com', ?, 'Test VNPay', '0123456789', 'user', 1, NOW())
        ");
        $createUserStmt->execute([password_hash('test123', PASSWORD_BCRYPT)]);
        $user_id = $pdo->lastInsertId();
    } else {
        $user_id = $testUser['id'];
    }
    
    // Set session for this test user
    $_SESSION['user_id'] = $user_id;
    $_SESSION['username'] = 'testvnpay';
    $_SESSION['email'] = 'test@vnpay.com';
    $_SESSION['role'] = 'user';
    
    $payment_method = $input['payment_method'] ?? 'vnpay';
    $test_amount = 10000; // Fixed 10,000 VND for test (VNPay minimum)
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Create test order
        $order_code = 'TEST' . date('YmdHis') . rand(100, 999);
        
        $stmt = $pdo->prepare("
            INSERT INTO orders (order_code, user_id, total_amount, status, payment_method, created_at)
            VALUES (?, ?, ?, 'pending', ?, NOW())
        ");
        
        $stmt->execute([
            $order_code,
            $user_id,
            $test_amount,
            $payment_method
        ]);
        
        $order_id = $pdo->lastInsertId();
        
        // Get a sample product and package for test order item
        $productStmt = $pdo->prepare("
            SELECT p.id as product_id, p.name as product_name, 
                   pkg.id as package_id, pkg.package_name
            FROM products p
            JOIN product_packages pkg ON p.id = pkg.product_id
            WHERE p.status = 'active' AND pkg.status = 'active'
            LIMIT 1
        ");
        $productStmt->execute();
        $sampleProduct = $productStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($sampleProduct) {
            // Create order item with test product
            $order_item_stmt = $pdo->prepare("
                INSERT INTO order_items (
                    order_id, product_id, package_id, quantity,
                    unit_price, total_price, product_name, package_name
                ) VALUES (?, ?, ?, 1, ?, ?, ?, ?)
            ");
            
            $order_item_stmt->execute([
                $order_id,
                $sampleProduct['product_id'],
                $sampleProduct['package_id'],
                $test_amount,
                $test_amount,
                $sampleProduct['product_name'],
                $sampleProduct['package_name']
            ]);
        } else {
            // Create order item with dummy product
            $order_item_stmt = $pdo->prepare("
                INSERT INTO order_items (
                    order_id, product_id, package_id, quantity,
                    unit_price, total_price, product_name, package_name
                ) VALUES (?, 0, 0, 1, ?, ?, 'Test Product', 'Test Package')
            ");
            
            $order_item_stmt->execute([
                $order_id,
                $test_amount,
                $test_amount
            ]);
        }
        
        // Store customer info in session for VNPay processing
        $_SESSION['order_customer_info'] = [
            'order_id' => $order_id,
            'first_name' => 'Test',
            'last_name' => 'VNPay',
            'email' => 'test@vnpay.com',
            'phone' => '0123456789',
            'address' => 'Test Address',
            'city' => 'Test City',
            'district' => 'Test District'
        ];
        
        // Commit transaction
        $pdo->commit();
        
        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'Tạo đơn hàng test thành công',
            'data' => [
                'order_id' => $order_id,
                'order_code' => $order_code,
                'total_amount' => $test_amount,
                'payment_method' => $payment_method,
                'user_id' => $user_id
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    error_log("Database error in test-vnpay-order.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi cơ sở dữ liệu: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("Error in test-vnpay-order.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
