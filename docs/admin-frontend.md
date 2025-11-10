# Admin Frontend Implementation Guide - PAC Group

*Hướng dẫn triển khai frontend cho các trang admin dựa trên cấu trúc admin consultations*

## 🏗️ Cấu trúc tổng quan Admin Panel

### 📁 File Structure
```
templates/admin/
├── dashboard.html          # Trang chính admin
├── consultations.html      # Quản lý dịch vụ tư vấn (REFERENCE)
├── courses.html           # Quản lý khóa học  
├── tests.html             # Quản lý trắc nghiệm
├── orders.html            # Quản lý đơn hàng
├── users.html             # Quản lý tài khoản
└── settings.html          # Cài đặt website

components/admin/
└── sidebar.html           # Sidebar component (SHARED)

assets/css/
├── admin.css             # Admin styles (SHARED)
└── main.css              # Global styles + Brand colors

assets/js/admin/
├── sidebar.js            # Sidebar functionality (SHARED)
├── consultations.js      # Consultations logic (REFERENCE)
├── courses.js            # Courses logic  
├── tests.js              # Tests logic
├── orders.js             # Orders logic
├── users.js              # Users logic
└── settings.js           # Settings logic
```

## 🎨 UI/UX Design System

### Brand Colors Integration
Sử dụng PAC Group brand colors từ `brand-colors.md`:
```css
/* Primary Colors */
--brand-primary: #964bdf;     /* PAC Purple */
--brand-secondary: #5d2e8b;   /* PAC Dark Purple */
--brand-accent: #fff200;      /* PAC Yellow */
```

### Color Usage trong Admin:
- **Primary Purple (`#964bdf`)**: Sidebar gradient, primary buttons, action buttons
- **Dark Purple (`#5d2e8b`)**: Sidebar gradient, hover states, secondary elements
- **Yellow (`#fff200`)**: Active indicators, highlights, accent elements
- **Gradients**: `linear-gradient(135deg, #964bdf, #5d2e8b)` cho header và buttons

## 📋 HTML Template Structure

### 1. Basic Admin Page Template
```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - [Page Title] - PAC Group</title>
  
  <!-- Favicons -->
  <link href="assets/img/favicon.png" rel="icon">
  
  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- CSS Files -->
  <link href="assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
  <link href="assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
  <link href="assets/vendor/fontawesome-free/css/all.min.css" rel="stylesheet">
  <link href="assets/css/main.css" rel="stylesheet">
  <link href="assets/css/admin.css" rel="stylesheet">
  <link href="assets/css/toastbar.css" rel="stylesheet">
</head>

<body class="admin-page">
  <div class="admin-wrapper">
    <!-- Sidebar -->
    <aside class="sidebar-wrapper">
      <div id="admin-sidebar"></div>
    </aside>
    
    <!-- Main Content -->
    <main class="main-content">
      <div class="content-area">
        <div id="admin-content">
          <!-- Page Header -->
          <div class="page-header">
            <!-- Header content -->
          </div>
          
          <!-- Filter/Search Section (Optional) -->
          <div class="card mb-4">
            <!-- Filters -->
          </div>
          
          <!-- Main Content Card -->
          <div class="card">
            <!-- Page content -->
          </div>
        </div>
      </div>
    </main>
  </div>
  
  <!-- Modals -->
  <!-- Add/Edit Modal -->
  <!-- Delete Confirmation Modal -->
  
  <!-- Scripts -->
  <script src="assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
  <script src="assets/js/toastbar.js"></script>
  
  <!-- Component Loader -->
  <script>
    document.addEventListener('DOMContentLoaded', async function() {
      try {
        const response = await fetch('components/admin/sidebar.html');
        const html = await response.text();
        document.getElementById('admin-sidebar').innerHTML = html;
      } catch (error) {
        console.error('Error loading sidebar:', error);
      }
    });
  </script>
  
  <!-- Page Scripts -->
  <script src="assets/js/admin/sidebar.js"></script>
  <script src="assets/js/admin/[page-name].js"></script>
</body>
</html>
```

