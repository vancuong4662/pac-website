# Admin Tests Management System

## Tổng quan
Trang **Admin Tests** (`templates/admin/tests.html`) là trang quản lý bài trắc nghiệm Holland Code trong admin dashboard. Trang này cho phép admin xem, theo dõi và quản lý tất cả bài thi của người dùng.

## Cấu trúc Files

### 1. Frontend Files
- **HTML Template**: `templates/admin/tests.html`
- **JavaScript**: `assets/js/admin/tests.js`
- **CSS**: `assets/css/admin.css` (shared với các trang admin khác)
- **Component**: `components/admin/sidebar.html`

### 2. Backend API Files
- **Get All Exams**: `api/admin/quiz/get-all-exams.php`
- **Get Exam Detail**: `api/admin/quiz/get-exam-detail.php`
- **Delete Exam**: `api/admin/quiz/delete-exam.php`

### 3. Database Tables
- `quiz_exams` - Bảng chính lưu thông tin bài thi
- `quiz_results` - Bảng lưu kết quả đã tính toán
- `quiz_answers` - Bảng lưu chi tiết câu trả lời
- `users` - Bảng người dùng (JOIN để lấy thông tin user)

## Tính năng chính

### 1. Dashboard Statistics
Hiển thị 4 thẻ thống kê:
- **Tổng bài thi**: Tổng số bài thi trong hệ thống
- **Đã hoàn thành**: Số bài thi đã hoàn thành và có kết quả
- **Đang làm**: Số bài thi ở trạng thái draft (chưa hoàn thành)
- **Hôm nay**: Số bài thi được tạo trong ngày hôm nay

### 2. Filtering & Search
**Bộ lọc:**
- **Trạng thái**: 
  - Tất cả trạng thái
  - Hoàn thành
  - Chưa hoàn thành
  - Đang xử lý
- **Loại bài thi**:
  - Tất cả loại
  - Miễn phí (30 câu)
  - Trả phí (120 câu)
- **Tìm kiếm**: Tìm theo mã bài thi, tên người dùng, email, username

### 3. Exams Table
**Các cột hiển thị:**
- **Mã bài thi**: Exam code và ID
- **Người dùng**: Tên, email của người làm bài
- **Loại**: Badge màu (Miễn phí/Trả phí)
- **Trạng thái**: Badge với icon (Hoàn thành/Chưa xong/Đang xử lý)
- **Tiến độ**: Progress bar + số câu đã trả lời
- **Kết quả**: Điểm số và Holland Code (nếu có)
- **Thời gian**: Ngày tạo và thời gian làm bài
- **Thao tác**: Buttons (Xem chi tiết/Xem kết quả/Xóa)

### 4. Exam Detail Modal
**Thông tin hiển thị:**
- Thông tin bài thi (mã, loại, trạng thái, tiến độ, thời gian)
- Thông tin người dùng (ID, họ tên, email, username)
- Kết quả (nếu có): Điểm số, Holland Code, các điểm RIASEC
- Biểu đồ điểm số 6 nhóm Holland Code

### 5. Pagination
- Hiển thị 20 bài thi mỗi trang
- Previous/Next buttons
- Numbered page links
- Showing range info (Hiển thị X - Y trong tổng số Z)

### 6. Delete Functionality
- Confirmation modal trước khi xóa
- Xóa CASCADE: Xóa cả exam, answers, results, suggested jobs
- Log deletion action
- Toast notification

## API Endpoints

### 1. GET /api/admin/quiz/get-all-exams.php
**Mô tả**: Lấy danh sách tất cả bài thi với phân trang và filter

**Query Parameters**:
```
?page=1&limit=20&status=completed&type=0&search=keyword
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "exams": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "has_next": true,
      "has_prev": false,
      "limit": 20
    },
    "statistics": {
      "total": 100,
      "completed": 80,
      "draft": 15,
      "today": 5
    },
    "filters": {
      "status": "completed",
      "type": "0",
      "search": ""
    }
  }
}
```

### 2. GET /api/admin/quiz/get-exam-detail.php
**Mô tả**: Lấy chi tiết một bài thi cụ thể

**Query Parameters**:
```
?id=123
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": 123,
    "exam_code": "EX20251117_ABC123",
    "user_id": 45,
    "user_fullname": "Nguyen Van A",
    "user_email": "user@example.com",
    "exam_type": 0,
    "exam_status": 0,
    "total_questions": 30,
    "answered_questions": 30,
    "holland_code": "AEI",
    "total_score": 45,
    "score_r": 5,
    "score_i": 8,
    "score_a": 10,
    "score_s": 7,
    "score_e": 9,
    "score_c": 6,
    "answers": [...]
  }
}
```

### 3. POST /api/admin/quiz/delete-exam.php
**Mô tả**: Xóa một bài thi

