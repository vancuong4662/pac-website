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
DROP TABLE IF EXISTS product_packages;
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
-- PHẦN 2: BẢNG SAN PHẨM VÀ SHOPPING CART
-- =====================================================

-- Bảng sản phẩm chính (products)
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly identifier
    short_description TEXT, -- Mô tả ngắn hiển thị trên card
    full_description LONGTEXT, -- Mô tả đầy đủ cho trang chi tiết
    
    -- Phân loại sản phẩm
    type ENUM('career_test', 'course', 'consultation') NOT NULL,
    category VARCHAR(100), -- 'assessment', 'writing', 'career_skills', etc.
    
    -- Thông tin cơ bản
    duration VARCHAR(100), -- '30 phút', '16 giờ', 'Theo lịch cá nhân', etc.
    target_audience TEXT, -- Đối tượng học (JSON array hoặc text)
    learning_outcomes LONGTEXT, -- Kết quả mong đợi sau khóa học/test
    curriculum LONGTEXT, -- Chương trình học chi tiết (có thể là JSON)
    
    -- Thông tin đặc biệt cho career tests
    question_count INT NULL, -- Số câu hỏi
    age_range VARCHAR(50) NULL, -- '14-18 tuổi', '14-22 tuổi', etc.
    report_pages INT NULL, -- Số trang báo cáo
    
    -- Thông tin cho courses
    instructor_info VARCHAR(255) NULL, -- 'Thạc sĩ Ngôn ngữ Anh', etc.
    teaching_format ENUM('online', 'offline', 'both') NULL,
    
    -- Media và trạng thái
    image_url VARCHAR(500) DEFAULT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    sort_order INT DEFAULT 0, -- Thứ tự hiển thị
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng các gói giá cho mỗi sản phẩm (product_packages)
CREATE TABLE product_packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    
    -- Thông tin gói
    package_name VARCHAR(100) NOT NULL, -- 'Miễn phí', 'Nhóm 6 học viên', 'Cá nhân 1:1', etc.
    package_slug VARCHAR(100) NOT NULL, -- 'mien-phi', 'nhom-6', 'ca-nhan-1-1'
    package_description TEXT, -- Mô tả chi tiết về gói này
    
    -- Giá cả
    original_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(10,2) NULL, -- NULL nếu không có khuyến mãi
    is_free BOOLEAN DEFAULT FALSE,
    
    -- Thông tin cụ thể của gói
    group_size VARCHAR(50) NULL, -- '1 học viên', '3-4 học viên', '5-6 học viên'
    special_features TEXT, -- Các tính năng đặc biệt của gói này
    
    -- Sắp xếp và trạng thái
    sort_order INT DEFAULT 0, -- Thứ tự hiển thị các gói
    status ENUM('active', 'inactive') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_package_slug (product_id, package_slug),
    INDEX idx_package_product_id (product_id),
    INDEX idx_package_status (status)
);

-- Bảng giỏ hàng (cart) - cập nhật để hỗ trợ packages
CREATE TABLE cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    package_id INT NOT NULL, -- Bắt buộc chọn package
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_product_package (user_id, product_id, package_id),
    INDEX idx_cart_user_id (user_id),
    INDEX idx_cart_product_id (product_id),
    INDEX idx_cart_package_id (package_id)
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

-- Bảng chi tiết đơn hàng (order_items) - cập nhật để hỗ trợ packages
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    package_id INT NOT NULL, -- Lưu thông tin gói được mua
    quantity INT NOT NULL DEFAULT 1,
    
    -- Lưu thông tin giá tại thời điểm mua (để tránh thay đổi sau này)
    unit_price DECIMAL(10,2) NOT NULL, -- Giá 1 đơn vị
    total_price DECIMAL(10,2) NOT NULL, -- unit_price * quantity
    
    -- Lưu snapshot thông tin sản phẩm và gói tại thời điểm mua
    product_name VARCHAR(255) NOT NULL,
    package_name VARCHAR(100) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE CASCADE,
    
    INDEX idx_order_items_order_id (order_id),
    INDEX idx_order_items_product_id (product_id),
    INDEX idx_order_items_package_id (package_id)
);

