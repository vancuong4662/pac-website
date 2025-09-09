/**
 * Products JavaScript Module
 * Handles product listing, filtering, searching, and cart operations
 */

// Global variables
let allProducts = [];
let filteredProducts = [];
let isUserAuthenticated = false; // Track authentication status
let currentFilters = {
    type: 'all',
    package: 'all',
    search: '',
    sort: 'created_desc'
};
let currentPage = 1;
const productsPerPage = 12;

// Initialize products page
function initializeProductsPage() {
    loadProducts();
    setupEventListeners();
    loadCartSummary();
}

// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');
            setActiveFilter(this, '[data-filter]');
            currentFilters.type = filterValue;
            applyFilters();
        });
    });
    
    document.querySelectorAll('[data-package]').forEach(btn => {
        btn.addEventListener('click', function() {
            const packageValue = this.getAttribute('data-package');
            setActiveFilter(this, '[data-package]');
            currentFilters.package = packageValue;
            applyFilters();
        });
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentFilters.search = this.value.toLowerCase();
            applyFilters();
        }, 300));
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentFilters.sort = this.value;
            applySorting();
        });
    }
}

// Set active filter button
function setActiveFilter(activeBtn, selector) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
}

// Load products from API
async function loadProducts() {
    try {
        showLoading(true);
        
        const response = await fetch('api/products/list.php');
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            throw new Error('Server returned invalid response format');
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.products && Array.isArray(data.data.products)) {
            allProducts = data.data.products;
            filteredProducts = [...allProducts];
            
            // If no products in database, load demo data
            if (allProducts.length === 0) {
                loadDemoProducts();
            } else {
                displayProducts();
            }
        } else {
            // Load demo data as fallback
            throw new Error('API returned invalid data structure');
        }
    } catch (error) {
        // Always load demo data as fallback
        loadDemoProducts();
    } finally {
        showLoading(false);
    }
}

// Load demo products as fallback
function loadDemoProducts() {
    allProducts = [
        {
            id: 1,
            name: 'Khóa học Định hướng nghề nghiệp cơ bản',
            description: 'Khám phá năng lực bản thân và định hướng nghề nghiệp phù hợp',
            type: 'course',
            package_type: 'basic',
            price: 500000,
            image: 'assets/img/pic/1.jpg',
            status: 'active',
            created_at: '2024-01-15'
        },
        {
            id: 2,
            name: 'Trắc nghiệm tính cách MBTI',
            description: 'Đánh giá tính cách và phong cách làm việc của bạn',
            type: 'online_test',
            package_type: 'premium',
            price: 200000,
            image: 'assets/img/pic/2.png',
            status: 'active',
            created_at: '2024-01-20'
        },
        {
            id: 3,
            name: 'Tư vấn 1-1 với chuyên gia',
            description: 'Buổi tư vấn trực tiếp với chuyên gia định hướng nghề nghiệp',
            type: 'consultation',
            package_type: 'premium',
            price: 800000,
            image: 'assets/img/pic/3.png',
            status: 'active',
            created_at: '2024-01-25'
        },
        {
            id: 4,
            name: 'Khóa học Phát triển kỹ năng mềm',
            description: 'Nâng cao kỹ năng giao tiếp và làm việc nhóm',
            type: 'course',
            package_type: 'premium',
            price: 1200000,
            image: 'assets/img/pic/1.jpg',
            status: 'active',
            created_at: '2024-02-01'
        },
        {
            id: 5,
            name: 'Trắc nghiệm IQ cơ bản',
            description: 'Đánh giá chỉ số thông minh và khả năng logic',
            type: 'online_test',
            package_type: 'basic',
            price: 150000,
            image: 'assets/img/pic/2.png',
            status: 'active',
            created_at: '2024-02-05'
        },
        {
            id: 6,
            name: 'Tư vấn chọn ngành đại học',
            description: 'Hỗ trợ chọn ngành học phù hợp với năng lực',
            type: 'consultation',
            package_type: 'basic',
            price: 400000,
            image: 'assets/img/pic/3.png',
            status: 'active',
            created_at: '2024-02-10'
        }
    ];
    
    filteredProducts = [...allProducts];
    displayProducts();
    
    // Show notification about demo mode
    showProductToast('Đang chạy ở chế độ demo. Dữ liệu chỉ mang tính minh họa.', 'info');
}

