# Products API Documentation

## Tổng quan
API quản lý sản phẩm cho hệ thống shopping cart PAC.

## Endpoints

### 1. Lấy danh sách sản phẩm
**GET** `/api/products/list.php`

#### Parameters:
- `type` (optional): `course`, `online_test`, `consultation`
- `package_type` (optional): `basic`, `premium`
- `status` (optional): `active`, `inactive` (default: `active`)
- `limit` (optional): Số lượng sản phẩm trả về (default: 20)
- `offset` (optional): Vị trí bắt đầu (default: 0)
- `search` (optional): Tìm kiếm trong tên và mô tả

#### Response:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Khóa học Quản lý Dự án Cơ bản",
        "description": "...",
        "description_short": "...",
        "price": 2500000,
        "price_formatted": "2.500.000 VND",
        "type": "course",
        "package_type": null,
        "status": "active",
        "created_at": "2025-09-08 10:00:00",
        "updated_at": "2025-09-08 10:00:00"
      }
    ],
    "pagination": {
      "total": 7,
      "limit": 20,
      "offset": 0,
      "current_page": 1,
      "total_pages": 1
    }
  },
  "filters": {
    "type": null,
    "package_type": null,
    "status": "active",
    "search": null
  }
}
```

### 2. Chi tiết sản phẩm
**GET** `/api/products/detail.php?id={product_id}`

#### Response:
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "Khóa học Quản lý Dự án Cơ bản",
      "description": "...",
      "price": 2500000,
      "price_formatted": "2.500.000 VND",
      "type": "course",
      "type_label": "Khóa học",
      "package_type": null,
      "package_label": null,
      "status": "active",
      "features": [
        "Học online hoặc offline",
        "Tài liệu đầy đủ",
        "Hỗ trợ trong quá trình học",
        "Chứng chỉ hoàn thành"
      ],
      "created_at": "2025-09-08 10:00:00",
      "updated_at": "2025-09-08 10:00:00"
    },
    "related_products": [...]
  }
}
```

### 3. Admin CRUD
**Tất cả các endpoint cần authentication admin**

#### 3.1 Danh sách sản phẩm (Admin)
**GET** `/api/products/admin-manage.php`

Parameters:
- `page` (optional): Trang hiện tại (default: 1)
- `limit` (optional): Số lượng mỗi trang (default: 10)
- `search` (optional): Tìm kiếm
- `status` (optional): Lọc theo trạng thái
- `type` (optional): Lọc theo loại

#### 3.2 Tạo sản phẩm
**POST** `/api/products/admin-manage.php`

Body:
```json
{
  "name": "Tên sản phẩm",
  "description": "Mô tả chi tiết",
  "price": 1000000,
  "type": "course",
  "package_type": "basic",
  "status": "active"
}
```

#### 3.3 Cập nhật sản phẩm
**PUT** `/api/products/admin-manage.php?id={product_id}`

Body: (các field cần update)
```json
{
  "name": "Tên mới",
  "price": 1500000
}
```

#### 3.4 Xóa sản phẩm
**DELETE** `/api/products/admin-manage.php?id={product_id}`

- Nếu sản phẩm đã có trong đơn hàng: chuyển status thành `inactive`
- Nếu chưa có đơn hàng: xóa cứng

## Error Responses

```json
{
  "success": false,
  "error": "Error message"
}
```

## HTTP Status Codes
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized 
- `403`: Forbidden
- `404`: Not Found
- `405`: Method Not Allowed
- `500`: Internal Server Error

## Testing
Mở file `test.html` trong browser để test các API endpoints.

## Example Usage

### JavaScript Fetch
```javascript
// Lấy danh sách khóa học
const response = await fetch('/api/products/list.php?type=course');
const data = await response.json();

// Lấy chi tiết sản phẩm
const detail = await fetch('/api/products/detail.php?id=1');
const product = await detail.json();
```

### cURL
```bash
# Lấy danh sách sản phẩm
curl "http://localhost/api/products/list.php"

# Chi tiết sản phẩm
curl "http://localhost/api/products/detail.php?id=1"

# Tạo sản phẩm (Admin)
curl -X POST "http://localhost/api/products/admin-manage.php" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","description":"Test","price":100000,"type":"course"}'
```
