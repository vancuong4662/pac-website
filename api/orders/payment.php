<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/db-pdo.php';
require_once '../../api/auth/middleware.php';

// Kiểm tra authentication
$user = verifySession();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Lấy dữ liệu JSON
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!isset($input['order_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit;
}

$orderId = (int)$input['order_id'];
$paymentMethod = isset($input['payment_method']) ? trim($input['payment_method']) : null;
$paymentData = isset($input['payment_data']) ? $input['payment_data'] : [];

if ($orderId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid order ID']);
    exit;
}

try {
    // Bắt đầu transaction
    $pdo->beginTransaction();
    
    // Kiểm tra đơn hàng có thuộc về user không
    $stmt = $pdo->prepare("
        SELECT o.*, u.name as customer_name, u.email as customer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ? AND o.user_id = ?
    ");
    $stmt->execute([$orderId, $user['id']]);
    $order = $stmt->fetch();
    
    if (!$order) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit;
    }
    
    // Kiểm tra trạng thái đơn hàng
    if ($order['status'] !== 'pending') {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Order is not in pending status',
            'current_status' => $order['status']
        ]);
        exit;
    }
    
    if ($order['payment_status'] === 'paid') {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Order is already paid',
            'payment_status' => $order['payment_status']
        ]);
        exit;
    }
    
    // Cập nhật payment method nếu có
    if ($paymentMethod) {
        $allowedMethods = ['bank_transfer', 'credit_card', 'e_wallet', 'cash'];
        if (!in_array($paymentMethod, $allowedMethods)) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid payment method']);
            exit;
        }
    } else {
        $paymentMethod = $order['payment_method'];
    }
    
    // Giả lập xử lý thanh toán (trong thực tế sẽ gọi payment gateway)
    $paymentResult = simulatePaymentProcessing($paymentMethod, $order['total_amount'], $paymentData);
    
    if (!$paymentResult['success']) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Payment failed: ' . $paymentResult['error'],
            'payment_error_code' => $paymentResult['error_code'] ?? null
        ]);
        exit;
    }
    
    // Cập nhật trạng thái thanh toán
    $stmt = $pdo->prepare("
        UPDATE orders 
        SET payment_status = 'paid', 
            status = 'completed',
            payment_method = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ");
    $stmt->execute([$paymentMethod, $orderId]);
    
    // Commit payment transaction
    $pdo->commit();
    
    // Tự động xử lý purchased items sau khi thanh toán thành công
    $purchaseProcessResult = null;
    try {
        $purchaseProcessResult = processPurchaseItems($orderId, $user);
    } catch (Exception $e) {
        // Log error nhưng không fail payment
        error_log("Failed to process purchase items for order {$orderId}: " . $e->getMessage());
        $purchaseProcessResult = [
            'success' => false,
            'error' => 'Failed to process purchase items: ' . $e->getMessage()
        ];
    }
    
    // Lấy thông tin order đã cập nhật
    $stmt = $pdo->prepare("
        SELECT o.*, u.name as customer_name, u.email as customer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    ");
    $stmt->execute([$orderId]);
    $updatedOrder = $stmt->fetch();
    
    $response = [
        'success' => true,
        'data' => [
            'order' => [
                'id' => $orderId,
                'order_code' => $updatedOrder['order_code'],
                'customer_name' => $updatedOrder['customer_name'],
                'customer_email' => $updatedOrder['customer_email'],
                'total_amount' => $updatedOrder['total_amount'],
                'total_formatted' => number_format($updatedOrder['total_amount'], 0, ',', '.') . ' VND',
                'payment_method' => $updatedOrder['payment_method'],
                'status' => $updatedOrder['status'],
                'payment_status' => $updatedOrder['payment_status'],
                'updated_at' => $updatedOrder['updated_at']
            ],
            'payment' => [
                'method' => $paymentMethod,
                'amount' => $updatedOrder['total_amount'],
                'amount_formatted' => number_format($updatedOrder['total_amount'], 0, ',', '.') . ' VND',
                'transaction_id' => $paymentResult['transaction_id'] ?? null,
                'processed_at' => date('Y-m-d H:i:s')
            ],
            'purchase_processing' => $purchaseProcessResult
        ],
        'message' => "Payment successful for order #{$updatedOrder['order_code']}",
        'next_steps' => [
            'view_purchases' => '/api/purchases/ - View your purchased items',
            'order_detail' => "/api/orders/detail.php?id={$orderId}"
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Rollback nếu có lỗi
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}

// Giả lập payment processing (thay thế bằng integration thật)
function simulatePaymentProcessing($method, $amount, $paymentData) {
    // Giả lập delay
    usleep(500000); // 0.5 second delay
    
    // Giả lập success rate
    $successRate = 0.95; // 95% success rate
    $random = mt_rand() / mt_getrandmax();
    
    if ($random > $successRate) {
        return [
            'success' => false,
            'error' => 'Payment gateway timeout',
            'error_code' => 'GATEWAY_TIMEOUT'
        ];
    }
    
    // Giả lập transaction ID
    $transactionId = strtoupper(bin2hex(random_bytes(8)));
    
    return [
        'success' => true,
        'transaction_id' => $transactionId,
        'processed_at' => date('Y-m-d H:i:s'),
        'method' => $method,
        'amount' => $amount
    ];
}

// Gọi process-purchase.php logic
function processPurchaseItems($orderId, $user) {
    global $pdo;
    
    // Import logic từ process-purchase.php
    require_once __DIR__ . '/process-purchase-helper.php';
    
    return processOrderPurchases($pdo, $orderId, $user);
}
?>
