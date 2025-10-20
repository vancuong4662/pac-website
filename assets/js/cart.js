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
    
    // Setup cart-specific button event listeners
    setupCartButtonListeners();
}

// Setup cart button event listeners
function setupCartButtonListeners() {
    // Refresh cart button
    const refreshBtn = document.getElementById('refresh-cart-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadCartData();
        });
    }
    
    // Clear cart button
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            clearCart();
        });
    }
    
    // Apply promo code button
    const promoBtn = document.getElementById('applyPromoBtn');
    if (promoBtn) {
        promoBtn.addEventListener('click', function() {
            applyPromoCode();
        });
    }
    
    // Checkout button - will be handled by onclick or href
    // Promo code input - apply on Enter key
    const promoInput = document.getElementById('promoCodeInput');
    if (promoInput) {
        promoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyPromoCode();
            }
        });
    }
}

// Load cart data from API
async function loadCartData() {
    try {
        showLoading(true);
        
        // Check authentication before making API call
        if (typeof authChecker !== 'undefined') {
            const authResult = await authChecker.quickAuthCheck();
            if (!authResult.authenticated) {
                console.warn('[Cart] User not authenticated, redirecting to login');
                authChecker.redirectToLogin('Vui lòng đăng nhập để xem giỏ hàng');
                return;
            }
        }
        
        const response = await fetch('api/cart/get.php', {
            method: 'GET',
            credentials: 'include', // Include cookies for session
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            cartData = data.data;
            displayCart();
        } else {
            // Check if error is related to authentication
            if (data.message && (data.message.includes('đăng nhập') || data.message.includes('authentication'))) {
                if (typeof authChecker !== 'undefined') {
                    authChecker.redirectToLogin('Phiên đăng nhập đã hết hạn');
                    return;
                }
            }
            showError('Không thể tải giỏ hàng: ' + (data.message || 'Lỗi không xác định'));
        }
    } catch (error) {
        console.error('[Cart] Error loading cart:', error);
        
        // Check if it's a network error that might indicate auth issues
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
        } else {
            showError('Có lỗi xảy ra khi tải giỏ hàng');
        }
    } finally {
        showLoading(false);
    }
}

// Display cart content
function displayCart() {
    const cartContainer = document.getElementById('cartContainer');
    const cartCount = document.getElementById('cartItemsCount');
    const cartItems = document.getElementById('cartItems');
    const cartSummaryDetails = document.getElementById('cartSummaryDetails');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!cartContainer || !cartItems || !cartSummaryDetails) return;
    
    // Show cart container
    cartContainer.style.display = 'block';
    
    // Update cart count
    if (cartCount) {
        const totalItems = cartData && cartData.summary ? cartData.summary.item_count || 0 : 0;
        const totalPackages = cartData && cartData.summary ? cartData.summary.total_items || 0 : 0;
        cartCount.textContent = `${totalItems} gói dịch vụ (${totalPackages} loại)`;
    }
    
    // Display cart items
    if (!cartData || !cartData.items || cartData.items.length === 0) {
        // Show empty cart state
        cartItems.style.display = 'none';
        document.getElementById('emptyCartState').style.display = 'block';
        displayEmptySummary(cartSummaryDetails);
        
        if (clearCartBtn) clearCartBtn.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
    } else {
        // Show cart items
        cartItems.style.display = 'block';
        document.getElementById('emptyCartState').style.display = 'none';
        displayCartItems(cartItems, cartData.items);
        displayCartSummary(cartSummaryDetails, cartData);
        
        if (clearCartBtn) clearCartBtn.style.display = 'inline-flex';
        if (checkoutBtn) checkoutBtn.style.display = 'inline-flex';
    }
}

// Display empty cart (not used in table view, handled by cart.html)
function displayEmptyCart(container) {
    // Empty cart state is handled in cart.html template
    container.innerHTML = '';
}

