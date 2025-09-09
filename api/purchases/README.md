# Purchases API Documentation

API để quản lý và lấy thông tin sản phẩm đã mua của người dùng.

## 📁 File Structure

```
api/purchases/
├── all.php          # Lấy tất cả sản phẩm đã mua
├── courses.php      # Lấy khóa học đã mua
├── tests.php        # Lấy trắc nghiệm đã mua
├── consultations.php # Lấy tư vấn đã đặt
├── test.html        # Test interface
└── README.md        # Documentation
```

## 🔐 Authentication

Tất cả API endpoints đều yêu cầu authentication. User phải đăng nhập trước khi sử dụng.

**Required Headers:**
- Session-based authentication (cookies)

## 📋 API Endpoints

### 1. GET /api/purchases/all.php

Lấy tất cả sản phẩm đã mua của user hiện tại.

**Response:**
```json
{
  "success": true,
  "data": {
    "all_purchases": [
      {
        "type": "course",
        "id": 1,
        "access_code": "COURSE_ABC123",
        "status": "active",
        "expires_at": null,
        "created_at": "2024-01-15 10:30:00",
        "product_name": "Khóa học PHP Web Development",
        "product_description": "Khóa học phát triển web với PHP từ cơ bản đến nâng cao",
        "product_price": "2000000.00",
        "order_code": "ORD_20240115_001",
        "order_date": "2024-01-15 10:25:00",
        "type_display": "Khóa học",
        "access_url": "/course/COURSE_ABC123",
        "created_at_formatted": "15/01/2024 10:30",
        "order_date_formatted": "15/01/2024 10:25",
        "is_expired": false,
        "is_available": true
      }
    ],
    "grouped": {
      "courses": [...],
      "tests": [...],
      "consultations": [...]
    },
    "summary": {
      "total_purchases": 5,
      "total_courses": 2,
      "total_tests": 2,
      "total_consultations": 1
    }
  }
}
```

### 2. GET /api/purchases/courses.php

Lấy danh sách khóa học đã mua.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "course_code": "COURSE_ABC123",
      "status": "active",
      "expires_at": null,
      "created_at": "2024-01-15 10:30:00",
      "product_name": "Khóa học PHP Web Development",
      "product_description": "Khóa học phát triển web với PHP từ cơ bản đến nâng cao",
      "product_price": "2000000.00",
      "order_code": "ORD_20240115_001",
      "order_date": "2024-01-15 10:25:00",
      "created_at_formatted": "15/01/2024 10:30",
      "order_date_formatted": "15/01/2024 10:25",
      "expires_at_formatted": null,
      "is_expired": false,
      "is_available": true
    }
  ],
  "total": 1
}
```

### 3. GET /api/purchases/tests.php

Lấy danh sách trắc nghiệm đã mua.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "test_token": "TEST_TOKEN_XYZ789",
      "attempts_left": 1,
      "status": "active",
      "expires_at": "2024-02-15 23:59:59",
      "created_at": "2024-01-15 11:00:00",
      "product_name": "Trắc nghiệm đánh giá năng lực",
      "product_description": "Bài trắc nghiệm đánh giá năng lực toàn diện",
      "product_price": "500000.00",
      "package_type": "premium",
      "order_code": "ORD_20240115_002",
      "order_date": "2024-01-15 10:55:00",
      "created_at_formatted": "15/01/2024 11:00",
      "order_date_formatted": "15/01/2024 10:55",
      "expires_at_formatted": "15/02/2024 23:59",
      "is_expired": false,
      "is_available": true,
      "package_display": "Gói cao cấp"
    }
  ],
  "total": 1
}
```

### 4. GET /api/purchases/consultations.php

