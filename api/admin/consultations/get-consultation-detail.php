<?php
/**
 * Admin API - Get Consultation Booking Detail
 * Lấy chi tiết đăng ký tư vấn theo ID
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
    
    // Validate ID parameter
    $consultationId = $_GET['id'] ?? null;
    
    if (!$consultationId || !is_numeric($consultationId)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'ID đăng ký tư vấn không hợp lệ'));
        exit;
    }
    
    $pdo = getPDOConnection();
    
    // Query consultation detail with JOIN
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
            pp.support_status,
            pp.scheduled_at,
            pp.client_notes,
            pp.staff_notes,
            pp.access_starts_at,
            pp.expires_at,
            pp.first_accessed_at,
            pp.last_accessed_at,
            pp.access_count,
            pp.created_at,
            pp.updated_at,
            u.fullname as user_fullname,
            u.email as user_email,
            u.phone as user_phone,
            u.username as user_username,
            o.order_code,
            o.total_amount as order_total,
            o.payment_method,
            o.payment_status
        FROM purchased_packages pp
        LEFT JOIN users u ON pp.user_id = u.id
        LEFT JOIN orders o ON pp.order_id = o.id
        WHERE pp.id = ? AND pp.product_type = 'consultation'
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$consultationId]);
    $consultation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$consultation) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Không tìm thấy đăng ký tư vấn'));
        exit;
    }
    
    // Format dates for display
    if ($consultation['created_at']) {
        $consultation['created_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['created_at']));
    }
    if ($consultation['updated_at']) {
        $consultation['updated_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['updated_at']));
    }
    if ($consultation['scheduled_at']) {
        $consultation['scheduled_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['scheduled_at']));
    }
    if ($consultation['access_starts_at']) {
        $consultation['access_starts_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['access_starts_at']));
    }
    if ($consultation['expires_at']) {
        $consultation['expires_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['expires_at']));
    }
    
    // Parse JSON fields
    if ($consultation['package_features']) {
        $consultation['package_features'] = json_decode($consultation['package_features'], true);
    }
    if ($consultation['package_metadata']) {
        $consultation['package_metadata'] = json_decode($consultation['package_metadata'], true);
    }
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Lấy chi tiết đăng ký tư vấn thành công',
        'data' => $consultation
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in get-consultation-detail.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_DATABASE, 'Lỗi truy vấn cơ sở dữ liệu'));
} catch (Exception $e) {
    error_log("Error in get-consultation-detail.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_UNKNOWN, $e->getMessage()));
}
