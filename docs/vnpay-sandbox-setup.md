# Hướng dẫn setup VNPay Sandbox Testing

## Vấn đề hiện tại
VNPay sandbox không chấp nhận domain `localhost` cho Return URL và IPN URL. 

## Giải pháp 1: Sử dụng domain test local

### Bước 1: Thêm domain test vào hosts file
Mở file hosts với quyền Administrator:
- Windows: `C:\Windows\System32\drivers\etc\hosts`
- Thêm dòng: `127.0.0.1    pac-test.local`

### Bước 2: Truy cập website qua domain mới
- Thay vì: `http://localhost/0/pac-new/`
- Sử dụng: `http://pac-test.local/0/pac-new/`

### Bước 3: Test thanh toán
- VNPay Return URL sẽ là: `http://pac-test.local/0/pac-new/vnpay-return`
- VNPay IPN URL sẽ là: `http://pac-test.local/0/pac-new/vnpay-ipn`

## Giải pháp 2: Sử dụng ngrok (Khuyến nghị)

### Bước 1: Tải và cài đặt ngrok
- Tải từ: https://ngrok.com/
- Giải nén và thêm vào PATH

### Bước 2: Chạy ngrok tunnel
```bash
ngrok http 80
```

### Bước 3: Sử dụng URL public từ ngrok
- ngrok sẽ cho bạn URL như: `https://abc123.ngrok.io`
- Cập nhật config trong `vnpay-config.php`:

```php
// Override for ngrok testing
if ($host === 'localhost' || strpos($host, '127.0.0.1') !== false) {
    $base_url = 'https://abc123.ngrok.io'; // Thay bằng URL ngrok của bạn
}
```

## Giải pháp 3: Deploy lên hosting test

### Deploy code lên hosting free như:
- 000webhost.com
- InfinityFree.net
- Heroku (free tier)

## Kiểm tra kết quả

Sau khi setup xong, check log để xem URLs:
- VNPay Return URL: `http://pac-test.local/0/pac-new/vnpay-return`
- VNPay IPN URL: `http://pac-test.local/0/pac-new/vnpay-ipn`

## Debug URLs

Kiểm tra log trong error_log.txt:
```
VNPay Payment URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...
VNPay Return URL: http://pac-test.local/0/pac-new/vnpay-return
VNPay IPN URL: http://pac-test.local/0/pac-new/vnpay-ipn
```

## Test credentials VNPay Sandbox
- TMN Code: UNLOCKY1  
- Hash Secret: LJIIDDXSEFHJHEXYZNATSCHPSFSXVYRU
- Sandbox URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

## Test card info (VNPay sandbox)
- Card Number: 9704198526191432198
- Card Holder: NGUYEN VAN A
- Expiry Date: 07/15
- OTP: 123456