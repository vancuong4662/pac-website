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
    // Show packages management modal
    showPackagesModal(consultationId);
}

async function showPackagesModal(productId) {
    try {
        showToast('Đang tải danh sách gói...', 'info');
        
        // Fetch packages data
        const response = await fetch(`api/admin/packages.php?product_id=${productId}`);
        const result = await response.json();
        
        if (!result.success) {
            showToast(result.message || 'Lỗi tải danh sách gói', 'error');
            return;
        }
        
        const { product, packages } = result.data;
        
        // Create and show packages modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'packages-modal';
        modal.setAttribute('data-product-id', productId);
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-box me-2"></i>Quản lý gói dịch vụ: ${escapeHtml(product.name)}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Package List Section -->
                        <div class="row mb-4">
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6 class="mb-0">
                                        <i class="fas fa-list me-2"></i>Danh sách gói (${packages.length})
                                    </h6>
                                    <button class="btn btn-sm btn-success" onclick="createNewPackage(${productId})">
                                        <i class="fas fa-plus me-1"></i>Thêm gói mới
                                    </button>
                                </div>
                                <div class="row" id="packages-list">
                                    ${renderPackagesGrid(packages)}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Package Details Section -->
                        <div class="row">
                            <div class="col-12">
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">
                                            <i class="fas fa-info-circle me-2"></i>Chi tiết gói được chọn
                                        </h6>
                                    </div>
                                    <div class="card-body" id="package-details">
                                        <div class="text-muted text-center py-5">
                                            <i class="fas fa-mouse-pointer fa-2x mb-3"></i>
                                            <p class="mb-0">Chọn một gói bên trên để xem chi tiết</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize modal
        const bsModal = new bootstrap.Modal(modal);
        
        // Auto-select first package if available
        if (packages.length > 0) {
            setTimeout(() => {
                viewPackageDetails(packages[0].id, productId);
            }, 500);
        }
        
        // Cleanup on close
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
        
        bsModal.show();
        
    } catch (error) {
        console.error('Error loading packages:', error);
        showToast('Lỗi tải danh sách gói dịch vụ', 'error');
    }
}

