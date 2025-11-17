<?php
// VNPay Sandbox Configuration for PAC Group
// ⚠️ SANDBOX MODE - Chỉ dành cho testing và development

// Sandbox Mode Flag - Define this first
define('VNPAY_SANDBOX_MODE', true);

// Timezone
date_default_timezone_set('Asia/Ho_Chi_Minh');

// VNPay Sandbox Credentials - Official registered credentials (vancuong4662@gmail.com)
// Merchant Admin: https://sandbox.vnpayment.vn/merchantv2/
// Test Site: https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login

// VNPay Credentials Configuration
// Switch between Sandbox and Production - CHỈ CẦN THAY ĐỔI DÒNG NÀY!
$vnp_test = true; // true = Sandbox (VJGIXB0L), false = Production (UNLOCKY1)

/**
 * Get VNPay credentials based on test mode
 * @param bool $testMode - true for Sandbox, false for Production
 * @return array - Credentials array with tmn_code, hash_secret, url, hash_type
 */
function vnpay_get_credentials($testMode = null) {
    global $vnp_test;
    
    // Use provided test mode or fall back to global
    $mode = $testMode ?? $vnp_test;
    
    if ($mode) {
        // SANDBOX - R9BKC8DJ
        return [
            'tmn_code' => 'R9BKC8DJ',
            'hash_secret' => '5TZT9X8NNLWW7S4SP04YOPADLOL8GEMN',
            'url' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            'hash_type' => 'SHA512',
            'test_mode' => true,
            'type' => 'Sandbox'
        ];
    } else {
        // PRODUCTION - UNLOCKY1
        return [
            'tmn_code' => 'UNLOCKY1',
            'hash_secret' => 'LJIIDDXSEFHJHEXYZNATSCHPSFSXVYRU',
            'url' => 'https://pay.vnpay.vn/vpcpay.html',
            'hash_type' => 'SHA256',
            'test_mode' => false,
            'type' => 'Production'
        ];
    }
}

// Apply credentials based on $vnp_test
$credentials = vnpay_get_credentials();
$vnp_TmnCode    = $credentials['tmn_code'];
$vnp_HashSecret = $credentials['hash_secret'];
$vnp_Url        = $credentials['url'];
$vnp_HashType   = $credentials['hash_type'];

// Determine base URL dynamically
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';

// Get the project path (assuming structure: /xampp/htdocs/0/pac-new/)
$project_path = '/0/pac-new'; // Adjust if your path is different

// For VNPay sandbox testing
if (VNPAY_SANDBOX_MODE) {
    // Use your actual localhost URL with registered credentials
    // $host_ip = "103.200.23.126";
    // $base_url = 'https://unlockyourcareer.vn';
    // LOCALHOST :
    $host_ip = "127.0.0.1";
    $base_url = 'http://127.0.0.1/0/pac-new';

    $vnp_Returnurl = $base_url . "/payment-result";  // Your return URL
    $vnp_IpnUrl = $base_url . "/api/orders/vnpay-ipn";     // Your IPN URL - send this to VNPay
} else {
    // Production URLs
    $base_url = $protocol . '://' . $host . $project_path;
    $vnp_Returnurl = $base_url . "/payment-result";
    $vnp_IpnUrl = $base_url . "/api/orders/vnpay-ipn";
}

// VNPay API Configuration
$vnp_Version = "2.1.0";
$vnp_Command = "pay";
$vnp_CurrCode = "VND";
$vnp_Locale = "vn";
// $vnp_SecureHashType is now set above based on $vnp_test
$vnp_SecureHashType = $vnp_HashType; // For backward compatibility

// Test Payment Amounts (in VND)
$vnpay_test_amounts = [
    'min' => 10000,    // 10,000 VND minimum
    'max' => 50000000  // 50,000,000 VND maximum for sandbox
];

/**
 * Hash order info for VNPay (Flexible - supports both SHA256 and SHA512)
 * @param array $data - Data to hash
 * @param string $hashSecret - Secret key
 * @param string|null $hashType - Hash algorithm (SHA256, SHA512). If null, uses $vnp_SecureHashType
 * @return string - Hashed string
 */
function vnpay_hash_data($data, $hashSecret, $hashType = null) {
    global $vnp_SecureHashType;
    
    // Use provided hash type or fall back to global config
    $algorithm = $hashType ?? $vnp_SecureHashType ?? 'SHA256';
    $algorithm = strtolower($algorithm); // Convert to lowercase for hash_hmac
    
    $hashdata = "";
    ksort($data);
    $i = 0;
    foreach ($data as $key => $value) {
        if ($i == 1) {
            $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
        } else {
            $hashdata .= urlencode($key) . "=" . urlencode($value);
            $i = 1;
        }
    }
    
    return hash_hmac($algorithm, $hashdata, $hashSecret);
}

