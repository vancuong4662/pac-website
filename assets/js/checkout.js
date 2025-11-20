/**
 * Checkout JavaScript Module
 * Handles checkout form, validation, and order processing
 */

// Global variables
let orderData = null;
let isProcessing = false;

// Initialize checkout page
function initializeCheckout() {
    setupFormValidation();
    setupPaymentMethodHandlers();
    loadUserProfile();
    loadCheckoutData();
    setupFormSubmission();
}

// Setup form validation
function setupFormValidation() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    // Add real-time validation
    const requiredFields = form.querySelectorAll('input[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', validateField);
        field.addEventListener('input', clearFieldError);
    });
    
    // Phone number formatting
    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('input', formatPhoneNumber);
    }
    
    // Email validation
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('blur', validateEmail);
    }
}

// Validate individual field
function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    
    clearFieldError(field);
    
    if (!value) {
        showFieldError(field, 'Trường này không được để trống');
        return false;
    }
    
    // Specific validations
    switch (field.type) {
        case 'email':
            return validateEmail(event);
        case 'tel':
            return validatePhone(field, value);
        default:
            return true;
    }
}

// Validate email
function validateEmail(event) {
    const field = event.target || event;
    const email = field.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        showFieldError(field, 'Địa chỉ email không hợp lệ');
        return false;
    }
    
    return true;
}

// Validate phone number
function validatePhone(field, phone) {
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    
    if (phone && !phoneRegex.test(phone)) {
        showFieldError(field, 'Số điện thoại không hợp lệ');
        return false;
    }
    
    return true;
}

// Format phone number
function formatPhoneNumber(event) {
    const field = event.target;
    let value = field.value.replace(/\D/g, '');
    
    // Vietnamese phone number formatting
    if (value.length >= 10) {
        if (value.startsWith('84')) {
            value = '+84 ' + value.slice(2, 5) + ' ' + value.slice(5, 8) + ' ' + value.slice(8);
        } else if (value.startsWith('0')) {
            value = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7);
        }
    }
    
    field.value = value;
}

// Show field error
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('is-invalid');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(field) {
    if (typeof field === 'object' && field.target) {
        field = field.target;
    }
    
    field.classList.remove('is-invalid');
    
    const existingError = field.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
}

// Setup payment method handlers
function setupPaymentMethodHandlers() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            selectPaymentMethod(this.querySelector('input[type="radio"]').value);
        });
    });
}

// Select payment method
function selectPaymentMethod(method) {
    // Remove selected class from all methods
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selected class to clicked method
    const selectedMethod = document.querySelector(`input[value="${method}"]`).closest('.payment-method');
    selectedMethod.classList.add('selected');
    
    // Check the radio button
    document.querySelector(`input[value="${method}"]`).checked = true;
    
    // Show/hide payment-specific fields
    togglePaymentFields(method);
}

// Toggle payment method specific fields
function togglePaymentFields(method) {
    // Hide all payment-specific sections
    const paymentSections = document.querySelectorAll('.payment-details');
    paymentSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show/hide VNPay bank selection
    const vnpayBankSelection = document.getElementById('vnpayBankSelection');
    if (vnpayBankSelection) {
        vnpayBankSelection.style.display = method === 'vnpay' ? 'block' : 'none';
    }
    
    // Show relevant section
    const relevantSection = document.getElementById(`${method}-details`);
    if (relevantSection) {
        relevantSection.style.display = 'block';
    }
}

