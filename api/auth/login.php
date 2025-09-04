<?php
/**
 * User Login API Endpoint
 * PAC Group - Unlock Your Career
 * Handle user login with database authentication
 */

// Bao gồm file kết nối database
require_once '../../config/db.php';

// Thiết lập header để trả về JSON và cho phép CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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

    // Generate a simple token (in production, use JWT or similar)
    $token = base64_encode($user['id'] . ':' . time() . ':' . md5($user['username'] . 'pac_secret_key_2025'));

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
        'token' => $token,
        'user' => $userData,
        'redirect_url' => '/pac-new/',
        'remember' => $remember
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
