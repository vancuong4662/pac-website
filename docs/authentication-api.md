# Authentication API Documentation

## Tổng quan
Hệ thống xác thực đã được cập nhật để hỗ trợ quản lý session trên server với các tính năng:
- Session management với database
- Token-based authentication
- Cookie storage
- Session cleanup
- Role-based access control

## Cấu trúc Database

### Bảng `users`
Chứa thông tin người dùng cơ bản (đã có sẵn)

### Bảng `sessions` (mới)
Chứa thông tin phiên đăng nhập:
```sql
- id: ID session
- user_id: ID người dùng
- session_token: Token phiên (unique)
- expires_at: Thời gian hết hạn
- user_agent: Thông tin trình duyệt
- ip_address: Địa chỉ IP
- is_remember: Có phải "Remember me"
- created_at, updated_at: Thời gian tạo/cập nhật
```

## API Endpoints

### 1. Login - `/api/auth/login.php`
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

**Cookies được set:**
- `pac_session_token`: Session token (HttpOnly)
- `pac_user_info`: Thông tin user (có thể đọc bằng JS)

### 2. Logout - `/api/auth/logout.php`
**Method:** POST hoặc GET

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đăng xuất thành công!",
  "redirect_url": "/pac-new/"
}
```

### 3. Verify Session - `/api/auth/verify-session.php`
**Method:** GET hoặc POST

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Phiên đăng nhập hợp lệ",
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "string",
    "fullname": "string",
    "email": "string", 
    "role": "user"
  },
  "expires_at": "2025-01-01 12:00:00"
}
```

**Response thất bại (401):**
```json
{
  "success": false,
  "message": "Phiên đăng nhập đã hết hạn",
  "authenticated": false
}
```

### 4. Session Cleanup - `/api/auth/cleanup-sessions.php`
**Method:** GET
**Mục đích:** Dọn dẹp các session hết hạn

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Dọn dẹp phiên hết hạn thành công",
  "deleted_sessions": 5
}
```

## Middleware Usage

### Authentication Middleware - `/api/auth/middleware.php`

**Sử dụng trong API cần xác thực:**
```php
<?php
require_once '../config/db.php';
require_once 'auth/middleware.php';

// Yêu cầu đăng nhập
$user = requireAuth($conn);

// Yêu cầu đăng nhập với role cụ thể
$user = requireAuth($conn, ['admin', 'moderator']);

// Chỉ kiểm tra xác thực không thoát
$user = checkAuthentication($conn);
if (!$user) {
    // Xử lý khi chưa đăng nhập
}
?>
```

## Security Features

### Session Security
- Session token được tạo ngẫu nhiên (32 bytes)
- Lưu trữ thông tin session trong database
- Tự động dọn dẹp session cũ (giữ tối đa 5 session/user)
- Session có thời gian hết hạn
- Xóa session khi logout

### Cookie Security
- HttpOnly cho session token
- SameSite protection
- Secure flag (nên bật trong production)
- Automatic cleanup khi hết hạn

### Password Security
- Password được lưu dạng plain text (theo yêu cầu)
- Brute force protection (delay khi sai)
- Account status validation

## Configuration

### Production Settings
Trong môi trường production, cần cập nhật:

1. **CORS Settings:**
```php
header('Access-Control-Allow-Origin: https://yourdomain.com');
```

2. **Cookie Security:**
```php
'secure' => true, // Require HTTPS
```

3. **Database:**
- Sử dụng password mạnh cho database
- Limit database user permissions

### Cleanup Schedule
Nên chạy cleanup sessions định kỳ:
```bash
# Crontab entry (chạy mỗi giờ)
0 * * * * curl http://localhost/pac-new/api/auth/cleanup-sessions.php
```

## Frontend Integration

### JavaScript Example
```javascript
// Login
async function login(username, password, remember = false) {
    const response = await fetch('/pac-new/api/auth/login.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
            username,
            password, 
            remember
        })
    });
    
    const data = await response.json();
    return data;
}

// Check authentication
async function checkAuth() {
    const response = await fetch('/pac-new/api/auth/verify-session.php', {
        credentials: 'include'
    });
    
    const data = await response.json();
    return data;
}

// Logout
async function logout() {
    const response = await fetch('/pac-new/api/auth/logout.php', {
        method: 'POST',
        credentials: 'include'
    });
    
    const data = await response.json();
    return data;
}
```

## Error Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 400  | Bad Request (validation errors) |
| 401  | Unauthorized (invalid credentials/session) |
| 403  | Forbidden (insufficient permissions) |
| 405  | Method Not Allowed |
| 409  | Conflict (duplicate username/email) |
| 422  | Unprocessable Entity (validation errors) |
| 500  | Internal Server Error |
