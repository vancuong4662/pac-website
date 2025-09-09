/**
 * Purchases JavaScript Module
 * Handles purchase history, courses, tests, and consultations management
 */

// Global variables
let currentTab = 'all';
let currentPage = 1;
let currentFilters = {};
let purchasesData = {};

// Initialize purchases page
function initializePurchases() {
    setupTabHandlers();
    setupFilterHandlers();
    loadPurchases('all');
}

// Setup tab handlers
function setupTabHandlers() {
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const targetTab = event.target.getAttribute('data-bs-target').replace('#', '').replace('-purchases', '');
            switchTab(targetTab);
        });
    });
}

// Setup filter handlers
function setupFilterHandlers() {
    // Auto-apply filters on change
    const filterControls = document.querySelectorAll('.filter-control');
    filterControls.forEach(control => {
        control.addEventListener('change', debounce(() => {
            if (currentTab === 'all') {
                applyFilters();
            }
        }, 500));
    });
    
    // Enter key to apply filters
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.classList.contains('filter-control')) {
            applyFilters();
        }
    });
}

// Switch tab
function switchTab(tabName) {
    currentTab = tabName;
    currentPage = 1;
    
    // Reset filters when switching tabs
    if (tabName !== 'all') {
        resetFilters();
    }
    
    loadPurchases(tabName);
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const dateFrom = document.getElementById('dateFrom')?.value || '';
    const dateTo = document.getElementById('dateTo')?.value || '';
    
    currentFilters = {
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo
    };
    
    currentPage = 1;
    loadPurchases(currentTab, currentFilters);
}

// Reset filters
function resetFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    currentFilters = {};
}

