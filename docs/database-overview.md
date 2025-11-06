# PAC Shopping Cart Database - Tổng quan hệ thống

## Giới thiệu

Database PAC Shopping Cart được thiết kế để hỗ trợ hệ thống bán hàng trực tuyến của PAC (Psychological Assessment Center), chuyên cung cấp các dịch vụ đánh giá tâm lý, khóa học và tư vấn hướng nghiệp.

## Thông tin kỹ thuật

- **Database Engine**: MariaDB/MySQL
- **Charset**: utf8mb4_unicode_ci
- **Storage Engine**: InnoDB
- **Foreign Key**: Có hỗ trợ CASCADE DELETE

## Cấu trúc tổng quan

Database gồm **19 bảng chính** được chia thành 4 nhóm chức năng:

### 1. Nhóm Authentication & Users (2 bảng)
- `users` - Quản lý tài khoản người dùng
- `sessions` - Quản lý phiên đăng nhập

### 2. Nhóm Holland Code Assessment & Quiz System (10 bảng)
- `questions` - Câu hỏi trắc nghiệm Holland Code
- `jobs` - Master data nghề nghiệp từ old project (**MỚI**)
- `quiz_exams` - Quản lý bài thi với random questions (**MỚI**)
- `quiz_answers` - Chi tiết câu trả lời trong bài thi (**MỚI**)
- `quiz_results` - Kết quả Holland Code được tính toán (**MỚI**)
- `quiz_suggested_jobs` - Nghề nghiệp gợi ý theo hệ thống sao (**MỚI**)
- `quiz_fraud_logs` - Log phát hiện gian lận (**MỚI**)
- `quiz_user_limits` - Giới hạn và khóa user (**MỚI**)
- `test_results` - Kết quả làm bài test tổng quan (legacy)
- `test_answers` - Chi tiết câu trả lời từng test (legacy)

### 3. Nhóm Products & Shopping (5 bảng)
- `products` - Sản phẩm chính (tests, courses, consultations)
- `product_packages` - Các gói giá cho mỗi sản phẩm
- `cart` - Giỏ hàng người dùng
- `orders` - Đơn hàng và thanh toán
- `order_items` - Chi tiết sản phẩm trong đơn hàng

### 4. Nhóm Payment & Purchased Services (2 bảng)
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

### 3. Bảng `questions` - Câu hỏi Holland Code Assessment

**Mục đích**: Lưu trữ câu hỏi trắc nghiệm Holland Code để đánh giá hướng nghiệp, migration từ hệ thống cũ MongoDB.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT(11) AUTO_INCREMENT | Khóa chính |
| `question_id` | VARCHAR(10) UNIQUE | ID gốc từ dữ liệu cũ (1, 2, 3...) |
| `question_text` | TEXT | Nội dung câu hỏi |
| `holland_code` | ENUM('R','I','A','S','E','C') | Mã Holland Code |
| `category` | ENUM | 'personality', 'interests', 'activities', 'subjects' |
| `difficulty_level` | ENUM | 'easy', 'medium', 'hard' |
| `sort_order` | INT(11) | Thứ tự hiển thị câu hỏi |
| `is_active` | TINYINT(1) | Trạng thái kích hoạt |

**Holland Code mapping**:
- **R** = Realistic (Thực tế)
- **I** = Investigative (Nghiên cứu) 
- **A** = Artistic (Nghệ thuật)
- **S** = Social (Xã hội)
- **E** = Enterprising (Doanh nghiệp)
- **C** = Conventional (Truyền thống)

**Tính năng đặc biệt**:
- Migration data từ MongoDB questions.json
- Phân loại câu hỏi theo category để quản lý tốt hơn
- Support múi đổi independent question ordering
- Full-text search ready cho nội dung câu hỏi

---

### 3.5. Bảng `jobs` - Master data nghề nghiệp (**MỚI**)

