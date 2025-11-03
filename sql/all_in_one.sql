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

-- Drop quiz system tables (new)
DROP TABLE IF EXISTS quiz_suggested_jobs;
DROP TABLE IF EXISTS quiz_fraud_logs;
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
-- PHẦN 2A: QUIZ SYSTEM TABLES (TRIỂN KHAI MỚI)
-- =====================================================

-- Bảng quiz_exams: Quản lý bài thi Holland Code
CREATE TABLE quiz_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Mã bài thi unique (EX20251101_ABC123)',
    user_id INT NOT NULL,
    exam_type TINYINT NOT NULL COMMENT '0=Free(30 câu), 1=Paid(120 câu)',
    exam_status TINYINT DEFAULT 0 COMMENT '0=Draft(chưa submit), 1=Completed(đã submit)',
    
    -- Question info
    total_questions INT NOT NULL,
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
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng quản lý bài thi Holland Code - Simplified: No time limits, only DRAFT/COMPLETED';

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
-- HOÀN THÀNH TẠO CẤU TRÚC DATABASE
-- =====================================================
SELECT 'All tables created successfully!' as message,
       'Includes quiz system + shopping cart + users' as info,
       'Run sample-data.sql then sample-quiz-data.sql for demo data' as next_step;

-- =====================================================
-- PAC Shopping Cart Database - Dữ liệu mẫu mới
-- Dựa trên tài liệu thực tế của PAC
-- =====================================================

-- Xóa dữ liệu cũ (nếu có) - theo thứ tự tránh foreign key constraint
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM vnpay_transactions;
DELETE FROM purchased_packages;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart;
DELETE FROM product_packages;
DELETE FROM products;
DELETE FROM sessions;
DELETE FROM users;

SET FOREIGN_KEY_CHECKS = 1;

-- Reset AUTO_INCREMENT
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE product_packages AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;
ALTER TABLE order_items AUTO_INCREMENT = 1;
ALTER TABLE purchased_packages AUTO_INCREMENT = 1;
ALTER TABLE vnpay_transactions AUTO_INCREMENT = 1;

-- =====================================================
-- PHẦN 1: TẠO TÀI KHOẢN DEMO
-- =====================================================

-- Tài khoản admin
INSERT INTO users (fullname, email, username, password, phone, status, role, email_verified) VALUES
('Admin PAC', 'admin@pac.edu.vn', 'admin', '123456', '0966013663', 'active', 'admin', 1);

-- Tài khoản khách hàng demo
INSERT INTO users (fullname, email, username, password, phone, status, role, email_verified) VALUES
('Nguyễn Văn A', 'customer@example.com', 'customer', '123456', '0901234567', 'active', 'user', 1);

-- =====================================================
-- PHẦN 2: TẠO SẢN PHẨM VÀ CÁC GÓI
-- =====================================================

-- 1. SẢN PHẨM: Hướng nghiệp trực tuyến
INSERT INTO products (
    name, slug, short_description, full_description, type, category,
    duration, target_audience, learning_outcomes, 
    question_count, age_range, image_url, status, sort_order
) VALUES (
    'Hướng nghiệp trực tuyến',
    'huong-nghiep-truc-tuyen',
    'Ngay lập tức khám phá tính cách và định hướng nghề nghiệp phù hợp',
    '<h3>Giới thiệu</h3>
    <p>Bài kiểm tra và đánh giá về tính cách, nhận thức, và kĩ năng của học sinh được thiết kế và xây dựng dựa trên các nghiên cứu và mô hình khoa học về đánh giá tâm lý, lý thuyết chọn nghề, và bao gồm các hoạt động đánh giá trực tuyến và đánh giá, tư vấn trực tiếp.</p>
    
    <h3>Đối tượng phù hợp</h3>
    <ul>
        <li>Học sinh PTTH (14-18 tuổi)</li>
        <li>Sinh viên đại học (18-22 tuổi)</li>
        <li>Người cần định hướng nghề nghiệp</li>
    </ul>
    
    <h3>Nội dung đánh giá</h3>
    <p>Thông qua hoạt động này, học sinh sẽ tự khám phá điểm mạnh, điểm yếu, tiềm năng, và mức độ phù hợp giữa nhận thức và tính cách của bản thân với các ngành nghề và lĩnh vực cụ thể.</p>',
    'career_test',
    'assessment',
    '30-45 phút',
    '["Học sinh PTTH", "Sinh viên đại học", "Người cần định hướng nghề nghiệp"]',
    '<h3>Kết quả sau khi hoàn thành</h3>
    <ul>
        <li>Khám phá điểm mạnh, điểm yếu, tiềm năng của bản thân</li>
        <li>Tìm hiểu về các nhóm nghề phù hợp với tính cách và sở thích cá nhân</li>
        <li>Nhận được báo cáo chi tiết về tính cách và định hướng nghề nghiệp</li>
        <li>Hiểu rõ môi trường làm việc phù hợp với bản thân</li>
    </ul>',
    120, -- Câu hỏi tối đa (tùy gói)
    '14-22 tuổi',
    'assets/img/pic/huong_nghiep_truc_tuyen.jpg',
    'active',
    1
);

-- Gói miễn phí cho test hướng nghiệp
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, special_features, 
    image_url, sort_order
) VALUES (
    1, 'Gói Khởi động', 'khoi-dong',
    '<h3>Hướng nghiệp trực tuyến - Miễn phí</h3>
    <p><strong>Test miễn phí</strong> với báo cáo cơ bản giúp bạn khởi đầu hành trình khám phá bản thân.</p>
    
    <hr>
    
    <h3>Thông tin chi tiết</h3>
    <ul>
        <li><strong>Số câu hỏi:</strong> 30 câu</li>
        <li><strong>Thời gian:</strong> 30 phút</li>
        <li><strong>Lứa tuổi:</strong> 14-18 tuổi</li>
        <li><strong>Báo cáo:</strong> 5 trang</li>
    </ul>
    
    <hr>
    
    <h3>Nội dung báo cáo</h3>
    <ul>
        <li>Tổng quan mã tính cách tương ứng với môi trường nghề nghiệp, xu hướng và sở thích cá nhân</li>
        <li>Đánh giá điểm mạnh của bản thân</li>
        <li>Gợi ý các giá trị cần bồi dưỡng</li>
        <li>Gợi ý về đặc điểm của môi trường làm việc phù hợp với bản thân</li>
        <li>Gợi ý các nhóm nghề phù hợp với sở thích cá nhân</li>
    </ul>',
    0.00, NULL, TRUE,
    '["30 câu hỏi", "Báo cáo 5 trang", "Tổng quan tính cách", "Gợi ý nghề nghiệp cơ bản", "Miễn phí 100%"]',
    'assets/img/icon/start.jpg',
    1
);

-- Gói có phí cho test hướng nghiệp  
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, special_features, 
    image_url, sort_order
) VALUES (
    1, 'Gói Tăng tốc', 'tang-toc',
    '<h3>Hướng nghiệp trực tuyến - Tăng tốc</h3>
    <p><strong>Test chuyên sâu</strong> với báo cáo chi tiết 25-26 trang, phân tích toàn diện về tính cách và nghề nghiệp.</p>
    
    <hr>
    
    <h3>Thông tin chi tiết</h3>
    <ul>
        <li><strong>Số câu hỏi:</strong> 120 câu</li>
        <li><strong>Ngôn ngữ:</strong> Tiếng Việt</li>
        <li><strong>Lứa tuổi:</strong> 14-22 tuổi</li>
        <li><strong>Báo cáo:</strong> 25-26 trang chi tiết</li>
    </ul>
    
    <hr>
    
    <h3>Nội dung báo cáo chi tiết</h3>
    <ul>
        <li>Tổng quan mã tính cách tương ứng với môi trường nghề nghiệp, xu hướng và sở thích cá nhân</li>
        <li>Phân tích nhóm tính cách, điểm mạnh và phong cách làm việc đặc trưng</li>
        <li>Gợi ý các giá trị cần bồi dưỡng</li>
        <li>Đánh giá các lĩnh vực quan tâm và ngành học/lĩnh vực học</li>
        <li>Phân tích vai trò trong công việc và môi trường làm việc phù hợp</li>
        <li>Gợi ý các nhóm nghề để phát triển tối đa các mối quan tâm và sở thích của bản thân</li>
        <li>Hướng dẫn sử dụng các công cụ và nguồn tài nguyên để phân tích điểm mạnh, điểm yếu, và độ phù hợp của bản thân với ngành, nghề cụ thể</li>
    </ul>',
    1975000.00, NULL, FALSE,
    '["120 câu hỏi", "Báo cáo 25-26 trang", "Phân tích tính cách chi tiết", "Gợi ý nghề nghiệp cụ thể", "Hướng dẫn phát triển", "Ngôn ngữ Tiếng Việt"]',
    'assets/img/icon/speedup.jpg',
    2
);

-- 2. SẢN PHẨM: KHÓA HỌC VIẾT LUẬN TĂNG CƯỜNG
INSERT INTO products (
    name, slug, short_description, full_description, type, category,
    duration, target_audience, learning_outcomes, curriculum,
    instructor_info, teaching_format, image_url, status, sort_order
) VALUES (
    'Viết luận tăng cường',
    'viet-luan-tang-cuong',
    'Hướng dẫn các kỹ thuật viết bài luận học thuật ở các bậc học',
    '<h3>Giới thiệu khóa học</h3>
    <p>Khóa học được thiết kế để hướng dẫn học sinh tiếp cận và hiểu các khái niệm, kỹ năng viết luận căn bản, giúp học viên có thể xử lý các dạng bài luận học thuật một cách tự tin và có kĩ năng.</p>
    
    <hr>
    
    <h3>Đối tượng</h3>
    <ul>
        <li>Học sinh PTTH chuẩn bị đi du học</li>
        <li>Học sinh Đại học chuẩn bị đi du học</li>
        <li>Học sinh PTTH hoặc Đại học chuẩn bị học tập tại các trường Quốc tế tại Việt Nam</li>
    </ul>
    
    <hr>
    
    <h3>Nội dung học</h3>
    <p>Nội dung chính của khóa học tập trung vào các lý thuyết và kĩ thuật viết luận cả tổng quát và chi tiết:</p>
    <ul>
        <li>Các loại viết học thuật thường gặp</li>
        <li>Cấu trúc bài luận và đoạn văn</li>
        <li>Kỹ thuật liên kết ý và cấu trúc câu</li>
        <li>Đánh giá nguồn tài liệu và ghi chú</li>
        <li>Kỹ thuật tóm tắt và trích dẫn</li>
        <li>Cách tránh lỗi đạo văn</li>
    </ul>
    
    <hr>
    
    <h3>Thông tin giảng dạy</h3>
    <ul>
        <li><strong>Thời lượng:</strong> 16 giờ</li>
        <li><strong>Hình thức:</strong> Trực tiếp hoặc trực tuyến</li>
        <li><strong>Giảng viên:</strong> Thạc sĩ Ngôn ngữ Anh</li>
        <li><strong>Ưu đãi:</strong> Khi đăng ký cùng các khóa học khác hoặc đăng ký theo nhóm</li>
    </ul>',
    'course',
    'writing',
    '16 giờ',
    '["Học sinh PTTH chuẩn bị du học", "Sinh viên đại học chuẩn bị du học", "Học sinh học tại trường quốc tế"]',
    '<h3>Kết quả mong đợi sau khóa học</h3>
    <ul>
        <li>Hiểu về các dạng bài luận căn bản và áp dụng kĩ thuật viết hiệu quả để thực hành viết với các mục đích học thuật khác nhau</li>
        <li>Hiểu và áp dụng các kỹ thuật trích dẫn, viết lại ý và tóm tắt</li>
        <li>Biết cách lập luận thuyết phục trên cơ sở dẫn chứng</li>
        <li>Có thể đọc và phân tích, hiểu cấu trúc của đoạn văn/bài đọc, nắm bắt cách tổ chức ý của bài</li>
        <li>Biết cách đánh giá nguồn tài liệu và chọn tài liệu phù hợp để tham khảo</li>
        <li>Hiểu đúng về cách trích dẫn tài liệu tham khảo để tránh lỗi đạo văn</li>
    </ul>',
    '<h3>Chương trình học</h3>
    <p><em>Nội dung chi tiết sẽ được cung cấp khi đăng ký</em></p>
    
    <h3>Cấu trúc bài giảng</h3>
    <p><em>Nội dung chi tiết sẽ được cung cấp khi đăng ký</em></p>',
    'Thạc sĩ Ngôn ngữ Anh',
    'both',
    'assets/img/pic/1.jpg',
    'active',
    2
);

-- Gói nhóm 6 học viên
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    2, 'Nhóm 6 học viên', 'nhom-6',
    '<h3>Chương trình giảng dạy nhóm 5-6 học viên</h3>
    <p>Chương trình giảng dạy chuyên biệt dành cho nhóm 5-6 học viên với mức giá ưu đãi nhất.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong class="text-success">5.199.000đ</strong> <span class="text-muted"><s>6.999.000đ</s></span></p>
    
    <hr>
    
    <h3>Đặc điểm</h3>
    <ul>
        <li>Lịch học cố định</li>
        <li>Tương tác nhóm tốt</li>
        <li>Giá ưu đãi nhất</li>
        <li>Liên hệ Hotline 0966013663 nếu có nhu cầu tổ chức khóa học khác</li>
    </ul>',
    6999000.00, 5199000.00, FALSE,
    '5-6 học viên',
    '["Lịch học cố định", "Tương tác nhóm", "Giá ưu đãi nhất", "Hỗ trợ qua Hotline 0966013663"]',
    'assets/img/packages/course-group-6.jpg',
    1
);

-- Gói nhóm 4 học viên  
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    2, 'Nhóm 4 học viên', 'nhom-4',
    '<h3>Chương trình giảng dạy nhóm 3-4 học viên</h3>
    <p>Chương trình giảng dạy chuyên biệt dành cho nhóm 3-4 học viên với lịch học linh hoạt.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong class="text-success">7.600.000đ</strong> <span class="text-muted"><s>9.999.000đ</s></span></p>
    
    <hr>
    
    <h3>Đặc điểm</h3>
    <ul>
        <li>Lịch học linh hoạt theo sắp xếp của giảng viên và học viên</li>
        <li>Tương tác tốt hơn</li>
        <li>Chất lượng cao</li>
        <li>Liên hệ Hotline 0966013663 nếu có nhu cầu tổ chức khóa học khác</li>
    </ul>',
    9999000.00, 7600000.00, FALSE,
    '3-4 học viên',
    '["Lịch học linh hoạt", "Tương tác tốt hơn", "Chất lượng cao", "Hỗ trợ qua Hotline 0966013663"]',
    'assets/img/packages/course-group-4.jpg',
    2
);

-- Gói cá nhân 1:1
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    2, 'Học cá nhân 1:1', 'ca-nhan-1-1',
    '<h3>Chương trình cá nhân hóa 1:1</h3>
    <p>Chương trình và hoạt động giảng dạy cá nhân hóa theo nhu cầu, thời gian, và trình độ đầu vào của học viên.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong class="text-success">19.800.000đ</strong> <span class="text-muted"><s>21.000.000đ</s></span></p>
    
    <hr>
    
    <h3>Đặc điểm</h3>
    <ul>
        <li>Lịch học hoàn toàn cá nhân hóa</li>
        <li>Nội dung tùy chỉnh theo nhu cầu</li>
        <li>Chất lượng tối ưu</li>
        <li>Hỗ trợ 1:1 toàn thời gian</li>
        <li>Liên hệ Hotline 0966013663 để trao đổi thêm chi tiết</li>
    </ul>',
    21000000.00, 19800000.00, FALSE,
    '1 học viên',
    '["Lịch học cá nhân hóa", "Nội dung tùy chỉnh", "Chất lượng tối ưu", "Hỗ trợ 1:1", "Hỗ trợ qua Hotline 0966013663"]',
    'assets/img/packages/course-1on1.jpg',
    3
);

