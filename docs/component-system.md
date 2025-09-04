# PAC Group Website - Complete Component System Guide

## Project Structure
```
pac-new/
├── components/              # HTML Components
│   ├── header.html         # Navigation và branding
│   ├── hero.html          # Hero section với slideshow
│   ├── about.html         # Giới thiệu về PAC Group
│   ├── why-choose.html    # Tại sao chọn PAC
│   ├── solution.html      # Giải pháp của chúng tôi
│   ├── courses.html       # Danh sách khóa học
│   ├── team.html          # Đội ngũ chuyên gia (dynamic data)
│   ├── feedback.html      # Feedback khách hàng (slideshow)
│   ├── partners.html      # Đối tác & khách hàng (slideshow)
│   ├── footer.html        # Footer với liên kết
│   └── profile-sidebar.html # Profile sidebar với navigation
├── templates/
│   ├── profile.html       # Profile page template
│   ├── login.html         # Login page template
│   └── register.html      # Register page template
├── assets/
│   ├── css/
│   │   └── main.css       # CSS với PAC Group branding + Profile styles
│   ├── js/
│   │   ├── component-loader.js  # Dynamic component loader (UPDATED)
│   │   ├── profile.js     # Profile page functionality
│   │   └── main.js        # Main application logic
│   └── vendor/            # Third-party libraries
├── static/
│   └── team.json          # Team member data
├── .htaccess              # URL rewriting, CORS, caching
├── index.html             # Entry point với component containers
└── docs/                  # Documentation
```

## Component Loader System (Updated 2024)

### Core Features
- **Dynamic Loading**: Load components on-demand từ `/components` directory
- **Page-Specific Loading**: Tự động phát hiện loại trang và load components phù hợp
- **Flexible Configuration**: Hỗ trợ custom component configuration cho từng page
- **Preloader Integration**: Sử dụng hệ thống preloader có sẵn
- **Component Caching**: Cache components để improve performance
- **Error Handling**: Graceful error handling với retry functionality
- **Auto Re-initialization**: Tự động khởi tạo lại AOS, GLightbox, PureCounter sau khi load
- **Component-Specific Init**: Khởi tạo riêng cho từng component (slideshows, data loading)

### Page Detection & Loading Strategy

**1. Custom Page Configuration**:
```javascript
// Trong từng page template, định nghĩa components cần load
window.pageComponentsConfig = [
  { name: 'header', target: '#header-section' },
  { name: 'profile-sidebar', target: '#profile-sidebar-section' },
  { name: 'footer', target: '#footer-section' }
];
```

**2. Index Page Auto-Detection**:
```javascript
// Component loader tự động phát hiện index page qua class '.index-page'
const isIndexPage = document.querySelector('.index-page') !== null;
```

**3. Fallback for Other Pages**:
```javascript
// Load header và footer nếu có target elements
const commonComponents = [];
if (document.querySelector('#header-section')) {
  commonComponents.push({ name: 'header', target: '#header-section' });
}
if (document.querySelector('#footer-section')) {
  commonComponents.push({ name: 'footer', target: '#footer-section' });
}
```

### Usage Examples

**Page-Specific Loading (Profile Page)**:
```javascript
// Trong profile.html
window.pageComponentsConfig = [
  { name: 'header', target: '#header-section' },
  { name: 'profile-sidebar', target: '#profile-sidebar-section' },
  { name: 'footer', target: '#footer-section' }
];

// Component loader sẽ tự động sử dụng config này
```

**Index Page (Automatic)**:
```html
<!-- Trong index.html, chỉ cần có class 'index-page' -->
<body class="index-page">
  <!-- Components sẽ được auto-load -->
</body>
```

**Manual Loading**:
```javascript
// Load một component
window.componentLoader.loadComponent('hero', '#hero-section');

// Load nhiều components
window.componentLoader.loadComponents([
  { name: 'about', target: '#about-section' },
  { name: 'team', target: '#team-section' }
]);

// Reload component
window.componentLoader.reloadComponent('hero', '#hero-section');
```

**Component States & CSS Classes**:
- `.component-loading`: Loading spinner state
- `.component-loaded`: Loaded with fade-in transition  
- `.component-error`: Error state với retry button

## Components Overview
Current components in the system:

### Main Components
- `header.html` - Navigation & branding
- `footer.html` - Footer with links

### Index Page Components
- `hero.html` - Main hero section with slideshow
- `about.html` - About PAC Group (company info)
- `why-choose.html` - Why choose PAC section
- `solution.html` - Solution offerings
- `courses.html` - Course listings
- `team.html` - Team members with dynamic data loading
- `feedback.html` - Customer feedback slideshow
- `partners.html` - Partners & clients slideshow

### Profile System Components
- `profile-sidebar.html` - Profile navigation sidebar with user info and menu
  - Hồ sơ thông tin (active state)
  - Đổi mật khẩu
  - Lịch sử thanh toán (with badges)
  - Kết quả trắc nghiệm (with badges)
  - Quick actions và logout