**Mục đích**: Lưu trữ 200 nghề nghiệp được migrate từ old project để phục vụ hệ thống gợi ý nghề nghiệp với thuật toán sophisticated.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT AUTO_INCREMENT | Khóa chính (primary key duy nhất) |
| `job_name` | VARCHAR(255) | Tên nghề nghiệp tiếng Việt |
| `job_name_en` | VARCHAR(255) | Tên nghề tiếng Anh (để mở rộng) |
| `holland_code` | VARCHAR(3) | **Mã Holland Code** (VD: AEI, IAR, CSR) - dùng cho thuật toán |
| `job_group` | VARCHAR(100) | Nhóm nghề (VD: "Ngôn ngữ", "Khoa học") |
| `activities_code` | VARCHAR(255) | Mã hoạt động công việc |
| `capacity` | VARCHAR(255) | Năng lực yêu cầu |
| `essential_ability` | VARCHAR(255) | Năng lực cần thiết chính |
| `supplementary_ability` | VARCHAR(255) | Năng lực bổ sung |
| `education_level` | TINYINT | Cấp độ học vấn (1-5) |
| `work_environment` | VARCHAR(255) | Môi trường làm việc |
| `work_style` | VARCHAR(255) | Phong cách làm việc |
| `work_value` | VARCHAR(100) | Giá trị công việc |
| `job_description` | TEXT | Mô tả chi tiết nghề nghiệp |
| `specializations` | JSON | Các chuyên môn con (expertise) |
| `main_tasks` | JSON | Nhiệm vụ chính (mission) |
| `work_areas` | JSON | Nơi làm việc (workArea) |
| `icon_url` | VARCHAR(500) | URL icon Holland Code |
| `is_active` | BOOLEAN | Trạng thái kích hoạt |
| `sort_order` | INT | Thứ tự sắp xếp |

**Migration từ old project**:
```typescript
// Old TypeScript format (suggestJobs.ts)
{
  code: '2656',
  name: 'Phát thanh viên, biên tập viên truyền thông',
  hollandCode: 'AEI',
  group: 'Ngôn ngữ',
  description: 'Phát thanh viên trên đài phát thanh...',
  expertise: ['Phát thanh viên thời sự', 'Phát thanh viên thể thao'],
  mission: ['Đọc bản tin và các thông báo khác...'],
  workArea: ['Đài phát thanh và truyền hình'],
  educationLevel: 3,
  // ... other fields
}
```

**Tính năng đặc biệt**:
- **200 Jobs**: Comprehensive database từ old project sophisticated algorithm
- **Holland Code Matching**: Hỗ trợ permutation algorithm cho gợi ý nghề nghiệp  
- **Structured Data**: JSON fields cho specializations, tasks, work areas
- **Full-text Search**: Index cho job_name và job_description
- **Migration Ready**: Direct migration từ TypeScript constants

---

### 4. Bảng `test_results` - Kết quả làm bài test Holland Code

**Mục đích**: Lưu trữ kết quả tổng quan của bài test Holland Code, migration từ hệ thống cũ MongoDB results.json.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT(11) AUTO_INCREMENT | Khóa chính |
| `result_id` | VARCHAR(50) UNIQUE | ID gốc từ MongoDB _id |
| `user_id` | INT(11) | ID người dùng làm bài (FK) |
| `exam_type` | TINYINT(1) | Loại bài thi: 0=ngắn, 1=đầy đủ |
| `exam_status` | TINYINT(1) | Trạng thái: 0=hoàn thành, 1=đang làm, 2=hủy |
| `total_questions` | INT(11) | Tổng số câu hỏi |
| `answered_questions` | INT(11) | Số câu đã trả lời |
| `total_score` | INT(11) | Tổng điểm |
| `total_time_minutes` | INT(11) | Tổng thời gian làm bài (phút) |
| `r_score`, `i_score`, `a_score` | INT(11) | Điểm theo 6 nhóm Holland Code |
| `s_score`, `e_score`, `c_score` | INT(11) | (Realistic, Investigative, Artistic, Social, Enterprising, Conventional) |
| `primary_code` | VARCHAR(10) | Mã Holland Code chính (điểm cao nhất) |
| `holland_code_result` | VARCHAR(20) | Kết quả tổng hợp (ví dụ: ASE) |
| `personality_type` | VARCHAR(100) | Loại tính cách được phân tích |
| `exam_start_time` | INT(11) | Unix timestamp bắt đầu làm bài |
| `exam_end_time` | INT(11) | Unix timestamp kết thúc dự kiến |
| `exam_stop_time` | INT(11) | Unix timestamp hoàn thành thực tế |
| `sent_email` | TINYINT(1) | Đã gửi email báo cáo |
| `report_generated` | TINYINT(1) | Đã tạo báo cáo |
| `report_url` | VARCHAR(500) | Link báo cáo PDF |

