# Kế hoạch phát triển hệ thống giỏ hàng và bán sản phẩm

## Tổng quan hệ thống

Website sẽ có 2 loại sản phẩm chính:
1. **Khóa học**: Sản phẩm offline với mã khóa học
2. **Giải pháp**: Chia làm 2 loại con
   - Trắc nghiệm online (2 gói)
   - Tư vấn offline với chuyên gia (2 gói)

## Cấu trúc Database

### 1. Bảng sản phẩm (products)
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    type ENUM('course', 'online_test', 'consultation') NOT NULL,
    package_type VARCHAR(50), -- 'basic', 'premium' cho giải pháp
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Bảng giỏ hàng (cart)
```sql
CREATE TABLE cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 3. Bảng đơn hàng (orders)
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4. Bảng chi tiết đơn hàng (order_items)
```sql
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 5. Bảng khóa học đã mua (purchased_courses)
```sql
CREATE TABLE purchased_courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    course_code VARCHAR(50) UNIQUE NOT NULL, -- Mã khóa học duy nhất
    status ENUM('active', 'used', 'expired') DEFAULT 'active',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 6. Bảng trắc nghiệm đã mua (purchased_tests)
```sql
CREATE TABLE purchased_tests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    test_token VARCHAR(100) UNIQUE NOT NULL, -- Token để truy cập trắc nghiệm
    attempts_left INT DEFAULT 1, -- Số lần làm bài còn lại
    status ENUM('active', 'completed', 'expired') DEFAULT 'active',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 7. Bảng tư vấn đã đặt (consultation_bookings)
```sql
CREATE TABLE consultation_bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    consultation_code VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'scheduled', 'completed', 'cancelled') DEFAULT 'pending',
    scheduled_at TIMESTAMP NULL,
    expert_id INT NULL, -- ID của chuyên gia được phân công
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 8. Bảng chuyên gia (experts)
```sql
CREATE TABLE experts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    specialty VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Cấu trúc Frontend

### 1. Trang sản phẩm
- `/products` - Danh sách tất cả sản phẩm
- `/products/courses` - Danh sách khóa học
- `/products/solutions` - Danh sách giải pháp
- `/products/{id}` - Chi tiết sản phẩm

### 2. Giỏ hàng
- `/cart` - Trang giỏ hàng
- Component: `cart-item.html`, `cart-summary.html`

### 3. Thanh toán
- `/checkout` - Trang thanh toán
- `/order-confirmation/{order_id}` - Trang xác nhận đơn hàng

### 4. Quản lý mua hàng
- `/my-purchases` - Lịch sử mua hàng
- `/my-courses` - Khóa học đã mua
- `/my-tests` - Trắc nghiệm đã mua
- `/my-consultations` - Lịch tư vấn

### 5. Trắc nghiệm
- `/test/{token}` - Trang làm trắc nghiệm với token

## Cấu trúc Backend API

