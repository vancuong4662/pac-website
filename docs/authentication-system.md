# Authentication System - PAC Website

## 📋 Overview

PAC Website sử dụng hệ thống authentication dựa trên session-based cookies với dual-layer security: local client checks và server-side verification.

## 🏗️ Architecture

```
Frontend (authen.js) ←→ Backend (middleware.php) ←→ Database (sessions table)
```

## 🔧 Components

### 1. Frontend - AuthChecker Class (`assets/js/authen.js`)

#### Core Methods:

- **`getCurrentAuthStatus()`**: Quick local check (chỉ kiểm tra cookies)
- **`checkAuthStatus()`**: Comprehensive server verification
- **`quickAuthCheck()`**: Hybrid check for security-critical operations
- **`verifySession()`**: Direct API call to verify session
- **`handleProtectedPageAccess()`**: Auto-redirect for protected pages

#### Key Properties:
- Manages cookies: `pac_session_token` (httpOnly) và `pac_user_info` (readable)
- Auto-cleanup expired sessions
- Event-driven auth state changes

### 2. Backend - Middleware (`api/auth/middleware.php`)

#### Core Functions:

- **`verifySession()`**: Main auth function for API endpoints
- **`checkAuthentication($conn)`**: Legacy function with MySQL connection
- **`requireAuth($conn, $allowedRoles)`**: Force authentication with role check
- **`cleanupExpiredSessions($conn)`**: Maintenance function

#### Security Features:
- Database session validation
- Automatic session cleanup
- Role-based access control
- Cookie security settings

### 3. Database Schema

#### Sessions Table:
```sql
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔄 Authentication Flow

### 1. Login Process
```
User Login → Create Session → Set Cookies → Store in Database
    ↓
pac_session_token (httpOnly) + pac_user_info (readable)
```

### 2. Protected Page Access
```
Page Load → authChecker.handleProtectedPageAccess()
    ↓
Local Check → Server Verify → Allow/Redirect
```

### 3. API Call Authentication
```
API Request → verifySession() → Database Check → Allow/Deny
```

## 🍪 Cookie Management

### pac_session_token
- **Type**: httpOnly, secure
- **Purpose**: Server-side session validation
- **Lifetime**: Session-based (expires with login)
- **Access**: Server only (cannot be read by JavaScript)

### pac_user_info
- **Type**: Regular cookie (readable by JS)
- **Purpose**: Client-side user data display
- **Content**: JSON with user info (id, fullname, email, role)
- **Access**: Both client and server

## 🔒 Security Features

### Multi-Layer Verification
1. **Local Check**: Fast UI updates, không đảm bảo security
2. **Server Check**: Database validation, đảm bảo security tuyệt đối
3. **Hybrid Check**: Combination for performance + security

### Session Security
- HttpOnly cookies prevent XSS
- Database-backed sessions prevent tampering
- Automatic expiration và cleanup
- Role-based access control

### Error Handling
- Graceful degradation khi network issues
- Auto-cleanup invalid sessions
- User-friendly error messages
- Proper HTTP status codes

## 📝 Usage Examples

### Frontend - Protected Page
```javascript
// Auto-check for protected pages
document.addEventListener('DOMContentLoaded', async () => {
    const user = await authChecker.handleProtectedPageAccess('profile');
    if (user) {
        // User is authenticated
        console.log('Welcome', user.fullname);
    }
});
```

### Frontend - Cart Operations
```javascript
async function addToCart(packageId) {
    // Use quickAuthCheck for security-critical operations
    const authResult = await authChecker.quickAuthCheck();
    if (!authResult.authenticated) {
        authChecker.redirectToLogin('Vui lòng đăng nhập');
        return;
    }
    
    // Proceed with API call
    // API will also verify server-side
}
```

### Backend - API Endpoint
```php
<?php
require_once 'middleware.php';

