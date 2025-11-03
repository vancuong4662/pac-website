<?php
/**
 * Error Codes - Holland Code Quiz System
 * Mapping error codes từ NodeJS version sang PHP
 */

// Success codes
define('SUCCESS_EXAM_CREATED', 200);
define('SUCCESS_ANSWER_SAVED', 200);
define('SUCCESS_EXAM_COMPLETED', 200);

// General error codes
define('ERROR_INVALID_REQUEST', 400);
define('ERROR_UNAUTHORIZED', 401);
define('ERROR_FORBIDDEN', 403);
define('ERROR_NOT_FOUND', 404);
define('ERROR_METHOD_NOT_ALLOWED', 405);
define('ERROR_VALIDATION_FAILED', 422);
define('ERROR_INTERNAL_SERVER', 500);
define('ERROR_SERVICE_UNAVAILABLE', 503);

// Quiz-specific error codes (mapping từ NodeJS)
define('ERROR_EXAM_ALREADY_COMPLETED', 460);
define('ERROR_EXAM_TIMEOUT', 461);
define('ERROR_INCOMPLETE_ANSWERS', 462);
define('ERROR_INVALID_ANSWERS_RETRY', 463);
define('ERROR_FREE_EXAM_LIMIT_LOCKED', 464);
define('ERROR_PAID_EXAM_ONE_LEFT', 465);
define('ERROR_PAID_EXAM_REVOKED', 466);
define('ERROR_INSUFFICIENT_BASIS', 467);

// Fraud detection codes
define('ERROR_FRAUD_SAME_ANSWERS', 463);
define('ERROR_FRAUD_INSUFFICIENT_YES', 467);
define('ERROR_FRAUD_TIME_TOO_FAST', 463);
define('ERROR_FRAUD_SUSPICIOUS_PATTERN', 463);

// User limit codes
define('ERROR_USER_LOCKED_12H', 464);
define('ERROR_USER_LOCKED_24H', 464);
define('ERROR_USER_ACCESS_REVOKED', 466);
define('ERROR_USER_PERMANENTLY_LOCKED', 466);

/**
 * Error messages mapping
 */
function getErrorMessage($errorCode, $language = 'vi') {
    $messages = [
        'vi' => [
            // Success messages
            SUCCESS_EXAM_CREATED => 'Tạo bài thi thành công',
            SUCCESS_ANSWER_SAVED => 'Lưu câu trả lời thành công',
            SUCCESS_EXAM_COMPLETED => 'Hoàn thành bài thi thành công',
            
            // General errors
            ERROR_INVALID_REQUEST => 'Yêu cầu không hợp lệ',
            ERROR_UNAUTHORIZED => 'Chưa đăng nhập',
            ERROR_FORBIDDEN => 'Không có quyền truy cập',
            ERROR_NOT_FOUND => 'Không tìm thấy dữ liệu',
            ERROR_METHOD_NOT_ALLOWED => 'Phương thức không được phép',
            ERROR_VALIDATION_FAILED => 'Dữ liệu không hợp lệ',
            ERROR_INTERNAL_SERVER => 'Lỗi hệ thống',
            ERROR_SERVICE_UNAVAILABLE => 'Dịch vụ tạm thời không khả dụng',
            
            // Quiz specific errors
            ERROR_EXAM_ALREADY_COMPLETED => 'Bài kiểm tra đã kết thúc',
            ERROR_EXAM_TIMEOUT => 'Hết thời gian làm bài',
            ERROR_INCOMPLETE_ANSWERS => 'Còn câu chưa trả lời',
            ERROR_INVALID_ANSWERS_RETRY => 'Câu trả lời chưa hợp lệ, làm lại',
            ERROR_FREE_EXAM_LIMIT_LOCKED => 'Hết lượt làm bài miễn phí (khóa 12h)',
            ERROR_PAID_EXAM_ONE_LEFT => 'Còn 1 lượt bài có phí',
            ERROR_PAID_EXAM_REVOKED => 'Hết lượt bài có phí (thu hồi quyền)',
            ERROR_INSUFFICIENT_BASIS => 'Trả lời chưa đủ cơ sở đánh giá',
            
            // Fraud detection
            ERROR_FRAUD_SAME_ANSWERS => 'Tất cả câu trả lời giống nhau. Vui lòng làm lại.',
            ERROR_FRAUD_INSUFFICIENT_YES => 'Cần chọn "Đồng ý" cho ít nhất một số câu hỏi.',
            ERROR_FRAUD_TIME_TOO_FAST => 'Thời gian làm bài quá nhanh. Vui lòng đọc kỹ câu hỏi.',
            ERROR_FRAUD_SUSPICIOUS_PATTERN => 'Phát hiện hành vi bất thường. Vui lòng làm lại.',
            
            // User limits
            ERROR_USER_LOCKED_12H => 'Tài khoản bị khóa 12 giờ do vi phạm',
            ERROR_USER_LOCKED_24H => 'Tài khoản bị khóa 24 giờ do vi phạm',
            ERROR_USER_ACCESS_REVOKED => 'Quyền truy cập đã bị thu hồi',
            ERROR_USER_PERMANENTLY_LOCKED => 'Tài khoản bị khóa vĩnh viễn'
        ],
        
        'en' => [
            // Success messages
            SUCCESS_EXAM_CREATED => 'Exam created successfully',
            SUCCESS_ANSWER_SAVED => 'Answer saved successfully',
            SUCCESS_EXAM_COMPLETED => 'Exam completed successfully',
            
            // General errors
            ERROR_INVALID_REQUEST => 'Invalid request',
            ERROR_UNAUTHORIZED => 'Unauthorized',
            ERROR_FORBIDDEN => 'Forbidden',
            ERROR_NOT_FOUND => 'Not found',
            ERROR_METHOD_NOT_ALLOWED => 'Method not allowed',
            ERROR_VALIDATION_FAILED => 'Validation failed',
            ERROR_INTERNAL_SERVER => 'Internal server error',
            ERROR_SERVICE_UNAVAILABLE => 'Service unavailable',
            
            // Quiz specific errors
            ERROR_EXAM_ALREADY_COMPLETED => 'Exam already completed',
            ERROR_EXAM_TIMEOUT => 'Exam timeout',
            ERROR_INCOMPLETE_ANSWERS => 'Incomplete answers',
            ERROR_INVALID_ANSWERS_RETRY => 'Invalid answers, please retry',
            ERROR_FREE_EXAM_LIMIT_LOCKED => 'Free exam limit reached (locked 12h)',
            ERROR_PAID_EXAM_ONE_LEFT => 'One paid exam remaining',
            ERROR_PAID_EXAM_REVOKED => 'Paid exam access revoked',
            ERROR_INSUFFICIENT_BASIS => 'Insufficient basis for evaluation',
            
            // Fraud detection
            ERROR_FRAUD_SAME_ANSWERS => 'All answers are the same. Please retry.',
            ERROR_FRAUD_INSUFFICIENT_YES => 'Please select "Agree" for at least some questions.',
            ERROR_FRAUD_TIME_TOO_FAST => 'Too fast completion. Please read questions carefully.',
            ERROR_FRAUD_SUSPICIOUS_PATTERN => 'Suspicious pattern detected. Please retry.',
            
            // User limits
            ERROR_USER_LOCKED_12H => 'Account locked for 12 hours due to violations',
            ERROR_USER_LOCKED_24H => 'Account locked for 24 hours due to violations',
            ERROR_USER_ACCESS_REVOKED => 'Access has been revoked',
            ERROR_USER_PERMANENTLY_LOCKED => 'Account permanently locked'
        ]
    ];
    
    return $messages[$language][$errorCode] ?? 'Unknown error';
}

