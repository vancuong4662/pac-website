<?php
/**
 * Global Constants - PAC Website
 * Các hằng số toàn cục cho hệ thống
 */

// Application info
define('APP_NAME', 'PAC - Psychology Assessment Center');
define('APP_VERSION', '2.0.0');
define('APP_ENVIRONMENT', 'development'); // development, staging, production

// Database constants
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATION', 'utf8mb4_unicode_ci');

// Authentication
define('SESSION_LIFETIME', 24 * 60 * 60); // 24 hours
define('REMEMBER_ME_LIFETIME', 30 * 24 * 60 * 60); // 30 days

// User roles
define('USER_ROLE_ADMIN', 'admin');
define('USER_ROLE_USER', 'user');
define('USER_ROLE_GUEST', 'guest');

// File paths
define('ROOT_PATH', dirname(__DIR__));
define('CONFIG_PATH', ROOT_PATH . '/config');
define('INCLUDES_PATH', ROOT_PATH . '/includes');
define('API_PATH', ROOT_PATH . '/api');
define('TEMPLATES_PATH', ROOT_PATH . '/templates');
define('ASSETS_PATH', ROOT_PATH . '/assets');
define('UPLOADS_PATH', ROOT_PATH . '/uploads');
define('LOGS_PATH', ROOT_PATH . '/logs');

// URL paths
define('BASE_URL', 'http://localhost/pac-new');
define('API_BASE_URL', BASE_URL . '/api');
define('ASSETS_URL', BASE_URL . '/assets');
define('UPLOADS_URL', BASE_URL . '/uploads');

// HTTP Status codes
define('HTTP_OK', 200);
define('HTTP_CREATED', 201);
define('HTTP_BAD_REQUEST', 400);
define('HTTP_UNAUTHORIZED', 401);
define('HTTP_FORBIDDEN', 403);
define('HTTP_NOT_FOUND', 404);
define('HTTP_METHOD_NOT_ALLOWED', 405);
define('HTTP_CONFLICT', 409);
define('HTTP_UNPROCESSABLE_ENTITY', 422);
define('HTTP_TOO_MANY_REQUESTS', 429);
define('HTTP_INTERNAL_SERVER_ERROR', 500);
define('HTTP_SERVICE_UNAVAILABLE', 503);

// Response formats
define('RESPONSE_JSON', 'json');
define('RESPONSE_HTML', 'html');
define('RESPONSE_XML', 'xml');

// Pagination
define('DEFAULT_PAGE', 1);
define('DEFAULT_LIMIT', 20);
define('MAX_LIMIT', 100);

// Validation rules
define('MIN_PASSWORD_LENGTH', 6);
define('MAX_PASSWORD_LENGTH', 255);
define('MIN_USERNAME_LENGTH', 3);
define('MAX_USERNAME_LENGTH', 50);
define('MAX_EMAIL_LENGTH', 255);
define('MAX_NAME_LENGTH', 100);

// File upload
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
define('ALLOWED_DOCUMENT_TYPES', ['pdf', 'doc', 'docx', 'xls', 'xlsx']);
define('MAX_IMAGE_SIZE', 2 * 1024 * 1024); // 2MB
define('MAX_DOCUMENT_SIZE', 10 * 1024 * 1024); // 10MB

// Email settings
define('EMAIL_FROM_NAME', 'PAC System');
define('EMAIL_FROM_ADDRESS', 'noreply@pac.local');

// Timezone
define('DEFAULT_TIMEZONE', 'Asia/Ho_Chi_Minh');

// Date formats
define('DATE_FORMAT', 'Y-m-d');
define('DATETIME_FORMAT', 'Y-m-d H:i:s');
define('DISPLAY_DATE_FORMAT', 'd/m/Y');
define('DISPLAY_DATETIME_FORMAT', 'd/m/Y H:i');

// Currency
define('DEFAULT_CURRENCY', 'VND');
define('CURRENCY_SYMBOL', '₫');

// Languages
define('DEFAULT_LANGUAGE', 'vi');
define('SUPPORTED_LANGUAGES', ['vi', 'en']);

// Cache keys
define('CACHE_PREFIX', 'pac_');
define('CACHE_USER_PREFIX', CACHE_PREFIX . 'user_');
define('CACHE_QUIZ_PREFIX', CACHE_PREFIX . 'quiz_');
define('CACHE_CONFIG_PREFIX', CACHE_PREFIX . 'config_');

// Security
define('CSRF_TOKEN_NAME', '_token');
define('CSRF_TOKEN_LENGTH', 32);
define('PASSWORD_HASH_ALGO', PASSWORD_DEFAULT);

// API versioning
define('API_VERSION', 'v1');
define('API_VERSION_HEADER', 'X-API-Version');

// Content types
define('CONTENT_TYPE_JSON', 'application/json');
define('CONTENT_TYPE_HTML', 'text/html');
define('CONTENT_TYPE_XML', 'application/xml');
define('CONTENT_TYPE_FORM', 'application/x-www-form-urlencoded');
define('CONTENT_TYPE_MULTIPART', 'multipart/form-data');

// Regular expressions
define('REGEX_EMAIL', '/^[^\s@]+@[^\s@]+\.[^\s@]+$/');
define('REGEX_PHONE', '/^[\+]?[0-9\s\-\(\)]{10,15}$/');
define('REGEX_USERNAME', '/^[a-zA-Z0-9_]{3,50}$/');

// Error logging
define('LOG_ERRORS', true);
define('LOG_LEVEL_DEBUG', 1);
define('LOG_LEVEL_INFO', 2);
define('LOG_LEVEL_WARNING', 3);
define('LOG_LEVEL_ERROR', 4);
define('LOG_LEVEL_CRITICAL', 5);

?>