function renderPackagesGrid(packages) {
    if (packages.length === 0) {
        return `
            <div class="col-12">
                <div class="text-muted text-center py-4">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <h6>Chưa có gói nào</h6>
                    <p class="mb-0">Nhấn "Thêm gói mới" để tạo gói đầu tiên</p>
                </div>
            </div>
        `;
    }
    
    return packages.map(pkg => `
        <div class="col-md-4 mb-3">
            <div class="card package-card h-100" onclick="viewPackageDetails(${pkg.id}, ${pkg.product_id})" 
                 style="cursor: pointer; transition: all 0.3s;" id="package-item-${pkg.id}"
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${escapeHtml(pkg.package_name)}</h6>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-info" 
                                    onclick="event.stopPropagation(); viewPackageDetails(${pkg.id}, ${pkg.product_id})" 
                                    title="Xem chi tiết gói">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="event.stopPropagation(); deletePackage(${pkg.id}, '${escapeHtml(pkg.package_name)}')" 
                                    title="Xóa gói">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="text-muted small">Giá:</span>
                            <span class="fw-bold ${pkg.is_free ? 'text-success' : 'text-primary'}">
                                ${pkg.is_free ? 'Miễn phí' : pkg.price_display}
                            </span>
                        </div>
                        
                        ${pkg.sale_price ? `
                            <div class="text-end">
                                <small class="text-muted text-decoration-line-through">${pkg.original_price_display}</small>
                            </div>
                        ` : ''}
                        
                        ${pkg.group_size ? `
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-muted small">Quy mô:</span>
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
        </div>
    `).join('');
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
                        <i class="fas fa-edit me-2 text-primary"></i>Chỉnh sửa gói dịch vụ
                    </h5>
                    <small class="text-muted">Thuộc sản phẩm: <strong>${escapeHtml(pkg.product_name)}</strong></small>
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
                                           value="${pkg.image_url || ''}" placeholder="assets/img/icon/start.jpg">
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
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Package Description -->
            <div class="card mb-4">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-align-left me-2"></i>Mô tả gói
                    </h6>
                </div>
                <div class="card-body">
                    <div id="package-description-editor" style="min-height: 200px;"></div>
                </div>
            </div>
            
            <!-- Metadata -->
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-info-circle me-2"></i>Thông tin hệ thống
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <strong>Mã gói:</strong> #${pkg.id}
                        </div>
                        <div class="col-md-4">
                            <strong>Ngày tạo:</strong><br>
                            <small class="text-muted">${formatDateTime(pkg.created_at)}</small>
                        </div>
                        <div class="col-md-4">
                            <strong>Cập nhật cuối:</strong><br>
                            <small class="text-muted">${formatDateTime(pkg.updated_at)}</small>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    `;
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

// ===========================================
// HELPER FUNCTIONS FOR PACKAGES MANAGEMENT
// ===========================================

function createNewPackage(productId) {
    // TODO: Implement create new package modal
    showToast('Tính năng đang phát triển', 'info');
}

function editPackage(packageId) {
    // TODO: Implement edit package modal
    showToast('Tính năng đang phát triển', 'info');
}

async function deletePackage(packageId, packageName) {
    // Confirm deletion with user
    if (!confirm(`Bạn có chắc chắn muốn xóa gói "${packageName}"?\n\nHành động này không thể hoàn tác!`)) {
        return;
    }
    
    try {
        // Show loading toast
        showToast('Đang xóa gói...', 'info');
        
        const response = await fetch('api/admin/packages.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: packageId })
        });
        
        const result = await response.json();
        console.log('Delete response:', result);
        
        if (result.success) {
            showToast('Xóa gói thành công', 'success');
            
            // Reload the page after a short delay to show the toast
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(result.message || 'Lỗi xóa gói', 'error');
        }
        
    } catch (error) {
        console.error('Error deleting package:', error);
        showToast('Lỗi kết nối tới server', 'error');
    }
}

function number_format(number, decimals, dec_point, thousands_sep) {
    // JavaScript equivalent of PHP's number_format
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    const n = !isFinite(+number) ? 0 : +number;
    const prec = !isFinite(+decimals) ? 0 : Math.abs(decimals);
    const sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep;
    const dec = (typeof dec_point === 'undefined') ? '.' : dec_point;
    let s = '';
    
    const toFixedFix = function (n, prec) {
        const k = Math.pow(10, prec);
        return '' + Math.round(n * k) / k;
    };
    
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    
    return s.join(dec);
}

function formatDateTime(dateString) {
    if (!dateString) return 'Không xác định';
    
    try {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        };
        return date.toLocaleString('vi-VN', options);
    } catch (error) {
        return dateString;
    }
}

// ===========================================
// PACKAGE FORM MANAGEMENT FUNCTIONS
// ===========================================

let packageDescriptionEditor = null;

function initPackageDescriptionEditor(htmlContent) {
    // Clean up existing editor
    if (packageDescriptionEditor) {
        packageDescriptionEditor = null;
    }
    
    // Initialize Quill editor for package description
    const editorElement = document.getElementById('package-description-editor');
    if (editorElement) {
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
        
        // Load HTML content into editor
        if (htmlContent) {
            setTimeout(() => {
                try {
                    // Use clipboard API for better HTML parsing
                    packageDescriptionEditor.clipboard.dangerouslyPasteHTML(0, htmlContent);
                } catch (error) {
                    // Fallback to root.innerHTML
                    console.warn('Using fallback HTML loading method');
                    packageDescriptionEditor.root.innerHTML = htmlContent;
                }
            }, 100);
        }
    }
}

function initPackageFormListeners() {
    // Status toggle listener
    const statusToggle = document.getElementById('pkg-status');
    if (statusToggle) {
        statusToggle.addEventListener('change', function() {
            const label = document.getElementById('pkg-status-label');
            if (label) {
                label.textContent = this.checked ? 'Hoạt động' : 'Tạm dừng';
            }
        });
    }
    
    // Image URL listener for preview
    const imageUrlInput = document.getElementById('pkg-image-url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', function() {
            updateImagePreview(this.value);
        });
    }
}

