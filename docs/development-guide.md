# Development Guide

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

## Setup Local Environment
```bash
# Khởi động XAMPP
# Navigate to pac-new directory
# Access via http://localhost/pac-new
```

## File Structure Best Practices
- CSS variables cho consistent theming
- Semantic HTML markup
- Mobile-first responsive design
- Accessibility considerations

## Component Updates
- Components are cached - clear cache sau khi update
- Test component loading after changes
- Verify AOS/GLightbox re-initialization

## Performance Monitoring  
- Monitor component load times
- Check for failed component loads
- Optimize component size và dependencies
