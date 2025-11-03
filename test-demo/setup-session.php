<?php
/**
 * Simple Session Setup for Testing Quiz APIs
 * Sử dụng tài khoản từ sample-data.sql
 */

session_start();

// Setup test user session (sử dụng customer từ sample-data.sql)
$_SESSION['user_id'] = 2; // ID của customer@example.com
$_SESSION['email'] = 'customer@example.com';
$_SESSION['name'] = 'Nguyễn Văn A';
$_SESSION['role'] = 'user';
$_SESSION['isPaid'] = false;
$_SESSION['last_activity'] = time();

header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Test session created using customer from sample-data.sql',
    'session_data' => [
        'user_id' => $_SESSION['user_id'],
        'email' => $_SESSION['email'],
        'name' => $_SESSION['name'],
        'role' => $_SESSION['role'],
        'isPaid' => $_SESSION['isPaid']
    ]
]);
?>