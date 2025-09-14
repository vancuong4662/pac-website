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
3500000.00, 'course', NULL, 'active'),

('Khóa học Kỹ năng Phỏng vấn', 
'Khóa học trực tuyến về kỹ năng phỏng vấn xin việc hiệu quả.
Nội dung bao gồm:
- Chuẩn bị CV ấn tượng và thu hút HR
- Kỹ thuật trả lời phỏng vấn STAR method
- Thực hành mock interview với feedback
- Ngôn ngữ cơ thể và trang phục phỏng vấn
- Đàm phán lương và benefits
Thời gian: 20 giờ học | Hình thức: Online + Workshop', 
399000.00, 'course', NULL, 'active'),

('Khóa học Tư duy Phản biện', 
'Khóa học phát triển tư duy phản biện và giải quyết vấn đề sáng tạo.
Nội dung bao gồm:
- Nguyên lý tư duy phản biện cơ bản
- Kỹ năng phân tích và đánh giá thông tin
- Tìm kiếm giải pháp sáng tạo cho vấn đề
- Ứng dụng trong học tập và công việc
- Case study và thực hành thực tế
Thời gian: 25 giờ học | Áp dụng ngay được', 
599000.00, 'course', NULL, 'active'),

('Khóa học Public Speaking', 
'Khóa học kỹ năng thuyết trình và nói trước đám đông tự tin.
Nội dung bao gồm:
- Vượt qua nỗi sợ nói trước đám đông
- Kỹ thuật chuẩn bị và cấu trúc bài thuyết trình
- Ngôn ngữ cơ thể và giọng nói hiệu quả
- Sử dụng công cụ hỗ trợ (slides, props)
- Tương tác với khán giả và xử lý tình huống
Thời gian: 30 giờ học | Workshop thực hành', 
799000.00, 'course', NULL, 'active');

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
1000000.00, 'online_test', 'premium', 'active'),

('Test Trắc nghiệm Tính cách MBTI', 
'Bài test đánh giá 16 kiểu tính cách MBTI để hiểu rõ bản thân.
Nội dung đánh giá:
- 16 kiểu tính cách MBTI chi tiết
- Điểm mạnh và điểm yếu của từng type
- Nghề nghiệp phù hợp với tính cách
- Cách phát triển điểm mạnh và khắc phục điểm yếu
- Tương thích với các type khác
Thời gian: 80 câu hỏi / 45 phút | Báo cáo chi tiết', 
199000.00, 'online_test', NULL, 'active'),

('Test Đánh giá IQ', 
'Bài test đánh giá chỉ số thông minh IQ chuẩn quốc tế.
Nội dung đánh giá:
- Logic và suy luận toán học
- Khả năng nhận thức không gian
- Tư duy ngôn ngữ và từ vựng
- Trí nhớ và tập trung
- Tốc độ xử lý thông tin
Thời gian: 120 câu hỏi / 90 phút | Chuẩn IQ quốc tế', 
149000.00, 'online_test', NULL, 'active'),

('Test Định hướng Nghề nghiệp', 
'Bài test Holland Code (RIASEC) giúp tìm ngành nghề phù hợp.
Nội dung đánh giá:
- 6 nhóm nghề nghiệp RIASEC
- Sở thích và năng khiếu cá nhân
- Danh sách ngành nghề phù hợp
- Lộ trình phát triển sự nghiệp
- Môi trường làm việc lý tưởng
Thời gian: 60 câu hỏi / 30 phút | Kết quả ngay lập tức', 
299000.00, 'online_test', NULL, 'active'),

('Test Đánh giá EQ (Emotional Intelligence)', 
'Bài test đánh giá chỉ số thông minh cảm xúc và kỹ năng mềm.
Nội dung đánh giá:
- Nhận thức cảm xúc bản thân
- Kiểm soát cảm xúc
- Đồng cảm và hiểu người khác
- Kỹ năng giao tiếp xã hội
- Động lực và khả năng thích ứng
Thời gian: 70 câu hỏi / 40 phút | Báo cáo cải thiện EQ', 
249000.00, 'online_test', NULL, 'active');

