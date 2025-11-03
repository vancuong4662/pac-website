<?php
/**
 * Get User Exams API
 * Lấy danh sách các bài thi đã làm của user
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
    
    // Get filters from query parameters
    $statusFilter = $_GET['status'] ?? '';
    $typeFilter = $_GET['type'] ?? '';
    $searchTerm = $_GET['search'] ?? '';
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 10);
    $offset = ($page - 1) * $limit;
    
    // Build SQL query
    $sql = "
        SELECT 
            qe.id,
            qe.exam_code,
            qe.exam_type,
            qe.exam_status,
            qe.total_questions,
            qe.answered_questions,
            qe.time_limit,
            qe.created_at,
            qe.start_time,
            qe.end_time,
            qe.updated_at,
            qr.id as result_id,
            qr.total_score,
            qr.holland_code,
            qr.primary_group,
            qr.created_at as result_created_at,
            CASE 
                WHEN qe.exam_status = " . EXAM_STATUS_COMPLETED . " AND qr.id IS NOT NULL THEN 'completed'
                WHEN qe.exam_status = " . EXAM_STATUS_COMPLETED . " AND qr.id IS NULL THEN 'processing'
                WHEN qe.exam_status = " . EXAM_STATUS_IN_PROGRESS . " THEN 'in_progress'
                WHEN qe.exam_status = " . EXAM_STATUS_TIMEOUT . " THEN 'timeout'
                ELSE 'unknown'
            END as display_status
        FROM quiz_exams qe
        LEFT JOIN quiz_results qr ON qe.id = qr.exam_id
        WHERE qe.user_id = ?
    ";
    
    $params = [$userId];
    
    // Apply filters
    if (!empty($statusFilter)) {
        switch ($statusFilter) {
            case 'completed':
                $sql .= " AND qe.exam_status = " . EXAM_STATUS_COMPLETED . " AND qr.id IS NOT NULL";
                break;
            case 'processing':
                $sql .= " AND qe.exam_status = " . EXAM_STATUS_COMPLETED . " AND qr.id IS NULL";
                break;
            case 'draft':
                $sql .= " AND qe.exam_status = " . EXAM_STATUS_DRAFT;
                break;
        }
    }
    
    if (!empty($typeFilter)) {
        $sql .= " AND qe.exam_type = ?";
        $params[] = strtoupper($typeFilter);
    }
    
    if (!empty($searchTerm)) {
        $sql .= " AND qe.exam_code LIKE ?";
        $params[] = '%' . $searchTerm . '%';
    }
    
    // Get total count for pagination
    $countSql = "SELECT COUNT(*) as total FROM quiz_exams qe WHERE qe.user_id = ?";
    $countParams = [$userId];
    
    // Apply same filters to count query
    if (!empty($statusFilter)) {
        switch ($statusFilter) {
            case 'completed':
                $countSql .= " AND qe.exam_status = " . EXAM_STATUS_COMPLETED;
                break;
            case 'processing':
                $countSql .= " AND qe.exam_status = " . EXAM_STATUS_COMPLETED;
                break;
            case 'draft':
                $countSql .= " AND qe.exam_status = " . EXAM_STATUS_DRAFT;
                break;
        }
    }
    
    if (!empty($typeFilter)) {
        $countSql .= " AND qe.exam_type = ?";
        $countParams[] = strtoupper($typeFilter);
    }
    
    if (!empty($searchTerm)) {
        $countSql .= " AND qe.exam_code LIKE ?";
        $countParams[] = '%' . $searchTerm . '%';
    }
    
    $pdo = getPDOConnection();
    
    // Get total count
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($countParams);
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Add ordering to main query
    $sql .= " ORDER BY qe.created_at DESC";
    
    // Add pagination to main query
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    // Execute main query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process exam data
    $processedExams = array_map(function($exam) {
        // Calculate progress percentage
        $progressPercent = $exam['total_questions'] > 0 
            ? round(($exam['answered_questions'] / $exam['total_questions']) * 100, 1)
            : 0;
            
        // Format dates
        $exam['created_at_formatted'] = date('d/m/Y H:i', strtotime($exam['created_at']));
        $exam['start_time_formatted'] = $exam['start_time'] 
            ? date('d/m/Y H:i', strtotime($exam['start_time']))
            : null;
        $exam['end_time_formatted'] = $exam['end_time'] 
            ? date('d/m/Y H:i', strtotime($exam['end_time']))
            : null;
            
        // Calculate duration - only for display, not business logic
        if ($exam['start_time'] && $exam['end_time']) {
            $duration = strtotime($exam['end_time']) - strtotime($exam['start_time']);
            $exam['duration_minutes'] = round($duration / 60, 1);
        } else {
            $exam['duration_minutes'] = null;
        }
        
        // Add progress info
        $exam['progress_percent'] = $progressPercent;
        
        // Add status info
        $exam['status_info'] = getStatusInfo($exam['display_status'], $exam['total_score']);
        
        // Parse Holland codes if available
        if ($exam['holland_code']) {
            $exam['holland_code_parsed'] = str_split($exam['holland_code']);
        }
        
        return $exam;
    }, $exams);
    
    // Calculate pagination info
    $totalPages = ceil($totalCount / $limit);
    $hasNextPage = $page < $totalPages;
    $hasPrevPage = $page > 1;
    
    // Response data
    $responseData = [
        'exams' => $processedExams,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_count' => $totalCount,
            'has_next' => $hasNextPage,
            'has_prev' => $hasPrevPage,
            'limit' => $limit
        ],
        'filters' => [
            'status' => $statusFilter,
            'type' => $typeFilter,
            'search' => $searchTerm
        ]
    ];
    
    // Success response
    http_response_code(200);
    echo json_encode(generateSuccessResponse($responseData, 'Lấy danh sách bài thi thành công'));

} catch (Exception $e) {
    error_log("Get User Exams API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, $e->getMessage()));
}

/**
 * Get status display information
 */
function getStatusInfo($status, $totalScore = null) {
    switch ($status) {
        case 'completed':
            // Quiz completed and has results
            $score = $totalScore ?? 0;
            if ($score > 0) {
                return [
                    'text' => 'Hoàn thành',
                    'class' => 'success',
                    'icon' => 'check-circle'
                ];
            } else {
                return [
                    'text' => 'Hoàn thành - Chưa có điểm',
                    'class' => 'warning', 
                    'icon' => 'exclamation-circle'
                ];
            }
        case 'processing':
            return [
                'text' => 'Đang xử lý kết quả',
                'class' => 'info',
                'icon' => 'clock'
            ];
        case 'draft':
            return [
                'text' => 'Chưa hoàn thành',
                'class' => 'secondary',
                'icon' => 'edit'
            ];
        default:
            return [
                'text' => 'Không xác định',
                'class' => 'secondary',
                'icon' => 'question-circle'
            ];
    }
}

?>