function checkFreeStatus() {
    const originalPrice = parseFloat(document.getElementById('pkg-original-price').value) || 0;
    const salePrice = parseFloat(document.getElementById('pkg-sale-price').value) || 0;
    const freeToggle = document.getElementById('pkg-is-free');
    
    // If user enters any price, uncheck the free option
    if (originalPrice > 0 || salePrice > 0) {
        freeToggle.checked = false;
    }
}

function toggleFreeStatus() {
    const freeToggle = document.getElementById('pkg-is-free');
    const originalPriceInput = document.getElementById('pkg-original-price');
    const salePriceInput = document.getElementById('pkg-sale-price');
    
    if (freeToggle.checked) {
        // If free is checked, clear price inputs
        originalPriceInput.value = '0';
        salePriceInput.value = '';
    }
}

function updateImagePreview(url) {
    let preview = document.getElementById('pkg-image-preview');
    
    if (url && url.trim()) {
        if (!preview) {
            // Create preview element if it doesn't exist
            const container = document.getElementById('pkg-image-url').closest('.col-md-6');
            const previewDiv = document.createElement('div');
            previewDiv.className = 'mb-3';
            previewDiv.innerHTML = `
                <img src="${url}" alt="Package image" class="img-thumbnail" 
                     style="max-width: 200px; max-height: 150px;" id="pkg-image-preview"
                     onerror="this.style.display='none';">
            `;
            container.appendChild(previewDiv);
        } else {
            preview.src = url;
            preview.style.display = 'block';
        }
    } else if (preview) {
        preview.style.display = 'none';
    }
}

function openUploadModal(targetInputId) {
    // Store target input ID for callback
    window.uploadTargetInputId = targetInputId;
    
    // Open upload window
    const uploadWindow = window.open('admin-uploadimg', 'uploadimg', 'width=800,height=600');
    
    // Listen for upload completion
    const messageHandler = (event) => {
        if (event.data && event.data.type === 'imageUploaded') {
            const targetInput = document.getElementById(window.uploadTargetInputId);
            if (targetInput) {
                targetInput.value = event.data.imageUrl;
                
                // Update preview if it's the image URL input
                if (window.uploadTargetInputId === 'pkg-image-url') {
                    updateImagePreview(event.data.imageUrl);
                }
            }
            
            // Clean up
            window.removeEventListener('message', messageHandler);
            delete window.uploadTargetInputId;
        }
    };
    
    window.addEventListener('message', messageHandler);
}

async function updatePackageFromForm(event, packageId) {
    event.preventDefault();
    
    const submitButton = document.getElementById('save-package-btn');
    const originalText = submitButton.innerHTML;
    
    try {
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="spinner-border spinner-border-sm me-1" role="status"></i>Đang lưu...';
        
        // Collect form data
        const formData = new FormData(event.target);
        const packageData = {
            id: packageId,
            package_name: formData.get('package_name'),
            package_slug: formData.get('package_slug'),
            original_price: parseFloat(formData.get('original_price')) || 0,
            sale_price: formData.get('sale_price') ? parseFloat(formData.get('sale_price')) : null,
            is_free: document.getElementById('pkg-is-free').checked,
            image_url: formData.get('image_url') || null,
            status: document.getElementById('pkg-status').checked ? 'active' : 'inactive',
            package_description: packageDescriptionEditor ? packageDescriptionEditor.root.innerHTML : null
        };
        
        console.log('Updating package with data:', packageData);
        
        // Send update request
        const response = await fetch('api/admin/packages.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(packageData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Cập nhật gói thành công', 'success');
            
            // Reload the page after a short delay to show the toast
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(result.message || 'Lỗi cập nhật gói', 'error');
        }
        
    } catch (error) {
        console.error('Error updating package:', error);
        showToast('Lỗi kết nối tới server', 'error');
    } finally {
        // Reset button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}