// Load user profile to pre-fill form
async function loadUserProfile() {
    try {
        const response = await fetch('api/auth/get-profile.php');
        const data = await response.json();
        
        if (data.success && data.data) {
            const profile = data.data;
            
            // Pre-fill form fields
            fillFormField('firstName', profile.first_name);
            fillFormField('lastName', profile.last_name);
            fillFormField('email', profile.email);
            fillFormField('phone', profile.phone);
            fillFormField('address', profile.address);
            fillFormField('city', profile.city);
            fillFormField('district', profile.district);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Fill form field if exists and is empty
function fillFormField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && !field.value && value) {
        field.value = value;
    }
}

// Load checkout data (total amount from localStorage)
async function loadCheckoutData() {
    try {
        showCheckoutLoading(true);
        
        // Get total amount from localStorage (set by cart page)
        const totalAmount = localStorage.getItem('checkout_total_amount');
        
        if (!totalAmount || parseFloat(totalAmount) <= 0) {
            // Redirect to cart if no total amount
            showToast('Không có thông tin đơn hàng. Chuyển hướng về giỏ hàng...', 'warning');
            setTimeout(() => {
                window.location.href = 'cart';
            }, 2000);
            return;
        }
        
        // Create simplified order data
        orderData = {
            total_amount: parseFloat(totalAmount)
        };
        
        displayOrderSummary(orderData);
    } catch (error) {
        console.error('Error loading checkout data:', error);
        showToast('Có lỗi xảy ra khi tải dữ liệu đơn hàng', 'error');
    } finally {
        showCheckoutLoading(false);
    }
}

// Display order summary (simplified version)
function displayOrderSummary(orderData) {
    const summaryContainer = document.getElementById('orderSummary');
    const totalsContainer = document.getElementById('orderTotals');
    
    if (!summaryContainer || !totalsContainer) return;
    
    // Show simple message for order items
    summaryContainer.innerHTML = `
        <div class="summary-item" data-aos="fade-up">
            <div class="summary-item-info">
                <div class="summary-item-name">Sản phẩm đã chọn</div>
                <div class="summary-item-details">Chi tiết đơn hàng từ giỏ hàng</div>
                <div class="summary-item-price">${formatPrice(orderData.total_amount)} VNĐ</div>
            </div>
        </div>
    `;
    
    // Display totals
    const total = orderData.total_amount;
    const shipping = 0; // Free shipping
    const tax = 0; // No tax
    
    totalsContainer.innerHTML = `
        <div class="total-row">
            <span>Tạm tính:</span>
            <span>${formatPrice(total)} VNĐ</span>
        </div>
        <div class="total-row">
            <span>Phí vận chuyển:</span>
            <span>Miễn phí</span>
        </div>
        <div class="total-row final">
            <span>Tổng cộng:</span>
            <span>${formatPrice(total)} VNĐ</span>
        </div>
    `;
    
    // Enable checkout button
    const checkoutBtn = document.getElementById('placeOrderBtn');
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
    }
}

// Place order
async function placeOrder() {
    if (isProcessing) return;
    
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    // Validate form
    if (!validateForm(form)) {
        showToast('Vui lòng kiểm tra lại thông tin đã nhập', 'error');
        return;
    }
    
    if (!orderData || !orderData.total_amount || orderData.total_amount <= 0) {
        showToast('Không có thông tin đơn hàng', 'error');
        return;
    }
    
    try {
        isProcessing = true;
        showOrderProcessing(true);
        
        const formData = new FormData(form);
        
        // Prepare order data with total amount from localStorage
        const orderRequestData = {
            customer_info: {
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                city: formData.get('city'),
                district: formData.get('district')
            },
            payment_method: formData.get('paymentMethod') || 'vnpay',
            total_amount: orderData.total_amount
        };
        
        const response = await fetch('api/orders/create.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderRequestData)
        });
        
        // Log response text for debugging
        const responseText = await response.text();
        console.log('API Response Text:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response was:', responseText);
            throw new Error('Invalid JSON response from server');
        }
        
        if (data.success) {
            const orderId = data.data.order_id;
            const paymentMethod = formData.get('paymentMethod') || 'vnpay';
            
            // Handle VNPay payment
            if (paymentMethod === 'vnpay') {
                await handleVNPayPayment(orderId, formData);
            } else {
                // Other payment methods
                showToast('Đặt hàng thành công!', 'success');
                
                // Clear form and saved data
                form.reset();
                clearSavedFormData();
                
                // Redirect to order confirmation
                setTimeout(() => {
                    window.location.href = `order-confirmation?id=${orderId}`;
                }, 1500);
            }
        } else {
            throw new Error(data.message || 'Có lỗi xảy ra khi đặt hàng');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.message || 'Có lỗi xảy ra khi đặt hàng', 'error');
    } finally {
        isProcessing = false;
        showOrderProcessing(false);
    }
}

// Setup form submission
function setupFormSubmission() {
    const form = document.getElementById('checkoutForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }
}

// Handle form submit
function handleFormSubmit(event) {
    event.preventDefault();
    placeOrder();
}

// Validate entire form
function validateForm(form) {
    let isValid = true;
    
    // Clear existing errors
    form.querySelectorAll('.is-invalid').forEach(field => {
        clearFieldError(field);
    });
    
    // Validate required fields
    const requiredFields = form.querySelectorAll('input[required]');
    requiredFields.forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });
    
    // Validate payment method selection
    const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentMethod) {
        showToast('Vui lòng chọn phương thức thanh toán', 'error');
        isValid = false;
    }
    
    return isValid;
}

// Show checkout loading
function showCheckoutLoading(show) {
    const loadingElements = document.querySelectorAll('.checkout-loading');
    const contentElements = document.querySelectorAll('.checkout-content');
    
    loadingElements.forEach(el => {
        el.style.display = show ? 'block' : 'none';
    });
    
    contentElements.forEach(el => {
        el.style.display = show ? 'none' : 'block';
    });
}

