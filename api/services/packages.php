<?php
/**
 * API Lấy danh sách các gói của một dịch vụ
 * GET /api/services/packages.php?product_slug={slug}
 * GET /api/services/packages.php?product_id={id}
 * 
 * Parameters:
 * - product_slug: string (slug của sản phẩm)
 * - product_id: int (ID của sản phẩm)
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
    $product_slug = isset($_GET['product_slug']) ? trim($_GET['product_slug']) : null;
    $product_id = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;
    
    if (!$product_slug && !$product_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Vui lòng cung cấp product_slug hoặc product_id'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Get product_id if slug provided
    if ($product_slug && !$product_id) {
        $product_sql = "SELECT id, name FROM products WHERE slug = :slug AND status = 'active'";
        $product_stmt = $conn->prepare($product_sql);
        $product_stmt->execute([':slug' => $product_slug]);
        $product = $product_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Không tìm thấy sản phẩm'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $product_id = $product['id'];
        $product_name = $product['name'];
    } else {
        // Verify product exists
        $product_sql = "SELECT id, name FROM products WHERE id = :id AND status = 'active'";
        $product_stmt = $conn->prepare($product_sql);
        $product_stmt->execute([':id' => $product_id]);
        $product = $product_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Không tìm thấy sản phẩm'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $product_name = $product['name'];
    }
    
    // Get packages
    $sql = "SELECT 
                pp.id as package_id, pp.package_name, pp.package_slug,
                pp.package_description, pp.original_price, pp.sale_price,
                pp.is_free, pp.group_size, pp.special_features,
                pp.image_url, pp.sort_order as package_sort_order
            FROM product_packages pp 
            WHERE pp.product_id = :product_id 
            ORDER BY pp.sort_order ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([':product_id' => $product_id]);
    $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Process packages
    foreach ($packages as &$package) {
        if ($package['special_features']) {
            $package['special_features'] = json_decode($package['special_features'], true);
        }
        
        // Convert prices to numbers
        $package['original_price'] = (float)$package['original_price'];
        $package['sale_price'] = $package['sale_price'] ? (float)$package['sale_price'] : null;
        $package['is_free'] = (bool)$package['is_free'];
        
        // Calculate discount if applicable
        if ($package['sale_price'] && $package['original_price'] > 0) {
            $package['discount_percent'] = round((($package['original_price'] - $package['sale_price']) / $package['original_price']) * 100);
            $package['final_price'] = $package['sale_price'];
        } else {
            $package['discount_percent'] = 0;
            $package['final_price'] = $package['original_price'];
        }
    }
    
    $response = [
        'success' => true,
        'data' => [
            'product_id' => $product_id,
            'product_name' => $product_name,
            'packages' => $packages,
            'total_packages' => count($packages)
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
