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
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS vnpay_transactions;
DROP TABLE IF EXISTS purchased_packages;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS product_packages;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

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
    
    -- Media và hiển thị
    image_url VARCHAR(500) DEFAULT NULL, -- Hình ảnh riêng cho gói
    
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
    vnpay_txn_ref VARCHAR(255) NULL, -- Mã giao dịch VNPay (nếu thanh toán qua VNPay)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order_code (order_code),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_vnpay_txn_ref (vnpay_txn_ref)
);

-- Bảng lưu thông tin giao dịch VNPay (tạo sau bảng orders)
CREATE TABLE vnpay_transactions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    order_id INT(11) NOT NULL,
    txn_ref VARCHAR(255) NOT NULL, -- Mã giao dịch từ VNPay
    amount BIGINT NOT NULL, -- Số tiền (tính bằng xu - VND x 100)
    order_info TEXT, -- Thông tin đơn hàng
    
    -- Thông tin request
    create_date VARCHAR(14), -- YmdHis format
    expire_date VARCHAR(14), -- YmdHis format  
    ip_addr VARCHAR(45),
    bank_code VARCHAR(20), -- Mã ngân hàng (nếu có)
    
    -- Thông tin response từ VNPay
    vnp_response_code VARCHAR(10), -- Mã phản hồi từ VNPay
    vnp_transaction_no VARCHAR(50), -- Mã giao dịch tại VNPay
    vnp_bank_code VARCHAR(20), -- Mã ngân hàng thanh toán thực tế
    vnp_bank_tran_no VARCHAR(50), -- Mã giao dịch tại ngân hàng
    vnp_card_type VARCHAR(10), -- Loại thẻ thanh toán
    vnp_pay_date VARCHAR(14), -- Thời gian thanh toán (YmdHis)
    vnp_secure_hash VARCHAR(256), -- Hash bảo mật
    
    -- Trạng thái giao dịch
    status ENUM('pending', 'success', 'failed', 'cancelled', 'expired') DEFAULT 'pending',
    
    -- Thời gian xử lý
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY txn_ref (txn_ref),
    KEY order_id (order_id),
    KEY idx_status (status),
    KEY idx_vnp_response_code (vnp_response_code),
    KEY idx_create_date (create_date),
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Bảng các sản phẩm đã mua (purchased_packages) - Thống nhất cho tất cả loại packages
CREATE TABLE purchased_packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    package_id INT NOT NULL, -- Package được mua (thay vì product_id)
    
    -- Mã truy cập duy nhất
    access_code VARCHAR(100) UNIQUE NOT NULL, -- Mã để truy cập package (thay course_code, test_token, consultation_code)
    
    -- Snapshot thông tin package tại thời điểm mua
    package_name VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL, -- Tên sản phẩm chính
    product_type ENUM('career_test', 'course', 'consultation') NOT NULL,
    package_price DECIMAL(10,2) NOT NULL, -- Giá package khi mua
    
    -- Thông tin cụ thể của package (JSON để linh hoạt)
    package_features JSON NULL, -- Các tính năng của package
    package_metadata JSON NULL, -- Thông tin bổ sung (question_count, duration, group_size, etc.)
    
    -- Trạng thái và quyền truy cập
    status ENUM('pending', 'active', 'completed', 'expired', 'cancelled') DEFAULT 'pending',
    access_starts_at TIMESTAMP NULL, -- Thời gian bắt đầu có thể sử dụng
    expires_at TIMESTAMP NULL, -- Thời hạn sử dụng (nếu có)
    
    -- Tracking sử dụng
    first_accessed_at TIMESTAMP NULL, -- Lần đầu truy cập
    last_accessed_at TIMESTAMP NULL, -- Lần cuối truy cập
    access_count INT DEFAULT 0, -- Số lần truy cập
    usage_data JSON NULL, -- Dữ liệu sử dụng (progress, results, etc.)
    
    -- Ghi chú và support
    client_notes TEXT, -- Ghi chú từ khách hàng khi mua
    staff_notes TEXT, -- Ghi chú của nhân viên
    support_status ENUM('none', 'contacted', 'scheduled', 'in_progress', 'resolved') DEFAULT 'none',
    scheduled_at TIMESTAMP NULL, -- Lịch hẹn (cho consultation hoặc support)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES product_packages(id) ON DELETE CASCADE,
    
    INDEX idx_purchased_packages_user_id (user_id),
    INDEX idx_purchased_packages_status (status),
    INDEX idx_purchased_packages_access_code (access_code),
    INDEX idx_purchased_packages_package_id (package_id),
    INDEX idx_purchased_packages_product_type (product_type),
    INDEX idx_purchased_packages_expires_at (expires_at),
    INDEX idx_purchased_packages_support_status (support_status)
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

