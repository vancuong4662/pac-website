<?php
/**
 * VNPay IPN Endpoint (Root Level)
 * Proxy to actual IPN handler
 * URL: https://unlockyourcareer.vn/vnpay-ipn.php
 */

// Set JSON content type immediately
header('Content-Type: application/json; charset=utf-8');

// Forward to actual IPN handler
require_once __DIR__ . '/api/orders/vnpay-ipn.php';
