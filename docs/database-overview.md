# PAC Shopping Cart Database - Tổng quan hệ thống

## Giới thiệu

Database PAC Shopping Cart được thiết kế để hỗ trợ hệ thống bán hàng trực tuyến của PAC (Psychological Assessment Center), chuyên cung cấp các dịch vụ đánh giá tâm lý, khóa học và tư vấn hướng nghiệp.

## Thông tin kỹ thuật

- **Database Engine**: MariaDB/MySQL
- **Charset**: utf8mb4_unicode_ci
- **Storage Engine**: InnoDB
- **Foreign Key**: Có hỗ trợ CASCADE DELETE

## Cấu trúc tổng quan

Database gồm **9 bảng chính** được chia thành 3 nhóm chức năng:

### 1. Nhóm Authentication & Users (2 bảng)
- `users` - Quản lý tài khoản người dùng
- `sessions` - Quản lý phiên đăng nhập

### 2. Nhóm Products & Shopping (5 bảng)
- `products` - Sản phẩm chính (tests, courses, consultations)
- `product_packages` - Các gói giá cho mỗi sản phẩm
- `cart` - Giỏ hàng người dùng
- `orders` - Đơn hàng và thanh toán
- `order_items` - Chi tiết sản phẩm trong đơn hàng

### 3. Nhóm Payment & Purchased Services (2 bảng)
- `vnpay_transactions` - Giao dịch VNPay
- `purchased_packages` - Tất cả packages đã mua (unified table)

---

## Chi tiết các bảng

### 1. Bảng `users` - Quản lý người dùng

**Mục đích**: Lưu trữ thông tin tài khoản người dùng, hỗ trợ authentication và phân quyền.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT(11) AUTO_INCREMENT | Khóa chính |
| `fullname` | VARCHAR(255) | Họ tên đầy đủ |
| `email` | VARCHAR(255) UNIQUE | Email đăng nhập |
| `username` | VARCHAR(100) UNIQUE | Tên đăng nhập |
| `password` | VARCHAR(255) | Mật khẩu đã hash |
| `phone` | VARCHAR(20) | Số điện thoại |
| `address` | TEXT | Địa chỉ |
| `birth_date` | DATE | Ngày sinh |
| `status` | ENUM | 'active', 'inactive', 'banned', 'pending' |
| `role` | ENUM | 'user', 'admin', 'moderator' |
| `email_verified` | TINYINT(1) | Trạng thái xác thực email |

**Tính năng đặc biệt**:
- Hỗ trợ email verification
- Password reset token
- Phân quyền người dùng

---

### 2. Bảng `sessions` - Quản lý phiên đăng nhập

**Mục đích**: Quản lý phiên đăng nhập, hỗ trợ "Remember Me" và bảo mật.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT(11) AUTO_INCREMENT | Khóa chính |
| `user_id` | INT(11) | FK đến users.id |
| `session_token` | VARCHAR(255) UNIQUE | Token phiên duy nhất |
| `expires_at` | DATETIME | Thời gian hết hạn |
| `user_agent` | TEXT | Thông tin trình duyệt |
| `ip_address` | VARCHAR(45) | Địa chỉ IP |
| `is_remember` | TINYINT(1) | Có ghi nhớ đăng nhập không |

---

### 3. Bảng `products` - Sản phẩm chính

**Mục đích**: Lưu trữ thông tin các sản phẩm (tests, courses, consultations).

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT AUTO_INCREMENT | Khóa chính |
| `name` | VARCHAR(255) | Tên sản phẩm |
| `slug` | VARCHAR(255) UNIQUE | URL-friendly identifier |
| `short_description` | TEXT | Mô tả ngắn cho card |
| `full_description` | LONGTEXT | Mô tả chi tiết HTML |
| `type` | ENUM | 'career_test', 'course', 'consultation' |
| `category` | VARCHAR(100) | Phân loại sản phẩm |
| `duration` | VARCHAR(100) | Thời lượng |
| `target_audience` | TEXT | Đối tượng mục tiêu |
| `learning_outcomes` | LONGTEXT | Kết quả mong đợi |
| `curriculum` | LONGTEXT | Chương trình học |

**Trường đặc biệt cho Career Tests**:
- `question_count` - Số câu hỏi
- `age_range` - Độ tuổi phù hợp
- `report_pages` - Số trang báo cáo

