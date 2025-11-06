<?php

/**
 * Career Suggestion Engine - 4-Tier Algorithm Implementation
 * 
 * Phát triển dựa trên thuật toán sophisticated từ old project
 * Sử dụng Permutation Matrix để gợi ý nghề nghiệp theo Holland Code
 */

class CareerSuggestionEngine {
    
    private $db;
    private $cacheEnabled = true;
    private $maxJobsPerStar = [5 => 5, 4 => 15, 3 => 20, 2 => 10]; // Limit jobs per star level
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    /**
     * Generate suggestions for API (without saving to database)
     * 
     * @param string $hollandCode Holland Code (e.g., "IRA")
     * @return array Career suggestions in API format
     */
    public function generateSuggestions($hollandCode) {
        $suggestedJobs = $this->findJobsByHollandCode($hollandCode);
        
        // Convert to API format with all database fields
        return array_map(function($job) {
            return [
                // Basic info
                'job_title' => $job['job_name'],
                'description' => $job['job_description'] ?? 'Nghề nghiệp phù hợp với tính cách của bạn',
                
                // Compatibility scoring
                'compatibility_score' => $job['star_rating'],
                'tier' => $job['star_rating'] . '⭐',
                'holland_code' => $job['holland_code'],
                'match_type' => $job['match_type'],
                'priority_score' => $job['match_score'],
                
                // Pass through all database fields for frontend use
                'job_name_en' => $job['job_name_en'] ?? null,
                'job_group' => $job['job_group'] ?? null,
                'activities_code' => $job['activities_code'] ?? null,
                'education_level' => $job['education_level'] ?? null,
                'capacity' => $job['capacity'] ?? null,
                'essential_ability' => $job['essential_ability'] ?? null,
                'supplementary_ability' => $job['supplementary_ability'] ?? null,
                'work_environment' => $job['work_environment'] ?? null,
                'work_areas' => $job['work_areas'] ?? null,
                'work_style' => $job['work_style'] ?? null,
                'work_value' => $job['work_value'] ?? null,
                'main_tasks' => $job['main_tasks'] ?? null,
                'specializations' => $job['specializations'] ?? null,
                
                // Fallback fields for compatibility
                'salary_range' => 'Liên hệ tư vấn',
                'growth_outlook' => 'Tốt',
                'key_skills' => $job['essential_ability'] ?? 'Đang cập nhật',
                'education_requirement' => $job['education_level'] ?? 'Tùy vị trí'
            ];
        }, $suggestedJobs);
    }
    
    /**
     * Main function: Calculate và lưu suggested jobs cho một quiz result
     * 
     * @param int $resultId Quiz result ID
     * @return array Suggested jobs summary
     */
    public function generateSuggestedJobs($resultId) {
        $startTime = microtime(true);
        
        // 1. Lấy Holland Code từ quiz result
        $result = $this->getQuizResult($resultId);
        if (!$result) {
            throw new Exception("Quiz result not found: $resultId");
        }
        
        $hollandCode = $result['holland_code']; // VD: "AEI"
        
        // 2. Tìm nghề theo 4 tầng algorithm
        $suggestedJobs = $this->findJobsByHollandCode($hollandCode);
        
        // 3. Lưu vào database
        $this->saveSuggestedJobs($resultId, $suggestedJobs);
        
        $calculationTime = (microtime(true) - $startTime) * 1000; // milliseconds
        
        // 4. Update calculation time trong quiz_results
        $this->updateCalculationTime($resultId, $calculationTime);
        
        return [
            'total_jobs' => count($suggestedJobs),
            'breakdown' => [
                '5_star' => count(array_filter($suggestedJobs, fn($j) => $j['star_rating'] == 5)),
                '4_star' => count(array_filter($suggestedJobs, fn($j) => $j['star_rating'] == 4)),
                '3_star' => count(array_filter($suggestedJobs, fn($j) => $j['star_rating'] == 3)),
                '2_star' => count(array_filter($suggestedJobs, fn($j) => $j['star_rating'] == 2))
            ],
            'calculation_time_ms' => round($calculationTime, 2)
        ];
    }
    
