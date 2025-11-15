/**
 * Admin Users Management
 * Handles user listing, filtering, search, and detail viewing
 */

// Global state
let usersData = [];
let filteredUsers = [];
let statistics = {
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    verifiedUsers: 0
};

// DOM Elements
let searchInput;
let filterRole;
let filterStatus;
let applyFiltersBtn;
let refreshBtn;
let usersTbody;

// Debounce timer for search
let searchDebounceTimer;

/**
 * Initialize on DOM ready
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    attachEventListeners();
    loadUsers();
});

/**
 * Initialize DOM elements
 */
function initializeElements() {
    searchInput = document.getElementById('search-input');
    filterRole = document.getElementById('filter-role');
    filterStatus = document.getElementById('filter-status');
    applyFiltersBtn = document.getElementById('apply-filters');
    refreshBtn = document.getElementById('refresh-users-btn');
    usersTbody = document.getElementById('users-tbody');
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    // Apply filters button
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadUsers();
        });
    }
    
    // Search input with debounce
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(applyFilters, 500);
        });
    }
    
    // Enter key on search
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
    
    // Filter dropdowns
    if (filterRole) {
        filterRole.addEventListener('change', applyFilters);
    }
    if (filterStatus) {
        filterStatus.addEventListener('change', applyFilters);
    }
}

/**
 * Load users from API
 */