/**
 * Generate error response array
 */
function generateErrorResponse($errorCode, $details = null, $language = 'vi') {
    $response = [
        'status' => 'error',
        'error_code' => $errorCode,
        'message' => getErrorMessage($errorCode, $language)
    ];
    
    if ($details !== null) {
        $response['details'] = $details;
    }
    
    return $response;
}

/**
 * Generate success response array
 */
function generateSuccessResponse($data, $message = null, $successCode = 200) {
    $response = [
        'status' => 'success',
        'data' => $data
    ];
    
    if ($message !== null) {
        $response['message'] = $message;
    }
    
    if ($successCode !== 200) {
        $response['code'] = $successCode;
    }
    
    return $response;
}

/**
 * Check if error code is fraud-related
 */
function isFraudError($errorCode) {
    return in_array($errorCode, [
        ERROR_FRAUD_SAME_ANSWERS,
        ERROR_FRAUD_INSUFFICIENT_YES,
        ERROR_FRAUD_TIME_TOO_FAST,
        ERROR_FRAUD_SUSPICIOUS_PATTERN,
        ERROR_INVALID_ANSWERS_RETRY
    ]);
}

/**
 * Check if error code is user limit-related
 */
function isUserLimitError($errorCode) {
    return in_array($errorCode, [
        ERROR_FREE_EXAM_LIMIT_LOCKED,
        ERROR_PAID_EXAM_ONE_LEFT,
        ERROR_PAID_EXAM_REVOKED,
        ERROR_USER_LOCKED_12H,
        ERROR_USER_LOCKED_24H,
        ERROR_USER_ACCESS_REVOKED,
        ERROR_USER_PERMANENTLY_LOCKED
    ]);
}

/**
 * Get HTTP status code for error code
 */
function getHttpStatusForError($errorCode) {
    $httpMapping = [
        // Success
        SUCCESS_EXAM_CREATED => 200,
        SUCCESS_ANSWER_SAVED => 200,
        SUCCESS_EXAM_COMPLETED => 200,
        
        // Client errors
        ERROR_INVALID_REQUEST => 400,
        ERROR_UNAUTHORIZED => 401,
        ERROR_FORBIDDEN => 403,
        ERROR_NOT_FOUND => 404,
        ERROR_METHOD_NOT_ALLOWED => 405,
        ERROR_VALIDATION_FAILED => 422,
        ERROR_EXAM_TIMEOUT => 408,
        
        // Quiz specific (mostly 4xx)
        ERROR_EXAM_ALREADY_COMPLETED => 409,
        ERROR_INCOMPLETE_ANSWERS => 400,
        ERROR_INVALID_ANSWERS_RETRY => 400,
        ERROR_FREE_EXAM_LIMIT_LOCKED => 429,
        ERROR_PAID_EXAM_ONE_LEFT => 402,
        ERROR_PAID_EXAM_REVOKED => 403,
        ERROR_INSUFFICIENT_BASIS => 400,
        
        // Fraud detection (400 series)
        ERROR_FRAUD_SAME_ANSWERS => 400,
        ERROR_FRAUD_INSUFFICIENT_YES => 400,
        ERROR_FRAUD_TIME_TOO_FAST => 400,
        ERROR_FRAUD_SUSPICIOUS_PATTERN => 400,
        
        // User limits (4xx)
        ERROR_USER_LOCKED_12H => 423,
        ERROR_USER_LOCKED_24H => 423,
        ERROR_USER_ACCESS_REVOKED => 403,
        ERROR_USER_PERMANENTLY_LOCKED => 403,
        
        // Server errors
        ERROR_INTERNAL_SERVER => 500,
        ERROR_SERVICE_UNAVAILABLE => 503
    ];
    
    return $httpMapping[$errorCode] ?? 500;
}

?>