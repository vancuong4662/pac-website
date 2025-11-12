/**
 * Admin Courses Management JavaScript
 * Handles CRUD operations for courses (products with type='course')
 * Based on consultations.js structure but adapted for courses
 */

let currentCourseId = null;
let coursesData = [];
let quillFullDescription = null;
let quillCurriculum = null;
let deleteTargetId = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCourses();
});

async function initializeCourses() {
    console.log('Initializing courses management...');
    
    // Initialize Quill editors
    initializeQuillEditors();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load courses data
    await loadCourses();
}

function initializeQuillEditors() {
    // Full Description Editor
    if (document.getElementById('course-description-editor')) {
        quillFullDescription = new Quill('#course-description-editor', {
            theme: 'snow',
            placeholder: 'Nhập mô tả chi tiết về khóa học...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        });

        // Sync with hidden input
        quillFullDescription.on('text-change', function() {
            const html = quillFullDescription.root.innerHTML;
            document.getElementById('course-full-description').value = html;
        });
    }

    // Curriculum Editor
    if (document.getElementById('course-curriculum-editor')) {
        quillCurriculum = new Quill('#course-curriculum-editor', {
            theme: 'snow',
            placeholder: 'Nhập chương trình học chi tiết...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                ]
            }
        });

        // Sync with hidden input
        quillCurriculum.on('text-change', function() {
            const html = quillCurriculum.root.innerHTML;
            document.getElementById('course-curriculum').value = html;
        });
    }
}

function setupEventListeners() {
    // Add course button
    const addCourseBtn = document.getElementById('add-course-btn');
    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', showAddCourseModal);
    }

    // View packages button
    const viewPackagesBtn = document.getElementById('view-packages-btn');
    if (viewPackagesBtn) {
        viewPackagesBtn.addEventListener('click', showPackagesModal);
    }

    // Save course button
    const saveCourseBtn = document.getElementById('save-course-btn');
    if (saveCourseBtn) {
        saveCourseBtn.addEventListener('click', saveCourse);
    }

    // Upload image button
    const uploadImageBtn = document.getElementById('upload-course-image-btn');
    if (uploadImageBtn) {
        uploadImageBtn.addEventListener('click', openImageUpload);
    }

    // Filter and search
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const searchInput = document.getElementById('search-input');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }

    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }

    // Modal events
    const courseModal = document.getElementById('courseModal');
    if (courseModal) {
        courseModal.addEventListener('hidden.bs.modal', clearCourseForm);
    }

    // Listen for upload window messages
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'imageSelected') {
            const imageUrl = event.data.url;
            const imageUrlInput = document.getElementById('course-image-url');
            if (imageUrlInput) {
                imageUrlInput.value = imageUrl;
                showToast('Đã chọn hình ảnh thành công', 'success');
            }
        }
    });
}

