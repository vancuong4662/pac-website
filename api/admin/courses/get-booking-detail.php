<?php
/**
 * Admin API - Get Course Booking Detail
 * Lấy chi tiết một đăng ký khóa học cụ thể
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));

require_once '../../../config/db-pdo.php';
require_once '../../../config/error-codes.php';

try {
    // Check authentication and admin role
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(generateErrorResponse(ERROR_UNAUTHORIZED));
        exit;
    }
    
    // Check if user is admin
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(generateErrorResponse(ERROR_FORBIDDEN, 'Chỉ admin mới có quyền truy cập'));
        exit;
    }
    
    // Get booking ID
    $bookingId = intval($_GET['id'] ?? 0);
    
    if ($bookingId <= 0) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'ID đăng ký không hợp lệ'));
        exit;
    }
    
    $pdo = getPDOConnection();
    
    // Get booking detail with user info and order info
    $sql = "
        SELECT 
            pp.id,
            pp.user_id,
            pp.order_id,
            pp.package_id,
            pp.access_code,
            pp.package_name,
            pp.product_name,
            pp.product_type,
            pp.package_price,
            pp.package_features,
            pp.package_metadata,
            pp.status,
            pp.access_starts_at,
            pp.expires_at,
            pp.first_accessed_at,
            pp.last_accessed_at,
            pp.access_count,
            pp.usage_data,
            pp.client_notes,
            pp.staff_notes,
            pp.support_status,
            pp.scheduled_at,
            pp.created_at,
            pp.updated_at,
            u.fullname as user_fullname,
            u.email as user_email,
            u.phone as user_phone,
            u.username as user_username,
            u.created_at as user_created_at,
            o.order_code,
            o.total_amount as order_total,
            o.payment_method,
            o.payment_status,
            o.created_at as order_created_at
        FROM purchased_packages pp
        LEFT JOIN users u ON pp.user_id = u.id
        LEFT JOIN orders o ON pp.order_id = o.id
        WHERE pp.id = ? AND pp.product_type = 'course'
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$booking) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Không tìm thấy đăng ký'));
        exit;
    }
    
    // Format dates
    $booking['created_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['created_at']));
    $booking['updated_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['updated_at']));
    
    if ($booking['user_created_at']) {
        $booking['user_created_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['user_created_at']));
    }
    
    if ($booking['order_created_at']) {
        $booking['order_created_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['order_created_at']));
    }
    
    if ($booking['access_starts_at']) {
        $booking['access_starts_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['access_starts_at']));
    }
    
    if ($booking['expires_at']) {
        $booking['expires_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['expires_at']));
    }
    
    if ($booking['first_accessed_at']) {
        $booking['first_accessed_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['first_accessed_at']));
    }
    
    if ($booking['last_accessed_at']) {
        $booking['last_accessed_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['last_accessed_at']));
    }
    
    if ($booking['scheduled_at']) {
        $booking['scheduled_at_formatted'] = date('d/m/Y H:i:s', strtotime($booking['scheduled_at']));
    }
    
    // Parse JSON fields
    if ($booking['package_features']) {
        $booking['package_features_parsed'] = json_decode($booking['package_features'], true);
    }
    
    if ($booking['package_metadata']) {
        $booking['package_metadata_parsed'] = json_decode($booking['package_metadata'], true);
    }
    
    if ($booking['usage_data']) {
        $booking['usage_data_parsed'] = json_decode($booking['usage_data'], true);
    }
    
    // Success response
    http_response_code(200);
    echo json_encode(generateSuccessResponse($booking, 'Lấy chi tiết đăng ký thành công'));

} catch (Exception $e) {
    error_log("Admin Get Booking Detail API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, $e->getMessage()));
}

?>
