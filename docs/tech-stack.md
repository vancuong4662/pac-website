# Tech Stack

## Frontend
- **HTML5** với semantic markup
- **Bootstrap 5.3.7** cho responsive design
- **Montserrat Font** theo PAC Group brand guidelines
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

## Browser Support
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)