    /**
     * Thuật toán 4 tầng tìm nghề theo Holland Code
     */
    private function findJobsByHollandCode($hollandCode) {
        $allSuggestedJobs = [];
        $codeArray = str_split($hollandCode); // ['A', 'E', 'I']
        
        // ===== TẦNG 1: Nghề 5 sao - Perfect Match =====
        $fiveStarJobs = $this->findExactMatches($hollandCode);
        $allSuggestedJobs = array_merge($allSuggestedJobs, $fiveStarJobs);
        
        // ===== TẦNG 2: Nghề 4 sao - Permutation Algorithm =====
        $fourStarJobs = $this->findPermutationMatches($codeArray, $hollandCode);
        $allSuggestedJobs = array_merge($allSuggestedJobs, $fourStarJobs);
        
        // ===== TẦNG 3: Nghề 3 sao - 2-Character Combinations =====
        $threeStarJobs = $this->findTwoCharMatches($codeArray);
        $allSuggestedJobs = array_merge($allSuggestedJobs, $threeStarJobs);
        
        // ===== TẦNG 4: Nghề 2 sao - Single Character Match =====
        $twoStarJobs = $this->findSingleCharMatches($codeArray);
        $allSuggestedJobs = array_merge($allSuggestedJobs, $twoStarJobs);
        
        // Sort by star_rating DESC, then by match_score DESC
        usort($allSuggestedJobs, function($a, $b) {
            if ($a['star_rating'] == $b['star_rating']) {
                return $b['match_score'] <=> $a['match_score'];
            }
            return $b['star_rating'] <=> $a['star_rating'];
        });
        
        return $allSuggestedJobs;
    }
    
    /**
     * TẦNG 1: Tìm nghề 5 sao - Exact match
     */
    private function findExactMatches($hollandCode) {
        try {
            $sql = "SELECT * FROM jobs 
                    WHERE holland_code = ? AND is_active = TRUE 
                    LIMIT ?";
            
            $jobs = $this->db->fetchAll($sql, [$hollandCode, $this->maxJobsPerStar[5]]);
            
            return array_map(function($job) use ($hollandCode) {
                return $this->buildJobSuggestion($job, 5, 'exact', 100.0, $hollandCode);
            }, $jobs);
        } catch (Exception $e) {
            // Fallback if jobs table doesn't exist
            return $this->getFallbackJobs($hollandCode, 5, 'exact');
        }
    }
    
    /**
     * TẦNG 2: Tìm nghề 4 sao - Permutation matches
     */
    private function findPermutationMatches($codeArray, $originalCode) {
        $permutations = $this->permutationCalculator($codeArray);
        $jobs = [];
        
        foreach ($permutations as $index => $permutation) {
            $permCode = implode('', $permutation);
            
            // Skip exact match (đã xử lý ở tầng 1)
            if ($permCode === $originalCode) continue;
            
            try {
                $sql = "SELECT * FROM jobs 
                        WHERE holland_code = ? AND is_active = TRUE
                        LIMIT ?";
                
                $permJobs = $this->db->fetchAll($sql, [$permCode, 5]);
            } catch (Exception $e) {
                // Fallback
                $permJobs = $this->getFallbackJobs($permCode, 4, 'permutation');
                $permJobs = array_slice($permJobs, 0, 3); // Limit fallback jobs
            }
            
            foreach ($permJobs as $job) {
                $matchScore = 95.0 - ($index * 3); // 95%, 92%, 89%, 86%, 83%
                $jobs[] = $this->buildJobSuggestion($job, 4, 'permutation', $matchScore, $originalCode);
            }
            
            // Limit total 4-star jobs
            if (count($jobs) >= $this->maxJobsPerStar[4]) break;
        }
        
        return array_slice($jobs, 0, $this->maxJobsPerStar[4]);
    }
    
    /**
     * TẦNG 3: Tìm nghề 3 sao - Two character combinations
     */
    private function findTwoCharMatches($codeArray) {
        $jobs = [];
        $permutations = $this->permutationCalculator($codeArray);
        $twoCharCodes = [];
        
        // Tạo tất cả 2-char combinations từ permutations
        foreach ($permutations as $perm) {
            $twoChar = substr(implode('', $perm), 0, 2);
            if (!in_array($twoChar, $twoCharCodes)) {
                $twoCharCodes[] = $twoChar;
            }
        }
        
        foreach ($twoCharCodes as $index => $code) {
            try {
                $sql = "SELECT * FROM jobs 
                        WHERE holland_code = ? AND is_active = TRUE
                        LIMIT ?";
                
                $twoCharJobs = $this->db->fetchAll($sql, [$code, 5]);
            } catch (Exception $e) {
                // Fallback
                $twoCharJobs = $this->getFallbackJobs($code, 3, 'two_char');
                $twoCharJobs = array_slice($twoCharJobs, 0, 2);
            }
            
            foreach ($twoCharJobs as $job) {
                $matchScore = 75.0 - ($index * 2.5); // 75%, 72.5%, 70%, 67.5%, 65%, 62.5%
                $jobs[] = $this->buildJobSuggestion($job, 3, 'two_char', $matchScore, implode('', $codeArray));
            }
            
            if (count($jobs) >= $this->maxJobsPerStar[3]) break;
        }
        
        return array_slice($jobs, 0, $this->maxJobsPerStar[3]);
    }
    
