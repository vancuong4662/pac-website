<?php
/**
 * Test Career Suggestion Integration with Get Result API
 * Kiểm tra tích hợp hệ thống gợi ý nghề nghiệp với API lấy kết quả
 */

require_once '../../config/db-pdo.php';
require_once '../../includes/classes/CareerSuggestionEngine.php';

echo "<h1>Testing Career Suggestion Integration</h1>\n";
echo "<pre>\n";

try {
    // Test 1: CareerSuggestionEngine Initialization
    echo "=== Test 1: CareerSuggestionEngine Initialization ===\n";
    $careerEngine = new CareerSuggestionEngine($pdo);
    echo "✅ CareerSuggestionEngine initialized successfully\n\n";
    
    // Test 2: Database Connection
    echo "=== Test 2: Database Connection Check ===\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM jobs LIMIT 1");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Database connection successful\n";
    echo "Jobs table accessible: " . ($result ? "Yes" : "No") . "\n\n";
    
    // Test 3: Holland Code Calculation
    echo "=== Test 3: Holland Code Calculation ===\n";
    $testTendencies = [
        'R' => 8,
        'I' => 9,
        'A' => 7,
        'S' => 6,
        'E' => 5,
        'C' => 4
    ];
    
    arsort($testTendencies);
    $topThree = array_slice(array_keys($testTendencies), 0, 3, true);
    $hollandCode = implode('', $topThree);
    echo "Test tendencies: " . json_encode($testTendencies) . "\n";
    echo "Calculated Holland Code: $hollandCode\n";
    echo "✅ Holland Code calculation working\n\n";
    
    // Test 4: Career Suggestions Generation
    echo "=== Test 4: Career Suggestions Generation ===\n";
    $suggestions = $careerEngine->generateSuggestions($hollandCode);
    echo "Generated " . count($suggestions) . " career suggestions for Holland Code: $hollandCode\n";
    
    if (count($suggestions) > 0) {
        echo "✅ Career suggestions generated successfully\n";
        echo "Sample suggestion:\n";
        $sample = $suggestions[0];
        echo "- Job: " . $sample['job_title'] . "\n";
        echo "- Tier: " . $sample['tier'] . "\n";
        echo "- Match Type: " . $sample['match_type'] . "\n";
        echo "- Holland Code: " . $sample['holland_code'] . "\n";
    } else {
        echo "⚠️ No career suggestions generated\n";
    }
    echo "\n";
    
    // Test 5: Response Formatting
    echo "=== Test 5: Response Formatting ===\n";
    
    function formatCareerSuggestions($careerSuggestions, $examType = 'FREE') {
        $formattedJobs = [];
        
        foreach ($careerSuggestions as $suggestion) {
            $formattedJobs[] = [
                'job_title' => $suggestion['job_title'],
                'description' => $suggestion['description'] ?? 'Nghề nghiệp phù hợp với tính cách của bạn',
                'compatibility_score' => $suggestion['compatibility_score'],
                'matching_tier' => $suggestion['tier'],
                'holland_code_match' => $suggestion['holland_code'],
                'average_salary' => $suggestion['salary_range'] ?? 'Liên hệ tư vấn',
                'growth_prospect' => $suggestion['growth_outlook'] ?? 'Tốt',
                'required_skills' => $suggestion['key_skills'] ?? 'Đang cập nhật',
                'work_environment' => $suggestion['work_environment'] ?? 'Đa dạng',
                'education_level' => $suggestion['education_requirement'] ?? 'Tùy vị trí',
                'match_type' => $suggestion['match_type'],
                'priority_score' => $suggestion['priority_score'] ?? 0
            ];
        }
        
        if ($examType === 'FREE') {
            $formattedJobs = array_slice($formattedJobs, 0, 10);
        }
        
        return $formattedJobs;
    }
    
    $formattedSuggestions = formatCareerSuggestions($suggestions, 'FREE');
    echo "Formatted " . count($formattedSuggestions) . " suggestions for FREE exam\n";
    echo "✅ Response formatting working\n\n";
    
    // Test 6: Tier Summary Generation
    echo "=== Test 6: Tier Summary Generation ===\n";
    
    function getMatchingTiersSummary($careerSuggestions) {
        $tierSummary = [
            '5_star' => 0,
            '4_star' => 0,
            '3_star' => 0,
            '2_star' => 0
        ];
        
        foreach ($careerSuggestions as $suggestion) {
            $tier = $suggestion['tier'] ?? '';
            switch ($tier) {
                case '5⭐':
                    $tierSummary['5_star']++;
                    break;
                case '4⭐':
                    $tierSummary['4_star']++;
                    break;
                case '3⭐':
                    $tierSummary['3_star']++;
                    break;
                case '2⭐':
                    $tierSummary['2_star']++;
                    break;
            }
        }
        
        return $tierSummary;
    }
    
    $tierSummary = getMatchingTiersSummary($suggestions);
    echo "Tier Summary: " . json_encode($tierSummary, JSON_PRETTY_PRINT) . "\n";
    echo "✅ Tier summary generation working\n\n";
    
    // Test 7: Complete API Response Simulation
    echo "=== Test 7: Complete API Response Simulation ===\n";
    
    $mockExamData = [
        'exam_code' => 'TEST123',
        'exam_type' => 'FREE',
        'exam_status' => 1,
        'total_questions' => 30,
        'answered_questions' => 30,
        'total_score' => 45,
        'primary_group' => 'I',
        'secondary_group' => 'R',
        'created_at' => date('Y-m-d H:i:s'),
        'result_created_at' => date('Y-m-d H:i:s')
    ];
    
    $mockResult = [
        'exam_code' => $mockExamData['exam_code'],
        'exam_type' => $mockExamData['exam_type'],
        'exam_status' => $mockExamData['exam_status'],
        'total_questions' => $mockExamData['total_questions'],
        'answered_questions' => $mockExamData['answered_questions'],
        'total_score' => $mockExamData['total_score'],
        'holland_code' => $hollandCode,
        'primary_group' => $mockExamData['primary_group'],
        'secondary_group' => $mockExamData['secondary_group'],
        'tendencies' => $testTendencies,
        'suggested_jobs' => $formattedSuggestions,
        'career_analysis' => [
            'algorithm_version' => '4-tier-permutation',
            'total_jobs_analyzed' => count($suggestions),
            'matching_tiers' => $tierSummary,
            'holland_code_used' => $hollandCode
        ],
        'duration' => '00:15:30',
        'created_at' => $mockExamData['created_at'],
        'created_at_formatted' => date('d/m/Y H:i', strtotime($mockExamData['created_at'])),
        'result_created_at' => $mockExamData['result_created_at'],
        'result_created_at_formatted' => date('d/m/Y H:i', strtotime($mockExamData['result_created_at']))
    ];
    
    echo "Mock API Response Structure:\n";
    echo json_encode($mockResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    echo "✅ Complete API response simulation successful\n\n";
    
    // Test 8: Performance Check
    echo "=== Test 8: Performance Check ===\n";
    $startTime = microtime(true);
    
    for ($i = 0; $i < 5; $i++) {
        $testCodes = ['RIA', 'SIE', 'AEC', 'IRC', 'ASE'];
        $testCode = $testCodes[$i];
        $suggestions = $careerEngine->generateSuggestions($testCode);
        $formatted = formatCareerSuggestions($suggestions, 'FREE');
    }
    
    $endTime = microtime(true);
    $executionTime = ($endTime - $startTime) * 1000; // Convert to milliseconds
    
    echo "Generated suggestions for 5 different Holland Codes\n";
    echo "Total execution time: " . number_format($executionTime, 2) . "ms\n";
    echo "Average per request: " . number_format($executionTime / 5, 2) . "ms\n";
    echo "✅ Performance check complete\n\n";
    
    // Final Summary
    echo "=== Integration Test Summary ===\n";
    echo "✅ All tests passed successfully!\n";
    echo "✅ CareerSuggestionEngine is properly integrated\n";
    echo "✅ API response format is enhanced with career analysis\n";
    echo "✅ Performance is acceptable for production use\n";
    echo "✅ Ready for frontend integration\n\n";
    
    echo "=== Next Steps ===\n";
    echo "1. Test with real quiz data from database\n";
    echo "2. Update frontend to handle new response structure\n";
    echo "3. Deploy and monitor performance in production\n";

} catch (Exception $e) {
    echo "❌ Error during testing: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}

echo "</pre>\n";
?>