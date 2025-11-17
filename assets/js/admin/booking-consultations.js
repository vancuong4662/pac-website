/**
 * Admin Booking Consultations Manager
 * Quản lý đăng ký tư vấn (purchased_packages với product_type='consultation')
 */

class AdminBookingConsultationsManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.consultations = [];
        this.totalPages = 1;
        this.filters = {
            status: '',
            support_status: '',
            search: ''
        };
        
        // Date picker instance
        this.scheduledPicker = null;
        
        this.init();
    }
    
    init() {
        this.attachEventListeners();
        this.initializeDatePickers();
        this.loadConsultations();
    }
    
    attachEventListeners() {
        // Refresh button
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.loadConsultations();
        });
        
        // Filter changes
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadConsultations();
        });
        
        document.getElementById('support-status-filter')?.addEventListener('change', (e) => {
            this.filters.support_status = e.target.value;
            this.currentPage = 1;
            this.loadConsultations();
        });
        
        // Search input with debounce
        let searchTimeout;
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value.trim();
                this.currentPage = 1;
                this.loadConsultations();
            }, 500);
        });
        
        // Clear search button
        document.getElementById('clear-search-btn')?.addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            this.filters.search = '';
            this.currentPage = 1;
            this.loadConsultations();
        });
        
        // Edit form submission
        document.getElementById('editConsultationForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConsultation();
        });
    }
    
    initializeDatePickers() {
        // Initialize Flatpickr for scheduled date/time
        this.scheduledPicker = flatpickr("#edit-scheduled-at", {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            time_24hr: true,
            locale: "vn",
            minDate: "today",
            allowInput: true
        });
    }
    
    async loadConsultations() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                status: this.filters.status,
                support_status: this.filters.support_status,
                search: this.filters.search
            });
            
            const response = await fetch(`api/admin/consultations/get-all-consultations.php?${params}`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Lỗi tải dữ liệu');
            }
            
            if (data.success) {
                this.consultations = data.data.consultations;
                this.totalPages = data.data.pagination.total_pages;
                this.currentPage = data.data.pagination.current_page;
                
                this.updateStatistics(data.data.statistics);
                this.renderConsultationsTable();
                this.renderPagination();
            } else {
                throw new Error(data.message || 'Lỗi tải dữ liệu');
            }
        } catch (error) {
            console.error('Error loading consultations:', error);
            showToast('Lỗi tải dữ liệu: ' + error.message, 'error');
            this.renderErrorState();
        }
    }
    
    updateStatistics(stats) {
        if (!stats) return;
        
        document.getElementById('total-consultations').textContent = stats.total || 0;
        document.getElementById('active-consultations').textContent = stats.active || 0;
        document.getElementById('scheduled-consultations').textContent = stats.scheduled || 0;
    }
    
    renderConsultationsTable() {
        const tbody = document.getElementById('consultations-tbody');
        
        if (!this.consultations || this.consultations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4 text-muted">
                        <i class="fas fa-inbox fa-3x mb-3 d-block"></i>
                        Không có đăng ký tư vấn nào
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.consultations.map(consultation => this.renderConsultationRow(consultation)).join('');
    }
    
    renderConsultationRow(consultation) {
        const statusBadge = this.getStatusBadge(consultation.status);
        const supportBadge = this.getSupportStatusBadge(consultation.support_status);
        
        const scheduledDate = consultation.scheduled_at 
            ? new Date(consultation.scheduled_at).toLocaleString('vi-VN', { 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit' 
              })
            : '<span class="text-muted">—</span>';

        return `
            <tr>
                <td>${consultation.id}</td>
                <td>
                    <div class="fw-medium">${consultation.user_fullname || '—'}</div>
                    <small class="text-muted">${consultation.user_email || '—'}</small>
                </td>
                <td>
                    <span class="text-nowrap">${consultation.user_phone || '—'}</span>
                </td>
                <td>
                    <div class="fw-medium">${consultation.product_name || '—'}</div>
                    <small class="text-muted">${consultation.package_name || '—'}</small>
                </td>
                <td>${statusBadge}</td>
                <td>${supportBadge}</td>
                <td class="small">${scheduledDate}</td>
                <td class="small">${consultation.created_at_formatted || '—'}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="adminConsultations.viewConsultationDetail(${consultation.id})"
                                title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-success" 
                                onclick="adminConsultations.editConsultation(${consultation.id})"
                                title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge bg-warning">Chờ xử lý</span>',
            'active': '<span class="badge bg-success">Đang hoạt động</span>',
            'completed': '<span class="badge bg-info">Đã hoàn thành</span>',
            'expired': '<span class="badge bg-secondary">Hết hạn</span>',
            'cancelled': '<span class="badge bg-danger">Đã hủy</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">—</span>';
    }
    
    getSupportStatusBadge(supportStatus) {
        const badges = {
            'none': '<span class="badge bg-light text-dark">Chưa liên hệ</span>',
            'contacted': '<span class="badge bg-info">Đã liên hệ</span>',
            'scheduled': '<span class="badge bg-primary">Đã hẹn lịch</span>',
            'in_progress': '<span class="badge bg-warning">Đang tiến hành</span>',
            'resolved': '<span class="badge bg-success">Đã hoàn thành</span>'
        };
        return badges[supportStatus] || '<span class="badge bg-secondary">—</span>';
    }
    
    renderPagination() {
        const pagination = document.getElementById('pagination');
        
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminConsultations.goToPage(${this.currentPage - 1}); return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="adminConsultations.goToPage(1); return false;">1</a>
                </li>
            `;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="adminConsultations.goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="adminConsultations.goToPage(${this.totalPages}); return false;">${this.totalPages}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminConsultations.goToPage(${this.currentPage + 1}); return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.loadConsultations();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    async viewConsultationDetail(consultationId) {
        try {
            const modal = new bootstrap.Modal(document.getElementById('consultationDetailModal'));
            const content = document.getElementById('consultationDetailContent');
            
            // Show loading
            content.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                </div>
            `;
            modal.show();
            
            // Fetch detail
            const response = await fetch(`api/admin/consultations/get-consultation-detail.php?id=${consultationId}`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Lỗi tải chi tiết');
            }
            
            const consultation = data.data;
            
            // Render detail
            content.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Mã đăng ký</h6>
                        <p class="mb-0">${consultation.access_code || '—'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Trạng thái</h6>
                        <p class="mb-0">${this.getStatusBadge(consultation.status)}</p>
                    </div>
                </div>
                
                <hr>
                
                <h6 class="mb-3">Thông tin khách hàng</h6>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Họ tên</h6>
                        <p class="mb-0">${consultation.user_fullname || '—'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Email</h6>
                        <p class="mb-0">${consultation.user_email || '—'}</p>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Điện thoại</h6>
                        <p class="mb-0">${consultation.user_phone || '—'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Username</h6>
                        <p class="mb-0">${consultation.user_username || '—'}</p>
                    </div>
                </div>
                
                <hr>
                
                <h6 class="mb-3">Thông tin gói tư vấn</h6>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Sản phẩm</h6>
                        <p class="mb-0">${consultation.product_name || '—'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Gói</h6>
                        <p class="mb-0">${consultation.package_name || '—'}</p>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Giá gói</h6>
                        <p class="mb-0">${this.formatPrice(consultation.package_price)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Mã đơn hàng</h6>
                        <p class="mb-0">#${consultation.order_id || '—'}</p>
                    </div>
                </div>
                
                <hr>
                
                <h6 class="mb-3">Tình trạng hỗ trợ</h6>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Trạng thái hỗ trợ</h6>
                        <p class="mb-0">${this.getSupportStatusBadge(consultation.support_status)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Lịch hẹn</h6>
                        <p class="mb-0">${consultation.scheduled_at 
                            ? new Date(consultation.scheduled_at).toLocaleString('vi-VN', { 
                                year: 'numeric', month: '2-digit', day: '2-digit', 
                                hour: '2-digit', minute: '2-digit' 
                              })
                            : '<span class="text-muted">Chưa có lịch hẹn</span>'
                        }</p>
                    </div>
                </div>
                
                ${consultation.client_notes ? `
                    <div class="mb-3">
                        <h6 class="text-muted mb-1">Ghi chú khách hàng</h6>
                        <p class="mb-0">${consultation.client_notes}</p>
                    </div>
                ` : ''}
                
                ${consultation.staff_notes ? `
                    <div class="mb-3">
                        <h6 class="text-muted mb-1">Ghi chú nội bộ</h6>
                        <p class="mb-0">${consultation.staff_notes}</p>
                    </div>
                ` : ''}
                
                <hr>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Ngày đăng ký</h6>
                        <p class="mb-0">${consultation.created_at_formatted || '—'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted mb-1">Cập nhật lần cuối</h6>
                        <p class="mb-0">${consultation.updated_at_formatted || '—'}</p>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error viewing consultation detail:', error);
            showToast('Lỗi tải chi tiết: ' + error.message, 'error');
            document.getElementById('consultationDetailContent').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${error.message}
                </div>
            `;
        }
    }
    
    async editConsultation(consultationId) {
        try {
            // Fetch consultation detail
            const response = await fetch(`api/admin/consultations/get-consultation-detail.php?id=${consultationId}`, {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Lỗi tải dữ liệu');
            }
            
            const consultation = data.data;
            
            // Populate form
            document.getElementById('edit-consultation-id').value = consultation.id;
            document.getElementById('edit-customer-name').textContent = consultation.user_fullname || '—';
            document.getElementById('edit-package-name').textContent = `${consultation.product_name} - ${consultation.package_name}`;
            document.getElementById('edit-status').value = consultation.status;
            document.getElementById('edit-support-status').value = consultation.support_status;
            document.getElementById('edit-staff-notes').value = consultation.staff_notes || '';
            document.getElementById('edit-client-notes').textContent = consultation.client_notes || '—';
            
            // Set scheduled date if exists
            if (consultation.scheduled_at) {
                this.scheduledPicker.setDate(consultation.scheduled_at);
            } else {
                this.scheduledPicker.clear();
            }
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editConsultationModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error loading consultation for edit:', error);
            showToast('Lỗi tải dữ liệu: ' + error.message, 'error');
        }
    }
    
    async saveConsultation() {
        try {
            const consultationId = document.getElementById('edit-consultation-id').value;
            const formData = {
                id: consultationId,
                status: document.getElementById('edit-status').value,
                support_status: document.getElementById('edit-support-status').value,
                scheduled_at: document.getElementById('edit-scheduled-at').value || null,
                staff_notes: document.getElementById('edit-staff-notes').value
            };
            
            const response = await fetch('api/admin/consultations/update-consultation.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Lỗi cập nhật');
            }
            
            showToast('Cập nhật thành công!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editConsultationModal'));
            modal.hide();
            
            // Reload data
            this.loadConsultations();
            
        } catch (error) {
            console.error('Error saving consultation:', error);
            showToast('Lỗi cập nhật: ' + error.message, 'error');
        }
    }
    
    formatPrice(price) {
        if (!price || price == 0) return '<span class="text-success">Miễn phí</span>';
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(price);
    }
    
    renderErrorState() {
        const tbody = document.getElementById('consultations-tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="alert alert-danger mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Lỗi tải dữ liệu. Vui lòng thử lại.
                    </div>
                </td>
            </tr>
        `;
    }
}
