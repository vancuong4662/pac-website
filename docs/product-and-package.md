# Hệ thống Product và Package - PAC Website

## 📋 Tổng quan

Hệ thống Product và Package của PAC Website được thiết kế để quản lý đầy đủ các dịch vụ giáo dục hướng nghiệp và khóa học với cấu trúc linh hoạt. Hệ thống hỗ trợ nhiều loại sản phẩm khác nhau với các gói giá đa dạng, từ miễn phí đến cao cấp.

## 🏗️ Kiến trúc Hệ thống

### Cấu trúc chính:
```
Products (Sản phẩm chính)
    ├── Product Packages (Các gói giá)
    ├── Cart System (Giỏ hàng)
    ├── Order Management (Quản lý đơn hàng)
    └── Purchase Tracking (Theo dõi mua hàng)
```

## 📊 Database Schema

### 1. Bảng `products` - Sản phẩm chính
Lưu trữ thông tin cơ bản về các sản phẩm/dịch vụ của PAC.

**Các trường chính:**
- `id`: ID sản phẩm
- `name`: Tên sản phẩm (VD: "Hướng nghiệp trực tuyến")
- `slug`: URL-friendly identifier
- `type`: Loại sản phẩm (`career_test`, `course`, `consultation`)
- `category`: Danh mục con (VD: `assessment`, `writing`, `career_guidance`)
- `short_description`: Mô tả ngắn cho cards/lists
- `full_description`: Mô tả chi tiết (HTML) cho trang detail
- `duration`: Thời lượng (VD: "30 phút", "16 giờ")
- `target_audience`: Đối tượng mục tiêu (JSON array)
- `learning_outcomes`: Kết quả học tập mong đợi
- `curriculum`: Chương trình học chi tiết

**Trường đặc biệt cho Career Tests:**
- `question_count`: Số câu hỏi
- `age_range`: Độ tuổi phù hợp
- `report_pages`: Số trang báo cáo

**Trường đặc biệt cho Courses:**
- `instructor_info`: Thông tin giảng viên
- `teaching_format`: Hình thức giảng dạy (`online`, `offline`, `both`)

### 2. Bảng `product_packages` - Gói giá sản phẩm
Mỗi sản phẩm có thể có nhiều gói giá khác nhau.

**Các trường chính:**
- `id`: ID gói
- `product_id`: Liên kết với sản phẩm chính
- `package_name`: Tên gói (VD: "Gói Miễn phí", "Nhóm 6 học viên")
- `package_slug`: URL-friendly identifier
- `package_description`: Mô tả chi tiết gói (HTML)
- `original_price`: Giá gốc
- `sale_price`: Giá khuyến mãi (NULL nếu không có)
- `is_free`: Boolean - gói miễn phí
- `group_size`: Quy mô nhóm (VD: "1 học viên", "5-6 học viên")
- `special_features`: Tính năng đặc biệt (JSON array)

### 3. Bảng `cart` - Giỏ hàng
Quản lý giỏ hàng với support cho package system.

**Các trường chính:**
- `user_id`: ID người dùng
- `product_id`: ID sản phẩm
- `package_id`: ID gói được chọn (REQUIRED)
- `quantity`: Số lượng (default: 1)

### 4. Hệ thống Orders & Purchase Tracking
**Bảng liên quan:**
- `orders`: Đơn hàng chính
- `order_items`: Chi tiết đơn hàng với package info
- `purchased_courses`: Khóa học đã mua
- `purchased_tests`: Test đã mua
- `consultation_bookings`: Lịch tư vấn đã đặt

## 🎯 Các loại sản phẩm

### 1. Career Tests (`career_test`)
**Mô tả:** Các bài test hướng nghiệp trực tuyến

**Ví dụ sản phẩm:**
- **Hướng nghiệp trực tuyến**
  - Gói Khởi động (Miễn phí): 30 câu hỏi, báo cáo 5 trang
  - Gói Tăng tốc (1.975.000đ): 120 câu hỏi, báo cáo 25-26 trang

**Đặc điểm:**
- Có `question_count` và `report_pages`
- Thường có gói miễn phí và gói premium
- Kết quả lưu trong `purchased_tests`

### 2. Courses (`course`)
**Mô tả:** Các khóa học trực tiếp hoặc trực tuyến

**Ví dụ sản phẩm:**
- **Viết luận tăng cường** (16 giờ)
  - Nhóm 6 học viên: 5.199.000đ (giảm từ 6.999.000đ)
  - Nhóm 4 học viên: 7.600.000đ (giảm từ 9.999.000đ)  
  - Học cá nhân 1:1: 19.800.000đ (giảm từ 21.000.000đ)

- **Essay Coaching** (10 giờ)
  - Coaching 1:1: 899.000đ (giảm từ 1.299.000đ)

**Đặc điểm:**
- Có `instructor_info` và `teaching_format`
- Packages phân theo quy mô nhóm
- Kết quả lưu trong `purchased_courses`

