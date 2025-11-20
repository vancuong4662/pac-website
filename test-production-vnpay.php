<?php
/**
 * Test Production Credentials - Verify with VNPay
 */

echo "<h1>VNPay Production Credentials Test</h1>";
echo "<pre>";

// PRODUCTION credentials
$vnp_TmnCode = "UNLOCKY1";
$vnp_HashSecret = "LJIIDDXSEFHJHEXYZNATSCHPSFSXVYRU"; // ⚠️ VERIFY THIS!
$vnp_Url = "https://pay.vnpay.vn/vpcpay.html";

echo "=== PRODUCTION CREDENTIALS ===\n";
echo "TMN Code: " . $vnp_TmnCode . "\n";
echo "Hash Secret: " . $vnp_HashSecret . "\n";
echo "Payment URL: " . $vnp_Url . "\n";
echo "Hash Algorithm: SHA256\n\n";

// Simple test data
$vnp_Amount = 1000000; // 10,000 VND
$vnp_TxnRef = "TEST" . date('YmdHis');
$vnp_CreateDate = date('YmdHis');
$vnp_ExpireDate = date('YmdHis', strtotime('+15 minutes'));

$inputData = array(
    "vnp_Version" => "2.1.0",
    "vnp_TmnCode" => $vnp_TmnCode,
    "vnp_Amount" => $vnp_Amount,
    "vnp_Command" => "pay",
    "vnp_CreateDate" => $vnp_CreateDate,
    "vnp_CurrCode" => "VND",
    "vnp_IpAddr" => "127.0.0.1",
    "vnp_Locale" => "vn",
    "vnp_OrderInfo" => "Test Payment Production",
    "vnp_OrderType" => "other",
    "vnp_ReturnUrl" => "http://127.0.0.1/0/pac-new/payment-result",
    "vnp_TxnRef" => $vnp_TxnRef,
    "vnp_ExpireDate" => $vnp_ExpireDate
);

echo "=== INPUT DATA (before sort) ===\n";
print_r($inputData);

ksort($inputData);
echo "\n=== INPUT DATA (after ksort) ===\n";
print_r($inputData);

// Build hash data string
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

// Generate hash with SHA256
$vnpSecureHash = hash_hmac('sha256', $hashdata, $vnp_HashSecret);
echo "\n=== SECURE HASH (SHA256) ===\n";
echo $vnpSecureHash . "\n";

// Build query string
$query = "";
foreach ($inputData as $key => $value) {
    $query .= urlencode($key) . "=" . urlencode($value) . '&';
}

// Final payment URL
$vnpayUrl = $vnp_Url . "?" . $query . 'vnp_SecureHash=' . $vnpSecureHash;

echo "\n=== FINAL PAYMENT URL ===\n";
echo $vnpayUrl . "\n\n";

echo "\n=== IMPORTANT NOTES ===\n";
echo "1. Verify TMN Code 'UNLOCKY1' is APPROVED for production\n";
echo "2. Verify Hash Secret is correct from VNPay Merchant Portal\n";
echo "3. Production usually requires:\n";
echo "   - Real domain (not localhost)\n";
echo "   - HTTPS (not HTTP)\n";
echo "   - Registered Return URL\n";
echo "4. Check VNPay Merchant Portal > Configuration > API Settings\n";
echo "5. If still 'Sai chữ ký' error:\n";
echo "   - Hash Secret might be wrong\n";
echo "   - TMN Code might not be activated\n";
echo "   - Contact VNPay support to verify credentials\n";

echo "\n=== TEST THIS URL ===\n";
echo "<a href='" . $vnpayUrl . "' target='_blank'>Click here to test payment</a>\n";

echo "</pre>";
?>
