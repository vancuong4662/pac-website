<?php

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/CareerSuggestionEngine.php';

/**
 * API: Complete Quiz Processing
 * 
 * Tích hợp workflow: Calculate Result → Generate Suggestions → Return Full Data
 * 
 * POST /api/quiz/complete-quiz.php
 * Content-Type: application/json
 * 
 * Body: {
 *   "exam_id": 123
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
    $startTime = microtime(true);
    
    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['exam_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing exam_id']);
        exit();
    }
    
    $examId = (int)$input['exam_id'];
    
    // STEP 1: Calculate Holland Code Result
    $resultData = calculateHollandCodeResult($pdo, $examId);
    $resultId = $resultData['result_id'];
    
    // STEP 2: Generate Career Suggestions
    $engine = new CareerSuggestionEngine($pdo);
    $suggestionSummary = $engine->generateSuggestedJobs($resultId);
    
    // STEP 3: Get top suggested jobs for immediate display
    $topJobs = $engine->getSuggestedJobs($resultId, null, 10); // Top 10 jobs
    
    // STEP 4: Get full summary stats
    $summary = $engine->getSuggestedJobsSummary($resultId);
    
    $totalTime = round((microtime(true) - $startTime) * 1000, 2);
    
    // Return comprehensive response
    echo json_encode([
        'success' => true,
        'data' => [
            // Quiz Result
            'result' => $resultData,
            
            // Career Suggestions Summary
            'suggestions' => [
                'total_jobs' => $suggestionSummary['total_jobs'],
                'breakdown' => $suggestionSummary['breakdown'],
                'calculation_time_ms' => $suggestionSummary['calculation_time_ms']
            ],
            
            // Top Jobs for Preview
            'top_jobs' => array_map(function($job) {
                return [
                    'id' => $job['id'],
                    'job_name' => $job['job_name'],
                    'holland_code' => $job['holland_code'],
                    'star_rating' => (int)$job['star_rating'],
                    'match_score' => (float)$job['match_score'],
                    'job_group' => $job['job_group'],
                    'essential_ability' => $job['essential_ability'],
                    'education_level' => $job['education_level'],
                    'work_areas' => json_decode($job['work_areas'], true) ?: []
                ];
            }, $topJobs),
            
            // Statistics
            'stats' => array_map(function($stat) {
                return [
                    'star_rating' => (int)$stat['star_rating'],
                    'count' => (int)$stat['count'],
                    'avg_score' => round((float)$stat['avg_score'], 2)
                ];
            }, $summary),
            
            // API Performance
            'performance' => [
                'total_time_ms' => $totalTime,
                'breakdown' => [
                    'holland_calculation' => 'included in total',
                    'job_suggestions' => $suggestionSummary['calculation_time_ms'],
                    'api_overhead' => round($totalTime - $suggestionSummary['calculation_time_ms'], 2)
                ]
            ]
        ],
        'message' => 'Quiz completed successfully with career suggestions'
    ], JSON_UNESCAPED_UNICODE);
    
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

/**
 * Helper function: Calculate Holland Code Result
 */
function calculateHollandCodeResult($pdo, $examId) {
    // 1. Kiểm tra exam
    $sql = "SELECT id, user_id, exam_status, total_questions 
            FROM quiz_exams 
            WHERE id = ? AND exam_status = 1";
    
    $exam = $pdo->prepare($sql);
    $exam->execute([$examId]);
    $examData = $exam->fetch(PDO::FETCH_ASSOC);
    
    if (!$examData) {
        throw new Exception('Exam not found or not completed');
    }
    
    // 2. Kiểm tra existing result
    $sql = "SELECT * FROM quiz_results WHERE exam_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$examId]);
    $existingResult = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingResult) {
        return [
            'result_id' => $existingResult['id'],
            'exam_id' => $examId,
            'holland_code' => $existingResult['holland_code'],
            'primary_group' => $existingResult['primary_group'],
            'secondary_group' => $existingResult['secondary_group'],
            'tertiary_group' => $existingResult['tertiary_group'],
            'characteristics_code' => $existingResult['characteristics_code'],
            'total_score' => $existingResult['total_score'],
            'scores' => [
                'R' => $existingResult['score_r'],
                'I' => $existingResult['score_i'],
                'A' => $existingResult['score_a'],
                'S' => $existingResult['score_s'],
                'E' => $existingResult['score_e'],
                'C' => $existingResult['score_c']
            ],
            'is_existing' => true
        ];
    }
    
    // 3. Calculate new result
    $sql = "SELECT qa.question_id, qa.user_answer, q.holland_code
            FROM quiz_answers qa
            JOIN questions q ON qa.question_id = q.question_id
            WHERE qa.exam_id = ? AND qa.user_answer >= 0";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$examId]);
    $answers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($answers)) {
        throw new Exception('No valid answers found');
    }
    
    // Calculate scores
    $scores = ['R' => 0, 'I' => 0, 'A' => 0, 'S' => 0, 'E' => 0, 'C' => 0];
    
    foreach ($answers as $answer) {
        $hollandCode = $answer['holland_code'];
        $score = (int)$answer['user_answer'];
        
        if (isset($scores[$hollandCode])) {
            $scores[$hollandCode] += $score;
        }
    }
    
    $totalScore = array_sum($scores);
    
    // Determine Holland Code
    arsort($scores);
    $topThree = array_slice(array_keys($scores), 0, 3, true);
    
    $hollandCode = implode('', $topThree);
    $characteristicsCode = substr($hollandCode, 0, 2);
    
    // Save result
    $sql = "INSERT INTO quiz_results (
                exam_id, user_id, 
                score_r, score_i, score_a, score_s, score_e, score_c,
                total_score, holland_code, primary_group, secondary_group, tertiary_group,
                characteristics_code, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $examId,
        $examData['user_id'],
        $scores['R'], $scores['I'], $scores['A'],
        $scores['S'], $scores['E'], $scores['C'],
        $totalScore,
        $hollandCode,
        $topThree[0], $topThree[1], $topThree[2],
        $characteristicsCode
    ]);
    
    return [
        'result_id' => (int)$pdo->lastInsertId(),
        'exam_id' => $examId,
        'holland_code' => $hollandCode,
        'primary_group' => $topThree[0],
        'secondary_group' => $topThree[1],
        'tertiary_group' => $topThree[2],
        'characteristics_code' => $characteristicsCode,
        'total_score' => $totalScore,
        'scores' => $scores,
        'answered_questions' => count($answers),
        'total_questions' => $examData['total_questions'],
        'is_existing' => false
    ];
}