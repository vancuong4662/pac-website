// Admin Sidebar Management
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar functionality after component load
    setTimeout(initSidebar, 100);
    
    // Also listen for componentsLoaded event from component-loader
    document.addEventListener('componentsLoaded', function() {
        setTimeout(initSidebar, 100);
    });
});

function initSidebar() {
    // Sidebar toggle for mobile - updated selectors
    const sidebarToggle = document.querySelector('#sidebar-toggle');
    const sidebarWrapper = document.querySelector('.sidebar-wrapper');
    const sidebarOverlay = document.querySelector('#sidebar-overlay');
    
    if (sidebarToggle && sidebarWrapper) {
        sidebarToggle.addEventListener('click', function() {
            sidebarWrapper.classList.toggle('show');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('show');
            }
        });
    }
    
    // Close sidebar when clicking overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebarWrapper.classList.remove('show');
            sidebarOverlay.classList.remove('show');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (sidebarWrapper && !sidebarWrapper.contains(e.target) && 
                sidebarToggle && !sidebarToggle.contains(e.target)) {
                sidebarWrapper.classList.remove('show');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('show');
                }
            }
        }
    });
    
    // Initialize navigation events
    initSidebarEvents();
}

function initSidebarEvents() {
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    if (navLinks.length === 0) {
        // Sidebar not loaded yet, try again
        setTimeout(initSidebarEvents, 200);
        return;
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't prevent default - let the link navigate normally
            // Just update active state before navigation
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // The browser will handle navigation via href attribute
        });
    });
    
    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Set active menu based on current URL
    setActiveMenu();
}

function setActiveMenu() {
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const page = link.dataset.page;
        const href = link.getAttribute('href');
        
        // Check multiple ways to ensure accurate matching
        // 1. Check if URL contains the full admin page path
        if (currentPath.includes(`admin-${page}`) || currentUrl.includes(`admin-${page}`)) {
            link.classList.add('active');
        }
        // 2. Also check direct href match (for cases like admin-dashboard vs admin-booking-courses)
        else if (href && (currentPath.endsWith(href) || currentUrl.endsWith(href))) {
            link.classList.add('active');
        }
    });
}

function navigateToPage(page) {
    // Update URL without reload
    const newUrl = `../../admin/${page}`;
    
    // For now, we'll redirect to show the concept
    // In a real SPA, you would load content dynamically
    showToast('Thông báo', `Chuyển đến trang ${getPageTitle(page)}`, 'info', 2000);
    
    // Simulate navigation - in real implementation, you'd load the page
    setTimeout(() => {
        // window.location.href = newUrl;
        console.log(`Navigate to: ${page}`);
    }, 1000);
}

function getPageTitle(page) {
    const titles = {
        'consultations': 'Quản lý Tư vấn',
        'courses': 'Quản lý Khóa học', 
        'tests': 'Quản lý Trắc nghiệm',
        'orders': 'Quản lý Đơn hàng',
        'users': 'Quản lý Tài khoản',
        'settings': 'Cài đặt Website'
    };
    
    return titles[page] || page;
}

function updatePageTitle(page) {
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = getPageTitle(page);
    }
    
    // Update document title
    document.title = `Admin Dashboard - ${getPageTitle(page)} - PAC Group`;
}

async function handleLogout() {
    // Show confirmation dialog with modern styling
    const confirmLogout = await showConfirmDialog(
        'Xác nhận đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?'
    );
    
    if (!confirmLogout) return;
    
    try {
        const response = await fetch('../../api/auth/logout.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Thành công', 'Đăng xuất thành công!', 'success', 2000);
            
            // Clear any stored admin session data
            localStorage.removeItem('admin_session');
            sessionStorage.clear();
            
            setTimeout(() => {
                window.location.href = '../../dangnhap';
            }, 1000);
        } else {
            showToast('Lỗi', result.message || 'Có lỗi xảy ra khi đăng xuất', 'error', 3000);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Lỗi', 'Có lỗi xảy ra khi đăng xuất', 'error', 3000);
    }
}

// Utility function for confirmation dialogs
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        // Create a better looking confirm dialog
        const result = confirm(`${title}\n\n${message}`);
        resolve(result);
    });
}

// Check admin authentication on page load
function checkAdminAuth() {
    // This would typically check with the server
    // For now, we'll just check if user has admin role
    const userRole = localStorage.getItem('user_role');
    
    if (userRole !== 'admin') {
        showToast('Lỗi', 'Bạn không có quyền truy cập trang này', 'error', 3000);
        setTimeout(() => {
            window.location.href = '../../dangnhap';
        }, 2000);
        return false;
    }
    
    return true;
}

// Initialize auth check
document.addEventListener('DOMContentLoaded', function() {
    // Uncomment when authentication is implemented
    // checkAdminAuth();
});

// Handle responsive sidebar
function handleResize() {
    const sidebarWrapper = document.querySelector('.sidebar-wrapper');
    
    if (window.innerWidth > 768) {
        if (sidebarWrapper) {
            sidebarWrapper.classList.remove('show');
        }
    }
}

window.addEventListener('resize', handleResize);

// Export functions for use in other modules
window.AdminSidebar = {
    setActiveMenu,
    updatePageTitle,
    navigateToPage,
    handleLogout
};
