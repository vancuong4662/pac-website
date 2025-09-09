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

// Kiểm tra authentication (có thể là admin hoặc system call)
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
$forceProcess = isset($input['force']) ? (bool)$input['force'] : false;

if ($orderId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid order ID']);
    exit;
}

try {
    // Bắt đầu transaction
    $pdo->beginTransaction();
    
    // Import helper functions
    require_once __DIR__ . '/process-purchase-helper.php';
    
    // Xử lý purchased items
    $result = processOrderPurchases($pdo, $orderId, $user);
    
    // Commit transaction
    $pdo->commit();
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
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

?>