// Apply all filters
function applyFilters() {
    filteredProducts = allProducts.filter(product => {
        // Type filter
        if (currentFilters.type !== 'all' && product.type !== currentFilters.type) {
            return false;
        }
        
        // Package filter
        if (currentFilters.package !== 'all' && product.package_type !== currentFilters.package) {
            return false;
        }
        
        // Search filter
        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            const productName = product.name.toLowerCase();
            const productDesc = (product.description || '').toLowerCase();
            
            if (!productName.includes(searchTerm) && !productDesc.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    applySorting();
}

// Apply sorting
function applySorting() {
    filteredProducts.sort((a, b) => {
        switch (currentFilters.sort) {
            case 'created_desc':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'created_asc':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'price_asc':
                return parseFloat(a.price) - parseFloat(b.price);
            case 'price_desc':
                return parseFloat(b.price) - parseFloat(a.price);
            case 'name_asc':
                return a.name.localeCompare(b.name, 'vi');
            case 'name_desc':
                return b.name.localeCompare(a.name, 'vi');
            default:
                return 0;
        }
    });
    
    currentPage = 1;
    displayProducts();
}

// Display products
function displayProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const noProducts = document.getElementById('noProducts');
    
    if (!productsGrid) return;
    
    if (filteredProducts.length === 0) {
        productsGrid.style.display = 'none';
        noProducts.style.display = 'block';
        hidePagination();
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const currentProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Generate products HTML
    let productsHTML = '';
    currentProducts.forEach(product => {
        productsHTML += generateProductCardHTML(product);
    });
    
    productsGrid.innerHTML = productsHTML;
    productsGrid.style.display = 'grid';
    noProducts.style.display = 'none';
    
    // Show pagination if needed
    if (totalPages > 1) {
        displayPagination(totalPages);
    } else {
        hidePagination();
    }
    
    // Add AOS animation to new products
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Generate product card HTML
function generateProductCardHTML(product) {
    const typeMap = {
        'course': 'Khóa học',
        'online_test': 'Trắc nghiệm',
        'consultation': 'Tư vấn'
    };
    
    const packageMap = {
        'basic': 'Gói cơ bản',
        'premium': 'Gói cao cấp'
    };
    
    const features = getProductFeatures(product);
    
    return `
        <div class="product-card" data-product-id="${product.id}" data-product-type="${product.type}" data-aos="fade-up">
            <div class="product-image">
                <img src="${product.image || 'assets/img/pic/default-product.svg'}" 
                     alt="${product.name}" 
                     onerror="this.src='assets/img/pic/default-product.svg'">
                
                <div class="product-type-badge ${product.type}">
                    ${typeMap[product.type]}
                </div>
                
                ${product.package_type ? `
                <div class="package-badge ${product.package_type}">
                    ${packageMap[product.package_type]}
                </div>
                ` : ''}
            </div>
            
            <div class="product-content">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description || 'Không có mô tả'}</p>
                
                <div class="product-meta">
                    <div class="product-price">
                        <span class="price-amount">${formatPrice(product.price)}</span>
                        <span class="price-currency">VNĐ</span>
                    </div>
                    
                    <div class="product-features">
                        ${features}
                    </div>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-primary btn-add-to-cart" 
                            onclick="addToCart(${product.id})" 
                            ${product.status !== 'active' ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                        Thêm vào giỏ
                    </button>
                    
                    <button class="btn btn-outline btn-view-detail" 
                            onclick="viewProductDetail(${product.id})">
                        <i class="fas fa-eye"></i>
                        Chi tiết
                    </button>
                </div>
                
                <div class="product-status ${product.status}">
                    ${product.status === 'active' ? 'Có sẵn' : 'Không có sẵn'}
                </div>
            </div>
        </div>
    `;
}

// Get product features HTML
function getProductFeatures(product) {
    if (product.type === 'course') {
        return `
            <div class="feature-item">
                <i class="fas fa-graduation-cap"></i>
                <span>Học offline</span>
            </div>
            <div class="feature-item">
                <i class="fas fa-certificate"></i>
                <span>Có chứng chỉ</span>
            </div>
        `;
    } else if (product.type === 'online_test') {
        const time = product.package_type === 'basic' ? '60 phút' : '90 phút';
        const attempts = product.package_type === 'basic' ? '1 lần làm' : '3 lần làm';
        return `
            <div class="feature-item">
                <i class="fas fa-clock"></i>
                <span>${time}</span>
            </div>
            <div class="feature-item">
                <i class="fas fa-redo"></i>
                <span>${attempts}</span>
            </div>
        `;
    } else if (product.type === 'consultation') {
        const time = product.package_type === 'basic' ? '30 phút' : '60 phút';
        return `
            <div class="feature-item">
                <i class="fas fa-user-md"></i>
                <span>Chuyên gia 1-1</span>
            </div>
            <div class="feature-item">
                <i class="fas fa-clock"></i>
                <span>${time}</span>
            </div>
        `;
    }
    return '';
}

// Display pagination
function displayPagination(totalPages) {
    const paginationWrapper = document.getElementById('paginationWrapper');
    if (!paginationWrapper) return;
    
    let paginationHTML = '<nav><ul class="pagination justify-content-center">';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(1); return false;">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;
    
    paginationHTML += '</ul></nav>';
    
    paginationWrapper.innerHTML = paginationHTML;
    paginationWrapper.style.display = 'block';
}

// Hide pagination
function hidePagination() {
    const paginationWrapper = document.getElementById('paginationWrapper');
    if (paginationWrapper) {
        paginationWrapper.style.display = 'none';
    }
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayProducts();
    
    // Scroll to top of products grid
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        productsGrid.scrollIntoView({ behavior: 'smooth' });
    }
}

// Show/hide loading
function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const productsGrid = document.getElementById('productsGrid');
    
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'block' : 'none';
    }
    if (productsGrid) {
        productsGrid.style.display = show ? 'none' : 'grid';
    }
}

// Show no products message
function showNoProducts() {
    const noProducts = document.getElementById('noProducts');
    const productsGrid = document.getElementById('productsGrid');
    
    if (noProducts) {
        noProducts.style.display = 'block';
    }
    if (productsGrid) {
        productsGrid.style.display = 'none';
    }
    hidePagination();
}

// Perform search
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentFilters.search = searchInput.value.toLowerCase();
        applyFilters();
    }
}

