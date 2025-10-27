/**
 * Payment History Management System
 * Quản lý hiển thị và xử lý lịch sử thanh toán
 */

class PaymentHistoryManager {
    constructor() {
        this.paymentData = [];
        this.filteredData = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        console.log('[Payment History] Initializing...');
        this.bindEvents();
        this.loadPaymentData();
    }

    // Load dữ liệu thanh toán từ API
    async loadPaymentData() {
        try {
            console.log('[Payment History] Loading payment history from API...');
            
            // Show loading state
            this.showLoadingState();

            const response = await fetch('api/orders/payment-history-simple.php');
            const data = await response.json();

            if (data.success) {
                this.paymentData = data.data.payments;
                this.summary = data.data.summary;
                this.filteredData = [...this.paymentData];
                
                console.log('[Payment History] Loaded:', this.paymentData.length, 'payments');
                
                this.renderPaymentHistory();
                this.updateSummaryCards();
            } else {
                throw new Error(data.message || 'Không thể tải lịch sử thanh toán');
            }

        } catch (error) {
            console.error('[Payment History] Load error:', error);
            this.showErrorState(error.message);
        }
    }

    showLoadingState() {
        const tbody = document.getElementById('payment-history-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Đang tải...</span>
                        </div>
                        <div class="mt-3 text-muted">Đang tải lịch sử thanh toán...</div>
                    </td>
                </tr>
            `;
        }
    }

    showErrorState(message) {
        const tbody = document.getElementById('payment-history-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="text-danger mb-3">
                            <i class="fas fa-exclamation-triangle fa-3x"></i>
                        </div>
                        <h5 class="text-danger">Lỗi tải dữ liệu</h5>
                        <p class="text-muted">${message}</p>
                        <button class="btn btn-primary btn-sm" onclick="paymentHistory.loadPaymentData()">
                            <i class="fas fa-redo me-1"></i> Thử lại
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    // Bind event handlers
    bindEvents() {
        // Filter dropdown
        const filterItems = document.querySelectorAll('[data-filter]');
        filterItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFilter(e.target.dataset.filter);
            });
        });
    }

    // Handle filter
    handleFilter(filterType) {
        this.currentFilter = filterType;
        
        // Update dropdown button text
        const filterButton = document.getElementById('filterDropdown');
        const filterText = {
            'all': 'Tất cả',
            'course': 'Khóa học', 
            'consultation': 'Tư vấn'
        };
        filterButton.innerHTML = `<i class="fas fa-filter me-1"></i>${filterText[filterType]}`;

        // Filter data based on primary_type from API
        if (filterType === 'all') {
            this.filteredData = [...this.paymentData];
        } else if (filterType === 'course') {
            // Include both course and career_test under "Khóa học"
            this.filteredData = this.paymentData.filter(item => 
                item.primary_type === 'course' || item.primary_type === 'career_test'
            );
        } else {
            this.filteredData = this.paymentData.filter(item => item.primary_type === filterType);
        }

        this.renderPaymentHistory();
        this.updateSummaryCards();
    }

    // Render payment history table
    renderPaymentHistory() {
        const tbody = document.getElementById('payment-history-tbody');
        const emptyState = document.getElementById('empty-state');
        const table = document.getElementById('payment-history-table').closest('.card');

        if (this.filteredData.length === 0) {
            table.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }

        table.classList.remove('d-none');
        emptyState.classList.add('d-none');

        tbody.innerHTML = this.filteredData.map(payment => {
            const statusInfo = this.getStatusInfo(payment.payment_status);
            const primaryProduct = this.getPrimaryProductInfo(payment);

            return `
                <tr class="payment-row" data-id="${payment.id}">
                    <td class="px-4 py-3" style="min-width: 300px;">
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${primaryProduct.name}</span>
                            <small class="text-muted">${this.getItemsSummary(payment)}</small>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="fw-medium">${payment.order_code}</div>
                        ${payment.vnp_transaction_no ? `<small class="text-muted">VNPay: ${payment.vnp_transaction_no}</small>` : ''}
                    </td>
                    <td class="px-4 py-3">
                        <div class="fw-medium">${payment.pay_date || payment.created_at}</div>
                    </td>
                    <td class="px-4 py-3 text-end">
                        <div class="fw-bold text-primary">${this.formatCurrency(payment.total_amount)}</div>
                        ${payment.bank_name ? `<small class="text-muted">${payment.bank_name}</small>` : ''}
                    </td>
                    <td class="px-4 py-3">
                        <span class="badge ${statusInfo.class} px-3 py-2">
                            <i class="${statusInfo.icon} me-1"></i>
                            ${statusInfo.label}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="paymentHistory.viewDetails(${payment.id})" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${payment.payment_status === 'paid' ? `
                                <button type="button" class="btn btn-outline-success btn-sm" onclick="paymentHistory.downloadInvoice(${payment.id})" title="Tải hóa đơn">
                                    <i class="fas fa-download"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getPrimaryProductInfo(payment) {
        if (payment.items.length === 0) {
            return { name: 'Không có sản phẩm' };
        }

        if (payment.items.length === 1) {
            const item = payment.items[0];
            return {
                name: item.product_name
            };
        }

        // Multiple items
        const firstItem = payment.items[0];
        return {
            name: `${firstItem.product_name} (+${payment.items.length - 1} sản phẩm khác)`
        };
    }

    getItemsSummary(payment) {
        const counts = [];
        if (payment.course_count > 0) counts.push(`${payment.course_count} khóa học`);
        if (payment.test_count > 0) counts.push(`${payment.test_count} bài test`);
        if (payment.consultation_count > 0) counts.push(`${payment.consultation_count} tư vấn`);
        
        return counts.join(', ') || 'Không có sản phẩm';
    }

    // Update summary cards
    updateSummaryCards() {
        if (this.summary) {
            // Use summary from API
            document.getElementById('total-paid').textContent = this.formatCurrency(this.summary.total_paid);
            document.getElementById('total-courses').textContent = this.summary.total_courses + (this.summary.total_tests || 0);
            document.getElementById('total-consultations').textContent = this.summary.total_consultations;
        } else {
            // Fallback: calculate from filtered data
            const totalPaid = this.filteredData
                .filter(payment => payment.payment_status === 'paid')
                .reduce((sum, payment) => sum + payment.total_amount, 0);
            const totalCourses = this.filteredData
                .filter(payment => payment.primary_type === 'course' || payment.primary_type === 'career_test')
                .reduce((sum, payment) => sum + payment.course_count + payment.test_count, 0);
            const totalConsultations = this.filteredData
                .filter(payment => payment.primary_type === 'consultation')
                .reduce((sum, payment) => sum + payment.consultation_count, 0);

            document.getElementById('total-paid').textContent = this.formatCurrency(totalPaid);
            document.getElementById('total-courses').textContent = totalCourses;
            document.getElementById('total-consultations').textContent = totalConsultations;
        }
    }

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.toLocaleDateString('vi-VN');
        const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return { day, time };
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    // Get type information
    getTypeInfo(type) {
        const types = {
            'course': {
                label: 'Khóa học',
                class: 'bg-primary-subtle text-primary',
                icon: 'fas fa-graduation-cap'
            },
            'career_test': {
                label: 'Test nghề nghiệp',
                class: 'bg-info-subtle text-info',
                icon: 'fas fa-clipboard-check'
            },
            'consultation': {
                label: 'Tư vấn',
                class: 'bg-warning-subtle text-warning',
                icon: 'fas fa-handshake'
            },
            'mixed': {
                label: 'Hỗn hợp',
                class: 'bg-secondary-subtle text-secondary',
                icon: 'fas fa-layer-group'
            }
        };
        return types[type] || types['mixed'];
    }

    // Get status information
    getStatusInfo(status) {
        const statuses = {
            'paid': {
                label: 'Đã thanh toán',
                class: 'bg-success-subtle text-success',
                icon: 'fas fa-check-circle'
            },
            'pending': {
                label: 'Chờ thanh toán',
                class: 'bg-warning-subtle text-warning',
                icon: 'fas fa-clock'
            },
            'failed': {
                label: 'Thất bại',
                class: 'bg-danger-subtle text-danger',
                icon: 'fas fa-times-circle'
            },
            'cancelled': {
                label: 'Đã hủy',
                class: 'bg-secondary-subtle text-secondary',
                icon: 'fas fa-ban'
            }
        };
        return statuses[status] || statuses['pending'];
    }

    // View payment details
    viewDetails(paymentId) {
        const payment = this.paymentData.find(p => p.id === paymentId);
        if (!payment) return;

        // Create modal content
        const modalContent = `
            <div class="modal fade" id="orderDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chi tiết đơn hàng #${payment.order_code}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${this.renderOrderDetailsContent(payment)}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            ${payment.payment_status === 'paid' ? `
                                <button type="button" class="btn btn-primary" onclick="paymentHistory.downloadInvoice(${payment.id})">
                                    <i class="fas fa-download me-1"></i>Tải hóa đơn
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existingModal = document.getElementById('orderDetailsModal');
        if (existingModal) existingModal.remove();

        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        modal.show();
    }

    renderOrderDetailsContent(payment) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6>Thông tin đơn hàng</h6>
                    <table class="table table-sm">
                        <tr><td>Mã đơn hàng:</td><td><strong>${payment.order_code}</strong></td></tr>
                        <tr><td>Ngày tạo:</td><td>${payment.created_at}</td></tr>
                        <tr><td>Tổng tiền:</td><td><strong class="text-primary">${this.formatCurrency(payment.total_amount)}</strong></td></tr>
                        <tr><td>Trạng thái:</td><td>${this.getStatusInfo(payment.payment_status).label}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Thông tin thanh toán</h6>
                    <table class="table table-sm">
                        <tr><td>Phương thức:</td><td>${payment.payment_method || 'N/A'}</td></tr>
                        <tr><td>Ngân hàng:</td><td>${payment.bank_name || 'N/A'}</td></tr>
                        <tr><td>Mã giao dịch VNPay:</td><td>${payment.vnp_transaction_no || 'N/A'}</td></tr>
                        <tr><td>Thời gian thanh toán:</td><td>${payment.pay_date || 'Chưa thanh toán'}</td></tr>
                    </table>
                </div>
            </div>
            
            <hr>
            
            <h6>Sản phẩm đã mua</h6>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>Gói</th>
                            <th>Loại</th>
                            <th class="text-end">Số lượng</th>
                            <th class="text-end">Đơn giá</th>
                            <th class="text-end">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payment.items.map(item => `
                            <tr>
                                <td>${item.product_name}</td>
                                <td>${item.package_name}</td>
                                <td>${this.getTypeInfo(item.product_type).label}</td>
                                <td class="text-end">${item.quantity}</td>
                                <td class="text-end">${this.formatCurrency(item.unit_price)}</td>
                                <td class="text-end"><strong>${this.formatCurrency(item.total_price)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Download invoice
    downloadInvoice(paymentId) {
        const payment = this.paymentData.find(p => p.id === paymentId);
        if (!payment) return;

        // Placeholder for invoice download functionality
        console.log('Downloading invoice for payment:', payment);
        
        if (typeof showToast !== 'undefined') {
            showToast('Tính năng tải hóa đơn sẽ được triển khai sớm', 'info');
        } else {
            alert('Tính năng tải hóa đơn sẽ được triển khai sớm');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.paymentHistory = new PaymentHistoryManager();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentHistoryManager;
}
