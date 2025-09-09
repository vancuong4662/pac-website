/**
 * Order Confirmation JavaScript Module
 * Handles order confirmation page functionality
 */

// Global variables
let orderDetails = null;

// Initialize order confirmation page
function initializeOrderConfirmation() {
    setupPrintHandlers();
    loadOrderFromUrl();
}

// Setup print handlers
function setupPrintHandlers() {
    // Print button
    const printBtn = document.querySelector('.btn-print');
    if (printBtn) {
        printBtn.addEventListener('click', printOrder);
    }
    
    // Print keyboard shortcut
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            printOrder();
        }
    });
}

// Load order from URL parameters
function loadOrderFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    
    if (!orderId) {
        showError('Không tìm thấy thông tin đơn hàng', 'Vui lòng kiểm tra lại đường dẫn');
        return;
    }
    
    loadOrderDetails(orderId);
}

// Load order details from API
async function loadOrderDetails(orderId) {
    try {
        showLoading(true);
        
        const response = await fetch(`api/orders/detail.php?id=${orderId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            orderDetails = data.data;
            displayOrderDetails(data.data);
        } else {
            showError('Không thể tải thông tin đơn hàng', data.message || 'Đơn hàng không tồn tại hoặc bạn không có quyền truy cập');
        }
    } catch (error) {
        console.error('Error loading order:', error);
        showError('Có lỗi xảy ra', 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
        showLoading(false);
    }
}

// Display order details
function displayOrderDetails(order) {
    // Update page title
    document.title = `Đơn hàng #${order.id} - Unlock Your Career`;
    
    // Order header
    updateOrderHeader(order);
    
    // Customer information
    updateCustomerInfo(order);
    
    // Payment information
    updatePaymentInfo(order);
    
    // Order items (placeholder for now)
    updateOrderItems(order);
    
    // Order summary
    updateOrderSummary(order);
    
    // Payment instructions
    updatePaymentInstructions(order);
    
    // Show order details
    document.getElementById('orderDetails').style.display = 'block';
}

// Update order header
function updateOrderHeader(order) {
    const orderTitle = document.getElementById('orderTitle');
    const orderDate = document.getElementById('orderDate');
    
    if (orderTitle) {
        orderTitle.textContent = `Đơn hàng #${order.id}`;
    }
    
    if (orderDate) {
        orderDate.textContent = `Ngày đặt: ${formatDate(order.created_at)}`;
    }
}

// Update customer information
function updateCustomerInfo(order) {
    const customerInfo = document.getElementById('customerInfo');
    if (!customerInfo) return;
    
    const customerData = [
        { label: 'Họ tên:', value: `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim() },
        { label: 'Email:', value: order.customer_email },
        { label: 'Điện thoại:', value: order.customer_phone },
    ];
    
    // Add address if available
    if (order.customer_address) {
        customerData.push({ label: 'Địa chỉ:', value: order.customer_address });
    }
    
    if (order.customer_city || order.customer_district) {
        const location = [order.customer_district, order.customer_city].filter(Boolean).join(', ');
        if (location) {
            customerData.push({ label: 'Khu vực:', value: location });
        }
    }
    
    customerInfo.innerHTML = customerData.map(item => `
        <div class="info-item">
            <span class="info-label">${item.label}</span>
            <span class="info-value">${item.value || 'Không có thông tin'}</span>
        </div>
    `).join('');
}

// Update payment information
function updatePaymentInfo(order) {
    const paymentInfo = document.getElementById('paymentInfo');
    if (!paymentInfo) return;
    
    const paymentMethods = {
        'bank_transfer': 'Chuyển khoản ngân hàng',
        'momo': 'Ví MoMo',
        'vnpay': 'VNPay',
        'credit_card': 'Thẻ tín dụng',
        'cash': 'Tiền mặt'
    };
    
    const statusMap = {
        'pending': { text: 'Chờ thanh toán', class: 'text-warning' },
        'paid': { text: 'Đã thanh toán', class: 'text-success' },
        'failed': { text: 'Thanh toán thất bại', class: 'text-danger' }
    };
    
    const paymentStatus = statusMap[order.payment_status] || statusMap.pending;
    
    paymentInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">Phương thức:</span>
            <span class="info-value">${paymentMethods[order.payment_method] || order.payment_method}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Trạng thái:</span>
            <span class="info-value ${paymentStatus.class}">${paymentStatus.text}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Tổng tiền:</span>
            <span class="info-value fw-bold">${formatPrice(order.total_amount)} VNĐ</span>
        </div>
    `;
}

// Update order items (placeholder)
function updateOrderItems(order) {
    const orderItems = document.getElementById('orderItemsList');
    if (!orderItems) return;
    
    // For now, show placeholder since we don't have order items API
    orderItems.innerHTML = `
        <div class="text-center text-muted p-4">
            <i class="fas fa-box-open mb-3" style="font-size: 48px; opacity: 0.5;"></i>
            <h4>Chi tiết sản phẩm</h4>
            <p>Danh sách sản phẩm đã đặt sẽ được hiển thị tại đây</p>
            <small class="text-muted">Tính năng này sẽ được cập nhật trong phiên bản tiếp theo</small>
        </div>
    `;
}

// Update order summary
function updateOrderSummary(order) {
    const orderSummary = document.getElementById('orderSummary');
    if (!orderSummary) return;
    
    const subtotal = order.total_amount || 0;
    const shipping = 0; // Free shipping
    const discount = 0; // No discount for now
    const total = subtotal - discount + shipping;
    
    orderSummary.innerHTML = `
        <div class="summary-row">
            <span>Tạm tính:</span>
            <span>${formatPrice(subtotal)} VNĐ</span>
        </div>
        <div class="summary-row">
            <span>Phí vận chuyển:</span>
            <span>Miễn phí</span>
        </div>
        ${discount > 0 ? `
        <div class="summary-row">
            <span>Giảm giá:</span>
            <span class="text-success">-${formatPrice(discount)} VNĐ</span>
        </div>
        ` : ''}
        <div class="summary-row total">
            <span>Tổng cộng:</span>
            <span>${formatPrice(total)} VNĐ</span>
        </div>
    `;
}

// Update payment instructions
function updatePaymentInstructions(order) {
    const container = document.getElementById('paymentInstructions');
    if (!container) return;
    
    let instructionsHTML = `
        <h4><i class="fas fa-info-circle"></i>Hướng dẫn thanh toán</h4>
    `;
    
    if (order.payment_method === 'bank_transfer') {
        instructionsHTML += generateBankTransferInstructions(order);
    } else if (order.payment_method === 'momo') {
        instructionsHTML += generateMoMoInstructions(order);
    } else if (order.payment_method === 'vnpay') {
        instructionsHTML += generateVNPayInstructions(order);
    } else {
        instructionsHTML += generateGenericInstructions(order);
    }
    
    container.innerHTML = instructionsHTML;
}

// Generate bank transfer instructions
function generateBankTransferInstructions(order) {
    return `
        <div class="payment-method">
            <i class="fas fa-university"></i>
            <div class="payment-method-info">
                <h5>Chuyển khoản ngân hàng</h5>
                <p class="payment-method-desc">Vui lòng chuyển khoản theo thông tin dưới đây</p>
            </div>
        </div>
        
        <div class="bank-info">
            <div class="bank-detail">
                <span class="bank-label">Ngân hàng:</span>
                <span class="bank-value">Vietcombank - Chi nhánh Hà Nội</span>
            </div>
            <div class="bank-detail">
                <span class="bank-label">Số tài khoản:</span>
                <span class="bank-value">1234567890</span>
            </div>
            <div class="bank-detail">
                <span class="bank-label">Tên tài khoản:</span>
                <span class="bank-value">UNLOCK YOUR CAREER</span>
            </div>
            <div class="bank-detail">
                <span class="bank-label">Số tiền:</span>
                <span class="bank-value">${formatPrice(order.total_amount)} VNĐ</span>
            </div>
            <div class="bank-detail">
                <span class="bank-label">Nội dung chuyển khoản:</span>
                <span class="bank-value">Thanh toan don hang ${order.id}</span>
            </div>
        </div>
        
        <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Lưu ý quan trọng:</strong>
            <ul class="mb-0 mt-2">
                <li>Vui lòng chuyển khoản đúng số tiền và nội dung để đơn hàng được xử lý nhanh chóng</li>
                <li>Đơn hàng sẽ được xử lý trong vòng 1-2 giờ làm việc sau khi nhận được thanh toán</li>
                <li>Nếu có thắc mắc, vui lòng liên hệ hotline: 1900-xxxx</li>
            </ul>
        </div>
    `;
}

// Generate MoMo instructions
function generateMoMoInstructions(order) {
    return `
        <div class="payment-method">
            <i class="fas fa-mobile-alt"></i>
            <div class="payment-method-info">
                <h5>Thanh toán qua MoMo</h5>
                <p class="payment-method-desc">Quét mã QR hoặc chuyển khoản qua số điện thoại</p>
            </div>
        </div>
        
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Thông báo:</strong> Tính năng thanh toán MoMo đang được phát triển và sẽ được cập nhật sớm.
            Hiện tại vui lòng sử dụng phương thức chuyển khoản ngân hàng.
        </div>
    `;
}

// Generate VNPay instructions
function generateVNPayInstructions(order) {
    return `
        <div class="payment-method">
            <i class="fas fa-credit-card"></i>
            <div class="payment-method-info">
                <h5>Thanh toán qua VNPay</h5>
                <p class="payment-method-desc">Thanh toán bằng thẻ ATM, Visa, MasterCard</p>
            </div>
        </div>
        
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Thông báo:</strong> Tính năng thanh toán VNPay đang được phát triển và sẽ được cập nhật sớm.
            Hiện tại vui lòng sử dụng phương thức chuyển khoản ngân hàng.
        </div>
    `;
}

// Generate generic instructions
function generateGenericInstructions(order) {
    return `
        <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Thông báo:</strong> Hướng dẫn thanh toán cho phương thức này sẽ được cập nhật sớm.
            Vui lòng liên hệ với chúng tôi để được hỗ trợ.
        </div>
    `;
}

// Print order
function printOrder() {
    // Hide elements that shouldn't be printed
    const elementsToHide = [
        '.btn', 'button', '.toast-container', 
        '#header-placeholder', '#footer-placeholder',
        '.back-to-cart', '.action-buttons'
    ];
    
    elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.display = 'none';
        });
    });
    
    // Print
    window.print();
    
    // Restore hidden elements
    elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.display = '';
        });
    });
}

