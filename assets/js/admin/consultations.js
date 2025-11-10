// Consultations Management System - Updated Version
let currentEditId = null;
let deleteModal = null;
let consultationModal = null;
let quillEditor = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    initModals();
    
    // Initialize Quill editor
    initQuillEditor();
    
    // Load consultations on page load
    loadConsultations();
    
    // Initialize modal events
    initModalEvents();
    
    // Initialize filter events
    initFilterEvents();
});

function initModals() {
    // Initialize Bootstrap modals
    const consultationModalEl = document.getElementById('consultationModal');
    const deleteModalEl = document.getElementById('deleteModal');
    
    if (consultationModalEl) {
        consultationModal = new bootstrap.Modal(consultationModalEl);
    }
    
    if (deleteModalEl) {
        deleteModal = new bootstrap.Modal(deleteModalEl);
    }
}

function initQuillEditor() {
    // Initialize Quill editor for description
    const editorElement = document.getElementById('consultation-description-editor');
    if (editorElement) {
        quillEditor = new Quill('#consultation-description-editor', {
            theme: 'snow',
            placeholder: 'Nhập mô tả chi tiết về dịch vụ tư vấn...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link'],
                    ['clean']
                ]
            }
        });
        
        // Update hidden input when editor content changes
        quillEditor.on('text-change', function() {
            const description = quillEditor.root.innerHTML;
            document.getElementById('consultation-description').value = description;
        });
    }
}

async function loadConsultations() {
    showLoading();
    
    try {
        // Use specialized consultations API endpoint
        const response = await fetch('api/admin/consultations.php');
        const result = await response.json();
        
        if (result.success) {
            renderConsultations(result.data || []);
        } else {
            showErrorState(result.message || 'Không thể tải dữ liệu');
        }
    } catch (error) {
        console.error('Error loading consultations:', error);
        showErrorState('Lỗi kết nối tới server');
    }
}

