<?php
/**
 * Input Validation Middleware
 * Validate và sanitize input data
 */

require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/error-codes.php';

class InputValidator {
    
    private $errors = [];
    
    /**
     * Validate required field
     */
    public function required($value, $fieldName) {
        if (empty($value) && $value !== '0' && $value !== 0) {
            $this->errors[$fieldName] = "{$fieldName} is required";
            return false;
        }
        return true;
    }
    
    /**
     * Validate email format
     */
    public function email($email, $fieldName = 'email') {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$fieldName] = "Invalid email format";
            return false;
        }
        
        if (strlen($email) > MAX_EMAIL_LENGTH) {
            $this->errors[$fieldName] = "Email too long (max " . MAX_EMAIL_LENGTH . " characters)";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate integer
     */
    public function integer($value, $fieldName, $min = null, $max = null) {
        if (!is_numeric($value) || intval($value) != $value) {
            $this->errors[$fieldName] = "{$fieldName} must be an integer";
            return false;
        }
        
        $intValue = intval($value);
        
        if ($min !== null && $intValue < $min) {
            $this->errors[$fieldName] = "{$fieldName} must be at least {$min}";
            return false;
        }
        
        if ($max !== null && $intValue > $max) {
            $this->errors[$fieldName] = "{$fieldName} must be at most {$max}";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate string length
     */
    public function stringLength($value, $fieldName, $min = 0, $max = null) {
        $length = mb_strlen($value, 'UTF-8');
        
        if ($length < $min) {
            $this->errors[$fieldName] = "{$fieldName} must be at least {$min} characters";
            return false;
        }
        
        if ($max !== null && $length > $max) {
            $this->errors[$fieldName] = "{$fieldName} must be at most {$max} characters";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate enum/array values
     */
    public function inArray($value, $allowedValues, $fieldName) {
        if (!in_array($value, $allowedValues, true)) {
            $this->errors[$fieldName] = "{$fieldName} must be one of: " . implode(', ', $allowedValues);
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate exam type
     */
    public function examType($examType) {
        return $this->inArray($examType, ['FREE', 'PAID'], 'exam_type');
    }
    
    /**
     * Validate Holland Code answer (0, 1, 2)
     */
    public function hollandAnswer($answer) {
        return $this->inArray($answer, [0, 1, 2], 'user_answer');
    }
    
    /**
     * Validate question ID format (Q001, Q002, etc.)
     */
    public function questionId($questionId) {
        if (!preg_match('/^Q\d{3,}$/', $questionId)) {
            $this->errors['question_id'] = "Invalid question ID format";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate exam code format (EX20251101_ABC123)
     */
    public function examCode($examCode) {
        if (!preg_match('/^EX\d{8}_[A-Z0-9]{6}$/', $examCode)) {
            $this->errors['exam_code'] = "Invalid exam code format";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate password strength
     */
    public function password($password) {
        if (strlen($password) < MIN_PASSWORD_LENGTH) {
            $this->errors['password'] = "Password must be at least " . MIN_PASSWORD_LENGTH . " characters";
            return false;
        }
        
        if (strlen($password) > MAX_PASSWORD_LENGTH) {
            $this->errors['password'] = "Password too long (max " . MAX_PASSWORD_LENGTH . " characters)";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate phone number
     */
    public function phone($phone) {
        if (!preg_match(REGEX_PHONE, $phone)) {
            $this->errors['phone'] = "Invalid phone number format";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate username
     */
    public function username($username) {
        if (!preg_match(REGEX_USERNAME, $username)) {
            $this->errors['username'] = "Username must be 3-50 characters, letters, numbers and underscore only";
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate JSON data
     */
    public function json($jsonString, $fieldName = 'json') {
        json_decode($jsonString);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->errors[$fieldName] = "Invalid JSON format: " . json_last_error_msg();
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate time spent (seconds)
     */
    public function timeSpent($timeSpent) {
        if (!is_numeric($timeSpent) || $timeSpent < 0) {
            $this->errors['time_spent'] = "Time spent must be a positive number";
            return false;
        }
        
        // Reasonable max time per question (10 minutes)
        if ($timeSpent > 600) {
            $this->errors['time_spent'] = "Time spent too long (max 600 seconds per question)";
            return false;
        }
        
        return true;
    }
    
    /**
     * Sanitize string input
     */
    public function sanitizeString($value) {
        return trim(strip_tags($value));
    }
    
    /**
     * Sanitize HTML
     */
    public function sanitizeHtml($value) {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Get all validation errors
     */
    public function getErrors() {
        return $this->errors;
    }
    
    /**
     * Check if there are any errors
     */
    public function hasErrors() {
        return !empty($this->errors);
    }
    
    /**
     * Clear all errors
     */
    public function clearErrors() {
        $this->errors = [];
    }
    
    /**
     * Add custom error
     */
    public function addError($fieldName, $message) {
        $this->errors[$fieldName] = $message;
    }
    
    /**
     * Validate exam creation request
     */
    public function validateCreateExamRequest($data) {
        $this->clearErrors();
        
        // exam_type is required
        if (isset($data['exam_type'])) {
            $this->examType($data['exam_type']);
        } else {
            $this->addError('exam_type', 'exam_type is required');
        }
        
        // user_id is optional but must be valid if provided
        if (isset($data['user_id'])) {
            $this->integer($data['user_id'], 'user_id', 1);
        }
        
        return !$this->hasErrors();
    }
    
    /**
     * Validate submit answer request
     */
    public function validateSubmitAnswerRequest($data) {
        $this->clearErrors();
        
        // exam_id is required
        if (isset($data['exam_id'])) {
            $this->integer($data['exam_id'], 'exam_id', 1);
        } else {
            $this->addError('exam_id', 'exam_id is required');
        }
        
        // question_id is required
        if (isset($data['question_id'])) {
            $this->questionId($data['question_id']);
        } else {
            $this->addError('question_id', 'question_id is required');
        }
        
        // user_answer is required
        if (isset($data['user_answer'])) {
            $this->hollandAnswer($data['user_answer']);
        } else {
            $this->addError('user_answer', 'user_answer is required');
        }
        
        // time_spent is optional
        if (isset($data['time_spent'])) {
            $this->timeSpent($data['time_spent']);
        }
        
        return !$this->hasErrors();
    }
    
    /**
     * Validate submit exam request
     */
    public function validateSubmitExamRequest($data) {
        $this->clearErrors();
        
        // exam_id is required
        if (isset($data['exam_id'])) {
            $this->integer($data['exam_id'], 'exam_id', 1);
        } else {
            $this->addError('exam_id', 'exam_id is required');
        }
        
        // force_submit is optional boolean
        if (isset($data['force_submit'])) {
            if (!is_bool($data['force_submit'])) {
                $this->addError('force_submit', 'force_submit must be boolean');
            }
        }
        
        return !$this->hasErrors();
    }
}

/**
 * Quick validation helper functions
 */

function validateAndGetJson() {
    $jsonInput = file_get_contents('php://input');
    $data = json_decode($jsonInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON format', ERROR_INVALID_REQUEST);
    }
    
    return $data;
}

function validateHttpMethod($allowedMethods) {
    if (!is_array($allowedMethods)) {
        $allowedMethods = [$allowedMethods];
    }
    
    if (!in_array($_SERVER['REQUEST_METHOD'], $allowedMethods)) {
        throw new Exception('Method not allowed', ERROR_METHOD_NOT_ALLOWED);
    }
}

function validateQueryParam($param, $required = true) {
    $value = $_GET[$param] ?? null;
    
    if ($required && $value === null) {
        throw new Exception("{$param} parameter is required", ERROR_VALIDATION_FAILED);
    }
    
    return $value;
}

function validatePostData($data, $validator, $validationMethod) {
    if (!$validator->$validationMethod($data)) {
        $errors = $validator->getErrors();
        $errorMessage = implode(', ', $errors);
        throw new Exception("Validation failed: {$errorMessage}", ERROR_VALIDATION_FAILED);
    }
    
    return true;
}

?>