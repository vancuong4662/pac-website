<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

try {
    require_once '../../config/db-pdo.php';
    require_once '../../api/auth/middleware.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server configuration error']);
    exit;
}

// Kiểm tra authentication
$user = verifySession();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập để xem giỏ hàng']);
    exit;
}

try {
    // Lấy giỏ hàng của user với thông tin chi tiết từ products và product_packages
    $query = "
        SELECT 
            c.id as cart_id,
            c.quantity,
            c.created_at as added_at,
            p.id as product_id,
            p.name as product_name,
            p.short_description,
            p.type,
            p.category,
            p.duration,
            p.image_url as product_image,
            pp.id as package_id,
            pp.package_name,
            pp.package_description,
            pp.original_price,
            pp.sale_price,
            pp.is_free,
            pp.group_size,
            pp.special_features,
            pp.image_url as package_image,
            CASE 
                WHEN pp.is_free = 1 THEN 0
                WHEN pp.sale_price IS NOT NULL AND pp.sale_price > 0 THEN pp.sale_price
                ELSE pp.original_price
            END as current_price,
            (c.quantity * 
                CASE 
                    WHEN pp.is_free = 1 THEN 0
                    WHEN pp.sale_price IS NOT NULL AND pp.sale_price > 0 THEN pp.sale_price
                    ELSE pp.original_price
                END
            ) as subtotal
        FROM cart c
        JOIN products p ON c.product_id = p.id
        JOIN product_packages pp ON c.package_id = pp.id
        WHERE c.user_id = ? AND p.status = 'active' AND pp.status = 'active'
        ORDER BY c.created_at DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$user['id']]);
    $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Tính tổng tiền và xử lý dữ liệu
    $total = 0;
    $subtotal = 0;
    $itemCount = 0;
    $discount = 0; // Sẽ implement sau
    
    foreach ($cartItems as &$item) {
        // Format prices
        $item['current_price_formatted'] = number_format($item['current_price'], 0, ',', '.') . '₫';
        $item['subtotal_formatted'] = number_format($item['subtotal'], 0, ',', '.') . '₫';
        
        // Format original price if different from current price
        if ($item['original_price'] != $item['current_price']) {
            $item['original_price_formatted'] = number_format($item['original_price'], 0, ',', '.') . '₫';
            $item['has_discount'] = true;
        } else {
            $item['original_price_formatted'] = null;
            $item['has_discount'] = false;
        }
        
        // Add type labels (theo database schema mới)
        switch($item['type']) {
            case 'career_test':
                $item['type_label'] = 'Trắc nghiệm hướng nghiệp';
                break;
            case 'course':
                $item['type_label'] = 'Khóa học';
                break;
            case 'consultation':
                $item['type_label'] = 'Tư vấn chuyên gia';
                break;
            default:
                $item['type_label'] = ucfirst($item['type']);
        }
        
        // Process special features (từ JSON string sang array)
        if ($item['special_features']) {
            $features = json_decode($item['special_features'], true);
            $item['special_features_list'] = is_array($features) ? $features : [];
        } else {
            $item['special_features_list'] = [];
        }
        
        // Set product image URL (fallback nếu không có)
        if (!$item['product_image']) {
            $item['product_image'] = 'assets/img/default-product.jpg';
        }
        
        // Set package image URL (fallback nếu không có)
        if (!$item['package_image']) {
            $item['package_image'] = $item['product_image']; // Dùng ảnh sản phẩm làm fallback
        }
        
        $subtotal += $item['subtotal'];
        $itemCount += $item['quantity'];
    }
    
    $total = $subtotal - $discount;
    
    // Response data
    $response = [
        'success' => true,
        'data' => [
            'items' => $cartItems,
            'summary' => [
                'item_count' => $itemCount,
                'total_items' => count($cartItems),
                'subtotal' => $subtotal,
                'subtotal_formatted' => number_format($subtotal, 0, ',', '.') . '₫',
                'discount' => $discount,
                'discount_formatted' => number_format($discount, 0, ',', '.') . '₫',
                'total_amount' => $total,
                'total_formatted' => number_format($total, 0, ',', '.') . '₫'
            ]
        ],
        'user_id' => $user['id']
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
