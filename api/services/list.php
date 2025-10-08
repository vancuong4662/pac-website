<?php
/**
 * API Lấy danh sách các dịch vụ (khóa học và tư vấn)
 * GET /api/services/list.php
 * 
 * Parameters:
 * - type: 'course' | 'consultation' | 'career_test' (optional)
 * - category: string (optional) 
 * - status: 'active' | 'inactive' (default: 'active')
 * - include_packages: true/false (default: true)
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
    $type = isset($_GET['type']) ? $_GET['type'] : null;
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : 'active';
    $include_packages = isset($_GET['include_packages']) ? filter_var($_GET['include_packages'], FILTER_VALIDATE_BOOLEAN) : true;
    
    // Build base query
    $sql = "SELECT 
                p.id, p.name, p.slug, p.type, p.category,
                p.short_description, p.full_description,
                p.duration, p.target_audience, p.learning_outcomes,
                p.curriculum, p.instructor_info, p.teaching_format,
                p.question_count, p.age_range, p.image_url,
                p.status, p.sort_order, p.created_at, p.updated_at
            FROM products p 
            WHERE 1=1";
    
    $params = [];
    
    // Apply filters
    if ($type) {
        $sql .= " AND p.type = :type";
        $params[':type'] = $type;
    }
    
    if ($category) {
        $sql .= " AND p.category = :category";
        $params[':category'] = $category;
    }
    
    if ($status) {
        $sql .= " AND p.status = :status";
        $params[':status'] = $status;
    }
    
    $sql .= " ORDER BY p.sort_order ASC, p.created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
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
                                pp.image_url,
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
            }
            
            $product['packages'] = $packages;
        }
        
        // Convert numeric fields
        $product['question_count'] = $product['question_count'] ? (int)$product['question_count'] : null;
        $product['sort_order'] = (int)$product['sort_order'];
    }
    
    $response = [
        'success' => true,
        'data' => $products,
        'total' => count($products),
        'filters' => [
            'type' => $type,
            'category' => $category,
            'status' => $status,
            'include_packages' => $include_packages
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
