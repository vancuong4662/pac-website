<?php
require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../auth/middleware.php';

header('Content-Type: application/json');

try {
    $user_id = authenticate_user();
    
    $query = "
        SELECT 
            cb.id,
            cb.consultation_code,
            cb.status,
            cb.scheduled_at,
            cb.expert_id,
            cb.notes,
            cb.created_at,
            p.name as product_name,
            p.description as product_description,
            p.price as product_price,
            p.package_type,
            o.order_code,
            o.created_at as order_date,
            e.name as expert_name,
            e.email as expert_email,
            e.phone as expert_phone,
            e.specialty as expert_specialty
        FROM consultation_bookings cb
        JOIN products p ON cb.product_id = p.id
        JOIN orders o ON cb.order_id = o.id
        LEFT JOIN experts e ON cb.expert_id = e.id
        WHERE cb.user_id = ?
        ORDER BY cb.created_at DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([$user_id]);
    $consultations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format dates and add status info
    foreach ($consultations as &$consultation) {
        $consultation['created_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['created_at']));
        $consultation['order_date_formatted'] = date('d/m/Y H:i', strtotime($consultation['order_date']));
        
        if ($consultation['scheduled_at']) {
            $consultation['scheduled_at_formatted'] = date('d/m/Y H:i', strtotime($consultation['scheduled_at']));
            $consultation['is_past_schedule'] = strtotime($consultation['scheduled_at']) < time();
        } else {
            $consultation['scheduled_at_formatted'] = null;
            $consultation['is_past_schedule'] = false;
        }
        
        // Add status display names
        $status_map = [
            'pending' => 'Chờ xếp lịch',
            'scheduled' => 'Đã xếp lịch',
            'completed' => 'Đã hoàn thành',
            'cancelled' => 'Đã hủy'
        ];
        $consultation['status_display'] = $status_map[$consultation['status']] ?? $consultation['status'];
        
        // Add package type display name
        $consultation['package_display'] = $consultation['package_type'] === 'basic' ? 'Gói cơ bản' : 'Gói cao cấp';
        
        // Determine if consultation is actionable
        $consultation['can_reschedule'] = in_array($consultation['status'], ['pending', 'scheduled']);
        $consultation['can_cancel'] = in_array($consultation['status'], ['pending', 'scheduled']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $consultations,
        'total' => count($consultations)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi server: ' . $e->getMessage()
    ]);
}
?>