async function loadCourses() {
    console.log('Loading courses...');
    
    try {
        const response = await fetch('api/admin/courses.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Courses API response:', result);
        
        if (result.success) {
            coursesData = result.data || [];
            renderCoursesTable();
        } else {
            console.error('Failed to load courses:', result.message);
            showToast('Lỗi tải dữ liệu: ' + result.message, 'error');
            renderEmptyState('Lỗi tải dữ liệu');
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        showToast('Lỗi kết nối: ' + error.message, 'error');
        renderEmptyState('Lỗi kết nối');
    }
}

function renderCoursesTable() {
    const tbody = document.getElementById('courses-tbody');
    if (!tbody) return;
    
    if (!coursesData || coursesData.length === 0) {
        renderEmptyState('Không có khóa học nào');
        return;
    }
    
    const html = coursesData.map(course => {
        const shortDescription = course.short_description 
            ? (course.short_description.length > 100 
                ? course.short_description.substring(0, 100) + '...' 
                : course.short_description)
            : 'Chưa có mô tả';
            
        const duration = course.duration || 'Chưa xác định';
        const packageInfo = course.package_count > 0 
            ? `${course.package_count} package${course.package_count > 1 ? 's' : ''}`
            : 'Chưa có package';
            
        const imageHtml = course.image_url 
            ? `<img src="${course.image_url}" alt="${course.name}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;">` 
            : '<div class="text-muted"><i class="fas fa-image"></i></div>';

        const statusClass = course.status === 'active' ? 'success' : 'secondary';
        const statusText = course.status === 'active' ? 'Hoạt động' : 'Không hoạt động';

        return `
            <tr>
                <td>
                    <div class="fw-semibold">${course.name}</div>
                    <div class="small text-muted">ID: ${course.id}</div>
                    <span class="badge bg-${statusClass} badge-sm">${statusText}</span>
                </td>
                <td class="text-center">${imageHtml}</td>
                <td>
                    <div class="small">${shortDescription}</div>
                </td>
                <td>
                    <div class="small">${duration}</div>
                </td>
                <td>
                    <div class="small text-primary">${packageInfo}</div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-info" onclick="viewCourseDetails(${course.id})" title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-primary" onclick="editCourse(${course.id})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="viewCoursePackages(${course.id})" title="Xem Packages">
                            <i class="fas fa-box"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" onclick="deleteCourse(${course.id})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = html;
}

function renderEmptyState(message) {
    const tbody = document.getElementById('courses-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <i class="fas fa-graduation-cap fa-3x text-muted mb-3"></i>
                <p class="text-muted">${message}</p>
            </td>
        </tr>
    `;
}

function showAddCourseModal() {
    currentCourseId = null;
    clearCourseForm();
    
    // Update modal title and button
    document.getElementById('courseModalTitle').innerHTML = '<i class="fas fa-plus-circle me-2"></i>Thêm Khóa học';
    document.getElementById('save-course-btn').innerHTML = '<i class="fas fa-save me-1"></i>Lưu Khóa học';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('courseModal'));
    modal.show();
}

async function editCourse(courseId) {
    currentCourseId = courseId;
    
    try {
        const response = await fetch(`api/admin/courses.php?id=${courseId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const course = result.data;
            populateCourseForm(course);
            
            // Update modal title and button
            document.getElementById('courseModalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Chỉnh sửa Khóa học';
            document.getElementById('save-course-btn').innerHTML = '<i class="fas fa-save me-1"></i>Cập nhật Khóa học';
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('courseModal'));
            modal.show();
        } else {
            showToast('Lỗi tải thông tin khóa học: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading course details:', error);
        showToast('Lỗi kết nối: ' + error.message, 'error');
    }
}

function populateCourseForm(course) {
    // Basic information
    document.getElementById('course-name').value = course.name || '';
    document.getElementById('course-duration').value = course.duration || '';
    document.getElementById('course-image-url').value = course.image_url || '';
    document.getElementById('course-short-description').value = course.short_description || '';
    document.getElementById('course-category').value = course.category || '';
    document.getElementById('course-status').value = course.status || 'active';
    
    // Rich text fields
    if (quillFullDescription && course.full_description) {
        quillFullDescription.root.innerHTML = course.full_description;
        document.getElementById('course-full-description').value = course.full_description;
    }
    
    if (quillCurriculum && course.curriculum) {
        const curriculumHtml = typeof course.curriculum === 'string' 
            ? course.curriculum 
            : JSON.stringify(course.curriculum);
        quillCurriculum.root.innerHTML = curriculumHtml;
        document.getElementById('course-curriculum').value = curriculumHtml;
    }
    
    // Additional fields
    document.getElementById('course-target-audience').value = 
        typeof course.target_audience === 'string' 
            ? course.target_audience 
            : (Array.isArray(course.target_audience) ? course.target_audience.join('\n') : '');
            
    document.getElementById('course-learning-outcomes').value = 
        typeof course.learning_outcomes === 'string' 
            ? course.learning_outcomes 
            : (Array.isArray(course.learning_outcomes) ? course.learning_outcomes.join('\n') : '');
            
    document.getElementById('course-instructor').value = course.instructor_info || '';
    document.getElementById('course-teaching-format').value = course.teaching_format || '';
}

function clearCourseForm() {
    // Clear all form inputs
    document.getElementById('course-name').value = '';
    document.getElementById('course-duration').value = '';
    document.getElementById('course-image-url').value = '';
    document.getElementById('course-short-description').value = '';
    document.getElementById('course-target-audience').value = '';
    document.getElementById('course-learning-outcomes').value = '';
    document.getElementById('course-instructor').value = '';
    document.getElementById('course-teaching-format').value = '';
    document.getElementById('course-category').value = '';
    document.getElementById('course-status').value = 'active';
    
    // Clear Quill editors
    if (quillFullDescription) {
        quillFullDescription.setContents([]);
        document.getElementById('course-full-description').value = '';
    }
    
    if (quillCurriculum) {
        quillCurriculum.setContents([]);
        document.getElementById('course-curriculum').value = '';
    }
}

async function saveCourse() {
    const saveCourseBtn = document.getElementById('save-course-btn');
    const originalText = saveCourseBtn.innerHTML;
    
    try {
        // Show loading state
        saveCourseBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang lưu...';
        saveCourseBtn.disabled = true;
        
        // Gather form data
        const formData = {
            name: document.getElementById('course-name').value.trim(),
            duration: document.getElementById('course-duration').value.trim(),
            image_url: document.getElementById('course-image-url').value.trim(),
            short_description: document.getElementById('course-short-description').value.trim(),
            full_description: document.getElementById('course-full-description').value,
            target_audience: document.getElementById('course-target-audience').value.trim(),
            learning_outcomes: document.getElementById('course-learning-outcomes').value.trim(),
            curriculum: document.getElementById('course-curriculum').value,
            instructor_info: document.getElementById('course-instructor').value.trim(),
            teaching_format: document.getElementById('course-teaching-format').value,
            category: document.getElementById('course-category').value,
            status: document.getElementById('course-status').value,
            type: 'course' // Specify this is a course
        };
        
        // Validation
        if (!formData.name) {
            showToast('Vui lòng nhập tên khóa học', 'error');
            return;
        }
        
        if (!formData.short_description) {
            showToast('Vui lòng nhập mô tả ngắn', 'error');
            return;
        }
        
        if (!formData.full_description || formData.full_description.trim() === '<p><br></p>') {
            showToast('Vui lòng nhập mô tả chi tiết', 'error');
            return;
        }
        
        // Add ID for update
        if (currentCourseId) {
            formData.id = currentCourseId;
        }
        
        console.log('Saving course:', formData);
        
        // Determine API method
        const method = currentCourseId ? 'PUT' : 'POST';
        
        const response = await fetch('api/admin/courses.php', {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        console.log('Save course response:', result);
        
        if (result.success) {
            showToast(
                currentCourseId 
                    ? 'Cập nhật khóa học thành công!' 
                    : 'Tạo khóa học thành công!',
                'success'
            );
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('courseModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload courses
            await loadCourses();
        } else {
            showToast('Lỗi lưu khóa học: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error saving course:', error);
        showToast('Lỗi kết nối: ' + error.message, 'error');
    } finally {
        // Restore button state
        saveCourseBtn.innerHTML = originalText;
        saveCourseBtn.disabled = false;
    }
}

async function viewCourseDetails(courseId) {
    try {
        const response = await fetch(`api/admin/courses.php?id=${courseId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const course = result.data;
            
            // Show course details in a simple alert for now
            // In a real application, you might want to create a proper details modal
            let details = `Khóa học: ${course.name}\n`;
            details += `Thời lượng: ${course.duration || 'Chưa xác định'}\n`;
            details += `Trạng thái: ${course.status}\n`;
            details += `Số packages: ${course.packages ? course.packages.length : 0}\n`;
            details += `Mô tả: ${course.short_description || 'Chưa có mô tả'}`;
            
            alert(details);
        } else {
            showToast('Lỗi tải thông tin khóa học: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading course details:', error);
        showToast('Lỗi kết nối: ' + error.message, 'error');
    }
}

function viewCoursePackages(courseId) {
    // Find the course
    const course = coursesData.find(c => c.id === courseId);
    if (!course) {
        showToast('Không tìm thấy khóa học', 'error');
        return;
    }
    
    // Set modal title with course name
    document.getElementById('packagesModalTitle').innerHTML = 
        `<i class="fas fa-box me-2"></i>Packages của "${course.name}"`;
    
    // Show packages modal and load content
    const modal = new bootstrap.Modal(document.getElementById('packagesModal'));
    modal.show();
    
    // Load packages for this course
    loadPackagesForProduct(courseId);
}

function deleteCourse(courseId) {
    deleteTargetId = courseId;
    
    // Show delete confirmation modal
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const originalText = confirmBtn.innerHTML;
    
    try {
        // Show loading state
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang xóa...';
        confirmBtn.disabled = true;
        
        const response = await fetch('api/admin/courses.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: deleteTargetId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Xóa khóa học thành công!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload courses
            await loadCourses();
        } else {
            showToast('Lỗi xóa khóa học: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        showToast('Lỗi kết nối: ' + error.message, 'error');
    } finally {
        // Restore button state
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        deleteTargetId = null;
    }
}

function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const search = document.getElementById('search-input').value.trim();
    
    let filteredCourses = [...coursesData];
    
    // Filter by status
    if (status) {
        filteredCourses = filteredCourses.filter(course => course.status === status);
    }
    
    // Filter by search term
    if (search) {
        const searchLower = search.toLowerCase();
        filteredCourses = filteredCourses.filter(course => 
            course.name.toLowerCase().includes(searchLower) ||
            (course.short_description && course.short_description.toLowerCase().includes(searchLower))
        );
    }
    
    // Update the table with filtered data
    const originalData = coursesData;
    coursesData = filteredCourses;
    renderCoursesTable();
    coursesData = originalData; // Restore original data
}

function resetFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('search-input').value = '';
    renderCoursesTable();
}

function openImageUpload() {
    // Open image upload in a new window
    const uploadWindow = window.open('admin-uploadimg', 'uploadWindow', 'width=800,height=600');
    
    if (!uploadWindow) {
        showToast('Vui lòng cho phép popup để mở cửa sổ upload', 'error');
    }
}

// Packages functionality (reuse from consultations.js)
async function showPackagesModal() {
    // Show modal for all packages
    document.getElementById('packagesModalTitle').innerHTML = 
        '<i class="fas fa-box me-2"></i>Quản lý Tất cả Packages';
    
    const modal = new bootstrap.Modal(document.getElementById('packagesModal'));
    modal.show();
    
    // Load all packages
    loadAllPackages();
}

async function loadPackagesForProduct(productId) {
    const content = document.getElementById('packages-content');
    if (!content) return;
    
    // Show loading
    content.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Đang tải packages...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`api/admin/packages.php?product_id=${productId}`);
        const result = await response.json();
        
        if (result.success) {
            renderPackagesGrid(result.data, productId);
        } else {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <p class="text-muted">Lỗi tải packages: ${result.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading packages:', error);
        content.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <p class="text-muted">Lỗi kết nối: ${error.message}</p>
            </div>
        `;
    }
}

async function loadAllPackages() {
    const content = document.getElementById('packages-content');
    if (!content) return;
    
    // Show loading
    content.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Đang tải tất cả packages...</p>
        </div>
    `;
    
    try {
        const response = await fetch('api/admin/packages.php');
        const result = await response.json();
        
        if (result.success) {
            renderPackagesGrid(result.data);
        } else {
            content.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                    <p class="text-muted">Lỗi tải packages: ${result.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading packages:', error);
        content.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <p class="text-muted">Lỗi kết nối: ${error.message}</p>
            </div>
        `;
    }
}

function renderPackagesGrid(packages, productId = null) {
    const content = document.getElementById('packages-content');
    if (!content) return;
    
    if (!packages || packages.length === 0) {
        content.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-box fa-3x text-muted mb-3"></i>
                <p class="text-muted">Không có packages nào</p>
                ${productId ? `
                    <button class="btn btn-primary" onclick="createPackageForProduct(${productId})">
                        <i class="fas fa-plus me-1"></i>Tạo Package đầu tiên
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    // Use two-column layout similar to consultations
    const html = `
        <div class="row">
            <div class="col-md-5">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                            <i class="fas fa-list me-2"></i>Danh sách Packages
                        </h6>
                        ${productId ? `
                            <button class="btn btn-sm btn-primary" onclick="createPackageForProduct(${productId})">
                                <i class="fas fa-plus me-1"></i>Thêm mới
                            </button>
                        ` : ''}
                    </div>
                    <div class="card-body p-0" id="packages-list">
                        ${renderPackagesList(packages)}
                    </div>
                </div>
            </div>
            <div class="col-md-7">
                <div id="package-details">
                    <div class="text-center py-5 text-muted">
                        <i class="fas fa-mouse-pointer fa-3x mb-3"></i>
                        <p class="mb-0">Chọn một package để xem chi tiết</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function renderPackagesList(packages) {
    return packages.map((pkg, index) => `
        <div class="package-card border-0 ${index > 0 ? 'border-top' : ''} p-3 cursor-pointer" 
             id="package-item-${pkg.id}" 
             onclick="viewPackageDetails(${pkg.id}, ${pkg.product_id})">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${escapeHtml(pkg.package_name)}</h6>
                    
                    <div class="d-flex align-items-center gap-2 mb-2">
                        ${pkg.is_free 
                            ? '<span class="badge bg-success">Miễn phí</span>'
                            : `<span class="text-primary fw-bold">${formatPrice(pkg.final_price)} VNĐ</span>`
                        }
                        ${pkg.status === 'active' 
                            ? '<span class="badge bg-success">Hoạt động</span>'
                            : '<span class="badge bg-secondary">Tạm dừng</span>'
                        }
                    </div>
                    
                    <p class="small text-muted mb-1">
                        ${pkg.package_description ? 
                            (pkg.package_description.length > 80 
                                ? escapeHtml(pkg.package_description.substring(0, 80)) + '...'
                                : escapeHtml(pkg.package_description)
                            ) 
                            : 'Không có mô tả'
                        }
                    </p>
                    
                    ${pkg.product_name ? `
                        <div class="small text-muted">
                            <i class="fas fa-graduation-cap me-1"></i>Khóa học: ${escapeHtml(pkg.product_name)}
                        </div>
                    ` : ''}
                    
                    ${pkg.group_size ? `
                        <div class="small text-muted">
                            <i class="fas fa-users me-1"></i>
                            <span class="small">${escapeHtml(pkg.group_size)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="d-flex justify-content-end">
                    <span class="badge ${pkg.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                        ${pkg.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// Utility functions
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
}

function showToast(message, type = 'info') {
    // Implement toast notification
    // This should be implemented based on your toast system
    console.log(`Toast [${type}]: ${message}`);
    
    // If you have a toast system, use it here
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Package management functions (copied and adapted from consultations.js)
let quillPackageDescription = null;

function initPackageDescriptionEditor(initialContent = '') {
    // Cleanup existing editor first
    const editorContainer = document.getElementById('pkg-description-editor');
    if (!editorContainer) return;
    
    // Add delay to ensure proper initialization
    setTimeout(() => {
        if (quillPackageDescription) {
            try {
                quillPackageDescription = null;
            } catch (e) {
                console.log('Error cleaning up Quill editor:', e);
            }
        }
        
        quillPackageDescription = new Quill('#pkg-description-editor', {
            theme: 'snow',
            placeholder: 'Mô tả chi tiết về gói dịch vụ...',
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
        
        if (initialContent && initialContent.trim()) {
            quillPackageDescription.root.innerHTML = initialContent;
        }
    }, 100);
}

function initPackageFormListeners() {
    // Status toggle listener
    const statusCheckbox = document.getElementById('pkg-status');
    if (statusCheckbox) {
        statusCheckbox.addEventListener('change', function() {
            const label = document.getElementById('pkg-status-label');
            if (label) {
                label.textContent = this.checked ? 'Hoạt động' : 'Tạm dừng';
            }
        });
    }
    
    // Image URL change listener for preview
    const imageInput = document.getElementById('pkg-image-url');
    if (imageInput) {
        imageInput.addEventListener('input', function() {
            const preview = document.getElementById('pkg-image-preview');
            if (preview) {
                if (this.value.trim()) {
                    preview.src = this.value;
                    preview.style.display = 'block';
                } else {
                    preview.style.display = 'none';
                }
            }
        });
    }
}

function checkFreeStatus() {
    const originalPrice = parseFloat(document.getElementById('pkg-original-price').value) || 0;
    const salePrice = parseFloat(document.getElementById('pkg-sale-price').value) || 0;
    const isFreeCheckbox = document.getElementById('pkg-is-free');
    
    if (originalPrice === 0 && salePrice === 0) {
        isFreeCheckbox.checked = true;
        toggleFreeStatus();
    }
}

function toggleFreeStatus() {
    const isFreeCheckbox = document.getElementById('pkg-is-free');
    const originalPriceInput = document.getElementById('pkg-original-price');
    const salePriceInput = document.getElementById('pkg-sale-price');
    
    if (isFreeCheckbox.checked) {
        originalPriceInput.value = 0;
        salePriceInput.value = '';
        originalPriceInput.disabled = true;
        salePriceInput.disabled = true;
    } else {
        originalPriceInput.disabled = false;
        salePriceInput.disabled = false;
    }
}

async function viewPackageDetails(packageId, productId) {
    try {
        // Highlight selected package
        document.querySelectorAll('#packages-list .package-card').forEach(card => {
            card.style.borderColor = '';
            card.style.backgroundColor = '';
        });
        const selectedCard = document.getElementById(`package-item-${packageId}`);
        if (selectedCard) {
            selectedCard.style.borderColor = '#0d6efd';
            selectedCard.style.backgroundColor = '#f8f9ff';
        }
        
        // Show loading
        const detailsContainer = document.getElementById('package-details');
        detailsContainer.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                Đang tải chi tiết...
            </div>
        `;
        
        // Fetch package details
        const response = await fetch(`api/admin/packages.php?id=${packageId}`);
        const result = await response.json();
        
        if (!result.success) {
            detailsContainer.innerHTML = `
                <div class="text-danger text-center py-3">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p class="mb-0">Lỗi tải chi tiết gói</p>
                </div>
            `;
            return;
        }
        
        const pkg = result.data;
        
        // Render package details
        detailsContainer.innerHTML = renderPackageDetails(pkg);
        
        // Initialize Quill editor for package description
        initPackageDescriptionEditor(pkg.package_description);
        
        // Initialize toggle listeners
        initPackageFormListeners();
        
    } catch (error) {
        console.error('Error loading package details:', error);
        document.getElementById('package-details').innerHTML = `
            <div class="text-danger text-center py-3">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p class="mb-0">Lỗi tải chi tiết gói</p>
            </div>
        `;
    }
}

function renderPackageDetails(pkg) {
    return `
        <!-- Package Edit Form -->
        <form id="package-edit-form" onsubmit="updatePackageFromForm(event, ${pkg.id})">
            <!-- Package Header -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 class="mb-1">
                        <i class="fas fa-edit me-2 text-primary"></i>Chỉnh sửa gói khóa học
                    </h5>
                    <small class="text-muted">Thuộc khóa học: <strong>${escapeHtml(pkg.product_name)}</strong></small>
                </div>
                <div>
                    <button type="submit" class="btn btn-success" id="save-package-btn">
                        <i class="fas fa-save me-1"></i>Lưu thay đổi
                    </button>
                </div>
            </div>
            
            <!-- Basic Information -->
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-info-circle me-2"></i>Thông tin cơ bản
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="pkg-name" class="form-label">Tên gói <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="pkg-name" name="package_name" 
                                       value="${escapeHtml(pkg.package_name)}" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="pkg-slug" class="form-label">Keyword (Slug) <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="pkg-slug" name="package_slug" 
                                       value="${escapeHtml(pkg.package_slug)}" required>
                                <div class="form-text">Chỉ dùng chữ thường, số và dấu gạch ngang (-). VD: goi-cao-cap</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Package Description -->
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-align-left me-2"></i>Mô tả gói khóa học
                    </h6>
                </div>
                <div class="card-body">
                    <div id="pkg-description-editor" style="height: 200px;"></div>
                </div>
            </div>
            
            <!-- Pricing Information -->
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-money-bill-wave me-2"></i>Thông tin giá
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label for="pkg-original-price" class="form-label">Giá gốc (VND)</label>
                                <input type="number" class="form-control" id="pkg-original-price" name="original_price" 
                                       value="${pkg.original_price}" min="0" onchange="checkFreeStatus()">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label for="pkg-sale-price" class="form-label">Giá khuyến mãi (VND)</label>
                                <input type="number" class="form-control" id="pkg-sale-price" name="sale_price" 
                                       value="${pkg.sale_price || ''}" min="0" onchange="checkFreeStatus()">
                                <div class="form-text">Để trống nếu không có khuyến mãi</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Miễn phí</label>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="pkg-is-free" name="is_free" 
                                           ${pkg.is_free ? 'checked' : ''} onchange="toggleFreeStatus()">
                                    <label class="form-check-label" for="pkg-is-free">
                                        Gói miễn phí
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Image and Status -->
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-image me-2"></i>Hình ảnh và trạng thái
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="pkg-image-url" class="form-label">Đường dẫn hình ảnh</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="pkg-image-url" name="image_url" 
                                           value="${pkg.image_url || ''}" placeholder="assets/img/courses/course1.jpg">
                                    <button type="button" class="btn btn-outline-secondary" onclick="openUploadModal('pkg-image-url')">
                                        <i class="fas fa-upload"></i>
                                    </button>
                                </div>
                            </div>
                            
                            ${pkg.image_url ? `
                                <div class="mb-3">
                                    <img src="${pkg.image_url}" alt="Package image" class="img-thumbnail" 
                                         style="max-width: 200px; max-height: 150px;" id="pkg-image-preview"
                                         onerror="this.style.display='none';">
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Trạng thái gói</label>
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="pkg-status" name="status" 
                                           ${pkg.status === 'active' ? 'checked' : ''}>
                                    <label class="form-check-label" for="pkg-status" id="pkg-status-label">
                                        ${pkg.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                                    </label>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="pkg-group-size" class="form-label">Số lượng học viên</label>
                                <input type="text" class="form-control" id="pkg-group-size" name="group_size" 
                                       value="${pkg.group_size || ''}" placeholder="VD: 1-1, 20 người, Không giới hạn">
                                <div class="form-text">Số lượng học viên tối đa cho gói này</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    `;
}

async function updatePackageFromForm(event, packageId) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('save-package-btn');
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang lưu...';
        saveBtn.disabled = true;
        
        // Get form data
        const formData = new FormData(event.target);
        
        // Add package description from Quill editor
        if (quillPackageDescription) {
            formData.set('package_description', quillPackageDescription.root.innerHTML);
        }
        
        // Convert FormData to regular object
        const data = {};
        for (const [key, value] of formData.entries()) {
            if (key === 'status') {
                data[key] = document.getElementById('pkg-status').checked ? 'active' : 'inactive';
            } else if (key === 'is_free') {
                data[key] = document.getElementById('pkg-is-free').checked;
            } else {
                data[key] = value;
            }
        }
        
        data.id = packageId;
        
        console.log('Updating package:', data);
        
        const response = await fetch('api/admin/packages.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Cập nhật package thành công!', 'success');
            
            // Reload packages list
            const packagesModal = document.getElementById('packagesModal');
            if (packagesModal && packagesModal.classList.contains('show')) {
                // Get current product ID from modal title or reload all packages
                const modalTitle = document.getElementById('packagesModalTitle').textContent;
                if (modalTitle.includes('"')) {
                    // Find the course this package belongs to
                    const currentCourse = coursesData.find(c => 
                        modalTitle.includes(`"${c.name}"`)
                    );
                    if (currentCourse) {
                        loadPackagesForProduct(currentCourse.id);
                    } else {
                        loadAllPackages();
                    }
                } else {
                    loadAllPackages();
                }
            }
        } else {
            showToast('Lỗi cập nhật package: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating package:', error);
        showToast('Lỗi kết nối: ' + error.message, 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

async function deletePackage(packageId) {
    if (!confirm('Bạn có chắc chắn muốn xóa package này?')) {
        return;
    }
    
    try {
        const response = await fetch('api/admin/packages.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: packageId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Xóa package thành công!', 'success');
            
            // Reload packages list
            const packagesModal = document.getElementById('packagesModal');
            if (packagesModal && packagesModal.classList.contains('show')) {
                const modalTitle = document.getElementById('packagesModalTitle').textContent;
                if (modalTitle.includes('"')) {
                    const currentCourse = coursesData.find(c => 
                        modalTitle.includes(`"${c.name}"`)
                    );
                    if (currentCourse) {
                        loadPackagesForProduct(currentCourse.id);
                    } else {
                        loadAllPackages();
                    }
                } else {
                    loadAllPackages();
                }
            }
        } else {
            showToast('Lỗi xóa package: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting package:', error);
        showToast('Lỗi kết nối: ' + error.message, 'error');
    }
}

function createPackageForProduct(productId) {
    console.log('Create package for product:', productId);
    // Implement package creation modal
    showToast('Tính năng tạo package mới sẽ được triển khai sau', 'info');
}

function openUploadModal(targetInputId) {
    // Store target input ID for later use
    window.currentUploadTarget = targetInputId;
    
    // Open upload window
    const uploadWindow = window.open('admin-uploadimg', 'uploadWindow', 'width=800,height=600');
    
    if (!uploadWindow) {
        showToast('Vui lòng cho phép popup để mở cửa sổ upload', 'error');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}