# Development Notes - PAC Group Website

## URL Routing & Testing

### ✅ **Cơ chế URL Rewriting**
Project sử dụng `.htaccess` để tạo pretty URLs và routing:

```apache
# Pretty URLs for main pages
RewriteRule ^$ index.html [L]
RewriteRule ^home/?$ index.html [L]
RewriteRule ^profile/?$ templates/profile.html [L]
RewriteRule ^payment-history/?$ templates/payment-history.html [L]
```

### 🎯 **Testing Pages**
- **KHÔNG cần tạo test files** như `test-pages.html`
- **Test trực tiếp** qua URL routing:
  - `http://localhost/pac-new/profile` → `templates/profile.html`
  - `http://localhost/pac-new/payment-history` → `templates/payment-history.html`
- **Luôn kiểm tra `.htaccess`** trước khi tạo test files

### 📝 **Route Management**
Khi tạo trang mới, cần:
1. Tạo template file trong `templates/`
2. Thêm route vào `.htaccess`
3. Test trực tiếp qua pretty URL

## Documentation Guidelines

### 📋 **Khi nào tạo documentation:**
- ✅ **Chỉ tạo khi được yêu cầu explicitly**
- ✅ Cho các tính năng phức tạp hoặc có integration đặc biệt
- ❌ **Không tự động tạo doc** cho features đơn giản
- ❌ Tránh over-documentation

### 📋 **Khi nào tạo file test:**
- ✅ **Chỉ tạo khi được yêu cầu explicitly hoặc đã sửa một lỗi rất nhiều nhưng không được**
- ✅ Cho các tính năng phức tạp hoặc có integration đặc biệt
- ❌ **Không tự động tạo test** cho features đơn giản

### 📁 **Documentation Structure:**
```
docs/
├── dev-note.md (file này - ghi nhận kinh nghiệm)
├── component-system.md (hệ thống component)
├── deployment-guide.md (triển khai)
└── [other docs khi cần thiết]
```

## Component Architecture

### 🏗️ **Component Loading System**
- Sử dụng `component-loader.js` để load components động
- Shared components: `header.html`, `footer.html`, `profile-sidebar.html`
- **Page-specific config format (Standardized)**:
  ```javascript
  window.pageComponentsConfig = {
    sidebar: 'profile-sidebar.html' // Object format - preferred
  };
  ```
- **Legacy array format** vẫn được support để backward compatibility
- Standard container IDs: `#profile-sidebar`, `#header-section`, `#footer-section`

### 🎨 **CSS Organization**
- Main styles trong `assets/css/main.css`
- Page-specific sections với clear headers
- Shared styles cho common elements (như page headers)

### 📱 **Responsive Design**
- Mobile-first approach
- Consistent breakpoints: 576px, 768px, 991.98px
- Shared margin-top fixes cho fixed header

## Code Patterns

### 🔧 **JavaScript Classes**
- Manager classes cho each page logic: `PaymentHistoryManager`, `ProfileManager`
- Global initialization trong DOMContentLoaded
- Export for global access pattern

### 🎯 **Navigation Handling**
- Active state management trong component-loader
- URL-based active detection
- Consistent navigation structure

## Lessons Learned

### ❌ **Mistakes to Avoid:**
1. **Tạo test files không cần thiết** khi đã có routing
2. **Over-documentation** cho features đơn giản
3. Duplicate CSS cho similar pages
4. Hard-coded values thay vì sử dụng CSS variables
5. **Type mismatch trong function parameters** - Check data types before processing
6. **📍 ĐƯỜNG DẪN SAI - QUY TẮC ĐƯỜNG DẪN CHÍNH XÁC:**
   
   **❌ SAI - Absolute paths với `/pac-new/` prefix:**
   ```javascript
   // SAI: Đừng dùng /pac-new/ prefix
   fetch('/pac-new/api/services/list.php')
   fetch('/pac-new/assets/css/main.css')  
   fetch('/pac-new/components/header.html')
   ```
   
   **✅ ĐÚNG - Relative paths từ document root:**
   ```javascript
   // ĐÚNG: Bỏ /pac-new/ prefix, bắt đầu từ folder con
   fetch('api/services/list.php')          // Khi đang ở /pac-new/
   fetch('assets/css/main.css')            // Khi đang ở /pac-new/  
   fetch('components/header.html')         // Khi đang ở /pac-new/
   ```
   
   **🎯 QUY TẮC CỤ THỂ:**
   - **Browser context**: Khi file HTML được load từ `http://localhost/pac-new/`, 
     thì đường dẫn `api/services/list.php` sẽ resolve thành `http://localhost/pac-new/api/services/list.php`
   - **Rule**: Luôn bỏ `/pac-new/` prefix, chỉ giữ đường dẫn từ folder con
   - **Pattern**: Follow pattern của `login.html` và `profile.js`
   
   **📂 Examples theo vị trí file:**
   ```
   From: /pac-new/index.html → 'api/auth/login.php'
   From: /pac-new/templates/profile.html → '../api/auth/login.php' 
   From: /pac-new/api/services/test.html → '../auth/login.php'
   ```

### 🐛 **Common JavaScript Errors:**
- **`components.filter is not a function`**: Xảy ra khi pass object thay vì array
- **Component loading config**: Support cả object và array format cho backward compatibility
- **DOM query selector**: Check element exists trước khi process
- **Container ID mismatch**: Đảm bảo target containers có consistent naming

### ✅ **Best Practices:**
1. **Check existing infrastructure** trước khi tạo workarounds
2. **Reuse components** và shared styles
3. **Test qua actual URLs** thay vì direct file access
4. **Minimal documentation** unless requested
5. **Consistent naming** và structure patterns
6. **Validate data types** trước khi xử lý trong functions
7. **📍 LUÔN DÙNG RELATIVE PATHS** - assets/, api/, components/ (NO /pac-new/ prefix!)

## Project Structure Understanding

```
pac-new/
├── .htaccess (URL routing - KEY FILE!)
├── index.html
├── templates/
│   ├── profile.html
│   ├── payment-history.html
│   └── [other pages]
├── components/
│   ├── header.html
│   ├── footer.html
│   ├── profile-sidebar.html
│   └── [shared components]
├── assets/
│   ├── css/main.css
│   ├── js/
│   │   ├── component-loader.js
│   │   ├── profile.js
│   │   ├── payment-history.js
│   │   └── main.js
│   └── [other assets]
└── docs/
    └── [documentation when needed]
```

## Future Development Notes

### 🚀 **When Adding New Pages:**
1. Create template in `templates/`
2. Add route to `.htaccess` 
3. Create page-specific JS if needed
4. Add CSS section to `main.css`
5. Update navigation if needed
6. Test via pretty URL

### 🔄 **When Refactoring:**
- Always check for reusable components first
- Maintain consistent patterns
- Update this dev-note.md with new learnings

## 🚨 QUICK REFERENCE - ĐƯỜNG DẪN

**❌ ĐỪNG BAO GIỜ DÙNG:**
```
/pac-new/api/services/list.php
/pac-new/assets/css/main.css
```

**✅ LUÔN DÙNG:**
```
api/services/list.php        (từ root /pac-new/)
assets/css/main.css          (từ root /pac-new/)
../api/auth/login.php        (từ subfolder)
```

---
*Updated: September 2025*
