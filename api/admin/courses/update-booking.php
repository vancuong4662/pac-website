<?php
/**
 * Admin API - Update Course Booking
 * Cập nhật thông tin đăng ký khóa học (status, support_status, staff_notes, scheduled_at)
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
        echo json_encode(generateErrorResponse(ERROR_FORBIDDEN, 'Chỉ admin mới có quyền cập nhật'));
        exit;
    }
    
    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['booking_id'])) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'Thiếu ID đăng ký'));
        exit;
    }
    
    $bookingId = intval($input['booking_id']);
    $status = $input['status'] ?? null;
    $supportStatus = $input['support_status'] ?? null;
    $staffNotes = $input['staff_notes'] ?? null;
    $scheduledAt = $input['scheduled_at'] ?? null;
    
    // Validate required fields
    if (empty($status) || empty($supportStatus)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'Trạng thái và trạng thái hỗ trợ là bắt buộc'));
        exit;
    }
    
    // Validate status values
    $validStatuses = ['pending', 'active', 'completed', 'expired', 'cancelled'];
    if (!in_array($status, $validStatuses)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'Trạng thái không hợp lệ'));
        exit;
    }
    
    $validSupportStatuses = ['none', 'contacted', 'scheduled', 'in_progress', 'resolved'];
    if (!in_array($supportStatus, $validSupportStatuses)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'Trạng thái hỗ trợ không hợp lệ'));
        exit;
    }
    
    $pdo = getPDOConnection();
    
    // Check if booking exists and is a course
    $checkStmt = $pdo->prepare("SELECT id, product_type, user_id FROM purchased_packages WHERE id = ?");
    $checkStmt->execute([$bookingId]);
    $booking = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$booking) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Không tìm thấy đăng ký'));
        exit;
    }
    
    if ($booking['product_type'] !== 'course') {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'Đăng ký này không phải là khóa học'));
        exit;
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Build update query
        $updateFields = [
            'status = ?',
            'support_status = ?',
            'staff_notes = ?',
            'updated_at = NOW()'
        ];
        
        $updateParams = [$status, $supportStatus, $staffNotes];
        
        // Add scheduled_at if provided
        if ($scheduledAt !== null && !empty($scheduledAt)) {
            $updateFields[] = 'scheduled_at = ?';
            $updateParams[] = $scheduledAt;
        } else {
            $updateFields[] = 'scheduled_at = NULL';
        }
        
        $updateParams[] = $bookingId;
        
        $updateSql = "UPDATE purchased_packages SET " . implode(', ', $updateFields) . " WHERE id = ?";
        
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute($updateParams);
        
        // Log the update
        error_log(sprintf(
            "Admin updated booking: ID=%d, UserID=%d, Status=%s, Support=%s, AdminID=%d",
            $booking['id'],
            $booking['user_id'],
            $status,
            $supportStatus,
            $_SESSION['user_id']
        ));
        
        // Commit transaction
        $pdo->commit();
        
        // Get updated booking data
        $getStmt = $pdo->prepare("
            SELECT 
                pp.*,
                u.fullname as user_fullname,
                u.email as user_email,
                u.phone as user_phone
            FROM purchased_packages pp
            LEFT JOIN users u ON pp.user_id = u.id
            WHERE pp.id = ?
        ");
        $getStmt->execute([$bookingId]);
        $updatedBooking = $getStmt->fetch(PDO::FETCH_ASSOC);
        
        // Success response
        http_response_code(200);
        echo json_encode(generateSuccessResponse([
            'booking_id' => $bookingId,
            'booking' => $updatedBooking
        ], 'Cập nhật đăng ký thành công'));
        
    } catch (Exception $e) {
        // Rollback on error
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Admin Update Booking API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, 'Lỗi khi cập nhật đăng ký: ' . $e->getMessage()));
}

?>
