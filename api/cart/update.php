<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

// Lấy cart_id từ URL hoặc từ JSON body
$cartId = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Lấy dữ liệu JSON
$input = json_decode(file_get_contents('php://input'), true);

if (!$cartId && isset($input['cart_id'])) {
    $cartId = (int)$input['cart_id'];
}

if (!isset($input['quantity'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Quantity is required']);
    exit;
}

$quantity = (int)$input['quantity'];

if ($cartId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid cart item ID']);
    exit;
}

if ($quantity <= 0 || $quantity > 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Quantity must be between 1 and 10']);
    exit;
}

try {
    // Kiểm tra cart item có thuộc về user không
    $stmt = $pdo->prepare("
        SELECT c.id, c.product_id, p.name, p.price 
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.id = ? AND c.user_id = ? AND p.status = 'active'
    ");
    $stmt->execute([$cartId, $user['id']]);
    $cartItem = $stmt->fetch();
    
    if (!$cartItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Cart item not found']);
        exit;
    }
    
    // Cập nhật số lượng
    $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE id = ?");
    $stmt->execute([$quantity, $cartId]);
    
    // Lấy thông tin cart item sau khi cập nhật
    $stmt = $pdo->prepare("
        SELECT 
            c.id as cart_id,
            c.quantity,
            c.created_at as added_at,
            p.id as product_id,
            p.name,
            p.price,
            p.type,
            p.package_type,
            (c.quantity * p.price) as subtotal
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.id = ?
    ");
    $stmt->execute([$cartId]);
    $updatedItem = $stmt->fetch();
    
    // Format giá tiền
    $updatedItem['price_formatted'] = number_format($updatedItem['price'], 0, ',', '.') . ' VND';
    $updatedItem['subtotal_formatted'] = number_format($updatedItem['subtotal'], 0, ',', '.') . ' VND';
    
    // Lấy tổng số item trong giỏ hàng
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_quantity,
            SUM(quantity * p.price) as total_amount
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ? AND p.status = 'active'
    ");
    $stmt->execute([$user['id']]);
    $cartSummary = $stmt->fetch();
    
    $response = [
        'success' => true,
        'data' => [
            'cart_item' => $updatedItem,
            'cart_summary' => [
                'total_items' => (int)$cartSummary['total_items'],
                'total_quantity' => (int)$cartSummary['total_quantity'],
                'total_amount' => (float)$cartSummary['total_amount'],
                'total_formatted' => number_format($cartSummary['total_amount'], 0, ',', '.') . ' VND'
            ]
        ],
        'message' => "Đã cập nhật số lượng {$updatedItem['name']} thành {$quantity}"
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