// Load purchases data
async function loadPurchases(type = 'all', filters = {}, page = 1) {
    try {
        showLoading(true);
        
        let endpoint = '';
        switch (type) {
            case 'courses':
                endpoint = 'api/purchases/courses.php';
                break;
            case 'tests':
                endpoint = 'api/purchases/tests.php';
                break;
            case 'consultations':
                endpoint = 'api/purchases/consultations.php';
                break;
            default:
                endpoint = 'api/purchases/all.php';
        }
        
        // Build query parameters
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...filters
        });
        
        const response = await fetch(`${endpoint}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            purchasesData[type] = data.data;
            displayPurchases(data.data, type);
            updatePagination(data.pagination, type);
        } else {
            showError(data.message || 'Không thể tải dữ liệu mua hàng');
        }
    } catch (error) {
        console.error('Error loading purchases:', error);
        showError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
        showLoading(false);
    }
}

// Display purchases
function displayPurchases(data, type) {
    const container = document.getElementById('purchasesList');
    if (!container) return;
    
    container.style.display = 'block';
    
    if (!data.items || data.items.length === 0) {
        container.innerHTML = generateEmptyState(type);
        return;
    }
    
    let purchasesHTML = '';
    data.items.forEach(purchase => {
        purchasesHTML += generatePurchaseHTML(purchase, type);
    });
    
    container.innerHTML = purchasesHTML;
    
    // Trigger AOS refresh for new elements
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Generate purchase HTML
function generatePurchaseHTML(purchase, type) {
    const statusClasses = {
        'pending': 'status-pending',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    
    const statusTexts = {
        'pending': 'Chờ thanh toán',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    
    const statusClass = statusClasses[purchase.status] || 'status-pending';
    const statusText = statusTexts[purchase.status] || purchase.status;
    
    // Generate items summary
    let itemsHTML = '';
    if (purchase.items && purchase.items.length > 0) {
        purchase.items.forEach(item => {
            itemsHTML += generateItemSummaryHTML(item);
        });
    } else {
        // Fallback for single item purchases
        itemsHTML = generateSingleItemHTML(purchase, type);
    }
    
    return `
        <div class="purchase-item" data-aos="fade-up">
            <div class="purchase-header">
                <div class="purchase-info">
                    <h3>Đơn hàng #${purchase.id || purchase.order_id}</h3>
                    <div class="purchase-meta">
                        <i class="fas fa-calendar me-2"></i>
                        ${formatDate(purchase.created_at || purchase.purchase_date)}
                        ${purchase.payment_method ? `<span class="ms-3"><i class="fas fa-credit-card me-2"></i>${getPaymentMethodText(purchase.payment_method)}</span>` : ''}
                    </div>
                </div>
                <div class="purchase-status ${statusClass}">
                    <i class="fas fa-circle me-2"></i>
                    ${statusText}
                </div>
            </div>
            
            <div class="purchase-items">
                ${itemsHTML}
            </div>
            
            <div class="purchase-footer">
                <div class="purchase-total">
                    Tổng: ${formatPrice(purchase.total_amount || purchase.price)} VNĐ
                </div>
                <div class="purchase-actions">
                    ${generateActionButtons(purchase, type)}
                </div>
            </div>
        </div>
    `;
}

// Generate item summary HTML
function generateItemSummaryHTML(item) {
    const typeIcons = {
        'course': 'fa-graduation-cap',
        'online_test': 'fa-clipboard-check',
        'consultation': 'fa-user-md'
    };
    
    const typeClasses = {
        'course': 'course',
        'online_test': 'test',
        'consultation': 'consultation'
    };
    
    const typeTexts = {
        'course': 'Khóa học',
        'online_test': 'Trắc nghiệm',
        'consultation': 'Tư vấn'
    };
    
    const icon = typeIcons[item.product_type] || 'fa-box';
    const typeClass = typeClasses[item.product_type] || 'course';
    const typeText = typeTexts[item.product_type] || item.product_type;
    
    return `
        <div class="item-summary">
            <div class="item-icon ${typeClass}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="item-details">
                <div class="item-name">${item.product_name || item.name}</div>
                <div class="item-type">${typeText}${item.package_type ? ` - ${item.package_type}` : ''}</div>
            </div>
            <div class="item-price">
                ${formatPrice(item.total_price || item.price)} VNĐ
            </div>
        </div>
    `;
}

// Generate single item HTML (fallback)
function generateSingleItemHTML(purchase, type) {
    const typeConfigs = {
        'courses': { icon: 'fa-graduation-cap', class: 'course', text: 'Khóa học' },
        'tests': { icon: 'fa-clipboard-check', class: 'test', text: 'Trắc nghiệm' },
        'consultations': { icon: 'fa-user-md', class: 'consultation', text: 'Tư vấn' }
    };
    
    const config = typeConfigs[type] || typeConfigs.courses;
    
    return `
        <div class="item-summary">
            <div class="item-icon ${config.class}">
                <i class="fas ${config.icon}"></i>
            </div>
            <div class="item-details">
                <div class="item-name">${purchase.product_name || purchase.name || 'Sản phẩm'}</div>
                <div class="item-type">${config.text}</div>
            </div>
            <div class="item-price">
                ${formatPrice(purchase.total_amount || purchase.price)} VNĐ
            </div>
        </div>
    `;
}

// Generate action buttons
function generateActionButtons(purchase, type) {
    let buttons = '';
    
    // View details button
    buttons += `
        <a href="order-confirmation?id=${purchase.id || purchase.order_id}" class="btn-sm btn-outline-primary">
            <i class="fas fa-eye me-1"></i>Xem chi tiết
        </a>
    `;
    
    // Type-specific buttons
    if (type === 'courses' && purchase.status === 'completed') {
        buttons += `
            <a href="my-courses?course=${purchase.id}" class="btn-sm btn-primary">
                <i class="fas fa-play me-1"></i>Học ngay
            </a>
        `;
    } else if (type === 'tests' && purchase.status === 'completed') {
        if (purchase.attempts_left > 0) {
            buttons += `
                <a href="test?token=${purchase.test_token}" class="btn-sm btn-primary">
                    <i class="fas fa-play me-1"></i>Làm bài
                </a>
            `;
        } else {
            buttons += `
                <a href="test-results?test=${purchase.id}" class="btn-sm btn-primary">
                    <i class="fas fa-chart-line me-1"></i>Xem kết quả
                </a>
            `;
        }
    } else if (type === 'consultations') {
        if (purchase.status === 'pending') {
            buttons += `
                <button class="btn-sm btn-primary" onclick="scheduleConsultation('${purchase.id}')">
                    <i class="fas fa-calendar me-1"></i>Đặt lịch
                </button>
            `;
        } else if (purchase.status === 'scheduled') {
            buttons += `
                <a href="my-consultations?id=${purchase.id}" class="btn-sm btn-primary">
                    <i class="fas fa-video me-1"></i>Tham gia
                </a>
            `;
        }
    }
    
    return buttons;
}

// Generate empty state
function generateEmptyState(type) {
    const emptyStates = {
        'all': {
            icon: 'fa-shopping-cart',
            title: 'Chưa có đơn hàng nào',
            description: 'Bạn chưa thực hiện mua hàng nào. Hãy khám phá các sản phẩm của chúng tôi!',
            action: { text: 'Mua sắm ngay', href: 'products' }
        },
        'courses': {
            icon: 'fa-graduation-cap',
            title: 'Chưa có khóa học nào',
            description: 'Bạn chưa mua khóa học nào. Khám phá các khóa học để phát triển sự nghiệp!',
            action: { text: 'Xem khóa học', href: 'products?type=course' }
        },
        'tests': {
            icon: 'fa-clipboard-check',
            title: 'Chưa có trắc nghiệm nào',
            description: 'Bạn chưa mua trắc nghiệm nào. Thử sức với các bài trắc nghiệm để đánh giá năng lực!',
            action: { text: 'Xem trắc nghiệm', href: 'products?type=test' }
        },
        'consultations': {
            icon: 'fa-user-md',
            title: 'Chưa có lịch tư vấn nào',
            description: 'Bạn chưa đặt lịch tư vấn nào. Đặt lịch với chuyên gia để được hỗ trợ tốt nhất!',
            action: { text: 'Đặt lịch tư vấn', href: 'products?type=consultation' }
        }
    };
    
    const state = emptyStates[type] || emptyStates.all;
    
    return `
        <div class="empty-state">
            <i class="fas ${state.icon}"></i>
            <h3>${state.title}</h3>
            <p>${state.description}</p>
            <a href="${state.action.href}" class="btn btn-primary">
                <i class="fas fa-shopping-bag me-2"></i>
                ${state.action.text}
            </a>
        </div>
    `;
}

// Update pagination
function updatePagination(paginationData, type) {
    const wrapper = document.getElementById('paginationWrapper');
    if (!wrapper || !paginationData) {
        wrapper.style.display = 'none';
        return;
    }
    
    if (paginationData.total_pages <= 1) {
        wrapper.style.display = 'none';
        return;
    }
    
    wrapper.style.display = 'flex';
    
    let paginationHTML = '<nav><ul class="pagination">';
    
    // Previous button
    if (paginationData.current_page > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPage(${paginationData.current_page - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
    }
    
    // Page numbers
    const startPage = Math.max(1, paginationData.current_page - 2);
    const endPage = Math.min(paginationData.total_pages, paginationData.current_page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === paginationData.current_page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="loadPage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    if (paginationData.current_page < paginationData.total_pages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPage(${paginationData.current_page + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    }
    
    paginationHTML += '</ul></nav>';
    wrapper.innerHTML = paginationHTML;
}

// Load specific page
function loadPage(page) {
    currentPage = page;
    loadPurchases(currentTab, currentFilters, page);
}

// Schedule consultation
async function scheduleConsultation(consultationId) {
    try {
        showToast('Tính năng đặt lịch tư vấn sẽ được cập nhật sớm', 'info');
        // TODO: Implement consultation scheduling
    } catch (error) {
        console.error('Error scheduling consultation:', error);
        showToast('Có lỗi xảy ra khi đặt lịch tư vấn', 'error');
    }
}

// Show loading state
function showLoading(show) {
    const loadingState = document.getElementById('loadingPurchases');
    const purchasesList = document.getElementById('purchasesList');
    const paginationWrapper = document.getElementById('paginationWrapper');
    
    if (loadingState) {
        loadingState.style.display = show ? 'block' : 'none';
    }
    
    if (purchasesList) {
        purchasesList.style.display = show ? 'none' : 'block';
    }
    
    if (paginationWrapper) {
        paginationWrapper.style.display = show ? 'none' : 'flex';
    }
}

// Show error
function showError(message) {
    const container = document.getElementById('purchasesList');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <h3>Có lỗi xảy ra</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadPurchases(currentTab, currentFilters, currentPage)">
                    <i class="fas fa-redo me-2"></i>Thử lại
                </button>
            </div>
        `;
        container.style.display = 'block';
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

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function formatPrice(price) {
    if (isNaN(price)) return '0';
    return new Intl.NumberFormat('vi-VN').format(price);
}

function getPaymentMethodText(method) {
    const methods = {
        'bank_transfer': 'Chuyển khoản',
        'momo': 'MoMo',
        'vnpay': 'VNPay',
        'credit_card': 'Thẻ tín dụng',
        'cash': 'Tiền mặt'
    };
    
    return methods[method] || method;
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
window.initializePurchases = initializePurchases;
window.applyFilters = applyFilters;
window.loadPage = loadPage;
window.scheduleConsultation = scheduleConsultation;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializePurchases();
});
