<?php
/**
 * User Login API Endpoint
 * PAC Group - Unlock Your Career
 * Handle user login with database authentication and session management
 */

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
    if (empty($data['username']) || empty($data['password'])) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Vui lòng nhập đầy đủ thông tin đăng nhập']);
        exit();
    }

    $username = trim($data['username']);
    $password = trim($data['password']);
    $remember = isset($data['remember']) ? $data['remember'] : false;

    // Basic validation
    if (strlen($username) < 3) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Tên đăng nhập phải có ít nhất 3 ký tự']);
        exit();
    }

    if (strlen($password) < 4) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Mật khẩu phải có ít nhất 4 ký tự']);
        exit();
    }

    // Check if user exists and get user data
    $query = "SELECT id, fullname, email, username, password, status, role FROM users WHERE (username = ? OR email = ?) AND status != 'banned'";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        // Simulate some delay to prevent brute force
        sleep(1);
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác']);
        exit();
    }

    $user = $result->fetch_assoc();

    // Check if account is active
    if ($user['status'] !== 'active') {
        http_response_code(403);
        echo json_encode([
            'success' => false, 
            'message' => 'Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa'
        ]);
        exit();
    }

    // Verify password (so sánh thuần vì password không hash)
    if ($password !== $user['password']) {
        // Simulate some delay to prevent brute force
        sleep(1);
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác']);
        exit();
    }

    // Generate secure session token
    $sessionToken = bin2hex(random_bytes(32));
    
    // Set expiration time
    $expiresAt = $remember ? 
        date('Y-m-d H:i:s', strtotime('+30 days')) : // Remember me: 30 days
        date('Y-m-d H:i:s', strtotime('+24 hours')); // Normal: 24 hours
    
    // Get user info for session
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
    
    // Clean up old sessions for this user (keep only last 5 sessions)
    $cleanupQuery = "DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
        SELECT id FROM (
            SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
        ) AS temp
    )";
    $cleanupStmt = $conn->prepare($cleanupQuery);
    $cleanupStmt->bind_param("ii", $user['id'], $user['id']);
    $cleanupStmt->execute();
    
    // Insert new session
    $sessionQuery = "INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ip_address, is_remember) VALUES (?, ?, ?, ?, ?, ?)";
    $sessionStmt = $conn->prepare($sessionQuery);
    $sessionStmt->bind_param("issssi", $user['id'], $sessionToken, $expiresAt, $userAgent, $ipAddress, $remember);
    
    if (!$sessionStmt->execute()) {
        throw new Exception('Không thể tạo phiên đăng nhập');
    }
    
    // Set session variables
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['fullname'] = $user['fullname'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['session_token'] = $sessionToken;
    $_SESSION['logged_in'] = true;
    
    // Set cookie with session token
    $cookieExpires = $remember ? time() + (30 * 24 * 60 * 60) : 0; // 30 days or session
    setcookie('pac_session_token', $sessionToken, [
        'expires' => $cookieExpires,
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true in production with HTTPS
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
    // Also set user info cookie for frontend
    setcookie('pac_user_info', json_encode([
        'id' => $user['id'],
        'username' => $user['username'],
        'fullname' => $user['fullname'],
        'role' => $user['role']
    ]), [
        'expires' => $cookieExpires,
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true in production with HTTPS
        'httponly' => false, // Allow JavaScript access for this cookie
        'samesite' => 'Lax'
    ]);

    // Prepare user data for response
    $userData = [
        'id' => $user['id'],
        'username' => $user['username'],
        'fullname' => $user['fullname'],
        'email' => $user['email'],
        'role' => $user['role']
    ];

    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Đăng nhập thành công!',
        'session_token' => $sessionToken,
        'user' => $userData,
        'redirect_url' => 'home',
        'remember' => $remember,
        'expires_at' => $expiresAt
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
