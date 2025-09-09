<?php
// Helper functions for processing purchase items
// Shared between process-purchase.php and payment.php

function processOrderPurchases($pdo, $orderId, $user) {
    // Kiểm tra đơn hàng
    $stmt = $pdo->prepare("
        SELECT o.*, u.name as customer_name, u.email as customer_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ? AND (o.user_id = ? OR ? = 1)
    ");
    $isAdmin = ($user['role'] ?? '') === 'admin' ? 1 : 0;
    $stmt->execute([$orderId, $user['id'], $isAdmin]);
    $order = $stmt->fetch();
    
    if (!$order) {
        throw new Exception('Order not found');
    }
    
    // Lấy các sản phẩm trong đơn hàng
    $stmt = $pdo->prepare("
        SELECT oi.*, p.type, p.package_type, p.name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY oi.id
    ");
    $stmt->execute([$orderId]);
    $orderItems = $stmt->fetchAll();
    
    if (empty($orderItems)) {
        throw new Exception('No items found in order');
    }
    
    $processedItems = [
        'courses' => [],
        'tests' => [],
        'consultations' => []
    ];
    
    $errors = [];
    
    // Xử lý từng sản phẩm
    foreach ($orderItems as $item) {
        $quantity = (int)$item['quantity'];
        
        // Xử lý theo loại sản phẩm
        switch ($item['type']) {
            case 'course':
                // Tạo mã khóa học cho mỗi quantity
                for ($i = 0; $i < $quantity; $i++) {
                    try {
                        $courseCode = generateUniqueCourseCode($pdo);
                        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 year')); // Course có hiệu lực 1 năm
                        
                        $stmt = $pdo->prepare("
                            INSERT INTO purchased_courses (user_id, order_id, product_id, course_code, expires_at) 
                            VALUES (?, ?, ?, ?, ?)
                        ");
                        $stmt->execute([$order['user_id'], $orderId, $item['product_id'], $courseCode, $expiresAt]);
                        
                        $processedItems['courses'][] = [
                            'id' => $pdo->lastInsertId(),
                            'product_name' => $item['name'],
                            'course_code' => $courseCode,
                            'expires_at' => $expiresAt,
                            'status' => 'active'
                        ];
                    } catch (Exception $e) {
                        $errors[] = "Failed to create course code for {$item['name']}: " . $e->getMessage();
                    }
                }
                break;
                
            case 'online_test':
                // Tạo token trắc nghiệm cho mỗi quantity
                for ($i = 0; $i < $quantity; $i++) {
                    try {
                        $testToken = generateUniqueTestToken($pdo);
                        $attemptsLeft = ($item['package_type'] === 'premium') ? 3 : 1; // Premium có 3 lần làm
                        $expiresAt = date('Y-m-d H:i:s', strtotime('+6 months')); // Test token có hiệu lực 6 tháng
                        
                        $stmt = $pdo->prepare("
                            INSERT INTO purchased_tests (user_id, order_id, product_id, test_token, attempts_left, expires_at) 
                            VALUES (?, ?, ?, ?, ?, ?)
                        ");
                        $stmt->execute([$order['user_id'], $orderId, $item['product_id'], $testToken, $attemptsLeft, $expiresAt]);
                        
                        $processedItems['tests'][] = [
                            'id' => $pdo->lastInsertId(),
                            'product_name' => $item['name'],
                            'test_token' => $testToken,
                            'attempts_left' => $attemptsLeft,
                            'package_type' => $item['package_type'],
                            'expires_at' => $expiresAt,
                            'status' => 'active'
                        ];
                    } catch (Exception $e) {
                        $errors[] = "Failed to create test token for {$item['name']}: " . $e->getMessage();
                    }
                }
                break;
                
            case 'consultation':
                // Tạo booking tư vấn cho mỗi quantity
                for ($i = 0; $i < $quantity; $i++) {
                    try {
                        $consultationCode = generateUniqueConsultationCode($pdo);
                        
                        $stmt = $pdo->prepare("
                            INSERT INTO consultation_bookings (user_id, order_id, product_id, consultation_code, status) 
                            VALUES (?, ?, ?, ?, 'pending')
                        ");
                        $stmt->execute([$order['user_id'], $orderId, $item['product_id'], $consultationCode]);
                        
                        $processedItems['consultations'][] = [
                            'id' => $pdo->lastInsertId(),
                            'product_name' => $item['name'],
                            'consultation_code' => $consultationCode,
                            'package_type' => $item['package_type'],
                            'status' => 'pending',
                            'scheduled_at' => null
                        ];
                    } catch (Exception $e) {
                        $errors[] = "Failed to create consultation booking for {$item['name']}: " . $e->getMessage();
                    }
                }
                break;
                
            default:
                $errors[] = "Unknown product type: {$item['type']} for {$item['name']}";
                break;
        }
    }
    
    // Tính tổng items đã tạo
    $totalProcessed = count($processedItems['courses']) + count($processedItems['tests']) + count($processedItems['consultations']);
    
    $result = [
        'success' => true,
        'data' => [
            'order_id' => $orderId,
            'order_code' => $order['order_code'],
            'customer' => [
                'name' => $order['customer_name'],
                'email' => $order['customer_email']
            ],
            'processed_items' => $processedItems,
            'summary' => [
                'total_items_processed' => $totalProcessed,
                'courses_created' => count($processedItems['courses']),
                'tests_created' => count($processedItems['tests']),
                'consultations_created' => count($processedItems['consultations'])
            ]
        ],
        'message' => "Successfully processed {$totalProcessed} purchased items for order #{$order['order_code']}"
    ];
    
    if (!empty($errors)) {
        $result['warnings'] = $errors;
    }
    
    return $result;
}

// Helper functions để tạo unique codes/tokens
function generateUniqueCourseCode($pdo) {
    do {
        $code = 'CRS' . strtoupper(bin2hex(random_bytes(4))); // CRS + 8 hex chars
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM purchased_courses WHERE course_code = ?");
        $stmt->execute([$code]);
        $exists = $stmt->fetchColumn() > 0;
    } while ($exists);
    
    return $code;
}

function generateUniqueTestToken($pdo) {
    do {
        $token = 'TST' . bin2hex(random_bytes(16)); // TST + 32 hex chars
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM purchased_tests WHERE test_token = ?");
        $stmt->execute([$token]);
        $exists = $stmt->fetchColumn() > 0;
    } while ($exists);
    
    return $token;
}

function generateUniqueConsultationCode($pdo) {
    do {
        $code = 'CON' . strtoupper(bin2hex(random_bytes(4))); // CON + 8 hex chars
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM consultation_bookings WHERE consultation_code = ?");
        $stmt->execute([$code]);
        $exists = $stmt->fetchColumn() > 0;
    } while ($exists);
    
    return $code;
}
?>