-- Purchased Packages (indexes đã được tạo trong CREATE TABLE)

-- =====================================================
-- PHẦN 3: BỔ SUNG CÁC CƠ CHẾ ĐỒNG BỘ VÀ RÀNG BUỘC
-- =====================================================

-- 1. Trigger cập nhật vnpay_txn_ref trong orders khi có transaction VNPay
DELIMITER $$

DROP TRIGGER IF EXISTS update_order_vnpay_ref$$

CREATE TRIGGER update_order_vnpay_ref 
AFTER INSERT ON vnpay_transactions
FOR EACH ROW
BEGIN
    -- Cập nhật vnpay_txn_ref trong bảng orders
    UPDATE orders 
    SET vnpay_txn_ref = NEW.txn_ref,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.order_id;
END$$

DROP TRIGGER IF EXISTS update_order_payment_status$$

CREATE TRIGGER update_order_payment_status 
AFTER UPDATE ON vnpay_transactions
FOR EACH ROW
BEGIN
    -- Cập nhật payment_status dựa trên VNPay response
    IF NEW.vnp_response_code = '00' AND NEW.status = 'success' THEN
        UPDATE orders 
        SET payment_status = 'paid',
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.order_id;
    ELSEIF NEW.status IN ('failed', 'cancelled', 'expired') THEN
        UPDATE orders 
        SET payment_status = 'failed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.order_id;
    END IF;
END$$

-- 2. Trigger đảm bảo consistency khi xóa orders (loại bỏ vì có thể gây lỗi foreign key)
-- Bảng vnpay_transactions đã có FOREIGN KEY CASCADE nên sẽ tự động xóa

-- 3. Trigger tự động tạo mã order_code
DROP TRIGGER IF EXISTS generate_order_code$$

CREATE TRIGGER generate_order_code
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_code IS NULL OR NEW.order_code = '' THEN
        SET NEW.order_code = CONCAT('PAC', YEAR(NOW()), LPAD(MONTH(NOW()), 2, '0'), LPAD(DAY(NOW()), 2, '0'), LPAD(NEW.id, 6, '0'));
    END IF;
END$$

-- 4. Trigger validation cho VNPay transactions
DROP TRIGGER IF EXISTS validate_vnpay_transaction$$

CREATE TRIGGER validate_vnpay_transaction
BEFORE INSERT ON vnpay_transactions
FOR EACH ROW
BEGIN
    -- Kiểm tra order tồn tại và có thể thanh toán
    DECLARE order_payment_status VARCHAR(50);
    DECLARE order_status VARCHAR(50);
    
    SELECT payment_status, status INTO order_payment_status, order_status
    FROM orders WHERE id = NEW.order_id;
    
    -- Không cho phép tạo transaction mới nếu order đã paid
    IF order_payment_status = 'paid' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order đã được thanh toán, không thể tạo giao dịch VNPay mới';
    END IF;
    
    -- Không cho phép tạo transaction cho order đã cancelled
    IF order_status = 'cancelled' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order đã bị hủy, không thể tạo giao dịch VNPay';
    END IF;
    
    -- Tự động tạo txn_ref nếu chưa có
    IF NEW.txn_ref IS NULL OR NEW.txn_ref = '' THEN
        SET NEW.txn_ref = CONCAT('VNP_', NEW.order_id, '_', UNIX_TIMESTAMP());
    END IF;
END$$

-- 2. Trigger tự động tạo purchased_packages khi order completed
DROP TRIGGER IF EXISTS auto_create_purchased_packages$$

