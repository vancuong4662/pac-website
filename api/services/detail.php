<?php
/**
 * API Lấy chi tiết một dịch vụ cụ thể
 * GET /api/services/detail.php?slug={slug}
 * GET /api/services/detail.php?id={id}
 * 
 * Parameters:
 * - slug: string (slug của sản phẩm)
 * - id: int (ID của sản phẩm) 
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
    $slug = isset($_GET['slug']) ? trim($_GET['slug']) : null;
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $include_packages = isset($_GET['include_packages']) ? filter_var($_GET['include_packages'], FILTER_VALIDATE_BOOLEAN) : true;
    
    if (!$slug && !$id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Vui lòng cung cấp slug hoặc id của sản phẩm'
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
            WHERE ";
    
    $params = [];
    
    if ($slug) {
        $sql .= "p.slug = :slug";
        $params[':slug'] = $slug;
    } else {
        $sql .= "p.id = :id";
        $params[':id'] = $id;
    }
    
    $sql .= " AND p.status = 'active'";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Không tìm thấy sản phẩm'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
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
        }
        
        $product['packages'] = $packages;
    }
    
    // Convert numeric fields
    $product['question_count'] = $product['question_count'] ? (int)$product['question_count'] : null;
    $product['sort_order'] = (int)$product['sort_order'];
    
    $response = [
        'success' => true,
        'data' => $product
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
