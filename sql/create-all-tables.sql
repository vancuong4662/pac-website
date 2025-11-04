-- =====================================================
-- PAC Shopping Cart Database - Tạo tất cả các bảng
-- =====================================================
-- 
-- HƯỚNG DẪN:
-- 1. Mở HeidiSQL và kết nối đến database pac_db
-- 2. Copy toàn bộ nội dung file này
-- 3. Paste vào SQL tab và chạy (Execute)
-- 4. File này bao gồm: users, sessions, shopping cart, quiz system
--
-- LƯU Ý: File này sẽ XÓA và TẠO LẠI TẤT CẢ các bảng
-- Bao gồm cả quiz_exams, quiz_answers, quiz_results và các bảng quiz khác
-- =====================================================

-- Xóa tất cả các bảng (theo thứ tự ngược lại để tránh lỗi foreign key)
SET FOREIGN_KEY_CHECKS = 0;

-- Drop quiz system tables (new - package integration)
DROP TABLE IF EXISTS quiz_suggested_jobs;
DROP TABLE IF EXISTS quiz_fraud_logs;
DROP TABLE IF EXISTS quiz_package_configs;
DROP TABLE IF EXISTS quiz_user_limits;
DROP TABLE IF EXISTS quiz_results;
DROP TABLE IF EXISTS quiz_answers;
DROP TABLE IF EXISTS quiz_exams;

-- Drop legacy tables
DROP TABLE IF EXISTS vnpay_transactions;
DROP TABLE IF EXISTS purchased_packages;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS product_packages;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS test_answers;
DROP TABLE IF EXISTS test_results;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- Drop views (if exists)
DROP VIEW IF EXISTS order_payment_summary;
DROP VIEW IF EXISTS vnpay_statistics;
DROP VIEW IF EXISTS pending_payments;
DROP VIEW IF EXISTS purchased_courses_view;
DROP VIEW IF EXISTS purchased_tests_view;
DROP VIEW IF EXISTS consultation_bookings_view;

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
-- PHẦN 2: BẢNG HOLLAND CODE ASSESSMENT SYSTEM
-- =====================================================

