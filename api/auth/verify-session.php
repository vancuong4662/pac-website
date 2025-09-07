<?php
/**
 * Session Verification API Endpoint
 * PAC Group - Unlock Your Career
 * Verify if user session is valid
 */

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

try {
    // Get session token from cookie or session
    $sessionToken = $_COOKIE['pac_session_token'] ?? $_SESSION['session_token'] ?? null;
    
    if (!$sessionToken) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy phiên đăng nhập',
            'authenticated' => false
        ]);
        exit();
    }
    
    // Verify session in database
    $query = "SELECT s.*, u.id, u.fullname, u.email, u.username, u.role, u.status 
              FROM sessions s 
              INNER JOIN users u ON s.user_id = u.id 
              WHERE s.session_token = ? AND s.expires_at > NOW() AND u.status = 'active'";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $sessionToken);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Invalid or expired session
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
        
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Phiên đăng nhập đã hết hạn',
            'authenticated' => false
        ]);
        exit();
    }
    
    $sessionData = $result->fetch_assoc();
    
    // Update session variables
    $_SESSION['user_id'] = $sessionData['id'];
    $_SESSION['username'] = $sessionData['username'];
    $_SESSION['fullname'] = $sessionData['fullname'];
    $_SESSION['role'] = $sessionData['role'];
    $_SESSION['session_token'] = $sessionToken;
    $_SESSION['logged_in'] = true;
    
    // Update last activity
    $updateQuery = "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_token = ?";
    $updateStmt = $conn->prepare($updateQuery);
    $updateStmt->bind_param("s", $sessionToken);
    $updateStmt->execute();
    
    // Prepare user data for response
    $userData = [
        'id' => $sessionData['id'],
        'username' => $sessionData['username'],
        'fullname' => $sessionData['fullname'],
        'email' => $sessionData['email'],
        'role' => $sessionData['role']
    ];
    
    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Phiên đăng nhập hợp lệ',
        'authenticated' => true,
        'user' => $userData,
        'expires_at' => $sessionData['expires_at']
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống: ' . $e->getMessage(),
        'authenticated' => false
    ]);
} finally {
    // Đóng kết nối database
    if (isset($updateStmt)) {
        $updateStmt->close();
    }
    if (isset($stmt)) {
        $stmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
}
?>