-- 3. SẢN PHẨM: KHÓA HỌC ESSAY COACHING  
INSERT INTO products (
    name, slug, short_description, full_description, type, category,
    duration, target_audience, learning_outcomes, curriculum,
    instructor_info, teaching_format, image_url, status, sort_order
) VALUES (
    'Viết luận chuyên sâu – Essay Coaching',
    'essay-coaching',
    'Hướng dẫn hoàn chỉnh 01 bài luận có độ dài 500-1000 từ',
    '<h3>Hướng dẫn hoàn chỉnh 1 bài luận</h3>
    <p>Hướng dẫn hoàn chỉnh 01 bài luận có độ dài 500-1000 từ theo ý tưởng và chủ đề học sinh tự chọn.</p>
    
    <hr>
    
    <h3>Đối tượng</h3>
    <ul>
        <li>Học sinh chuẩn bị bài luận cá nhân ứng tuyển hồ sơ PTTH và Đại học</li>
        <li>Học sinh chuẩn bị bài luận chuyên biệt xin học bổng PTTH và Đại học</li>
        <li>Học sinh chuẩn bị hồ sơ ứng tuyển chương trình hè</li>
        <li>Học sinh chuẩn bị bài luận ứng tuyển các cuộc thi viết, các dự án nghiên cứu bậc PTTH</li>
    </ul>
    
    <hr>
    
    <h3>Chủ điểm học</h3>
    <p>Khóa học được thiết kế để hướng dẫn học sinh tiếp cận và hiểu các khái niệm, kỹ năng viết luận căn bản, giúp học viên có thể xử lý các dạng bài luận học thuật một cách tự tin và có kĩ năng.</p>
    
    <hr>
    
    <h3>Thông tin khóa học</h3>
    <ul>
        <li><strong>Thời lượng:</strong> 10 giờ</li>
        <li><strong>Hình thức:</strong> Trực tiếp hoặc trực tuyến 1-1</li>
        <li><strong>Giảng viên:</strong> Cử nhân hoặc Thạc sĩ trong và ngoài nước</li>
        <li><strong>Áp dụng cho:</strong> 01 bài luận PTTH, Đại học, Thạc sĩ, Chương trình hè/Dự án nghiên cứu có độ dài 500-1000 từ</li>
        <li><strong>Ưu đãi:</strong> Khi đăng ký cùng các khóa học khác hoặc đăng ký theo nhóm</li>
    </ul>',
    'course',
    'writing',
    '10 giờ (5 buổi)',
    '["Học sinh chuẩn bị hồ sơ PTTH", "Học sinh xin học bổng", "Học sinh tham gia chương trình hè", "Học sinh tham gia cuộc thi viết"]',
    '<h3>Kết quả mong đợi sau khóa học</h3>
    <ul>
        <li>Nắm được cấu trúc bài luận</li>
        <li>Biết cách lên ý tưởng và chủ đề dựa trên câu chuyện của chính mình</li>
        <li>Học được cách bố cục một bài luận</li>
        <li>Học sinh có thể viết bài luận đáp ứng tiêu chí và yêu cầu của đề bài</li>
    </ul>',
    '<h3>Chương trình học (5 buổi)</h3>
    <ul>
        <li><strong>Buổi 1:</strong> Phân tích bộ hồ sơ cá nhân: điểm mạnh, điểm yếu, thành tích đã có. Tìm kiếm ý tưởng và câu chuyện cho bài luận chính. Đạo đức trong viết luận và chuẩn bị bộ hồ sơ cá nhân.</li>
        
        <li><strong>Buổi 2:</strong> Phản biện và phân tích về tính phù hợp và độc đáo của chủ đề. Các cách khai thác và triển khai bài luận theo chủ đề, cấu trúc đoạn văn và bài văn. Luyện tập viết bản nháp số 1.</li>
        
        <li><strong>Buổi 3:</strong> Phân tích và phản hồi bài luận nháp số 1: ngữ pháp và từ vựng, khả năng triển khai ý, văn phong, và thủ pháp văn học. Hướng dẫn cách phân tích các bài luận mẫu tham khảo và các kỹ năng viết hiệu quả.</li>
        
        <li><strong>Buổi 4:</strong> Phân tích và phản hồi bài luận nháp số 2: ngữ pháp và từ vựng, khả năng triển khai ý, văn phong, và thủ pháp văn học. Luyện tập phân tích các bài luận mẫu tham khảo và áp dụng các kỹ năng viết nâng cao.</li>
        
        <li><strong>Buổi 5:</strong> Sự thống nhất về cấu trúc và cách thức thể hiện của bài luận với toàn bộ hồ sơ xin học của học sinh. Hướng dẫn viết bài luận hoàn chỉnh.</li>
    </ul>
    
    <h3>Cấu trúc bài giảng</h3>
    <ul>
        <li>Thảo luận</li>
        <li>Viết</li>
        <li>Hỏi đáp</li>
        <li>Phân tích tình huống</li>
    </ul>',
    'Cử nhân hoặc Thạc sĩ trong và ngoài nước',
    'both',
    'assets/img/pic/2.png',
    'active',
    3
);

-- Essay Coaching chỉ có 1 gói (1:1 coaching)
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    3, 'Essay Coaching 1:1', 'essay-coaching-1-1',
    '<h3>Essay Coaching cá nhân 1:1</h3>
    <p>Hướng dẫn cá nhân hoàn thiện 1 bài luận từ ý tưởng đến thành phẩm hoàn chỉnh.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong>Nội dung trống trong tài liệu gốc</strong></p>
    
    <hr>
    
    <h3>Đặc điểm nổi bật</h3>
    <ul>
        <li>10 giờ học 1:1 với chuyên gia</li>
        <li>5 buổi coaching chi tiết</li>
        <li>1 bài luận hoàn chỉnh chất lượng cao</li>
        <li>Feedback chi tiết từ chuyên gia</li>
        <li>Lịch học linh hoạt theo nhu cầu</li>
        <li>Cá nhân hóa 100% theo mục tiêu của học sinh</li>
    </ul>',
    1299000.00, 899000.00, FALSE,
    '1 học viên',
    '["10 giờ học 1:1", "5 buổi coaching", "1 bài luận hoàn chỉnh", "Feedback chi tiết", "Lịch học linh hoạt", "Cá nhân hóa 100%"]',
    'assets/img/packages/essay-coaching.jpg',
    1
);

-- 4. SẢN PHẨM: KHÓA HỌC CV VÀ PHỎNG VẤN
INSERT INTO products (
    name, slug, short_description, full_description, type, category,
    duration, target_audience, learning_outcomes,
    instructor_info, teaching_format, image_url, status, sort_order
) VALUES (
    'Xây dựng CV và Hướng dẫn kỹ năng Phỏng vấn',
    'cv-va-phong-van',
    'Hướng dẫn học sinh có buổi phỏng vấn thành công và gây ấn tượng',
    '<h3>Xây dựng CV (Resumé) và Hướng dẫn kỹ năng Phỏng vấn</h3>
    <p>Hướng dẫn học sinh cách thức để có buổi phỏng vấn thành công và gây ấn tượng với nhà tuyển dụng.</p>
    
    <hr>
    
    <h3>Đối tượng</h3>
    <ul>
        <li>Học sinh chuẩn bị ứng tuyển hồ sơ PTTH và Đại học</li>
        <li>Học sinh chuẩn bị ứng tuyển các cuộc thi/dự án chuyên biệt bậc PTTH và Đại học</li>
    </ul>
    
    <hr>
    
    <h3>Chủ điểm học/Nội dung học</h3>
    <p>Hướng dẫn học sinh cách thức để có buổi phỏng vấn thành công và gây ấn tượng.</p>
    
    <hr>
    
    <h3>Thông tin khóa học</h3>
    <ul>
        <li><strong>Thời lượng:</strong> 08 giờ</li>
        <li><strong>Hình thức:</strong> Trực tiếp hoặc trực tuyến 1-1</li>
        <li><strong>Giảng viên:</strong> Cử nhân hoặc Thạc sĩ trong và ngoài nước</li>
        <li><strong>Ưu đãi:</strong> Khi đăng ký cùng các khóa học khác hoặc đăng ký theo nhóm</li>
    </ul>
    
    <hr>
    
    <h3>Cấu trúc bài giảng</h3>
    <ul>
        <li>Thảo luận</li>
        <li>Viết</li>
        <li>Hỏi đáp</li>
        <li>Phân tích tình huống</li>
    </ul>',
    'course',
    'career_skills',
    '8 giờ',
    '["Học sinh chuẩn bị ứng tuyển PTTH", "Học sinh chuẩn bị ứng tuyển đại học", "Học sinh tham gia cuộc thi/dự án"]',
    '<h3>Kết quả mong đợi sau khóa học</h3>
    <ul>
        <li>Biết cách xây dựng CV chuyên nghiệp và ấn tượng</li>
        <li>Nắm vững các kỹ năng phỏng vấn cơ bản và nâng cao</li>
        <li>Tự tin thể hiện bản thân trong các buổi phỏng vấn</li>
        <li>Hiểu rõ cách chuẩn bị và trình bày hồ sơ cá nhân hiệu quả</li>
    </ul>',
    'Cử nhân hoặc Thạc sĩ trong và ngoài nước',
    'both',
    'assets/img/pic/3.png',
    'active',
    4
);

-- 5. SẢN PHẨM: HƯỚNG NGHIỆP CHUYÊN GIA
INSERT INTO products (
    name, slug, short_description, full_description, type, category,
    duration, target_audience, learning_outcomes, curriculum,
    instructor_info, teaching_format, image_url, status, sort_order
) VALUES (
    'Hướng nghiệp cùng chuyên gia',
    'huong-nghiep-chuyen-gia',
    'Tư vấn hướng nghiệp chuyên sâu 1:1 với chuyên gia giáo dục quốc tế',
    'Dịch vụ hướng nghiệp toàn diện với chuyên gia từ IECA, ACAC, CIS. Bao gồm đánh giá tâm lý có bản quyền, tư vấn 1:1, và báo cáo cá nhân hóa chi tiết.',
    'consultation',
    'career_guidance',
    'Theo lịch cá nhân (5-6 buổi)',
    '["Học sinh 14-18 tuổi", "Học sinh chuẩn bị du học", "Học sinh chưa định hướng rõ ngành nghề"]',
    'Xác định rõ nghề nghiệp và ngành học phù hợp. Lập được lộ trình học tập dài hạn. Hiểu rõ điểm mạnh và phương hướng phát triển.',
    '{"buoc_1": "3 bài đánh giá tâm lý có bản quyền", "buoc_2": "Tư vấn 1:1 với chuyên gia về nghề nghiệp", "buoc_3": "Phân tích báo cáo và định hướng", "extras": "Tư vấn môn học quốc tế (gói Toàn diện)"}',
    'Chuyên gia từ IECA, ACAC, CIS với 10+ năm kinh nghiệm',
    'both',
    'assets/img/pic/huong_nghiep_chuyen_gia.jpg',
    'active',
    5
);

-- Gói Cố vấn Thành viên
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    4, 'Cố vấn Thành viên', 'co-van-thanh-vien',
    '<h3>Cố vấn Thành viên</h3>
    <p>Tư vấn cơ bản về CV và kỹ năng phỏng vấn với chuyên gia có kinh nghiệm.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong>9.900.000đ</strong> (giá gốc 9.900.000đ)</p>
    <p><em>Ưu đãi khi đăng ký cùng các khóa học khác hoặc đăng ký theo nhóm.</em></p>
    
    <hr>
    
    <h3>Đặc điểm nổi bật</h3>
    <ul>
        <li>8 giờ tư vấn chuyên sâu</li>
        <li>CV cá nhân hóa theo ngành</li>
        <li>Luyện phỏng vấn thực tế</li>
        <li>Cố vấn có kinh nghiệm</li>
        <li>Hỗ trợ tư vấn thêm qua hotline</li>
    </ul>',
    9900000.00, NULL, FALSE,
    '1 học viên',
    '["8 giờ tư vấn", "CV cá nhân hóa", "Luyện phỏng vấn", "Cố vấn có kinh nghiệm", "Ưu đãi khi đăng ký combo"]',
    'assets/img/packages/cv-advisor-basic.jpg',
    1
);

-- Gói Cố vấn Cao cấp
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    4, 'Cố vấn Cao cấp', 'co-van-cao-cap',
    '<h3>Cố vấn Cao cấp</h3>
    <p>Tư vấn chuyên sâu với chuyên gia hàng đầu, dịch vụ cao cấp và toàn diện.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong>15.900.000đ</strong> (giá gốc 15.900.000đ)</p>
    <p><em>Ưu đãi khi đăng ký cùng các khóa học khác hoặc đăng ký theo nhóm.</em></p>
    
    <hr>
    
    <h3>Đặc điểm nổi bật</h3>
    <ul>
        <li>8 giờ tư vấn cao cấp với chuyên gia senior</li>
        <li>CV chuyên nghiệp đẳng cấp quốc tế</li>
        <li>Mock interview (phỏng vấn mô phỏng) chi tiết</li>
        <li>Chuyên gia senior với kinh nghiệm quốc tế</li>
        <li>Hỗ trợ sau khóa học dài hạn</li>
        <li>Ưu tiên hỗ trợ qua hotline</li>
    </ul>',
    15900000.00, NULL, FALSE,
    '1 học viên',
    '["8 giờ tư vấn cao cấp", "CV chuyên nghiệp quốc tế", "Mock interview", "Chuyên gia senior", "Hỗ trợ sau khóa học", "Ưu đãi combo"]',
    'assets/img/packages/cv-advisor-premium.jpg',
    2
);

-- CÁC GÓI CHO HƯỚNG NGHIỆP CHUYÊN GIA (product_id = 5)
-- Gói Học đường
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    5, 'Gói Học đường', 'hoc-duong',
    '<h3>Gói Học đường</h3>
    <p><strong>Hướng nghiệp chuyên sâu cho học sinh 15-18 tuổi</strong></p>
    <p>Dành cho học sinh đang tìm hiểu về định hướng chuyên ngành và lộ trình học tập phù hợp.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong>14.750.000đ</strong> (giá gốc 14.750.000đ)</p>
    <p><em>Dành riêng cho học sinh 15-18 tuổi</em></p>
    
    <hr>
    
    <h3>Đối tượng phù hợp</h3>
    <ul>
        <li>Học sinh 15-18 tuổi</li>
        <li>Cần định hướng chuyên ngành</li>
        <li>Lập kế hoạch học tập dài hạn</li>
        <li>Khám phá điểm mạnh bản thân</li>
    </ul>
    
    <hr>
    
    <h3>Quy trình thực hiện</h3>
    <ul>
        <li><strong>3 bài đánh giá tâm lý có bản quyền</strong></li>
        <li><strong>5 buổi tư vấn 1:1</strong> với chuyên gia</li>
        <li><strong>3 báo cáo cá nhân hóa</strong> chi tiết</li>
        <li><strong>Song ngữ Việt-Anh</strong> linh hoạt</li>
    </ul>
    
    <hr>
    
    <h3>Đội ngũ chuyên gia</h3>
    <ul>
        <li>Chứng nhận từ IECA, ACAC, CIS</li>
        <li>Kinh nghiệm quốc tế 10+ năm</li>
        <li>Chuyên sâu về giáo dục</li>
    </ul>
    
    <hr>
    <h3>Kết quả đạt được</h3>
    <ul>
        <li>Lộ trình học tập rõ ràng</li>
        <li>Chuyên ngành phù hợp</li>
        <li>Hiểu rõ điểm mạnh bản thân</li>
        <li>Kế hoạch phát triển cá nhân</li>
    </ul>',
    14750000.00, NULL, FALSE,
    '1 học viên',
    '["3 bài đánh giá tâm lý có bản quyền", "5 buổi tư vấn 1:1", "3 báo cáo cá nhân hóa", "Chuyên gia IECA/ACAC/CIS", "Lứa tuổi 15-18", "Song ngữ Việt-Anh"]',
    'assets/img/icon/sand_clock.png',
    1
);

