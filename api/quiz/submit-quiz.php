<?php
/**
 * Submit Quiz API
 * Nộp bài quiz và tính toán kết quả Holland Code
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../../config/db-pdo.php';
require_once '../../config/error-codes.php';
require_once '../../config/quiz-config.php';

try {
    // Check authentication
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(generateErrorResponse(ERROR_UNAUTHORIZED));
        exit;
    }
    
    // Only allow POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(generateErrorResponse(ERROR_METHOD_NOT_ALLOWED));
        exit;
    }
    
    $userId = intval($_SESSION['user_id']);
    
    // Parse JSON input
    $jsonInput = file_get_contents('php://input');
    $requestData = json_decode($jsonInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_INVALID_REQUEST, 'Invalid JSON format'));
        exit;
    }
    
    // Validate required fields
    if (!isset($requestData['exam_id']) || !isset($requestData['answers'])) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION_FAILED, 'Missing exam_id or answers'));
        exit;
    }
    
    $examId = intval($requestData['exam_id']);
    $answers = $requestData['answers'];
    
    // Validate answers format
    if (!is_array($answers)) {
        http_response_code(400);
        echo json_encode(generateErrorResponse(ERROR_VALIDATION_FAILED, 'Answers must be an array'));
        exit;
    }
    
    $pdo = getPDOConnection();
    $pdo->beginTransaction();
    
    try {
        // Validate exam exists and belongs to user
        // Accept both DRAFT (0) and legacy IN_PROGRESS (1) status
        $examSql = "SELECT * FROM quiz_exams WHERE id = ? AND user_id = ? AND exam_status IN (?, ?)";
        $examStmt = $pdo->prepare($examSql);
        $examStmt->execute([$examId, $userId, EXAM_STATUS_DRAFT, 1]); // 0 and 1
        $exam = $examStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$exam) {
            throw new Exception('Exam not found or already completed', ERROR_NOT_FOUND);
        }
        
        // Save answers to database
        $answerSql = "
            INSERT INTO quiz_answers (exam_id, question_id, user_answer, answer_time) 
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            user_answer = VALUES(user_answer), 
            answer_time = VALUES(answer_time),
            is_changed = TRUE,
            change_count = change_count + 1
        ";
        $answerStmt = $pdo->prepare($answerSql);
        
        $answeredCount = 0;
        foreach ($answers as $questionId => $answer) {
            if ($answer >= 0 && $answer <= 2) { // Valid answer range
                $answerStmt->execute([$examId, $questionId, $answer]);
                $answeredCount++;
            }
        }
        
        // Update exam status to COMPLETED and set end_time
        $updateExamSql = "
            UPDATE quiz_exams 
            SET exam_status = ?, 
                end_time = NOW(), 
                answered_questions = ?,
                updated_at = NOW()
            WHERE id = ?
        ";
        $updateExamStmt = $pdo->prepare($updateExamSql);
        $updateExamStmt->execute([EXAM_STATUS_COMPLETED, $answeredCount, $examId]);
        
        // Calculate Holland Code results
        $resultId = null;
        try {
            $resultId = calculateHollandResults($pdo, $examId, $userId);
        } catch (Exception $e) {
            // Log error but don't fail the submission
            error_log("Holland calculation error: " . $e->getMessage());
            $resultId = null;
        }
        
        $pdo->commit();
        
        // Success response
        $responseData = [
            'exam_id' => $examId,
            'exam_code' => $exam['exam_code'],
            'result_id' => $resultId,
            'answered_questions' => $answeredCount,
            'total_questions' => $exam['total_questions'],
            'completion_time' => date('Y-m-d H:i:s')
        ];
        
        http_response_code(200);
        echo json_encode(generateSuccessResponse($responseData, 'Bài thi đã được nộp thành công'));
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Submit Quiz API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(generateErrorResponse(ERROR_INTERNAL_SERVER, $e->getMessage()));
}

/**
 * Calculate Holland Code results from quiz answers
 */
function calculateHollandResults($pdo, $examId, $userId) {
    // Get all answers for this exam
    $answersSql = "
        SELECT qa.question_id, qa.user_answer, q.holland_code
        FROM quiz_answers qa
        JOIN questions q ON qa.question_id = q.question_id
        WHERE qa.exam_id = ? AND qa.user_answer >= 0
    ";
    $answersStmt = $pdo->prepare($answersSql);
    $answersStmt->execute([$examId]);
    $answers = $answersStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate scores for each Holland group
    $scores = [
        'R' => 0, // Realistic
        'I' => 0, // Investigative  
        'A' => 0, // Artistic
        'S' => 0, // Social
        'E' => 0, // Enterprising
        'C' => 0  // Conventional
    ];
    
    foreach ($answers as $answer) {
        $group = $answer['holland_code'];
        $points = intval($answer['user_answer']); // 0, 1, or 2 points
        $scores[$group] += $points;
    }
    
    $totalScore = array_sum($scores);
    
    // Sort scores to get top 3
    arsort($scores);
    $sortedGroups = array_keys($scores);
    
    $hollandCode = implode('', array_slice($sortedGroups, 0, 3));
    $primaryGroup = $sortedGroups[0];
    $secondaryGroup = $sortedGroups[1];
    $tertiaryGroup = $sortedGroups[2];
    
    // Save results to quiz_results table
    $resultSql = "
        INSERT INTO quiz_results (
            exam_id, user_id, 
            score_r, score_i, score_a, score_s, score_e, score_c,
            total_score, holland_code, primary_group, secondary_group, tertiary_group,
            characteristics_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";
    
    $characteristicsCode = substr($hollandCode, 0, 2);
    
    $resultStmt = $pdo->prepare($resultSql);
    $resultStmt->execute([
        $examId, $userId,
        $scores['R'], $scores['I'], $scores['A'], $scores['S'], $scores['E'], $scores['C'],
        $totalScore, $hollandCode, $primaryGroup, $secondaryGroup, $tertiaryGroup,
        $characteristicsCode
    ]);
    
    return $pdo->lastInsertId();
}

?>