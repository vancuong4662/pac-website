<?php
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once '../../config/db-pdo.php';
require_once '../../config/vnpay-config.php';
require_once '../../api/auth/middleware.php';

// Function to remove Vietnamese accents
function removeVietnameseAccents($str) {
    $vietnamese = array(
        'à','á','ả','ã','ạ','ă','ằ','ắ','ẳ','ẵ','ặ','â','ầ','ấ','ẩ','ẫ','ậ',
        'è','é','ẻ','ẽ','ẹ','ê','ề','ế','ể','ễ','ệ',
        'ì','í','ỉ','ĩ','ị',
        'ò','ó','ỏ','õ','ọ','ô','ồ','ố','ổ','ỗ','ộ','ơ','ờ','ớ','ở','ỡ','ợ',
        'ù','ú','ủ','ũ','ụ','ư','ừ','ứ','ử','ữ','ự',
        'ỳ','ý','ỷ','ỹ','ỵ',
        'đ',
        'À','Á','Ả','Ã','Ạ','Ă','Ằ','Ắ','Ẳ','Ẵ','Ặ','Â','Ầ','Ấ','Ẩ','Ẫ','Ậ',
        'È','É','Ẻ','Ẽ','Ẹ','Ê','Ề','Ế','Ể','Ễ','Ệ',
        'Ì','Í','Ỉ','Ĩ','Ị',
        'Ò','Ó','Ỏ','Õ','Ọ','Ô','Ồ','Ố','Ổ','Ỗ','Ộ','Ơ','Ờ','Ớ','Ở','Ỡ','Ợ',
        'Ù','Ú','Ủ','Ũ','Ụ','Ư','Ừ','Ứ','Ử','Ữ','Ự',
        'Ỳ','Ý','Ỷ','Ỹ','Ỵ',
        'Đ'
    );
    
    $latin = array(
        'a','a','a','a','a','a','a','a','a','a','a','a','a','a','a','a','a',
        'e','e','e','e','e','e','e','e','e','e','e',
        'i','i','i','i','i',
        'o','o','o','o','o','o','o','o','o','o','o','o','o','o','o','o','o',
        'u','u','u','u','u','u','u','u','u','u','u',
        'y','y','y','y','y',
        'd',
        'A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A',
        'E','E','E','E','E','E','E','E','E','E','E',
        'I','I','I','I','I',
        'O','O','O','O','O','O','O','O','O','O','O','O','O','O','O','O','O',
        'U','U','U','U','U','U','U','U','U','U','U',
        'Y','Y','Y','Y','Y',
        'D'
    );
    
    $result = str_replace($vietnamese, $latin, $str);
    // Remove special characters except alphanumeric, space, dash, dot
    $result = preg_replace('/[^a-zA-Z0-9\s\-\.]/', '', $result);
    return $result;
}

// Kiểm tra authentication
// Allow test user session from test-vnpay-order.php
if (isset($_SESSION['user_id']) && $_SESSION['email'] === 'test@vnpay.com') {
    $user = [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'email' => $_SESSION['email'],
        'role' => $_SESSION['role']
    ];
} else {
    $user = verifySession();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit;
    }
}

// Lấy dữ liệu JSON
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!isset($input['order_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Order ID is required']);
    exit;
}

$orderId = (int)$input['order_id'];
$orderInfo = isset($input['order_info']) ? trim($input['order_info']) : '';
$bankCode = isset($input['bank_code']) ? trim($input['bank_code']) : '';
$credentialType = isset($input['credential_type']) ? trim($input['credential_type']) : null;

// Determine test mode
if ($credentialType === 'sandbox') {
    $testMode = true;
} elseif ($credentialType === 'production') {
    $testMode = false;
} else {
    // Use global config from vnpay-config.php
    $testMode = $vnp_test;
}

// Get credentials from vnpay-config.php helper function
$credentials = vnpay_get_credentials($testMode);
$vnp_TmnCode = $credentials['tmn_code'];
$vnp_HashSecret = $credentials['hash_secret'];
$vnp_Url = $credentials['url'];
$vnp_HashType = $credentials['hash_type'];
$actualCredentialType = $credentials['type'];

if ($orderId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid order ID']);
    exit;
}

