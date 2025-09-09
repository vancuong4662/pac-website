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

// Lấy parameters
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$limit = isset($_GET['limit']) ? min(50, max(5, (int)$_GET['limit'])) : 10;
$status = isset($_GET['status']) ? trim($_GET['status']) : null;
$paymentStatus = isset($_GET['payment_status']) ? trim($_GET['payment_status']) : null;

$offset = ($page - 1) * $limit;

try {
    // Build WHERE conditions
    $whereConditions = ['o.user_id = ?'];
    $params = [$user['id']];
    
    if ($status && in_array($status, ['pending', 'completed', 'cancelled'])) {
        $whereConditions[] = 'o.status = ?';
        $params[] = $status;
    }
    
    if ($paymentStatus && in_array($paymentStatus, ['pending', 'paid', 'failed'])) {
        $whereConditions[] = 'o.payment_status = ?';
        $params[] = $paymentStatus;
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Count total orders
    $countSql = "SELECT COUNT(*) as total FROM orders o WHERE {$whereClause}";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $totalOrders = $stmt->fetch()['total'];
    
    // Get orders with pagination
    $sql = "
        SELECT 
            o.id,
            o.order_code,
            o.total_amount,
            o.status,
            o.payment_method,
            o.payment_status,
            o.created_at,
            o.updated_at,
            COUNT(oi.id) as items_count,
            SUM(oi.quantity) as total_quantity
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE {$whereClause}
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([...$params, $limit, $offset]);
    $orders = $stmt->fetchAll();
    
    // Format orders
    foreach ($orders as &$order) {
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
        
        // Cast to integers
        $order['items_count'] = (int)$order['items_count'];
        $order['total_quantity'] = (int)$order['total_quantity'];
        $order['total_amount'] = (float)$order['total_amount'];
    }
    
    // Calculate pagination
    $totalPages = ceil($totalOrders / $limit);
    
    $response = [
        'success' => true,
        'data' => [
            'orders' => $orders,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => (int)$totalOrders,
                'total_pages' => $totalPages,
                'has_prev' => $page > 1,
                'has_next' => $page < $totalPages,
                'prev_page' => $page > 1 ? $page - 1 : null,
                'next_page' => $page < $totalPages ? $page + 1 : null
            ]
        ],
        'filters' => [
            'status' => $status,
            'payment_status' => $paymentStatus,
            'page' => $page,
            'limit' => $limit
        ],
        'user_id' => $user['id']
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