// Verify session (throws 401 if not authenticated)
$user = verifySession();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// User is authenticated, proceed with business logic
echo json_encode(['message' => 'Hello ' . $user['fullname']]);
?>
```

### Backend - Role-based Access
```php
<?php
require_once 'middleware.php';

// Require admin role
$user = requireAuth($conn, ['admin']);

// Only admins reach this point
?>
```

## 🔧 Configuration

### Cookie Settings
```php
setcookie('pac_session_token', $token, [
    'expires' => time() + (24 * 60 * 60), // 24 hours
    'path' => '/',
    'domain' => '',
    'secure' => false, // Set true for HTTPS
    'httponly' => true, // Prevent JS access
    'samesite' => 'Lax'
]);
```

### Session Lifetime
- Default: 24 hours
- Configurable in login.php
- Auto-extends on activity

## 🛠️ Maintenance

### Session Cleanup
```php
// Call periodically (e.g., via cron)
$deletedSessions = cleanupExpiredSessions($conn);
echo "Cleaned up $deletedSessions expired sessions";
```

### Debug Mode
```javascript
// Enable debug logging
const authResult = await authChecker.checkAuthStatus(true);
console.log('Auth debug:', authResult);
```

## 🚨 Common Issues & Solutions

### Issue: "User not authenticated" despite login
**Causes:**
- Cookie domain/path mismatch
- Session expired in database
- Network issues during verification

**Solutions:**
1. Check cookie settings match domain
2. Verify database session exists
3. Clear cookies and re-login

### Issue: Infinite redirect loops
**Causes:**
- Auth check in login page
- Incorrect role permissions
- Broken auth middleware

**Solutions:**
1. Use `handleAuthPageAccess()` for login pages
2. Verify role requirements
3. Check middleware function exists

### Issue: Cart operations fail silently
**Causes:**
- Missing await in async auth checks
- Network errors not handled
- Frontend/backend auth mismatch

**Solutions:**
1. Always await `quickAuthCheck()`
2. Add proper error handling
3. Sync auth logic between layers

## 📊 Performance Considerations

### Frontend Optimization
- Use `getCurrentAuthStatus()` for UI updates
- Use `quickAuthCheck()` only for critical operations
- Cache auth results for short periods

### Backend Optimization
- Index session_token column
- Regular cleanup of expired sessions
- Use connection pooling

## 🔄 Migration & Updates

### Adding New Auth Requirements
1. Update `requireAuth()` function
2. Add role checks where needed
3. Update frontend auth calls
4. Test all protected endpoints

### Database Changes
1. Always backup sessions table
2. Update middleware queries
3. Test auth flow end-to-end
4. Update documentation

---

**Last Updated**: October 20, 2025  
**Version**: 2.0 (Updated with dual-layer security)  
**Maintainer**: PAC Development Team

## Legacy API Documentation

### API Endpoints

#### 1. Login - `/api/auth/login.php`
**Method:** POST
**Content-Type:** application/json

**Request body:**
```json
{
  "username": "string", // username hoặc email
  "password": "string",
  "remember": boolean   // optional, default false
}
```

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đăng nhập thành công!",
  "session_token": "string",
  "user": {
    "id": 1,
    "username": "string",
    "fullname": "string", 
    "email": "string",
    "role": "user"
  },
  "redirect_url": "/pac-new/",
  "remember": boolean,
  "expires_at": "2025-01-01 12:00:00"
}
```

#### 2. Logout - `/api/auth/logout.php`
**Method:** POST hoặc GET

#### 3. Verify Session - `/api/auth/verify-session.php`
**Method:** GET hoặc POST

#### 4. Session Cleanup - `/api/auth/cleanup-sessions.php`
**Method:** GET

## Error Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 400  | Bad Request (validation errors) |
| 401  | Unauthorized (invalid credentials/session) |
| 403  | Forbidden (insufficient permissions) |
| 405  | Method Not Allowed |
| 500  | Internal Server Error |