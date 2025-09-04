<?php
/**
 * User Registration API Endpoint
 * PAC Group - Unlock Your Career
 * Handle user registration with validation
 */

// Bao gồm file kết nối database
require_once '../../config/db.php';

// Thiết lập header để trả về JSON và cho phép CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Chỉ cho phép phương thức POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Chỉ chấp nhận phương thức POST'
    ]);
    exit;
}

try {
    // Lấy dữ liệu JSON từ request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Kiểm tra dữ liệu đầu vào
    if (!$input) {
        throw new Exception('Dữ liệu không hợp lệ');
    }
    
    // Lấy và validate các trường dữ liệu từ form đăng ký
    // Chỉ có 4 trường cơ bản: fullname, email, username, password
    $fullname = trim($input['fullname'] ?? '');
    $email = trim($input['email'] ?? '');
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $confirmPassword = $input['confirmPassword'] ?? '';
    $agree = $input['agree'] ?? false;
    
    // Validation
    $errors = [];
    
    // Kiểm tra họ tên
    if (empty($fullname)) {
        $errors[] = 'Họ và tên không được để trống';
    } elseif (strlen($fullname) < 2) {
        $errors[] = 'Họ và tên phải có ít nhất 2 ký tự';
    }
    
    // Kiểm tra email
    if (empty($email)) {
        $errors[] = 'Email không được để trống';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Email không hợp lệ';
    }
    
    // Kiểm tra tên đăng nhập
    if (empty($username)) {
        $errors[] = 'Tên đăng nhập không được để trống';
    } elseif (strlen($username) < 4) {
        $errors[] = 'Tên đăng nhập phải có ít nhất 4 ký tự';
    } elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        $errors[] = 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới';
    }
    
    // Kiểm tra mật khẩu
    if (empty($password)) {
        $errors[] = 'Mật khẩu không được để trống';
    } elseif (strlen($password) < 6) {
        $errors[] = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    
    // Kiểm tra xác nhận mật khẩu
    if ($password !== $confirmPassword) {
        $errors[] = 'Mật khẩu xác nhận không khớp';
    }
    
    // Kiểm tra đồng ý điều khoản
    if (!$agree) {
        $errors[] = 'Bạn phải đồng ý với điều khoản sử dụng';
    }
    
    // Nếu có lỗi, trả về lỗi
    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Dữ liệu không hợp lệ',
            'errors' => $errors
        ]);
        exit;
    }
    
    // Kiểm tra email đã tồn tại
    $checkEmailQuery = "SELECT id FROM users WHERE email = ?";
    $stmt = $conn->prepare($checkEmailQuery);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Email đã được sử dụng'
        ]);
        exit;
    }
    
    // Kiểm tra username đã tồn tại
    $checkUsernameQuery = "SELECT id FROM users WHERE username = ?";
    $stmt = $conn->prepare($checkUsernameQuery);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Tên đăng nhập đã được sử dụng'
        ]);
        exit;
    }
    
    // Mật khẩu được lưu dạng thuần (không hash theo yêu cầu)
    $plainPassword = $password;
    
    // Thêm user mới vào database với thông tin cơ bản
    // Các thông tin khác như phone, address, birth_date sẽ được cập nhật trong profile sau
    $insertQuery = "INSERT INTO users (fullname, email, username, password, status, role) VALUES (?, ?, ?, ?, 'active', 'user')";
    $stmt = $conn->prepare($insertQuery);
    $stmt->bind_param("ssss", $fullname, $email, $username, $plainPassword);
    
    if ($stmt->execute()) {
        $userId = $conn->insert_id;
        
        // Trả về thành công
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Đăng ký thành công',
            'data' => [
                'user_id' => $userId,
                'username' => $username,
                'email' => $email,
                'fullname' => $fullname
            ]
        ]);
    } else {
        throw new Exception('Lỗi khi tạo tài khoản: ' . $stmt->error);
    }
    
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