-- Gói Toàn diện  
INSERT INTO product_packages (
    product_id, package_name, package_slug, package_description,
    original_price, sale_price, is_free, group_size,
    special_features, image_url, sort_order
) VALUES (
    5, 'Gói Toàn diện', 'toan-dien',
    '<h3>Gói Toàn diện</h3>
    <p><strong>Hướng nghiệp toàn diện với lộ trình 2 giai đoạn</strong></p>
    <p>Chương trình hướng nghiệp toàn diện nhất dành cho học sinh 14-17 tuổi với nhiều tính năng độc quyền.</p>
    
    <hr>
    
    <h3>Học phí</h3>
    <p><strong>24.750.000đ</strong> (giá gốc 24.750.000đ)</p>
    <p><em>Gói cao cấp nhất với nhiều tính năng độc quyền</em></p>
    
    <hr>
    
    <h3>Đối tượng phù hợp</h3>
    <ul>
        <li>Học sinh 14-17 tuổi</li>
        <li>Định hướng học tập quốc tế</li>
        <li>Cần lộ trình dài hạn chi tiết</li>
        <li>Mong muốn phát triển toàn diện</li>
    </ul>
    
    <hr>
    
    <h3>Quy trình thực hiện (2 giai đoạn)</h3>
    <ul>
        <li><strong>3 bài đánh giá tâm lý có bản quyền</strong></li>
        <li><strong>6 buổi tư vấn 1:1</strong> với chuyên gia</li>
        <li><strong>3 báo cáo cá nhân hóa</strong> chi tiết</li>
        <li><strong>Tư vấn môn học quốc tế</strong> (IGCSE, AP, IB, A Levels)</li>
        <li><strong>Học chuyên ngành mô phỏng</strong></li>
        <li><strong>Buổi trao đổi với phụ huynh</strong></li>
        <li><strong>Song ngữ Việt-Anh</strong> linh hoạt</li>
    </ul>
    
    <hr>
    <h3>Tính năng độc quyền</h3>
    <ul>
        <li><strong>Lộ trình 2 giai đoạn</strong> chi tiết</li>
        <li><strong>Tư vấn chương trình quốc tế</strong></li>
        <li><strong>Trải nghiệm chuyên ngành mô phỏng</strong></li>
        <li><strong>Buổi họp với phụ huynh</strong></li>
        <li><strong>Hỗ trợ sau tư vấn dài hạn</strong></li>
    </ul>
    
    <hr>
    
    <h3>Kết quả đạt được</h3>
    <ul>
        <li>Lộ trình học tập toàn diện 2 giai đoạn</li>
        <li>Định hướng chuyên ngành và nghề nghiệp</li>
        <li>Hiểu rõ chương trình học quốc tế</li>
        <li>Trải nghiệm thực tế chuyên ngành</li>
        <li>Sự đồng thuận từ gia đình</li>
        <li>Kế hoạch phát triển dài hạn</li>
    </ul>',
    24750000.00, NULL, FALSE,
    '1 học viên',
    '["3 bài đánh giá tâm lý có bản quyền", "6 buổi tư vấn 1:1", "3 báo cáo cá nhân hóa", "Lộ trình 2 giai đoạn", "Tư vấn môn học quốc tế (IGCSE, AP, IB, A Levels)", "Học chuyên ngành mô phỏng", "Buổi trao đổi với phụ huynh", "Lứa tuổi 14-17", "Song ngữ Việt-Anh"]',
    'assets/img/icon/bulb.jpg',
    2
);

-- =====================================================
-- THÔNG BÁO HOÀN THÀNH
-- =====================================================
SELECT 
    'Sample data created successfully!' as message,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM product_packages) as total_packages,
    'Products: Test Hướng nghiệp + 4 Courses + Career Expert Consultation' as products_summary,
    'Database ready for live testing!' as status;

-- =====================================================
-- Import Holland Code Questions Data
-- =====================================================
-- HƯỚNG DẪN SỬ DỤNG:
-- 1. Đảm bảo đã chạy create-all-tables.sql trước
-- 2. Chạy file này trong HeidiSQL hoặc MySQL CLI
-- 3. Kiểm tra kết quả: SELECT COUNT(*) FROM questions;
-- =====================================================

-- Bắt đầu transaction để đảm bảo tính toàn vẹn dữ liệu
START TRANSACTION;

-- Xóa dữ liệu cũ nếu có (để có thể chạy lại script)
DELETE FROM questions;

-- Reset AUTO_INCREMENT
ALTER TABLE questions AUTO_INCREMENT = 1;

-- Thêm dữ liệu questions

