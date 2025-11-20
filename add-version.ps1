# Script to add version query string to JS/CSS files
$version = "20112025"

# Get all HTML files
$htmlFiles = @()
$htmlFiles += Get-Item "e:\XAMPP\htdocs\0\pac-new\index.html"
$htmlFiles += Get-ChildItem -Path "e:\XAMPP\htdocs\0\pac-new\templates" -Filter "*.html" -File
$htmlFiles += Get-ChildItem -Path "e:\XAMPP\htdocs\0\pac-new\templates\admin" -Filter "*.html" -File -ErrorAction SilentlyContinue

Write-Host "Processing $($htmlFiles.Count) HTML files..." -ForegroundColor Green

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Pattern 1: assets/js/*.js (without version)
    $content = $content -replace '(assets/js/[^"''?\s]+\.js)(?!\?v=)', "`$1?v=$version"
    
    # Pattern 2: assets/js/admin/*.js (without version)
    $content = $content -replace '(assets/js/admin/[^"''?\s]+\.js)(?!\?v=)', "`$1?v=$version"
    
    # Pattern 3: assets/css/*.css (without version)
    $content = $content -replace '(assets/css/[^"''?\s]+\.css)(?!\?v=)', "`$1?v=$version"
    
    # Pattern 4: /pac-new/assets/js/*.js (absolute paths)
    $content = $content -replace '(/pac-new/assets/js/[^"''?\s]+\.js)(?!\?v=)', "`$1?v=$version"
    
    # Pattern 5: /pac-new/assets/css/*.css (absolute paths)
    $content = $content -replace '(/pac-new/assets/css/[^"''?\s]+\.css)(?!\?v=)', "`$1?v=$version"
    
    # Update files that have already version (replace old version with new)
    $content = $content -replace '(assets/js/[^"''?\s]+\.js)\?v=[^"''?\s]+', "`$1?v=$version"
    $content = $content -replace '(assets/js/admin/[^"''?\s]+\.js)\?v=[^"''?\s]+', "`$1?v=$version"
    $content = $content -replace '(assets/css/[^"''?\s]+\.css)\?v=[^"''?\s]+', "`$1?v=$version"
    $content = $content -replace '(/pac-new/assets/js/[^"''?\s]+\.js)\?v=[^"''?\s]+', "`$1?v=$version"
    $content = $content -replace '(/pac-new/assets/css/[^"''?\s]+\.css)\?v=[^"''?\s]+', "`$1?v=$version"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  Updated successfully" -ForegroundColor Green
    } else {
        Write-Host "  No changes needed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Script completed successfully!" -ForegroundColor Green
