<?php
/**
 * API: Lấy danh sách sản phẩm
 * Method: GET
 * Endpoint: /api/products/list.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../../config/db-pdo.php';

try {
    // Lấy parameters từ URL
    $type = isset($_GET['type']) ? $_GET['type'] : null;
    $package_type = isset($_GET['package_type']) ? $_GET['package_type'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : 'active';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    $search = isset($_GET['search']) ? trim($_GET['search']) : null;

    // Xây dựng câu truy vấn
    $sql = "SELECT id, name, description, price, type, package_type, status, created_at, updated_at FROM products WHERE 1=1";
    $params = [];

    // Filter theo type
    if ($type && in_array($type, ['course', 'online_test', 'consultation'])) {
        $sql .= " AND type = ?";
        $params[] = $type;
    }

    // Filter theo package_type
    if ($package_type && in_array($package_type, ['basic', 'premium'])) {
        $sql .= " AND package_type = ?";
        $params[] = $package_type;
    }

    // Filter theo status
    if ($status) {
        $sql .= " AND status = ?";
        $params[] = $status;
    }

    // Search trong name và description
    if ($search) {
        $sql .= " AND (name LIKE ? OR description LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    // Đếm tổng số records (cho pagination)
    $countSql = str_replace("SELECT id, name, description, price, type, package_type, status, created_at, updated_at FROM products", "SELECT COUNT(*) as total FROM products", $sql);
    $countStmt = $conn->prepare($countSql);
    $countStmt->execute($params);
    $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Thêm ORDER BY và LIMIT
    $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;

    // Thực thi truy vấn
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format dữ liệu
    foreach ($products as &$product) {
        $product['price'] = (float)$product['price'];
        $product['price_formatted'] = number_format($product['price'], 0, ',', '.') . ' VND';
        
        // Rút gọn description cho list view
        if (strlen($product['description']) > 200) {
            $product['description_short'] = substr($product['description'], 0, 200) . '...';
        } else {
            $product['description_short'] = $product['description'];
        }
    }

    // Trả về kết quả
    $response = [
        'success' => true,
        'data' => [
            'products' => $products,
            'pagination' => [
                'total' => (int)$totalCount,
                'limit' => $limit,
                'offset' => $offset,
                'current_page' => floor($offset / $limit) + 1,
                'total_pages' => ceil($totalCount / $limit)
            ]
        ],
        'filters' => [
            'type' => $type,
            'package_type' => $package_type,
            'status' => $status,
            'search' => $search
        ]
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
