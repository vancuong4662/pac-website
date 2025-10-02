<?php
/**
 * API Lấy chi tiết một gói dịch vụ cụ thể
 * GET /api/services/package-detail.php?package_slug={slug}
 * GET /api/services/package-detail.php?package_id={id}
 * 
 * Parameters:
 * - package_slug: string (slug của gói)
 * - package_id: int (ID của gói)
 * - include_product: true/false (default: true) - có bao gồm thông tin sản phẩm không
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
    // Lấy parameters
    $package_slug = isset($_GET['package_slug']) ? trim($_GET['package_slug']) : null;
    $package_id = isset($_GET['package_id']) ? (int)$_GET['package_id'] : null;
    $include_product = isset($_GET['include_product']) ? filter_var($_GET['include_product'], FILTER_VALIDATE_BOOLEAN) : true;
    
    if (!$package_slug && !$package_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Vui lòng cung cấp package_slug hoặc package_id'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Build query with product join if needed
    $sql = "SELECT 
                pp.id as package_id, pp.package_name, pp.package_slug,
                pp.package_description, pp.original_price, pp.sale_price,
                pp.is_free, pp.group_size, pp.special_features,
                pp.sort_order as package_sort_order, pp.product_id";
    
    if ($include_product) {
        $sql .= ", p.id as product_id, p.name as product_name, p.slug as product_slug,
                  p.type, p.category, p.short_description, p.full_description,
                  p.duration, p.target_audience, p.learning_outcomes,
                  p.curriculum, p.instructor_info, p.teaching_format,
                  p.question_count, p.age_range, p.image_url";
        $sql .= " FROM product_packages pp 
                  LEFT JOIN products p ON pp.product_id = p.id";
    } else {
        $sql .= " FROM product_packages pp";
    }
    
    $sql .= " WHERE ";
    $params = [];
    
    if ($package_slug) {
        $sql .= "pp.package_slug = :package_slug";
        $params[':package_slug'] = $package_slug;
    } else {
        $sql .= "pp.id = :package_id";
        $params[':package_id'] = $package_id;
    }
    
    if ($include_product) {
        $sql .= " AND p.status = 'active'";
    }
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Không tìm thấy gói dịch vụ'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Process package data
    $package = [
        'package_id' => (int)$result['package_id'],
        'package_name' => $result['package_name'],
        'package_slug' => $result['package_slug'],
        'package_description' => $result['package_description'],
        'original_price' => (float)$result['original_price'],
        'sale_price' => $result['sale_price'] ? (float)$result['sale_price'] : null,
        'is_free' => (bool)$result['is_free'],
        'group_size' => $result['group_size'],
        'special_features' => $result['special_features'] ? json_decode($result['special_features'], true) : null,
        'package_sort_order' => (int)$result['package_sort_order'],
        'product_id' => (int)$result['product_id']
    ];
    
    // Calculate pricing information
    if ($package['sale_price'] && $package['original_price'] > 0) {
        $package['discount_percent'] = round((($package['original_price'] - $package['sale_price']) / $package['original_price']) * 100);
        $package['final_price'] = $package['sale_price'];
        $package['savings'] = $package['original_price'] - $package['sale_price'];
    } else {
        $package['discount_percent'] = 0;
        $package['final_price'] = $package['original_price'];
        $package['savings'] = 0;
    }
    
    // Add product information if requested
    if ($include_product && isset($result['product_name'])) {
        $product = [
            'id' => (int)$result['product_id'],
            'name' => $result['product_name'],
            'slug' => $result['product_slug'],
            'type' => $result['type'],
            'category' => $result['category'],
            'short_description' => $result['short_description'],
            'full_description' => $result['full_description'],
            'duration' => $result['duration'],
            'target_audience' => $result['target_audience'] ? json_decode($result['target_audience'], true) : null,
            'learning_outcomes' => $result['learning_outcomes'],
            'curriculum' => $result['curriculum'] ? json_decode($result['curriculum'], true) : $result['curriculum'],
            'instructor_info' => $result['instructor_info'],
            'teaching_format' => $result['teaching_format'],
            'question_count' => $result['question_count'] ? (int)$result['question_count'] : null,
            'age_range' => $result['age_range'],
            'image_url' => $result['image_url']
        ];
        
        $response = [
            'success' => true,
            'data' => [
                'package' => $package,
                'product' => $product
            ]
        ];
    } else {
        $response = [
            'success' => true,
            'data' => $package
        ];
    }
    
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
