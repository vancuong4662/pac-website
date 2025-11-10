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
2. Quản lý gói (btn-outline-primary, icon: box)
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
- `viewConsultationDetails()`: Load và hiển thị detail modal
- `showConsultationDetailModal()`: Tạo dynamic modal với dual editors
- `initDetailQuillEditor()`: Khởi tạo và load HTML content
- `updateConsultationFromModal()`: Thu thập data và cập nhật

### Database Schema Dependencies
Hệ thống phụ thuộc vào:
- `products` table structure
- `product_packages` relationship
- HTML content trong `full_description` và `learning_outcomes`

---

**Tác giả**: PAC Development Team  
**Ngày tạo**: 2025-11-10  
**Phiên bản**: 1.0  
**Status**: Production Ready ✅