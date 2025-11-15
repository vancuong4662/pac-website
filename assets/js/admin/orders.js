/**
 * Admin Orders Management JavaScript
 * Handles viewing and managing all paid orders
 */

let ordersData = [];
let filteredOrders = [];
let statistics = {
    totalOrders: 0,
    totalRevenue: 0,
    uniqueCustomers: 0
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeOrders();
});

async function initializeOrders() {
    console.log('Initializing orders management...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load orders data
    await loadOrders();
}

function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadOrders);
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Search input - debounced
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 500);
        });
    }
}

async function loadOrders() {
    console.log('Loading orders...');
    const tbody = document.getElementById('orders-tbody');
    
    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Đang tải đơn hàng...</p>
            </td>
        </tr>
    `;
    
    try {
        const response = await fetch('api/admin/orders.php');
        const result = await response.json();
        
        console.log('Orders API response:', result);
        
        if (result.success) {
            ordersData = result.data.orders || [];
            statistics = result.data.statistics || {};
            
            console.log(`Loaded ${ordersData.length} orders`);
            
            // Update statistics
            updateStatistics();
            
            // Apply current filters
            applyFilters();
        } else {
            showError('Lỗi tải dữ liệu: ' + result.message);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Lỗi kết nối: ' + error.message);
    }
}

function updateStatistics() {
    // Total orders
    const totalOrdersEl = document.getElementById('stat-total-orders');
    if (totalOrdersEl) {
        totalOrdersEl.textContent = statistics.totalOrders || ordersData.length;
    }
    
    // Total revenue
    const totalRevenueEl = document.getElementById('stat-total-revenue');
    if (totalRevenueEl) {
        totalRevenueEl.textContent = formatCurrency(statistics.totalRevenue || 0);
    }
    
    // Unique customers
    const uniqueCustomersEl = document.getElementById('stat-unique-customers');
    if (uniqueCustomersEl) {
        uniqueCustomersEl.textContent = statistics.uniqueCustomers || 0;
    }
}

function applyFilters() {
    const paymentStatus = document.getElementById('filter-payment-status').value;
    const productType = document.getElementById('filter-product-type').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    filteredOrders = ordersData.filter(order => {
        // Filter by payment status
        if (paymentStatus && order.payment_status !== paymentStatus) {
            return false;
        }
        
        // Filter by product type
        if (productType) {
            const hasProductType = order.items.some(item => item.product_type === productType);
            if (!hasProductType) return false;
        }
        
        // Filter by search term
        if (searchTerm) {
            const searchableText = `
                ${order.order_code}
                ${order.user_fullname}
                ${order.user_email}
                ${order.items.map(i => i.product_name + ' ' + i.package_name).join(' ')}
            `.toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    console.log(`Filtered to ${filteredOrders.length} orders`);
    renderOrders();
}

function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">Không tìm thấy đơn hàng nào</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const html = filteredOrders.map(order => {
        const paymentStatusInfo = getPaymentStatusInfo(order.payment_status);
        const itemsPreview = getItemsPreview(order.items);
        
        return `
            <tr>
                <td>
                    <div class="fw-bold text-primary">${escapeHtml(order.order_code)}</div>
                    ${order.vnpay_txn_ref ? `<small class="text-muted">VNPay: ${escapeHtml(order.vnpay_txn_ref)}</small>` : ''}
                </td>
                <td>
                    <div class="fw-medium">${escapeHtml(order.user_fullname || 'N/A')}</div>
                    <small class="text-muted">${escapeHtml(order.user_email || '')}</small>
                </td>
                <td>
                    ${itemsPreview}
                </td>
                <td>
                    ${order.created_at ? `
                        <div>${formatDate(order.created_at)}</div>
                        <small class="text-muted">${formatTime(order.created_at)}</small>
                    ` : '<span class="text-muted">N/A</span>'}
                </td>
                <td class="text-end">
                    <div class="fw-bold text-success">${formatCurrency(order.total_amount)}</div>
                    ${order.payment_method ? `<small class="text-muted">${getPaymentMethodLabel(order.payment_method)}</small>` : ''}
                </td>
                <td>
                    <span class="badge ${paymentStatusInfo.class} px-3 py-2">
                        <i class="${paymentStatusInfo.icon} me-1"></i>${paymentStatusInfo.label}
                    </span>
                </td>
                <td>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="viewOrderDetails(${order.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = html;
}