try {
    // Lấy thông tin đơn hàng - cho phép test orders (order_code bắt đầu bằng TEST)
    $stmt = $pdo->prepare("
        SELECT o.*, u.fullname as customer_name, u.email as customer_email, u.phone as customer_phone
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    ");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    
    if (!$order) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit;
    }
    
    // Kiểm tra ownership - bỏ qua nếu là test order
    $isTestOrder = (strpos($order['order_code'], 'TEST') === 0);
    if (!$isTestOrder && $order['user_id'] != $user['id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'You do not have permission to access this order']);
        exit;
    }
    
    // Kiểm tra trạng thái đơn hàng
    if ($order['status'] !== 'pending') {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Order is not in pending status',
            'current_status' => $order['status']
        ]);
        exit;
    }
    
    if ($order['payment_status'] === 'paid') {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Order is already paid',
            'payment_status' => $order['payment_status']
        ]);
        exit;
    }
    
    // Tạo mã giao dịch unique
    $vnp_TxnRef = $order['order_code'] . '_' . time();
    
    // Cập nhật order với vnpay transaction reference
    $stmt = $pdo->prepare("
        UPDATE orders 
        SET vnpay_txn_ref = ?,
            payment_method = 'vnpay',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ");
    $stmt->execute([$vnp_TxnRef, $orderId]);
    
    // Chuẩn bị thông tin thanh toán
    $vnp_Amount = $order['total_amount'] * 100; // VNPay yêu cầu số tiền tính bằng xu (x100)
    
    // OrderInfo không được có dấu tiếng Việt và ký tự đặc biệt
    $vnp_OrderInfo = $orderInfo ?: "Thanh toan don hang " . $order['order_code'] . " PAC Group";
    // Remove Vietnamese accents and special characters
    $vnp_OrderInfo = removeVietnameseAccents($vnp_OrderInfo);
    
    $vnp_OrderType = "other";
    $vnp_CreateDate = date('YmdHis');
    $vnp_ExpireDate = date('YmdHis', strtotime('+15 minutes'));
    
    // Thông tin khách hàng - clean data
    $vnp_Bill_Mobile = preg_replace('/[^0-9]/', '', $order['customer_phone'] ?? '');
    $vnp_Bill_Email = filter_var($order['customer_email'] ?? '', FILTER_VALIDATE_EMAIL) ?: '';
    $vnp_Bill_FirstName = removeVietnameseAccents($order['customer_name'] ?? '');
    $vnp_Bill_LastName = '';
    $vnp_Bill_Address = '';
    $vnp_Bill_City = '';
    $vnp_Bill_Country = 'VN';
    $vnp_Bill_State = '';
    
    // Client IP - ensure valid format and force IPv4
    // Default fallback IP
    $default_ip = '127.0.0.1';
    if (isset($host_ip)) {
        $default_ip = $host_ip;
    }
    
    $vnp_IpAddr = $default_ip; // Default fallback
    
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $vnp_IpAddr = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip_list = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $vnp_IpAddr = trim($ip_list[0]);
    } elseif (!empty($_SERVER['REMOTE_ADDR']) && $_SERVER['REMOTE_ADDR'] !== '::1') {
        $vnp_IpAddr = $_SERVER['REMOTE_ADDR'];
    }
    
    // Validate IP address format and convert IPv6 localhost to IPv4
    if ($vnp_IpAddr === '::1' || !filter_var($vnp_IpAddr, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $vnp_IpAddr = $default_ip;
    }
    
    // Tạo array input data
    $inputData = array(
        "vnp_Version" => $vnp_Version,
        "vnp_TmnCode" => $vnp_TmnCode,
        "vnp_Amount" => $vnp_Amount,
        "vnp_Command" => $vnp_Command,
        "vnp_CreateDate" => $vnp_CreateDate,
        "vnp_CurrCode" => $vnp_CurrCode,
        "vnp_IpAddr" => $vnp_IpAddr,
        "vnp_Locale" => $vnp_Locale,
        "vnp_OrderInfo" => $vnp_OrderInfo,
        "vnp_OrderType" => $vnp_OrderType,
        "vnp_TxnRef" => $vnp_TxnRef,
        "vnp_ExpireDate" => $vnp_ExpireDate
    );
    
    // Add return URL - always required by VNPay
    $inputData["vnp_ReturnUrl"] = $vnp_Returnurl;
    
    // Thêm bank code nếu có
    if (!empty($bankCode)) {
        $inputData['vnp_BankCode'] = $bankCode;
    }
    
    // DISABLE billing info for production testing - VNPay demo doesn't use these
    // Thêm thông tin bill nếu có
    /*
    if (!empty($vnp_Bill_Mobile)) {
        $inputData['vnp_Bill_Mobile'] = $vnp_Bill_Mobile;
    }
    if (!empty($vnp_Bill_Email)) {
        $inputData['vnp_Bill_Email'] = $vnp_Bill_Email;
    }
    if (!empty($vnp_Bill_FirstName)) {
        $inputData['vnp_Bill_FirstName'] = $vnp_Bill_FirstName;
    }
    if (!empty($vnp_Bill_LastName)) {
        $inputData['vnp_Bill_LastName'] = $vnp_Bill_LastName;
    }
    if (!empty($vnp_Bill_Address)) {
        $inputData['vnp_Bill_Address'] = $vnp_Bill_Address;
    }
    if (!empty($vnp_Bill_City)) {
        $inputData['vnp_Bill_City'] = $vnp_Bill_City;
    }
    if (!empty($vnp_Bill_Country)) {
        $inputData['vnp_Bill_Country'] = $vnp_Bill_Country;
    }
    if (!empty($vnp_Bill_State)) {
        $inputData['vnp_Bill_State'] = $vnp_Bill_State;
    }
    */
    
    // Tạo secure hash - Tự động chọn hash function dựa vào $vnp_HashType
    ksort($inputData); // Sort array by key
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
    
    // Hash using appropriate algorithm
    if ($vnp_HashType === 'SHA512') {
        $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
    } else {
        $vnpSecureHash = hash_hmac('sha256', $hashdata, $vnp_HashSecret);
    }
    
    // Build query string manually (same as VNPay demo)
    $query = "";
    foreach ($inputData as $key => $value) {
        $query .= urlencode($key) . "=" . urlencode($value) . '&';
    }
    
    // Add secure hash to URL
    $vnpayUrl = $vnp_Url . "?" . $query . 'vnp_SecureHash=' . $vnpSecureHash;
    
    // Debug: Log the request data for debugging
    error_log("=== VNPay Request Debug ===");
    error_log("Credential Type: " . $actualCredentialType);
    error_log("Test Mode: " . ($testMode ? 'YES' : 'NO'));
    error_log("TMN Code: " . $vnp_TmnCode);
    error_log("Hash Type: " . $vnp_HashType);
    error_log("Payment URL: " . $vnp_Url);
    error_log("Hash Data: " . $hashdata);
    error_log("Secure Hash: " . $vnpSecureHash);
    error_log("VNPay Return URL: " . $vnp_Returnurl);
    error_log("VNPay Full Payment URL: " . $vnpayUrl);
    error_log("VNPay Order Info: " . $vnp_OrderInfo);
    error_log("VNPay Amount: " . $vnp_Amount);
    error_log("VNPay IP: " . $vnp_IpAddr);
    error_log("VNPay TxnRef: " . $vnp_TxnRef);
    
    // Lưu thông tin giao dịch vào database
    $stmt = $pdo->prepare("
        INSERT INTO vnpay_transactions 
        (order_id, txn_ref, amount, order_info, create_date, expire_date, ip_addr, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE
        amount = VALUES(amount),
        order_info = VALUES(order_info),
        create_date = VALUES(create_date),
        expire_date = VALUES(expire_date),
        ip_addr = VALUES(ip_addr),
        status = 'pending'
    ");
    $stmt->execute([
        $orderId,
        $vnp_TxnRef,
        $vnp_Amount,
        $vnp_OrderInfo,
        $vnp_CreateDate,
        $vnp_ExpireDate,
        $vnp_IpAddr
    ]);
    
    // Trả về response
    $response = [
        'success' => true,
        'data' => [
            'payment_url' => $vnpayUrl,
            'txn_ref' => $vnp_TxnRef,
            'order_id' => $orderId,
            'order_code' => $order['order_code'],
            'amount' => $vnp_Amount / 100,
            'amount_formatted' => number_format($vnp_Amount / 100, 0, ',', '.') . ' VND',
            'order_info' => $vnp_OrderInfo,
            'create_date' => $vnp_CreateDate,
            'expire_date' => $vnp_ExpireDate,
            'expire_in_minutes' => 15,
            'credential_type' => $actualCredentialType,
            'tmn_code' => $vnp_TmnCode,
            'hash_type' => $credentials['hash_type'], // Use from credentials, not global
            'test_mode' => $testMode
        ],
        'message' => 'VNPay payment URL created successfully'
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>