function renderConsultations(consultations) {
    const tbody = document.getElementById('consultations-tbody');
    
    if (!tbody) {
        console.error('Consultations table body not found');
        return;
    }
    
    // Store consultations data globally for access by action functions
    window.consultationsData = consultations;

    if (consultations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-user-tie fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Chưa có dịch vụ tư vấn nào</h5>
                        <p class="text-muted">Hãy thêm dịch vụ tư vấn đầu tiên cho website của bạn</p>
                        <button class="btn btn-primary mt-2" onclick="openConsultationModal()">
                            <i class="fas fa-plus me-2"></i>Thêm Dịch vụ Đầu tiên
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = consultations.map(consultation => `
        <tr data-consultation-id="${consultation.id}">
            <td>
                <div class="d-flex flex-column">
                    <strong class="text-dark">${escapeHtml(consultation.name)}</strong>
                    <div class="mt-1">
                        ${consultation.status === 'active' ? 
                            '<span class="badge bg-success">Hoạt động</span>' : 
                            '<span class="badge bg-secondary">Không hoạt động</span>'}
                        ${consultation.package_count ? 
                            `<span class="badge bg-info ms-1">${consultation.package_count} gói</span>` : 
                            '<span class="badge bg-warning ms-1">0 gói</span>'}
                    </div>
                </div>
            </td>
            <td class="text-center">
                <div class="service-image-preview">
                    ${consultation.image_url ? 
                        `<img src="${consultation.image_url}" alt="Banner" class="img-thumbnail" style="width: 80px; height: 50px; object-fit: cover; border-radius: 8px;">` : 
                        '<div class="no-image-placeholder d-flex align-items-center justify-content-center" style="width: 80px; height: 50px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px;"><i class="fas fa-image text-muted"></i></div>'}
                </div>
            </td>
            <td>
                <div class="service-description">
                    ${consultation.short_description ? 
                        `<span class="text-dark">${truncateText(escapeHtml(consultation.short_description.replace(/<[^>]*>/g, '')), 100)}</span>` : 
                        '<em class="text-muted">Chưa có mô tả</em>'}
                </div>
            </td>
            <td>
                <div class="consultation-type-info">
                    ${formatConsultationType(consultation.consultation_type)}
                </div>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-info" onclick="viewConsultationDetails(${consultation.id})" 
                            title="Xem chi tiết" data-bs-toggle="tooltip">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="managePackages(${consultation.id})" 
                            title="Quản lý gói dịch vụ" data-bs-toggle="tooltip">
                        <i class="fas fa-box"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteConsultation(${consultation.id})" 
                            title="Xóa dịch vụ" data-bs-toggle="tooltip">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Initialize tooltips for action buttons
    initTooltips();
}

function initTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initModalEvents() {
    // Add consultation button
    const addBtn = document.getElementById('add-consultation-btn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            openConsultationModal();
        });
    }
    
    // Save consultation button
    const saveBtn = document.getElementById('save-consultation-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            saveConsultation();
        });
    }
    
    // Confirm delete button
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            deleteConsultation();
        });
    }
    
    // Reset modal when closed
    const consultationModalEl = document.getElementById('consultationModal');
    if (consultationModalEl) {
        consultationModalEl.addEventListener('hidden.bs.modal', function() {
            resetModal();
        });
    }
}

function initFilterEvents() {
    // Apply filters button
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Reset filters button
    const resetFiltersBtn = document.getElementById('reset-filters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Search on Enter key
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
}

function applyFilters() {
    const status = document.getElementById('filter-status').value;
    const search = document.getElementById('search-input').value.trim();
    
    console.log('Applying filters:', { status, search });
    
    // Build query parameters
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    
    loadConsultationsWithFilters(params.toString());
}

async function loadConsultationsWithFilters(queryString) {
    showLoading();
    
    try {
        const url = queryString ? `api/admin/consultations.php?${queryString}` : 'api/admin/consultations.php';
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            renderConsultations(result.data || []);
        } else {
            showErrorState(result.message || 'Không thể tải dữ liệu');
        }
    } catch (error) {
        console.error('Error loading consultations with filters:', error);
        showErrorState('Lỗi kết nối tới server');
    }
}

function resetFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('search-input').value = '';
    loadConsultations();
}

async function openConsultationModal(consultationData = null) {
    const modalTitle = document.getElementById('consultationModalTitle');
    const saveBtn = document.getElementById('save-consultation-btn');
    
    if (consultationData) {
        // Edit mode
        modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Chỉnh sửa Dịch vụ Tư vấn';
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Cập nhật Dịch vụ';
        currentEditId = consultationData.id;
        
        // Fill form data
        document.getElementById('consultation-name').value = consultationData.name || '';
        document.getElementById('consultation-image-url').value = consultationData.image_url || '';
        
        // Calculate price from packages (use first package price as default)
        let defaultPrice = 0;
        if (consultationData.packages && consultationData.packages.length > 0) {
            const firstPackage = consultationData.packages[0];
            defaultPrice = firstPackage.final_price || firstPackage.original_price || 0;
        }
        document.getElementById('consultation-price').value = defaultPrice;
        
        document.getElementById('consultation-type').value = consultationData.consultation_type || '';
        document.getElementById('consultation-package-type').value = consultationData.package_type || '';
        
        // Set Quill editor content
        if (quillEditor) {
            const description = consultationData.short_description || consultationData.full_description || '';
            quillEditor.root.innerHTML = description;
            document.getElementById('consultation-description').value = description;
        }
    } else {
        // Add mode
        modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Thêm Dịch vụ Tư vấn';
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Lưu Dịch vụ';
        currentEditId = null;
        
        // Clear Quill editor
        if (quillEditor) {
            quillEditor.setContents([]);
            document.getElementById('consultation-description').value = '';
        }
    }
    
    consultationModal.show();
}

function resetModal() {
    currentEditId = null;
    
    // Reset form
    const form = document.getElementById('consultation-form');
    if (form) {
        form.reset();
    }
    
    // Reset button text
    const saveBtn = document.getElementById('save-consultation-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Lưu Dịch vụ';
    }
}

async function saveConsultation() {
    const name = document.getElementById('consultation-name').value.trim();
    const imageUrl = document.getElementById('consultation-image-url').value.trim();
    const description = document.getElementById('consultation-description').value.trim();
    const price = parseFloat(document.getElementById('consultation-price').value);
    const consultationType = document.getElementById('consultation-type').value;
    const packageType = document.getElementById('consultation-package-type').value;
    
    // Validation
    if (!name) {
        showToast('Lỗi', 'Vui lòng nhập tên dịch vụ', 'error', 3000);
        document.getElementById('consultation-name').focus();
        return;
    }
    
    if (name.length < 3) {
        showToast('Lỗi', 'Tên dịch vụ phải có ít nhất 3 ký tự', 'error', 3000);
        document.getElementById('consultation-name').focus();
        return;
    }
    
    if (!description || description === '<p><br></p>') {
        showToast('Lỗi', 'Vui lòng nhập mô tả dịch vụ', 'error', 3000);
        quillEditor.focus();
        return;
    }
    
    if (!price || price <= 0) {
        showToast('Lỗi', 'Vui lòng nhập giá dịch vụ hợp lệ', 'error', 3000);
        document.getElementById('consultation-price').focus();
        return;
    }
    
    if (!consultationType) {
        showToast('Lỗi', 'Vui lòng chọn loại tư vấn', 'error', 3000);
        document.getElementById('consultation-type').focus();
        return;
    }
    
    if (!packageType) {
        showToast('Lỗi', 'Vui lòng chọn gói dịch vụ', 'error', 3000);
        document.getElementById('consultation-package-type').focus();
        return;
    }
    
    // Prepare data
    const data = {
        name,
        description,
        price,
        consultation_type: consultationType,
        package_type: packageType,
        image_url: imageUrl || null,
        status: 'active' // Default to active
    };
    
    if (currentEditId) {
        data.id = currentEditId;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('save-consultation-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang lưu...';
    saveBtn.disabled = true;
    
    try {
        const method = currentEditId ? 'PUT' : 'POST';
        const response = await fetch('api/admin/consultations.php', {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Thành công', currentEditId ? 'Cập nhật dịch vụ tư vấn thành công!' : 'Thêm dịch vụ tư vấn thành công!', 'success', 3000);
            consultationModal.hide();
            loadConsultations();
        } else {
            showToast('Lỗi', result.message || 'Có lỗi xảy ra khi lưu dữ liệu', 'error', 5000);
        }
    } catch (error) {
        console.error('Error saving consultation:', error);
        showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 5000);
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

async function editConsultation(id) {
    try {
        const response = await fetch(`api/admin/consultations.php?id=${id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            openConsultationModal(result.data);
        } else {
            showToast('Lỗi', 'Không thể tải thông tin dịch vụ', 'error', 3000);
        }
    } catch (error) {
        console.error('Error fetching consultation:', error);
        showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 3000);
    }
}

