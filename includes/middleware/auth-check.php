<?php
/**
 * Authentication Middleware
 * Kiểm tra đăng nhập và quyền truy cập
 */

require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/error-codes.php';

/**
 * Require user authentication
 * @return array User info if authenticated
 * @throws Exception if not authenticated
 */
function requireAuth() {
    session_start();
    
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('Chưa đăng nhập', ERROR_UNAUTHORIZED);
    }
    
    return [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['email'] ?? '',
        'name' => $_SESSION['name'] ?? '',
        'role' => $_SESSION['role'] ?? USER_ROLE_USER,
        'isPaid' => $_SESSION['isPaid'] ?? false
    ];
}

/**
 * Require admin role
 * @return array User info if admin
 * @throws Exception if not admin
 */
function requireAdmin() {
    $user = requireAuth();
    
    if ($user['role'] !== USER_ROLE_ADMIN) {
        throw new Exception('Yêu cầu quyền admin', ERROR_FORBIDDEN);
    }
    
    return $user;
}

/**
 * Get current user (không throw exception)
 * @return array|null User info or null
 */
function getCurrentUser() {
    session_start();
    
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    
    return [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['email'] ?? '',
        'name' => $_SESSION['name'] ?? '',
        'role' => $_SESSION['role'] ?? USER_ROLE_USER,
        'isPaid' => $_SESSION['isPaid'] ?? false
    ];
}

/**
 * Check if user can access resource
 * @param int $resourceUserId Owner của resource
 * @param array|null $currentUser Current user (optional)
 * @return bool
 */
function canAccessUserResource($resourceUserId, $currentUser = null) {
    if ($currentUser === null) {
        $currentUser = getCurrentUser();
    }
    
    if (!$currentUser) {
        return false;
    }
    
    // Admin có thể access tất cả
    if ($currentUser['role'] === USER_ROLE_ADMIN) {
        return true;
    }
    
    // User chỉ access được resource của mình
    return $currentUser['id'] == $resourceUserId;
}

/**
 * Validate session and refresh if needed
 * @return bool Session is valid
 */
function validateSession() {
    session_start();
    
    if (!isset($_SESSION['user_id'])) {
        return false;
    }
    
    // Check session timeout
    if (isset($_SESSION['last_activity'])) {
        $timeout = SESSION_LIFETIME;
        if (time() - $_SESSION['last_activity'] > $timeout) {
            session_destroy();
            return false;
        }
    }
    
    // Update last activity
    $_SESSION['last_activity'] = time();
    
    return true;
}

/**
 * Start secure session
 */
function startSecureSession() {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path' => '/',
            'domain' => '',
            'secure' => isset($_SERVER['HTTPS']),
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        session_start();
    }
}

/**
 * Login user
 * @param array $userData User data
 */
function loginUser($userData) {
    startSecureSession();
    
    $_SESSION['user_id'] = $userData['id'];
    $_SESSION['email'] = $userData['email'];
    $_SESSION['name'] = $userData['name'] ?? '';
    $_SESSION['role'] = $userData['role'] ?? USER_ROLE_USER;
    $_SESSION['isPaid'] = $userData['isPaid'] ?? false;
    $_SESSION['last_activity'] = time();
    $_SESSION['login_time'] = time();
    
    // Regenerate session ID for security
    session_regenerate_id(true);
}

/**
 * Logout user
 */
function logoutUser() {
    session_start();
    session_destroy();
    
    // Clear session cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
}

/**
 * Check API key authentication (nếu có)
 * @param string $apiKey
 * @return bool
 */
function validateApiKey($apiKey) {
    // TODO: Implement API key validation
    // For now, return false (không support API key)
    return false;
}

/**
 * Middleware function để include vào các API endpoints
 */
function authMiddleware($requireAdmin = false) {
    try {
        if ($requireAdmin) {
            return requireAdmin();
        } else {
            return requireAuth();
        }
    } catch (Exception $e) {
        $errorCode = $e->getCode();
        $httpStatus = getHttpStatusForError($errorCode);
        
        http_response_code($httpStatus);
        echo json_encode(generateErrorResponse($errorCode, $e->getMessage()));
        exit;
    }
}

?>