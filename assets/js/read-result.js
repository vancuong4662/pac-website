// Configure page-specific components
window.pageComponentsConfig = [
    { name: 'header', target: '#header-section' },
    { name: 'footer', target: '#footer-section' }
];

// Result Viewer Class
class ResultViewer {
    constructor() {
        this.examCode = null;
        this.resultData = null;
        this.chart = null;

        this.init();
    }

    async init() {
        try {
            // Get exam_code from URL
            const params = new URLSearchParams(window.location.search);
            this.examCode = params.get('exam_code');

            if (!this.examCode) {
                throw new Error('Exam code not found');
            }

            // Load result data
            await this.loadResult();

            // Render all sections
            this.renderOverview();
            this.renderPersonalityGroups();
            this.renderDetailedAnalysis();
            this.renderSuggestedJobs();
            this.renderGuidance();

            // Setup export functionality
            this.setupExportActions();

            // Show result content
            document.getElementById('loading-state').style.display = 'none';
            document.getElementById('result-content').style.display = 'block';

        } catch (error) {
            console.error('Result viewer error:', error);
            this.showError();
        }
    }

    async loadResult() {
        try {
            const response = await fetch(`api/quiz/get-result.php?exam_code=${this.examCode}`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok || data.status !== 'success') {
                throw new Error(data.message || 'Failed to load result');
            }

            this.resultData = data.data;

            // Update page info
            document.getElementById('exam-code').textContent = this.examCode;
            document.getElementById('exam-date').textContent = this.resultData.created_at_formatted || 'N/A';

        } catch (error) {
            console.error('Error loading result:', error);
            throw error;
        }
    }

    renderOverview() {
        const data = this.resultData;

        // Build radar chart
        this.buildRadarChart(data.tendencies || {});

        // Render tendency ranking
        this.renderTendencyRanking(data.tendencies || {});

        // Render personality group introduction
        this.renderPersonalityGroupIntro(data.tendencies || {});
    }