-- Bắt đầu INSERT dữ liệu
INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '2',
    'Bạn thường được nhận xét là thông minh',
    'I',
    'personality',
    'easy',
    2,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '7',
    'Bạn thành thạo trong việc lưu trữ tài liệu công việc/ học tập',
    'C',
    'subjects',
    'medium',
    7,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '5',
    'Bạn giỏi làm việc độc lập',
    'I',
    'interests',
    'easy',
    5,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '4',
    'Bạn chú ý đến tiểu tiết',
    'C',
    'personality',
    'easy',
    4,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '1',
    'Bạn dành nhiều thời gian để tự khám phá cách hoạt động của mọi thứ',
    'R',
    'personality',
    'medium',
    1,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '6',
    'Bạn giỏi toán',
    'I',
    'subjects',
    'easy',
    6,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '3',
    'Bạn từng được nhận xét là sẽ làm việc tốt trong lĩnh vực kinh doanh, lãnh đạo hoặc chính trị',
    'E',
    'interests',
    'hard',
    3,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '9',
    'Bạn cố gắng hoàn thành công việc thật sớm trước thời hạn',
    'C',
    'personality',
    'medium',
    9,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '11',
    'Bạn muốn mở doanh nghiệp của riêng mình',
    'E',
    'personality',
    'easy',
    11,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '10',
    'Bạn không ngại làm việc 8 giờ/ngày trong văn phòng',
    'E',
    'interests',
    'medium',
    10,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '13',
    'Bạn lên kế hoạch học tập và theo dõi sát quá trình phát triển của bản thân',
    'E',
    'subjects',
    'medium',
    13,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '12',
    'Bạn thường giúp đỡ người khác',
    'S',
    'personality',
    'easy',
    12,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '14',
    'Bạn giải quyết các vấn đề theo quy trình và có trật tự',
    'R',
    'personality',
    'medium',
    14,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '8',
    'Bạn không ngại sơ cứu người bị thương',
    'S',
    'personality',
    'easy',
    8,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '16',
    'Bạn hứng thú với ngôn ngữ và việc viết lách',
    'A',
    'activities',
    'medium',
    16,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '17',
    'Bạn ít khi mạo hiểm',
    'C',
    'personality',
    'easy',
    17,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '15',
    'Bạn hòa đồng và luôn cố tránh những xung đột',
    'S',
    'personality',
    'medium',
    15,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '18',
    'Bạn không hứng thú với việc xây dựng hoặc chế tác thủ công',
    'S',
    'activities',
    'medium',
    18,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '21',
    'Bạn không thích làm về khoa học',
    'E',
    'activities',
    'easy',
    21,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '20',
    'Bạn không giỏi làm việc với các dữ liệu và con số',
    'A',
    'interests',
    'easy',
    20,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '19',
    'Bạn không giỏi làm việc trong nhóm',
    'R',
    'interests',
    'easy',
    19,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '24',
    'Bạn là một người sáng tạo',
    'A',
    'personality',
    'easy',
    24,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '22',
    'Bạn không thích những nơi làm việc có cấu trúc tổ chức phức tạp',
    'R',
    'interests',
    'hard',
    22,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '23',
    'Bạn là một người luôn làm theo các quy định chính sách và các quy trình',
    'C',
    'personality',
    'medium',
    23,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '26',
    'Bạn sẵn sàng hỗ trợ những người xung quanh',
    'S',
    'personality',
    'medium',
    26,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '27',
    'Bạn muốn ở một vị trí có quyền lực và danh tiếng',
    'E',
    'personality',
    'easy',
    27,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '30',
    'Bạn thân thiện và năng động',
    'S',
    'personality',
    'easy',
    30,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '25',
    'Bạn luôn cố gắng làm việc chính xác và hiệu quả',
    'C',
    'interests',
    'medium',
    25,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '28',
    'Bạn sáng tạo theo những cách mà những người khác có thể sẽ chưa thấy giá trị ngay lập tức',
    'I',
    'personality',
    'hard',
    28,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '31',
    'Bạn theo đuổi những lĩnh vực nghệ thuật khác nhau để thể hiện bản thân (ví dụ như hội họa, điêu khắc, văn học và/hoặc âm nhạc)',
    'A',
    'subjects',
    'hard',
    31,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '29',
    'Bạn tham gia vào những hoạt động như nghệ thuật, kịch hoặc nhảy',
    'A',
    'activities',
    'medium',
    29,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '33',
    'Bạn có khả năng toán học tốt',
    'I',
    'subjects',
    'easy',
    33,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '36',
    'Bạn đưa ra quyết định dựa trên thông tin và lập luận logic ',
    'I',
    'personality',
    'hard',
    36,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '38',
    'Bạn tự tin với ngoại hình và cách ăn mặc',
    'A',
    'personality',
    'medium',
    38,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '32',
    'Bạn thường suy nghĩ trừu tượng',
    'I',
    'personality',
    'hard',
    32,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '35',
    'Bạn xây dựng một bộ chuẩn quy tắc cho bản thân và luôn tuân thủ theo ',
    'C',
    'personality',
    'medium',
    35,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '34',
    'Bạn làm việc đúng tiến độ',
    'C',
    'interests',
    'easy',
    34,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '37',
    'Bạn phản hồi nhanh và bình tĩnh trong các tình huống khẩn cấp',
    'E',
    'personality',
    'medium',
    37,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '39',
    'Bạn giao tiếp tinh tế và khéo léo',
    'E',
    'personality',
    'easy',
    39,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '43',
    'Bạn chú ý tới tiểu tiết và đề cao sự chính xác',
    'C',
    'personality',
    'medium',
    43,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '40',
    'Bạn quan tâm tới người khác, các nhu cầu và vấn đề của họ',
    'S',
    'activities',
    'medium',
    40,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '42',
    'Bạn lập luận rõ ràng và logic để giải quyết các vấn đề phức tạp',
    'I',
    'personality',
    'hard',
    42,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '41',
    'Bạn luôn dốc lòng giúp đỡ người khác',
    'S',
    'personality',
    'easy',
    41,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '47',
    'Bạn muốn làm thợ may',
    'A',
    'interests',
    'easy',
    47,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '45',
    'Bạn muốn làm bác sĩ nhi khoa',
    'S',
    'interests',
    'easy',
    45,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '48',
    'Bạn muốn làm người làm vườn',
    'R',
    'interests',
    'easy',
    48,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '44',
    'Bạn tinh ý và phản xạ nhanh',
    'E',
    'personality',
    'easy',
    44,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '49',
    'Bạn muốn làm chủ cửa hàng',
    'E',
    'interests',
    'easy',
    49,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '50',
    'Bạn muốn làm người đóng gói hàng hoá',
    'C',
    'interests',
    'easy',
    50,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '51',
    'Bạn muốn làm thợ làm tóc',
    'A',
    'interests',
    'easy',
    51,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '52',
    'Bạn muốn làm người vận hành máy móc trong cửa hàng in',
    'R',
    'interests',
    'easy',
    52,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '53',
    'Bạn muốn làm thợ làm bánh hoặc thợ làm đồ ngọt',
    'A',
    'interests',
    'easy',
    53,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '46',
    'Bạn muốn làm đầu bếp',
    'R',
    'interests',
    'easy',
    46,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '57',
    'Bạn muốn làm thợ làm móng',
    'A',
    'interests',
    'easy',
    57,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '54',
    'Bạn muốn làm thợ sửa chữa giày',
    'R',
    'interests',
    'easy',
    54,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '55',
    'Bạn muốn làm người giúp việc',
    'C',
    'interests',
    'easy',
    55,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '56',
    'Bạn muốn làm bác sĩ nha khoa',
    'S',
    'interests',
    'easy',
    56,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '58',
    'Bạn muốn làm chuyên gia trang điểm',
    'A',
    'interests',
    'easy',
    58,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '59',
    'Bạn muốn làm y tá',
    'C',
    'interests',
    'easy',
    59,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '60',
    'Bạn muốn làm nhà thiên văn học',
    'I',
    'interests',
    'easy',
    60,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '61',
    'Bạn muốn làm nhà nghiên cứu thị trường',
    'E',
    'interests',
    'easy',
    61,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '62',
    'Bạn muốn làm kỹ sư phòng thí nghiệm trong bệnh viện',
    'I',
    'interests',
    'easy',
    62,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '63',
    'Bạn muốn làm nhà vật lý',
    'I',
    'interests',
    'easy',
    63,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '65',
    'Bạn muốn làm biên tập báo chí',
    'A',
    'interests',
    'easy',
    65,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '64',
    'Bạn muốn làm nhà hóa học',
    'I',
    'interests',
    'easy',
    64,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '66',
    'Bạn muốn làm nhà thực vật học',
    'R',
    'interests',
    'easy',
    66,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '70',
    'Bạn muốn làm nhà khí tượng học',
    'I',
    'interests',
    'easy',
    70,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '67',
    'Bạn muốn làm bác sĩ phẫu thuật',
    'R',
    'interests',
    'easy',
    67,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '68',
    'Bạn muốn làm nhà nhân loại học',
    'S',
    'interests',
    'easy',
    68,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '69',
    'Bạn muốn làm bác sĩ gia đình',
    'S',
    'interests',
    'easy',
    69,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '71',
    'Bạn muốn làm nhà nghiên cứu xã hội',
    'S',
    'interests',
    'easy',
    71,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '74',
    'Bạn muốn làm cây viết tự do',
    'A',
    'interests',
    'easy',
    74,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '72',
    'Bạn muốn làm nhà sinh vật học',
    'A',
    'interests',
    'easy',
    72,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '73',
    'Bạn muốn làm biên tập phim',
    'A',
    'interests',
    'easy',
    73,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '75',
    'Bạn muốn làm nhiếp ảnh gia',
    'A',
    'interests',
    'easy',
    75,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '79',
    'Bạn muốn làm nhà văn',
    'A',
    'interests',
    'easy',
    79,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '76',
    'Bạn muốn làm người hòa âm phối khí',
    'A',
    'interests',
    'easy',
    76,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '78',
    'Bạn muốn làm ca sĩ',
    'A',
    'interests',
    'easy',
    78,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '77',
    'Bạn muốn làm nghệ sĩ',
    'A',
    'interests',
    'easy',
    77,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '82',
    'Bạn muốn làm nhà tư vấn',
    'S',
    'interests',
    'easy',
    82,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '81',
    'Bạn muốn làm nhạc sĩ',
    'A',
    'interests',
    'easy',
    81,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '80',
    'Bạn muốn làm nhà viết kịch',
    'A',
    'interests',
    'easy',
    80,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '83',
    'Bạn muốn làm nhà báo',
    'I',
    'interests',
    'easy',
    83,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '84',
    'Bạn muốn làm chuyên gia bản quyền',
    'I',
    'interests',
    'easy',
    84,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '85',
    'Bạn muốn làm diễn viên',
    'A',
    'interests',
    'easy',
    85,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '87',
    'Bạn muốn làm giáo viên cấp hai',
    'S',
    'interests',
    'easy',
    87,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '86',
    'Bạn muốn làm lễ tân trong bệnh viện',
    'S',
    'interests',
    'easy',
    86,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '88',
    'Bạn muốn làm nhân viên xã hội',
    'S',
    'interests',
    'easy',
    88,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '93',
    'Bạn muốn làm chuyên gia tư vấn kết hôn',
    'S',
    'interests',
    'easy',
    93,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '89',
    'Bạn muốn làm nhà trị liệu giúp đỡ trẻ em gặp khó khăn trong việc nói',
    'S',
    'interests',
    'easy',
    89,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '92',
    'Bạn muốn làm nhà tâm lý học y khoa',
    'I',
    'interests',
    'easy',
    92,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '91',
    'Bạn muốn làm chuyên gia vật lí trị liệu',
    'R',
    'interests',
    'easy',
    91,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '95',
    'Bạn muốn làm nhà quản lý tiện ích công cộng',
    'E',
    'interests',
    'easy',
    95,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '94',
    'Bạn muốn làm giáo viên khoa học xã hội',
    'S',
    'interests',
    'easy',
    94,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '90',
    'Bạn muốn làm hiệu trưởng trường học',
    'E',
    'interests',
    'easy',
    90,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '96',
    'Bạn muốn làm lãnh đạo trại hè cho trẻ',
    'E',
    'interests',
    'easy',
    96,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '97',
    'Bạn muốn làm chuyên gia tư vấn cá nhân',
    'S',
    'interests',
    'easy',
    97,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '98',
    'Bạn muốn làm nhà xã hội học',
    'S',
    'interests',
    'easy',
    98,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '100',
    'Bạn muốn làm kiến trúc sư nội thất',
    'R',
    'interests',
    'easy',
    100,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '99',
    'Bạn muốn làm chuyên gia tư vấn những người nghiện thuốc',
    'S',
    'interests',
    'easy',
    99,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '105',
    'Bạn muốn làm giám đốc kinh doanh',
    'E',
    'interests',
    'easy',
    105,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '101',
    'Bạn muốn làm người đại diện công ty sản xuất',
    'E',
    'interests',
    'easy',
    101,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '104',
    'Bạn muốn làm nhân viên kinh doanh bất động sản',
    'C',
    'interests',
    'easy',
    104,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '103',
    'Bạn muốn làm người dẫn chương trình truyền hình hoặc radio',
    'A',
    'interests',
    'easy',
    103,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '102',
    'Bạn muốn làm giám đốc khách sạn',
    'E',
    'interests',
    'easy',
    102,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '108',
    'Bạn muốn làm trưởng phòng quan hệ đối ngoại',
    'S',
    'interests',
    'easy',
    108,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '106',
    'Bạn muốn làm trưởng phòng marketing',
    'E',
    'interests',
    'easy',
    106,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '107',
    'Bạn muốn làm trưởng phòng cung ứng',
    'C',
    'interests',
    'easy',
    107,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '109',
    'Bạn muốn làm trưởng phòng quảng cáo',
    'A',
    'interests',
    'easy',
    109,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '113',
    'Bạn muốn làm nhân viên quản lý quỹ',
    'C',
    'interests',
    'easy',
    113,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '111',
    'Bạn muốn làm thẩm phán',
    'C',
    'interests',
    'easy',
    111,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '118',
    'Bạn muốn làm nhà quản lý cung ứng',
    'E',
    'interests',
    'easy',
    118,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '116',
    'Bạn muốn làm kế toán viên công chứng được cấp phép (CPA)',
    'C',
    'interests',
    'easy',
    116,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '112',
    'Bạn muốn làm nhà môi giới',
    'E',
    'interests',
    'easy',
    112,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '117',
    'Bạn muốn làm kiểm toán viên ngân hàng',
    'C',
    'interests',
    'easy',
    117,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '115',
    'Bạn muốn làm nhân viên ngân hàng',
    'C',
    'interests',
    'easy',
    115,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '110',
    'Bạn muốn làm chuyên viên thuế',
    'C',
    'interests',
    'easy',
    110,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '114',
    'Bạn muốn làm kế toán',
    'C',
    'interests',
    'easy',
    114,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '121',
    'Bạn muốn làm chuyên gia phân tích tài chính',
    'I',
    'interests',
    'hard',
    121,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '120',
    'Bạn muốn làm nhà lập trình',
    'I',
    'interests',
    'easy',
    120,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '119',
    'Bạn muốn làm công nhân',
    'R',
    'interests',
    'easy',
    119,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '122',
    'Bạn muốn làm người định giá tài sản',
    'E',
    'interests',
    'easy',
    122,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '123',
    'Bạn muốn làm kỹ sư quản lý chất lượng',
    'I',
    'interests',
    'easy',
    123,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '124',
    'Bạn muốn làm kế toán trưởng',
    'C',
    'interests',
    'easy',
    124,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '126',
    'Bạn muốn trở thành xây dựng và kỹ sư',
    'R',
    'personality',
    'easy',
    126,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '128',
    'Bạn muốn trở thành giáo viên',
    'S',
    'personality',
    'easy',
    128,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '127',
    'Bạn muốn trở thành người điều khiển phiên đấu giá',
    'E',
    'personality',
    'easy',
    127,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '125',
    'Bạn muốn làm chuyên viên lương',
    'C',
    'interests',
    'easy',
    125,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '131',
    'Bạn muốn trở thành nhân viên công tác xã hội',
    'S',
    'personality',
    'easy',
    131,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '130',
    'Bạn muốn trở thành nhà hoá học',
    'I',
    'subjects',
    'easy',
    130,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '129',
    'Bạn muốn trở thành thợ máy',
    'R',
    'personality',
    'easy',
    129,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '132',
    'Bạn muốn trở thành nhà quản trị',
    'E',
    'personality',
    'easy',
    132,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '134',
    'Bạn muốn trở thành chuyên viên quản lý khách hàng',
    'E',
    'personality',
    'easy',
    134,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '133',
    'Bạn muốn trở thành lính cứu hoả',
    'R',
    'personality',
    'easy',
    133,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '135',
    'Bạn muốn trở thành thợ sửa chữa điện thoại di động',
    'R',
    'personality',
    'easy',
    135,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '140',
    'Bạn muốn trở thành kiến trúc sư phong cảnh',
    'A',
    'personality',
    'easy',
    140,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '139',
    'Bạn muốn trở thành giám đốc',
    'E',
    'interests',
    'easy',
    139,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '137',
    'Bạn muốn trở thành kế toán',
    'C',
    'subjects',
    'easy',
    137,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '136',
    'Bạn muốn trở thành nhà khoa học phân tử',
    'I',
    'subjects',
    'easy',
    136,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '138',
    'Bạn muốn trở thành bác sĩ thú y',
    'R',
    'personality',
    'easy',
    138,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '142',
    'Bạn muốn trở thành nhân viên phân tích thông tin',
    'I',
    'personality',
    'hard',
    142,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '141',
    'Bạn muốn trở thành chuyên gia nha khoa',
    'R',
    'interests',
    'easy',
    141,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '143',
    'Bạn muốn trở thành kỹ sư chế tạo và điều khiển cơ khí',
    'R',
    'personality',
    'easy',
    143,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '144',
    'Bạn muốn trở thành người mua bán cổ phiếu',
    'E',
    'personality',
    'easy',
    144,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '145',
    'Bạn muốn trở thành chuyên gia phân tích dữ liệu',
    'I',
    'interests',
    'hard',
    145,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '150',
    'Bạn có phải là người chú ý đển tiểu tiết và có tổ chức',
    'C',
    'personality',
    'easy',
    150,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '147',
    'Bạn muốn trở thành nhà thiết kế thời trang',
    'A',
    'personality',
    'easy',
    147,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '146',
    'Bạn muốn trở thành kỹ sư',
    'I',
    'personality',
    'easy',
    146,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '148',
    'Bạn muốn trở thành nhân viên bán hàng',
    'S',
    'personality',
    'easy',
    148,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '149',
    'Bạn có phải là người chải chuốt và quan tâm tới vẻ bề ngoài',
    'A',
    'activities',
    'easy',
    149,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '153',
    'Bạn có phải là người có thiên hướng làm việc với máy móc',
    'R',
    'interests',
    'easy',
    153,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '151',
    'Bạn có phải là người có tư duy phân tích (thích tìm hiểu mọi thứ)',
    'I',
    'activities',
    'hard',
    151,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '156',
    'Bạn có phải là người có tính tình thoải mái, dễ chịu',
    'S',
    'personality',
    'easy',
    156,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '155',
    'Bạn có phải là người có tính cạnh tranh cao và quyết liệt',
    'E',
    'personality',
    'easy',
    155,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '154',
    'Bạn có phải là người có thiên hướng trực giác',
    'R',
    'personality',
    'easy',
    154,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '157',
    'Bạn có phải là người có trách nhiệm',
    'C',
    'personality',
    'easy',
    157,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '162',
    'Bạn có phải là người làm việc hay học tập có phương pháp',
    'C',
    'interests',
    'easy',
    162,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '163',
    'Bạn có phải là người làm việc hiệu quả và đúng tiến độ',
    'C',
    'interests',
    'easy',
    163,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '158',
    'Bạn có phải là người giỏi quan sát',
    'I',
    'personality',
    'easy',
    158,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '164',
    'Bạn có phải là người linh hoạt',
    'E',
    'personality',
    'easy',
    164,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '161',
    'Bạn có phải là người hòa đồng',
    'S',
    'personality',
    'easy',
    161,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '160',
    'Bạn có phải là người giỏi thuyết phục',
    'E',
    'personality',
    'easy',
    160,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '159',
    'Bạn có phải là người giỏi thể thao',
    'R',
    'personality',
    'easy',
    159,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '166',
    'Bạn có phải là người luôn nhanh chóng nhận thêm các nhiệm vụ mới',
    'S',
    'personality',
    'easy',
    166,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '167',
    'Bạn có phải là người năng động',
    'E',
    'personality',
    'easy',
    167,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '173',
    'Bạn có phải là người thẳng thắn',
    'C',
    'personality',
    'easy',
    173,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '175',
    'Bạn có phải là người thực tế',
    'E',
    'personality',
    'easy',
    175,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '168',
    'Bạn có phải là người nhiệt tình',
    'S',
    'personality',
    'easy',
    168,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '174',
    'Bạn có phải là người biết cảm thông và thấu hiểu',
    'S',
    'personality',
    'easy',
    174,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '169',
    'Bạn có phải là người quyết đoán',
    'E',
    'personality',
    'easy',
    169,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '170',
    'Bạn có phải là người sử dụng kiến thức khoa học để giải quyết các vấn đề mới',
    'I',
    'subjects',
    'easy',
    170,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '171',
    'Bạn có phải là người tham vọng, đặt mục tiêu cao cho bản thân ',
    'E',
    'personality',
    'easy',
    171,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '172',
    'Bạn có phải là người thân thiện',
    'S',
    'personality',
    'easy',
    172,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '176',
    'Bạn có phải là người tỉ mỉ, chính xác',
    'C',
    'personality',
    'easy',
    176,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '177',
    'Bạn có phải là người tìm kiếm được niềm vui từ việc chăm sóc người khác hoặc nuôi nấng động vật',
    'S',
    'personality',
    'hard',
    177,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '178',
    'Bạn có phải là người tò mò',
    'I',
    'personality',
    'easy',
    178,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '179',
    'Bạn có phải là người tự tin',
    'E',
    'personality',
    'easy',
    179,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '180',
    'Bạn có phải là người yêu thiên nhiên',
    'R',
    'activities',
    'easy',
    180,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '183',
    'Bạn có phải là người yêu thiên nhiên',
    'R',
    'activities',
    'easy',
    183,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '182',
    'Bạn có phải là người ưa thích làm việc độc lập',
    'I',
    'interests',
    'easy',
    182,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '185',
    'Bạn có phải là người có kế hoạch',
    'C',
    'personality',
    'easy',
    185,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '184',
    'Bạn có phải là người nhanh nhẹn',
    'R',
    'personality',
    'easy',
    184,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '181',
    'Bạn có phải là người dễ thích nghi và thay đổi',
    'E',
    'activities',
    'easy',
    181,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '186',
    'Bạn có phải là người giải quyết vấn đề một cách sáng tạo',
    'I',
    'personality',
    'easy',
    186,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '191',
    'Bạn có phải là người kiên nhẫn và kiên trì',
    'C',
    'personality',
    'easy',
    191,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '188',
    'Bạn có phải là người theo sát hướng dẫn, chỉ đạo',
    'C',
    'personality',
    'easy',
    188,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '190',
    'Bạn có phải là người có tầm nhìn',
    'E',
    'personality',
    'easy',
    190,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '187',
    'Bạn có phải là người tò mò',
    'I',
    'personality',
    'easy',
    187,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '193',
    'Bạn có phải là người có lượng từ vựng dồi dào',
    'S',
    'personality',
    'easy',
    193,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '192',
    'Bạn có phải là người sáng tạo',
    'A',
    'personality',
    'easy',
    192,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '189',
    'Bạn có phải là người chú ý tới chi tiết',
    'C',
    'personality',
    'easy',
    189,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '194',
    'Bạn có phải là người tò mò về công nghệ',
    'I',
    'personality',
    'easy',
    194,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '196',
    'Bạn có phải là người kiên định',
    'E',
    'personality',
    'easy',
    196,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '197',
    'Bạn có phải là người có tổ chức',
    'C',
    'personality',
    'easy',
    197,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '203',
    'Bạn có phải là người sẵn sàng nêu lên ý kiến trái chiều trong nhóm',
    'S',
    'personality',
    'easy',
    203,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '198',
    'Bạn có phải là người thực tế và logic',
    'I',
    'personality',
    'hard',
    198,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '201',
    'Bạn có phải là người dễ gần',
    'S',
    'personality',
    'easy',
    201,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '204',
    'Bạn có phải là người tọc mạch, hay dò hỏi',
    'I',
    'personality',
    'easy',
    204,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '205',
    'Bạn có phải là người biết lắng nghe',
    'E',
    'personality',
    'easy',
    205,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '206',
    'Bạn có phải là người đáng tin',
    'S',
    'personality',
    'easy',
    206,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '200',
    'Bạn có phải là người có trách nhiệm',
    'C',
    'personality',
    'easy',
    200,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '207',
    'Bạn có phải là người ngăn nắp',
    'C',
    'personality',
    'easy',
    207,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '199',
    'Bạn có phải là người khéo léo',
    'A',
    'personality',
    'easy',
    199,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '202',
    'Bạn có phải là người quyết đoán',
    'E',
    'personality',
    'easy',
    202,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '208',
    'Bạn có phải là người tự tin',
    'E',
    'personality',
    'easy',
    208,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '209',
    'Bạn có phải là người làm việc có phương pháp hiệu quả',
    'I',
    'interests',
    'easy',
    209,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '211',
    'Bạn có phải là người có tính cạnh tranh cao',
    'E',
    'personality',
    'easy',
    211,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '213',
    'Bạn có phải là người gọn gàng',
    'C',
    'personality',
    'easy',
    213,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '215',
    'Bạn có phải là người quan tâm, ân cần',
    'S',
    'activities',
    'easy',
    215,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '210',
    'Bạn có phải là người giao tiếp tốt',
    'S',
    'personality',
    'easy',
    210,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '214',
    'Bạn có phải là người biết tận dụng các nguồn lực để giải quyết vấn đề',
    'E',
    'personality',
    'easy',
    214,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '212',
    'Bạn có phải là người tuân thủ các quy định',
    'C',
    'personality',
    'easy',
    212,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '218',
    'Bạn có phải là người làm việc tốt với người khác',
    'S',
    'interests',
    'easy',
    218,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '219',
    'Bạn có phải là người hướng ngoại',
    'S',
    'personality',
    'easy',
    219,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '217',
    'Bạn có phải là người năng động',
    'A',
    'personality',
    'easy',
    217,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '216',
    'Bạn có phải là người nhạy cảm, thức thời',
    'E',
    'personality',
    'easy',
    216,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '222',
    'Bạn có phải là người hành động dựa theo trực giác và cảm nhận cá nhân',
    'R',
    'personality',
    'easy',
    222,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '223',
    'Bạn có phải là người không phán xét',
    'R',
    'personality',
    'easy',
    223,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '224',
    'Bạn có phải là người không ngại đảm nhiệm các công việc và trách nhiệm thách thức',
    'E',
    'personality',
    'hard',
    224,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '221',
    'Bạn có phải là người không đề cao giá trị vật chất',
    'A',
    'personality',
    'easy',
    221,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '220',
    'Bạn có phải là người điềm đạm',
    'I',
    'personality',
    'easy',
    220,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '225',
    'Bạn có phải là người hay suy nghĩ, phân tích',
    'I',
    'personality',
    'hard',
    225,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '226',
    'Bạn có phải là người để ý tới các chi tiết nhỏ trong tổng thể lớn',
    'E',
    'personality',
    'easy',
    226,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '227',
    'Bạn có phải là người hoàn thành công việc với độ chính xác cao',
    'C',
    'personality',
    'easy',
    227,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '228',
    'Bạn có phải là người ưa khám phá',
    'I',
    'personality',
    'easy',
    228,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '229',
    'Bạn có phải là người lệ thuộc',
    'C',
    'personality',
    'easy',
    229,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '230',
    'Bạn có phải là người lên tiếng vì lợi ích người khác',
    'S',
    'personality',
    'easy',
    230,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '231',
    'Bạn có phải là người lạc quan',
    'R',
    'personality',
    'easy',
    231,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '232',
    'Bạn có phải là người hay quan sát',
    'I',
    'personality',
    'easy',
    232,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '233',
    'Bạn có phải là người suy nghĩ theo từng bước',
    'C',
    'personality',
    'easy',
    233,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '234',
    'Bạn có phải là người phối hợp',
    'E',
    'personality',
    'easy',
    234,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '235',
    'Bạn có phải là người nhiệt huyết',
    'A',
    'personality',
    'easy',
    235,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '236',
    'Bạn có phải là người có cảm thụ nghệ thuật cao',
    'A',
    'subjects',
    'easy',
    236,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '237',
    'Bạn có phải là người có tài thuyết phục',
    'E',
    'personality',
    'easy',
    237,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '239',
    'Bạn có phải là người thực dụng ',
    'E',
    'personality',
    'easy',
    239,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '240',
    'Bạn có phải là người có khả năng tập trung cao',
    'I',
    'personality',
    'easy',
    240,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '238',
    'Bạn có phải là người khách quan',
    'I',
    'personality',
    'easy',
    238,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '241',
    'Bạn có thể bán hàng hoặc quảng bá ý tưởng',
    'E',
    'personality',
    'medium',
    241,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '242',
    'Bạn có thể bắt nhịp nhanh, làm việc tốt trong một hệ thống',
    'E',
    'interests',
    'medium',
    242,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '244',
    'Bạn có thể chơi một loại nhạc cụ',
    'A',
    'personality',
    'easy',
    244,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '243',
    'Bạn có thể biết được các loại thức ăn tốt cho sức khoẻ',
    'I',
    'personality',
    'medium',
    243,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '245',
    'Bạn có thể chơi các môn thể thao đòi hỏi sức lực lớn như chạy bền, bơi, võ, các môn phối hợp',
    'R',
    'personality',
    'hard',
    245,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '247',
    'Bạn có thể đảm nhiệm tốt vai trò lãnh đạo',
    'E',
    'personality',
    'medium',
    247,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '246',
    'Bạn có thể đảm bảo rằng các nhóm làm việc tốt và hiệu quả',
    'E',
    'interests',
    'medium',
    246,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '249',
    'Bạn có thể dạy học, đào tạo hoặc huấn luyện người khác',
    'S',
    'subjects',
    'medium',
    249,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '250',
    'Bạn có thể đọc và viết một bài diễn thuyết',
    'E',
    'personality',
    'medium',
    250,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '251',
    'Bạn có thể giải quyết các vấn đề về máy móc',
    'R',
    'personality',
    'medium',
    251,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '248',
    'Bạn có thể dẫn dắt các cuộc thảo luận',
    'E',
    'personality',
    'easy',
    248,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '253',
    'Bạn có thể hợp tác tốt với người khác khi làm việc nhóm, dự án',
    'E',
    'interests',
    'medium',
    253,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '254',
    'Bạn có thể khiến những người xung quanh cảm thấy thoải mái và thư giãn',
    'S',
    'personality',
    'medium',
    254,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '252',
    'Bạn có thể hát, diễn hoặc nhảy',
    'A',
    'personality',
    'easy',
    252,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '255',
    'Bạn có thể là người hoà giải khi xảy ra tranh cãi',
    'S',
    'personality',
    'medium',
    255,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '256',
    'Bạn có thể lên kế hoạch và giám sát một hoạt động',
    'C',
    'personality',
    'medium',
    256,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '257',
    'Bạn biết cách tổ chức và sắp xếp thông tin để tiện cho việc tìm kiếm sau này',
    'C',
    'personality',
    'medium',
    257,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '258',
    'Bạn có thể nghĩ ra các chương trình quảng cáo hay và sáng tạo',
    'A',
    'personality',
    'medium',
    258,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '260',
    'Bạn có thể nướng bánh ngon',
    'R',
    'personality',
    'easy',
    260,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '259',
    'Bạn có thể nói chuyện với công chúng hoặc nói chuyện trước đám đông một cách dễ dàng',
    'E',
    'personality',
    'hard',
    259,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '261',
    'Bạn có thể phác thảo, vẽ hoạt họa',
    'A',
    'personality',
    'easy',
    261,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '264',
    'Bạn có thể sử dụng các thiết bị gia đình như máy xay và máy cắt cỏ',
    'R',
    'personality',
    'medium',
    264,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '265',
    'Bạn có thể sử dụng thuần thục các chương trình soạn thảo văn bản như Microsoft Word ',
    'C',
    'personality',
    'hard',
    265,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '266',
    'Bạn có thể sử dụng kiến thức khoa học để tìm hiểu mọi thứ',
    'I',
    'subjects',
    'medium',
    266,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '262',
    'Bạn có thể phân tích tốt các câu chuyện và bài thơ',
    'I',
    'personality',
    'hard',
    262,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '263',
    'Bạn có thể đánh máy nhanh và thành thạo',
    'C',
    'personality',
    'easy',
    263,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '267',
    'Bạn có thể sử dụng kính hiển vi',
    'R',
    'personality',
    'easy',
    267,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '269',
    'Bạn có thể sử dụng thiết bị văn phòng tốt',
    'C',
    'personality',
    'medium',
    269,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '270',
    'Bạn có thể sửa chữa các loại đồ điện tử',
    'R',
    'personality',
    'easy',
    270,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '268',
    'Bạn có thể sử dụng công cụ hoặc máy móc hạng nặng',
    'R',
    'personality',
    'medium',
    268,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '271',
    'Bạn có thể thiết kế bao bì tốt cho các sản phẩm khác nhau',
    'A',
    'personality',
    'medium',
    271,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '272',
    'Bạn có thể thiết kế thời trang, nội thất hoặc chăn mền',
    'A',
    'personality',
    'medium',
    272,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '273',
    'Bạn có thể thu thập thông tin từ nói chuyện điện thoại',
    'I',
    'personality',
    'medium',
    273,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '276',
    'Bạn có thể thực hiện các tính toán phức tạp',
    'I',
    'subjects',
    'hard',
    276,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '274',
    'Bạn có thể thực hiện các công việc giấy tờ trong khoảng thời gian ngắn',
    'C',
    'personality',
    'medium',
    274,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '275',
    'Bạn có thể thực hiện các dự án độc đáo trong môi trường học hoặc công việc',
    'A',
    'subjects',
    'medium',
    275,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '277',
    'Bạn có thể thuyết phục người khác làm việc theo cách của bạn',
    'E',
    'interests',
    'medium',
    277,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '280',
    'Bạn có thể tự làm công việc của mình',
    'C',
    'personality',
    'easy',
    280,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '279',
    'Bạn có thể tổ chức các hoạt động và sự kiện',
    'E',
    'personality',
    'medium',
    279,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '278',
    'Bạn có thể thuyết trình hoặc diễn thuyết',
    'E',
    'personality',
    'medium',
    278,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '282',
    'Bạn có thể quản lý tài chính cá nhân hiệu quả',
    'C',
    'personality',
    'medium',
    282,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '281',
    'Bạn có thể vẽ và điêu khắc tốt',
    'A',
    'personality',
    'easy',
    281,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '286',
    'Bạn giỏi khi làm ở các môi trường có tổ chức cao',
    'C',
    'personality',
    'easy',
    286,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '285',
    'Bạn có thể tập trung trong một thời gian dài và không bị sao nhãng',
    'I',
    'personality',
    'medium',
    285,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '284',
    'Bạn có thể đưa ra quyết định dựa trên quan sát cá nhân',
    'E',
    'personality',
    'medium',
    284,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '283',
    'Bạn có thể viết truyện, làm thơ hoặc chơi nhạc cụ',
    'A',
    'personality',
    'medium',
    283,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '287',
    'Bạn giỏi phân tích và giải quyết vấn đề',
    'I',
    'personality',
    'hard',
    287,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '289',
    'Bạn thích nhiếp ảnh sáng tạo',
    'A',
    'activities',
    'easy',
    289,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '288',
    'Bạn thích công việc ở văn phòng',
    'C',
    'activities',
    'easy',
    288,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '293',
    'Bạn thích giúp đỡ và chăm sóc',
    'S',
    'activities',
    'easy',
    293,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '290',
    'Bạn thích giám sát và ghi chép',
    'C',
    'activities',
    'easy',
    290,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '291',
    'Bạn thích bán hàng và thuyết phục',
    'E',
    'activities',
    'easy',
    291,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '292',
    'Bạn thích tìm hiểu về các khái niệm triết học trừu tượng',
    'I',
    'activities',
    'hard',
    292,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '295',
    'Bạn thích hướng dẫn trẻ em',
    'S',
    'activities',
    'easy',
    295,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '296',
    'Bạn thích chẩn đoán y tế',
    'I',
    'activities',
    'easy',
    296,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '297',
    'Bạn thích ghi chép',
    'C',
    'activities',
    'easy',
    297,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '294',
    'Bạn thích thiết kế trang sức',
    'A',
    'activities',
    'easy',
    294,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '299',
    'Bạn thích giúp đỡ người khuyết tật',
    'S',
    'activities',
    'easy',
    299,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '298',
    'Bạn thích phác thảo và thiết kế',
    'A',
    'activities',
    'easy',
    298,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '300',
    'Bạn thích quản lý doanh nghiệp',
    'E',
    'activities',
    'easy',
    300,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '301',
    'Bạn thích tự phân tích các lý thuyết trừu tượng thông qua thực hành',
    'I',
    'activities',
    'hard',
    301,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '302',
    'Bạn thích phối đồ và trang trí',
    'A',
    'activities',
    'easy',
    302,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '305',
    'Bạn thích quản trị hoặc quản lý',
    'E',
    'activities',
    'easy',
    305,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '303',
    'Bạn thích chốt hợp đồng kinh doanh hoặc hợp đồng sửa chữa',
    'E',
    'activities',
    'easy',
    303,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '306',
    'Bạn thích tiếp thu tri thức',
    'I',
    'activities',
    'easy',
    306,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '304',
    'Bạn thích tư vấn cộng đồng',
    'S',
    'activities',
    'easy',
    304,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '307',
    'Bạn thích dẫn chương trình',
    'S',
    'activities',
    'easy',
    307,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '309',
    'Bạn thích khoa học',
    'I',
    'activities',
    'easy',
    309,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '308',
    'Bạn thích vẽ',
    'A',
    'activities',
    'easy',
    308,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '310',
    'Bạn thích sử dụng và làm việc với công cụ',
    'R',
    'interests',
    'easy',
    310,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '311',
    'Bạn thích hỗ trợ y tế cho người khác',
    'S',
    'activities',
    'easy',
    311,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '314',
    'Bạn thích việc hướng dẫn và chỉ dẫn người khác',
    'S',
    'activities',
    'easy',
    314,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '312',
    'Bạn thích nghệ thuật và kịch',
    'A',
    'activities',
    'easy',
    312,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '315',
    'Bạn thích giảng dạy và giải thích',
    'S',
    'activities',
    'easy',
    315,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '313',
    'Bạn thích phân loại và sắp xếp',
    'C',
    'activities',
    'easy',
    313,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '318',
    'Bạn thích giải quyết vấn đề',
    'E',
    'activities',
    'easy',
    318,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '317',
    'Bạn thích bất động sản',
    'E',
    'activities',
    'easy',
    317,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '316',
    'Bạn thích chăm sóc người già',
    'S',
    'activities',
    'easy',
    316,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '319',
    'Bạn thích đồ điện tử',
    'R',
    'activities',
    'easy',
    319,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '320',
    'Bạn thích viết sáng tạo',
    'A',
    'activities',
    'easy',
    320,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '321',
    'Bạn thích lưu giữ mọi đồ đã mua',
    'C',
    'activities',
    'easy',
    321,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '325',
    'Bạn thích sửa chữa máy khâu',
    'R',
    'activities',
    'easy',
    325,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '327',
    'Bạn thích tạo ra các kiểu tóc mới',
    'A',
    'activities',
    'easy',
    327,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '328',
    'Bạn thích trồng cây',
    'R',
    'activities',
    'easy',
    328,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '323',
    'Bạn thích làm việc ở kho hàng',
    'C',
    'interests',
    'easy',
    323,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '322',
    'Bạn thích dọn dẹp phòng bếp',
    'C',
    'activities',
    'easy',
    322,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '326',
    'Bạn thích sửa chữa giày dép',
    'R',
    'activities',
    'easy',
    326,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '324',
    'Bạn thích tổ chức hướng đạo ngoài trời',
    'R',
    'activities',
    'easy',
    324,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '330',
    'Bạn thích chăm sóc cây cối, vườn tược',
    'R',
    'activities',
    'easy',
    330,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '331',
    'Bạn thích công việc nghiên cứu và thí nghiệm',
    'I',
    'activities',
    'easy',
    331,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '333',
    'Bạn thích học khoa học',
    'I',
    'activities',
    'easy',
    333,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '332',
    'Bạn thích sử dụng toán học để đưa ra cách giải quyết cho các vấn đề thông thường',
    'I',
    'activities',
    'easy',
    332,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '334',
    'Bạn thích tham gia các hoạt động về thiên văn học',
    'I',
    'activities',
    'easy',
    334,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '329',
    'Bạn thích tự thiết kế, thêu thùa, và may vá quần áo ',
    'A',
    'activities',
    'easy',
    329,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '335',
    'Bạn thích trở thành chuyên gia nha khoa',
    'R',
    'interests',
    'easy',
    335,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '336',
    'Bạn thích học xác suất thống kê',
    'I',
    'activities',
    'easy',
    336,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '337',
    'Bạn thích phân tích thông tin để có được góc nhìn mới',
    'I',
    'activities',
    'hard',
    337,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '338',
    'Bạn thích giải quyết các vấn đề kỹ thuật',
    'R',
    'activities',
    'easy',
    338,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '340',
    'Bạn thích tìm ra cấu trúc hóa học của các chất lỏng',
    'I',
    'activities',
    'easy',
    340,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '341',
    'Bạn thích lý giải hóa mọi vấn đề và quan sát trong cuộc sống dưới góc nhìn khoa học',
    'I',
    'activities',
    'hard',
    341,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '339',
    'Bạn thích đọc sách và các tạp chí khoa học',
    'I',
    'activities',
    'easy',
    339,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '343',
    'Bạn thích khiến một ý tưởng hay câu chuyện trở nên kịch tính hơn',
    'A',
    'activities',
    'easy',
    343,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '344',
    'Bạn thích hoạt động trong một dàn nhạc và nhóm nhạc',
    'A',
    'activities',
    'easy',
    344,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '342',
    'Bạn thích tham quan bảo tàng khoa học',
    'R',
    'activities',
    'easy',
    342,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '345',
    'Bạn thích chơi các loại nhạc cụ',
    'A',
    'activities',
    'easy',
    345,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '346',
    'Bạn thích viết cho các tạp chí và tờ báo',
    'I',
    'activities',
    'easy',
    346,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '349',
    'Bạn thích tham gia các khóa học thiết kế',
    'A',
    'activities',
    'easy',
    349,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '347',
    'Bạn thích thiết kế áp phích, đồ nội thất và quần áo',
    'A',
    'activities',
    'easy',
    347,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '348',
    'Bạn thích vẽ chân dung hay chụp ảnh',
    'A',
    'activities',
    'easy',
    348,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '350',
    'Bạn thích diễn trong các bộ phim hay vở kịch',
    'A',
    'activities',
    'easy',
    350,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '352',
    'Bạn thích tham gia các buổi hội thảo để mở rộng mỗi quan hệ xã hội',
    'S',
    'activities',
    'easy',
    352,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '351',
    'Bạn thích phỏng vấn người nổi tiếng về phong cách ăn mặc của họ để viết bài cho tạp chí thời trang',
    'I',
    'activities',
    'hard',
    351,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '353',
    'Bạn thích tham gia các khóa học phát triển bản thân',
    'E',
    'activities',
    'easy',
    353,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '354',
    'Bạn thích tìm hiểu về sự phạm pháp của trẻ vị thành niên',
    'C',
    'activities',
    'easy',
    354,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '355',
    'Bạn thích đọc các bài viết và sách về xã hội học',
    'S',
    'activities',
    'easy',
    355,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '356',
    'Bạn thích đọc các tác phẩm được viết bởi các giáo viên nổi tiếng và các nhà trị liệu',
    'S',
    'activities',
    'hard',
    356,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '359',
    'Bạn thích giúp đỡ người khuyết tật',
    'S',
    'activities',
    'easy',
    359,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '358',
    'Bạn thích hướng dẫn mọi người làm việc hiệu quả',
    'S',
    'interests',
    'easy',
    358,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '360',
    'Bạn thích giải quyết các tranh cãi và bất đồng giữa mọi người',
    'E',
    'activities',
    'easy',
    360,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '357',
    'Bạn thích tham gia các buổi hội thảo nói về mối quan hệ con người',
    'E',
    'activities',
    'easy',
    357,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '361',
    'Bạn thích giảng dạy ở các trường đại học',
    'S',
    'activities',
    'easy',
    361,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '362',
    'Bạn thích dẫn dắt và tham gia các buổi hội thảo về kỹ năng lãnh đạo',
    'E',
    'activities',
    'easy',
    362,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '363',
    'Bạn thích đưa ra các giải pháp đổi mới để giúp mang lại thành công cho hoạt động thương mại',
    'E',
    'activities',
    'hard',
    363,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '364',
    'Bạn thích quản lý các dự án',
    'E',
    'activities',
    'easy',
    364,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '366',
    'Bạn thích tham gia các cuộc họp với cấp quản lý và lãnh đạo',
    'E',
    'activities',
    'easy',
    366,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '365',
    'Bạn thích giám sát người khác khi họ làm việc',
    'E',
    'interests',
    'easy',
    365,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '369',
    'Bạn thích điều hành doanh nghiệp hoặc các tổ chức phân phối dịch vụ',
    'E',
    'activities',
    'easy',
    369,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '368',
    'Bạn thích tham gia vào các chiến dịch chính trị',
    'E',
    'activities',
    'easy',
    368,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '367',
    'Bạn thích đọc về các chính trị gia hay những nhà kinh doanh nổi tiếng',
    'E',
    'activities',
    'easy',
    367,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '370',
    'Bạn thích đưa ra các quyết định quan trọng',
    'E',
    'activities',
    'easy',
    370,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '371',
    'Bạn thích có sức ảnh hưởng tới những người xung quanh',
    'E',
    'activities',
    'easy',
    371,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '372',
    'Bạn thích tham dự các cuộc họp để cải thiện doanh số bán hàng',
    'E',
    'activities',
    'easy',
    372,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '374',
    'Bạn thích tham gia các khóa học kinh doanh',
    'E',
    'activities',
    'easy',
    374,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '373',
    'Bạn thích thiết lập hệ thống thông tin hiệu quả',
    'I',
    'activities',
    'easy',
    373,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '376',
    'Bạn thích cập nhật báo cáo thường kỳ về các hoạt động kinh doanh và dịch vụ',
    'C',
    'activities',
    'easy',
    376,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '375',
    'Bạn thích làm việc với máy tính',
    'R',
    'interests',
    'easy',
    375,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '377',
    'Bạn thích kiểm tra các tài liệu và sản phẩm',
    'C',
    'activities',
    'easy',
    377,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '378',
    'Bạn thích lập bảng chi tiêu',
    'C',
    'activities',
    'easy',
    378,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '381',
    'Bạn thích điền các mẫu đơn chi tiết',
    'C',
    'activities',
    'easy',
    381,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '379',
    'Bạn thích công việc viết hóa đơn',
    'C',
    'activities',
    'easy',
    379,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '380',
    'Bạn thích sử dụng các thiết bị kinh doanh như máy tính và máy tính tiền',
    'R',
    'activities',
    'easy',
    380,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '382',
    'Bạn thích tham gia các khóa học để nghe lời khuyên về vấn đề thuế',
    'I',
    'activities',
    'easy',
    382,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '385',
    'Bạn thích sửa chữa đồ nội thất cũ',
    'R',
    'activities',
    'easy',
    385,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '384',
    'Bạn thích tạo các mẫu tóc cho các ngày lễ hội',
    'A',
    'activities',
    'easy',
    384,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '383',
    'Bạn thích sửa chữa quần áo một cách cơ bản',
    'R',
    'activities',
    'easy',
    383,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '386',
    'Bạn thích vẽ các bản vẽ kỹ thuật',
    'A',
    'activities',
    'easy',
    386,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '388',
    'Bạn thích đan áo len',
    'R',
    'activities',
    'easy',
    388,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '387',
    'Bạn thích thực hiện công việc biên tập',
    'I',
    'activities',
    'easy',
    387,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '389',
    'Bạn thích làm mứt trái cây',
    'R',
    'activities',
    'easy',
    389,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '391',
    'Bạn thích sửa chữa các hỏng hóc cơ bản trong nhà làm một vài công việc sửa chữa đơn giản',
    'R',
    'activities',
    'hard',
    391,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '392',
    'Bạn thích lập trình và phát triển các mô hình toán-tin để giải quyết các vấn đề khoa học',
    'I',
    'activities',
    'hard',
    392,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '390',
    'Bạn thích sử dụng máy in và các thiết bị ghi hình',
    'R',
    'activities',
    'easy',
    390,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '393',
    'Bạn thích giải thích và chứng minh bằng thực nghiệm các phương trình hóa học đơn giản',
    'I',
    'activities',
    'hard',
    393,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '394',
    'Bạn thích tìm ra chu kì bán rã của một thành phần nguyên tử',
    'I',
    'activities',
    'easy',
    394,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '395',
    'Bạn thích sử dụng máy tính bỏ túi cũng như thước loga',
    'R',
    'activities',
    'easy',
    395,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '399',
    'Bạn thích làm việc với các bảng toán học',
    'I',
    'interests',
    'easy',
    399,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '398',
    'Bạn thích tìm ra chức năng của bạch cầu',
    'I',
    'activities',
    'easy',
    398,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '396',
    'Bạn thích sử dụng các công cụ khoa học như kính hiển vi',
    'R',
    'activities',
    'easy',
    396,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '402',
    'Bạn thích viết truyện ngắn',
    'A',
    'activities',
    'easy',
    402,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '400',
    'Bạn thích biết lý do tại sao vệ tinh có cấu tạo nhất định để nó không bị rơi xuống trái đất',
    'I',
    'activities',
    'hard',
    400,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '401',
    'Bạn thích thực hiện các thí nghiệm khoa học',
    'I',
    'activities',
    'easy',
    401,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '403',
    'Bạn thích thiết kế tờ rơi quảng cáo',
    'A',
    'activities',
    'easy',
    403,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '397',
    'Bạn thích dùng đại số để giải các vấn đề toán học',
    'I',
    'activities',
    'easy',
    397,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '404',
    'Bạn thích vẽ chân dung hoặc chụp ảnh',
    'A',
    'activities',
    'easy',
    404,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '405',
    'Bạn thích thể hiện các ý tưởng thông qua nghệ thuật',
    'A',
    'activities',
    'easy',
    405,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '408',
    'Bạn thích giúp đỡ người khác lên kế hoạch cho tương lai của họ',
    'S',
    'activities',
    'easy',
    408,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '406',
    'Bạn thích đóng vai trong các vở kịch',
    'A',
    'activities',
    'easy',
    406,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '407',
    'Bạn thích đưa ra lời khuyên khi người khác phải đưa ra quyết định quan trọng',
    'S',
    'activities',
    'easy',
    407,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '410',
    'Bạn thích dạy học cho người khác',
    'S',
    'activities',
    'easy',
    410,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '412',
    'Bạn thích giúp đỡ người khác lên kế hoạch cho tương lai của họ',
    'S',
    'activities',
    'easy',
    412,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '414',
    'Bạn thích dẫn dắt các buổi thảo luận và sinh hoạt chuyên đề',
    'E',
    'activities',
    'easy',
    414,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '413',
    'Bạn thích hỗ trợ những người có hoàn cảnh khó khăn',
    'S',
    'activities',
    'easy',
    413,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '409',
    'Bạn thích làm mọi người vui',
    'S',
    'activities',
    'easy',
    409,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '411',
    'Bạn thích tham gia vào các sự kiện từ thiện',
    'S',
    'activities',
    'easy',
    411,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '416',
    'Bạn thích động viên người khác và đảm bảo rằng họ giữ vững động lực đó',
    'S',
    'activities',
    'easy',
    416,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '415',
    'Bạn thích thực hiện các công việc quản lý nhân sự như đánh giá thành tích cá nhân',
    'E',
    'activities',
    'hard',
    415,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '417',
    'Bạn thích làm việc với những kiểu người có tính cách khác nhau',
    'E',
    'interests',
    'easy',
    417,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '421',
    'Bạn thích lưu trữ một cách chi tiết và chính xác các khoản doanh thu và thanh toán',
    'C',
    'activities',
    'hard',
    421,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '423',
    'Bạn thích ghi chép lại thông tin từ các thiết bị thu âm',
    'C',
    'activities',
    'easy',
    423,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '418',
    'Bạn là người khởi xướng hoạt động vì cộng đồng',
    'E',
    'personality',
    'medium',
    418,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '420',
    'Bạn thích kiểm soát kế hoạch quản lý về lợi nhuận và chi tiêu',
    'C',
    'activities',
    'easy',
    420,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '419',
    'Bạn thích trao đổi thư tín',
    'C',
    'activities',
    'easy',
    419,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '422',
    'Bạn thích sử dụng máy tính để thực hiện phân tích dữ liệu kinh doanh',
    'C',
    'activities',
    'hard',
    422,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '425',
    'Bạn thích sắp xếp các cuộc họp kinh doanh với khách hàng và ban quản trị',
    'C',
    'activities',
    'easy',
    425,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '426',
    'Bạn thích sử dụng máy in',
    'C',
    'activities',
    'easy',
    426,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '427',
    'Bạn thích bán hàng hoặc quảng bá một sản phẩm',
    'E',
    'activities',
    'easy',
    427,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '424',
    'Bạn thích điền và hoàn thành các văn bản hành chính, giấy tờ',
    'C',
    'activities',
    'easy',
    424,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '428',
    'Bạn thích bắt đầu các dự án',
    'E',
    'activities',
    'easy',
    428,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '429',
    'Bạn thích nghi được với các loại thời tiết',
    'R',
    'activities',
    'easy',
    429,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '430',
    'Bạn thích dẫn dắt một nhóm',
    'E',
    'activities',
    'easy',
    430,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '432',
    'Bạn thích giải quyết các vấn đề toán học',
    'I',
    'activities',
    'easy',
    432,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '431',
    'Bạn thích dựng lều cắm trại',
    'R',
    'activities',
    'easy',
    431,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '433',
    'Bạn thích giải quyết các vấn đề về máy móc',
    'R',
    'activities',
    'easy',
    433,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '434',
    'Bạn thích đề xuất một phương án để hoàn thành công việc tốt hơn',
    'S',
    'activities',
    'easy',
    434,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '435',
    'Bạn thích hoặc muốn thử làm đồ thủ công (handmade)',
    'R',
    'activities',
    'easy',
    435,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '437',
    'Bạn thích thuyết trình hoặc diễn thuyết',
    'E',
    'activities',
    'easy',
    437,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '436',
    'Bạn thích thể hiện bản thân một cách rõ ràng',
    'E',
    'activities',
    'easy',
    436,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '438',
    'Bạn thích sử dụng máy tính',
    'R',
    'activities',
    'easy',
    438,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '440',
    'Bạn thích chịu trách nhiệm cho các số liệu',
    'C',
    'activities',
    'easy',
    440,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '439',
    'Bạn thích ở ngoài trời hơn ở trong nhà',
    'R',
    'activities',
    'easy',
    439,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '441',
    'Bạn thích nhận được sự chú ý của mọi người xung quanh',
    'E',
    'activities',
    'easy',
    441,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '442',
    'Bạn thích làm việc với các con số',
    'C',
    'interests',
    'easy',
    442,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '443',
    'Bạn thích các món ăn sử dụng nguyên liệu hoặc công thức mới',
    'I',
    'activities',
    'easy',
    443,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '444',
    'Bạn thích nấu ăn',
    'R',
    'activities',
    'easy',
    444,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '445',
    'Bạn thích bắt đầu chiến dịch chính trị của mình',
    'E',
    'activities',
    'easy',
    445,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '446',
    'Bạn thích tham gia các buổi hòa nhạc, vở kịch, triển lãm nghệ thuật',
    'A',
    'activities',
    'easy',
    446,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '448',
    'Bạn thích gấp giấy origami',
    'C',
    'activities',
    'easy',
    448,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '449',
    'Bạn thích tham gia hoạt động tình nguyện',
    'S',
    'activities',
    'easy',
    449,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '447',
    'Bạn thích các hoạt động thể chất ngoài trời như chạy bộ, bơi lội, điền kinh',
    'S',
    'activities',
    'easy',
    447,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '452',
    'Bạn thích làm việc với những người trẻ',
    'S',
    'interests',
    'easy',
    452,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '451',
    'Bạn thích gặp gỡ những người quan trọng',
    'E',
    'activities',
    'easy',
    451,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '450',
    'Bạn thích đưa ra các quyết định có ảnh hưởng tới người khác',
    'E',
    'activities',
    'easy',
    450,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '453',
    'Bạn thích làm việc theo cá nhân hoặc tự mình thực hiện với ít sự hướng dẫn',
    'I',
    'interests',
    'easy',
    453,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '454',
    'Bạn thích đánh máy, lưu trữ, sử dụng bàn phím số',
    'R',
    'activities',
    'easy',
    454,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '457',
    'Bạn thích tham gia vào các cuộc họp',
    'E',
    'activities',
    'easy',
    457,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '456',
    'Bạn thích làm việc nhóm',
    'E',
    'interests',
    'easy',
    456,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '455',
    'Bạn thích làm theo quy trình đã được quy định rõ ràng',
    'C',
    'activities',
    'easy',
    455,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '458',
    'Bạn thích làm việc ngoài trời',
    'R',
    'interests',
    'easy',
    458,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '459',
    'Bạn thích đọc tiểu thuyết, kịch bản, thơ ca',
    'A',
    'activities',
    'easy',
    459,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '461',
    'Bạn thích thể hiện phong cách của bạn',
    'A',
    'activities',
    'easy',
    461,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '460',
    'Bạn thích thực hiện các thí nghiệm',
    'I',
    'activities',
    'easy',
    460,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '463',
    'Bạn thích làm thủ công, tự làm quà cho bạn bè và họ hàng',
    'R',
    'activities',
    'easy',
    463,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '465',
    'Bạn thích đảm bảo rằng mọi thứ được hoàn thành với sự chính xác tối đa',
    'C',
    'activities',
    'easy',
    465,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '462',
    'Bạn thích khám phá các ý tưởng',
    'I',
    'activities',
    'easy',
    462,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '464',
    'Bạn thích chụp ảnh',
    'A',
    'activities',
    'easy',
    464,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '466',
    'Bạn thích sử dụng máy tính',
    'R',
    'activities',
    'easy',
    466,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '467',
    'Bạn thích làm việc với xe hơi, máy dọn cỏ hoặc máy khâu; sửa chữa đồ chơi trẻ con',
    'R',
    'interests',
    'hard',
    467,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '470',
    'Bạn thích trở thành lãnh đạo hoặc giành được giải thưởng về doanh thu',
    'E',
    'activities',
    'easy',
    470,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '469',
    'Bạn thích đọc các tạp chí khoa học hoặc kỹ thuật',
    'I',
    'activities',
    'easy',
    469,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '468',
    'Bạn thích chơi các môn thể thao đồng đội',
    'R',
    'activities',
    'easy',
    468,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '471',
    'Bạn thích kiểm tra chất lượng các bộ phận trước khi giao hàng',
    'C',
    'activities',
    'easy',
    471,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '474',
    'Bạn thích tư vấn nghề nghiệp cho mọi người',
    'S',
    'interests',
    'easy',
    474,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '472',
    'Bạn thích học về cấu tạo cơ thể người',
    'I',
    'activities',
    'easy',
    472,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '475',
    'Bạn thích hoạt động kinh doanh chuỗi thương hiệu',
    'E',
    'activities',
    'easy',
    475,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '476',
    'Bạn thích thực hiện việc tính toán tiền lương',
    'C',
    'activities',
    'easy',
    476,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '480',
    'Bạn thích tham gia tình nguyện tại tổ chức phi lợi nhuận',
    'S',
    'activities',
    'easy',
    480,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '477',
    'Bạn thích lát gạch hoặc đá',
    'R',
    'activities',
    'easy',
    477,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '478',
    'Bạn thích học về hành vi động vật',
    'I',
    'activities',
    'easy',
    478,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '479',
    'Bạn thích đạo diễn một vở kịch',
    'A',
    'activities',
    'easy',
    479,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '473',
    'Bạn thích chỉ huy dàn hợp xướng',
    'A',
    'activities',
    'easy',
    473,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '481',
    'Bạn thích bán hàng hóa trong cửa hàng tạp hóa',
    'E',
    'activities',
    'easy',
    481,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '483',
    'Bạn thích làm việc tại giàn khoan dầu ngoài biển',
    'R',
    'interests',
    'easy',
    483,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '482',
    'Bạn thích quản lý hàng tồn kho',
    'C',
    'activities',
    'easy',
    482,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '486',
    'Bạn thích giúp đỡ những người có vấn đề về nghiện rượu hoặc chất kích thích',
    'S',
    'activities',
    'easy',
    486,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '484',
    'Bạn thích nghiên cứu động hoặc thực vật',
    'I',
    'activities',
    'easy',
    484,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '487',
    'Bạn thích quản lý vận hành khách sạn',
    'E',
    'activities',
    'easy',
    487,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '488',
    'Bạn thích sử dụng chương trình máy tính để tạo ra hóa đơn cho khách hàng',
    'C',
    'activities',
    'easy',
    488,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '485',
    'Bạn thích thiết kế trang bìa, dàn trang cho các tạp chí',
    'A',
    'activities',
    'easy',
    485,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '490',
    'Bạn thích phát triển cách chữa bệnh hoặc quy trình y tế mới',
    'I',
    'activities',
    'easy',
    490,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '489',
    'Bạn thích lắp ráp các bộ phận điện tử',
    'R',
    'activities',
    'easy',
    489,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '491',
    'Bạn thích viết một ca khúc',
    'A',
    'activities',
    'easy',
    491,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '494',
    'Bạn thích lưu trữ, quản lý hồ sơ nhân viên',
    'C',
    'activities',
    'easy',
    494,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '493',
    'Bạn thích vận hành salon làm đẹp hoặc cửa tiệm cắt tóc',
    'E',
    'activities',
    'easy',
    493,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '496',
    'Bạn thích thực hiện nghiên cứu sinh học',
    'I',
    'activities',
    'easy',
    496,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '497',
    'Bạn thích viết sách hoặc kịch bản kịch',
    'A',
    'activities',
    'easy',
    497,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '495',
    'Bạn thích vận hành máy nghiền trong nhà máy',
    'R',
    'activities',
    'easy',
    495,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '498',
    'Bạn thích giúp đỡ những người gặp vấn đề liên quan đến gia đình',
    'S',
    'activities',
    'easy',
    498,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '492',
    'Bạn thích dạy bài tập thể dục cho người khác',
    'S',
    'activities',
    'easy',
    492,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '499',
    'Bạn thích quản lý một phòng ban trong một công ty lớn',
    'E',
    'activities',
    'easy',
    499,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '500',
    'Bạn thích nhập và lưu trữ các dữ liệu thống kê và các dữ liệu số khác',
    'C',
    'activities',
    'easy',
    500,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '501',
    'Bạn thích sửa vòi nước hỏng',
    'R',
    'activities',
    'easy',
    501,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '502',
    'Bạn thích nghiên cứu cá voi và các loài sinh vật biển khác',
    'I',
    'activities',
    'easy',
    502,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '503',
    'Bạn thích chơi một loại nhạc cụ',
    'A',
    'activities',
    'easy',
    503,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '504',
    'Bạn thích giám sát hoạt động của trẻ em tại trại hè',
    'S',
    'activities',
    'easy',
    504,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '506',
    'Bạn thích sử dụng máy tính cầm tay',
    'R',
    'activities',
    'easy',
    506,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '505',
    'Bạn thích quản lý một cửa hàng quần áo',
    'E',
    'activities',
    'easy',
    505,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '507',
    'Bạn thích lắp ráp sản phẩm trong nhà máy',
    'R',
    'activities',
    'easy',
    507,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '508',
    'Bạn thích làm việc trong phòng thí nghiệm sinh học',
    'I',
    'interests',
    'easy',
    508,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '509',
    'Bạn thích thực hiện các cảnh mạo hiểm cho một bộ phim hoặc chương trình truyền hình',
    'R',
    'activities',
    'hard',
    509,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '510',
    'Bạn thích dạy trẻ em cách đọc',
    'S',
    'activities',
    'easy',
    510,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '512',
    'Bạn thích xử lý các giao dịch của khách hàng trong ngân hàng',
    'C',
    'activities',
    'easy',
    512,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '511',
    'Bạn thích buôn bán bất động sản',
    'E',
    'activities',
    'easy',
    511,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '514',
    'Bạn thích vẽ bản đồ cho thềm đại dương',
    'I',
    'activities',
    'easy',
    514,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '513',
    'Bạn thích lắp đặt sàn nhà trong các ngôi nhà',
    'R',
    'activities',
    'easy',
    513,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '515',
    'Bạn thích thiết kế bối cảnh cho các vở kịch',
    'A',
    'activities',
    'easy',
    515,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '517',
    'Bạn thích vận hành một cửa hàng đồ chơi',
    'E',
    'activities',
    'easy',
    517,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '519',
    'Bạn thích buôn bán đồ nội thất và đồ trang trí nhà',
    'E',
    'activities',
    'easy',
    519,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '518',
    'Bạn thích lưu trữ dữ liệu về giao hàng và nhận hàng',
    'C',
    'activities',
    'easy',
    518,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '520',
    'Bạn thích dạy học, tư vấn và chia sẻ thông tin với người khác',
    'S',
    'activities',
    'easy',
    520,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '516',
    'Bạn thích giúp đỡ người già với các công việc thường nhật của họ',
    'S',
    'activities',
    'easy',
    516,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '521',
    'Bạn thích làm việc ngoài trời hơn là bị kẹt trong nhà cả ngày',
    'R',
    'interests',
    'easy',
    521,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '522',
    'Bạn thích làm việc ở những môi trường có tổ chức rõ ràng',
    'R',
    'interests',
    'easy',
    522,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '524',
    'Bạn thích làm việc với các đồ vật hơn là với con người',
    'R',
    'interests',
    'easy',
    524,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '525',
    'Bạn thích làm việc với các dữ liệu đã được lưu trữ và các hệ thống có sẵn',
    'C',
    'interests',
    'easy',
    525,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '523',
    'Bạn thích làm việc với các công cụ, dụng cụ hoặc máy móc',
    'R',
    'interests',
    'easy',
    523,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '526',
    'Bạn thích dõi theo quá trình trưởng thành và phát triển của vật nuôi hoặc loài hoa yêu thích',
    'I',
    'activities',
    'hard',
    526,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '529',
    'Bạn thích sửa chữa mọi thứ và khiến nó hoạt động tốt hơn trước',
    'R',
    'activities',
    'easy',
    529,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '528',
    'Bạn thích những hoạt động trải nghiệm thực tế, trực tiếp',
    'R',
    'activities',
    'easy',
    528,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '530',
    'Bạn thích thực hiện các nghiên cứu và thí nghiệm',
    'I',
    'activities',
    'easy',
    530,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '527',
    'Bạn thích nhìn vào bức tranh tổng quát hơn là bị sa vào các chi tiết nhỏ nhặt',
    'E',
    'activities',
    'easy',
    527,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '533',
    'Bạn thích chơi đùa với trẻ nhỏ',
    'S',
    'activities',
    'easy',
    533,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '532',
    'Bạn thích chăm sóc động vật',
    'S',
    'activities',
    'easy',
    532,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '531',
    'Bạn thích việc hoàn thành công việc theo cách có tổ chức',
    'C',
    'activities',
    'easy',
    531,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '534',
    'Bạn thích dạy dỗ hoặc đào tạo người khác',
    'S',
    'activities',
    'easy',
    534,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '535',
    'Bạn thích diễn thuyết',
    'E',
    'activities',
    'easy',
    535,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '536',
    'Bạn thích diễn trong các vở kịch',
    'A',
    'activities',
    'easy',
    536,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '537',
    'Bạn thích đọc về nghệ thuật và âm nhạc',
    'A',
    'activities',
    'easy',
    537,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '541',
    'Bạn thích phân tích mọi thứ (các vấn đề/tình huống)',
    'I',
    'activities',
    'hard',
    541,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '538',
    'Bạn thích giải ô chữ',
    'I',
    'activities',
    'easy',
    538,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '539',
    'Bạn thích khám phá các nền văn hóa khác',
    'I',
    'activities',
    'easy',
    539,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '542',
    'Bạn thích sắp xếp mọi thứ (giấy tờ, bàn làm việc/văn phòng)',
    'C',
    'interests',
    'easy',
    542,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '543',
    'Bạn thích sửa chữa xe hơi',
    'R',
    'activities',
    'easy',
    543,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '545',
    'Bạn thích thử gây tác động hay thuyết phục người khác',
    'E',
    'activities',
    'easy',
    545,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '544',
    'Bạn thích thảo luận về các vấn đề nóng hổi',
    'E',
    'activities',
    'easy',
    544,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '540',
    'Bạn thích nhận được những chỉ dẫn rõ ràng để làm theo',
    'C',
    'activities',
    'easy',
    540,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '546',
    'Bạn thích giúp đỡ người khác giải quyết các vấn đề của họ',
    'S',
    'activities',
    'easy',
    546,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '547',
    'Bạn thích việc tìm ra cách mọi thứ hoạt động',
    'I',
    'activities',
    'easy',
    547,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '548',
    'Bạn thích sử dụng nhật kí và ghi chú để theo dõi công việc hàng ngày',
    'C',
    'activities',
    'easy',
    548,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '549',
    'Bạn thích công việc xây dựng và lắp ráp',
    'R',
    'activities',
    'easy',
    549,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '550',
    'Bạn thích công việc nghiên cứu',
    'I',
    'activities',
    'easy',
    550,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '552',
    'Bạn thích tận dụng tối đa nguồn tài nguyên thiên nhiên của trái đất',
    'R',
    'activities',
    'easy',
    552,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '553',
    'Bạn thích đi săn và/hoặc câu cá',
    'R',
    'activities',
    'easy',
    553,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '554',
    'Bạn thích bảo vệ môi trường',
    'R',
    'activities',
    'easy',
    554,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '551',
    'Bạn thích tìm hiểu về cách thức vạn vật sinh sôi và tồn tại',
    'I',
    'activities',
    'easy',
    551,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '556',
    'Bạn thích lập kế hoạch, quản lý quỹ, lưu các bản ghi',
    'C',
    'activities',
    'easy',
    556,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '555',
    'Bạn thích ở ngoài trời trong mọi kiểu thời tiết',
    'R',
    'activities',
    'easy',
    555,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '557',
    'Bạn thích điều khiển máy móc và giữ chúng luôn trong tình trạng tốt',
    'R',
    'activities',
    'easy',
    557,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '558',
    'Bạn thích đọc và làm theo các bản hướng dẫn và/hoặc quy định',
    'C',
    'activities',
    'easy',
    558,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '560',
    'Bạn thích trực tiếp làm việc bằng tay',
    'R',
    'interests',
    'easy',
    560,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '562',
    'Bạn thích giải quyết các vấn đề kỹ thuật',
    'R',
    'activities',
    'easy',
    562,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '563',
    'Bạn thích tham quan và học hỏi từ các chuyến thăm tới những toà nhà lịch sử, đẹp hoặc thú vị',
    'R',
    'activities',
    'hard',
    563,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '559',
    'Bạn thích hình dung trong đầu khi một sản phẩm nào đó được hoàn thiện sẽ trông như thế nào',
    'A',
    'activities',
    'hard',
    559,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '561',
    'Bạn thích thực hiện các công việc đòi hỏi kết quả chính xác',
    'C',
    'activities',
    'easy',
    561,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '564',
    'Bạn thích tuân theo các quy trình từng bước và trình tự logic',
    'I',
    'activities',
    'hard',
    564,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '566',
    'Bạn thích biểu diễn trước mặt người khác',
    'A',
    'activities',
    'easy',
    566,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '565',
    'Bạn thích sử dụng trí tưởng tượng để giao tiếp, truyền tải thông tin đến người khác',
    'A',
    'activities',
    'hard',
    565,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '568',
    'Bạn thích chơi một nhạc cụ',
    'A',
    'activities',
    'easy',
    568,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '567',
    'Bạn thích đọc và viết',
    'I',
    'activities',
    'easy',
    567,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '569',
    'Bạn thích thực hiện các hoạt động có tính sáng tạo và nghệ thuật',
    'A',
    'activities',
    'easy',
    569,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '571',
    'Bạn thích thiết kế ấn phẩm và poster',
    'A',
    'activities',
    'easy',
    571,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '570',
    'Bạn thích sử dụng các công nghệ ghi hình và sáng tạo video',
    'A',
    'activities',
    'easy',
    570,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '574',
    'Bạn thích trở thành người dẫn dắt trong nhóm',
    'E',
    'activities',
    'easy',
    574,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '573',
    'Bạn thích làm việc với số liệu và thông tin chi tiết',
    'I',
    'interests',
    'easy',
    573,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '575',
    'Bạn thích giao thiệp với người khác vì mục đích kinh doanh ',
    'E',
    'activities',
    'easy',
    575,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '576',
    'Bạn thích viết báo cáo và truyền tải các ý tưởng',
    'I',
    'activities',
    'easy',
    576,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '578',
    'Bạn thích giao tiếp với nhiều kiểu người khác nhau',
    'S',
    'activities',
    'easy',
    578,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '572',
    'Bạn thích thực hiện các hoạt động cố định, theo quy trình nhưng vẫn linh động để thay đổi',
    'E',
    'activities',
    'hard',
    572,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '577',
    'Bạn thích lên kế hoạch và tự giác thực hiện công việc theo kế hoạch đề ra',
    'E',
    'activities',
    'easy',
    577,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '580',
    'Bạn thích chỉ đạo và sắp xếp công việc cho người khác',
    'E',
    'activities',
    'easy',
    580,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '579',
    'Bạn thích giúp đỡ bạn bè trong học tập và hoàn thành bài tập về nhà',
    'S',
    'activities',
    'easy',
    579,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '582',
    'Bạn thích tiếp thu thông tin mới',
    'I',
    'activities',
    'easy',
    582,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '581',
    'Bạn thích giải quyết nhiều công việc cùng một lúc',
    'A',
    'activities',
    'easy',
    581,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '583',
    'Bạn thích giúp đỡ người khác vượt qua khó khăn',
    'S',
    'activities',
    'easy',
    583,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '585',
    'Bạn thích đưa ra dự đoán dựa trên các dữ kiện trong quá khứ và hiện tại',
    'I',
    'activities',
    'easy',
    585,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '584',
    'Bạn thích làm việc với con số',
    'I',
    'interests',
    'easy',
    584,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '586',
    'Bạn thích phân tích và diễn giải thông tin tài chính',
    'E',
    'activities',
    'hard',
    586,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '587',
    'Bạn thích giải quyết các vấn đề tiền bạc với sự chính xác và đáng tin cậy',
    'C',
    'activities',
    'easy',
    587,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '589',
    'Bạn thích tham gia vào hoạt động chính trị',
    'S',
    'activities',
    'easy',
    589,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '591',
    'Bạn thích phân tích thông tin và giải thích nó cho người khác',
    'E',
    'activities',
    'hard',
    591,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '588',
    'Bạn thích thương thuyết, lập luận và tranh biện',
    'E',
    'activities',
    'easy',
    588,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '590',
    'Bạn thích làm việc với sự chi tiết và tỉ mỉ',
    'C',
    'interests',
    'easy',
    590,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '592',
    'Bạn thích du lịch và khám phá những điều mới',
    'R',
    'activities',
    'easy',
    592,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '594',
    'Bạn thích giúp đỡ người và động vật bị ốm',
    'S',
    'activities',
    'easy',
    594,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '593',
    'Bạn thích làm việc dưới áp lực',
    'E',
    'interests',
    'easy',
    593,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '596',
    'Bạn thích tuân thủ các hướng dẫn với sự chính xác cao',
    'C',
    'activities',
    'easy',
    596,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '597',
    'Bạn thích khám phá các địa điểm và hoạt động mới',
    'R',
    'activities',
    'easy',
    597,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '595',
    'Bạn thích làm việc theo nhóm',
    'S',
    'interests',
    'easy',
    595,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '599',
    'Bạn thích tổ chức các hoạt động và sự kiện ',
    'S',
    'activities',
    'easy',
    599,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '598',
    'Bạn thích làm việc với nhiều kiểu người và ở các độ tuổi khác nhau',
    'S',
    'interests',
    'easy',
    598,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '601',
    'Bạn thích giúp đỡ người khác đưa ra quyết định',
    'S',
    'activities',
    'easy',
    601,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '600',
    'Bạn thích có một kế hoạch linh hoạt và dễ thay đổi',
    'E',
    'activities',
    'easy',
    600,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '602',
    'Bạn thích tìm hiểu về các nền văn hóa khác',
    'I',
    'activities',
    'easy',
    602,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '603',
    'Bạn thích tham gia các hoạt động cộng đồng và/hoặc hoạt động tình nguyện',
    'R',
    'activities',
    'easy',
    603,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '604',
    'Bạn thích lắng nghe quan điểm của người khác',
    'E',
    'activities',
    'easy',
    604,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '607',
    'Bạn thích làm việc với máy tính',
    'R',
    'interests',
    'easy',
    607,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '606',
    'Bạn thích kết bạn với nhiều kiểu người',
    'S',
    'activities',
    'easy',
    606,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '608',
    'Bạn thích sử dụng máy móc, công cụ và các phương thức',
    'R',
    'activities',
    'easy',
    608,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '609',
    'Bạn thích đọc tài liệu kỹ thuật và giải quyết các vấn đề kỹ thuật',
    'I',
    'activities',
    'easy',
    609,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '610',
    'Bạn thích chơi game và tìm hiểu cách thức hoạt động của trò chơi',
    'I',
    'activities',
    'easy',
    610,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '605',
    'Bạn thích suy nghĩ cách làm mới để giải quyết công việc',
    'E',
    'activities',
    'easy',
    605,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '611',
    'Bạn thích làm việc dưới áp lực',
    'R',
    'interests',
    'easy',
    611,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '612',
    'Bạn thích tương tác với mọi người',
    'S',
    'activities',
    'easy',
    612,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '613',
    'Bạn thích nắm giữ vị trí điều hành và quản lý',
    'E',
    'activities',
    'easy',
    613,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '617',
    'Bạn quan tâm quá trình hoạt động hơn là kết quả',
    'A',
    'activities',
    'medium',
    617,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '615',
    'Bạn thích hoạt động theo nhóm, tập thể',
    'S',
    'activities',
    'easy',
    615,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '618',
    'Bạn thích vận dụng toán học để giải quyết vấn đề ',
    'I',
    'activities',
    'easy',
    618,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '616',
    'Bạn thích làm các công việc theo quy tắc, trình tự và với sự chính xác',
    'C',
    'activities',
    'easy',
    616,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '619',
    'Bạn thích vận dụng và làm việc với máy móc, thiết bị, công cụ',
    'R',
    'interests',
    'easy',
    619,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '614',
    'Bạn thích tuân thủ các quy tắc và điều lệ',
    'C',
    'activities',
    'easy',
    614,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '621',
    'Bạn thích mua sắm',
    'E',
    'activities',
    'easy',
    621,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '620',
    'Bạn thích hình dung theo không gian ba chiều (3D)',
    'A',
    'activities',
    'easy',
    620,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '622',
    'Bạn sẵn sàng nhận trách nhiệm',
    'E',
    'personality',
    'easy',
    622,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '623',
    'Bạn thích trình bày và thúc đẩy các ý tưởng',
    'E',
    'activities',
    'easy',
    623,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '625',
    'Bạn thích thuyết phục người khác mua sản phẩm hoặc tham gia các hoạt động',
    'E',
    'activities',
    'easy',
    625,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '626',
    'Bạn thích trình bày và giải thích ý tưởng cho người khác',
    'S',
    'activities',
    'easy',
    626,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '624',
    'Bạn thích thuyết trình và nói chuyện trước đám đông',
    'E',
    'activities',
    'easy',
    624,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '627',
    'Bạn thích tận dụng cơ hội để nâng cao thu nhập',
    'E',
    'activities',
    'easy',
    627,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '628',
    'Bạn thích suy luận các công thức',
    'I',
    'activities',
    'easy',
    628,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '629',
    'Bạn thích tìm câu trả lời cho các vấn đề và câu hỏi',
    'I',
    'activities',
    'easy',
    629,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '631',
    'Bạn thích du lịch',
    'R',
    'activities',
    'easy',
    631,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '630',
    'Bạn thích làm việc trong phòng thí nghiệm',
    'R',
    'interests',
    'easy',
    630,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '632',
    'Bạn thích giải quyết các vấn đề về cơ khí',
    'R',
    'activities',
    'easy',
    632,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '633',
    'Bạn thích thiết kế quy trình làm việc hiệu quả',
    'I',
    'interests',
    'easy',
    633,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '635',
    'Bạn thích lái xe',
    'R',
    'activities',
    'easy',
    635,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '634',
    'Bạn thích dự đoán trước và chuẩn bị cho các yêu cầu',
    'E',
    'activities',
    'easy',
    634,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '636',
    'Bạn thích di chuyển, sắp xếp đồ vật sang nơi khác',
    'R',
    'activities',
    'easy',
    636,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '642',
    'Bạn thích môn học về Vẽ',
    'A',
    'activities',
    'easy',
    642,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '641',
    'Bạn thích môn học về Nông nghiệp',
    'R',
    'activities',
    'easy',
    641,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '640',
    'Bạn thích môn học về Hóa học',
    'I',
    'activities',
    'easy',
    640,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '639',
    'Bạn thích môn học về Khoa học Trái đất',
    'I',
    'activities',
    'easy',
    639,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '637',
    'Bạn thích môn học về Toán',
    'I',
    'activities',
    'easy',
    637,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '638',
    'Bạn thích môn học về Khoa học Sự sống',
    'I',
    'activities',
    'easy',
    638,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '644',
    'Bạn thích môn học về Xây dựng',
    'R',
    'activities',
    'easy',
    644,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '643',
    'Bạn thích môn học về Khoa học Vật lý',
    'I',
    'activities',
    'easy',
    643,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '646',
    'Bạn thích môn học về Thiết kế',
    'A',
    'activities',
    'easy',
    646,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '645',
    'Bạn thích môn học về Kỹ thuật Điện',
    'R',
    'activities',
    'easy',
    645,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '648',
    'Bạn thích môn học về Kịch và Diễn thuyết',
    'A',
    'activities',
    'easy',
    648,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '649',
    'Bạn thích môn học về Báo chí/Văn học',
    'I',
    'activities',
    'easy',
    649,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '647',
    'Bạn thích môn học về Âm nhạc',
    'A',
    'activities',
    'easy',
    647,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '650',
    'Bạn thích môn học về Công nghệ Nghe nhìn',
    'R',
    'activities',
    'easy',
    650,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '651',
    'Bạn thích môn học về Máy tính',
    'R',
    'activities',
    'easy',
    651,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '653',
    'Bạn thích môn học về Tiếng Anh',
    'S',
    'activities',
    'easy',
    653,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '652',
    'Bạn thích môn học về Kế toán',
    'C',
    'activities',
    'easy',
    652,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '654',
    'Bạn thích môn học về Kinh tế/Kinh doanh',
    'E',
    'activities',
    'easy',
    654,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '656',
    'Bạn thích môn học về Khoa học Xã hội',
    'S',
    'activities',
    'easy',
    656,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '655',
    'Bạn thích môn học về Ngữ văn',
    'S',
    'activities',
    'easy',
    655,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '657',
    'Bạn thích môn học về Khoa học',
    'I',
    'activities',
    'easy',
    657,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '658',
    'Bạn thích môn học về Tâm lý học',
    'I',
    'activities',
    'easy',
    658,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '660',
    'Bạn thích môn học về Luật Kinh doanh',
    'E',
    'activities',
    'easy',
    660,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '663',
    'Bạn thích môn học về Ngoại ngữ',
    'S',
    'activities',
    'easy',
    663,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '659',
    'Bạn thích môn học về Ngân hàng/Tài chính',
    'C',
    'activities',
    'easy',
    659,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '664',
    'Bạn thích môn học về Sức khỏe Lao động',
    'R',
    'activities',
    'easy',
    664,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '661',
    'Bạn thích môn học về Chính phủ/Nhà nước',
    'E',
    'activities',
    'easy',
    661,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '662',
    'Bạn thích môn học về Lịch sử',
    'I',
    'activities',
    'easy',
    662,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '665',
    'Bạn thích môn học về Marketing',
    'E',
    'activities',
    'easy',
    665,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '666',
    'Bạn thích môn học về Dịch vụ Thực phẩm',
    'R',
    'activities',
    'easy',
    666,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '667',
    'Bạn thích môn học về Khoa học Tiêu dùng',
    'E',
    'activities',
    'easy',
    667,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '668',
    'Bạn thích môn học về Truyền thông',
    'A',
    'activities',
    'easy',
    668,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '670',
    'Mọi người nhận xét bạn là một người dễ gần và trung thành',
    'S',
    'personality',
    'medium',
    670,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '671',
    'Mọi người nhận xét bạn là một người có trí tưởng tượng phong phú',
    'A',
    'personality',
    'medium',
    671,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '669',
    'Mọi người thường nhờ bạn hòa giải xích mích hoặc bất đồng',
    'S',
    'personality',
    'medium',
    669,
    1,
    '2022-07-20 02:19:34',
    '2022-07-20 02:19:34'
);

