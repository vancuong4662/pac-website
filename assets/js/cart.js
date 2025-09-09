/**
 * Cart JavaScript Module
 * Handles cart operations, item management, and UI updates
 */

// Global variables
let cartData = null;
let isUpdating = false;

// Initialize cart page
function initializeCartPage() {
    loadCartData();
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Listen for storage changes (cart updates from other tabs)
    window.addEventListener('storage', function(e) {
        if (e.key === 'cart_updated') {
            loadCartData();
        }
    });
    
    // Handle page visibility change
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            loadCartData();
        }
    });
}

// Load cart data from API
async function loadCartData() {
    try {
        showLoading(true);
        
        const response = await fetch('api/cart/get.php');
        const data = await response.json();
        
        if (data.success) {
            cartData = data.data;
            displayCart();
        } else {
            showError('Không thể tải giỏ hàng: ' + (data.message || 'Lỗi không xác định'));
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        showError('Có lỗi xảy ra khi tải giỏ hàng');
    } finally {
        showLoading(false);
    }
}

// Display cart content
function displayCart() {
    const cartContainer = document.getElementById('cartContainer');
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartSummaryDetails = document.getElementById('cartSummaryDetails');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!cartContainer || !cartItems || !cartSummaryDetails) return;
    
    // Show cart container
    cartContainer.style.display = 'block';
    
    // Update cart count
    if (cartCount) {
        const totalItems = cartData && cartData.items ? cartData.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        cartCount.textContent = `${totalItems} sản phẩm`;
    }
    
    // Display cart items
    if (!cartData || !cartData.items || cartData.items.length === 0) {
        displayEmptyCart(cartItems);
        displayEmptySummary(cartSummaryDetails);
        
        if (clearCartBtn) clearCartBtn.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
    } else {
        displayCartItems(cartItems, cartData.items);
        displayCartSummary(cartSummaryDetails, cartData);
        
        if (clearCartBtn) clearCartBtn.style.display = 'flex';
        if (checkoutBtn) checkoutBtn.style.display = 'flex';
    }
}

// Display empty cart
function displayEmptyCart(container) {
    container.innerHTML = `
        <div class="empty-cart-item">
            <i class="fas fa-shopping-cart"></i>
            <h3>Giỏ hàng trống</h3>
            <p>Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá các sản phẩm của chúng tôi!</p>
            <a href="products" class="btn">
                <i class="fas fa-shopping-bag"></i>
                Mua sắm ngay
            </a>
        </div>
    `;
}

// Display cart items
function displayCartItems(container, items) {
    let itemsHTML = '';
    
    items.forEach(item => {
        itemsHTML += generateCartItemHTML(item);
    });
    
    container.innerHTML = itemsHTML;
}

