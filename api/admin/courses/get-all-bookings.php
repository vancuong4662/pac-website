<?php
/**
 * Admin API - Get All Course Bookings
 * Lấy tất cả đăng ký khóa học từ purchased_packages (product_type = 'course')
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));

require_once '../../../config/db-pdo.php';
require_once '../../../config/error-codes.php';

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
    $supportStatusFilter = $_GET['support_status'] ?? '';
    $searchTerm = $_GET['search'] ?? '';
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    $pdo = getPDOConnection();
    
    // Build SQL query - JOIN with users and orders
    $sql = "
        SELECT 
            pp.id,
            pp.user_id,
            pp.order_id,
            pp.package_id,
            pp.access_code,
            pp.package_name,
            pp.product_name,
            pp.package_price,
            pp.status,
            pp.support_status,
            pp.scheduled_at,
            pp.staff_notes,
            pp.client_notes,
            pp.access_count,
            pp.first_accessed_at,
            pp.last_accessed_at,
            pp.created_at,
            pp.updated_at,
            u.fullname as user_fullname,
            u.email as user_email,
            u.phone as user_phone,
            u.username as user_username,
            o.order_code
        FROM purchased_packages pp
        LEFT JOIN users u ON pp.user_id = u.id
        LEFT JOIN orders o ON pp.order_id = o.id
        WHERE pp.product_type = 'course'
    ";
    
    $params = [];
    
    // Apply filters
    if (!empty($statusFilter)) {
        $sql .= " AND pp.status = ?";
        $params[] = $statusFilter;
    }
    
    if (!empty($supportStatusFilter)) {
        $sql .= " AND pp.support_status = ?";
        $params[] = $supportStatusFilter;
    }
    
    if (!empty($searchTerm)) {
        $sql .= " AND (u.fullname LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.username LIKE ? OR pp.product_name LIKE ?)";
        $searchParam = '%' . $searchTerm . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    // Get statistics
    $statsQuery = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN pp.status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN pp.scheduled_at IS NOT NULL THEN 1 ELSE 0 END) as scheduled
        FROM purchased_packages pp
        LEFT JOIN users u ON pp.user_id = u.id
        WHERE pp.product_type = 'course'
    ";
    
    // Apply same filters to stats query
    $statsParams = [];
    if (!empty($statusFilter)) {
        $statsQuery .= " AND pp.status = ?";
        $statsParams[] = $statusFilter;
    }
    
    if (!empty($supportStatusFilter)) {
        $statsQuery .= " AND pp.support_status = ?";
        $statsParams[] = $supportStatusFilter;
    }
    
    if (!empty($searchTerm)) {
        $statsQuery .= " AND (u.fullname LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.username LIKE ? OR pp.product_name LIKE ?)";
        $statsParams[] = $searchParam;
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
    $countSql = "
        SELECT COUNT(*) as total 
        FROM purchased_packages pp 
        LEFT JOIN users u ON pp.user_id = u.id 
        WHERE pp.product_type = 'course'
    ";
    $countParams = [];
    
    // Apply same filters to count query
    if (!empty($statusFilter)) {
        $countSql .= " AND pp.status = ?";
        $countParams[] = $statusFilter;
    }
    
    if (!empty($supportStatusFilter)) {
        $countSql .= " AND pp.support_status = ?";
        $countParams[] = $supportStatusFilter;
    }
    
    if (!empty($searchTerm)) {
        $countSql .= " AND (u.fullname LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.username LIKE ? OR pp.product_name LIKE ?)";
        $countParams[] = $searchParam;
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
    $sql .= " ORDER BY pp.created_at DESC";
    
    // Add pagination to main query
    $sql .= " LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    // Execute main query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process booking data
    $processedBookings = array_map(function($booking) {
        // Format dates
        $booking['created_at_formatted'] = date('d/m/Y H:i', strtotime($booking['created_at']));
        $booking['updated_at_formatted'] = date('d/m/Y H:i', strtotime($booking['updated_at']));
        
        if ($booking['first_accessed_at']) {
            $booking['first_accessed_at_formatted'] = date('d/m/Y H:i', strtotime($booking['first_accessed_at']));
        }
        
        if ($booking['last_accessed_at']) {
            $booking['last_accessed_at_formatted'] = date('d/m/Y H:i', strtotime($booking['last_accessed_at']));
        }
        
        if ($booking['scheduled_at']) {
            $booking['scheduled_at_formatted'] = date('d/m/Y H:i', strtotime($booking['scheduled_at']));
        }
        
        return $booking;
    }, $bookings);
    
    // Calculate pagination info
    $totalPages = ceil($totalCount / $limit);
    $hasNextPage = $page < $totalPages;
    $hasPrevPage = $page > 1;
    
    // Response data
    $responseData = [
        'bookings' => $processedBookings,
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
            'support_status' => $supportStatusFilter,
            'search' => $searchTerm
        ]
    ];
    
    // Success response
    http_response_code(200);
    echo json_encode(generateSuccessResponse($responseData, 'Lấy danh sách đăng ký thành công'));

} catch (Exception $e) {
    error_log("Admin Get All Bookings API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, $e->getMessage()));
}

?>
