<?php

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/CareerSuggestionEngine.php';

/**
 * API: Get Suggested Jobs
 * 
 * GET /api/quiz/suggested-jobs.php?result_id=123&star=5&limit=20
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Parse query parameters
    $resultId = isset($_GET['result_id']) ? (int)$_GET['result_id'] : 0;
    $starFilter = isset($_GET['star']) ? (int)$_GET['star'] : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    if ($resultId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing or invalid result_id']);
        exit();
    }
    
    if ($starFilter && ($starFilter < 2 || $starFilter > 5)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid star filter. Must be 2-5']);
        exit();
    }
    
    if ($limit > 100) {
        $limit = 100; // Maximum limit
    }
    
    // Initialize engine
    $engine = new CareerSuggestionEngine($pdo);
    
    // Get suggested jobs
    $jobs = $engine->getSuggestedJobs($resultId, $starFilter, $limit + 1); // +1 để check có more data không
    
    $hasMore = count($jobs) > $limit;
    if ($hasMore) {
        array_pop($jobs); // Remove extra item
    }
    
    // Apply offset
    if ($offset > 0) {
        $jobs = array_slice($jobs, $offset);
    }
    
    // Get summary stats
    $summary = $engine->getSuggestedJobsSummary($resultId);
    
    // Format response
    $response = [
        'success' => true,
        'data' => [
            'result_id' => $resultId,
            'jobs' => array_map(function($job) {
                // Parse JSON fields
                $job['work_areas'] = json_decode($job['work_areas'], true) ?: [];
                $job['main_tasks'] = json_decode($job['main_tasks'], true) ?: [];
                $job['specializations'] = json_decode($job['specializations'], true) ?: [];
                
                // Convert boolean
                $job['is_highlighted'] = (bool)$job['is_highlighted'];
                
                return $job;
            }, $jobs),
            'pagination' => [
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => $hasMore,
                'total_in_filter' => count($jobs) + $offset + ($hasMore ? 1 : 0)
            ],
            'summary' => array_map(function($stat) {
                return [
                    'star_rating' => (int)$stat['star_rating'],
                    'count' => (int)$stat['count'],
                    'avg_score' => round((float)$stat['avg_score'], 2)
                ];
            }, $summary),
            'filters' => [
                'star_filter' => $starFilter,
                'applied' => $starFilter ? "Jobs with {$starFilter} stars" : 'All jobs'
            ]
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
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