**Trường đặc biệt cho Courses**:
- `instructor_info` - Thông tin giảng viên
- `teaching_format` - 'online', 'offline', 'both'

---

### 4. Bảng `product_packages` - Gói giá sản phẩm

**Mục đích**: Mỗi sản phẩm có thể có nhiều gói giá khác nhau (miễn phí, nhóm, cá nhân).

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT AUTO_INCREMENT | Khóa chính |
| `product_id` | INT | FK đến products.id |
| `package_name` | VARCHAR(100) | Tên gói |
| `package_slug` | VARCHAR(100) | URL slug của gói |
| `package_description` | TEXT | Mô tả chi tiết gói |
| `original_price` | DECIMAL(10,2) | Giá gốc |
| `sale_price` | DECIMAL(10,2) | Giá khuyến mãi |
| `is_free` | BOOLEAN | Gói miễn phí |
| `group_size` | VARCHAR(50) | Quy mô nhóm |
| `special_features` | TEXT | Tính năng đặc biệt |

**Ví dụ thực tế**:
- Test Hướng nghiệp: "Gói Khởi động" (miễn phí), "Gói Tăng tốc" (1.975.000đ)
- Khóa Viết luận: "Nhóm 6", "Nhóm 4", "Cá nhân 1:1"

---

### 5. Bảng `shopping_cart` - Giỏ hàng

**Mục đích**: Lưu trữ sản phẩm người dùng đã thêm vào giỏ hàng.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT AUTO_INCREMENT | Khóa chính |
| `user_id` | INT | FK đến users.id (NULL cho guest) |
| `session_id` | VARCHAR(100) | Session ID cho guest users |
| `product_id` | INT | FK đến products.id |
| `package_id` | INT | FK đến product_packages.id |
| `quantity` | INT DEFAULT 1 | Số lượng (thường là 1) |
| `added_at` | TIMESTAMP | Thời gian thêm vào cart |

**Tính năng**:
- Hỗ trợ cả user đã đăng nhập và guest
- Auto-cleanup old cart items
- Integration với API để update giỏ hàng

---

### 6. Bảng `orders` - Đơn hàng

**Mục đích**: Quản lý đơn hàng và trạng thái thanh toán.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT AUTO_INCREMENT | Khóa chính |
| `order_code` | VARCHAR(20) UNIQUE | Mã đơn hàng |
| `user_id` | INT | FK đến users.id |
| `total_amount` | DECIMAL(10,2) | Tổng tiền |
| `status` | ENUM | 'pending', 'completed', 'cancelled' |
| `payment_method` | VARCHAR(50) | Phương thức thanh toán |
| `payment_status` | ENUM | 'pending', 'paid', 'failed' |

---

### 7. Bảng `order_items` - Chi tiết đơn hàng

**Mục đích**: Lưu chi tiết sản phẩm trong mỗi đơn hàng, bao gồm snapshot giá tại thời điểm mua.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT AUTO_INCREMENT | Khóa chính |
| `order_id` | INT | FK đến orders.id |
| `product_id` | INT | FK đến products.id |
| `package_id` | INT | FK đến product_packages.id |
| `quantity` | INT | Số lượng |
| `unit_price` | DECIMAL(10,2) | Giá 1 đơn vị tại thời điểm mua |
| `total_price` | DECIMAL(10,2) | Tổng giá |
| `product_name` | VARCHAR(255) | Snapshot tên sản phẩm |
| `package_name` | VARCHAR(100) | Snapshot tên gói |

**Lý do có snapshot**: Đảm bảo dữ liệu lịch sử không bị thay đổi khi cập nhật giá sản phẩm.

---

### 8. Bảng `vnpay_transactions` - Giao dịch VNPay

**Mục đích**: Lưu trữ thông tin giao dịch thanh toán qua VNPay, bao gồm request và response data.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT(11) AUTO_INCREMENT | Khóa chính |
| `order_id` | INT(11) | FK đến orders.id |
| `txn_ref` | VARCHAR(255) UNIQUE | Mã giao dịch từ VNPay |
| `amount` | BIGINT | Số tiền (tính bằng xu - VND x 100) |
| `order_info` | TEXT | Thông tin đơn hàng |
| `create_date` | VARCHAR(14) | Ngày tạo (YmdHis format) |
| `ip_addr` | VARCHAR(45) | IP address của khách hàng |
| `vnp_response_code` | VARCHAR(10) | Mã phản hồi từ VNPay |
| `vnp_transaction_no` | VARCHAR(50) | Mã giao dịch tại VNPay |
| `vnp_bank_code` | VARCHAR(20) | Mã ngân hàng |
| `vnp_pay_date` | VARCHAR(14) | Thời gian thanh toán |
| `status` | ENUM | 'pending', 'success', 'failed', 'cancelled', 'expired' |

