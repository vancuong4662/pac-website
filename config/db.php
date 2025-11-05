<?php
// Thông tin kết nối MySQL
$host = '103.200.23.126';
$dbname = 'unlockyo_pac';
$username = 'unlockyo_admin';
$password = '%r)wM(j&Y3k.@{;T';

// LOCALHOST :
// $host = 'localhost';
// $dbname = 'pac_db';
// $username = 'adminCuong';
// $password = '123456';

// Thiết lập kết nối
$conn = new mysqli($host, $username, $password, $dbname);

// Kiểm tra kết nối
if ($conn->connect_error) {
    die("Kết nối thất bại: " . $conn->connect_error);
}

// Thiết lập charset UTF-8 để xử lý tiếng Việt đúng cách
$conn->set_charset("utf8");

?>
