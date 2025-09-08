<?php
/**
 * Get User Profile API Endpoint
 * PAC Group - Unlock Your Career
 * Get complete user profile information
 */

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors to avoid breaking JSON
ini_set('log_errors', 1);

// Start session
session_start();

// Bao gồm file kết nối database
require_once '../../config/db.php';

// Thiết lập header để trả về JSON và cho phép CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to send JSON response and exit
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

try {
    // Debug log
    error_log('[get-profile.php] Request started');
    
    // Get session token from cookie
    $sessionToken = $_COOKIE['pac_session_token'] ?? null;
    
    if (!$sessionToken) {
        error_log('[get-profile.php] No session token found');
        sendJsonResponse([
            'success' => false,
            'message' => 'Không tìm thấy phiên đăng nhập',
            'authenticated' => false
        ], 401);
    }
    
    error_log('[get-profile.php] Session token found: ' . substr($sessionToken, 0, 10) . '...');
    
    // Verify session and get user data
    $query = "SELECT u.* 
              FROM sessions s 
              INNER JOIN users u ON s.user_id = u.id 
              WHERE s.session_token = ? AND s.expires_at > NOW() AND u.status != 'banned'";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        error_log('[get-profile.php] Prepare failed: ' . $conn->error);
        throw new Exception('Database prepare error');
    }
    
    $stmt->bind_param("s", $sessionToken);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        error_log('[get-profile.php] Session not found or expired');
        sendJsonResponse([
            'success' => false,
            'message' => 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
            'authenticated' => false
        ], 401);
    }
    
    $userData = $result->fetch_assoc();
    error_log('[get-profile.php] User data found for ID: ' . $userData['id']);
    
    // Remove sensitive data
    unset($userData['password']);
    unset($userData['email_verification_token']);
    unset($userData['password_reset_token']);
    unset($userData['password_reset_expires']);
    
    // Format birth_date for HTML date input
    if ($userData['birth_date']) {
        $userData['birth_date'] = date('Y-m-d', strtotime($userData['birth_date']));
    }
    
    // Convert status to Vietnamese
    $statusMap = [
        'active' => 'Đang hoạt động',
        'inactive' => 'Tạm khóa',
        'banned' => 'Bị cấm',
        'pending' => 'Chờ xác thực'
    ];
    $userData['status_text'] = $statusMap[$userData['status']] ?? 'Không xác định';
    
    // Convert role to Vietnamese
    $roleMap = [
        'user' => 'Người dùng',
        'admin' => 'Quản trị viên',
        'moderator' => 'Kiểm duyệt viên'
    ];
    $userData['role_text'] = $roleMap[$userData['role']] ?? 'Không xác định';
    
    // Format created_at and updated_at
    if ($userData['created_at']) {
        $userData['created_at_formatted'] = date('d/m/Y H:i', strtotime($userData['created_at']));
    }
    if ($userData['updated_at']) {
        $userData['updated_at_formatted'] = date('d/m/Y H:i', strtotime($userData['updated_at']));
    }
    
    error_log('[get-profile.php] Sending successful response');
    
    // Success response
    sendJsonResponse([
        'success' => true,
        'message' => 'Lấy thông tin profile thành công',
        'user' => $userData
    ]);

} catch (Exception $e) {
    error_log('[get-profile.php] Exception: ' . $e->getMessage());
    error_log('[get-profile.php] Stack trace: ' . $e->getTraceAsString());
    
    sendJsonResponse([
        'success' => false,
        'message' => 'Lỗi hệ thống: ' . $e->getMessage()
    ], 500);
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
