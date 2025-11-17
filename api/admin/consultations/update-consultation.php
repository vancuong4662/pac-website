<?php
/**
 * Admin API - Update Consultation Booking
 * Cập nhật thông tin đăng ký tư vấn
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
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
    
    // Only accept POST method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'Chỉ chấp nhận phương thức POST'));
        exit;
    }
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'Dữ liệu không hợp lệ'));
        exit;
    }
    
    // Validate required fields
    $consultationId = $input['id'] ?? null;
    $status = $input['status'] ?? null;
    $supportStatus = $input['support_status'] ?? null;
    
    if (!$consultationId || !is_numeric($consultationId)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'ID đăng ký tư vấn không hợp lệ'));
        exit;
    }
    
    if (!$status) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'Trạng thái không được để trống'));
        exit;
    }
    
    if (!$supportStatus) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'Tình trạng hỗ trợ không được để trống'));
        exit;
    }
    
    // Validate status values
    $validStatuses = ['pending', 'active', 'completed', 'expired', 'cancelled'];
    $validSupportStatuses = ['none', 'contacted', 'scheduled', 'in_progress', 'resolved'];
    
    if (!in_array($status, $validStatuses)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'Trạng thái không hợp lệ'));
        exit;
    }
    
    if (!in_array($supportStatus, $validSupportStatuses)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'Tình trạng hỗ trợ không hợp lệ'));
        exit;
    }
    
    $pdo = getPDOConnection();
    
    // Check if consultation exists and is of type 'consultation'
    $checkSql = "SELECT id, product_type FROM purchased_packages WHERE id = ?";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute([$consultationId]);
    $existingConsultation = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingConsultation) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Không tìm thấy đăng ký tư vấn'));
        exit;
    }
    
    if ($existingConsultation['product_type'] !== 'consultation') {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION, 'Đây không phải là đăng ký tư vấn'));
        exit;
    }
    
    // Prepare update data
    $scheduledAt = !empty($input['scheduled_at']) ? $input['scheduled_at'] : null;
    $staffNotes = $input['staff_notes'] ?? '';
    
    // Update consultation
    $updateSql = "
        UPDATE purchased_packages 
        SET 
            status = ?,
            support_status = ?,
            scheduled_at = ?,
            staff_notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ";
    
    $updateStmt = $pdo->prepare($updateSql);
    $updateResult = $updateStmt->execute([
        $status,
        $supportStatus,
        $scheduledAt,
        $staffNotes,
        $consultationId
    ]);
    
    if (!$updateResult) {
        throw new Exception('Cập nhật thất bại');
    }
    
    // Fetch updated consultation
    $fetchSql = "
        SELECT 
            pp.*,
            u.fullname as user_fullname,
            u.email as user_email
        FROM purchased_packages pp
        LEFT JOIN users u ON pp.user_id = u.id
        WHERE pp.id = ?
    ";
    
    $fetchStmt = $pdo->prepare($fetchSql);
    $fetchStmt->execute([$consultationId]);
    $updatedConsultation = $fetchStmt->fetch(PDO::FETCH_ASSOC);
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Cập nhật đăng ký tư vấn thành công',
        'data' => $updatedConsultation
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in update-consultation.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_DATABASE, 'Lỗi cơ sở dữ liệu'));
} catch (Exception $e) {
    error_log("Error in update-consultation.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_UNKNOWN, $e->getMessage()));
}
