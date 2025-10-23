<?php
// VNPay IPN Handler - xử lý thông báo thanh toán tức thời từ VNPay
header('Content-Type: application/json');

require_once '../../config/db-pdo.php';
require_once '../../config/vnpay-config.php';

// Get POST data from VNPay
$inputData = json_decode(file_get_contents('php://input'), true);

// If no JSON data, try to get from $_POST
if (!$inputData) {
    $inputData = $_POST;
}

// Log the IPN request for debugging
error_log('VNPay IPN Request: ' . json_encode($inputData));

// Required parameters
$vnp_TxnRef = $inputData['vnp_TxnRef'] ?? '';
$vnp_Amount = $inputData['vnp_Amount'] ?? 0;
$vnp_OrderInfo = $inputData['vnp_OrderInfo'] ?? '';
$vnp_ResponseCode = $inputData['vnp_ResponseCode'] ?? '';
$vnp_TransactionNo = $inputData['vnp_TransactionNo'] ?? '';
$vnp_BankCode = $inputData['vnp_BankCode'] ?? '';
$vnp_PayDate = $inputData['vnp_PayDate'] ?? '';
$vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
$vnp_BankTranNo = $inputData['vnp_BankTranNo'] ?? '';
$vnp_CardType = $inputData['vnp_CardType'] ?? '';

// Response structure for VNPay
$returnData = [
    'RspCode' => '00',
    'Message' => 'Confirm Success'
];

try {
    // Verify the secure hash
    $isValidSignature = vnpay_verify_return($inputData, $vnp_HashSecret);
    
    if (!$isValidSignature) {
        error_log('VNPay IPN: Invalid signature for TxnRef: ' . $vnp_TxnRef);
        $returnData['RspCode'] = '97';
        $returnData['Message'] = 'Invalid signature';
        echo json_encode($returnData);
        exit;
    }
    
    // Find the transaction in database
    $stmt = $pdo->prepare("
        SELECT vt.*, o.user_id, o.order_code, o.id as order_id, o.payment_status
        FROM vnpay_transactions vt
        JOIN orders o ON vt.order_id = o.id
        WHERE vt.txn_ref = ?
    ");
    $stmt->execute([$vnp_TxnRef]);
    $transaction = $stmt->fetch();
    
    if (!$transaction) {
        error_log('VNPay IPN: Transaction not found for TxnRef: ' . $vnp_TxnRef);
        $returnData['RspCode'] = '01';
        $returnData['Message'] = 'Order not found';
        echo json_encode($returnData);
        exit;
    }
    
    // Check if transaction amount matches
    if ($transaction['amount'] != $vnp_Amount) {
        error_log('VNPay IPN: Amount mismatch. Expected: ' . $transaction['amount'] . ', Received: ' . $vnp_Amount);
        $returnData['RspCode'] = '04';
        $returnData['Message'] = 'Invalid amount';
        echo json_encode($returnData);
        exit;
    }
    
    // Check if order is already processed
    if ($transaction['payment_status'] === 'paid') {
        // Order already processed, but still confirm to VNPay
        error_log('VNPay IPN: Order already processed for TxnRef: ' . $vnp_TxnRef);
        echo json_encode($returnData);
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
        
        // Process purchase items
        try {
            require_once __DIR__ . '/process-purchase-helper.php';
            
            $user = ['id' => $transaction['user_id']];
            $purchaseResult = processOrderPurchases($pdo, $transaction['order_id'], $user);
            
            if (!$purchaseResult['success']) {
                error_log('VNPay IPN: Failed to process purchases for order: ' . $transaction['order_id'] . ' - ' . $purchaseResult['error']);
                // Don't fail the payment, just log the error
            }
            
        } catch (Exception $e) {
            error_log('VNPay IPN: Exception processing purchases for order: ' . $transaction['order_id'] . ' - ' . $e->getMessage());
            // Don't fail the payment, just log the error
        }
        
        // Commit all changes
        $pdo->commit();
        
        error_log('VNPay IPN: Payment processed successfully for TxnRef: ' . $vnp_TxnRef . ', Order: ' . $transaction['order_code']);
        
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
        
        error_log('VNPay IPN: Payment failed for TxnRef: ' . $vnp_TxnRef . ', ResponseCode: ' . $vnp_ResponseCode);
    }
    
    // Return success to VNPay
    echo json_encode($returnData);
    
} catch (Exception $e) {
    // Rollback on error
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log('VNPay IPN Error: ' . $e->getMessage());
    
    // Return error to VNPay
    $returnData['RspCode'] = '99';
    $returnData['Message'] = 'System error';
    echo json_encode($returnData);
}
?>