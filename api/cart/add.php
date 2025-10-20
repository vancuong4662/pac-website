<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    require_once '../../config/db-pdo.php';
    require_once '../../api/auth/middleware.php';

    // Debug: Check if functions exist
    if (!function_exists('verifySession')) {
        echo json_encode([
            'success' => false,
            'error' => 'verifySession function not found',
            'debug' => 'middleware.php may not be loaded correctly'
        ]);
        exit;
    }

    // Debug: Check database connection
    if (!isset($pdo)) {
        echo json_encode([
            'success' => false,
            'error' => 'Database connection not found',
            'debug' => 'PDO connection not available'
        ]);
        exit;
    }

    // Kiểm tra authentication
    $user = verifySession();
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'error' => 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            'authenticated' => false,
            'debug' => [
                'cookies' => $_COOKIE,
                'session' => $_SESSION ?? []
            ]
        ]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit;
}

// Lấy dữ liệu JSON
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!isset($input['product_package_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Product package ID is required']);
    exit;
}

$packageId = (int)$input['product_package_id'];
$quantity = isset($input['quantity']) ? (int)$input['quantity'] : 1;

if ($packageId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid product package ID']);
    exit;
}

if ($quantity <= 0 || $quantity > 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Quantity must be between 1 and 10']);
    exit;
}

try {
    // Kiểm tra product package có tồn tại và active không
    $stmt = $pdo->prepare("
        SELECT 
            pp.id as package_id,
            pp.package_name,
            pp.original_price,
            pp.sale_price,
            pp.is_free,
            p.id as product_id,
            p.name as product_name,
            p.type as product_type,
            p.status
        FROM product_packages pp
        JOIN products p ON pp.product_id = p.id
        WHERE pp.id = ? AND p.status = 'active'
    ");
    $stmt->execute([$packageId]);
    $package = $stmt->fetch();
    
    if (!$package) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Product package not found or inactive']);
        exit;
    }
    
    // Tính giá hiện tại (sale_price nếu có, nếu không thì original_price)
    $currentPrice = $package['sale_price'] ?: $package['original_price'];
    if ($package['is_free']) {
        $currentPrice = 0;
    }
    
    // Kiểm tra package đã có trong giỏ hàng chưa
    $stmt = $pdo->prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND package_id = ?");
    $stmt->execute([$user['id'], $packageId]);
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
        $stmt = $pdo->prepare("INSERT INTO cart (user_id, product_id, package_id, quantity) VALUES (?, ?, ?, ?)");
        $stmt->execute([$user['id'], $package['product_id'], $packageId, $quantity]);
        
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
            pp.id as package_id,
            pp.package_name,
            pp.original_price,
            pp.sale_price,
            pp.is_free,
            p.id as product_id,
            p.name as product_name,
            p.type as product_type,
            CASE 
                WHEN pp.is_free = 1 THEN 0
                WHEN pp.sale_price IS NOT NULL AND pp.sale_price > 0 THEN pp.sale_price
                ELSE pp.original_price
            END as current_price,
            (c.quantity * 
                CASE 
                    WHEN pp.is_free = 1 THEN 0
                    WHEN pp.sale_price IS NOT NULL AND pp.sale_price > 0 THEN pp.sale_price
                    ELSE pp.original_price
                END
            ) as subtotal
        FROM cart c
        JOIN product_packages pp ON c.package_id = pp.id
        JOIN products p ON pp.product_id = p.id
        WHERE c.id = ?
    ");
    $stmt->execute([$cartItemId]);
    $cartItem = $stmt->fetch();
    
    // Format giá tiền
    $cartItem['current_price_formatted'] = number_format($cartItem['current_price'], 0, ',', '.') . '₫';
    $cartItem['subtotal_formatted'] = number_format($cartItem['subtotal'], 0, ',', '.') . '₫';
    
    if ($cartItem['original_price'] != $cartItem['current_price']) {
        $cartItem['original_price_formatted'] = number_format($cartItem['original_price'], 0, ',', '.') . '₫';
        $cartItem['has_discount'] = true;
    } else {
        $cartItem['original_price_formatted'] = null;
        $cartItem['has_discount'] = false;
    }
    
    // Lấy tổng số item trong giỏ hàng
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_items,
            SUM(c.quantity) as total_quantity,
            SUM(c.quantity * 
                CASE 
                    WHEN pp.is_free = 1 THEN 0
                    WHEN pp.sale_price IS NOT NULL AND pp.sale_price > 0 THEN pp.sale_price
                    ELSE pp.original_price
                END
            ) as total_amount
        FROM cart c
        JOIN product_packages pp ON c.package_id = pp.id
        JOIN products p ON pp.product_id = p.id
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
                'total_formatted' => number_format($cartSummary['total_amount'], 0, ',', '.') . '₫'
            ]
        ],
        'message' => $action === 'added' 
            ? "Đã thêm {$package['package_name']} vào giỏ hàng"
            : "Đã cập nhật số lượng {$package['package_name']} trong giỏ hàng"
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
