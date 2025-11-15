<?php
/**
 * Admin Orders API
 * Endpoint để quản lý tất cả đơn hàng (admin only)
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log request details
error_log("=== Orders API Request ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("URI: " . $_SERVER['REQUEST_URI']);
error_log("Query: " . ($_SERVER['QUERY_STRING'] ?? 'none'));

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db-pdo.php';

// Use the connection from db-pdo.php ($conn) and assign to $pdo for consistency
$pdo = $conn;

// TODO: Add admin authentication check
// For now, we'll proceed without auth for development

try {
    
    // Get request method
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Check if requesting specific order details
        if (isset($_GET['id'])) {
            getOrderDetails($pdo, $_GET['id']);
        } else {
            // Get all orders with filters
            getAllOrders($pdo);
        }
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Admin Orders API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

/**
 * Get all orders with optional filters
 */
function getAllOrders($pdo) {
    // Get filter parameters
    $paymentStatus = isset($_GET['payment_status']) ? $_GET['payment_status'] : null;
    $productType = isset($_GET['product_type']) ? $_GET['product_type'] : null;
    
    // Build query
    $sql = "
        SELECT 
            o.id,
            o.order_code,
            o.user_id,
            o.total_amount,
            o.status,
            o.payment_method,
            o.payment_status,
            o.vnpay_txn_ref,
            o.created_at,
            o.updated_at,
            u.fullname as user_fullname,
            u.email as user_email,
            vt.vnp_transaction_no,
            vt.vnp_bank_code,
            vt.vnp_pay_date as pay_date
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN vnpay_transactions vt ON o.id = vt.order_id AND vt.status = 'success'
        WHERE 1=1
    ";
    
    $params = [];
    
    // Filter by payment status
    if ($paymentStatus) {
        $sql .= " AND o.payment_status = :payment_status";
        $params[':payment_status'] = $paymentStatus;
    }
    
    // Order by most recent first
    $sql .= " ORDER BY o.created_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get order items for each order
    foreach ($orders as &$order) {
        $order['items'] = getOrderItems($pdo, $order['id'], $productType);
        
        // Get bank name if available
        if ($order['vnp_bank_code']) {
            $order['bank_name'] = getBankName($order['vnp_bank_code']);
        }
    }
    
    // Filter out orders with no items (if product_type filter is applied)
    if ($productType) {
        $orders = array_filter($orders, function($order) {
            return count($order['items']) > 0;
        });
        $orders = array_values($orders); // Re-index array
    }
    
    // Calculate statistics
    $statistics = calculateStatistics($pdo, $orders);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'orders' => $orders,
            'statistics' => $statistics
        ],
        'count' => count($orders)
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Get order items
 */
function getOrderItems($pdo, $orderId, $productTypeFilter = null) {
    $sql = "
        SELECT 
            oi.id,
            oi.product_id,
            oi.package_id,
            oi.quantity,
            oi.unit_price,
            oi.total_price,
            oi.product_name,
            oi.package_name,
            p.type as product_type,
            p.image_url as product_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = :order_id
    ";
    
    $params = [':order_id' => $orderId];
    
    if ($productTypeFilter) {
        $sql .= " AND p.type = :product_type";
        $params[':product_type'] = $productTypeFilter;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Get specific order details
 */
function getOrderDetails($pdo, $orderId) {
    // Get order info
    $sql = "
        SELECT 
            o.id,
            o.order_code,
            o.user_id,
            o.total_amount,
            o.status,
            o.payment_method,
            o.payment_status,
            o.vnpay_txn_ref,
            o.created_at,
            o.updated_at,
            u.fullname as user_fullname,
            u.email as user_email,
            u.phone as user_phone,
            vt.vnp_transaction_no,
            vt.vnp_bank_code,
            vt.vnp_bank_tran_no,
            vt.vnp_pay_date as pay_date,
            vt.amount as vnpay_amount
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN vnpay_transactions vt ON o.id = vt.order_id AND vt.status = 'success'
        WHERE o.id = :order_id
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':order_id' => $orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Order not found'
        ]);
        return;
    }
    
    // Get order items
    $order['items'] = getOrderItems($pdo, $order['id']);
    
    // Get bank name
    if ($order['vnp_bank_code']) {
        $order['bank_name'] = getBankName($order['vnp_bank_code']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $order
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Calculate statistics
 */
function calculateStatistics($pdo, $orders) {
    $stats = [
        'totalOrders' => count($orders),
        'totalRevenue' => 0,
        'uniqueCustomers' => 0
    ];
    
    $uniqueUserIds = [];
    
    foreach ($orders as $order) {
        // Total revenue (only paid orders)
        if ($order['payment_status'] === 'paid') {
            $stats['totalRevenue'] += floatval($order['total_amount']);
        }
        
        // Unique customers
        if (!in_array($order['user_id'], $uniqueUserIds)) {
            $uniqueUserIds[] = $order['user_id'];
        }
    }
    
    $stats['uniqueCustomers'] = count($uniqueUserIds);
    
    return $stats;
}

/**
 * Get bank name from bank code
 */
function getBankName($bankCode) {
    $banks = [
        'NCB' => 'Ngân hàng NCB',
        'AGRIBANK' => 'Ngân hàng Agribank',
        'SCB' => 'Ngân hàng SCB',
        'SACOMBANK' => 'Ngân hàng Sacombank',
        'EXIMBANK' => 'Ngân hàng Eximbank',
        'MSBANK' => 'Ngân hàng MSBANK',
        'NAMABANK' => 'Ngân hàng NamABank',
        'VNMART' => 'Vi điện tử VnMart',
        'VIETINBANK' => 'Ngân hàng Vietinbank',
        'VIETCOMBANK' => 'Ngân hàng VCB',
        'HDBANK' => 'Ngân hàng HDBank',
        'DONGABANK' => 'Ngân hàng Dong A',
        'TPBANK' => 'Ngân hàng TPBank',
        'OJB' => 'Ngân hàng OceanBank',
        'BIDV' => 'Ngân hàng BIDV',
        'TECHCOMBANK' => 'Ngân hàng Techcombank',
        'VPBANK' => 'Ngân hàng VPBank',
        'MBBANK' => 'Ngân hàng MBBank',
        'ACB' => 'Ngân hàng ACB',
        'OCB' => 'Ngân hàng OCB',
        'IVB' => 'Ngân hàng IVB',
        'VISA' => 'Thẻ quốc tế Visa'
    ];
    
    return isset($banks[$bankCode]) ? $banks[$bankCode] : $bankCode;
}
