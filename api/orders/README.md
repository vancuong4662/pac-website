# Orders API Documentation

## Tổng quan
API quản lý đơn hàng cho hệ thống shopping cart PAC.

## Authentication
**Tất cả endpoints yêu cầu authentication.** User phải đăng nhập và có session hợp lệ.

## Endpoints

### 1. Tạo đơn hàng từ giỏ hàng
**POST** `/api/orders/create.php`

#### Body:
```json
{
  "payment_method": "bank_transfer",
  "notes": "Ghi chú đơn hàng (optional)"
}
```

#### Rules:
- Cart phải có ít nhất 1 sản phẩm
- Chỉ products có `status = 'active'` được tính vào order
- Cart sẽ được xóa sạch sau khi tạo order thành công
- Sử dụng database transaction để đảm bảo data consistency

#### Payment Methods:
- `bank_transfer`: Chuyển khoản ngân hàng
- `credit_card`: Thẻ tín dụng  
- `e_wallet`: Ví điện tử
- `cash`: Tiền mặt

#### Response:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_code": "ORD000001",
      "user_id": 1,
      "customer_name": "Nguyễn Văn A",
      "customer_email": "user@example.com",
      "customer_phone": "0901234567",
      "total_amount": 5000000,
      "total_formatted": "5.000.000 VND",
      "payment_method": "bank_transfer",
      "status": "pending",
      "payment_status": "pending",
      "created_at": "2025-09-09 10:00:00",
      "items_count": 2
    },
    "order_items": [
      {
        "id": 1,
        "product_id": 1,
        "name": "Khóa học Quản lý Dự án Cơ bản",
        "type": "course",
        "package_type": null,
        "quantity": 1,
        "price": 2500000,
        "price_formatted": "2.500.000 VND",
        "subtotal": 2500000,
        "subtotal_formatted": "2.500.000 VND"
      }
    ],
    "summary": {
      "total_items": 2,
      "total_quantity": 3,
      "total_amount": 5000000,
      "total_formatted": "5.000.000 VND"
    }
  },
  "message": "Đã tạo đơn hàng #ORD000001 thành công",
  "next_steps": {
    "payment": "Proceed to payment with order ID: 1",
    "tracking": "Track order status with code: ORD000001"
  }
}
```

### 2. Danh sách đơn hàng
**GET** `/api/orders/list.php`

#### Parameters:
- `page` (optional): Trang hiện tại (default: 1)
- `limit` (optional): Số đơn hàng mỗi trang (default: 10, max: 50)
- `status` (optional): `pending`, `completed`, `cancelled`
- `payment_status` (optional): `pending`, `paid`, `failed`

#### Response:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "order_code": "ORD000001",
        "total_amount": 5000000,
        "total_formatted": "5.000.000 VND",
        "status": "pending",
        "status_label": "Chờ xử lý",
        "status_color": "warning",
        "payment_method": "bank_transfer",
        "payment_method_label": "Chuyển khoản",
        "payment_status": "pending",
        "payment_status_label": "Chờ thanh toán",
        "payment_status_color": "warning",
        "created_at": "2025-09-09 10:00:00",
        "updated_at": "2025-09-09 10:00:00",
        "items_count": 2,
        "total_quantity": 3
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 5,
      "total_pages": 1,
      "has_prev": false,
      "has_next": false,
      "prev_page": null,
      "next_page": null
    }
  },
  "filters": {
    "status": null,
    "payment_status": null,
    "page": 1,
    "limit": 10
  },
  "user_id": 1
}
```

### 4. Xử lý thanh toán
**POST** `/api/orders/payment.php`

#### Body:
```json
{
  "order_id": 1,
  "payment_method": "bank_transfer",
  "payment_data": {}
}
```

#### Rules:
- Order phải có status = 'pending'
- Payment status phải khác 'paid'
- Tự động cập nhật order status thành 'completed' khi payment thành công
- Tự động process purchased items sau payment

