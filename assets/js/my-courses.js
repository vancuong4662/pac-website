/**
 * My Courses JavaScript Module
 * Handles course management, progress tracking, and course interactions
 */

// Global variables
let currentPage = 1;
let currentFilters = {};
let coursesData = {};
let stats = { total: 0, active: 0, completed: 0, expired: 0 };

// Initialize my courses page
function initializeMyCourses() {
    setupFilterHandlers();
    loadCourses();
    loadStatistics();
}

// Setup filter handlers
function setupFilterHandlers() {
    // Auto-apply filters on change
    const filterControls = document.querySelectorAll('.filter-control');
    filterControls.forEach(control => {
        if (control.type === 'text') {
            control.addEventListener('input', debounce(() => {
                applyFilters();
            }, 500));
        } else {
            control.addEventListener('change', () => {
                applyFilters();
            });
        }
    });
    
    // Enter key to apply filters
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.classList.contains('filter-control')) {
            applyFilters();
        }
    });
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const searchInput = document.getElementById('searchInput')?.value || '';
    
    currentFilters = {
        status: statusFilter,
        category: categoryFilter,
        search: searchInput
    };
    
    currentPage = 1;
    loadCourses(currentFilters);
}

// Load courses data
async function loadCourses(filters = {}, page = 1) {
    try {
        showLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams({
            page: page,
            limit: 12,
            ...filters
        });
        
        const response = await fetch(`api/courses/my-courses.php?${params}`);
        const data = await response.json();
        
        if (data.success) {
            coursesData = data.data;
            displayCourses(data.data);
            updatePagination(data.pagination);
        } else {
            showError(data.message || 'Không thể tải danh sách khóa học');
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Có lỗi xảy ra khi tải danh sách khóa học');
    } finally {
        showLoading(false);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('api/courses/my-courses-stats.php');
        const data = await response.json();
        
        if (data.success) {
            stats = data.data;
            updateStatistics(stats);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Update statistics display
function updateStatistics(stats) {
    document.getElementById('totalCourses').textContent = stats.total || 0;
    document.getElementById('activeCourses').textContent = stats.active || 0;
    document.getElementById('completedCourses').textContent = stats.completed || 0;
    document.getElementById('expiredCourses').textContent = stats.expired || 0;
}

// Display courses
function displayCourses(data) {
    const container = document.getElementById('coursesList');
    if (!container) return;
    
    container.style.display = 'block';
    
    if (!data.items || data.items.length === 0) {
        container.innerHTML = generateEmptyState();
        return;
    }
    
    let coursesHTML = '';
    data.items.forEach(course => {
        coursesHTML += generateCourseHTML(course);
    });
    
    container.innerHTML = coursesHTML;
    
    // Trigger AOS refresh for new elements
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Generate course HTML
function generateCourseHTML(course) {
    const progressPercentage = Math.round(course.progress_percentage || 0);
    const status = determineCourseStatus(course);
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    
    // Calculate time remaining
    const timeRemaining = calculateTimeRemaining(course.expires_at);
    
    return `
        <div class="course-card" data-aos="fade-up">
            <div class="course-header">
                <div class="status-badge ${statusClass}">
                    ${statusText}
                </div>
                
                <div class="course-progress">
                    <div class="progress-circle">
                        ${progressPercentage}%
                    </div>
                    <div class="progress-text">Hoàn thành</div>
                </div>
                
                <div class="course-thumbnail">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                
                <div class="course-title">${course.name}</div>
                <div class="course-category">${getCategoryText(course.category)}</div>
            </div>
            
            <div class="course-body">
                <div class="course-meta">
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${course.duration || 'Không giới hạn'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-play-circle"></i>
                        <span>${course.total_lessons || 0} bài học</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>Mua: ${formatDate(course.purchased_at)}</span>
                    </div>
                    ${timeRemaining ? `
                    <div class="meta-item">
                        <i class="fas fa-hourglass-half"></i>
                        <span>${timeRemaining}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-label">
                        <span>Tiến độ học tập</span>
                        <span>${course.completed_lessons || 0}/${course.total_lessons || 0} bài</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
                
                <div class="course-actions">
                    ${generateCourseActionButtons(course, status)}
                </div>
            </div>
        </div>
    `;
}

// Generate course action buttons
function generateCourseActionButtons(course, status) {
    let buttons = '';
    
    if (status === 'active') {
        if (course.last_lesson_id) {
            buttons += `
                <a href="course-player?course=${course.id}&lesson=${course.last_lesson_id}" class="btn btn-continue">
                    <i class="fas fa-play me-2"></i>Tiếp tục học
                </a>
            `;
        } else {
            buttons += `
                <a href="course-player?course=${course.id}" class="btn btn-continue">
                    <i class="fas fa-play me-2"></i>Bắt đầu học
                </a>
            `;
        }
        
        buttons += `
            <a href="course-detail?id=${course.id}" class="btn btn-outline-primary">
                <i class="fas fa-info-circle me-2"></i>Chi tiết
            </a>
        `;
        
        if (course.has_certificate && course.progress_percentage >= 80) {
            buttons += `
                <button class="btn btn-outline-success" onclick="downloadCertificate('${course.id}')">
                    <i class="fas fa-certificate me-2"></i>Tải chứng chỉ
                </button>
            `;
        }
    } else if (status === 'completed') {
        buttons += `
            <a href="course-player?course=${course.id}" class="btn btn-continue">
                <i class="fas fa-redo me-2"></i>Xem lại
            </a>
            <a href="course-detail?id=${course.id}" class="btn btn-outline-primary">
                <i class="fas fa-info-circle me-2"></i>Chi tiết
            </a>
        `;
        
        if (course.has_certificate) {
            buttons += `
                <button class="btn btn-outline-success" onclick="downloadCertificate('${course.id}')">
                    <i class="fas fa-certificate me-2"></i>Tải chứng chỉ
                </button>
            `;
        }
        
        if (course.can_review) {
            buttons += `
                <button class="btn btn-outline-warning" onclick="reviewCourse('${course.id}')">
                    <i class="fas fa-star me-2"></i>Đánh giá
                </button>
            `;
        }
    } else if (status === 'expired') {
        buttons += `
            <a href="course-detail?id=${course.course_id}" class="btn btn-outline-primary">
                <i class="fas fa-info-circle me-2"></i>Chi tiết khóa học
            </a>
            <button class="btn btn-continue" onclick="renewCourse('${course.id}')">
                <i class="fas fa-refresh me-2"></i>Gia hạn
            </button>
        `;
    }
    
    return buttons;
}

// Determine course status
function determineCourseStatus(course) {
    if (course.expires_at && new Date(course.expires_at) < new Date()) {
        return 'expired';
    }
    
    if (course.progress_percentage >= 100) {
        return 'completed';
    }
    
    return 'active';
}

// Get status class
function getStatusClass(status) {
    const classes = {
        'active': 'status-active',
        'completed': 'status-completed',
        'expired': 'status-expired'
    };
    
    return classes[status] || 'status-active';
}

// Get status text
function getStatusText(status) {
    const texts = {
        'active': 'Đang học',
        'completed': 'Hoàn thành',
        'expired': 'Hết hạn'
    };
    
    return texts[status] || status;
}

// Get category text
function getCategoryText(category) {
    const categories = {
        'business': 'Kinh doanh',
        'technology': 'Công nghệ',
        'marketing': 'Marketing',
        'design': 'Thiết kế',
        'language': 'Ngoại ngữ'
    };
    
    return categories[category] || category;
}

// Calculate time remaining
function calculateTimeRemaining(expiresAt) {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Đã hết hạn';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 30) {
        const months = Math.floor(days / 30);
        return `Còn ${months} tháng`;
    } else if (days > 0) {
        return `Còn ${days} ngày`;
    } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        return `Còn ${hours} giờ`;
    }
}

// Generate empty state
function generateEmptyState() {
    return `
        <div class="empty-state">
            <i class="fas fa-graduation-cap"></i>
            <h3>Chưa có khóa học nào</h3>
            <p>Bạn chưa mua khóa học nào. Khám phá các khóa học để phát triển sự nghiệp!</p>
            <a href="products?type=course" class="btn btn-primary">
                <i class="fas fa-shopping-bag me-2"></i>
                Xem khóa học
            </a>
        </div>
    `;
}

// Update pagination
function updatePagination(paginationData) {
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
    loadCourses(currentFilters, page);
}

// Download certificate
async function downloadCertificate(courseId) {
    try {
        showToast('Đang tạo chứng chỉ...', 'info');
        
        const response = await fetch(`api/courses/certificate.php?course_id=${courseId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${courseId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('Tải chứng chỉ thành công!', 'success');
        } else {
            const data = await response.json();
            showToast(data.message || 'Không thể tải chứng chỉ', 'error');
        }
    } catch (error) {
        console.error('Error downloading certificate:', error);
        showToast('Có lỗi xảy ra khi tải chứng chỉ', 'error');
    }
}

// Review course
async function reviewCourse(courseId) {
    try {
        // TODO: Implement course review modal
        showToast('Tính năng đánh giá khóa học sẽ được cập nhật sớm', 'info');
    } catch (error) {
        console.error('Error reviewing course:', error);
        showToast('Có lỗi xảy ra khi đánh giá khóa học', 'error');
    }
}

// Renew course
async function renewCourse(courseId) {
    try {
        if (!confirm('Bạn có muốn gia hạn khóa học này không?')) {
            return;
        }
        
        showToast('Đang xử lý gia hạn...', 'info');
        
        const response = await fetch('api/courses/renew.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ course_id: courseId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Gia hạn khóa học thành công!', 'success');
            loadCourses(currentFilters, currentPage);
            loadStatistics();
        } else {
            showToast(data.message || 'Không thể gia hạn khóa học', 'error');
        }
    } catch (error) {
        console.error('Error renewing course:', error);
        showToast('Có lỗi xảy ra khi gia hạn khóa học', 'error');
    }
}

// Show loading state
function showLoading(show) {
    const loadingState = document.getElementById('loadingCourses');
    const coursesList = document.getElementById('coursesList');
    const paginationWrapper = document.getElementById('paginationWrapper');
    
    if (loadingState) {
        loadingState.style.display = show ? 'block' : 'none';
    }
    
    if (coursesList) {
        coursesList.style.display = show ? 'none' : 'block';
    }
    
    if (paginationWrapper) {
        paginationWrapper.style.display = show ? 'none' : 'flex';
    }
}

// Show error
function showError(message) {
    const container = document.getElementById('coursesList');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <h3>Có lỗi xảy ra</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadCourses(currentFilters, currentPage)">
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
            day: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
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
window.initializeMyCourses = initializeMyCourses;
window.applyFilters = applyFilters;
window.loadPage = loadPage;
window.downloadCertificate = downloadCertificate;
window.reviewCourse = reviewCourse;
window.renewCourse = renewCourse;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeMyCourses();
});
