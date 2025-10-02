<?php
/**
 * API Lấy các dịch vụ theo loại
 * GET /api/services/by-type.php?type={type}
 * 
 * Parameters:
 * - type: 'course' | 'consultation' | 'career_test' (required)
 * - include_packages: true/false (default: true)
 * - limit: int (optional - giới hạn số lượng kết quả)
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
    $type = isset($_GET['type']) ? trim($_GET['type']) : null;
    $include_packages = isset($_GET['include_packages']) ? filter_var($_GET['include_packages'], FILTER_VALIDATE_BOOLEAN) : true;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
    
    if (!$type) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Vui lòng cung cấp loại dịch vụ (type)'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Validate type
    $allowed_types = ['course', 'consultation', 'career_test'];
    if (!in_array($type, $allowed_types)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Loại dịch vụ không hợp lệ. Chỉ chấp nhận: ' . implode(', ', $allowed_types)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Build query
    $sql = "SELECT 
                p.id, p.name, p.slug, p.type, p.category,
                p.short_description, p.full_description,
                p.duration, p.target_audience, p.learning_outcomes,
                p.curriculum, p.instructor_info, p.teaching_format,
                p.question_count, p.age_range, p.image_url,
                p.status, p.sort_order, p.created_at, p.updated_at
            FROM products p 
            WHERE p.type = :type AND p.status = 'active'
            ORDER BY p.sort_order ASC, p.created_at DESC";
    
    if ($limit && $limit > 0) {
        $sql .= " LIMIT :limit";
    }
    
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':type', $type);
    if ($limit && $limit > 0) {
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    }
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process products
    foreach ($products as &$product) {
        // Parse JSON fields
        if ($product['target_audience']) {
            $product['target_audience'] = json_decode($product['target_audience'], true);
        }
        
        if ($product['curriculum'] && $product['curriculum'] !== '') {
            $decoded = json_decode($product['curriculum'], true);
            $product['curriculum'] = $decoded ? $decoded : $product['curriculum'];
        }
        
        // Get packages if requested
        if ($include_packages) {
            $package_sql = "SELECT 
                                pp.id as package_id, pp.package_name, pp.package_slug,
                                pp.package_description, pp.original_price, pp.sale_price,
                                pp.is_free, pp.group_size, pp.special_features,
                                pp.sort_order as package_sort_order
                            FROM product_packages pp 
                            WHERE pp.product_id = :product_id 
                            ORDER BY pp.sort_order ASC";
            
            $package_stmt = $conn->prepare($package_sql);
            $package_stmt->execute([':product_id' => $product['id']]);
            $packages = $package_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Process packages
            foreach ($packages as &$package) {
                if ($package['special_features']) {
                    $package['special_features'] = json_decode($package['special_features'], true);
                }
                
                // Convert prices to numbers
                $package['original_price'] = (float)$package['original_price'];
                $package['sale_price'] = $package['sale_price'] ? (float)$package['sale_price'] : null;
                $package['is_free'] = (bool)$package['is_free'];
                
                // Calculate final price
                $package['final_price'] = $package['sale_price'] ?: $package['original_price'];
            }
            
            $product['packages'] = $packages;
        }
        
        // Convert numeric fields
        $product['question_count'] = $product['question_count'] ? (int)$product['question_count'] : null;
        $product['sort_order'] = (int)$product['sort_order'];
    }
    
    // Get type description for response
    $type_descriptions = [
        'course' => 'Khóa học',
        'consultation' => 'Dịch vụ tư vấn',
        'career_test' => 'Bài kiểm tra hướng nghiệp'
    ];
    
    $response = [
        'success' => true,
        'data' => $products,
        'total' => count($products),
        'type' => $type,
        'type_name' => $type_descriptions[$type] ?? $type,
        'filters' => [
            'type' => $type,
            'include_packages' => $include_packages,
            'limit' => $limit
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
