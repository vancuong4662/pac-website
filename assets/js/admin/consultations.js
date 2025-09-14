// Consultations Management System
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
                    [{ 'align': [] }],
                    ['link'],
                    ['clean']
                ]
            }
        });
        
        // Sync content with hidden input
        quillEditor.on('text-change', function() {
            const content = quillEditor.root.innerHTML;
            document.getElementById('consultation-description').value = content;
        });
    }
}

async function loadConsultations(filters = {}) {
    try {
        showLoading();
        
        // Build query parameters
        const params = new URLSearchParams({
            type: 'consultation',
            ...filters
        });
        
        const apiUrl = `api/admin/products.php?${params}`;
        console.log('🔍 Loading consultations from:', apiUrl);
        console.log('🔍 Filters:', filters);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get response text first to debug
        const responseText = await response.text();
        console.log('📋 Raw response:', responseText);
        
        // Try to parse JSON
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('✅ Parsed JSON result:', result);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('📋 Response text that failed to parse:', responseText.substring(0, 500) + '...');
            throw new Error('Server returned invalid JSON response');
        }
        
        if (result.success) {
            console.log('✅ Data loaded successfully:', result.data);
            renderConsultations(result.data || []);
        } else {
            console.error('❌ API Error:', result.message);
            showErrorState(result.message || 'Không thể tải danh sách dịch vụ tư vấn');
        }
    } catch (error) {
        console.error('❌ Error loading consultations:', error);
        showErrorState('Không thể kết nối đến server. Vui lòng thử lại sau.');
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
                <td colspan="6" class="text-center py-5">
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
                        ${consultation.package_type ? `<br><small class="type-badge type-consultation">${consultation.package_type}</small>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <div class="text-truncate" style="max-width: 350px;" title="${escapeHtml(consultation.description || '')}">
                    ${consultation.description ? escapeHtml(consultation.description.replace(/<[^>]*>/g, '')) : '<em class="text-muted">Chưa có mô tả</em>'}
                </div>
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
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
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
    const filters = {
        status: document.getElementById('filter-status').value,
        search: document.getElementById('search-input').value.trim()
    };
    
    loadConsultations(filters);
}

function resetFilters() {
    document.getElementById('filter-status').value = '';
    document.getElementById('search-input').value = '';
    loadConsultations();
}

function openConsultationModal(consultationData = null) {
    if (!consultationModal) {
        console.error('Consultation modal not initialized');
        return;
    }
    
    const modalTitle = document.getElementById('consultationModalTitle');
    const saveBtn = document.getElementById('save-consultation-btn');
    
    if (consultationData) {
        // Edit mode
        modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Chỉnh sửa Dịch vụ Tư vấn';
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Cập nhật Dịch vụ';
        currentEditId = consultationData.id;
        
        // Fill form data
        document.getElementById('consultation-name').value = consultationData.name || '';
        document.getElementById('consultation-price').value = consultationData.price || '';
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
    const description = document.getElementById('consultation-description').value.trim();
    const price = parseFloat(document.getElementById('consultation-price').value);
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
    
    // Prepare data
    const data = {
        name,
        description,
        price,
        type: 'consultation',
        package_type: packageType || null,
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
            credentials: 'same-origin',
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Thành công', 
                currentEditId ? 'Cập nhật dịch vụ tư vấn thành công!' : 'Thêm dịch vụ tư vấn thành công!', 
                'success', 2000);
            
            // Close modal
            consultationModal.hide();
            
            // Reload consultations
            loadConsultations();
        } else {
            showToast('Lỗi', result.message || 'Có lỗi xảy ra khi lưu dịch vụ', 'error', 3000);
        }
    } catch (error) {
        console.error('Error saving consultation:', error);
        showToast('Lỗi', 'Không thể kết nối đến server. Vui lòng thử lại sau.', 'error', 3000);
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

async function editConsultation(id) {
    try {        const response = await fetch(`api/admin/products.php?id=${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            openConsultationModal(result.data);
        } else {
            showToast('Lỗi', result.message || 'Không thể tải thông tin dịch vụ', 'error', 3000);
        }
    } catch (error) {
        console.error('Error loading consultation:', error);
        showToast('Lỗi', 'Không thể tải thông tin dịch vụ', 'error', 3000);
    }
}

function confirmDeleteConsultation(id) {
    currentEditId = id;
    if (deleteModal) {
        deleteModal.show();
    }
}

async function deleteConsultation() {
    if (!currentEditId) return;
    
    // Show loading state
    const deleteBtn = document.getElementById('confirm-delete-btn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Đang xóa...';
    deleteBtn.disabled = true;
    
    try {        const response = await fetch('api/admin/products.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ id: currentEditId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Thành công', 'Xóa dịch vụ tư vấn thành công!', 'success', 2000);
            
            // Close modal
            deleteModal.hide();
            
            // Remove row with animation
            const row = document.querySelector(`tr[data-consultation-id="${currentEditId}"]`);
            if (row) {
                row.style.transition = 'all 0.3s ease';
                row.style.transform = 'translateX(-100%)';
                row.style.opacity = '0';
                setTimeout(() => {
                    loadConsultations(); // Reload to get fresh data
                }, 300);
            } else {
                loadConsultations();
            }
            
            currentEditId = null;
        } else {
            showToast('Lỗi', result.message || 'Có lỗi xảy ra khi xóa dịch vụ', 'error', 3000);
        }
    } catch (error) {
        console.error('Error deleting consultation:', error);
        showToast('Lỗi', 'Không thể kết nối đến server. Vui lòng thử lại sau.', 'error', 3000);
    } finally {
        // Restore button state
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid Date';
    }
}

function formatPrice(price) {
    if (!price) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
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
                <td colspan="6" class="text-center py-5">
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
                <td colspan="6" class="text-center py-5">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h5 class="text-muted">Có lỗi xảy ra</h5>
                        <p class="text-muted">${escapeHtml(message)}</p>
                        <button class="btn btn-primary mt-2" onclick="loadConsultations()">
                            <i class="fas fa-refresh me-2"></i>Thử lại
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Auto-refresh every 5 minutes to keep data fresh
setInterval(function() {
    if (document.visibilityState === 'visible') {
        loadConsultations();
    }
}, 5 * 60 * 1000);
