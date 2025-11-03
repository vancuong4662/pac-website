<?php
/**
 * Get Quiz Result API
 * Lấy kết quả chi tiết của một bài thi
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));

require_once '../../config/db-pdo.php';
require_once '../../config/error-codes.php';
require_once '../../config/quiz-config.php';

try {
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(generateErrorResponse(ERROR_UNAUTHORIZED));
        exit;
    }
    
    $userId = intval($_SESSION['user_id']);
    
    // Get exam_code from query parameter
    $examCode = $_GET['exam_code'] ?? '';
    
    if (empty($examCode)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION_FAILED, 'Exam code is required'));
        exit;
    }
    
    // Get exam and result data
    $sql = "
        SELECT 
            qe.id as exam_id,
            qe.exam_code,
            qe.exam_type,
            qe.exam_status,
            qe.total_questions,
            qe.answered_questions,
            qe.start_time,
            qe.end_time,
            qe.created_at,
            qr.id as result_id,
            qr.total_score,
            qr.holland_code,
            qr.primary_group,
            qr.secondary_group,
            qr.tertiary_group,
            qr.score_r as realistic_score,
            qr.score_i as investigative_score,
            qr.score_a as artistic_score,
            qr.score_s as social_score,
            qr.score_e as enterprising_score,
            qr.score_c as conventional_score,
            qr.created_at as result_created_at,
            qr.calculation_time,
            qr.has_fraud_flags
        FROM quiz_exams qe
        LEFT JOIN quiz_results qr ON qe.id = qr.exam_id
        WHERE qe.exam_code = ? AND qe.user_id = ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$examCode, $userId]);
    $examData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$examData) {
        http_response_code(404);
        echo json_encode(generateErrorResponse(ERROR_NOT_FOUND, 'Exam not found or access denied'));
        exit;
    }
    
    // Check if exam is completed and has results
    if ($examData['exam_status'] != EXAM_STATUS_COMPLETED || !$examData['result_id']) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_REQUEST, 'Exam is not completed or results are not available yet'));
        exit;
    }
    
    // Build tendency scores
    $tendencies = [
        'R' => intval($examData['realistic_score'] ?? 0),
        'I' => intval($examData['investigative_score'] ?? 0),
        'A' => intval($examData['artistic_score'] ?? 0),
        'S' => intval($examData['social_score'] ?? 0),
        'E' => intval($examData['enterprising_score'] ?? 0),
        'C' => intval($examData['conventional_score'] ?? 0)
    ];
    
    // Get suggested jobs based on Holland Code (mock data for now)
    $suggestedJobs = getSuggestedJobs($examData['holland_code'], $examData['exam_type']);
    
    // Format dates
    $createdAt = $examData['created_at'] ? date('d/m/Y H:i', strtotime($examData['created_at'])) : null;
    $resultCreatedAt = $examData['result_created_at'] ? date('d/m/Y H:i', strtotime($examData['result_created_at'])) : null;
    
    // Calculate duration if available
    $duration = null;
    if ($examData['start_time'] && $examData['end_time']) {
        $start = new DateTime($examData['start_time']);
        $end = new DateTime($examData['end_time']);
        $interval = $start->diff($end);
        $duration = $interval->format('%H:%I:%S');
    }
    
    // Build response
    $result = [
        'exam_code' => $examData['exam_code'],
        'exam_type' => $examData['exam_type'],
        'exam_status' => $examData['exam_status'],
        'total_questions' => intval($examData['total_questions']),
        'answered_questions' => intval($examData['answered_questions']),
        'total_score' => intval($examData['total_score'] ?? 0),
        'holland_code' => $examData['holland_code'],
        'primary_group' => $examData['primary_group'],
        'secondary_group' => $examData['secondary_group'],
        'tendencies' => $tendencies,
        'suggested_jobs' => $suggestedJobs,
        'duration' => $duration,
        'created_at' => $examData['created_at'],
        'created_at_formatted' => $createdAt,
        'result_created_at' => $examData['result_created_at'],
        'result_created_at_formatted' => $resultCreatedAt
    ];
    
    echo json_encode(generateSuccessResponse($result, 'Result retrieved successfully'));

} catch (Exception $e) {
    error_log("Get Result API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, 'Database error: ' . $e->getMessage()));
}

/**
 * Get suggested jobs based on Holland Code
 */
