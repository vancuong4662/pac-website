<?php
/**
 * Test VNPay Production Hash
 * Debug tool to verify correct hash algorithm and secret key
 */

require_once 'config/vnpay-config.php';

// Sample data from your console log
$testData = [
    'vnp_Amount' => '2475000000',
    'vnp_BankCode' => 'NCB',
    'vnp_Bill_Country' => 'VN',
    'vnp_Bill_Email' => 'admin@pac.edu.vn',
    'vnp_Bill_FirstName' => 'Admin PAC',
    'vnp_Bill_Mobile' => '0966013663',
    'vnp_Command' => 'pay',
    'vnp_CreateDate' => '20251121143217',
    'vnp_CurrCode' => 'VND',
    'vnp_ExpireDate' => '20251121144717',
    'vnp_IpAddr' => '171.252.189.23',
    'vnp_Locale' => 'vn',
    'vnp_OrderInfo' => 'Thanh toan don hang PAC Group 28',
    'vnp_OrderType' => 'other',
    'vnp_ReturnUrl' => 'https://unlockyourcareer.vn/payment-result',
    'vnp_TmnCode' => 'UNLOCKY1',
    'vnp_TxnRef' => 'PAC20251121143217395_1763710337',
    'vnp_Version' => '2.1.0'
];

// Production credentials to test
$secretKeys = [
    'current' => '5U1DBZKMQOX0QTV5YZT02KVSGQIFRJC5',
    // Add other possible keys here if you have them
];

echo "<h2>VNPay Production Hash Test</h2>";
echo "<p><strong>Testing TMN Code:</strong> UNLOCKY1</p>";
echo "<hr>";

// Create hash data string
ksort($testData);
$hashdata = "";
$i = 0;
foreach ($testData as $key => $value) {
    if ($i == 1) {
        $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
    } else {
        $hashdata .= urlencode($key) . "=" . urlencode($value);
        $i = 1;
    }
}

echo "<h3>Hash Data String:</h3>";
echo "<pre style='background: #f5f5f5; padding: 10px; overflow-x: auto;'>" . htmlspecialchars($hashdata) . "</pre>";
echo "<hr>";

foreach ($secretKeys as $keyName => $secretKey) {
    echo "<h3>Testing Secret Key: $keyName</h3>";
    echo "<p><code>" . htmlspecialchars($secretKey) . "</code></p>";
    
    // Test SHA256
    $hash256 = hash_hmac('sha256', $hashdata, $secretKey);
    echo "<p><strong>SHA256 Hash:</strong><br>";
    echo "<code style='background: #e3f2fd; padding: 5px;'>" . $hash256 . "</code></p>";
    
    // Test SHA512
    $hash512 = hash_hmac('sha512', $hashdata, $secretKey);
    echo "<p><strong>SHA512 Hash:</strong><br>";
    echo "<code style='background: #fff3e0; padding: 5px;'>" . $hash512 . "</code></p>";
    
    echo "<hr>";
}

echo "<h3>Your Current Hash (from console):</h3>";
echo "<code style='background: #ffebee; padding: 5px;'>311634337be8052cfe49d823f2f3c598f0995fdeb28a62261548e18ceca6b95c94b4ec7ff5129f64b676a9278279c80b04a1bb1358f2767e2613e336c10273a7</code>";

echo "<hr>";
echo "<p><em>Compare the generated hashes above with your current hash. The matching one indicates the correct algorithm.</em></p>";
echo "<p><strong>Note:</strong> If none match, the secret key might be incorrect. Check VNPay merchant admin panel.</p>";
?>