/**
 * Hash order info for VNPay with SHA512 (Legacy/Sandbox)
 * Hàm này dùng cho sandbox cũ hoặc khi cần test với SHA512
 * @param array $data - Data to hash
 * @param string $hashSecret - Secret key
 * @return string - SHA512 hashed string
 */
function vnpay_hash_data_sha512($data, $hashSecret) {
    $hashdata = "";
    ksort($data);
    $i = 0;
    foreach ($data as $key => $value) {
        if ($i == 1) {
            $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
        } else {
            $hashdata .= urlencode($key) . "=" . urlencode($value);
            $i = 1;
        }
    }
    
    return hash_hmac('sha512', $hashdata, $hashSecret);
}

/**
 * Verify return data from VNPay
 */
function vnpay_verify_return($data, $hashSecret) {
    $vnp_SecureHash = $data['vnp_SecureHash'] ?? '';
    unset($data['vnp_SecureHash']);
    unset($data['vnp_SecureHashType']);
    
    $hashData = vnpay_hash_data($data, $hashSecret);
    
    return $hashData === $vnp_SecureHash;
}

/**
 * Get VNPay response message in Vietnamese
 */
function vnpay_get_response_message($responseCode) {
    $messages = [
        '00' => 'Giao dịch thành công',
        '07' => 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
        '09' => 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
        '10' => 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
        '11' => 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
        '12' => 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
        '13' => 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.',
        '24' => 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
        '51' => 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
        '65' => 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
        '75' => 'Ngân hàng thanh toán đang bảo trì.',
        '79' => 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch',
        '99' => 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
    ];
    
    return $messages[$responseCode] ?? 'Lỗi không xác định';
}

/**
 * Get bank name from bank code
 */
function vnpay_get_bank_name($bankCode) {
    $bankNames = [
        'VNPAYQR' => 'Thanh toán qua QR Code',
        'VNBANK' => 'Ngân hàng nội địa',
        'INTCARD' => 'Thẻ quốc tế',
        'VIETCOMBANK' => 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
        'VIETINBANK' => 'Ngân hàng TMCP Công thương Việt Nam (VietinBank)',
        'BIDV' => 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
        'AGRIBANK' => 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)',
        'TCB' => 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)',
        'ACB' => 'Ngân hàng TMCP Á Châu (ACB)',
        'MB' => 'Ngân hàng TMCP Quân đội (MB Bank)',
        'SACOMBANK' => 'Ngân hàng TMCP Sài Gòn Thương tín (Sacombank)',
        'EXIMBANK' => 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam (Eximbank)',
        'MSBANK' => 'Ngân hàng TMCP Hàng hải Việt Nam (MSB)',
        'NAMABANK' => 'Ngân hàng TMCP Nam Á (Nam A Bank)',
        'VNMART' => 'Ví VnMart',
        'VIETCAPITALBANK' => 'Ngân hàng TMCP Bản Việt (Viet Capital Bank)',
        'SCB' => 'Ngân hàng TMCP Sài Gòn (SCB)',
        'DONGABANK' => 'Ngân hàng TMCP Đông Á (Dong A Bank)',
        'TPBANK' => 'Ngân hàng TMCP Tiên Phong (TPBank)',
        'OJB' => 'Ngân hàng TMCP Đại Dương (OceanBank)',
        'SEABANK' => 'Ngân hàng TMCP Đông Nam Á (SeABank)',
        'UOB' => 'Ngân hàng UOB Việt Nam (UOB)',
        'STANDARDCHARTERED' => 'Ngân hàng Standard Chartered Việt Nam',
        'PUBLICBANK' => 'Ngân hàng TNHH MTV Public Việt Nam',
        'HSBC' => 'Ngân hàng TNHH MTV HSBC Việt Nam',
        'SHINHAN' => 'Ngân hàng TNHH MTV Shinhan Việt Nam',
        'ANBBANK' => 'Ngân hàng TMCP An Bình (An Binh Bank)'
    ];
    
    return $bankNames[$bankCode] ?? $bankCode;
}

/**
 * Validate amount for sandbox mode
 */
function vnpay_validate_amount($amount) {
    global $vnpay_test_amounts;
    
    if (!VNPAY_SANDBOX_MODE) {
        return true; // No validation for production
    }
    
    return $amount >= $vnpay_test_amounts['min'] && $amount <= $vnpay_test_amounts['max'];
}

/**
 * Log VNPay transactions for debugging (sandbox only)
 */
function vnpay_debug_log($message, $data = null) {
    if (VNPAY_SANDBOX_MODE) {
        $logMessage = "[VNPay Debug] " . $message;
        if ($data) {
            $logMessage .= " - Data: " . json_encode($data);
        }
        error_log($logMessage);
    }
}

// Development warning
if (VNPAY_SANDBOX_MODE) {
    vnpay_debug_log("VNPay Sandbox Mode Active", [
        'return_url' => $vnp_Returnurl,
        'ipn_url' => $vnp_IpnUrl
    ]);
}
?>