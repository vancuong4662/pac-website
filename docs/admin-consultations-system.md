# Hệ thống Admin Consultations - Documentation

## Tổng quan

Hệ thống quản lý dịch vụ tư vấn trong admin panel đã được cải tiến để hỗ trợ:
- Bảng hiển thị tối ưu (5 cột thay vì 9 cột)
- Modal chỉnh sửa chi tiết với multiple Quill editors
- API tích hợp với database schema mới
- Xử lý HTML content cho các trường mô tả

## Cấu trúc Database

### Bảng `products`
Sử dụng bảng `products` với các trường chính:
- `id`: Primary key
- `name`: Tên dịch vụ
- `short_description`: Mô tả ngắn (TEXT)
- `full_description`: Mô tả chi tiết (LONGTEXT, HTML)
- `learning_outcomes`: Kết quả mong đợi (LONGTEXT, HTML)
- `duration`: Thời lượng dịch vụ
- `type`: Loại sản phẩm ('consultation', 'career_test')
- `image_url`: URL hình ảnh
- `status`: Trạng thái ('active', 'inactive')

## Frontend - Table Rendering

### Cấu trúc bảng (5 cột)
1. **Tên Dịch vụ**: Hiển thị tên + status badge + package count
2. **Hình ảnh**: Preview ảnh hoặc placeholder
3. **Mô tả**: Text truncated từ `short_description` (100 ký tự)
4. **Loại Tư vấn**: Badge hiển thị consultation_type
5. **Thao tác**: 3 nút action (Xem chi tiết, Quản lý gói, Xóa)

### Action Buttons
```javascript
// 3 nút chính trong mỗi row
1. Xem chi tiết (btn-outline-info, icon: eye)
2. Quản lý gói (btn-outline-primary, icon: box) - NEW: Packages Management Modal
3. Xóa dịch vụ (btn-outline-danger, icon: trash)
```

## Detail Modal System

### Modal Structure
Modal chi tiết được tạo động (dynamic modal) với các phần:

#### 1. Basic Information
- Tên dịch vụ (required)
- Loại tư vấn (dropdown: automated/expert)
- Trạng thái (active/inactive)

#### 2. Media Section
- URL hình ảnh với live preview
- Error handling khi không load được ảnh

#### 3. Duration & Descriptions
- **Thời lượng**: Input text đơn giản
- **Mô tả ngắn**: Textarea (plain text)
- **Mô tả chi tiết**: Quill Editor (HTML content)
- **Kết quả mong đợi**: Quill Editor (HTML content)

## Quill Editor Implementation

### Dual Editor Setup
Mỗi modal có 2 Quill editors độc lập:

#### 1. Full Description Editor
```javascript
detailQuillEditor = new Quill('#detail-description-editor', {
    theme: 'snow',
    placeholder: 'Nhập mô tả chi tiết về dịch vụ...',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link', 'blockquote'],
            ['clean']
        ]
    }
});
```

#### 2. Learning Outcomes Editor
```javascript
window.detailLearningOutcomesEditor = new Quill('#detail-learning-outcomes-editor', {
    theme: 'snow',
    placeholder: 'Nhập kết quả mong đợi sau khi sử dụng dịch vụ...',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['link'],
            ['clean']
        ]
    }
});
```

### HTML Content Loading
Sử dụng phương pháp kép để load HTML content:

```javascript
setTimeout(() => {
    try {
        // Ưu tiên clipboard.dangerouslyPasteHTML cho HTML parsing tốt hơn
        detailQuillEditor.clipboard.dangerouslyPasteHTML(0, htmlContent);
    } catch (error) {
        // Fallback về root.innerHTML nếu clipboard fails
        detailQuillEditor.root.innerHTML = htmlContent;
    }
}, 100);
```

**Lý do sử dụng setTimeout 100ms**: Đảm bảo Quill editor đã được khởi tạo hoàn toàn trước khi set content.

## Packages Management System

### Packages Modal Overview
Hệ thống quản lý packages được triển khai như một modal độc lập với khả năng:
- Hiển thị danh sách packages dưới dạng grid cards
- Chỉnh sửa package details trực tiếp trong modal
- Upload hình ảnh tích hợp
- Xóa packages với confirmation

### Modal Structure
Modal packages có cấu trúc 2 phần chính:

#### 1. Packages Grid Section
```javascript
// Hiển thị packages dạng cards 3 cột
function renderPackagesGrid(packages) {
    // Grid layout với hover effects
    // Mỗi card có: tên, giá, trạng thái, action buttons
}
```

