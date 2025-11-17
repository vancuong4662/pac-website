/**
 * Admin Booking Courses Management System
 * Quản lý đăng ký khóa học từ bảng purchased_packages
 */

class AdminBookingCoursesManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.filters = {
            status: '',
            support: '',
            search: ''
        };
        this.bookings = [];
        this.totalCount = 0;
        this.editBookingId = null;
        this.flatpickrInstance = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initializeDatePicker();
        await this.loadBookings();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.currentPage = 1;
            this.loadBookings();
        });

        // Apply filters button
        document.getElementById('apply-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        // Search on Enter key
        document.getElementById('search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });

        // Save booking button
        document.getElementById('save-booking-btn')?.addEventListener('click', () => {
            this.saveBooking();
        });
    }

    initializeDatePicker() {
        // Initialize flatpickr for scheduled_at field
        const dateInput = document.getElementById('edit-scheduled-at');
        if (dateInput) {
            this.flatpickrInstance = flatpickr(dateInput, {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true,
                allowInput: true,
                locale: {
                    firstDayOfWeek: 1,
                    weekdays: {
                        shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
                        longhand: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
                    },
                    months: {
                        shorthand: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
                        longhand: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
                    }
                }
            });
        }
    }

    applyFilters() {
        this.filters.status = document.getElementById('filter-status').value;
        this.filters.support = document.getElementById('filter-support').value;
        this.filters.search = document.getElementById('search-input').value.trim();
        
        this.currentPage = 1;
        this.loadBookings();
    }

    async loadBookings() {
        try {
            // Build query string
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit
            });

            if (this.filters.status) params.append('status', this.filters.status);
            if (this.filters.support) params.append('support_status', this.filters.support);
            if (this.filters.search) params.append('search', this.filters.search);

            const response = await fetch(`api/admin/courses/get-all-bookings.php?${params}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                this.bookings = data.data.bookings;
                this.totalCount = data.data.pagination.total_count;
                
                this.updateStatistics(data.data.statistics);
                this.renderBookingsTable();
                this.renderPagination(data.data.pagination);
            } else {
                console.error('Failed to load bookings:', data.message);
                showToast(data.message || 'Không thể tải danh sách đăng ký', 'error');
                this.renderEmptyState();
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            showToast('Lỗi kết nối khi tải danh sách đăng ký', 'error');
            this.renderEmptyState();
        }
    }

    updateStatistics(stats) {
        if (!stats) return;
        
        document.getElementById('total-bookings').textContent = stats.total || 0;
        document.getElementById('active-bookings').textContent = stats.active || 0;
        document.getElementById('scheduled-bookings').textContent = stats.scheduled || 0;
    }

    renderBookingsTable() {
        const tbody = document.getElementById('bookings-tbody');
        
        if (this.bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Không tìm thấy đăng ký nào</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.bookings.map(booking => this.renderBookingRow(booking)).join('');
    }

    renderBookingRow(booking) {
        const statusBadge = this.getStatusBadge(booking.status);
        const supportBadge = this.getSupportBadge(booking.support_status);
        const scheduledDate = booking.scheduled_at 
            ? new Date(booking.scheduled_at).toLocaleString('vi-VN', { 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit' 
              })
            : '<span class="text-muted">—</span>';

        return `
            <tr>
                <td>${booking.id}</td>
                <td>
                    <div class="fw-medium">${booking.user_fullname || '—'}</div>
                    <small class="text-muted">${booking.user_email || '—'}</small>
                </td>
                <td>
                    <span class="text-nowrap">${booking.user_phone || '—'}</span>
                </td>
                <td>
                    <div class="fw-medium">${booking.product_name || '—'}</div>
                    <small class="text-muted">${booking.package_name || '—'}</small>
                </td>
                <td>${statusBadge}</td>
                <td>${supportBadge}</td>
                <td class="small">${scheduledDate}</td>
                <td class="small">${booking.created_at_formatted || '—'}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="adminBookings.viewBookingDetail(${booking.id})"
                                title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-success" 
                                onclick="adminBookings.editBooking(${booking.id})"
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
            'pending': '<span class="badge bg-warning"><i class="fas fa-clock me-1"></i>Chờ xử lý</span>',
            'active': '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Hoạt động</span>',
            'completed': '<span class="badge bg-info"><i class="fas fa-trophy me-1"></i>Hoàn thành</span>',
            'expired': '<span class="badge bg-danger"><i class="fas fa-times-circle me-1"></i>Hết hạn</span>',
            'cancelled': '<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>Đã hủy</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">Không xác định</span>';
    }

    getSupportBadge(supportStatus) {
        const badges = {
            'none': '<span class="badge bg-secondary">Chưa liên hệ</span>',
            'contacted': '<span class="badge bg-primary">Đã liên hệ</span>',
            'scheduled': '<span class="badge bg-info">Đã hẹn lịch</span>',
            'in_progress': '<span class="badge bg-warning">Đang xử lý</span>',
            'resolved': '<span class="badge bg-success">Đã giải quyết</span>'
        };
        return badges[supportStatus] || '<span class="badge bg-secondary">—</span>';
    }

    renderPagination(pagination) {
        const paginationEl = document.getElementById('pagination');
        
        if (!pagination || pagination.total_pages <= 1) {
            paginationEl.innerHTML = '';
            this.updateShowingInfo(pagination);
            return;
        }

        let html = '';

        // Previous button
        html += `
            <li class="page-item ${!pagination.has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminBookings.goToPage(${this.currentPage - 1}); return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(pagination.total_pages, this.currentPage + 2);

        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="adminBookings.goToPage(1); return false;">1</a>
                </li>
            `;
            if (startPage > 2) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="adminBookings.goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        }

        if (endPage < pagination.total_pages) {
            if (endPage < pagination.total_pages - 1) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="adminBookings.goToPage(${pagination.total_pages}); return false;">
                        ${pagination.total_pages}
                    </a>
                </li>
            `;
        }

        // Next button
        html += `
            <li class="page-item ${!pagination.has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminBookings.goToPage(${this.currentPage + 1}); return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginationEl.innerHTML = html;
        this.updateShowingInfo(pagination);
    }

    updateShowingInfo(pagination) {
        if (!pagination) return;
        
        const from = pagination.total_count === 0 ? 0 : ((this.currentPage - 1) * this.limit + 1);
        const to = Math.min(this.currentPage * this.limit, pagination.total_count);
        
        document.getElementById('showing-from').textContent = from;
        document.getElementById('showing-to').textContent = to;
        document.getElementById('total-count').textContent = pagination.total_count;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadBookings();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderEmptyState() {
        const tbody = document.getElementById('bookings-tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-5">
                    <i class="fas fa-exclamation-circle fa-3x text-warning mb-3"></i>
                    <p class="text-muted">Không thể tải dữ liệu</p>
                </td>
            </tr>
        `;
    }

    async editBooking(bookingId) {
        this.editBookingId = bookingId;
        
        // Find booking in current data
        const booking = this.bookings.find(b => b.id === bookingId);
        
        if (!booking) {
            showToast('Không tìm thấy thông tin đăng ký', 'error');
            return;
        }

        // Populate form
        document.getElementById('edit-booking-id').value = booking.id;
        document.getElementById('edit-user-name').textContent = booking.user_fullname || '—';
        document.getElementById('edit-user-email').textContent = booking.user_email || '—';
        document.getElementById('edit-user-phone').textContent = booking.user_phone || '—';
        document.getElementById('edit-access-code').textContent = booking.access_code || '—';
        document.getElementById('edit-product-name').textContent = booking.product_name || '—';
        document.getElementById('edit-package-name').textContent = booking.package_name || '—';
        document.getElementById('edit-package-price').textContent = this.formatPrice(booking.package_price);
        
        document.getElementById('edit-status').value = booking.status;
        document.getElementById('edit-support-status').value = booking.support_status;
        document.getElementById('edit-staff-notes').value = booking.staff_notes || '';
        
        // Set scheduled_at with flatpickr
        if (this.flatpickrInstance) {
            if (booking.scheduled_at) {
                this.flatpickrInstance.setDate(booking.scheduled_at);
            } else {
                this.flatpickrInstance.clear();
            }
        }
        
        // Client notes (read-only)
        const clientNotesEl = document.getElementById('edit-client-notes');
        if (booking.client_notes) {
            clientNotesEl.innerHTML = booking.client_notes;
        } else {
            clientNotesEl.innerHTML = '<em class="text-muted">Không có ghi chú</em>';
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editBookingModal'));
        modal.show();
    }

    async saveBooking() {
        if (!this.editBookingId) return;

        const formData = {
            booking_id: this.editBookingId,
            status: document.getElementById('edit-status').value,
            support_status: document.getElementById('edit-support-status').value,
            staff_notes: document.getElementById('edit-staff-notes').value.trim(),
            scheduled_at: document.getElementById('edit-scheduled-at').value || null
        };

        try {
            const response = await fetch('api/admin/courses/update-booking.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showToast('Cập nhật thông tin thành công', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editBookingModal'));
                modal.hide();
                
                // Reload bookings
                this.loadBookings();
            } else {
                showToast(data.message || 'Không thể cập nhật thông tin', 'error');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            showToast('Lỗi khi cập nhật thông tin', 'error');
        }
    }

    async viewBookingDetail(bookingId) {
        const modal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
        const contentEl = document.getElementById('booking-detail-content');
        
        // Show loading
        contentEl.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Đang tải thông tin...</p>
            </div>
        `;
        
        modal.show();

        try {
            const response = await fetch(`api/admin/courses/get-booking-detail.php?id=${bookingId}`, {
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                this.renderBookingDetail(data.data);
            } else {
                contentEl.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        ${data.message || 'Không thể tải thông tin đăng ký'}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading booking detail:', error);
            contentEl.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Lỗi kết nối khi tải thông tin đăng ký
                </div>
            `;
        }
    }

    renderBookingDetail(booking) {
        const contentEl = document.getElementById('booking-detail-content');
        
        contentEl.innerHTML = `
            <div class="booking-detail">
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-user me-2"></i>Thông tin học viên</h6>
                        <table class="table table-sm">
                            <tr>
                                <td class="text-muted">ID:</td>
                                <td class="fw-medium">${booking.user_id}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Họ tên:</td>
                                <td class="fw-medium">${booking.user_fullname || '—'}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Email:</td>
                                <td>${booking.user_email || '—'}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Số điện thoại:</td>
                                <td>${booking.user_phone || '—'}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Access Code:</td>
                                <td><code>${booking.access_code}</code></td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-book me-2"></i>Thông tin khóa học</h6>
                        <table class="table table-sm">
                            <tr>
                                <td class="text-muted">Khóa học:</td>
                                <td class="fw-medium">${booking.product_name}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Gói:</td>
                                <td>${booking.package_name}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Giá:</td>
                                <td class="fw-medium text-success">${this.formatPrice(booking.package_price)} VNĐ</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Mã đơn hàng:</td>
                                <td>${booking.order_code || '—'}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-info-circle me-2"></i>Trạng thái</h6>
                        <table class="table table-sm">
                            <tr>
                                <td class="text-muted">Trạng thái:</td>
                                <td>${this.getStatusBadge(booking.status)}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Hỗ trợ:</td>
                                <td>${this.getSupportBadge(booking.support_status)}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Lịch hẹn:</td>
                                <td>${booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString('vi-VN') : '—'}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-clock me-2"></i>Thời gian</h6>
                        <table class="table table-sm">
                            <tr>
                                <td class="text-muted">Ngày đăng ký:</td>
                                <td>${booking.created_at_formatted}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Cập nhật:</td>
                                <td>${booking.updated_at_formatted}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Truy cập:</td>
                                <td>${booking.access_count || 0} lần</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                ${booking.client_notes ? `
                <hr>
                <div>
                    <h6><i class="fas fa-comment me-2"></i>Ghi chú từ học viên</h6>
                    <div class="p-3 bg-light rounded">
                        ${booking.client_notes}
                    </div>
                </div>
                ` : ''}
                
                ${booking.staff_notes ? `
                <hr>
                <div>
                    <h6><i class="fas fa-sticky-note me-2"></i>Ghi chú nội bộ</h6>
                    <div class="p-3 bg-light rounded">
                        ${booking.staff_notes}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    formatPrice(price) {
        if (!price) return '0';
        return parseFloat(price).toLocaleString('vi-VN');
    }
}

// Initialize when DOM is loaded
let adminBookings;
document.addEventListener('DOMContentLoaded', function() {
    adminBookings = new AdminBookingCoursesManager();
});
