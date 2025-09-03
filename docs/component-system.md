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
│   └── footer.html        # Footer với liên kết
├── assets/
│   ├── css/
│   │   └── main.css       # CSS với PAC Group branding
│   ├── js/
│   │   ├── component-loader.js  # Dynamic component loader
│   │   └── main.js        # Main application logic
│   └── vendor/            # Third-party libraries
├── static/
│   └── team.json          # Team member data
├── .htaccess              # URL rewriting, CORS, caching
├── index.html             # Entry point với component containers
└── docs/                  # Documentation
```

## Component Loader System

### Core Features
- **Dynamic Loading**: Load components on-demand từ `/components` directory
- **Preloader Integration**: Sử dụng hệ thống preloader có sẵn
- **Component Caching**: Cache components để improve performance
- **Error Handling**: Graceful error handling với retry functionality
- **Auto Re-initialization**: Tự động khởi tạo lại AOS, GLightbox, PureCounter sau khi load
- **Component-Specific Init**: Khởi tạo riêng cho từng component (slideshows, data loading)

### Usage Examples

**Tự Động Load (Page Load)**:
```javascript
const pageComponents = [
  { name: 'header', target: '#header-section' },
  { name: 'hero', target: '#hero-section' },
  { name: 'about', target: '#about-section' },
  { name: 'why-choose', target: '#why-choose-section' },
  { name: 'solution', target: '#solution-section' },
  { name: 'courses', target: '#courses-section' },
  { name: 'team', target: '#team-section' },
  { name: 'feedback', target: '#feedback-section' },
  { name: 'partners', target: '#partners-section' },
  { name: 'footer', target: '#footer-section' }
];
```

**Load Thủ Công**:
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
- `header.html` - Navigation & branding
- `hero.html` - Main hero section with slideshow
- `about.html` - About PAC Group (company info)
- `why-choose.html` - Why choose PAC section
- `solution.html` - Solution offerings
- `courses.html` - Course listings
- `team.html` - Team members with dynamic data loading
- `feedback.html` - Customer feedback slideshow
- `partners.html` - Partners & clients slideshow
- `footer.html` - Footer with links

## Key Files
- `index.html` - Main entry point (component containers only)
- `component-loader.js` - Dynamic component loading system
- `main.js` - Main application logic and initialization
- `main.css` - PAC Group branded styles
- `static/team.json` - Team member data
- `.htaccess` - URL rewriting & CORS for components

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

```javascript
// Strategy 1: DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(tryInit, 100);
  });
} else {
  setTimeout(tryInit, 50);
}

// Strategy 2: Window load (fallback)
window.addEventListener('load', function() {
  setTimeout(tryInit, 100);
});

// Strategy 3: Delayed fallback for cached pages
setTimeout(function() {
  if (!initialized) {
    tryInit();
  }
}, 1000);

