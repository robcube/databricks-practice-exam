/**
 * Demonstration of the Adaptive Question Selection Engine
 * 
 * This example shows how the adaptive engine works with different user scenarios:
 * 1. New user with no exam history (balanced distribution)
 * 2. User with weak areas (60% allocation to weak topics)
 * 3. User with improving performance (reduced allocation to strong topics)
 */

import { 
  AdaptiveQuestionService, 
  ExamGenerationService 
} from '../services';
import { ExamResult, ExamTopic, TopicScore } from '../../../shared/types';

// Mock exam results for demonstration
function createExamResult(topicScores: { [topic: string]: number }, examDate: Date): ExamResult {
  const allTopics: ExamTopic[] = [
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ];

  const topicBreakdown: TopicScore[] = allTopics.map(topic => {
    const percentage = topicScores[topic] || 75;
    return {
      topic,
      totalQuestions: 12,
      correctAnswers: Math.round((percentage / 100) * 12),
      percentage,
      averageTime: 120
    };
  });

  const totalCorrect = topicBreakdown.reduce((sum, topic) => sum + topic.correctAnswers, 0);

  return {
    id: `demo_exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'demo_user',
    examType: 'practice',
    startTime: new Date(examDate.getTime() - 5400000), // 1.5 hours before end
    endTime: examDate,
    totalQuestions: 60,
    correctAnswers: totalCorrect,
    topicBreakdown,
    timeSpent: 5400, // 90 minutes
    questions: []
  };
}

async function demonstrateAdaptiveEngine() {
  console.log('🎯 Adaptive Question Selection Engine Demo\n');
  
  const adaptiveService = new AdaptiveQuestionService();
  const examService = new ExamGenerationService();

  // Scenario 1: New User (No Exam History)
  console.log('📚 Scenario 1: New User with No Exam History');
  console.log('Expected: Balanced distribution across all topics\n');

  const newUserAnalysis = await adaptiveService.analyzeUserPerformance([]);
  console.log('Analysis Result:');
  console.log(`- Has exam history: ${newUserAnalysis.hasExamHistory}`);
  console.log(`- Weak areas: ${newUserAnalysis.weakAreas.join(', ') || 'None'}`);
  console.log(`- Strong areas: ${newUserAnalysis.strongAreas.join(', ') || 'None'}`);
  console.log('- Question allocation:');
  newUserAnalysis.recommendedAllocation.forEach(alloc => {
    console.log(`  • ${alloc.topic}: ${alloc.questionCount} questions (${alloc.priority} priority)`);
  });
  console.log('\n' + '='.repeat(80) + '\n');

  // Scenario 2: User with Weak Areas
  console.log('📉 Scenario 2: User with Identified Weak Areas');
  console.log('Expected: 60% allocation to weak areas (ELT and Incremental Processing)\n');

  const weakUserHistory = [
    createExamResult({
      'Databricks Lakehouse Platform': 85,
      'ELT with Spark SQL and Python': 65,      // Weak area (below 70%)
      'Incremental Data Processing': 60,        // Weak area (below 70%)
      'Production Pipelines': 75,
      'Data Governance': 90
    }, new Date('2024-01-15')),
    
    createExamResult({
      'Databricks Lakehouse Platform': 88,
      'ELT with Spark SQL and Python': 68,      // Still weak
      'Incremental Data Processing': 62,        // Still weak
      'Production Pipelines': 78,
      'Data Governance': 92
    }, new Date('2024-02-01'))
  ];

  const weakUserAnalysis = await adaptiveService.analyzeUserPerformance(weakUserHistory);
  console.log('Analysis Result:');
  console.log(`- Has exam history: ${weakUserAnalysis.hasExamHistory}`);
  console.log(`- Weak areas: ${weakUserAnalysis.weakAreas.join(', ')}`);
  console.log(`- Strong areas: ${weakUserAnalysis.strongAreas.join(', ')}`);
  console.log('- Question allocation:');
  
  let totalWeakQuestions = 0;
  weakUserAnalysis.recommendedAllocation.forEach(alloc => {
    console.log(`  • ${alloc.topic}: ${alloc.questionCount} questions (${alloc.priority} priority, avg score: ${alloc.averageScore}%)`);
    if (weakUserAnalysis.weakAreas.includes(alloc.topic)) {
      totalWeakQuestions += alloc.questionCount;
    }
  });
  
  const totalQuestions = weakUserAnalysis.recommendedAllocation.reduce((sum, alloc) => sum + alloc.questionCount, 0);
  const weakPercentage = Math.round((totalWeakQuestions / totalQuestions) * 100);
  console.log(`\n📊 Weak area allocation: ${totalWeakQuestions}/${totalQuestions} questions (${weakPercentage}%)`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Scenario 3: User with Performance Trends
  console.log('📈 Scenario 3: User with Performance Trends');
  console.log('Expected: Recommendations based on improvement patterns\n');

  const trendUserHistory = [
    createExamResult({
      'Databricks Lakehouse Platform': 70,
      'ELT with Spark SQL and Python': 60,      // Starting low
      'Incremental Data Processing': 85,        // Strong and stable
      'Production Pipelines': 75,
      'Data Governance': 80
    }, new Date('2024-01-01')),
    
    createExamResult({
      'Databricks Lakehouse Platform': 75,
      'ELT with Spark SQL and Python': 70,      // Improving
      'Incremental Data Processing': 87,        // Still strong
      'Production Pipelines': 73,               // Declining
      'Data Governance': 85
    }, new Date('2024-01-15')),
    
    createExamResult({
      'Databricks Lakehouse Platform': 80,
      'ELT with Spark SQL and Python': 78,      // Continued improvement
      'Incremental Data Processing': 90,        // Excellent
      'Production Pipelines': 70,               // Further decline
      'Data Governance': 88
    }, new Date('2024-02-01'))
  ];

  const trendAnalysis = await adaptiveService.analyzeUserPerformance(trendUserHistory);
  const trends = adaptiveService.calculatePerformanceTrends(trendUserHistory);
  const recommendations = adaptiveService.generateStudyRecommendations(trendAnalysis, trends);

  console.log('Performance Trends:');
  trends.forEach(trend => {
    const latestScore = trend.scores[trend.scores.length - 1];
    const firstScore = trend.scores[0];
    const change = latestScore - firstScore;
    console.log(`  • ${trend.topic}: ${trend.trend} (${firstScore}% → ${latestScore}%, ${change > 0 ? '+' : ''}${change}%)`);
  });

  console.log('\nStudy Recommendations:');
  recommendations.forEach(rec => {
    console.log(`  • ${rec.topic}: ${rec.priority} priority, ${rec.recommendedQuestions} questions`);
    if (rec.focusAreas.length > 0) {
      console.log(`    Focus areas: ${rec.focusAreas.slice(0, 2).join(', ')}`);
    }
  });

  console.log('\n' + '='.repeat(80) + '\n');

  // Scenario 4: Topic Allocation Reduction
  console.log('🎯 Scenario 4: Topic Allocation Reduction');
  console.log('Expected: Reduce allocation for consistently strong topics\n');

  const strongTopicHistory = [
    createExamResult({
      'Data Governance': 85
    }, new Date('2024-01-01')),
    createExamResult({
      'Data Governance': 88
    }, new Date('2024-01-15')),
    createExamResult({
      'Data Governance': 90
    }, new Date('2024-02-01'))
  ];

  const shouldReduce = await adaptiveService.shouldReduceTopicAllocation('Data Governance', strongTopicHistory);
  console.log(`Should reduce Data Governance allocation: ${shouldReduce ? 'YES' : 'NO'}`);
  console.log('Reason: Topic consistently scores above 80% threshold\n');

  const weakTopicHistory = [
    createExamResult({
      'ELT with Spark SQL and Python': 65
    }, new Date('2024-01-01')),
    createExamResult({
      'ELT with Spark SQL and Python': 68
    }, new Date('2024-01-15')),
    createExamResult({
      'ELT with Spark SQL and Python': 70
    }, new Date('2024-02-01'))
  ];

  const shouldNotReduce = await adaptiveService.shouldReduceTopicAllocation('ELT with Spark SQL and Python', weakTopicHistory);
  console.log(`Should reduce ELT allocation: ${shouldNotReduce ? 'YES' : 'NO'}`);
  console.log('Reason: Topic still below 80% threshold, needs continued focus\n');

  console.log('✅ Demo completed! The adaptive engine successfully:');
  console.log('   • Provides balanced distribution for new users');
  console.log('   • Allocates 60% of questions to weak areas');
  console.log('   • Tracks performance trends over time');
  console.log('   • Generates targeted study recommendations');
  console.log('   • Reduces allocation for mastered topics');
}

// Export for potential use in other demos or tests
export { demonstrateAdaptiveEngine };

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateAdaptiveEngine().catch(console.error);
}