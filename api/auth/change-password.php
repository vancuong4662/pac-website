<?php
/**
 * Change Password API Endpoint
 * PAC Group - Unlock Your Career
 * Handle user password change with database update
 */

// Suppress all errors to ensure clean JSON output
error_reporting(0);
ini_set('display_errors', 0);

// Start session
session_start();

// Include database connection file
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

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // Validate JSON
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }

    // Validate required fields
    if (empty($data['current_password']) || empty($data['new_password']) || empty($data['confirm_password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'Vui lòng nhập đầy đủ thông tin',
            'error_code' => 'MISSING_FIELDS'
        ]);
        exit();
    }

    $currentPassword = trim($data['current_password']);
    $newPassword = trim($data['new_password']);
    $confirmPassword = trim($data['confirm_password']);

    // Validate password length
    if (strlen($newPassword) < 6) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'Mật khẩu mới phải có ít nhất 6 ký tự',
            'error_code' => 'PASSWORD_TOO_SHORT'
        ]);
        exit();
    }

    // Validate password confirmation
    if ($newPassword !== $confirmPassword) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'Mật khẩu xác nhận không khớp',
            'error_code' => 'PASSWORD_MISMATCH'
        ]);
        exit();
    }

    // Check if user is logged in via session
    $userId = null;
    
    // First check session
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    }
    
    // If no session, check for session token in cookie
    if (!$userId && isset($_COOKIE['pac_session_token'])) {
        $sessionToken = $_COOKIE['pac_session_token'];
        
        // Verify session token
        $sessionQuery = "SELECT user_id FROM sessions WHERE session_token = ? AND expires_at > NOW() AND is_active = 1";
        $sessionStmt = $conn->prepare($sessionQuery);
        $sessionStmt->bind_param("s", $sessionToken);
        $sessionStmt->execute();
        $sessionResult = $sessionStmt->get_result();
        
        if ($sessionResult->num_rows > 0) {
            $sessionData = $sessionResult->fetch_assoc();
            $userId = $sessionData['user_id'];
        }
        
        $sessionStmt->close();
    }

    // If still no user, return unauthorized
    if (!$userId) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            'error_code' => 'UNAUTHORIZED'
        ]);
        exit();
    }

    // Get user's current password from database
    $query = "SELECT id, username, password, status FROM users WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy người dùng',
            'error_code' => 'USER_NOT_FOUND'
        ]);
        exit();
    }

    $user = $result->fetch_assoc();

    // Check if account is active
    if ($user['status'] !== 'active') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa',
            'error_code' => 'ACCOUNT_INACTIVE'
        ]);
        exit();
    }

    // Verify current password (so sánh thuần vì password không hash)
    if ($currentPassword !== $user['password']) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Mật khẩu hiện tại không chính xác',
            'error_code' => 'INVALID_CURRENT_PASSWORD'
        ]);
        exit();
    }

    // Check if new password is same as current password
    if ($currentPassword === $newPassword) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Mật khẩu mới phải khác mật khẩu hiện tại',
            'error_code' => 'SAME_PASSWORD'
        ]);
        exit();
    }

    // Update password in database
    // Note: In production, you should hash the password using password_hash()
    // But based on the login.php code, passwords are stored in plain text
    $updateQuery = "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?";
    $updateStmt = $conn->prepare($updateQuery);
    $updateStmt->bind_param("si", $newPassword, $userId);
    
    if (!$updateStmt->execute()) {
        throw new Exception('Không thể cập nhật mật khẩu');
    }

    // Invalidate all existing sessions for security (force re-login)
    // Try to invalidate sessions - ignore if table doesn't have is_active column
    try {
        $invalidateSessionsQuery = "UPDATE sessions SET is_active = 0 WHERE user_id = ?";
        $invalidateStmt = $conn->prepare($invalidateSessionsQuery);
        
        if ($invalidateStmt) {
            $invalidateStmt->bind_param("i", $userId);
            $invalidateStmt->execute();
            $invalidateStmt->close();
        }
    } catch (Exception $sessionError) {
        // Fallback: try to delete sessions instead
        $deleteSessionsQuery = "DELETE FROM sessions WHERE user_id = ?";
        $deleteStmt = $conn->prepare($deleteSessionsQuery);
        if ($deleteStmt) {
            $deleteStmt->bind_param("i", $userId);
            $deleteStmt->execute();
            $deleteStmt->close();
        }
    }

    // Clear current session
    session_destroy();
    
    // Clear session cookie
    if (isset($_COOKIE['pac_session_token'])) {
        setcookie('pac_session_token', '', time() - 3600, '/');
    }
    
    // Clear user info cookie
    if (isset($_COOKIE['pac_user_info'])) {
        setcookie('pac_user_info', '', time() - 3600, '/');
    }

    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.',
        'data' => [
            'username' => $user['username'],
            'changed_at' => date('Y-m-d H:i:s')
        ]
    ]);

    $updateStmt->close();
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống: ' . $e->getMessage(),
        'error_code' => 'INTERNAL_ERROR'
    ]);
} finally {
    // Đóng kết nối database
    if (isset($conn)) {
        $conn->close();
    }
}
?>