async function loadUsers() {
    try {
        // Show loading state
        if (usersTbody) {
            usersTbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 text-muted">Đang tải dữ liệu...</p>
                    </td>
                </tr>
            `;
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add filters if set
        const role = filterRole?.value;
        const status = filterStatus?.value;
        const search = searchInput?.value?.trim();
        
        if (role) params.append('role', role);
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        
        // Fetch users
        const response = await fetch(`api/admin/users.php?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            usersData = result.data?.users || [];
            statistics = result.data?.statistics || statistics;
            
            // Apply filters and render
            applyFilters();
            updateStatistics();
        } else {
            throw new Error(result.message || 'Không thể tải danh sách người dùng');
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Không thể tải danh sách người dùng: ' + error.message);
        
        if (usersTbody) {
            usersTbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-exclamation-circle text-danger fa-3x mb-3"></i>
                        <p class="text-danger mb-0">Không thể tải dữ liệu</p>
                        <small class="text-muted">${error.message}</small>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Apply filters to users data
 */
function applyFilters() {
    const role = filterRole?.value || '';
    const status = filterStatus?.value || '';
    const searchTerm = searchInput?.value?.toLowerCase().trim() || '';
    
    filteredUsers = usersData.filter(user => {
        // Role filter
        if (role && user.role !== role) return false;
        
        // Status filter
        if (status && user.status !== status) return false;
        
        // Search filter
        if (searchTerm) {
            const searchableText = [
                user.full_name,
                user.email,
                user.phone,
                user.user_id?.toString()
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    renderUsers();
}

/**
 * Render users table
 */
function renderUsers() {
    if (!usersTbody) return;
    
    if (filteredUsers.length === 0) {
        usersTbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-user-slash fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-0">Không tìm thấy người dùng nào</p>
                </td>
            </tr>
        `;
        return;
    }
    
    usersTbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td><strong>#${user.user_id}</strong></td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-circle me-2">
                        ${getAvatarHTML(user)}
                    </div>
                    <span>${escapeHtml(user.full_name || 'N/A')}</span>
                </div>
            </td>
            <td>
                ${escapeHtml(user.email)}
                ${user.email_verified ? '<i class="fas fa-check-circle text-success ms-1" title="Email đã xác thực"></i>' : ''}
            </td>
            <td>${escapeHtml(user.phone || 'N/A')}</td>
            <td>${getRoleBadge(user.role)}</td>
            <td>${getStatusBadge(user.status)}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewUserDetails(${user.user_id})" title="Xem chi tiết">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * View user details in modal
 */
async function viewUserDetails(userId) {
    const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
    const modalContent = document.getElementById('user-detail-content');
    
    modal.show();
    
    // Show loading
    modalContent.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">Đang tải thông tin...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`api/admin/users.php?action=detail&user_id=${userId}`);
        const result = await response.json();
        
        if (result.success) {
            const user = result.data;
            modalContent.innerHTML = renderUserDetails(user);
        } else {
            throw new Error(result.message || 'Không thể tải thông tin người dùng');
        }
        
    } catch (error) {
        console.error('Error loading user details:', error);
        modalContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Không thể tải thông tin: ${error.message}
            </div>
        `;
    }
}

/**
 * Render user details HTML
 */
function renderUserDetails(user) {
    return `
        <div class="row">
            <div class="col-md-12">
                <div class="text-center mb-4">
                    <div class="avatar-circle-large mx-auto mb-3">
                        ${getAvatarHTML(user, true)}
                    </div>
                    <h4>${escapeHtml(user.full_name || 'N/A')}</h4>
                    <div class="mb-2">
                        ${getRoleBadge(user.role)}
                        ${getStatusBadge(user.status)}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-muted mb-3"><i class="fas fa-info-circle me-2"></i>Thông tin cơ bản</h6>
                <table class="table table-sm">
                    <tr>
                        <td class="text-muted" style="width: 140px;">ID:</td>
                        <td><strong>#${user.user_id}</strong></td>
                    </tr>
                    <tr>
                        <td class="text-muted">Tên đầy đủ:</td>
                        <td>${escapeHtml(user.full_name || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">Email:</td>
                        <td>
                            ${escapeHtml(user.email)}
                            ${user.email_verified ? '<span class="badge bg-success ms-2">Đã xác thực</span>' : '<span class="badge bg-warning ms-2">Chưa xác thực</span>'}
                        </td>
                    </tr>
                    <tr>
                        <td class="text-muted">Số điện thoại:</td>
                        <td>${escapeHtml(user.phone || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="text-muted" style="width: 140px;">Ngày sinh:</td>
                        <td>${user.date_of_birth ? formatDate(user.date_of_birth) : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">Địa chỉ:</td>
                        <td>${escapeHtml(user.address || 'N/A')}</td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-muted mb-3"><i class="fas fa-shield-alt me-2"></i>Thông tin tài khoản</h6>
                <table class="table table-sm">
                    <tr>
                        <td class="text-muted" style="width: 140px;">Vai trò:</td>
                        <td>${getRoleBadge(user.role)}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">Trạng thái:</td>
                        <td>${getStatusBadge(user.status)}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">Ngày đăng ký:</td>
                        <td>${formatDateTime(user.created_at)}</td>
                    </tr>
                    <tr>
                        <td class="text-muted">Lần truy cập cuối:</td>
                        <td>Chưa có dữ liệu</td>
                    </tr>
                    <tr>
                        <td class="text-muted">IP cuối cùng:</td>
                        <td>Chưa có dữ liệu</td>
                    </tr>
                </table>
            </div>
        </div>
        
        ${user.purchase_stats ? `
            <hr class="my-4">
            <div class="row">
                <div class="col-12">
                    <h6 class="text-muted mb-3"><i class="fas fa-shopping-cart me-2"></i>Thống kê mua hàng</h6>
                    <div class="row text-center">
                        <div class="col-md-4">
                            <div class="p-3 border rounded">
                                <h4 class="mb-1 text-primary">${user.purchase_stats.total_orders || 0}</h4>
                                <small class="text-muted">Tổng đơn hàng</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border rounded">
                                <h4 class="mb-1 text-success">${formatCurrency(user.purchase_stats.total_spent || 0)}</h4>
                                <small class="text-muted">Tổng chi tiêu</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border rounded">
                                <h4 class="mb-1 text-info">${user.purchase_stats.last_order_date ? formatDate(user.purchase_stats.last_order_date) : 'N/A'}</h4>
                                <small class="text-muted">Đơn hàng gần nhất</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Update statistics display
 */
function updateStatistics() {
    // Total users
    const totalUsersEl = document.getElementById('stat-total-users');
    if (totalUsersEl) {
        totalUsersEl.textContent = statistics.totalUsers || usersData.length;
    }
    
    // Active users
    const activeUsersEl = document.getElementById('stat-active-users');
    if (activeUsersEl) {
        activeUsersEl.textContent = statistics.activeUsers || 0;
    }
    
    // Admin users
    const adminUsersEl = document.getElementById('stat-admin-users');
    if (adminUsersEl) {
        adminUsersEl.textContent = statistics.adminUsers || 0;
    }
    
    // Verified users
    const verifiedUsersEl = document.getElementById('stat-verified-users');
    if (verifiedUsersEl) {
        verifiedUsersEl.textContent = statistics.verifiedUsers || 0;
    }
}

/**
 * Get avatar HTML
 */
function getAvatarHTML(user, large = false) {
    const size = large ? '80px' : '32px';
    const fontSize = large ? '32px' : '14px';
    
    // Generate initials from full_name or email
    const name = user.full_name || user.email || '??';
    const initials = name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    
    return `<div style="width: ${size}; height: ${size}; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${fontSize};">${initials}</div>`;
}

/**
 * Get role badge
 */
function getRoleBadge(role) {
    const badges = {
        'admin': '<span class="badge bg-danger"><i class="fas fa-user-shield me-1"></i>Admin</span>',
        'moderator': '<span class="badge bg-warning"><i class="fas fa-user-cog me-1"></i>Moderator</span>',
        'user': '<span class="badge bg-primary"><i class="fas fa-user me-1"></i>User</span>'
    };
    
    return badges[role] || `<span class="badge bg-secondary">${role}</span>`;
}

/**
 * Get status badge
 */
function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge bg-success">Hoạt động</span>',
        'inactive': '<span class="badge bg-secondary">Không hoạt động</span>',
        'banned': '<span class="badge bg-danger">Bị cấm</span>',
        'pending': '<span class="badge bg-warning">Chờ duyệt</span>'
    };
    
    return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
}

/**
 * Get gender label
 */
function getGenderLabel(gender) {
    const labels = {
        'male': 'Nam',
        'female': 'Nữ',
        'other': 'Khác'
    };
    
    return labels[gender] || 'N/A';
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Format date time
 */
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show error message
 */
function showError(message) {
    if (window.Toastbar) {
        window.Toastbar.error(message);
    } else {
        alert(message);
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    if (window.Toastbar) {
        window.Toastbar.success(message);
    } else {
        alert(message);
    }
}

// Add CSS for avatar circles
const style = document.createElement('style');
style.textContent = `
    .avatar-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        display: inline-block;
    }
    
    .avatar-circle-large {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        display: inline-block;
    }
`;
document.head.appendChild(style);