-- =====================================================
-- THỐNG KÊ DỮ LIỆU ĐÃ MIGRATION
-- =====================================================

-- Tổng số câu hỏi: 668

-- Phân bố theo Holland Code:
-- A: 95 câu (Artistic (Nghệ thuật))
-- C: 100 câu (Conventional (Truyền thống))
-- E: 135 câu (Enterprising (Doanh nghiệp))
-- I: 120 câu (Investigative (Nghiên cứu))
-- R: 113 câu (Realistic (Thực tế))
-- S: 105 câu (Social (Xã hội))

-- Phân bố theo Category:
-- activities: 355 câu
-- interests: 137 câu
-- personality: 162 câu
-- subjects: 14 câu

-- Phân bố theo Difficulty:
-- easy: 569 câu
-- hard: 46 câu
-- medium: 53 câu

-- Commit transaction
COMMIT;

-- Kiểm tra kết quả
SELECT 
    'Migration hoàn thành!' as status,
    COUNT(*) as total_questions,
    COUNT(DISTINCT holland_code) as unique_holland_codes,
    COUNT(DISTINCT category) as unique_categories
FROM questions;

-- Xem phân bố Holland Code
SELECT 
    holland_code,
    COUNT(*) as question_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions), 2) as percentage
FROM questions 
GROUP BY holland_code 
ORDER BY holland_code;