**Tính năng đặc biệt**:
- **Holland Code Scoring**: Tự động tính điểm cho 6 nhóm tính cách
- **Report Generation**: Tích hợp tạo báo cáo PDF và gửi email
- **Time Tracking**: Theo dõi chi tiết thời gian làm bài
- **Migration Ready**: Tương thích với dữ liệu MongoDB cũ

---

### 5. Bảng `test_answers` - Chi tiết câu trả lời

**Mục đích**: Lưu trữ từng câu trả lời của user trong bài test, được tối ưu hóa theo thiết kế normalized.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT(11) AUTO_INCREMENT | Khóa chính |
| `test_result_id` | INT(11) | ID kết quả test (FK đến test_results) |
| `question_id` | VARCHAR(10) | ID câu hỏi (FK đến questions.question_id) |
| `chosen_answer` | TINYINT(1) | Đáp án chọn: 0=Không đồng ý, 1=Trung lập, 2=Đồng ý |
| `answer_time` | INT(11) | Unix timestamp thời điểm trả lời |
| `time_spent` | INT(11) | Thời gian suy nghĩ (giây) |

**Thiết kế tối ưu**:
- **Normalized Structure**: Không lưu trùng question text, code - chỉ reference question_id
- **Efficient Storage**: Giảm dung lượng database so với cách lưu trữ cũ
- **Query Performance**: Có thể JOIN với questions để lấy thông tin câu hỏi
- **Unique Constraint**: Mỗi test chỉ có 1 đáp án cho 1 câu hỏi

**So sánh với cấu trúc cũ**:
```json
// Cũ (MongoDB): Lưu trùng dữ liệu
{
  "question": "62d766364ccd11297044bf87",
  "chooseAnswer": 1,
  "timeAnswer": 1664959879,
  "label": "Bạn có phải là người giỏi thể thao", // ❌ Trùng lặp
  "id": "159",
  "code": "R" // ❌ Trùng lặp
}

// Mới (MySQL): Tối ưu hóa
{
  "test_result_id": 1,
  "question_id": "159", // ✅ Chỉ reference
  "chosen_answer": 1,
  "answer_time": 1664959879
}
```

---

## Hệ thống Quiz mới (6 bảng)

### 6. Bảng `quiz_exams` - Quản lý bài thi Holland Code (**MỚI**)

**Mục đích**: Quản lý các bài thi Holland Code với random questions selection, thay thế cách tiếp cận cũ từ MongoDB.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT PRIMARY KEY | Khóa chính |
| `exam_code` | VARCHAR(20) UNIQUE | Mã bài thi unique (EX20251101_ABC123) |
| `user_id` | INT | FK đến users.id |
| `exam_type` | TINYINT | 0=Free(30 câu), 1=Paid(120 câu) |
| `exam_status` | TINYINT | 0=Completed, 1=InProgress, 2=Timeout, 3=Cancelled |
| `total_questions` | INT | Tổng số câu hỏi trong bài thi |
| `answered_questions` | INT | Số câu đã trả lời |
| `start_time` | TIMESTAMP | Thời gian bắt đầu |
| `end_time` | TIMESTAMP | Thời gian kết thúc |
| `time_limit` | INT | Thời gian giới hạn (phút) |
| `actual_time_spent` | INT | Thời gian thực tế (giây) |
| `ip_address` | VARCHAR(45) | IP tracking |
| `user_agent` | TEXT | Browser tracking |