#### Response:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_code": "ORD000001",
      "customer_name": "Nguyễn Văn A",
      "customer_email": "user@example.com",
      "total_amount": 5000000,
      "total_formatted": "5.000.000 VND",
      "payment_method": "bank_transfer",
      "status": "completed",
      "payment_status": "paid",
      "updated_at": "2025-09-09 11:00:00"
    },
    "payment": {
      "method": "bank_transfer",
      "amount": 5000000,
      "amount_formatted": "5.000.000 VND",
      "transaction_id": "A1B2C3D4E5F6",
      "processed_at": "2025-09-09 11:00:00"
    },
    "purchase_processing": {
      "success": true,
      "data": {
        "processed_items": {
          "courses": [...],
          "tests": [...],
          "consultations": [...]
        },
        "summary": {
          "total_items_processed": 3,
          "courses_created": 1,
          "tests_created": 1,
          "consultations_created": 1
        }
      }
    }
  },
  "message": "Payment successful for order #ORD000001"
}
```

### 5. Xử lý sản phẩm đã mua
**POST** `/api/orders/process-purchase.php`

#### Body:
```json
{
  "order_id": 1,
  "force": false
}
```

#### Rules:
- Order phải có status = 'completed' và payment_status = 'paid' (trừ khi force = true)
- Tạo unique codes/tokens cho từng loại sản phẩm
- Hỗ trợ multiple quantity (tạo nhiều codes cho cùng product)

#### Product Processing Logic:
- **course**: Tạo course_code (CRS + 8 hex), expires sau 1 năm
- **online_test**: Tạo test_token (TST + 32 hex), expires sau 6 tháng, attempts_left (basic: 1, premium: 3)
- **consultation**: Tạo consultation_code (CON + 8 hex), status = 'pending'

#### Response:
```json
{
  "success": true,
  "data": {
    "order_id": 1,
    "order_code": "ORD000001",
    "customer": {
      "name": "Nguyễn Văn A",
      "email": "user@example.com"
    },
    "processed_items": {
      "courses": [
        {
          "id": 1,
          "product_name": "Khóa học Quản lý Dự án Cơ bản",
          "course_code": "CRS12AB34CD",
          "expires_at": "2026-09-09 10:00:00",
          "status": "active"
        }
      ],
      "tests": [
        {
          "id": 1,
          "product_name": "Trắc nghiệm Online Premium",
          "test_token": "TST1234567890abcdef1234567890abcdef",
          "attempts_left": 3,
          "package_type": "premium",
          "expires_at": "2026-03-09 10:00:00",
          "status": "active"
        }
      ],
      "consultations": [
        {
          "id": 1,
          "product_name": "Tư vấn Chuyên gia Premium",
          "consultation_code": "CON56EF78GH",
          "package_type": "premium",
          "status": "pending",
          "scheduled_at": null
        }
      ]
    },
    "summary": {
      "total_items_processed": 3,
      "courses_created": 1,
      "tests_created": 1,
      "consultations_created": 1
    }
  },
  "message": "Successfully processed 3 purchased items for order #ORD000001"
}
```
**GET** `/api/orders/detail.php?id={order_id}`

#### Response:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_code": "ORD000001",
      "user_id": 1,
      "customer_name": "Nguyễn Văn A",
      "customer_email": "user@example.com",
      "customer_phone": "0901234567",
      "total_amount": 5000000,
      "total_formatted": "5.000.000 VND",
      "status": "pending",
      "status_label": "Chờ xử lý",
      "status_color": "warning",
      "payment_method": "bank_transfer",
      "payment_method_label": "Chuyển khoản",
      "payment_status": "pending",
      "payment_status_label": "Chờ thanh toán",
      "payment_status_color": "warning",
      "created_at": "2025-09-09 10:00:00",
      "updated_at": "2025-09-09 10:00:00"
    },
    "order_items": [
      {
        "order_item_id": 1,
        "quantity": 1,
        "price": 2500000,
        "price_formatted": "2.500.000 VND",
        "subtotal": 2500000,
        "subtotal_formatted": "2.500.000 VND",
        "added_at": "2025-09-09 10:00:00",
        "product_id": 1,
        "name": "Khóa học Quản lý Dự án Cơ bản",
        "description": "...",
        "type": "course",
        "type_label": "Khóa học",
        "package_type": null,
        "package_label": null,
        "product_status": "active"
      }
    ],
    "summary": {
      "total_items": 2,
      "total_quantity": 3,
      "total_amount": 5000000,
      "total_formatted": "5.000.000 VND"
    },
    "purchased_items": {
      "has_items": false,
      "message": "Chưa có sản phẩm đã mua được tạo"
    }
  }
}
```

## Order Status Flow

### Order Status:
1. **pending**: Đơn hàng mới tạo, chờ xử lý
2. **completed**: Đơn hàng đã hoàn thành
3. **cancelled**: Đơn hàng đã bị hủy

### Payment Status:
1. **pending**: Chờ thanh toán
2. **paid**: Đã thanh toán thành công
3. **failed**: Thanh toán thất bại

