# Server Configuration

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

### Pretty URLs Examples
```
# Thay vì: https://domain.com/about.html  
# Có thể dùng: https://domain.com/about

# Thay vì: https://domain.com/services.html
# Có thể dùng: https://domain.com/services
```

### Caching Strategy
- **CSS/JS**: 1 năm cache với versioning
- **Images**: 1 tháng cache
- **HTML**: No cache để content luôn fresh
- **Components**: Cache với validation
