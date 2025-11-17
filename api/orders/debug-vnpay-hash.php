<?php
/**
 * Debug VNPay Hash - So sánh SHA256 vs SHA512
 * Sử dụng cấu hình từ vnpay-config.php
 */

require_once __DIR__ . '/../../config/vnpay-config.php';

// Get both credentials using helper function
$credentials = [
    'VJGIXB0L' => vnpay_get_credentials(true),  // Sandbox
    'UNLOCKY1' => vnpay_get_credentials(false)  // Production
];

// Sample data giống như VNPay payment request
$testData = [
    'vnp_Amount' => '1000000',
    'vnp_Command' => 'pay',
    'vnp_CreateDate' => date('YmdHis'),
    'vnp_CurrCode' => 'VND',
    'vnp_IpAddr' => '127.0.0.1',
    'vnp_Locale' => 'vn',
    'vnp_OrderInfo' => 'Test Payment',
    'vnp_OrderType' => 'other',
    'vnp_ReturnUrl' => 'http://127.0.0.1/0/pac-new/payment-result',
    'vnp_TmnCode' => 'PLACEHOLDER',
    'vnp_TxnRef' => 'TEST' . date('YmdHis'),
    'vnp_Version' => '2.1.0'
];

echo "<html><head>";
echo "<title>VNPay Hash Debug Tool</title>";
echo "<style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
    .config-info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .credential-section { background: white; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .hash-result { background: #f0f0f0; padding: 10px; margin: 10px 0; font-family: monospace; word-break: break-all; border-radius: 4px; }
    .sha256 { border-left: 4px solid #28a745; }
    .sha512 { border-left: 4px solid #ffc107; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; background: white; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #007bff; color: white; }
    .info-box { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107; }
    .active-mode { background: #d4edda; border-left: 4px solid #28a745; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .btn { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
    .btn:hover { background: #0056b3; }
</style>";
echo "</head><body>";

echo "<div class='header'>";
echo "<h1>🔐 VNPay Hash Debug Tool</h1>";
echo "<p>Tool này sử dụng cấu hình từ vnpay-config.php</p>";
echo "</div>";

echo "<div class='config-info'>";
echo "<h3>📌 Cấu hình hiện tại từ vnpay-config.php</h3>";
echo "<strong>Test Mode:</strong> " . ($vnp_test ? '<span style="color: #ff9800;">SANDBOX (TRUE)</span>' : '<span style="color: #4caf50;">PRODUCTION (FALSE)</span>') . "<br>";
echo "<strong>Variable:</strong> <code>\$vnp_test = " . ($vnp_test ? 'true' : 'false') . ";</code><br>";
echo "<strong>Active Credential:</strong> <strong>" . $vnp_TmnCode . "</strong> - " . ($vnp_test ? 'Sandbox' : 'Production') . "<br>";
echo "<strong>Active Hash Type:</strong> <strong>" . $vnp_HashType . "</strong>";
echo "</div>";

foreach ($credentials as $credName => $cred) {
    $isActive = ($vnp_TmnCode === $cred['tmn_code']);
    
    echo "<div class='credential-section" . ($isActive ? " active-mode" : "") . "'>";
    echo "<h2>📌 {$credName} - {$cred['type']}" . ($isActive ? " <span style='color: #28a745;'>✓ ĐANG ACTIVE</span>" : "") . "</h2>";
    
    echo "<table>";
    echo "<tr><th>Config</th><th>Value</th></tr>";
    echo "<tr><td><strong>TMN Code</strong></td><td>{$cred['tmn_code']}</td></tr>";
    echo "<tr><td><strong>Hash Secret</strong></td><td>" . substr($cred['hash_secret'], 0, 10) . "...</td></tr>";
    echo "<tr><td><strong>Payment URL</strong></td><td>{$cred['url']}</td></tr>";
    echo "<tr><td><strong>Hash Algorithm</strong></td><td><strong>{$cred['hash_type']}</strong></td></tr>";
    echo "<tr><td><strong>\$vnp_test value</strong></td><td>" . ($cred['test_mode'] ? 'true' : 'false') . "</td></tr>";
    echo "</table>";
    
    // Update test data with current TMN code
    $currentTestData = $testData;
    $currentTestData['vnp_TmnCode'] = $cred['tmn_code'];
    
    echo "<h3>✅ Hash Functions</h3>";
    
    // Test with configured hash type
    if ($cred['hash_type'] === 'SHA512') {
        echo "<div class='hash-result sha512'>";
        echo "<strong>SHA512 (vnpay_hash_data_sha512 - Recommended):</strong><br>";
        $hashSHA512 = vnpay_hash_data_sha512($currentTestData, $cred['hash_secret']);
        echo $hashSHA512;
        echo "</div>";
        
        echo "<div class='hash-result sha256'>";
        echo "<strong>SHA256 (for comparison):</strong><br>";
        $hashSHA256 = vnpay_hash_data($currentTestData, $cred['hash_secret'], 'SHA256');
        echo $hashSHA256;
        echo "</div>";
    } else {
        echo "<div class='hash-result sha256'>";
        echo "<strong>SHA256 (vnpay_hash_data - Recommended):</strong><br>";
        $hashSHA256 = vnpay_hash_data($currentTestData, $cred['hash_secret'], 'SHA256');
        echo $hashSHA256;
        echo "</div>";
        
        echo "<div class='hash-result sha512'>";
        echo "<strong>SHA512 (for comparison):</strong><br>";
        $hashSHA512 = vnpay_hash_data_sha512($currentTestData, $cred['hash_secret']);
        echo $hashSHA512;
        echo "</div>";
    }
    
    echo "<div class='info-box'>";
    echo "<strong>💡 Hướng dẫn:</strong><br>";
    echo "1. Tạo giao dịch test với {$credName}<br>";
    echo "2. Khi VNPay redirect về, copy <code>vnp_SecureHash</code> từ URL<br>";
    echo "3. So sánh hash từ VNPay với <strong>{$cred['hash_type']}</strong> hash ở trên<br>";
    echo "4. Hash khớp = Algorithm đúng cho {$credName}<br>";
    echo "</div>";
    
    echo "</div>";
}

echo "<hr>";
echo "<h3>⚙️ Thay đổi config</h3>";
echo "<p>Để switch giữa Sandbox và Production, chỉnh sửa <code>vnpay-config.php</code>:</p>";
echo "<pre style='background: #f5f5f5; padding: 15px; border-radius: 5px;'>";
echo "// Sandbox mode\n";
echo "\$vnp_test = true;  // VJGIXB0L + SHA512\n\n";
echo "// Production mode\n";
echo "\$vnp_test = false; // UNLOCKY1 + SHA256";
echo "</pre>";

echo "<hr>";
echo "<p><a href='../../testvnpay.html' class='btn'><i class='fas fa-arrow-left'></i> Quay lại Test Payment</a></p>";

echo "</body></html>";
?>
