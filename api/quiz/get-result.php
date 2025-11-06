<?php
/**
 * Get Quiz Result API
 * Lấy kết quả chi tiết của một bài thi với gợi ý nghề nghiệp thông minh
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));

require_once '../../config/db-pdo.php';
require_once '../../config/error-codes.php';
require_once '../../config/quiz-config.php';
require_once 'CareerSuggestionEngine.php'; // Fixed path

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
    
    // Calculate Holland Code từ tendencies để đảm bảo tính chính xác
    $hollandCode = calculateHollandCodeFromTendencies($tendencies);
    
    // Create database adapter for CareerSuggestionEngine
    $dbAdapter = new DatabaseAdapter($pdo);
    $careerEngine = new CareerSuggestionEngine($dbAdapter);
    
    // Generate career suggestions using the sophisticated 4-tier algorithm
    $careerSuggestions = $careerEngine->generateSuggestions($hollandCode);
    
    // Get suggested jobs with detailed information
    $suggestedJobs = formatCareerSuggestions($careerSuggestions, $examData['exam_type']);
    
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
    
    // Build response with enhanced career suggestions
    $result = [
        'exam_code' => $examData['exam_code'],
        'exam_type' => $examData['exam_type'],
        'exam_status' => $examData['exam_status'],
        'total_questions' => intval($examData['total_questions']),
        'answered_questions' => intval($examData['answered_questions']),
        'total_score' => intval($examData['total_score'] ?? 0),
        'holland_code' => $hollandCode, // Use calculated Holland Code
        'primary_group' => $examData['primary_group'],
        'secondary_group' => $examData['secondary_group'],
        'tendencies' => $tendencies,
        'suggested_jobs' => $suggestedJobs,
        'career_analysis' => [
            'algorithm_version' => '4-tier-permutation',
            'total_jobs_analyzed' => count($careerSuggestions),
            'matching_tiers' => getMatchingTiersSummary($careerSuggestions),
            'holland_code_used' => $hollandCode
        ],
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
 * Calculate Holland Code từ tendencies scores
 */
function calculateHollandCodeFromTendencies($tendencies) {
    // Sort tendencies by score (descending) and get top 3
    arsort($tendencies);
    $topThree = array_slice(array_keys($tendencies), 0, 3, true);
    return implode('', $topThree);
}

/**
 * Format career suggestions from CareerSuggestionEngine to API response format
 */
function formatCareerSuggestions($careerSuggestions, $examType = 'FREE') {
    $formattedJobs = [];
    
    foreach ($careerSuggestions as $suggestion) {
        $formattedJobs[] = [
            // Basic job info
            'job_title' => $suggestion['job_title'],
            'job_name' => $suggestion['job_title'], // Alias for compatibility
            'job_name_en' => $suggestion['job_name_en'] ?? null,
            'job_description' => $suggestion['description'] ?? 'Nghề nghiệp phù hợp với tính cách của bạn',
            'description' => $suggestion['description'] ?? 'Nghề nghiệp phù hợp với tính cách của bạn', // Alias
            
            // Compatibility & scoring
            'compatibility_score' => $suggestion['compatibility_score'],
            'matching_tier' => $suggestion['tier'], // 5⭐, 4⭐, 3⭐, 2⭐
            'holland_code_match' => $suggestion['holland_code'],
            'match_type' => $suggestion['match_type'], // exact, permutation, two_char, single_char
            'priority_score' => $suggestion['priority_score'] ?? 0,
            
            // Enhanced fields from database (from jobs table)
            'job_group' => $suggestion['job_group'] ?? null,
            'activities_code' => $suggestion['activities_code'] ?? null,
            'education_level' => $suggestion['education_level'] ?? null,
            
            // Abilities (3-tier system)
            'capacity' => $suggestion['capacity'] ?? null,
            'essential_ability' => $suggestion['essential_ability'] ?? null,
            'supplementary_ability' => $suggestion['supplementary_ability'] ?? null,
            
            // Work environment & style
            'work_environment' => $suggestion['work_environment'] ?? null,
            'work_areas' => $suggestion['work_areas'] ?? null,
            'work_style' => $suggestion['work_style'] ?? null,
            'work_value' => $suggestion['work_value'] ?? null,
            
            // Tasks & specializations
            'main_tasks' => $suggestion['main_tasks'] ?? null,
            'specializations' => $suggestion['specializations'] ?? null,
            
            // Career info
            'average_salary' => $suggestion['salary_range'] ?? 'Liên hệ tư vấn',
            'growth_prospect' => $suggestion['growth_outlook'] ?? 'Tốt',
            'required_skills' => $suggestion['key_skills'] ?? 'Đang cập nhật'
        ];
    }
    
    // For FREE exam, limit to first 10 results
    if ($examType === 'FREE') {
        $formattedJobs = array_slice($formattedJobs, 0, 10);
    }
    
    return $formattedJobs;
}

/**
 * Get summary of matching tiers for analytics
 */
function getMatchingTiersSummary($careerSuggestions) {
    $tierSummary = [
        '5_star' => 0,
        '4_star' => 0,
        '3_star' => 0,
        '2_star' => 0
    ];
    
    foreach ($careerSuggestions as $suggestion) {
        $tier = $suggestion['tier'] ?? '';
        switch ($tier) {
            case '5⭐':
                $tierSummary['5_star']++;
                break;
            case '4⭐':
                $tierSummary['4_star']++;
                break;
            case '3⭐':
                $tierSummary['3_star']++;
                break;
            case '2⭐':
                $tierSummary['2_star']++;
                break;
        }
    }
    
    return $tierSummary;
}

/**
 * Database Adapter for CareerSuggestionEngine
 */
class DatabaseAdapter {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function fetchAll($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function fetch($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function execute($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }
}

/**
 * Calculate similarity between two Holland Codes
 */
function calculateHollandCodeSimilarity($code1, $code2) {
    $chars1 = str_split($code1);
    $chars2 = str_split($code2);
    
    $common = count(array_intersect($chars1, $chars2));
    $total = max(count($chars1), count($chars2));
    
    return $total > 0 ? $common / $total : 0;
}
?>