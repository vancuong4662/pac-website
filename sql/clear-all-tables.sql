-- =====================================================
-- PAC Database Complete Cleanup Script
-- =====================================================
-- 
-- CHỨC NĂNG: Dọn dẹp toàn bộ database (xóa tất cả tables, views, triggers, functions, procedures)
-- 
-- BAO GỒM:
-- - Quiz system tables (quiz_exams, quiz_answers, quiz_results, quiz_user_limits, etc.)
-- - Legacy Holland Code tables (questions, test_results, test_answers)
-- - E-commerce tables (products, orders, vnpay_transactions, etc.)
-- - User management tables (users, sessions)
-- - All views, triggers, functions, and procedures
--
-- CẢNH BÁO: File này sẽ XÓA TẤT CẢ dữ liệu trong database!
-- Chỉ sử dụng khi muốn reset hoàn toàn database về trạng thái ban đầu.
-- =====================================================

-- 1. Tắt foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Xóa tất cả views
DROP VIEW IF EXISTS order_payment_summary;
DROP VIEW IF EXISTS vnpay_statistics;
DROP VIEW IF EXISTS pending_payments;
DROP VIEW IF EXISTS purchased_courses_view;
DROP VIEW IF EXISTS purchased_tests_view;
DROP VIEW IF EXISTS consultation_bookings_view;
DROP VIEW IF EXISTS quiz_package_details;

-- 3. Xóa tất cả triggers
DROP TRIGGER IF EXISTS update_order_vnpay_ref;
DROP TRIGGER IF EXISTS update_order_payment_status;
DROP TRIGGER IF EXISTS generate_order_code;
DROP TRIGGER IF EXISTS validate_vnpay_transaction;
DROP TRIGGER IF EXISTS auto_create_purchased_packages;
DROP TRIGGER IF EXISTS generate_access_code;
DROP TRIGGER IF EXISTS update_access_tracking;
DROP TRIGGER IF EXISTS tr_quiz_exams_set_exam_type;

-- 4. Xóa tất cả functions và procedures
DROP FUNCTION IF EXISTS check_payment_status;
DROP FUNCTION IF EXISTS GetExamTypeFromQuestionCount;
DROP PROCEDURE IF EXISTS sync_payment_status;

-- 5. Xóa tất cả tables (theo thứ tự tránh foreign key)

-- Quiz system tables (new - package integration)
DROP TABLE IF EXISTS quiz_suggested_jobs;
DROP TABLE IF EXISTS quiz_fraud_logs;
DROP TABLE IF EXISTS quiz_package_configs;
DROP TABLE IF EXISTS quiz_user_limits;
DROP TABLE IF EXISTS quiz_results;
DROP TABLE IF EXISTS quiz_answers;
DROP TABLE IF EXISTS quiz_exams;

-- Jobs master data table
DROP TABLE IF EXISTS jobs;

-- Legacy Holland Code tables
DROP TABLE IF EXISTS test_answers;
DROP TABLE IF EXISTS test_results;
DROP TABLE IF EXISTS questions;

-- E-commerce tables
DROP TABLE IF EXISTS vnpay_transactions;
DROP TABLE IF EXISTS purchased_packages;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS product_packages;
DROP TABLE IF EXISTS products;

-- Media management table
DROP TABLE IF EXISTS media_files;

-- User management tables
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- 6. Bật lại foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- 7. Thông báo hoàn thành
SELECT 'Database cleanup completed successfully!' as status,
       'All tables, views, triggers, functions, and procedures have been dropped.' as message,
       'You can now run create-all-tables.sql to recreate the database structure.' as next_step;

-- 8. Reset database (tùy chọn - nếu muốn xóa toàn bộ database)
-- DROP DATABASE IF EXISTS pac_db;
-- CREATE DATABASE pac_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;