### 2. Page Header Pattern
```html
<div class="page-header">
  <div class="row align-items-center">
    <div class="col">
      <h2><i class="fas fa-[icon] me-2 text-primary"></i>[Page Title]</h2>
      <p class="text-muted mb-0">[Page Description]</p>
    </div>
    <div class="col-auto">
      <button class="btn btn-primary" id="add-[entity]-btn">
        <i class="fas fa-plus me-2"></i>Thêm [Entity]
      </button>
    </div>
  </div>
</div>
```

### 3. Filter Section Pattern  
```html
<div class="card mb-4">
  <div class="card-body">
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label">Trạng thái</label>
        <select class="form-select" id="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Không hoạt động</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Tìm kiếm</label>
        <input type="text" class="form-control" id="search-input" placeholder="Từ khóa...">
      </div>
      <div class="col-md-4">
        <label class="form-label">&nbsp;</label>
        <div>
          <button class="btn btn-outline-primary" id="apply-filters">
            <i class="fas fa-search me-1"></i>Tìm kiếm
          </button>
          <button class="btn btn-outline-secondary" id="reset-filters">
            <i class="fas fa-undo me-1"></i>Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 4. Table Pattern
```html
<div class="card">
  <div class="card-body">
    <div class="table-responsive">
      <table class="table table-hover" id="[entity]-table">
        <thead>
          <tr>
            <th style="width: 80px;">ID</th>
            <th style="width: 200px;">[Main Field]</th>
            <!-- Other columns -->
            <th style="width: 120px;">Thao tác</th>
          </tr>
        </thead>
        <tbody id="[entity]-tbody">
          <!-- Loading state -->
          <tr>
            <td colspan="X" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2 text-muted">Đang tải dữ liệu...</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### 5. Modal Patterns

#### Add/Edit Modal
```html
<div class="modal fade" id="[entity]Modal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="[entity]ModalTitle">
          <i class="fas fa-plus-circle me-2"></i>Thêm [Entity]
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form id="[entity]-form">
          <!-- Form fields -->
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="fas fa-times me-1"></i>Hủy bỏ
        </button>
        <button type="button" class="btn btn-primary" id="save-[entity]-btn">
          <i class="fas fa-save me-1"></i>Lưu [Entity]
        </button>
      </div>
    </div>
  </div>
</div>
```

#### Delete Confirmation Modal
```html
<div class="modal fade" id="deleteModal" tabindex="-1">
  <div class="modal-dialog modal-sm">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
        <h5 class="modal-title">
          <i class="fas fa-exclamation-triangle me-2"></i>Xác nhận xóa
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body text-center">
        <i class="fas fa-trash-alt fa-3x text-danger mb-3"></i>
        <p>Bạn có chắc chắn muốn xóa [entity] này?</p>
        <p class="small text-muted">Hành động này không thể hoàn tác!</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
        <button type="button" class="btn btn-danger" id="confirm-delete-btn">
          <i class="fas fa-trash me-1"></i>Xóa
        </button>
      </div>
    </div>
  </div>
</div>
```

## 💻 JavaScript Implementation Patterns

### 1. Manager Class Structure
```javascript
// [Entity]Manager Pattern
let currentEditId = null;
let deleteModal = null;
let [entity]Modal = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    initModals();
    
    // Load data on page load
    load[Entity]s();
    
    // Initialize events
    initModalEvents();
    initFilterEvents();
});

function initModals() {
    const [entity]ModalEl = document.getElementById('[entity]Modal');
    const deleteModalEl = document.getElementById('deleteModal');
    
    if ([entity]ModalEl) {
        [entity]Modal = new bootstrap.Modal([entity]ModalEl);
    }
    
    if (deleteModalEl) {
        deleteModal = new bootstrap.Modal(deleteModalEl);
    }
}
```