**Tính năng đặc biệt**:
- **Random Question Selection**: Mỗi bài thi chọn random câu hỏi theo quy tắc (5 câu/nhóm cho FREE, 20 câu/nhóm cho PAID)
- **Time Management**: Theo dõi thời gian làm bài chính xác
- **Status Tracking**: Quản lý trạng thái bài thi real-time
- **Security**: IP và User Agent tracking

---

### 7. Bảng `quiz_answers` - Chi tiết câu trả lời trong bài thi (**MỚI**)

**Mục đích**: Lưu trữ từng câu trả lời trong quiz với Holland Code fixed choices (0,1,2).

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT PRIMARY KEY | Khóa chính |
| `exam_id` | INT | FK đến quiz_exams.id |
| `question_id` | VARCHAR(10) | FK đến questions.question_id |
| `user_answer` | TINYINT | -1=Chưa trả lời, 0=Không đồng ý, 1=Bình thường, 2=Đồng ý |
| `answer_time` | TIMESTAMP | Thời điểm trả lời |
| `time_spent` | INT | Thời gian suy nghĩ (giây) |
| `is_changed` | BOOLEAN | Có thay đổi câu trả lời |
| `change_count` | INT | Số lần thay đổi |

**Khác biệt với traditional quiz**:
- **Fixed Choices**: Tất cả câu hỏi đều có 3 lựa chọn cố định (0,1,2)
- **Point-based Scoring**: Không phải đúng/sai, mà là điểm số
- **Real-time Updates**: Câu trả lời được save ngay khi user chọn

---

### 8. Bảng `quiz_results` - Kết quả Holland Code được tính toán (**MỚI**)

**Mục đích**: Lưu trữ kết quả Holland Code với 6 điểm số và phân tích nghề nghiệp.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT PRIMARY KEY | Khóa chính |
| `exam_id` | INT UNIQUE | FK đến quiz_exams.id |
| `user_id` | INT | FK đến users.id |
| `score_r`, `score_i`, `score_a` | INT | Điểm số 6 nhóm Holland |
| `score_s`, `score_e`, `score_c` | INT | (R,I,A,S,E,C) |
| `total_score` | INT | Tổng điểm |
| `holland_code` | VARCHAR(3) | Mã Holland 3 ký tự (VD: AEI, RIC) |
| `primary_group` | CHAR(1) | Nhóm chính (điểm cao nhất) |
| `secondary_group` | CHAR(1) | Nhóm phụ (điểm cao thứ 2) |
| `tertiary_group` | CHAR(1) | Nhóm thứ 3 |
| `characteristics_code` | VARCHAR(2) | Đặc trưng công việc (từ 2 ký tự đầu) |
| `work_activities` | JSON | Hoạt động công việc |
| `work_values` | JSON | Top 3 giá trị làm việc |
| `calculation_time` | FLOAT | Thời gian tính toán (milliseconds) |
| `has_fraud_flags` | BOOLEAN | Có cờ gian lận |
| `fraud_details` | JSON | Chi tiết gian lận |

**Algorithm highlights**:
- **Holland Code Generation**: Top 3 nhóm cao nhất → "AEI"
- **Job Matching**: Chuẩn bị data cho suggested jobs
- **Work Analysis**: Phân tích đặc trưng và giá trị công việc

---

### 9. Bảng `quiz_suggested_jobs` - Nghề nghiệp gợi ý theo hệ thống sao (**MỚI**)

**Mục đích**: Lưu trữ các nghề nghiệp gợi ý với hệ thống rating từ 2-5 sao dựa trên Holland Code.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT PRIMARY KEY | Khóa chính |
| `result_id` | INT | FK đến quiz_results.id |
| `job_code` | VARCHAR(20) | Mã nghề nghiệp |
| `job_name` | VARCHAR(255) | Tên nghề tiếng Việt |
| `job_name_en` | VARCHAR(255) | Tên nghề tiếng Anh |
| `holland_code` | VARCHAR(3) | Holland Code của nghề |
| `star_rating` | TINYINT | Mức độ phù hợp (2-5 sao) |
| `match_type` | ENUM | 'exact', 'permutation', 'two_char', 'single_char' |
| `match_score` | DECIMAL(5,2) | Điểm khớp % |
| `job_group` | VARCHAR(100) | Nhóm nghề |
| `essential_ability` | VARCHAR(255) | Khả năng cốt lõi cần thiết |
| `work_environment` | VARCHAR(255) | Môi trường làm việc |
| `education_level` | VARCHAR(100) | Trình độ học vấn |
| `job_description` | TEXT | Mô tả công việc |
| `work_areas` | JSON | Nơi làm việc |
| `main_tasks` | JSON | Nhiệm vụ chính |
| `is_highlighted` | BOOLEAN | Nghề được highlight |