### Typical Flow:
```
Order Created
├── status: pending
└── payment_status: pending

↓ User pays

Payment Successful
├── status: pending → completed
└── payment_status: pending → paid

↓ System processes

Purchase Items Created
└── purchased_courses, purchased_tests, consultation_bookings
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Cart is empty"
}
```

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
  "error": "Order not found"
}
```

## HTTP Status Codes
- `200`: Success
- `400`: Bad Request (cart empty, invalid payment method)
- `401`: Unauthorized (not logged in)
- `404`: Not Found (order not found)
- `405`: Method Not Allowed
- `500`: Internal Server Error

## Database Schema

### Orders Table:
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(20) UNIQUE,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Order Items Table:
```sql
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## Business Logic

### Order Creation Process:
1. **Validate Cart**: Kiểm tra cart không rỗng, products active
2. **Calculate Total**: Tính tổng tiền từ cart items
3. **Create Order**: Tạo record trong `orders` table
4. **Create Order Items**: Copy cart items vào `order_items`
5. **Generate Order Code**: Format ORD000001, ORD000002, ...
6. **Clear Cart**: Xóa sạch cart sau khi order thành công
7. **Transaction**: Tất cả operations trong 1 database transaction

### Order Code Generation:
- Format: `ORD` + 6-digit number với leading zeros
- Examples: `ORD000001`, `ORD000002`, `ORD000123`
- Unique và sequential

### Price Preservation:
- Order items lưu giá tại thời điểm đặt hàng
- Không bị ảnh hưởng khi product price thay đổi sau này
- Đảm bảo data integrity cho báo cáo và tracking

### User Isolation:
- User chỉ thấy orders của mình
- Không thể truy cập orders của user khác
- API endpoints đều filter theo `user_id`

## Testing
Mở file `test.html` trong browser để test tất cả Orders API endpoints.

## Example Usage

### JavaScript Fetch
```javascript
// Tạo đơn hàng
const orderResponse = await fetch('/api/orders/create.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    payment_method: 'bank_transfer',
    notes: 'Ghi chú đơn hàng'
  })
});

// Lấy danh sách đơn hàng
const listResponse = await fetch('/api/orders/list.php?page=1&limit=10');

// Chi tiết đơn hàng
const detailResponse = await fetch('/api/orders/detail.php?id=1');

// Xử lý thanh toán
const paymentResponse = await fetch('/api/orders/payment.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: 1,
    payment_method: 'bank_transfer'
  })
});

// Xử lý purchased items
const processResponse = await fetch('/api/orders/process-purchase.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: 1,
    force: false
  })
});
```

### cURL Examples
```bash
# Tạo đơn hàng
curl -X POST "http://localhost/api/orders/create.php" \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=your_session_id" \
  -d '{"payment_method":"bank_transfer","notes":"Test order"}'

# Danh sách đơn hàng
curl -X GET "http://localhost/api/orders/list.php?page=1&limit=10" \
  -H "Cookie: PHPSESSID=your_session_id"

# Chi tiết đơn hàng
curl -X GET "http://localhost/api/orders/detail.php?id=1" \
  -H "Cookie: PHPSESSID=your_session_id"
```

## Integration Notes

### Frontend Integration:
- **Checkout Page**: Call `create.php` sau khi user confirm
- **Order History**: Call `list.php` với pagination
- **Order Tracking**: Call `detail.php` với order_id
- **Payment Flow**: Update order payment_status sau payment

### Next Steps:
- **Payment Processing**: Tích hợp payment gateway
- **Purchase Processing**: Tạo purchased items sau payment
- **Order Fulfillment**: Process và deliver digital products
- **Notifications**: Email confirmations và status updates

### Security:
- Session authentication cho tất cả endpoints
- User isolation - chỉ thấy orders của mình
- Input validation và SQL injection protection
- Transaction rollback nếu có lỗi trong quá trình tạo order

### Performance:
- Database indexes trên `user_id`, `order_code`, `status`
- Pagination để handle large order lists
- Efficient JOIN queries cho order details

## Error Handling
- **Empty Cart**: 400 Bad Request
- **Invalid Payment Method**: 400 Bad Request  
- **Database Errors**: 500 Internal Server Error với rollback
- **Order Not Found**: 404 Not Found
- **Unauthorized Access**: 401 Unauthorized

## Future Enhancements
- Order modification (before payment)
- Partial refunds
- Order cancellation
- Bulk order operations
- Advanced filtering và search
- Order export functionality