function confirmDeleteConsultation(id) {
    currentEditId = id;
    deleteModal.show();
}

async function deleteConsultation() {
    if (!currentEditId) return;
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang xóa...';
    confirmBtn.disabled = true;
    
    try {
        const response = await fetch('api/admin/consultations.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: currentEditId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Thành công', 'Xóa dịch vụ tư vấn thành công!', 'success', 3000);
            deleteModal.hide();
            loadConsultations();
        } else {
            showToast('Lỗi', result.message || 'Không thể xóa dịch vụ', 'error', 5000);
        }
    } catch (error) {
        console.error('Error deleting consultation:', error);
        showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 5000);
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        currentEditId = null;
    }
}

// Helper Functions
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatPrice(price) {
    if (!price || price === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
}

function formatConsultationType(consultationType) {
    if (!consultationType) return '<span class="badge bg-secondary">Chưa xác định</span>';
    
    const typeMap = {
        'automated': {
            label: 'Trắc nghiệm',
            class: 'bg-warning',
            icon: 'fas fa-list-check'
        },
        'expert': {
            label: 'Chuyên gia', 
            class: 'bg-info',
            icon: 'fas fa-comment'
        }
    };
    
    const type = typeMap[consultationType] || {
        label: consultationType,
        class: 'bg-secondary',
        icon: 'fas fa-question'
    };
    
    return `<span class="badge ${type.class}">
                <i class="${type.icon} me-1"></i>${type.label}
            </span>`;
}

// Truncate text to specified length
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

// Format package type for display
function formatPackageType(packageType) {
    if (!packageType) return '<span class="badge bg-secondary">Chưa xác định</span>';
    
    const typeMap = {
        'basic': {
            label: 'Cơ bản',
            class: 'bg-primary',
            icon: 'fas fa-star'
        },
        'premium': {
            label: 'Cao cấp',
            class: 'bg-success',
            icon: 'fas fa-crown'
        },
        'mixed': {
            label: 'Đa dạng',
            class: 'bg-info',
            icon: 'fas fa-layer-group'
        }
    };
    
    const type = typeMap[packageType] || {
        label: packageType,
        class: 'bg-secondary',
        icon: 'fas fa-question'
    };
    
    return `<span class="badge ${type.class}">
                <i class="${type.icon} me-1"></i>${type.label}
            </span>`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, function(m) { return map[m]; }) : '';
}

