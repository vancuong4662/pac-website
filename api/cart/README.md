# Cart API Documentation

## Tổng quan
API quản lý giỏ hàng cho hệ thống shopping cart PAC.

## Authentication
**Tất cả endpoints yêu cầu authentication.** User phải đăng nhập và có session hợp lệ.

## Endpoints

### 1. Lấy giỏ hàng hiện tại
**GET** `/api/cart/get.php`

#### Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "cart_id": 1,
        "quantity": 2,
        "added_at": "2025-09-09 10:00:00",
        "product_id": 1,
        "name": "Khóa học Quản lý Dự án Cơ bản",
        "description": "...",
        "price": 2500000,
        "price_formatted": "2.500.000 VND",
        "type": "course",
        "type_label": "Khóa học",
        "package_type": null,
        "package_label": null,
        "status": "active",
        "subtotal": 5000000,
        "subtotal_formatted": "5.000.000 VND"
      }
    ],
    "summary": {
      "item_count": 2,
      "total_items": 1,
      "total_amount": 5000000,
      "total_formatted": "5.000.000 VND"
    }
  },
  "user_id": 1
}
```

### 2. Thêm sản phẩm vào giỏ hàng
**POST** `/api/cart/add.php`

#### Body:
```json
{
  "product_id": 1,
  "quantity": 2
}
```

#### Rules:
- `product_id`: Required, phải tồn tại và có status = 'active'
- `quantity`: Optional (default: 1), từ 1-10
- Nếu sản phẩm đã có trong giỏ: cộng thêm quantity
- Tổng quantity per item không quá 10

#### Response:
```json
{
  "success": true,
  "action": "added", // hoặc "updated"
  "data": {
    "cart_item": {
      "cart_id": 1,
      "quantity": 2,
      "product_id": 1,
      "name": "Khóa học Quản lý Dự án Cơ bản",
      "price": 2500000,
      "price_formatted": "2.500.000 VND",
      "subtotal": 5000000,
      "subtotal_formatted": "5.000.000 VND"
    },
    "cart_summary": {
      "total_items": 1,
      "total_quantity": 2,
      "total_amount": 5000000,
      "total_formatted": "5.000.000 VND"
    }
  },
  "message": "Đã thêm Khóa học Quản lý Dự án Cơ bản vào giỏ hàng"
}
```

### 3. Cập nhật số lượng sản phẩm
**PUT** `/api/cart/update.php?id={cart_id}`

#### Body:
```json
{
  "quantity": 3
}
```

#### Rules:
- `cart_id`: Required, phải thuộc về user hiện tại
- `quantity`: Required, từ 1-10

#### Response:
```json
{
  "success": true,
  "data": {
    "cart_item": {
      "cart_id": 1,
      "quantity": 3,
      "product_id": 1,
      "name": "Khóa học Quản lý Dự án Cơ bản",
      "price": 2500000,
      "subtotal": 7500000,
      "subtotal_formatted": "7.500.000 VND"
    },
    "cart_summary": {
      "total_items": 1,
      "total_quantity": 3,
      "total_amount": 7500000,
      "total_formatted": "7.500.000 VND"
    }
  },
  "message": "Đã cập nhật số lượng Khóa học Quản lý Dự án Cơ bản thành 3"
}
```

### 4. Xóa sản phẩm khỏi giỏ hàng
**DELETE** `/api/cart/remove.php?id={cart_id}`

#### Response:
```json
{
  "success": true,
  "data": {
    "removed_item": {
      "cart_id": 1,
      "name": "Khóa học Quản lý Dự án Cơ bản",
      "quantity": 2
    },
    "cart_summary": {
      "total_items": 0,
      "total_quantity": 0,
      "total_amount": 0,
      "total_formatted": "0 VND"
    }
  },
  "message": "Đã xóa Khóa học Quản lý Dự án Cơ bản khỏi giỏ hàng"
}
```

### 5. Xóa toàn bộ giỏ hàng
**DELETE** `/api/cart/clear.php`

#### Response:
```json
{
  "success": true,
  "data": {
    "items_removed": 3,
    "previous_summary": {
      "total_items": 3,
      "total_quantity": 5,
      "total_amount": 10000000,
      "total_formatted": "10.000.000 VND"
    },
    "cart_summary": {
      "total_items": 0,
      "total_quantity": 0,
      "total_amount": 0,
      "total_formatted": "0 VND"
    }
  },
  "message": "Đã xóa toàn bộ giỏ hàng (3 sản phẩm)"
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found or inactive"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Quantity must be between 1 and 10"
}
```

## HTTP Status Codes
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (not logged in)
- `404`: Not Found (product/cart item not found)
- `405`: Method Not Allowed
- `500`: Internal Server Error

## Business Logic

### Quantity Limits
- Minimum: 1
- Maximum: 10 per item
- Khi add existing item: cộng vào quantity hiện tại
- Tổng quantity không được vượt quá 10

### Product Validation
- Chỉ products có `status = 'active'` mới được add
- Product phải tồn tại trong database
- Cart chỉ hiển thị active products

### User Isolation
- Mỗi user chỉ thấy và quản lý cart của mình
- Cart item ID phải thuộc về user hiện tại

### Cart Persistence
- Cart được lưu trong database (không phải session)
- Persistent across browser sessions
- Tự động cleanup khi user logout (optional)

## Testing
Mở file `test.html` trong browser để test tất cả Cart API endpoints.

## Example Usage

### JavaScript Fetch
```javascript
// Lấy giỏ hàng
const cart = await fetch('/api/cart/get.php');
const cartData = await cart.json();

// Thêm sản phẩm
const addResponse = await fetch('/api/cart/add.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ product_id: 1, quantity: 2 })
});

// Cập nhật số lượng
const updateResponse = await fetch('/api/cart/update.php?id=1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ quantity: 3 })
});

// Xóa item
const removeResponse = await fetch('/api/cart/remove.php?id=1', {
  method: 'DELETE'
});

// Xóa toàn bộ
const clearResponse = await fetch('/api/cart/clear.php', {
  method: 'DELETE'
});
```

### cURL Examples
```bash
# Lấy giỏ hàng (cần cookie session)
curl -X GET "http://localhost/api/cart/get.php" \
  -H "Cookie: PHPSESSID=your_session_id"

# Thêm sản phẩm
curl -X POST "http://localhost/api/cart/add.php" \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=your_session_id" \
  -d '{"product_id": 1, "quantity": 2}'

# Cập nhật số lượng
curl -X PUT "http://localhost/api/cart/update.php?id=1" \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=your_session_id" \
  -d '{"quantity": 3}'

# Xóa item
curl -X DELETE "http://localhost/api/cart/remove.php?id=1" \
  -H "Cookie: PHPSESSID=your_session_id"

# Xóa toàn bộ
curl -X DELETE "http://localhost/api/cart/clear.php" \
  -H "Cookie: PHPSESSID=your_session_id"
```

## Integration Notes

### Frontend Integration
- Cart icon/counter: call `get.php` để hiển thị số lượng
- Add to cart buttons: call `add.php` với product_id
- Cart page: call `get.php` + `update.php`/`remove.php`
- Checkout: call `get.php` để lấy items cho order

### Security
- Tất cả endpoints đều check session authentication
- User chỉ thao tác với cart của mình
- Input validation và sanitization
- SQL injection protection với prepared statements

### Performance
- Database indexes trên `user_id` và `product_id`
- Cache cart summary để tránh recalculate
- Lazy loading cart data khi cần

## Database Schema
Cart API sử dụng bảng `cart` từ schema chính:

```sql
CREATE TABLE cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```