#### 2. Package Details Section  
```javascript
// Form chỉnh sửa package với các trường:
- package_name: Input text (required)
- package_slug: Input text với validation format
- original_price: Number input
- sale_price: Number input (optional)
- is_free: Toggle switch với logic tự động
- image_url: Text input + upload button
- status: Toggle switch
- package_description: Quill Editor (HTML)
```

### Package Cards Features
Mỗi package card trong grid có:
- **Visual Design**: Hover effects với transform và shadow
- **Price Display**: Hiển thị giá với format tiền tệ VND
- **Status Badges**: Active/Inactive với color coding
- **Action Buttons**: 
  - Eye icon: Xem chi tiết
  - Trash icon: Xóa package

### Package Description Editor
Sử dụng Quill Editor riêng cho package description:

```javascript
let packageDescriptionEditor = null;

function initPackageDescriptionEditor(htmlContent) {
    packageDescriptionEditor = new Quill('#package-description-editor', {
        theme: 'snow',
        placeholder: 'Nhập mô tả chi tiết cho gói dịch vụ...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'blockquote'],
                ['clean']
            ]
        }
    });
    
    // Load HTML content using same method as consultations
    if (htmlContent) {
        setTimeout(() => {
            try {
                packageDescriptionEditor.clipboard.dangerouslyPasteHTML(0, htmlContent);
            } catch (error) {
                packageDescriptionEditor.root.innerHTML = htmlContent;
            }
        }, 100);
    }
}
```

### Smart Form Logic

#### 1. Free Package Toggle
```javascript
function checkFreeStatus() {
    // Tự động tắt "Miễn phí" khi user nhập giá
    const originalPrice = parseFloat(document.getElementById('pkg-original-price').value) || 0;
    const salePrice = parseFloat(document.getElementById('pkg-sale-price').value) || 0;
    
    if (originalPrice > 0 || salePrice > 0) {
        document.getElementById('pkg-is-free').checked = false;
    }
}

function toggleFreeStatus() {
    // Xóa giá khi chọn "Miễn phí"
    if (document.getElementById('pkg-is-free').checked) {
        document.getElementById('pkg-original-price').value = '0';
        document.getElementById('pkg-sale-price').value = '';
    }
}
```

#### 2. Image Upload Integration
```javascript
function openUploadModal(targetInputId) {
    // Tích hợp với modal upload hình ảnh có sẵn
    window.uploadTargetInputId = targetInputId;
    const uploadWindow = window.open('admin-uploadimg', 'uploadimg', 'width=800,height=600');
    
    // Listen for callback từ upload modal
    const messageHandler = (event) => {
        if (event.data && event.data.type === 'imageUploaded') {
            document.getElementById(targetInputId).value = event.data.imageUrl;
            updateImagePreview(event.data.imageUrl);
        }
    };
}
```

### Package API Integration

#### Endpoint: `api/admin/packages.php`

#### GET Packages by Product
```
GET /api/admin/packages.php?product_id=1
```
Response:
```json
{
    "success": true,
    "data": {
        "product": { "id": 1, "name": "Product Name" },
        "packages": [
            {
                "id": 1,
                "package_name": "Gói cơ bản",
                "package_slug": "goi-co-ban",
                "original_price": 100000,
                "sale_price": null,
                "is_free": false,
                "price_display": "100.000₫",
                "status": "active",
                "package_description": "<p>Mô tả HTML</p>"
            }
        ]
    }
}
```

#### PUT Update Package
```javascript
// Request payload for package update
{
    id: 1,
    package_name: "Gói cập nhật",
    package_slug: "goi-cap-nhat", 
    original_price: 150000,
    sale_price: 120000,
    is_free: false,
    image_url: "assets/img/package.jpg",
    status: "active",
    package_description: "<h3>Mô tả HTML đã cập nhật</h3>"
}
```

#### DELETE Package
```javascript
// Request payload for package deletion
{
    id: 1
}
```

### Packages Data Flow

#### 1. Load Packages Process
```
managePackages(productId)
→ showPackagesModal(productId)
→ API: GET packages.php?product_id=X
→ renderPackagesGrid()
→ Auto-select first package
```

#### 2. Package Details View
```
viewPackageDetails(packageId, productId)
→ API: GET packages.php?id=packageId
→ renderPackageDetails() (editable form)
→ initPackageDescriptionEditor()
→ initPackageFormListeners()
```

#### 3. Package Update Process
```
updatePackageFromForm(event, packageId)
→ Collect form data + Quill editor content
→ API: PUT packages.php
→ Success toast + page reload
```

