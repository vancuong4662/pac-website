# Thuật toán Gợi ý Nghề nghiệp Holland Code - 4 Tầng với Permutation Matrix

**PAC Career Suggestion Algorithm - Sophisticated Job Matching System**

---

## Tổng quan

Hệ thống gợi ý nghề nghiệp sử dụng **thuật toán 4 tầng với Permutation Matrix** để tìm ra các nghề nghiệp phù hợp dựa trên Holland Code của người dùng. Thuật toán này được migrate từ old project với độ chính xác cao và khả năng gợi ý đa dạng.

### Nguyên lý hoạt động

```
User Test Result → Holland Code (3 ký tự) → 4-Tier Matching → Star Rating (2-5⭐)
     AEI              A,E,I                     Permutation        🌟🌟🌟🌟🌟
```

### Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Quiz Results      │    │   Algorithm Core    │    │   Career Database   │
│   (RIASEC Scores)   │────│   (4-Tier Match)    │────│   (200 Jobs)        │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                          │                          │
           ▼                          ▼                          ▼
    Holland Code 3-char        Permutation Matrix        Job Holland Codes
         (AEI)                    (AEI→AIE→EAI...)           (AEI, RIC...)
```

---

## Step 1: Tính Holland Code 3 ký tự

### Input: Kết quả bài test RIASEC
```json
{
  "scores": {
    "R": 12,  // Realistic
    "I": 8,   // Investigative  
    "A": 18,  // Artistic
    "S": 15,  // Social
    "E": 16,  // Enterprising
    "C": 10   // Conventional
  }
}
```

### Algorithm: Top 3 Scoring Groups
```php
// Sắp xếp điểm số từ cao xuống thấp
$sortedScores = ['A' => 18, 'E' => 16, 'S' => 15, 'R' => 12, 'C' => 10, 'I' => 8];

// Lấy 3 nhóm cao nhất
$hollandCode = 'AES';  // A(18) + E(16) + S(15)
```

### Output: Holland Code 3 ký tự
- **Primary Group**: A (Artistic) - 18 điểm
- **Secondary Group**: E (Enterprising) - 16 điểm  
- **Tertiary Group**: S (Social) - 15 điểm
- **Result**: `AES`

---

## Step 2: Nghề 5 sao - Perfect Match ⭐⭐⭐⭐⭐

### Algorithm: Exact Holland Code Match
```php
function findFiveStarJobs($userHollandCode, $jobsDatabase) {
    $fiveStarJobs = [];
    
    foreach ($jobsDatabase as $job) {
        if ($job['holland_code'] === $userHollandCode) {
            $fiveStarJobs[] = [
                ...$job,
                'star_rating' => 5,
                'match_type' => 'exact',
                'match_score' => 100.0
            ];
        }
    }
    
    return $fiveStarJobs;
}
```

### Example:
```
User Holland Code: AES
Job Database Search:
  ✅ "Nhà thiết kế đồ họa" (AES) → 5⭐ Perfect Match
  ❌ "Kỹ sư phần mềm" (IRA) → Not matched
  ❌ "Bác sĩ" (SIR) → Not matched
```

### Characteristics:
- **Match Rate**: 100%
- **Probability**: Thấp (chỉ có 1-3 nghề exact match)
- **Quality**: Cao nhất, phù hợp hoàn hảo

---

## Step 3: Nghề 4 sao - Permutation Algorithm ⭐⭐⭐⭐

### Algorithm: Permutation Matrix Generation

#### 3.1. Generate All Permutations
```php
function generatePermutations($hollandCodeArray) {
    // Input: ['A', 'E', 'S']
    $permutations = [];
    
    // Recursive permutation generation
    function permute($arr, $current = []) use (&$permutations) {
        if (empty($arr)) {
            $permutations[] = $current;
            return;
        }
        
        for ($i = 0; $i < count($arr); $i++) {
            $remaining = $arr;
            $next = array_splice($remaining, $i, 1)[0];
            permute($remaining, array_merge($current, [$next]));
        }
    }
    
    permute($hollandCodeArray);
    return $permutations;
}
```

#### 3.2. Permutation Matrix for AES:
```
Original: AES
Permutations:
1. AES ← (đã dùng cho 5⭐)
2. ASE ← 4⭐ candidate 
3. EAS ← 4⭐ candidate
4. ESA ← 4⭐ candidate  
5. SAE ← 4⭐ candidate
6. SEA ← 4⭐ candidate
```

#### 3.3. Job Matching Logic
```php
function findFourStarJobs($userHollandCode, $jobsDatabase) {
    $hollandArray = str_split($userHollandCode); // ['A','E','S']
    $permutations = generatePermutations($hollandArray);
    $fourStarJobs = [];
    
    foreach ($permutations as $perm) {
        $permCode = implode('', $perm); // 'ASE', 'EAS', etc.
        
        // Skip original code (đã dùng cho 5⭐)
        if ($permCode === $userHollandCode) continue;
        
        foreach ($jobsDatabase as $job) {
            if ($job['holland_code'] === $permCode) {
                $fourStarJobs[] = [
                    ...$job,
                    'star_rating' => 4,
                    'match_type' => 'permutation',
                    'match_score' => 85.0,
                    'permutation_code' => $permCode
                ];
            }
        }
    }
    
    return $fourStarJobs;
}
```

### Example Results:
```
User Holland Code: AES
4⭐ Matches:
  ✅ "Giám đốc marketing" (ASE) → 4⭐ Permutation Match
  ✅ "Nhà quản lý sự kiện" (EAS) → 4⭐ Permutation Match  
  ✅ "Chuyên viên PR" (ESA) → 4⭐ Permutation Match