Lấy danh sách tư vấn đã đặt.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "consultation_code": "CONSULT_DEF456",
      "status": "scheduled",
      "scheduled_at": "2024-01-20 14:00:00",
      "expert_id": 1,
      "notes": null,
      "created_at": "2024-01-15 11:30:00",
      "product_name": "Tư vấn chuyên sâu",
      "product_description": "Tư vấn 1-1 với chuyên gia trong 60 phút",
      "product_price": "1000000.00",
      "package_type": "premium",
      "order_code": "ORD_20240115_003",
      "order_date": "2024-01-15 11:25:00",
      "expert_name": "Dr. Nguyễn Văn A",
      "expert_email": "expert1@example.com",
      "expert_phone": "0901234567",
      "expert_specialty": "Tâm lý học",
      "created_at_formatted": "15/01/2024 11:30",
      "order_date_formatted": "15/01/2024 11:25",
      "scheduled_at_formatted": "20/01/2024 14:00",
      "is_past_schedule": false,
      "status_display": "Đã xếp lịch",
      "package_display": "Gói cao cấp",
      "can_reschedule": true,
      "can_cancel": true
    }
  ],
  "total": 1
}
```

## 📊 Data Fields Explanation

### Common Fields (All Purchase Types)

- `id`: ID duy nhất của purchase record
- `status`: Trạng thái (active, used, expired, completed, cancelled)
- `created_at`: Thời gian tạo purchase
- `product_name`: Tên sản phẩm
- `product_description`: Mô tả sản phẩm
- `product_price`: Giá sản phẩm
- `order_code`: Mã đơn hàng
- `order_date`: Ngày đặt hàng
- `is_available`: Có thể sử dụng hay không
- `*_formatted`: Các field đã format để hiển thị

### Course-Specific Fields

- `course_code`: Mã khóa học duy nhất để truy cập
- `expires_at`: Thời gian hết hạn (null nếu không có)
- `is_expired`: Đã hết hạn hay chưa

### Test-Specific Fields

- `test_token`: Token để truy cập trắc nghiệm
- `attempts_left`: Số lần làm bài còn lại
- `package_type`: Loại gói (basic, premium)
- `package_display`: Tên hiển thị của gói

### Consultation-Specific Fields

- `consultation_code`: Mã tư vấn duy nhất
- `scheduled_at`: Thời gian đã đặt lịch
- `expert_*`: Thông tin chuyên gia phụ trách
- `notes`: Ghi chú
- `status_display`: Trạng thái hiển thị (Vietnamese)
- `can_reschedule`: Có thể đổi lịch hay không
- `can_cancel`: Có thể hủy hay không
- `is_past_schedule`: Đã qua lịch hẹn hay chưa

## 🚨 Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Lỗi server: [error details]"
}
```

## 🧪 Testing

1. Mở file `test.html` trong browser
2. Đăng nhập với tài khoản test:
   - Email: `john@example.com`
   - Password: `password123`
3. Test các API endpoints bằng các button trong interface
4. Kiểm tra response data và UI hiển thị

## 📋 Usage Examples

### JavaScript Fetch Examples

```javascript
// Lấy tất cả sản phẩm đã mua
const response = await fetch('/pac-new/api/purchases/all.php');
const data = await response.json();

if (data.success) {
    console.log('Summary:', data.data.summary);
    console.log('All purchases:', data.data.all_purchases);
    console.log('Grouped:', data.data.grouped);
}

// Lấy chỉ khóa học
const coursesResponse = await fetch('/pac-new/api/purchases/courses.php');
const coursesData = await coursesResponse.json();

// Lấy chỉ trắc nghiệm
const testsResponse = await fetch('/pac-new/api/purchases/tests.php');
const testsData = await testsResponse.json();

// Lấy chỉ tư vấn
const consultationsResponse = await fetch('/pac-new/api/purchases/consultations.php');
const consultationsData = await consultationsResponse.json();
```

## 🔄 Integration Notes

1. **Frontend Integration**: Sử dụng API này để hiển thị trang "Sản phẩm đã mua" của user
2. **Access Control**: Đảm bảo user chỉ thấy sản phẩm của chính họ
3. **Status Management**: Xử lý các trạng thái khác nhau của sản phẩm (active, expired, completed)
4. **Token/Code Usage**: Sử dụng `access_code`/`test_token`/`consultation_code` để truy cập sản phẩm thực tế
5. **Expiration Handling**: Kiểm tra `is_expired` và `is_available` trước khi cho phép truy cập

## 🔗 Related APIs

- [Authentication API](../auth/README.md) - Đăng nhập/đăng ký
- [Orders API](../orders/README.md) - Tạo và quản lý đơn hàng
- [Products API](../products/README.md) - Danh sách sản phẩm
- [Cart API](../cart/README.md) - Giỏ hàng

## 📝 Next Steps

1. Implement frontend templates để hiển thị purchased items
2. Tạo các API để access purchased products (course access, test taking, consultation booking)
3. Implement notification system cho expired products
4. Tạo admin dashboard để quản lý purchased products
