-- =====================================================
-- PAC Shopping Cart Database - Dữ liệu mẫu mới
-- Dựa trên tài liệu thực tế của PAC
-- =====================================================

-- Xóa dữ liệu cũ (nếu có)
DELETE FROM consultation_bookings;
DELETE FROM purchased_tests;
DELETE FROM purchased_courses;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart;
DELETE FROM product_packages;
DELETE FROM products;
DELETE FROM sessions;
DELETE FROM users;

-- Reset AUTO_INCREMENT
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE product_packages AUTO_INCREMENT = 1;
ALTER TABLE orders AUTO_INCREMENT = 1;

-- =====================================================
-- PHẦN 1: TẠO TÀI KHOẢN DEMO
-- =====================================================

-- Tài khoản admin
INSERT INTO users (fullname, email, username, password, phone, status, role, email_verified) VALUES
('Admin PAC', 'admin@pac.edu.vn', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0966013663', 'active', 'admin', 1);

-- Tài khoản khách hàng demo
INSERT INTO users (fullname, email, username, password, phone, status, role, email_verified) VALUES
('Nguyễn Văn A', 'customer@example.com', 'customer', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0901234567', 'active', 'user', 1);

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
    'Sample data updated with new PAC career guidance packages!' as message,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM product_packages) as total_packages,
    'Products: Test Hướng nghiệp + 3 Courses + CV/Interview + Career Expert Consultation' as products_summary,
    'Ready for testing!' as status;