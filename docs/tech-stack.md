# Tech Stack

## Frontend
- **HTML5** với semantic markup
- **Bootstrap 5.3.7** cho responsive design
- **Montserrat Font** theo PAC Group brand guidelines cho website "Unlock Your Career"
- **AOS** cho scroll animations
- **GLightbox** cho lightbox functionality
- **Swiper** cho carousels/sliders
- **Toastbar Library** cho notification system

## Backend
- **PHP** cho API endpoints
- **MySQL** database
- **XAMPP** development environment

## Component Architecture
- **Modular HTML Components** trong `/components`
- **Dynamic Component Loader** với caching
- **CORS-enabled** component access
- **Preloader Integration** cho smooth UX

## Color Palette (PAC Group Brand)
```css
:root {
  /* Brand Colors - PAC Group Identity cho website "Unlock Your Career" */
  --brand-primary: #964bdf;     /* PAC Purple - Main brand color */
  --brand-secondary: #5d2e8b;   /* PAC Dark Purple - Secondary brand */
  --brand-accent: #fff200;      /* PAC Yellow - Highlight/accent */
  
  /* Base Colors */
  --background-color: #ffffff;   /* Clean white background */
  --default-color: #374151;     /* Body text - neutral dark gray */
  --heading-color: #1f2937;     /* Headings - darker gray */
  --accent-color: #964bdf;      /* Primary purple for interactions */
  
  /* Supporting Colors */
  --secondary-color: #059669;   /* Success/growth green */
  --neutral-gray: #6b7280;      /* Subtle elements */
  
  /* Background Variations */
  --bg-light: #f8f9ff;         /* Light purple tint backgrounds */
  --bg-secondary: #fafafa;      /* Neutral section backgrounds */
  --bg-accent: rgba(255, 242, 0, 0.1); /* Light yellow backgrounds */
  
  /* Navigation Colors */
  --nav-color: #374151;         /* Navigation text */
  --nav-hover-color: #964bdf;   /* Navigation hover - PAC purple */
}
```

## Browser Support
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Toastbar Notification System

### 📋 **Overview**
Thư viện Toastbar được tích hợp để hiển thị thông báo người dùng một cách chuyên nghiệp và hiện đại, thay thế cho alert() truyền thống.

### 📁 **File Structure**
```
assets/
├── css/
│   └── toastbar.css      # Styling cho toast notifications
└── js/
    └── toastbar.js       # Logic và API functions
```

### 🔧 **Integration**
```html
<!-- CSS -->
<link href="assets/css/toastbar.css" rel="stylesheet">

<!-- JavaScript -->
<script src="assets/js/toastbar.js"></script>
```

### 🎯 **Usage Examples**
```javascript
// Basic toast
showToast('Tiêu đề', 'Nội dung thông báo', 'info', 3000);

// Success notification
showToast('Thành công!', 'Đăng nhập thành công!', 'success', 2000);

// Error notification
showToast('Lỗi', 'Tên đăng nhập không chính xác', 'error', 5000);

// Warning notification
showToast('Cảnh báo', 'Vui lòng kiểm tra lại thông tin', 'warning', 4000);
```

### 🎨 **Toast Types & Colors**
1. **Success** (`success`): Màu xanh lá - cho thông báo thành công
2. **Error** (`error`): Màu đỏ - cho thông báo lỗi
3. **Warning** (`warning`): Màu vàng - cho cảnh báo
4. **Info** (`info`): Màu xanh dương - cho thông tin chung

### ⚡ **API Reference**
```javascript
showToast(title, message, type, lifeSpan)
```

**Parameters:**
- `title` (string): Tiêu đề toast
- `message` (string): Nội dung chi tiết
- `type` (string): Loại toast (`success`, `error`, `warning`, `info`)
- `lifeSpan` (number): Thời gian hiển thị (milliseconds)

**Additional Functions:**
- `removeToast(id)`: Xóa toast với animation
- `removeToastInstant(id)`: Xóa toast ngay lập tức

### 🎭 **Animation & UX**
- **Fade In**: Toast xuất hiện từ bên phải với slide animation
- **Fade Out**: Tự động biến mất với fade + slide up
- **Close Button**: Người dùng có thể đóng thủ công
- **Auto-remove**: Tự động xóa sau thời gian thiết lập

### 📱 **Responsive Design**
- **Desktop**: Fixed position top-right với max-width 400px
- **Mobile**: Full-width với padding margins
- **Tablet**: Adaptive sizing theo viewport

### ⚙️ **Customization Notes**
1. **Font Integration**: Kế thừa font Montserrat từ PAC Group theme
2. **Color Preservation**: Giữ nguyên màu sắc gốc của thư viện
3. **Mobile Optimization**: Custom responsive cho màn hình nhỏ
4. **Z-index**: Set cao (9999) để hiển thị trên tất cả elements

### 💡 **Best Practices**
- **Success**: 2-3 giây (ngắn, người dùng đã biết thành công)
- **Error**: 5-6 giây (dài hơn để người dùng đọc kỹ)
- **Warning**: 4-5 giây (trung bình)
- **Info**: 3-4 giây (tùy độ quan trọng)

### 🚨 **Implementation Guidelines**
- Thay thế tất cả `alert()`, `confirm()` bằng toast
- Sử dụng type phù hợp với ngữ cảnh
- Title ngắn gọn, message mô tả rõ ràng
- Không spam toast (throttle nếu cần)
- Test trên mobile devices

## Modern Frontend Architecture Trends

### Form-less Interaction Pattern
Dự án PAC Group đã áp dụng xu hướng hiện đại trong việc **không sử dụng hệ thống form truyền thống** (`<form>` elements) mà thay vào đó sử dụng:

#### 🔄 **XHR/Fetch API Integration**
```javascript
// Thay vì form submission
const xhr = new XMLHttpRequest();
xhr.open('POST', '/api/auth/login.php', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify(data));
```

#### ✅ **Lợi ích của Pattern này:**

1. **Better UX Control**
   - Không reload trang
   - Loading states tùy chỉnh
   - Real-time validation
   - Smooth animations

2. **API-First Architecture**
   - RESTful endpoints
   - JSON data exchange
   - Microservices ready
   - Mobile app compatibility

3. **Enhanced Security**
   - CSRF protection through headers
   - Token-based authentication
   - Custom error handling
   - Request timeout control

4. **Modern JavaScript Practices**
   - Event-driven architecture
   - Promise-based async operations
   - Modular code structure
   - Better error boundaries

#### 🛠 **Implementation Example (Login Page)**
```html
<!-- Traditional Form (KHÔNG sử dụng) -->
<form method="POST" action="login.php">
  <!-- form fields -->
</form>

<!-- Modern Approach (ĐÃ áp dụng) -->
<div class="login-form">
  <input type="text" id="username">
  <input type="password" id="password">
  <button onclick="handleLogin()">Đăng Nhập</button>
</div>
```

#### 📱 **Mobile & SPA Ready**
- Single Page Application (SPA) architecture
- Progressive Web App (PWA) compatibility
- Better mobile performance
- Consistent API across platforms

#### 🔐 **Security Enhancements**
- JWT token authentication
- Custom headers validation
- Request origin verification
- Rate limiting integration

Xu hướng này đang được áp dụng rộng rãi bởi các framework hiện đại như **React**, **Vue**, **Angular** và các ứng dụng enterprise scale.
