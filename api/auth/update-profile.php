<?php
/**
 * Update User Profile API Endpoint
 * PAC Group - Unlock Your Career
 * Update user profile information
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

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Phương thức không được phép'
    ]);
    exit();
}

try {
    // Get session token from cookie
    $sessionToken = $_COOKIE['pac_session_token'] ?? null;
    
    if (!$sessionToken) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy phiên đăng nhập',
            'authenticated' => false
        ]);
        exit();
    }
    
    // Verify session and get user ID
    $verifyQuery = "SELECT u.id 
                    FROM sessions s 
                    INNER JOIN users u ON s.user_id = u.id 
                    WHERE s.session_token = ? AND s.expires_at > NOW() AND u.status = 'active'";
    
    $verifyStmt = $conn->prepare($verifyQuery);
    $verifyStmt->bind_param("s", $sessionToken);
    $verifyStmt->execute();
    $verifyResult = $verifyStmt->get_result();
    
    if ($verifyResult->num_rows === 0) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Phiên đăng nhập không hợp lệ',
            'authenticated' => false
        ]);
        exit();
    }
    
    $sessionData = $verifyResult->fetch_assoc();
    $userId = $sessionData['id'];
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Dữ liệu không hợp lệ'
        ]);
        exit();
    }
    
    // Validate required fields
    $requiredFields = ['fullname', 'email'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Trường {$field} là bắt buộc"
            ]);
            exit();
        }
    }
    
    // Validate email format
    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email không hợp lệ'
        ]);
        exit();
    }
    
    // Check if email already exists (excluding current user)
    $emailCheckQuery = "SELECT id FROM users WHERE email = ? AND id != ?";
    $emailCheckStmt = $conn->prepare($emailCheckQuery);
    $emailCheckStmt->bind_param("si", $input['email'], $userId);
    $emailCheckStmt->execute();
    $emailCheckResult = $emailCheckStmt->get_result();
    
    if ($emailCheckResult->num_rows > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Email này đã được sử dụng bởi tài khoản khác'
        ]);
        exit();
    }
    
    // Validate phone number if provided
    if (!empty($input['phone'])) {
        $phone = preg_replace('/\s+/', '', $input['phone']); // Remove spaces
        if (!preg_match('/^[0-9]{10,11}$/', $phone)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Số điện thoại không hợp lệ'
            ]);
            exit();
        }
        $input['phone'] = $phone;
    }
    
    // Validate birth_date if provided
    if (!empty($input['birth_date'])) {
        $date = DateTime::createFromFormat('Y-m-d', $input['birth_date']);
        if (!$date) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Ngày sinh không hợp lệ'
            ]);
            exit();
        }
        
        // Check if date is not in future
        $today = new DateTime();
        if ($date > $today) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Ngày sinh không thể là ngày trong tương lai'
            ]);
            exit();
        }
    }
    
    // Prepare update query
    $updateFields = [];
    $updateValues = [];
    $updateTypes = '';
    
    // Fields that can be updated
    $allowedFields = ['fullname', 'email', 'phone', 'address', 'birth_date'];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updateFields[] = "{$field} = ?";
            $updateValues[] = $input[$field] ?: null;
            $updateTypes .= 's';
        }
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Không có dữ liệu để cập nhật'
        ]);
        exit();
    }
    
    // Add updated_at
    $updateFields[] = 'updated_at = CURRENT_TIMESTAMP';
    
    // Build and execute update query
    $updateQuery = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $updateValues[] = $userId;
    $updateTypes .= 'i';
    
    $updateStmt = $conn->prepare($updateQuery);
    $updateStmt->bind_param($updateTypes, ...$updateValues);
    
    if (!$updateStmt->execute()) {
        throw new Exception('Không thể cập nhật thông tin profile');
    }
    
    // Get updated user data for cookie update
    $getUserQuery = "SELECT id, username, fullname, email, role FROM users WHERE id = ?";
    $getUserStmt = $conn->prepare($getUserQuery);
    $getUserStmt->bind_param("i", $userId);
    $getUserStmt->execute();
    $getUserResult = $getUserStmt->get_result();
    $updatedUser = $getUserResult->fetch_assoc();
    
    // Update user info cookie
    $userInfoCookie = [
        'id' => $updatedUser['id'],
        'username' => $updatedUser['username'],
        'fullname' => $updatedUser['fullname'],
        'email' => $updatedUser['email'],
        'role' => $updatedUser['role']
    ];
    
    setcookie('pac_user_info', urlencode(json_encode($userInfoCookie)), [
        'expires' => time() + (30 * 24 * 60 * 60), // 30 days
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => false,
        'samesite' => 'Lax'
    ]);
    
    // Update session variables
    $_SESSION['fullname'] = $updatedUser['fullname'];
    
    // Success response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Cập nhật thông tin profile thành công',
        'user' => $updatedUser
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống: ' . $e->getMessage()
    ]);
} finally {
    // Đóng kết nối database
    if (isset($verifyStmt)) {
        $verifyStmt->close();
    }
    if (isset($emailCheckStmt)) {
        $emailCheckStmt->close();
    }
    if (isset($updateStmt)) {
        $updateStmt->close();
    }
    if (isset($getUserStmt)) {
        $getUserStmt->close();
    }
    if (isset($conn)) {
        $conn->close();
    }
}
?>
