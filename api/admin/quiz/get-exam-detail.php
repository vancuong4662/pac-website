<?php
/**
 * Admin API - Get Exam Detail
 * Lấy chi tiết một bài thi cụ thể (bao gồm cả thông tin user và kết quả)
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));

require_once '../../../config/db-pdo.php';
require_once '../../../config/error-codes.php';
require_once '../../../config/quiz-config.php';

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
    
    // Get exam ID
    $examId = intval($_GET['id'] ?? 0);
    
    if ($examId <= 0) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_INPUT, 'ID bài thi không hợp lệ'));
        exit;
    }
    
    $pdo = getPDOConnection();
    
    // Get exam detail with user info and result
    $sql = "
        SELECT 
            qe.id,
            qe.exam_code,
            qe.user_id,
            qe.exam_type,
            qe.exam_status,
            qe.package_id,
            qe.product_id,
            qe.total_questions,
            qe.answered_questions,
            qe.time_limit,
            qe.created_at,
            qe.start_time,
            qe.end_time,
            qe.updated_at,
            qe.ip_address,
            qr.id as result_id,
            qr.total_score,
            qr.holland_code,
            qr.primary_group,
            qr.secondary_group,
            qr.tertiary_group,
            qr.score_r,
            qr.score_i,
            qr.score_a,
            qr.score_s,
            qr.score_e,
            qr.score_c,
            qr.characteristics_code,
            qr.has_fraud_flags,
            qr.created_at as result_created_at,
            u.fullname as user_fullname,
            u.email as user_email,
            u.username as user_username,
            u.phone as user_phone,
            u.created_at as user_created_at,
            CASE 
                WHEN qe.exam_status = " . EXAM_STATUS_COMPLETED . " AND qr.id IS NOT NULL THEN 'completed'
                WHEN qe.exam_status = " . EXAM_STATUS_COMPLETED . " AND qr.id IS NULL THEN 'processing'
                WHEN qe.exam_status = " . EXAM_STATUS_IN_PROGRESS . " THEN 'draft'
                WHEN qe.exam_status = " . EXAM_STATUS_TIMEOUT . " THEN 'timeout'
                ELSE 'unknown'
            END as display_status
        FROM quiz_exams qe
        LEFT JOIN quiz_results qr ON qe.id = qr.exam_id
        LEFT JOIN users u ON qe.user_id = u.id
        WHERE qe.id = ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$examId]);
    $exam = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$exam) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Không tìm thấy bài thi'));
        exit;
    }
    
    // Format dates
    $exam['created_at_formatted'] = date('d/m/Y H:i:s', strtotime($exam['created_at']));
    $exam['start_time_formatted'] = $exam['start_time'] 
        ? date('d/m/Y H:i:s', strtotime($exam['start_time']))
        : null;
    $exam['end_time_formatted'] = $exam['end_time'] 
        ? date('d/m/Y H:i:s', strtotime($exam['end_time']))
        : null;
    $exam['user_created_at_formatted'] = $exam['user_created_at']
        ? date('d/m/Y H:i:s', strtotime($exam['user_created_at']))
        : null;
        
    // Calculate duration
    if ($exam['start_time'] && $exam['end_time']) {
        $duration = strtotime($exam['end_time']) - strtotime($exam['start_time']);
        $exam['duration_minutes'] = round($duration / 60, 1);
        $exam['duration_seconds'] = $duration;
    }
    
    // Get answer details if exam exists
    if ($exam['id']) {
        $answerSql = "
            SELECT 
                qa.id,
                qa.question_id,
                qa.user_answer,
                qa.answer_time,
                qa.is_changed,
                qa.change_count,
                q.question_text,
                q.holland_code
            FROM quiz_answers qa
            LEFT JOIN questions q ON qa.question_id = q.question_id
            WHERE qa.exam_id = ?
            ORDER BY qa.id ASC
        ";
        
        $answerStmt = $pdo->prepare($answerSql);
        $answerStmt->execute([$examId]);
        $answers = $answerStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $exam['answers'] = $answers;
        $exam['answer_count'] = count($answers);
    }
    
    // Success response
    http_response_code(200);
    echo json_encode(generateSuccessResponse($exam, 'Lấy chi tiết bài thi thành công'));

} catch (Exception $e) {
    error_log("Admin Get Exam Detail API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, $e->getMessage()));
}

?>
