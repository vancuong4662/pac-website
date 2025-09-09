<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../config/db-pdo.php';
require_once '../../api/auth/middleware.php';

// Kiểm tra authentication
$user = verifySession();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Lấy order ID từ URL
$orderId = isset($_GET['id']) ? (int)$_GET['id'] : null;

if (!$orderId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit;
}

try {
    // Lấy thông tin đơn hàng
    $stmt = $pdo->prepare("
        SELECT 
            o.*,
            u.name as customer_name,
            u.email as customer_email,
            u.phone as customer_phone
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ? AND o.user_id = ?
    ");
    $stmt->execute([$orderId, $user['id']]);
    $order = $stmt->fetch();
    
    if (!$order) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit;
    }
    
    // Lấy chi tiết sản phẩm trong đơn hàng
    $stmt = $pdo->prepare("
        SELECT 
            oi.id as order_item_id,
            oi.quantity,
            oi.price,
            oi.created_at as added_at,
            p.id as product_id,
            p.name,
            p.description,
            p.type,
            p.package_type,
            p.status as product_status,
            (oi.quantity * oi.price) as subtotal
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY oi.created_at
    ");
    $stmt->execute([$orderId]);
    $orderItems = $stmt->fetchAll();
    
    // Format order items
    foreach ($orderItems as &$item) {
        $item['price_formatted'] = number_format($item['price'], 0, ',', '.') . ' VND';
        $item['subtotal_formatted'] = number_format($item['subtotal'], 0, ',', '.') . ' VND';
        
        // Type labels
        switch($item['type']) {
            case 'course':
                $item['type_label'] = 'Khóa học';
                break;
            case 'online_test':
                $item['type_label'] = 'Trắc nghiệm online';
                break;
            case 'consultation':
                $item['type_label'] = 'Tư vấn chuyên gia';
                break;
            default:
                $item['type_label'] = $item['type'];
        }
        
        // Package labels
        if ($item['package_type']) {
            switch($item['package_type']) {
                case 'basic':
                    $item['package_label'] = 'Gói cơ bản';
                    break;
                case 'premium':
                    $item['package_label'] = 'Gói cao cấp';
                    break;
                default:
                    $item['package_label'] = $item['package_type'];
            }
        } else {
            $item['package_label'] = null;
        }
        
        // Cast numeric values
        $item['quantity'] = (int)$item['quantity'];
        $item['price'] = (float)$item['price'];
        $item['subtotal'] = (float)$item['subtotal'];
    }
    
    // Format order data
    $order['total_amount'] = (float)$order['total_amount'];
    $order['total_formatted'] = number_format($order['total_amount'], 0, ',', '.') . ' VND';
    
    // Status labels
    switch($order['status']) {
        case 'pending':
            $order['status_label'] = 'Chờ xử lý';
            $order['status_color'] = 'warning';
            break;
        case 'completed':
            $order['status_label'] = 'Hoàn thành';
            $order['status_color'] = 'success';
            break;
        case 'cancelled':
            $order['status_label'] = 'Đã hủy';
            $order['status_color'] = 'danger';
            break;
        default:
            $order['status_label'] = $order['status'];
            $order['status_color'] = 'secondary';
    }
    
    // Payment status labels
    switch($order['payment_status']) {
        case 'pending':
            $order['payment_status_label'] = 'Chờ thanh toán';
            $order['payment_status_color'] = 'warning';
            break;
        case 'paid':
            $order['payment_status_label'] = 'Đã thanh toán';
            $order['payment_status_color'] = 'success';
            break;
        case 'failed':
            $order['payment_status_label'] = 'Thanh toán thất bại';
            $order['payment_status_color'] = 'danger';
            break;
        default:
            $order['payment_status_label'] = $order['payment_status'];
            $order['payment_status_color'] = 'secondary';
    }
    
    // Payment method labels
    switch($order['payment_method']) {
        case 'bank_transfer':
            $order['payment_method_label'] = 'Chuyển khoản';
            break;
        case 'credit_card':
            $order['payment_method_label'] = 'Thẻ tín dụng';
            break;
        case 'e_wallet':
            $order['payment_method_label'] = 'Ví điện tử';
            break;
        case 'cash':
            $order['payment_method_label'] = 'Tiền mặt';
            break;
        default:
            $order['payment_method_label'] = $order['payment_method'];
    }
    
    // Calculate summary
    $summary = [
        'total_items' => count($orderItems),
        'total_quantity' => array_sum(array_column($orderItems, 'quantity')),
        'total_amount' => $order['total_amount'],
        'total_formatted' => $order['total_formatted']
    ];
    
    // Check if order has purchased items (courses, tests, consultations)
    $hasPurchasedItems = false;
    if ($order['status'] === 'completed' && $order['payment_status'] === 'paid') {
        // Check for purchased courses
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM purchased_courses WHERE order_id = ?");
        $stmt->execute([$orderId]);
        $courseCount = $stmt->fetch()['count'];
        
        // Check for purchased tests
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM purchased_tests WHERE order_id = ?");
        $stmt->execute([$orderId]);
        $testCount = $stmt->fetch()['count'];
        
        // Check for consultation bookings
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM consultation_bookings WHERE order_id = ?");
        $stmt->execute([$orderId]);
        $consultationCount = $stmt->fetch()['count'];
        
        $hasPurchasedItems = ($courseCount + $testCount + $consultationCount) > 0;
    }
    
    $response = [
        'success' => true,
        'data' => [
            'order' => $order,
            'order_items' => $orderItems,
            'summary' => $summary,
            'purchased_items' => [
                'has_items' => $hasPurchasedItems,
                'message' => $hasPurchasedItems 
                    ? 'Đơn hàng đã được xử lý và tạo sản phẩm đã mua'
                    : 'Chưa có sản phẩm đã mua được tạo'
            ]
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
