# API Services - Tài liệu sử dụng

## Tổng quan

Thư mục này chứa các API endpoint để lấy thông tin về dịch vụ của PAC, bao gồm khóa học và các dịch vụ tư vấn.

## Cấu trúc API

### 1. `/api/services/list.php`
Lấy danh sách tất cả dịch vụ với khả năng lọc

**Parameters:**
- `type` (optional): `course`, `consultation`, hoặc `career_test`
- `category` (optional): Danh mục cụ thể
- `status` (optional): `active` hoặc `inactive` (mặc định: `active`)
- `include_packages` (optional): `true`/`false` (mặc định: `true`)

**Ví dụ sử dụng:**
```
GET /api/services/list.php
GET /api/services/list.php?type=course
GET /api/services/list.php?type=consultation&include_packages=true
```

### 2. `/api/services/detail.php`
Lấy chi tiết một dịch vụ cụ thể

**Parameters:**
- `slug` hoặc `id`: Định danh của sản phẩm
- `include_packages` (optional): `true`/`false` (mặc định: `true`)

**Ví dụ sử dụng:**
```
GET /api/services/detail.php?slug=test-huong-nghiep-pac
GET /api/services/detail.php?id=1
```

### 3. `/api/services/packages.php`
Lấy danh sách các gói của một dịch vụ

**Parameters:**
- `product_slug` hoặc `product_id`: Định danh sản phẩm

**Ví dụ sử dụng:**
```
GET /api/services/packages.php?product_slug=viet-luan-tang-cuong
GET /api/services/packages.php?product_id=2
```

### 4. `/api/services/package-detail.php`
Lấy chi tiết một gói dịch vụ cụ thể

**Parameters:**
- `package_slug` hoặc `package_id`: Định danh gói
- `include_product` (optional): `true`/`false` (mặc định: `true`)

**Ví dụ sử dụng:**
```
GET /api/services/package-detail.php?package_slug=nhom-6
GET /api/services/package-detail.php?package_id=3
```

### 5. `/api/services/by-type.php`
Lấy dịch vụ theo loại cụ thể

**Parameters:**
- `type` (required): `course`, `consultation`, hoặc `career_test`
- `include_packages` (optional): `true`/`false` (mặc định: `true`)
- `limit` (optional): Giới hạn số lượng kết quả

**Ví dụ sử dụng:**
```
GET /api/services/by-type.php?type=course
GET /api/services/by-type.php?type=consultation&limit=5
```

## Cấu trúc dữ liệu trả về

### Product (Sản phẩm/Dịch vụ)
```json
{
  "id": 1,
  "name": "Tên sản phẩm",
  "slug": "ten-san-pham",
  "type": "course|consultation|career_test",
  "category": "danh_muc",
  "short_description": "Mô tả ngắn",
  "full_description": "Mô tả đầy đủ HTML",
  "duration": "16 giờ",
  "target_audience": ["Đối tượng 1", "Đối tượng 2"],
  "learning_outcomes": "Kết quả học tập HTML",
  "curriculum": "Chương trình học",
  "instructor_info": "Thông tin giảng viên",
  "teaching_format": "online|offline|both",
  "question_count": 120,
  "age_range": "14-22 tuổi",
  "image_url": "đường/dẫn/ảnh.jpg",
  "status": "active",
  "sort_order": 1,
  "packages": [...]
}
```

### Package (Gói dịch vụ)
```json
{
  "package_id": 1,
  "package_name": "Tên gói",
  "package_slug": "ten-goi",
  "package_description": "Mô tả HTML",
  "original_price": 1000000,
  "sale_price": 800000,
  "is_free": false,
  "group_size": "1 học viên",
  "special_features": ["Tính năng 1", "Tính năng 2"],
  "final_price": 800000,
  "discount_percent": 20,
  "savings": 200000
}
```

## Lỗi thường gặp

### 400 Bad Request
- Thiếu tham số bắt buộc
- Giá trị tham số không hợp lệ

### 404 Not Found
- Không tìm thấy sản phẩm/gói theo ID hoặc slug
- Sản phẩm không ở trạng thái `active`

### 500 Internal Server Error
- Lỗi kết nối database
- Lỗi server không xác định

## Cách tích hợp

### JavaScript (Frontend)
```javascript
// Lấy danh sách khóa học
fetch('/api/services/by-type.php?type=course')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Courses:', data.data);
    }
  });

// Lấy chi tiết một dịch vụ
fetch('/api/services/detail.php?slug=test-huong-nghiep-pac')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('Service detail:', data.data);
    }
  });
```

### PHP (Server-side)
```php
// Gọi API từ server
$url = 'http://localhost/pac-new/api/services/list.php?type=consultation';
$response = file_get_contents($url);
$data = json_decode($response, true);

if ($data['success']) {
    $services = $data['data'];
    // Xử lý dữ liệu...
}
```