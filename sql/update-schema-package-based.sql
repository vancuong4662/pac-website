-- =====================================================
-- UPDATE PAC DATABASE: Package-based Purchase System
-- =====================================================
-- 
-- Thay đổi từ product-based sang package-based purchase system
-- Xóa purchased_courses, purchased_tests, consultation_bookings
-- Tạo purchased_packages thống nhất
--
-- =====================================================

-- 1. Backup existing data (nếu có)
CREATE TABLE IF NOT EXISTS backup_purchased_courses AS SELECT * FROM purchased_courses;
CREATE TABLE IF NOT EXISTS backup_purchased_tests AS SELECT * FROM purchased_tests;
CREATE TABLE IF NOT EXISTS backup_consultation_bookings AS SELECT * FROM consultation_bookings;

-- 2. Drop old tables
DROP TABLE IF EXISTS consultation_bookings;
DROP TABLE IF EXISTS purchased_tests;
DROP TABLE IF EXISTS purchased_courses;

-- 3. Create new unified purchased_packages table
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

-- 4. Create views for backward compatibility and easier querying

-- View cho courses đã mua
CREATE VIEW purchased_courses_view AS
SELECT 
    pp.*,
    p.name as current_product_name,
    p.type as current_product_type,
    pkg.package_name as current_package_name,
    pkg.original_price as current_package_price
FROM purchased_packages pp
JOIN product_packages pkg ON pp.package_id = pkg.id
JOIN products p ON pkg.product_id = p.id
WHERE pp.product_type = 'course';

-- View cho tests đã mua  
CREATE VIEW purchased_tests_view AS
SELECT 
    pp.*,
    p.name as current_product_name,
    p.type as current_product_type,
    pkg.package_name as current_package_name,
    pkg.original_price as current_package_price
FROM purchased_packages pp
JOIN product_packages pkg ON pp.package_id = pkg.id
JOIN products p ON pkg.product_id = p.id
WHERE pp.product_type = 'career_test';

-- View cho consultations đã mua
CREATE VIEW consultation_bookings_view AS
SELECT 
    pp.*,
    p.name as current_product_name,
    p.type as current_product_type,
    pkg.package_name as current_package_name,
    pkg.original_price as current_package_price
FROM purchased_packages pp
JOIN product_packages pkg ON pp.package_id = pkg.id
JOIN products p ON pkg.product_id = p.id
WHERE pp.product_type = 'consultation';

-- 5. Create triggers for automatic access_code generation
DELIMITER $$

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

-- Trigger cập nhật last_accessed_at khi có truy cập
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

DELIMITER ;

-- 6. Function để tạo purchased_packages từ order_items
DELIMITER $$

CREATE FUNCTION create_purchased_package(
    p_user_id INT,
    p_order_id INT, 
    p_package_id INT,
    p_package_name VARCHAR(100),
    p_product_name VARCHAR(255),
    p_product_type VARCHAR(50),
    p_package_price DECIMAL(10,2)
) RETURNS INT
READS SQL DATA
MODIFIES SQL DATA
BEGIN
    DECLARE package_features_json JSON DEFAULT NULL;
    DECLARE package_metadata_json JSON DEFAULT NULL;
    DECLARE new_id INT;
    
    -- Lấy thông tin package để tạo JSON metadata
    SELECT 
        JSON_OBJECT(
            'group_size', pkg.group_size,
            'special_features', pkg.special_features,
            'is_free', pkg.is_free,
            'original_price', pkg.original_price,
            'sale_price', pkg.sale_price
        ),
        JSON_OBJECT(
            'question_count', p.question_count,
            'age_range', p.age_range,
            'report_pages', p.report_pages,
            'duration', p.duration,
            'instructor_info', p.instructor_info,
            'teaching_format', p.teaching_format
        )
    INTO package_features_json, package_metadata_json
    FROM product_packages pkg 
    JOIN products p ON pkg.product_id = p.id
    WHERE pkg.id = p_package_id;
    
    -- Insert purchased package
    INSERT INTO purchased_packages (
        user_id, order_id, package_id,
        package_name, product_name, product_type, package_price,
        package_features, package_metadata,
        status, access_starts_at
    ) VALUES (
        p_user_id, p_order_id, p_package_id,
        p_package_name, p_product_name, p_product_type, p_package_price,
        package_features_json, package_metadata_json,
        'pending', CURRENT_TIMESTAMP
    );
    
    SET new_id = LAST_INSERT_ID();
    RETURN new_id;
END$$

DELIMITER ;

-- 7. Create stored procedure để migrate existing data (nếu cần)
DELIMITER $$

CREATE PROCEDURE migrate_existing_purchases()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE order_id_var INT;
    
    -- Cursor để duyệt các order đã completed
    DECLARE cur CURSOR FOR 
        SELECT DISTINCT order_id 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.payment_status = 'paid' 
        AND o.status = 'completed';
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    migrate_loop: LOOP
        FETCH cur INTO order_id_var;
        IF done THEN
            LEAVE migrate_loop;
        END IF;
        
        -- Tạo purchased_packages cho từng order_item
        INSERT INTO purchased_packages (
            user_id, order_id, package_id,
            package_name, product_name, product_type, package_price,
            status, access_starts_at
        )
        SELECT 
            o.user_id,
            oi.order_id,
            oi.package_id,
            oi.package_name,
            oi.product_name,
            p.type,
            oi.unit_price,
            'active',
            o.updated_at
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = order_id_var;
        
    END LOOP;
    
    CLOSE cur;
    
    -- Update status của packages đã tạo
    UPDATE purchased_packages 
    SET status = 'active' 
    WHERE status = 'pending' 
    AND order_id IN (
        SELECT id FROM orders 
        WHERE payment_status = 'paid' 
        AND status = 'completed'
    );
    
END$$

DELIMITER ;

-- 8. Update triggers để tự động tạo purchased_packages khi order completed
DELIMITER $$

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

DELIMITER ;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Package-based purchase system created successfully!' as message,
       'Run migrate_existing_purchases() to migrate old data if needed' as next_step;