#### 4. Package Delete Process
```
deletePackage(packageId, packageName)
→ Confirmation dialog
→ API: DELETE packages.php
→ Success toast + page reload
```

### UI/UX Enhancements

#### 1. Visual Feedback
- **Card Selection**: Border highlight cho package được chọn
- **Hover Effects**: Transform và shadow animation
- **Loading States**: Spinner buttons và loading toasts
- **Status Indicators**: Color-coded badges và toggle switches

#### 2. Form Validation
- **Slug Validation**: Format hints (chỉ chữ thường, số, dấu gạch ngang)
- **Price Logic**: Auto-disable free khi có giá
- **Required Fields**: Visual indicators và validation
- **Image Preview**: Live preview khi nhập URL

#### 3. Error Handling
- **API Errors**: Toast notifications với error messages
- **Network Issues**: Connection error handling
- **Validation Errors**: Field-level error display
- **Confirmation Dialogs**: Destructive actions (delete)

### Performance Optimizations

#### 1. Modal Management
- **Dynamic Creation**: Tránh DOM pollution
- **Proper Cleanup**: Remove modal khi đóng
- **Event Delegation**: Efficient event handling
- **Memory Management**: Cleanup Quill editors

#### 2. Data Loading
- **Lazy Loading**: Chỉ load khi cần
- **Caching Strategy**: Store dữ liệu trong modal attributes
- **Minimal API Calls**: Reuse data khi có thể
- **Optimistic Updates**: Fast UI feedback

#### 3. Image Handling
- **Preview Optimization**: Max size constraints
- **Error Fallbacks**: Hide broken images
- **Upload Integration**: Seamless modal communication
- **Path Flexibility**: Support relative paths

### Integration with Upload System

Packages management tích hợp với hệ thống upload hình ảnh:
- **Upload Button**: Mở modal upload trong popup window
- **Callback Handling**: Window messaging để nhận URL
- **Preview Update**: Tự động cập nhật preview khi upload
- **Path Support**: Hỗ trợ cả absolute và relative paths

## API Integration

### Endpoint: `api/admin/consultations.php`

#### GET Single Consultation
```
GET /api/admin/consultations.php?id=1
```
Trả về đầy đủ thông tin bao gồm `full_description` và `learning_outcomes`.

#### PUT Update Consultation
```javascript
// Request payload
{
    id: 1,
    name: "Tên dịch vụ",
    consultation_type: "automated",
    status: "active",
    image_url: "https://...",
    duration: "30 phút",
    short_description: "Mô tả ngắn",
    full_description: "<h3>HTML content...</h3>",
    learning_outcomes: "<ul><li>Kết quả 1</li></ul>"
}
```

### Database Update Logic
```php
// API xử lý update 2 trường HTML content riêng biệt
$stmt = $pdo->prepare("
    UPDATE products SET 
        name = ?, consultation_type = ?, status = ?, 
        image_url = ?, duration = ?, 
        short_description = ?, full_description = ?, learning_outcomes = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND (type = 'consultation' OR type = 'career_test')
");
```

## Data Flow

### 1. Table Load Process
```
loadConsultations() 
→ API: GET consultations.php 
→ renderConsultations() 
→ Store data in window.consultationsData
```

### 2. Detail View Process  
```
viewConsultationDetails(id)
→ API: GET consultations.php?id=X (fetch full data)
→ showConsultationDetailModal()
→ initDetailQuillEditor() (dual editors)
→ Load HTML content với clipboard.dangerouslyPasteHTML()
```

### 3. Update Process
```
updateConsultationFromModal()
→ Collect data từ form + Quill editors
→ API: PUT consultations.php
→ Close modal + reload table
```

### 4. Packages Management Flow
```
managePackages(productId)
→ showPackagesModal(productId)
→ renderPackagesGrid() + auto-select first
→ viewPackageDetails(packageId) → editable form
→ updatePackageFromForm() → API call + page reload
→ deletePackage() → confirmation + API call + page reload
```

## Error Handling & User Experience

### Loading States
- Toast notification khi load detail
- Spinner button khi update
- Loading spinner trong bảng

### HTML Content Validation
- Kiểm tra content không empty
- Fallback parsing nếu clipboard API fails
- Debug console.log để tracking HTML content

### Modal Cleanup
```javascript
// Proper cleanup khi modal đóng
modal.addEventListener('hidden.bs.modal', () => {
    if (detailQuillEditor) detailQuillEditor = null;
    if (window.detailLearningOutcomesEditor) window.detailLearningOutcomesEditor = null;
    document.body.removeChild(modal);
});
```

## Console Warnings - Non-Critical Issues