```

### Characteristics:
- **Match Rate**: 85%
- **Count**: 5-15 nghề (tùy database)
- **Quality**: Rất cao, thứ tự ưu tiên khác nhau

---

## Step 4: Nghề 3 sao - 2-Character Combinations ⭐⭐⭐

### Algorithm: Two-Character Permutation

#### 4.1. Generate 2-Char Combinations
```php
function generateTwoCharCombinations($hollandCodeArray) {
    // Input: ['A', 'E', 'S']
    $permutations = generatePermutations($hollandCodeArray);
    $twoCharCodes = [];
    
    foreach ($permutations as $perm) {
        // Lấy 2 ký tự đầu của mỗi permutation
        $twoChar = substr(implode('', $perm), 0, 2);
        $twoCharCodes[] = $twoChar;
    }
    
    return array_unique($twoCharCodes);
}
```

#### 4.2. Two-Char Matrix for AES:
```
From Permutations: [AES, ASE, EAS, ESA, SAE, SEA]
Two-Char Codes:
1. AE (from AES, ASE)
2. AS (from ASE) 
3. EA (from EAS)
4. ES (from ESA)
5. SA (from SAE)
6. SE (from SEA)

Unique 2-Char Codes: [AE, AS, EA, ES, SA, SE]
```

#### 4.3. Job Matching Logic
```php
function findThreeStarJobs($userHollandCode, $jobsDatabase) {
    $hollandArray = str_split($userHollandCode);
    $twoCharCodes = generateTwoCharCombinations($hollandArray);
    $threeStarJobs = [];
    
    foreach ($twoCharCodes as $twoChar) {
        foreach ($jobsDatabase as $job) {
            if ($job['holland_code'] === $twoChar) {
                $threeStarJobs[] = [
                    ...$job,
                    'star_rating' => 3,
                    'match_type' => 'two_char',
                    'match_score' => 70.0,
                    'matched_chars' => $twoChar
                ];
            }
        }
    }
    
    return $threeStarJobs;
}
```

### Example Results:
```
User Holland Code: AES  
3⭐ Matches:
  ✅ "Nghệ sĩ độc lập" (AE) → 3⭐ Two-Char Match
  ✅ "Nhà văn" (AS) → 3⭐ Two-Char Match
  ✅ "MC/Dẫn chương trình" (EA) → 3⭐ Two-Char Match
  ✅ "Người mẫu" (ES) → 3⭐ Two-Char Match
```

### Characteristics:
- **Match Rate**: 70%
- **Count**: 15-30 nghề
- **Quality**: Trung bình khá, 2/3 đặc điểm khớp

---

## Step 5: Nghề 2 sao - Single Character Match ⭐⭐

### Algorithm: Individual Character Matching

```php
function findTwoStarJobs($userHollandCode, $jobsDatabase) {
    $hollandArray = str_split($userHollandCode); // ['A','E','S']
    $twoStarJobs = [];
    
    foreach ($hollandArray as $singleChar) {
        foreach ($jobsDatabase as $job) {
            if ($job['holland_code'] === $singleChar) {
                $twoStarJobs[] = [
                    ...$job,
                    'star_rating' => 2,
                    'match_type' => 'single_char',
                    'match_score' => 50.0,
                    'matched_char' => $singleChar
                ];
            }
        }
    }
    
    return $twoStarJobs;
}
```

### Example Results:
```
User Holland Code: AES
2⭐ Matches:
  ✅ "Họa sĩ" (A) → 2⭐ Artistic Match
  ✅ "Doanh nhân" (E) → 2⭐ Enterprising Match  
  ✅ "Giáo viên" (S) → 2⭐ Social Match
