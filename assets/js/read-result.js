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
                          <i class="fas fa-check text-pac-success me-2"></i>
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
        const careerAnalysis = this.resultData.career_analysis || {};

        // Debug: Log first job to see available fields
        if (jobs.length > 0) {
            console.log('📋 Sample job data:', jobs[0]);
            console.log('🔍 Available fields:', Object.keys(jobs[0]));
        }

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

        // Group jobs by star rating
        const jobsByRating = {
            5: jobs.filter(job => job.compatibility_score >= 5),
            4: jobs.filter(job => job.compatibility_score >= 4 && job.compatibility_score < 5),
            3: jobs.filter(job => job.compatibility_score >= 3 && job.compatibility_score < 4),
            2: jobs.filter(job => job.compatibility_score < 3)
        };

        console.log('📊 Jobs by rating:', {
            '5_star': jobsByRating[5].length,
            '4_star': jobsByRating[4].length, 
            '3_star': jobsByRating[3].length,
            '2_star': jobsByRating[2].length
        });

        // Display career analysis summary first
        const analysisHTML = careerAnalysis && Object.keys(careerAnalysis).length > 0 ? `
          <div class="career-analysis-summary mb-4">
            <div class="card border-primary">
              <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                  <i class="fas fa-chart-line me-2"></i>
                  Phân tích gợi ý nghề nghiệp
                </h5>
              </div>
              <div class="card-body">
                <div class="row text-center">
                  <div class="col-md-3">
                    <div class="stat-item">
                      <div class="stat-number text-primary">${careerAnalysis.total_jobs_analyzed || 0}</div>
                      <div class="stat-label">Nghề được phân tích</div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="stat-item">
                      <div class="stat-number text-pac-success">${jobsByRating[5].length}</div>
                      <div class="stat-label">Rất phù hợp (5⭐)</div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="stat-item">
                      <div class="stat-number text-info">${jobsByRating[4].length}</div>
                      <div class="stat-label">Phù hợp tốt (4⭐)</div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="stat-item">
                      <div class="stat-number text-secondary">${jobsByRating[3].length + jobsByRating[2].length}</div>
                      <div class="stat-label">Khác (≤3⭐)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : '';

        // Render jobs by tiers with progressive disclosure
        let jobsHTML = '';

        // 5-star jobs (always visible)
        if (jobsByRating[5].length > 0) {
            jobsHTML += `
              <div class="jobs-tier" data-tier="5">
                <div class="tier-header mb-3">
                  <h4 class="tier-title text-pac-success">
                    <i class="fas fa-star me-2"></i>
                    Nghề nghiệp rất phù hợp (${jobsByRating[5].length} nghề)
                  </h4>
                  <p class="text-muted">Những nghề nghiệp hoàn hảo phù hợp với tính cách của bạn</p>
                </div>
                <div class="row" id="jobs-tier-5">
                  ${this.renderJobCards(jobsByRating[5])}
                </div>
              </div>
            `;
        }

        // 4-star jobs (initially hidden)
        if (jobsByRating[4].length > 0) {
            jobsHTML += `
              <div class="jobs-tier" data-tier="4" style="display: none;">
                <div class="tier-header mb-3">
                  <h4 class="tier-title text-primary">
                    <i class="fas fa-thumbs-up me-2"></i>
                    Nghề nghiệp phù hợp tốt (${jobsByRating[4].length} nghề)
                  </h4>
                  <p class="text-muted">Những nghề nghiệp có nhiều điểm tương đồng với tính cách của bạn</p>
                </div>
                <div class="row" id="jobs-tier-4">
                  ${this.renderJobCards(jobsByRating[4])}
                </div>
              </div>
            `;
        }

        // 3 & 2-star jobs (initially hidden)
        const lowerTierJobs = [...jobsByRating[3], ...jobsByRating[2]];
        if (lowerTierJobs.length > 0) {
            jobsHTML += `
              <div class="jobs-tier" data-tier="3-2" style="display: none;">
                <div class="tier-header mb-3">
                  <h4 class="tier-title text-info">
                    <i class="fas fa-check me-2"></i>
                    Nghề nghiệp khác có tiềm năng (${lowerTierJobs.length} nghề)
                  </h4>
                  <p class="text-muted">Những nghề nghiệp có thể phù hợp sau khi phát triển thêm kỹ năng</p>
                </div>
                <div class="row" id="jobs-tier-3-2">
                  ${this.renderJobCards(lowerTierJobs)}
                </div>
              </div>
            `;
        }

        // Show more buttons
        let showMoreButtons = '';
        if (jobsByRating[4].length > 0) {
            showMoreButtons += `
              <div class="text-center my-4" id="show-more-4-star">
                <button class="btn btn-outline-primary btn-lg" onclick="window.resultViewer.showMoreJobs('4')">
                  <i class="fas fa-chevron-down me-2"></i>
                  Xem thêm nghề phù hợp tốt (${jobsByRating[4].length} nghề)
                </button>
              </div>
            `;
        }
        
        if (lowerTierJobs.length > 0) {
            showMoreButtons += `
              <div class="text-center my-4" id="show-more-3-2-star" style="display: none;">
                <button class="btn btn-outline-secondary btn-lg" onclick="window.resultViewer.showMoreJobs('3-2')">
                  <i class="fas fa-chevron-down me-2"></i>
                  Xem thêm nghề khác (${lowerTierJobs.length} nghề)
                </button>
              </div>
            `;
        }

        container.innerHTML = analysisHTML + jobsHTML + showMoreButtons;
        
        // Add custom styles for enhanced job cards
        this.addJobCardStyles();
        
        // Setup collapse functionality
        this.setupJobCardCollapse();
        
        // Make this instance globally accessible for buttons
        window.resultViewer = this;
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

    renderJobCards(jobs) {
        return jobs.map((job, index) => {
          // Normalize compatibility score to 0-5 scale for consistent stars/display
          const displayScore = this.normalizeCompatibilityScore(job.compatibility_score);
          return `
          <div class="col-12 mb-4" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="job-card h-100">
              <div class="job-header">
                <div class="d-flex justify-content-between align-items-start mb-3">
                  <div class="job-title-section">
                    <h5 class="mb-1 text-brand-primary">${job.job_name || job.job_title || 'Tên nghề'}</h5>
                    ${job.job_name_en ? `
                      <small class="text-muted fst-italic">${job.job_name_en}</small>
                    ` : ''}
                  </div>
                  <div class="job-badges">
                    ${displayScore >= 5 ? `
                      <span class="badge bg-brand-primary me-1">
                        <i class="fas fa-star me-1"></i>Rất phù hợp
                      </span>
                    ` : displayScore >= 4 ? `
                      <span class="badge bg-brand-secondary me-1">
                        <i class="fas fa-thumbs-up me-1"></i>Phù hợp tốt
                      </span>
                    ` : `
                      <span class="badge secondary me-1">
                        <i class="fas fa-check me-1"></i>Có tiềm năng
                      </span>
                    `}
                    ${job.job_group ? `
                      <span class="badge bg-brand-secondary ms-1" title="Nhóm nghề">
                        <i class="fas fa-layer-group me-1"></i>${job.job_group}
                      </span>
                    ` : ''}
                  </div>
                </div>
                
                <div class="compatibility-section mb-3">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="compatibility-label fw-semibold text-brand-secondary">Độ phù hợp:</span>
                    <div class="compatibility-rating">
                      ${this.renderStarRating(displayScore)}
                      <span class="ms-2 fw-bold score">${displayScore}/5</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Job Description -->
              <div class="job-description mb-3">
                <p class="text-muted mb-2 lh-sm">
                  ${job.job_description || job.description || 'Mô tả nghề nghiệp'}
                </p>
              </div>
              
              <!-- Collapsible Sections -->
              
              <!-- Abilities Section - Collapsible -->
              ${job.capacity || job.essential_ability || job.supplementary_ability ? `
              <div class="collapsible-section mb-3">
                <div class="section-toggle" data-bs-toggle="collapse" data-bs-target="#abilities-${job.id || index}" aria-expanded="false">
                  <div class="section-title">
                    <span>
                      <i class="fas fa-user-graduate me-2"></i>
                      <strong>Năng lực cần thiết</strong>
                    </span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                  </div>
                </div>
                <div class="collapse" id="abilities-${job.id || index}">
                  <div class="abilities-section mt-2">
                    <div class="abilities-grid">
                      ${job.capacity ? `
                        <div class="ability-item capacity-item">
                          <div class="ability-icon">
                            <i class="fas fa-user-graduate"></i>
                          </div>
                          <div class="ability-content">
                            <div class="ability-label">Năng lực tổng thể</div>
                            <div class="ability-value">${job.capacity}</div>
                          </div>
                        </div>
                      ` : ''}
                      
                      ${job.essential_ability ? `
                        <div class="ability-item essential-item">
                          <div class="ability-icon">
                            <i class="fas fa-star"></i>
                          </div>
                          <div class="ability-content">
                            <div class="ability-label">Năng lực cốt lõi</div>
                            <div class="ability-value">${job.essential_ability}</div>
                          </div>
                        </div>
                      ` : ''}
                      
                      ${job.supplementary_ability ? `
                        <div class="ability-item supplementary-item">
                          <div class="ability-icon">
                            <i class="fas fa-plus-circle"></i>
                          </div>
                          <div class="ability-content">
                            <div class="ability-label">Năng lực bổ trợ</div>
                            <div class="ability-value">${job.supplementary_ability}</div>
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              </div>
              ` : ''}
              
              <!-- Education & Activity Requirements -->
              <div class="requirements-section mb-3">
                <div class="req-grid">
                  <div class="req-item">
                    <div class="req-icon">
                      <i class="fas fa-graduation-cap"></i>
                    </div>
                    <div class="req-content">
                      <strong>Học vấn:</strong>
                      <span>${job.education_level ? this.getEducationLevelText(job.education_level) : 'Linh hoạt'}</span>
                    </div>
                  </div>
                  
                  ${job.activities_code ? `
                    <div class="req-item">
                      <div class="req-icon">
                        <i class="fas fa-tasks"></i>
                      </div>
                      <div class="req-content">
                        <strong>Hoạt động:</strong>
                        <span>${job.activities_code}</span>
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Work Environment & Areas - Collapsible -->
              ${job.work_environment || job.work_areas ? `
                <div class="collapsible-section mb-3">
                  <div class="section-toggle" data-bs-toggle="collapse" data-bs-target="#environment-${job.id || index}" aria-expanded="false">
                    <div class="section-title">
                      <span>
                        <i class="fas fa-building me-2"></i>
                        <strong>Môi trường & Nơi làm việc</strong>
                      </span>
                      <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                  </div>
                  <div class="collapse" id="environment-${job.id || index}">
                    <div class="environment-content mt-2">
                      ${job.work_environment ? `
                        <div class="environment-description mb-2">
                          <span class="fw-semibold text-brand-primary">Môi trường:</span>
                          <span class="text-muted">${job.work_environment}</span>
                        </div>
                      ` : ''}
                      
                      ${job.work_areas ? `
                        <div class="work-locations">
                          <span class="fw-semibold text-brand-secondary d-block mb-1">Nơi làm việc chủ yếu:</span>
                          <div class="locations-list">
                            ${this.parseJsonArray(job.work_areas).map(area => `
                              <div class="location-item">
                                <i class="fas fa-map-marker-alt me-1"></i>
                                <span>${area}</span>
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              ` : ''}
              
              <!-- Work Style & Values - Collapsible -->
              ${job.work_style || job.work_value ? `
                <div class="collapsible-section mb-3">
                  <div class="section-toggle" data-bs-toggle="collapse" data-bs-target="#characteristics-${job.id || index}" aria-expanded="false">
                    <div class="section-title">
                      <span>
                        <i class="fas fa-user-cog me-2"></i>
                        <strong>Phong cách & Giá trị làm việc</strong>
                      </span>
                      <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                  </div>
                  <div class="collapse" id="characteristics-${job.id || index}">
                    <div class="characteristics-grid mt-2">
                      ${job.work_style ? `
                        <div class="characteristic-item">
                          <div class="char-header">
                            <i class="fas fa-user-cog me-1"></i>
                            <h6 class="mb-0">Phong cách làm việc</h6>
                          </div>
                          <div class="char-content text-muted">
                            ${job.work_style}
                          </div>
                        </div>
                      ` : ''}
                      
                      ${job.work_value ? `
                        <div class="characteristic-item">
                          <div class="char-header">
                            <i class="fas fa-heart me-1"></i>
                            <h6 class="mb-0">Giá trị làm việc</h6>
                          </div>
                          <div class="char-content text-muted">
                            ${job.work_value}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              ` : ''}
              
              <!-- Specializations - Collapsible -->
              ${job.specializations ? `
                <div class="collapsible-section mb-3">
                  <div class="section-toggle" data-bs-toggle="collapse" data-bs-target="#specializations-${job.id || index}" aria-expanded="false">
                    <div class="section-title">
                      <span>
                        <i class="fas fa-star-of-life me-2"></i>
                        <strong>Chuyên môn chi tiết</strong>
                      </span>
                      <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                  </div>
                  <div class="collapse" id="specializations-${job.id || index}">
                    <div class="specializations-content mt-2">
                      ${this.parseJsonArray(job.specializations).map((spec, specIndex) => `
                        <div class="spec-item">
                          <div class="spec-number">${specIndex + 1}</div>
                          <div class="spec-text">${spec}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              ` : ''}
              
              <!-- Main Tasks - Collapsible -->
              ${job.main_tasks ? `
                <div class="collapsible-section mb-3">
                  <div class="section-toggle" data-bs-toggle="collapse" data-bs-target="#tasks-${job.id || index}" aria-expanded="false">
                    <div class="section-title">
                      <span>
                        <i class="fas fa-clipboard-list me-2"></i>
                        <strong>Nhiệm vụ chính</strong>
                      </span>
                      <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                  </div>
                  <div class="collapse" id="tasks-${job.id || index}">
                    <div class="tasks-content mt-2">
                      ${this.parseJsonArray(job.main_tasks).map((task, taskIndex) => `
                        <div class="task-item">
                          <div class="task-marker">
                            <i class="fas fa-check"></i>
                          </div>
                          <div class="task-text">${task}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        }).join('');
    }

    showMoreJobs(tier) {
        if (tier === '4') {
            // Show 4-star jobs
            document.querySelector('[data-tier="4"]').style.display = 'block';
            document.getElementById('show-more-4-star').style.display = 'none';
            document.getElementById('show-more-3-2-star').style.display = 'block';
        } else if (tier === '3-2') {
            // Show 3 & 2-star jobs
            document.querySelector('[data-tier="3-2"]').style.display = 'block';
            document.getElementById('show-more-3-2-star').style.display = 'none';
        }
        
        // Add smooth scroll to new content
        setTimeout(() => {
            const targetElement = document.querySelector(`[data-tier="${tier}"]`);
            if (targetElement) {
                targetElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 100);
    }

    setupJobCardCollapse() {
        // Add event listeners for collapsible sections
        document.addEventListener('click', function(e) {
            if (e.target.closest('.section-toggle')) {
                const toggle = e.target.closest('.section-toggle');
                const icon = toggle.querySelector('.toggle-icon');
                const target = toggle.getAttribute('data-bs-target');
                
                // Toggle icon rotation
                setTimeout(() => {
                    const collapseElement = document.querySelector(target);
                    if (collapseElement && collapseElement.classList.contains('show')) {
                        icon.style.transform = 'rotate(180deg)';
                    } else {
                        icon.style.transform = 'rotate(0deg)';
                    }
                }, 10);
            }
        });
    }

    parseJsonArray(jsonString) {
        if (!jsonString) return [];
        try {
            // Handle both string and array inputs
            if (Array.isArray(jsonString)) {
                return jsonString;
            }
            
            if (typeof jsonString === 'string') {
                // Try to parse as JSON array
                if (jsonString.startsWith('[') && jsonString.endsWith(']')) {
                    return JSON.parse(jsonString);
                }
                // Split by common delimiters if not JSON format
                return jsonString.split(/[,;|]/).map(item => item.trim()).filter(item => item.length > 0);
            }
            
            return [];
        } catch (error) {
            console.warn('Failed to parse JSON array:', error);
            // Fallback to string splitting
            return typeof jsonString === 'string' 
                ? jsonString.split(',').map(item => item.trim()).filter(item => item.length > 0)
                : [];
        }
    }

    getEducationLevelText(level) {
    // Normalize input to support numbers, numeric-strings, percent or textual codes
    if (level === null || level === undefined || level === '') return 'Không yêu cầu';

    // If it's a number-like value, try to parse integer first
    let raw = level;
    if (typeof raw === 'string') raw = raw.trim();

    const asInt = parseInt(raw, 10);
    if (!isNaN(asInt) && asInt >= 1 && asInt <= 5) {
      const map = {
        1: 'Tiểu học',
        2: 'Trung học cơ sở',
        3: 'Trung học phổ thông',
        4: 'Trung cấp / Cao đẳng',
        5: 'Đại học trở lên'
      };
      return map[asInt];
    }

    // Lowercase textual mappings
    const text = (typeof raw === 'string') ? raw.toLowerCase() : '';
    const textMap = {
      'high_school': 'Trung học phổ thông',
      'vocational': 'Trung cấp nghề',
      'college': 'Cao đẳng',
      'university': 'Đại học',
      'master': 'Thạc sĩ',
      'phd': 'Tiến sĩ',
      'tiểu học': 'Tiểu học',
      'trung học cơ sở': 'Trung học cơ sở',
      'trung học phổ thông': 'Trung học phổ thông',
      'trung cấp': 'Trung cấp / Cao đẳng',
      'cao đẳng': 'Cao đẳng',
      'đại học': 'Đại học trở lên'
    };

    if (text && textMap[text]) return textMap[text];

    // If nothing matches, fallback to original mapping where numeric keys might be strings
    const fallback = {
      '1': 'Tiểu học',
      '2': 'Trung học cơ sở',
      '3': 'Trung học phổ thông',
      '4': 'Trung cấp / Cao đẳng',
      '5': 'Đại học trở lên'
    };

    if (fallback[String(level)]) return fallback[String(level)];

    // Last resort: return the provided value as-is (trimmed) or 'Không yêu cầu'
    if (typeof level === 'string' && level.trim().length > 0) return level.trim();
    return 'Không yêu cầu';
    }

    addJobCardStyles() {
        const styleId = 'enhanced-job-cards-styles';
        const cacheBuster = Date.now();
        
        // Remove existing styles to prevent duplicates
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }

        const css = `
            /* Enhanced PAC Job Cards Styles v${cacheBuster} */
            .job-card {
                background: #fff;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(150, 75, 223, 0.08);
                border: 1px solid rgba(150, 75, 223, 0.1);
                padding: 2rem;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(10px);
            }

            .job-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(150, 75, 223, 0.15);
                border-color: var(--brand-primary, #964bdf);
            }

            .job-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, var(--brand-primary, #964bdf), var(--brand-accent, #fff200));
                opacity: 0;
                transition: opacity 0.4s ease;
            }

            .job-card:hover::before {
                opacity: 1;
            }

            .job-card::after {
                content: '';
                position: absolute;
                top: -50%;
                right: -50%;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(150, 75, 223, 0.03) 0%, transparent 70%);
                opacity: 0;
                transition: opacity 0.4s ease;
                pointer-events: none;
            }

            .job-card:hover::after {
                opacity: 1;
            }

            /* Job Header Styles with PAC Branding */
            .job-title-section h5 {
                color: var(--brand-secondary, #5d2e8b);
                font-weight: 700;
                line-height: 1.3;
                margin-bottom: 0.75rem;
                background: linear-gradient(135deg, var(--brand-primary, #964bdf), var(--brand-secondary, #5d2e8b));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .job-badges .badge {
                font-size: 0.75rem;
                padding: 0.5rem 1rem;
                border-radius: 25px;
                font-weight: 600;
                background: linear-gradient(135deg, var(--brand-primary, #964bdf), var(--brand-secondary, #5d2e8b));
                color: white;
                border: none;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .job-badges .badge.secondary {
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.1), rgba(93, 46, 139, 0.1));
                color: var(--brand-primary, #964bdf);
                border: 1px solid rgba(150, 75, 223, 0.2);
            }

            /* Compatibility Rating with PAC Colors */
            .compatibility-section {
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.05), rgba(255, 242, 0, 0.05));
                border-radius: 12px;
                padding: 1rem;
                border-left: 4px solid var(--brand-primary, #964bdf);
                margin: 1rem 0;
            }

            .compatibility-rating .fas.fa-star,
            .compatibility-rating .far.fa-star {
                margin-right: 3px;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
                font-size: 1.1rem;
                transition: all 0.3s ease;
            }

            /* Filled stars (yellow) */
            .compatibility-rating .fas.fa-star {
                color: var(--brand-accent, #fff200);
            }

            /* Empty stars (gray) */
            .compatibility-rating .far.fa-star {
                color: #dee2e6;
            }

            .compatibility-rating .score {
                font-weight: 700;
                color: var(--brand-primary, #964bdf);
                font-size: 1.1rem;
            }

            /* Job Description */
            .job-description p {
                font-size: 0.95rem;
                line-height: 1.6;
                margin-bottom: 0;
                color: #495057;
            }

            /* Collapsible Sections with PAC Styling */
            .collapsible-section {
                border: 1px solid rgba(150, 75, 223, 0.15);
                border-radius: 12px;
                overflow: hidden;
                transition: all 0.3s ease;
                margin-bottom: 1rem;
                background: rgba(150, 75, 223, 0.02);
            }

            .collapsible-section:hover {
                border-color: rgba(150, 75, 223, 0.3);
                box-shadow: 0 2px 8px rgba(150, 75, 223, 0.1);
            }

            .section-toggle {
                padding: 1rem 1.25rem;
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.08), rgba(93, 46, 139, 0.08));
                cursor: pointer;
                transition: all 0.3s ease;
                border: none;
                width: 100%;
                text-align: left;
            }

            .section-toggle:hover {
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.12), rgba(93, 46, 139, 0.12));
            }

            .section-toggle.expanded {
                background: linear-gradient(135deg, var(--brand-primary, #964bdf), var(--brand-secondary, #5d2e8b));
                color: white;
            }

            .section-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: 600;
                color: var(--brand-secondary, #5d2e8b);
                font-size: 0.95rem;
            }

            .section-toggle.expanded .section-title {
                color: white;
            }

            .toggle-icon {
                transition: transform 0.3s ease;
                color: var(--brand-primary, #964bdf);
                font-size: 1.1rem;
            }

            .section-toggle.expanded .toggle-icon {
                transform: rotate(180deg);
                color: white;
            }

            .collapse {
                border-top: 1px solid rgba(150, 75, 223, 0.15);
                background: white;
            }

            .collapse .mt-2 {
                padding: 1.25rem;
            }

            /* Abilities Grid with PAC Design */
            .abilities-grid {
                display: grid;
                gap: 1rem;
            }

            .ability-item {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                padding: 1rem;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(150, 75, 223, 0.02));
                border-radius: 12px;
                border: 1px solid rgba(150, 75, 223, 0.1);
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            }

            .ability-item:hover {
                border-color: var(--brand-primary, #964bdf);
                box-shadow: 0 4px 16px rgba(150, 75, 223, 0.15);
                transform: translateY(-1px);
            }

            .ability-icon {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                background: linear-gradient(135deg, var(--brand-primary, #964bdf), var(--brand-secondary, #5d2e8b));
                color: white;
                font-size: 1.1rem;
            }

            .ability-content {
                flex: 1;
            }

            .ability-label {
                font-weight: 700;
                color: var(--brand-secondary, #5d2e8b);
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .ability-value {
                color: #495057;
                font-size: 0.9rem;
                line-height: 1.5;
            }

            /* Requirements Section with PAC Theme */
            .req-grid {
                display: grid;
                gap: 1rem;
            }

            .req-item {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.75rem;
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.03), rgba(255, 242, 0, 0.03));
                border-radius: 8px;
                border-left: 3px solid var(--brand-accent, #fff200);
            }

            .req-icon {
                flex-shrink: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--brand-accent, #fff200);
                color: var(--brand-secondary, #5d2e8b);
                border-radius: 6px;
                font-weight: 700;
            }

            /* Work Locations */
            .locations-list {
                display: grid;
                gap: 0.75rem;
                max-height: none;
            }

            .location-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.05), rgba(255, 242, 0, 0.05));
                border-radius: 10px;
                font-size: 0.9rem;
                border: 1px solid rgba(150, 75, 223, 0.1);
                transition: all 0.3s ease;
            }

            .location-item:hover {
                border-color: var(--brand-primary, #964bdf);
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.08), rgba(255, 242, 0, 0.08));
                transform: translateX(4px);
            }

            .location-item i {
                color: var(--brand-primary, #964bdf);
                font-size: 1rem;
            }

            /* Characteristics Grid */
            .characteristics-grid {
                display: grid;
                gap: 1.25rem;
            }

            .characteristic-item {
                padding: 1.25rem;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(150, 75, 223, 0.02));
                border-radius: 12px;
                border: 1px solid rgba(150, 75, 223, 0.1);
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            }

            .characteristic-item:hover {
                border-color: var(--brand-primary, #964bdf);
                box-shadow: 0 4px 16px rgba(150, 75, 223, 0.12);
                transform: translateY(-2px);
            }

            .char-header {
                display: flex;
                align-items: center;
                margin-bottom: 0.75rem;
            }

            .char-header i {
                color: var(--brand-primary, #964bdf);
                margin-right: 0.75rem;
                font-size: 1.2rem;
            }

            .char-header h6 {
                color: var(--brand-secondary, #5d2e8b);
                font-weight: 700;
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .char-content {
                font-size: 0.95rem;
                line-height: 1.6;
                color: #495057;
            }

            /* Specializations with Enhanced Design */
            .specializations-content {
                display: grid;
                gap: 0.75rem;
            }

            .spec-item {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                padding: 0.75rem 0;
                border-bottom: 1px solid rgba(150, 75, 223, 0.1);
            }

            .spec-item:last-child {
                border-bottom: none;
            }

            .spec-number {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, var(--brand-primary, #964bdf), var(--brand-secondary, #5d2e8b));
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.85rem;
                font-weight: 700;
                box-shadow: 0 2px 8px rgba(150, 75, 223, 0.3);
            }

            .spec-text {
                color: #495057;
                font-size: 0.95rem;
                line-height: 1.5;
                flex: 1;
            }

            /* Tasks with PAC Branding */
            .tasks-content {
                display: grid;
                gap: 1rem;
            }

            .task-item {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                padding: 1rem;
                background: linear-gradient(135deg, rgba(255, 242, 0, 0.05), rgba(150, 75, 223, 0.05));
                border-radius: 12px;
                border-left: 4px solid var(--brand-accent, #fff200);
                transition: all 0.3s ease;
            }

            .task-item:hover {
                background: linear-gradient(135deg, rgba(255, 242, 0, 0.08), rgba(150, 75, 223, 0.08));
                transform: translateX(4px);
                box-shadow: 0 2px 8px rgba(150, 75, 223, 0.1);
            }

            .task-marker {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--brand-accent, #fff200);
                color: var(--brand-secondary, #5d2e8b);
                border-radius: 50%;
                font-weight: 700;
            }

            .task-text {
                color: #495057;
                font-size: 0.95rem;
                line-height: 1.5;
                flex: 1;
            }

            /* Jobs Tier Sections with PAC Design */
            .jobs-tier {
                margin-bottom: 3rem;
            }

            .tier-header {
                text-align: left;
                margin-bottom: 2rem;
                padding: 1.5rem;
                background: linear-gradient(135deg, var(--brand-primary, #964bdf), var(--brand-secondary, #5d2e8b));
                border-radius: 16px;
                color: white;
                position: relative;
                overflow: hidden;
                /* Enhanced text readability */
                box-shadow: 0 6px 20px rgba(150, 75, 223, 0.3);
            }

            .tier-header::before {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                width: 80px;
                height: 80px;
                background: radial-gradient(circle, rgba(255, 242, 0, 0.15) 0%, transparent 70%);
                border-radius: 50%;
                transform: translate(25%, -25%);
                z-index: 1;
            }

            .tier-header h4 {
                color: white;
                font-weight: 800;
                margin-bottom: 0.5rem;
                font-size: 1.4rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                /* Enhanced text visibility */
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                position: relative;
                z-index: 2;
            }

            .tier-header p {
                color: white;
                margin: 0;
                font-size: 1rem;
                font-weight: 500;
                /* Enhanced text visibility */
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
                opacity: 0.95;
                position: relative;
                z-index: 2;
            }

            .tier-header .star-rating {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 1rem;
                position: relative;
                z-index: 2;
            }

            .tier-header .star-rating .fas.fa-star,
            .tier-header .star-rating .far.fa-star {
                font-size: 1.3rem;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
                margin-right: 3px;
                transition: transform 0.2s ease;
            }

            .tier-header .star-rating .fas.fa-star {
                color: var(--brand-accent, #fff200);
                text-shadow: 0 1px 3px rgba(0,0,0,0.5);
            }

            .tier-header .star-rating .far.fa-star {
                color: rgba(255, 255, 255, 0.6);
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }

            .tier-header .star-rating .fas.fa-star:hover {
                transform: scale(1.1);
            }

            /* Show More Buttons */
            .show-more-btn {
                display: block;
                width: 100%;
                max-width: 400px;
                margin: 2rem auto;
                padding: 1rem 2rem;
                background: linear-gradient(135deg, rgba(150, 75, 223, 0.1), rgba(255, 242, 0, 0.1));
                border: 2px solid var(--brand-primary, #964bdf);
                border-radius: 50px;
                color: var(--brand-primary, #964bdf);
                font-weight: 700;
                font-size: 1rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                position: relative;
                overflow: hidden;
            }

            .show-more-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                transition: left 0.6s ease;
            }

            .show-more-btn:hover::before {
                left: 100%;
            }

            .show-more-btn:hover {
                background: linear-gradient(135deg, var(--brand-primary, #964bdf), var(--brand-secondary, #5d2e8b));
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(150, 75, 223, 0.3);
            }

            .show-more-btn i {
                margin-left: 0.75rem;
                transition: transform 0.3s ease;
            }

            .show-more-btn:hover i {
                transform: translateX(4px);
            }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                .job-card {
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .tier-header {
                    padding: 1.25rem;
                    margin-bottom: 1.5rem;
                }

                .tier-header::before {
                    width: 60px;
                    height: 60px;
                }

                .tier-header h4 {
                    font-size: 1.2rem;
                    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
                }

                .tier-header p {
                    font-size: 0.9rem;
                    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
                }

                .tier-header .star-rating .fas.fa-star,
                .tier-header .star-rating .far.fa-star {
                    font-size: 1.1rem;
                }

                .ability-item {
                    padding: 0.75rem;
                }

                .ability-icon {
                    width: 36px;
                    height: 36px;
                }

                .characteristic-item {
                    padding: 1rem;
                }

                .show-more-btn {
                    font-size: 0.9rem;
                    padding: 0.875rem 1.5rem;
                }
            }

            /* Custom Text Colors for Better Visibility */
            .text-pac-success {
                color: #10b981 !important; /* Bright green, more visible than Bootstrap's text-success */
            }

            .text-pac-success:hover {
                color: #059669 !important; /* Darker green on hover */
            }

            /* Enhanced Animations */
            @keyframes pac-glow {
                0%, 100% { box-shadow: 0 4px 20px rgba(150, 75, 223, 0.15); }
                50% { box-shadow: 0 8px 30px rgba(150, 75, 223, 0.25); }
            }

            .job-card:hover {
                animation: pac-glow 2s ease-in-out infinite;
            }

            @keyframes pac-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            .ability-icon:hover {
                animation: pac-pulse 0.6s ease-in-out;
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }

  // Normalize raw compatibility score into 0-5 scale (supports 0-5, 0-10, 0-100 inputs)
  normalizeCompatibilityScore(score) {
    const n = Number(score);
    if (isNaN(n)) return 3; // default

    // If already in 0-5 range
    if (n >= 0 && n <= 5) {
      // Round to one decimal for display consistency
      return Math.round(n * 10) / 10;
    }

    // If it's 0-10 scale, convert to 0-5
    if (n > 5 && n <= 10) {
      return Math.round((n / 2) * 10) / 10;
    }

    // If it's 0-100 percent scale, convert to 0-5
    if (n > 10) {
      const scaled = (n / 100) * 5;
      return Math.round(Math.max(0, Math.min(5, scaled)) * 10) / 10;
    }

    return Math.round(Math.max(0, Math.min(5, n)) * 10) / 10;
  }

  renderStarRating(score) {
        const stars = [];
        // Convert score to number and ensure it's between 0 and 5
        const numericScore = Math.max(0, Math.min(5, Number(score) || 0));
        
        for (let i = 1; i <= 5; i++) {
            if (i <= numericScore) {
                // Filled star (bright yellow)
                stars.push('<i class="fas fa-star" style="color: var(--brand-accent, #fff200);"></i>');
            } else {
                // Empty star (gray)
                stars.push('<i class="far fa-star" style="color: #dee2e6;"></i>');
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