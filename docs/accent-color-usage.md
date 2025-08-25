# PAC Brand Accent Color Quick Usage Guide

## 🟡 PAC Yellow (#fff200) - Usage Examples

### ✨ High Impact Elements
```html
<!-- Logo accents -->
<h1>PAC<span class="text-brand-accent">Group</span></h1>

<!-- Section headings -->
<h2>Chương Trình <span class="text-brand-accent">Đào Tạo Nổi Bật</span></h2>

<!-- Call-to-action sections -->
<section class="yellow-accent-background">
  <h3>Ưu Đãi <span class="text-brand-secondary">Đặc Biệt</span></h3>
</section>
```

### 🎯 Interactive Elements
```html
<!-- Primary buttons (use sparingly) -->
<button class="btn-pac-accent">Đăng Ký Ngay</button>

<!-- Icon highlights -->
<i class="fas fa-star text-brand-accent"></i>
<i class="bi bi-check-circle text-brand-accent"></i>

<!-- Action links -->
<a href="#" class="text-brand-accent pac-hover-effect">Xem thêm</a>
```

### 📦 Content Highlights  
```html
<!-- Feature badges -->
<span class="bg-brand-accent text-brand-secondary">Tính Năng Mới</span>

<!-- Certification badges -->
<div class="bg-brand-accent text-brand-secondary">
  <i class="bi bi-award"></i>
  Chứng Nhận
</div>

<!-- Highlight boxes -->
<div class="pac-highlight-box">
  <h4>Thông Tin Quan Trọng</h4>
  <p>Nội dung được highlight</p>
</div>
```

### 🎨 Visual Effects
```html
<!-- Glowing elements -->
<div class="pac-accent-glow">
  <img src="image.jpg" alt="Featured">
</div>

<!-- Animated elements -->
<div class="pac-pulse">
  <i class="fas fa-bell text-brand-accent"></i>
</div>

<!-- Gradient text -->
<h2 class="pac-text-gradient-accent">Unlock Your Career Excellence</h2>
```

## 🚨 Usage Guidelines

### ✅ DO Use For:
- Logo "Group" part
- Key numbers/statistics highlights  
- Important badges/certifications
- Call-to-action backgrounds (sparingly)
- Icon highlights for features
- Section heading accents
- Success/achievement indicators

### ❌ DON'T Use For:
- Large text blocks (readability issues)
- Primary navigation 
- Body text content
- Multiple elements in same view
- Background for large sections
- Small text (contrast issues)

### 📐 Proportions:
- **Yellow should be ~10-15%** of total color usage
- **Purple should be ~70-80%** (primary + secondary)  
- **White/Gray should be ~10-15%** for balance

## 🎯 Strategic Placement

### Homepage Priority:
1. Logo "Group" accent ⭐⭐⭐
2. Hero section key phrase ⭐⭐⭐
3. CTA section background ⭐⭐⭐
4. Feature checkmarks ⭐⭐
5. Statistics highlights ⭐⭐

### Component Priority:
1. **Header**: Logo accent, CTA button
2. **Hero**: Key phrase highlight, action icons  
3. **Features**: Checkmarks, badges
4. **CTA**: Background, emphasis text
5. **Footer**: Logo accent, section headers

## 💡 Pro Tips

### Contrast Combinations:
- ✅ Yellow on Dark Purple (`#fff200` on `#5d2e8b`)
- ✅ Yellow background with Dark Purple text
- ⚠️ Yellow on White (use bold text only)
- ❌ Yellow on Light backgrounds

### Animation Effects:
```css
/* Subtle glow on hover */
.accent-glow:hover {
  box-shadow: 0 0 15px rgba(255, 242, 0, 0.6);
}

/* Pulsing attention grabber */
.accent-pulse {
  animation: pac-pulse 2s infinite;
}
```

### Accessibility:
- Always test contrast ratios
- Provide non-color indicators 
- Use ARIA labels for color-coded elements
- Ensure keyboard navigation works

## 📱 Responsive Considerations

### Mobile:
- Reduce yellow usage by 20%
- Focus on logo and primary CTA only
- Ensure touch targets are clear

### Desktop:
- Full color palette available
- Use hover effects with yellow highlights
- Leverage gradient combinations
