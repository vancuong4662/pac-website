/**
 * Payment History Management System
 * Quản lý hiển thị và xử lý lịch sử thanh toán
 */

class PaymentHistoryManager {
    constructor() {
        this.paymentData = [];
        this.init();
    }

    init() {
        console.log('[Payment History] Initializing...');
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
                
                console.log('[Payment History] Loaded:', this.paymentData.length, 'payments');
                
                this.renderPaymentHistory();
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
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem;"></i>
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

    // Render payment history table
    renderPaymentHistory() {
        const tbody = document.getElementById('payment-history-tbody');
        const emptyState = document.getElementById('empty-state');
        const table = document.getElementById('payment-history-table').closest('.card');

        if (this.paymentData.length === 0) {
            table.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }

        table.classList.remove('d-none');
        emptyState.classList.add('d-none');

        // Tạo danh sách các package từ tất cả payments
        const packageRows = [];
        
        this.paymentData.forEach(payment => {
            const statusInfo = this.getStatusInfo(payment.payment_status);
            
            // Render mỗi item như một package riêng biệt
            payment.items.forEach(item => {
                const typeInfo = this.getTypeInfo(item.product_type);
                
                packageRows.push(`
                    <tr class="payment-row" data-id="${payment.id}" data-package="${item.package_name}">
                        <td class="px-4 py-3" style="min-width: 300px;">
                            <div class="d-flex flex-column">
                                <span class="fw-medium">${item.product_name}</span>
                                <small class="text-muted">
                                    <span class="badge ${typeInfo.class} me-1">
                                        <i class="${typeInfo.icon} me-1"></i>${typeInfo.label}
                                    </span>
                                    ${item.package_name}
                                </small>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <div class="fw-medium">${payment.order_code}</div>
                            ${payment.vnp_transaction_no ? `<small class="text-muted">VNPay: ${payment.vnp_transaction_no}</small>` : ''}
                        </td>
                        <td class="px-4 py-3">
                            ${payment.pay_date ? `<div class="fw-medium">${payment.pay_date}</div>` : '<div class="text-muted">Chưa thanh toán</div>'}
                        </td>
                        <td class="px-4 py-3 text-end">
                            <div class="fw-bold text-primary">${this.formatCurrency(item.total_price)}</div>
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
                `);
            });
        });

        tbody.innerHTML = packageRows.join('');
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
                label: 'Tư vấn - bài test',
                class: 'bg-info-subtle text-info',
                icon: 'fas fa-clipboard-check'
            },
            'consultation': {
                label: 'Tư vấn - chuyên gia',
                class: 'bg-info-subtle text-info',
                icon: 'fas fa-handshake'
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
