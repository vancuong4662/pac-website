<?php
/**
 * Simplified Payment History API for debugging
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once __DIR__ . '/../../config/db-pdo.php';
    require_once __DIR__ . '/../auth/middleware.php';

    // Check authentication
    $user = verifySession();
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng đăng nhập để xem lịch sử thanh toán'
        ]);
        exit;
    }

    $user_id = $user['id'];

    // Get basic orders
    $stmt = $pdo->prepare("
        SELECT 
            o.*,
            vt.vnp_transaction_no,
            vt.vnp_bank_code,
            vt.vnp_pay_date
        FROM orders o
        LEFT JOIN vnpay_transactions vt ON o.id = vt.order_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
        LIMIT 20
    ");
    $stmt->execute([$user_id]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format basic response
    $payments = [];
    $total_paid = 0;

    foreach ($orders as $order) {
        // Get order items
        $items_stmt = $pdo->prepare("
            SELECT oi.*, p.type as product_type
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $items_stmt->execute([$order['id']]);
        $items = $items_stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($order['payment_status'] === 'paid') {
            $total_paid += $order['total_amount'];
        }

        // Format pay date
        $pay_date = null;
        if ($order['vnp_pay_date'] && strlen($order['vnp_pay_date']) === 14) {
            $year = substr($order['vnp_pay_date'], 0, 4);
            $month = substr($order['vnp_pay_date'], 4, 2);
            $day = substr($order['vnp_pay_date'], 6, 2);
            $hour = substr($order['vnp_pay_date'], 8, 2);
            $minute = substr($order['vnp_pay_date'], 10, 2);
            $pay_date = "$day/$month/$year $hour:$minute";
        }

        // Determine primary type
        $primary_type = 'mixed';
        $course_count = 0;
        $test_count = 0;
        $consultation_count = 0;

        foreach ($items as $item) {
            switch ($item['product_type']) {
                case 'course': $course_count++; break;
                case 'career_test': $test_count++; break;
                case 'consultation': $consultation_count++; break;
            }
        }

        if ($course_count > 0 && $test_count === 0 && $consultation_count === 0) {
            $primary_type = 'course';
        } elseif ($test_count > 0 && $course_count === 0 && $consultation_count === 0) {
            $primary_type = 'career_test';
        } elseif ($consultation_count > 0 && $course_count === 0 && $test_count === 0) {
            $primary_type = 'consultation';
        }

        $payments[] = [
            'id' => (int)$order['id'],
            'order_code' => $order['order_code'],
            'total_amount' => (float)$order['total_amount'],
            'payment_status' => $order['payment_status'],
            'payment_method' => $order['payment_method'],
            'created_at' => date('d/m/Y H:i', strtotime($order['created_at'])),
            'pay_date' => $pay_date,
            'vnp_transaction_no' => $order['vnp_transaction_no'],
            'vnp_bank_code' => $order['vnp_bank_code'],
            'bank_name' => $order['vnp_bank_code'] ? 'NCB Bank' : null, // Simple fallback
            'course_count' => $course_count,
            'test_count' => $test_count,
            'consultation_count' => $consultation_count,
            'primary_type' => $primary_type,
            'items' => array_map(function($item) {
                return [
                    'product_name' => $item['product_name'],
                    'package_name' => $item['package_name'],
                    'product_type' => $item['product_type'],
                    'quantity' => (int)$item['quantity'],
                    'unit_price' => (float)$item['unit_price'],
                    'total_price' => (float)$item['total_price']
                ];
            }, $items)
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'payments' => $payments,
            'summary' => [
                'total_paid' => $total_paid,
                'total_courses' => $course_count,
                'total_tests' => $test_count,
                'total_consultations' => $consultation_count
            ],
            'pagination' => [
                'total' => count($payments),
                'limit' => 20,
                'offset' => 0,
                'has_more' => false
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}
?>