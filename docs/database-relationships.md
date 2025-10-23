# Cơ chế kết nối bảng và đồng bộ dữ liệu

## 1. Triggers tự động

### 1.1 Trigger cập nhật order khi có VNPay transaction
```sql
-- Tự động cập nhật vnpay_txn_ref trong orders
CREATE TRIGGER update_order_vnpay_ref 
AFTER INSERT ON vnpay_transactions
```

### 1.2 Trigger cập nhật payment status
```sql
-- Tự động cập nhật payment_status dựa trên VNPay response
CREATE TRIGGER update_order_payment_status 
AFTER UPDATE ON vnpay_transactions
```

### 1.3 Trigger validation
```sql
-- Kiểm tra tính hợp lệ trước khi tạo VNPay transaction
CREATE TRIGGER validate_vnpay_transaction
BEFORE INSERT ON vnpay_transactions
```

## 2. Stored Procedures

### 2.1 Đồng bộ payment status
```php
// Gọi từ PHP để đồng bộ tất cả payment status
$pdo->query("CALL sync_payment_status()");
```

### 2.2 Kiểm tra trạng thái thanh toán
```php
// Lấy trạng thái thanh toán hiện tại
$stmt = $pdo->prepare("SELECT check_payment_status(?) as status");
$stmt->execute([$order_id]);
$status = $stmt->fetchColumn();
```

## 3. Views tiện ích

### 3.1 View tổng hợp order và payment
```sql
-- Xem tất cả thông tin order + VNPay trong 1 query
SELECT * FROM order_payment_summary WHERE order_id = ?;
```

### 3.2 View thống kê VNPay
```sql
-- Thống kê giao dịch VNPay theo ngày
SELECT * FROM vnpay_statistics WHERE transaction_date = CURDATE();
```

### 3.3 View orders chưa thanh toán
```sql
-- Theo dõi orders đang pending
SELECT * FROM pending_payments WHERE hours_pending > 24;
```

## 4. Sử dụng trong PHP

### 4.1 Tạo order và VNPay transaction
```php
// Bước 1: Tạo order (trigger sẽ tự tạo order_code)
$stmt = $pdo->prepare("INSERT INTO orders (user_id, total_amount, payment_method) VALUES (?, ?, 'vnpay')");
$stmt->execute([$user_id, $amount]);
$order_id = $pdo->lastInsertId();

// Bước 2: Tạo VNPay transaction (trigger sẽ tự cập nhật order)
$stmt = $pdo->prepare("INSERT INTO vnpay_transactions (order_id, amount, vnp_order_info) VALUES (?, ?, ?)");
$stmt->execute([$order_id, $amount, $order_info]);
```

### 4.2 Xử lý VNPay callback
```php
// Cập nhật transaction (trigger sẽ tự cập nhật order status)
$stmt = $pdo->prepare("UPDATE vnpay_transactions SET 
    status = ?, vnp_response_code = ?, vnp_transaction_no = ?, 
    vnp_bank_code = ?, vnp_pay_date = ?, processed_at = NOW()
    WHERE txn_ref = ?");
$stmt->execute([$status, $response_code, $txn_no, $bank_code, $pay_date, $txn_ref]);
```

### 4.3 Kiểm tra trạng thái thanh toán
```php
// Sử dụng view để lấy thông tin đầy đủ
$stmt = $pdo->prepare("SELECT * FROM order_payment_summary WHERE order_id = ?");
$stmt->execute([$order_id]);
$order_info = $stmt->fetch();

echo "Order Status: " . $order_info['order_status'];
echo "Payment Status: " . $order_info['payment_status'];
echo "VNPay Status: " . $order_info['vnpay_status'];
```

## 5. Tính năng bảo vệ dữ liệu

### 5.1 Ngăn duplicate payment
- Trigger `validate_vnpay_transaction` sẽ throw error nếu order đã paid
- Không thể tạo VNPay transaction cho order đã cancelled

### 5.2 Cascade delete
- Trigger `before_delete_order` sẽ tự động xóa VNPay transactions khi xóa order

### 5.3 Auto-generation
- Order code tự động tạo theo format: PAC + YYYYMMDD + 6-digit-ID
- VNPay txn_ref tự động tạo nếu không được cung cấp

## 6. Monitoring và troubleshooting

### 6.1 Kiểm tra orders có vấn đề
```sql
-- Orders có VNPay success nhưng chưa cập nhật status
SELECT * FROM order_payment_summary 
WHERE vnpay_status = 'success' 
AND vnp_response_code = '00' 
AND payment_status != 'paid';
```

### 6.2 Đồng bộ manual nếu cần
```sql
-- Chạy stored procedure để đồng bộ lại
CALL sync_payment_status();
```

### 6.3 Thống kê VNPay theo bank
```sql
SELECT vnp_bank_code, COUNT(*), SUM(amount) 
FROM vnpay_transactions 
WHERE status = 'success' 
GROUP BY vnp_bank_code;
```