## Profile System Architecture

### Profile Page Template (`templates/profile.html`)
- **Structure**: Header + Page header + Sidebar + Main content + Footer
- **Components**: Uses `header`, `profile-sidebar`, and `footer` components
- **Styles**: Extended main.css with profile-specific styles
- **JavaScript**: Dedicated `profile.js` for profile functionality

### Profile Sidebar Component (`components/profile-sidebar.html`)
- **User Info Section**: Avatar, name, email, status badge
- **Navigation Menu**: Four main sections with icons and descriptions
- **Quick Actions**: Edit profile, download certificate, contact support
- **Logout**: Secure logout functionality
- **Responsive**: Mobile-optimized navigation
- **Interactive**: Hover effects, active states, navigation highlighting

### Profile JavaScript (`assets/js/profile.js`)
- **ProfileManager Class**: Complete profile management system
- **Form Handling**: Validation, saving, reset functionality
- **Data Management**: LocalStorage integration, API simulation
- **UI Interactions**: Loading states, notifications, form validation
- **Responsive Design**: Mobile-friendly form handling

### Key Features
1. **Component Reusability**: Header và footer được reuse từ index page
2. **Modular Design**: Profile sidebar là independent component
3. **Data Persistence**: Profile data lưu trong localStorage (demo)
4. **Validation System**: Real-time form validation
5. **User Experience**: Loading states, success/error notifications
6. **Mobile Responsive**: Optimized cho tất cả screen sizes

## Critical: Component Initialization Timing Issues

### Root Cause Analysis
**Problem**: Components with JavaScript functionality (slideshows, data loading) fail to initialize properly depending on browser cache behavior:
- **F5 (normal refresh)**: Browser uses cached JavaScript but components are loaded dynamically → JS tries to initialize before components exist in DOM → Fails silently
- **Ctrl+F5 (hard refresh)**: All resources reloaded fresh → Components and JS load in correct sequence → Works properly

### Technical Details
1. **DOM Ready vs Component Ready**: `DOMContentLoaded` and `window.load` events fire before dynamic components are loaded
2. **Script Execution Timing**: Main.js initializes before component HTML is inserted into DOM
3. **Cache Behavior**: Cached JS executes immediately while uncached JS waits for all resources

### Components Affected
- **Hero Section**: Slideshow initialization fails
- **Feedback Section**: Slideshow initialization fails  
- **Partners Section**: Slideshow initialization fails
- **Team Section**: Data loading and rendering fails

## Solution Architecture

### 1. Multi-Strategy Initialization
Each component requiring JS initialization must use multiple strategies:

## Key Files & System Architecture

### Updated File Structure
- `index.html` - Main entry point (component containers only) 
- `templates/profile.html` - Profile page template (NEW)
- `components/profile-sidebar.html` - Profile navigation component (NEW)
- `component-loader.js` - Dynamic component loading system (UPDATED)
- `profile.js` - Profile page functionality (NEW)
- `main.js` - Main application logic and initialization
- `main.css` - PAC Group branded styles + Profile styles (UPDATED)
- `static/team.json` - Team member data
- `.htaccess` - URL rewriting & CORS for components

### Component Loading Strategy (Updated)

#### 1. Page Detection System
Component loader tự động phát hiện loại trang để load appropriate components:

```javascript
// Trong component-loader.js
document.addEventListener('DOMContentLoaded', function() {
  // Custom page components có priority cao nhất
  if (window.pageComponentsConfig) {
    window.componentLoader.loadComponents(window.pageComponentsConfig);
    return;
  }
  
  // Auto-detect index page
  const isIndexPage = document.querySelector('.index-page') !== null;
  
  if (isIndexPage) {
    // Load all index page components
    const indexComponents = [
      { name: 'header', target: '#header-section' },
      { name: 'hero', target: '#hero-section' },
      // ... other index components
    ];
    window.componentLoader.loadComponents(indexComponents);
  } else {
    // Load common components (header, footer) for other pages
    const commonComponents = [];
    if (document.querySelector('#header-section')) {
      commonComponents.push({ name: 'header', target: '#header-section' });
    }
    if (document.querySelector('#footer-section')) {
      commonComponents.push({ name: 'footer', target: '#footer-section' });
    }
    window.componentLoader.loadComponents(commonComponents);
  }
});
```

#### 2. Custom Page Configuration
Mỗi page có thể định nghĩa components riêng:

```javascript
// Trong profile.html
window.pageComponentsConfig = [
  { name: 'header', target: '#header-section' },
  { name: 'profile-sidebar', target: '#profile-sidebar-section' },
  { name: 'footer', target: '#footer-section' }
];
```

#### 3. Enhanced Error Handling
Component loader xử lý gracefully khi target elements không tồn tại:

```javascript
async loadComponent(componentName, targetSelector, useCache = true) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    // Warn but don't break the system
    console.warn(`Target element not found: ${targetSelector}. Skipping component: ${componentName}`);
    return false;
  }
  // Continue loading...
}
```