### 2. Data Loading Pattern
```javascript
async function load[Entity]s() {
    showLoading();
    
    try {
        const response = await fetch('api/admin/[entity].php');
        const result = await response.json();
        
        if (result.success) {
            render[Entity]s(result.data || []);
        } else {
            showErrorState(result.message || 'Không thể tải dữ liệu');
        }
    } catch (error) {
        console.error('Error loading [entity]s:', error);
        showErrorState('Lỗi kết nối tới server');
    }
}
```

### 3. Render Pattern
```javascript
function render[Entity]s([entity]s) {
    const tbody = document.getElementById('[entity]s-tbody');
    
    if (!tbody) {
        console.error('[Entity]s table body not found');
        return;
    }

    if ([entity]s.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="X" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-[icon] fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Chưa có [entity] nào</h5>
                        <p class="text-muted">Hãy thêm [entity] đầu tiên</p>
                        <button class="btn btn-primary mt-2" onclick="open[Entity]Modal()">
                            <i class="fas fa-plus me-2"></i>Thêm [Entity] Đầu tiên
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = [entity]s.map([entity] => `
        <tr data-[entity]-id="${[entity].id}">
            <!-- Table row content -->
        </tr>
    `).join('');
}
```

### 4. CRUD Operations Pattern
```javascript
// CREATE/UPDATE
async function save[Entity]() {
    // Validation
    // Data preparation
    // API call
    // Handle response
    // Update UI
}

// READ - Single item
async function edit[Entity](id) {
    try {
        const response = await fetch(`api/admin/[entity].php?id=${id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            open[Entity]Modal(result.data);
        } else {
            showToast('Lỗi', 'Không thể tải thông tin [entity]', 'error', 3000);
        }
    } catch (error) {
        console.error('Error fetching [entity]:', error);
        showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 3000);
    }
}

// DELETE
async function delete[Entity]() {
    if (!currentEditId) return;
    
    try {
        const response = await fetch('api/admin/[entity].php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentEditId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Thành công', 'Xóa [entity] thành công!', 'success', 3000);
            deleteModal.hide();
            load[Entity]s();
        } else {
            showToast('Lỗi', result.message || 'Không thể xóa [entity]', 'error', 5000);
        }
    } catch (error) {
        console.error('Error deleting [entity]:', error);
        showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 5000);
    }
}
```

## 🎨 CSS Classes & Components

### Common Component Classes
```css
/* Page Structure */
.admin-page           /* Body class for admin pages */
.admin-wrapper        /* Main wrapper layout */
.sidebar-wrapper      /* Sidebar container */
.main-content         /* Main content area */
.content-area         /* Content padding area */
.page-header          /* Header section styling */

/* Cards & Tables */
.card                 /* Standard card styling */
.table-responsive     /* Responsive table wrapper */
.table-hover          /* Table with hover effects */

/* Status & Type Badges */
.badge.bg-primary     /* Primary brand color badge */
.badge.bg-success     /* Success/active badge */
.badge.bg-warning     /* Warning badge */
.badge.bg-danger      /* Danger/error badge */
.badge.bg-secondary   /* Secondary/inactive badge */

/* Action Buttons */
.btn-primary          /* Primary action button */
.btn-action           /* Small action buttons */
.btn-edit             /* Edit button styling */
.btn-delete           /* Delete button styling */