### 3. Consultations (`consultation`)
**Mô tả:** Dịch vụ tư vấn cá nhân với chuyên gia

**Ví dụ sản phẩm:**
- **Xây dựng CV và Phỏng vấn**
  - Cố vấn Thành viên: 9.900.000đ
  - Cố vấn Cao cấp: 15.900.000đ

- **Hướng nghiệp cùng chuyên gia**
  - Gói Học đường: 14.750.000đ (15-18 tuổi)
  - Gói Toàn diện: 24.750.000đ (14-17 tuổi)

**Đặc điểm:**
- Thường là 1:1 consulting
- Có thể có nhiều giai đoạn tư vấn
- Kết quả lưu trong `consultation_bookings`

## 🔧 API System

### Services API (`/api/services/`)

#### **1. List Services**
```
GET /api/services/list.php
GET /api/services/list.php?type=course
GET /api/services/list.php?include_packages=true
```

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Hướng nghiệp trực tuyến",
      "slug": "huong-nghiep-truc-tuyen",
      "type": "career_test",
      "category": "assessment",
      "short_description": "...",
      "duration": "30-45 phút",
      "image_url": "assets/img/pic/...",
      "packages": [...]
    }
  ]
}
```

#### **2. Service Detail**
```
GET /api/services/detail.php?slug=huong-nghiep-truc-tuyen
GET /api/services/detail.php?id=1
```

#### **3. Package Detail**
```
GET /api/services/package-detail.php?package_id=2
```

**Response bao gồm:**
- Thông tin package chi tiết
- Thông tin sản phẩm liên quan
- Giá đã tính discount và savings

#### **4. Packages by Product**
```
GET /api/services/packages.php?product_id=2
```

#### **5. Services by Type**
```
GET /api/services/by-type.php?type=course
GET /api/services/by-type.php?type=consultation&limit=5
```

### Cart API (`/api/cart/`)

#### **Đặc điểm quan trọng:**
- **Tất cả endpoints require authentication**
- **Package-based cart**: Phải chọn specific package, không thể add product chung chung
- **User isolation**: Mỗi user chỉ thấy cart của mình

#### **Endpoints:**
```
GET  /api/cart/get.php                 # Lấy giỏ hàng
POST /api/cart/add.php                 # Thêm package vào giỏ
PUT  /api/cart/update.php?id={cart_id} # Cập nhật quantity
DELETE /api/cart/remove.php?id={cart_id} # Xóa item
DELETE /api/cart/clear.php             # Xóa toàn bộ giỏ
```

#### **Add to Cart Request:**
```json
{
  "product_package_id": 2,  // Package ID (không phải product ID)
  "quantity": 1
}
```

#### **Cart Response Structure:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "cart_id": 1,
        "quantity": 1,
        "package_id": 2,
        "package_name": "Gói Tăng tốc",
        "current_price": 1975000,
        "current_price_formatted": "1.975.000₫",
        "subtotal": 1975000,
        "subtotal_formatted": "1.975.000₫",
        "product_name": "Hướng nghiệp trực tuyến",
        "product_type": "career_test"
      }
    ],
    "cart_summary": {
      "total_items": 1,
      "total_quantity": 1,
      "total_amount": 1975000,
      "total_formatted": "1.975.000₫"
    }
  }
}
```

## 💰 Price Calculation Logic

### Automatic Price Fields
Hệ thống tự động tính toán các trường giá:

```php
// Trong package response
"final_price": sale_price || original_price,
"discount_percent": Math.round((original_price - final_price) / original_price * 100),
"savings": original_price - final_price,
"has_discount": sale_price !== null && sale_price > 0
```

### Price Display Examples:
- **Gói miễn phí:** `is_free = true` → Display "Miễn phí"
- **Không khuyến mãi:** `sale_price = null` → Display original_price
- **Có khuyến mãi:** `sale_price < original_price` → Display both với strikethrough

## 🎨 Frontend Integration

### Trang danh sách sản phẩm
```javascript
// Load courses
fetch('/api/services/by-type.php?type=course')
  .then(response => response.json())
  .then(data => renderCourseCards(data.data));
```

### Trang chi tiết sản phẩm  
```javascript
// Load package detail
fetch(`/api/services/package-detail.php?package_id=${packageId}`)
  .then(response => response.json())
  .then(data => renderPackageDetail(data.data));
```

### Add to Cart
```javascript
// Add package to cart
async function addToCart(packageId, quantity = 1) {
  const response = await fetch('/api/cart/add.php', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_package_id: packageId,
      quantity: quantity
    })
  });
  
  const result = await response.json();
  if (result.success) {
    showToast('Thành công', result.message, 'success');
    // Redirect to cart or update UI
  }
}
```

## 🔄 Business Flows