-- Xem phân bố Category  
SELECT 
    category,
    COUNT(*) as question_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions), 2) as percentage
FROM questions 
GROUP BY category 
ORDER BY category;

-- =====================================================
-- Import Data for Holland Code Quiz Testing
-- =====================================================
-- HƯỚNG DẪN:
-- 1. Chạy create-all-tables.sql TRƯỚC để tạo tất cả bảng
-- 2. Chạy sample-data.sql để có users và products
-- 3. Sau đó chạy file này để có sample questions
-- LƯU Ý: File này không tạo lại bảng, chỉ insert dữ liệu
-- =====================================================

-- Kiểm tra và thông báo
SELECT 'Bắt đầu insert sample quiz data...' as status;

-- 1. Insert sample questions (10 câu mỗi nhóm Holland = 60 câu total)

-- Realistic (R) - Kỹ thuật/Thực tế
INSERT INTO questions (question_id, question_text, holland_code, category) VALUES
('Q001', 'Tôi thích làm việc với máy móc và thiết bị kỹ thuật', 'R', 'interests'),
('Q002', 'Tôi có khả năng sửa chữa đồ điện tử', 'R', 'activities'),
('Q003', 'Tôi thích làm việc ngoài trời', 'R', 'interests'),
('Q004', 'Tôi giỏi trong việc lắp ráp đồ vật', 'R', 'activities'),
('Q005', 'Tôi thích làm việc với tay', 'R', 'interests'),
('Q006', 'Tôi có thể vận hành máy móc phức tạp', 'R', 'activities'),
('Q007', 'Tôi thích công việc có tính thể chất', 'R', 'interests'),
('Q008', 'Tôi giỏi về kỹ thuật cơ khí', 'R', 'activities'),
('Q009', 'Tôi thích làm việc trong xưởng sản xuất', 'R', 'interests'),
('Q010', 'Tôi có thể đọc hiểu bản vẽ kỹ thuật', 'R', 'activities'),

