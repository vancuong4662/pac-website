/**
 * Admin Tests Management System
 * Quản lý bài trắc nghiệm Holland Code trong admin dashboard
 */

class AdminTestsManager {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.filters = {
            status: '',
            type: '',
            search: ''
        };
        this.exams = [];
        this.totalCount = 0;
        this.deleteExamId = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadExams();
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-btn')?.addEventListener('click', () => {
            this.currentPage = 1;
            this.loadExams();
        });

        // Apply filters button
        document.getElementById('apply-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        // Search on Enter key
        document.getElementById('search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });

        // Delete confirmation
        document.getElementById('confirm-delete-btn')?.addEventListener('click', () => {
            this.deleteExam();
        });
    }

    applyFilters() {
        this.filters.status = document.getElementById('filter-status').value;
        this.filters.type = document.getElementById('filter-type').value;
        this.filters.search = document.getElementById('search-input').value.trim();
        
        this.currentPage = 1;
        this.loadExams();
    }

    async loadExams() {
        try {
            // Build query string
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit
            });

            if (this.filters.status) params.append('status', this.filters.status);
            if (this.filters.type) params.append('type', this.filters.type);
            if (this.filters.search) params.append('search', this.filters.search);

            const response = await fetch(`api/admin/quiz/get-all-exams.php?${params}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                this.exams = data.data.exams;
                this.totalCount = data.data.pagination.total_count;
                
                this.updateStatistics(data.data.statistics);
                this.renderExamsTable();
                this.renderPagination(data.data.pagination);
            } else {
                console.error('Failed to load exams:', data.message);
                showToast(data.message || 'Không thể tải danh sách bài thi', 'error');
                this.renderEmptyState();
            }
        } catch (error) {
            console.error('Error loading exams:', error);
            showToast('Lỗi kết nối khi tải danh sách bài thi', 'error');
            this.renderEmptyState();
        }
    }

    updateStatistics(stats) {
        if (!stats) return;
        
        document.getElementById('total-exams').textContent = stats.total || 0;
        document.getElementById('completed-exams').textContent = stats.completed || 0;
        document.getElementById('draft-exams').textContent = stats.draft || 0;
        document.getElementById('today-exams').textContent = stats.today || 0;
    }

    renderExamsTable() {
        const tbody = document.getElementById('tests-tbody');
        
        if (this.exams.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Không tìm thấy bài thi nào</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.exams.map(exam => this.renderExamRow(exam)).join('');
    }

    renderExamRow(exam) {
        const statusBadge = this.getStatusBadge(exam.display_status);
        const typeBadge = this.getTypeBadge(exam.exam_type);
        const hollandCode = exam.holland_code || '—';
        const progress = exam.total_questions > 0 
            ? Math.round((exam.answered_questions / exam.total_questions) * 100)
            : 0;

        return `
            <tr>
                <td>
                    <div class="fw-medium">${exam.exam_code}</div>
                    <small class="text-muted">ID: ${exam.id}</small>
                </td>
                <td>
                    <div class="fw-medium">${exam.user_fullname || '—'}</div>
                    <small class="text-muted">${exam.user_email || '—'}</small>
                </td>
                <td>${typeBadge}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar ${progress === 100 ? 'bg-success' : 'bg-primary'}" 
                             role="progressbar" 
                             style="width: ${progress}%"
                             aria-valuenow="${progress}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${progress}%
                        </div>
                    </div>
                    <small class="text-muted">${exam.answered_questions}/${exam.total_questions} câu</small>
                </td>
                <td>
                    ${exam.total_score !== null 
                        ? `<div class="fw-medium text-success">${exam.total_score} điểm</div>
                           <small class="text-muted">${hollandCode}</small>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    <div class="small">${exam.created_at_formatted}</div>
                    ${exam.duration_minutes 
                        ? `<small class="text-muted"><i class="fas fa-clock me-1"></i>${exam.duration_minutes}p</small>`
                        : ''}
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="adminTests.viewExamDetail(${exam.id})"
                                title="Xem chi tiết">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${exam.result_id 
                            ? `<button type="button" class="btn btn-outline-success" 
                                      onclick="window.open('read-test-result?exam_code=${exam.exam_code}', '_blank')"
                                      title="Xem kết quả">
                                <i class="fas fa-chart-bar"></i>
                              </button>`
                            : ''}
                        <button type="button" class="btn btn-outline-danger" 
                                onclick="adminTests.confirmDelete(${exam.id})"
                                title="Xóa bài thi">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    getStatusBadge(status) {
        const badges = {
            'completed': '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Hoàn thành</span>',
            'processing': '<span class="badge bg-info"><i class="fas fa-clock me-1"></i>Đang xử lý</span>',
            'draft': '<span class="badge bg-warning"><i class="fas fa-edit me-1"></i>Chưa xong</span>',
            'timeout': '<span class="badge bg-danger"><i class="fas fa-exclamation-circle me-1"></i>Hết giờ</span>'
        };
        return badges[status] || '<span class="badge bg-secondary">Không xác định</span>';
    }

    getTypeBadge(type) {
        if (type === 0 || type === '0') {
            return '<span class="badge bg-info">Miễn phí</span>';
        } else if (type === 1 || type === '1') {
            return '<span class="badge bg-primary">Trả phí</span>';
        }
        return '<span class="badge bg-secondary">Khác</span>';
    }

    renderPagination(pagination) {
        const paginationEl = document.getElementById('pagination');
        
        if (!pagination || pagination.total_pages <= 1) {
            paginationEl.innerHTML = '';
            this.updateShowingInfo(pagination);
            return;
        }

        let html = '';

        // Previous button
        html += `
            <li class="page-item ${!pagination.has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminTests.goToPage(${this.currentPage - 1}); return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(pagination.total_pages, this.currentPage + 2);

        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="adminTests.goToPage(1); return false;">1</a>
                </li>
            `;
            if (startPage > 2) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="adminTests.goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        }

        if (endPage < pagination.total_pages) {
            if (endPage < pagination.total_pages - 1) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="adminTests.goToPage(${pagination.total_pages}); return false;">
                        ${pagination.total_pages}
                    </a>
                </li>
            `;
        }

        // Next button
        html += `
            <li class="page-item ${!pagination.has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminTests.goToPage(${this.currentPage + 1}); return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        paginationEl.innerHTML = html;
        this.updateShowingInfo(pagination);
    }

    updateShowingInfo(pagination) {
        if (!pagination) return;
        
        const from = pagination.total_count === 0 ? 0 : ((this.currentPage - 1) * this.limit + 1);
        const to = Math.min(this.currentPage * this.limit, pagination.total_count);
        
        document.getElementById('showing-from').textContent = from;
        document.getElementById('showing-to').textContent = to;
        document.getElementById('total-count').textContent = pagination.total_count;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadExams();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderEmptyState() {
        const tbody = document.getElementById('tests-tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="fas fa-exclamation-circle fa-3x text-warning mb-3"></i>
                    <p class="text-muted">Không thể tải dữ liệu</p>
                </td>
            </tr>
        `;
    }

    async viewExamDetail(examId) {
        const modal = new bootstrap.Modal(document.getElementById('examDetailModal'));
        const contentEl = document.getElementById('exam-detail-content');
        
        // Show loading
        contentEl.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Đang tải thông tin...</p>
            </div>
        `;
        
        modal.show();

        try {
            const response = await fetch(`api/admin/quiz/get-exam-detail.php?id=${examId}`, {
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                this.renderExamDetail(data.data);
            } else {
                contentEl.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        ${data.message || 'Không thể tải thông tin bài thi'}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading exam detail:', error);
            contentEl.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Lỗi kết nối khi tải thông tin bài thi
                </div>
            `;
        }
    }

    renderExamDetail(exam) {
        const contentEl = document.getElementById('exam-detail-content');
        
        const hollandScores = exam.result_id ? `
            <div class="row mt-3">
                <div class="col-md-12">
                    <h6 class="mb-3"><i class="fas fa-chart-bar me-2"></i>Điểm số Holland Code</h6>
                    <div class="row g-2">
                        <div class="col-md-2">
                            <div class="text-center p-2 border rounded">
                                <div class="fw-bold text-primary">${exam.score_r || 0}</div>
                                <small class="text-muted">R</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center p-2 border rounded">
                                <div class="fw-bold text-primary">${exam.score_i || 0}</div>
                                <small class="text-muted">I</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center p-2 border rounded">
                                <div class="fw-bold text-primary">${exam.score_a || 0}</div>
                                <small class="text-muted">A</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center p-2 border rounded">
                                <div class="fw-bold text-primary">${exam.score_s || 0}</div>
                                <small class="text-muted">S</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center p-2 border rounded">
                                <div class="fw-bold text-primary">${exam.score_e || 0}</div>
                                <small class="text-muted">E</small>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <div class="text-center p-2 border rounded">
                                <div class="fw-bold text-primary">${exam.score_c || 0}</div>
                                <small class="text-muted">C</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        contentEl.innerHTML = `
            <div class="exam-detail">
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-info-circle me-2"></i>Thông tin bài thi</h6>
                        <table class="table table-sm">
                            <tr>
                                <td class="text-muted">Mã bài thi:</td>
                                <td class="fw-medium">${exam.exam_code}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Loại:</td>
                                <td>${this.getTypeBadge(exam.exam_type)}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Trạng thái:</td>
                                <td>${this.getStatusBadge(exam.display_status)}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Tiến độ:</td>
                                <td>${exam.answered_questions}/${exam.total_questions} câu (${Math.round((exam.answered_questions/exam.total_questions)*100)}%)</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Thời gian tạo:</td>
                                <td>${exam.created_at_formatted}</td>
                            </tr>
                            ${exam.end_time_formatted ? `
                            <tr>
                                <td class="text-muted">Hoàn thành:</td>
                                <td>${exam.end_time_formatted}</td>
                            </tr>
                            ` : ''}
                            ${exam.ip_address ? `
                            <tr>
                                <td class="text-muted">IP Address:</td>
                                <td>${exam.ip_address}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="fas fa-user me-2"></i>Thông tin người dùng</h6>
                        <table class="table table-sm">
                            <tr>
                                <td class="text-muted">ID:</td>
                                <td>${exam.user_id}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Họ tên:</td>
                                <td class="fw-medium">${exam.user_fullname || '—'}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Email:</td>
                                <td>${exam.user_email || '—'}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Username:</td>
                                <td>${exam.user_username || '—'}</td>
                            </tr>
                        </table>
                        
                        ${exam.result_id ? `
                        <h6 class="mt-3"><i class="fas fa-trophy me-2"></i>Kết quả</h6>
                        <table class="table table-sm">
                            <tr>
                                <td class="text-muted">Tổng điểm:</td>
                                <td class="fw-bold text-success">${exam.total_score}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Holland Code:</td>
                                <td class="fw-bold text-primary">${exam.holland_code}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Nhóm chính:</td>
                                <td>${exam.primary_group}</td>
                            </tr>
                        </table>
                        ` : ''}
                    </div>
                </div>
                
                ${hollandScores}
            </div>
        `;
    }

    confirmDelete(examId) {
        this.deleteExamId = examId;
        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    }

    async deleteExam() {
        if (!this.deleteExamId) return;

        try {
            const response = await fetch('api/admin/quiz/delete-exam.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    exam_id: this.deleteExamId
                })
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showToast('Xóa bài thi thành công', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
                modal.hide();
                
                // Reload exams
                this.loadExams();
            } else {
                showToast(data.message || 'Không thể xóa bài thi', 'error');
            }
        } catch (error) {
            console.error('Error deleting exam:', error);
            showToast('Lỗi khi xóa bài thi', 'error');
        }

        this.deleteExamId = null;
    }
}

// Initialize when DOM is loaded
let adminTests;
document.addEventListener('DOMContentLoaded', function() {
    adminTests = new AdminTestsManager();
});
