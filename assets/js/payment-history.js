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
        this.loadPaymentData();
        this.bindEvents();
        this.renderPaymentHistory();
        this.updateSummaryCards();
    }

    // Load dữ liệu thanh toán (demo data)
    loadPaymentData() {
        // Dữ liệu demo - trong thực tế sẽ load từ API
        this.paymentData = [
            {
                id: 'TXN001',
                date: '2024-12-15',
                productName: 'Khóa học Định hướng nghề nghiệp cơ bản',
                type: 'course',
                amount: 2500000,
                status: 'completed',
                description: 'Khóa học 12 tuần với chuyên gia tư vấn nghề nghiệp'
            },
            {
                id: 'TXN002',
                date: '2024-12-10',
                productName: 'Tư vấn cá nhân - Lập kế hoạch nghề nghiệp',
                type: 'consultation',
                amount: 800000,
                status: 'completed',
                description: 'Buổi tư vấn 1:1 với chuyên gia (2 giờ)'
            },
            {
                id: 'TXN003',
                date: '2024-11-28',
                productName: 'Khóa học Phát triển kỹ năng mềm',
                type: 'course',
                amount: 1800000,
                status: 'completed',
                description: 'Khóa học 8 tuần về kỹ năng giao tiếp và lãnh đạo'
            },
            {
                id: 'TXN004',
                date: '2024-11-20',
                productName: 'Tư vấn nhóm - Workshop định hướng',
                type: 'consultation',
                amount: 500000,
                status: 'completed',
                description: 'Workshop nhóm 4 giờ về định hướng nghề nghiệp'
            },
            {
                id: 'TXN005',
                date: '2024-11-05',
                productName: 'Khóa học Chuẩn bị phỏng vấn chuyên nghiệp',
                type: 'course',
                amount: 1200000,
                status: 'completed',
                description: 'Khóa học 6 tuần với thực hành phỏng vấn thực tế'
            },
            {
                id: 'TXN006',
                date: '2024-10-18',
                productName: 'Tư vấn chuyên sâu - Chuyển đổi nghề nghiệp',
                type: 'consultation',
                amount: 1500000,
                status: 'completed',
                description: 'Gói tư vấn chuyên sâu 3 buổi với roadmap chi tiết'
            }
        ];

        this.filteredData = [...this.paymentData];
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

        // Filter data
        if (filterType === 'all') {
            this.filteredData = [...this.paymentData];
        } else {
            this.filteredData = this.paymentData.filter(item => item.type === filterType);
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
            const formattedDate = this.formatDate(payment.date);
            const formattedAmount = this.formatCurrency(payment.amount);
            const typeInfo = this.getTypeInfo(payment.type);
            const statusInfo = this.getStatusInfo(payment.status);

            return `
                <tr class="payment-row" data-id="${payment.id}">
                    <td class="px-4 py-3">
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${formattedDate.day}</span>
                            <small class="text-muted">${formattedDate.time}</small>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <code class="bg-light px-2 py-1 rounded">${payment.id}</code>
                    </td>
                    <td class="px-4 py-3">
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${payment.productName}</span>
                            <small class="text-muted">${payment.description}</small>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <span class="badge ${typeInfo.class} px-3 py-2">
                            <i class="${typeInfo.icon} me-1"></i>
                            ${typeInfo.label}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-end">
                        <span class="fw-bold text-primary">${formattedAmount}</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="badge ${statusInfo.class} px-3 py-2">
                            <i class="${statusInfo.icon} me-1"></i>
                            ${statusInfo.label}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="paymentHistory.viewDetails('${payment.id}')" title="Xem chi tiết">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-outline-success btn-sm" onclick="paymentHistory.downloadInvoice('${payment.id}')" title="Tải hóa đơn">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Update summary cards
    updateSummaryCards() {
        const totalPaid = this.filteredData.reduce((sum, payment) => sum + payment.amount, 0);
        const totalCourses = this.filteredData.filter(payment => payment.type === 'course').length;
        const totalConsultations = this.filteredData.filter(payment => payment.type === 'consultation').length;

        document.getElementById('total-paid').textContent = this.formatCurrency(totalPaid);
        document.getElementById('total-courses').textContent = totalCourses;
        document.getElementById('total-consultations').textContent = totalConsultations;
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
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    }

    // Get type information
    getTypeInfo(type) {
        const types = {
            'course': {
                label: 'Khóa học',
                class: 'bg-primary-subtle text-primary',
                icon: 'fas fa-graduation-cap'
            },
            'consultation': {
                label: 'Tư vấn',
                class: 'bg-info-subtle text-info',
                icon: 'fas fa-handshake'
            }
        };
        return types[type] || types['course'];
    }

    // Get status information
    getStatusInfo(status) {
        const statuses = {
            'completed': {
                label: 'Hoàn thành',
                class: 'bg-success-subtle text-success',
                icon: 'fas fa-check-circle'
            },
            'pending': {
                label: 'Đang xử lý',
                class: 'bg-warning-subtle text-warning',
                icon: 'fas fa-clock'
            },
            'failed': {
                label: 'Thất bại',
                class: 'bg-danger-subtle text-danger',
                icon: 'fas fa-times-circle'
            }
        };
        return statuses[status] || statuses['completed'];
    }

    // View payment details
    viewDetails(paymentId) {
        const payment = this.paymentData.find(p => p.id === paymentId);
        if (!payment) return;

        // Show modal with payment details (to be implemented)
        console.log('Viewing details for payment:', payment);
        alert(`Chi tiết giao dịch ${paymentId}\n\nSản phẩm: ${payment.productName}\nSố tiền: ${this.formatCurrency(payment.amount)}\nNgày: ${payment.date}`);
    }

    // Download invoice
    downloadInvoice(paymentId) {
        const payment = this.paymentData.find(p => p.id === paymentId);
        if (!payment) return;

        // Simulate download (to be implemented)
        console.log('Downloading invoice for payment:', payment);
        alert(`Đang tải hóa đơn cho giao dịch ${paymentId}...`);
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
