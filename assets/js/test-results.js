/**
 * Test Results Management System
 * Quản lý hiển thị kết quả trắc nghiệm tính cách nghề nghiệp
 */

class TestResultsManager {
    constructor() {
        this.testResults = [];
        this.init();
    }

    async init() {
        await this.loadTestResults();
        this.renderTestResults();
    }

    // Load dữ liệu kết quả test từ API
    async loadTestResults() {
        try {
            // Load tất cả bài thi (cả Free và Paid)
            const response = await fetch('api/quiz/get-user-exams.php?page=1&limit=50', {
                method: 'GET',
                credentials: 'include'
            });

            console.log('API Response status:', response.status);

            const data = await response.json();
            console.log('API Response data:', data);

            if (response.ok && data.status === 'success') {
                console.log("Loaded test results:", data);
                this.testResults = data.data.exams;
                
                // Update total count
                const totalElement = document.getElementById('total-tests');
                if (totalElement) {
                    totalElement.textContent = data.data.pagination.total_count || this.testResults.length;
                }
            } else {
                console.error('Failed to load test results:', data.message || data.error);
                console.error('Full API response:', data);
                this.testResults = [];
                
                // Show error toast if available
                if (window.showToast) {
                    showToast(data.message || 'Không thể tải danh sách bài kiểm tra', 'error');
                }
            }
        } catch (error) {
            console.error('Error loading test results:', error);
            this.testResults = [];
            
            // Show error toast if available
            if (window.showToast) {
                showToast('Lỗi kết nối khi tải danh sách bài kiểm tra', 'error');
            }
        }
    }

    // Render test results table
    renderTestResults() {
        const tbody = document.getElementById('test-results-tbody');
        const emptyState = document.getElementById('empty-state');
        const table = document.getElementById('test-results-table').closest('.card');

        if (this.testResults.length === 0) {
            table.classList.add('d-none');
            emptyState.classList.remove('d-none');
            return;
        }

        table.classList.remove('d-none');
        emptyState.classList.add('d-none');

        tbody.innerHTML = this.testResults.map(exam => {
            // Determine question count based on exam data
            let questionCount = '30'; // Default
            if (exam.total_questions) {
                questionCount = exam.total_questions;
            } else if (exam.exam_type === 'PREMIUM' || exam.exam_type === 'PAID') {
                questionCount = '120';
            }
            
            return `
                <tr class="test-row" data-id="${exam.exam_code}">
                    <td class="px-4 py-3">
                        <div class="d-flex flex-column">
                            <span class="fw-medium">Bộ ${questionCount} câu hỏi</span>
                            ${exam.progress_percent !== undefined ? `
                                <div class="progress mt-1" style="height: 4px;">
                                    <div class="progress-bar bg-primary" role="progressbar" 
                                         style="width: ${exam.progress_percent}%"></div>
                                </div>
                                <small class="text-muted">${exam.progress_percent}% hoàn thành</small>
                            ` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${exam.created_at_formatted}</span>
                            ${exam.duration_minutes ? `<small class="text-muted">
                                <i class="fas fa-clock me-1"></i>${exam.duration_minutes} phút
                            </small>` : ''}
                            ${exam.status_info ? `
                                <span class="badge badge-${exam.status_info.class} mt-1">
                                    <i class="fas fa-${exam.status_info.icon} me-1"></i>
                                    ${exam.status_info.text}
                                </span>
                            ` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        ${this.renderActionButton(exam)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Render action button for each exam
    renderActionButton(exam) {
        switch (exam.display_status) {
            case 'completed':
                // Exam completed and result is processed
                return `
                    <button class="btn btn-outline-primary btn-sm" 
                            onclick="window.open('read-test-result?exam_code=${exam.exam_code}', '_blank')"
                            title="Xem kết quả chi tiết">
                        <i class="fas fa-eye me-1"></i>Xem kết quả
                    </button>
                `;
                
            case 'processing':
                // Exam completed but result is still processing
                return `
                    <button class="btn btn-outline-info btn-sm" disabled title="Đang xử lý kết quả">
                        <i class="fas fa-spinner fa-spin me-1"></i>Đang xử lý
                    </button>
                `;
                
            case 'draft':
                // Exam is draft, can start/continue taking quiz
                return `
                    <button class="btn btn-outline-success btn-sm" 
                            onclick="window.open('quiz?exam_code=${exam.exam_code}', '_blank')"
                            title="Làm bài trắc nghiệm">
                        <i class="fas fa-edit me-1"></i>Làm bài
                    </button>
                `;
                
            default:
                return `<span class="text-muted small">Không xác định</span>`;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.testResults = new TestResultsManager();
});

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestResultsManager;
}