**Hệ thống sao algorithm**:
- **5 sao**: Exact match Holland Code (VD: AEI = AEI)
- **4 sao**: Permutation match (VD: AEI = AIE, EAI, EIA, IEA, IAE)
- **3 sao**: Two-char match (VD: AEI = AE, AI, EI, EA, IA, IE)
- **2 sao**: Single-char match (VD: AEI = A, E, I)

---

### 10. Bảng `quiz_fraud_logs` - Log phát hiện gian lận (**MỚI**)

**Mục đích**: Ghi lại các trường hợp phát hiện gian lận trong quiz và hành động xử lý.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT PRIMARY KEY | Khóa chính |
| `user_id` | INT | FK đến users.id |
| `exam_id` | INT | FK đến quiz_exams.id |
| `fraud_type` | ENUM | 'same_answers', 'insufficient_yes', 'time_too_fast', 'suspicious_pattern', 'other' |
| `severity` | ENUM | 'low', 'medium', 'high', 'critical' |
| `detection_details` | JSON | Chi tiết phát hiện |
| `action_taken` | ENUM | 'warning', 'reset_exam', 'lock_12h', 'lock_24h', 'revoke_access', 'none' |
| `admin_reviewed` | BOOLEAN | Đã được admin review |
| `admin_notes` | TEXT | Ghi chú của admin |
| `ip_address` | VARCHAR(45) | IP tracking |

**Anti-fraud mechanisms**:
- **Same Answers Detection**: Phát hiện tất cả câu trả lời giống nhau
- **Yes Ratio Check**: Kiểm tra tỷ lệ câu "Đồng ý" >= 1/6
- **Time Analysis**: Phát hiện làm bài quá nhanh hoặc quá chậm
- **Progressive Punishment**: Từ warning → reset → lock → revoke

---

### 11. Bảng `quiz_user_limits` - Giới hạn và khóa user (**MỚI**)

**Mục đích**: Quản lý giới hạn làm bài và trạng thái khóa của user cho quiz system.

| Trường | Kiểu dữ liệu | Mô tả |
|--------|--------------|-------|
| `id` | INT PRIMARY KEY | Khóa chính |
| `user_id` | INT UNIQUE | FK đến users.id |
| `free_exam_count` | INT | Số lần làm bài miễn phí |
| `free_exam_violations` | INT | Số lần vi phạm free |
| `last_free_exam` | TIMESTAMP | Lần cuối làm bài free |
| `paid_exam_count` | INT | Số lần làm bài có phí |
| `paid_exam_violations` | INT | Số lần vi phạm paid |
| `last_paid_exam` | TIMESTAMP | Lần cuối làm bài paid |
| `lock_until` | TIMESTAMP | Khóa đến thời điểm |
| `lock_reason` | VARCHAR(255) | Lý do khóa |
| `is_permanently_locked` | BOOLEAN | Khóa vĩnh viễn |
| `access_revoked` | BOOLEAN | Thu hồi quyền truy cập |
| `revoke_reason` | TEXT | Lý do thu hồi |
| `admin_notes` | TEXT | Ghi chú admin |

**Business rules**:
- **Free exam**: Tối đa 2 lần vi phạm → khóa 12h
- **Paid exam**: Tối đa 3 lần vi phạm → thu hồi quyền
- **Cooldown**: 12h giữa các lần làm bài miễn phí
- **Admin override**: Admin có thể reset limits

