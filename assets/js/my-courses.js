/**
 * My Courses JavaScript Module
 * Quản lý trang khóa học của tôi
 */

class MyCoursesManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilters = {
            status: '',
            category: '',
            search: ''
        };
        
        this.init();
    }
    
    init() {
        console.log('[MyCoursesManager] Initializing...');
        
        // Bind events
        this.bindEvents();
        
        // Load courses
        this.loadCourses();
    }
    
    bindEvents() {
        // Search input với debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.currentPage = 1;
                    this.loadCourses();
                }, 500);
            });
        }
        
        // Filter dropdowns
        const statusFilter = document.getElementById('statusFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.currentPage = 1;
                this.loadCourses();
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.currentPage = 1;
                this.loadCourses();
            });
        }
    }
    
    async loadCourses() {
        console.log('[MyCoursesManager] Loading courses...');
        
        try {
            // Show loading
            this.showLoading();
            
            // Build query parameters
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.currentFilters
            });
            
            // Remove empty filters
            Object.keys(this.currentFilters).forEach(key => {
                if (!this.currentFilters[key]) {
                    params.delete(key);
                }
            });
            
            const response = await fetch(`api/courses/my-courses.php?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                console.log('[MyCoursesManager] Courses loaded:', data.data);
                
                // Update statistics (if needed - removed from UI but keep for potential future use)
                this.updateStatistics(data.data.statistics);
                
                // Render courses
                this.renderCourses(data.data.courses);
                
                // Render pagination
                this.renderPagination(data.data.pagination);
                
                // Hide loading
                this.hideLoading();
                
            } else {
                throw new Error(data.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('[MyCoursesManager] Error loading courses:', error);
            this.showError('Không thể tải danh sách khóa học. Vui lòng thử lại.');
            this.hideLoading();
        }
    }
    
    updateStatistics(stats) {
        // Update statistics if elements exist (for future use)
        const elements = {
            totalCourses: document.getElementById('totalCourses'),
            activeCourses: document.getElementById('activeCourses'),
            completedCourses: document.getElementById('completedCourses'),
            expiredCourses: document.getElementById('expiredCourses')
        };
        
        if (elements.totalCourses) elements.totalCourses.textContent = stats.total_courses;
        if (elements.activeCourses) elements.activeCourses.textContent = stats.active_courses;
        if (elements.completedCourses) elements.completedCourses.textContent = stats.completed_courses;
        if (elements.expiredCourses) elements.expiredCourses.textContent = stats.expired_courses;
    }
    
    renderCourses(courses) {
        const coursesContent = document.getElementById('coursesContent');
        const emptyState = document.getElementById('empty-state');
        
        if (!coursesContent) {
            console.error('[MyCoursesManager] coursesContent element not found');
            return;
        }
        
        if (courses.length === 0) {
            // Show empty state
            coursesContent.style.display = 'none';
            if (emptyState) {
                emptyState.classList.remove('d-none');
            }
            return;
        }
        
        // Hide empty state
        if (emptyState) {
            emptyState.classList.add('d-none');
        }
        
        // Build courses table
        const tableHTML = this.buildCoursesTable(courses);
        coursesContent.innerHTML = tableHTML;
        coursesContent.style.display = 'block';
    }
    
    buildCoursesTable(courses) {
        return `
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th scope="col" class="px-4 py-3" style="min-width: 300px;">
                                <i class="fas fa-graduation-cap me-2 text-brand-primary"></i>Khóa học
                            </th>
                            <th scope="col" class="px-4 py-3">
                                <i class="fas fa-calendar me-2 text-brand-primary"></i>Thanh toán
                            </th>
                            <th scope="col" class="px-4 py-3" style="min-width: 140px;">
                                <i class="fas fa-clock me-2 text-brand-primary"></i>Bắt đầu
                            </th>
                            <th scope="col" class="px-4 py-3">
                                <i class="fas fa-chalkboard-teacher me-2 text-brand-primary"></i>Trạng thái lớp
                            </th>
                            <th scope="col" class="px-4 py-3" style="min-width: 120px;">
                                <i class="fas fa-key me-2 text-brand-primary"></i>Mã khóa học
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${courses.map(course => this.buildCourseRow(course)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    buildCourseRow(course) {
        return `
            <tr>
                <td class="px-4 py-3">
                    <div class="course-info">
                        <h6 class="mb-1 fw-semibold text-brand-primary">${this.escapeHtml(course.product_name)}</h6>
                        <div class="text-muted small mb-1">
                            <i class="fas fa-box me-1"></i>
                            ${this.escapeHtml(course.package_name)}
                        </div>
                        <div class="text-muted small">
                            <i class="fas fa-tag me-1"></i>
                            ${course.category_label}
                            <span class="mx-2">•</span>
                            <i class="fas fa-money-bill-wave me-1"></i>
                            ${course.package_price_formatted}
                        </div>
                    </div>
                </td>
                
                <td class="px-4 py-3">
                    <div class="text-muted small">
                        <i class="fas fa-calendar-check me-1"></i>
                        ${course.payment_completed_formatted}
                    </div>
                </td>
                
                <td class="px-4 py-3">
                    <div class="text-muted small">
                        <i class="fas fa-${course.scheduled_at ? 'calendar-alt' : 'clock'} me-1"></i>
                        ${course.scheduled_at_display}
                    </div>
                </td>
                
                <td class="px-4 py-3">
                    <span class="badge bg-${course.support_status_color} d-inline-flex align-items-center">
                        <i class="${course.support_status_icon} me-1"></i>
                        ${course.support_status_label}
                    </span>
                </td>
                
                <td class="px-4 py-3">
                    <div class="course-code-cell">
                        <code class="bg-light px-2 py-1 rounded small fw-bold text-brand-secondary">
                            ${course.access_code}
                        </code>
                        <button class="btn btn-link btn-sm p-0 ms-2" 
                                onclick="myCoursesManager.copyToClipboard('${course.access_code}')"
                                title="Sao chép mã">
                            <i class="fas fa-copy text-brand-primary"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    renderPagination(pagination) {
        // Add pagination container if not exists
        let paginationContainer = document.querySelector('.pagination-container');
        if (!paginationContainer) {
            const cardBody = document.querySelector('#coursesContent').parentElement;
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container p-3 border-top';
            cardBody.appendChild(paginationContainer);
        }
        
        if (pagination.total_pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<nav aria-label="Courses pagination"><ul class="pagination justify-content-center mb-0">';
        
        // Previous button
        if (pagination.has_prev) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="myCoursesManager.goToPage(${pagination.prev_page})">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </li>
            `;
        }
        
        // Page numbers
        const start = Math.max(1, pagination.current_page - 2);
        const end = Math.min(pagination.total_pages, pagination.current_page + 2);
        
        for (let i = start; i <= end; i++) {
            const isActive = i === pagination.current_page;
            paginationHTML += `
                <li class="page-item ${isActive ? 'active' : ''}">
                    <button class="page-link" onclick="myCoursesManager.goToPage(${i})">${i}</button>
                </li>
            `;
        }
        
        // Next button
        if (pagination.has_next) {
            paginationHTML += `
                <li class="page-item">
                    <button class="page-link" onclick="myCoursesManager.goToPage(${pagination.next_page})">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </li>
            `;
        }
        
        paginationHTML += '</ul></nav>';
        paginationContainer.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.loadCourses();
    }
    
    applyFilters() {
        console.log('[MyCoursesManager] Applying filters...');
        this.currentPage = 1;
        this.loadCourses();
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Đã sao chép mã khóa học: ' + text, 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Đã sao chép mã khóa học: ' + text, 'success');
        });
    }
    
    viewCourseDetails(courseId) {
        console.log('[MyCoursesManager] Viewing course details:', courseId);
        // TODO: Implement course details modal or page
        this.showToast('Tính năng xem chi tiết sẽ được triển khai soon!', 'info');
    }
    
    accessCourse(accessCode) {
        console.log('[MyCoursesManager] Accessing course:', accessCode);
        // TODO: Implement course access logic
        this.showToast('Tính năng truy cập khóa học sẽ được triển khai soon!', 'info');
    }
    
    showLoading() {
        const loadingElement = document.getElementById('loadingCourses');
        const contentElement = document.getElementById('coursesContent');
        
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
    }
    
    hideLoading() {
        const loadingElement = document.getElementById('loadingCourses');
        
        if (loadingElement) loadingElement.style.display = 'none';
    }
    
    showError(message) {
        console.error('[MyCoursesManager] Error:', message);
        this.showToast(message, 'error');
        
        // Show empty state with error message
        const coursesContent = document.getElementById('coursesContent');
        if (coursesContent) {
            coursesContent.innerHTML = `
                <div class="text-center py-5">
                    <div class="text-danger mb-3">
                        <i class="fas fa-exclamation-triangle fa-3x"></i>
                    </div>
                    <h5 class="text-danger">Có lỗi xảy ra</h5>
                    <p class="text-muted">${message}</p>
                    <button class="btn btn-pac-primary" onclick="myCoursesManager.loadCourses()">
                        <i class="fas fa-sync-alt me-2"></i>Thử lại
                    </button>
                </div>
            `;
            coursesContent.style.display = 'block';
        }
    }
    
    showToast(message, type = 'success') {
        // Use existing toast system if available
        if (window.authChecker && window.authChecker.showToast) {
            window.authChecker.showToast(message, type);
        } else {
            // Simple fallback
            console.log(`[Toast ${type}]:`, message);
            alert(message);
        }
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Global functions for template calls
function applyFilters() {
    if (window.myCoursesManager) {
        window.myCoursesManager.applyFilters();
    }
}

function refreshCourses() {
    if (window.myCoursesManager) {
        window.myCoursesManager.loadCourses();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on the my-courses page
    if (document.body.classList.contains('my-courses-page')) {
        console.log('[MyCoursesManager] DOM ready, initializing...');
        
        // Wait for authentication to complete first
        setTimeout(() => {
            window.myCoursesManager = new MyCoursesManager();
        }, 500);
    }
});

// Export for global access
window.MyCoursesManager = MyCoursesManager;