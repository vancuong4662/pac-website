<?php
/**
 * API Thống kê dịch vụ
 * GET /api/services/stats.php
 * 
 * Trả về thống kê tổng quan về các dịch vụ
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once '../../config/db-pdo.php';

try {
    $stats = [];
    
    // 1. Tổng số dịch vụ theo loại
    $type_sql = "SELECT 
                    type,
                    COUNT(*) as count,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
                 FROM products 
                 GROUP BY type";
    
    $type_stmt = $conn->query($type_sql);
    $type_stats = $type_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stats['by_type'] = [];
    $total_services = 0;
    $total_active = 0;
    
    $type_names = [
        'course' => 'Khóa học',
        'consultation' => 'Dịch vụ tư vấn', 
        'career_test' => 'Bài kiểm tra hướng nghiệp'
    ];
    
    foreach ($type_stats as $type_stat) {
        $stats['by_type'][] = [
            'type' => $type_stat['type'],
            'type_name' => $type_names[$type_stat['type']] ?? $type_stat['type'],
            'total' => (int)$type_stat['count'],
            'active' => (int)$type_stat['active_count']
        ];
        $total_services += $type_stat['count'];
        $total_active += $type_stat['active_count'];
    }
    
    // 2. Tổng số gói dịch vụ
    $package_sql = "SELECT 
                        COUNT(*) as total_packages,
                        COUNT(CASE WHEN is_free = 1 THEN 1 END) as free_packages,
                        COUNT(CASE WHEN is_free = 0 THEN 1 END) as paid_packages,
                        AVG(CASE WHEN is_free = 0 THEN 
                            COALESCE(sale_price, original_price) 
                        END) as avg_price,
                        MIN(CASE WHEN is_free = 0 THEN 
                            COALESCE(sale_price, original_price) 
                        END) as min_price,
                        MAX(CASE WHEN is_free = 0 THEN 
                            COALESCE(sale_price, original_price) 
                        END) as max_price
                    FROM product_packages pp
                    INNER JOIN products p ON pp.product_id = p.id 
                    WHERE p.status = 'active'";
    
    $package_stmt = $conn->query($package_sql);
    $package_stats = $package_stmt->fetch(PDO::FETCH_ASSOC);
    
    // 3. Gói có giá sale
    $sale_sql = "SELECT COUNT(*) as sale_packages
                 FROM product_packages pp
                 INNER JOIN products p ON pp.product_id = p.id
                 WHERE p.status = 'active' 
                 AND pp.sale_price IS NOT NULL 
                 AND pp.sale_price < pp.original_price";
    
    $sale_stmt = $conn->query($sale_sql);
    $sale_stats = $sale_stmt->fetch(PDO::FETCH_ASSOC);
    
    // 4. Thống kê theo danh mục
    $category_sql = "SELECT 
                        category,
                        COUNT(*) as count
                     FROM products 
                     WHERE status = 'active' 
                     AND category IS NOT NULL
                     GROUP BY category
                     ORDER BY count DESC";
    
    $category_stmt = $conn->query($category_sql);
    $category_stats = $category_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 5. Top 5 dịch vụ có nhiều gói nhất
    $popular_sql = "SELECT 
                        p.id, p.name, p.slug, p.type,
                        COUNT(pp.id) as package_count
                    FROM products p
                    LEFT JOIN product_packages pp ON p.id = pp.product_id
                    WHERE p.status = 'active'
                    GROUP BY p.id, p.name, p.slug, p.type
                    ORDER BY package_count DESC, p.sort_order ASC
                    LIMIT 5";
    
    $popular_stmt = $conn->query($popular_sql);
    $popular_services = $popular_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Build response
    $response = [
        'success' => true,
        'generated_at' => date('Y-m-d H:i:s'),
        'data' => [
            'overview' => [
                'total_services' => $total_services,
                'active_services' => $total_active,
                'inactive_services' => $total_services - $total_active,
                'total_packages' => (int)$package_stats['total_packages'],
                'free_packages' => (int)$package_stats['free_packages'],
                'paid_packages' => (int)$package_stats['paid_packages'],
                'sale_packages' => (int)$sale_stats['sale_packages']
            ],
            'pricing' => [
                'average_price' => $package_stats['avg_price'] ? round((float)$package_stats['avg_price']) : 0,
                'min_price' => $package_stats['min_price'] ? (float)$package_stats['min_price'] : 0,
                'max_price' => $package_stats['max_price'] ? (float)$package_stats['max_price'] : 0
            ],
            'by_type' => $stats['by_type'],
            'by_category' => array_map(function($cat) {
                return [
                    'category' => $cat['category'],
                    'count' => (int)$cat['count']
                ];
            }, $category_stats),
            'popular_services' => array_map(function($service) {
                return [
                    'id' => (int)$service['id'],
                    'name' => $service['name'],
                    'slug' => $service['slug'],
                    'type' => $service['type'],
                    'package_count' => (int)$service['package_count']
                ];
            }, $popular_services)
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