### 1. API Sản phẩm
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/{id}` - Lấy chi tiết sản phẩm
- `POST /api/admin/products` - Thêm sản phẩm (Admin)
- `PUT /api/admin/products/{id}` - Cập nhật sản phẩm (Admin)
- `DELETE /api/admin/products/{id}` - Xóa sản phẩm (Admin)

### 2. API Giỏ hàng
- `GET /api/cart` - Lấy giỏ hàng hiện tại
- `POST /api/cart/add` - Thêm sản phẩm vào giỏ
- `PUT /api/cart/update/{item_id}` - Cập nhật số lượng
- `DELETE /api/cart/remove/{item_id}` - Xóa sản phẩm khỏi giỏ
- `DELETE /api/cart/clear` - Xóa toàn bộ giỏ hàng

### 3. API Đặt hàng
- `POST /api/orders/create` - Tạo đơn hàng
- `GET /api/orders` - Lấy lịch sử đơn hàng
- `GET /api/orders/{id}` - Lấy chi tiết đơn hàng
- `POST /api/orders/{id}/payment` - Xử lý thanh toán

### 4. API Sản phẩm đã mua
- `GET /api/purchases/courses` - Khóa học đã mua
- `GET /api/purchases/tests` - Trắc nghiệm đã mua
- `GET /api/purchases/consultations` - Tư vấn đã đặt
- `POST /api/tests/access/{token}` - Truy cập trắc nghiệm

### 5. API Admin Dashboard
- `GET /api/admin/dashboard/courses` - Quản lý khóa học đã bán
- `GET /api/admin/dashboard/consultations` - Quản lý lịch tư vấn
- `POST /api/admin/consultations/{id}/schedule` - Đặt lịch tư vấn
- `GET /api/admin/sales-report` - Báo cáo doanh thu

## Kế hoạch triển khai

### Bước 1: Thiết lập cơ sở dữ liệu
1. **Tạo cấu trúc database**
   - Tạo các bảng SQL trong `sql/`
   - Script migration và seed data
   - Cập nhật `config/db.php` nếu cần

### Bước 2: Phát triển API sản phẩm
1. **API Sản phẩm cơ bản**
   - `api/products/` folder structure
   - `list.php` - Lấy danh sách sản phẩm
   - `detail.php` - Chi tiết sản phẩm
   - `admin-manage.php` - CRUD sản phẩm cho admin

### Bước 3: Phát triển API giỏ hàng
1. **API Giỏ hàng**
   - `api/cart/` folder
   - `get.php`, `add.php`, `update.php`, `remove.php`, `clear.php`
   - Session hoặc database storage cho giỏ hàng

### Bước 4: Phát triển API đặt hàng
1. **API Đặt hàng cơ bản**
   - `api/orders/` folder
   - `create.php`, `list.php`, `detail.php`

2. **Logic xử lý sau mua hàng**
   - `api/orders/process-purchase.php`
   - Tạo mã khóa học, token trắc nghiệm
   - Ghi nhận vào các bảng tương ứng

### Bước 5: API quản lý sản phẩm đã mua
1. **API lấy sản phẩm đã mua**
   - `api/purchases/` folder
   - `courses.php`, `tests.php`, `consultations.php`

### Bước 6: Phát triển giao diện sản phẩm
1. **Trang sản phẩm**
   - `templates/products.html`
   - `templates/product-detail.html`
   - `components/product-card.html`
   - `assets/js/products.js`

### Bước 7: Phát triển giao diện giỏ hàng
1. **Giỏ hàng**
   - `templates/cart.html`
   - `components/cart-item.html`
   - `assets/js/cart.js`
   - Tích hợp AJAX để cập nhật giỏ hàng

### Bước 8: Phát triển giao diện thanh toán ✅
1. **Trang thanh toán**
   - `templates/checkout.html` ✅
   - `templates/order-confirmation.html` ✅
   - `assets/js/checkout.js` ✅
   - `assets/js/order-confirmation.js` ✅
   - Form validation và UX tối ưu ✅
   - Tích hợp payment gateway (sẽ triển khai sau) 🔄
   - Tích hợp payment gateway (nếu có)

### Bước 9: Phát triển giao diện quản lý mua hàng
1. **Trang quản lý mua hàng**
   - `templates/my-purchases.html`
   - `templates/my-courses.html`
   - `templates/my-tests.html`
   - `templates/my-consultations.html`
   - `assets/js/purchases.js`

### Bước 10: Phát triển hệ thống trắc nghiệm
1. **Hệ thống trắc nghiệm**
   - `templates/test.html`
   - `api/tests/` folder
   - `access.php`, `submit.php`, `results.php`
   - `assets/js/test.js`
   - Xác thực token và quyền truy cập

### Bước 11: Phát triển dashboard admin cho khóa học
1. **Dashboard admin cho khóa học**
   - `templates/admin/course-purchases.html`
   - `api/admin/dashboard/` folder
   - `courses.php` - Quản lý lịch sử mua khóa học
   - Tính năng tìm kiếm, filter, export

### Bước 12: Phát triển dashboard admin cho tư vấn
1. **Dashboard admin cho tư vấn**
   - `templates/admin/consultation-bookings.html`
   - `consultations.php` - Quản lý lịch tư vấn
   - Tính năng đặt lịch, phân công chuyên gia
   - Notification system

### Bước 13: Testing và kiểm thử
1. **Testing toàn diện**
   - Test tất cả luồng mua hàng
   - Test security (SQL injection, XSS)
   - Test performance với dữ liệu lớn

### Bước 14: Cải thiện UI/UX
1. **UI/UX cải thiện**
   - Responsive design
   - Loading states
   - Error handling
   - Toast notifications

### Bước 15: Triển khai và tài liệu
1. **Deployment và documentation**
   - Cập nhật deployment guide
   - Tạo user manual
   - Admin manual
   - API documentation

## Cấu trúc thư mục mới

```
api/
├── products/
│   ├── list.php
│   ├── detail.php
│   └── admin-manage.php
├── cart/
│   ├── get.php
│   ├── add.php
│   ├── update.php
│   ├── remove.php
│   └── clear.php
├── orders/
│   ├── create.php
│   ├── list.php
│   ├── detail.php
│   └── process-purchase.php
├── purchases/
│   ├── courses.php
│   ├── tests.php
│   └── consultations.php
├── tests/
│   ├── access.php
│   ├── submit.php
│   └── results.php
└── admin/
    └── dashboard/
        ├── courses.php
        ├── consultations.php
        └── sales-report.php

templates/
├── products.html
├── product-detail.html
├── cart.html
├── checkout.html
├── order-confirmation.html
├── my-purchases.html
├── my-courses.html
├── my-tests.html
├── my-consultations.html
├── test.html
└── admin/
    ├── course-purchases.html
    ├── consultation-bookings.html
    └── product-management.html

components/
├── product-card.html
├── cart-item.html
├── cart-summary.html
├── purchase-item.html
└── admin/
    ├── purchase-table.html
    └── consultation-table.html

assets/js/
├── products.js
├── cart.js
├── checkout.js
├── purchases.js
├── test.js
└── admin/
    ├── product-management.js
    ├── course-dashboard.js
    └── consultation-dashboard.js

sql/
├── create-products-table.sql
├── create-cart-table.sql
├── create-orders-tables.sql
├── create-purchases-tables.sql
├── create-consultation-tables.sql
├── create-experts-table.sql
└── seed-sample-products.sql
```

## Tính năng bảo mật

1. **Xác thực token trắc nghiệm**
   - Token có thời hạn
   - Chỉ sử dụng được một lần
   - Liên kết với user và đơn hàng cụ thể

2. **Bảo vệ API**
   - Session validation
   - Rate limiting
   - Input sanitization
   - SQL injection prevention

3. **Quyền truy cập**
   - User chỉ thấy sản phẩm đã mua của mình
   - Admin có full access
   - Staff có quyền hạn chế

## Tích hợp payment

- Hỗ trợ multiple payment methods
- Webhook để xử lý payment callback
- Payment status tracking
- Refund handling (nếu cần)

## Monitoring và Analytics

- Tracking mua hàng
- Conversion rate
- Popular products
- Revenue reports
- User behavior analytics

---

**Lưu ý**: Kế hoạch này có thể điều chỉnh tùy theo complexity và yêu cầu cụ thể. Ưu tiên triển khai theo từng phase để đảm bảo chất lượng và có thể test từng tính năng một cách độc lập.
