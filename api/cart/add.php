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
if (!isset($input['product_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Product ID is required']);
    exit;
}

$productId = (int)$input['product_id'];
$quantity = isset($input['quantity']) ? (int)$input['quantity'] : 1;

if ($productId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid product ID']);
    exit;
}

if ($quantity <= 0 || $quantity > 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Quantity must be between 1 and 10']);
    exit;
}

try {
    // Kiểm tra sản phẩm có tồn tại và active không
    $stmt = $pdo->prepare("SELECT id, name, price, type FROM products WHERE id = ? AND status = 'active'");
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    
    if (!$product) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Product not found or inactive']);
        exit;
    }
    
    // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
    $stmt = $pdo->prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?");
    $stmt->execute([$user['id'], $productId]);
    $existingItem = $stmt->fetch();
    
    if ($existingItem) {
        // Nếu đã có, cập nhật số lượng
        $newQuantity = $existingItem['quantity'] + $quantity;
        
        if ($newQuantity > 10) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'error' => 'Maximum quantity per item is 10',
                'current_quantity' => $existingItem['quantity']
            ]);
            exit;
        }
        
        $stmt = $pdo->prepare("UPDATE cart SET quantity = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$newQuantity, $existingItem['id']]);
        
        $cartItemId = $existingItem['id'];
        $finalQuantity = $newQuantity;
        $action = 'updated';
        
    } else {
        // Nếu chưa có, thêm mới
        $stmt = $pdo->prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $productId, $quantity]);
        
        $cartItemId = $pdo->lastInsertId();
        $finalQuantity = $quantity;
        $action = 'added';
    }
    
    // Lấy thông tin cart item vừa thêm/cập nhật
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
    $stmt->execute([$cartItemId]);
    $cartItem = $stmt->fetch();
    
    // Format giá tiền
    $cartItem['price_formatted'] = number_format($cartItem['price'], 0, ',', '.') . ' VND';
    $cartItem['subtotal_formatted'] = number_format($cartItem['subtotal'], 0, ',', '.') . ' VND';
    
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
        'action' => $action,
        'data' => [
            'cart_item' => $cartItem,
            'cart_summary' => [
                'total_items' => (int)$cartSummary['total_items'],
                'total_quantity' => (int)$cartSummary['total_quantity'],
                'total_amount' => (float)$cartSummary['total_amount'],
                'total_formatted' => number_format($cartSummary['total_amount'], 0, ',', '.') . ' VND'
            ]
        ],
        'message' => $action === 'added' 
            ? "Đã thêm {$product['name']} vào giỏ hàng"
            : "Đã cập nhật số lượng {$product['name']} trong giỏ hàng"
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