function showLoading() {
    const tbody = document.getElementById('consultations-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-3 text-muted mb-0">Đang tải dữ liệu...</p>
                </td>
            </tr>
        `;
    }
}

function showErrorState(message) {
    const tbody = document.getElementById('consultations-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h5 class="text-muted">Có lỗi xảy ra</h5>
                        <p class="text-muted">${escapeHtml(message)}</p>
                        <button class="btn btn-outline-primary mt-2" onclick="loadConsultations()">
                            <i class="fas fa-refresh me-2"></i>Thử lại
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// New action functions for simplified table
async function viewConsultationDetails(id) {
    try {
        // Show loading
        showToast('Thông tin', 'Đang tải chi tiết dịch vụ...', 'info', 2000);
        
        // Fetch detailed consultation data including full_description
        const response = await fetch(`api/admin/consultations.php?id=${id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            // Store current consultation for editor access
            window.currentConsultation = result.data;
            
            // Show detailed modal with full data
            showConsultationDetailModal(result.data);
        } else {
            showToast('Lỗi', 'Không thể tải thông tin dịch vụ', 'error', 3000);
        }
    } catch (error) {
        console.error('Error fetching consultation details:', error);
        showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 3000);
    }
}

function managePackages(consultationId) {
    // Redirect to packages management page or show packages modal
    window.location.href = `packages.html?consultation_id=${consultationId}`;
}

