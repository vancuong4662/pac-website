<?php
/**
 * API: CRUD sản phẩm cho Admin
 * Methods: GET (list), POST (create), PUT (update), DELETE (delete)
 * Endpoint: /api/products/admin-manage.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../config/db-pdo.php';
require_once '../../api/auth/middleware.php';

// Kiểm tra authentication và quyền admin
$auth_result = validateSession();
if (!$auth_result['success']) {
    http_response_code(401);
    echo json_encode($auth_result, JSON_UNESCAPED_UNICODE);
    exit;
}

$user = $auth_result['user'];
if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Access denied. Admin role required.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGetProducts();
            break;
        case 'POST':
            handleCreateProduct();
            break;
        case 'PUT':
            handleUpdateProduct();
            break;
        case 'DELETE':
            handleDeleteProduct();
            break;
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'Method not allowed'
            ], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function handleGetProducts() {
    global $conn;
    
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $status = isset($_GET['status']) ? $_GET['status'] : '';
    $type = isset($_GET['type']) ? $_GET['type'] : '';
    
    $offset = ($page - 1) * $limit;
    
    // Xây dựng WHERE clause
    $where = [];
    $params = [];
    
    if ($search) {
        $where[] = "(name LIKE ? OR description LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    if ($status) {
        $where[] = "status = ?";
        $params[] = $status;
    }
    
    if ($type) {
        $where[] = "type = ?";
        $params[] = $type;
    }
    
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Đếm tổng số
    $countSql = "SELECT COUNT(*) as total FROM products $whereClause";
    $countStmt = $conn->prepare($countSql);
    $countStmt->execute($params);
    $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Lấy dữ liệu
    $sql = "SELECT * FROM products $whereClause ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format dữ liệu
    foreach ($products as &$product) {
        $product['price'] = (float)$product['price'];
        $product['price_formatted'] = number_format($product['price'], 0, ',', '.') . ' VND';
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'products' => $products,
            'pagination' => [
                'total' => (int)$total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ]
        ]
    ], JSON_UNESCAPED_UNICODE);
}

function handleCreateProduct() {
    global $conn;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate input
    $required = ['name', 'description', 'price', 'type'];
    foreach ($required as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => "Field '$field' is required"
            ], JSON_UNESCAPED_UNICODE);
            return;
        }
    }
    
    // Validate type
    if (!in_array($input['type'], ['course', 'online_test', 'consultation'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid product type'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // Validate package_type if provided
    if (isset($input['package_type']) && !in_array($input['package_type'], ['basic', 'premium', null])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid package type'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    $sql = "INSERT INTO products (name, description, price, type, package_type, status) VALUES (?, ?, ?, ?, ?, ?)";
    $params = [
        $input['name'],
        $input['description'],
        $input['price'],
        $input['type'],
        $input['package_type'] ?? null,
        $input['status'] ?? 'active'
    ];
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    $productId = $conn->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'message' => 'Product created successfully',
        'data' => ['product_id' => $productId]
    ], JSON_UNESCAPED_UNICODE);
}

function handleUpdateProduct() {
    global $conn;
    
    $product_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($product_id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid product ID is required'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Kiểm tra sản phẩm tồn tại
    $checkSql = "SELECT id FROM products WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->execute([$product_id]);
    if (!$checkStmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Product not found'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // Xây dựng câu UPDATE
    $updates = [];
    $params = [];
    
    $allowedFields = ['name', 'description', 'price', 'type', 'package_type', 'status'];
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = ?";
            $params[] = $input[$field];
        }
    }
    
    if (empty($updates)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No fields to update'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    $updates[] = "updated_at = CURRENT_TIMESTAMP";
    $params[] = $product_id;
    
    $sql = "UPDATE products SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode([
        'success' => true,
        'message' => 'Product updated successfully'
    ], JSON_UNESCAPED_UNICODE);
}

function handleDeleteProduct() {
    global $conn;
    
    $product_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($product_id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Valid product ID is required'
        ], JSON_UNESCAPED_UNICODE);
        return;
    }
    
    // Kiểm tra sản phẩm có được sử dụng trong đơn hàng không
    $checkOrderSql = "SELECT COUNT(*) as count FROM order_items WHERE product_id = ?";
    $checkOrderStmt = $conn->prepare($checkOrderSql);
    $checkOrderStmt->execute([$product_id]);
    $orderCount = $checkOrderStmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($orderCount > 0) {
        // Không xóa cứng, chỉ deactivate
        $sql = "UPDATE products SET status = 'inactive' WHERE id = ?";
        $message = 'Product deactivated (has orders)';
    } else {
        // Xóa cứng
        $sql = "DELETE FROM products WHERE id = ?";
        $message = 'Product deleted successfully';
    }
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$product_id]);
    
    echo json_encode([
        'success' => true,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
}
?>
