<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

try {
    require_once '../../config/db.php';
    require_once '../../api/auth/middleware.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server configuration error']);
    exit;
}

// Kiểm tra authentication
$user = checkAuthentication($conn);
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

try {
    // Lấy giỏ hàng của user
    $query = "
        SELECT 
            c.id as cart_id,
            c.quantity,
            c.created_at as added_at,
            p.id as product_id,
            p.name,
            p.description,
            p.price,
            p.type,
            p.package_type,
            p.status,
            (c.quantity * p.price) as subtotal
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ? AND p.status = 'active'
        ORDER BY c.created_at DESC
    ";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("i", $user['id']);
    $result = $stmt->execute();
    if (!$result) {
        throw new Exception("Failed to execute statement: " . $stmt->error);
    }
    
    $queryResult = $stmt->get_result();
    $cartItems = $queryResult->fetch_all(MYSQLI_ASSOC);
    
    // Tính tổng tiền
    $total = 0;
    $itemCount = 0;
    
    foreach ($cartItems as &$item) {
        $item['price_formatted'] = number_format($item['price'], 0, ',', '.') . ' VND';
        $item['subtotal_formatted'] = number_format($item['subtotal'], 0, ',', '.') . ' VND';
        
        // Add type labels
        switch($item['type']) {
            case 'course':
                $item['type_label'] = 'Khóa học';
                break;
            case 'online_test':
                $item['type_label'] = 'Trắc nghiệm online';
                break;
            case 'consultation':
                $item['type_label'] = 'Tư vấn chuyên gia';
                break;
            default:
                $item['type_label'] = $item['type'];
        }
        
        // Add package labels
        if ($item['package_type']) {
            switch($item['package_type']) {
                case 'basic':
                    $item['package_label'] = 'Gói cơ bản';
                    break;
                case 'premium':
                    $item['package_label'] = 'Gói cao cấp';
                    break;
                default:
                    $item['package_label'] = $item['package_type'];
            }
        } else {
            $item['package_label'] = null;
        }
        
        $total += $item['subtotal'];
        $itemCount += $item['quantity'];
    }
    
    // Response data
    $response = [
        'success' => true,
        'data' => [
            'items' => $cartItems,
            'summary' => [
                'item_count' => $itemCount,
                'total_items' => count($cartItems),
                'total_amount' => $total,
                'total_formatted' => number_format($total, 0, ',', '.') . ' VND'
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
