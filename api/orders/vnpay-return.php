<?php
require_once '../../config/db-pdo.php';
require_once '../../config/vnpay-config.php';

// Get query parameters from VNPay
$vnp_ResponseData = $_GET;

// Log the response for debugging
error_log('VNPay Return Response: ' . json_encode($vnp_ResponseData));

// Extract important parameters
$vnp_TxnRef = $vnp_ResponseData['vnp_TxnRef'] ?? '';
$vnp_Amount = $vnp_ResponseData['vnp_Amount'] ?? 0;
$vnp_OrderInfo = $vnp_ResponseData['vnp_OrderInfo'] ?? '';
$vnp_ResponseCode = $vnp_ResponseData['vnp_ResponseCode'] ?? '';
$vnp_TransactionNo = $vnp_ResponseData['vnp_TransactionNo'] ?? '';
$vnp_BankCode = $vnp_ResponseData['vnp_BankCode'] ?? '';
$vnp_PayDate = $vnp_ResponseData['vnp_PayDate'] ?? '';
$vnp_SecureHash = $vnp_ResponseData['vnp_SecureHash'] ?? '';
$vnp_BankTranNo = $vnp_ResponseData['vnp_BankTranNo'] ?? '';
$vnp_CardType = $vnp_ResponseData['vnp_CardType'] ?? '';

try {
    // Verify the secure hash
    $dataToHash = $vnp_ResponseData;
    unset($dataToHash['vnp_SecureHash']);
    unset($dataToHash['vnp_SecureHashType']);
    
    $isValidSignature = vnpay_verify_return($vnp_ResponseData, $vnp_HashSecret);
    
    if (!$isValidSignature) {
        error_log('VNPay Return: Invalid signature for TxnRef: ' . $vnp_TxnRef);
        header('Location: /0/pac-new/payment-result?status=error&message=' . urlencode('Chữ ký không hợp lệ'));
        exit;
    }
    
    // Find the transaction in database
    $stmt = $pdo->prepare("
        SELECT vt.*, o.user_id, o.order_code, o.id as order_id
        FROM vnpay_transactions vt
        JOIN orders o ON vt.order_id = o.id
        WHERE vt.txn_ref = ?
    ");
    $stmt->execute([$vnp_TxnRef]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        error_log('VNPay Return: Transaction not found for TxnRef: ' . $vnp_TxnRef);
        header('Location: /0/pac-new/payment-result?status=error&message=' . urlencode('Không tìm thấy giao dịch'));
        exit;
    }
    
    // Start database transaction
    $pdo->beginTransaction();
    
    // Update vnpay_transactions table
    $stmt = $pdo->prepare("
        UPDATE vnpay_transactions 
        SET vnp_response_code = ?,
            vnp_transaction_no = ?,
            vnp_bank_code = ?,
            vnp_bank_tran_no = ?,
            vnp_card_type = ?,
            vnp_pay_date = ?,
            vnp_secure_hash = ?,
            status = ?,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE txn_ref = ?
    ");
    
    // Determine transaction status based on response code
    $transactionStatus = ($vnp_ResponseCode === '00') ? 'success' : 'failed';
    
    $stmt->execute([
        $vnp_ResponseCode,
        $vnp_TransactionNo,
        $vnp_BankCode,
        $vnp_BankTranNo,
        $vnp_CardType,
        $vnp_PayDate,
        $vnp_SecureHash,
        $transactionStatus,
        $vnp_TxnRef
    ]);
    
    // Update order status if payment successful
    if ($vnp_ResponseCode === '00') {
        // Payment successful
        $stmt = $pdo->prepare("
            UPDATE orders 
            SET payment_status = 'paid',
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$transaction['order_id']]);
        
        // Process purchase items (call the same logic as payment.php)
        require_once __DIR__ . '/process-purchase-helper.php';
        
        $user = ['id' => $transaction['user_id']];
        $purchaseResult = processOrderPurchases($pdo, $transaction['order_id'], $user);
        
        // Commit all changes
        $pdo->commit();
        
        // Redirect to success page using flat route
        $successParams = http_build_query([
            'status' => 'success',
            'order_code' => $transaction['order_code'],
            'amount' => number_format($vnp_Amount / 100, 0, ',', '.'),
            'txn_ref' => $vnp_TxnRef,
            'bank_code' => $vnp_BankCode,
            'transaction_no' => $vnp_TransactionNo,
            'pay_date' => $vnp_PayDate
        ]);
        
        header('Location: /0/pac-new/payment-result?' . $successParams);
        exit;
        
    } else {
        // Payment failed
        $stmt = $pdo->prepare("
            UPDATE orders 
            SET payment_status = 'failed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$transaction['order_id']]);
        
        $pdo->commit();
        
        // Get error message
        $errorMessage = vnpay_get_response_message($vnp_ResponseCode);
        
        // Redirect to failure page using flat route
        $failureParams = http_build_query([
            'status' => 'failed',
            'order_code' => $transaction['order_code'],
            'error_code' => $vnp_ResponseCode,
            'error_message' => $errorMessage,
            'txn_ref' => $vnp_TxnRef
        ]);
        
        header('Location: /0/pac-new/payment-result?' . $failureParams);
        exit;
    }
    
} catch (Exception $e) {
    // Rollback on error
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log('VNPay Return Error: ' . $e->getMessage());
    
    // Redirect to error page using flat route
    $errorParams = http_build_query([
        'status' => 'error',
        'message' => 'Lỗi xử lý thanh toán: ' . $e->getMessage()
    ]);
    
    header('Location: /0/pac-new/payment-result?' . $errorParams);
    exit;
}
?>