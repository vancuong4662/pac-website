/**
 * PAC Services Data Management
 * Manages career guidance and courses data for the new service-oriented pages
 */

// Career guidance services data (for solution.html)
const careerGuidanceServices = [
    {
        id: 'career_test_mbti',
        title: 'Test Trắc Nghiệm Tính Cách',
        description: 'Đánh giá toàn diện về tính cách, sở thích và khả năng của bạn thông qua các bài test khoa học được chuẩn hóa quốc tế.',
        icon: 'fas fa-brain',
        image_url: 'assets/img/pic/career-test-mbti.jpg',
        features: [
            'Test tính cách MBTI chuyên sâu',
            'Đánh giá 16 kiểu tính cách',
            'Phân tích điểm mạnh và điểm yếu',
            'Báo cáo chi tiết 20+ trang'
        ],
        price: 299000,
        duration: '45 phút',
        type: 'consultation',
        consultation_type: 'automated',
        package_type: 'basic',
        category: 'assessment'
    },
    {
        id: 'career_orientation_test',
        title: 'Test Định Hướng Nghề Nghiệp',
        description: 'Khám phá những ngành nghề phù hợp nhất với bạn dựa trên năng lực, sở thích và giá trị cá nhân.',
        icon: 'fas fa-compass',
        image_url: 'assets/img/pic/career-orientation.jpg',
        features: [
            'Test Holland Code (RIASEC)',
            'Đánh giá 6 nhóm nghề nghiệp',
            'Danh sách nghề nghiệp phù hợp',
            'Lộ trình phát triển sự nghiệp'
        ],
        price: 399000,
        duration: '60 phút',
        type: 'consultation',
        consultation_type: 'automated',
        package_type: 'premium',
        category: 'assessment'
    },
    {
        id: 'personal_consultation',
        title: 'Tư Vấn Cá Nhân 1-1',
        description: 'Buổi tư vấn trực tiếp với chuyên gia để giải đáp thắc mắc và xây dựng kế hoạch phát triển cá nhân.',
        icon: 'fas fa-user-tie',
        image_url: 'assets/img/pic/personal-consultation.jpg',
        features: [
            'Tư vấn trực tiếp 60 phút',
            'Chuyên gia 10+ năm kinh nghiệm',
            'Kế hoạch hành động cụ thể',
            'Hỗ trợ theo dõi sau tư vấn'
        ],
        price: 799000,
        duration: '60 phút',
        type: 'consultation',
        consultation_type: 'expert',
        package_type: 'premium',
        category: 'consultation'
    },
    {
        id: 'academic_consultation',
        title: 'Tư Vấn Chọn Ngành Học',
        description: 'Hỗ trợ học sinh lựa chọn ngành học phù hợp với năng lực và định hướng nghề nghiệp trong tương lai.',
        icon: 'fas fa-graduation-cap',
        image_url: 'assets/img/pic/academic-consultation.jpg',
        features: [
            'Phân tích khả năng học tập',
            'Tư vấn chọn trường và ngành',
            'Thông tin thị trường lao động',
            'Lộ trình học tập chi tiết'
        ],
        price: 599000,
        duration: '45 phút',
        type: 'consultation',
        consultation_type: 'expert',
        package_type: 'basic',
        category: 'consultation'
    }
];