**Request Body**:
```json
{
  "exam_id": 123
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "deleted_exam_id": 123,
    "exam_code": "EX20251117_ABC123"
  },
  "message": "Xóa bài thi thành công"
}
```

## Exam Status Flow

```
DRAFT (1) → COMPLETED (0) → Result Calculated
   ↓            ↓
TIMEOUT (2)  PROCESSING (0 but no result)
```

**Display Status**:
- `completed`: exam_status = 0 AND result exists
- `processing`: exam_status = 0 AND result NOT exists
- `draft`: exam_status = 1
- `timeout`: exam_status = 2

## Security

### Authentication
- Yêu cầu đăng nhập: `$_SESSION['user_id']` phải tồn tại
- Yêu cầu quyền admin: `$_SESSION['role'] === 'admin'`

### Authorization
- Chỉ admin mới có thể truy cập các API admin
- HTTP 401 nếu chưa đăng nhập
- HTTP 403 nếu không phải admin

### Data Protection
- Prepared statements để tránh SQL injection
- Input validation và sanitization
- Transaction support cho delete operations
- Error logging (không expose chi tiết lỗi cho client)

## Usage Examples

### Tìm kiếm bài thi theo email
```javascript
document.getElementById('search-input').value = 'user@example.com';
document.getElementById('apply-filters').click();
```

### Xem chi tiết bài thi
```javascript
adminTests.viewExamDetail(123);
```

### Xóa bài thi
```javascript
adminTests.confirmDelete(123);
// User confirms in modal
// adminTests.deleteExam() is called automatically
```

### Chuyển trang
```javascript
adminTests.goToPage(2);
```

## JavaScript Class Structure

### AdminTestsManager Class

**Properties**:
- `currentPage`: Trang hiện tại
- `limit`: Số items mỗi trang
- `filters`: Object chứa các filter
- `exams`: Array chứa dữ liệu exams
- `totalCount`: Tổng số exams
- `deleteExamId`: ID của exam chuẩn bị xóa

**Methods**:
- `init()`: Khởi tạo và load data
- `setupEventListeners()`: Setup các event listeners
- `loadExams()`: Load exams từ API
- `applyFilters()`: Áp dụng filters
- `renderExamsTable()`: Render bảng exams
- `renderExamRow(exam)`: Render một row
- `renderPagination(pagination)`: Render phân trang
- `viewExamDetail(examId)`: Xem chi tiết exam
- `renderExamDetail(exam)`: Render modal chi tiết
- `confirmDelete(examId)`: Hiện modal xác nhận xóa
- `deleteExam()`: Thực hiện xóa exam
- `getStatusBadge(status)`: Lấy HTML badge cho status
- `getTypeBadge(type)`: Lấy HTML badge cho type
- `goToPage(page)`: Chuyển trang
- `updateStatistics(stats)`: Cập nhật statistics cards
- `updateShowingInfo(pagination)`: Cập nhật showing info

## Customization

### Thay đổi số items mỗi trang
```javascript
// Trong constructor
this.limit = 50; // Thay vì 20
```

### Thêm filter mới
1. Thêm HTML select/input trong filter section
2. Update `applyFilters()` method
3. Update API để xử lý filter parameter

### Styling
- Sửa trong `assets/css/admin.css`
- Bootstrap classes được sử dụng rộng rãi
- Font Awesome icons

## Troubleshooting

### Không load được data
- Kiểm tra session (đã đăng nhập chưa)
- Kiểm tra role (có phải admin không)
- Xem Console log và Network tab
- Kiểm tra API response

### Delete không hoạt động
- Kiểm tra foreign key constraints
- Xem error log trên server
- Kiểm tra transaction rollback

### Pagination không đúng
- Kiểm tra totalCount từ API
- Verify logic tính toán totalPages
- Check current page state

## Best Practices

1. **Always use try-catch** trong async functions
2. **Show loading states** khi fetch data
3. **Validate user input** trước khi gửi API
4. **Use transactions** cho operations phức tạp
5. **Log important actions** (delete, update)
6. **Provide user feedback** (toast notifications)
7. **Handle errors gracefully** (user-friendly messages)

## Future Enhancements

- Export exams to CSV/Excel
- Bulk delete operations
- Advanced filtering (date range, score range)
- Chart/visualization for exam statistics
- Email notification to users when exam deleted
- Exam duplicate/clone functionality
- Reset exam (clear answers, allow retake)
- View detailed answer history
- Flag/review suspicious exams

## Related Documentation

- `docs/quiz-system.md` - Quiz system overview
- `docs/quiz-backend.md` - Quiz backend implementation
- `docs/admin-frontend.md` - Admin frontend structure
- `sql/create-all-tables.sql` - Database schema
