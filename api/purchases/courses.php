<?php
require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../auth/middleware.php';

header('Content-Type: application/json');

try {
    $user_id = authenticate_user();
    
    $query = "
        SELECT 
            pc.id,
            pc.course_code,
            pc.status,
            pc.expires_at,
            pc.created_at,
            p.name as product_name,
            p.description as product_description,
            p.price as product_price,
            o.order_code,
            o.created_at as order_date
        FROM purchased_courses pc
        JOIN products p ON pc.product_id = p.id
        JOIN orders o ON pc.order_id = o.id
        WHERE pc.user_id = ?
        ORDER BY pc.created_at DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$user_id]);
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format dates and add status info
    foreach ($courses as &$course) {
        $course['created_at_formatted'] = date('d/m/Y H:i', strtotime($course['created_at']));
        $course['order_date_formatted'] = date('d/m/Y H:i', strtotime($course['order_date']));
        
        if ($course['expires_at']) {
            $course['expires_at_formatted'] = date('d/m/Y H:i', strtotime($course['expires_at']));
            $course['is_expired'] = strtotime($course['expires_at']) < time();
        } else {
            $course['expires_at_formatted'] = null;
            $course['is_expired'] = false;
        }
        
        $course['is_available'] = ($course['status'] === 'active' && !$course['is_expired']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $courses,
        'total' => count($courses)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi server: ' . $e->getMessage()
    ]);
}
?>
