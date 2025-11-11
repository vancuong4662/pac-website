<?php
/**
 * Product Packages Management API for Admin
 * API endpoint for managing packages of products
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log request details
error_log("=== Packages API Request ===");
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

// Use the connection from db-pdo.php ($conn) and assign to $pdo for consistency
$pdo = $conn;

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetPackages();
            break;
        case 'POST':
            handleCreatePackage();
            break;
        case 'PUT':
            handleUpdatePackage();
            break;
        case 'DELETE':
            handleDeletePackage();
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
    error_log("Packages API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}

function handleGetPackages() {
    global $pdo;
    
    if (isset($_GET['product_id'])) {
        // Get packages for specific product
        $product_id = (int)$_GET['product_id'];
        
        // First get product information
        $product_stmt = $pdo->prepare("
            SELECT id, name, type, status
            FROM products 
            WHERE id = ?
        ");
        $product_stmt->execute([$product_id]);
        $product = $product_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Không tìm thấy sản phẩm'
            ]);
            return;
        }
        
        // Get packages for this product
        $packages_stmt = $pdo->prepare("
            SELECT id, package_name, package_slug, package_description,
                   original_price, sale_price, is_free, group_size, 
                   special_features, image_url, sort_order, status,
                   created_at, updated_at
            FROM product_packages 
            WHERE product_id = ? 
            ORDER BY sort_order ASC, created_at ASC
        ");
        $packages_stmt->execute([$product_id]);
        $packages = $packages_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Process packages
        foreach ($packages as &$package) {
            $package['original_price'] = (float)$package['original_price'];
            $package['sale_price'] = $package['sale_price'] ? (float)$package['sale_price'] : null;
            $package['is_free'] = (bool)$package['is_free'];
            $package['final_price'] = $package['sale_price'] ?: $package['original_price'];
            
            // Parse special features if JSON
            if ($package['special_features']) {
                $decoded = json_decode($package['special_features'], true);
                $package['special_features'] = $decoded ?: $package['special_features'];
            }
            
            // Format price display
            if ($package['is_free']) {
                $package['price_display'] = 'Miễn phí';
            } elseif ($package['sale_price']) {
                $package['price_display'] = number_format($package['sale_price'], 0, ',', '.') . '₫';
                $package['original_price_display'] = number_format($package['original_price'], 0, ',', '.') . '₫';
            } else {
                $package['price_display'] = number_format($package['original_price'], 0, ',', '.') . '₫';
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'product' => $product,
                'packages' => $packages
            ],
            'count' => count($packages)
        ]);
    } elseif (isset($_GET['id'])) {
        // Get single package details
        $id = (int)$_GET['id'];
        
        $stmt = $pdo->prepare("
            SELECT pp.id, pp.package_name, pp.package_slug, pp.package_description,
                   pp.original_price, pp.sale_price, pp.is_free, pp.group_size, 
                   pp.special_features, pp.image_url, pp.sort_order, pp.status,
                   pp.created_at, pp.updated_at, pp.product_id,
                   p.name as product_name, p.type as product_type
            FROM product_packages pp
            JOIN products p ON pp.product_id = p.id
            WHERE pp.id = ?
        ");
        $stmt->execute([$id]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($package) {
            // Process package data
            $package['original_price'] = (float)$package['original_price'];
            $package['sale_price'] = $package['sale_price'] ? (float)$package['sale_price'] : null;
            $package['is_free'] = (bool)$package['is_free'];
            $package['final_price'] = $package['sale_price'] ?: $package['original_price'];
            
            // Parse special features if JSON
            if ($package['special_features']) {
                $decoded = json_decode($package['special_features'], true);
                $package['special_features'] = $decoded ?: $package['special_features'];
            }
            
            // Format price display
            if ($package['is_free']) {
                $package['price_display'] = 'Miễn phí';
            } elseif ($package['sale_price']) {
                $package['price_display'] = number_format($package['sale_price'], 0, ',', '.') . '₫';
                $package['original_price_display'] = number_format($package['original_price'], 0, ',', '.') . '₫';
            } else {
                $package['price_display'] = number_format($package['original_price'], 0, ',', '.') . '₫';
            }
            
            echo json_encode([
                'success' => true,
                'data' => $package
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Không tìm thấy gói dịch vụ'
            ]);
        }
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Thiếu tham số product_id hoặc id'
        ]);
    }
}

function handleCreatePackage() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validation
    if (empty($input['product_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID sản phẩm là bắt buộc'
        ]);
        return;
    }
    
    if (empty($input['package_name'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên gói là bắt buộc'
        ]);
        return;
    }
    
    // Check if product exists
    $stmt = $pdo->prepare("SELECT id, name FROM products WHERE id = ?");
    $stmt->execute([$input['product_id']]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy sản phẩm'
        ]);
        return;
    }
    
    // Generate slug from package name
    $slug = generateSlug($input['package_name']);
    
    // Ensure unique slug within the product
    $original_slug = $slug;
    $counter = 1;
    while (true) {
        $stmt = $pdo->prepare("SELECT id FROM product_packages WHERE product_id = ? AND package_slug = ?");
        $stmt->execute([$input['product_id'], $slug]);
        if (!$stmt->fetch()) break;
        
        $slug = $original_slug . '-' . $counter;
        $counter++;
    }
    
    try {
        // Insert new package
        $stmt = $pdo->prepare("
            INSERT INTO product_packages (
                product_id, package_name, package_slug, package_description,
                original_price, sale_price, is_free, group_size, 
                special_features, image_url, sort_order, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $price = (float)($input['original_price'] ?? 0);
        $sale_price = isset($input['sale_price']) && $input['sale_price'] > 0 ? (float)$input['sale_price'] : null;
        $is_free = ($input['is_free'] ?? false) || ($price == 0);
        
        $success = $stmt->execute([
            $input['product_id'],
            $input['package_name'],
            $slug,
            $input['package_description'] ?? null,
            $price,
            $sale_price,
            $is_free,
            $input['group_size'] ?? null,
            isset($input['special_features']) ? json_encode($input['special_features']) : null,
            $input['image_url'] ?? null,
            $input['sort_order'] ?? 0,
            $input['status'] ?? 'active'
        ]);
        
        if (!$success) {
            throw new Exception('Failed to create package');
        }
        
        $newId = $pdo->lastInsertId();
        
        // Get the created package
        $stmt = $pdo->prepare("
            SELECT id, package_name, package_slug, package_description,
                   original_price, sale_price, is_free, group_size, 
                   special_features, image_url, sort_order, status,
                   created_at, updated_at
            FROM product_packages 
            WHERE id = ?
        ");
        $stmt->execute([$newId]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Tạo gói dịch vụ thành công',
            'data' => $package
        ]);
        
    } catch (Exception $e) {
        error_log("Package creation error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi tạo gói dịch vụ: ' . $e->getMessage()
        ]);
    }
}

function handleUpdatePackage() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID gói dịch vụ là bắt buộc'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if package exists
    $stmt = $pdo->prepare("SELECT id, product_id, package_name FROM product_packages WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy gói dịch vụ'
        ]);
        return;
    }
    
    try {
        // Update package
        $stmt = $pdo->prepare("
            UPDATE product_packages 
            SET package_name = ?, package_description = ?,
                original_price = ?, sale_price = ?, is_free = ?,
                group_size = ?, special_features = ?, image_url = ?,
                sort_order = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        $price = (float)($input['original_price'] ?? 0);
        $sale_price = isset($input['sale_price']) && $input['sale_price'] > 0 ? (float)$input['sale_price'] : null;
        $is_free = ($input['is_free'] ?? false) || ($price == 0);
        
        $success = $stmt->execute([
            $input['package_name'] ?? $existing['package_name'],
            $input['package_description'] ?? null,
            $price,
            $sale_price,
            $is_free,
            $input['group_size'] ?? null,
            isset($input['special_features']) ? json_encode($input['special_features']) : null,
            $input['image_url'] ?? null,
            $input['sort_order'] ?? 0,
            $input['status'] ?? 'active',
            $id
        ]);
        
        if (!$success) {
            throw new Exception('Failed to update package');
        }
        
        // Get the updated package
        $stmt = $pdo->prepare("
            SELECT id, package_name, package_slug, package_description,
                   original_price, sale_price, is_free, group_size, 
                   special_features, image_url, sort_order, status,
                   created_at, updated_at
            FROM product_packages 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $package = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Cập nhật gói dịch vụ thành công',
            'data' => $package
        ]);
        
    } catch (Exception $e) {
        error_log("Package update error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi cập nhật gói dịch vụ: ' . $e->getMessage()
        ]);
    }
}

function handleDeletePackage() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID gói dịch vụ là bắt buộc'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if package exists
    $stmt = $pdo->prepare("
        SELECT pp.id, pp.package_name, pp.product_id, p.name as product_name
        FROM product_packages pp
        JOIN products p ON pp.product_id = p.id
        WHERE pp.id = ?
    ");
    $stmt->execute([$id]);
    $package = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$package) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy gói dịch vụ'
        ]);
        return;
    }
    
    // Check if package is being used in orders
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM order_items WHERE package_id = ?");
    $stmt->execute([$id]);
    $orderCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($orderCount > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa gói dịch vụ đã có đơn hàng. Vui lòng đặt trạng thái thành "Không hoạt động".'
        ]);
        return;
    }
    
    // Check if it's the last active package for the product
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM product_packages 
        WHERE product_id = ? AND status = 'active'
    ");
    $stmt->execute([$package['product_id']]);
    $activePackageCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($activePackageCount <= 1) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa gói cuối cùng của sản phẩm. Sản phẩm phải có ít nhất một gói.'
        ]);
        return;
    }
    
    try {
        // Delete the package
        $stmt = $pdo->prepare("DELETE FROM product_packages WHERE id = ?");
        $success = $stmt->execute([$id]);
        
        if (!$success) {
            throw new Exception('Failed to delete package');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Xóa gói dịch vụ thành công',
            'data' => [
                'id' => $id,
                'package_name' => $package['package_name'],
                'product_name' => $package['product_name']
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Package deletion error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi xóa gói dịch vụ: ' . $e->getMessage()
        ]);
    }
}

function generateSlug($text) {
    // Convert to lowercase
    $slug = mb_strtolower($text, 'UTF-8');
    
    // Replace Vietnamese characters
    $vietnamese = array(
        'à','á','ạ','ả','ã','â','ầ','ấ','ậ','ẩ','ẫ','ă','ằ','ắ','ặ','ẳ','ẵ',
        'è','é','ẹ','ẻ','ẽ','ê','ề','ế','ệ','ể','ễ',
        'ì','í','ị','ỉ','ĩ',
        'ò','ó','ọ','ỏ','õ','ô','ồ','ố','ộ','ổ','ỗ','ơ','ờ','ớ','ợ','ở','ỡ',
        'ù','ú','ụ','ủ','ũ','ư','ừ','ứ','ự','ử','ữ',
        'ỳ','ý','ỵ','ỷ','ỹ',
        'đ'
    );
    
    $english = array(
        'a','a','a','a','a','a','a','a','a','a','a','a','a','a','a','a','a',
        'e','e','e','e','e','e','e','e','e','e','e',
        'i','i','i','i','i',
        'o','o','o','o','o','o','o','o','o','o','o','o','o','o','o','o','o',
        'u','u','u','u','u','u','u','u','u','u','u',
        'y','y','y','y','y',
        'd'
    );
    
    $slug = str_replace($vietnamese, $english, $slug);
    
    // Remove special characters and replace spaces with hyphens
    $slug = preg_replace('/[^a-z0-9\s-]/', '', $slug);
    $slug = preg_replace('/[\s-]+/', '-', $slug);
    $slug = trim($slug, '-');
    
    return $slug;
}
?>