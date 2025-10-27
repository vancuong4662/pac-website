<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../config/db-pdo.php';
require_once '../../api/auth/middleware.php';

// Kiểm tra authentication
$user = verifySession();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

// Lấy parameters
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$limit = isset($_GET['limit']) ? min(50, max(5, (int)$_GET['limit'])) : 10;
$status = isset($_GET['status']) ? trim($_GET['status']) : null;
$category = isset($_GET['category']) ? trim($_GET['category']) : null;
$search = isset($_GET['search']) ? trim($_GET['search']) : null;

$offset = ($page - 1) * $limit;

try {
    // Build WHERE conditions - chỉ lấy courses (product_type = 'course')
    $whereConditions = ['pp.user_id = ?', "pp.product_type = 'course'"];
    $params = [$user['id']];
    
    if ($status && in_array($status, ['pending', 'active', 'completed', 'expired', 'cancelled'])) {
        $whereConditions[] = 'pp.status = ?';
        $params[] = $status;
    }
    
    if ($category && in_array($category, ['career', 'skills', 'academic', 'language'])) {
        $whereConditions[] = 'p.category = ?';
        $params[] = $category;
    }
    
    if ($search) {
        $whereConditions[] = '(pp.product_name LIKE ? OR pp.package_name LIKE ? OR pp.access_code LIKE ?)';
        $searchParam = '%' . $search . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Count total courses
    $countSql = "
        SELECT COUNT(*) as total 
        FROM purchased_packages pp
        LEFT JOIN product_packages pkg ON pp.package_id = pkg.id
        LEFT JOIN products p ON pkg.product_id = p.id
        WHERE {$whereClause}
    ";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $totalCourses = $stmt->fetch()['total'];
    
    // Get courses with pagination
    $sql = "
        SELECT 
            pp.id,
            pp.access_code,
            pp.package_name,
            pp.product_name,
            pp.product_type,
            pp.package_price,
            pp.status,
            pp.access_starts_at,
            pp.expires_at,
            pp.first_accessed_at,
            pp.last_accessed_at,
            pp.access_count,
            pp.usage_data,
            pp.client_notes,
            pp.staff_notes,
            pp.support_status,
            pp.scheduled_at,
            pp.created_at,
            pp.updated_at,
            
            -- Thông tin từ order (thời gian thanh toán)
            o.payment_status,
            o.created_at as order_created_at,
            o.updated_at as payment_completed_at,
            
            -- Thông tin product hiện tại
            p.name as current_product_name,
            p.category as product_category,
            p.duration as product_duration,
            p.image_url as product_image,
            
            -- Thông tin package hiện tại
            pkg.original_price as current_package_price,
            pkg.sale_price as current_sale_price,
            pkg.group_size as package_group_size,
            pkg.special_features as package_features
            
        FROM purchased_packages pp
        LEFT JOIN orders o ON pp.order_id = o.id
        LEFT JOIN product_packages pkg ON pp.package_id = pkg.id
        LEFT JOIN products p ON pkg.product_id = p.id
        WHERE {$whereClause}
        ORDER BY pp.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([...$params, $limit, $offset]);
    $courses = $stmt->fetchAll();
    
    // Format courses data
    foreach ($courses as &$course) {
        // Format giá tiền
        $course['package_price_formatted'] = number_format($course['package_price'], 0, ',', '.') . ' VND';
        
        // Status labels cho khóa học
        switch($course['status']) {
            case 'pending':
                $course['status_label'] = 'Chờ kích hoạt';
                $course['status_color'] = 'warning';
                $course['status_icon'] = 'fas fa-clock';
                break;
            case 'active':
                $course['status_label'] = 'Đang học';
                $course['status_color'] = 'success';
                $course['status_icon'] = 'fas fa-play-circle';
                break;
            case 'completed':
                $course['status_label'] = 'Hoàn thành';
                $course['status_color'] = 'info';
                $course['status_icon'] = 'fas fa-check-circle';
                break;
            case 'expired':
                $course['status_label'] = 'Hết hạn';
                $course['status_color'] = 'danger';
                $course['status_icon'] = 'fas fa-times-circle';
                break;
            case 'cancelled':
                $course['status_label'] = 'Đã hủy';
                $course['status_color'] = 'secondary';
                $course['status_icon'] = 'fas fa-ban';
                break;
            default:
                $course['status_label'] = ucfirst($course['status']);
                $course['status_color'] = 'secondary';
                $course['status_icon'] = 'fas fa-question-circle';
        }
        
        // Support status labels (trạng thái lớp học)
        switch($course['support_status']) {
            case 'none':
                $course['support_status_label'] = 'Chưa liên hệ';
                $course['support_status_color'] = 'secondary';
                $course['support_status_icon'] = 'fas fa-minus-circle';
                break;
            case 'contacted':
                $course['support_status_label'] = 'Đã liên hệ';
                $course['support_status_color'] = 'info';
                $course['support_status_icon'] = 'fas fa-phone';
                break;
            case 'scheduled':
                $course['support_status_label'] = 'Đã lên lịch';
                $course['support_status_color'] = 'warning';
                $course['support_status_icon'] = 'fas fa-calendar-check';
                break;
            case 'in_progress':
                $course['support_status_label'] = 'Đang diễn ra';
                $course['support_status_color'] = 'success';
                $course['support_status_icon'] = 'fas fa-chalkboard-teacher';
                break;
            case 'resolved':
                $course['support_status_label'] = 'Đã hoàn thành';
                $course['support_status_color'] = 'primary';
                $course['support_status_icon'] = 'fas fa-graduation-cap';
                break;
            default:
                $course['support_status_label'] = ucfirst($course['support_status']);
                $course['support_status_color'] = 'secondary';
                $course['support_status_icon'] = 'fas fa-question-circle';
        }
        
        // Format scheduled_at (thời gian bắt đầu khóa)
        if ($course['scheduled_at']) {
            $scheduledDate = new DateTime($course['scheduled_at']);
            $course['scheduled_at_formatted'] = $scheduledDate->format('d/m/Y H:i');
            $course['scheduled_at_display'] = $course['scheduled_at_formatted'];
        } else {
            $course['scheduled_at_formatted'] = null;
            $course['scheduled_at_display'] = 'Chưa thiết lập';
        }
        
        // Format payment completed time
        if ($course['payment_completed_at']) {
            $paymentDate = new DateTime($course['payment_completed_at']);
            $course['payment_completed_formatted'] = $paymentDate->format('d/m/Y H:i');
        } else if ($course['order_created_at']) {
            $orderDate = new DateTime($course['order_created_at']);
            $course['payment_completed_formatted'] = $orderDate->format('d/m/Y H:i');
        } else {
            $course['payment_completed_formatted'] = 'N/A';
        }
        
        // Format access times
        if ($course['first_accessed_at']) {
            $firstAccess = new DateTime($course['first_accessed_at']);
            $course['first_accessed_formatted'] = $firstAccess->format('d/m/Y H:i');
        } else {
            $course['first_accessed_formatted'] = 'Chưa truy cập';
        }
        
        if ($course['last_accessed_at']) {
            $lastAccess = new DateTime($course['last_accessed_at']);
            $course['last_accessed_formatted'] = $lastAccess->format('d/m/Y H:i');
        } else {
            $course['last_accessed_formatted'] = 'Chưa truy cập';
        }
        
        // Product category display
        switch($course['product_category']) {
            case 'career':
                $course['category_label'] = 'Hướng nghiệp';
                break;
            case 'skills':
                $course['category_label'] = 'Kỹ năng mềm';
                break;
            case 'academic':
                $course['category_label'] = 'Học thuật';
                break;
            case 'language':
                $course['category_label'] = 'Ngoại ngữ';
                break;
            default:
                $course['category_label'] = $course['product_category'] ?: 'Khác';
        }
        
        // Progress calculation (nếu có usage_data)
        $progress = 0;
        if ($course['usage_data']) {
            $usageData = json_decode($course['usage_data'], true);
            if (isset($usageData['progress'])) {
                $progress = (int)$usageData['progress'];
            }
        }
        $course['progress'] = $progress;
        
        // Cast to proper types
        $course['access_count'] = (int)$course['access_count'];
        $course['package_price'] = (float)$course['package_price'];
        $course['current_package_price'] = $course['current_package_price'] ? (float)$course['current_package_price'] : null;
        $course['current_sale_price'] = $course['current_sale_price'] ? (float)$course['current_sale_price'] : null;
    }
    
    // Calculate pagination
    $totalPages = ceil($totalCourses / $limit);
    
    // Get statistics for summary
    $statsSql = "
        SELECT 
            COUNT(*) as total_courses,
            SUM(CASE WHEN pp.status = 'active' THEN 1 ELSE 0 END) as active_courses,
            SUM(CASE WHEN pp.status = 'completed' THEN 1 ELSE 0 END) as completed_courses,
            SUM(CASE WHEN pp.status = 'expired' THEN 1 ELSE 0 END) as expired_courses
        FROM purchased_packages pp
        WHERE pp.user_id = ? AND pp.product_type = 'course'
    ";
    $stmt = $pdo->prepare($statsSql);
    $stmt->execute([$user['id']]);
    $stats = $stmt->fetch();
    
    $response = [
        'success' => true,
        'data' => [
            'courses' => $courses,
            'statistics' => [
                'total_courses' => (int)$stats['total_courses'],
                'active_courses' => (int)$stats['active_courses'],
                'completed_courses' => (int)$stats['completed_courses'],
                'expired_courses' => (int)$stats['expired_courses']
            ],
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => (int)$totalCourses,
                'total_pages' => $totalPages,
                'has_prev' => $page > 1,
                'has_next' => $page < $totalPages,
                'prev_page' => $page > 1 ? $page - 1 : null,
                'next_page' => $page < $totalPages ? $page + 1 : null
            ]
        ],
        'filters' => [
            'status' => $status,
            'category' => $category,
            'search' => $search,
            'page' => $page,
            'limit' => $limit
        ],
        'user_id' => $user['id']
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>