-- Tư vấn (Consultations) - Giải pháp hướng nghiệp
INSERT INTO products (name, description, price, type, package_type, status) VALUES 
('Tư vấn Hướng nghiệp Cơ bản', 
'Buổi tư vấn hướng nghiệp cá nhân với chuyên gia PAC.
Chuyên gia: Nguyễn Văn An - 15 năm kinh nghiệm quản lý nhân sự
- Đánh giá năng lực, sở thích nghề nghiệp
- Phân tích điểm mạnh và điểm yếu
- Lập kế hoạch phát triển sự nghiệp ngắn hạn (6 tháng)
- Tư vấn về CV và kỹ năng phỏng vấn
Thời gian: 60 phút | Hình thức: Online hoặc Offline', 
299000.00, 'consultation', 'basic', 'active'),

('Tư vấn Hướng nghiệp Premium', 
'Gói tư vấn hướng nghiệp toàn diện với chuyên gia cao cấp.
Chuyên gia: Trần Thị Bình - Giám đốc HR tại tập đoàn đa quốc gia
- Test tính cách MBTI chuyên sâu
- Đánh giá năng lực 360 độ
- Xây dựng lộ trình sự nghiệp 3-5 năm
- Tư vấn theo dõi và hỗ trợ trong 3 tháng
- 2 buổi tư vấn (90 phút/buổi)
Hình thức: Online + Offline kết hợp', 
799000.00, 'consultation', 'premium', 'active'),

('Tư vấn Hướng nghiệp VIP', 
'Gói tư vấn hướng nghiệp cao cấp nhất với CEO PAC.
Chuyên gia: CEO Lê Văn Cường - 20 năm kinh nghiệm doanh nghiệp
- Đánh giá toàn diện 360 độ từ nhiều góc độ
- Xây dựng thương hiệu cá nhân (Personal Branding)
- Kết nối cơ hội việc làm và networking
- Mentoring và coaching cá nhân 6 tháng
- 4 buổi tư vấn (120 phút/buổi) + follow-up không giới hạn
Hình thức: Face-to-face + Online support', 
1999000.00, 'consultation', 'vip', 'active'),

('Tư vấn Chuyển ngành nghề', 
'Tư vấn chuyên biệt cho những người muốn chuyển đổi ngành nghề.
Chuyên gia: Phạm Thị Dung - Career Coach chuyên nghiệp
- Phân tích gap skills giữa ngành cũ và ngành mới
- Lộ trình transition chi tiết theo từng giai đoạn
- Kế hoạch học tập và phát triển kỹ năng
- Tư vấn cách thuyết phục nhà tuyển dụng
- Hỗ trợ viết CV và cover letter cho ngành mới
Thời gian: 90 phút | Follow-up 2 tháng', 
599000.00, 'consultation', 'premium', 'active'),

('Tư vấn Phát triển Leadership', 
'Tư vấn phát triển kỹ năng lãnh đạo cho manager và tiềm năng.
Chuyên gia: Hoàng Minh Tuấn - Executive Coach
- Đánh giá leadership style hiện tại
- Xây dựng kỹ năng quản lý đội nhóm
- Phát triển emotional intelligence
- Kỹ năng coaching và mentoring nhân viên
- Chiến lược xây dựng team hiệu quả
Thời gian: 90 phút | Bao gồm báo cáo đánh giá', 
899000.00, 'consultation', 'premium', 'active'),

('Tư vấn Khởi nghiệp', 
'Tư vấn cho người có ý định khởi nghiệp và phát triển kinh doanh.
Chuyên gia: Đỗ Thành Long - Serial Entrepreneur & Angel Investor
- Đánh giá tính khả thi của ý tưởng kinh doanh
- Xây dựng business model canvas
- Chiến lược marketing và sales cơ bản
- Tư vấn về tài chính khởi nghiệp
- Kết nối với mentor, nhà đầu tư trong hệ sinh thái
Thời gian: 120 phút | Bao gồm template và tools', 
1299000.00, 'consultation', 'vip', 'active');

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