// Add to cart
async function addToCart(productId) {
    try {
        const response = await fetch('api/cart/add.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });
        
        // If user not authenticated, show login modal
        if (response.status === 401) {
            showLoginRequiredModal();
            return;
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            // Show demo success message
            showToast('Đã thêm sản phẩm vào giỏ hàng! (Demo mode)', 'success');
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Đã thêm sản phẩm vào giỏ hàng!', 'success');
            updateCartBadge();
            loadCartSummary();
            notifyCartUpdate();
        } else {
            showToast(data.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        // Show demo success message as fallback
        showToast('Đã thêm sản phẩm vào giỏ hàng! (Demo mode)', 'success');
    }
}

// View product detail
function viewProductDetail(productId) {
    window.location.href = `product-detail?id=${productId}`;
}

// Toggle cart summary
function toggleCart() {
    const cartSummary = document.getElementById('cartSummary');
    if (cartSummary) {
        cartSummary.classList.toggle('show');
    }
}

// Load cart summary
async function loadCartSummary() {
    try {
        const response = await fetch('api/cart/get.php');
        
        // Handle authentication status
        if (response.status === 401) {
            updateCartDisplay({ items: [], total_amount: 0 });
            isUserAuthenticated = false;
            return;
        }
        
        // Handle other error statuses
        if (!response.ok) {
            updateCartDisplay({ items: [], total_amount: 0 });
            isUserAuthenticated = false;
            return;
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            // Initialize empty cart display for demo mode
            updateCartDisplay({ items: [], total_amount: 0 });
            isUserAuthenticated = false;
            return;
        }
        
        // Try to parse JSON, but catch if it's actually HTML
        let data;
        try {
            const responseText = await response.text();
            data = JSON.parse(responseText);
        } catch (parseError) {
            updateCartDisplay({ items: [], total_amount: 0 });
            isUserAuthenticated = false;
            return;
        }
        
        if (data.success) {
            updateCartDisplay(data.data);
            isUserAuthenticated = true; // User is authenticated if cart loads successfully
        } else {
            // Initialize empty cart for demo mode
            updateCartDisplay({ items: [], total_amount: 0 });
            isUserAuthenticated = false;
        }
    } catch (error) {
        // Initialize empty cart display for demo mode
        updateCartDisplay({ items: [], total_amount: 0 });
        isUserAuthenticated = false;
    }
}

// Update cart display
function updateCartDisplay(cartData) {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartBadge = document.getElementById('cartBadge');
    
    // Handle empty cart or null data
    if (!cartData || !cartData.items || !Array.isArray(cartData.items) || cartData.items.length === 0) {
        if (cartItems) {
            cartItems.innerHTML = '<p class="text-muted text-center">Giỏ hàng trống</p>';
        }
        if (cartTotal) {
            cartTotal.textContent = '0 VNĐ';
        }
        if (cartBadge) {
            cartBadge.style.display = 'none';
        }
        return;
    }
    
    // Update cart items
    if (cartItems) {
        let itemsHTML = '';
        cartData.items.forEach(item => {
            itemsHTML += `
                <div class="cart-item mb-2 pb-2 border-bottom">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1" style="font-size: 14px;">${item.product_name}</h6>
                            <small class="text-muted">${formatPrice(item.price)} VNĐ x ${item.quantity}</small>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        cartItems.innerHTML = itemsHTML;
    }
    
    // Update cart total
    if (cartTotal) {
        cartTotal.textContent = `${formatPrice(cartData.total_amount)} VNĐ`;
    }
    
    // Update cart badge
    if (cartBadge) {
        const totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

// Update cart badge
function updateCartBadge() {
    loadCartSummary();
    
    // Also update header cart count
    fetch('api/cart/get.php')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data && data.data.items) {
                const totalItems = data.data.items.reduce((sum, item) => sum + item.quantity, 0);
                const headerCartCount = document.getElementById('header-cart-count');
                if (headerCartCount) {
                    headerCartCount.textContent = totalItems;
                    headerCartCount.style.display = totalItems > 0 ? 'flex' : 'none';
                }
            }
        })
        .catch(error => {
            // Silently handle error - not critical for user experience
        });
}

// Remove from cart
async function removeFromCart(itemId) {
    try {
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
            loadCartSummary();
        } else {
            showToast(data.message || 'Có lỗi xảy ra', 'error');
        }
    } catch (error) {
        showToast('Có lỗi xảy ra khi xóa sản phẩm', 'error');
    }
}

// Go to cart page
function goToCart() {
    // Check if user is authenticated
    if (!isUserAuthenticated) {
        showLoginRequiredModal();
        return;
    }
    window.location.href = 'cart';
}

// Go to checkout page
function goToCheckout() {
    // Check if user is authenticated
    if (!isUserAuthenticated) {
        showLoginRequiredModal();
        return;
    }
    window.location.href = 'checkout';
}

// Show login required modal
function showLoginRequiredModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginRequiredModal'));
    modal.show();
}

// Show toast notification using toastbar library
function showProductToast(message, type = 'info') {
    const titleMap = {
        'success': 'Thành công!',
        'error': 'Lỗi',
        'warning': 'Cảnh báo',
        'info': 'Thông báo'
    };
    
    const lifespanMap = {
        'success': 2500,
        'error': 5000,
        'warning': 4000,
        'info': 3000
    };
    
    const title = titleMap[type] || 'Thông báo';
    const lifespan = lifespanMap[type] || 3000;
    
    // Use global toastbar function directly
    if (typeof showToast === 'function') {
        showToast(title, message, type, lifespan);
    } else {
        // Fallback if toastbar not loaded
        console.log(`${title}: ${message}`);
    }
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price);
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

// Notify other tabs about cart update
function notifyCartUpdate() {
    localStorage.setItem('cart_updated', Date.now().toString());
    localStorage.removeItem('cart_updated');
}

// Export functions for global use
window.initializeProductsPage = initializeProductsPage;
window.addToCart = addToCart;
window.viewProductDetail = viewProductDetail;
window.toggleCart = toggleCart;
window.removeFromCart = removeFromCart;
window.goToCart = goToCart;
window.goToCheckout = goToCheckout;
window.performSearch = performSearch;
window.applySorting = applySorting;
window.changePage = changePage;
window.updateCartBadge = updateCartBadge;
