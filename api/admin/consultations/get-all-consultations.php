<?php
/**
 * Admin API - Get All Consultation Bookings
 * Lấy tất cả đăng ký tư vấn từ purchased_packages (product_type = 'consultation')
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
            pp.client_notes,
            pp.staff_notes,
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
        WHERE pp.product_type = 'consultation'
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
        $searchParam = "%{$searchTerm}%";
        $sql .= " AND (u.fullname LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.username LIKE ? OR pp.product_name LIKE ?)";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    // Get total count
    $countSql = "SELECT COUNT(*) as total FROM (" . $sql . ") as filtered";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalRecords = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($totalRecords / $limit);
    
    // Get statistics
    $statsQuery = "
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN pp.status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN pp.scheduled_at IS NOT NULL THEN 1 ELSE 0 END) as scheduled
        FROM purchased_packages pp
        LEFT JOIN users u ON pp.user_id = u.id
        WHERE pp.product_type = 'consultation'
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
    
    $statsStmt = $pdo->prepare($statsQuery);
    $statsStmt->execute($statsParams);
    $statistics = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // Add sorting and pagination
    $sql .= " ORDER BY pp.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    // Execute main query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $consultations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format dates for display
    foreach ($consultations as &$consultation) {
        if ($consultation['created_at']) {
            $consultation['created_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['created_at']));
        }
        if ($consultation['updated_at']) {
            $consultation['updated_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['updated_at']));
        }
    }
    
    // Return success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Lấy danh sách đăng ký tư vấn thành công',
        'data' => [
            'consultations' => $consultations,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'total_records' => $totalRecords,
                'limit' => $limit
            ],
            'statistics' => $statistics
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in get-all-consultations.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_DATABASE, 'Lỗi truy vấn cơ sở dữ liệu'));
} catch (Exception $e) {
    error_log("Error in get-all-consultations.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_UNKNOWN, $e->getMessage()));
}
