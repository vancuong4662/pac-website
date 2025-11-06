<?php

require_once __DIR__ . '/../../config/db-pdo.php';
require_once __DIR__ . '/CareerSuggestionEngine.php';

/**
 * Test script để kiểm tra hệ thống gợi ý nghề nghiệp
 * 
 * Usage: php test-career-suggestions.php
 */

echo "=== CAREER SUGGESTION SYSTEM TEST ===\n\n";

try {
    // Test 1: Test Permutation Calculator
    echo "Test 1: Permutation Calculator\n";
    echo "--------------------------------\n";
    
    $engine = new CareerSuggestionEngine($pdo);
    
    // Use reflection để test private method
    $reflection = new ReflectionClass($engine);
    $method = $reflection->getMethod('permutationCalculator');
    $method->setAccessible(true);
    
    $testArray = ['A', 'E', 'I'];
    $permutations = $method->invokeArgs($engine, [$testArray]);
    
    echo "Input: [" . implode(', ', $testArray) . "]\n";
    echo "Permutations:\n";
    foreach ($permutations as $i => $perm) {
        echo "  " . ($i + 1) . ". " . implode('', $perm) . "\n";
    }
    echo "Total: " . count($permutations) . " permutations\n\n";
    
    // Test 2: Tạo test data
    echo "Test 2: Creating Test Data\n";
    echo "--------------------------\n";
    
    // Tạo fake quiz result cho test
    $sql = "INSERT INTO quiz_results (
                exam_id, user_id, 
                score_r, score_i, score_a, score_s, score_e, score_c,
                total_score, holland_code, primary_group, secondary_group, tertiary_group,
                characteristics_code, created_at
            ) VALUES (999, 1, 15, 12, 18, 10, 16, 8, 79, 'AEI', 'A', 'E', 'I', 'AE', NOW())";
    
    $pdo->exec($sql);
    $testResultId = $pdo->lastInsertId();
    echo "Created test result ID: $testResultId\n";
    echo "Holland Code: AEI (A=18, E=16, I=12, R=15, S=10, C=8)\n\n";
    
    // Test 3: Generate suggestions
    echo "Test 3: Generate Career Suggestions\n";
    echo "-----------------------------------\n";
    
    $startTime = microtime(true);
    $summary = $engine->generateSuggestedJobs($testResultId);
    $endTime = microtime(true);
    
    echo "Generation Summary:\n";
    echo "  Total jobs: " . $summary['total_jobs'] . "\n";
    echo "  5-star jobs: " . $summary['breakdown']['5_star'] . "\n";
    echo "  4-star jobs: " . $summary['breakdown']['4_star'] . "\n";
    echo "  3-star jobs: " . $summary['breakdown']['3_star'] . "\n";
    echo "  2-star jobs: " . $summary['breakdown']['2_star'] . "\n";
    echo "  Calculation time: " . $summary['calculation_time_ms'] . " ms\n";
    echo "  Total time: " . round(($endTime - $startTime) * 1000, 2) . " ms\n\n";
    
    // Test 4: Get suggested jobs by star rating
    echo "Test 4: Get Jobs by Star Rating\n";
    echo "--------------------------------\n";
    
    for ($star = 5; $star >= 2; $star--) {
        $jobs = $engine->getSuggestedJobs($testResultId, $star, 5);
        echo "{$star}-star jobs (" . count($jobs) . " results):\n";
        
        foreach ($jobs as $job) {
            echo "  - {$job['job_name']} (Holland: {$job['holland_code']}, Score: {$job['match_score']}%)\n";
        }
        echo "\n";
    }
    
    // Test 5: Get summary statistics
    echo "Test 5: Summary Statistics\n";
    echo "--------------------------\n";
    
    $stats = $engine->getSuggestedJobsSummary($testResultId);
    echo "Statistics by star rating:\n";
    
    foreach ($stats as $stat) {
        echo "  {$stat['star_rating']} stars: {$stat['count']} jobs, avg score: " . 
             round($stat['avg_score'], 1) . "%\n";
    }
    echo "\n";
    
    // Test 6: Test specific Holland Codes
    echo "Test 6: Test Different Holland Codes\n";
    echo "------------------------------------\n";
    
    $testCodes = ['RIC', 'SEA', 'IAR', 'CES'];
    
    foreach ($testCodes as $code) {
        // Create test result
        $sql = "INSERT INTO quiz_results (
                    exam_id, user_id, holland_code, primary_group, secondary_group, tertiary_group,
                    characteristics_code, total_score, created_at
                ) VALUES (888, 1, ?, ?, ?, ?, ?, 60, NOW())";
        
        $chars = str_split($code);
        $pdo->prepare($sql)->execute([$code, $chars[0], $chars[1], $chars[2], substr($code, 0, 2)]);
        $resultId = $pdo->lastInsertId();
        
        // Generate suggestions
        $summary = $engine->generateSuggestedJobs($resultId);
        
        echo "Holland Code: $code\n";
        echo "  Total jobs: {$summary['total_jobs']}\n";
        echo "  Breakdown: 5★={$summary['breakdown']['5_star']}, " .
             "4★={$summary['breakdown']['4_star']}, " .
             "3★={$summary['breakdown']['3_star']}, " .
             "2★={$summary['breakdown']['2_star']}\n";
        echo "  Time: {$summary['calculation_time_ms']} ms\n\n";
    }
    
    // Test 7: Performance test
    echo "Test 7: Performance Test (10 runs)\n";
    echo "-----------------------------------\n";
    
    $times = [];
    for ($i = 0; $i < 10; $i++) {
        $start = microtime(true);
        $engine->generateSuggestedJobs($testResultId);
        $times[] = (microtime(true) - $start) * 1000;
    }
    
    echo "Performance results:\n";
    echo "  Average: " . round(array_sum($times) / count($times), 2) . " ms\n";
    echo "  Min: " . round(min($times), 2) . " ms\n";
    echo "  Max: " . round(max($times), 2) . " ms\n";
    echo "  Median: " . round($times[count($times) / 2], 2) . " ms\n\n";
    
    // Cleanup
    echo "Cleaning up test data...\n";
    $pdo->exec("DELETE FROM quiz_suggested_jobs WHERE result_id IN (SELECT id FROM quiz_results WHERE exam_id IN (999, 888))");
    $pdo->exec("DELETE FROM quiz_results WHERE exam_id IN (999, 888)");
    
    echo "\n=== ALL TESTS COMPLETED SUCCESSFULLY ===\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "\n";
    
    // Cleanup on error
    try {
        $pdo->exec("DELETE FROM quiz_suggested_jobs WHERE result_id IN (SELECT id FROM quiz_results WHERE exam_id IN (999, 888))");
        $pdo->exec("DELETE FROM quiz_results WHERE exam_id IN (999, 888)");
    } catch (Exception $cleanupError) {
        echo "Cleanup error: " . $cleanupError->getMessage() . "\n";
    }
}