<?php
/**
 * Session Cleanup Script
 * PAC Group - Unlock Your Career
 * Clean up expired sessions from database
 */

// Bao gồm file kết nối database
require_once '../../config/db.php';
require_once 'middleware.php';

// Thiết lập header để trả về JSON
header('Content-Type: application/json');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Clean up expired sessions
    $deletedCount = cleanupExpiredSessions($conn);
    
    if ($deletedCount !== false) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Dọn dẹp phiên hết hạn thành công',
            'deleted_sessions' => $deletedCount
        ]);
    } else {
        throw new Exception('Không thể dọn dẹp phiên hết hạn');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống: ' . $e->getMessage()
    ]);
} finally {
    // Đóng kết nối database
    if (isset($conn)) {
        $conn->close();
    }
}
?>