function showConsultationDetailModal(consultation) {
    // Create and show editable detail modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'consultation-detail-modal';
    modal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-edit me-2"></i>Chỉnh sửa dịch vụ: ${escapeHtml(consultation.name)}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="consultation-detail-form">
                        <input type="hidden" id="detail-consultation-id" value="${consultation.id}">
                        
                        <!-- Basic Information -->
                        <div class="row">
                            <div class="col-md-8">
                                <div class="mb-3">
                                    <label for="detail-name" class="form-label">Tên dịch vụ <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="detail-name" 
                                           value="${escapeHtml(consultation.name)}" required>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="detail-consultation-type" class="form-label">Loại tư vấn <span class="text-danger">*</span></label>
                                            <select class="form-select" id="detail-consultation-type" required>
                                                <option value="">-- Chọn loại --</option>
                                                <option value="automated" ${consultation.consultation_type === 'automated' ? 'selected' : ''}>Trắc nghiệm tự động</option>
                                                <option value="expert" ${consultation.consultation_type === 'expert' ? 'selected' : ''}>Tư vấn chuyên gia</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="detail-status" class="form-label">Trạng thái</label>
                                            <select class="form-select" id="detail-status">
                                                <option value="active" ${consultation.status === 'active' ? 'selected' : ''}>Hoạt động</option>
                                                <option value="inactive" ${consultation.status === 'inactive' ? 'selected' : ''}>Không hoạt động</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Image Section -->
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="detail-image-url" class="form-label">URL Hình ảnh</label>
                                    <div class="input-group">
                                        <input type="url" class="form-control" id="detail-image-url" 
                                               value="${consultation.image_url || ''}"
                                               placeholder="https://example.com/image.jpg">
                                        <button class="btn btn-outline-primary" type="button" onclick="openImageUploader()" 
                                                title="Upload hình ảnh">
                                            <i class="fas fa-upload"></i> Upload
                                        </button>
                                    </div>
                                    <div class="form-text">Nhập URL hoặc click Upload để tải ảnh lên</div>
                                </div>
                                <div class="image-preview-container">
                                    <label class="form-label">Xem trước:</label>
                                    <div id="detail-image-preview" class="border rounded p-3 text-center">
                                        ${consultation.image_url ? 
                                            `<img src="${consultation.image_url}" class="img-fluid rounded" style="max-height: 150px;" alt="Preview">` :
                                            '<div class="text-muted"><i class="fas fa-image fa-2x mb-2"></i><br>Chưa có ảnh</div>'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Duration -->
                        <div class="mb-3">
                            <label for="detail-duration" class="form-label">Thời lượng</label>
                            <input type="text" class="form-control" id="detail-duration" 
                                   value="${consultation.duration || ''}"
                                   placeholder="VD: 30 phút, 2 giờ, Theo lịch cá nhân...">
                            <div class="form-text">Thời gian dự kiến để hoàn thành dịch vụ</div>
                        </div>
                        
                        <!-- Short Description -->
                        <div class="mb-3">
                            <label for="detail-short-description" class="form-label">Mô tả ngắn</label>
                            <textarea class="form-control" id="detail-short-description" rows="3"
                                      placeholder="Nhập mô tả ngắn về dịch vụ...">${consultation.short_description || ''}</textarea>
                            <div class="form-text">Mô tả này sẽ hiển thị trong danh sách dịch vụ</div>
                        </div>
                        
                        <!-- Full Description -->
                        <div class="mb-3">
                            <label for="detail-description" class="form-label">Mô tả chi tiết</label>
                            <div id="detail-description-editor" style="height: 200px;"></div>
                            <textarea id="detail-description" class="d-none">${consultation.full_description || ''}</textarea>
                            <div class="form-text">Mô tả chi tiết sẽ hiển thị trên trang chi tiết dịch vụ</div>
                        </div>
                        
                        <!-- Learning Outcomes -->
                        <div class="mb-3">
                            <label for="detail-learning-outcomes" class="form-label">Kết quả mong đợi</label>
                            <div id="detail-learning-outcomes-editor" style="height: 180px;"></div>
                            <textarea id="detail-learning-outcomes" class="d-none">${consultation.learning_outcomes || ''}</textarea>
                            <div class="form-text">Những gì khách hàng sẽ đạt được sau khi sử dụng dịch vụ</div>
                        </div>
                        

                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="updateConsultationFromModal()">
                        <i class="fas fa-save me-2"></i>Cập nhật
                    </button>
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        <i class="fas fa-times me-2"></i>Đóng
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Initialize Quill editor for description
    let detailQuillEditor;
    modal.addEventListener('shown.bs.modal', () => {
        // Debug: log HTML content before initializing editors
        console.log('Full Description HTML:', consultation.full_description);
        console.log('Learning Outcomes HTML:', consultation.learning_outcomes);
        
        initDetailQuillEditor();
        initImagePreview();
    });
    
    // Remove modal from DOM when hidden
    modal.addEventListener('hidden.bs.modal', () => {
        if (detailQuillEditor) {
            detailQuillEditor = null;
        }
        if (window.detailLearningOutcomesEditor) {
            window.detailLearningOutcomesEditor = null;
        }
        document.body.removeChild(modal);
    });
    
    function initDetailQuillEditor() {
        const editorContainer = document.getElementById('detail-description-editor');
        const learningOutcomesContainer = document.getElementById('detail-learning-outcomes-editor');
        
        // Initialize Full Description Editor
        if (editorContainer && !detailQuillEditor) {
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
            
            // Set initial content from full_description (HTML content) using clipboard API
            const initialContent = consultation.full_description || '';
            if (initialContent) {
                // Use setTimeout to ensure editor is fully initialized
                setTimeout(() => {
                    try {
                        // Try using clipboard.dangerouslyPasteHTML for better HTML parsing
                        detailQuillEditor.clipboard.dangerouslyPasteHTML(0, initialContent);
                    } catch (error) {
                        console.warn('Failed to parse HTML with clipboard, using root.innerHTML:', error);
                        // Fallback to root.innerHTML
                        detailQuillEditor.root.innerHTML = initialContent;
                    }
                }, 100);
            }
        }
        
        // Initialize Learning Outcomes Editor
        if (learningOutcomesContainer && !window.detailLearningOutcomesEditor) {
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
            
            // Set initial content from learning_outcomes (HTML content) using clipboard API
            const learningOutcomesContent = consultation.learning_outcomes || '';
            if (learningOutcomesContent) {
                // Use setTimeout to ensure editor is fully initialized
                setTimeout(() => {
                    try {
                        // Try using clipboard.dangerouslyPasteHTML for better HTML parsing
                        window.detailLearningOutcomesEditor.clipboard.dangerouslyPasteHTML(0, learningOutcomesContent);
                    } catch (error) {
                        console.warn('Failed to parse HTML with clipboard, using root.innerHTML:', error);
                        // Fallback to root.innerHTML
                        window.detailLearningOutcomesEditor.root.innerHTML = learningOutcomesContent;
                    }
                }, 100);
            }
        }
    }
    
    function initImagePreview() {
        const imageUrlInput = document.getElementById('detail-image-url');
        const imagePreview = document.getElementById('detail-image-preview');
        
        imageUrlInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url) {
                imagePreview.innerHTML = `<img src="${url}" class="img-fluid rounded" style="max-height: 150px;" alt="Preview" onerror="showImageError(this)">`;
            } else {
                imagePreview.innerHTML = '<div class="text-muted"><i class="fas fa-image fa-2x mb-2"></i><br>Chưa có ảnh</div>';
            }
        });
    }
    
    // Store editor reference globally for update function
    window.currentDetailEditor = detailQuillEditor;
}