function getItemsPreview(items) {
    if (!items || items.length === 0) {
        return '<span class="text-muted">Không có sản phẩm</span>';
    }
    
    const firstItem = items[0];
    const typeInfo = getProductTypeInfo(firstItem.product_type);
    
    let html = `
        <div class="d-flex align-items-start">
            <span class="badge ${typeInfo.class} me-2">
                <i class="${typeInfo.icon}"></i>
            </span>
            <div>
                <div class="fw-medium">${escapeHtml(firstItem.product_name)}</div>
                <small class="text-muted">${escapeHtml(firstItem.package_name)}</small>
    `;
    
    if (items.length > 1) {
        html += `<div class="badge bg-secondary ms-1">+${items.length - 1} sản phẩm</div>`;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

async function viewOrderDetails(orderId) {
    const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
    const contentEl = document.getElementById('order-detail-content');
    
    // Show loading
    contentEl.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Đang tải chi tiết...</p>
        </div>
    `;
    
    modal.show();
    
    try {
        const response = await fetch(`api/admin/orders.php?id=${orderId}`);
        const result = await response.json();
        
        if (result.success) {
            renderOrderDetails(result.data);
        } else {
            contentEl.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${result.message}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        contentEl.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Lỗi tải chi tiết đơn hàng
            </div>
        `;
    }
}

function renderOrderDetails(order) {
    const contentEl = document.getElementById('order-detail-content');
    const paymentStatusInfo = getPaymentStatusInfo(order.payment_status);
    
    let html = `
        <!-- Order Info -->
        <div class="row mb-4">
            <div class="col-md-6">
                <h6 class="text-muted mb-2">Mã đơn hàng</h6>
                <p class="fw-bold fs-5 text-primary">${escapeHtml(order.order_code)}</p>
            </div>
            <div class="col-md-6">
                <h6 class="text-muted mb-2">Trạng thái thanh toán</h6>
                <span class="badge ${paymentStatusInfo.class} px-3 py-2">
                    <i class="${paymentStatusInfo.icon} me-1"></i>${paymentStatusInfo.label}
                </span>
            </div>
        </div>
        
        <!-- Customer Info -->
        <div class="card mb-3">
            <div class="card-header">
                <h6 class="mb-0"><i class="fas fa-user me-2"></i>Thông tin khách hàng</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <strong>Họ tên:</strong> ${escapeHtml(order.user_fullname || 'N/A')}
                    </div>
                    <div class="col-md-6">
                        <strong>Email:</strong> ${escapeHtml(order.user_email || 'N/A')}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Order Items -->
        <div class="card mb-3">
            <div class="card-header">
                <h6 class="mb-0"><i class="fas fa-shopping-bag me-2"></i>Chi tiết sản phẩm</h6>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Gói</th>
                                <th class="text-center">SL</th>
                                <th class="text-end">Đơn giá</th>
                                <th class="text-end">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    order.items.forEach(item => {
        const typeInfo = getProductTypeInfo(item.product_type);
        html += `
            <tr>
                <td>
                    <span class="badge ${typeInfo.class} me-1">
                        <i class="${typeInfo.icon}"></i>
                    </span>
                    ${escapeHtml(item.product_name)}
                </td>
                <td>${escapeHtml(item.package_name)}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${formatCurrency(item.unit_price)}</td>
                <td class="text-end fw-bold">${formatCurrency(item.total_price)}</td>
            </tr>
        `;
    });
    
    html += `
                        </tbody>
                        <tfoot>
                            <tr class="table-active">
                                <td colspan="4" class="text-end fw-bold">Tổng cộng:</td>
                                <td class="text-end fw-bold text-success fs-5">${formatCurrency(order.total_amount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Payment Info -->
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0"><i class="fas fa-credit-card me-2"></i>Thông tin thanh toán</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <strong>Phương thức:</strong> ${getPaymentMethodLabel(order.payment_method)}
                    </div>
                    <div class="col-md-6">
                        <strong>Ngày thanh toán:</strong> ${order.created_at ? formatDateTime(order.created_at) : 'N/A'}
                    </div>
    `;
    
    if (order.vnpay_txn_ref) {
        html += `
                    <div class="col-md-6 mb-2">
                        <strong>Mã GD VNPay:</strong> ${escapeHtml(order.vnpay_txn_ref)}
                    </div>
        `;
    }
    
    if (order.vnp_transaction_no) {
        html += `
                    <div class="col-md-6 mb-2">
                        <strong>Mã GD ngân hàng:</strong> ${escapeHtml(order.vnp_transaction_no)}
                    </div>
        `;
    }
    
    if (order.bank_name) {
        html += `
                    <div class="col-md-6 mb-2">
                        <strong>Ngân hàng:</strong> ${escapeHtml(order.bank_name)}
                    </div>
        `;
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    contentEl.innerHTML = html;
}

function getPaymentStatusInfo(status) {
    const statusMap = {
        'paid': {
            label: 'Đã thanh toán',
            class: 'bg-success',
            icon: 'fas fa-check-circle'
        },
        'pending': {
            label: 'Chờ thanh toán',
            class: 'bg-warning',
            icon: 'fas fa-clock'
        },
        'failed': {
            label: 'Thất bại',
            class: 'bg-danger',
            icon: 'fas fa-times-circle'
        }
    };
    
    return statusMap[status] || {
        label: status,
        class: 'bg-secondary',
        icon: 'fas fa-question-circle'
    };
}

function getProductTypeInfo(type) {
    const typeMap = {
        'career_test': {
            label: 'Trắc nghiệm',
            class: 'bg-primary',
            icon: 'fas fa-clipboard-check'
        },
        'course': {
            label: 'Khóa học',
            class: 'bg-success',
            icon: 'fas fa-graduation-cap'
        },
        'consultation': {
            label: 'Tư vấn',
            class: 'bg-info',
            icon: 'fas fa-user-tie'
        }
    };
    
    return typeMap[type] || {
        label: type,
        class: 'bg-secondary',
        icon: 'fas fa-box'
    };
}

function getPaymentMethodLabel(method) {
    const methodMap = {
        'vnpay': 'VNPay',
        'bank_transfer': 'Chuyển khoản',
        'cash': 'Tiền mặt',
        'momo': 'MoMo'
    };
    
    return methodMap[method] || method || 'N/A';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN');
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <p class="text-danger mb-0">${escapeHtml(message)}</p>
                <button class="btn btn-primary btn-sm mt-3" onclick="loadOrders()">
                    <i class="fas fa-redo me-1"></i>Thử lại
                </button>
            </td>
        </tr>
    `;
}

function showToast(message, type = 'info') {
    // Use existing toast system if available
    if (window.ToastBar && typeof window.ToastBar.show === 'function') {
        window.ToastBar.show(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}