**Tính năng đặc biệt**:
- Tự động cập nhật order status khi giao dịch thành công
- Lưu trữ đầy đủ thông tin VNPay response để audit
- Trigger validation để tránh tạo giao dịch trùng

---

### 9. Bảng `purchased_packages` - Packages đã mua (Unified Table)

**Mục đích**: Quản lý TẤT CẢ các loại packages đã mua (courses, tests, consultations) trong một bảng thống nhất.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT AUTO_INCREMENT | Khóa chính |
| `user_id` | INT | FK đến users.id |
| `order_id` | INT | FK đến orders.id |
| `package_id` | INT | FK đến product_packages.id |
| `access_code` | VARCHAR(100) UNIQUE | Mã truy cập duy nhất |
| `package_name` | VARCHAR(100) | Snapshot tên package |
| `product_name` | VARCHAR(255) | Snapshot tên sản phẩm |
| `product_type` | ENUM | 'career_test', 'course', 'consultation' |
| `package_price` | DECIMAL(10,2) | Giá package khi mua |
| `package_features` | JSON | Các tính năng của package |
| `package_metadata` | JSON | Thông tin bổ sung (question_count, duration, etc.) |
| `status` | ENUM | 'pending', 'active', 'completed', 'expired', 'cancelled' |
| `access_starts_at` | TIMESTAMP | Thời gian bắt đầu có thể sử dụng |
| `expires_at` | TIMESTAMP | Thời hạn sử dụng |
| `first_accessed_at` | TIMESTAMP | Lần đầu truy cập |
| `last_accessed_at` | TIMESTAMP | Lần cuối truy cập |
| `access_count` | INT | Số lần truy cập |
| `usage_data` | JSON | Dữ liệu sử dụng (progress, results, etc.) |
| `support_status` | ENUM | 'none', 'contacted', 'scheduled', 'in_progress', 'resolved' |
| `scheduled_at` | TIMESTAMP | Lịch hẹn (cho consultation) |

**Lợi ích của unified approach**:
- Đơn giản hóa cấu trúc database
- Dễ dàng quản lý và query cross-product analytics
- Flexible JSON fields cho metadata riêng của từng loại
- Consistent access tracking across all product types

**Auto-generated access codes**:
- Tests: `TST_{user_id}_{timestamp}_{package_id}`
- Courses: `CRS_{user_id}_{timestamp}_{package_id}`
- Consultations: `CON_{user_id}_{timestamp}_{package_id}`

---

### Views để backward compatibility

Database cung cấp các views để hỗ trợ code cũ:

#### `purchased_courses_view`
```sql
-- Emulates old purchased_courses table
SELECT pp.*, pp.access_code as course_code, ...
FROM purchased_packages pp
WHERE pp.product_type = 'course';
```

#### `purchased_tests_view`
```sql
-- Emulates old purchased_tests table  
SELECT pp.*, pp.access_code as test_token, ...
FROM purchased_packages pp
WHERE pp.product_type = 'career_test';
```

#### `consultation_bookings_view`
```sql
-- Emulates old consultation_bookings table
SELECT pp.*, pp.access_code as consultation_code, ...
FROM purchased_packages pp
WHERE pp.product_type = 'consultation';
```

---

## Mối quan hệ giữa các bảng

```
users (1) ──── (n) user_sessions
users (1) ──── (n) shopping_cart
users (1) ──── (n) orders
users (1) ──── (n) purchased_packages

products (1) ──── (n) product_packages
products (1) ──── (n) shopping_cart
products (1) ──── (n) order_items

orders (1) ──── (n) order_items
orders (1) ──── (n) vnpay_transactions
orders (1) ──── (n) purchased_packages

product_packages (1) ──── (n) shopping_cart
product_packages (1) ──── (n) order_items
product_packages (1) ──── (n) purchased_packages
```

---

## Luồng dữ liệu chính

