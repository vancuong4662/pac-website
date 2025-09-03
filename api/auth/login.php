<?php
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

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Validate JSON
if (!$data) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit();
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

// Simulate authentication - Replace with actual database check
$validCredentials = [
    'admin' => 'admin123',
    'user' => 'user123',
    'demo' => 'demo123',
    'pacgroup' => 'pac2025'
];

// Check credentials
if (!isset($validCredentials[$username]) || $validCredentials[$username] !== $password) {
    // Simulate some delay to prevent brute force
    sleep(1);
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác']);
    exit();
}

// Generate a simple token (in production, use JWT or similar)
$token = base64_encode($username . ':' . time() . ':' . md5($username . 'secret_key'));

// User information (replace with actual user data from database)
$user = [
    'id' => 1,
    'username' => $username,
    'name' => ucfirst($username),
    'email' => $username . '@pacgroup.com',
    'role' => $username === 'admin' ? 'admin' : 'user',
    'last_login' => date('Y-m-d H:i:s')
];

// Success response
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Đăng nhập thành công!',
    'token' => $token,
    'user' => $user,
    'redirect_url' => '/pac-new/home',
    'remember' => $remember
]);
?>
