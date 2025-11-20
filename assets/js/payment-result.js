// Payment Result Handler
class PaymentResultHandler {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.init();
    }

    init() {
        // Initialize AOS
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true,
                mirror: false
            });
        }

        // Process VNPay return parameters
        this.processVNPayReturn();
    }

    processVNPayReturn() {
        const vnpResponseCode = this.urlParams.get('vnp_ResponseCode');
        const vnpTransactionStatus = this.urlParams.get('vnp_TransactionStatus');
        const vnpTxnRef = this.urlParams.get('vnp_TxnRef');

        // Log for debugging
        console.log('VNPay Return Parameters:', {
            vnpResponseCode,
            vnpTransactionStatus,
            vnpTxnRef
        });

        // If we have VNPay parameters, verify with server
        if (vnpResponseCode && vnpTxnRef) {
            this.verifyPaymentWithServer();
        } else {
            setTimeout(() => {
                this.hideLoading();
                this.showError('Không tìm thấy thông tin giao dịch', {});
            }, 2000);
        }
    }

    async verifyPaymentWithServer() {
        try {
            const queryString = window.location.search;
            const response = await fetch(`api/orders/vnpay-verify.php${queryString}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            // Debug response
            const responseText = await response.text();
            console.log('VNPay Verify API Response Text:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response was:', responseText);
                throw new Error('Invalid JSON response from server');
            }
            
            setTimeout(async () => {
                this.hideLoading();
                
                if (data.success && data.payment_success) {
                    // Complete purchase process: create purchased_packages and clear cart
                    await this.completePurchase(data.data.order_id);
                    this.showSuccess(data.data);
                } else {
                    this.showError(data.message || 'Giao dịch không thành công', data.data || {});
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error verifying payment:', error);
            setTimeout(() => {
                this.hideLoading();
                this.showError('Lỗi khi xác minh thanh toán: ' + error.message, {});
            }, 2000);
        }
    }

    async completePurchase(orderId) {
        try {
            console.log('Completing purchase for order ID:', orderId);
            
            const response = await fetch('api/orders/complete-purchase.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_id: orderId
                })
            });

            const data = await response.json();
            console.log('Complete purchase response:', data);

            if (data.success) {
                console.log('Purchase completed successfully:', data.data);
                // Clear cart after successful purchase completion
                await this.clearCart();
                
                // Show toast notification
                if (typeof showToast !== 'undefined') {
                    showToast('Đơn hàng đã được xử lý thành công!', 'success');
                }
            } else {
                console.warn('Failed to complete purchase:', data.message);
                // Still clear cart as payment was successful
                await this.clearCart();
                
                // Show warning toast
                if (typeof showToast !== 'undefined') {
                    showToast('Thanh toán thành công nhưng có lỗi xử lý đơn hàng. Vui lòng liên hệ hỗ trợ.', 'warning');
                }
            }
        } catch (error) {
            console.error('Error completing purchase:', error);
            // Still clear cart as payment was successful
            await this.clearCart();
            
            // Show warning toast
            if (typeof showToast !== 'undefined') {
                showToast('Thanh toán thành công nhưng có lỗi xử lý đơn hàng. Vui lòng liên hệ hỗ trợ.', 'warning');
            }
        }
    }

    async clearCart() {
        try {
            // Clear server-side cart via API
            const response = await fetch('api/cart/clear.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Server cart cleared:', data);
            } else {
                console.warn('Failed to clear server cart:', response.status);
            }
        } catch (error) {
            console.warn('Error clearing server cart:', error);
        }

        // Also clear localStorage cart (if any)
        localStorage.removeItem('cart');
        localStorage.removeItem('cartTotal');
        localStorage.removeItem('vnpay_order_info');
        
        // Notify other tabs/windows about cart clear
        window.dispatchEvent(new Event('cartCleared'));
        
        console.log('Cart cleared after successful payment');
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    }

    showSuccess(data) {
        const successState = document.getElementById('successState');
        const transactionDetails = document.getElementById('transactionDetails');
        const resultCard = document.getElementById('resultCard');

        // Prefer existing dedicated success markup if available
        if (successState) {
            successState.classList.remove('hidden');
        }

        // If the page uses the template's single resultCard, render into it
        if ((!transactionDetails || !successState) && resultCard && data) {
            // Show the result card
            resultCard.style.display = 'block';
            
            // Build items list if available
            let itemsHtml = '';
            if (data.items && data.items.length > 0) {
                itemsHtml = `
                    <div class="detail-row">
                        <span class="detail-label">Sản phẩm đã mua:</span>
                        <div class="detail-value">
                            ${data.items.map(item => `
                                <div style="margin-bottom: 8px;">
                                    <strong>${item.product_name}</strong><br>
                                    <small>Số lượng: ${item.quantity} | Giá: ${parseFloat(item.unit_price || item.price || 0).toLocaleString('vi-VN')} VND</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            const amount = data.total_amount ? parseFloat(data.total_amount).toLocaleString('vi-VN') : '0';
            const payDate = data.pay_date ? this.formatPayDate(data.pay_date) : new Date().toLocaleString('vi-VN');
            const bankName = this.getBankName(data.bank_code) || data.bank_code || 'N/A';

            resultCard.className = 'result-card result-success';
            resultCard.innerHTML = `
                <div class="result-icon" data-aos="zoom-in">
                  <i class="fas fa-check"></i>
                </div>
                <h2 class="result-title" data-aos="fade-up">Thanh toán thành công!</h2>
                <p class="result-message" data-aos="fade-up" data-aos-delay="100">
                  Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đã được xử lý thành công.
                </p>
                
                <div class="payment-details" data-aos="fade-up" data-aos-delay="200">
                  <h4><i class="fas fa-receipt"></i>Chi tiết giao dịch</h4>
                  <div class="detail-row">
                    <span class="detail-label">Mã đơn hàng:</span>
                    <span class="detail-value">#${data.order_code || 'N/A'}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Số tiền:</span>
                    <span class="detail-value amount">${amount} VND</span>
                  </div>
                  ${data.txn_ref ? `
                  <div class="detail-row">
                    <span class="detail-label">Mã giao dịch:</span>
                    <span class="detail-value">${data.txn_ref}</span>
                  </div>` : ''}
                  ${data.transaction_no ? `
                  <div class="detail-row">
                    <span class="detail-label">Mã giao dịch VNPay:</span>
                    <span class="detail-value">${data.transaction_no}</span>
                  </div>` : ''}
                  ${data.bank_code ? `
                  <div class="detail-row">
                    <span class="detail-label">Ngân hàng:</span>
                    <span class="detail-value">${bankName}</span>
                  </div>` : ''}
                  ${data.pay_date ? `
                  <div class="detail-row">
                    <span class="detail-label">Thời gian thanh toán:</span>
                    <span class="detail-value">${payDate}</span>
                  </div>` : ''}
                  ${itemsHtml}
                  <div class="detail-row">
                    <span class="detail-label">Trạng thái:</span>
                    <span class="detail-value" style="color: #28a745; font-weight: 600;">Đã thanh toán</span>
                  </div>
                </div>
                
                <div class="result-actions" data-aos="fade-up" data-aos-delay="300">
                  <a href="payment-history" class="btn-primary-custom">
                    <i class="fas fa-shopping-bag"></i>
                    Xem sản phẩm đã mua
                  </a>
                  <a href="khoahoc" class="btn-secondary-custom">
                    <i class="fas fa-plus"></i>
                    Mua thêm sản phẩm
                  </a>
                </div>
            `;
            return;
        }

        // Fallback: if transactionDetails exists use it (older markup)
        if (transactionDetails && data) {
            const amount = data.total_amount ? parseFloat(data.total_amount).toLocaleString('vi-VN') : '0';
            const payDate = data.pay_date ? this.formatPayDate(data.pay_date) : new Date().toLocaleString('vi-VN');
            const bankName = this.getBankName(data.bank_code) || data.bank_code || 'N/A';

            let itemsHtml = '';
            if (data.items && data.items.length > 0) {
                itemsHtml = `
                    <div class="detail-row">
                        <span class="detail-label">Sản phẩm đã mua:</span>
                        <div class="detail-value">
                            ${data.items.map(item => `
                                <div style="margin-bottom: 8px;">
                                    <strong>${item.product_name}</strong><br>
                                    <small>Số lượng: ${item.quantity} | Giá: ${parseFloat(item.price).toLocaleString('vi-VN')} VND</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            transactionDetails.innerHTML = `
                <div class="detail-row">
                    <span class="detail-label">Mã đơn hàng:</span>
                    <span class="detail-value">${data.order_code || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mã giao dịch VNPay:</span>
                    <span class="detail-value">${data.transaction_no || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Khách hàng:</span>
                    <span class="detail-value">${data.customer_name || 'N/A'}</span>
                </div>
                ${itemsHtml}
                <div class="detail-row">
                    <span class="detail-label">Tổng tiền:</span>
                    <span class="detail-value amount-highlight">${amount} VND</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ngân hàng:</span>
                    <span class="detail-value">${bankName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Thời gian:</span>
                    <span class="detail-value">${payDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Trạng thái:</span>
                    <span class="detail-value" style="color: #28a745; font-weight: 600;">Đã thanh toán</span>
                </div>
            `;
        }
    }

    showError(message, data) {
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');
        const errorDetails = document.getElementById('errorDetails');
        const resultCard = document.getElementById('resultCard');

        // Prefer existing dedicated error markup if available
        if (errorState) {
            errorState.classList.remove('hidden');
        }

        if (errorMessage) {
            errorMessage.textContent = message;
        }

        // If template uses single resultCard, render error into it
        if ((!errorState || !errorMessage) && resultCard) {
            resultCard.style.display = 'block';
            resultCard.className = 'result-card result-failed';
            resultCard.innerHTML = `
                <div class="result-icon" data-aos="zoom-in">
                    <i class="fas fa-times"></i>
                </div>
                <h2 class="result-title" data-aos="fade-up">Thanh toán không thành công</h2>
                <p class="result-message" data-aos="fade-up" data-aos-delay="100">
                    ${message}
                </p>
                
                <div class="payment-details" data-aos="fade-up" data-aos-delay="200">
                    <h4><i class="fas fa-exclamation-triangle"></i>Thông tin giao dịch</h4>
                    ${data && data.order_code ? `
                    <div class="detail-row">
                        <span class="detail-label">Mã đơn hàng:</span>
                        <span class="detail-value">#${data.order_code}</span>
                    </div>` : ''}
                    ${data && data.response_code ? `
                    <div class="detail-row">
                        <span class="detail-label">Mã lỗi:</span>
                        <span class="detail-value">${data.response_code}</span>
                    </div>` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Thời gian:</span>
                        <span class="detail-value">${new Date().toLocaleString('vi-VN')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Trạng thái:</span>
                        <span class="detail-value" style="color: #dc3545;">Thất bại</span>
                    </div>
                </div>
                
                <div class="result-actions" data-aos="fade-up" data-aos-delay="300">
                    <a href="cart" class="btn-retry">
                        <i class="fas fa-redo"></i>
                        Thử lại thanh toán
                    </a>
                    <a href="/" class="btn-secondary-custom">
                        <i class="fas fa-home"></i>
                        Về trang chủ
                    </a>
                </div>
            `;
            return;
        }

        // Fallback: use existing errorDetails if available
        if (errorDetails && data) {
            errorDetails.innerHTML = `
                <div class="detail-row">
                    <span class="detail-label">Mã lỗi:</span>
                    <span class="detail-value">${data.responseCode || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mã giao dịch:</span>
                    <span class="detail-value">${data.txnRef || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Thời gian:</span>
                    <span class="detail-value">${new Date().toLocaleString('vi-VN')}</span>
                </div>
            `;
        }
    }

    showProcessing() {
        const processingState = document.getElementById('processingState');
        if (processingState) {
            processingState.classList.remove('hidden');
        }
    }

    formatPayDate(payDate) {
        if (!payDate || payDate.length !== 14) return payDate;

        try {
            const year = payDate.substring(0, 4);
            const month = payDate.substring(4, 6);
            const day = payDate.substring(6, 8);
            const hour = payDate.substring(8, 10);
            const minute = payDate.substring(10, 12);
            const second = payDate.substring(12, 14);

            const date = new Date(year, month - 1, day, hour, minute, second);
            return date.toLocaleString('vi-VN');
        } catch (e) {
            return payDate;
        }
    }

    getBankName(bankCode) {
        const bankNames = {
            'VNPAYQR': 'Thanh toán qua QR Code',
            'VNBANK': 'Ngân hàng nội địa',
            'INTCARD': 'Thẻ quốc tế',
            'VIETCOMBANK': 'Vietcombank',
            'VIETINBANK': 'VietinBank',
            'BIDV': 'BIDV',
            'AGRIBANK': 'Agribank',
            'TCB': 'Techcombank',
            'ACB': 'ACB',
            'MB': 'MB Bank',
            'SACOMBANK': 'Sacombank',
            'EXIMBANK': 'Eximbank',
            'MSBANK': 'MSB',
            'NAMABANK': 'Nam A Bank',
            'VNMART': 'VnMart',
            'VIETCAPITALBANK': 'Viet Capital Bank',
            'SCB': 'SCB',
            'DONGABANK': 'Dong A Bank',
            'TPBANK': 'TPBank',
            'OJB': 'OceanBank',
            'SEABANK': 'SeABank',
            'UOB': 'UOB',
            'STANDARDCHARTERED': 'Standard Chartered',
            'PUBLICBANK': 'Public Bank',
            'HSBC': 'HSBC',
            'SHINHAN': 'Shinhan Bank',
            'ANBBANK': 'An Binh Bank'
        };

        return bankNames[bankCode] || bankCode;
    }

    getVNPayErrorMessage(responseCode) {
        const errorMessages = {
            '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
            '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
            '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
            '11': 'Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
            '12': 'Thẻ/Tài khoản của khách hàng bị khóa.',
            '13': 'Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
            '24': 'Khách hàng hủy giao dịch',
            '51': 'Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
            '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
            '75': 'Ngân hàng thanh toán đang bảo trì.',
            '79': 'KH nhập sai mật khẩu thanh toán quá số lần quy định.',
            '99': 'Các lỗi khác'
        };

        return errorMessages[responseCode] || 'Giao dịch không thành công';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new PaymentResultHandler();
});

// Export for global use
window.PaymentResultHandler = PaymentResultHandler;