<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../../config/db-pdo.php';
require_once '../../config/vnpay-config.php';

try {
    // Get VNPay return parameters
    $inputData = array();
    foreach ($_GET as $key => $value) {
        if (substr($key, 0, 4) == "vnp_") {
            $inputData[$key] = $value;
        }
    }
    
    // Log return data for debugging
    error_log("VNPay Return API Data: " . json_encode($inputData));
    
    if (empty($inputData)) {
        throw new Exception('No VNPay return data found');
    }
    
    // Verify checksum
    $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
    $vnpData = $inputData;
    unset($vnpData['vnp_SecureHash']);
    unset($vnpData['vnp_SecureHashType']);
    
    $hashData = vnpay_hash_data($vnpData, $vnp_HashSecret);
    
    if ($hashData !== $vnp_SecureHash) {
        throw new Exception('Invalid checksum from VNPay');
    }
    
    // Extract payment info
    $vnpTxnRef = $inputData['vnp_TxnRef'] ?? '';
    $vnpAmount = ($inputData['vnp_Amount'] ?? 0) / 100;
    $vnpResponseCode = $inputData['vnp_ResponseCode'] ?? '';
    $vnpTransactionNo = $inputData['vnp_TransactionNo'] ?? '';
    $vnpBankCode = $inputData['vnp_BankCode'] ?? '';
    $vnpPayDate = $inputData['vnp_PayDate'] ?? '';
    $vnpOrderInfo = $inputData['vnp_OrderInfo'] ?? '';
    
    // Find order by transaction reference
    $stmt = $pdo->prepare("
        SELECT o.*, u.fullname as customer_name, u.email as customer_email 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        WHERE o.vnpay_txn_ref = ?
    ");
    $stmt->execute([$vnpTxnRef]);
    $order = $stmt->fetch();
    
    if (!$order) {
        throw new Exception('Order not found');
    }
    
    // Check if payment was successful
    $paymentSuccess = ($vnpResponseCode === '00');
    
    if ($paymentSuccess) {
        // Begin transaction
        $pdo->beginTransaction();
        
        try {
            // Update order status
            $stmt = $pdo->prepare("
                UPDATE orders 
                SET payment_status = 'paid',
                    status = 'completed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([$order['id']]);
            
            // Update VNPay transaction
            $stmt = $pdo->prepare("
                UPDATE vnpay_transactions 
                SET status = 'success',
                    vnp_transaction_no = ?,
                    vnp_bank_code = ?,
                    vnp_pay_date = ?,
                    vnp_response_code = ?,
                    processed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE order_id = ?
            ");
            $stmt->execute([
                $vnpTransactionNo,
                $vnpBankCode,
                $vnpPayDate,
                $vnpResponseCode,
                $order['id']
            ]);
            
            // Get order items for response
            $stmt = $pdo->prepare("
                SELECT oi.*, p.name as product_name, p.image_url, p.type as product_type
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            ");
            $stmt->execute([$order['id']]);
            $orderItems = $stmt->fetchAll();
            
            $pdo->commit();
            
            $response = [
                'success' => true,
                'payment_success' => true,
                'message' => 'Payment verified successfully',
                'data' => [
                    'order_id' => $order['id'],
                    'order_code' => $order['order_code'],
                    'total_amount' => $vnpAmount,
                    'amount_formatted' => number_format($vnpAmount, 0, ',', '.') . ' VND',
                    'customer_name' => $order['customer_name'],
                    'customer_email' => $order['customer_email'],
                    'transaction_no' => $vnpTransactionNo,
                    'bank_code' => $vnpBankCode,
                    'pay_date' => $vnpPayDate,
                    'order_info' => $vnpOrderInfo,
                    'response_code' => $vnpResponseCode,
                    'items' => $orderItems
                ]
            ];
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
        
    } else {
        // Payment failed
        $stmt = $pdo->prepare("
            UPDATE vnpay_transactions 
            SET status = 'failed',
                vnp_response_code = ?,
                vnp_transaction_no = ?,
                vnp_bank_code = ?,
                vnp_pay_date = ?,
                processed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = ?
        ");
        $stmt->execute([
            $vnpResponseCode, 
            $vnpTransactionNo, 
            $vnpBankCode, 
            $vnpPayDate, 
            $order['id']
        ]);
        
        $response = [
            'success' => true,
            'payment_success' => false,
            'message' => vnpay_get_response_message($vnpResponseCode),
            'data' => [
                'order_id' => $order['id'],
                'order_code' => $order['order_code'],
                'response_code' => $vnpResponseCode,
                'error_message' => vnpay_get_response_message($vnpResponseCode)
            ]
        ];
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("VNPay Return API Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'payment_success' => false,
        'error' => $e->getMessage(),
        'message' => 'Error processing payment result'
    ]);
}
?>