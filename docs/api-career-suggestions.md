# API Documentation - Career Suggestion System

## Tổng quan

Hệ thống gợi ý nghề nghiệp PAC sử dụng thuật toán 4 tầng với Permutation Matrix để đưa ra các nghề nghiệp phù hợp dựa trên Holland Code.

## Workflow

```
Quiz Answers → Holland Code Calculation → Career Suggestions → Display Results
```

## API Endpoints

### 1. Calculate Holland Code Result

**Endpoint**: `POST /api/quiz/calculate-result.php`

**Mục đích**: Tính toán Holland Code từ câu trả lời quiz

**Request**:
```json
{
  "exam_id": 123
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "result_id": 456,
    "exam_id": 123,
    "holland_code": "AEI",
    "primary_group": "A",
    "secondary_group": "E", 
    "tertiary_group": "I",
    "characteristics_code": "AE",
    "total_score": 89,
    "scores": {
      "R": 15,
      "I": 12,
      "A": 18,
      "S": 10,
      "E": 16,
      "C": 8
    },
    "answered_questions": 30,
    "total_questions": 30
  },
  "message": "Holland Code calculated successfully"
}
```

---

### 2. Generate Career Suggestions

**Endpoint**: `POST /api/quiz/generate-suggestions.php`

**Mục đích**: Tạo gợi ý nghề nghiệp dựa trên Holland Code

**Request**:
```json
{
  "result_id": 456
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "result_id": 456,
    "total_jobs": 42,
    "breakdown": {
      "5_star": 3,
      "4_star": 12,
      "3_star": 18,
      "2_star": 9
    },
    "calculation_time_ms": 45.67,
    "api_time_ms": 52.34
  },
  "message": "Career suggestions generated successfully"
}
```

---

### 3. Get Suggested Jobs

**Endpoint**: `GET /api/quiz/suggested-jobs.php`

**Query Parameters**:
- `result_id` (required): Quiz result ID
- `star` (optional): Filter by star rating (2-5)
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example**: `GET /api/quiz/suggested-jobs.php?result_id=456&star=5&limit=10`

**Response**:
```json
{
  "success": true,
  "data": {
    "result_id": 456,
    "jobs": [
      {
        "id": 1,
        "job_id": 25,
        "job_name": "Phát thanh viên, biên tập viên truyền thông",
        "job_name_en": "Broadcaster, Media Editor",
        "holland_code": "AEI",
        "star_rating": 5,
        "match_type": "exact",
        "match_score": 100.0,
        "job_group": "Ngôn ngữ",
        "essential_ability": "Ngôn ngữ",
        "supplementary_ability": "Giao tiếp",
        "work_environment": "Cấu trúc ổn định, rõ ràng",
        "work_style": "Công việc yêu cầu tính đúng đắn, trách nhiệm",
        "education_level": 3,
        "job_description": "Phát thanh viên trên đài phát thanh...",
        "work_areas": [
          "Đài phát thanh và truyền hình",
          "Doanh nghiệp Tổ chức Sự kiện"
        ],
        "main_tasks": [
          "Đọc bản tin và các thông báo khác",
          "Giới thiệu diễn viên, nghệ sĩ biểu diễn"
        ],
        "specializations": [
          "Phát thanh viên thời sự",
          "Phát thanh viên thể thao"
        ],
        "is_highlighted": true,
        "sort_order": 0,
        "created_at": "2024-11-06 10:30:00"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "has_more": true,
      "total_in_filter": 15
    },
    "summary": [
      {
        "star_rating": 5,
        "count": 3,
        "avg_score": 100.0
      },
      {
        "star_rating": 4,
        "count": 12,
        "avg_score": 87.5
      }
    ],
    "filters": {
      "star_filter": 5,
      "applied": "Jobs with 5 stars"
    }
  }
}
```

---

### 4. Complete Quiz (All-in-One)

**Endpoint**: `POST /api/quiz/complete-quiz.php`

**Mục đích**: Tích hợp workflow hoàn chỉnh từ tính Holland Code đến gợi ý nghề nghiệp

