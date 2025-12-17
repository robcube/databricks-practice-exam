import { ContentSpecificQuestionService } from '../services/ContentSpecificQuestionService';
import { ExamTopic } from '../../../shared/types';

/**
 * Demonstration of Content-Specific Question Generation
 * 
 * This script shows how to:
 * 1. Generate Production Pipelines questions with Delta Live Tables, job scheduling, and error handling
 * 2. Generate Incremental Data Processing questions with merge operations, CDC, and streaming
 * 3. Validate content coverage for topic-specific question sets
 * 4. Generate questions with difficulty variation for study mode
 */

async function demonstrateContentSpecificQuestionGeneration() {
  console.log('=== Content-Specific Question Generation Demo ===\n');

  const contentService = new ContentSpecificQuestionService();

  try {
    // 1. Generate Production Pipelines questions
    console.log('1. Generating Production Pipelines Questions...');
    const productionQuestions = await contentService.generateProductionPipelineQuestions();
    console.log(`✓ Generated ${productionQuestions.length} Production Pipelines questions`);
    
    // Show sample question
    if (productionQuestions.length > 0) {
      const sampleQuestion = productionQuestions[0];
      console.log(`   Sample: ${sampleQuestion.subtopic} - ${sampleQuestion.questionText.substring(0, 80)}...`);
    }
    console.log();

    // 2. Generate Incremental Data Processing questions
    console.log('2. Generating Incremental Data Processing Questions...');
    const incrementalQuestions = await contentService.generateIncrementalDataProcessingQuestions();
    console.log(`✓ Generated ${incrementalQuestions.length} Incremental Data Processing questions`);
    
    // Show sample question
    if (incrementalQuestions.length > 0) {
      const sampleQuestion = incrementalQuestions[0];
      console.log(`   Sample: ${sampleQuestion.subtopic} - ${sampleQuestion.questionText.substring(0, 80)}...`);
    }
    console.log();

    // 3. Validate content coverage
    console.log('3. Validating Content Coverage...');
    const topics: ExamTopic[] = ['Production Pipelines', 'Incremental Data Processing'];
    
    for (const topic of topics) {
      const coverage = await contentService.validateContentCoverage(topic);
      console.log(`   ${topic}:`);
      console.log(`     Coverage: ${coverage.coveragePercentage.toFixed(1)}%`);
      console.log(`     Required scenarios: ${coverage.requiredScenarios.join(', ')}`);
      
      if (coverage.missingScenarios.length > 0) {
        console.log(`     Missing scenarios: ${coverage.missingScenarios.join(', ')}`);
      } else {
        console.log(`     ✓ All scenarios covered`);
      }
      console.log();
    }

    // 4. Generate questions with difficulty variation
    console.log('4. Generating Questions with Difficulty Variation...');
    const studyQuestions = await contentService.generateQuestionsWithDifficultyVariation(
      'Production Pipelines',
      15, // Total questions
      { easy: 0.4, medium: 0.4, hard: 0.2 } // Custom distribution
    );
    
    console.log(`✓ Generated ${studyQuestions.length} questions for study mode`);
    
    // Show difficulty distribution
    const difficultyCount = studyQuestions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Difficulty distribution:');
    Object.entries(difficultyCount).forEach(([difficulty, count]) => {
      const percentage = ((count / studyQuestions.length) * 100).toFixed(1);
      console.log(`     ${difficulty}: ${count} questions (${percentage}%)`);
    });
    console.log();

    // 5. Get comprehensive coverage report
    console.log('5. Comprehensive Coverage Report...');
    const coverageReport = await contentService.getComprehensiveContentCoverageReport();
    
    console.log('   Overall Coverage Summary:');
    coverageReport.forEach(report => {
      const status = report.isValid ? '✓' : '⚠️';
      console.log(`     ${status} ${report.topic}: ${report.coveragePercentage.toFixed(1)}%`);
    });
    console.log();

    // 6. Initialize complete question bank
    console.log('6. Initializing Complete Content-Specific Question Bank...');
    const initialization = await contentService.initializeContentSpecificQuestions();
    
    console.log(`✓ Initialized question bank:`);
    console.log(`   Production Pipelines: ${initialization.productionPipelineQuestions.length} questions`);
    console.log(`   Incremental Processing: ${initialization.incrementalProcessingQuestions.length} questions`);
    console.log(`   Coverage reports: ${initialization.coverageReport.length} topics analyzed`);

    console.log('\n=== Demo Complete ===');
    console.log('Content-specific question generation successfully demonstrates:');
    console.log('• Production Pipelines scenarios (Delta Live Tables, job scheduling, error handling)');
    console.log('• Incremental Data Processing scenarios (merge operations, CDC, streaming)');
    console.log('• Content coverage validation for topic-specific question sets');
    console.log('• Difficulty variation for study mode');

  } catch (error) {
    console.error('Demo failed:', error);
    throw error;
  }
}

// Example usage for specific scenarios
async function demonstrateSpecificScenarios() {
  console.log('\n=== Specific Scenario Examples ===\n');

  const contentService = new ContentSpecificQuestionService();

  // Example 1: Delta Live Tables scenario
  console.log('Delta Live Tables Scenario Example:');
  console.log('- Streaming data ingestion with @dlt.table decorator');
  console.log('- Data quality constraints with expectations');
  console.log('- Quarantine handling for invalid records');
  console.log();

  // Example 2: Merge Operations scenario
  console.log('Merge Operations Scenario Example:');
  console.log('- MERGE INTO statements for upsert operations');
  console.log('- Handling soft deletes and deduplication');
  console.log('- Complex conditional logic in WHEN clauses');
  console.log();

  // Example 3: Streaming with Watermarking scenario
  console.log('Streaming with Watermarking Scenario Example:');
  console.log('- withWatermark() for late data handling');
  console.log('- Window functions for time-based aggregations');
  console.log('- Exactly-once processing semantics');
  console.log();

  // Example 4: Job Scheduling scenario
  console.log('Job Scheduling Scenario Example:');
  console.log('- Databricks Jobs with cron expressions');
  console.log('- Task dependencies with depends_on configuration');
  console.log('- Retry policies and failure handling');
  console.log();
}

// Run the demonstration
if (require.main === module) {
  demonstrateContentSpecificQuestionGeneration()
    .then(() => demonstrateSpecificScenarios())
    .catch(console.error);
}

export { demonstrateContentSpecificQuestionGeneration, demonstrateSpecificScenarios };