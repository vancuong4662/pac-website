<?php

require_once __DIR__ . '/../../config/db-pdo.php';

/**
 * API: Calculate Holland Code and Quiz Result
 * 
 * POST /api/quiz/calculate-result.php
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
    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['exam_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing exam_id']);
        exit();
    }
    
    $examId = (int)$input['exam_id'];
    
    if ($examId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid exam_id']);
        exit();
    }
    
    // 1. Kiểm tra exam tồn tại và đã hoàn thành
    $sql = "SELECT id, user_id, exam_status, total_questions 
            FROM quiz_exams 
            WHERE id = ? AND exam_status = 1"; // 1 = Completed
    
    $exam = $pdo->prepare($sql);
    $exam->execute([$examId]);
    $examData = $exam->fetch(PDO::FETCH_ASSOC);
    
    if (!$examData) {
        http_response_code(404);
        echo json_encode(['error' => 'Exam not found or not completed']);
        exit();
    }
    
    // 2. Kiểm tra xem đã có result chưa
    $sql = "SELECT id FROM quiz_results WHERE exam_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$examId]);
    $existingResult = $stmt->fetch();
    
    if ($existingResult) {
        echo json_encode([
            'success' => true,
            'data' => [
                'result_id' => $existingResult['id'],
                'message' => 'Result already exists'
            ]
        ]);
        exit();
    }
    
    // 3. Lấy tất cả câu trả lời
    $sql = "SELECT qa.question_id, qa.user_answer, q.holland_code
            FROM quiz_answers qa
            JOIN questions q ON qa.question_id = q.question_id
            WHERE qa.exam_id = ? AND qa.user_answer >= 0";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$examId]);
    $answers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($answers)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid answers found']);
        exit();
    }
    
    // 4. Tính điểm Holland Code
    $scores = ['R' => 0, 'I' => 0, 'A' => 0, 'S' => 0, 'E' => 0, 'C' => 0];
    
    foreach ($answers as $answer) {
        $hollandCode = $answer['holland_code'];
        $score = (int)$answer['user_answer']; // 0, 1, or 2
        
        if (isset($scores[$hollandCode])) {
            $scores[$hollandCode] += $score;
        }
    }
    
    $totalScore = array_sum($scores);
    
    // 5. Xác định Holland Code 3 ký tự (top 3 scores)
    arsort($scores); // Sort by score descending
    $topThree = array_slice(array_keys($scores), 0, 3, true);
    
    $hollandCode = implode('', $topThree);
    $primaryGroup = $topThree[0];
    $secondaryGroup = $topThree[1];
    $tertiaryGroup = $topThree[2];
    
    // 6. Lưu kết quả vào quiz_results
    $sql = "INSERT INTO quiz_results (
                exam_id, user_id, 
                score_r, score_i, score_a, score_s, score_e, score_c,
                total_score, holland_code, primary_group, secondary_group, tertiary_group,
                characteristics_code, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $characteristicsCode = substr($hollandCode, 0, 2); // First 2 characters
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $examId,
        $examData['user_id'],
        $scores['R'],
        $scores['I'], 
        $scores['A'],
        $scores['S'],
        $scores['E'],
        $scores['C'],
        $totalScore,
        $hollandCode,
        $primaryGroup,
        $secondaryGroup,
        $tertiaryGroup,
        $characteristicsCode
    ]);
    
    $resultId = $pdo->lastInsertId();
    
    // 7. Response
    echo json_encode([
        'success' => true,
        'data' => [
            'result_id' => (int)$resultId,
            'exam_id' => $examId,
            'holland_code' => $hollandCode,
            'primary_group' => $primaryGroup,
            'secondary_group' => $secondaryGroup, 
            'tertiary_group' => $tertiaryGroup,
            'characteristics_code' => $characteristicsCode,
            'total_score' => $totalScore,
            'scores' => [
                'R' => $scores['R'],
                'I' => $scores['I'],
                'A' => $scores['A'],
                'S' => $scores['S'],
                'E' => $scores['E'],
                'C' => $scores['C']
            ],
            'answered_questions' => count($answers),
            'total_questions' => $examData['total_questions']
        ],
        'message' => 'Holland Code calculated successfully'
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