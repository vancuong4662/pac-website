-- Dọn dẹp toàn bộ database (xóa tất cả tables, views, triggers, functions, procedures)

-- 1. Tắt foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Xóa tất cả views
DROP VIEW IF EXISTS order_payment_summary;
DROP VIEW IF EXISTS vnpay_statistics;
DROP VIEW IF EXISTS pending_payments;
DROP VIEW IF EXISTS purchased_courses_view;
DROP VIEW IF EXISTS purchased_tests_view;
DROP VIEW IF EXISTS consultation_bookings_view;

-- 3. Xóa tất cả triggers
DROP TRIGGER IF EXISTS update_order_vnpay_ref;
DROP TRIGGER IF EXISTS update_order_payment_status;
DROP TRIGGER IF EXISTS generate_order_code;
DROP TRIGGER IF EXISTS validate_vnpay_transaction;
DROP TRIGGER IF EXISTS auto_create_purchased_packages;
DROP TRIGGER IF EXISTS generate_access_code;
DROP TRIGGER IF EXISTS update_access_tracking;

-- 4. Xóa tất cả functions và procedures
DROP FUNCTION IF EXISTS check_payment_status;
DROP PROCEDURE IF EXISTS sync_payment_status;

-- 5. Xóa tất cả tables (theo thứ tự tránh foreign key)
DROP TABLE IF EXISTS vnpay_transactions;
DROP TABLE IF EXISTS purchased_packages;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS product_packages;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- 6. Bật lại foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- 7. Reset database (tùy chọn - nếu muốn xóa toàn bộ database)
-- DROP DATABASE IF EXISTS pac_db;
-- CREATE DATABASE pac_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;