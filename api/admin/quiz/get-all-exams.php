<?php
/**
 * Admin API - Get All Quiz Exams
 * Lấy tất cả bài thi quiz của tất cả user (với phân trang và filter)
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
    
    // Get filters from query parameters
    $statusFilter = $_GET['status'] ?? '';
    $typeFilter = $_GET['type'] ?? '';
    $searchTerm = $_GET['search'] ?? '';
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $pdo = getPDOConnection();
    
    // Build SQL query - JOIN with users table to get user info
    $sql = "
        SELECT 
            qe.id,
            qe.exam_code,
            qe.user_id,
            qe.exam_type,
            qe.exam_status,
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
            u.fullname as user_fullname,
            u.email as user_email,
            u.username as user_username,
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
        WHERE 1=1
    ";
    
    $params = [];
    
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
            case 'timeout':
                $sql .= " AND qe.exam_status = " . EXAM_STATUS_TIMEOUT;
                break;
        }
    }
    
    if (!empty($typeFilter)) {
        $sql .= " AND qe.exam_type = ?";
        $params[] = intval($typeFilter);
    }
    
    if (!empty($searchTerm)) {
        $sql .= " AND (qe.exam_code LIKE ? OR u.fullname LIKE ? OR u.email LIKE ? OR u.username LIKE ?)";
        $searchParam = '%' . $searchTerm . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    // Get statistics
    $statsQuery = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN qe.exam_status = " . EXAM_STATUS_COMPLETED . " THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN qe.exam_status = " . EXAM_STATUS_DRAFT . " THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN DATE(qe.created_at) = CURDATE() THEN 1 ELSE 0 END) as today
        FROM quiz_exams qe
        LEFT JOIN users u ON qe.user_id = u.id
        WHERE 1=1
    ";
    
    // Apply same filters to stats query
    $statsParams = [];
    if (!empty($statusFilter)) {
        switch ($statusFilter) {
            case 'completed':
                $statsQuery .= " AND qe.exam_status = " . EXAM_STATUS_COMPLETED;
                break;
            case 'draft':
                $statsQuery .= " AND qe.exam_status = " . EXAM_STATUS_DRAFT;
                break;
            case 'timeout':
                $statsQuery .= " AND qe.exam_status = " . EXAM_STATUS_TIMEOUT;
                break;
        }
    }
    
    if (!empty($typeFilter)) {
        $statsQuery .= " AND qe.exam_type = ?";
        $statsParams[] = intval($typeFilter);
    }
    
    if (!empty($searchTerm)) {
        $statsQuery .= " AND (qe.exam_code LIKE ? OR u.fullname LIKE ? OR u.email LIKE ? OR u.username LIKE ?)";
        $statsParams[] = $searchParam;
        $statsParams[] = $searchParam;
        $statsParams[] = $searchParam;
        $statsParams[] = $searchParam;
    }
    
    // Get statistics
    $statsStmt = $pdo->prepare($statsQuery);
    $statsStmt->execute($statsParams);
    $statistics = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // Get total count for pagination
    $countSql = "SELECT COUNT(*) as total FROM quiz_exams qe LEFT JOIN users u ON qe.user_id = u.id WHERE 1=1";
    $countParams = [];
    
    // Apply same filters to count query
    if (!empty($statusFilter)) {
        switch ($statusFilter) {
            case 'completed':
                $countSql .= " AND qe.exam_status = " . EXAM_STATUS_COMPLETED;
                break;
            case 'draft':
                $countSql .= " AND qe.exam_status = " . EXAM_STATUS_DRAFT;
                break;
            case 'timeout':
                $countSql .= " AND qe.exam_status = " . EXAM_STATUS_TIMEOUT;
                break;
        }
    }
    
    if (!empty($typeFilter)) {
        $countSql .= " AND qe.exam_type = ?";
        $countParams[] = intval($typeFilter);
    }
    
    if (!empty($searchTerm)) {
        $countSql .= " AND (qe.exam_code LIKE ? OR u.fullname LIKE ? OR u.email LIKE ? OR u.username LIKE ?)";
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
        $countParams[] = $searchParam;
    }
    
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
            
        // Calculate duration
        if ($exam['start_time'] && $exam['end_time']) {
            $duration = strtotime($exam['end_time']) - strtotime($exam['start_time']);
            $exam['duration_minutes'] = round($duration / 60, 1);
        } else {
            $exam['duration_minutes'] = null;
        }
        
        // Add progress info
        $exam['progress_percent'] = $progressPercent;
        
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
        'statistics' => $statistics,
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
    error_log("Admin Get All Exams API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, $e->getMessage()));
}

?>
