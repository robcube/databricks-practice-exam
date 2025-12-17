"use strict";
/**
 * Progress Tracking Service Demo
 *
 * This example demonstrates the key functionality of the ProgressTrackingService
 * including historical data storage, trend calculation, and improvement prioritization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProgressTrackingDemo = runProgressTrackingDemo;
const ProgressTrackingService_1 = require("../services/ProgressTrackingService");
async function runProgressTrackingDemo() {
    console.log('=== Progress Tracking Service Demo ===\n');
    const progressService = new ProgressTrackingService_1.ProgressTrackingService();
    const userId = 'demo-user-123';
    // Create sample exam results showing progression over time
    const examResults = [
        createSampleExamResult('exam1', userId, new Date('2024-01-01'), [
            { topic: 'Databricks Lakehouse Platform', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 90 },
            { topic: 'ELT with Spark SQL and Python', totalQuestions: 15, correctAnswers: 11, percentage: 73, averageTime: 85 },
            { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 6, percentage: 50, averageTime: 95 },
            { topic: 'Production Pipelines', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 88 },
            { topic: 'Data Governance', totalQuestions: 9, correctAnswers: 5, percentage: 56, averageTime: 92 }
        ]),
        createSampleExamResult('exam2', userId, new Date('2024-01-15'), [
            { topic: 'Databricks Lakehouse Platform', totalQuestions: 12, correctAnswers: 10, percentage: 83, averageTime: 85 },
            { topic: 'ELT with Spark SQL and Python', totalQuestions: 15, correctAnswers: 13, percentage: 87, averageTime: 80 },
            { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 7, percentage: 58, averageTime: 90 },
            { topic: 'Production Pipelines', totalQuestions: 12, correctAnswers: 10, percentage: 83, averageTime: 82 },
            { topic: 'Data Governance', totalQuestions: 9, correctAnswers: 6, percentage: 67, averageTime: 88 }
        ]),
        createSampleExamResult('exam3', userId, new Date('2024-02-01'), [
            { topic: 'Databricks Lakehouse Platform', totalQuestions: 12, correctAnswers: 11, percentage: 92, averageTime: 80 },
            { topic: 'ELT with Spark SQL and Python', totalQuestions: 15, correctAnswers: 14, percentage: 93, averageTime: 75 },
            { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 7, percentage: 58, averageTime: 88 },
            { topic: 'Production Pipelines', totalQuestions: 12, correctAnswers: 11, percentage: 92, averageTime: 78 },
            { topic: 'Data Governance', totalQuestions: 9, correctAnswers: 7, percentage: 78, averageTime: 85 }
        ])
    ];
    // 1. Store historical performance data
    console.log('1. Storing Historical Performance Data');
    console.log('=====================================');
    for (const examResult of examResults) {
        await progressService.storeHistoricalPerformanceData(userId, examResult);
        console.log(`✓ Stored exam result: ${examResult.id} (Score: ${Math.round((examResult.correctAnswers / examResult.totalQuestions) * 100)}%)`);
    }
    const historicalData = await progressService.getHistoricalPerformanceData(userId);
    console.log(`\nHistorical Summary:`);
    console.log(`- Total Exams: ${historicalData.totalExamsTaken}`);
    console.log(`- Average Score: ${historicalData.averageScore}%`);
    console.log(`- Best Score: ${historicalData.bestScore}%`);
    console.log(`- Worst Score: ${historicalData.worstScore}%`);
    console.log(`- Total Time Spent: ${Math.round(historicalData.totalTimeSpent / 3600)} hours`);
    // 2. Calculate performance trends
    console.log('\n2. Performance Trends Analysis');
    console.log('==============================');
    const trends = await progressService.calculatePerformanceTrends(userId);
    trends.forEach((trend) => {
        console.log(`\n${trend.topic}:`);
        console.log(`  - Trend: ${trend.trend.toUpperCase()}`);
        console.log(`  - Scores: ${trend.scores.join(' → ')}`);
        console.log(`  - Average: ${trend.averageScore}%`);
        console.log(`  - Latest: ${trend.latestScore}%`);
        console.log(`  - Improvement Rate: ${trend.improvementRate}% per exam`);
    });
    // 3. Build improvement-based prioritization
    console.log('\n3. Improvement-Based Topic Prioritization');
    console.log('=========================================');
    const prioritization = await progressService.buildImprovementBasedPrioritization(userId, 3);
    prioritization.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.topic}`);
        console.log(`   Priority: ${item.priority}/5 (${item.priority >= 4 ? 'HIGH' : item.priority >= 3 ? 'MEDIUM' : 'LOW'})`);
        console.log(`   Reason: ${item.reasonForPriority}`);
        console.log(`   Sessions without improvement: ${item.sessionsWithoutImprovement}`);
        console.log(`   Recommended Action: ${item.recommendedAction}`);
    });
    // 4. Generate comprehensive assessment configuration
    console.log('\n4. Comprehensive Assessment Configuration');
    console.log('========================================');
    const assessmentConfig = await progressService.generateComprehensiveAssessmentConfig(60);
    console.log(`Total Questions: ${assessmentConfig.totalQuestions}`);
    console.log(`Include All Difficulties: ${assessmentConfig.includeAllDifficulties}`);
    console.log(`Balance by Subtopic: ${assessmentConfig.balanceBySubtopic}`);
    console.log('\nTopic Distribution:');
    for (const [topic, questionCount] of assessmentConfig.topicDistribution) {
        const percentage = Math.round((questionCount / assessmentConfig.totalQuestions) * 100);
        console.log(`  - ${topic}: ${questionCount} questions (${percentage}%)`);
    }
    // 5. Generate comprehensive analytics
    console.log('\n5. Comprehensive Performance Analytics');
    console.log('=====================================');
    const analytics = await progressService.generateComprehensiveAnalytics(userId);
    console.log(`User ID: ${analytics.userId}`);
    console.log(`Overall Progress: ${analytics.overallProgress}%`);
    console.log(`Weak Areas: ${analytics.weakAreas.join(', ') || 'None'}`);
    console.log(`Strong Areas: ${analytics.strongAreas.join(', ') || 'None'}`);
    console.log('\nStudy Recommendations:');
    analytics.recommendedStudyPlan.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.topic} (${rec.priority.toUpperCase()} priority)`);
        console.log(`     - ${rec.recommendedQuestions} questions recommended`);
        console.log(`     - Focus: ${rec.focusAreas.join(', ')}`);
    });
    console.log('\n=== Demo Complete ===');
}
function createSampleExamResult(id, userId, endTime, topicBreakdown) {
    const startTime = new Date(endTime.getTime() - 5400000); // 90 minutes earlier
    const totalQuestions = topicBreakdown.reduce((sum, topic) => sum + topic.totalQuestions, 0);
    const correctAnswers = topicBreakdown.reduce((sum, topic) => sum + topic.correctAnswers, 0);
    return {
        id,
        userId,
        examType: 'practice',
        startTime,
        endTime,
        totalQuestions,
        correctAnswers,
        topicBreakdown,
        timeSpent: 5400, // 90 minutes in seconds
        questions: [] // Simplified for demo
    };
}
// Run the demo if this file is executed directly
if (require.main === module) {
    runProgressTrackingDemo().catch(console.error);
}
//# sourceMappingURL=progress-tracking-demo.js.map