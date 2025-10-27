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
$type = isset($_GET['type']) ? trim($_GET['type']) : null;
$search = isset($_GET['search']) ? trim($_GET['search']) : null;

$offset = ($page - 1) * $limit;

try {
    // Build WHERE conditions - chỉ lấy consultations và career_test (product_type IN ('career_test', 'consultation'))
    $whereConditions = ['pp.user_id = ?', "pp.product_type IN ('career_test', 'consultation')"];
    $params = [$user['id']];
    
    if ($status && in_array($status, ['pending', 'active', 'completed', 'expired', 'cancelled'])) {
        $whereConditions[] = 'pp.status = ?';
        $params[] = $status;
    }
    
    if ($type && in_array($type, ['career_test', 'consultation'])) {
        $whereConditions[] = 'pp.product_type = ?';
        $params[] = $type;
    }
    
    if ($search) {
        $whereConditions[] = '(pp.product_name LIKE ? OR pp.package_name LIKE ? OR pp.access_code LIKE ?)';
        $searchParam = '%' . $search . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    $whereClause = implode(' AND ', $whereConditions);
    
    // Count total consultations
    $countSql = "
        SELECT COUNT(*) as total 
        FROM purchased_packages pp
        LEFT JOIN product_packages pkg ON pp.package_id = pkg.id
        LEFT JOIN products p ON pkg.product_id = p.id
        WHERE {$whereClause}
    ";
    $stmt = $pdo->prepare($countSql);
    $stmt->execute($params);
    $totalConsultations = $stmt->fetch()['total'];
    
    // Get consultations with pagination
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
            p.question_count,
            p.report_pages,
            
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
    $consultations = $stmt->fetchAll();
    
    // Format consultations data
    foreach ($consultations as &$consultation) {
        // Format giá tiền
        $consultation['package_price_formatted'] = number_format($consultation['package_price'], 0, ',', '.') . ' VND';
        
        // Product type labels
        switch($consultation['product_type']) {
            case 'career_test':
                $consultation['product_type_label'] = 'Trắc nghiệm hướng nghiệp';
                $consultation['product_type_icon'] = 'fas fa-clipboard-check';
                $consultation['product_type_color'] = 'info';
                break;
            case 'consultation':
                $consultation['product_type_label'] = 'Tư vấn cá nhân';
                $consultation['product_type_icon'] = 'fas fa-user-tie';
                $consultation['product_type_color'] = 'primary';
                break;
            default:
                $consultation['product_type_label'] = 'Dịch vụ khác';
                $consultation['product_type_icon'] = 'fas fa-question-circle';
                $consultation['product_type_color'] = 'secondary';
        }
        
        // Status labels cho dịch vụ
        switch($consultation['status']) {
            case 'pending':
                $consultation['status_label'] = 'Chờ kích hoạt';
                $consultation['status_color'] = 'warning';
                $consultation['status_icon'] = 'fas fa-clock';
                break;
            case 'active':
                $consultation['status_label'] = 'Hoạt động';
                $consultation['status_color'] = 'success';
                $consultation['status_icon'] = 'fas fa-play-circle';
                break;
            case 'completed':
                $consultation['status_label'] = 'Hoàn thành';
                $consultation['status_color'] = 'info';
                $consultation['status_icon'] = 'fas fa-check-circle';
                break;
            case 'expired':
                $consultation['status_label'] = 'Hết hạn';
                $consultation['status_color'] = 'danger';
                $consultation['status_icon'] = 'fas fa-times-circle';
                break;
            case 'cancelled':
                $consultation['status_label'] = 'Đã hủy';
                $consultation['status_color'] = 'secondary';
                $consultation['status_icon'] = 'fas fa-ban';
                break;
            default:
                $consultation['status_label'] = ucfirst($consultation['status']);
                $consultation['status_color'] = 'secondary';
                $consultation['status_icon'] = 'fas fa-question-circle';
        }
        
        // Support status labels (trạng thái tư vấn)
        switch($consultation['support_status']) {
            case 'none':
                $consultation['support_status_label'] = 'Chưa liên hệ';
                $consultation['support_status_color'] = 'secondary';
                $consultation['support_status_icon'] = 'fas fa-minus-circle';
                break;
            case 'contacted':
                $consultation['support_status_label'] = 'Đã liên hệ';
                $consultation['support_status_color'] = 'info';
                $consultation['support_status_icon'] = 'fas fa-phone';
                break;
            case 'scheduled':
                $consultation['support_status_label'] = 'Đã lên lịch';
                $consultation['support_status_color'] = 'warning';
                $consultation['support_status_icon'] = 'fas fa-calendar-check';
                break;
            case 'in_progress':
                $consultation['support_status_label'] = 'Đang tiến hành';
                $consultation['support_status_color'] = 'success';
                $consultation['support_status_icon'] = 'fas fa-comments';
                break;
            case 'resolved':
                $consultation['support_status_label'] = 'Đã hoàn thành';
                $consultation['support_status_color'] = 'primary';
                $consultation['support_status_icon'] = 'fas fa-check-double';
                break;
            default:
                $consultation['support_status_label'] = ucfirst($consultation['support_status']);
                $consultation['support_status_color'] = 'secondary';
                $consultation['support_status_icon'] = 'fas fa-question-circle';
        }
        
        // Format scheduled_at (thời gian hẹn tư vấn)
        if ($consultation['scheduled_at']) {
            $scheduledDate = new DateTime($consultation['scheduled_at']);
            $consultation['scheduled_at_formatted'] = $scheduledDate->format('d/m/Y H:i');
            $consultation['scheduled_at_display'] = $consultation['scheduled_at_formatted'];
        } else {
            $consultation['scheduled_at_formatted'] = null;
            $consultation['scheduled_at_display'] = 'Chưa lên lịch';
        }
        
        // Format payment completed time
        if ($consultation['payment_completed_at']) {
            $paymentDate = new DateTime($consultation['payment_completed_at']);
            $consultation['payment_completed_formatted'] = $paymentDate->format('d/m/Y H:i');
        } else if ($consultation['order_created_at']) {
            $orderDate = new DateTime($consultation['order_created_at']);
            $consultation['payment_completed_formatted'] = $orderDate->format('d/m/Y H:i');
        } else {
            $consultation['payment_completed_formatted'] = 'N/A';
        }
        
        // Format access times
        if ($consultation['first_accessed_at']) {
            $firstAccess = new DateTime($consultation['first_accessed_at']);
            $consultation['first_accessed_formatted'] = $firstAccess->format('d/m/Y H:i');
        } else {
            $consultation['first_accessed_formatted'] = 'Chưa sử dụng';
        }
        
        if ($consultation['last_accessed_at']) {
            $lastAccess = new DateTime($consultation['last_accessed_at']);
            $consultation['last_accessed_formatted'] = $lastAccess->format('d/m/Y H:i');
        } else {
            $consultation['last_accessed_formatted'] = 'Chưa sử dụng';
        }
        
        // Product category display
        switch($consultation['product_category']) {
            case 'assessment':
                $consultation['category_label'] = 'Đánh giá năng lực';
                break;
            case 'career':
                $consultation['category_label'] = 'Hướng nghiệp';
                break;
            case 'personal':
                $consultation['category_label'] = 'Phát triển cá nhân';
                break;
            case 'academic':
                $consultation['category_label'] = 'Học thuật';
                break;
            default:
                $consultation['category_label'] = $consultation['product_category'] ?: 'Khác';
        }
        
        // Special info for career tests
        if ($consultation['product_type'] === 'career_test') {
            $consultation['additional_info'] = [];
            if ($consultation['question_count']) {
                $consultation['additional_info'][] = $consultation['question_count'] . ' câu hỏi';
            }
            if ($consultation['report_pages']) {
                $consultation['additional_info'][] = $consultation['report_pages'] . ' trang báo cáo';
            }
            $consultation['additional_info_text'] = implode(' • ', $consultation['additional_info']);
        } else {
            $consultation['additional_info_text'] = $consultation['package_group_size'] ?: '';
        }
        
        // Usage status for career test
        if ($consultation['product_type'] === 'career_test') {
            if ($consultation['usage_data']) {
                $usageData = json_decode($consultation['usage_data'], true);
                if (isset($usageData['completed']) && $usageData['completed']) {
                    $consultation['usage_status'] = 'Đã hoàn thành';
                    $consultation['usage_status_color'] = 'success';
                    $consultation['usage_status_icon'] = 'fas fa-check-circle';
                } else {
                    $consultation['usage_status'] = 'Đang thực hiện';
                    $consultation['usage_status_color'] = 'warning';
                    $consultation['usage_status_icon'] = 'fas fa-clock';
                }
            } else {
                $consultation['usage_status'] = 'Chưa bắt đầu';
                $consultation['usage_status_color'] = 'secondary';
                $consultation['usage_status_icon'] = 'fas fa-play';
            }
        } else {
            // For consultation
            $consultation['usage_status'] = $consultation['support_status_label'];
            $consultation['usage_status_color'] = $consultation['support_status_color'];
            $consultation['usage_status_icon'] = $consultation['support_status_icon'];
        }
        
        // Cast to proper types
        $consultation['access_count'] = (int)$consultation['access_count'];
        $consultation['package_price'] = (float)$consultation['package_price'];
        $consultation['current_package_price'] = $consultation['current_package_price'] ? (float)$consultation['current_package_price'] : null;
        $consultation['current_sale_price'] = $consultation['current_sale_price'] ? (float)$consultation['current_sale_price'] : null;
        $consultation['question_count'] = $consultation['question_count'] ? (int)$consultation['question_count'] : null;
        $consultation['report_pages'] = $consultation['report_pages'] ? (int)$consultation['report_pages'] : null;
    }
    
    // Calculate pagination
    $totalPages = ceil($totalConsultations / $limit);
    
    // Get statistics for summary
    $statsSql = "
        SELECT 
            COUNT(*) as total_consultations,
            SUM(CASE WHEN pp.status = 'active' THEN 1 ELSE 0 END) as active_consultations,
            SUM(CASE WHEN pp.status = 'completed' THEN 1 ELSE 0 END) as completed_consultations,
            SUM(CASE WHEN pp.status = 'expired' THEN 1 ELSE 0 END) as expired_consultations,
            SUM(CASE WHEN pp.product_type = 'career_test' THEN 1 ELSE 0 END) as career_tests,
            SUM(CASE WHEN pp.product_type = 'consultation' THEN 1 ELSE 0 END) as consultations
        FROM purchased_packages pp
        WHERE pp.user_id = ? AND pp.product_type IN ('career_test', 'consultation')
    ";
    $stmt = $pdo->prepare($statsSql);
    $stmt->execute([$user['id']]);
    $stats = $stmt->fetch();
    
    $response = [
        'success' => true,
        'data' => [
            'consultations' => $consultations,
            'statistics' => [
                'total_consultations' => (int)$stats['total_consultations'],
                'active_consultations' => (int)$stats['active_consultations'],
                'completed_consultations' => (int)$stats['completed_consultations'],
                'expired_consultations' => (int)$stats['expired_consultations'],
                'career_tests' => (int)$stats['career_tests'],
                'consultations' => (int)$stats['consultations']
            ],
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => (int)$totalConsultations,
                'total_pages' => $totalPages,
                'has_prev' => $page > 1,
                'has_next' => $page < $totalPages,
                'prev_page' => $page > 1 ? $page - 1 : null,
                'next_page' => $page < $totalPages ? $page + 1 : null
            ]
        ],
        'filters' => [
            'status' => $status,
            'type' => $type,
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