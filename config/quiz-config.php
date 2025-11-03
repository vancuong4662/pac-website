<?php
/**
 * Quiz Configuration - Holland Code Quiz System
 * Cấu hình cho hệ thống quiz Holland Code
 */

// Quiz types và thông số
define('QUIZ_TYPE_FREE', 0);
define('QUIZ_TYPE_PAID', 1);

// Số câu hỏi cho mỗi loại bài thi
define('QUESTIONS_PER_GROUP_FREE', 5);    // 5 câu/nhóm × 6 nhóm = 30 câu
define('QUESTIONS_PER_GROUP_PAID', 20);   // 20 câu/nhóm × 6 nhóm = 120 câu

// Thời gian làm bài (phút) - DISABLED: Không giới hạn thời gian
define('TIME_LIMIT_FREE', 0);      // Không giới hạn thời gian cho bài miễn phí
define('TIME_LIMIT_PAID', 0);      // Không giới hạn thời gian cho bài có phí

// Exam status - Keep original values for compatibility
define('EXAM_STATUS_IN_PROGRESS', 1);  // Bài thi đang làm (có thể tiếp tục)
define('EXAM_STATUS_COMPLETED', 0);    // Bài thi đã hoàn thành
define('EXAM_STATUS_TIMEOUT', 2);      // Bài thi hết thời gian
define('EXAM_STATUS_CANCELLED', 3);    // Bài thi bị hủy

// Aliases for cleaner code
define('EXAM_STATUS_DRAFT', 1);        // Alias for IN_PROGRESS

// Holland Code groups
define('HOLLAND_GROUPS', ['R', 'I', 'A', 'S', 'E', 'C']);

// Holland Code group labels
define('HOLLAND_LABELS', [
    'R' => 'Realistic - Kỹ thuật/Thực tế',
    'I' => 'Investigative - Nghiên cứu/Điều tra', 
    'A' => 'Artistic - Nghệ thuật/Sáng tạo',
    'S' => 'Social - Xã hội/Giúp đỡ',
    'E' => 'Enterprising - Quản lý/Kinh doanh',
    'C' => 'Conventional - Nghiệp vụ/Tổ chức'
]);

// Fixed choices cho tất cả câu hỏi Holland Code
define('HOLLAND_FIXED_CHOICES', [
    ['value' => 0, 'text' => 'Không đồng ý', 'points' => 0],
    ['value' => 1, 'text' => 'Bình thường', 'points' => 1],
    ['value' => 2, 'text' => 'Đồng ý', 'points' => 2]
]);

// User answer values
define('ANSWER_NOT_ANSWERED', -1);
define('ANSWER_DISAGREE', 0);
define('ANSWER_NEUTRAL', 1);
define('ANSWER_AGREE', 2);

// Fraud detection thresholds
define('FRAUD_SAME_ANSWER_TOLERANCE', 0.95);     // 95% câu trả lời giống nhau
define('FRAUD_MIN_YES_RATIO', 1/6);              // Tối thiểu 1/6 câu phải chọn "Đồng ý"
define('FRAUD_MIN_TIME_PER_QUESTION', 2);        // Tối thiểu 2 giây/câu
define('FRAUD_MAX_FREE_VIOLATIONS', 2);          // Tối đa 2 lần vi phạm free
define('FRAUD_MAX_PAID_VIOLATIONS', 3);          // Tối đa 3 lần vi phạm paid

// Lock durations (seconds)
define('LOCK_DURATION_12H', 12 * 60 * 60);      // 12 giờ
define('LOCK_DURATION_24H', 24 * 60 * 60);      // 24 giờ

// Pagination
define('DEFAULT_PAGE_SIZE', 20);
define('MAX_PAGE_SIZE', 100);

// File upload limits
define('MAX_FILE_SIZE', 5 * 1024 * 1024);       // 5MB

// Rate limiting
define('RATE_LIMIT_REQUESTS_PER_MINUTE', 60);
define('RATE_LIMIT_REQUESTS_PER_HOUR', 1000);

// Cache settings
define('CACHE_QUESTIONS_TTL', 3600);             // 1 hour
define('CACHE_RESULTS_TTL', 24 * 3600);          // 24 hours

// Debug mode
define('QUIZ_DEBUG_MODE', false);
define('QUIZ_LOG_QUERIES', false);

// Paths
define('QUIZ_LOG_PATH', __DIR__ . '/../logs/quiz.log');
define('QUIZ_UPLOAD_PATH', __DIR__ . '/../uploads/quiz/');

?>