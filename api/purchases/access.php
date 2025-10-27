<?php
/**
 * API: Truy cập vào một purchased package bằng access_code
 * 
 * Method: GET
 * URL: /api/purchases/access.php?code={access_code}
 * Requires: Đăng nhập và sở hữu package
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Phương thức không được hỗ trợ'
    ]);
    exit;
}

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../auth/middleware.php';

try {
    // Kiểm tra đăng nhập
    $user = getCurrentUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng đăng nhập để truy cập sản phẩm'
        ]);
        exit;
    }

    $user_id = $user['id'];
    $access_code = $_GET['code'] ?? null;

    if (!$access_code) {
        throw new Exception('Thiếu mã truy cập');
    }

    // Tìm purchased package
    $stmt = $pdo->prepare("
        SELECT 
            pp.*,
            o.order_code,
            o.created_at as order_date,
            p.name as current_product_name,
            p.slug as product_slug,
            p.short_description as product_description,
            p.full_description as product_full_description,
            p.image_url as product_image,
            p.duration as product_duration,
            p.target_audience as product_target_audience,
            p.learning_outcomes as product_learning_outcomes,
            p.curriculum as product_curriculum,
            pkg.package_name as current_package_name,
            pkg.package_slug as package_slug,
            pkg.original_price as current_package_price,
            pkg.sale_price as current_sale_price,
            pkg.package_description as package_description,
            pkg.special_features as package_special_features
        FROM purchased_packages pp
        JOIN orders o ON pp.order_id = o.id
        JOIN product_packages pkg ON pp.package_id = pkg.id
        JOIN products p ON pkg.product_id = p.id
        WHERE pp.access_code = ? AND pp.user_id = ?
    ");
    $stmt->execute([$access_code, $user_id]);
    $package = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$package) {
        throw new Exception('Không tìm thấy sản phẩm hoặc bạn không có quyền truy cập');
    }

    // Kiểm tra trạng thái và quyền truy cập
    $is_expired = $package['expires_at'] && strtotime($package['expires_at']) < time();
    $actual_status = $is_expired ? 'expired' : $package['status'];

    if (!in_array($actual_status, ['active', 'completed'])) {
        throw new Exception('Sản phẩm này hiện không thể truy cập. Trạng thái: ' . $actual_status);
    }

    if ($is_expired) {
        throw new Exception('Sản phẩm này đã hết hạn sử dụng');
    }

    // Cập nhật access tracking
    $access_count = (int)$package['access_count'] + 1;
    $first_accessed = $package['first_accessed_at'] ? $package['first_accessed_at'] : date('Y-m-d H:i:s');
    
    $update_stmt = $pdo->prepare("
        UPDATE purchased_packages 
        SET access_count = ?,
            first_accessed_at = COALESCE(first_accessed_at, NOW()),
            last_accessed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
    ");
    $update_stmt->execute([$access_count, $package['id']]);

    // Parse JSON fields
    $package_features = $package['package_features'] ? json_decode($package['package_features'], true) : [];
    $package_metadata = $package['package_metadata'] ? json_decode($package['package_metadata'], true) : [];
    $usage_data = $package['usage_data'] ? json_decode($package['usage_data'], true) : [];

    // Format dates
    $purchased_at = $package['created_at'] ? date('d/m/Y H:i', strtotime($package['created_at'])) : null;
    $expires_at = $package['expires_at'] ? date('d/m/Y H:i', strtotime($package['expires_at'])) : null;
    $last_accessed_at = date('d/m/Y H:i'); // Just accessed now

    // Current price
    $current_price = $package['current_sale_price'] ?: $package['current_package_price'];

    // Prepare response data
    $response_data = [
        'id' => (int)$package['id'],
        'access_code' => $package['access_code'],
        
        // Package info
        'package_name' => $package['package_name'],
        'product_name' => $package['product_name'],
        'product_type' => $package['product_type'],
        'package_price' => (float)$package['package_price'],
        
        // Current product info
        'current_product_name' => $package['current_product_name'],
        'current_package_name' => $package['current_package_name'],
        'current_package_price' => (float)$current_price,
        'product_slug' => $package['product_slug'],
        'package_slug' => $package['package_slug'],
        'product_description' => $package['product_description'],
        'product_full_description' => $package['product_full_description'],
        'package_description' => $package['package_description'],
        'product_image' => $package['product_image'],
        'product_duration' => $package['product_duration'],
        'product_target_audience' => $package['product_target_audience'],
        'product_learning_outcomes' => $package['product_learning_outcomes'],
        'product_curriculum' => $package['product_curriculum'],
        'package_special_features' => $package['package_special_features'],
        
        // Status and access
        'status' => $actual_status,
        'support_status' => $package['support_status'],
        
        // Dates
        'purchased_at' => $purchased_at,
        'expires_at' => $expires_at,
        'last_accessed_at' => $last_accessed_at,
        'scheduled_at' => $package['scheduled_at'] ? date('d/m/Y H:i', strtotime($package['scheduled_at'])) : null,
        
        // Usage tracking
        'access_count' => $access_count,
        'days_until_expiry' => $package['expires_at'] ? max(0, ceil((strtotime($package['expires_at']) - time()) / 86400)) : null,
        
        // Order info
        'order_code' => $package['order_code'],
        
        // Metadata and features
        'package_features' => $package_features,
        'package_metadata' => $package_metadata,
        'usage_data' => $usage_data,
        
        // Notes
        'client_notes' => $package['client_notes'],
        'staff_notes' => $package['staff_notes']
    ];

    // Add specific fields based on product type
    switch ($package['product_type']) {
        case 'career_test':
            $response_data['test_info'] = [
                'question_count' => $package_metadata['question_count'] ?? null,
                'report_pages' => $package_metadata['report_pages'] ?? null,
                'attempts_allowed' => $package_metadata['attempts_allowed'] ?? 1,
                'attempts_used' => count($usage_data['attempts'] ?? []),
                'can_retake' => (count($usage_data['attempts'] ?? []) < ($package_metadata['attempts_allowed'] ?? 1)),
                'last_result' => end($usage_data['attempts'] ?? []) ?: null
            ];
            break;

        case 'course':
            $response_data['course_info'] = [
                'duration' => $package_metadata['duration'] ?? $package['product_duration'],
                'group_size' => $package_metadata['group_size'] ?? null,
                'progress' => $usage_data['progress'] ?? 0,
                'completed_lessons' => $usage_data['completed_lessons'] ?? [],
                'certificates' => $usage_data['certificates'] ?? []
            ];
            break;

        case 'consultation':
            $response_data['consultation_info'] = [
                'session_duration' => $package_metadata['session_duration'] ?? null,
                'sessions_included' => $package_metadata['sessions_included'] ?? 1,
                'sessions_completed' => count($usage_data['sessions'] ?? []),
                'next_session' => $package['scheduled_at'],
                'consultation_notes' => $usage_data['consultation_notes'] ?? []
            ];
            break;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Truy cập thành công',
        'data' => $response_data
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi database: ' . $e->getMessage()
    ]);
}
?>