---

### Migration từ hệ thống cũ

**Quiz System cũ (MongoDB)**:
```javascript
// Collection: results
{
  "_id": ObjectId,
  "user": ObjectId,
  "examType": 0|1,
  "questions": [
    {
      "question": ObjectId,
      "chooseAnswer": 0|1|2,
      "timeAnswer": Number,
      "label": "Text câu hỏi", // ❌ Trùng lặp
      "id": "159",
      "code": "R" // ❌ Trùng lặp
    }
  ],
  "tendencies": [
    {"label": "Kỹ thuật", "code": "R", "point": 15}
  ],
  "hollandCode": "AEI"
}
```

**Quiz System mới (MySQL)**:
```sql
-- Phân tách normalized
quiz_exams: Quản lý bài thi
quiz_answers: Chi tiết câu trả lời (không trùng lặp)
quiz_results: Kết quả Holland Code
quiz_suggested_jobs: Nghề gợi ý với star rating
quiz_fraud_logs: Log gian lận
quiz_user_limits: Giới hạn user
```

**Lợi ích**:
- ✅ **Normalized**: Không trùng lặp dữ liệu
- ✅ **Performance**: Indexes tối ưu cho queries
- ✅ **Scalable**: Dễ mở rộng và maintain
- ✅ **Security**: Anti-fraud mechanisms
- ✅ **Flexible**: Random question selection
- ✅ **Audit**: Comprehensive logging

---

### 12. Bảng `products` - Sản phẩm chính

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

### 13. Bảng `product_packages` - Gói giá sản phẩm

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

### 14. Bảng `shopping_cart` - Giỏ hàng

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

### 15. Bảng `orders` - Đơn hàng

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

### 16. Bảng `order_items` - Chi tiết đơn hàng

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

### 17. Bảng `vnpay_transactions` - Giao dịch VNPay

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

### 18. Bảng `purchased_packages` - Packages đã mua (Unified Table)

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
users (1) ──── (n) test_results (legacy)
users (1) ──── (n) quiz_exams (new)
users (1) ──── (n) quiz_results (new)
users (1) ──── (n) quiz_fraud_logs (new)
users (1) ──── (1) quiz_user_limits (new)

questions (standalone table for Holland Code Assessment)
questions (1) ──── (n) test_answers (via question_id, legacy)
questions (1) ──── (n) quiz_answers (via question_id, new)

jobs (standalone master data table for career suggestions)
jobs (1) ──── (n) quiz_suggested_jobs (via job_code for matching)

-- Legacy Holland Code system
test_results (1) ──── (n) test_answers

-- New Quiz system  
quiz_exams (1) ──── (n) quiz_answers
quiz_exams (1) ──── (1) quiz_results
quiz_results (1) ──── (n) quiz_suggested_jobs

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
- **Questions**: holland_code, category, is_active, sort_order, difficulty_level
- **Jobs** (**MỚI**): holland_code, job_group, education_level, is_active, fulltext (job_name, job_description)
- **Quiz Exams** (**MỚI**): user_status (user_id, exam_status), exam_code, created
- **Quiz Answers** (**MỚI**): exam_id, answer_status (exam_id, user_answer), unique constraint (exam_id, question_id)
- **Quiz Results** (**MỚI**): user_holland (user_id, holland_code), holland_code, primary_group, created
- **Quiz Suggested Jobs** (**MỚI**): result_star (result_id, star_rating DESC, sort_order), job_code, fulltext (job_name, job_description)
- **Quiz Fraud Logs** (**MỚI**): user_fraud (user_id, fraud_type), severity (severity, created_at), created
- **Quiz User Limits** (**MỚI**): user_id, lock_status (lock_until, access_revoked)
- **Test Results** (legacy): result_id, user_id, exam_type, exam_status, primary_code, exam_start_time, sent_email
- **Test Answers** (legacy): test_result_id, question_id, chosen_answer, answer_time, unique constraint (test_result_id, question_id)
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
SELECT COUNT(*) FROM questions;
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM test_results;
SELECT COUNT(*) FROM test_answers;
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