    buildRadarChart(tendencies) {
        const ctx = document.getElementById('radar-chart').getContext('2d');

        // Destroy existing chart if exists
        if (this.chart) {
            this.chart.destroy();
        }

        // Calculate dynamic max value based on total questions
        const totalQuestions = this.resultData.total_questions || 30;
        const questionsPerGroup = Math.ceil(totalQuestions / 6); // 6 Holland groups
        const maxScore = questionsPerGroup * 2; // Each question max score is 2

        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: [
                    'Kỹ thuật',
                    'Nghiên cứu',
                    'Nghệ thuật',
                    'Xã hội',
                    'Quản lý',
                    'Nghiệp vụ'
                ],
                datasets: [{
                    label: 'Điểm số',
                    data: [
                        tendencies.R || 0,
                        tendencies.I || 0,
                        tendencies.A || 0,
                        tendencies.S || 0,
                        tendencies.E || 0,
                        tendencies.C || 0
                    ],
                    backgroundColor: 'rgba(150, 75, 223, 0.2)',
                    borderColor: 'rgba(150, 75, 223, 1)',
                    pointBackgroundColor: 'rgba(150, 75, 223, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(150, 75, 223, 1)',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: maxScore,
                        stepSize: Math.ceil(maxScore / 10),
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            stepSize: Math.ceil(maxScore / 10),
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }

    renderTendencyRanking(tendencies) {
        const container = document.getElementById('tendency-ranking');

        // Calculate dynamic max value based on total questions
        const totalQuestions = this.resultData.total_questions || 30;
        const questionsPerGroup = Math.ceil(totalQuestions / 6); // 6 Holland groups
        const maxScore = questionsPerGroup * 2; // Each question max score is 2

        // Sort by score
        const sorted = Object.entries(tendencies)
            .sort(([, a], [, b]) => b - a)
            .map(([code, score], index) => {
                const percent = Math.max((score / maxScore) * 100, 5); // Scale based on actual max score, minimum 5% for visibility

                return `
              <div class="tendency-item" data-aos="fade-up" data-aos-delay="${index * 100}">
                <div class="d-flex align-items-center">
                  <div class="tendency-rank rank-${index + 1} me-3">
                    #${index + 1}
                  </div>
                  <div class="flex-grow-1">
                    <div class="d-flex justify-content-between mb-2">
                      <strong>${this.getGroupName(code)}</strong>
                      <span class="text-primary fw-bold">${score}/${maxScore} điểm</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                      <div class="progress-bar" style="width: ${percent}%; background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));">
                      </div>
                    </div>
                    <small class="text-muted">${this.getGroupDescription(code)}</small>
                  </div>
                </div>
              </div>
            `;
            }).join('');

        container.innerHTML = sorted;
    }

    renderPersonalityGroups() {
        const container = document.getElementById('personality-groups-content');
        const data = this.resultData;

        // Get top 3 groups for detailed analysis
        const topGroups = Object.entries(data.tendencies || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        const groupsHTML = topGroups.map(([code, score], index) => `
          <div class="personality-group-card" data-aos="fade-up" data-aos-delay="${index * 200}">
            <div class="row align-items-center">
              <div class="col-auto">
                <div class="group-icon-container">
                  <div class="group-icon" style="background: ${this.getGroupColor(code)}">
                    <img src="${this.getPersonalityGroupSvgIcon(code)}" alt="${this.getGroupName(code)}" style="width: 24px; height: 24px; filter: brightness(0) invert(1);">
                  </div>
                  <div class="group-image mt-3">
                    <img src="${this.getPersonalityGroupImage(code)}" alt="${this.getGroupName(code)}" style="width: 80px; height: 80px; border-radius: 8px;">
                  </div>
                </div>
              </div>
              <div class="col">
                <h3 class="mb-2">${this.getGroupName(code)}</h3>
                <p class="text-muted mb-3">${this.getGroupFullDescription(code)}</p>
                
                <div class="row">
                  <div class="col-md-8">
                    <h5>Đặc điểm nổi bật:</h5>
                    <ul class="list-unstyled">
                      ${this.getGroupCharacteristics(code).map(char => `
                        <li class="mb-2">
                          <i class="fas fa-check text-success me-2"></i>
                          ${char}
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                  <div class="col-md-4">
                    <div class="text-center">
                      <div class="display-4 text-primary fw-bold">${score}</div>
                      <small class="text-muted">điểm</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('');

        container.innerHTML = groupsHTML;
    }

    renderDetailedAnalysis() {
        const data = this.resultData;
        const tendencies = data.tendencies || {};

        // Get top 3 tendencies
        const topTendencies = Object.entries(tendencies)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        // Render Personality Traits
        this.renderPersonalityTraits(topTendencies);

        // Render Work Style
        this.renderWorkStyle(topTendencies);

        // Render Preferred Activities
        this.renderPreferredActivities(topTendencies);
    }

    renderPersonalityTraits(topTendencies) {
        const container = document.getElementById('personality-traits-content');

        const traitsHTML = `
          <div class="personality-analysis-container">
            <div class="analysis-intro mb-4">
              <div class="row">
                <div class="col-md-8">
                  <h4 class="mb-3">Phân tích đặc trưng tính cách nổi bật</h4>
                  <p class="text-muted">Dựa trên kết quả trắc nghiệm, chúng tôi đã xác định được <strong>${topTendencies.length} nhóm tính cách</strong> nổi bật nhất của bạn. Mỗi nhóm thể hiện những đặc điểm, điểm mạnh và cơ hội phát triển riêng biệt.</p>
                </div>
                <div class="col-md-4 text-center">
                  <div class="summary-stats">
                    <div class="stat-circle">
                      <span class="stat-number">${topTendencies.length}</span>
                      <span class="stat-label">Nhóm chính</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="personality-groups-grid">
              ${topTendencies.map(([code, score], index) => `
                <div class="personality-group-detail" data-aos="fade-up" data-aos-delay="${index * 150}">
                  <div class="group-header">
                    <div class="group-icon-large" style="background: ${this.getGroupColor(code)}">
                      <img src="${this.getPersonalityGroupSvgIcon(code)}" alt="${this.getGroupName(code)}" style="width: 40px; height: 40px; filter: brightness(0) invert(1);">
                    </div>
                    <div class="group-info">
                      <h5 class="group-title">${this.getGroupName(code)}</h5>
                      <div class="score-display">
                        <span class="score-number">${score}</span>
                        <span class="score-max">/${this.getMaxScoreForGroup()}</span>
                      </div>
                      <div class="score-bar">
                        <div class="score-fill" style="width: ${(score / this.getMaxScoreForGroup()) * 100}%; background: ${this.getGroupColor(code)};"></div>
                      </div>
                    </div>
                  </div>

                  <div class="group-description mb-4">
                    <p class="text-muted">${this.getGroupFullDescription(code)}</p>
                  </div>

                  <div class="strengths-development-grid">
                    <div class="strengths-section">
                      <div class="section-header">
                        <div class="section-icon success">
                          <i class="fas fa-plus-circle"></i>
                        </div>
                        <h6>Điểm mạnh nổi bật</h6>
                      </div>
                      <div class="items-list">
                        ${this.getPersonalityStrengths(code).map(strength => `
                          <div class="list-item">
                            <div class="item-bullet success"></div>
                            <span>${strength}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>

                    <div class="development-section">
                      <div class="section-header">
                        <div class="section-icon warning">
                          <i class="fas fa-arrow-up"></i>
                        </div>
                        <h6>Cơ hội phát triển</h6>
                      </div>
                      <div class="items-list">
                        ${this.getPersonalityDevelopment(code).map(area => `
                          <div class="list-item">
                            <div class="item-bullet warning"></div>
                            <span>${area}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                </div>
                ${index < topTendencies.length - 1 ? '<div class="group-divider"></div>' : ''}
              `).join('')}
            </div>

            <div class="analysis-footer mt-5">
              <div class="footer-card">
                <div class="row align-items-center">
                  <div class="col-md-8">
                    <h6 class="mb-2">💡 Lời khuyên từ chuyên gia</h6>
                    <p class="mb-0 text-muted">Hãy tận dụng những điểm mạnh tự nhiên của bạn và từ từ phát triển các kỹ năng còn thiếu. Sự cân bằng giữa các nhóm tính cách sẽ giúp bạn thành công trong mọi lĩnh vực.</p>
                  </div>
                  <div class="col-md-4 text-center">
                    <div class="expert-avatar">
                      <i class="fas fa-user-tie"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        container.innerHTML = traitsHTML;
    }

    renderWorkStyle(topTendencies) {
        const container = document.getElementById('work-style-content');

        const workStyleHTML = `
          <div class="work-style-analysis-container">
            <div class="analysis-intro mb-4">
              <div class="text-center">
                <h4 class="mb-3">Phong cách làm việc của bạn</h4>
                <p class="text-muted">Hiểu rõ cách bạn tiếp cận công việc sẽ giúp tìm ra môi trường làm việc lý tưởng và phát huy tối đa năng lực.</p>
              </div>
            </div>

            <div class="work-aspects-grid">
              <div class="work-aspect-card modern">
                <div class="aspect-header">
                  <div class="aspect-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-building"></i>
                  </div>
                  <h5>Môi trường làm việc ưa thích</h5>
                </div>
                <div class="aspect-content">
                  <div class="environment-tags">
                    ${this.getPreferredWorkEnvironment(topTendencies).map(env => `
                      <div class="environment-tag">
                        <i class="fas fa-check-circle"></i>
                        <span>${env}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div class="work-aspect-card modern">
                <div class="aspect-header">
                  <div class="aspect-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <i class="fas fa-brain"></i>
                  </div>
                  <h5>Cách tiếp cận công việc</h5>
                </div>
                <div class="aspect-content">
                  <div class="approach-items">
                    ${this.getWorkApproach(topTendencies).map(approach => `
                      <div class="approach-item">
                        <div class="approach-number">
                          <i class="fas fa-lightbulb"></i>
                        </div>
                        <span>${approach}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div class="work-aspect-card modern">
                <div class="aspect-header">
                  <div class="aspect-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <i class="fas fa-users-cog"></i>
                  </div>
                  <h5>Phong cách quản lý</h5>
                </div>
                <div class="aspect-content">
                  <div class="management-styles">
                    ${this.getManagementStyle(topTendencies).map((style, index) => `
                      <div class="management-style-item">
                        <div class="style-indicator" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"></div>
                        <div class="style-content">
                          <span>${style}</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div class="work-aspect-card modern">
                <div class="aspect-header">
                  <div class="aspect-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <i class="fas fa-tasks"></i>
                  </div>
                  <h5>Tính chất công việc phù hợp</h5>
                </div>
                <div class="aspect-content">
                  <div class="work-nature-grid">
                    ${this.getWorkNature(topTendencies).map(nature => `
                      <div class="nature-item">
                        <div class="nature-icon">
                          <i class="fas fa-star"></i>
                        </div>
                        <span>${nature}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>

            <div class="work-summary mt-5">
              <div class="summary-card">
                <div class="summary-header">
                  <div class="summary-icon">
                    <i class="fas fa-chart-line"></i>
                  </div>
                  <h5>Tóm tắt phong cách làm việc</h5>
                </div>
                <div class="summary-content">
                  <p>Dựa trên phân tích tính cách, bạn sẽ làm việc hiệu quả nhất trong môi trường ${this.getWorkStyleSummary(topTendencies)}. Hãy tìm kiếm những cơ hội nghề nghiệp phù hợp với phong cách tự nhiên của mình.</p>
                </div>
              </div>
            </div>
          </div>
        `;

        container.innerHTML = workStyleHTML;
    }

    renderPreferredActivities(topTendencies) {
        const container = document.getElementById('preferred-activities-content');

        const activitiesHTML = `
          <div class="activities-analysis-container">
            <div class="analysis-intro mb-4">
              <div class="text-center">
                <h4 class="mb-3">Hoạt động yêu thích của bạn</h4>
                <p class="text-muted">Khám phá những hoạt động và nhiệm vụ mà bạn cảm thấy hứng thú và tự nhiên nhất.</p>
              </div>
            </div>

            <div class="activities-grid">
              <div class="activity-category-card modern">
                <div class="category-header">
                  <div class="category-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-heart"></i>
                  </div>
                  <div class="category-info">
                    <h5>Hoạt động yêu thích</h5>
                    <span class="category-subtitle">Những việc bạn làm với niềm đam mê</span>
                  </div>
                </div>
                
                <div class="activities-list">
                  ${this.getPreferredActivities(topTendencies).map(activity => `
                    <div class="activity-item">
                      <div class="activity-icon">
                        <i class="fas fa-play-circle"></i>
                      </div>
                      <div class="activity-text">
                        <span>${activity}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="activity-category-card modern">
                <div class="category-header">
                  <div class="category-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <i class="fas fa-graduation-cap"></i>
                  </div>
                  <div class="category-info">
                    <h5>Môi trường học tập</h5>
                    <span class="category-subtitle">Cách thức học tập hiệu quả nhất</span>
                  </div>
                </div>
                
                <div class="activities-list">
                  ${this.getLearningEnvironment(topTendencies).map(learning => `
                    <div class="activity-item">
                      <div class="activity-icon">
                        <i class="fas fa-book-open"></i>
                      </div>
                      <div class="activity-text">
                        <span>${learning}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="activity-category-card modern">
                <div class="category-header">
                  <div class="category-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <i class="fas fa-laugh"></i>
                  </div>
                  <div class="category-info">
                    <h5>Hoạt động giải trí</h5>
                    <span class="category-subtitle">Những gì mang lại niềm vui cho bạn</span>
                  </div>
                </div>
                
                <div class="activities-list">
                  ${this.getRecreationActivities(topTendencies).map(recreation => `
                    <div class="activity-item">
                      <div class="activity-icon">
                        <i class="fas fa-smile"></i>
                      </div>
                      <div class="activity-text">
                        <span>${recreation}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <div class="activities-summary mt-4">
              <div class="summary-card gradient-bg">
                <div class="summary-content">
                  <div class="summary-icon">
                    <i class="fas fa-compass"></i>
                  </div>
                  <div class="summary-text">
                    <h5>Định hướng hoạt động</h5>
                    <p>Hãy tìm kiếm những cơ hội tham gia vào các hoạt động phù hợp với tính cách tự nhiên của bạn. Điều này sẽ giúp bạn cảm thấy hài lòng và đạt hiệu quả cao trong công việc.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        container.innerHTML = activitiesHTML;
    }

    renderSuggestedJobs() {
        const container = document.getElementById('suggested-jobs-content');
        const jobs = this.resultData.suggested_jobs || [];

        if (jobs.length === 0) {
            container.innerHTML = `
            <div class="text-center py-5">
              <div class="mb-4">
                <i class="fas fa-briefcase text-muted" style="font-size: 4rem;"></i>
              </div>
              <h4 class="text-muted">Chưa có dữ liệu nghề nghiệp</h4>
              <p class="text-muted">Danh sách nghề nghiệp phù hợp đang được cập nhật.</p>
            </div>
          `;
            return;
        }

        const jobsHTML = jobs.map((job, index) => `
          <div class="col-lg-6 mb-4" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="job-card h-100">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="mb-0">${job.job_title || 'Tên nghề'}</h5>
                <div class="compatibility-rating">
                  ${this.renderStarRating(job.compatibility_score || 3)}
                </div>
              </div>
              
              <p class="text-muted mb-3">${job.description || 'Mô tả nghề nghiệp'}</p>
              
              <div class="row text-center">
                <div class="col-4">
                  <div class="small text-muted">Mức lương TB</div>
                  <div class="fw-bold text-success">${job.average_salary || 'N/A'}</div>
                </div>
                <div class="col-4">
                  <div class="small text-muted">Triển vọng</div>
                  <div class="fw-bold text-info">${job.growth_prospect || 'Tốt'}</div>
                </div>
                <div class="col-4">
                  <div class="small text-muted">Độ phù hợp</div>
                  <div class="fw-bold text-primary">${job.compatibility_score || 3}/5</div>
                </div>
              </div>
              
              ${job.required_skills ? `
                <div class="mt-3">
                  <small class="text-muted">Kỹ năng cần thiết:</small>
                  <div class="mt-1">
                    ${job.required_skills.split(',').map(skill => `
                      <span class="badge bg-light text-dark me-1 mb-1">${skill.trim()}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('');

        container.innerHTML = `<div class="row">${jobsHTML}</div>`;
    }

    renderGuidance() {
        const container = document.getElementById('guidance-content');

        container.innerHTML = `
          <div class="row">
            <div class="col-lg-8 mx-auto">
              <div class="card">
                <div class="card-header bg-brand-primary text-white">
                  <h4 class="mb-0">
                    <i class="fas fa-graduation-cap me-2"></i>
                    Hướng dẫn phát triển sự nghiệp
                  </h4>
                </div>
                <div class="card-body">
                  <div class="alert" style="background-color: rgba(150, 75, 223, 0.1); border-color: #964bdf; color: #5d2e8b;">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Lưu ý:</strong> Kết quả này chỉ mang tính chất tham khảo. Hãy kết hợp với tư vấn từ chuyên gia để có quyết định tốt nhất.
                  </div>
                  
                  <h5>Bước tiếp theo của bạn:</h5>
                  <ol>
                    <li class="mb-3">
                      <strong>Tìm hiểu sâu hơn:</strong> Nghiên cứu các nghề nghiệp được gợi ý để hiểu rõ yêu cầu và triển vọng.
                    </li>
                    <li class="mb-3">
                      <strong>Phát triển kỹ năng:</strong> Xác định và rèn luyện các kỹ năng cần thiết cho lĩnh vực bạn quan tâm.
                    </li>
                    <li class="mb-3">
                      <strong>Tìm kiếm cơ hội:</strong> Tham gia các khóa học, thực tập hoặc volunteer trong lĩnh vực phù hợp.
                    </li>
                    <li class="mb-3">
                      <strong>Tư vấn chuyên nghiệp:</strong> Liên hệ với chuyên gia tư vấn nghề nghiệp để được hỗ trợ chi tiết.
                    </li>
                  </ol>
                  
                  <div class="text-center mt-4">
                    <a href="tel:0965013663" class="btn btn-pac-primary me-3">
                      <i class="fas fa-phone me-2"></i>
                      Tư vấn trực tiếp
                    </a>
                    <a href="huongnghiep" class="btn btn-pac-primary">
                      <i class="fas fa-arrow-right me-2"></i>
                      Xem thêm dịch vụ
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
    }

    setupExportActions() {
        // PDF Export
        document.getElementById('export-pdf-btn').addEventListener('click', () => {
            // TODO: Implement PDF export functionality
            showToast('Chức năng xuất PDF đang được phát triển', 'info');
        });

        // Share Result
        document.getElementById('share-result-btn').addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'Kết quả trắc nghiệm tính cách nghề nghiệp',
                    text: `Tôi vừa hoàn thành bài trắc nghiệm tính cách nghề nghiệp tại PAC Group và nhận được kết quả phân tích chi tiết`,
                    url: window.location.href
                });
            } else {
                // Fallback: copy URL to clipboard
                navigator.clipboard.writeText(window.location.href);
                showToast('Đã sao chép liên kết kết quả', 'success');
            }
        });
    }

    showError() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
    }

    getWorkStyleSummary(topTendencies) {
        const summaries = {
            'R': 'thực tế và có cấu trúc rõ ràng',
            'I': 'yên tĩnh và tập trung vào nghiên cứu',
            'A': 'sáng tạo và linh hoạt',
            'S': 'hợp tác và giao tiếp nhiều',
            'E': 'năng động và cạnh tranh',
            'C': 'có quy trình và tiêu chuẩn rõ ràng'
        };

        if (topTendencies.length > 0) {
            const topCode = topTendencies[0][0];
            return summaries[topCode] || 'phù hợp với tính cách của bạn';
        }
        return 'phù hợp với tính cách của bạn';
    }

    getTopActivity(topTendencies) {
        const activities = {
            'R': 'Bạn có xu hướng thích các hoạt động thực hành và làm việc với máy móc, công cụ.',
            'I': 'Bạn có xu hướng thích nghiên cứu, phân tích và khám phá tri thức mới.',
            'A': 'Bạn có xu hướng thích các hoạt động sáng tạo và thể hiện tính thẩm mỹ.',
            'S': 'Bạn có xu hướng thích giúp đỡ người khác và tham gia hoạt động cộng đồng.',
            'E': 'Bạn có xu hướng thích lãnh đạo, tổ chức và quản lý các hoạt động.',
            'C': 'Bạn có xu hướng thích các hoạt động có tổ chức và tuân thủ quy trình.'
        };

        if (topTendencies.length > 0) {
            const topCode = topTendencies[0][0];
            return activities[topCode] || 'Bạn có những sở thích đa dạng và phong phú.';
        }
        return 'Bạn có những sở thích đa dạng và phong phú.';
    }

    getActivityDevelopmentTip(topTendencies) {
        const tips = {
            'R': 'Hãy tìm kiếm các khóa học kỹ thuật và thực hành để phát triển kỹ năng chuyên môn.',
            'I': 'Nên tham gia các nghiên cứu, hội thảo khoa học để mở rộng kiến thức.',
            'A': 'Khuyến khích tham gia các lớp học nghệ thuật và dự án sáng tạo.',
            'S': 'Nên tham gia các hoạt động tình nguyện và phát triển kỹ năng giao tiếp.',
            'E': 'Tìm kiếm cơ hội lãnh đạo và tham gia các khóa học quản lý.',
            'C': 'Phát triển kỹ năng tổ chức và tham gia các khóa học chuyên môn.'
        };

        if (topTendencies.length > 0) {
            const topCode = topTendencies[0][0];
            return tips[topCode] || 'Hãy khám phá và phát triển những sở thích phù hợp với tính cách của bạn.';
        }
        return 'Hãy khám phá và phát triển những sở thích phù hợp với tính cách của bạn.';
    }

    getActivityGradient(index) {
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
        ];
        return gradients[index % gradients.length];
    }

    getActivityIcon(category) {
        const icons = {
            'Hoạt động yêu thích': 'fas fa-heart',
            'Môi trường học tập': 'fas fa-graduation-cap',
            'Hoạt động giải trí': 'fas fa-laugh',
            'default': 'fas fa-star'
        };
        return icons[category] || icons['default'];
    }

    getActivityScore(category, topTendencies) {
        // Tính toán điểm số dựa trên top tendencies
        if (topTendencies.length > 0) {
            const mainScore = topTendencies[0][1];
            return Math.min(Math.round((mainScore / 10) * 100), 100);
        }
        return 75; // Default score
    }

    renderPersonalityGroupIntro(tendencies) {
        const container = document.getElementById('personality-group-intro');
        
        if (!tendencies || Object.keys(tendencies).length === 0) {
            container.innerHTML = '';
            return;
        }

        // Get top personality group
        const topGroup = this.getTopPersonalityGroup(tendencies);
        
        if (!topGroup) {
            container.innerHTML = '';
            return;
        }

        const introHTML = `
          <div class="card">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-md-3 text-center">
                  <div class="personality-group-image">
                    <img src="${this.getPersonalityGroupImage(topGroup.code)}" alt="${topGroup.name}" style="max-width: 120px; height: auto;">
                  </div>
                </div>
                <div class="col-md-9">
                  <h3 class="text-primary mb-3">${topGroup.name}</h3>
                  <p class="lead text-muted mb-0">${topGroup.description}</p>
                </div>
              </div>
            </div>
          </div>
        `;
        
        container.innerHTML = introHTML;
    }

    getTopPersonalityGroup(tendencies) {
        // Get highest scoring personality group
        const sortedTendencies = Object.entries(tendencies)
            .sort(([,a], [,b]) => b - a);
        
        if (sortedTendencies.length === 0) return null;
        
        const topCode = sortedTendencies[0][0];
        return this.getPersonalityGroupInfo(topCode);
    }

    getPersonalityGroupInfo(code) {
        const groupInfo = {
            'R': {
                name: 'Nhà Kiến Tạo',
                description: 'Là một người mang quan tâm đặc trung về Nhà Kiến Tạo, được thúc đẩy bởi mong muốn hành động, khẳng định, kiểm chứng, và cạnh tranh hơn là nghiên cứu lý thuyết và chiêm nghiệm về các lý giải trừu tượng. Bạn hứng thú với các công việc mang tính thực tế, rõ ràng, hướng kết quả, và tiếp cận vấn đề với phương thức giải quyết đơn giản, có hệ thống, và đạt được hiệu quả cụ thể. Những công việc này thường đòi hỏi sự khéo léo của đôi bàn tay và sự phối hợp nhuần nhuyễn giữa các kỹ năng và thao tác vận động.',
                code: 'R'
            },
            'I': {
                name: 'Nhà Học Giả',
                description: 'Học giả là những người trí thức. Bạn có khả năng để ý tới các chi tiết và quan sát nhỏ nhất, dành nhiều thời gian để phân tích, chiêm nghiệm và khám phá những ý tưởng mới rồi mới đưa ra quyết định. Bạn có phong cách làm việc độc lập và khao khát mãnh liệt để giải quyết các vấn đề, và thường đề cao việc kiểm chứng các đánh giá, quan sát bằng cách đặt câu hỏi, sau đó tổng hợp, tổ chức, và phân tích thông tin một cách rõ ràng.',
                code: 'I'
            },
            'A': {
                name: 'Nhà Sáng Tạo',
                description: 'Nhà sáng tạo là những người có khả năng tự cảm nhận và tự thể hiện rất cao. Bạn ưa thích làm việc với ý tưởng và đồ vật trong các công việc và nhiệm vụ đòi hỏi trí tưởng tượng, sự dồi dào và luôn đổi mới. Trong môi trường làm việc chuyên nghiệp, bạn thể hiện mình là một người cởi mở, nhạy cảm, khoáng đạt, độc đáo và đôi khi là bốc đồng.',
                code: 'A'
            },
            'S': {
                name: 'Nhà Bác Ái',
                description: 'Nhà bác ái là những người giàu lòng vị tha, biết lắng nghe, chia sẻ, và thường đặt ra mục tiêu cao cả vì lợi ích chung của toàn tập thể. Bạn thích làm việc với con người để quan sát, tìm tòi và đề ra các kế hoạch, hành động để hoàn thiện bản thân và giúp đỡ những người xung quanh. Một khi đã xác định rõ phương hướng, nhiệm vụ, và vai trò của mình, bạn kiên trì và tự tin dùng sự chân thành, trách nhiệm, nhạy cảm và hợp tác của mình để thuyết phục, dẫn dắt và hướng dẫn người khác.',
                code: 'S'
            },
            'E': {
                name: 'Nhà Tiên Phong',
                description: 'Nhà tiên phong là những con người toàn diện. Bạn vừa có thể suy ngẫm, nghiên cứu, đánh giá các học thuyết và phương pháp, vừa có khả năng diễn đạt và ứng dụng các phân tích của mình một cách hiệu quả và có sức ảnh hưởng. Bạn thích làm việc với ý tưởng và con người, và thường được miêu tả là dễ gần, năng động, quyết đoán, có nhiều hoài bão và tự tin.',
                code: 'E'
            },
            'C': {
                name: 'Nhà Tổ Chức',
                description: 'Nhà tổ chức như bạn thường được miêu tả với hình ảnh loài kiến chăm chỉ, cần mẫn xây tổ. Bạn là người có khả năng quản lý ở mức độ vi mô, các công việc liên quan tới dữ liệu, con số, văn bản, giấy tờ bởi bạn thường chú ý tới các tiểu tiết và góc nhìn quan trọng ít ai nghĩ tới. Bạn tiếp cận công việc chuyên môn với một sự thận trọng, cân nhắc, đa chiều, và thường có một kế hoạch từng bước rõ ràng để giải quyết vấn đề.',
                code: 'C'
            }
        };
        
        return groupInfo[code] || null;
    }

    getPersonalityGroupImage(code) {
        // Use actual personality group images from old project
        const images = {
            'R': 'assets/img/result/r.png',  // Nhà Kiến Tạo (Realistic)
            'I': 'assets/img/result/i.png',  // Nhà Học Giả (Investigative) 
            'A': 'assets/img/result/a.png',  // Nhà Sáng Tạo (Artistic)
            'S': 'assets/img/result/s.png',  // Nhà Bác Ái (Social)
            'E': 'assets/img/result/e.png',  // Nhà Tiên Phong (Enterprising)
            'C': 'assets/img/result/c.png'   // Nhà Tổ Chức (Conventional)
        };
        
        return images[code] || 'assets/img/result/r.png';
    }

    getPersonalityGroupSvgIcon(code) {
        // SVG icons from old project based on exact mapping
        const svgIcons = {
            'R': 'assets/img/result/icon-kt.svg',  // Kỹ thuật (Realistic)
            'I': 'assets/img/result/icon-nc.svg',  // Nghiên cứu (Investigative)
            'A': 'assets/img/result/icon-nt.svg',  // Nghệ thuật (Artistic)
            'S': 'assets/img/result/icon-xh.svg',  // Xã hội (Social)
            'E': 'assets/img/result/icon-ql.svg',  // Quản lý (Enterprising)
            'C': 'assets/img/result/icon-nv.svg'   // Nghiệp vụ (Conventional)
        };
        
        return svgIcons[code] || 'assets/img/result/icon-kt.svg';
    }

    // Helper methods for detailed analysis
    getPersonalityStrengths(code) {
        const strengths = {
            'R': [
                'Thực tế và có khả năng giải quyết vấn đề cụ thể',
                'Khéo léo với tay và máy móc',
                'Kiên nhẫn và bền bỉ trong công việc',
                'Thích làm việc độc lập'
            ],
            'I': [
                'Tư duy phân tích và logic mạnh',
                'Khả năng nghiên cứu và tìm hiểu sâu',
                'Tò mò và thích khám phá tri thức',
                'Độc lập trong tư duy và hành động'
            ],
            'A': [
                'Sáng tạo và có khả năng nghệ thuật',
                'Tư duy đổi mới và độc đáo',
                'Khả năng biểu đạt và truyền cảm hứng',
                'Linh hoạt và thích thử nghiệm'
            ],
            'S': [
                'Đồng cảm và quan tâm đến người khác',
                'Khả năng giao tiếp và làm việc nhóm tốt',
                'Kiên nhẫn trong việc giúp đỡ và hướng dẫn',
                'Có trách nhiệm xã hội cao'
            ],
            'E': [
                'Khả năng lãnh đạo và thuyết phục',
                'Tự tin và quyết đoán',
                'Khả năng tổ chức và quản lý tốt',
                'Năng động và có tham vọng'
            ],
            'C': [
                'Cẩn thận và chú ý đến chi tiết',
                'Có khả năng tổ chức và sắp xếp tốt',
                'Làm việc có hệ thống và theo quy trình',
                'Đáng tin cậy và chính xác'
            ]
        };
        return strengths[code] || [];
    }

    getPersonalityDevelopment(code) {
        const development = {
            'R': [
                'Phát triển kỹ năng giao tiếp và làm việc nhóm',
                'Tăng cường khả năng thích ứng với thay đổi',
                'Học cách thể hiện ý kiến một cách rõ ràng',
                'Mở rộng mạng lưới quan hệ xã hội'
            ],
            'I': [
                'Cải thiện kỹ năng thuyết trình và truyền đạt',
                'Tăng khả năng làm việc trong môi trường áp lực',
                'Phát triển kỹ năng lãnh đạo và quản lý',
                'Học cách ứng dụng kiến thức vào thực tế'
            ],
            'A': [
                'Phát triển kỹ năng quản lý thời gian',
                'Tăng cường tính kỷ luật và nhất quán',
                'Học cách làm việc trong môi trường có cấu trúc',
                'Cải thiện khả năng hoàn thành deadline'
            ],
            'S': [
                'Phát triển khả năng ra quyết định khó khăn',
                'Tăng cường tính quyết đoán và kiên quyết',
                'Học cách quản lý stress và áp lực',
                'Cải thiện kỹ năng đàm phán'
            ],
            'E': [
                'Phát triển khả năng lắng nghe và đồng cảm',
                'Tăng cường sự kiên nhẫn với chi tiết',
                'Học cách ủy quyền và tin tương đồng nghiệp',
                'Cải thiện kỹ năng quản lý xung đột'
            ],
            'C': [
                'Phát triển tính linh hoạt và sáng tạo',
                'Tăng cường khả năng thích ứng với thay đổi',
                'Học cách làm việc trong môi trường không chắc chắn',
                'Cải thiện kỹ năng lãnh đạo và đổi mới'
            ]
        };
        return development[code] || [];
    }

    getPreferredWorkEnvironment(topTendencies) {
        const environments = {
            'R': ['Môi trường thực hành và làm việc với máy móc', 'Không gian làm việc có cấu trúc rõ ràng'],
            'I': ['Môi trường nghiên cứu và học thuật', 'Không gian làm việc yên tĩnh và tập trung'],
            'A': ['Môi trường sáng tạo và linh hoạt', 'Không gian làm việc có tính thẩm mỹ cao'],
            'S': ['Môi trường hợp tác và giao tiếp nhiều', 'Không gian làm việc thân thiện và hỗ trợ'],
            'E': ['Môi trường năng động và cạnh tranh', 'Không gian làm việc có cơ hội thăng tiến'],
            'C': ['Môi trường có quy trình rõ ràng', 'Không gian làm việc ổn định và an toàn']
        };

        let result = [];
        topTendencies.forEach(([code]) => {
            if (environments[code]) {
                result.push(...environments[code]);
            }
        });

        return [...new Set(result)].slice(0, 5); // Remove duplicates and limit to 5
    }

    getWorkApproach(topTendencies) {
        const approaches = {
            'R': ['Tiếp cận thực tế và logic', 'Giải quyết vấn đề bằng kinh nghiệm'],
            'I': ['Phân tích kỹ lưỡng trước khi hành động', 'Tìm hiểu nguyên nhân gốc rễ'],
            'A': ['Sáng tạo và đổi mới trong cách làm', 'Linh hoạt thích ứng với thay đổi'],
            'S': ['Hợp tác và tham khảo ý kiến nhóm', 'Quan tâm đến tác động với mọi người'],
            'E': ['Quyết đoán và hành động nhanh', 'Tập trung vào kết quả và hiệu quả'],
            'C': ['Làm việc có hệ thống và tuần tự', 'Kiểm tra và đảm bảo chất lượng']
        };

        let result = [];
        topTendencies.forEach(([code]) => {
            if (approaches[code]) {
                result.push(...approaches[code]);
            }
        });

        return [...new Set(result)].slice(0, 5);
    }

    getManagementStyle(topTendencies) {
        const styles = {
            'R': ['Quản lý thực tế và công bằng', 'Tập trung vào kết quả cụ thể'],
            'I': ['Quản lý dựa trên dữ liệu và phân tích', 'Khuyến khích tư duy độc lập'],
            'A': ['Quản lý linh hoạt và sáng tạo', 'Khuyến khích đổi mới và thử nghiệm'],
            'S': ['Quản lý hỗ trợ và phát triển nhân viên', 'Tạo môi trường làm việc thân thiện'],
            'E': ['Quản lý quyết đoán và có tầm nhìn', 'Tập trung vào mục tiêu và thành tích'],
            'C': ['Quản lý có hệ thống và quy trình', 'Đảm bảo tiêu chuẩn và chất lượng']
        };

        let result = [];
        topTendencies.forEach(([code]) => {
            if (styles[code]) {
                result.push(...styles[code]);
            }
        });

        return [...new Set(result)].slice(0, 4);
    }

    getWorkNature(topTendencies) {
        const natures = {
            'R': ['Công việc có tính ứng dụng cao', 'Làm việc với sản phẩm cụ thể'],
            'I': ['Công việc nghiên cứu và phân tích', 'Làm việc độc lập và tự chủ'],
            'A': ['Công việc sáng tạo và biến đổi', 'Môi trường làm việc linh hoạt'],
            'S': ['Công việc phục vụ và giúp đỡ người khác', 'Tương tác xã hội cao'],
            'E': ['Công việc lãnh đạo và quản lý', 'Môi trường cạnh tranh và thử thách'],
            'C': ['Công việc có tính chất ổn định', 'Quy trình và tiêu chuẩn rõ ràng']
        };

        let result = [];
        topTendencies.forEach(([code]) => {
            if (natures[code]) {
                result.push(...natures[code]);
            }
        });

        return [...new Set(result)].slice(0, 4);
    }

    getPreferredActivities(topTendencies) {
        const activities = {
            'R': ['Lắp ráp và sửa chữa đồ vật', 'Hoạt động thể thao và ngoài trời', 'Làm việc với công cụ và máy móc'],
            'I': ['Đọc sách và nghiên cứu', 'Giải quyết câu đố và bài toán', 'Tham gia hội thảo khoa học'],
            'A': ['Vẽ, nhạc, và các hoạt động nghệ thuật', 'Viết lách và sáng tác', 'Tham gia triển lãm và biểu diễn'],
            'S': ['Hoạt động tình nguyện và từ thiện', 'Dạy học và hướng dẫn người khác', 'Tham gia hoạt động cộng đồng'],
            'E': ['Tổ chức sự kiện và hoạt động', 'Tham gia các cuộc thi và thử thách', 'Hoạt động kinh doanh và bán hàng'],
            'C': ['Sưu tập và phân loại', 'Hoạt động kế toán và quản lý', 'Tham gia các khóa học kỹ năng']
        };

        let result = [];
        topTendencies.forEach(([code]) => {
            if (activities[code]) {
                result.push(...activities[code]);
            }
        });

        return [...new Set(result)].slice(0, 6);
    }

    getLearningEnvironment(topTendencies) {
        const learning = {
            'R': ['Học thông qua thực hành', 'Phòng thí nghiệm và workshop'],
            'I': ['Học tự giác và nghiên cứu độc lập', 'Thư viện và không gian yên tĩnh'],
            'A': ['Học qua dự án sáng tạo', 'Studio và không gian mở'],
            'S': ['Học nhóm và thảo luận', 'Lớp học tương tác nhiều'],
            'E': ['Học qua thảo luận và tranh luận', 'Môi trường học cạnh tranh'],
            'C': ['Học có cấu trúc và bài bản', 'Lớp học truyền thống với quy tắc']
        };

        let result = [];
        topTendencies.forEach(([code]) => {
            if (learning[code]) {
                result.push(...learning[code]);
            }
        });

        return [...new Set(result)].slice(0, 4);
    }

    getRecreationActivities(topTendencies) {
        const recreation = {
            'R': ['Thể thao và hoạt động ngoài trời', 'Du lịch khám phá thiên nhiên'],
            'I': ['Đọc sách và xem phim tài liệu', 'Chơi game chiến thuật'],
            'A': ['Tham quan triển lãm nghệ thuật', 'Học các kỹ năng sáng tạo mới'],
            'S': ['Gặp gỡ bạn bè và gia đình', 'Tham gia hoạt động nhóm'],
            'E': ['Tham gia sự kiện và networking', 'Hoạt động thể thao đồng đội'],
            'C': ['Sưu tập và sắp xếp', 'Hoạt động thủ công và làm vườn']
        };

        let result = [];
        topTendencies.forEach(([code]) => {
            if (recreation[code]) {
                result.push(...recreation[code]);
            }
        });

        return [...new Set(result)].slice(0, 4);
    }

    // Helper methods
    getGroupName(code) {
        const names = {
            'R': 'Kỹ thuật',
            'I': 'Nghiên cứu',
            'A': 'Nghệ thuật',
            'S': 'Xã hội',
            'E': 'Quản lý',
            'C': 'Nghiệp vụ'
        };
        return names[code] || code;
    }

    getMaxScoreForGroup() {
        // Calculate max score based on total questions
        const totalQuestions = this.resultData.total_questions || 30;
        const questionsPerGroup = Math.ceil(totalQuestions / 6); // 6 Holland groups
        return questionsPerGroup * 2; // Each question max score is 2
    }

    getGroupDescription(code) {
        const descriptions = {
            'R': 'Thích làm việc với máy móc, công cụ và thế giới vật chất',
            'I': 'Thích quan sát, học hỏi, điều tra và giải quyết vấn đề',
            'A': 'Thích sáng tạo, độc đáo và thể hiện bản thân',
            'S': 'Thích giúp đỡ, dạy dỗ và phục vụ người khác',
            'E': 'Thích dẫn dắt, thuyết phục và quản lý',
            'C': 'Thích làm việc có tổ chức, chi tiết và theo quy trình'
        };
        return descriptions[code] || '';
    }

    getGroupFullDescription(code) {
        const descriptions = {
            'R': 'Nhóm tính cách Kỹ thuật thích làm việc với tay, máy móc, và các vật thể cụ thể. Họ thường thực tế, thẳng thắn và thích môi trường làm việc có cấu trúc.',
            'I': 'Nhóm tính cách Nghiên cứu thích quan sát, phân tích và giải quyết vấn đề. Họ có xu hướng tò mò, độc lập và thích làm việc một mình.',
            'A': 'Nhóm tính cách Nghệ thuật thích sáng tạo, độc đáo và có tính thẩm mỹ cao. Họ thường cảm xúc, trực quan và thích môi trường làm việc linh hoạt.',
            'S': 'Nhóm tính cách Xã hội thích giúp đỡ, dạy dỗ và chăm sóc người khác. Họ thường thân thiện, hợp tác và có khả năng giao tiếp tốt.',
            'E': 'Nhóm tính cách Quản lý thích lãnh đạo, thuyết phục và điều hành. Họ thường tự tin, năng động và hướng tới mục tiêu.',
            'C': 'Nhóm tính cách Nghiệp vụ thích làm việc có tổ chức, chi tiết và tuân thủ quy trình. Họ thường cẩn thận, đáng tin cậy và có tính kỷ luật cao.'
        };
        return descriptions[code] || '';
    }

    getGroupCharacteristics(code) {
        const characteristics = {
            'R': [
                'Thích làm việc với tay và máy móc',
                'Có khả năng kỹ thuật tốt',
                'Thực tế và logic',
                'Thích môi trường có cấu trúc'
            ],
            'I': [
                'Tò mò và thích khám phá',
                'Có khả năng phân tích tốt',
                'Thích làm việc độc lập',
                'Quan tâm đến lý thuyết và ý tưởng'
            ],
            'A': [
                'Sáng tạo và có tính thẩm mỹ',
                'Thích thể hiện bản thân',
                'Linh hoạt và độc đáo',
                'Cảm xúc và trực quan'
            ],
            'S': [
                'Quan tâm và giúp đỡ người khác',
                'Có khả năng giao tiếp tốt',
                'Hợp tác và thân thiện',
                'Thích làm việc nhóm'
            ],
            'E': [
                'Có khả năng lãnh đạo',
                'Tự tin và thuyết phục',
                'Hướng tới mục tiêu',
                'Thích thách thức và cạnh tranh'
            ],
            'C': [
                'Có tổ chức và chi tiết',
                'Đáng tin cậy và cẩn thận',
                'Thích quy trình rõ ràng',
                'Có kỷ luật và trách nhiệm'
            ]
        };
        return characteristics[code] || [];
    }

    getGroupColor(code) {
        const colors = {
            'R': 'linear-gradient(45deg, #e74c3c, #c0392b)',
            'I': 'linear-gradient(45deg, #3498db, #2980b9)',
            'A': 'linear-gradient(45deg, #9b59b6, #8e44ad)',
            'S': 'linear-gradient(45deg, #1abc9c, #16a085)',
            'E': 'linear-gradient(45deg, #f39c12, #e67e22)',
            'C': 'linear-gradient(45deg, #34495e, #2c3e50)'
        };
        return colors[code] || 'linear-gradient(45deg, #95a5a6, #7f8c8d)';
    }

    getGroupIcon(code) {
        // Use SVG icons from old project - based on old project mapping
        const icons = {
            'R': 'fa-cogs',        // Kỹ thuật (icon-kt.svg)
            'I': 'fa-microscope',  // Nghiên cứu (icon-nc.svg)
            'A': 'fa-palette',     // Nghệ thuật (icon-nt.svg)
            'S': 'fa-users',       // Xã hội (icon-xh.svg)
            'E': 'fa-crown',       // Quản lý (icon-ql.svg)
            'C': 'fa-clipboard-list' // Nghiệp vụ (icon-nv.svg)
        };
        return icons[code] || 'fa-question';
    }

    renderStarRating(score) {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= score) {
                stars.push('<i class="fas fa-star star"></i>');
            } else {
                stars.push('<i class="fas fa-star star empty"></i>');
            }
        }
        return stars.join('');
    }
}

// Check authentication and initialize
document.addEventListener('DOMContentLoaded', async function () {
    console.log('[Read Test Result Page] Checking authentication...');

    try {
        // Use authChecker to verify user is authenticated
        const user = await authChecker.handleProtectedPageAccess('read-test-result');

        if (user) {
            console.log('[Read Test Result Page] User authenticated:', user);

            // Initialize AOS
            AOS.init({
                duration: 1000,
                easing: 'ease-in-out',
                once: true,
                mirror: false
            });

            // Initialize Result Viewer
            new ResultViewer();
        }
        // If user is not authenticated, authChecker will handle redirection

    } catch (error) {
        console.error('[Read Test Result Page] Error during authentication check:', error);
        if (window.authChecker) {
            authChecker.showToast('Lỗi kiểm tra đăng nhập. Vui lòng thử lại', 'error');
        }
    }
});