-- Bảng khóa học đã mua (purchased_courses) - cập nhật để hỗ trợ packages
CREATE TABLE purchased_courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    package_id INT NOT NULL, -- Gói khóa học đã mua
    
    course_code VARCHAR(50) UNIQUE NOT NULL, -- Mã khóa học duy nhất để tracking
    
    -- Thông tin từ package tại thời điểm mua
    package_name VARCHAR(100) NOT NULL,
    group_size VARCHAR(50),
    
    -- Trạng thái và thời hạn
    status ENUM('pending', 'active', 'completed', 'expired', 'cancelled') DEFAULT 'pending',
    expires_at TIMESTAMP NULL, -- Thời hạn sử dụng (nếu có)
    
    -- Ghi chú cho nhân viên PAC
    staff_notes TEXT, -- Ghi chú của nhân viên khi liên hệ khách hàng
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE CASCADE,
    
    INDEX idx_purchased_courses_user_id (user_id),
    INDEX idx_purchased_courses_status (status),
    INDEX idx_purchased_courses_course_code (course_code),
    INDEX idx_purchased_courses_package_id (package_id)
);

-- Bảng trắc nghiệm đã mua (purchased_tests) - cập nhật để hỗ trợ packages
CREATE TABLE purchased_tests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    package_id INT NOT NULL, -- Gói test đã mua (miễn phí hoặc có phí)
    
    test_token VARCHAR(100) UNIQUE NOT NULL, -- Token để truy cập trắc nghiệm
    
    -- Thông tin từ package tại thời điểm mua
    package_name VARCHAR(100) NOT NULL,
    question_count INT, -- Số câu hỏi của test
    report_pages INT, -- Số trang báo cáo
    
    -- Trạng thái test
    attempts_left INT DEFAULT 1, -- Số lần làm bài còn lại
    status ENUM('active', 'completed', 'expired') DEFAULT 'active',
    expires_at TIMESTAMP NULL,
    
    -- Kết quả test (sau khi hoàn thành)
    test_result JSON NULL, -- Lưu kết quả test dạng JSON
    completed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE CASCADE,
    
    INDEX idx_purchased_tests_user_id (user_id),
    INDEX idx_purchased_tests_status (status),
    INDEX idx_purchased_tests_token (test_token),
    INDEX idx_purchased_tests_package_id (package_id)
);

-- Bảng tư vấn đã đặt (consultation_bookings) - cập nhật để hỗ trợ packages
CREATE TABLE consultation_bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    package_id INT NOT NULL, -- Gói tư vấn đã mua
    
    consultation_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Thông tin từ package
    package_name VARCHAR(100) NOT NULL,
    
    -- Trạng thái và lịch hẹn (do nhân viên PAC quản lý thủ công)
    status ENUM('pending', 'contacted', 'scheduled', 'completed', 'cancelled') DEFAULT 'pending',
    scheduled_at TIMESTAMP NULL, -- Lịch hẹn (do nhân viên đặt)
    
    -- Ghi chú
    client_notes TEXT, -- Ghi chú từ khách hàng khi đặt mua
    staff_notes TEXT, -- Ghi chú của nhân viên khi liên hệ
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE CASCADE,
    
    INDEX idx_consultation_bookings_user_id (user_id),
    INDEX idx_consultation_bookings_status (status),
    INDEX idx_consultation_bookings_consultation_code (consultation_code),
    INDEX idx_consultation_bookings_package_id (package_id)
);

-- Tạo các index để tối ưu truy vấn (MariaDB compatible)
-- Products
ALTER TABLE products ADD INDEX idx_products_type (type);
ALTER TABLE products ADD INDEX idx_products_category (category);
ALTER TABLE products ADD INDEX idx_products_status (status);
ALTER TABLE products ADD INDEX idx_products_slug (slug);
ALTER TABLE products ADD INDEX idx_products_sort_order (sort_order);

-- Product Packages
ALTER TABLE product_packages ADD INDEX idx_packages_product_id (product_id);
ALTER TABLE product_packages ADD INDEX idx_packages_status (status);
ALTER TABLE product_packages ADD INDEX idx_packages_free (is_free);
ALTER TABLE product_packages ADD INDEX idx_packages_sort_order (sort_order);

-- Cart (indexes đã được tạo trong CREATE TABLE)
-- Orders (indexes đã được tạo trong CREATE TABLE)
-- Order Items (indexes đã được tạo trong CREATE TABLE)

-- Purchased Courses (indexes đã được tạo trong CREATE TABLE)
-- Purchased Tests (indexes đã được tạo trong CREATE TABLE)  
-- Consultation Bookings (indexes đã được tạo trong CREATE TABLE)

-- =====================================================
-- HOÀN THÀNH TẠO CẤU TRÚC DATABASE
-- =====================================================
SELECT 'Database structure created successfully!' as message,
       'Run sample-data.sql for demo data' as next_step;