// Strategy 4: Final safety net
setTimeout(function() {
  if (!initialized) {
    tryInit();
  }
}, 2500);
```

### 2. Component-Loader Integration
`component-loader.js` must handle component-specific initialization:

```javascript
// In ComponentLoader class
switch (componentName) {
  case 'hero':
    this.initializeHero(targetElement);
    break;
  case 'team':
    this.initializeTeam(targetElement);
    break;
  case 'partners':
    this.initializePartners(targetElement);
    break;
}
```

### 3. Global Function Exposure
Functions needed by component-loader must be globally accessible:

```javascript
// Make functions available globally
window.loadTeamData = loadTeamData;
window.initHeroSlideshow = initHeroSlideshow;
window.initPartnersSlideshow = initPartnersSlideshow;
```

### 4. Element Existence Checks
Always verify DOM elements exist before initialization:

```javascript
function loadTeamData() {
  const grid = document.getElementById('team-members-grid');
  if (!grid) {
    setTimeout(loadTeamData, 300); // Retry later
    return;
  }
  // Proceed with initialization
}
```

### 5. Retry Mechanisms
Implement exponential backoff for failed initializations:

```javascript
function initializeWithRetry(attempts) {
  const maxAttempts = 5;
  attempts = attempts || 0;
  
  const tryInit = () => {
    attempts++;
    if (initialization_success) return;
    
    if (attempts < maxAttempts) {
      const delay = Math.min(500 * attempts, 2000);
      setTimeout(tryInit, delay);
    }
  };
  
  tryInit();
}
```

## Best Practices for Component Development

### ✅ DO
- Use multiple initialization strategies
- Check element existence before DOM manipulation
- Implement retry mechanisms with exponential backoff
- Make initialization functions globally accessible when needed
- Add component-specific initialization to component-loader.js
- Test both F5 and Ctrl+F5 refresh scenarios
- Use setTimeout delays to allow DOM settling

### ❌ DON'T
- Rely solely on DOMContentLoaded or window.load events
- Assume components are loaded when main.js executes
- Initialize without checking if target elements exist
- Forget to expose functions needed by component-loader
- Skip testing different browser cache scenarios

## Debugging Tips

### Console Debugging
Add temporary logging to trace initialization:
```javascript
console.log('Component loaded:', componentName);
console.log('Element found:', !!targetElement);
console.log('Function available:', typeof initFunction);
```

### Testing Scenarios
Always test these scenarios:
1. **First visit** (no cache)
2. **F5 refresh** (cached JS, fresh HTML)
3. **Ctrl+F5 refresh** (everything fresh)
4. **Back/Forward navigation**

### Common Failure Patterns
- Slideshow controls appear but don't respond to clicks
- Loading spinners never disappear
- "Function not defined" errors in console
- Initialization works on hard refresh but not soft refresh
- Modal backdrop remains after closing (multiple instances)

## Modal Best Practices

### Single Instance Pattern
**Problem**: Creating new Bootstrap modal instances each time causes multiple backdrops:

```javascript
// ❌ WRONG - Creates new instance every time
function showModal() {
  const bootstrapModal = new bootstrap.Modal(document.getElementById('modal'));
  bootstrapModal.show();
}
```

**Solution**: Create single instance and reuse:

```javascript
// ✅ CORRECT - Single instance pattern
let modalInstance = null;

function initModal() {
  const modal = document.getElementById('memberModal');
  modalInstance = new bootstrap.Modal(modal, {
    keyboard: true,
    backdrop: true,
    focus: true
  });
  
  // Cleanup on hide
  modal.addEventListener('hidden.bs.modal', function () {
    // Force cleanup any remaining backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    });
    // Ensure body class is cleaned
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });
}

function showModal(data) {
  if (!modalInstance) {
    setTimeout(() => showModal(data), 100);
    return;
  }
  // Update content and show
  modalInstance.show();
}
```

### Modal Cleanup Checklist
- ✅ One modal instance per modal element
- ✅ Remove backdrop on `hidden.bs.modal` event
- ✅ Reset body classes and styles
- ✅ Check instance exists before showing
- ✅ Handle dynamic content updates properly

## Component Testing Guidelines

### Testing Structure
```javascript
// Component testing utilities
window.componentDebug = {
  // Check component loading status
  getLoadingStatus: () => window.componentLoader.getLoadingStatus(),
  
  // Test component reload
  reloadComponent: (name, target) => window.componentLoader.reloadComponent(name, target),
  
  // Test modal states
  testModal: () => {
    const modal = document.getElementById('memberModal');
    const backdrops = document.querySelectorAll('.modal-backdrop');
    console.log('Modal element:', !!modal);
    console.log('Backdrops count:', backdrops.length);
    console.log('Body classes:', document.body.className);
  }
};
```

### Testing Scenarios Checklist
- [ ] **First visit** (no cache)
- [ ] **F5 refresh** (cached JS, fresh HTML)  
- [ ] **Ctrl+F5 refresh** (everything fresh)
- [ ] **Back/Forward navigation**
- [ ] **Modal open/close cycles**
- [ ] **Component reload testing**
- [ ] **Network throttling simulation**
- [ ] **Error recovery testing**

## Features
✅ Component-based architecture
✅ Dynamic loading with preloader  
✅ Component caching
✅ Error handling with retry
✅ Mobile responsive
✅ SEO optimized
✅ Production ready
✅ Multi-strategy initialization
✅ Cache-aware behavior
✅ Single modal instance pattern
✅ Comprehensive testing guidelines

## Future Component Development
When adding new components with JavaScript functionality:
1. Follow the multi-strategy initialization pattern
2. Add component-specific initialization to ComponentLoader
3. Expose necessary functions globally
4. Test all refresh scenarios
5. Use single instance pattern for modals
6. Implement proper cleanup mechanisms
7. Document any special requirements
8. Add to testing checklist
