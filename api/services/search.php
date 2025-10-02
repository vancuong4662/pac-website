<?php
/**
 * API Tìm kiếm dịch vụ
 * GET /api/services/search.php?q={keyword}
 * 
 * Parameters:
 * - q (required): Từ khóa tìm kiếm
 * - type: 'course' | 'consultation' | 'career_test' (optional)
 * - limit: int (default: 20)
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
    $query = isset($_GET['q']) ? trim($_GET['q']) : null;
    $type = isset($_GET['type']) ? trim($_GET['type']) : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $include_packages = isset($_GET['include_packages']) ? filter_var($_GET['include_packages'], FILTER_VALIDATE_BOOLEAN) : true;
    
    if (!$query) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Vui lòng cung cấp từ khóa tìm kiếm (q)'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Validate type if provided
    if ($type) {
        $allowed_types = ['course', 'consultation', 'career_test'];
        if (!in_array($type, $allowed_types)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Loại dịch vụ không hợp lệ. Chỉ chấp nhận: ' . implode(', ', $allowed_types)
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    // Build search query
    $sql = "SELECT 
                p.id, p.name, p.slug, p.type, p.category,
                p.short_description, p.full_description,
                p.duration, p.target_audience, p.learning_outcomes,
                p.curriculum, p.instructor_info, p.teaching_format,
                p.question_count, p.age_range, p.image_url,
                p.status, p.sort_order, p.created_at, p.updated_at,
                -- Calculate relevance score
                (
                    CASE WHEN p.name LIKE :exact_query THEN 100
                         WHEN p.name LIKE :start_query THEN 80
                         WHEN p.name LIKE :contain_query THEN 60
                         ELSE 0 END +
                    CASE WHEN p.short_description LIKE :contain_query THEN 30
                         ELSE 0 END +
                    CASE WHEN p.full_description LIKE :contain_query THEN 20
                         ELSE 0 END +
                    CASE WHEN p.target_audience LIKE :contain_query THEN 10
                         ELSE 0 END
                ) as relevance_score
            FROM products p 
            WHERE p.status = 'active' 
            AND (
                p.name LIKE :contain_query 
                OR p.short_description LIKE :contain_query 
                OR p.full_description LIKE :contain_query 
                OR p.target_audience LIKE :contain_query
                OR p.learning_outcomes LIKE :contain_query
                OR p.instructor_info LIKE :contain_query
            )";
    
    $params = [
        ':exact_query' => $query,
        ':start_query' => $query . '%',
        ':contain_query' => '%' . $query . '%'
    ];
    
    // Add type filter if specified
    if ($type) {
        $sql .= " AND p.type = :type";
        $params[':type'] = $type;
    }
    
    $sql .= " ORDER BY relevance_score DESC, p.sort_order ASC";
    
    // Add limit
    if ($limit > 0) {
        $sql .= " LIMIT :limit";
    }
    
    $stmt = $conn->prepare($sql);
    
    // Bind parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    if ($limit > 0) {
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
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
        $product['relevance_score'] = (int)$product['relevance_score'];
    }
    
    $response = [
        'success' => true,
        'data' => $products,
        'total' => count($products),
        'query' => $query,
        'filters' => [
            'type' => $type,
            'limit' => $limit,
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