**Request**:
```json
{
  "exam_id": 123
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "result": {
      "result_id": 456,
      "exam_id": 123,
      "holland_code": "AEI",
      "primary_group": "A",
      "secondary_group": "E",
      "tertiary_group": "I",
      "characteristics_code": "AE",
      "total_score": 89,
      "scores": {
        "R": 15, "I": 12, "A": 18,
        "S": 10, "E": 16, "C": 8
      },
      "answered_questions": 30,
      "total_questions": 30,
      "is_existing": false
    },
    "suggestions": {
      "total_jobs": 42,
      "breakdown": {
        "5_star": 3,
        "4_star": 12,
        "3_star": 18,
        "2_star": 9
      },
      "calculation_time_ms": 45.67
    },
    "top_jobs": [
      {
        "id": 1,
        "job_name": "Phát thanh viên, biên tập viên truyền thông",
        "holland_code": "AEI",
        "star_rating": 5,
        "match_score": 100.0,
        "job_group": "Ngôn ngữ",
        "essential_ability": "Ngôn ngữ",
        "education_level": 3,
        "work_areas": ["Đài phát thanh và truyền hình"]
      }
    ],
    "stats": [
      {
        "star_rating": 5,
        "count": 3,
        "avg_score": 100.0
      },
      {
        "star_rating": 4,
        "count": 12,
        "avg_score": 87.5
      }
    ],
    "performance": {
      "total_time_ms": 52.34,
      "breakdown": {
        "holland_calculation": "included in total",
        "job_suggestions": 45.67,
        "api_overhead": 6.67
      }
    }
  },
  "message": "Quiz completed successfully with career suggestions"
}
```

## Error Handling

Tất cả APIs trả về format lỗi nhất quán:

```json
{
  "success": false,
  "error": "Error message",
  "debug": {
    "file": "/path/to/file.php",
    "line": 123
  }
}
```

**Common Error Codes**:
- `400`: Bad Request (thiếu parameters, invalid data)
- `404`: Not Found (exam/result không tồn tại)
- `405`: Method Not Allowed (wrong HTTP method)
- `500`: Internal Server Error

## Algorithm Details

### Holland Code Calculation

1. **Input**: Quiz answers (0=Không đồng ý, 1=Bình thường, 2=Đồng ý)
2. **Process**: Sum scores by Holland group (R,I,A,S,E,C)
3. **Output**: Top 3 groups form Holland Code (e.g., "AEI")

### Career Suggestion Algorithm (4 Tiers)

#### Tier 1: 5-Star Jobs (Perfect Match)
```sql
SELECT * FROM jobs WHERE holland_code = 'AEI'
```
- **Match Type**: `exact`
- **Score**: 100%

#### Tier 2: 4-Star Jobs (Permutations)
```
AEI → AIE, EAI, EIA, IEA, IAE
```
- **Match Type**: `permutation`
- **Score**: 95%, 92%, 89%, 86%, 83%

#### Tier 3: 3-Star Jobs (2-Character)
```
AEI → AE, AI, EI, EA, IA, IE
```
- **Match Type**: `two_char`
- **Score**: 75% - 62.5%

#### Tier 4: 2-Star Jobs (Single Character)
```
AEI → A, E, I
```
- **Match Type**: `single_char`
- **Score**: 55%, 50%, 45%

### Performance Optimization

- **Permutation Caching**: Cache permutation results
- **Database Indexes**: Optimized queries on `holland_code`
- **Batch Processing**: Insert multiple suggestions in one query
- **Result Limits**: Limit jobs per star level để tránh overload

## Testing

**Test Script**: `/api/quiz/test-career-suggestions.php`

```bash
cd /api/quiz/
php test-career-suggestions.php
```

**Test Coverage**:
- Permutation algorithm correctness
- All 4 tiers of job matching
- Performance benchmarks
- Different Holland Code combinations
- Error handling

## Database Schema

### quiz_results
- Lưu Holland Code và scores
- Link đến quiz_exams và users

### quiz_suggested_jobs  
- Lưu chi tiết nghề gợi ý với star rating
- Include job snapshot data
- Sort by star → score → order

### jobs
- Master data 200 nghề nghiệp
- Holland Code mapping
- Full job information (JSON fields)

## Usage Examples

### Frontend Integration

```javascript
// Step 1: Complete quiz
const response = await fetch('/api/quiz/complete-quiz.php', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({exam_id: 123})
});

const data = await response.json();
console.log('Holland Code:', data.data.result.holland_code);
console.log('Top Jobs:', data.data.top_jobs);

// Step 2: Get more jobs by star rating
const fiveStarJobs = await fetch(
  `/api/quiz/suggested-jobs.php?result_id=${data.data.result.result_id}&star=5`
);
```

### Backend Processing

```php
// Generate suggestions after quiz completion
$engine = new CareerSuggestionEngine($pdo);
$summary = $engine->generateSuggestedJobs($resultId);

// Get jobs for display
$topJobs = $engine->getSuggestedJobs($resultId, null, 20);
$fiveStarJobs = $engine->getSuggestedJobs($resultId, 5, 10);

// Get statistics
$stats = $engine->getSuggestedJobsSummary($resultId);
```

## Security Considerations

- **Input Validation**: All parameters validated
- **SQL Injection**: Prepared statements used
- **CORS**: Configured for frontend access
- **Rate Limiting**: Consider implementing for production
- **Data Privacy**: No sensitive data logged

---

*Documentation updated: November 2024*