CREATE TRIGGER auto_create_purchased_packages
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    -- Khi order chuyển sang completed và paid, tạo purchased_packages
    IF NEW.status = 'completed' AND NEW.payment_status = 'paid' 
       AND (OLD.status != 'completed' OR OLD.payment_status != 'paid') THEN
       
        INSERT INTO purchased_packages (
            user_id, order_id, package_id,
            package_name, product_name, product_type, package_price,
            status, access_starts_at
        )
        SELECT 
            NEW.user_id,
            oi.order_id,
            oi.package_id,
            oi.package_name,
            oi.product_name,
            p.type,
            oi.unit_price,
            'active',
            CURRENT_TIMESTAMP
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = NEW.id;
        
    END IF;
END$$

-- 3. Trigger tự động tạo access_code cho purchased_packages
DROP TRIGGER IF EXISTS generate_access_code$$

CREATE TRIGGER generate_access_code
BEFORE INSERT ON purchased_packages
FOR EACH ROW
BEGIN
    IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
        -- Tạo access code dựa trên product_type
        CASE NEW.product_type
            WHEN 'course' THEN
                SET NEW.access_code = CONCAT('CRS_', NEW.user_id, '_', UNIX_TIMESTAMP(), '_', NEW.package_id);
            WHEN 'career_test' THEN  
                SET NEW.access_code = CONCAT('TST_', NEW.user_id, '_', UNIX_TIMESTAMP(), '_', NEW.package_id);
            WHEN 'consultation' THEN
                SET NEW.access_code = CONCAT('CON_', NEW.user_id, '_', UNIX_TIMESTAMP(), '_', NEW.package_id);
            ELSE
                SET NEW.access_code = CONCAT('PKG_', NEW.user_id, '_', UNIX_TIMESTAMP(), '_', NEW.package_id);
        END CASE;
    END IF;
END$$

-- 4. Trigger cập nhật access tracking cho purchased_packages
DROP TRIGGER IF EXISTS update_access_tracking$$

CREATE TRIGGER update_access_tracking
BEFORE UPDATE ON purchased_packages  
FOR EACH ROW
BEGIN
    -- Nếu access_count tăng, cập nhật last_accessed_at
    IF NEW.access_count > OLD.access_count THEN
        SET NEW.last_accessed_at = CURRENT_TIMESTAMP;
        
        -- Nếu lần đầu truy cập
        IF OLD.first_accessed_at IS NULL THEN
            SET NEW.first_accessed_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
END$$

-- 3. Function kiểm tra trạng thái thanh toán
DROP FUNCTION IF EXISTS check_payment_status$$

CREATE FUNCTION check_payment_status(order_id_param INT) 
RETURNS VARCHAR(50)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE vnpay_status VARCHAR(50);
    DECLARE order_payment_status VARCHAR(50);
    
    -- Lấy trạng thái từ vnpay_transactions
    SELECT status INTO vnpay_status 
    FROM vnpay_transactions 
    WHERE order_id = order_id_param 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Lấy trạng thái từ orders
    SELECT payment_status INTO order_payment_status
    FROM orders 
    WHERE id = order_id_param;
    
    -- Trả về trạng thái ưu tiên VNPay
    IF vnpay_status IS NOT NULL THEN
        RETURN vnpay_status;
    ELSE
        RETURN order_payment_status;
    END IF;
END$$

-- 4. Stored Procedure đồng bộ payment status
DROP PROCEDURE IF EXISTS sync_payment_status$$

CREATE PROCEDURE sync_payment_status()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE order_id_var INT;
    DECLARE vnpay_status VARCHAR(50);
    
    -- Cursor để duyệt qua các orders có VNPay transactions
    DECLARE cur CURSOR FOR 
        SELECT DISTINCT vt.order_id, vt.status
        FROM vnpay_transactions vt
        JOIN orders o ON vt.order_id = o.id
        WHERE o.payment_status != 'paid' 
        AND vt.status = 'success'
        AND vt.vnp_response_code = '00';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO order_id_var, vnpay_status;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Cập nhật orders status
        UPDATE orders 
        SET payment_status = 'paid',
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = order_id_var;
        
    END LOOP;
    
    CLOSE cur;
END$$

DELIMITER ;

-- =====================================================
-- PHẦN 4: VIEWS ĐỂ TRUY VẤN DỮ LIỆU DỄ DÀNG
-- =====================================================

-- View tổng hợp thông tin order và VNPay
DROP VIEW IF EXISTS order_payment_summary;

