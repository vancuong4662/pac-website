# PAC Group Brand Colors Guide

*Hướng dẫn sử dụng màu sắc thương hiệu PAC Group cho website "Unlock Your Career"*

## 🎨 Brand Identity Colors

### Primary Colors
```css
--brand-primary: #964bdf;     /* PAC Purple - Main brand color */
--brand-secondary: #5d2e8b;   /* PAC Dark Purple - Secondary brand */
--brand-accent: #fff200;      /* PAC Yellow - Highlight/accent */
```

### Color Usage Guidelines

#### 1. PAC Purple (`#964bdf`) - Primary Brand
- **Usage**: Logo, primary buttons, main headings, key elements
- **Best for**: Call-to-action buttons, navigation active states, brand elements
- **Combinations**: Works well with white text, yellow accents

#### 2. PAC Dark Purple (`#5d2e8b`) - Secondary Brand  
- **Usage**: Darker sections, secondary buttons, contrast elements
- **Best for**: Footer backgrounds, dark themes, secondary actions
- **Combinations**: Perfect with white or light text

#### 3. PAC Yellow (`#fff200`) - Accent/Highlight
- **Usage**: Highlights, special offers, attention-grabbing elements
- **Best for**: Call-out boxes, notifications, special promotions
- **Combinations**: Use sparingly, pairs with dark purple text

## 🎭 CSS Classes Available

### Background Classes
```css
.bg-brand-primary     /* PAC Purple background */
.bg-brand-secondary   /* PAC Dark Purple background */
.bg-brand-accent      /* PAC Yellow background */
```

### Text Classes  
```css
.text-brand-primary   /* PAC Purple text */
.text-brand-secondary /* PAC Dark Purple text */
.text-brand-accent    /* PAC Yellow text */
```

### Gradient Classes
```css
.pac-gradient-primary    /* Purple to Dark Purple */
.pac-gradient-accent     /* Purple to Yellow */
.pac-gradient-secondary  /* Dark Purple to Purple */
```

### Text Gradients
```css
.pac-text-gradient       /* Purple gradient text */
.pac-text-gradient-accent /* Purple to Yellow text */
```

### Button Styles
```css
.btn-pac-primary  /* Primary purple gradient button */
.btn-pac-accent   /* Yellow accent button */
```

### Border Classes
```css
.border-pac-primary   /* Purple border */
.border-pac-secondary /* Dark purple border */ 
.border-pac-accent    /* Yellow border */
```

## 🎯 Usage Examples

### Primary Button
```html
<button class="btn btn-pac-primary">Đăng Ký Tư Vấn</button>
```

### Gradient Heading
```html
<h2 class="pac-text-gradient">Unlock Your Career - Mở Khóa Tương Lai</h2>
```

### Accent Section
```html
<section class="bg-brand-accent text-brand-secondary">
  <h3>Ưu Đãi Đặc Biệt</h3>
</section>
```

### Hover Effect Card
```html
<div class="card pac-hover-effect">
  <div class="card-body">
    <!-- Content -->
  </div>
</div>
```

## 🎨 Color Combinations

### High Contrast (Recommended)
- Purple (`#964bdf`) + White (`#ffffff`)
- Dark Purple (`#5d2e8b`) + White (`#ffffff`) 
- Yellow (`#fff200`) + Dark Purple (`#5d2e8b`)

### Subtle Combinations
- Purple (`#964bdf`) + Light Gray (`#f8f9ff`)
- Dark Purple (`#5d2e8b`) + Light Purple (`rgba(150, 75, 223, 0.1)`)

## 📱 Responsive Considerations

### Mobile Usage
- Use purple for important actions
- Yellow for highlights and notifications
- Maintain contrast ratios for accessibility

### Desktop Usage  
- Gradients work well on larger screens
- Hover effects enhance user experience
- Use full color palette for rich visual hierarchy

## ♿ Accessibility Notes

### Contrast Ratios
- Purple on white: ✅ WCAG AA compliant
- Dark purple on white: ✅ WCAG AA compliant  
- Yellow on dark purple: ✅ WCAG AA compliant
- Yellow on white: ⚠️ Use with caution, may need darker text

### Best Practices
- Always test color combinations for readability
- Provide alternative indicators beyond color
- Ensure interactive elements have sufficient contrast