    /**
     * TẦNG 4: Tìm nghề 2 sao - Single character matches
     */
    private function findSingleCharMatches($codeArray) {
        $jobs = [];
        
        foreach ($codeArray as $index => $char) {
            try {
                $sql = "SELECT * FROM jobs 
                        WHERE holland_code = ? AND is_active = TRUE
                        LIMIT ?";
                
                $singleJobs = $this->db->fetchAll($sql, [$char, 4]);
            } catch (Exception $e) {
                // Fallback
                $singleJobs = $this->getFallbackJobs($char, 2, 'single_char');
                $singleJobs = array_slice($singleJobs, 0, 2);
            }
            
            foreach ($singleJobs as $job) {
                $matchScore = 55.0 - ($index * 5); // 55%, 50%, 45%
                $jobs[] = $this->buildJobSuggestion($job, 2, 'single_char', $matchScore, implode('', $codeArray));
            }
        }
        
        return array_slice($jobs, 0, $this->maxJobsPerStar[2]);
    }
    
    /**
     * Permutation Calculator - Core algorithm từ old project
     */
    private function permutationCalculator($array) {
        if (count($array) <= 1) {
            return [$array];
        }
        
        $permutations = [];
        for ($i = 0; $i < count($array); $i++) {
            $current = $array[$i];
            $remaining = array_merge(
                array_slice($array, 0, $i),
                array_slice($array, $i + 1)
            );
            
            foreach ($this->permutationCalculator($remaining) as $perm) {
                $permutations[] = array_merge([$current], $perm);
            }
        }
        
        return $permutations;
    }
    
    /**
     * Build job suggestion object with all required fields
     */
    private function buildJobSuggestion($job, $starRating, $matchType, $matchScore, $userHollandCode) {
        return [
            'job_id' => $job['id'],
            'job_name' => $job['job_name'],
            'job_name_en' => $job['job_name_en'],
            'holland_code' => $job['holland_code'],
            'star_rating' => $starRating,
            'match_type' => $matchType,
            'match_score' => round($matchScore, 2),
            'job_group' => $job['job_group'],
            'essential_ability' => $job['essential_ability'],
            'supplementary_ability' => $job['supplementary_ability'],
            'work_environment' => $job['work_environment'],
            'work_style' => $job['work_style'],
            'education_level' => $job['education_level'],
            'job_description' => $job['job_description'],
            'work_areas' => $job['work_areas'],
            'main_tasks' => $job['main_tasks'],
            'specializations' => $job['specializations'],
            'is_highlighted' => $starRating >= 4, // Highlight 4-5 star jobs
            'user_holland_code' => $userHollandCode
        ];
    }
    
    /**
     * Lưu suggested jobs vào database
     */
    private function saveSuggestedJobs($resultId, $suggestedJobs) {
        // Xóa suggested jobs cũ (nếu có)
        $this->db->execute("DELETE FROM quiz_suggested_jobs WHERE result_id = ?", [$resultId]);
        
        // Insert batch để tối ưu performance
        $sql = "INSERT INTO quiz_suggested_jobs (
            result_id, job_id, job_name, job_name_en, holland_code,
            star_rating, match_type, match_score, job_group,
            essential_ability, supplementary_ability, work_environment,
            work_style, education_level, job_description,
            work_areas, main_tasks, specializations, is_highlighted, sort_order
        ) VALUES ";
        
        $values = [];
        $params = [];
        