function showImageError(img) {
    img.parentElement.innerHTML = '<div class="text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>Không thể tải ảnh</div>';
}

function openImageUploader() {
    // Mở cửa sổ upload ảnh
    const uploadWindow = window.open(
        'admin-uploadimg', 
        'imageUploader',
        'width=600,height=500,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,status=no'
    );
    
    // Lắng nghe message từ cửa sổ upload
    window.addEventListener('message', function(event) {
        // Kiểm tra origin để bảo mật
        if (event.origin !== window.location.origin) return;
        
        // Kiểm tra nếu có URL ảnh được gửi về
        if (event.data && event.data.type === 'imageUploaded' && event.data.imageUrl) {
            // Cập nhật URL vào input
            const imageUrlInput = document.getElementById('detail-image-url');
            if (imageUrlInput) {
                imageUrlInput.value = event.data.imageUrl;
                
                // Trigger input event để cập nhật preview
                const inputEvent = new Event('input', { bubbles: true });
                imageUrlInput.dispatchEvent(inputEvent);
            }
            
            // Đóng cửa sổ upload
            if (uploadWindow && !uploadWindow.closed) {
                uploadWindow.close();
            }
        }
    }, { once: false }); // Không dùng once để có thể nhận nhiều message
}

async function updateConsultationFromModal() {
    const form = document.getElementById('consultation-detail-form');
    const submitButton = form.closest('.modal-content').querySelector('.btn-primary');
    
    // Store original text outside try block
    const originalText = submitButton.innerHTML;
    
    try {
        // Disable submit button
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang cập nhật...';
        
        // Collect form data
        const consultationId = document.getElementById('detail-consultation-id').value;
        const name = document.getElementById('detail-name').value.trim();
        const consultationType = document.getElementById('detail-consultation-type').value;
        const status = document.getElementById('detail-status').value;
        const imageUrl = document.getElementById('detail-image-url').value.trim();
        const duration = document.getElementById('detail-duration').value.trim();
        const shortDescription = document.getElementById('detail-short-description').value.trim();
        
        // Get description from Quill editor
        let description = '';
        const editorElement = document.querySelector('#detail-description-editor .ql-editor');
        if (editorElement) {
            description = editorElement.innerHTML.trim();
        }
        
        // Get learning outcomes from Quill editor
        let learningOutcomes = '';
        const learningOutcomesElement = document.querySelector('#detail-learning-outcomes-editor .ql-editor');
        if (learningOutcomesElement) {
            learningOutcomes = learningOutcomesElement.innerHTML.trim();
        }
        
        // Validation
        if (!name) {
            showToast('Lỗi', 'Vui lòng nhập tên dịch vụ', 'error', 3000);
            return;
        }
        
        if (!consultationType) {
            showToast('Lỗi', 'Vui lòng chọn loại tư vấn', 'error', 3000);
            return;
        }
        
        // Prepare data - include id in the body
        const updateData = {
            id: parseInt(consultationId),
            name,
            consultation_type: consultationType,
            status,
            image_url: imageUrl || null,
            duration: duration || null,
            short_description: shortDescription || null,
            full_description: description || null,
            learning_outcomes: learningOutcomes || null
        };
        
        console.log('Sending update data:', updateData);
        
        // Send update request
        const response = await fetch('api/admin/consultations.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        console.log('Update response:', result);
        
        if (result.success) {
            showToast('Thành công', 'Cập nhật dịch vụ thành công!', 'success', 3000);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('consultation-detail-modal'));
            modal.hide();
            
            // Reload consultations
            loadConsultations();
        } else {
            showToast('Lỗi', result.message || 'Có lỗi xảy ra khi cập nhật', 'error', 5000);
        }
        
    } catch (error) {
        console.error('Error updating consultation:', error);
        showToast('Lỗi', 'Lỗi kết nối tới server', 'error', 5000);
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}