### 1. Luồng mua hàng
```
1. User browse products → products table
2. User select package → product_packages table  
3. Add to cart → shopping_cart table
4. Checkout → orders table + order_items table
5. VNPay payment → vnpay_transactions table
6. Payment success → purchased_packages table (unified)
```

### 2. Luồng sử dụng dịch vụ (thông qua purchased_packages)
```
Course packages → Nhân viên PAC liên hệ sắp xếp lịch học
Test packages → User làm bài test online với access_code
Consultation packages → Nhân viên PAC liên hệ đặt lịch tư vấn
```

---

## Tính năng bảo mật

### 1. Authentication
- Session-based authentication với user_sessions table
- Password hashing (bcrypt)
- Email verification

### 2. Data Protection  
- Foreign key constraints với CASCADE DELETE
- Unique constraints cho email, username, access_codes
- Input validation qua ENUM fields

### 3. Business Logic Protection
- Snapshot giá trong order_items
- Access codes để bảo mật truy cập các purchased packages
- Status tracking cho tất cả purchased packages
- VNPay transaction audit trail

---

## Indexes để tối ưu performance

Database được tối ưu với các indexes:

- **Users**: status, role, email_verified
- **User Sessions**: expires_at, user_id
- **Products**: type, category, status, slug, sort_order
- **Product Packages**: product_id, status, is_free, sort_order
- **Orders**: order_code, user_id, status, payment_status
- **VNPay Transactions**: txn_ref, order_id, status
- **Purchased Packages**: user_id, status, access_code, product_type

---

## Dữ liệu mẫu

Database đi kèm với file `sample-data.sql` bao gồm:

### Tài khoản demo
- **Admin**: admin@pac.edu.vn / admin
- **Customer**: customer@example.com / customer

### Sản phẩm mẫu (5 sản phẩm chính của PAC)

1. **Hướng nghiệp trực tuyến** (career_test)
   - Gói Khởi động: Miễn phí (30 câu, 5 trang báo cáo)
   - Gói Tăng tốc: 1.975.000đ (120 câu, 25-26 trang báo cáo)

2. **Viết luận tăng cường** (course)
   - Nhóm 6 học viên: 5.199.000đ (giảm từ 6.999.000đ)
   - Nhóm 4 học viên: 7.600.000đ (giảm từ 9.999.000đ)  
   - Học cá nhân 1:1: 19.800.000đ (giảm từ 21.000.000đ)

3. **Essay Coaching** (course)
   - Essay Coaching 1:1: 899.000đ (giảm từ 1.299.000đ)

4. **CV và Phỏng vấn** (course)
   - Cố vấn Thành viên: 9.900.000đ
   - Cố vấn Cao cấp: 15.900.000đ

5. **Hướng nghiệp cùng chuyên gia** (consultation)
   - Gói Học đường: 14.750.000đ (5-6 buổi tư vấn)
   - Gói Toàn diện: 24.750.000đ (6 buổi + tư vấn môn học quốc tế)

---

## Hướng dẫn triển khai

### 1. Tạo database
```sql
CREATE DATABASE pac_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Chạy scripts
```bash
# 1. Tạo cấu trúc
mysql -u root -p pac_db < sql/create-all-tables.sql

# 2. Thêm dữ liệu mẫu  
mysql -u root -p pac_db < sql/sample-data.sql
```

### 3. Kiểm tra
```sql
USE pac_db;
SHOW TABLES;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM product_packages;
```

---

## Lưu ý quan trọng

### 1. Backup
- **QUAN TRỌNG**: Luôn backup database trước khi chạy `create-all-tables.sql`
- Script này sẽ **XÓA VÀ TẠO LẠI TẤT CẢ** các bảng

### 2. Môi trường
- Development: Chạy cả 2 scripts  
- Production: Chỉ chạy create-all-tables.sql, không chạy sample-data.sql

### 3. Customization
- Có thể thêm sản phẩm mới bằng cách thêm vào `products` và `product_packages`
- Tất cả giá cả có thể được cập nhật trong `product_packages`

---

## Tác giả & Bảo trì

- **Dự án**: PAC Shopping Cart System
- **Database Design**: Comprehensive e-commerce solution cho educational services
- **Cập nhật lần cuối**: October 2025
- **Phiên bản**: 1.0

---

*Tài liệu này mô tả cấu trúc database tại thời điểm hiện tại. Khi có thay đổi, vui lòng cập nhật documentation này.*