// Show order processing
function showOrderProcessing(processing) {
    const overlay = document.getElementById('loadingOverlay');
    const btn = document.getElementById('placeOrderBtn');
    
    if (overlay) {
        overlay.style.display = processing ? 'flex' : 'none';
    }
    
    if (btn) {
        btn.disabled = processing;
        btn.innerHTML = processing ? 
            '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...' : 
            '<i class="fas fa-lock me-2"></i>Đặt hàng';
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('toast');
    const toastBody = document.getElementById('toastBody');
    
    if (!toastElement || !toastBody) return;
    
    toastBody.textContent = message;
    
    // Update toast icon based on type
    const toastHeader = toastElement.querySelector('.toast-header i');
    if (toastHeader) {
        const iconClasses = {
            'success': 'fa-check-circle text-success',
            'error': 'fa-exclamation-circle text-danger',
            'warning': 'fa-exclamation-triangle text-warning',
            'info': 'fa-info-circle text-primary'
        };
        
        toastHeader.className = `fas ${iconClasses[type] || iconClasses.info} me-2`;
    }
    
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
}

// Auto-save form data to localStorage
function autoSaveForm() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    localStorage.setItem('checkout_form_data', JSON.stringify(data));
}

// Restore form data from localStorage
function restoreFormData() {
    const savedData = localStorage.getItem('checkout_form_data');
    if (!savedData) return;
    
    try {
        const data = JSON.parse(savedData);
        
        Object.keys(data).forEach(key => {
            const field = document.querySelector(`[name="${key}"]`);
            if (field && field.type !== 'radio') {
                field.value = data[key];
            } else if (field && field.type === 'radio' && field.value === data[key]) {
                field.checked = true;
                selectPaymentMethod(data[key]);
            }
        });
    } catch (error) {
        console.error('Error restoring form data:', error);
    }
}

// Clear saved form data
function clearSavedFormData() {
    localStorage.removeItem('checkout_form_data');
}

// Setup auto-save
function setupAutoSave() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    // Auto-save on input changes
    form.addEventListener('input', debounce(autoSaveForm, 1000));
    
    // Restore data on page load
    restoreFormData();
    
    // Clear data on successful order
    window.addEventListener('beforeunload', function() {
        if (!isProcessing) {
            autoSaveForm();
        }
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle VNPay payment
async function handleVNPayPayment(orderId, formData) {
    try {
        // Show processing message for VNPay
        showToast('Đang tạo liên kết thanh toán VNPay...', 'info');
        
        // Get bank code if selected
        const bankCode = document.getElementById('vnpayBankCode').value;
        
        // Create VNPay payment URL
        const vnpayData = {
            order_id: orderId,
            order_info: `Thanh toan don hang PAC Group #${orderId}`,
            bank_code: bankCode || '',
            credential_type: 'sandbox' // Chỉ định rõ môi trường sandbox để tránh lỗi chữ ký
        };
        
        const response = await fetch('api/orders/vnpay-create.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vnpayData)
        });
        
        // Debug response
        const responseText = await response.text();
        console.log('VNPay API Response Text:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('VNPay JSON Parse Error:', parseError);
            console.error('VNPay Response was:', responseText);
            throw new Error('Invalid JSON response from VNPay API');
        }
        
        if (data.success) {
            // Clear form and saved data before redirect
            const form = document.getElementById('checkoutForm');
            if (form) {
                form.reset();
            }
            clearSavedFormData();
            
            showToast('Chuyển hướng đến VNPay...', 'success');
            
            // Store order info for return handling
            localStorage.setItem('vnpay_order_info', JSON.stringify({
                order_id: orderId,
                txn_ref: data.data.txn_ref,
                amount: data.data.amount,
                timestamp: Date.now()
            }));
            
            // Redirect to VNPay
            setTimeout(() => {
                window.location.href = data.data.payment_url;
            }, 1000);
            
        } else {
            throw new Error(data.error || 'Không thể tạo liên kết thanh toán VNPay');
        }
        
    } catch (error) {
        console.error('VNPay payment error:', error);
        showToast('Lỗi khi tạo thanh toán VNPay: ' + error.message, 'error');
        
        // Reset processing state
        isProcessing = false;
        showOrderProcessing(false);
    }
}

// Check VNPay return status on page load
function checkVNPayReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const vnpResponseCode = urlParams.get('vnp_ResponseCode');
    const vnpTxnRef = urlParams.get('vnp_TxnRef');
    
    if (vnpResponseCode && vnpTxnRef) {
        // This is a VNPay return, redirect to payment result page using flat route
        window.location.href = '/0/pac-new/payment-result' + window.location.search;
    }
}

// Export functions for global use
window.initializeCheckout = initializeCheckout;
window.selectPaymentMethod = selectPaymentMethod;
window.placeOrder = placeOrder;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Check if this is a VNPay return first
    checkVNPayReturn();
    
    // Then initialize checkout normally
    initializeCheckout();
    setupAutoSave();
});
