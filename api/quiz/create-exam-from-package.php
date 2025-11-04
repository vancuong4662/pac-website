<?php
/**
 * API: Create Exam from Package - Holland Code Quiz System
 * POST /api/quiz/create-exam-from-package.php
 * 
 * Tạo bài thi từ package_id thay vì hardcode exam_type
 * Tự động xác định số lượng câu hỏi và cấu hình từ package
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
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Include required files
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/quiz-config.php';
require_once __DIR__ . '/../../config/error-codes.php';
require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../../includes/classes/QuizGenerator.php';

// Set timezone
date_default_timezone_set(DEFAULT_TIMEZONE);

try {
    // Start session để lấy user info
    session_start();
    
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'error_code' => 401,
            'message' => 'Bạn cần đăng nhập để làm bài thi',
            'redirect_url' => 'dangnhap'
        ]);
        exit;
    }
    
    $userId = intval($_SESSION['user_id']);
    
    // Parse JSON input
    $jsonInput = file_get_contents('php://input');
    $requestData = json_decode($jsonInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Dữ liệu JSON không hợp lệ'
        ]);
        exit;
    }
    
    // Validate required input
    $packageId = $requestData['package_id'] ?? null;
    $forceNew = $requestData['force_new'] ?? false;
    
    if (!$packageId) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'package_id là bắt buộc'
        ]);
        exit;
    }
    
    // Connect to database using existing config
    require_once __DIR__ . '/../../config/db-pdo.php';
    
    // Use the global $conn from db-pdo.php
    global $conn;
    $pdo = $conn;
    
    // 1. Validate package exists and get configuration
    $packageQuery = "
        SELECT 
            qpd.*,
            pp.status as package_status,
            p.status as product_status
        FROM quiz_package_details qpd
        JOIN product_packages pp ON qpd.package_id = pp.id
        JOIN products p ON qpd.product_id = p.id
        WHERE qpd.package_id = ?
    ";
    
    $stmt = $pdo->prepare($packageQuery);
    $stmt->execute([$packageId]);
    $packageConfig = $stmt->fetch();
    
    if (!$packageConfig) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'error_code' => 404,
            'message' => 'Không tìm thấy gói bài thi này'
        ]);
        exit;
    }
    
    // Check if package and product are active
    if ($packageConfig['package_status'] !== 'active' || $packageConfig['product_status'] !== 'active') {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'error_code' => 400,
            'message' => 'Gói bài thi này hiện không khả dụng'
        ]);
        exit;
    }
    
    // 2. Check for existing incomplete exams
    if (!$forceNew) {
        $existingExamQuery = "
            SELECT id, exam_code, total_questions, answered_questions, start_time
            FROM quiz_exams 
            WHERE user_id = ? AND package_id = ? AND exam_status = ?
            ORDER BY created_at DESC LIMIT 1
        ";
        $stmt = $pdo->prepare($existingExamQuery);
        $stmt->execute([$userId, $packageId, EXAM_STATUS_IN_PROGRESS]);
        $existingExam = $stmt->fetch();
        
        if ($existingExam) {
            http_response_code(409);
            echo json_encode([
                'status' => 'warning',
                'error_code' => 460,
                'message' => 'Bạn đang có bài thi chưa hoàn thành',
                'data' => [
                    'exam_id' => $existingExam['id'],
                    'exam_code' => $existingExam['exam_code'],
                    'total_questions' => $existingExam['total_questions'],
                    'answered_questions' => $existingExam['answered_questions'],
                    'start_time' => $existingExam['start_time'],
                    'package_name' => $packageConfig['package_name']
                ],
                'actions' => [
                    'can_continue' => true,
                    'continue_url' => "/quiz?exam_code={$existingExam['exam_code']}",
                    'can_restart' => true,
                    'restart_instruction' => 'Gửi lại request với force_new: true'
                ]
            ]);
            exit;
        }
    } else {
        // Force new - cancel any existing incomplete exams
        $cancelQuery = "
            UPDATE quiz_exams 
            SET exam_status = ?, updated_at = NOW()
            WHERE user_id = ? AND package_id = ? AND exam_status = ?
        ";
        $stmt = $pdo->prepare($cancelQuery);
        $stmt->execute([EXAM_STATUS_CANCELLED, $userId, $packageId, EXAM_STATUS_IN_PROGRESS]);
    }
    
    // 3. Create new exam using QuizGenerator
    $quizGenerator = new QuizGenerator();
    
    // Map question count to exam type for backward compatibility
    $examType = $packageConfig['question_count'] <= 30 ? 'FREE' : 'PAID';
    
    // Generate exam with custom question count
    $examData = $quizGenerator->createExamFromPackage(
        $userId, 
        $packageId, 
        $packageConfig['product_id'],
        $packageConfig['question_count'],
        $packageConfig['questions_per_group']
    );
    
    // 4. Enhanced response with package info
    $response = [
        'status' => 'success',
        'message' => 'Tạo bài thi thành công',
        'data' => [
            'exam_info' => $examData,
            'package_info' => [
                'package_id' => $packageConfig['package_id'],
                'package_name' => $packageConfig['package_name'],
                'question_count' => $packageConfig['question_count'],
                'time_limit_minutes' => $packageConfig['time_limit_minutes'],
                'report_type' => $packageConfig['report_type'],
                'features' => json_decode($packageConfig['features'], true)
            ],
            'user_access' => [
                'access_type' => 'open_access',
                'attempts_left' => 999, // Unlimited attempts for all users  
                'max_attempts' => $packageConfig['max_attempts']
            ]
        ]
    ];
    
    http_response_code(200);
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Create Exam from Package API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    $errorCode = $e->getCode() ?: 500;
    $httpStatus = $errorCode;
    
    // Map specific error codes to HTTP status
    if ($errorCode >= 400 && $errorCode < 600) {
        $httpStatus = $errorCode;
    } else {
        $httpStatus = 500;
    }
    
    http_response_code($httpStatus);
    echo json_encode([
        'status' => 'error',
        'error_code' => $errorCode,
        'message' => $e->getMessage(),
        'debug' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]
    ]);
}

?>