-- Investigative (I) - Nghiên cứu/Điều tra
('Q011', 'Tôi thích nghiên cứu và khám phá', 'I', 'interests'),
('Q012', 'Tôi giỏi phân tích dữ liệu', 'I', 'activities'),
('Q013', 'Tôi thích giải quyết vấn đề phức tạp', 'I', 'interests'),
('Q014', 'Tôi có khả năng tư duy logic tốt', 'I', 'activities'),
('Q015', 'Tôi thích học hỏi kiến thức mới', 'I', 'interests'),
('Q016', 'Tôi giỏi trong việc quan sát và phân tích', 'I', 'activities'),
('Q017', 'Tôi thích làm thí nghiệm khoa học', 'I', 'interests'),
('Q018', 'Tôi có thể đưa ra kết luận từ dữ liệu', 'I', 'activities'),
('Q019', 'Tôi thích đọc tài liệu chuyên môn', 'I', 'interests'),
('Q020', 'Tôi giỏi toán học và thống kê', 'I', 'subjects'),

-- Artistic (A) - Nghệ thuật/Sáng tạo
('Q021', 'Tôi thích các hoạt động sáng tạo', 'A', 'interests'),
('Q022', 'Tôi có khả năng thiết kế đẹp mắt', 'A', 'activities'),
('Q023', 'Tôi thích viết lách và sáng tác', 'A', 'interests'),
('Q024', 'Tôi giỏi âm nhạc hoặc hội họa', 'A', 'subjects'),
('Q025', 'Tôi thích thể hiện cá tính riêng', 'A', 'personality'),
('Q026', 'Tôi có óc thẩm mỹ tốt', 'A', 'personality'),
('Q027', 'Tôi thích làm việc trong môi trường tự do', 'A', 'interests'),
('Q028', 'Tôi có thể tạo ra ý tưởng độc đáo', 'A', 'activities'),
('Q029', 'Tôi thích nghệ thuật biểu diễn', 'A', 'interests'),
('Q030', 'Tôi giỏi trang trí và bố trí không gian', 'A', 'activities'),

