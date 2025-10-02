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
        const response = await fetch('api/admin/products.php?type=consultation');
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

    if (consultations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
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
                <span class="badge bg-secondary">#${consultation.id}</span>
            </td>
            <td>
                <div class="d-flex align-items-start">
                    <div>
                        <strong>${escapeHtml(consultation.name)}</strong>
                        <div class="mt-1">
                            ${consultation.status === 'active' ? 
                                '<span class="badge bg-success">Hoạt động</span>' : 
                                '<span class="badge bg-secondary">Không hoạt động</span>'}
                        </div>
                    </div>
                </div>
            </td>
            <td class="text-center">
                ${consultation.image_url ? 
                    `<img src="${consultation.image_url}" alt="Banner" class="img-thumbnail" style="width: 80px; height: 50px; object-fit: cover;">` : 
                    '<span class="text-muted">Chưa có ảnh</span>'}
            </td>
            <td>
                <div class="text-truncate" style="max-width: 250px;" title="${escapeHtml(consultation.description || '')}">
                    ${consultation.description ? escapeHtml(consultation.description.replace(/<[^>]*>/g, '')) : '<em class="text-muted">Chưa có mô tả</em>'}
                </div>
            </td>
            <td>
                ${formatConsultationType(consultation.consultation_type)}
            </td>
            <td>
                ${formatPackageType(consultation.package_type)}
            </td>
            <td>
                <span class="price-display">${formatPrice(consultation.price)}</span>
            </td>
            <td>
                <small class="text-muted">${formatDate(consultation.created_at)}</small>
            </td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-action btn-edit" onclick="editConsultation(${consultation.id})" 
                            title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-action btn-delete" onclick="confirmDeleteConsultation(${consultation.id})" 
                            title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
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
    // TODO: Implement server-side filtering
    loadConsultations();
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
        document.getElementById('consultation-price').value = consultationData.price || '';
        document.getElementById('consultation-type').value = consultationData.consultation_type || '';
        document.getElementById('consultation-package-type').value = consultationData.package_type || '';
        
        // Set Quill editor content
        if (quillEditor) {
            const description = consultationData.description || '';
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
        type: 'consultation',
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
        const response = await fetch('api/admin/products.php', {
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
        const response = await fetch(`api/admin/products.php?id=${id}`);
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
        const response = await fetch('api/admin/products.php', {
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
    if (!price) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
}

function formatConsultationType(consultationType) {
    if (!consultationType) return '<span class="badge bg-secondary">Chưa xác định</span>';
    
    const typeMap = {
        'automated': {
            label: 'Trắc nghiệm',
            class: 'bg-info',
            icon: 'fas fa-robot'
        },
        'expert': {
            label: 'Chuyên gia', 
            class: 'bg-warning',
            icon: 'fas fa-user-tie'
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
                <td colspan="9" class="text-center py-5">
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
                <td colspan="9" class="text-center py-5">
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