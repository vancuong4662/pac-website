/**
 * Admin Dashboard JavaScript
 * Loads and displays statistics from various admin modules
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

/**
 * Initialize dashboard
 */
async function initializeDashboard() {
    console.log('Initializing admin dashboard...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load all statistics
    await loadDashboardStatistics();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-dashboard-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardStatistics);
    }
}

/**
 * Load all dashboard statistics
 */
async function loadDashboardStatistics() {
    console.log('Loading dashboard statistics...');
    
    try {
        // Load statistics in parallel
        await Promise.all([
            loadUsersStatistics(),
            loadOrdersStatistics(),
            loadCoursesStatistics(),
            loadConsultationsStatistics()
        ]);
        
        showSuccess('Đã cập nhật thống kê thành công');
    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
        showError('Không thể tải thống kê: ' + error.message);
    }
}

/**
 * Load users statistics
 */
async function loadUsersStatistics() {
    try {
        const response = await fetch('api/admin/users.php');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data.statistics || {};
            
            // Update display
            updateElement('stat-total-users', stats.totalUsers || 0);
            updateElement('stat-users-growth', stats.activeUsers || 0);
        }
    } catch (error) {
        console.error('Error loading users statistics:', error);
        updateElement('stat-total-users', '0');
        updateElement('stat-users-growth', '0');
    }
}

/**
 * Load orders statistics
 */
async function loadOrdersStatistics() {
    try {
        const response = await fetch('api/admin/orders.php');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data.statistics || {};
            const orders = result.data.orders || [];
            
            // Count paid orders
            const paidOrders = orders.filter(order => order.payment_status === 'paid').length;
            
            // Update display
            updateElement('stat-total-orders', stats.totalOrders || 0);
            updateElement('stat-orders-paid', paidOrders);
            updateElement('stat-total-revenue', formatCurrency(stats.totalRevenue || 0));
        }
    } catch (error) {
        console.error('Error loading orders statistics:', error);
        updateElement('stat-total-orders', '0');
        updateElement('stat-orders-paid', '0');
        updateElement('stat-total-revenue', formatCurrency(0));
    }
}

/**
 * Load courses statistics
 */
async function loadCoursesStatistics() {
    try {
        const response = await fetch('api/admin/courses.php');
        const result = await response.json();
        
        if (result.success) {
            const courses = result.data || [];
            const activeCourses = courses.filter(course => course.status === 'active').length;
            
            // Update display
            updateElement('stat-total-courses', courses.length);
            updateElement('stat-courses-active', activeCourses);
        }
    } catch (error) {
        console.error('Error loading courses statistics:', error);
        updateElement('stat-total-courses', '0');
        updateElement('stat-courses-active', '0');
    }
}

/**
 * Load consultations statistics
 */
async function loadConsultationsStatistics() {
    try {
        const response = await fetch('api/admin/consultations.php');
        const result = await response.json();
        
        if (result.success) {
            const consultations = result.data || [];
            const activeConsultations = consultations.filter(c => c.status === 'active').length;
            const percentage = consultations.length > 0 
                ? Math.round((activeConsultations / consultations.length) * 100) 
                : 0;
            
            // Update display
            updateElement('stat-total-consultations', consultations.length);
            updateElement('stat-consultations-active', activeConsultations);
            updateElement('stat-consultations-percentage', percentage + '%');
        }
    } catch (error) {
        console.error('Error loading consultations statistics:', error);
        updateElement('stat-total-consultations', '0');
        updateElement('stat-consultations-active', '0');
        updateElement('stat-consultations-percentage', '0%');
    }
}

/**
 * Update element text content
 */
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
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
 * Show success message
 */
function showSuccess(message) {
    if (window.Toastbar) {
        window.Toastbar.success(message);
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (window.Toastbar) {
        window.Toastbar.error(message);
    }
}

/**
 * Show info message
 */
function showInfo(message) {
    if (window.Toastbar) {
        window.Toastbar.info(message);
    }
}
