# Hệ Thống Upload Hình Ảnh - Admin Panel

## Tổng Quan

Hệ thống upload hình ảnh được thiết kế để quản lý và lưu trữ các file media trong admin panel. Hệ thống cung cấp giao diện thân thiện, bảo mật cao và tích hợp chặt chẽ với cơ sở dữ liệu.

## Kiến Trúc Hệ Thống

### 1. Frontend (Upload Interface)
- **File**: `templates/admin/uploadimg.html`
- **Chức năng**: Giao diện upload với drag & drop, preview, và quản lý file
- **Công nghệ**: HTML5, Bootstrap 5, Vanilla JavaScript

### 2. Backend API
- **File**: `api/admin/upload.php`
- **Chức năng**: Xử lý upload, validation, và lưu trữ database
- **Bảo mật**: File validation, random naming, size limits

### 3. Database Schema
- **Table**: `media_files`
- **File**: `sql/create-all-tables.sql`
- **Chức năng**: Tracking metadata của các file đã upload

## Tính Năng Chính

### Upload Interface
- **Drag & Drop**: Kéo thả file trực tiếp vào vùng upload
- **File Selection**: Chọn file qua dialog browser
- **Preview**: Xem trước ảnh ngay sau khi chọn
- **Progress Tracking**: Thanh tiến trình upload real-time
- **Validation**: Kiểm tra loại file, kích thước, dimensions

### File Management
- **Auto Naming**: Tự động tạo tên file unique để tránh conflict
- **URL Generation**: Tạo URL công khai cho file đã upload
- **Copy to Clipboard**: Sao chép URL một clic
- **Metadata Tracking**: Lưu thông tin chi tiết file trong database

## Cấu Trúc File

```
pac-new/
├── api/admin/upload.php          # API xử lý upload
├── templates/admin/uploadimg.html # Giao diện upload
├── uploads/                      # Thư mục lưu file (auto-created)
├── sql/create-all-tables.sql     # Schema database
└── docs/admin-uploadimg.md       # Tài liệu này
```

## Database Schema

### Bảng `media_files`

```sql
CREATE TABLE media_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INT,
    height INT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    category VARCHAR(50),
    description TEXT,
    status ENUM('active', 'deleted') DEFAULT 'active'
);
```

## API Endpoints

### POST `/api/admin/upload`

**Mô tả**: Upload file hình ảnh và lưu metadata

**Parameters**:
- `file`: File upload (multipart/form-data)
- `name`: Tên mô tả cho file (optional)
- `category`: Danh mục file (optional)

**Response**:
```json
{
    "success": true,
    "file_id": 123,
    "file_url": "http://domain.com/uploads/abc123.jpg",
    "original_name": "image.jpg",
    "file_size": 245760,
    "dimensions": {
        "width": 1920,
        "height": 1080
    }
}
```

**Error Response**:
```json
{
    "success": false,
    "error": "File type not allowed"
}
```

## Validation Rules

### File Types
- **Allowed**: JPG, JPEG, PNG, GIF, WebP
- **MIME Types**: image/jpeg, image/png, image/gif, image/webp

### Size Limits
- **Max File Size**: 5MB (configurable)
- **Max Dimensions**: 4000x4000px (configurable)
- **Min Dimensions**: 50x50px (configurable)

### Security
- **File Extension**: Kiểm tra cả extension và MIME type
- **Content Validation**: Verify file header để tránh file giả mạo
- **Random Naming**: Tên file được tạo ngẫu nhiên để tránh conflict và đoán URL

## Tích Hợp Với Admin Panel

### Consultations Management
- **File**: `assets/js/admin/consultations.js`
- **Integration**: Nút "Upload Hình" mở popup upload
- **Callback**: Nhận URL qua window messaging

### Usage Example
```javascript
// Mở upload window
const uploadWindow = window.open('/admin-uploadimg', 'uploadimg', 'width=800,height=600');

// Lắng nghe callback
window.addEventListener('message', (event) => {
    if (event.data.type === 'imageUploaded') {
        const imageUrl = event.data.imageUrl;
        // Sử dụng URL trong Quill editor hoặc nơi khác
    }
});
```

## Cấu Hình

### Upload Directory
- **Default**: `uploads/` (tương đối với document root)
- **Permissions**: 755 for directory, 644 for files
- **Auto Creation**: Thư mục được tạo tự động nếu chưa tồn tại

### URL Configuration
- **Base URL**: Tự động detect từ `$_SERVER` variables
- **Public Path**: `/uploads/filename.ext`
- **Full URL**: `http://domain.com/uploads/filename.ext`

## Error Handling

### Client-side Errors
- File type không hợp lệ
- File quá lớn
- Kết nối mạng bị gián đoạn

### Server-side Errors
- Lỗi upload (disk space, permissions)
- Database connection errors
- Validation failures

### Error Display
- Toast notifications cho errors
- Progress bar reset on failure
- Detailed error messages

## Performance Optimization

### Image Processing
- **Auto Resize**: Tùy chọn resize ảnh lớn
- **Quality Optimization**: Compress JPEG với quality 85%
- **Format Conversion**: Convert sang WebP nếu browser hỗ trợ

### Caching
- **Browser Cache**: Set proper cache headers cho uploaded files
- **CDN Ready**: URL structure tương thích với CDN

## Security Considerations

### File Upload Security
- **Type Validation**: Kiểm tra MIME type và file header
- **Size Limits**: Prevent DoS attacks qua large files
- **Directory Traversal**: Ngăn chặn path injection
- **Execution Prevention**: .htaccess ngăn execute uploaded files

### Access Control
- **Admin Only**: Chỉ admin có quyền upload
- **Session Validation**: Kiểm tra session trước khi upload
- **CSRF Protection**: Token validation (có thể thêm)

## Troubleshooting

### Common Issues

1. **Upload Failed - "File too large"**
   - Kiểm tra `upload_max_filesize` trong php.ini
   - Kiểm tra `post_max_size` trong php.ini
   - Kiểm tra disk space

2. **Upload Failed - "Permission denied"**
   - Đảm bảo thư mục uploads có permission 755
   - Kiểm tra owner/group của thư mục
   - Kiểm tra SELinux nếu có

3. **Image không hiển thị**
   - Kiểm tra URL path
   - Kiểm tra .htaccess rules
   - Kiểm tra file permissions

### Debug Mode
```php
// Trong upload.php, uncomment để debug
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## Roadmap & Enhancements

### Planned Features
- **Media Library**: Browse và quản lý uploaded files
- **Bulk Upload**: Upload multiple files cùng lúc
- **Image Editing**: Crop, resize, filters
- **Cloud Storage**: Integration với AWS S3, Google Cloud
- **CDN Integration**: Automatic CDN distribution

### Performance Improvements
- **Lazy Loading**: Load large image lists
- **Thumbnail Generation**: Auto-generate thumbnails
- **Progressive Upload**: Chunk upload cho files lớn

## Support & Contact

Để được hỗ trợ hoặc báo cáo bug:
- Tạo issue trong repository
- Email: admin@pac-website.com
- Documentation updates: Cập nhật file này khi có thay đổi

---

**Cập nhật lần cuối**: November 10, 2025
**Version**: 1.0.0
**Tương thích**: PHP 7.4+, MySQL 5.7+