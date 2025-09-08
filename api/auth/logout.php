<?php
/**
 * User Logout API Endpoint
 * PAC Group - Unlock Your Career
 * Handle user logout and session cleanup
 */

// Start session
session_start();

// Bao gồm file kết nối database
require_once '../../config/db.php';

// Thiết lập header để trả về JSON và cho phép CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allow GET and POST for logout
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get session token from cookie or session
    $sessionToken = $_COOKIE['pac_session_token'] ?? $_SESSION['session_token'] ?? null;
    
    if ($sessionToken) {
        // Delete session from database
        $deleteQuery = "DELETE FROM sessions WHERE session_token = ?";
        $stmt = $conn->prepare($deleteQuery);
        $stmt->bind_param("s", $sessionToken);
        $stmt->execute();
    }
    
    // Clear session variables
    session_unset();
    session_destroy();
    
    // Clear cookies
    setcookie('pac_session_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    setcookie('pac_user_info', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => false,
        'samesite' => 'Lax'
    ]);
    
    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Đăng xuất thành công!',
        'redirect_url' => 'dangnhap'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống: ' . $e->getMessage()
    ]);
} finally {
    // Đóng kết nối database
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
}
?>
