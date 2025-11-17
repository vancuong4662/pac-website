<?php
/**
 * Admin API - Delete Exam
 * Xóa một bài thi (bao gồm cả câu trả lời và kết quả)
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
        echo json_encode(generateErrorResponse(ERROR_FORBIDDEN, 'Chỉ admin mới có quyền xóa bài thi'));
        exit;
    }
    
    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['exam_id'])) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'Thiếu ID bài thi'));
        exit;
    }
    
    $examId = intval($input['exam_id']);
    
    if ($examId <= 0) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'ID bài thi không hợp lệ'));
        exit;
    }
    
    $pdo = getPDOConnection();
    
    // Check if exam exists
    $checkStmt = $pdo->prepare("SELECT id, exam_code, user_id FROM quiz_exams WHERE id = ?");
    $checkStmt->execute([$examId]);
    $exam = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$exam) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Không tìm thấy bài thi'));
        exit;
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Delete exam (CASCADE will delete answers, results, suggested jobs, etc.)
        $deleteStmt = $pdo->prepare("DELETE FROM quiz_exams WHERE id = ?");
        $deleteStmt->execute([$examId]);
        
        // Log the deletion
        error_log(sprintf(
            "Admin deleted exam: ID=%d, Code=%s, UserID=%d, AdminID=%d",
            $exam['id'],
            $exam['exam_code'],
            $exam['user_id'],
            $_SESSION['user_id']
        ));
        
        // Commit transaction
        $pdo->commit();
        
        // Success response
        http_response_code(200);
        echo json_encode(generateSuccessResponse([
            'deleted_exam_id' => $examId,
            'exam_code' => $exam['exam_code']
        ], 'Xóa bài thi thành công'));
        
    } catch (Exception $e) {
        // Rollback on error
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Admin Delete Exam API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, 'Lỗi khi xóa bài thi: ' . $e->getMessage()));
}

?>