CREATE VIEW order_payment_summary AS
SELECT 
    o.id as order_id,
    o.order_code,
    o.user_id,
    u.fullname as customer_name,
    u.email as customer_email,
    o.total_amount,
    o.status as order_status,
    o.payment_status,
    o.payment_method,
    o.created_at as order_created,
    
    -- VNPay information
    vt.id as vnpay_id,
    vt.txn_ref,
    vt.amount as vnpay_amount,
    vt.status as vnpay_status,
    vt.vnp_response_code,
    vt.vnp_transaction_no,
    vt.vnp_bank_code,
    vt.vnp_pay_date,
    vt.processed_at as vnpay_processed_at
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN vnpay_transactions vt ON o.id = vt.order_id;

-- View thống kê VNPay transactions
DROP VIEW IF EXISTS vnpay_statistics;

CREATE VIEW vnpay_statistics AS
SELECT 
    DATE(created_at) as transaction_date,
    status,
    vnp_response_code,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount
FROM vnpay_transactions
GROUP BY DATE(created_at), status, vnp_response_code
ORDER BY transaction_date DESC, status;

-- View orders chưa thanh toán (cần theo dõi)
DROP VIEW IF EXISTS pending_payments;

CREATE VIEW pending_payments AS
SELECT 
    o.id,
    o.order_code,
    o.user_id,
    u.fullname,
    u.email,
    o.total_amount,
    o.created_at,
    TIMESTAMPDIFF(HOUR, o.created_at, NOW()) as hours_pending,
    vt.status as vnpay_status,
    vt.create_date as vnpay_created
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN vnpay_transactions vt ON o.id = vt.order_id
WHERE o.payment_status = 'pending'
AND o.status != 'cancelled'
ORDER BY o.created_at DESC;

-- View cho courses đã mua (backward compatibility)
DROP VIEW IF EXISTS purchased_courses_view;

CREATE VIEW purchased_courses_view AS
SELECT 
    pp.*,
    pp.access_code as course_code,
    p.name as current_product_name,
    p.type as current_product_type,
    pkg.package_name as current_package_name,
    pkg.original_price as current_package_price,
    JSON_UNQUOTE(JSON_EXTRACT(pp.package_features, '$.group_size')) as group_size
FROM purchased_packages pp
JOIN product_packages pkg ON pp.package_id = pkg.id
JOIN products p ON pkg.product_id = p.id
WHERE pp.product_type = 'course';

-- View cho tests đã mua (backward compatibility)
DROP VIEW IF EXISTS purchased_tests_view;

CREATE VIEW purchased_tests_view AS
SELECT 
    pp.*,
    pp.access_code as test_token,
    p.name as current_product_name,
    p.type as current_product_type,
    pkg.package_name as current_package_name,
    pkg.original_price as current_package_price,
    JSON_UNQUOTE(JSON_EXTRACT(pp.package_metadata, '$.question_count')) as question_count,
    JSON_UNQUOTE(JSON_EXTRACT(pp.package_metadata, '$.report_pages')) as report_pages,
    1 as attempts_left, -- Default value
    pp.usage_data as test_result,
    pp.last_accessed_at as completed_at
FROM purchased_packages pp
JOIN product_packages pkg ON pp.package_id = pkg.id
JOIN products p ON pkg.product_id = p.id
WHERE pp.product_type = 'career_test';

-- View cho consultations đã mua (backward compatibility)
DROP VIEW IF EXISTS consultation_bookings_view;

CREATE VIEW consultation_bookings_view AS
SELECT 
    pp.*,
    pp.access_code as consultation_code,
    p.name as current_product_name,
    p.type as current_product_type,
    pkg.package_name as current_package_name,
    pkg.original_price as current_package_price
FROM purchased_packages pp
JOIN product_packages pkg ON pp.package_id = pkg.id
JOIN products p ON pkg.product_id = p.id
WHERE pp.product_type = 'consultation';

-- =====================================================
-- HOÀN THÀNH TẠO CẤU TRÚC DATABASE
-- =====================================================
SELECT 'Package-based purchase system created successfully!' as message,
       'Database now uses unified purchased_packages table' as info,
       'Run sample-data.sql for demo data' as next_step;
