/**
 * Test Results Management System
 * Quản lý hiển thị kết quả trắc nghiệm
 */

class TestResultsManager {
    constructor() {
        this.testResults = [];
        this.init();
    }

    init() {
        this.loadTestResults();
        this.renderTestResults();
    }

    // Load dữ liệu kết quả test (demo data)
    loadTestResults() {
        // Dữ liệu demo - trong thực tế sẽ load từ API
        this.testResults = [
            {
                id: 'TEST001',
                date: '2024-12-10',
                testName: 'Bài trắc nghiệm hướng nghiệp cơ bản',
                score: 85,
                maxScore: 100,
                duration: '25 phút',
                status: 'completed',
                category: 'career-orientation',
                questions: 20,
                correctAnswers: 17
            },
            {
                id: 'TEST002', 
                date: '2024-12-05',
                testName: 'Bài trắc nghiệm hướng nghiệp chuyên sâu',
                score: 78,
                maxScore: 100,
                duration: '45 phút',
                status: 'completed',
                category: 'career-advanced',
                questions: 35,
                correctAnswers: 27
            }
        ];
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

        tbody.innerHTML = this.testResults.map(test => {
            const formattedDate = this.formatDateOnly(test.date);
            const scorePercentage = Math.round((test.score / test.maxScore) * 100);

            return `
                <tr class="test-row" data-id="${test.id}">
                    <td class="px-4 py-3">
                        <span class="fw-medium">${formattedDate}</span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="d-flex flex-column">
                            <span class="fw-medium">${test.testName}</span>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>${test.duration}
                                <span class="mx-2">•</span>
                                <i class="fas fa-question me-1"></i>${test.questions} câu hỏi
                            </small>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <button type="button" 
                                class="btn btn-outline-primary btn-sm" 
                                onclick="testResults.viewTestDetails('${test.id}')"
                                title="Xem kết quả chi tiết">
                            <i class="fas fa-eye me-1"></i>
                            Xem kết quả
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update total tests count
        document.getElementById('total-tests').textContent = this.testResults.length;
    }

    // Format date only (without time)
    formatDateOnly(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }

    // Get score information
    getScoreInfo(scorePercentage) {
        if (scorePercentage >= 80) {
            return {
                class: 'bg-success-subtle text-success',
                icon: 'fas fa-trophy'
            };
        } else if (scorePercentage >= 60) {
            return {
                class: 'bg-warning-subtle text-warning',
                icon: 'fas fa-star'
            };
        } else {
            return {
                class: 'bg-danger-subtle text-danger',
                icon: 'fas fa-exclamation-triangle'
            };
        }
    }

    // View test details
    viewTestDetails(testId) {
        const test = this.testResults.find(t => t.id === testId);
        if (!test) return;

        // Navigate to test detail page
        // In a real application, this would route to a detailed results page
        window.location.href = `test-detail?id=${testId}`;
        
        // For demo, show alert
        const scorePercentage = Math.round((test.score / test.maxScore) * 100);
        alert(`Chi tiết kết quả bài test: ${test.testName}\n\n` +
              `Điểm số: ${test.score}/${test.maxScore} (${scorePercentage}%)\n` +
              `Số câu đúng: ${test.correctAnswers}/${test.questions}\n` +
              `Thời gian: ${test.duration}\n` +
              `Ngày thực hiện: ${this.formatDate(test.date).day}\n\n` +
              `Đang chuyển đến trang kết quả chi tiết...`);
    }

    // Retake test
    retakeTest(testId) {
        const test = this.testResults.find(t => t.id === testId);
        if (!test) return;

        if (confirm(`Bạn có muốn làm lại bài "${test.testName}"?\n\nKết quả cũ sẽ được thay thế bằng kết quả mới.`)) {
            // Navigate to test page
            window.location.href = `test?retry=${testId}`;
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