function getSuggestedJobs($hollandCode, $examType = 'FREE') {
    // Mock data - in production this should come from database
    $jobsDatabase = [
        'RIA' => [
            [
                'job_title' => 'Kỹ sư Phần mềm',
                'description' => 'Phát triển và bảo trì các ứng dụng phần mềm, kết hợp kỹ thuật với sáng tạo',
                'compatibility_score' => 5,
                'average_salary' => '15-30 triệu',
                'growth_prospect' => 'Rất tốt',
                'required_skills' => 'Lập trình, Tư duy logic, Sáng tạo'
            ],
            [
                'job_title' => 'Nhà Thiết kế UX/UI',
                'description' => 'Thiết kế giao diện người dùng và trải nghiệm người dùng cho các sản phẩm số',
                'compatibility_score' => 4,
                'average_salary' => '12-25 triệu',
                'growth_prospect' => 'Tốt',
                'required_skills' => 'Thiết kế, Nghiên cứu người dùng, Công nghệ'
            ],
            [
                'job_title' => 'Kỹ sư Dữ liệu',
                'description' => 'Xử lý và phân tích dữ liệu lớn để tạo ra thông tin hữu ích',
                'compatibility_score' => 5,
                'average_salary' => '18-35 triệu',
                'growth_prospect' => 'Xuất sắc',
                'required_skills' => 'Toán học, Lập trình, Phân tích dữ liệu'
            ]
        ],
        'RIS' => [
            [
                'job_title' => 'Kỹ sư Y sinh',
                'description' => 'Ứng dụng kỹ thuật vào lĩnh vực y tế và chăm sóc sức khỏe',
                'compatibility_score' => 5,
                'average_salary' => '15-28 triệu',
                'growth_prospect' => 'Tốt',
                'required_skills' => 'Kỹ thuật, Y học, Nghiên cứu'
            ],
            [
                'job_title' => 'Chuyên viên Phân tích Hệ thống',
                'description' => 'Phân tích và thiết kế hệ thống thông tin cho doanh nghiệp',
                'compatibility_score' => 4,
                'average_salary' => '12-22 triệu',
                'growth_prospect' => 'Tốt',
                'required_skills' => 'Phân tích, Công nghệ, Tư vấn'
            ]
        ],
        'SIA' => [
            [
                'job_title' => 'Nhà Tâm lý học',
                'description' => 'Nghiên cứu và tư vấn về tâm lý, hành vi con người',
                'compatibility_score' => 5,
                'average_salary' => '10-20 triệu',
                'growth_prospect' => 'Tốt',
                'required_skills' => 'Tâm lý học, Giao tiếp, Nghiên cứu'
            ],
            [
                'job_title' => 'Giáo viên Nghệ thuật',
                'description' => 'Giảng dạy và hướng dẫn học sinh về các môn nghệ thuật',
                'compatibility_score' => 4,
                'average_salary' => '8-15 triệu',
                'growth_prospect' => 'Ổn định',
                'required_skills' => 'Nghệ thuật, Giảng dạy, Sáng tạo'
            ]
        ],
        // Add more combinations as needed
        'DEFAULT' => [
            [
                'job_title' => 'Chuyên viên Tư vấn Nghề nghiệp',
                'description' => 'Hỗ trợ và tư vấn cho người khác về lựa chọn nghề nghiệp phù hợp',
                'compatibility_score' => 4,
                'average_salary' => '10-18 triệu',
                'growth_prospect' => 'Tốt',
                'required_skills' => 'Tư vấn, Giao tiếp, Tâm lý học'
            ],
            [
                'job_title' => 'Chuyên viên Nhân sự',
                'description' => 'Quản lý và phát triển nguồn nhân lực trong tổ chức',
                'compatibility_score' => 3,
                'average_salary' => '12-20 triệu',
                'growth_prospect' => 'Ổn định',
                'required_skills' => 'Quản lý, Giao tiếp, Tổ chức'
            ]
        ]
    ];
    
    // Get jobs for specific Holland Code or default
    $jobs = $jobsDatabase[$hollandCode] ?? $jobsDatabase['DEFAULT'];
    
    // For FREE exam, return only first 3 jobs
    if ($examType === 'FREE') {
        $jobs = array_slice($jobs, 0, 3);
    }
    
    return $jobs;
}
?>