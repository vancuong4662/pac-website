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

try {
    // Lấy thông tin giỏ hàng trước khi xóa
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
    $cartSummaryBefore = $stmt->fetch();
    
    if ($cartSummaryBefore['total_items'] == 0) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Giỏ hàng đã trống',
            'data' => [
                'items_removed' => 0,
                'cart_summary' => [
                    'total_items' => 0,
                    'total_quantity' => 0,
                    'total_amount' => 0,
                    'total_formatted' => '0 VND'
                ]
            ]
        ]);
        exit;
    }
    
    // Xóa toàn bộ giỏ hàng của user
    $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    
    $deletedRows = $stmt->rowCount();
    
    $response = [
        'success' => true,
        'data' => [
            'items_removed' => $deletedRows,
            'previous_summary' => [
                'total_items' => (int)$cartSummaryBefore['total_items'],
                'total_quantity' => (int)$cartSummaryBefore['total_quantity'],
                'total_amount' => (float)$cartSummaryBefore['total_amount'],
                'total_formatted' => number_format($cartSummaryBefore['total_amount'], 0, ',', '.') . ' VND'
            ],
            'cart_summary' => [
                'total_items' => 0,
                'total_quantity' => 0,
                'total_amount' => 0,
                'total_formatted' => '0 VND'
            ]
        ],
        'message' => "Đã xóa toàn bộ giỏ hàng ({$deletedRows} sản phẩm)"
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
