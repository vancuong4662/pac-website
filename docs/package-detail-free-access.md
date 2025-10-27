# Package Detail Free Access Implementation

## Tổng quan

Triển khai tính năng đặc biệt cho gói miễn phí "Gói Khởi động" trong trang package-detail. Thay vì thêm vào giỏ hàng, gói miễn phí sẽ cho phép user bắt đầu làm test ngay lập tức.

## Thay đổi được thực hiện

### 1. API Endpoint Mới

**File:** `api/services/create-free-access.php`

- Tạo access_code cho gói miễn phí (mô phỏng trigger database)
- Kiểm tra user authentication
- Kiểm tra user đã có quyền truy cập chưa
- Tạo order dummy và purchased_package record
- Trả về access_code để redirect đến trang test

**Logic tạo access_code:**
```php
switch ($package['product_type']) {
    case 'course':
        $accessCode = "CRS_{$userId}_{$timestamp}_{$packageId}";
        break;
    case 'career_test':
        $accessCode = "TST_{$userId}_{$timestamp}_{$packageId}";
        break;
    case 'consultation':
        $accessCode = "CON_{$userId}_{$timestamp}_{$packageId}";
        break;
    default:
        $accessCode = "PKG_{$userId}_{$timestamp}_{$packageId}";
        break;
}
```

### 2. Cập nhật Package Detail UI

**File:** `templates/package-detail.html`

#### Thay đổi HTML Structure:
- Thay đổi button từ fixed ID sang dynamic ID
- Tách riêng text và icon để có thể thay đổi dễ dàng

#### Thay đổi JavaScript Logic:

**Method `setupActionButton(pkg)`:**
```javascript
if (pkg.is_free) {
    // Free package - show "Bắt đầu làm test" button
    btnText.textContent = 'Bắt đầu làm test';
    btnIcon.className = 'fas fa-play';
    primaryBtn.onclick = () => this.startFreeTest(pkg);
} else {
    // Paid package - show "Đăng ký dịch vụ" button
    btnText.textContent = 'Đăng ký dịch vụ';
    btnIcon.className = 'fas fa-shopping-cart';
    primaryBtn.onclick = addToCartFromDetail;
}
```

**Method `startFreeTest(pkg)`:**
- Kiểm tra authentication
- Gọi API tạo access_code
- Redirect đến `test?access_code={access_code}`

**Cập nhật `addToCartFromDetail()`:**
- Thêm check để tránh xử lý gói miễn phí
- Cập nhật button state management

### 3. Button State Management

**Function `setButtonLoading(button, loading, type)`:**
- Hỗ trợ type 'test' và 'cart'
- Loading text khác nhau cho từng type

**Function `setButtonSuccess(button, type)`:**
- Success state khác nhau cho test vs cart
- Cart: hiển thị success 2s rồi redirect cart
- Test: redirect ngay lập tức

## Workflow

### Gói Miễn Phí (is_free = true):
1. User click "Bắt đầu làm test"
2. Kiểm tra authentication
3. Call API `create-free-access.php`
4. API tạo order dummy + purchased_package
5. Trả về access_code
6. Redirect đến `test?access_code={code}`

### Gói Có Phí (is_free = false):
1. User click "Đăng ký dịch vụ"
2. Workflow cart hiện tại (không thay đổi)

## Database Records Tạo Cho Gói Miễn Phí

### Table `orders`:
```sql
INSERT INTO orders (user_id, total_amount, status, payment_status, payment_method, order_code)
VALUES (?, 0.00, 'completed', 'paid', 'free', 'FREE_YmdHis_userId')
```

### Table `order_items`:
```sql
INSERT INTO order_items (order_id, product_id, package_id, quantity, unit_price, total_price, product_name, package_name)
VALUES (orderId, productId, packageId, 1, 0.00, 0.00, productName, packageName)
```

### Table `purchased_packages`:
```sql
INSERT INTO purchased_packages (
    user_id, order_id, package_id, access_code,
    package_name, product_name, product_type, package_price,
    status, access_starts_at, first_accessed_at
) VALUES (userId, orderId, packageId, accessCode, packageName, productName, productType, 0.00, 'active', NOW(), NOW())
```

## Test

**Test Page:** `/test-package-detail`

Trang test cung cấp:
- Link test gói miễn phí (ID: 1)
- Link test gói có phí (ID: 2)
- API test form
- Checklist các features đã implement

## Security Features

1. **Authentication Check:** API yêu cầu user đăng nhập
2. **Package Validation:** Chỉ xử lý gói miễn phí và active
3. **Duplicate Prevention:** Kiểm tra user đã có access chưa
4. **Transaction Safety:** Sử dụng database transaction

## Lưu ý

- API chỉ hoạt động với gói có `is_free = 1`
- Access code có format: `TST_{userId}_{timestamp}_{packageId}` cho career_test
- Trang test cần implement để xử lý access_code parameter
- User có thể có nhiều access_code cho cùng một package (nếu cần)