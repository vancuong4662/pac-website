<?php
/**
 * Products Management API for Admin
 * Handles CRUD operations for products (consultations, courses, tests)
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log request details
error_log("=== Products API Request ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("URI: " . $_SERVER['REQUEST_URI']);
error_log("Query: " . ($_SERVER['QUERY_STRING'] ?? 'none'));

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db-pdo.php';
// require_once '../auth/middleware.php';

// Use the connection from db-pdo.php ($conn) and assign to $pdo for consistency
$pdo = $conn;

// Temporarily skip authentication for testing
error_log("Skipping authentication for testing");
// Check admin authentication
// $auth = checkAuth();
// if (!$auth['success']) {
//     http_response_code(401);
//     echo json_encode([
//         'success' => false,
//         'message' => 'Unauthorized access'
//     ]);
//     exit();
// }

// For now, we'll skip admin role check for testing
// TODO: Implement proper admin role verification
// if ($auth['user']['role'] !== 'admin') {
//     http_response_code(403);
//     echo json_encode([
//         'success' => false,
//         'message' => 'Admin access required'
//     ]);
//     exit();
// }

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGet();
            break;
        case 'POST':
            handlePost();
            break;
        case 'PUT':
            handlePut();
            break;
        case 'DELETE':
            handleDelete();
            break;
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    error_log("Products API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}

function handleGet() {
    global $pdo;
    
    if (isset($_GET['id'])) {
        // Get single product
        $id = (int)$_GET['id'];
        
        $stmt = $pdo->prepare("
            SELECT id, name, description, price, type, package_type, status, created_at, updated_at 
            FROM products 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($product) {
            echo json_encode([
                'success' => true,
                'data' => $product
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Product not found'
            ]);
        }
    } else {
        // Get products with filters
        $type = $_GET['type'] ?? null;
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        
        $whereConditions = [];
        $params = [];
        
        if ($type) {
            $whereConditions[] = "type = ?";
            $params[] = $type;
        }
        
        if ($status) {
            $whereConditions[] = "status = ?";
            $params[] = $status;
        }
        
        if ($search) {
            $whereConditions[] = "(name LIKE ? OR description LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        $sql = "
            SELECT id, name, description, price, type, package_type, status, created_at, updated_at 
            FROM products 
        ";
        
        if (!empty($whereConditions)) {
            $sql .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $products,
            'count' => count($products)
        ]);
    }
}

function handlePost() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validation
    if (empty($input['name'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product name is required'
        ]);
        return;
    }
    
    if (strlen($input['name']) < 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product name must be at least 3 characters'
        ]);
        return;
    }
    
    if (empty($input['description'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product description is required'
        ]);
        return;
    }
    
    if (empty($input['price']) || !is_numeric($input['price']) || $input['price'] <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Valid product price is required'
        ]);
        return;
    }
    
    if (empty($input['type']) || !in_array($input['type'], ['course', 'online_test', 'consultation'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Valid product type is required'
        ]);
        return;
    }
    
    // Check if product name already exists
    $stmt = $pdo->prepare("SELECT id FROM products WHERE name = ?");
    $stmt->execute([$input['name']]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product name already exists'
        ]);
        return;
    }
    
    // Insert new product
    $stmt = $pdo->prepare("
        INSERT INTO products (name, description, price, type, package_type, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    
    $success = $stmt->execute([
        $input['name'],
        $input['description'],
        $input['price'],
        $input['type'],
        $input['package_type'] ?? null,
        $input['status'] ?? 'active'
    ]);
    
    if ($success) {
        $newId = $pdo->lastInsertId();
        
        // Get the created product
        $stmt = $pdo->prepare("
            SELECT id, name, description, price, type, package_type, status, created_at, updated_at 
            FROM products 
            WHERE id = ?
        ");
        $stmt->execute([$newId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Product created successfully',
            'data' => $product
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to create product'
        ]);
    }
}

function handlePut() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product ID is required'
        ]);
        return;
    }
    
    if (empty($input['name'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product name is required'
        ]);
        return;
    }
    
    if (strlen($input['name']) < 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product name must be at least 3 characters'
        ]);
        return;
    }
    
    if (empty($input['description'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product description is required'
        ]);
        return;
    }
    
    if (empty($input['price']) || !is_numeric($input['price']) || $input['price'] <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Valid product price is required'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if product exists
    $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Product not found'
        ]);
        return;
    }
    
    // Check if product name already exists (excluding current product)
    $stmt = $pdo->prepare("SELECT id FROM products WHERE name = ? AND id != ?");
    $stmt->execute([$input['name'], $id]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product name already exists'
        ]);
        return;
    }
    
    // Update product
    $stmt = $pdo->prepare("
        UPDATE products 
        SET name = ?, description = ?, price = ?, package_type = ?, status = ?, updated_at = NOW() 
        WHERE id = ?
    ");
    
    $success = $stmt->execute([
        $input['name'],
        $input['description'],
        $input['price'],
        $input['package_type'] ?? null,
        $input['status'] ?? 'active',
        $id
    ]);
    
    if ($success) {
        // Get the updated product
        $stmt = $pdo->prepare("
            SELECT id, name, description, price, type, package_type, status, created_at, updated_at 
            FROM products 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully',
            'data' => $product
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update product'
        ]);
    }
}

function handleDelete() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Product ID is required'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if product exists
    $stmt = $pdo->prepare("SELECT id, name FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Product not found'
        ]);
        return;
    }
    
    // Check if product is being used in orders
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?");
    $stmt->execute([$id]);
    $orderCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($orderCount > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Cannot delete product that has been ordered. Please set status to inactive instead.'
        ]);
        return;
    }
    
    // Delete product
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
    $success = $stmt->execute([$id]);
    
    if ($success) {
        echo json_encode([
            'success' => true,
            'message' => 'Product deleted successfully',
            'data' => [
                'id' => $id,
                'name' => $product['name']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to delete product'
        ]);
    }
}
?>
