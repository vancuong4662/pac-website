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

// Load checkout data (cart items)
async function loadCheckoutData() {
    try {
        showCheckoutLoading(true);
        
        const response = await fetch('api/cart/get.php');
        const data = await response.json();
        
        if (data.success && data.data && data.data.items && data.data.items.length > 0) {
            orderData = data.data;
            displayOrderSummary(data.data);
        } else {
            // Redirect to cart if empty
            showToast('Giỏ hàng trống. Chuyển hướng về giỏ hàng...', 'warning');
            setTimeout(() => {
                window.location.href = 'cart';
            }, 2000);
        }
    } catch (error) {
        console.error('Error loading checkout data:', error);
        showToast('Có lỗi xảy ra khi tải dữ liệu đơn hàng', 'error');
    } finally {
        showCheckoutLoading(false);
    }
}

// Display order summary
function displayOrderSummary(cartData) {
    const summaryContainer = document.getElementById('orderSummary');
    const totalsContainer = document.getElementById('orderTotals');
    
    if (!summaryContainer || !totalsContainer) return;
    
    // Display items
    let itemsHTML = '';
    cartData.items.forEach(item => {
        itemsHTML += generateOrderItemHTML(item);
    });
    summaryContainer.innerHTML = itemsHTML;
    
    // Display totals
    const subtotal = cartData.total_amount || 0;
    const shipping = 0; // Free shipping
    const tax = 0; // No tax for now
    const total = subtotal + shipping + tax;
    
    totalsContainer.innerHTML = `
        <div class="total-row">
            <span>Tạm tính (${cartData.items.length} sản phẩm):</span>
            <span>${formatPrice(subtotal)} VNĐ</span>
        </div>
        <div class="total-row">
            <span>Phí vận chuyển:</span>
            <span>Miễn phí</span>
        </div>
        ${tax > 0 ? `
        <div class="total-row">
            <span>Thuế:</span>
            <span>${formatPrice(tax)} VNĐ</span>
        </div>
        ` : ''}
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

// Generate order item HTML
function generateOrderItemHTML(item) {
    const typeMap = {
        'course': 'Khóa học',
        'online_test': 'Trắc nghiệm',
        'consultation': 'Tư vấn'
    };
    
    const packageMap = {
        'basic': 'Gói cơ bản',
        'premium': 'Gói cao cấp'
    };
    
    return `
        <div class="summary-item" data-aos="fade-up">
            <div class="summary-item-image">
                <img src="${item.product_image || '/pac-new/assets/img/pic/default-product.svg'}" 
                     alt="${item.product_name}"
                     onerror="this.src='/pac-new/assets/img/pic/default-product.svg'">
            </div>
            <div class="summary-item-info">
                <div class="summary-item-name">${item.product_name}</div>
                <div class="summary-item-details">
                    ${typeMap[item.product_type] || item.product_type}
                    ${item.package_type ? ` - ${packageMap[item.package_type]}` : ''}
                </div>
                <div class="summary-item-details">Số lượng: ${item.quantity}</div>
                <div class="summary-item-price">${formatPrice(item.price * item.quantity)} VNĐ</div>
            </div>
        </div>
    `;
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
    
    if (!orderData || !orderData.items || orderData.items.length === 0) {
        showToast('Giỏ hàng trống', 'error');
        return;
    }
    
    try {
        isProcessing = true;
        showOrderProcessing(true);
        
        const formData = new FormData(form);
        
        // Prepare order data
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
            payment_method: formData.get('paymentMethod') || 'bank_transfer',
            notes: formData.get('orderNotes') || ''
        };
        
        const response = await fetch('api/orders/create.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderRequestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Đặt hàng thành công!', 'success');
            
            // Clear form
            form.reset();
            
            // Redirect to order confirmation
            setTimeout(() => {
                window.location.href = `order-confirmation?id=${data.data.order_id}`;
            }, 1500);
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

// Export functions for global use
window.initializeCheckout = initializeCheckout;
window.selectPaymentMethod = selectPaymentMethod;
window.placeOrder = placeOrder;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeCheckout();
    setupAutoSave();
});
