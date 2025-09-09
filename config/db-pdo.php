<?php
// Thông tin kết nối MySQL sử dụng PDO
$host = 'localhost';
$dbname = 'pac_db';
$username = 'adminCuong';
$password = '123456';

try {
    // Thiết lập kết nối PDO
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $conn = new PDO($dsn, $username, $password, $options);
    
} catch (PDOException $e) {
    // Log error và trả về response JSON cho API
    error_log("Database connection failed: " . $e->getMessage());
    
    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection failed'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        die("Kết nối database thất bại. Vui lòng thử lại sau.");
    }
    exit;
}
?>
