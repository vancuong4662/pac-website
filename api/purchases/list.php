<?php
/**
 * API: Lấy danh sách packages đã mua của user
 * 
 * Method: GET
 * Requires: Đăng nhập
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
            'message' => 'Vui lòng đăng nhập để xem sản phẩm đã mua'
        ]);
        exit;
    }

    $user_id = $user['id'];

    // Lấy query parameters
    $product_type = $_GET['type'] ?? null; // 'course', 'career_test', 'consultation'
    $status = $_GET['status'] ?? null; // 'active', 'completed', 'expired', etc.
    $limit = (int)($_GET['limit'] ?? 20);
    $offset = (int)($_GET['offset'] ?? 0);

    // Build WHERE clause
    $where_conditions = ['pp.user_id = ?'];
    $params = [$user_id];

    if ($product_type) {
        $where_conditions[] = 'pp.product_type = ?';
        $params[] = $product_type;
    }

    if ($status) {
        $where_conditions[] = 'pp.status = ?';
        $params[] = $status;
    }

    $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);

    // Lấy purchased packages với thông tin chi tiết
    $stmt = $pdo->prepare("
        SELECT 
            pp.*,
            o.order_code,
            o.created_at as order_date,
            o.total_amount as order_total,
            p.name as current_product_name,
            p.slug as product_slug,
            p.short_description as product_description,
            p.image_url as product_image,
            pkg.package_name as current_package_name,
            pkg.package_slug as package_slug,
            pkg.original_price as current_package_price,
            pkg.sale_price as current_sale_price,
            pkg.package_description as package_description
        FROM purchased_packages pp
        JOIN orders o ON pp.order_id = o.id
        JOIN product_packages pkg ON pp.package_id = pkg.id
        JOIN products p ON pkg.product_id = p.id
        $where_clause
        ORDER BY pp.created_at DESC
        LIMIT ? OFFSET ?
    ");

    $params[] = $limit;
    $params[] = $offset;
    $stmt->execute($params);
    $purchased_packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Lấy tổng số records
    $count_stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM purchased_packages pp
        $where_clause
    ");
    $count_stmt->execute(array_slice($params, 0, -2)); // Remove limit and offset
    $total_count = $count_stmt->fetchColumn();

    // Format data để trả về
    $formatted_packages = [];
    foreach ($purchased_packages as $package) {
        // Parse JSON fields
        $package_features = $package['package_features'] ? json_decode($package['package_features'], true) : [];
        $package_metadata = $package['package_metadata'] ? json_decode($package['package_metadata'], true) : [];
        $usage_data = $package['usage_data'] ? json_decode($package['usage_data'], true) : [];

        // Format dates
        $created_at = $package['created_at'] ? date('d/m/Y H:i', strtotime($package['created_at'])) : null;
        $order_date = $package['order_date'] ? date('d/m/Y H:i', strtotime($package['order_date'])) : null;
        $access_starts_at = $package['access_starts_at'] ? date('d/m/Y H:i', strtotime($package['access_starts_at'])) : null;
        $expires_at = $package['expires_at'] ? date('d/m/Y H:i', strtotime($package['expires_at'])) : null;
        $first_accessed_at = $package['first_accessed_at'] ? date('d/m/Y H:i', strtotime($package['first_accessed_at'])) : null;
        $last_accessed_at = $package['last_accessed_at'] ? date('d/m/Y H:i', strtotime($package['last_accessed_at'])) : null;
        $scheduled_at = $package['scheduled_at'] ? date('d/m/Y H:i', strtotime($package['scheduled_at'])) : null;

        // Determine if expired
        $is_expired = $package['expires_at'] && strtotime($package['expires_at']) < time();
        $actual_status = $is_expired ? 'expired' : $package['status'];

        // Current price (with sale price if available)
        $current_price = $package['current_sale_price'] ?: $package['current_package_price'];

        $formatted_packages[] = [
            'id' => (int)$package['id'],
            'access_code' => $package['access_code'],
            
            // Package info (snapshot at purchase time)
            'package_name' => $package['package_name'],
            'product_name' => $package['product_name'],
            'product_type' => $package['product_type'],
            'package_price' => (float)$package['package_price'],
            
            // Current product info (for updates/links)
            'current_product_name' => $package['current_product_name'],
            'current_package_name' => $package['current_package_name'],
            'current_package_price' => (float)$current_price,
            'product_slug' => $package['product_slug'],
            'package_slug' => $package['package_slug'],
            'product_description' => $package['product_description'],
            'package_description' => $package['package_description'],
            'product_image' => $package['product_image'],
            
            // Status and access
            'status' => $actual_status,
            'support_status' => $package['support_status'],
            
            // Dates
            'purchased_at' => $created_at,
            'order_date' => $order_date,
            'access_starts_at' => $access_starts_at,
            'expires_at' => $expires_at,
            'first_accessed_at' => $first_accessed_at,
            'last_accessed_at' => $last_accessed_at,
            'scheduled_at' => $scheduled_at,
            
            // Usage tracking
            'access_count' => (int)$package['access_count'],
            
            // Order info
            'order_code' => $package['order_code'],
            'order_total' => (float)$package['order_total'],
            
            // Metadata and features
            'package_features' => $package_features,
            'package_metadata' => $package_metadata,
            'usage_data' => $usage_data,
            
            // Notes
            'client_notes' => $package['client_notes'],
            'staff_notes' => $package['staff_notes'],
            
            // Computed fields based on product type
            'can_access' => in_array($actual_status, ['active', 'completed']) && (!$package['expires_at'] || !$is_expired),
            'days_until_expiry' => $package['expires_at'] ? max(0, ceil((strtotime($package['expires_at']) - time()) / 86400)) : null,
            'is_expired' => $is_expired
        ];
    }

    // Group by product type for easy display
    $grouped_packages = [
        'career_test' => [],
        'course' => [],
        'consultation' => []
    ];

    foreach ($formatted_packages as $package) {
        $grouped_packages[$package['product_type']][] = $package;
    }

    // Statistics
    $stats = [
        'total_packages' => $total_count,
        'by_type' => [
            'career_test' => count($grouped_packages['career_test']),
            'course' => count($grouped_packages['course']),
            'consultation' => count($grouped_packages['consultation'])
        ],
        'by_status' => []
    ];

    // Count by status
    foreach ($formatted_packages as $package) {
        $status = $package['status'];
        $stats['by_status'][$status] = ($stats['by_status'][$status] ?? 0) + 1;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'packages' => $formatted_packages,
            'grouped_packages' => $grouped_packages,
            'pagination' => [
                'total' => $total_count,
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $total_count
            ],
            'statistics' => $stats
        ]
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