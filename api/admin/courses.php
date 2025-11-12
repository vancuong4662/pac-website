<?php
/**
 * Courses Management API for Admin
 * Handles CRUD operations for courses (products with type='course')
 * Based on products.php but specialized for courses
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Log request details
error_log("=== Courses API Request ===");
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
            handleGetCourses();
            break;
        case 'POST':
            handlePostCourses();
            break;
        case 'PUT':
            handlePutCourses();
            break;
        case 'DELETE':
            handleDeleteCourses();
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
    error_log("Courses API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}

function handleGetCourses() {
    global $pdo;
    
    if (isset($_GET['id'])) {
        // Get single course with packages
        $id = (int)$_GET['id'];
        
        // Get course details
        $stmt = $pdo->prepare("
            SELECT id, name, slug, short_description, full_description, type, category,
                   duration, target_audience, learning_outcomes, curriculum,
                   instructor_info, teaching_format,
                   image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE id = ? AND type = 'course'
        ");
        $stmt->execute([$id]);
        $course = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($course) {
            // Get packages for this course
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
            
            $course['packages'] = $packages;
            
            // Parse JSON fields
            if ($course['target_audience']) {
                $decoded = json_decode($course['target_audience'], true);
                $course['target_audience'] = $decoded ?: $course['target_audience'];
            }
            
            if ($course['learning_outcomes']) {
                $decoded = json_decode($course['learning_outcomes'], true);
                $course['learning_outcomes'] = $decoded ?: $course['learning_outcomes'];
            }
            
            if ($course['curriculum']) {
                $decoded = json_decode($course['curriculum'], true);
                $course['curriculum'] = $decoded ?: $course['curriculum'];
            }
            
            echo json_encode([
                'success' => true,
                'data' => $course
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Course not found'
            ]);
        }
    } else {
        // Get all courses with filters
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        $category = $_GET['category'] ?? null;
        
        $whereConditions = ["type = 'course'"];
        $params = [];
        
        if ($status) {
            $whereConditions[] = "status = ?";
            $params[] = $status;
        }
        
        if ($category) {
            $whereConditions[] = "category = ?";
            $params[] = $category;
        }
        
        if ($search) {
            $whereConditions[] = "(name LIKE ? OR short_description LIKE ? OR full_description LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        $sql = "
            SELECT id, name, slug, short_description, full_description, type, category,
                   duration, target_audience, learning_outcomes, curriculum,
                   instructor_info, teaching_format,
                   image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE " . implode(" AND ", $whereConditions) . "
            ORDER BY sort_order ASC, created_at DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get package info for each course
        foreach ($courses as &$course) {
            $package_stmt = $pdo->prepare("
                SELECT COUNT(*) as package_count,
                       MIN(CASE WHEN is_free = 1 THEN 0 ELSE original_price END) as min_price,
                       MAX(original_price) as max_price,
                       SUM(CASE WHEN is_free = 1 THEN 1 ELSE 0 END) as free_packages
                FROM product_packages 
                WHERE product_id = ? AND status = 'active'
            ");
            $package_stmt->execute([$course['id']]);
            $package_info = $package_stmt->fetch(PDO::FETCH_ASSOC);
            
            $course['package_count'] = (int)$package_info['package_count'];
            $course['min_price'] = (float)($package_info['min_price'] ?? 0);
            $course['max_price'] = (float)($package_info['max_price'] ?? 0);
            $course['has_free_package'] = (int)$package_info['free_packages'] > 0;
            
            // Parse JSON fields for display
            if ($course['target_audience']) {
                $decoded = json_decode($course['target_audience'], true);
                if (is_array($decoded)) {
                    $course['target_audience_display'] = implode(', ', $decoded);
                } else {
                    $course['target_audience_display'] = $course['target_audience'];
                }
            }
            
            if ($course['learning_outcomes']) {
                $decoded = json_decode($course['learning_outcomes'], true);
                if (is_array($decoded)) {
                    $course['learning_outcomes_display'] = implode(', ', $decoded);
                } else {
                    $course['learning_outcomes_display'] = $course['learning_outcomes'];
                }
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => $courses,
            'count' => count($courses),
            'filters' => [
                'status' => $status,
                'search' => $search,
                'category' => $category
            ]
        ]);
    }
}

function handlePostCourses() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validation
    if (empty($input['name'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên khóa học là bắt buộc'
        ]);
        return;
    }
    
    if (strlen($input['name']) < 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên khóa học phải có ít nhất 3 ký tự'
        ]);
        return;
    }
    
    if (empty($input['short_description'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Mô tả ngắn là bắt buộc'
        ]);
        return;
    }
    
    if (empty($input['full_description'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Mô tả chi tiết là bắt buộc'
        ]);
        return;
    }
    
    // Check if course name already exists
    $stmt = $pdo->prepare("SELECT id FROM products WHERE name = ? AND type = 'course'");
    $stmt->execute([$input['name']]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên khóa học đã tồn tại'
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
        
        // Prepare JSON fields
        $target_audience = $input['target_audience'] ? json_encode(explode("\n", $input['target_audience'])) : null;
        $learning_outcomes = $input['learning_outcomes'] ? json_encode(explode("\n", $input['learning_outcomes'])) : null;
        
        // Insert new course
        $stmt = $pdo->prepare("
            INSERT INTO products (
                name, slug, short_description, full_description, type, category,
                duration, target_audience, learning_outcomes, curriculum,
                instructor_info, teaching_format,
                image_url, status, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $success = $stmt->execute([
            $input['name'],
            $slug,
            $input['short_description'],
            $input['full_description'],
            'course',
            $input['category'] ?? 'other',
            $input['duration'] ?? null,
            $target_audience,
            $learning_outcomes,
            $input['curriculum'] ?? null,
            $input['instructor_info'] ?? null,
            $input['teaching_format'] ?? null,
            $input['image_url'] ?? null,
            $input['status'] ?? 'active',
            0 // Default sort order
        ]);
        
        if (!$success) {
            throw new Exception('Failed to create course');
        }
        
        $newId = $pdo->lastInsertId();
        
        // Create default package
        $package_slug = generateSlug('Gói tiêu chuẩn');
        
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
            'Gói Tiêu chuẩn',
            $package_slug,
            'Gói khóa học mặc định',
            0, // Default free
            null,
            true, // Free by default
            'active',
            0
        ]);
        
        if (!$package_success) {
            throw new Exception('Failed to create default package');
        }
        
        $pdo->commit();
        
        // Get the created course
        $stmt = $pdo->prepare("
            SELECT id, name, slug, short_description, full_description, type, category,
                   duration, target_audience, learning_outcomes, curriculum,
                   instructor_info, teaching_format,
                   image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE id = ?
        ");
        $stmt->execute([$newId]);
        $course = $stmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Tạo khóa học thành công',
            'data' => $course
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Course creation error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi tạo khóa học: ' . $e->getMessage()
        ]);
    }
}

function handlePutCourses() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID khóa học là bắt buộc'
        ]);
        return;
    }
    
    if (empty($input['name'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên khóa học là bắt buộc'
        ]);
        return;
    }
    
    if (strlen($input['name']) < 3) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên khóa học phải có ít nhất 3 ký tự'
        ]);
        return;
    }
    
    if (empty($input['short_description'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Mô tả ngắn là bắt buộc'
        ]);
        return;
    }
    
    if (empty($input['full_description'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Mô tả chi tiết là bắt buộc'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if course exists
    $stmt = $pdo->prepare("SELECT id, slug, name FROM products WHERE id = ? AND type = 'course'");
    $stmt->execute([$id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy khóa học'
        ]);
        return;
    }
    
    // Check if course name already exists (excluding current course)
    $stmt = $pdo->prepare("SELECT id FROM products WHERE name = ? AND id != ? AND type = 'course'");
    $stmt->execute([$input['name'], $id]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Tên khóa học đã tồn tại'
        ]);
        return;
    }
    
    // Generate new slug if name changed
    $new_slug = $existing['slug']; // Keep existing slug by default
    if ($input['name'] !== $existing['name']) {
        $new_slug = generateSlug($input['name']);
        
        // Ensure unique slug
        $original_slug = $new_slug;
        $counter = 1;
        while (true) {
            $stmt = $pdo->prepare("SELECT id FROM products WHERE slug = ? AND id != ?");
            $stmt->execute([$new_slug, $id]);
            if (!$stmt->fetch()) break;
            
            $new_slug = $original_slug . '-' . $counter;
            $counter++;
        }
    }
    
    try {
        $pdo->beginTransaction();
        
        // Prepare JSON fields
        $target_audience = $input['target_audience'] ? json_encode(explode("\n", $input['target_audience'])) : null;
        $learning_outcomes = $input['learning_outcomes'] ? json_encode(explode("\n", $input['learning_outcomes'])) : null;
        
        // Update course
        $stmt = $pdo->prepare("
            UPDATE products 
            SET name = ?, slug = ?, short_description = ?, full_description = ?, 
                category = ?, duration = ?, target_audience = ?, learning_outcomes = ?, 
                curriculum = ?, instructor_info = ?, teaching_format = ?,
                image_url = ?, status = ?, updated_at = NOW() 
            WHERE id = ?
        ");
        
        $success = $stmt->execute([
            $input['name'],
            $new_slug,
            $input['short_description'],
            $input['full_description'],
            $input['category'] ?? 'other',
            $input['duration'] ?? null,
            $target_audience,
            $learning_outcomes,
            $input['curriculum'] ?? null,
            $input['instructor_info'] ?? null,
            $input['teaching_format'] ?? null,
            $input['image_url'] ?? null,
            $input['status'] ?? 'active',
            $id
        ]);
        
        if (!$success) {
            throw new Exception('Failed to update course');
        }
        
        $pdo->commit();
        
        // Get the updated course
        $stmt = $pdo->prepare("
            SELECT id, name, slug, short_description, full_description, type, category,
                   duration, target_audience, learning_outcomes, curriculum,
                   instructor_info, teaching_format,
                   image_url, status, sort_order, created_at, updated_at
            FROM products 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $course = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Cập nhật khóa học thành công',
            'data' => $course
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Course update error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi cập nhật khóa học: ' . $e->getMessage()
        ]);
    }
}

function handleDeleteCourses() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID khóa học là bắt buộc'
        ]);
        return;
    }
    
    $id = (int)$input['id'];
    
    // Check if course exists
    $stmt = $pdo->prepare("SELECT id, name FROM products WHERE id = ? AND type = 'course'");
    $stmt->execute([$id]);
    $course = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$course) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Không tìm thấy khóa học'
        ]);
        return;
    }
    
    // Check if course is being used in orders
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?");
    $stmt->execute([$id]);
    $orderCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($orderCount > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa khóa học đã có đơn hàng. Vui lòng đặt trạng thái thành "Không hoạt động".'
        ]);
        return;
    }
    
    // Check if course has enrollments or progress
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM purchased_courses pc 
        WHERE pc.product_id = ?
    ");
    $stmt->execute([$id]);
    $enrollmentCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    if ($enrollmentCount > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Không thể xóa khóa học đã có học viên đăng ký. Vui lòng đặt trạng thái thành "Không hoạt động".'
        ]);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Delete related packages first (due to foreign key constraints)
        $stmt = $pdo->prepare("DELETE FROM product_packages WHERE product_id = ?");
        $stmt->execute([$id]);
        
        // Delete the course
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $success = $stmt->execute([$id]);
        
        if (!$success) {
            throw new Exception('Failed to delete course');
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Xóa khóa học thành công',
            'data' => [
                'id' => $id,
                'name' => $course['name']
            ]
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Course deletion error: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi xóa khóa học: ' . $e->getMessage()
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