# VNPay Integration - Hướng dẫn triển khai

## Tổng quan
Hệ thống thanh toán VNPay đã được tích hợp vào PAC Group website với đầy đủ các tính năng:
- Tạo URL thanh toán VNPay
- Xử lý callback từ VNPay
- Xử lý IPN (Instant Payment Notification)
- Hiển thị kết quả thanh toán

## Cấu trúc files đã tạo

### 1. Cấu hình VNPay
- `config/vnpay-config.php` - Cấu hình thông tin VNPay và các hàm tiện ích

### 2. API Endpoints
- `api/orders/vnpay-create.php` - Tạo URL thanh toán VNPay
- `api/orders/vnpay-return.php` - Xử lý khi user quay lại từ VNPay
- `api/orders/vnpay-ipn.php` - Xử lý webhook IPN từ VNPay

### 3. Frontend Templates
- `templates/checkout.html` - Đã cập nhật để hỗ trợ VNPay
- `templates/payment-result.html` - Hiển thị kết quả thanh toán
- `assets/js/checkout.js` - JavaScript xử lý thanh toán VNPay

### 4. Database
- `sql/vnpay-tables.sql` - Script tạo bảng vnpay_transactions
- Cập nhật `sql/create-all-tables.sql` để bao gồm bảng VNPay

## Hướng dẫn cài đặt

### Bước 1: Cập nhật Database
```sql
-- Chạy script tạo bảng VNPay
SOURCE sql/vnpay-tables.sql;

-- Hoặc chạy lại toàn bộ database
SOURCE sql/create-all-tables.sql;
```

### Bước 2: Cấu hình VNPay
Mở file `config/vnpay-config.php` và cập nhật:
```php
$vnp_TmnCode    = "YOUR_TMN_CODE";      // Mã website tại VNPay
$vnp_HashSecret = "YOUR_HASH_SECRET";   // Chuỗi bí mật
$vnp_Url        = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"; // Sandbox URL
```

**Lưu ý:** Hiện tại đang sử dụng thông tin sandbox. Khi lên production cần:
1. Đăng ký tài khoản VNPay merchant
2. Lấy thông tin TMN Code và Hash Secret thật
3. Đổi URL sang production: `https://vnpayment.vn/paymentv2/vpcpay.html`

### Bước 3: Cấu hình URL Return và IPN
URLs được tự động tạo dựa trên domain hiện tại:
- Return URL: `http://yourdomain.com/api/orders/vnpay-return.php`
- IPN URL: `http://yourdomain.com/api/orders/vnpay-ipn.php`

Bạn cần đăng ký những URL này với VNPay trong panel admin.

## Luồng thanh toán VNPay

### 1. Khách hàng chọn VNPay
1. Trên trang checkout, khách hàng chọn "VNPay" và có thể chọn ngân hàng
2. Khi nhấn "Đặt hàng", hệ thống tạo order trong database
3. Gọi API `vnpay-create.php` để tạo URL thanh toán
4. Redirect khách hàng đến VNPay

### 2. Khách hàng thanh toán tại VNPay
1. Khách hàng nhập thông tin thẻ/tài khoản
2. VNPay xử lý thanh toán
3. VNPay redirect khách hàng về website qua Return URL

### 3. Xử lý kết quả
1. `vnpay-return.php` nhận kết quả và cập nhật database
2. VNPay gửi IPN đến `vnpay-ipn.php` để confirm
3. Khách hàng được chuyển đến trang `payment-result.html`

## Cấu trúc bảng vnpay_transactions

```sql
CREATE TABLE vnpay_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    txn_ref VARCHAR(255) NOT NULL UNIQUE,
    amount BIGINT NOT NULL,
    order_info TEXT,
    create_date VARCHAR(14),
    expire_date VARCHAR(14),
    ip_addr VARCHAR(45),
    bank_code VARCHAR(20),
    vnp_response_code VARCHAR(10),
    vnp_transaction_no VARCHAR(50),
    vnp_bank_code VARCHAR(20),
    vnp_bank_tran_no VARCHAR(50),
    vnp_card_type VARCHAR(10),
    vnp_pay_date VARCHAR(14),
    vnp_secure_hash VARCHAR(256),
    status ENUM('pending', 'success', 'failed', 'cancelled', 'expired'),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Documentation

### POST /api/orders/vnpay-create.php
Tạo URL thanh toán VNPay

**Request:**
```json
{
    "order_id": 123,
    "order_info": "Thanh toan don hang PAC Group #123",
    "bank_code": "VIETCOMBANK" // Optional
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
        "txn_ref": "ORD123_1640995200",
        "order_id": 123,
        "amount": 500000,
        "expire_in_minutes": 15
    }
}
```

### GET /api/orders/vnpay-return.php
Xử lý khi khách hàng quay lại từ VNPay (được VNPay gọi)

**Parameters:** Các tham số VNPay trả về
- `vnp_ResponseCode`: Mã kết quả thanh toán
- `vnp_TxnRef`: Mã giao dịch
- `vnp_Amount`: Số tiền
- `vnp_SecureHash`: Chữ ký bảo mật
- ... và nhiều tham số khác

### POST /api/orders/vnpay-ipn.php
Webhook IPN từ VNPay (được VNPay gọi)

**Response:**
```json
{
    "RspCode": "00",
    "Message": "Confirm Success"
}
```

## Testing

### 1. Thông tin test VNPay Sandbox
- Bank: NCB
- Card Number: 9704198526191432198
- Card Holder: NGUYEN VAN A
- Expire Date: 07/15
- OTP: 123456

### 2. Các mã response code thường gặp
- `00`: Giao dịch thành công
- `24`: Khách hàng hủy giao dịch
- `51`: Tài khoản không đủ số dư
- `99`: Lỗi khác

## Security Notes

1. **Hash Secret:** Giữ bí mật Hash Secret, không commit vào Git
2. **HTTPS:** Sử dụng HTTPS cho production
3. **IP Whitelist:** VNPay có thể yêu cầu whitelist IP server
4. **Validate:** Luôn validate chữ ký từ VNPay
5. **Timeout:** URL thanh toán có thời hạn 15 phút

## Troubleshooting

### 1. Lỗi chữ ký không hợp lệ
- Kiểm tra Hash Secret
- Kiểm tra thứ tự parameters khi tạo hash
- Kiểm tra encoding (UTF-8)

### 2. Không nhận được IPN
- Kiểm tra URL IPN có accessible từ internet
- Kiểm tra firewall
- Kiểm tra VNPay admin panel

### 3. Redirect không đúng
- Kiểm tra Return URL
- Kiểm tra domain trong VNPay config

## Production Checklist

- [ ] Đăng ký tài khoản VNPay merchant
- [ ] Cập nhật TMN Code và Hash Secret production
- [ ] Đổi URL VNPay sang production
- [ ] Cấu hình HTTPS
- [ ] Đăng ký Return URL và IPN URL với VNPay
- [ ] Test với thẻ thật (số tiền nhỏ)
- [ ] Monitor logs và transactions
- [ ] Backup Hash Secret an toàn

## Support

Để được hỗ trợ:
1. Kiểm tra logs trong database table `vnpay_transactions`
2. Kiểm tra server error logs
3. Liên hệ VNPay support nếu cần

---
**Lưu ý:** Đây là tích hợp sandbox VNPay. Khi lên production cần có tài khoản VNPay merchant và các thông tin production thật.