-- Bảng câu hỏi Holland Code (đã tối ưu từ thiết kế cũ)
CREATE TABLE questions (
    id INT(11) NOT NULL AUTO_INCREMENT,
    question_id VARCHAR(10) NOT NULL COMMENT 'ID gốc từ dữ liệu cũ (1, 2, 3...)',
    question_text TEXT NOT NULL COMMENT 'Nội dung câu hỏi',
    holland_code ENUM('R','I','A','S','E','C') NOT NULL COMMENT 'Mã Holland Code: R=Realistic, I=Investigative, A=Artistic, S=Social, E=Enterprising, C=Conventional',
    category ENUM('personality','interests','activities','subjects') DEFAULT 'personality' COMMENT 'Loại câu hỏi',
    difficulty_level ENUM('easy','medium','hard') DEFAULT 'medium' COMMENT 'Mức độ khó',
    sort_order INT(11) DEFAULT 0 COMMENT 'Thứ tự hiển thị câu hỏi',
    is_active TINYINT(1) DEFAULT 1 COMMENT 'Trạng thái kích hoạt',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY question_id (question_id),
    KEY idx_holland_code (holland_code),
    KEY idx_category (category),
    KEY idx_active (is_active),
    KEY idx_sort_order (sort_order),
    KEY idx_difficulty (difficulty_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng câu hỏi trắc nghiệm Holland Code để đánh giá hướng nghiệp';

-- =====================================================
-- PHẦN 2A: QUIZ SYSTEM TABLES - PACKAGE INTEGRATION
-- =====================================================

-- Bảng quiz_exams: Quản lý bài thi Holland Code với package integration
CREATE TABLE quiz_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Mã bài thi unique (EX20251101_ABC123)',
    user_id INT NOT NULL,
    exam_type TINYINT NOT NULL COMMENT '0=Free, 1=Paid (backward compatibility)',
    
    -- Package Integration
    package_id INT NULL COMMENT 'Link to product_packages',
    product_id INT NULL COMMENT 'Link to products',
    
    exam_status TINYINT DEFAULT 0 COMMENT '0=Draft(chưa submit), 1=Completed(đã submit)',
    
    -- Question info (dynamic based on package)
    total_questions INT NOT NULL COMMENT 'Dynamic based on package config',
    answered_questions INT DEFAULT 0,
    
    -- Timing (for display only, no business logic)
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    time_limit INT DEFAULT 0 COMMENT 'Thời gian giới hạn (0 = không giới hạn)',
    
    -- Tracking
    ip_address VARCHAR(45) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, exam_status),
    INDEX idx_exam_code (exam_code),
    INDEX idx_package_id (package_id),
    INDEX idx_product_id (product_id),
    INDEX idx_user_package (user_id, package_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng quản lý bài thi Holland Code với package integration';

-- Bảng quiz_package_configs: Cấu hình quiz cho từng package
CREATE TABLE quiz_package_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    package_id INT NOT NULL COMMENT 'Link to product_packages.id',
    product_id INT NOT NULL COMMENT 'Link to products.id',
    
    -- Quiz Configuration
    question_count INT NOT NULL DEFAULT 30 COMMENT 'Total questions per exam',
    questions_per_group INT NOT NULL DEFAULT 5 COMMENT 'Questions per Holland group (R,I,A,S,E,C)',
    time_limit_minutes INT DEFAULT 0 COMMENT 'Time limit (0 = unlimited)',
    max_attempts INT DEFAULT 1 COMMENT 'Max attempts per user',
    allow_review BOOLEAN DEFAULT TRUE COMMENT 'Allow reviewing answers',
    
    -- Report Configuration
    report_type ENUM('basic', 'standard', 'premium') DEFAULT 'basic',
    features JSON NULL COMMENT 'Additional features config',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_package (package_id),
    INDEX idx_config_product_id (product_id),
    INDEX idx_question_count (question_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cấu hình quiz cho từng package - flexible question counts';

-- Bảng quiz_answers: Chi tiết câu trả lời trong bài thi
CREATE TABLE quiz_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT NOT NULL,
    question_id VARCHAR(10) NOT NULL,
    user_answer TINYINT DEFAULT -1 COMMENT '-1=Chưa trả lời, 0=Không đồng ý, 1=Bình thường, 2=Đồng ý',
    answer_time TIMESTAMP NULL,
    is_changed BOOLEAN DEFAULT FALSE COMMENT 'Có thay đổi câu trả lời',
    change_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (exam_id) REFERENCES quiz_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE RESTRICT,
    UNIQUE KEY unique_exam_question (exam_id, question_id),
    INDEX idx_exam_id (exam_id),
    INDEX idx_answer_status (exam_id, user_answer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng chi tiết câu trả lời Holland Code với fixed choices [0,1,2]';

-- Bảng quiz_results: Kết quả Holland Code được tính toán  
CREATE TABLE quiz_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT UNIQUE NOT NULL,
    user_id INT NOT NULL,
    
    -- Điểm số 6 nhóm Holland (RIASEC)
    score_r INT DEFAULT 0 COMMENT 'Realistic - Kỹ thuật/Thực tế',
    score_i INT DEFAULT 0 COMMENT 'Investigative - Nghiên cứu/Điều tra',
    score_a INT DEFAULT 0 COMMENT 'Artistic - Nghệ thuật/Sáng tạo',
    score_s INT DEFAULT 0 COMMENT 'Social - Xã hội/Giúp đỡ',
    score_e INT DEFAULT 0 COMMENT 'Enterprising - Quản lý/Kinh doanh',
    score_c INT DEFAULT 0 COMMENT 'Conventional - Nghiệp vụ/Tổ chức',
    
    total_score INT NOT NULL,
    
    -- Holland Code 3 ký tự
    holland_code VARCHAR(3) NOT NULL COMMENT 'VD: AEI, RIC',
    primary_group CHAR(1) NOT NULL,
    secondary_group CHAR(1) NOT NULL,
    tertiary_group CHAR(1) NOT NULL,
    
    -- Đặc trưng công việc
    characteristics_code VARCHAR(2) NOT NULL COMMENT 'Từ 2 ký tự đầu Holland Code',
    work_activities JSON NULL COMMENT 'Hoạt động công việc',
    work_values JSON NULL COMMENT 'Top 3 giá trị làm việc',
    
    -- Metadata
    calculation_time FLOAT DEFAULT 0 COMMENT 'Thời gian tính toán (milliseconds)',
    has_fraud_flags BOOLEAN DEFAULT FALSE,
    fraud_details JSON NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (exam_id) REFERENCES quiz_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_holland (user_id, holland_code),
    INDEX idx_holland_code (holland_code),
    INDEX idx_primary_group (primary_group),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng kết quả Holland Code với 6 điểm số và phân tích';

-- Bảng quiz_suggested_jobs: Nghề nghiệp gợi ý theo hệ thống sao
CREATE TABLE quiz_suggested_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    result_id INT NOT NULL,
    
    -- Job information
    job_code VARCHAR(20) NOT NULL COMMENT 'Mã nghề nghiệp',
    job_name VARCHAR(255) NOT NULL,
    job_name_en VARCHAR(255) NULL,
    holland_code VARCHAR(3) NOT NULL,
    
    -- Matching details
    star_rating TINYINT NOT NULL COMMENT '2-5 sao',
    match_type ENUM('exact','permutation','two_char','single_char') NOT NULL,
    match_score DECIMAL(5,2) DEFAULT 0 COMMENT 'Điểm khớp %',
    
    -- Job details
    job_group VARCHAR(100) NULL COMMENT 'Nhóm nghề',
    essential_ability VARCHAR(255) NULL,
    supplementary_ability VARCHAR(255) NULL,
    work_environment VARCHAR(255) NULL,
    work_style VARCHAR(255) NULL,
    education_level VARCHAR(100) NULL,
    
    job_description TEXT NULL,
    work_areas JSON NULL COMMENT 'Nơi làm việc',
    main_tasks JSON NULL COMMENT 'Nhiệm vụ chính',
    
    -- Display control
    sort_order INT DEFAULT 0,
    is_highlighted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (result_id) REFERENCES quiz_results(id) ON DELETE CASCADE,
    INDEX idx_result_star (result_id, star_rating DESC, sort_order),
    INDEX idx_job_code (job_code),
    FULLTEXT INDEX idx_job_search (job_name, job_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng nghề nghiệp gợi ý với hệ thống sao từ 2-5';

-- Bảng quiz_fraud_logs: Log phát hiện gian lận
CREATE TABLE quiz_fraud_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    
    fraud_type ENUM('same_answers','insufficient_yes','time_too_fast','suspicious_pattern','other') NOT NULL,
    severity ENUM('low','medium','high','critical') DEFAULT 'medium',
    
    detection_details JSON NOT NULL COMMENT 'Chi tiết phát hiện',
    action_taken ENUM('warning','reset_exam','lock_12h','lock_24h','revoke_access','none') NOT NULL,
    
    admin_reviewed BOOLEAN DEFAULT FALSE,
    admin_notes TEXT NULL,
    
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES quiz_exams(id) ON DELETE CASCADE,
    INDEX idx_user_fraud (user_id, fraud_type),
    INDEX idx_severity (severity, created_at),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng log phát hiện và xử lý gian lận trong quiz';

-- Bảng quiz_user_limits: Giới hạn và khóa user
CREATE TABLE quiz_user_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    
    -- Free exam tracking
    free_exam_count INT DEFAULT 0 COMMENT 'Số lần làm bài miễn phí',
    free_exam_violations INT DEFAULT 0 COMMENT 'Số lần vi phạm free',
    last_free_exam TIMESTAMP NULL,
    
    -- Paid exam tracking
    paid_exam_count INT DEFAULT 0,
    paid_exam_violations INT DEFAULT 0 COMMENT 'Số lần vi phạm paid',
    last_paid_exam TIMESTAMP NULL,
    
    -- Lock status
    lock_until TIMESTAMP NULL COMMENT 'Khóa đến thời điểm',
    lock_reason VARCHAR(255) NULL,
    is_permanently_locked BOOLEAN DEFAULT FALSE,
    
    -- Access control
    access_revoked BOOLEAN DEFAULT FALSE,
    revoke_reason TEXT NULL,
    revoked_at TIMESTAMP NULL,
    
    -- Notes
    admin_notes TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_lock_status (lock_until, access_revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng quản lý giới hạn và khóa user cho quiz system';

-- Bảng kết quả làm bài test Holland Code (legacy, giữ cho backward compatibility)
CREATE TABLE test_results (
    id INT(11) NOT NULL AUTO_INCREMENT,
    result_id VARCHAR(50) NOT NULL COMMENT 'ID gốc từ MongoDB _id',
    user_id INT(11) NOT NULL COMMENT 'ID người dùng làm bài',
    exam_type TINYINT(1) DEFAULT 0 COMMENT 'Loại bài thi: 0=ngắn, 1=đầy đủ',
    exam_status TINYINT(1) DEFAULT 0 COMMENT 'Trạng thái bài thi: 0=hoàn thành, 1=đang làm, 2=hủy',
    
    -- Thống kê tổng quan
    total_questions INT(11) DEFAULT 0 COMMENT 'Tổng số câu hỏi',
    answered_questions INT(11) DEFAULT 0 COMMENT 'Số câu đã trả lời',
    total_score INT(11) DEFAULT 0 COMMENT 'Tổng điểm',
    total_time_minutes INT(11) DEFAULT 0 COMMENT 'Tổng thời gian làm bài (phút)',
    
    -- Điểm số theo 6 nhóm Holland Code
    r_score INT(11) DEFAULT 0 COMMENT 'Điểm Realistic (Kỹ thuật)',
    i_score INT(11) DEFAULT 0 COMMENT 'Điểm Investigative (Nghiên cứu)',
    a_score INT(11) DEFAULT 0 COMMENT 'Điểm Artistic (Nghệ thuật)',
    s_score INT(11) DEFAULT 0 COMMENT 'Điểm Social (Xã hội)',
    e_score INT(11) DEFAULT 0 COMMENT 'Điểm Enterprising (Quản lý)',
    c_score INT(11) DEFAULT 0 COMMENT 'Điểm Conventional (Nghiệp vụ)',
    
    -- Kết quả phân tích
    primary_code VARCHAR(10) DEFAULT NULL COMMENT 'Mã Holland Code chính (điểm cao nhất)',
    holland_code_result VARCHAR(20) DEFAULT NULL COMMENT 'Kết quả tổng hợp (ví dụ: ASE)',
    personality_type VARCHAR(100) DEFAULT NULL COMMENT 'Loại tính cách được phân tích',
    
    -- Thời gian
    exam_start_time INT(11) DEFAULT NULL COMMENT 'Unix timestamp bắt đầu làm bài',
    exam_end_time INT(11) DEFAULT NULL COMMENT 'Unix timestamp kết thúc dự kiến',
    exam_stop_time INT(11) DEFAULT NULL COMMENT 'Unix timestamp hoàn thành thực tế',
    
    -- Email và báo cáo
    sent_email TINYINT(1) DEFAULT 0 COMMENT 'Đã gửi email báo cáo',
    report_generated TINYINT(1) DEFAULT 0 COMMENT 'Đã tạo báo cáo',
    report_url VARCHAR(500) DEFAULT NULL COMMENT 'Link báo cáo PDF',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY result_id (result_id),
    KEY idx_user_id (user_id),
    KEY idx_exam_type (exam_type),
    KEY idx_exam_status (exam_status),
    KEY idx_primary_code (primary_code),
    KEY idx_exam_start_time (exam_start_time),
    KEY idx_sent_email (sent_email),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng lưu kết quả tổng quan của bài test Holland Code (legacy)';

-- Bảng chi tiết câu trả lời của từng test (legacy, giữ cho backward compatibility)
CREATE TABLE test_answers (
    id INT(11) NOT NULL AUTO_INCREMENT,
    test_result_id INT(11) NOT NULL COMMENT 'ID kết quả test',
    question_id VARCHAR(10) NOT NULL COMMENT 'ID câu hỏi (reference đến questions.question_id)',
    chosen_answer TINYINT(1) NOT NULL COMMENT 'Đáp án được chọn: 0=Không đồng ý, 1=Trung lập, 2=Đồng ý',
    answer_time INT(11) DEFAULT NULL COMMENT 'Unix timestamp thời điểm trả lời',
    time_spent INT(11) DEFAULT NULL COMMENT 'Thời gian suy nghĩ (giây)',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    KEY idx_test_result_id (test_result_id),
    KEY idx_question_id (question_id),
    KEY idx_chosen_answer (chosen_answer),
    KEY idx_answer_time (answer_time),
    UNIQUE KEY unique_test_question (test_result_id, question_id),
    FOREIGN KEY (test_result_id) REFERENCES test_results (id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions (question_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Bảng lưu chi tiết câu trả lời của từng bài test Holland Code (legacy)';

-- =====================================================
-- PHẦN 3: BẢNG SAN PHẨM VÀ SHOPPING CART
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
-- PHẦN 4: BỔ SUNG CÁC CƠ CHẾ ĐỒNG BỘ VÀ RÀNG BUỘC
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
-- PHẦN 5: VIEWS VÀ PROCEDURES CHO QUIZ PACKAGE SYSTEM
-- =====================================================

-- View tổng hợp thông tin quiz package details
DROP VIEW IF EXISTS quiz_package_details;

CREATE VIEW quiz_package_details AS
SELECT 
    qpc.id as config_id,
    qpc.package_id,
    qpc.product_id,
    qpc.question_count,
    qpc.questions_per_group,
    qpc.time_limit_minutes,
    qpc.max_attempts,
    qpc.report_type,
    qpc.features,
    
    -- Package info
    pp.package_name,
    pp.package_slug,
    pp.package_description,
    pp.original_price,
    pp.sale_price,
    pp.is_free,
    pp.status as package_status,
    
    -- Product info
    p.name as product_name,
    p.slug as product_slug,
    p.type as product_type,
    p.short_description as product_description,
    p.status as product_status
FROM quiz_package_configs qpc
JOIN product_packages pp ON qpc.package_id = pp.id
JOIN products p ON qpc.product_id = p.id;

-- =====================================================
-- STORED PROCEDURES CHO QUIZ PACKAGE SYSTEM
-- =====================================================

-- Function để get exam type từ question count (backward compatibility)
DELIMITER $$

DROP FUNCTION IF EXISTS GetExamTypeFromQuestionCount$$

CREATE FUNCTION GetExamTypeFromQuestionCount(p_question_count INT) 
RETURNS VARCHAR(10)
READS SQL DATA
DETERMINISTIC
BEGIN
    IF p_question_count <= 30 THEN
        RETURN 'FREE';
    ELSE
        RETURN 'PAID';
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- TRIGGERS CHO QUIZ PACKAGE SYSTEM
-- =====================================================

-- Trigger để auto-update exam_type khi insert quiz_exams with package_id
DELIMITER $$

DROP TRIGGER IF EXISTS tr_quiz_exams_set_exam_type$$

CREATE TRIGGER tr_quiz_exams_set_exam_type 
BEFORE INSERT ON quiz_exams
FOR EACH ROW
BEGIN
    DECLARE v_question_count INT DEFAULT 30;
    DECLARE v_product_id INT;
    
    -- If package_id is provided, get question count from config
    IF NEW.package_id IS NOT NULL THEN
        SELECT question_count, product_id INTO v_question_count, v_product_id
        FROM quiz_package_configs 
        WHERE package_id = NEW.package_id;
        
        -- Set total_questions and product_id
        SET NEW.total_questions = v_question_count;
        SET NEW.product_id = v_product_id;
        
        -- Set exam_type based on question count (for backward compatibility)
        SET NEW.exam_type = CASE 
            WHEN v_question_count <= 30 THEN 0  -- FREE
            ELSE 1  -- PAID
        END;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- HOÀN THÀNH TẠO CẤU TRÚC DATABASE
-- =====================================================
SELECT 'All tables created successfully!' as message,
       'Includes quiz system + shopping cart + users' as info,
       'Run sample-data.sql then sample-quiz-data.sql for demo data' as next_step;