// Display cart items as table
function displayCartItems(container, items) {
    let tableHTML = `
        <div class="card shadow-sm border-0">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-4">Gói dịch vụ</th>
                                <th>Loại</th>
                                <th>Giá</th>
                                <th>Thời gian thêm</th>
                                <th class="text-center pe-4">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    items.forEach(item => {
        tableHTML += generateCartItemHTML(item);
    });
    
    tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// Generate cart item HTML as table row
function generateCartItemHTML(item) {
    // Build price display with discount and free package handling
    let priceHTML = '';
    
    if (item.is_free == 1) {
        // Free package
        priceHTML = `<span class="fw-bold text-success">MIỄN PHÍ</span>`;
    } else if (item.has_discount && item.original_price_formatted) {
        // Discounted package
        priceHTML = `
            <span class="fw-bold text-danger">${item.current_price_formatted}</span><br>
            <small class="text-muted text-decoration-line-through">${item.original_price_formatted}</small>
        `;
    } else {
        // Regular package
        priceHTML = `<span class="fw-bold">${item.current_price_formatted}</span>`;
    }
    
    // Format added time
    const addedDate = new Date(item.added_at);
    const formattedDate = addedDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <tr data-item-id="${item.cart_id}">
            <td>
                <div class="fw-bold text-primary">${item.package_name}</div>
                <small class="text-muted">${item.product_name}</small>
            </td>
            <td>
                <span class="badge bg-primary">${item.type_label}</span>
            </td>
            <td>${priceHTML}</td>
            <td>
                <small class="text-muted">${formattedDate}</small>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${item.cart_id})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

// Display empty summary
function displayEmptySummary(container) {
    container.innerHTML = `
        <div class="summary-row">
            <span class="summary-label">Số lượng sản phẩm dịch vụ:</span>
            <span class="summary-value">0 gói</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Tổng cộng:</span>
            <span class="summary-value summary-total">0₫</span>
        </div>
    `;
}

// Display cart summary
function displayCartSummary(container, data) {
    const summary = data.summary || {};
    const subtotal = summary.subtotal || 0;
    const discount = summary.discount || 0;
    const total = summary.total_amount || 0;
    const shipping = 0; // Free shipping for digital products
    
    container.innerHTML = `
        <div class="summary-row">
            <span class="summary-label">Số lượng sản phẩm dịch vụ:</span>
            <span class="summary-value">${data.items.length} gói</span>
        </div>
        ${discount > 0 ? `
        <div class="summary-row">
            <span class="summary-label">Giảm giá:</span>
            <span class="summary-value text-success">-${summary.discount_formatted || formatPrice(discount) + '₫'}</span>
        </div>
        ` : ''}
        <div class="summary-row">
            <span class="summary-label">Tổng cộng:</span>
            <span class="summary-value summary-total">${summary.total_formatted || formatPrice(total) + '₫'}</span>
        </div>
    `;
}

// Update item quantity (disabled - each package quantity is always 1)
async function updateQuantity(itemId, newQuantity) {
    // Quantity update disabled for packages
    showToast('Mỗi gói dịch vụ chỉ có thể mua 1 lần', 'info');
    return;
}

// Remove item from cart
async function removeFromCart(itemId) {
    if (isUpdating) return;
    
    // Check authentication before operation
    if (typeof authChecker !== 'undefined') {
        const authResult = await authChecker.quickAuthCheck();
        if (!authResult.authenticated) {
            authChecker.redirectToLogin('Vui lòng đăng nhập để xóa sản phẩm');
            return;
        }
    }
    
    // Confirm before removing
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
        return;
    }
    
    try {
        isUpdating = true;
        setItemLoading(itemId, true);
        
        const response = await fetch('api/cart/remove.php', {
            method: 'DELETE',
            credentials: 'include', // Include cookies for session
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item_id: itemId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const message = data.message || 'Đã xóa gói dịch vụ khỏi giỏ hàng';
            showToast(message, 'success');
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
    
    // Check authentication before operation
    if (typeof authChecker !== 'undefined') {
        const authResult = await authChecker.quickAuthCheck();
        if (!authResult.authenticated) {
            authChecker.redirectToLogin('Vui lòng đăng nhập để xóa giỏ hàng');
            return;
        }
    }
    
    // Confirm before clearing
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?')) {
        return;
    }
    
    try {
        isUpdating = true;
        showLoading(true);
        
        const response = await fetch('api/cart/clear.php', {
            method: 'DELETE',
            credentials: 'include' // Include cookies for session
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
async function applyPromoCode() {
    // Check authentication before operation
    if (typeof authChecker !== 'undefined') {
        const authResult = await authChecker.quickAuthCheck();
        if (!authResult.authenticated) {
            authChecker.redirectToLogin('Vui lòng đăng nhập để sử dụng mã giảm giá');
            return;
        }
    }
    
    const promoCode = document.getElementById('promoCodeInput').value.trim();
    
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
        const deleteBtn = itemElement.querySelector('button[onclick*="removeFromCart"]');
        
        if (loading) {
            itemElement.classList.add('loading');
            itemElement.style.opacity = '0.6';
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
        } else {
            itemElement.classList.remove('loading');
            itemElement.style.opacity = '1';
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            }
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
    // Use Toastbar if available (from toastbar.js)
    if (typeof Toastbar !== 'undefined') {
        Toastbar.show(message, type);
        return;
    }
    
    // Fallback to console if Toastbar not available
    console.log(`[${type.toUpperCase()}] ${message}`);
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
async function addToCart(productPackageId, quantity = 1) {
    try {
        // Check authentication before making API call
        if (typeof authChecker !== 'undefined') {
            const authStatus = authChecker.getCurrentAuthStatus();
            if (!authStatus.isAuthenticated) {
                console.warn('[Cart] User not authenticated, redirecting to login');
                authChecker.redirectToLogin('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
                return false;
            }
        }
        
        const response = await fetch('api/cart/add.php', {
            method: 'POST',
            credentials: 'include', // Include cookies for session
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_package_id: productPackageId,
                quantity: quantity
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const message = data.message || 'Đã thêm sản phẩm vào giỏ hàng!';
            showToast('Thành công', message, 'success');
            
            if (window.location.pathname.includes('cart.html')) {
                loadCartData(); // Reload if on cart page
            }
            notifyCartUpdate();
            return true;
        } else {
            // Check if error is related to authentication
            if (data.error && (data.error.includes('Unauthorized') || data.error.includes('authentication'))) {
                if (typeof authChecker !== 'undefined') {
                    authChecker.redirectToLogin('Phiên đăng nhập đã hết hạn');
                    return false;
                }
            }
            
            const errorMessage = data.error || 'Có lỗi xảy ra';
            showToast('Lỗi', errorMessage, 'error');
            return false;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Lỗi', 'Có lỗi xảy ra khi thêm vào giỏ hàng', 'error');
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
