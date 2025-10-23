<?php
/**
 * Authentication Middleware
 * PAC Group - Unlock Your Career
 * Middleware to check user authentication for protected routes
 */

/**
 * Check if user is authenticated
 * @return array|false Returns user data if authenticated, false otherwise
 */
function checkAuthentication($conn = null) {
    // Start session if not started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // If no database connection provided, return false
    if (!$conn) {
        return false;
    }
    
    // Get session token from cookie or session
    $sessionToken = $_COOKIE['pac_session_token'] ?? $_SESSION['session_token'] ?? null;
    
    if (!$sessionToken) {
        return false;
    }
    
    try {
        // Verify session in database
        $query = "SELECT s.*, u.id, u.fullname, u.email, u.username, u.role, u.status 
                  FROM sessions s 
                  INNER JOIN users u ON s.user_id = u.id 
                  WHERE s.session_token = ? AND s.expires_at > NOW() AND u.status = 'active'";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $sessionToken);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            // Clean up invalid session
            session_unset();
            session_destroy();
            
            // Clear cookies
            setcookie('pac_session_token', '', [
                'expires' => time() - 3600,
                'path' => '/',
                'domain' => '',
                'secure' => false,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            
            return false;
        }
        
        $sessionData = $result->fetch_assoc();
        
        // Update session variables
        $_SESSION['user_id'] = $sessionData['id'];
        $_SESSION['username'] = $sessionData['username'];
        $_SESSION['fullname'] = $sessionData['fullname'];
        $_SESSION['role'] = $sessionData['role'];
        $_SESSION['session_token'] = $sessionToken;
        $_SESSION['logged_in'] = true;
        
        // Update last activity
        $updateQuery = "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_token = ?";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bind_param("s", $sessionToken);
        $updateStmt->execute();
        $updateStmt->close();
        
        $stmt->close();
        
        return [
            'id' => $sessionData['id'],
            'username' => $sessionData['username'],
            'fullname' => $sessionData['fullname'],
            'email' => $sessionData['email'],
            'role' => $sessionData['role']
        ];
        
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Require authentication for API endpoint
 * @param mixed $conn Database connection
 * @param array $allowedRoles Optional array of allowed roles
 * @return array User data if authenticated
 */
function requireAuth($conn, $allowedRoles = []) {
    $user = checkAuthentication($conn);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Yêu cầu đăng nhập để truy cập',
            'authenticated' => false
        ]);
        exit();
    }
    
    // Check role permissions if specified
    if (!empty($allowedRoles) && !in_array($user['role'], $allowedRoles)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Không có quyền truy cập',
            'authenticated' => true
        ]);
        exit();
    }
    
    return $user;
}

/**
 * Verify session (alias for checkAuthentication with global connection)
 * @return array|false Returns user data if authenticated, false otherwise
 */
function verifySession() {
    // Get global database connection (PDO)
    global $pdo;
    
    // If PDO not available, try to get MySQL connection
    if (!$pdo) {
        global $conn;
        return checkAuthentication($conn);
    }
    
    // Start session if not started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Get session token from cookie or session
    $sessionToken = $_COOKIE['pac_session_token'] ?? $_SESSION['session_token'] ?? null;
    
    if (!$sessionToken) {
        return false;
    }
    
    try {
        // Verify session in database using PDO
        $query = "SELECT s.*, u.id, u.fullname, u.email, u.username, u.role, u.status 
                  FROM sessions s 
                  INNER JOIN users u ON s.user_id = u.id 
                  WHERE s.session_token = ? AND s.expires_at > NOW() AND u.status = 'active'";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([$sessionToken]);
        $sessionData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$sessionData) {
            // Clean up invalid session
            session_unset();
            session_destroy();
            
            // Clear cookies
            setcookie('pac_session_token', '', [
                'expires' => time() - 3600,
                'path' => '/',
                'domain' => '',
                'secure' => false,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            
            return false;
        }
        
        // Update session variables
        $_SESSION['user_id'] = $sessionData['id'];
        $_SESSION['username'] = $sessionData['username'];
        $_SESSION['fullname'] = $sessionData['fullname'];
        $_SESSION['role'] = $sessionData['role'];
        $_SESSION['session_token'] = $sessionToken;
        $_SESSION['logged_in'] = true;
        
        // Update last activity
        $updateQuery = "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_token = ?";
        $updateStmt = $pdo->prepare($updateQuery);
        $updateStmt->execute([$sessionToken]);
        
        return [
            'id' => $sessionData['id'],
            'username' => $sessionData['username'],
            'fullname' => $sessionData['fullname'],
            'email' => $sessionData['email'],
            'role' => $sessionData['role']
        ];
        
    } catch (Exception $e) {
        error_log("verifySession error: " . $e->getMessage());
        return false;
    }
}

/**
 * Get current user ID from session
 * @return int|null Returns user ID if authenticated, null otherwise
 */
function getCurrentUserId() {
    // Start session if not started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Try to get user ID from session first
    if (isset($_SESSION['user_id']) && $_SESSION['logged_in']) {
        return (int)$_SESSION['user_id'];
    }
    
    // If not in session, verify session and get user ID
    $user = verifySession();
    if ($user && isset($user['id'])) {
        return (int)$user['id'];
    }
    
    return null;
}

/**
 * Clean up expired sessions (should be called periodically)
 */
function cleanupExpiredSessions($conn) {
    try {
        $query = "DELETE FROM sessions WHERE expires_at < NOW()";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $deletedRows = $stmt->affected_rows;
        $stmt->close();
        
        return $deletedRows;
    } catch (Exception $e) {
        return false;
    }
}
?>