// Show loading state
function showLoading(show) {
    const loadingOrder = document.getElementById('loadingOrder');
    const orderDetails = document.getElementById('orderDetails');
    
    if (loadingOrder) {
        loadingOrder.style.display = show ? 'block' : 'none';
    }
    
    if (orderDetails) {
        orderDetails.style.display = show ? 'none' : 'block';
    }
}

// Show error message
function showError(title, message) {
    const loadingOrder = document.getElementById('loadingOrder');
    const orderDetails = document.getElementById('orderDetails');
    
    if (loadingOrder) {
        loadingOrder.style.display = 'none';
    }
    
    if (orderDetails) {
        orderDetails.innerHTML = `
            <div class="text-center p-5">
                <i class="fas fa-exclamation-triangle text-danger mb-3" style="font-size: 48px;"></i>
                <h3 class="text-danger">${title}</h3>
                <p class="text-muted mb-4">${message}</p>
                <div class="d-flex gap-3 justify-content-center">
                    <a href="products" class="btn btn-primary">
                        <i class="fas fa-shopping-bag me-2"></i>
                        Mua sắm ngay
                    </a>
                    <a href="cart" class="btn btn-outline-primary">
                        <i class="fas fa-shopping-cart me-2"></i>
                        Xem giỏ hàng
                    </a>
                </div>
            </div>
        `;
        orderDetails.style.display = 'block';
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Không xác định';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Không xác định';
    }
}

// Format price
function formatPrice(price) {
    if (isNaN(price)) return '0';
    return new Intl.NumberFormat('vi-VN').format(price);
}

// Export functions for global use
window.initializeOrderConfirmation = initializeOrderConfirmation;
window.printOrder = printOrder;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeOrderConfirmation();
});
