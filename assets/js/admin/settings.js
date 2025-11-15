/**
 * Admin Settings JavaScript
 * Handles system configuration and maintenance (Frontend only - no backend yet)
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

/**
 * Initialize settings page
 */
function initializeSettings() {
    console.log('Initializing settings page...');
    
    // Setup maintenance mode toggle
    setupMaintenanceMode();
    
    // Load VNPay config (placeholder values)
    loadVNPayConfig();
}

/**
 * Setup maintenance mode toggle
 */
function setupMaintenanceMode() {
    const maintenanceToggle = document.getElementById('maintenance-mode');
    const statusBadge = document.getElementById('maintenance-status');
    
    if (maintenanceToggle) {
        maintenanceToggle.addEventListener('change', function() {
            const isEnabled = this.checked;
            
            // Update badge
            if (statusBadge) {
                statusBadge.textContent = isEnabled ? 'Bật' : 'Tắt';
                statusBadge.className = isEnabled ? 'badge bg-danger' : 'badge bg-secondary';
            }
            
            // Show notification
            showFeatureNotImplemented('Chế độ bảo trì');
            
            // Revert toggle (since not implemented)
            setTimeout(() => {
                this.checked = false;
                if (statusBadge) {
                    statusBadge.textContent = 'Tắt';
                    statusBadge.className = 'badge bg-secondary';
                }
            }, 100);
        });
    }
}

/**
 * Load VNPay configuration (placeholder)
 */
function loadVNPayConfig() {
    document.getElementById('vnpay-tmn-code').value = 'DEMO_TMN_CODE';
    document.getElementById('vnpay-hash-secret').value = '••••••••••••••••';
    document.getElementById('vnpay-return-url').value = window.location.origin + '/pac-new/vnpay-return';
}

/**
 * Save VNPay configuration
 */
function saveVNPayConfig() {
    showFeatureNotImplemented('Lưu cấu hình VNPay');
}

/**
 * Test VNPay connection
 */
function testVNPayConnection() {
    showFeatureNotImplemented('Test kết nối VNPay');
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Backup data
 * @param {string} type - Type of backup: users, payments, quiz, full
 */
function backupData(type) {
    let title = '';
    let message = '';
    
    switch(type) {
        case 'users':
            title = 'Sao lưu dữ liệu Người dùng';
            message = 'Đang sao lưu thông tin người dùng, tài khoản, quyền hạn...';
            break;
        case 'payments':
            title = 'Sao lưu dữ liệu Thanh toán';
            message = 'Đang sao lưu đơn hàng, giao dịch VNPay, lịch sử thanh toán...';
            break;
        case 'quiz':
            title = 'Sao lưu dữ liệu Bài trắc nghiệm';
            message = 'Đang sao lưu kết quả test, câu trả lời, phân tích Holland Code...';
            break;
        case 'full':
            title = 'Sao lưu toàn bộ Hệ thống';
            message = 'Đang sao lưu tất cả dữ liệu trong hệ thống...';
            break;
    }
    
    // Show loading notification
    if (window.Toastbar) {
        window.Toastbar.info(message);
    }
    
    // Simulate backup process
    setTimeout(() => {
        showFeatureNotImplemented(title);
    }, 500);
}

/**
 * Show feature not implemented notification
 */
function showFeatureNotImplemented(featureName) {
    const message = `Tính năng "${featureName}" chưa được triển khai. Sẽ cập nhật trong phiên bản sau.`;
    
    if (window.Toastbar) {
        window.Toastbar.warning(message);
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
 * Show info message
 */
function showInfo(message) {
    if (window.Toastbar) {
        window.Toastbar.info(message);
    } else {
        alert(message);
    }
}
