# Đường dẫn tương đối vs tuyệt đối - Lỗi thường gặp của AI Coding

## Vấn đề AI hay hiểu nhầm

Khi làm việc với đường dẫn trong web development, AI coding thường hiểu nhầm khi nào dùng đường dẫn tương đối, khi nào dùng tuyệt đối, đặc biệt khi có URL rewrite.

## Case Study: Trang đăng ký với URL Rewrite

### Cấu hình .htaccess
```apache
RewriteRule ^dangky/?$ templates/register.html [L]
```

### File structure
```
/pac-new/
  ├── templates/
  │   └── register.html
  ├── assets/
  │   └── js/access.js
  └── api/
      └── auth/register.php
```

### AI thường hiểu nhầm thế này:

**❌ Sai - Thinking process của AI:**
> "Vì file `register.html` nằm trong `templates/` nên khi load JS/CSS/API phải dùng `../` để lùi về root"

```html
<!-- AI nghĩ phải như này -->
<link href="../assets/css/main.css" rel="stylesheet">
<script src="../assets/js/access.js"></script>
```

```javascript
// AI nghĩ API path phải như này
API_BASE_URL: '../api/auth'  // WRONG!
```

**✅ Đúng - Thực tế:**
> "URL trên browser là `/dangky` (root level), nên tất cả paths đều tính từ root"

```html
<!-- Đúng -->
<link href="assets/css/main.css" rel="stylesheet">
<script src="assets/js/access.js"></script>
```

```javascript
// Đúng
API_BASE_URL: 'api/auth'  // CORRECT!
```

## Nguyên lý cốt lõi

### 1. AI nhầm lẫn giữa "File Location" và "URL Context"

```
File Location:     /templates/register.html  
URL Context:       /dangky
Browser context:   /dangky (root level)
```

### 2. Quy tắc vàng
**Tất cả đường dẫn trong HTML/JS đều tính từ URL trên browser, KHÔNG phải từ file location**

### 3. So sánh sai vs đúng

| Scenario | AI thường làm (SAI) | Đúng phải làm |
|----------|-------------------|---------------|
| CSS path | `../assets/main.css` | `assets/main.css` |
| JS path | `../assets/app.js` | `assets/app.js` |
| API call | `../api/endpoint` | `api/endpoint` |
| Image | `../images/logo.png` | `images/logo.png` |

## Các trường hợp phổ biến

### Case 1: Root level rewrite
```apache
RewriteRule ^login/?$ templates/login.html [L]
```
- **URL:** `/login` (root level)
- **Paths:** `assets/`, `api/`, `images/` (không có `../`)

### Case 2: One level deep rewrite  
```apache
RewriteRule ^user/profile/?$ templates/user/profile.html [L]
```
- **URL:** `/user/profile` (one level deep)
- **Paths:** `../assets/`, `../api/`, `../images/` (cần `../` để lùi về root)

### Case 3: Multi-level rewrite
```apache
RewriteRule ^admin/user/settings/?$ templates/admin/user/settings.html [L]
```
- **URL:** `/admin/user/settings` (two levels deep)
- **Paths:** `../../assets/`, `../../api/` (cần `../../` để lùi về root)

## Công thức tính đường dẫn

### Bước 1: Xác định URL depth
```
URL: /page              → depth = 0 (root level)
URL: /folder/page       → depth = 1  
URL: /a/b/page         → depth = 2
URL: /a/b/c/page       → depth = 3
```

### Bước 2: Tính số lần `../` cần thiết
```
depth = 0 → không cần ../    → 'assets/'
depth = 1 → cần 1 lần ../    → '../assets/' 
depth = 2 → cần 2 lần ../    → '../../assets/'
```

### Bước 3: Áp dụng
```javascript
// URL: /dangky (depth = 0)
assets: 'assets/css/main.css'     // ✅
api: 'api/auth/login.php'         // ✅

// URL: /user/profile (depth = 1)  
assets: '../assets/css/main.css'  // ✅
api: '../api/auth/login.php'      // ✅
```

## Debug Methods

### 1. Console kiểm tra URL
```javascript
console.log('URL:', window.location.pathname);
console.log('URL depth:', window.location.pathname.split('/').length - 2);
```

### 2. Test đường dẫn
```javascript
// Test một đường dẫn
const testPath = 'api/auth/register.php';
console.log('Full URL:', new URL(testPath, window.location.href).href);
```

### 3. Network tab
- Mở Developer Tools → Network  
- Xem request URLs có đúng không
- 404 = sai đường dẫn
- 200 = đúng đường dẫn

## Lưu ý cho AI Developers

### ❌ Đừng làm thế này:
1. Nhìn vào file location để tính path
2. Dùng `../` khi URL ở root level  
3. Quên kiểm tra URL depth
4. Copy-paste paths không suy nghĩ

### ✅ Hãy làm thế này:
1. Luôn xem URL trên browser trước
2. Tính depth của URL 
3. Áp dụng công thức `../` theo depth
4. Test bằng console.log
5. Kiểm tra Network tab

## Checklist cho AI

Trước khi viết đường dẫn, hãy trả lời:

- [ ] URL trên browser là gì? (không phải file location)
- [ ] URL có bao nhiêu level deep?
- [ ] Cần bao nhiêu `../` để về root?
- [ ] Đã test bằng console.log chưa?
- [ ] Đã kiểm tra Network tab chưa?

## Tóm tắt

**Quy tắc duy nhất:** Đường dẫn luôn tính từ URL trên browser, không phải từ file location.

**Công thức:** 
- URL depth 0 = không cần `../`
- URL depth 1 = cần 1 lần `../` 
- URL depth n = cần n lần `../`

**Nhớ:** URL Rewrite chỉ thay đổi file được serve, context vẫn là URL gốc!
