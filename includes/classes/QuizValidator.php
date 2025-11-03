<?php
/**
 * QuizValidator Class
 * Validate quiz-specific business logic
 */

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../../config/quiz-config.php';
require_once __DIR__ . '/../../config/error-codes.php';

class QuizValidator {
    
    private $pdo;
    
    public function __construct() {
        $this->pdo = getPDOConnection();
    }
    
    /**
     * Validate exam exists và thuộc về user
     * 
     * @param int $examId
     * @param int $userId
     * @param array $allowedStatuses Allowed exam statuses
     * @return array Exam data
     * @throws Exception
     */
    public function validateExamAccess($examId, $userId, $allowedStatuses = [EXAM_STATUS_IN_PROGRESS]) {
        $sql = "
            SELECT 
                id, exam_code, user_id, exam_type, exam_status,
                total_questions, answered_questions, start_time, time_limit,
                created_at, updated_at
            FROM quiz_exams 
            WHERE id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$examId]);
        $exam = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$exam) {
            throw new Exception('Exam not found', ERROR_NOT_FOUND);
        }
        
        // Check ownership (admin có thể access tất cả)
        if ($exam['user_id'] != $userId && !$this->isAdmin($userId)) {
            throw new Exception('Access denied to this exam', ERROR_FORBIDDEN);
        }
        
        // Check exam status
        if (!in_array($exam['exam_status'], $allowedStatuses)) {
            if ($exam['exam_status'] == EXAM_STATUS_COMPLETED) {
                throw new Exception('Exam already completed', ERROR_EXAM_ALREADY_COMPLETED);
            }
            if ($exam['exam_status'] == EXAM_STATUS_TIMEOUT) {
                throw new Exception('Exam timed out', ERROR_EXAM_TIMEOUT);
            }
            if ($exam['exam_status'] == EXAM_STATUS_CANCELLED) {
                throw new Exception('Exam was cancelled', ERROR_EXAM_ALREADY_COMPLETED);
            }
        }
        
        return $exam;
    }
    
    /**
     * Validate exam time limit
     * 
     * @param array $exam Exam data
     * @return array Time info
     * @throws Exception if timed out
     */
    public function validateExamTime($exam) {
        $timeRemaining = null;
        $isTimedOut = false;
        
        if ($exam['time_limit'] > 0) {
            $startTime = strtotime($exam['start_time']);
            $timeLimit = $exam['time_limit'] * 60; // Convert to seconds
            $currentTime = time();
            $timeRemaining = $timeLimit - ($currentTime - $startTime);
            
            if ($timeRemaining <= 0) {
                $this->markExamAsTimeout($exam['id']);
                throw new Exception('Exam timed out', ERROR_EXAM_TIMEOUT);
            }
        }
        
        return [
            'time_remaining' => $timeRemaining,
            'is_timed' => $exam['time_limit'] > 0,
            'time_limit' => $exam['time_limit']
        ];
    }
    
    /**
     * Validate question belongs to exam
     * 
     * @param string $questionId
     * @param int $examId
     * @return array Question data
     * @throws Exception
     */
    public function validateQuestionInExam($questionId, $examId) {
        $sql = "
            SELECT 
                qa.question_id, qa.user_answer, qa.answer_time, qa.time_spent,
                qq.question_text, qq.holland_code, qq.is_active
            FROM quiz_answers qa
            JOIN questions qq ON qa.question_id = qq.question_id
            WHERE qa.exam_id = ? AND qa.question_id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$examId, $questionId]);
        $question = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$question) {
            throw new Exception('Question not found in this exam', ERROR_NOT_FOUND);
        }
        
        if (!$question['is_active']) {
            throw new Exception('Question is inactive', ERROR_VALIDATION_FAILED);
        }
        
        return $question;
    }
    
    /**
     * Validate exam completion requirements
     * 
     * @param int $examId
     * @return array Completion data
     * @throws Exception
     */
    public function validateExamCompletion($examId) {
        // Get exam basic info
        $examSql = "SELECT total_questions FROM quiz_exams WHERE id = ?";
        $examStmt = $this->pdo->prepare($examSql);
        $examStmt->execute([$examId]);
        $exam = $examStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$exam) {
            throw new Exception('Exam not found', ERROR_NOT_FOUND);
        }
        
        // Count answered questions
        $answerSql = "
            SELECT 
                COUNT(*) as total_answers,
                COUNT(CASE WHEN user_answer >= 0 THEN 1 END) as answered_count,
                COUNT(CASE WHEN user_answer = -1 THEN 1 END) as unanswered_count
            FROM quiz_answers 
            WHERE exam_id = ?
        ";
        
        $answerStmt = $this->pdo->prepare($answerSql);
        $answerStmt->execute([$examId]);
        $answerStats = $answerStmt->fetch(PDO::FETCH_ASSOC);
        
        $completionData = [
            'total_questions' => $exam['total_questions'],
            'answered_questions' => $answerStats['answered_count'],
            'unanswered_questions' => $answerStats['unanswered_count'],
            'is_complete' => $answerStats['unanswered_count'] == 0,
            'completion_rate' => $exam['total_questions'] > 0 ? 
                round(($answerStats['answered_count'] / $exam['total_questions']) * 100, 1) : 0
        ];
        
        return $completionData;
    }
    
    /**
     * Validate answers for fraud detection
     * 
     * @param int $examId
     * @return array Fraud analysis
     */
    public function validateAnswersForFraud($examId) {
        $sql = "
            SELECT 
                user_answer, 
                time_spent,
                COUNT(*) as count
            FROM quiz_answers 
            WHERE exam_id = ? AND user_answer >= 0
            GROUP BY user_answer
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$examId]);
        $answerDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate fraud indicators
        $totalAnswers = array_sum(array_column($answerDistribution, 'count'));
        $sameAnswerRatio = 0;
        $yesAnswers = 0;
        
        foreach ($answerDistribution as $dist) {
            $ratio = $dist['count'] / $totalAnswers;
            if ($ratio > $sameAnswerRatio) {
                $sameAnswerRatio = $ratio;
            }
            
            if ($dist['user_answer'] == ANSWER_AGREE) {
                $yesAnswers = $dist['count'];
            }
        }
        
        $yesRatio = $totalAnswers > 0 ? ($yesAnswers / $totalAnswers) : 0;
        
        // Get average time spent
        $timeSql = "
            SELECT AVG(time_spent) as avg_time, MIN(time_spent) as min_time 
            FROM quiz_answers 
            WHERE exam_id = ? AND user_answer >= 0 AND time_spent > 0
        ";
        
        $timeStmt = $this->pdo->prepare($timeSql);
        $timeStmt->execute([$examId]);
        $timeStats = $timeStmt->fetch(PDO::FETCH_ASSOC);
        
        $fraudFlags = [];
        
        // Check same answer pattern
        if ($sameAnswerRatio >= FRAUD_SAME_ANSWER_TOLERANCE) {
            $fraudFlags[] = [
                'type' => 'same_answers',
                'severity' => 'high',
                'description' => 'Too many identical answers',
                'ratio' => $sameAnswerRatio
            ];
        }
        
        // Check insufficient yes answers
        if ($yesRatio < FRAUD_MIN_YES_RATIO) {
            $fraudFlags[] = [
                'type' => 'insufficient_yes',
                'severity' => 'medium',
                'description' => 'Too few positive responses',
                'ratio' => $yesRatio
            ];
        }
        
        // Check time too fast
        $avgTime = $timeStats['avg_time'] ?? 0;
        if ($avgTime > 0 && $avgTime < FRAUD_MIN_TIME_PER_QUESTION) {
            $fraudFlags[] = [
                'type' => 'time_too_fast',
                'severity' => 'medium',
                'description' => 'Answers submitted too quickly',
                'avg_time' => $avgTime
            ];
        }
        
        return [
            'total_answers' => $totalAnswers,
            'same_answer_ratio' => $sameAnswerRatio,
            'yes_ratio' => $yesRatio,
            'avg_time' => $avgTime,
            'has_fraud_flags' => !empty($fraudFlags),
            'fraud_flags' => $fraudFlags
        ];
    }
    
    /**
     * Validate user limits for new exam
     * 
     * @param int $userId
     * @param string $examType
     * @return array User limits
     * @throws Exception
     */
    public function validateUserLimits($userId, $examType) {
        $sql = "
            SELECT * FROM quiz_user_limits 
            WHERE user_id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        $limits = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$limits) {
            // Create default limits
            $this->createDefaultUserLimits($userId);
            return $this->validateUserLimits($userId, $examType);
        }
        
        // Check general locks
        if ($limits['is_permanently_locked']) {
            throw new Exception('Account permanently locked', ERROR_USER_PERMANENTLY_LOCKED);
        }
        
        if ($limits['lock_until'] && time() < strtotime($limits['lock_until'])) {
            $unlockTime = date('d/m/Y H:i', strtotime($limits['lock_until']));
            throw new Exception("Account locked until {$unlockTime}", ERROR_USER_LOCKED_12H);
        }
        
        // Exam type specific validation
        if ($examType === 'FREE') {
            if ($limits['free_exam_violations'] >= FRAUD_MAX_FREE_VIOLATIONS) {
                throw new Exception('Free exam limit exceeded', ERROR_FREE_EXAM_LIMIT_LOCKED);
            }
        } else {
            if ($limits['access_revoked']) {
                throw new Exception('Paid exam access revoked', ERROR_PAID_EXAM_REVOKED);
            }
            
            if ($limits['paid_exam_violations'] >= FRAUD_MAX_PAID_VIOLATIONS) {
                throw new Exception('Paid exam access revoked due to violations', ERROR_PAID_EXAM_REVOKED);
            }
        }
        
        return $limits;
    }
    
    /**
     * Check if user is admin
     */
    private function isAdmin($userId) {
        // For now, simple check
        // TODO: Implement proper role checking
        return false;
    }
    
    /**
     * Mark exam as timeout
     */
    private function markExamAsTimeout($examId) {
        $sql = "
            UPDATE quiz_exams 
            SET exam_status = ?, end_time = NOW(), updated_at = NOW()
            WHERE id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([EXAM_STATUS_TIMEOUT, $examId]);
    }
    
    /**
     * Create default user limits
     */
    private function createDefaultUserLimits($userId) {
        $sql = "
            INSERT INTO quiz_user_limits (user_id) 
            VALUES (?)
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
    }
}

?>