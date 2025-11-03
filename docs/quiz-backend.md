# Quiz Backend System Documentation

**PAC Holland Code Assessment System - Backend Architecture**

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Configuration](#configuration)
4. [Core Classes](#core-classes)
5. [API Endpoints](#api-endpoints)
6. [Error Handling](#error-handling)
7. [Security Features](#security-features)
8. [SQL Scripts](#sql-scripts)
9. [Development Guide](#development-guide)

---

## Overview

The Quiz Backend System implements a complete Holland Code (RIASEC) personality assessment platform with the following key features:

- **Holland Code Assessment**: 6 personality groups (Realistic, Investigative, Artistic, Social, Enterprising, Conventional)
- **Dual Exam Types**: FREE (30 questions) and PAID (120 questions)
- **Question Randomization**: Dynamic question selection per exam session
- **Fixed Choice System**: 3-point Likert scale (0=Disagree, 1=Neutral, 2=Agree)
- **Real-time Progress Tracking**: Session-based exam state management
- **Comprehensive Result Calculation**: RIASEC scoring with personality group analysis

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │
│   (quiz.html)   │◄──►│   (quiz/*.php)  │◄──►│   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Core Classes  │
                       │ (QuizGenerator) │
                       └─────────────────┘
```

---

## Database Schema

### Core Tables

#### 1. `quiz_exams` - Exam Sessions
```sql
CREATE TABLE quiz_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_code VARCHAR(20) UNIQUE NOT NULL,           -- EX20251101_ABC123
    user_id INT NOT NULL,
    exam_type TINYINT NOT NULL,                      -- 0=Free, 1=Paid
    exam_status TINYINT DEFAULT 0,                   -- 0=Draft, 1=Completed
    total_questions INT NOT NULL,                    -- 30 or 120
    answered_questions INT DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    time_limit INT DEFAULT 0,                        -- 0 = unlimited
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. `quiz_answers` - User Responses
```sql
CREATE TABLE quiz_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT NOT NULL,
    question_id VARCHAR(10) NOT NULL,                -- R001, I001, etc.
    user_answer TINYINT DEFAULT -1,                  -- -1=Unanswered, 0-2=Choices
    answer_time TIMESTAMP NULL,
    is_changed BOOLEAN DEFAULT FALSE,
    change_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. `quiz_results` - Holland Code Results
```sql
CREATE TABLE quiz_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT UNIQUE NOT NULL,
    user_id INT NOT NULL,
    score_r INT DEFAULT 0,                           -- Realistic
    score_i INT DEFAULT 0,                           -- Investigative
    score_a INT DEFAULT 0,                           -- Artistic
    score_s INT DEFAULT 0,                           -- Social
    score_e INT DEFAULT 0,                           -- Enterprising
    score_c INT DEFAULT 0,                           -- Conventional
    personality_group VARCHAR(10) NULL,              -- Primary group
    personality_groups JSON NULL,                    -- All groups ranked
    confidence_level DECIMAL(5,2) DEFAULT 0,
    total_score INT DEFAULT 0,
    result_summary TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. `questions` - Question Bank
```sql
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id VARCHAR(10) UNIQUE NOT NULL,         -- R001, I001, etc.
    holland_group CHAR(1) NOT NULL,                  -- R, I, A, S, E, C
    question_text TEXT NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active',
    difficulty_level TINYINT DEFAULT 1,              -- 1-5
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Support Tables

- `quiz_suggested_jobs` - Career recommendations per result
- `quiz_user_limits` - Rate limiting per user
- `quiz_fraud_logs` - Anti-fraud tracking

---

## Configuration

### `/config/quiz-config.php`

```php
// Quiz Types
define('QUIZ_TYPE_FREE', 0);
define('QUIZ_TYPE_PAID', 1);

// Question Counts
define('QUESTIONS_PER_GROUP_FREE', 5);    // 5×6 = 30 questions
define('QUESTIONS_PER_GROUP_PAID', 20);   // 20×6 = 120 questions

// Time Limits (Currently Disabled)
define('TIME_LIMIT_FREE', 0);             // Unlimited
define('TIME_LIMIT_PAID', 0);             // Unlimited

// Status Definitions
define('EXAM_STATUS_IN_PROGRESS', 1);     // Draft
define('EXAM_STATUS_COMPLETED', 0);       // Submitted
define('EXAM_STATUS_TIMEOUT', 2);         // Timeout
define('EXAM_STATUS_CANCELLED', 3);       // Cancelled

// Holland Groups
define('HOLLAND_GROUPS', ['R', 'I', 'A', 'S', 'E', 'C']);

// Fixed Choices (3-point Likert Scale)
define('QUIZ_CHOICES', [
    0 => 'Không đồng ý',
    1 => 'Bình thường', 
    2 => 'Đồng ý'
]);
```

### `/config/error-codes.php`

```php
// Quiz-specific error codes
define('ERROR_EXAM_NOT_FOUND', 404);
define('ERROR_EXAM_ALREADY_COMPLETED', 460);
define('ERROR_INVALID_EXAM_TYPE', 461);
define('ERROR_QUESTION_GENERATION_FAILED', 462);
define('ERROR_INVALID_ANSWER_VALUE', 463);
```

---

## Core Classes

### `QuizGenerator` Class

**Location**: `/includes/classes/QuizGenerator.php`

#### Key Methods:

##### 1. `createExam($userId, $examType, $forceNew = false)`
```php
/**
 * Creates new exam session with randomized questions
 * @param int $userId - User ID from session
 * @param string $examType - 'FREE' or 'PAID'
 * @param bool $forceNew - Force create new exam (clear existing drafts)
 * @return array - Exam data with questions and choices
 */
```

**Process Flow**:
1. Check for existing incomplete exams
2. Generate unique exam code (format: `EX{YYYYMMDD}_{RANDOM}`)
3. Select random questions per Holland group
4. Insert exam record and question mappings
5. Return exam data with fixed choices

##### 2. `generateQuestionsForExam($examType)`
```php
/**
 * Randomly selects questions for each Holland group
 * FREE: 5 questions × 6 groups = 30 total
 * PAID: 20 questions × 6 groups = 120 total
 */
```

##### 3. `calculateResult($examId)`
```php
/**
 * Calculates Holland Code scores and determines personality type
 * - Sums scores per RIASEC group
 * - Determines primary personality group
 * - Calculates confidence levels
 * - Generates result summary
 */
```

#### Question Selection Algorithm:
```php
// For each Holland group (R, I, A, S, E, C)
$questionsPerGroup = ($examType === 'FREE') ? 5 : 20;

$questions = $this->pdo->prepare("
    SELECT question_id, question_text 
    FROM questions 
    WHERE holland_group = ? AND status = 'active'
    ORDER BY RAND() 
    LIMIT ?
");
```

---

## API Endpoints

### 1. `POST /api/quiz/create-exam.php`

**Purpose**: Create new exam session with randomized questions

**Request**:
```json
{
    "exam_type": "FREE",
    "force_new": false
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "exam_id": 123,
        "exam_code": "EX20251101_ABC123",
        "exam_type": 0,
        "total_questions": 30,
        "questions": [
            {
                "id": "R001",
                "question_text": "Tôi thích làm việc với máy móc và công cụ",
                "choices": [
                    {"value": 0, "text": "Không đồng ý"},
                    {"value": 1, "text": "Bình thường"},
                    {"value": 2, "text": "Đồng ý"}
                ]
            }
        ],
        "fixed_choices": {
            "0": "Không đồng ý",
            "1": "Bình thường", 
            "2": "Đồng ý"
        }
    }
}
```

**Error Responses**:
- `460`: Existing incomplete exam found
- `461`: Invalid exam type
- `462`: Question generation failed

### 2. `GET /api/quiz/get-questions.php`

**Purpose**: Retrieve questions for existing exam session

**Parameters**: `?exam_id=123`

**Response**: Same format as create-exam endpoint

### 3. `POST /api/quiz/submit-quiz.php`

**Purpose**: Submit completed quiz answers

**Request**:
```json
{
    "exam_id": 123,
    "answers": {
        "R001": 2,
        "R002": 1,
        "I001": 0
    }
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "exam_id": 123,
        "result_id": 456,
        "personality_group": "Realistic",
        "scores": {
            "R": 18,
            "I": 12,
            "A": 8,
            "S": 15,
            "E": 14,
            "C": 10
        },
        "redirect_url": "read-test-result?exam_id=123"
    }
}
```

### 4. `GET /api/quiz/get-result.php`

**Purpose**: Retrieve detailed exam results

**Parameters**: `?exam_id=123`

**Response**:
```json
{
    "status": "success",
    "data": {
        "exam_info": {
            "exam_code": "EX20251101_ABC123",
            "exam_type": 0,
            "completion_date": "2024-11-01 10:30:00"
        },
        "scores": {
            "R": 18, "I": 12, "A": 8, "S": 15, "E": 14, "C": 10
        },
        "personality_group": "Realistic",
        "personality_groups": ["Realistic", "Social", "Enterprising"],
        "confidence_level": 85.5,
        "suggested_jobs": [
            {"job_title": "Kỹ sư cơ khí", "match_percentage": 92},
            {"job_title": "Thợ điện", "match_percentage": 88}
        ]
    }
}
```

### 5. `GET /api/quiz/get-user-exams.php`

**Purpose**: Get user's exam history

**Response**:
```json
{
    "status": "success",
    "data": {
        "exams": [
            {
                "exam_id": 123,
                "exam_code": "EX20251101_ABC123",
                "exam_type": 0,
                "exam_status": 1,
                "personality_group": "Realistic",
                "completion_date": "2024-11-01 10:30:00"
            }
        ],
        "total_count": 1
    }
}
```

---

## Error Handling

### Error Response Format
```json
{
    "status": "error",
    "error_code": 404,
    "message": "Exam not found",
    "details": "The specified exam ID does not exist or has been deleted"
}
```

### Common Error Codes
- `401`: Unauthorized (not logged in)
- `404`: Exam not found
- `405`: Method not allowed
- `460`: Incomplete exam exists
- `461`: Invalid exam type
- `462`: Question generation failed
- `463`: Invalid answer value

### Error Logging
```php
// All errors are logged with context
error_log("Create Exam API - Error: " . $error->getMessage());
error_log("User ID: " . $userId . ", Exam Type: " . $examType);
```

---

## Security Features

### 1. Authentication
```php
// Session-based authentication on all endpoints
session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(generateErrorResponse(ERROR_UNAUTHORIZED));
    exit;
}
```

### 2. CORS Headers
```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
```

### 3. SQL Injection Prevention
```php
// All database queries use prepared statements
$stmt = $this->pdo->prepare("SELECT * FROM quiz_exams WHERE user_id = ? AND exam_status = ?");
$stmt->execute([$userId, EXAM_STATUS_IN_PROGRESS]);
```

### 4. Rate Limiting
- Tracked in `quiz_user_limits` table
- Prevents exam spam creation
- Configurable limits per user type

### 5. Anti-Fraud Measures
- IP address tracking
- Answer change monitoring
- Time-based analytics
- Logged in `quiz_fraud_logs`

---

## SQL Scripts

### Database Setup

#### 1. `create-all-tables.sql`
- Complete database schema creation
- Includes all quiz-related tables
- Foreign key constraints
- Proper indexing for performance

#### 2. `sample-quiz-data.sql`
- Sample Holland Code questions
- Test user data
- Demo exam sessions

#### 3. `migrate_questions.sql`
- Question migration scripts
- Holland group assignments
- Question text updates

#### 4. `quick-fix-schema.sql`
- Schema updates and fixes
- Index optimizations
- Column modifications

---

## Development Guide

### Local Setup

1. **Database Configuration**:
```bash
# Import database schema
mysql -u root -p pac_db < sql/create-all-tables.sql

# Import sample data
mysql -u root -p pac_db < sql/sample-quiz-data.sql
```

2. **PHP Configuration**:
```php
// Update config/db-pdo.php with local settings
define('DB_HOST', 'localhost');
define('DB_NAME', 'pac_db');
define('DB_USER', 'root');
define('DB_PASS', 'your_password');
```

### Testing APIs

#### Create Exam Test:
```bash
curl -X POST http://localhost/pac-new/api/quiz/create-exam.php \
  -H "Content-Type: application/json" \
  -d '{"exam_type":"FREE"}' \
  --cookie "PHPSESSID=your_session_id"
```

#### Submit Quiz Test:
```bash
curl -X POST http://localhost/pac-new/api/quiz/submit-quiz.php \
  -H "Content-Type: application/json" \
  -d '{"exam_id":123,"answers":{"R001":2,"R002":1}}' \
  --cookie "PHPSESSID=your_session_id"
```

### Debug Mode

Enable detailed logging in development:
```php
// Add to config/constants.php
define('DEBUG_MODE', true);
define('LOG_LEVEL', 'DEBUG');

// Enhanced error reporting
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}
```

### Performance Monitoring

#### Key Metrics to Track:
- Question generation time
- Result calculation duration
- Database query performance
- Memory usage during large exams

#### Optimization Tips:
- Index `quiz_answers.exam_id` for fast aggregation
- Cache frequently accessed questions
- Use `LIMIT` in question selection queries
- Monitor `EXPLAIN` output for complex queries

---

## Integration Points

### Frontend Integration
- See `quiz-frontend.md` for client-side implementation
- AJAX-based communication with APIs
- Real-time progress tracking
- Error handling and user feedback

### Result Display
- See `read-test-result-system.md` for result rendering
- See `personality-images-integration.md` for visual assets
- Holland Code personality group mapping
- Career suggestion algorithms

### Shopping Cart Integration
- Exam type determination based on purchased packages
- User access level validation
- Payment verification for PAID exams

---

## Future Enhancements

### Planned Features
1. **Adaptive Questioning**: Dynamic question selection based on previous answers
2. **Multi-language Support**: Question translation system
3. **Advanced Analytics**: Detailed user behavior tracking
4. **API Versioning**: v2 endpoints with enhanced features
5. **Caching Layer**: Redis integration for performance
6. **Real-time Sync**: WebSocket-based progress updates

### Technical Debt
1. Refactor `QuizGenerator` into smaller, focused classes
2. Implement proper dependency injection
3. Add comprehensive unit tests
4. Standardize error response formats
5. Optimize database queries for large datasets

---

**Last Updated**: November 2024  
**Version**: 1.0  
**Author**: PAC Development Team