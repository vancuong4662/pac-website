# VNPay Routes Documentation - Flat Structure

## 🔧 Cách setup Routes trong .htaccess (Flat Structure)

### ✅ **Best Practice: Flat Routes**

Để tránh vấn đề về relative paths trong templates, chúng ta sử dụng flat structure:

```apache
# ✅ ĐÚNG: Flat routes (root level)
RewriteRule ^payment-vnpay/?$ templates/checkout.html?method=vnpay [L]
RewriteRule ^payment-result/?$ templates/payment-result.html [L]
RewriteRule ^payment-success/?$ templates/payment-result.html?status=success [L]
RewriteRule ^payment-failed/?$ templates/payment-result.html?status=failed [L]
RewriteRule ^vnpay-return/?$ api/orders/vnpay-return.php [L]
RewriteRule ^vnpay-ipn/?$ api/orders/vnpay-ipn.php [L]
RewriteRule ^vnpay-test/?$ test/vnpay-test.html [L]
```

### ❌ **Tránh: Nested Routes**

```apache
# ❌ SAI: Nested routes (tạo sub-directory)
RewriteRule ^payment/vnpay/?$ templates/checkout.html [L]
RewriteRule ^payment/result/?$ templates/payment-result.html [L]
RewriteRule ^vnpay/return/?$ api/orders/vnpay-return.php [L]
```

## 🌐 URLs được tạo

### Flat Structure (Recommended)
- `/payment-result` → templates/payment-result.html
- `/payment-vnpay` → templates/checkout.html?method=vnpay
- `/vnpay-return` → api/orders/vnpay-return.php
- `/vnpay-test` → test/vnpay-test.html

### Relative Paths hoạt động bình thường:
```html
<!-- Trong templates/payment-result.html -->
<link href="assets/css/main.css" rel="stylesheet">
<script src="assets/js/main.js"></script>
```

## 📋 Danh sách Routes VNPay hiện tại

### 1. Payment Pages
```apache
RewriteRule ^payment-vnpay/?$ templates/checkout.html?method=vnpay [L]
RewriteRule ^payment-result/?$ templates/payment-result.html [L]
RewriteRule ^payment-success/?$ templates/payment-result.html?status=success [L]
RewriteRule ^payment-failed/?$ templates/payment-result.html?status=failed [L]
RewriteRule ^payment-cancel/?$ templates/payment-result.html?status=cancelled [L]
```

### 2. VNPay API Callbacks
```apache
RewriteRule ^vnpay-return/?$ api/orders/vnpay-return.php [L]
RewriteRule ^vnpay-ipn/?$ api/orders/vnpay-ipn.php [L]
```

### 3. Testing & Development
```apache
RewriteRule ^vnpay-test/?$ test/vnpay-test.html [L]
```

## 🔗 Cách sử dụng trong code

### 1. Cấu hình VNPay
```php
// config/vnpay-config.php
$vnp_Returnurl = $base_url . $project_path . "/vnpay-return";
$vnp_IpnUrl = $base_url . $project_path . "/vnpay-ipn";
```

### 2. Redirect trong PHP
```php
// api/orders/vnpay-return.php
header('Location: /0/pac-new/payment-result?status=success&...');
```

### 3. Links trong JavaScript
```javascript
// assets/js/checkout.js
window.location.href = '/0/pac-new/payment-result' + window.location.search;
```

### 4. Links trong HTML
```html
<!-- templates/payment-result.html -->
<a href="vnpay-test">Test VNPay</a>
<a href="payment-vnpay">Thanh toán VNPay</a>
```

## 🎯 Lợi ích của Flat Structure

### ✅ **Advantages:**
1. **Relative paths hoạt động:** `assets/css/main.css` không bị lỗi
2. **Đơn giản hơn:** Không cần điều chỉnh base paths
3. **Dễ maintain:** Ít phụ thuộc vào folder structure
4. **SEO friendly:** URLs ngắn gọn, dễ nhớ

### ❌ **Nested Structure Problems:**
1. **Relative paths bị lỗi:** `../assets/css/main.css` → `../../assets/css/main.css`
2. **Template complexity:** Phải điều chỉnh paths trong mọi template
3. **Component loading issues:** Component paths bị shift
4. **Hard to maintain:** Phải update nhiều files khi thay đổi structure

## 🔍 Testing

### Test URLs:
- `http://localhost/0/pac-new/payment-result` ✅
- `http://localhost/0/pac-new/payment-vnpay` ✅
- `http://localhost/0/pac-new/vnpay-test` ✅
- `http://localhost/0/pac-new/vnpay-return` ✅ (VNPay callback)

### Verify Relative Paths:
```html
<!-- Kiểm tra trong browser console -->
<link href="assets/css/main.css" rel="stylesheet">
<!-- Should resolve to: http://localhost/0/pac-new/assets/css/main.css -->
```

## 📝 Migration Notes

Nếu có routes cũ theo nested pattern, cần:

1. **Update .htaccess routes:** Đổi từ `abc/xyz` → `abc-xyz`
2. **Update PHP redirects:** Đổi paths trong các API files
3. **Update JavaScript:** Đổi URLs trong JS files
4. **Update HTML links:** Đổi href attributes
5. **Test thoroughly:** Kiểm tra tất cả links và redirects

## 🚀 Production Checklist

- [ ] Tất cả routes sử dụng flat structure
- [ ] Relative paths hoạt động đúng trong templates
- [ ] VNPay callbacks point đến đúng URLs
- [ ] Test các routes với data thật
- [ ] Verify SEO URLs trong Google Search Console

---
**Note:** Flat structure là best practice cho Apache .htaccess rewrite rules khi làm việc với templates có relative paths.