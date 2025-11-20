<?php
/**
 * Test VNPay Hash Generation - Compare with demo
 */

require_once 'config/vnpay-config.php';

echo "<h1>VNPay Hash Test</h1>";
echo "<pre>";

// Sample data
$vnp_TmnCode = "UNLOCKY1";
$vnp_HashSecret = "LJIIDDXSEFHJHEXYZNATSCHPSFSXVYRU";
$vnp_Amount = 1000000; // 10,000 VND * 100

$inputData = array(
    "vnp_Version" => "2.1.0",
    "vnp_TmnCode" => $vnp_TmnCode,
    "vnp_Amount" => $vnp_Amount,
    "vnp_Command" => "pay",
    "vnp_CreateDate" => "20241118120000",
    "vnp_CurrCode" => "VND",
    "vnp_IpAddr" => "127.0.0.1",
    "vnp_Locale" => "vn",
    "vnp_OrderInfo" => "Test Payment",
    "vnp_OrderType" => "other",
    "vnp_ReturnUrl" => "http://127.0.0.1/0/pac-new/payment-result",
    "vnp_TxnRef" => "TEST20241118120000",
    "vnp_ExpireDate" => "20241118121500"
);

echo "=== INPUT DATA (before sort) ===\n";
print_r($inputData);

ksort($inputData);

echo "\n=== INPUT DATA (after sort) ===\n";
print_r($inputData);

// Build hash data (DEMO WAY)
$hashdata = "";
$i = 0;
foreach ($inputData as $key => $value) {
    if ($i == 1) {
        $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
    } else {
        $hashdata .= urlencode($key) . "=" . urlencode($value);
        $i = 1;
    }
}

echo "\n=== HASH DATA STRING ===\n";
echo $hashdata . "\n";

// SHA256 hash (Production)
$hash_sha256 = hash_hmac('sha256', $hashdata, $vnp_HashSecret);
echo "\n=== SHA256 HASH (Production - UNLOCKY1) ===\n";
echo $hash_sha256 . "\n";

// SHA512 hash (Sandbox)
$hash_sha512 = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
echo "\n=== SHA512 HASH (for comparison) ===\n";
echo $hash_sha512 . "\n";

// Build query string
$query = "";
foreach ($inputData as $key => $value) {
    $query .= urlencode($key) . "=" . urlencode($value) . '&';
}

echo "\n=== QUERY STRING ===\n";
echo $query . "\n";

// Final URL
$vnpayUrl = "https://pay.vnpay.vn/vpcpay.html?" . $query . 'vnp_SecureHash=' . $hash_sha256;
echo "\n=== FINAL URL (SHA256) ===\n";
echo $vnpayUrl . "\n";

echo "\n=== CREDENTIALS INFO ===\n";
echo "TMN Code: " . $vnp_TmnCode . "\n";
echo "Hash Secret: " . substr($vnp_HashSecret, 0, 10) . "...\n";
echo "Hash Algorithm: SHA256 (Production)\n";

echo "</pre>";

// Now test with current config
echo "<hr><h2>Test with Current Config</h2><pre>";
$credentials = vnpay_get_credentials(false); // Production
echo "Config TMN Code: " . $credentials['tmn_code'] . "\n";
echo "Config Hash Secret: " . substr($credentials['hash_secret'], 0, 10) . "...\n";
echo "Config Hash Type: " . $credentials['hash_type'] . "\n";
echo "Config URL: " . $credentials['url'] . "\n";

// Test with config credentials
$inputData['vnp_TmnCode'] = $credentials['tmn_code'];
ksort($inputData);

$hashdata_config = "";
$i = 0;
foreach ($inputData as $key => $value) {
    if ($i == 1) {
        $hashdata_config .= '&' . urlencode($key) . "=" . urlencode($value);
    } else {
        $hashdata_config .= urlencode($key) . "=" . urlencode($value);
        $i = 1;
    }
}

$hash_config = hash_hmac(strtolower($credentials['hash_type']), $hashdata_config, $credentials['hash_secret']);
echo "\nHash from config: " . $hash_config . "\n";
echo "Matches manual hash: " . ($hash_config === $hash_sha256 ? "YES ✓" : "NO ✗") . "\n";

echo "</pre>";
?>
