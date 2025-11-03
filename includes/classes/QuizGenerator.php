<?php
/**
 * QuizGenerator Class - Holland Code Quiz System
 * Tạo bài thi và quản lý câu hỏi theo logic Holland Code
 */

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/../../config/quiz-config.php';
require_once __DIR__ . '/../../config/error-codes.php';

class QuizGenerator {
    
    private $pdo;
    private $hollandGroups = HOLLAND_GROUPS;
    
    public function __construct() {
        $this->pdo = getPDOConnection();
    }
    
    /**
     * Tạo bài thi mới với random questions
     * Tương tự logic từ NodeJS version
     * 
     * @param int $userId
     * @param string $examType 'FREE' hoặc 'PAID'
     * @return array
     * @throws Exception
     */
    public function createExam($userId, $examType = 'FREE', $forceNew = false) {
        try {
            // Step 0: If force_new is true, clear any existing incomplete exams
            if ($forceNew) {
                $this->clearIncompleteExams($userId);
            }
            
            // Step 1: Validate user eligibility (skip incomplete exam check if force_new)
            $this->validateUserEligibility($userId, $examType, $forceNew);
            
            // Step 2: Generate question set
            $questions = $this->generateQuestionSet($examType);
            
            if (empty($questions)) {
                throw new Exception('Không đủ câu hỏi để tạo bài thi', ERROR_INSUFFICIENT_BASIS);
            }
            
            // Step 3: Create exam record
            $examId = $this->createExamRecord($userId, $examType, count($questions));
            
            // Step 4: Save question assignments
            $this->saveExamQuestions($examId, $questions);
            
            // Step 5: Generate exam code
            $examCode = $this->generateExamCode($examId);
            
            // Step 6: Update exam with code
            $this->updateExamCode($examId, $examCode);
            
            // Step 7: Format response
            return [
                'exam_id' => $examId,
                'exam_code' => $examCode,
                'exam_type' => $examType,
                'total_questions' => count($questions),
                'time_limit' => $this->getTimeLimit($examType),
                'questions' => $this->formatQuestionsForFrontend($questions),
                'instructions' => $this->getInstructions($examType),
                'fixed_choices' => HOLLAND_FIXED_CHOICES
            ];
            
        } catch (Exception $e) {
            error_log("QuizGenerator::createExam Error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Generate question set theo quy tắc Holland Code
     * - FREE: 5 câu/nhóm × 6 nhóm = 30 câu
     * - PAID: 20 câu/nhóm × 6 nhóm = 120 câu
     * 
     * @param string $examType
     * @return array
     */
    private function generateQuestionSet($examType) {
        $questionsPerGroup = ($examType === 'FREE') ? QUESTIONS_PER_GROUP_FREE : QUESTIONS_PER_GROUP_PAID;
        $selectedQuestions = [];
        
        foreach ($this->hollandGroups as $code) {
            $groupQuestions = $this->getRandomQuestionsByHollandCode($code, $questionsPerGroup);
            
            if (count($groupQuestions) < $questionsPerGroup) {
                throw new Exception("Không đủ câu hỏi cho nhóm {$code}. Cần {$questionsPerGroup}, có " . count($groupQuestions), ERROR_INSUFFICIENT_BASIS);
            }
            
            $selectedQuestions = array_merge($selectedQuestions, $groupQuestions);
        }
        
        // Shuffle để câu hỏi không theo thứ tự nhóm
        shuffle($selectedQuestions);
        
        return $selectedQuestions;
    }
    
    /**
     * Random select questions from specific Holland group
     * 
     * @param string $hollandCode
     * @param int $count
     * @return array
     */
    private function getRandomQuestionsByHollandCode($hollandCode, $count) {
        $sql = "
            SELECT question_id, question_text, holland_code, category
            FROM questions 
            WHERE holland_code = ? AND is_active = 1
            ORDER BY RAND()
            LIMIT ?
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$hollandCode, $count]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Database error in getRandomQuestionsByHollandCode: " . $e->getMessage());
            throw new Exception('Lỗi truy vấn cơ sở dữ liệu', ERROR_INTERNAL_SERVER);
        }
    }
    
    /**
     * Format questions for frontend consumption
     * Theo spec: mỗi question có 3 choices cố định
     * 
     * @param array $questions
     * @return array
     */
    private function formatQuestionsForFrontend($questions) {
        $formatted = [];
        
        foreach ($questions as $index => $question) {
            $formatted[] = [
                'id' => $question['question_id'],
                'question_number' => $index + 1,
                'question_text' => $question['question_text'],
                'category' => $question['category'] ?? 'personality',
                
                // Fixed choices cho tất cả câu hỏi Holland Code
                'choices' => HOLLAND_FIXED_CHOICES,
                
                // Holland code chỉ để debug (có thể bỏ trong production)
                'holland_code' => QUIZ_DEBUG_MODE ? $question['holland_code'] : null
            ];
        }
        
        return $formatted;
    }
    
    /**
     * Validate user có thể làm bài không
     * Kiểm tra violations, locks, access revoked
     * 
     * @param int $userId
     * @param string $examType
     * @throws Exception
     */
    private function validateUserEligibility($userId, $examType, $forceNew = false) {
        // Check if user exists and is active
        if (!$this->isUserActive($userId)) {
            throw new Exception('Tài khoản không hợp lệ', ERROR_UNAUTHORIZED);
        }
        
        // Get user limits and check restrictions
        $limits = $this->getUserLimits($userId);
        
        if ($examType === 'FREE') {
            $this->validateFreeExamEligibility($limits);
        } else {
            $this->validatePaidExamEligibility($limits);
        }
        
        // Check for incomplete exams (skip if force_new)
        if (!$forceNew) {
            $this->checkIncompleteExams($userId);
        }
    }
    
    /**
     * Validate FREE exam eligibility
     * 
     * @param array $limits
     * @throws Exception
     */
    private function validateFreeExamEligibility($limits) {
        // Check if permanently locked
        if ($limits['is_permanently_locked']) {
            throw new Exception('Tài khoản bị khóa vĩnh viễn', ERROR_USER_PERMANENTLY_LOCKED);
        }
        
        // Check time-based lock
        if ($limits['lock_until'] && time() < strtotime($limits['lock_until'])) {
            $unlockTime = date('d/m/Y H:i', strtotime($limits['lock_until']));
            throw new Exception("Tài khoản bị khóa đến {$unlockTime}", ERROR_USER_LOCKED_12H);
        }
        
        // Check violation count (khóa 12h sau 2 lần vi phạm)
        if ($limits['free_exam_violations'] >= FRAUD_MAX_FREE_VIOLATIONS) {
            // Apply 12h lock if not already locked
            if (!$limits['lock_until'] || time() >= strtotime($limits['lock_until'])) {
                $this->applyUserLock($limits['user_id'], LOCK_DURATION_12H, 'Quá nhiều vi phạm bài miễn phí');
                throw new Exception('Quá nhiều vi phạm. Khóa 12 giờ.', ERROR_FREE_EXAM_LIMIT_LOCKED);
            }
        }
    }
    
    /**
     * Validate PAID exam eligibility
     * 
     * @param array $limits
     * @throws Exception
     */
    private function validatePaidExamEligibility($limits) {
        // Check access revoked
        if ($limits['access_revoked']) {
            throw new Exception('Quyền truy cập đã bị thu hồi', ERROR_PAID_EXAM_REVOKED);
        }
        
        // Check permanent lock
        if ($limits['is_permanently_locked']) {
            throw new Exception('Tài khoản bị khóa vĩnh viễn', ERROR_USER_PERMANENTLY_LOCKED);
        }
        
        // Check violation count (thu hồi quyền sau 3 lần vi phạm)
        if ($limits['paid_exam_violations'] >= FRAUD_MAX_PAID_VIOLATIONS) {
            $this->revokeUserAccess($limits['user_id'], 'Quá nhiều vi phạm bài có phí');
            throw new Exception('Quá nhiều vi phạm. Thu hồi quyền.', ERROR_PAID_EXAM_REVOKED);
        }
        
        // Warning if only 1 violation left
        if ($limits['paid_exam_violations'] === FRAUD_MAX_PAID_VIOLATIONS - 1) {
            // This is a warning, không block nhưng frontend nên hiển thị cảnh báo
            // throw new Exception('Còn 1 lượt bài có phí', ERROR_PAID_EXAM_ONE_LEFT);
        }
    }
    
    /**
     * Check for incomplete exams
     * User chỉ được làm 1 bài tại 1 thời điểm
     * 
     * @param int $userId
     * @throws Exception
     */
    private function checkIncompleteExams($userId) {
        $sql = "
            SELECT id, exam_code, created_at, time_limit
            FROM quiz_exams 
            WHERE user_id = ? AND exam_status = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId, EXAM_STATUS_DRAFT]);
        $incompleteExams = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($incompleteExams as $exam) {
            // Check if exam is timed out
            $timeLimit = $exam['time_limit'];
            if ($timeLimit > 0) {
                $examStartTime = strtotime($exam['created_at']);
                $timeoutTime = $examStartTime + ($timeLimit * 60);
                
                if (time() > $timeoutTime) {
                    // Mark as timeout
                    $this->markExamAsTimeout($exam['id']);
                    continue;
                }
            }
            
            // Still has active exam
            throw new Exception("Bạn đang có bài thi chưa hoàn thành: {$exam['exam_code']}", ERROR_EXAM_ALREADY_COMPLETED);
        }
    }
    
    /**
     * Create exam record in database
     * 
     * @param int $userId
     * @param string $examType
     * @param int $totalQuestions
     * @return int exam_id
     */
    private function createExamRecord($userId, $examType, $totalQuestions) {
        $timeLimit = $this->getTimeLimit($examType);
        $examTypeNum = ($examType === 'FREE') ? QUIZ_TYPE_FREE : QUIZ_TYPE_PAID;
        
        $sql = "
            INSERT INTO quiz_exams (
                user_id, exam_type, exam_status,
                total_questions, start_time, time_limit,
                ip_address
            ) VALUES (?, ?, ?, ?, NOW(), ?, ?)
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $userId, 
                $examTypeNum, 
                EXAM_STATUS_DRAFT, 
                $totalQuestions,
                $timeLimit, 
                $_SERVER['REMOTE_ADDR'] ?? ''
            ]);
            
            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            error_log("Database error in createExamRecord: " . $e->getMessage());
            throw new Exception('Lỗi tạo bài thi', ERROR_INTERNAL_SERVER);
        }
    }
    
    /**
     * Save exam questions assignments
     * Initialize với user_answer = -1 (chưa trả lời)
     * 
     * @param int $examId
     * @param array $questions
     */
    private function saveExamQuestions($examId, $questions) {
        $sql = "
            INSERT INTO quiz_answers (exam_id, question_id, user_answer)
            VALUES (?, ?, ?)
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            
            foreach ($questions as $question) {
                $stmt->execute([$examId, $question['question_id'], ANSWER_NOT_ANSWERED]);
            }
        } catch (PDOException $e) {
            error_log("Database error in saveExamQuestions: " . $e->getMessage());
            throw new Exception('Lỗi lưu câu hỏi', ERROR_INTERNAL_SERVER);
        }
    }
    
    /**
     * Generate unique exam code
     * Format: EX20251101_ABC123
     * 
     * @param int $examId
     * @return string
     */
    private function generateExamCode($examId) {
        $date = date('Ymd');
        $suffix = strtoupper(substr(uniqid(), -6));
        return "EX{$date}_{$suffix}";
    }
    
    /**
     * Update exam với exam code
     * 
     * @param int $examId
     * @param string $examCode
     */
    private function updateExamCode($examId, $examCode) {
        $sql = "UPDATE quiz_exams SET exam_code = ? WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$examCode, $examId]);
    }
    
    /**
     * Get time limit for exam type
     * 
     * @param string $examType
     * @return int minutes
     */
    private function getTimeLimit($examType) {
        // Simplified: No time limits
        return 0;
    }
    
    /**
     * Get instructions for exam type
     * 
     * @param string $examType
     * @return array
     */
    private function getInstructions($examType) {
        $baseInstructions = [
            'title' => 'Hướng dẫn làm bài Holland Code',
            'content' => 'Vui lòng chọn mức độ đồng ý với mỗi câu hỏi dựa trên sở thích và khả năng của bạn. Không có câu trả lời đúng hay sai.',
            'choices_explanation' => 'Bạn có 3 lựa chọn cho mỗi câu: Không đồng ý (0 điểm), Bình thường (1 điểm), Đồng ý (2 điểm)'
        ];
        
        if ($examType === 'FREE') {
            $baseInstructions['question_count'] = QUESTIONS_PER_GROUP_FREE * count(HOLLAND_GROUPS) . " câu hỏi";
        } else {
            $baseInstructions['question_count'] = QUESTIONS_PER_GROUP_PAID * count(HOLLAND_GROUPS) . " câu hỏi";
        }
        
        return $baseInstructions;
    }
    
    /**
     * Utility methods
     */
    
    private function isUserActive($userId) {
        $sql = "SELECT id FROM users WHERE id = ? AND status = 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch() !== false;
    }
    
    private function getUserLimits($userId) {
        $sql = "
            SELECT * FROM quiz_user_limits 
            WHERE user_id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
        $limits = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Create default limits if not exists
        if (!$limits) {
            $this->createDefaultUserLimits($userId);
            return $this->getUserLimits($userId);
        }
        
        return $limits;
    }
    
    private function createDefaultUserLimits($userId) {
        $sql = "
            INSERT INTO quiz_user_limits (user_id) 
            VALUES (?)
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$userId]);
    }
    
    private function applyUserLock($userId, $lockDuration, $reason) {
        $lockUntil = date('Y-m-d H:i:s', time() + $lockDuration);
        
        $sql = "
            UPDATE quiz_user_limits 
            SET lock_until = ?, lock_reason = ?, updated_at = NOW()
            WHERE user_id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$lockUntil, $reason, $userId]);
    }
    
    private function revokeUserAccess($userId, $reason) {
        $sql = "
            UPDATE quiz_user_limits 
            SET access_revoked = 1, revoke_reason = ?, revoked_at = NOW(), updated_at = NOW()
            WHERE user_id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$reason, $userId]);
    }
    
    private function markExamAsTimeout($examId) {
        $sql = "
            UPDATE quiz_exams 
            SET exam_status = ?, end_time = NOW(), updated_at = NOW()
            WHERE id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([EXAM_STATUS_TIMEOUT, $examId]);
    }
    
    private function clearIncompleteExams($userId) {
        try {
            // First, get all incomplete exams for this user
            $sql = "SELECT id FROM quiz_exams WHERE user_id = ? AND exam_status = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId, EXAM_STATUS_DRAFT]);
            $examIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            if (empty($examIds)) {
                return; // No incomplete exams to clear
            }
            
            // Delete exam answers first (not quiz_exam_questions)
            $placeholders = str_repeat('?,', count($examIds) - 1) . '?';
            $sql = "DELETE FROM quiz_answers WHERE exam_id IN ($placeholders)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($examIds);
            
            // Then delete exams
            $sql = "DELETE FROM quiz_exams WHERE user_id = ? AND exam_status = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$userId, EXAM_STATUS_DRAFT]);
            
            $deletedCount = $stmt->rowCount();
            error_log("Cleared $deletedCount incomplete exam records for user $userId");
            
        } catch (Exception $e) {
            error_log("Error clearing incomplete exams for user $userId: " . $e->getMessage());
            throw $e; // Re-throw to ensure force_new fails if cleanup fails
        }
    }
}

?>