<?php
require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../auth/middleware.php';

header('Content-Type: application/json');

try {
    $user_id = authenticate_user();
    
    // Get purchased courses
    $courses_query = "
        SELECT 
            'course' as type,
            pc.id,
            pc.course_code as access_code,
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
    ";
    
    // Get purchased tests
    $tests_query = "
        SELECT 
            'test' as type,
            pt.id,
            pt.test_token as access_code,
            pt.status,
            pt.expires_at,
            pt.created_at,
            p.name as product_name,
            p.description as product_description,
            p.price as product_price,
            o.order_code,
            o.created_at as order_date,
            pt.attempts_left,
            p.package_type
        FROM purchased_tests pt
        JOIN products p ON pt.product_id = p.id
        JOIN orders o ON pt.order_id = o.id
        WHERE pt.user_id = ?
    ";
    
    // Get consultation bookings
    $consultations_query = "
        SELECT 
            'consultation' as type,
            cb.id,
            cb.consultation_code as access_code,
            cb.status,
            cb.scheduled_at as expires_at,
            cb.created_at,
            p.name as product_name,
            p.description as product_description,
            p.price as product_price,
            o.order_code,
            o.created_at as order_date,
            cb.scheduled_at,
            p.package_type,
            e.name as expert_name
        FROM consultation_bookings cb
        JOIN products p ON cb.product_id = p.id
        JOIN orders o ON cb.order_id = o.id
        LEFT JOIN experts e ON cb.expert_id = e.id
        WHERE cb.user_id = ?
    ";
    
    // Execute all queries
    $stmt = $pdo->prepare($courses_query);
    $stmt->execute([$user_id]);
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $pdo->prepare($tests_query);
    $stmt->execute([$user_id]);
    $tests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $stmt = $pdo->prepare($consultations_query);
    $stmt->execute([$user_id]);
    $consultations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Merge all results
    $all_purchases = array_merge($courses, $tests, $consultations);
    
    // Sort by creation date (newest first)
    usort($all_purchases, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });
    
    // Format data
    foreach ($all_purchases as &$item) {
        $item['created_at_formatted'] = date('d/m/Y H:i', strtotime($item['created_at']));
        $item['order_date_formatted'] = date('d/m/Y H:i', strtotime($item['order_date']));
        
        // Type-specific formatting
        switch ($item['type']) {
            case 'course':
                $item['type_display'] = 'Khóa học';
                $item['access_url'] = '/course/' . $item['access_code'];
                break;
                
            case 'test':
                $item['type_display'] = 'Trắc nghiệm';
                $item['access_url'] = '/test/' . $item['access_code'];
                $item['package_display'] = $item['package_type'] === 'basic' ? 'Gói cơ bản' : 'Gói cao cấp';
                break;
                
            case 'consultation':
                $item['type_display'] = 'Tư vấn';
                $item['access_url'] = '/consultation/' . $item['access_code'];
                $item['package_display'] = $item['package_type'] === 'basic' ? 'Gói cơ bản' : 'Gói cao cấp';
                if ($item['scheduled_at']) {
                    $item['scheduled_at_formatted'] = date('d/m/Y H:i', strtotime($item['scheduled_at']));
                }
                break;
        }
        
        // Check availability
        if ($item['expires_at']) {
            $item['expires_at_formatted'] = date('d/m/Y H:i', strtotime($item['expires_at']));
            $item['is_expired'] = strtotime($item['expires_at']) < time();
        } else {
            $item['is_expired'] = false;
        }
        
        $item['is_available'] = ($item['status'] === 'active' && !$item['is_expired']);
        if ($item['type'] === 'test' && isset($item['attempts_left'])) {
            $item['is_available'] = $item['is_available'] && $item['attempts_left'] > 0;
        }
    }
    
    // Group by type for easier frontend handling
    $grouped = [
        'courses' => array_filter($all_purchases, fn($item) => $item['type'] === 'course'),
        'tests' => array_filter($all_purchases, fn($item) => $item['type'] === 'test'),
        'consultations' => array_filter($all_purchases, fn($item) => $item['type'] === 'consultation')
    ];
    
    echo json_encode([
        'success' => true,
        'data' => [
            'all_purchases' => $all_purchases,
            'grouped' => $grouped,
            'summary' => [
                'total_purchases' => count($all_purchases),
                'total_courses' => count($grouped['courses']),
                'total_tests' => count($grouped['tests']),
                'total_consultations' => count($grouped['consultations'])
            ]
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi server: ' . $e->getMessage()
    ]);
}
?>
