<?php
/**
 * API: Get Available Quiz Packages
 * GET /api/quiz/available-packages.php
 * 
 * Lấy danh sách các gói quiz mà user có thể truy cập
 * Bao gồm cả free packages và purchased packages
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Include required files
require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/quiz-config.php';
require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../../includes/classes/QuizGenerator.php';

// Set timezone
date_default_timezone_set(DEFAULT_TIMEZONE);

try {
    // Start session để lấy user info
    session_start();
    
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'error_code' => 401,
            'message' => 'Bạn cần đăng nhập để xem danh sách gói bài thi',
            'redirect_url' => 'dangnhap'
        ]);
        exit;
    }
    
    $userId = intval($_SESSION['user_id']);
    
    // Optional filters
    $productType = $_GET['product_type'] ?? null;
    $includePurchased = filter_var($_GET['include_purchased'] ?? 'true', FILTER_VALIDATE_BOOLEAN);
    $includeFree = filter_var($_GET['include_free'] ?? 'true', FILTER_VALIDATE_BOOLEAN);
    
    // Connect to database
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    
    // Build query - simplified without access control
    $whereConditions = [
        "pp.status = 'active'",
        "p.status = 'active'",
        "p.type = 'career_test'" // Only career test products have quiz
    ];
    
    $params = [];
    
    if ($productType) {
        $whereConditions[] = "p.type = ?";
        $params[] = $productType;
    }
    
    $whereClause = implode(" AND ", $whereConditions);
    
    $sql = "
        SELECT 
            qpc.package_id,
            qpc.question_count,
            qpc.questions_per_group,
            qpc.time_limit_minutes,
            qpc.max_attempts,
            qpc.report_type,
            qpc.features,
            
            pp.package_name,
            pp.package_slug,
            pp.package_description,
            pp.original_price,
            pp.sale_price,
            pp.is_free,
            
            p.id as product_id,
            p.name as product_name,
            p.slug as product_slug,
            p.type as product_type,
            p.short_description as product_description,
            
            -- Latest exam info
            le.id as latest_exam_id,
            le.exam_code as latest_exam_code,
            le.exam_status as latest_exam_status,
            le.start_time as latest_exam_start,
            le.answered_questions as latest_exam_progress
            
        FROM quiz_package_configs qpc
        JOIN product_packages pp ON qpc.package_id = pp.id
        JOIN products p ON qpc.product_id = p.id
        LEFT JOIN (
            SELECT DISTINCT
                package_id,
                FIRST_VALUE(id) OVER (PARTITION BY package_id ORDER BY created_at DESC) as id,
                FIRST_VALUE(exam_code) OVER (PARTITION BY package_id ORDER BY created_at DESC) as exam_code,
                FIRST_VALUE(exam_status) OVER (PARTITION BY package_id ORDER BY created_at DESC) as exam_status,
                FIRST_VALUE(start_time) OVER (PARTITION BY package_id ORDER BY created_at DESC) as start_time,
                FIRST_VALUE(answered_questions) OVER (PARTITION BY package_id ORDER BY created_at DESC) as answered_questions
            FROM quiz_exams 
            WHERE user_id = ?
        ) le ON pp.id = le.package_id
        WHERE {$whereClause}
        ORDER BY pp.is_free DESC, pp.original_price ASC
    ";
    
    // Add user_id parameter for latest exam JOIN
    array_unshift($params, $userId);
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $packages = $stmt->fetchAll();
    
    // Process and format results
    $formattedPackages = [];
    foreach ($packages as $package) {
        // Calculate pricing info
        $finalPrice = $package['sale_price'] ?? $package['original_price'];
        $hasDiscount = !empty($package['sale_price']) && $package['sale_price'] < $package['original_price'];
        $discountPercent = $hasDiscount ? round((($package['original_price'] - $finalPrice) / $package['original_price']) * 100) : 0;
        
        // Parse features JSON
        $features = !empty($package['features']) ? json_decode($package['features'], true) : [];
        
        // Simplified access - all users can access all packages
        $canAccess = true; // Everyone has access
        $hasIncompletExam = !empty($package['latest_exam_id']) && $package['latest_exam_status'] == EXAM_STATUS_IN_PROGRESS;
        
        $formattedPackage = [
            'package_id' => $package['package_id'],
            'package_name' => $package['package_name'],
            'package_slug' => $package['package_slug'],
            'package_description' => $package['package_description'],
            
            // Product info
            'product_id' => $package['product_id'],
            'product_name' => $package['product_name'],
            'product_type' => $package['product_type'],
            'product_description' => $package['product_description'],
            
            // Quiz config
            'question_count' => $package['question_count'],
            'questions_per_group' => $package['questions_per_group'],
            'time_limit_minutes' => $package['time_limit_minutes'],
            'report_type' => $package['report_type'],
            'features' => $features,
            
            // Pricing
            'is_free' => (bool)$package['is_free'],
            'original_price' => $package['original_price'],
            'sale_price' => $package['sale_price'],
            'final_price' => $finalPrice,
            'has_discount' => $hasDiscount,
            'discount_percent' => $discountPercent,
            'price_formatted' => $package['is_free'] ? 'Miễn phí' : number_format($finalPrice) . '₫',
            
            // Access info - simplified to open access for all
            'access_type' => 'open_access',
            'attempts_used' => 0,
            'max_attempts' => 999, // Unlimited
            'attempts_left' => 999,
            'expires_at' => null,
            'can_access' => $canAccess,
            
            // Exam status
            'has_incomplete_exam' => $hasIncompletExam,
            'latest_exam' => $hasIncompletExam ? [
                'exam_id' => $package['latest_exam_id'],
                'exam_code' => $package['latest_exam_code'],
                'start_time' => $package['latest_exam_start'],
                'progress' => $package['latest_exam_progress'] . '/' . $package['question_count']
            ] : null,
            
            // Action URLs - simplified for open access
            'actions' => [
                'start_quiz_url' => "/quiz?package_id={$package['package_id']}",
                'continue_quiz_url' => $hasIncompletExam ? "/quiz?exam_code={$package['latest_exam_code']}" : null,
                'purchase_url' => null, // No purchase needed
                'detail_url' => "/package-detail?id={$package['package_id']}"
            ]
        ];
        
        $formattedPackages[] = $formattedPackage;
    }
    
    // Response
    $response = [
        'status' => 'success',
        'message' => 'Lấy danh sách gói bài thi thành công',
        'data' => [
            'packages' => $formattedPackages,
            'summary' => [
                'total_packages' => count($formattedPackages),
                'free_packages' => count(array_filter($formattedPackages, fn($p) => $p['is_free'])),
                'accessible_packages' => count(array_filter($formattedPackages, fn($p) => $p['can_access'])),
                'incomplete_exams' => count(array_filter($formattedPackages, fn($p) => $p['has_incomplete_exam']))
            ],
            'user_id' => $userId
        ]
    ];
    
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Available Packages API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error_code' => 500,
        'message' => 'Lỗi hệ thống khi lấy danh sách gói bài thi',
        'debug' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'message' => $e->getMessage()
        ]
    ], JSON_UNESCAPED_UNICODE);
}

?>