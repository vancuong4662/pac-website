<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'session_data' => $_SESSION,
    'user_id' => $_SESSION['user_id'] ?? null,
    'role' => $_SESSION['role'] ?? null,
    'session_id' => session_id()
]);
?>