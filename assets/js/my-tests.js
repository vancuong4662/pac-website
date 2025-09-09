/**
 * My Tests JavaScript Module
 * Handles test results management and interactions
 */

// Global variables
let currentPage = 1;
let currentFilters = {};
let testsData = {};
let stats = { total: 0, passed: 0, failed: 0, average_score: 0 };

// Initialize my tests page
function initializeMyTests() {
    setupFilterHandlers();
    loadTests();
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
    loadTests(currentFilters);
}

// Load tests data
async function loadTests(filters = {}, page = 1) {
    try {
        showLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams({
            page: page,
            limit: 12,
            ...filters
        });
        
        const response = await fetch(`api/tests/my-tests.php?${params}`);
        const data = await response.json();
        
        if (data.success) {
            testsData = data.data;
            displayTests(data.data);
            updatePagination(data.pagination);
        } else {
            showError(data.message || 'Không thể tải danh sách kết quả trắc nghiệm');
        }
    } catch (error) {
        console.error('Error loading tests:', error);
        showError('Có lỗi xảy ra khi tải danh sách kết quả trắc nghiệm');
    } finally {
        showLoading(false);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('api/tests/my-tests-stats.php');
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
    document.getElementById('totalTests').textContent = stats.total || 0;
    document.getElementById('passedTests').textContent = stats.passed || 0;
    document.getElementById('failedTests').textContent = stats.failed || 0;
    document.getElementById('averageScore').textContent = `${Math.round(stats.average_score || 0)}%`;
}

// Display tests
function displayTests(data) {
    const container = document.getElementById('testsList');
    if (!container) return;
    
    container.style.display = 'block';
    
    if (!data.items || data.items.length === 0) {
        container.innerHTML = generateEmptyState();
        return;
    }
    
    let testsHTML = '';
    data.items.forEach(test => {
        testsHTML += generateTestHTML(test);
    });
    
    container.innerHTML = testsHTML;
    
    // Trigger AOS refresh for new elements
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Generate test HTML
function generateTestHTML(test) {
    const status = determineTestStatus(test);
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    const scorePercentage = Math.round(test.score_percentage || 0);
    
    return `
        <div class="test-card" data-aos="fade-up">
            <div class="test-header">
                <div class="status-badge ${statusClass}">
                    ${statusText}
                </div>
                
                <div class="test-score">
                    <div class="score-circle">
                        ${scorePercentage}%
                    </div>
                    <div class="score-text">Điểm số</div>
                </div>
                
                <div class="test-icon">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                
                <div class="test-title">${test.test_name || test.name}</div>
                <div class="test-category">${getCategoryText(test.category)}</div>
            </div>
            
            <div class="test-body">
                <div class="test-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>Thi: ${formatDate(test.taken_at || test.completed_at)}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${formatDuration(test.duration_minutes)} phút</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-question-circle"></i>
                        <span>${test.total_questions || 0} câu hỏi</span>
                    </div>
                    ${test.attempts_left ? `
                    <div class="meta-item">
                        <i class="fas fa-redo"></i>
                        <span>Còn ${test.attempts_left} lần</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="test-results">
                    <div class="result-item correct">
                        <div class="result-number correct">${test.correct_answers || 0}</div>
                        <div class="result-label">Đúng</div>
                    </div>
                    <div class="result-item incorrect">
                        <div class="result-number incorrect">${test.incorrect_answers || 0}</div>
                        <div class="result-label">Sai</div>
                    </div>
                    <div class="result-item">
                        <div class="result-number total">${test.total_questions || 0}</div>
                        <div class="result-label">Tổng câu</div>
                    </div>
                    <div class="result-item">
                        <div class="result-number time">${formatTime(test.time_taken_seconds)}</div>
                        <div class="result-label">Thời gian</div>
                    </div>
                </div>
                
                <div class="test-actions">
                    ${generateTestActionButtons(test, status)}
                </div>
            </div>
        </div>
    `;
}

// Generate test action buttons
function generateTestActionButtons(test, status) {
    let buttons = '';
    
    // View details button (always available)
    buttons += `
        <a href="test-details?id=${test.id || test.test_id}" class="btn btn-view-details">
            <i class="fas fa-eye me-2"></i>Xem chi tiết
        </a>
    `;
    
    // Download certificate (if passed and certificate available)
    if (status === 'passed' && test.has_certificate) {
        buttons += `
            <button class="btn btn-outline-secondary" onclick="downloadCertificate('${test.id}')">
                <i class="fas fa-certificate me-2"></i>Tải chứng chỉ
            </button>
        `;
    }
    
    // Retake test (if attempts left)
    if (test.attempts_left && test.attempts_left > 0) {
        buttons += `
            <a href="test?id=${test.test_id || test.id}" class="btn btn-retake">
                <i class="fas fa-redo me-2"></i>Thi lại
            </a>
        `;
    }
    
    // Share result (for passed tests)
    if (status === 'passed') {
        buttons += `
            <button class="btn btn-outline-secondary" onclick="shareResult('${test.id}')">
                <i class="fas fa-share me-2"></i>Chia sẻ
            </button>
        `;
    }
    
    return buttons;
}

// Determine test status
function determineTestStatus(test) {
    if (test.status === 'pending' || !test.score_percentage) {
        return 'pending';
    }
    
    const passThreshold = test.pass_threshold || 70;
    const scorePercentage = test.score_percentage || 0;
    
    return scorePercentage >= passThreshold ? 'passed' : 'failed';
}

// Get status class
function getStatusClass(status) {
    const classes = {
        'passed': 'status-passed',
        'failed': 'status-failed',
        'pending': 'status-pending'
    };
    
    return classes[status] || 'status-pending';
}

// Get status text
function getStatusText(status) {
    const texts = {
        'passed': 'Đạt yêu cầu',
        'failed': 'Chưa đạt',
        'pending': 'Chờ kết quả'
    };
    
    return texts[status] || status;
}

// Get category text
function getCategoryText(category) {
    const categories = {
        'skill_assessment': 'Đánh giá kỹ năng',
        'knowledge_test': 'Kiểm tra kiến thức',
        'certification': 'Chứng chỉ',
        'practice': 'Luyện tập'
    };
    
    return categories[category] || category;
}

// Format duration
function formatDuration(minutes) {
    if (!minutes) return '0';
    
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    
    return `${minutes}`;
}

// Format time taken
function formatTime(seconds) {
    if (!seconds) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Generate empty state
function generateEmptyState() {
    return `
        <div class="empty-state">
            <i class="fas fa-clipboard-check"></i>
            <h3>Chưa có kết quả trắc nghiệm nào</h3>
            <p>Bạn chưa thực hiện bài trắc nghiệm nào. Hãy thử sức với các bài đánh giá để kiểm tra năng lực!</p>
            <a href="products?type=test" class="btn btn-primary">
                <i class="fas fa-clipboard-list me-2"></i>
                Xem trắc nghiệm
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
    loadTests(currentFilters, page);
}

// Download certificate
async function downloadCertificate(testId) {
    try {
        showToast('Đang tạo chứng chỉ...', 'info');
        
        const response = await fetch(`api/tests/certificate.php?test_id=${testId}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-test-${testId}.pdf`;
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

// Share result
async function shareResult(testId) {
    try {
        const shareData = {
            title: 'Kết quả trắc nghiệm - PAC Education',
            text: 'Tôi vừa hoàn thành bài trắc nghiệm và đạt kết quả tốt!',
            url: `${window.location.origin}/pac-new/test-details?id=${testId}`
        };
        
        if (navigator.share) {
            await navigator.share(shareData);
            showToast('Chia sẻ thành công!', 'success');
        } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(shareData.url);
            showToast('Đã sao chép liên kết vào clipboard!', 'success');
        }
    } catch (error) {
        console.error('Error sharing result:', error);
        showToast('Có lỗi xảy ra khi chia sẻ', 'error');
    }
}

// Show loading state
function showLoading(show) {
    const loadingState = document.getElementById('loadingTests');
    const testsList = document.getElementById('testsList');
    const paginationWrapper = document.getElementById('paginationWrapper');
    
    if (loadingState) {
        loadingState.style.display = show ? 'block' : 'none';
    }
    
    if (testsList) {
        testsList.style.display = show ? 'none' : 'block';
    }
    
    if (paginationWrapper) {
        paginationWrapper.style.display = show ? 'none' : 'flex';
    }
}

// Show error
function showError(message) {
    const container = document.getElementById('testsList');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <h3>Có lỗi xảy ra</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadTests(currentFilters, currentPage)">
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
window.initializeMyTests = initializeMyTests;
window.applyFilters = applyFilters;
window.loadPage = loadPage;
window.downloadCertificate = downloadCertificate;
window.shareResult = shareResult;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeMyTests();
});
