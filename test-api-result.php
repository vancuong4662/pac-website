<?php
/**
 * Quick test for get-result.php API
 */

// Simulate session for testing
session_start();
$_SESSION['user_id'] = 1; // Mock user ID

// Set exam_code parameter
$_GET['exam_code'] = 'TEST123';

echo "Testing get-result.php API...\n";
echo "URL: api/quiz/get-result.php?exam_code=TEST123\n\n";

// Capture output
ob_start();
try {
    include 'api/quiz/get-result.php';
    $output = ob_get_contents();
} catch (Exception $e) {
    $output = "Error: " . $e->getMessage();
}
ob_end_clean();

echo "Response:\n";
echo $output;
echo "\n\nTest completed.";
?>