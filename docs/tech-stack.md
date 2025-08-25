# Tech Stack

## Frontend
- **HTML5** với semantic markup
- **Bootstrap 5.3.7** cho responsive design
- **Montserrat Font** theo PAC Group brand guidelines cho website "Unlock Your Career"
- **AOS** cho scroll animations
- **GLightbox** cho lightbox functionality
- **Swiper** cho carousels/sliders

## Backend
- **PHP** cho API endpoints
- **MySQL** database
- **XAMPP** development environment

## Component Architecture
- **Modular HTML Components** trong `/components`
- **Dynamic Component Loader** với caching
- **CORS-enabled** component access
- **Preloader Integration** cho smooth UX

## Color Palette (PAC Group Brand)
```css
:root {
  /* Brand Colors - PAC Group Identity cho website "Unlock Your Career" */
  --brand-primary: #964bdf;     /* PAC Purple - Main brand color */
  --brand-secondary: #5d2e8b;   /* PAC Dark Purple - Secondary brand */
  --brand-accent: #fff200;      /* PAC Yellow - Highlight/accent */
  
  /* Base Colors */
  --background-color: #ffffff;   /* Clean white background */
  --default-color: #374151;     /* Body text - neutral dark gray */
  --heading-color: #1f2937;     /* Headings - darker gray */
  --accent-color: #964bdf;      /* Primary purple for interactions */
  
  /* Supporting Colors */
  --secondary-color: #059669;   /* Success/growth green */
  --neutral-gray: #6b7280;      /* Subtle elements */
  
  /* Background Variations */
  --bg-light: #f8f9ff;         /* Light purple tint backgrounds */
  --bg-secondary: #fafafa;      /* Neutral section backgrounds */
  --bg-accent: rgba(255, 242, 0, 0.1); /* Light yellow backgrounds */
  
  /* Navigation Colors */
  --nav-color: #374151;         /* Navigation text */
  --nav-hover-color: #964bdf;   /* Navigation hover - PAC purple */
}
```

## Browser Support
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)