        foreach ($suggestedJobs as $index => $job) {
            $values[] = "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $params = array_merge($params, [
                $resultId,
                $job['job_id'],
                $job['job_name'],
                $job['job_name_en'],
                $job['holland_code'],
                $job['star_rating'],
                $job['match_type'],
                $job['match_score'],
                $job['job_group'],
                $job['essential_ability'],
                $job['supplementary_ability'],
                $job['work_environment'],
                $job['work_style'],
                $job['education_level'],
                $job['job_description'],
                $job['work_areas'],
                $job['main_tasks'],
                $job['specializations'],
                $job['is_highlighted'] ? 1 : 0,
                $index // sort_order
            ]);
        }
        
        if (!empty($values)) {
            $sql .= implode(', ', $values);
            $this->db->execute($sql, $params);
        }
    }
    
    /**
     * Lấy quiz result
     */
    private function getQuizResult($resultId) {
        $sql = "SELECT * FROM quiz_results WHERE id = ?";
        return $this->db->fetch($sql, [$resultId]);
    }
    
    /**
     * Update calculation time
     */
    private function updateCalculationTime($resultId, $calculationTime) {
        $sql = "UPDATE quiz_results SET calculation_time = ? WHERE id = ?";
        $this->db->execute($sql, [$calculationTime, $resultId]);
    }
    
    /**
     * Get suggested jobs for API response
     */
    public function getSuggestedJobs($resultId, $starFilter = null, $limit = 50) {
        $sql = "SELECT 
                    qsj.*,
                    j.job_name,
                    j.job_name_en,
                    j.job_group,
                    j.activities_code,
                    j.capacity,
                    j.essential_ability,
                    j.supplementary_ability,
                    j.education_level,
                    j.work_environment,
                    j.work_style,
                    j.work_value,
                    j.job_description,
                    j.specializations,
                    j.main_tasks,
                    j.work_areas,
                    j.icon_url,
                    j.sort_order as job_sort_order
                FROM quiz_suggested_jobs qsj
                LEFT JOIN jobs j ON qsj.job_id = j.id
                WHERE qsj.result_id = ?";
        $params = [$resultId];
        
        if ($starFilter) {
            $sql .= " AND qsj.star_rating = ?";
            $params[] = $starFilter;
        }
        
        $sql .= " ORDER BY qsj.star_rating DESC, qsj.match_score DESC, qsj.sort_order ASC";
        
        if ($limit) {
            $sql .= " LIMIT ?";
            $params[] = $limit;
        }
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Get suggested jobs summary
     */
    public function getSuggestedJobsSummary($resultId) {
        $sql = "SELECT 
                    star_rating,
                    COUNT(*) as count,
                    AVG(match_score) as avg_score
                FROM quiz_suggested_jobs 
                WHERE result_id = ?
                GROUP BY star_rating
                ORDER BY star_rating DESC";
        
        return $this->db->fetchAll($sql, [$resultId]);
    }
    
    /**
     * Fallback jobs when database table doesn't exist or is empty
     */
    private function getFallbackJobs($hollandCode, $starRating, $matchType) {
        $fallbackDatabase = [
            'IRA' => [
                ['job_name' => 'Kỹ sư Phần mềm', 'job_description' => 'Phát triển ứng dụng và hệ thống phần mềm', 'essential_ability' => 'Lập trình, Tư duy logic, Sáng tạo', 'work_environment' => 'Văn phòng công nghệ', 'education_level' => 'Đại học'],
                ['job_name' => 'Kỹ sư Dữ liệu', 'job_description' => 'Phân tích và xử lý dữ liệu lớn', 'essential_ability' => 'Toán học, Python, Machine Learning', 'work_environment' => 'Công ty công nghệ', 'education_level' => 'Đại học'],
            ],
            'IAR' => [
                ['job_name' => 'Nhà Thiết kế UX/UI', 'job_description' => 'Thiết kế trải nghiệm người dùng', 'essential_ability' => 'Thiết kế, Nghiên cứu người dùng', 'work_environment' => 'Studio thiết kế', 'education_level' => 'Đại học'],
            ],
            'SIE' => [
                ['job_name' => 'Nhà Tâm lý học', 'job_description' => 'Tư vấn và nghiên cứu tâm lý', 'essential_ability' => 'Tâm lý học, Giao tiếp', 'work_environment' => 'Phòng khám, Trường học', 'education_level' => 'Đại học chuyên ngành'],
            ],
            'DEFAULT' => [
                ['job_name' => 'Chuyên viên Tư vấn', 'job_description' => 'Tư vấn nghề nghiệp và phát triển cá nhân', 'essential_ability' => 'Tư vấn, Giao tiếp', 'work_environment' => 'Văn phòng', 'education_level' => 'Đại học'],
            ]
        ];
        
        $jobs = $fallbackDatabase[$hollandCode] ?? $fallbackDatabase['DEFAULT'];
        
        return array_map(function($job, $index) use ($starRating, $matchType, $hollandCode) {
            $job['id'] = 'fallback_' . $index;
            $job['holland_code'] = $hollandCode;
            $job['job_name_en'] = $job['job_name'];
            $job['job_group'] = 'General';
            $job['supplementary_ability'] = $job['essential_ability'];
            $job['work_style'] = 'Collaborative';
            $job['work_areas'] = 'Various';
            $job['main_tasks'] = 'Professional duties';
            $job['specializations'] = 'Multiple specializations available';
            
            $matchScore = $starRating == 5 ? 100 : ($starRating == 4 ? 90 : ($starRating == 3 ? 75 : 60));
            return $this->buildJobSuggestion($job, $starRating, $matchType, $matchScore, $hollandCode);
        }, $jobs, array_keys($jobs));
    }
}

/**
 * Usage Example:
 * 
 * $engine = new CareerSuggestionEngine($database);
 * 
 * // Generate suggestions for a quiz result
 * $summary = $engine->generateSuggestedJobs(123);
 * 
 * // Get suggested jobs for API
 * $jobs = $engine->getSuggestedJobs(123, $starFilter = 5, $limit = 10);
 * 
 * // Get summary statistics
 * $stats = $engine->getSuggestedJobsSummary(123);
 */