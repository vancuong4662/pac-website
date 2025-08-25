# Component Architecture

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
└── docs/                  # Documentation
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

### Component Structure
```html
<section id="component-name" class="section-class">
  <div class="container">
    <!-- Component content -->
  </div>
</section>
```

### CSS Classes
- `.component-loading`: Loading state
- `.component-loaded`: Loaded state  
- `.component-error`: Error state

### Testing
```javascript
// Check component status
console.log(window.componentLoader.getLoadingStatus());

// Manual reload for testing
window.componentLoader.reloadComponent('component-name', '#target');
```
