<?php
/**
 * Media Upload API
 * Handles file upload and media management
 */

// Enable error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/db-pdo.php';

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    // Check if file was uploaded
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Không có file được upload hoặc có lỗi xảy ra');
    }

    $file = $_FILES['image'];
    $displayName = isset($_POST['display_name']) ? trim($_POST['display_name']) : '';

    // Validate file
    $validation = validateUploadedFile($file);
    if (!$validation['valid']) {
        throw new Exception($validation['message']);
    }

    // Generate filename
    $fileInfo = generateFileName($file, $displayName);
    
    // Create upload directory if not exists
    $uploadDir = '../../uploads/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            throw new Exception('Không thể tạo thư mục upload');
        }
    }

    // Move uploaded file
    $targetPath = $uploadDir . $fileInfo['stored_filename'];
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Không thể lưu file');
    }

    // Get image dimensions if it's an image
    $imageDimensions = getImageDimensions($targetPath);

    // Save to database
    $mediaId = saveToDatabase($pdo, $file, $fileInfo, $imageDimensions, $displayName);

    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Upload thành công',
        'data' => [
            'id' => $mediaId,
            'filename' => $fileInfo['stored_filename'],
            'display_name' => $fileInfo['display_name'],
            'file_path' => 'uploads/' . $fileInfo['stored_filename'],
            'file_size' => $file['size'],
            'file_type' => $file['type'],
            'dimensions' => $imageDimensions
        ]
    ]);

} catch (Exception $e) {
    error_log('Upload error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function validateUploadedFile($file) {
    // Check file size (5MB max)
    $maxSize = 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        return ['valid' => false, 'message' => 'File quá lớn. Kích thước tối đa là 5MB'];
    }

    // Check file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        return ['valid' => false, 'message' => 'Chỉ hỗ trợ file ảnh: JPG, PNG, GIF, WebP'];
    }

    // Additional security check
    $imageInfo = getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        return ['valid' => false, 'message' => 'File không phải là ảnh hợp lệ'];
    }

    return ['valid' => true];
}

function generateFileName($file, $displayName = '') {
    // Get file extension
    $pathInfo = pathinfo($file['name']);
    $extension = strtolower($pathInfo['extension']);

    // Generate stored filename
    if (!empty($displayName)) {
        // Use display name, sanitize it
        $cleanName = preg_replace('/[^a-zA-Z0-9-_]/', '', $displayName);
        $cleanName = trim($cleanName, '-_');
        
        if (strlen($cleanName) < 3) {
            $cleanName = generateRandomCode(6);
        }
    } else {
        // Generate random 6-character code
        $cleanName = generateRandomCode(6);
    }

    // Add timestamp to avoid conflicts
    $timestamp = date('YmdHis');
    $storedFilename = $cleanName . '_' . $timestamp . '.' . $extension;

    // Final display name
    $finalDisplayName = !empty($displayName) ? $displayName : $cleanName;

    return [
        'stored_filename' => $storedFilename,
        'display_name' => $finalDisplayName,
        'extension' => $extension
    ];
}

function generateRandomCode($length = 6) {
    $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $code;
}

function getImageDimensions($filePath) {
    $imageInfo = getimagesize($filePath);
    if ($imageInfo !== false) {
        return [
            'width' => $imageInfo[0],
            'height' => $imageInfo[1]
        ];
    }
    return null;
}

function saveToDatabase($pdo, $file, $fileInfo, $dimensions, $displayName) {
    $stmt = $pdo->prepare("
        INSERT INTO media_files (
            original_filename, stored_filename, display_name, file_path,
            file_size, file_type, file_extension,
            image_width, image_height,
            upload_ip, user_agent, category, status, is_public
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ");

    $filePath = 'uploads/' . $fileInfo['stored_filename'];
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $uploadIp = $_SERVER['REMOTE_ADDR'] ?? null;

    $stmt->execute([
        $file['name'],                          // original_filename
        $fileInfo['stored_filename'],           // stored_filename
        $fileInfo['display_name'],              // display_name
        $filePath,                              // file_path
        $file['size'],                          // file_size
        $file['type'],                          // file_type
        $fileInfo['extension'],                 // file_extension
        $dimensions ? $dimensions['width'] : null,   // image_width
        $dimensions ? $dimensions['height'] : null,  // image_height
        $uploadIp,                              // upload_ip
        $userAgent,                             // user_agent
        'admin',                                // category
        'active',                               // status
        true                                    // is_public
    ]);

    return $pdo->lastInsertId();
}
?>