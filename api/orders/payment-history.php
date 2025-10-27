<?php
/**
 * API: Lấy lịch sử thanh toán của user
 * 
 * Method: GET
 * Requires: Đăng nhập
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Phương thức không được hỗ trợ'
    ]);
    exit;
}

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../auth/middleware.php';

try {
    // Kiểm tra đăng nhập
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng đăng nhập để xem lịch sử thanh toán'
        ]);
        exit;
    }

    $user_id = $user['id'];

    // Lấy query parameters
    $status = $_GET['status'] ?? null; // 'paid', 'pending', 'failed'
    $product_type = $_GET['type'] ?? null; // 'course', 'career_test', 'consultation'
    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);

    // Lấy tất cả orders của user với thông tin chi tiết
    $where_conditions = ['o.user_id = ?'];
    $params = [$user_id];

    if ($status) {
        $where_conditions[] = 'o.payment_status = ?';
        $params[] = $status;
    }

    $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);

    // Main query: Get orders with payment info
    $stmt = $pdo->prepare("
        SELECT 
            o.*,
            vt.txn_ref,
            vt.vnp_transaction_no,
            vt.vnp_bank_code,
            vt.vnp_pay_date,
            vt.vnp_response_code,
            vt.status as vnpay_status,
            
            -- Count items by type
            (SELECT COUNT(*) FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = o.id AND p.type = 'course') as course_count,
            (SELECT COUNT(*) FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = o.id AND p.type = 'career_test') as test_count,
            (SELECT COUNT(*) FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = o.id AND p.type = 'consultation') as consultation_count
             
        FROM orders o
        LEFT JOIN vnpay_transactions vt ON o.id = vt.order_id
        $where_clause
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
    ");

    $params[] = $limit;
    $params[] = $offset;
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get order items for each order
    $payment_history = [];
    $total_paid = 0;
    $total_courses = 0;
    $total_tests = 0;
    $total_consultations = 0;

    foreach ($orders as $order) {
        // Get order items
        $items_stmt = $pdo->prepare("
            SELECT 
                oi.*,
                p.type as product_type,
                p.image_url as product_image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
            ORDER BY oi.id
        ");
        $items_stmt->execute([$order['id']]);
        $order_items = $items_stmt->fetchAll(PDO::FETCH_ASSOC);

        // Filter by product type if specified
        if ($product_type) {
            $order_items = array_filter($order_items, function($item) use ($product_type) {
                return $item['product_type'] === $product_type;
            });
            
            // Skip order if no items match the filter
            if (empty($order_items)) {
                continue;
            }
        }

        // Calculate totals for paid orders
        if ($order['payment_status'] === 'paid') {
            $total_paid += $order['total_amount'];
            $total_courses += $order['course_count'];
            $total_tests += $order['test_count'];
            $total_consultations += $order['consultation_count'];
        }

        // Format dates
        $created_at = date('d/m/Y H:i', strtotime($order['created_at']));
        $pay_date = null;
        if ($order['vnp_pay_date'] && strlen($order['vnp_pay_date']) === 14) {
            // Format VNPay date: YYYYMMDDHHmmss -> dd/mm/yyyy HH:mm
            $year = substr($order['vnp_pay_date'], 0, 4);
            $month = substr($order['vnp_pay_date'], 4, 2);
            $day = substr($order['vnp_pay_date'], 6, 2);
            $hour = substr($order['vnp_pay_date'], 8, 2);
            $minute = substr($order['vnp_pay_date'], 10, 2);
            $pay_date = "$day/$month/$year $hour:$minute";
        }

        // Determine primary product type for display
        $primary_type = 'mixed';
        if ($order['course_count'] > 0 && $order['test_count'] === 0 && $order['consultation_count'] === 0) {
            $primary_type = 'course';
        } elseif ($order['test_count'] > 0 && $order['course_count'] === 0 && $order['consultation_count'] === 0) {
            $primary_type = 'career_test';
        } elseif ($order['consultation_count'] > 0 && $order['course_count'] === 0 && $order['test_count'] === 0) {
            $primary_type = 'consultation';
        }

        // Get bank name
        $bank_name = getBankName($order['vnp_bank_code']);

        $payment_history[] = [
            'id' => (int)$order['id'],
            'order_code' => $order['order_code'],
            'total_amount' => (float)$order['total_amount'],
            'payment_status' => $order['payment_status'],
            'payment_method' => $order['payment_method'],
            'created_at' => $created_at,
            'pay_date' => $pay_date,
            
            // VNPay info
            'txn_ref' => $order['txn_ref'],
            'vnp_transaction_no' => $order['vnp_transaction_no'],
            'vnp_bank_code' => $order['vnp_bank_code'],
            'bank_name' => $bank_name,
            'vnp_response_code' => $order['vnp_response_code'],
            'vnpay_status' => $order['vnpay_status'],
            
            // Product counts
            'course_count' => (int)$order['course_count'],
            'test_count' => (int)$order['test_count'],
            'consultation_count' => (int)$order['consultation_count'],
            'total_items' => count($order_items),
            'primary_type' => $primary_type,
            
            // Order items
            'items' => array_map(function($item) {
                return [
                    'product_name' => $item['product_name'],
                    'package_name' => $item['package_name'],
                    'product_type' => $item['product_type'],
                    'quantity' => (int)$item['quantity'],
                    'unit_price' => (float)$item['unit_price'],
                    'total_price' => (float)$item['total_price'],
                    'product_image' => $item['product_image']
                ];
            }, $order_items)
        ];
    }

    // Get total count for pagination
    $count_stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM orders o
        $where_clause
    ");
    $count_stmt->execute(array_slice($params, 0, -2)); // Remove limit and offset
    $total_count = $count_stmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'data' => [
            'payments' => $payment_history,
            'summary' => [
                'total_paid' => $total_paid,
                'total_courses' => $total_courses,
                'total_tests' => $total_tests,
                'total_consultations' => $total_consultations,
                'total_payments' => count($payment_history)
            ],
            'pagination' => [
                'total' => $total_count,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total_count
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi database: ' . $e->getMessage()
    ]);
}

function getBankName($bankCode) {
    $bankNames = [
        'VNPAYQR' => 'VNPay QR',
        'VNBANK' => 'Ngân hàng nội địa',
        'INTCARD' => 'Thẻ quốc tế',
        'VIETCOMBANK' => 'Vietcombank',
        'VIETINBANK' => 'VietinBank',
        'BIDV' => 'BIDV',
        'AGRIBANK' => 'Agribank',
        'TCB' => 'Techcombank',
        'ACB' => 'ACB',
        'MB' => 'MB Bank',
        'SACOMBANK' => 'Sacombank',
        'NCB' => 'NCB Bank',
        'SCB' => 'SCB',
        'TPBANK' => 'TPBank',
        'MSBANK' => 'MSB',
        'EXIMBANK' => 'Eximbank'
    ];

    return $bankNames[$bankCode] ?? $bankCode;
}
?>