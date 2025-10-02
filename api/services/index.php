<?php
/**
 * PAC Services API Directory
 * Trang tổng quan về các API dịch vụ
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PAC Services API</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 15px; }
        .api-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .api-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; transition: all 0.3s; }
        .api-card:hover { transform: translateY(-5px); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .api-title { color: #495057; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .api-desc { color: #6c757d; margin-bottom: 15px; line-height: 1.5; }
        .api-link { display: inline-block; background: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; }
        .api-link:hover { background: #0056b3; }
        .example { background: #e9ecef; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 10px; }
        .stats { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 PAC Services API</h1>
        
        <div class="stats">
            <h3>📊 API Endpoints Available</h3>
            <p>Hệ thống API cung cấp đầy đủ thông tin về các dịch vụ của PAC bao gồm khóa học, tư vấn và bài kiểm tra hướng nghiệp.</p>
        </div>

        <div class="api-grid">
            <div class="api-card">
                <div class="api-title">📋 Danh sách dịch vụ</div>
                <div class="api-desc">Lấy danh sách tất cả dịch vụ với khả năng lọc theo loại, danh mục, trạng thái.</div>
                <a href="list.php" class="api-link" target="_blank">Test API</a>
                <div class="example">GET /api/services/list.php?type=course</div>
            </div>

            <div class="api-card">
                <div class="api-title">🔍 Chi tiết dịch vụ</div>
                <div class="api-desc">Lấy thông tin chi tiết của một dịch vụ cụ thể theo slug hoặc ID.</div>
                <a href="detail.php?slug=test-huong-nghiep-pac" class="api-link" target="_blank">Test API</a>
                <div class="example">GET /api/services/detail.php?slug=test-huong-nghiep-pac</div>
            </div>

            <div class="api-card">
                <div class="api-title">📦 Danh sách gói</div>
                <div class="api-desc">Lấy danh sách các gói dịch vụ của một sản phẩm cụ thể.</div>
                <a href="packages.php?product_slug=viet-luan-tang-cuong" class="api-link" target="_blank">Test API</a>
                <div class="example">GET /api/services/packages.php?product_slug=viet-luan-tang-cuong</div>
            </div>

            <div class="api-card">
                <div class="api-title">📋 Chi tiết gói</div>
                <div class="api-desc">Lấy thông tin chi tiết của một gói dịch vụ cụ thể.</div>
                <a href="package-detail.php?package_slug=nhom-6" class="api-link" target="_blank">Test API</a>
                <div class="example">GET /api/services/package-detail.php?package_slug=nhom-6</div>
            </div>

            <div class="api-card">
                <div class="api-title">🏷️ Dịch vụ theo loại</div>
                <div class="api-desc">Lấy danh sách dịch vụ theo loại cụ thể: khóa học, tư vấn, hoặc test.</div>
                <a href="by-type.php?type=course" class="api-link" target="_blank">Test API</a>
                <div class="example">GET /api/services/by-type.php?type=course</div>
            </div>

            <div class="api-card">
                <div class="api-title">🔍 Tìm kiếm</div>
                <div class="api-desc">Tìm kiếm dịch vụ theo từ khóa với tính năng scoring thông minh.</div>
                <a href="search.php?q=viết%20luận" class="api-link" target="_blank">Test API</a>
                <div class="example">GET /api/services/search.php?q=viết luận</div>
            </div>

            <div class="api-card">
                <div class="api-title">📊 Thống kê</div>
                <div class="api-desc">Lấy thống kê tổng quan về tất cả dịch vụ, gói và giá cả.</div>
                <a href="stats.php" class="api-link" target="_blank">Test API</a>
                <div class="example">GET /api/services/stats.php</div>
            </div>

            <div class="api-card">
                <div class="api-title">🧪 Test Tool</div>
                <div class="api-desc">Công cụ test tương tác để kiểm tra tất cả API endpoints.</div>
                <a href="test.html" class="api-link" target="_blank">Mở Test Tool</a>
                <div class="example">Interactive testing interface</div>
            </div>
        </div>

        <div class="stats">
            <h3>📖 Tài liệu</h3>
            <p>
                <a href="README.md" style="color: #ffc107; text-decoration: none;">📚 Xem tài liệu API chi tiết</a>
            </p>
        </div>

        <div class="footer">
            <p>💻 <strong>PAC Services API</strong> - Version 1.0</p>
            <p>Được phát triển để cung cấp dữ liệu cho website PAC và các ứng dụng liên quan.</p>
        </div>
    </div>
</body>
</html>
