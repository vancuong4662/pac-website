<?php
/**
 * API: Get Questions - Holland Code Quiz System
 * GET /api/quiz/get-questions.php
 * 
 * Lấy danh sách câu hỏi của exam đã tạo
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(generateErrorResponse(ERROR_METHOD_NOT_ALLOWED));
    exit;
}

// Include required files
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/quiz-config.php';
require_once __DIR__ . '/../../config/error-codes.php';
require_once __DIR__ . '/../../config/db-pdo.php';

// Set timezone
date_default_timezone_set(DEFAULT_TIMEZONE);

try {
    // Start session để lấy user info
    session_start();
    
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(generateErrorResponse(ERROR_UNAUTHORIZED));
        exit;
    }
    
    $userId = intval($_SESSION['user_id']);
    
    // Get exam_id từ query parameters
    $examId = $_GET['exam_id'] ?? null;
    
    if (!$examId) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION_FAILED, 'exam_id is required'));
        exit;
    }
    
    $examId = intval($examId);
    
    // Get database connection
    $pdo = getPDOConnection();
    
    // Validate exam ownership và status
    $examSql = "
        SELECT 
            e.id, e.exam_code, e.user_id, e.exam_type, e.exam_status,
            e.total_questions, e.answered_questions, e.start_time, e.time_limit,
            e.created_at
        FROM quiz_exams e
        WHERE e.id = ?
    ";
    
    $stmt = $pdo->prepare($examSql);
    $stmt->execute([$examId]);
    $exam = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$exam) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Exam not found'));
        exit;
    }
    
    // Check ownership (trừ admin)
    if ($exam['user_id'] != $userId && ($_SESSION['role'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(generateErrorResponse(ERROR_FORBIDDEN, 'Access denied'));
        exit;
    }
    
    // Check exam status
    if ($exam['exam_status'] == EXAM_STATUS_COMPLETED) {
        http_response_code(409);
        echo json_encode(generateErrorResponse(ERROR_EXAM_ALREADY_COMPLETED, 'Exam already completed'));
        exit;
    }
    
    if ($exam['exam_status'] == EXAM_STATUS_TIMEOUT) {
        http_response_code(408);
        echo json_encode(generateErrorResponse(ERROR_EXAM_TIMEOUT, 'Exam timed out'));
        exit;
    }
    
    // No time limit checking - simplified quiz system
    $timeRemaining = null;
    $isTimedOut = false;
    
    // Get questions với current answers
    $questionsSql = "
        SELECT 
            qa.question_id,
            qq.question_text,
            qq.holland_code,
            qq.category,
            qa.user_answer,
            qa.answer_time,
            qa.time_spent,
            qa.is_changed
        FROM quiz_answers qa
        JOIN questions qq ON qa.question_id = qq.question_id
        WHERE qa.exam_id = ?
        ORDER BY qa.id
    ";
    
    $stmt = $pdo->prepare($questionsSql);
    $stmt->execute([$examId]);
    $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format questions cho frontend
    $formattedQuestions = [];
    $answeredCount = 0;
    
    foreach ($questions as $index => $question) {
        $isAnswered = $question['user_answer'] != ANSWER_NOT_ANSWERED;
        if ($isAnswered) {
            $answeredCount++;
        }
        
        $formattedQuestions[] = [
            'id' => $question['question_id'],
            'question_number' => $index + 1,
            'question_text' => $question['question_text'],
            'category' => $question['category'] ?? 'personality',
            
            // Fixed choices cho tất cả câu hỏi
            'choices' => HOLLAND_FIXED_CHOICES,
            
            // Current answer
            'current_answer' => $isAnswered ? intval($question['user_answer']) : null,
            'is_answered' => $isAnswered,
            'answer_time' => $question['answer_time'],
            'time_spent' => $question['time_spent'] ? floatval($question['time_spent']) : 0,
            'is_changed' => (bool)$question['is_changed'],
            
            // Debug info (chỉ khi debug mode)
            'holland_code' => QUIZ_DEBUG_MODE ? $question['holland_code'] : null
        ];
    }
    
    // Calculate progress
    $progress = $exam['total_questions'] > 0 ? 
        round(($answeredCount / $exam['total_questions']) * 100, 1) : 0;
    
    // Update answered_questions count
    if ($answeredCount != $exam['answered_questions']) {
        $updateAnswersSql = "UPDATE quiz_exams SET answered_questions = ? WHERE id = ?";
        $updateAnswersStmt = $pdo->prepare($updateAnswersSql);
        $updateAnswersStmt->execute([$answeredCount, $examId]);
    }
    
    // Prepare response
    $examType = $exam['exam_type'] == QUIZ_TYPE_FREE ? 'FREE' : 'PAID';
    
    $responseData = [
        'exam_info' => [
            'exam_id' => $exam['id'],
            'exam_code' => $exam['exam_code'],
            'exam_type' => $examType,
            'exam_status' => $exam['exam_status'],
            'total_questions' => $exam['total_questions'],
            'answered_questions' => $answeredCount,
            'progress' => $progress,
            'start_time' => $exam['start_time'],
            'can_continue' => true
        ],
        
        'questions' => $formattedQuestions,
        
        'instructions' => [
            'title' => 'Holland Code Assessment',
            'description' => 'Vui lòng chọn mức độ đồng ý với mỗi câu hỏi',
            'choices_info' => 'Mỗi câu có 3 lựa chọn: Không đồng ý (0), Bình thường (1), Đồng ý (2)'
        ],
        
        'navigation' => [
            'can_go_back' => true,
            'can_skip' => false,
            'must_answer_all' => true
        ],
        
        'fixed_choices' => HOLLAND_FIXED_CHOICES
    ];
    
    // Add next question info
    $nextUnanswered = null;
    foreach ($formattedQuestions as $q) {
        if (!$q['is_answered']) {
            $nextUnanswered = $q['question_number'];
            break;
        }
    }
    
    if ($nextUnanswered) {
        $responseData['exam_info']['next_question'] = $nextUnanswered;
    }
    
    // Success response
    http_response_code(200);
    echo json_encode(generateSuccessResponse($responseData));
    
} catch (PDOException $e) {
    error_log("Database error in get-questions: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, 'Database error'));
    
} catch (Exception $e) {
    error_log("Get Questions API Error: " . $e->getMessage());
    
    $errorCode = $e->getCode() ?: ERROR_INTERNAL_SERVER;
    $httpStatus = getHttpStatusForError($errorCode);
    
    http_response_code($httpStatus);
    echo json_encode(generateErrorResponse($errorCode, $e->getMessage()));
}

?>