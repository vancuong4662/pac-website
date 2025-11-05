<?php
// Thông tin kết nối MySQL sử dụng PDO

// REMOTE SERVER (comment out for local testing):
$host = '103.200.23.126';
$dbname = 'unlockyo_pac';
$username = 'unlockyo_admin';
$password = '%r)wM(j&Y3k.@{;T';

// LOCALHOST (uncomment for local testing):
// $host = 'localhost';
// $dbname = 'pac_db';
// $username = 'root'; // Default XAMPP username
// $password = '';     // Default XAMPP password (empty)

try {
    // Thiết lập kết nối PDO
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $conn = new PDO($dsn, $username, $password, $options);
    // Alias cho compatibility với các file khác
    $pdo = $conn;
    
} catch (PDOException $e) {
    // Log error chi tiết
    error_log("Database connection failed: " . $e->getMessage());
    error_log("Database config: host=$host, dbname=$dbname, username=$username");
    
    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection failed',
            'details' => $e->getMessage(), // Debug info for testing
            'config' => [
                'host' => $host,
                'database' => $dbname,
                'username' => $username
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        die("Kết nối database thất bại: " . $e->getMessage());
    }
    exit;
}

/**
 * Function to get PDO connection (for QuizGenerator and other classes)
 */
function getPDOConnection() {
    global $conn;
    if (!$conn) {
        // Re-include this file to establish connection
        include __DIR__ . '/db-pdo.php';
    }
    return $conn;
}
?>
