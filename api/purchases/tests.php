<?php
require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../auth/middleware.php';

header('Content-Type: application/json');

try {
    $user_id = authenticate_user();
    
    $query = "
        SELECT 
            pt.id,
            pt.test_token,
            pt.attempts_left,
            pt.status,
            pt.expires_at,
            pt.created_at,
            p.name as product_name,
            p.description as product_description,
            p.price as product_price,
            p.package_type,
            o.order_code,
            o.created_at as order_date
        FROM purchased_tests pt
        JOIN products p ON pt.product_id = p.id
        JOIN orders o ON pt.order_id = o.id
        WHERE pt.user_id = ?
        ORDER BY pt.created_at DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$user_id]);
    $tests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format dates and add status info
    foreach ($tests as &$test) {
        $test['created_at_formatted'] = date('d/m/Y H:i', strtotime($test['created_at']));
        $test['order_date_formatted'] = date('d/m/Y H:i', strtotime($test['order_date']));
        
        if ($test['expires_at']) {
            $test['expires_at_formatted'] = date('d/m/Y H:i', strtotime($test['expires_at']));
            $test['is_expired'] = strtotime($test['expires_at']) < time();
        } else {
            $test['expires_at_formatted'] = null;
            $test['is_expired'] = false;
        }
        
        $test['is_available'] = (
            $test['status'] === 'active' && 
            !$test['is_expired'] && 
            $test['attempts_left'] > 0
        );
        
        // Add package type display name
        $test['package_display'] = $test['package_type'] === 'basic' ? 'Gói cơ bản' : 'Gói cao cấp';
    }
    
    echo json_encode([
        'success' => true,
        'data' => $tests,
        'total' => count($tests)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi server: ' . $e->getMessage()
    ]);
}
?>
