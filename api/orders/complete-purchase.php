<?php
/**
 * API: Hoàn thành quá trình mua hàng sau khi thanh toán thành công
 * 
 * Chức năng:
 * 1. Lấy tất cả items trong cart của user
 * 2. Tạo records trong purchased_packages 
 * 3. Xóa cart items
 * 4. Cập nhật order status nếu cần
 * 
 * Method: POST
 * Input: order_id (từ VNPay payment result)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Phương thức không được hỗ trợ'
    ]);
    exit;
}

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../auth/middleware.php';

// Test mode for direct browser access
if (isset($_GET['test']) && $_GET['test'] == '1') {
    $order_id = $_GET['order_id'] ?? null;
    if ($order_id) {
        $_POST = json_encode(['order_id' => $order_id]);
        $_SERVER['REQUEST_METHOD'] = 'POST';
    }
}

try {
    // Lấy input data
    $input = json_decode(file_get_contents('php://input'), true);
    $order_id = $input['order_id'] ?? null;

    if (!$order_id) {
        throw new Exception('Thiếu order_id');
    }

    // Bắt đầu transaction
    $pdo->beginTransaction();

    // 1. Kiểm tra order có tồn tại và đã thanh toán thành công
    $stmt = $pdo->prepare("
        SELECT o.*, u.id as user_id 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        WHERE o.id = ? AND o.payment_status = 'paid' AND o.status = 'completed'
    ");
    $stmt->execute([$order_id]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        throw new Exception('Order không tồn tại hoặc chưa thanh toán thành công');
    }

    $user_id = $order['user_id'];

    // 2. Kiểm tra xem đã xử lý purchase cho order này chưa
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM purchased_packages WHERE order_id = ?");
    $stmt->execute([$order_id]);
    $existing_purchases = $stmt->fetchColumn();

    if ($existing_purchases > 0) {
        // Đã xử lý rồi, trả về thành công
        $pdo->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Đơn hàng đã được xử lý trước đó',
            'order_id' => $order_id,
            'purchased_packages_count' => $existing_purchases
        ]);
        exit;
    }

    // 3. Lấy tất cả cart items của user (từ order_items thay vì cart trực tiếp)
    $stmt = $pdo->prepare("
        SELECT 
            oi.*,
            p.type as product_type,
            p.name as product_name,
            pkg.package_name,
            pkg.original_price,
            pkg.sale_price,
            p.question_count,
            p.report_pages,
            p.duration,
            pkg.group_size,
            pkg.special_features
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN product_packages pkg ON oi.package_id = pkg.id
        WHERE oi.order_id = ?
    ");
    $stmt->execute([$order_id]);
    $order_items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Debug: Log order items
    error_log("Order ID: $order_id, Found order_items: " . count($order_items));
    if (empty($order_items)) {
        // Check if order exists and what tables have data
        $debug_stmt = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE id = ?");
        $debug_stmt->execute([$order_id]);
        $order_exists = $debug_stmt->fetchColumn();
        
        $debug_stmt2 = $pdo->prepare("SELECT COUNT(*) FROM order_items WHERE order_id = ?");
        $debug_stmt2->execute([$order_id]);
        $order_items_count = $debug_stmt2->fetchColumn();
        
        error_log("Debug - Order exists: $order_exists, Order items count: $order_items_count");
        throw new Exception("Không tìm thấy items trong đơn hàng. Order ID: $order_id, Items count: $order_items_count");
    }

    // 4. Tạo purchased_packages cho mỗi item
    $purchased_packages = [];
    
    foreach ($order_items as $item) {
        // Tạo package metadata dựa trên product type
        $package_metadata = [];
        $package_features = [];

        switch ($item['product_type']) {
            case 'career_test':
                if ($item['question_count']) {
                    $package_metadata['question_count'] = (int)$item['question_count'];
                }
                if ($item['report_pages']) {
                    $package_metadata['report_pages'] = (int)$item['report_pages'];
                }
                $package_metadata['attempts_allowed'] = 1; // Default
                break;

            case 'course':
                if ($item['duration']) {
                    $package_metadata['duration'] = $item['duration'];
                }
                if ($item['group_size']) {
                    $package_metadata['group_size'] = $item['group_size'];
                }
                break;

            case 'consultation':
                if ($item['duration']) {
                    $package_metadata['session_duration'] = $item['duration'];
                }
                $package_metadata['sessions_included'] = 1; // Default
                break;
        }

        // Package features từ special_features
        if ($item['special_features']) {
            $package_features['description'] = $item['special_features'];
        }

        // Insert purchased_package (access_code sẽ được tự động tạo bởi trigger)
        $stmt = $pdo->prepare("
            INSERT INTO purchased_packages (
                user_id, order_id, package_id,
                package_name, product_name, product_type, package_price,
                package_features, package_metadata,
                status, access_starts_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
        ");

        $result = $stmt->execute([
            $user_id,
            $order_id,
            $item['package_id'],
            $item['package_name'],
            $item['product_name'],
            $item['product_type'],
            $item['unit_price'],
            json_encode($package_features),
            json_encode($package_metadata)
        ]);

        if (!$result) {
            throw new Exception('Lỗi khi tạo purchased_package cho item: ' . $item['product_name']);
        }

        $purchased_package_id = $pdo->lastInsertId();

        // Lấy access_code được tạo tự động
        $stmt = $pdo->prepare("SELECT access_code FROM purchased_packages WHERE id = ?");
        $stmt->execute([$purchased_package_id]);
        $access_code = $stmt->fetchColumn();

        $purchased_packages[] = [
            'id' => $purchased_package_id,
            'access_code' => $access_code,
            'product_name' => $item['product_name'],
            'package_name' => $item['package_name'],
            'product_type' => $item['product_type'],
            'package_price' => $item['unit_price']
        ];
    }

    // 5. Xóa cart items của user (nếu còn)
    // Vì đã checkout, cart có thể đã được xóa, nhưng xóa để đảm bảo
    $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $deleted_cart_items = $stmt->rowCount();

    // Commit transaction
    $pdo->commit();

    // Trả về kết quả
    echo json_encode([
        'success' => true,
        'message' => 'Hoàn thành xử lý đơn hàng thành công',
        'data' => [
            'order_id' => $order_id,
            'user_id' => $user_id,
            'purchased_packages_count' => count($purchased_packages),
            'purchased_packages' => $purchased_packages,
            'deleted_cart_items' => $deleted_cart_items
        ]
    ]);

} catch (Exception $e) {
    // Rollback transaction nếu có lỗi
    if ($pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    // Rollback transaction nếu có lỗi database
    if ($pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi database: ' . $e->getMessage()
    ]);
}
?>