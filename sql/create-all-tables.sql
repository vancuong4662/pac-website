-- =====================================================
-- PAC Shopping Cart Database - Tạo tất cả các bảng
-- =====================================================
-- 
-- HƯỚNG DẪN:
-- 1. Mở HeidiSQL và kết nối đến database pac_db
-- 2. Copy toàn bộ nội dung file này
-- 3. Paste vào SQL tab và chạy (Execute)
-- 4. File này bao gồm: users, sessions, shopping cart và dữ liệu mẫu
--
-- LƯU Ý: File này sẽ XÓA và TẠO LẠI TẤT CẢ các bảng
-- =====================================================

-- Xóa tất cả các bảng (theo thứ tự ngược lại để tránh lỗi foreign key)
DROP TABLE IF EXISTS consultation_bookings;
DROP TABLE IF EXISTS purchased_tests;
DROP TABLE IF EXISTS purchased_courses;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- =====================================================
-- PHẦN 1: BẢNG USERS VÀ AUTHENTICATION
-- =====================================================

-- Bảng users 
CREATE TABLE users (
    id INT(11) NOT NULL AUTO_INCREMENT,
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    birth_date DATE DEFAULT NULL,
    status ENUM('active','inactive','banned','pending') DEFAULT 'active',
    role ENUM('user','admin','moderator') DEFAULT 'user',
    email_verified TINYINT(1) DEFAULT 0,
    email_verification_token VARCHAR(255) DEFAULT NULL,
    password_reset_token VARCHAR(255) DEFAULT NULL,
    password_reset_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY email (email),
    UNIQUE KEY username (username),
    KEY idx_status (status),
    KEY idx_role (role),
    KEY idx_email_verified (email_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng sessions để quản lý phiên đăng nhập
CREATE TABLE sessions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    user_id INT(11) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    user_agent TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    is_remember TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY session_token (session_token),
    KEY user_id (user_id),
    KEY idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PHẦN 2: BẢNG SHOPPING CART
-- =====================================================

-- Bảng sản phẩm (products)
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

-- Bảng giỏ hàng (cart)
CREATE TABLE cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bảng đơn hàng (orders)
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(20) UNIQUE,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order_code (order_code),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status)
);

-- Bảng chi tiết đơn hàng (order_items)
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bảng khóa học đã mua (purchased_courses)
CREATE TABLE purchased_courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    course_code VARCHAR(50) UNIQUE NOT NULL, -- Mã khóa học duy nhất
    status ENUM('active', 'used', 'expired') DEFAULT 'active',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bảng trắc nghiệm đã mua (purchased_tests)
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bảng tư vấn đã đặt (consultation_bookings)
CREATE TABLE consultation_bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    consultation_code VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'scheduled', 'completed', 'cancelled') DEFAULT 'pending',
    scheduled_at TIMESTAMP NULL,
    client_notes TEXT, -- Ghi chú từ khách hàng
    admin_notes TEXT, -- Ghi chú từ admin/chuyên gia
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Tạo các index để tối ưu truy vấn (MariaDB compatible)
-- Products
ALTER TABLE products ADD INDEX idx_products_type (type);
ALTER TABLE products ADD INDEX idx_products_status (status);
ALTER TABLE products ADD INDEX idx_products_package_type (package_type);

-- Cart
ALTER TABLE cart ADD INDEX idx_cart_user_id (user_id);
ALTER TABLE cart ADD INDEX idx_cart_product_id (product_id);
ALTER TABLE cart ADD UNIQUE INDEX idx_cart_user_product (user_id, product_id);

-- Orders
ALTER TABLE orders ADD INDEX idx_orders_user_id (user_id);
ALTER TABLE orders ADD INDEX idx_orders_status (status);
ALTER TABLE orders ADD INDEX idx_orders_payment_status (payment_status);
ALTER TABLE order_items ADD INDEX idx_order_items_order_id (order_id);
ALTER TABLE order_items ADD INDEX idx_order_items_product_id (product_id);

-- Purchased Courses
ALTER TABLE purchased_courses ADD INDEX idx_purchased_courses_user_id (user_id);
ALTER TABLE purchased_courses ADD INDEX idx_purchased_courses_status (status);
ALTER TABLE purchased_courses ADD INDEX idx_purchased_courses_course_code (course_code);

-- Purchased Tests
ALTER TABLE purchased_tests ADD INDEX idx_purchased_tests_user_id (user_id);
ALTER TABLE purchased_tests ADD INDEX idx_purchased_tests_status (status);
ALTER TABLE purchased_tests ADD INDEX idx_purchased_tests_token (test_token);

-- Consultation Bookings
ALTER TABLE consultation_bookings ADD INDEX idx_consultation_bookings_user_id (user_id);
ALTER TABLE consultation_bookings ADD INDEX idx_consultation_bookings_status (status);
ALTER TABLE consultation_bookings ADD INDEX idx_consultation_bookings_consultation_code (consultation_code);

-- =====================================================
-- HOÀN THÀNH TẠO CẤU TRÚC DATABASE
-- =====================================================
SELECT 'Database structure created successfully!' as message,
       'Run sample-data.sql for demo data' as next_step;
