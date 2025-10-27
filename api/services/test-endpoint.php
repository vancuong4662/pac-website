<?php
// Simple test endpoint
error_log("Test endpoint accessed - Method: " . $_SERVER['REQUEST_METHOD']);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

echo json_encode([
    'success' => true,
    'message' => 'Test endpoint working',
    'method' => $_SERVER['REQUEST_METHOD'],
    'data' => [
        'timestamp' => date('Y-m-d H:i:s'),
        'request_uri' => $_SERVER['REQUEST_URI'],
        'input' => file_get_contents('php://input')
    ]
]);
?>