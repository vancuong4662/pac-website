<?php

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/CareerSuggestionEngine.php';

/**
 * API: Generate Career Suggestions
 * 
 * POST /api/quiz/generate-suggestions.php
 * Content-Type: application/json
 * 
 * Body: {
 *   "result_id": 123
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['result_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing result_id']);
        exit();
    }
    
    $resultId = (int)$input['result_id'];
    
    if ($resultId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid result_id']);
        exit();
    }
    
    // Initialize engine
    $engine = new CareerSuggestionEngine($pdo);
    
    // Generate suggestions
    $startTime = microtime(true);
    $summary = $engine->generateSuggestedJobs($resultId);
    $totalTime = round((microtime(true) - $startTime) * 1000, 2);
    
    // Return response
    echo json_encode([
        'success' => true,
        'data' => [
            'result_id' => $resultId,
            'total_jobs' => $summary['total_jobs'],
            'breakdown' => $summary['breakdown'],
            'calculation_time_ms' => $summary['calculation_time_ms'],
            'api_time_ms' => $totalTime
        ],
        'message' => 'Career suggestions generated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}