/* States */
.empty-state          /* Empty data display */
.spinner-border       /* Loading spinner */
.text-truncate        /* Text truncation with tooltip */
```

### Badge Styling Patterns
```css
/* Status Badges */
.status-active {
    background-color: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.status-inactive {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

/* Type Badges with Gradients */
.badge.consultation-type {
    background: linear-gradient(135deg, #964bdf, #5d2e8b);
    color: white;
}
```

## 📱 Responsive Design

### Mobile Considerations
```css
@media (max-width: 768px) {
  .sidebar-wrapper {
    transform: translateX(-100%);
    z-index: 1002;
  }
  
  .main-content {
    margin-left: 0;
    padding-top: 4rem;
  }
  
  .sidebar-toggle-btn {
    display: block;
  }
  
  .content-area {
    padding: 1rem;
  }
  
  .page-header {
    padding: 1.5rem;
  }
}
```

### Mobile Navigation
- **Sidebar Toggle**: Hamburger button hiển thị trên mobile
- **Overlay**: Dark overlay khi sidebar mở trên mobile
- **Touch Events**: Support swipe gestures
- **Responsive Tables**: Horizontal scroll cho bảng dữ liệu

## 🔄 Data Management & API Integration

### API Endpoints Pattern
```
GET    api/admin/[entity].php           # List items
GET    api/admin/[entity].php?id={id}   # Get single item
POST   api/admin/[entity].php           # Create item
PUT    api/admin/[entity].php           # Update item
DELETE api/admin/[entity].php           # Delete item
```

### Request/Response Format
```javascript
// Request Data
{
    "name": "Item Name",
    "description": "Description",
    "status": "active",
    // ... other fields
}

// Response Format
{
    "success": true,
    "message": "Operation successful",
    "data": { /* item data */ }
}
```

### Error Handling Pattern
```javascript
try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (result.success) {
        // Handle success
    } else {
        showToast('Lỗi', result.message, 'error', 5000);
    }
} catch (error) {
    console.error('Error:', error);
    showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 5000);
}
```

## 🛠️ Development Guidelines

### ✅ Best Practices
1. **Consistent Naming**: Sử dụng naming convention thống nhất
2. **Component Reuse**: Tận dụng sidebar và common components
3. **Error Handling**: Always handle errors gracefully
4. **Loading States**: Show loading spinners during API calls
5. **Validation**: Client-side validation trước khi gửi API
6. **Toast Notifications**: Sử dụng toastbar.js cho notifications

### 📍 Path Guidelines (Từ dev-note.md)
```javascript
// ✅ ĐÚNG - Relative paths
fetch('api/admin/products.php')
fetch('components/admin/sidebar.html')

// ❌ SAI - Absolute paths với prefix
fetch('/pac-new/api/admin/products.php')
fetch('/pac-new/components/admin/sidebar.html')
```

### 🎨 Brand Integration (Từ brand-colors.md)
- **Primary Actions**: Sử dụng PAC Purple (`#964bdf`)
- **Secondary Elements**: PAC Dark Purple (`#5d2e8b`)  
- **Highlights/Accents**: PAC Yellow (`#fff200`)
- **Gradients**: `linear-gradient(135deg, #964bdf, #5d2e8b)`

### ❌ Common Pitfalls to Avoid
1. **Hard-coded values** thay vì CSS variables
2. **Duplicate CSS** cho similar pages
3. **Missing error handling** trong API calls
4. **Inconsistent UI patterns** giữa các trang
5. **Poor mobile experience**
6. **Missing loading states**

## 📋 Implementation Checklist

### For Each New Admin Page:
- [ ] Copy HTML template structure
- [ ] Update page title and icon
- [ ] Create specific entity fields in forms/tables
- [ ] Implement JavaScript manager class
- [ ] Add API endpoints
- [ ] Test CRUD operations
- [ ] Verify responsive design
- [ ] Add error handling
- [ ] Test loading states
- [ ] Update sidebar navigation

### Testing Checklist:
- [ ] Desktop responsive (1200px+)
- [ ] Tablet responsive (768px-1199px)
- [ ] Mobile responsive (<=767px)
- [ ] CRUD operations work
- [ ] Error states display properly
- [ ] Loading states work
- [ ] Toast notifications show
- [ ] Modal interactions work
- [ ] Sidebar navigation functions

## 🚀 Quick Start Template

Để tạo trang admin mới nhanh chóng:

1. **Copy file**: `templates/admin/consultations.html` → `templates/admin/[new-page].html`
2. **Update title, icon, và entity names** trong HTML
3. **Copy JS**: `assets/js/admin/consultations.js` → `assets/js/admin/[new-page].js`
4. **Replace entity references** trong JavaScript
5. **Update API endpoints** trong code
6. **Add route** vào `.htaccess`
7. **Test functionality**

---

*Tài liệu này cung cấp framework hoàn chỉnh để triển khai admin frontend nhất quán và hiệu quả cho PAC Group website.*