// Courses data (for courses.html)
const coursesData = [
    {
        id: 'essay_enhancement',
        title: 'Viết luận tăng cường - Essay Enhancement',
        description: 'Hướng dẫn các kỹ thuật viết bài luận học thuật ở các bậc học với phương pháp hiện đại và hiệu quả.',
        image_url: 'assets/img/pic/2.png',
        duration: '16 giờ',
        level: 'Trung cấp',
        category: 'writing',
        price: 1299000,
        features: [
            'Cấu trúc bài luận chuyên nghiệp',
            'Kỹ thuật lập luận logic',
            'Sử dụng từ vựng học thuật',
            'Chỉnh sửa và hoàn thiện bài viết'
        ],
        type: 'course',
        instructor: 'ThS. Nguyễn Văn A',
        rating: 4.8,
        students: 120
    },
    {
        id: 'essay_coaching',
        title: 'Viết luận chuyên sâu – Essay Coaching',
        description: 'Hướng dẫn hoàn chỉnh 01 bài luận có độ dài 500-1000 từ theo ý tưởng và chủ đề học sinh tự chọn.',
        image_url: 'assets/img/pic/1.jpg',
        duration: '10 giờ',
        level: 'Nâng cao',
        category: 'writing',
        price: 899000,
        features: [
            'Phát triển ý tưởng sáng tạo',
            'Hướng dẫn cá nhân hóa 1-1',
            'Feedback chi tiết từ chuyên gia',
            'Bài luận hoàn chỉnh chất lượng cao'
        ],
        type: 'course',
        instructor: 'ThS. Trần Thị B',
        rating: 4.9,
        students: 89
    },
    {
        id: 'cv_interview_skills',
        title: 'Xây dựng CV và Kỹ năng Phỏng vấn',
        description: 'Hướng dẫn học sinh cách thức để có buổi phỏng vấn thành công và gây ấn tượng với nhà tuyển dụng.',
        image_url: 'assets/img/pic/3.png',
        duration: '8 giờ',
        level: 'Cơ bản',
        category: 'career',
        price: 699000,
        features: [
            'Thiết kế CV chuyên nghiệp',
            'Kỹ thuật trả lời phỏng vấn',
            'Thực hành phỏng vấn mô phỏng',
            'Tự tin giao tiếp trong phỏng vấn'
        ],
        type: 'course',
        instructor: 'ThS. Lê Văn C',
        rating: 4.7,
        students: 156
    },
    {
        id: 'communication_skills',
        title: 'Kỹ năng Giao tiếp và Thuyết trình',
        description: 'Phát triển khả năng giao tiếp hiệu quả và kỹ năng thuyết trình chuyên nghiệp trong môi trường học tập và làm việc.',
        image_url: 'assets/img/pic/2.png',
        duration: '12 giờ',
        level: 'Trung cấp',
        category: 'skills',
        price: 999000,
        features: [
            'Kỹ thuật giao tiếp hiệu quả',
            'Thiết kế slide thuyết trình',
            'Quản lý lo lắng khi nói trước đám đông',
            'Thực hành thuyết trình thực tế'
        ],
        type: 'course',
        instructor: 'TS. Phạm Thị D',
        rating: 4.8,
        students: 203
    },
    {
        id: 'study_methods',
        title: 'Phương pháp Học tập Hiệu quả',
        description: 'Học cách học thông minh với các phương pháp khoa học được chứng minh để tối ưu hóa khả năng ghi nhớ và hiểu bài.',
        image_url: 'assets/img/pic/1.jpg',
        duration: '14 giờ',
        level: 'Cơ bản',
        category: 'academic',
        price: 799000,
        features: [
            'Kỹ thuật ghi nhớ khoa học',
            'Lập kế hoạch học tập hiệu quả',
            'Quản lý thời gian học tập',
            'Phương pháp ôn tập tối ưu'
        ],
        type: 'course',
        instructor: 'ThS. Hoàng Văn E',
        rating: 4.6,
        students: 178
    },
    {
        id: 'critical_thinking',
        title: 'Tư duy Phản biện và Giải quyết Vấn đề',
        description: 'Phát triển khả năng tư duy logic, phân tích và giải quyết vấn đề một cách sáng tạo trong học tập và cuộc sống.',
        image_url: 'assets/img/pic/3.png',
        duration: '18 giờ',
        level: 'Nâng cao',
        category: 'academic',
        price: 1499000,
        features: [
            'Kỹ năng tư duy phản biện',
            'Phương pháp phân tích vấn đề',
            'Tìm kiếm giải pháp sáng tạo',
            'Ứng dụng thực tế trong học tập'
        ],
        type: 'course',
        instructor: 'TS. Võ Thị F',
        rating: 4.9,
        students: 95
    }
];

// Category mappings
const categoryMappings = {
    career: {
        name: 'Hướng nghiệp',
        color: '#964bdf',
        icon: 'fas fa-compass'
    },
    assessment: {
        name: 'Đánh giá',
        color: '#059669',
        icon: 'fas fa-brain'
    },
    consultation: {
        name: 'Tư vấn',
        color: '#dc2626',
        icon: 'fas fa-user-tie'
    },
    writing: {
        name: 'Viết luận',
        color: '#2563eb',
        icon: 'fas fa-pen-fancy'
    },
    skills: {
        name: 'Kỹ năng mềm',
        color: '#7c3aed',
        icon: 'fas fa-people-group'
    },
    academic: {
        name: 'Học thuật',
        color: '#ea580c',
        icon: 'fas fa-book-open'
    }
};

// Utility functions
const PACServices = {
    // Get all career guidance services
    getCareerServices: () => careerGuidanceServices,
    
    // Get all courses
    getCourses: () => coursesData,
    
    // Get services by type
    getServicesByType: (type) => {
        if (type === 'career') {
            return careerGuidanceServices;
        } else if (type === 'course') {
            return coursesData;
        }
        return [];
    },
    
    // Get service/course by id
    getById: (id) => {
        const allItems = [...careerGuidanceServices, ...coursesData];
        return allItems.find(item => item.id === id);
    },
    
    // Filter by category
    filterByCategory: (items, category) => {
        if (category === 'all') return items;
        return items.filter(item => item.category === category);
    },
    
    // Get category info
    getCategoryInfo: (categoryKey) => categoryMappings[categoryKey] || {
        name: 'Khác',
        color: '#6b7280',
        icon: 'fas fa-tag'
    },
    
    // Format price
    formatPrice: (price) => {
        return new Intl.NumberFormat('vi-VN').format(price);
    },
    
    // Get all categories for a type
    getCategories: (type) => {
        const items = type === 'career' ? careerGuidanceServices : coursesData;
        const categories = [...new Set(items.map(item => item.category))];
        return categories.map(cat => ({
            key: cat,
            ...categoryMappings[cat]
        }));
    }
};

// Make available globally
window.PACServices = PACServices;
window.careerGuidanceServices = careerGuidanceServices;
window.coursesData = coursesData;
