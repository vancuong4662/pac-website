<?php
/**
 * Simple VNPay Production Test
 * Exactly like VNPay demo - no extra code
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
date_default_timezone_set('Asia/Ho_Chi_Minh');

// Production Config
$vnp_TmnCode = "UNLOCKY1"; // Your production TMN Code
$vnp_HashSecret = "5U1DBZKMQOX0QTV5YZT02KVSGQIFRJC5"; // Your production Secret Key
$vnp_Url = "https://pay.vnpay.vn/vpcpay.html"; // Production URL
$vnp_Returnurl = "https://unlockyourcareer.vn/payment-result";

// Test data
$vnp_TxnRef = 'TEST' . date('YmdHis') . rand(100, 999); // Simple txn ref
$vnp_Amount = 10000; // 10,000 VND test amount
$vnp_Locale = 'vn';
$vnp_BankCode = ''; // Empty for now
$vnp_IpAddr = $_SERVER['REMOTE_ADDR'];

// Expire time
$startTime = date("YmdHis");
$expire = date('YmdHis', strtotime('+15 minutes', strtotime($startTime)));

$inputData = array(
    "vnp_Version" => "2.1.0",
    "vnp_TmnCode" => $vnp_TmnCode,
    "vnp_Amount" => $vnp_Amount * 100,
    "vnp_Command" => "pay",
    "vnp_CreateDate" => date('YmdHis'),
    "vnp_CurrCode" => "VND",
    "vnp_IpAddr" => $vnp_IpAddr,
    "vnp_Locale" => $vnp_Locale,
    "vnp_OrderInfo" => "Thanh toan don hang test",
    "vnp_OrderType" => "other",
    "vnp_ReturnUrl" => $vnp_Returnurl,
    "vnp_TxnRef" => $vnp_TxnRef,
    "vnp_ExpireDate" => $expire
);

if (isset($vnp_BankCode) && $vnp_BankCode != "") {
    $inputData['vnp_BankCode'] = $vnp_BankCode;
}

ksort($inputData);
$query = "";
$i = 0;
$hashdata = "";
foreach ($inputData as $key => $value) {
    if ($i == 1) {
        $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
    } else {
        $hashdata .= urlencode($key) . "=" . urlencode($value);
        $i = 1;
    }
    $query .= urlencode($key) . "=" . urlencode($value) . '&';
}

$vnp_Url = $vnp_Url . "?" . $query;

// Debug output
echo "<h2>VNPay Production Test</h2>";
echo "<h3>Input Data:</h3>";
echo "<pre>" . print_r($inputData, true) . "</pre>";
echo "<hr>";

echo "<h3>Hash Data String:</h3>";
echo "<pre>" . htmlspecialchars($hashdata) . "</pre>";
echo "<hr>";

// Test SHA256
$hashSHA256 = hash_hmac('sha256', $hashdata, $vnp_HashSecret);
echo "<h3>SHA256 Hash:</h3>";
echo "<code style='background: #e3f2fd; padding: 10px; display: block;'>" . $hashSHA256 . "</code>";
echo "<hr>";

// Test SHA512
$hashSHA512 = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
echo "<h3>SHA512 Hash:</h3>";
echo "<code style='background: #fff3e0; padding: 10px; display: block;'>" . $hashSHA512 . "</code>";
echo "<hr>";

// Build URL with SHA512 (like demo)
$vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
$vnp_Url_SHA512 = $vnp_Url . 'vnp_SecureHash=' . $vnpSecureHash;

// Build URL with SHA256 (alternative)
$vnpSecureHash256 = hash_hmac('sha256', $hashdata, $vnp_HashSecret);
$vnp_Url_SHA256 = $vnp_Url . 'vnp_SecureHash=' . $vnpSecureHash256;

echo "<h3>Final Payment URL (SHA512):</h3>";
echo "<textarea style='width: 100%; height: 150px;'>" . $vnp_Url_SHA512 . "</textarea>";
echo "<hr>";

echo "<h3>Final Payment URL (SHA256):</h3>";
echo "<textarea style='width: 100%; height: 150px;'>" . $vnp_Url_SHA256 . "</textarea>";
echo "<hr>";

echo "<h3>Test Buttons:</h3>";
echo "<a href='" . $vnp_Url_SHA512 . "' target='_blank' style='background: #FF9800; color: white; padding: 15px 30px; text-decoration: none; display: inline-block; border-radius: 5px; font-size: 16px; margin-right: 10px;'>Test SHA512</a>";
echo "<a href='" . $vnp_Url_SHA256 . "' target='_blank' style='background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; display: inline-block; border-radius: 5px; font-size: 16px;'>Test SHA256</a>";
echo "<br><br>";
echo "<p><strong>Try BOTH buttons!</strong> One should work.</p>";
echo "<p><em>If BOTH fail with 'Invalid Signature', contact VNPay support to verify:</em></p>";
echo "<ul>";
echo "<li>TMN Code: UNLOCKY1 is correct</li>";
echo "<li>Secret Key is correct</li>";
echo "<li>Merchant is activated for production</li>";
echo "<li>Hash algorithm configured in merchant panel (SHA256 or SHA512)</li>";
echo "</ul>";
?>
