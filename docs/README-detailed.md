# PAC Group - Tư Vấn Giáo Dục Nghề Nghiệp

## Tổng Quan Dự Án
PAC Group là nền tảng tư vấn giáo dục và định hướng nghề nghiệp hàng đầu Việt Nam, giúp học sinh và phụ huynh đưa ra những quyết định đúng đắn cho tương lai.

## Kiến Trúc Component-Based

### Cấu Trúc Thư Mục
```
pac-new/
├── components/              # HTML Components
│   ├── header.html         # Navigation và branding
│   ├── hero.html          # Hero section với CTA
│   ├── about.html         # Giới thiệu về PAC Group
│   ├── featured-programs.html  # Chương trình nổi bật
│   ├── featured-services.html  # Dịch vụ chính
│   ├── find-teacher.html      # Tìm giáo viên/cố vấn
│   ├── call-to-action.html    # Call-to-action section
│   └── footer.html            # Footer với liên kết
├── assets/
│   ├── css/
│   │   └── main.css       # CSS với PAC Group branding
│   ├── js/
│   │   ├── component-loader.js  # Dynamic component loader
│   │   └── main.js        # Template logic
│   └── vendor/            # Third-party libraries
├── .htaccess              # URL rewriting, CORS, caching
├── index.html             # Entry point với containers
└── README.md
```

### Component Loader System

#### Tính Năng
- **Dynamic Loading**: Load components on-demand từ `/components` directory
- **Preloader Integration**: Sử dụng hệ thống preloader có sẵn
- **Component Caching**: Cache components để improve performance
- **Error Handling**: Graceful error handling với retry functionality
- **Auto Re-initialization**: Tự động khởi tạo lại AOS, GLightbox, PureCounter sau khi load

#### Cách Sử Dụng

1. **Tự Động Load** (Page Load):
```javascript
// Components được load tự động khi DOM ready
const pageComponents = [
  { name: 'header', target: '#header-section' },
  { name: 'hero', target: '#hero-section' },
  { name: 'about', target: '#about-section' },
  // ... các components khác
];
```

2. **Load Thủ Công**:
```javascript
// Load một component
window.componentLoader.loadComponent('hero', '#hero-section');

// Load nhiều components
window.componentLoader.loadComponents([
  { name: 'about', target: '#about-section' },
  { name: 'services', target: '#services-section' }
]);
```

3. **Reload Component**:
```javascript
window.componentLoader.reloadComponent('hero', '#hero-section');
```

#### Component States
- `.component-loading`: Loading spinner
- `.component-loaded`: Fade-in transition
- `.component-error`: Error state với retry button

## Stack Công Nghệ

### Frontend
- **HTML5** với semantic markup
- **Bootstrap 5.3.7** cho responsive design
- **Montserrat Font** theo PAC Group brand guidelines
- **AOS** cho scroll animations
- **GLightbox** cho lightbox functionality
- **Swiper** cho carousels/sliders

### Backend
- **PHP** cho API endpoints
- **MySQL** database
- **XAMPP** development environment

### Component Architecture
- **Modular HTML Components** trong `/components`
- **Dynamic Component Loader** với caching
- **CORS-enabled** component access
- **Preloader Integration** cho smooth UX

## Color Palette (PAC Group)
```css
:root {
  --default-color: #2c3e50;           /* Đen xanh chủ đạo */
  --heading-color: #1a252f;           /* Đen đậm cho tiêu đề */
  --accent-color: #3498db;            /* Xanh dương chính */
  --accent-color-rgb: 52, 152, 219;   /* RGB của accent */
  --surface-color: #ffffff;           /* Trắng */
  --contrast-color: #ffffff;          /* Trắng tương phản */
  
  /* Backgrounds */
  --background-color: #ffffff;        /* Nền trắng */
  --hero-background-color: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  --accent-background-color: #3498db; /* Nền accent */
  
  /* Additional colors */
  --nav-color: #2c3e50;              /* Navigation text */
  --nav-hover-color: #3498db;        /* Navigation hover */
  --nav-mobile-background-color: rgba(44, 62, 80, 0.9);
}
```

## .htaccess Configuration

### Features
- **Pretty URLs**: Remove .html extensions
- **CORS Headers**: Enable component loading
- **Security Headers**: XSS protection, content type options
- **Caching**: Static assets và component caching
- **Component Access**: Direct access to `/components/*.html`

### Security
```apache
# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
```

### CORS for Components
```apache
# Enable CORS for component loading
<FilesMatch "\.(html)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
</FilesMatch>
```

## Development Workflow

### 1. Tạo Component Mới
```bash
# Tạo component file
touch components/new-section.html

# Update component-loader.js
# Thêm vào pageComponents array
```

### 2. Component Structure
```html
<section id="component-name" class="section-class">
  <div class="container">
    <!-- Component content -->
  </div>
</section>
```

### 3. CSS Classes
- `.component-loading`: Loading state
- `.component-loaded`: Loaded state  
- `.component-error`: Error state

### 4. Testing
```javascript
// Check component status
console.log(window.componentLoader.getLoadingStatus());

// Manual reload for testing
window.componentLoader.reloadComponent('component-name', '#target');
```

## Deployment Steps

### 1. Production Setup
```bash
# Upload files to web server
# Configure web server (Apache/Nginx)
# Set up database connection
# Configure .htaccess for production
```

### 2. Performance Optimization
- Enable gzip compression
- Set up CDN for static assets
- Configure browser caching
- Minify CSS/JS files

### 3. SEO Configuration
- Update meta tags per page
- Configure Open Graph tags
- Set up Google Analytics
- Generate sitemap.xml

## Browser Support
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Maintenance Notes

### Component Updates
- Components are cached - clear cache sau khi update
- Test component loading after changes
- Verify AOS/GLightbox re-initialization

### Performance Monitoring  
- Monitor component load times
- Check for failed component loads
- Optimize component size và dependencies
