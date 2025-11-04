/**
 * Package-based Quiz Integration Example
 * 
 * Mẫu code để tích hợp frontend với hệ thống quiz dựa trên packages
 * Thay thế cho việc hardcode exam_type='FREE'
 */

class PackageQuizManager {
    constructor() {
        this.packages = [];
        this.selectedPackage = null;
        this.examData = null;
    }
    
    /**
     * Load available packages for current user
     */
    async loadAvailablePackages() {
        try {
            const response = await fetch('/api/quiz/available-packages.php', {
                method: 'GET',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.packages = result.data.packages;
                return this.packages;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error loading packages:', error);
            throw error;
        }
    }
    
    /**
     * Select package and check access
     */
    selectPackage(packageId) {
        const package = this.packages.find(p => p.package_id === packageId);
        
        if (!package) {
            throw new Error('Package not found');
        }
        
        if (!package.can_access) {
            if (package.is_free) {
                throw new Error('Bạn đã hết lượt làm bài miễn phí');
            } else {
                throw new Error('Bạn cần mua gói này để làm bài thi');
            }
        }
        
        this.selectedPackage = package;
        return package;
    }
    
    /**
     * Start quiz from selected package
     */
    async startQuiz(packageId, forceNew = false) {
        try {
            // Select package first
            this.selectPackage(packageId);
            
            // Check if user has incomplete exam
            if (this.selectedPackage.has_incomplete_exam && !forceNew) {
                const shouldContinue = confirm(
                    `Bạn có bài thi chưa hoàn thành. Tiếp tục bài thi cũ hay bắt đầu bài mới?\n\n` +
                    `Bài thi: ${this.selectedPackage.package_name}\n` +
                    `Tiến độ: ${this.selectedPackage.latest_exam.progress}`
                );
                
                if (shouldContinue) {
                    // Continue existing exam
                    window.location.href = this.selectedPackage.actions.continue_quiz_url;
                    return;
                } else {
                    forceNew = true;
                }
            }
            
            // Create new exam from package
            const response = await fetch('/api/quiz/create-exam-from-package.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    package_id: packageId,
                    force_new: forceNew
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.examData = result.data.exam_info;
                
                // Show success message
                this.showToast(
                    'Thành công!', 
                    `Đã tạo bài thi ${result.data.package_info.package_name}`, 
                    'success'
                );
                
                // Redirect to quiz page
                setTimeout(() => {
                    window.location.href = `/quiz?exam_code=${this.examData.exam_code}`;
                }, 1000);
                
                return result.data;
                
            } else if (result.status === 'warning' && result.error_code === 460) {
                // Handle existing incomplete exam
                const shouldRestart = confirm(
                    `${result.message}\n\nBạn có muốn bắt đầu bài thi mới không?`
                );
                
                if (shouldRestart) {
                    return this.startQuiz(packageId, true); // Force new
                } else {
                    // Continue existing exam
                    window.location.href = `/quiz?exam_code=${result.data.exam_code}`;
                }
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Error starting quiz:', error);
            this.showToast('Lỗi', error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Initialize quiz from URL parameters
     * Support both old (exam_code) and new (package_id) methods
     */
    async initializeQuizFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const examCode = urlParams.get('exam_code');
        const packageId = urlParams.get('package_id');
        
        if (examCode) {
            // Old method: Continue existing exam
            return this.initializeFromExamCode(examCode);
        } else if (packageId) {
            // New method: Start from package
            return this.startQuiz(parseInt(packageId));
        } else {
            // No parameters: Show package selection
            return this.showPackageSelection();
        }
    }
    
    /**
     * Initialize existing exam from exam_code
     */
    async initializeFromExamCode(examCode) {
        try {
            const response = await fetch(`/api/quiz/get-questions.php?exam_code=${examCode}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.examData = result.data;
                return this.examData;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error loading exam:', error);
            throw error;
        }
    }
    
    /**
     * Show package selection UI
     */
    async showPackageSelection() {
        try {
            await this.loadAvailablePackages();
            
            // Create package selection modal/page
            const modal = this.createPackageSelectionModal();
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('Error showing package selection:', error);
            this.showToast('Lỗi', 'Không thể tải danh sách gói bài thi', 'error');
        }
    }
    
    /**
     * Create package selection modal
     */
    createPackageSelectionModal() {
        const modal = document.createElement('div');
        modal.className = 'package-selection-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Chọn gói bài thi</h2>
                    <button class="close-btn" onclick="this.closest('.package-selection-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="packages-grid">
                        ${this.packages.map(pkg => this.createPackageCard(pkg)).join('')}
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    /**
     * Create package card HTML
     */
    createPackageCard(package) {
        const canStart = package.can_access && !package.has_incomplete_exam;
        const canContinue = package.has_incomplete_exam;
        const needsPurchase = !package.can_access && !package.is_free;
        
        return `
            <div class="package-card ${!package.can_access ? 'disabled' : ''}" 
                 data-package-id="${package.package_id}">
                <div class="package-header">
                    <h3>${package.package_name}</h3>
                    <div class="package-price">
                        ${package.is_free ? '<span class="free-badge">Miễn phí</span>' : package.price_formatted}
                    </div>
                </div>
                
                <div class="package-details">
                    <div class="detail-item">
                        <span class="label">Số câu hỏi:</span>
                        <span class="value">${package.question_count} câu</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Thời gian:</span>
                        <span class="value">${package.time_limit_minutes ? package.time_limit_minutes + ' phút' : 'Không giới hạn'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Lượt còn lại:</span>
                        <span class="value">${package.attempts_left}/${package.max_attempts}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Loại báo cáo:</span>
                        <span class="value">${package.report_type}</span>
                    </div>
                </div>
                
                ${package.has_incomplete_exam ? `
                    <div class="incomplete-exam-notice">
                        <i class="fas fa-exclamation-triangle"></i>
                        Bạn có bài thi chưa hoàn thành
                        <small>Tiến độ: ${package.latest_exam.progress}</small>
                    </div>
                ` : ''}
                
                <div class="package-actions">
                    ${canContinue ? `
                        <button class="btn btn-primary" onclick="packageQuizManager.continueExam('${package.latest_exam.exam_code}')">
                            Tiếp tục bài thi
                        </button>
                        <button class="btn btn-secondary" onclick="packageQuizManager.startQuiz(${package.package_id}, true)">
                            Bắt đầu lại
                        </button>
                    ` : canStart ? `
                        <button class="btn btn-primary" onclick="packageQuizManager.startQuiz(${package.package_id})">
                            Bắt đầu làm bài
                        </button>
                    ` : needsPurchase ? `
                        <button class="btn btn-purchase" onclick="window.location.href='${package.actions.purchase_url}'">
                            Mua gói này
                        </button>
                    ` : `
                        <button class="btn btn-disabled" disabled>
                            Đã hết lượt
                        </button>
                    `}
                </div>
            </div>
        `;
    }
    
    /**
     * Continue existing exam
     */
    continueExam(examCode) {
        window.location.href = `/quiz?exam_code=${examCode}`;
    }
    
    /**
     * Show toast notification
     */
    showToast(title, message, type) {
        // Implementation depends on your toast library
        console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    }
}

// Initialize global instance
const packageQuizManager = new PackageQuizManager();

// Enhanced TestManager with package support
class TestManager {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.examId = null;
        this.examCode = null;
        this.packageInfo = null;
        this.fixedChoices = [];
        this.timeLimit = 0;
        this.timeRemaining = 0;
        this.timer = null;
        this.startTime = new Date();
    }
    
    /**
     * Initialize test with package support
     */
    async initializeTest() {
        try {
            showToast('Đang tải trắc nghiệm...', 'Vui lòng chờ trong giây lát', 'info');
            
            // Check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const examCode = urlParams.get('exam_code');
            const packageId = urlParams.get('package_id');
            
            if (examCode) {
                // Load existing exam
                await this.loadExistingExam(examCode);
            } else if (packageId) {
                // Create new exam from package
                await this.createExamFromPackage(parseInt(packageId));
            } else {
                // Show package selection
                throw new Error('Vui lòng chọn gói bài thi');
            }
            
            // Setup UI
            this.setupUI();
            
            showToast('Thành công!', 'Trắc nghiệm đã được tải thành công.', 'success');
            
        } catch (error) {
            console.error('❌ Error initializing test:', error);
            showToast('Lỗi', error.message, 'error');
            
            // Redirect to package selection or home
            setTimeout(() => {
                packageQuizManager.showPackageSelection();
            }, 2000);
        }
    }
    
    /**
     * Load existing exam by exam_code
     */
    async loadExistingExam(examCode) {
        const response = await fetch(`/api/quiz/get-questions.php?exam_code=${examCode}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok || data.status !== 'success') {
            throw new Error(data.message || 'Không thể tải bài thi');
        }
        
        this.examId = data.data.exam_id;
        this.examCode = data.data.exam_code;
        this.questions = data.data.questions;
        this.fixedChoices = data.data.fixed_choices || [];
        this.packageInfo = data.data.package_info;
        
        // Load existing answers if any
        if (data.data.existing_answers) {
            this.answers = data.data.existing_answers;
        }
    }
    
    /**
     * Create new exam from package
     */
    async createExamFromPackage(packageId) {
        const examData = await packageQuizManager.startQuiz(packageId);
        
        this.examId = examData.exam_info.exam_id;
        this.examCode = examData.exam_info.exam_code;
        this.questions = examData.exam_info.questions;
        this.fixedChoices = examData.exam_info.fixed_choices || [];
        this.packageInfo = examData.package_info;
    }
    
    /**
     * Setup UI with package info
     */
    setupUI() {
        // Update UI elements with package info
        if (this.packageInfo) {
            document.getElementById('totalQuestions').textContent = this.packageInfo.question_count;
            document.getElementById('packageName').textContent = this.packageInfo.package_name;
            document.getElementById('remainingCount').textContent = this.questions.length;
        }
        
        // Setup other UI components
        this.renderMinimap();
        this.renderQuestion();
        this.updateStats();
        
        // Start timer if time limit is set
        if (this.packageInfo && this.packageInfo.time_limit_minutes > 0) {
            this.timeLimit = this.packageInfo.time_limit_minutes * 60;
            this.timeRemaining = this.timeLimit;
            this.startTimer();
        }
    }
    
    // ... rest of TestManager methods remain the same
}

// Usage Examples:

// 1. Initialize quiz page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await packageQuizManager.initializeQuizFromURL();
    } catch (error) {
        console.error('Failed to initialize quiz:', error);
    }
});

// 2. Start quiz from product page
function startQuizFromProduct(packageId) {
    packageQuizManager.startQuiz(packageId)
        .then(() => {
            console.log('Quiz started successfully');
        })
        .catch(error => {
            console.error('Failed to start quiz:', error);
        });
}

// 3. Show available packages
function showAvailableQuizzes() {
    packageQuizManager.showPackageSelection();
}

// 4. Check user's quiz packages
async function loadUserQuizzes() {
    try {
        const packages = await packageQuizManager.loadAvailablePackages();
        console.log('Available packages:', packages);
        return packages;
    } catch (error) {
        console.error('Failed to load packages:', error);
        return [];
    }
}