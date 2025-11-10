<?php
/**
 * Consultations Management API for Admin
 * Specialized API for managing career guidance services (consultations + career_test)
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log request details
error_log("=== Consultations API Request ===");
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

try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGetConsultations();
            break;
        case 'POST':
            handleCreateConsultation();
            break;
        case 'PUT':
            handleUpdateConsultation();
            break;
        case 'DELETE':
            handleDeleteConsultation();
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
    error_log("Consultations API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}

function handleGetConsultations() {
    global $pdo;
    
    if (isset($_GET['id'])) {
        // Get single consultation service
        $id = (int)$_GET['id'];
        
        // Get consultation details
        $stmt = $pdo->prepare("
            SELECT id, name, slug, short_description, full_description, type, category,
                   duration, target_audience, learning_outcomes, curriculum,
                   question_count, age_range, report_pages,
                   instructor_info, teaching_format,
                   image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE id = ? AND (type = 'consultation' OR type = 'career_test')
        ");
        $stmt->execute([$id]);
        $consultation = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($consultation) {
            // Get packages for this consultation
            $package_stmt = $pdo->prepare("
                SELECT id, package_name, package_slug, package_description,
                       original_price, sale_price, is_free, group_size, 
                       special_features, image_url, sort_order, status
                FROM product_packages 
                WHERE product_id = ? 
                ORDER BY sort_order ASC
            ");
            $package_stmt->execute([$id]);
            $packages = $package_stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Process packages
            foreach ($packages as &$package) {
                $package['original_price'] = (float)$package['original_price'];
                $package['sale_price'] = $package['sale_price'] ? (float)$package['sale_price'] : null;
                $package['is_free'] = (bool)$package['is_free'];
                $package['final_price'] = $package['sale_price'] ?: $package['original_price'];
                
                if ($package['special_features']) {
                    $decoded = json_decode($package['special_features'], true);
                    $package['special_features'] = $decoded ?: $package['special_features'];
                }
            }
            
            $consultation['packages'] = $packages;
            
            // Parse JSON fields
            if ($consultation['target_audience']) {
                $decoded = json_decode($consultation['target_audience'], true);
                $consultation['target_audience'] = $decoded ?: $consultation['target_audience'];
            }
            
            if ($consultation['learning_outcomes']) {
                $decoded = json_decode($consultation['learning_outcomes'], true);
                $consultation['learning_outcomes'] = $decoded ?: $consultation['learning_outcomes'];
            }
            
            if ($consultation['curriculum']) {
                $decoded = json_decode($consultation['curriculum'], true);
                $consultation['curriculum'] = $decoded ?: $consultation['curriculum'];
            }
            
            // Add consultation type mapping
            if ($consultation['type'] === 'consultation') {
                $consultation['consultation_type'] = 'expert';
            } elseif ($consultation['type'] === 'career_test') {
                $consultation['consultation_type'] = 'automated';
            }
            
            echo json_encode([
                'success' => true,
                'data' => $consultation
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Không tìm thấy dịch vụ tư vấn'
            ]);
        }
    } else {
        // Get consultation services with filters
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        
        $whereConditions = ["(type = 'consultation' OR type = 'career_test')"];
        $params = [];
        
        if ($status) {
            $whereConditions[] = "status = ?";
            $params[] = $status;
        }
        
        if ($search) {
            $whereConditions[] = "(name LIKE ? OR short_description LIKE ? OR full_description LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        $sql = "
            SELECT id, name, slug, short_description, type, category,
                   duration, image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE " . implode(" AND ", $whereConditions) . "
            ORDER BY sort_order ASC, created_at DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $consultations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get package info for each consultation
        foreach ($consultations as &$consultation) {
            $package_stmt = $pdo->prepare("
                SELECT COUNT(*) as package_count,
                       MIN(CASE WHEN is_free = 1 THEN 0 ELSE original_price END) as min_price,
                       MAX(original_price) as max_price,
                       SUM(CASE WHEN is_free = 1 THEN 1 ELSE 0 END) as free_packages
                FROM product_packages 
                WHERE product_id = ? AND status = 'active'
            ");
            $package_stmt->execute([$consultation['id']]);
            $package_info = $package_stmt->fetch(PDO::FETCH_ASSOC);
            
            $consultation['package_count'] = (int)$package_info['package_count'];
            $consultation['min_price'] = (float)($package_info['min_price'] ?? 0);
            $consultation['max_price'] = (float)($package_info['max_price'] ?? 0);
            $consultation['has_free_package'] = (int)$package_info['free_packages'] > 0;
            
            // Add consultation type mapping
            if ($consultation['type'] === 'consultation') {
                $consultation['consultation_type'] = 'expert';
            } elseif ($consultation['type'] === 'career_test') {
                $consultation['consultation_type'] = 'automated';
            }
            
            // Format package type based on price range
            if ($consultation['has_free_package'] && $consultation['max_price'] > 0) {
                $consultation['package_type'] = 'mixed'; // Both free and paid
            } elseif ($consultation['has_free_package']) {
                $consultation['package_type'] = 'basic'; // Free only
            } else {
                $consultation['package_type'] = 'premium'; // Paid only
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => $consultations,
            'count' => count($consultations),
            'filters' => [
                'status' => $status,
                'search' => $search
            ]
        ]);
    }
}

function handleCreateConsultation() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validation
    if (empty($input['name'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên dịch vụ là bắt buộc'
        ]);
        return;
    }
    
    if (strlen($input['name']) < 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên dịch vụ phải có ít nhất 3 ký tự'
        ]);
        return;
    }
    
    if (empty($input['description'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Mô tả dịch vụ là bắt buộc'
        ]);
        return;
    }
    
    // Map consultation type to product type
    $consultation_type = $input['consultation_type'] ?? '';
    $product_type = '';
    
    if ($consultation_type === 'automated') {
        $product_type = 'career_test';
    } elseif ($consultation_type === 'expert') {
        $product_type = 'consultation';
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Loại tư vấn không hợp lệ'
        ]);
        return;
    }
    
    // Check if consultation name already exists
    $stmt = $pdo->prepare("SELECT id FROM products WHERE name = ?");
    $stmt->execute([$input['name']]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên dịch vụ đã tồn tại'
        ]);
        return;
    }
    
    // Generate slug from name
    $slug = generateSlug($input['name']);
    
    // Ensure unique slug
    $original_slug = $slug;
    $counter = 1;
    while (true) {
        $stmt = $pdo->prepare("SELECT id FROM products WHERE slug = ?");
        $stmt->execute([$slug]);
        if (!$stmt->fetch()) break;
        
        $slug = $original_slug . '-' . $counter;
        $counter++;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Insert new consultation service
        $stmt = $pdo->prepare("
            INSERT INTO products (
                name, slug, short_description, full_description, type, category,
                duration, image_url, status, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $success = $stmt->execute([
            $input['name'],
            $slug,
            $input['description'], // Use as short description
            $input['description'], // Use as full description too
            $product_type,
            'career_guidance', // Category for career services
            $input['duration'] ?? 'Linh hoạt',
            $input['image_url'] ?? null,
            $input['status'] ?? 'active',
            0 // Default sort order
        ]);
        
        if (!$success) {
            throw new Exception('Failed to create consultation service');
        }
        
        $newId = $pdo->lastInsertId();
        
        // Create default package based on package type and price
        $package_name = '';
        $is_free = false;
        $price = (float)($input['price'] ?? 0);
        
        if ($input['package_type'] === 'basic') {
            $package_name = 'Gói Cơ bản';
            $is_free = ($price == 0);
        } elseif ($input['package_type'] === 'premium') {
            $package_name = 'Gói Cao cấp';
            $is_free = false;
        } else {
            $package_name = 'Gói Tiêu chuẩn';
            $is_free = ($price == 0);
        }
        
        $package_slug = generateSlug($package_name);
        
        // Insert default package
        $package_stmt = $pdo->prepare("
            INSERT INTO product_packages (
                product_id, package_name, package_slug, package_description,
                original_price, sale_price, is_free, status, sort_order,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $package_success = $package_stmt->execute([
            $newId,
            $package_name,
            $package_slug,
            'Gói dịch vụ mặc định',
            $price,
            null, // No sale price initially
            $is_free,
            'active',
            0
        ]);
        
        if (!$package_success) {
            throw new Exception('Failed to create default package');
        }
        
        $pdo->commit();
        
        // Get the created consultation with package info
        $stmt = $pdo->prepare("
            SELECT id, name, slug, short_description, type, category,
                   duration, image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE id = ?
        ");
        $stmt->execute([$newId]);
        $consultation = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Add consultation type for response
        $consultation['consultation_type'] = $consultation_type;
        $consultation['package_type'] = $input['package_type'];
        $consultation['price'] = $price;
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Tạo dịch vụ tư vấn thành công',
            'data' => $consultation
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Consultation creation error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi tạo dịch vụ: ' . $e->getMessage()
        ]);
    }
}

function handleUpdateConsultation() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID dịch vụ là bắt buộc'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if consultation exists
    $stmt = $pdo->prepare("
        SELECT id, slug, name 
        FROM products 
        WHERE id = ? AND (type = 'consultation' OR type = 'career_test')
    ");
    $stmt->execute([$id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy dịch vụ tư vấn'
        ]);
        return;
    }
    
    // Map consultation type to product type
    $consultation_type = $input['consultation_type'] ?? '';
    $product_type = '';
    
    if ($consultation_type === 'automated') {
        $product_type = 'career_test';
    } elseif ($consultation_type === 'expert') {
        $product_type = 'consultation';
    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Loại tư vấn không hợp lệ'
        ]);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Update consultation service
        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, short_description = ?, full_description = ?, 
                duration = ?, learning_outcomes = ?, type = ?, 
                image_url = ?, status = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        
        $success = $stmt->execute([
            $input['name'],
            $input['short_description'] ?? null,
            $input['full_description'] ?? null,
            $input['duration'] ?? null,
            $input['learning_outcomes'] ?? null,
            $product_type,
            $input['image_url'] ?? null,
            $input['status'] ?? 'active',
            $id
        ]);
        
        if (!$success) {
            throw new Exception('Failed to update consultation service');
        }
        
        // Update default package price if provided
        if (isset($input['price']) && is_numeric($input['price'])) {
            $price = (float)$input['price'];
            $is_free = ($price == 0);
            
            // Find the first package for this consultation
            $package_stmt = $pdo->prepare("
                SELECT id FROM product_packages 
                WHERE product_id = ? 
                ORDER BY sort_order ASC, created_at ASC 
                LIMIT 1
            ");
            $package_stmt->execute([$id]);
            $package = $package_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($package) {
                // Update existing package
                $update_package_stmt = $pdo->prepare("
                    UPDATE product_packages 
                    SET original_price = ?, is_free = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $update_package_stmt->execute([
                    $price,
                    $is_free,
                    $package['id']
                ]);
            }
        }
        
        $pdo->commit();
        
        // Get the updated consultation
        $stmt = $pdo->prepare("
            SELECT id, name, slug, short_description, type, category,
                   duration, image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $consultation = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Add consultation type and price for response
        $consultation['consultation_type'] = $consultation_type;
        $consultation['package_type'] = $input['package_type'] ?? 'basic';
        $consultation['price'] = $input['price'] ?? 0;
        
        echo json_encode([
            'success' => true,
            'message' => 'Cập nhật dịch vụ tư vấn thành công',
            'data' => $consultation
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Consultation update error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi cập nhật dịch vụ: ' . $e->getMessage()
        ]);
    }
}

function handleDeleteConsultation() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID dịch vụ là bắt buộc'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if consultation exists
    $stmt = $pdo->prepare("
        SELECT id, name 
        FROM products 
        WHERE id = ? AND (type = 'consultation' OR type = 'career_test')
    ");
    $stmt->execute([$id]);
    $consultation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$consultation) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy dịch vụ tư vấn'
        ]);
        return;
    }
    
    // Check if consultation is being used in orders
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?");
    $stmt->execute([$id]);
    $orderCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($orderCount > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa dịch vụ đã có đơn hàng. Vui lòng đặt trạng thái thành "Không hoạt động".'
        ]);
        return;
    }
    
    // Check if consultation has quiz results
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM quiz_exams qe 
        WHERE qe.product_id = ?
    ");
    $stmt->execute([$id]);
    $examCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($examCount > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa dịch vụ đã có người làm bài test. Vui lòng đặt trạng thái thành "Không hoạt động".'
        ]);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Delete related packages first (due to foreign key constraints)
        $stmt = $pdo->prepare("DELETE FROM product_packages WHERE product_id = ?");
        $stmt->execute([$id]);
        
        // Delete the consultation
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $success = $stmt->execute([$id]);
        
        if (!$success) {
            throw new Exception('Failed to delete consultation');
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Xóa dịch vụ tư vấn thành công',
            'data' => [
                'id' => $id,
                'name' => $consultation['name']
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Consultation deletion error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi xóa dịch vụ: ' . $e->getMessage()
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