```

### Characteristics:
- **Match Rate**: 50%
- **Count**: 20-50 nghề
- **Quality**: Cơ bản, chỉ 1/3 đặc điểm khớp

---

## Step 6: Tổng hợp và Ranking

### 6.1. Aggregation Algorithm
```php
function aggregateJobSuggestions($userHollandCode, $jobsDatabase) {
    $allSuggestions = [];
    
    // Collect all tiers
    $fiveStarJobs = findFiveStarJobs($userHollandCode, $jobsDatabase);
    $fourStarJobs = findFourStarJobs($userHollandCode, $jobsDatabase);
    $threeStarJobs = findThreeStarJobs($userHollandCode, $jobsDatabase);
    $twoStarJobs = findTwoStarJobs($userHollandCode, $jobsDatabase);
    
    // Merge with priority
    $allSuggestions = array_merge(
        $fiveStarJobs,     // Highest priority
        $fourStarJobs,
        $threeStarJobs, 
        $twoStarJobs       // Lowest priority
    );
    
    // Remove duplicates (same job_id)
    $uniqueJobs = removeDuplicateJobs($allSuggestions);
    
    // Apply sorting and ranking
    $rankedJobs = applyAdvancedRanking($uniqueJobs);
    
    return $rankedJobs;
}
```

### 6.2. Advanced Ranking Factors
```php
function applyAdvancedRanking($jobs) {
    foreach ($jobs as &$job) {
        $job['final_score'] = calculateFinalScore($job);
    }
    
    // Sort by final_score descending
    usort($jobs, function($a, $b) {
        return $b['final_score'] <=> $a['final_score'];
    });
    
    return $jobs;
}

function calculateFinalScore($job) {
    $baseScore = $job['star_rating'] * 20; // 40-100 points
    
    // Bonus factors
    $educationBonus = calculateEducationMatch($job['education_level']);
    $groupBonus = calculateGroupPopularity($job['job_group']);
    $demandBonus = calculateMarketDemand($job['job_code']);
    
    return $baseScore + $educationBonus + $groupBonus + $demandBonus;
}
```

### 6.3. Output Structure
```json
{
  "user_holland_code": "AES",
  "total_suggestions": 45,
  "suggestions_by_tier": {
    "5_star": 2,
    "4_star": 8, 
    "3_star": 15,
    "2_star": 20
  },
  "top_suggestions": [
    {
      "job_id": 156,
      "job_name": "Nhà thiết kế đồ họa",
      "holland_code": "AES",
      "star_rating": 5,
      "match_type": "exact",
      "match_score": 100.0,
      "final_score": 125.5,
      "job_group": "Nghệ thuật & Thiết kế",
      "education_level": 3,
      "work_environment": "Văn phòng sáng tạo",
      "specializations": ["UI/UX Design", "Brand Design", "Print Design"],
      "main_tasks": ["Thiết kế logo", "Tạo layout", "Chỉnh sửa hình ảnh"],
      "work_areas": ["Công ty quảng cáo", "Studio thiết kế", "Freelance"]
    }
  ]
}
```

---

## Implementation Plan

### Phase 1: Core Algorithm Implementation

#### 1.1. Create PHP Class
```php
// File: includes/classes/CareerSuggestionEngine.php
class CareerSuggestionEngine {
    private $pdo;
    private $jobsCache = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->loadJobsCache();
    }
    
    public function generateSuggestions($riasecScores) {
        // Main entry point
    }
    
    private function calculateHollandCode($riasecScores) {
        // Step 1: Calculate 3-char Holland Code
    }
    
    private function findFiveStarJobs($hollandCode) {
        // Step 2: Perfect matches
    }
    
    private function findFourStarJobs($hollandCode) {
        // Step 3: Permutation matches
    }
    
    // ... other methods
}
```

#### 1.2. Database Integration
```sql
-- Insert into quiz_suggested_jobs table
INSERT INTO quiz_suggested_jobs (
    result_id, job_id, star_rating, match_type, 
    match_score, sort_order, created_at
) VALUES (?, ?, ?, ?, ?, ?, NOW());
```

#### 1.3. API Endpoint
```php
// File: api/quiz/generate-career-suggestions.php
POST /api/quiz/generate-career-suggestions.php
{
    "result_id": 123,
    "scores": {"R": 12, "I": 8, "A": 18, "S": 15, "E": 16, "C": 10}
}
```

### Phase 2: Advanced Features

#### 2.1. Machine Learning Enhancement
- **Job Popularity Tracking**: Track which jobs users are most interested in
- **Success Rate Analysis**: Analyze which suggestions lead to career satisfaction
- **Dynamic Weighting**: Adjust algorithm weights based on real-world feedback

#### 2.2. Personalization Factors
- **Age Adjustment**: Different weights for different age groups
- **Education Level**: Prioritize jobs matching user's education
- **Geographic Location**: Local job market considerations
- **Industry Trends**: Current job market demand

#### 2.3. Performance Optimization
```php
// Redis caching for job database
$redis->setex("jobs_cache", 3600, json_encode($jobsDatabase));

