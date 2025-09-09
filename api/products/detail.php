<?php
/**
 * API: Lấy chi tiết sản phẩm
 * Method: GET
 * Endpoint: /api/products/detail.php?id={product_id}
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../../config/db-pdo.php';

try {
    // Lấy product ID từ URL
    $product_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($product_id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Product ID is required and must be a positive number'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Truy vấn chi tiết sản phẩm
    $sql = "SELECT * FROM products WHERE id = ? AND status = 'active'";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$product_id]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Product not found or inactive'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Format dữ liệu
    $product['price'] = (float)$product['price'];
    $product['price_formatted'] = number_format($product['price'], 0, ',', '.') . ' VND';
    
    // Thêm thông tin bổ sung dựa trên type
    switch ($product['type']) {
        case 'course':
            $product['type_label'] = 'Khóa học';
            $product['features'] = [
                'Học online hoặc offline',
                'Tài liệu đầy đủ',
                'Hỗ trợ trong quá trình học',
                'Chứng chỉ hoàn thành'
            ];
            break;
            
        case 'online_test':
            $product['type_label'] = 'Trắc nghiệm online';
            $product['features'] = [
                'Làm bài online 24/7',
                'Kết quả ngay lập tức',
                'Báo cáo chi tiết',
                'Phân tích năng lực'
            ];
            if ($product['package_type'] === 'premium') {
                $product['features'][] = 'Video giải thích chi tiết';
                $product['features'][] = 'Tư vấn kết quả qua email';
            }
            break;
            
        case 'consultation':
            $product['type_label'] = 'Tư vấn';
            $product['features'] = [
                'Tư vấn 1-1 với chuyên gia',
                'Linh hoạt thời gian',
                'Tài liệu hỗ trợ',
                'Follow-up sau tư vấn'
            ];
            if ($product['package_type'] === 'premium') {
                $product['features'][] = 'Nhiều buổi tư vấn';
                $product['features'][] = 'Kế hoạch phát triển cá nhân';
            }
            break;
    }

    // Package type label
    if ($product['package_type']) {
        $product['package_label'] = $product['package_type'] === 'basic' ? 'Gói cơ bản' : 'Gói nâng cao';
    }

    // Lấy các sản phẩm liên quan (cùng type, khác ID)
    $relatedSql = "SELECT id, name, price, type, package_type FROM products 
                   WHERE type = ? AND id != ? AND status = 'active' 
                   ORDER BY created_at DESC LIMIT 4";
    $relatedStmt = $conn->prepare($relatedSql);
    $relatedStmt->execute([$product['type'], $product_id]);
    $relatedProducts = $relatedStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format related products
    foreach ($relatedProducts as &$related) {
        $related['price'] = (float)$related['price'];
        $related['price_formatted'] = number_format($related['price'], 0, ',', '.') . ' VND';
    }

    // Trả về kết quả
    $response = [
        'success' => true,
        'data' => [
            'product' => $product,
            'related_products' => $relatedProducts
        ]
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