### 1. User Browse & Purchase Flow
```
1. User visits category page → API: /services/by-type.php
2. User clicks on product → API: /services/detail.php  
3. User views package options → Already included in step 2
4. User clicks "Add to Cart" → API: /cart/add.php
5. User views cart → API: /cart/get.php
6. User proceeds to checkout → Order APIs
```

### 2. Package Selection Logic
```
Product "Viết luận tăng cường"
├── Package "Nhóm 6" (5.199.000đ) ← User selects this
├── Package "Nhóm 4" (7.600.000đ)
└── Package "1:1" (19.800.000đ)

Cart stores: product_id=2, package_id=3, quantity=1
```

### 3. Price Calculation Example
```
Package: "Gói Tăng tốc"
├── original_price: 1.975.000đ
├── sale_price: null
├── is_free: false
└── Calculated:
    ├── final_price: 1.975.000đ
    ├── discount_percent: 0
    ├── savings: 0
    └── has_discount: false
```

## 🔒 Security & Validation

### API Security
- **Authentication required** cho tất cả cart operations
- **User isolation** - chỉ thao tác với data của mình
- **Input validation** với PHP filter functions
- **SQL injection protection** với prepared statements

### Business Rules
- **Package validation**: Chỉ add packages của active products
- **Quantity limits**: 1-10 per cart item
- **Price consistency**: Lưu snapshot giá tại thời điểm mua
- **Cart persistence**: Lưu trong DB, không phải session

## 📈 Performance Optimizations

### Database Indexes
```sql
-- Products
INDEX idx_products_type (type)
INDEX idx_products_status (status)
INDEX idx_products_slug (slug)

-- Packages  
INDEX idx_packages_product_id (product_id)
INDEX idx_packages_status (status)

-- Cart
INDEX idx_cart_user_id (user_id)
INDEX idx_cart_package_id (package_id)
```

### Caching Strategy
- **API responses** có thể cache 5-10 phút
- **Cart data** không cache (real-time)
- **Product images** static caching với CDN

## 🚀 Deployment Notes

### File Structure
```
api/
├── services/          # Product & Package APIs
│   ├── list.php      # Danh sách sản phẩm
│   ├── detail.php    # Chi tiết sản phẩm
│   ├── package-detail.php # Chi tiết package
│   └── packages.php  # Packages của product
├── cart/             # Cart Management APIs
│   ├── get.php       # Lấy giỏ hàng
│   ├── add.php       # Thêm vào giỏ
│   ├── update.php    # Cập nhật quantity
│   ├── remove.php    # Xóa item
│   └── clear.php     # Xóa toàn bộ
└── orders/           # Order Processing APIs
```

### Environment Requirements
- **PHP 7.4+** với PDO extension
- **MySQL 5.7+** hoặc MariaDB 10.3+
- **Session management** cho authentication
- **URL rewriting** cho friendly URLs

## 🧪 Testing

### API Testing
Mỗi API folder có file `test.html` để test endpoints:
- `/api/services/test.html` - Test product APIs
- `/api/cart/test.html` - Test cart functionality

### Sample Data
- File `sql/sample-data.sql` chứa dữ liệu demo đầy đủ
- 5 products với 8 packages covering tất cả use cases
- Test user accounts: admin/customer

## 📚 Integration Examples

### Complete Product Display
```javascript
// Component: ProductCard
async function renderProductCard(productId) {
  const response = await fetch(`/api/services/detail.php?id=${productId}`);
  const data = await response.json();
  
  if (data.success) {
    const product = data.data.product;
    const packages = data.data.packages;
    
    return `
      <div class="product-card">
        <h3>${product.name}</h3>
        <p>${product.short_description}</p>
        <div class="packages">
          ${packages.map(pkg => `
            <div class="package" data-package-id="${pkg.package_id}">
              <h4>${pkg.package_name}</h4>
              <span class="price">${pkg.final_price_formatted}</span>
              <button onclick="addToCart(${pkg.package_id})">
                Thêm vào giỏ hàng
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
```

### Cart Integration
```javascript
// Cart Page Integration
class CartManager {
  async loadCart() {
    const response = await fetch('/api/cart/get.php');
    const data = await response.json();
    return data.success ? data.data : null;
  }
  
  async updateQuantity(cartId, quantity) {
    const response = await fetch(`/api/cart/update.php?id=${cartId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    });
    return response.json();
  }
  
  async removeItem(cartId) {
    const response = await fetch(`/api/cart/remove.php?id=${cartId}`, {
      method: 'DELETE'
    });
    return response.json();
  }
}
```

---

## 📞 Support

Để hỗ trợ và câu hỏi về hệ thống:
- **Technical**: Xem file README.md trong từng API folder
- **Business Logic**: Tham khảo file `sample-data.sql` cho use cases
- **Database**: Xem `create-all-tables.sql` cho schema details

**Version**: 2.0 (Updated October 2025)
**Database Schema**: PAC Shopping Cart v2.0 với Package Support