## Profile System Implementation

### 1. Profile Template Structure
```html
<!-- templates/profile.html -->
<body class="profile-page">
  <div id="preloader"></div>
  <div id="header-section"></div>
  
  <main class="main">
    <section class="page-header bg-primary">
      <!-- Breadcrumb và page title -->
    </section>
    
    <section class="profile-content">
      <div class="container">
        <div class="row">
          <div class="col-lg-3">
            <div id="profile-sidebar-section"></div>
          </div>
          <div class="col-lg-9">
            <!-- Profile form content -->
            <div class="profile-main-content">
              <!-- User info form, statistics cards -->
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
  
  <div id="footer-section"></div>
  
  <!-- Load profile-specific JavaScript -->
  <script src="assets/js/profile.js"></script>
</body>
```

### 2. Profile Sidebar Component Features
- **User Info Display**: Avatar, name, email, status badge
- **Navigation Menu**: 4 main sections với icons và descriptions:
  - Hồ sơ thông tin (active state)
  - Đổi mật khẩu  
  - Lịch sử thanh toán (with notification badges)
  - Kết quả trắc nghiệm (with result count badges)
- **Quick Actions**: Edit profile, download certificate, contact support  
- **Logout**: Secure logout functionality
- **Responsive Design**: Mobile-optimized navigation
- **Interactive States**: Hover effects, active states, navigation highlighting

### 3. Profile JavaScript Architecture
ProfileManager class với complete functionality:

```javascript
class ProfileManager {
  constructor() {
    this.profileForm = null;
    this.isLoading = false;
    this.originalData = {};
  }
  
  // Key methods:
  // - loadUserProfile(): Load và populate form data
  // - saveProfile(): Validate và save with loading states  
  // - validateForm(): Real-time form validation
  // - showNotification(): User feedback system
}
```

### 4. Enhanced CSS Styling
Extended main.css với profile-specific styles:
- Profile page layout và spacing
- Form styling với focus effects
- Button hover animations
- Card design system
- Mobile responsive breakpoints
- Loading states và validation feedback

## System Improvements & Best Practices

### ✅ Enhanced Features (2024 Update)
- **Smart Component Loading**: Tự động phát hiện page type
- **Graceful Error Handling**: Skip missing components without breaking
- **Page-Specific Configuration**: Custom component sets per page
- **Clean Console Output**: Removed debug logs for production
- **Mobile-First Design**: Responsive profile system
- **Real-Time Validation**: Form validation với user feedback
- **Loading States**: User-friendly loading indicators
- **Data Persistence**: LocalStorage integration (demo)

### ✅ DO - Component Development
- Use page-specific component configuration when needed
- Implement graceful error handling for missing elements  
- Test component loading across different page types
- Keep components modular và reusable
- Use proper CSS class naming for page detection (`.index-page`, `.profile-page`)
- Clean up console.log statements in production
- Implement proper form validation và user feedback
- Use loading states for better UX

### ❌ DON'T - Avoid These Patterns
- Hard-code component lists in component-loader.js
- Assume all target elements will exist
- Create components with tight coupling to specific pages
- Forget to handle mobile responsiveness  
- Leave debug console statements in production code
- Skip form validation or user feedback
- Ignore loading states during async operations

## Testing Guidelines

### Component Loading Tests
```javascript
// Test custom page configuration
window.pageComponentsConfig = [
  { name: 'header', target: '#header-section' },
  { name: 'nonexistent', target: '#missing-section' }, // Should skip gracefully
  { name: 'footer', target: '#footer-section' }
];
```

### Profile System Tests
- Form validation (empty fields, invalid email, phone format)
- Save/cancel functionality
- Loading states during form submission  
- Sidebar navigation active states
- Mobile responsive behavior
- LocalStorage data persistence

### Browser Compatibility Tests
- Different page refresh methods (F5 vs Ctrl+F5)
- Back/forward navigation
- Network throttling scenarios
- Cache behavior validation

## Future Development Guidelines

### Adding New Pages
1. Create template in `/templates` directory
2. Add appropriate CSS class to `<body>` for page detection
3. Define `window.pageComponentsConfig` if custom components needed
4. Test component loading behavior
5. Update this documentation

### Creating New Components  
1. Create HTML file in `/components` directory
2. Include CSS và JavaScript inline if component-specific
3. Test loading across different pages
4. Add to appropriate page configurations
5. Document component purpose và usage

### System Maintenance
- Regularly clean console.log statements
- Test new features across all browsers
- Update documentation when making architectural changes
- Maintain backward compatibility when possible
- Monitor component loading performance

## Summary

The PAC Group component system has evolved into a robust, flexible architecture supporting:
- ✅ Dynamic component loading với intelligent page detection
- ✅ Profile management system với complete user experience
- ✅ Error-resilient loading that gracefully handles missing elements
- ✅ Mobile-responsive design across all components
- ✅ Clean, maintainable codebase ready for production
- ✅ Comprehensive documentation và testing guidelines