// Generate cart item HTML
function generateCartItemHTML(item) {
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
        <div class="cart-item" data-item-id="${item.id}" data-aos="fade-up">
            <div class="cart-item-content">
                <div class="cart-item-image">
                    <img src="${item.product_image || '/pac-new/assets/img/pic/default-product.svg'}" 
                         alt="${item.product_name}"
                         onerror="this.src='/pac-new/assets/img/pic/default-product.svg'">
                </div>
                
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${item.product_name}</h3>
                    <p class="cart-item-description">${item.product_description || 'Không có mô tả'}</p>
                    
                    <div class="cart-item-meta">
                        <span class="cart-item-type ${item.product_type}">${typeMap[item.product_type] || item.product_type}</span>
                        ${item.package_type ? `<span class="cart-item-package ${item.package_type}">${packageMap[item.package_type]}</span>` : ''}
                    </div>
                    
                    <div class="cart-item-price">${formatPrice(item.price)} VNĐ</div>
                </div>
                
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        <div class="quantity-display">${item.quantity}</div>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                        Xóa
                    </button>
                </div>
                
                <div class="cart-item-subtotal">
                    <div class="subtotal-label">Thành tiền</div>
                    <div class="subtotal-amount">${formatPrice(item.price * item.quantity)} VNĐ</div>
                </div>
            </div>
        </div>
    `;
}

// Display empty summary
function displayEmptySummary(container) {
    container.innerHTML = `
        <div class="summary-row">
            <span class="summary-label">Tạm tính:</span>
            <span class="summary-value">0 VNĐ</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Phí vận chuyển:</span>
            <span class="summary-value">Miễn phí</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Tổng cộng:</span>
            <span class="summary-value summary-total">0 VNĐ</span>
        </div>
    `;
}

// Display cart summary
function displayCartSummary(container, data) {
    const subtotal = data.total_amount || 0;
    const shipping = 0; // Free shipping
    const discount = 0; // No discount for now
    const total = subtotal - discount + shipping;
    
    container.innerHTML = `
        <div class="summary-row">
            <span class="summary-label">Tạm tính (${data.items.length} sản phẩm):</span>
            <span class="summary-value">${formatPrice(subtotal)} VNĐ</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Phí vận chuyển:</span>
            <span class="summary-value">Miễn phí</span>
        </div>
        ${discount > 0 ? `
        <div class="summary-row">
            <span class="summary-label">Giảm giá:</span>
            <span class="summary-value text-success">-${formatPrice(discount)} VNĐ</span>
        </div>
        ` : ''}
        <div class="summary-row">
            <span class="summary-label">Tổng cộng:</span>
            <span class="summary-value summary-total">${formatPrice(total)} VNĐ</span>
        </div>
    `;
}

// Update item quantity
async function updateQuantity(itemId, newQuantity) {
    if (isUpdating || newQuantity < 1) return;
    
    try {
        isUpdating = true;
        setItemLoading(itemId, true);
        
        const response = await fetch('api/cart/update.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item_id: itemId,
                quantity: newQuantity
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Đã cập nhật số lượng', 'success');
            loadCartData(); // Reload cart data
            notifyCartUpdate();
        } else {
            showToast(data.message || 'Có lỗi xảy ra khi cập nhật', 'error');
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast('Có lỗi xảy ra khi cập nhật số lượng', 'error');
    } finally {
        isUpdating = false;
        setItemLoading(itemId, false);
    }
}

// Remove item from cart
async function removeFromCart(itemId) {
    if (isUpdating) return;
    
    // Confirm before removing
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
        return;
    }
    
    try {
        isUpdating = true;
        setItemLoading(itemId, true);
        
        const response = await fetch('api/cart/remove.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item_id: itemId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
            loadCartData(); // Reload cart data
            notifyCartUpdate();
        } else {
            showToast(data.message || 'Có lỗi xảy ra khi xóa sản phẩm', 'error');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        showToast('Có lỗi xảy ra khi xóa sản phẩm', 'error');
    } finally {
        isUpdating = false;
        setItemLoading(itemId, false);
    }
}

// Clear entire cart
async function clearCart() {
    if (isUpdating) return;
    
    // Confirm before clearing
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?')) {
        return;
    }
    
    try {
        isUpdating = true;
        showLoading(true);
        
        const response = await fetch('api/cart/clear.php', {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Đã xóa toàn bộ giỏ hàng', 'success');
            loadCartData(); // Reload cart data
            notifyCartUpdate();
        } else {
            showToast(data.message || 'Có lỗi xảy ra khi xóa giỏ hàng', 'error');
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        showToast('Có lỗi xảy ra khi xóa giỏ hàng', 'error');
    } finally {
        isUpdating = false;
        showLoading(false);
    }
}

// Apply promo code (placeholder)
function applyPromoCode() {
    const promoCode = document.getElementById('promoCode').value.trim();
    
    if (!promoCode) {
        showToast('Vui lòng nhập mã giảm giá', 'error');
        return;
    }
    
    // TODO: Implement promo code API
    showToast('Tính năng mã giảm giá sẽ được cập nhật sớm', 'info');
}

// Set item loading state
function setItemLoading(itemId, loading) {
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemElement) {
        if (loading) {
            itemElement.classList.add('loading');
        } else {
            itemElement.classList.remove('loading');
        }
    }
}

// Show/hide loading
function showLoading(show) {
    const loadingCart = document.getElementById('loadingCart');
    const cartContainer = document.getElementById('cartContainer');
    
    if (loadingCart) {
        loadingCart.style.display = show ? 'block' : 'none';
    }
    if (cartContainer) {
        cartContainer.style.display = show ? 'none' : 'block';
    }
}

// Show error message
function showError(message) {
    const cartContainer = document.getElementById('cartContainer');
    const loadingCart = document.getElementById('loadingCart');
    
    if (cartContainer) {
        cartContainer.innerHTML = `
            <div class="text-center p-5">
                <i class="fas fa-exclamation-triangle text-danger mb-3" style="font-size: 48px;"></i>
                <h3 class="text-danger">Có lỗi xảy ra</h3>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="loadCartData()">
                    <i class="fas fa-redo"></i>
                    Thử lại
                </button>
            </div>
        `;
        cartContainer.style.display = 'block';
    }
    
    if (loadingCart) {
        loadingCart.style.display = 'none';
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
        toastHeader.className = `fas ${type === 'success' ? 'fa-check-circle text-success' : 
                                      type === 'error' ? 'fa-exclamation-circle text-danger' : 
                                      'fa-info-circle text-primary'} me-2`;
    }
    
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

// Notify other tabs about cart update
function notifyCartUpdate() {
    localStorage.setItem('cart_updated', Date.now().toString());
    localStorage.removeItem('cart_updated');
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
}

// Add to cart (for integration with other pages)
async function addToCart(productId, quantity = 1) {
    try {
        const response = await fetch('api/cart/add.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Đã thêm sản phẩm vào giỏ hàng!', 'success');
            if (window.location.pathname.includes('cart.html')) {
                loadCartData(); // Reload if on cart page
            }
            notifyCartUpdate();
            return true;
        } else {
            showToast(data.message || 'Có lỗi xảy ra', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Có lỗi xảy ra khi thêm vào giỏ hàng', 'error');
        return false;
    }
}

// Export functions for global use
window.initializeCartPage = initializeCartPage;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.applyPromoCode = applyPromoCode;
window.addToCart = addToCart;
window.loadCartData = loadCartData;
