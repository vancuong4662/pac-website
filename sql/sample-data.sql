-- =====================================================
-- PAC Sample Data - Dữ liệu mẫu để vận hành ngay
-- =====================================================
-- 
-- HƯỚNG DẪN:
-- 1. Chạy file create-all-tables.sql trước
-- 2. Sau đó chạy file này để có dữ liệu mẫu
-- 3. File này có thể chạy nhiều lần (sẽ cập nhật dữ liệu)
--
-- =====================================================

-- =====================================================
-- PHẦN 1: TÀI KHOẢN ADMIN VÀ USER MẪU
-- =====================================================

-- Tài khoản admin mặc định
INSERT INTO users (fullname, email, username, password, role, status, email_verified, phone, address) 
VALUES 
('Administrator', 'admin@pacgroup.com', 'adminpac', '123456', 'admin', 'active', 1, '0901234567', 'Tầng 10, Tòa nhà PAC Group, Hà Nội'),
('Nguyễn Văn Demo', 'demo@pacgroup.com', 'democlient', '123456', 'user', 'active', 1, '0987654321', '123 Nguyễn Huệ, Q1, TP.HCM')
ON DUPLICATE KEY UPDATE 
    fullname = VALUES(fullname),
    phone = VALUES(phone),
    address = VALUES(address);

-- =====================================================
-- PHẦN 2: SẢN PHẨM MẪU
-- =====================================================

-- Xóa sản phẩm mẫu cũ (nếu có)
DELETE FROM products WHERE name LIKE '%Quản lý Dự án%' OR name LIKE '%Đánh giá năng lực%' OR name LIKE '%Tư vấn Phát triển%';

-- Khóa học
INSERT INTO products (name, description, price, type, package_type, status) VALUES 
('Khóa học Quản lý Dự án Cơ bản', 
'Khóa học cung cấp kiến thức nền tảng về quản lý dự án, phù hợp cho người mới bắt đầu. 
Nội dung bao gồm:
- Tổng quan về quản lý dự án
- Các giai đoạn của dự án
- Công cụ lập kế hoạch
- Quản lý rủi ro cơ bản
- Thực hành với case study thực tế
Thời gian: 40 giờ học | Hình thức: Online + Offline', 
2500000.00, 'course', NULL, 'active'),

('Khóa học Quản lý Dự án Nâng cao', 
'Khóa học chuyên sâu về quản lý dự án, dành cho những người đã có kinh nghiệm.
Nội dung bao gồm:
- Agile & Scrum methodology
- Quản lý stakeholder nâng cao
- Leadership trong dự án
- Quản lý tài chính dự án
- Chuẩn bị thi chứng chỉ PMP
Thời gian: 60 giờ học | Hình thức: Online + Offline', 
4500000.00, 'course', NULL, 'active'),

('Khóa học Agile & Scrum Master', 
'Khóa học về phương pháp Agile và chuẩn bị cho chứng chỉ Scrum Master.
Nội dung bao gồm:
- Nguyên lý và giá trị Agile
- Scrum framework chi tiết
- Vai trò của Scrum Master
- Sprint planning & retrospective
- Coaching và mentoring team
Thời gian: 32 giờ học | Có chứng chỉ PSM I', 
3500000.00, 'course', NULL, 'active');

-- Trắc nghiệm online
INSERT INTO products (name, description, price, type, package_type, status) VALUES 
('Đánh giá năng lực Quản lý - Gói Cơ bản', 
'Bài test đánh giá năng lực quản lý cơ bản phù hợp cho mọi đối tượng.
Nội dung đánh giá:
- Kỹ năng lãnh đạo cơ bản
- Quản lý thời gian
- Ra quyết định
- Giao tiếp và làm việc nhóm
Thời gian: 50 câu hỏi / 60 phút | Báo cáo kết quả chi tiết', 
500000.00, 'online_test', 'basic', 'active'),

('Đánh giá năng lực Quản lý - Gói Nâng cao', 
'Bài test đánh giá năng lực quản lý nâng cao với phân tích tâm lý học sâu.
Nội dung đánh giá:
- Leadership style assessment
- Emotional Intelligence (EQ)
- Strategic thinking
- Change management
- Conflict resolution
Thời gian: 100 câu hỏi / 90 phút | Báo cáo 20+ trang + Video giải thích', 
1000000.00, 'online_test', 'premium', 'active');

-- Tư vấn offline
INSERT INTO products (name, description, price, type, package_type, status) VALUES 
('Tư vấn Phát triển Sự nghiệp - Gói Cơ bản', 
'Buổi tư vấn 1-1 với chuyên gia về phát triển sự nghiệp cá nhân.
Chuyên gia: Nguyễn Văn An - 15 năm kinh nghiệm quản lý nhân sự
- Đánh giá hiện trạng sự nghiệp
- Xác định mục tiêu và định hướng
- Lập kế hoạch phát triển 6 tháng
- Tư vấn kỹ năng cần thiết
Thời gian: 60 phút | Hình thức: Online hoặc Offline', 
1500000.00, 'consultation', 'basic', 'active'),

('Tư vấn Phát triển Sự nghiệp - Gói Nâng cao', 
'Gói tư vấn toàn diện phát triển sự nghiệp với mentor cá nhân.
Chuyên gia: Trần Thị Bình - Giám đốc HR tại tập đoàn đa quốc gia
- 3 buổi tư vấn (90 phút/buổi) trong 3 tháng
- Đánh giá 360 độ với đồng nghiệp
- Kế hoạch phát triển cá nhân chi tiết
- Follow-up hàng tháng qua email/phone
- Giới thiệu cơ hội việc làm phù hợp
Hình thức: Online + Offline kết hợp', 
4000000.00, 'consultation', 'premium', 'active');

-- =====================================================
-- PHẦN 3: DỮ LIỆU MẪU CART VÀ ORDERS (CHO DEMO)
-- =====================================================

-- Thêm một số sản phẩm vào giỏ hàng của user demo (ID = 2)
INSERT INTO cart (user_id, product_id, quantity) 
SELECT 2, p.id, 1 
FROM products p 
WHERE p.name IN ('Khóa học Quản lý Dự án Cơ bản', 'Đánh giá năng lực Quản lý - Gói Cơ bản')
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

-- Tạo một đơn hàng mẫu đã hoàn thành
INSERT INTO orders (user_id, total_amount, status, payment_method, payment_status) 
VALUES (2, 3000000.00, 'completed', 'bank_transfer', 'paid');

-- Lấy ID của đơn hàng vừa tạo và thêm items
SET @order_id = LAST_INSERT_ID();

INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT @order_id, p.id, 1, p.price
FROM products p 
WHERE p.name = 'Khóa học Quản lý Dự án Cơ bản';

-- Tạo purchased course cho đơn hàng này
INSERT INTO purchased_courses (user_id, order_id, product_id, course_code, status, expires_at)
SELECT 2, @order_id, p.id, CONCAT('COURSE_', LPAD(p.id, 4, '0'), '_', DATE_FORMAT(NOW(), '%Y%m%d')), 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR)
FROM products p 
WHERE p.name = 'Khóa học Quản lý Dự án Cơ bản';

-- =====================================================
-- THÔNG BÁO HOÀN THÀNH
-- =====================================================
SELECT 'Sample data inserted successfully!' as message,
       (SELECT COUNT(*) FROM users) as total_users,
       (SELECT COUNT(*) FROM products) as total_products,
       (SELECT COUNT(*) FROM orders) as total_orders;
