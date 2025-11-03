<?php
/**
 * API: Create Exam - Holland Code Quiz System
 * POST /api/quiz/create-exam.php
 * 
 * Tạo bài thi mới và trả về bộ câu hỏi với 3 choices cố định
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(generateErrorResponse(ERROR_METHOD_NOT_ALLOWED));
    exit;
}

// Include required files
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/quiz-config.php';
require_once __DIR__ . '/../../config/error-codes.php';
require_once __DIR__ . '/../../includes/classes/QuizGenerator.php';

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
    error_log("Create Exam API - Initial user_id from session: " . $userId);
    error_log("Create Exam API - Session data: " . print_r($_SESSION, true));
    
    // Parse JSON input
    $jsonInput = file_get_contents('php://input');
    $requestData = json_decode($jsonInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_REQUEST, 'Invalid JSON format'));
        exit;
    }
    
    // Validate input
    $examType = $requestData['exam_type'] ?? 'FREE';
    $forceNew = $requestData['force_new'] ?? false;
    
    // Validate exam type
    if (!in_array($examType, ['FREE', 'PAID'])) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION_FAILED, 'exam_type must be FREE or PAID'));
        exit;
    }
    
    // Optional: Override user_id if provided (for admin/testing)
    if (isset($requestData['user_id']) && !empty($requestData['user_id'])) {
        $providedUserId = intval($requestData['user_id']);
        error_log("Create Exam API - Override user_id requested: " . $providedUserId);
        
        // Check if current user is admin or same user
        if ($_SESSION['role'] === 'admin' || $providedUserId === $userId) {
            $userId = $providedUserId;
            error_log("Create Exam API - user_id overridden to: " . $userId);
        } else {
            http_response_code(403);
            echo json_encode(generateErrorResponse(ERROR_FORBIDDEN, 'Cannot create exam for another user'));
            exit;
        }
    } else {
        error_log("Create Exam API - No user_id override, using session user_id: " . $userId);
    }
    
    // Create QuizGenerator instance
    $quizGenerator = new QuizGenerator();
    
    // Generate exam
    $examData = $quizGenerator->createExam($userId, $examType, $forceNew);
    
    // Success response
    http_response_code(200);
    echo json_encode(generateSuccessResponse($examData, 'Tạo bài thi thành công'));
    
} catch (Exception $e) {
    error_log("Create Exam API Error: " . $e->getMessage());
    
    // Get appropriate HTTP status and error code
    $errorCode = $e->getCode() ?: ERROR_INTERNAL_SERVER;
    $httpStatus = getHttpStatusForError($errorCode);
    
    http_response_code($httpStatus);
    
    // Xử lý các error codes đặc biệt
    if (isFraudError($errorCode)) {
        echo json_encode([
            'status' => 'warning',
            'error_code' => $errorCode,
            'message' => $e->getMessage(),
            'fraud_details' => [
                'type' => 'eligibility_check',
                'description' => $e->getMessage()
            ],
            'actions' => [
                'can_retry' => true,
                'retry_url' => '/api/quiz/create-exam.php'
            ]
        ]);
    } elseif (isUserLimitError($errorCode)) {
        // User limit errors với thông tin chi tiết
        $response = generateErrorResponse($errorCode, $e->getMessage());
        
        // Thêm thông tin cho specific error codes
        if ($errorCode === ERROR_FREE_EXAM_LIMIT_LOCKED) {
            $response['next_allowed_time'] = date('Y-m-d H:i:s', time() + LOCK_DURATION_12H);
        } elseif ($errorCode === ERROR_PAID_EXAM_ONE_LEFT) {
            $response['warning'] = 'Cảnh báo: Đây là lượt thứ 2/3. Vui lòng làm bài cẩn thận.';
        }
        
        echo json_encode($response);
    } else {
        // General error
        echo json_encode(generateErrorResponse($errorCode, $e->getMessage()));
    }
}

?>