-- Social (S) - Xã hội/Giúp đỡ
('Q031', 'Tôi thích giúp đỡ người khác', 'S', 'interests'),
('Q032', 'Tôi có khả năng lắng nghe tốt', 'S', 'personality'),
('Q033', 'Tôi thích làm việc với trẻ em', 'S', 'interests'),
('Q034', 'Tôi giỏi động viên và khích lệ người khác', 'S', 'activities'),
('Q035', 'Tôi thích các hoạt động xã hội', 'S', 'interests'),
('Q036', 'Tôi có thể hiểu cảm xúc của người khác', 'S', 'personality'),
('Q037', 'Tôi thích tư vấn và hướng dẫn', 'S', 'interests'),
('Q038', 'Tôi giỏi giao tiếp và chia sẻ', 'S', 'activities'),
('Q039', 'Tôi thích hoạt động từ thiện', 'S', 'interests'),
('Q040', 'Tôi có thể làm việc tốt trong nhóm', 'S', 'activities'),

-- Enterprising (E) - Quản lý/Kinh doanh
('Q041', 'Tôi thích dẫn dắt và chỉ đạo', 'E', 'interests'),
('Q042', 'Tôi có khả năng thuyết phục người khác', 'E', 'activities'),
('Q043', 'Tôi thích bán hàng và kinh doanh', 'E', 'interests'),
('Q044', 'Tôi giỏi đàm phán và thương lượng', 'E', 'activities'),
('Q045', 'Tôi thích cạnh tranh và thành công', 'E', 'personality'),
('Q046', 'Tôi có thể quản lý dự án hiệu quả', 'E', 'activities'),
('Q047', 'Tôi thích khởi nghiệp và làm chủ', 'E', 'interests'),
('Q048', 'Tôi giỏi thuyết trình trước đám đông', 'E', 'activities'),
('Q049', 'Tôi thích đưa ra quyết định quan trọng', 'E', 'interests'),
('Q050', 'Tôi có thể tổ chức và điều phối nhóm', 'E', 'activities'),

-- Conventional (C) - Nghiệp vụ/Tổ chức
('Q051', 'Tôi thích làm việc có tính hệ thống', 'C', 'interests'),
('Q052', 'Tôi giỏi quản lý tài liệu và hồ sơ', 'C', 'activities'),
('Q053', 'Tôi thích làm việc theo quy trình rõ ràng', 'C', 'interests'),
('Q054', 'Tôi có khả năng tính toán chính xác', 'C', 'activities'),
('Q055', 'Tôi thích công việc văn phòng', 'C', 'interests'),
('Q056', 'Tôi giỏi sắp xếp và phân loại', 'C', 'activities'),
('Q057', 'Tôi thích làm việc với số liệu', 'C', 'interests'),
('Q058', 'Tôi có thể làm việc chi tiết và tỉ mỉ', 'C', 'personality'),
('Q059', 'Tôi thích môi trường làm việc ổn định', 'C', 'interests'),
('Q060', 'Tôi giỏi sử dụng máy tính văn phòng', 'C', 'activities');

-- 2. Setup default user limits cho tài khoản có sẵn
-- Sử dụng user_id từ sample-data.sql (id=2 là customer@example.com)
INSERT INTO quiz_user_limits (user_id) 
SELECT id FROM users WHERE email = 'customer@example.com'
ON DUPLICATE KEY UPDATE user_id = user_id;

-- 3. Verify data đã insert thành công
SELECT 'Quiz questions inserted successfully!' as status;

SELECT 
    holland_code,
    COUNT(*) as question_count,
    COUNT(CASE WHEN category = 'interests' THEN 1 END) as interest_count,
    COUNT(CASE WHEN category = 'activities' THEN 1 END) as activity_count,
    COUNT(CASE WHEN category = 'personality' THEN 1 END) as personality_count,
    COUNT(CASE WHEN category = 'subjects' THEN 1 END) as subjects_count
FROM questions 
WHERE is_active = 1
GROUP BY holland_code
ORDER BY holland_code;

-- 4. Kiểm tra user setup
SELECT 
    u.id, 
    u.fullname, 
    u.email,
    CASE WHEN qul.user_id IS NOT NULL THEN 'Quiz limits created' ELSE 'No quiz limits' END as quiz_status
FROM users u
LEFT JOIN quiz_user_limits qul ON u.id = qul.user_id
WHERE u.email IN ('admin@pac.edu.vn', 'customer@example.com');

SELECT 'Sample quiz data setup complete!' as final_status;