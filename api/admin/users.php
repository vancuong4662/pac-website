<?php
/**
 * Admin Users API
 * Handles user listing, filtering, search, and details
 */

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Require database connection
require_once '../../config/db-pdo.php';

// Use $conn from db-pdo.php
$pdo = $conn;

// Log request
error_log("Users API Request - Method: " . $_SERVER['REQUEST_METHOD'] . ", Query: " . json_encode($_GET));

try {
    // Get action
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            $result = getAllUsers($pdo);
            break;
            
        case 'detail':
            $userId = $_GET['user_id'] ?? null;
            if (!$userId) {
                throw new Exception('User ID is required');
            }
            $result = getUserDetails($pdo, $userId);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log("Users API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Get all users with filters
 */
function getAllUsers($pdo) {
    try {
        // Build query
        $sql = "SELECT 
                    id as user_id,
                    fullname as full_name,
                    email,
                    phone,
                    birth_date as date_of_birth,
                    address,
                    username,
                    role,
                    status,
                    email_verified,
                    created_at,
                    updated_at
                FROM users
                WHERE 1=1";
        
        $params = [];
        
        // Apply filters
        if (!empty($_GET['role'])) {
            $sql .= " AND role = :role";
            $params[':role'] = $_GET['role'];
        }
        
        if (!empty($_GET['status'])) {
            $sql .= " AND status = :status";
            $params[':status'] = $_GET['status'];
        }
        
        if (!empty($_GET['search'])) {
            $search = '%' . $_GET['search'] . '%';
            $sql .= " AND (full_name LIKE :search OR email LIKE :search2 OR phone LIKE :search3 OR user_id LIKE :search4)";
            $params[':search'] = $search;
            $params[':search2'] = $search;
            $params[':search3'] = $search;
            $params[':search4'] = $search;
        }
        
        // Order by created_at DESC
        $sql .= " ORDER BY created_at DESC";
        
        // Execute query
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate statistics
        $statistics = calculateStatistics($pdo, $users);
        
        return [
            'success' => true,
            'data' => [
                'users' => $users,
                'statistics' => $statistics
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error fetching users: ' . $e->getMessage());
    }
}

/**
 * Get user details with purchase statistics
 */
function getUserDetails($pdo, $userId) {
    try {
        // Get user info
        $stmt = $pdo->prepare("
            SELECT 
                id as user_id,
                fullname as full_name,
                email,
                phone,
                birth_date as date_of_birth,
                address,
                username,
                role,
                status,
                email_verified,
                created_at,
                updated_at
            FROM users
            WHERE id = :user_id
        ");
        
        $stmt->execute([':user_id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('User not found');
        }
        
        // Get purchase statistics
        $purchaseStats = getPurchaseStatistics($pdo, $userId);
        $user['purchase_stats'] = $purchaseStats;
        
        return [
            'success' => true,
            'data' => $user
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error fetching user details: ' . $e->getMessage());
    }
}

/**
 * Get purchase statistics for a user
 */
function getPurchaseStatistics($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_spent,
                MAX(created_at) as last_order_date
            FROM orders
            WHERE user_id = :user_id AND payment_status = 'paid'
        ");
        
        $stmt->execute([':user_id' => $userId]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'total_orders' => intval($stats['total_orders'] ?? 0),
            'total_spent' => floatval($stats['total_spent'] ?? 0),
            'last_order_date' => $stats['last_order_date']
        ];
        
    } catch (Exception $e) {
        return [
            'total_orders' => 0,
            'total_spent' => 0,
            'last_order_date' => null
        ];
    }
}

/**
 * Calculate statistics
 */
function calculateStatistics($pdo, $users) {
    $stats = [
        'totalUsers' => count($users),
        'activeUsers' => 0,
        'adminUsers' => 0,
        'verifiedUsers' => 0
    ];
    
    foreach ($users as $user) {
        // Active users
        if ($user['status'] === 'active') {
            $stats['activeUsers']++;
        }
        
        // Admin users
        if ($user['role'] === 'admin') {
            $stats['adminUsers']++;
        }
        
        // Verified users
        if ($user['email_verified']) {
            $stats['verifiedUsers']++;
        }
    }
    
    return $stats;
}
