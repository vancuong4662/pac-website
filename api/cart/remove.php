<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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

// Lấy cart_id từ URL
$cartId = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Hoặc từ JSON body nếu không có trong URL
if (!$cartId) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['cart_id'])) {
        $cartId = (int)$input['cart_id'];
    }
}

if ($cartId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid cart item ID']);
    exit;
}

try {
    // Kiểm tra cart item có thuộc về user không và lấy thông tin trước khi xóa
    $stmt = $pdo->prepare("
        SELECT c.id, c.quantity, p.name, p.price 
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.id = ? AND c.user_id = ?
    ");
    $stmt->execute([$cartId, $user['id']]);
    $cartItem = $stmt->fetch();
    
    if (!$cartItem) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Cart item not found']);
        exit;
    }
    
    // Xóa item khỏi giỏ hàng
    $stmt = $pdo->prepare("DELETE FROM cart WHERE id = ? AND user_id = ?");
    $stmt->execute([$cartId, $user['id']]);
    
    $deletedRows = $stmt->rowCount();
    
    if ($deletedRows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Cart item not found or already removed']);
        exit;
    }
    
    // Lấy tổng số item trong giỏ hàng sau khi xóa
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_quantity,
            COALESCE(SUM(quantity * p.price), 0) as total_amount
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ? AND p.status = 'active'
    ");
    $stmt->execute([$user['id']]);
    $cartSummary = $stmt->fetch();
    
    $response = [
        'success' => true,
        'data' => [
            'removed_item' => [
                'cart_id' => $cartId,
                'name' => $cartItem['name'],
                'quantity' => $cartItem['quantity']
            ],
            'cart_summary' => [
                'total_items' => (int)$cartSummary['total_items'],
                'total_quantity' => (int)$cartSummary['total_quantity'],
                'total_amount' => (float)$cartSummary['total_amount'],
                'total_formatted' => number_format($cartSummary['total_amount'], 0, ',', '.') . ' VND'
            ]
        ],
        'message' => "Đã xóa {$cartItem['name']} khỏi giỏ hàng"
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