### Quill Editor Deprecation Warning
```
[Deprecation] Listener added for a 'DOMNodeInserted' mutation event. 
Support for this event type has been removed...
```

**Nguyên nhân**: Quill editor phiên bản hiện tại sử dụng deprecated `DOMNodeInserted` API.

**Ảnh hưởng**:
- ✅ **Hiện tại**: Chỉ là warning, không ảnh hưởng tính năng
- ⚠️ **Tương lai**: Có thể ảnh hưởng một số tính năng Quill khi browser loại bỏ hoàn toàn
- 📊 **Performance**: API cũ chậm hơn MutationObserver mới

**Giải pháp**:
- Cập nhật Quill lên version 2.0+ (recommended)
- Hoặc ignore warning này vì không critical

### Browser Extension Warnings
Các warning khác trong console thường do browser extensions và không ảnh hưởng đến hệ thống.

## Technical Specifications

### Dependencies
- **Quill.js**: Rich text editor
- **Bootstrap 5**: UI components & modal system
- **FontAwesome**: Icons
- **Custom toastbar.js**: Notification system

### Browser Support
- Modern browsers supporting ES6+
- Quill.js clipboard API
- Bootstrap 5 modal system

### Performance Considerations
- Dynamic modal creation (tránh DOM pollution)
- Proper editor cleanup
- Efficient HTML content loading
- Minimal API calls (chỉ fetch detail khi cần)

## Future Improvements

1. **Quill Editor**: Upgrade to version 2.0+
2. **Image Upload**: Thay thế URL input bằng file upload
3. **Auto-save**: Tự động lưu draft content
4. **Validation**: Enhanced client-side validation
5. **Accessibility**: Thêm ARIA labels và keyboard navigation

## Maintenance Notes

### Code Organization
- Main logic: `assets/js/admin/consultations.js`
- API endpoint: `api/admin/consultations.php`
- HTML template: `templates/admin/consultations.html`

### Key Functions

#### Consultations Management
- `viewConsultationDetails()`: Load và hiển thị detail modal
- `showConsultationDetailModal()`: Tạo dynamic modal với dual editors
- `initDetailQuillEditor()`: Khởi tạo và load HTML content
- `updateConsultationFromModal()`: Thu thập data và cập nhật

#### Packages Management  
- `managePackages()`: Entry point cho packages modal
- `showPackagesModal()`: Tạo packages modal với grid layout
- `renderPackagesGrid()`: Render packages dạng cards
- `viewPackageDetails()`: Load package detail form
- `renderPackageDetails()`: Render editable package form
- `initPackageDescriptionEditor()`: Khởi tạo Quill cho package description
- `updatePackageFromForm()`: Cập nhật package từ form
- `deletePackage()`: Xóa package với confirmation
- `initPackageFormListeners()`: Setup event listeners cho form
- `checkFreeStatus()`: Logic tự động cho free toggle
- `openUploadModal()`: Tích hợp với upload system

### Database Schema Dependencies
Hệ thống phụ thuộc vào:
- `products` table structure
- `product_packages` relationship và CRUD operations
- HTML content trong `full_description`, `learning_outcomes`, và `package_description`
- Foreign key constraints giữa products và packages
- Status management cho cả products và packages

### Recent Updates (November 2025)

#### Packages Management System
- **Full CRUD Operations**: Create, Read, Update, Delete packages
- **Grid-based Interface**: Modern card layout thay vì table
- **Inline Editing**: Edit packages trực tiếp trong modal
- **Smart Form Logic**: Auto-toggle free status, price validation
- **Upload Integration**: Tích hợp với hệ thống upload hình ảnh
- **Quill Editor**: Rich text editor cho package descriptions
- **Enhanced UX**: Hover effects, loading states, confirmations

#### API Enhancements
- **New Endpoint**: `api/admin/packages.php` cho packages management
- **Comprehensive CRUD**: GET, POST, PUT, DELETE operations
- **Validation Logic**: Business rules và data validation
- **Error Handling**: Detailed error messages và status codes
- **Response Format**: Consistent JSON response structure

#### UI/UX Improvements
- **Row-based Layout**: Thay đổi từ 2-column sang row layout
- **Action Consolidation**: Move action buttons vào package cards
- **Visual Feedback**: Better loading states và success indicators
- **Form Validation**: Real-time validation và error display
- **Page Reload Strategy**: Consistent reload behavior after operations

---

**Tác giả**: PAC Development Team  
**Ngày tạo**: 2025-11-10  
**Cập nhật lần cuối**: 2025-11-11  
**Phiên bản**: 1.1 (Added Packages Management)  
**Status**: Production Ready ✅