// Database indexes for fast lookup
CREATE INDEX idx_jobs_holland_code ON jobs(holland_code);
CREATE INDEX idx_jobs_group_education ON jobs(job_group, education_level);
```

### Phase 3: Integration & Testing

#### 3.1. Quiz System Integration
- Automatic suggestion generation after quiz completion
- Real-time suggestion updates during quiz progress
- Historical suggestion tracking per user

#### 3.2. Frontend Integration
- Interactive career exploration interface
- Detailed job information modals
- Career path visualization
- Comparison tools between suggested careers

#### 3.3. Testing Strategy
```php
// Unit tests for algorithm components
class CareerSuggestionEngineTest extends PHPUnit\Framework\TestCase {
    public function testHollandCodeCalculation() {
        $scores = ['R' => 12, 'I' => 8, 'A' => 18, 'S' => 15, 'E' => 16, 'C' => 10];
        $result = $this->engine->calculateHollandCode($scores);
        $this->assertEquals('AES', $result);
    }
    
    public function testPermutationGeneration() {
        $input = ['A', 'E', 'S'];
        $result = $this->engine->generatePermutations($input);
        $this->assertEquals(6, count($result)); // 3! = 6 permutations
    }
}
```

---

## Performance Considerations

### Algorithm Complexity
- **Time Complexity**: O(n × p) where n = jobs count, p = permutations
- **Space Complexity**: O(n) for jobs storage
- **Expected Runtime**: < 100ms for 200 jobs

### Optimization Strategies
1. **Caching**: Cache job database in memory/Redis
2. **Indexing**: Database indexes on holland_code fields  
3. **Pagination**: Return top N results, load more on demand
4. **Async Processing**: Generate suggestions in background for large datasets

### Scalability Plan
- **Horizontal Scaling**: Cache-based architecture for multiple servers
- **Database Partitioning**: Separate tables for different job categories
- **CDN Integration**: Cache static job data and images
- **Microservice Architecture**: Separate suggestion engine as independent service

---

## Migration from Old System

### Data Migration Strategy
```sql
-- Copy job data with Holland Code mapping
INSERT INTO jobs (job_name, holland_code, job_group, ...)
SELECT name, hollandCode, group, ...
FROM old_jobs_import;

-- Migrate existing results to new suggestion format
INSERT INTO quiz_suggested_jobs (result_id, job_id, star_rating, ...)
SELECT old_result_id, job_id, calculated_star_rating, ...
FROM legacy_suggestions_migration;
```

### Backward Compatibility
- Keep old API endpoints active during transition
- Gradual migration of existing users to new system
- A/B testing to compare old vs new suggestion quality

---

## Success Metrics

### Algorithm Quality Metrics
- **Suggestion Diversity**: Distribution across star ratings
- **User Engagement**: Click-through rates on suggested careers
- **Conversion Rate**: Users who pursue suggested careers
- **Accuracy Score**: User feedback on suggestion relevance

### Performance Metrics  
- **Response Time**: < 100ms for suggestion generation
- **Cache Hit Rate**: > 95% for job database lookups
- **Error Rate**: < 0.1% for algorithm failures
- **Throughput**: > 1000 suggestions per minute

---

## Future Enhancements

### Advanced Algorithm Features
1. **Hybrid Holland Codes**: Support for 4-6 character codes
2. **Dynamic Weighting**: Machine learning-based weight adjustment
3. **Multi-dimensional Matching**: Include personality traits beyond Holland Code
4. **Industry-specific Algorithms**: Different logic for different job sectors

### Integration Features
1. **External Job APIs**: Integration with job posting websites
2. **University Programs**: Link suggestions to relevant degree programs
3. **Skill Gap Analysis**: Identify skills needed for suggested careers
4. **Career Path Mapping**: Multi-step career progression suggestions

---

**Document Version**: 1.0  
**Created**: November 2024  
**Algorithm Basis**: Old Project TypeScript Implementation  
**Target Implementation**: PHP/MySQL PAC New System

**Related Files**:
- `includes/classes/CareerSuggestionEngine.php` - Core algorithm implementation
- `api/quiz/generate-career-suggestions.php` - API endpoint
- `sql/career-suggestions-tables.sql` - Database schema
- `docs/permutation-algorithm-examples.md` - Detailed algorithm examples