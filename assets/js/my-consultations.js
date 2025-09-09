/**
 * My Consultations JavaScript Module
 * Handles consultation management and scheduling
 */

// Global variables
let currentPage = 1;
let currentFilters = {};
let consultationsData = {};
let stats = { total: 0, scheduled: 0, completed: 0, cancelled: 0 };
let countdownTimers = {};

// Initialize my consultations page
function initializeMyConsultations() {
    setupFilterHandlers();
    loadConsultations();
    loadStatistics();
    loadConsultants();
    
    // Start countdown timers
    setInterval(updateCountdownTimers, 1000);
}

// Setup filter handlers
function setupFilterHandlers() {
    // Auto-apply filters on change
    const filterControls = document.querySelectorAll('.filter-control');
    filterControls.forEach(control => {
        control.addEventListener('change', () => {
            applyFilters();
        });
    });
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const consultantFilter = document.getElementById('consultantFilter')?.value || '';
    
    currentFilters = {
        status: statusFilter,
        type: typeFilter,
        consultant_id: consultantFilter
    };
    
    currentPage = 1;
    loadConsultations(currentFilters);
}

// Load consultations data
async function loadConsultations(filters = {}, page = 1) {
    try {
        showLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams({
            page: page,
            limit: 12,
            ...filters
        });
        
        const response = await fetch(`api/consultations/my-consultations.php?${params}`);
        const data = await response.json();
        
        if (data.success) {
            consultationsData = data.data;
            displayConsultations(data.data);
            updatePagination(data.pagination);
        } else {
            showError(data.message || 'Không thể tải danh sách lịch tư vấn');
        }
    } catch (error) {
        console.error('Error loading consultations:', error);
        showError('Có lỗi xảy ra khi tải danh sách lịch tư vấn');
    } finally {
        showLoading(false);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('api/consultations/my-consultations-stats.php');
        const data = await response.json();
        
        if (data.success) {
            stats = data.data;
            updateStatistics(stats);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load consultants for filter
async function loadConsultants() {
    try {
        const response = await fetch('api/consultations/consultants.php');
        const data = await response.json();
        
        if (data.success) {
            updateConsultantFilter(data.data);
        }
    } catch (error) {
        console.error('Error loading consultants:', error);
    }
}

// Update statistics display
function updateStatistics(stats) {
    document.getElementById('totalConsultations').textContent = stats.total || 0;
    document.getElementById('scheduledConsultations').textContent = stats.scheduled || 0;
    document.getElementById('completedConsultations').textContent = stats.completed || 0;
    document.getElementById('cancelledConsultations').textContent = stats.cancelled || 0;
}

// Update consultant filter
function updateConsultantFilter(consultants) {
    const select = document.getElementById('consultantFilter');
    if (!select || !consultants) return;
    
    // Keep existing "all" option and add consultants
    let options = '<option value="">Tất cả chuyên gia</option>';
    consultants.forEach(consultant => {
        options += `<option value="${consultant.id}">${consultant.name}</option>`;
    });
    
    select.innerHTML = options;
}

// Display consultations
function displayConsultations(data) {
    const container = document.getElementById('consultationsList');
    if (!container) return;
    
    container.style.display = 'block';
    
    if (!data.items || data.items.length === 0) {
        container.innerHTML = generateEmptyState();
        return;
    }
    
    let consultationsHTML = '';
    data.items.forEach(consultation => {
        consultationsHTML += generateConsultationHTML(consultation);
    });
    
    container.innerHTML = consultationsHTML;
    
    // Trigger AOS refresh for new elements
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Generate consultation HTML
function generateConsultationHTML(consultation) {
    const status = consultation.status || 'pending';
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    
    return `
        <div class="consultation-card" data-aos="fade-up" data-consultation-id="${consultation.id}">
            <div class="consultation-header">
                <div class="status-badge ${statusClass}">
                    ${statusText}
                </div>
                
                <div class="consultation-datetime">
                    <div class="datetime-main">${formatDateTime(consultation.scheduled_at).date}</div>
                    <div class="datetime-sub">${formatDateTime(consultation.scheduled_at).time}</div>
                    ${status === 'scheduled' && isUpcoming(consultation.scheduled_at) ? generateCountdown(consultation.id, consultation.scheduled_at) : ''}
                </div>
                
                <div class="consultation-icon">
                    <i class="fas fa-user-md"></i>
                </div>
                
                <div class="consultation-title">${consultation.title || 'Buổi tư vấn'}</div>
                <div class="consultation-type">${getTypeText(consultation.type)}</div>
            </div>
            
            <div class="consultation-body">
                <div class="consultation-meta">
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${consultation.duration || 60} phút</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-video"></i>
                        <span>${consultation.method === 'online' ? 'Trực tuyến' : 'Trực tiếp'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>${formatPrice(consultation.price)} VNĐ</span>
                    </div>
                </div>
                
                <div class="consultant-info">
                    <div class="consultant-avatar">
                        ${getConsultantInitials(consultation.consultant_name)}
                    </div>
                    <div class="consultant-details">
                        <h5>${consultation.consultant_name}</h5>
                        <p>${consultation.consultant_title || 'Chuyên gia tư vấn'}</p>
                    </div>
                </div>
                
                ${consultation.notes ? `
                <div class="consultation-notes">
                    <h6><i class="fas fa-sticky-note me-2"></i>Ghi chú:</h6>
                    <p>${consultation.notes}</p>
                </div>
                ` : ''}
                
                <div class="consultation-actions">
                    ${generateConsultationActionButtons(consultation, status)}
                </div>
            </div>
        </div>
    `;
}

// Generate consultation action buttons
function generateConsultationActionButtons(consultation, status) {
    let buttons = '';
    
    if (status === 'scheduled') {
        const now = new Date();
        const scheduledTime = new Date(consultation.scheduled_at);
        const timeDiff = scheduledTime - now;
        
        // Can join 15 minutes before scheduled time
        if (timeDiff <= 15 * 60 * 1000 && timeDiff > -30 * 60 * 1000) {
            buttons += `
                <button class="btn btn-join" onclick="joinConsultation('${consultation.id}')">
                    <i class="fas fa-video me-2"></i>Tham gia ngay
                </button>
            `;
        }
        
        // Can reschedule if more than 24 hours away
        if (timeDiff > 24 * 60 * 60 * 1000) {
            buttons += `
                <button class="btn btn-reschedule" onclick="rescheduleConsultation('${consultation.id}')">
                    <i class="fas fa-calendar-alt me-2"></i>Đổi lịch
                </button>
            `;
        }
        
        // Can cancel if more than 2 hours away
        if (timeDiff > 2 * 60 * 60 * 1000) {
            buttons += `
                <button class="btn btn-outline-danger" onclick="cancelConsultation('${consultation.id}')">
                    <i class="fas fa-times me-2"></i>Hủy lịch
                </button>
            `;
        }
    } else if (status === 'pending') {
        buttons += `
            <button class="btn btn-reschedule" onclick="rescheduleConsultation('${consultation.id}')">
                <i class="fas fa-calendar-alt me-2"></i>Đặt lịch
            </button>
            <button class="btn btn-outline-danger" onclick="cancelConsultation('${consultation.id}')">
                <i class="fas fa-times me-2"></i>Hủy
            </button>
        `;
    } else if (status === 'completed') {
        if (consultation.can_review) {
            buttons += `
                <button class="btn btn-outline-secondary" onclick="reviewConsultation('${consultation.id}')">
                    <i class="fas fa-star me-2"></i>Đánh giá
                </button>
            `;
        }
        
        if (consultation.has_recording) {
            buttons += `
                <a href="${consultation.recording_url}" class="btn btn-outline-secondary" target="_blank">
                    <i class="fas fa-play me-2"></i>Xem lại
                </a>
            `;
        }
    }
    
    // Always show details button
    buttons += `
        <button class="btn btn-outline-secondary" onclick="viewConsultationDetails('${consultation.id}')">
            <i class="fas fa-info-circle me-2"></i>Chi tiết
        </button>
    `;
    
    return buttons;
}

// Generate countdown timer
function generateCountdown(consultationId, scheduledAt) {
    return `
        <div class="countdown-timer" id="countdown-${consultationId}">
            <i class="fas fa-hourglass-half me-2"></i>
            <span class="countdown-text">Đang tính...</span>
        </div>
    `;
}

// Update countdown timers
function updateCountdownTimers() {
    const consultationCards = document.querySelectorAll('[data-consultation-id]');
    
    consultationCards.forEach(card => {
        const consultationId = card.getAttribute('data-consultation-id');
        const countdownElement = document.getElementById(`countdown-${consultationId}`);
        
        if (countdownElement) {
            const consultation = findConsultationById(consultationId);
            if (consultation && consultation.scheduled_at) {
                const timeLeft = calculateTimeLeft(consultation.scheduled_at);
                const countdownText = countdownElement.querySelector('.countdown-text');
                
                if (countdownText) {
                    countdownText.textContent = timeLeft;
                }
            }
        }
    });
}

// Find consultation by ID
function findConsultationById(id) {
    if (!consultationsData.items) return null;
    return consultationsData.items.find(c => c.id == id);
}

// Calculate time left
function calculateTimeLeft(scheduledAt) {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diff = scheduled - now;
    
    if (diff <= 0) {
        return 'Đã bắt đầu';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days} ngày ${hours} giờ`;
    } else if (hours > 0) {
        return `${hours} giờ ${minutes} phút`;
    } else {
        return `${minutes} phút`;
    }
}

// Check if consultation is upcoming (within next hour)
function isUpcoming(scheduledAt) {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diff = scheduled - now;
    
    return diff > 0 && diff <= 60 * 60 * 1000; // Within 1 hour
}

// Get status class
function getStatusClass(status) {
    const classes = {
        'pending': 'status-pending',
        'scheduled': 'status-scheduled',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    
    return classes[status] || 'status-pending';
}

// Get status text
function getStatusText(status) {
    const texts = {
        'pending': 'Chờ xác nhận',
        'scheduled': 'Đã đặt lịch',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    
    return texts[status] || status;
}

// Get type text
function getTypeText(type) {
    const types = {
        'career': 'Tư vấn nghề nghiệp',
        'academic': 'Tư vấn học tập',
        'personal': 'Tư vấn cá nhân',
        'business': 'Tư vấn kinh doanh'
    };
    
    return types[type] || type;
}

// Get consultant initials
function getConsultantInitials(name) {
    if (!name) return '?';
    
    const words = name.split(' ');
    if (words.length >= 2) {
        return words[0].charAt(0) + words[words.length - 1].charAt(0);
    }
    
    return name.charAt(0);
}

// Format date and time
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return { date: '', time: '' };
    
    try {
        const date = new Date(dateTimeString);
        
        return {
            date: date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    } catch (error) {
        return { date: dateTimeString, time: '' };
    }
}

// Format price
function formatPrice(price) {
    if (isNaN(price)) return '0';
    return new Intl.NumberFormat('vi-VN').format(price);
}

// Join consultation
async function joinConsultation(consultationId) {
    try {
        showToast('Đang tham gia buổi tư vấn...', 'info');
        
        const response = await fetch(`api/consultations/join.php?id=${consultationId}`);
        const data = await response.json();
        
        if (data.success) {
            // Open consultation room in new window
            window.open(data.data.room_url, '_blank', 'width=1200,height=800');
            showToast('Đã mở phòng tư vấn!', 'success');
        } else {
            showToast(data.message || 'Không thể tham gia buổi tư vấn', 'error');
        }
    } catch (error) {
        console.error('Error joining consultation:', error);
        showToast('Có lỗi xảy ra khi tham gia buổi tư vấn', 'error');
    }
}

// Reschedule consultation
async function rescheduleConsultation(consultationId) {
    try {
        // TODO: Implement reschedule modal
        showToast('Tính năng đổi lịch sẽ được cập nhật sớm', 'info');
    } catch (error) {
        console.error('Error rescheduling consultation:', error);
        showToast('Có lỗi xảy ra khi đổi lịch', 'error');
    }
}

// Cancel consultation
async function cancelConsultation(consultationId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn hủy lịch tư vấn này không?')) {
            return;
        }
        
        showToast('Đang hủy lịch tư vấn...', 'info');
        
        const response = await fetch('api/consultations/cancel.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ consultation_id: consultationId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Hủy lịch tư vấn thành công!', 'success');
            loadConsultations(currentFilters, currentPage);
            loadStatistics();
        } else {
            showToast(data.message || 'Không thể hủy lịch tư vấn', 'error');
        }
    } catch (error) {
        console.error('Error cancelling consultation:', error);
        showToast('Có lỗi xảy ra khi hủy lịch tư vấn', 'error');
    }
}

// Review consultation
async function reviewConsultation(consultationId) {
    try {
        // TODO: Implement review modal
        showToast('Tính năng đánh giá sẽ được cập nhật sớm', 'info');
    } catch (error) {
        console.error('Error reviewing consultation:', error);
        showToast('Có lỗi xảy ra khi đánh giá', 'error');
    }
}

// View consultation details
async function viewConsultationDetails(consultationId) {
    try {
        // TODO: Implement details modal or redirect to details page
        window.location.href = `consultation-details?id=${consultationId}`;
    } catch (error) {
        console.error('Error viewing consultation details:', error);
        showToast('Có lỗi xảy ra khi xem chi tiết', 'error');
    }
}

// Generate empty state
function generateEmptyState() {
    return `
        <div class="empty-state">
            <i class="fas fa-calendar-check"></i>
            <h3>Chưa có lịch tư vấn nào</h3>
            <p>Bạn chưa đặt lịch tư vấn nào. Đặt lịch với chuyên gia để được hỗ trợ tốt nhất!</p>
            <a href="products?type=consultation" class="btn btn-primary">
                <i class="fas fa-calendar-plus me-2"></i>
                Đặt lịch tư vấn
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
    loadConsultations(currentFilters, page);
}

// Show loading state
function showLoading(show) {
    const loadingState = document.getElementById('loadingConsultations');
    const consultationsList = document.getElementById('consultationsList');
    const paginationWrapper = document.getElementById('paginationWrapper');
    
    if (loadingState) {
        loadingState.style.display = show ? 'block' : 'none';
    }
    
    if (consultationsList) {
        consultationsList.style.display = show ? 'none' : 'block';
    }
    
    if (paginationWrapper) {
        paginationWrapper.style.display = show ? 'none' : 'flex';
    }
}

// Show error
function showError(message) {
    const container = document.getElementById('consultationsList');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <h3>Có lỗi xảy ra</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadConsultations(currentFilters, currentPage)">
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

// Export functions for global use
window.initializeMyConsultations = initializeMyConsultations;
window.applyFilters = applyFilters;
window.loadPage = loadPage;
window.joinConsultation = joinConsultation;
window.rescheduleConsultation = rescheduleConsultation;
window.cancelConsultation = cancelConsultation;
window.reviewConsultation = reviewConsultation;
window.viewConsultationDetails = viewConsultationDetails;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeMyConsultations();
});
