"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSpecificQuestionService = void 0;
const QuestionService_1 = require("./QuestionService");
class ContentSpecificQuestionService {
    constructor() {
        this.questionService = new QuestionService_1.QuestionService();
    }
    /**
     * Generate Production Pipelines questions with required scenarios
     */
    async generateProductionPipelineQuestions() {
        const questions = [
            // Delta Live Tables scenarios
            {
                topic: 'Production Pipelines',
                subtopic: 'Delta Live Tables',
                difficulty: 'medium',
                questionText: 'Which of the following is the correct way to define a Delta Live Table that processes streaming data from a source table?',
                codeExample: `import dlt
from pyspark.sql.functions import *

@dlt.table(
  comment="Raw sensor data from IoT devices",
  table_properties={
    "quality": "bronze"
  }
)
def raw_sensor_data():
  return (
    spark.readStream
      .format("cloudFiles")
      .option("cloudFiles.format", "json")
      .load("/mnt/raw/sensor-data/")
  )`,
                options: [
                    'Use @dlt.table decorator with spark.readStream for streaming sources',
                    'Use @dlt.view decorator with spark.read for batch processing only',
                    'Use @dlt.streaming_table decorator for all streaming operations',
                    'Use regular Spark DataFrame operations without DLT decorators'
                ],
                correctAnswer: 0,
                explanation: 'Delta Live Tables uses the @dlt.table decorator for both batch and streaming tables. The readStream operation automatically creates a streaming table that processes data incrementally.',
                documentationLinks: [
                    'https://docs.databricks.com/delta-live-tables/index.html',
                    'https://docs.databricks.com/delta-live-tables/python-ref.html'
                ],
                tags: ['delta-live-tables', 'streaming', 'production-pipelines']
            },
            {
                topic: 'Production Pipelines',
                subtopic: 'Delta Live Tables',
                difficulty: 'hard',
                questionText: 'In a Delta Live Tables pipeline, how would you implement data quality constraints with quarantine handling for invalid records?',
                codeExample: `@dlt.table(
  comment="Clean customer data with quality constraints"
)
@dlt.expect_or_drop("valid_email", "email IS NOT NULL AND email LIKE '%@%.%'")
@dlt.expect_or_quarantine("valid_age", "age >= 0 AND age <= 120", "quarantine_customers")
def clean_customers():
  return dlt.read("raw_customers")`,
                options: [
                    'Use @dlt.expect_or_drop for critical constraints and @dlt.expect_or_quarantine for less critical ones',
                    'Use only @dlt.expect for all constraints to maintain data integrity',
                    'Use @dlt.expect_all for batch validation of all constraints',
                    'Use manual filtering with .filter() operations instead of DLT expectations'
                ],
                correctAnswer: 0,
                explanation: '@dlt.expect_or_drop removes invalid records completely, while @dlt.expect_or_quarantine moves invalid records to a separate quarantine table for later analysis. This allows for different handling strategies based on constraint criticality.',
                documentationLinks: [
                    'https://docs.databricks.com/delta-live-tables/expectations.html'
                ],
                tags: ['delta-live-tables', 'data-quality', 'quarantine', 'expectations']
            },
            // Job scheduling scenarios
            {
                topic: 'Production Pipelines',
                subtopic: 'Job Scheduling',
                difficulty: 'medium',
                questionText: 'What is the recommended approach for scheduling a Delta Live Tables pipeline to run every 4 hours with proper dependency management?',
                options: [
                    'Create a Databricks Job with a cron schedule "0 */4 * * *" and set the pipeline as a task',
                    'Use Apache Airflow with a custom operator to trigger the pipeline',
                    'Set up a continuous pipeline with a 4-hour trigger interval',
                    'Use a notebook job with time.sleep(14400) in a while loop'
                ],
                correctAnswer: 0,
                explanation: 'Databricks Jobs provide native integration with Delta Live Tables pipelines, allowing proper scheduling with cron expressions, dependency management, and monitoring capabilities.',
                documentationLinks: [
                    'https://docs.databricks.com/jobs/index.html',
                    'https://docs.databricks.com/delta-live-tables/jobs.html'
                ],
                tags: ['job-scheduling', 'cron', 'databricks-jobs', 'pipeline-orchestration']
            },
            {
                topic: 'Production Pipelines',
                subtopic: 'Job Scheduling',
                difficulty: 'hard',
                questionText: 'In a multi-stage data pipeline, how should you configure job dependencies to ensure proper execution order and failure handling?',
                codeExample: `{
  "name": "Multi-Stage Data Pipeline",
  "tasks": [
    {
      "task_key": "bronze_ingestion",
      "pipeline_task": {
        "pipeline_id": "bronze-pipeline-id"
      }
    },
    {
      "task_key": "silver_transformation",
      "depends_on": [{"task_key": "bronze_ingestion"}],
      "pipeline_task": {
        "pipeline_id": "silver-pipeline-id"
      }
    },
    {
      "task_key": "gold_aggregation",
      "depends_on": [{"task_key": "silver_transformation"}],
      "pipeline_task": {
        "pipeline_id": "gold-pipeline-id"
      }
    }
  ]
}`,
                options: [
                    'Use depends_on to create linear dependencies and configure retry policies for each task',
                    'Run all pipelines in parallel to maximize throughput',
                    'Use a single large pipeline instead of multiple smaller ones',
                    'Schedule each pipeline separately with time delays'
                ],
                correctAnswer: 0,
                explanation: 'The depends_on configuration ensures proper execution order, while individual retry policies allow for granular failure handling. This approach provides both reliability and observability.',
                documentationLinks: [
                    'https://docs.databricks.com/jobs/jobs.html#task-dependencies'
                ],
                tags: ['job-dependencies', 'pipeline-orchestration', 'failure-handling']
            },
            // Error handling scenarios
            {
                topic: 'Production Pipelines',
                subtopic: 'Error Handling',
                difficulty: 'medium',
                questionText: 'What is the best practice for handling schema evolution errors in a production Delta Live Tables pipeline?',
                options: [
                    'Configure schema evolution mode and implement schema validation with expectations',
                    'Disable schema enforcement to allow any schema changes',
                    'Manually update the schema before each pipeline run',
                    'Use try-catch blocks around all read operations'
                ],
                correctAnswer: 0,
                explanation: 'Schema evolution mode allows controlled schema changes while expectations provide validation. This combination ensures data quality while accommodating necessary schema updates.',
                documentationLinks: [
                    'https://docs.databricks.com/delta-live-tables/schema-evolution.html'
                ],
                tags: ['error-handling', 'schema-evolution', 'data-quality']
            },
            {
                topic: 'Production Pipelines',
                subtopic: 'Error Handling',
                difficulty: 'hard',
                questionText: 'How should you implement comprehensive error handling and alerting for a production pipeline that processes critical business data?',
                codeExample: `@dlt.table
def critical_business_metrics():
  try:
    df = dlt.read("source_data")
    # Validation logic
    if df.count() == 0:
      raise ValueError("No data received from source")
    return df.transform(business_logic)
  except Exception as e:
    # Error handling strategy?
    pass`,
                options: [
                    'Use DLT expectations for data validation, configure job-level alerts, and implement dead letter queues',
                    'Use try-catch blocks with print statements for debugging',
                    'Rely on Spark\'s built-in error handling mechanisms only',
                    'Implement custom logging without structured error handling'
                ],
                correctAnswer: 0,
                explanation: 'Production pipelines require multiple layers of error handling: DLT expectations for data quality, job-level alerts for operational issues, and dead letter queues for failed records that need manual review.',
                documentationLinks: [
                    'https://docs.databricks.com/jobs/job-notifications.html',
                    'https://docs.databricks.com/delta-live-tables/observability.html'
                ],
                tags: ['error-handling', 'alerting', 'dead-letter-queue', 'monitoring']
            }
        ];
        const createdQuestions = [];
        for (const questionData of questions) {
            try {
                const question = await this.questionService.createQuestion(questionData);
                if (question) {
                    createdQuestions.push(question);
                }
            }
            catch (error) {
                console.error(`Failed to create Production Pipelines question: ${error}`);
            }
        }
        return createdQuestions;
    }
    /**
     * Generate Incremental Data Processing questions with required scenarios
     */
    async generateIncrementalDataProcessingQuestions() {
        const questions = [
            // Merge operations scenarios
            {
                topic: 'Incremental Data Processing',
                subtopic: 'Merge Operations',
                difficulty: 'medium',
                questionText: 'Which SQL command is used to perform upsert operations (insert new records and update existing ones) in Delta Lake?',
                codeExample: `MERGE INTO target_table t
USING source_table s
ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET t.value = s.value, t.updated_at = current_timestamp()
WHEN NOT MATCHED THEN
  INSERT (id, value, created_at, updated_at)
  VALUES (s.id, s.value, current_timestamp(), current_timestamp())`,
                options: [
                    'MERGE INTO with WHEN MATCHED and WHEN NOT MATCHED clauses',
                    'INSERT OVERWRITE with WHERE conditions',
                    'UPDATE and INSERT statements in a transaction',
                    'REPLACE TABLE with conditional logic'
                ],
                correctAnswer: 0,
                explanation: 'The MERGE INTO statement is specifically designed for upsert operations in Delta Lake, providing atomic updates and inserts based on matching conditions.',
                documentationLinks: [
                    'https://docs.databricks.com/delta/merge.html'
                ],
                tags: ['merge-operations', 'upsert', 'delta-lake', 'incremental-processing']
            },
            {
                topic: 'Incremental Data Processing',
                subtopic: 'Merge Operations',
                difficulty: 'hard',
                questionText: 'In a complex merge operation with multiple conditions, how would you handle soft deletes and data deduplication?',
                codeExample: `MERGE INTO customer_table t
USING (
  SELECT id, name, email, is_deleted, row_number() OVER (PARTITION BY id ORDER BY updated_at DESC) as rn
  FROM source_updates
) s
ON t.id = s.id AND s.rn = 1
WHEN MATCHED AND s.is_deleted = true THEN
  UPDATE SET t.is_active = false, t.deleted_at = current_timestamp()
WHEN MATCHED AND s.is_deleted = false THEN
  UPDATE SET t.name = s.name, t.email = s.email, t.updated_at = current_timestamp()
WHEN NOT MATCHED AND s.is_deleted = false THEN
  INSERT (id, name, email, is_active, created_at, updated_at)
  VALUES (s.id, s.name, s.email, true, current_timestamp(), current_timestamp())`,
                options: [
                    'Use window functions for deduplication and conditional WHEN clauses for soft deletes',
                    'Perform separate DELETE and INSERT operations',
                    'Use REPLACE TABLE with complex WHERE conditions',
                    'Handle deduplication in application code before the merge'
                ],
                correctAnswer: 0,
                explanation: 'Window functions (like row_number()) handle deduplication in the source, while multiple WHEN clauses in MERGE allow for different handling of soft deletes vs. updates.',
                documentationLinks: [
                    'https://docs.databricks.com/delta/merge.html#merge-examples'
                ],
                tags: ['merge-operations', 'soft-deletes', 'deduplication', 'window-functions']
            },
            // Change Data Capture (CDC) scenarios
            {
                topic: 'Incremental Data Processing',
                subtopic: 'Change Data Capture',
                difficulty: 'medium',
                questionText: 'What is the recommended approach for processing CDC data from a source system into a Delta Lake table?',
                options: [
                    'Use MERGE operations with CDC operation types (INSERT, UPDATE, DELETE) to apply changes incrementally',
                    'Truncate and reload the entire table for each CDC batch',
                    'Use INSERT OVERWRITE with partition replacement',
                    'Process CDC data as append-only and handle deduplication in queries'
                ],
                correctAnswer: 0,
                explanation: 'CDC data typically includes operation types (I/U/D). Using MERGE with conditional logic based on these operation types ensures efficient incremental processing.',
                documentationLinks: [
                    'https://docs.databricks.com/delta/delta-change-data-feed.html'
                ],
                tags: ['change-data-capture', 'cdc', 'incremental-processing', 'merge-operations']
            },
            {
                topic: 'Incremental Data Processing',
                subtopic: 'Change Data Capture',
                difficulty: 'hard',
                questionText: 'How would you implement a CDC pipeline that handles out-of-order events and ensures data consistency?',
                codeExample: `-- CDC source with sequence numbers and timestamps
CREATE OR REPLACE TEMPORARY VIEW cdc_with_sequence AS
SELECT *,
  row_number() OVER (PARTITION BY id ORDER BY sequence_number DESC, event_timestamp DESC) as rn
FROM cdc_source
WHERE event_timestamp > (SELECT max(last_processed_timestamp) FROM checkpoint_table);

MERGE INTO target_table t
USING (SELECT * FROM cdc_with_sequence WHERE rn = 1) s
ON t.id = s.id
WHEN MATCHED AND s.operation = 'D' THEN DELETE
WHEN MATCHED AND s.operation IN ('U', 'I') THEN
  UPDATE SET t.* = s.*, t.last_updated = current_timestamp()
WHEN NOT MATCHED AND s.operation IN ('I', 'U') THEN
  INSERT *`,
                options: [
                    'Use sequence numbers and timestamps with window functions to handle ordering, plus checkpointing for consistency',
                    'Process events in the order they arrive without reordering',
                    'Use event timestamps only without sequence numbers',
                    'Implement custom sorting logic in the application layer'
                ],
                correctAnswer: 0,
                explanation: 'Sequence numbers provide ordering guarantees, timestamps handle late arrivals, window functions ensure latest state, and checkpointing prevents reprocessing.',
                documentationLinks: [
                    'https://docs.databricks.com/structured-streaming/exactly-once.html'
                ],
                tags: ['cdc', 'out-of-order-events', 'sequence-numbers', 'checkpointing']
            },
            // Streaming scenarios
            {
                topic: 'Incremental Data Processing',
                subtopic: 'Streaming',
                difficulty: 'medium',
                questionText: 'What is the correct way to implement exactly-once processing semantics in a Databricks streaming job?',
                options: [
                    'Use checkpointing with idempotent operations and structured streaming\'s built-in guarantees',
                    'Implement manual deduplication logic in the streaming query',
                    'Use at-least-once processing and handle duplicates downstream',
                    'Disable checkpointing to avoid state management complexity'
                ],
                correctAnswer: 0,
                explanation: 'Structured Streaming provides exactly-once semantics through checkpointing and idempotent sinks. Delta Lake tables are idempotent, making this combination reliable.',
                documentationLinks: [
                    'https://docs.databricks.com/structured-streaming/exactly-once.html'
                ],
                tags: ['streaming', 'exactly-once', 'checkpointing', 'structured-streaming']
            },
            {
                topic: 'Incremental Data Processing',
                subtopic: 'Streaming',
                difficulty: 'hard',
                questionText: 'How would you implement a streaming aggregation with late data handling and watermarking?',
                codeExample: `df = (spark
  .readStream
  .format("delta")
  .table("events")
  .withWatermark("event_time", "10 minutes")
  .groupBy(
    window(col("event_time"), "5 minutes"),
    col("user_id")
  )
  .agg(
    count("*").alias("event_count"),
    sum("amount").alias("total_amount")
  )
)`,
                options: [
                    'Use withWatermark() to handle late data and window functions for time-based aggregations',
                    'Process all data without watermarking to ensure no data loss',
                    'Use batch processing with scheduled intervals instead of streaming',
                    'Implement custom late data handling without watermarks'
                ],
                correctAnswer: 0,
                explanation: 'Watermarking allows the system to drop late data beyond a threshold, enabling efficient streaming aggregations while handling reasonable delays.',
                documentationLinks: [
                    'https://docs.databricks.com/structured-streaming/watermarking.html'
                ],
                tags: ['streaming', 'watermarking', 'late-data', 'aggregations', 'windowing']
            }
        ];
        const createdQuestions = [];
        for (const questionData of questions) {
            try {
                const question = await this.questionService.createQuestion(questionData);
                if (question) {
                    createdQuestions.push(question);
                }
            }
            catch (error) {
                console.error(`Failed to create Incremental Data Processing question: ${error}`);
            }
        }
        return createdQuestions;
    }
    /**
     * Validate content coverage for topic-specific question sets
     */
    async validateContentCoverage(topic) {
        const questions = await this.questionService.getQuestionsByTopic(topic);
        let requiredScenarios = [];
        let missingScenarios = [];
        if (topic === 'Production Pipelines') {
            requiredScenarios = [
                'Delta Live Tables',
                'Job Scheduling',
                'Error Handling',
                'Pipeline Orchestration',
                'Data Quality Expectations'
            ];
            const hasDeltaliveTables = questions.some(q => q.subtopic.toLowerCase().includes('delta live tables') ||
                q.questionText.toLowerCase().includes('delta live tables') ||
                q.codeExample?.toLowerCase().includes('dlt') ||
                q.tags.includes('delta-live-tables'));
            const hasJobScheduling = questions.some(q => q.subtopic.toLowerCase().includes('job scheduling') ||
                q.questionText.toLowerCase().includes('job') && q.questionText.toLowerCase().includes('schedul') ||
                q.tags.includes('job-scheduling'));
            const hasErrorHandling = questions.some(q => q.subtopic.toLowerCase().includes('error handling') ||
                q.questionText.toLowerCase().includes('error') ||
                q.tags.includes('error-handling'));
            const hasPipelineOrchestration = questions.some(q => q.questionText.toLowerCase().includes('pipeline') ||
                q.tags.includes('pipeline-orchestration'));
            const hasDataQuality = questions.some(q => q.questionText.toLowerCase().includes('expectation') ||
                q.questionText.toLowerCase().includes('quality') ||
                q.tags.includes('data-quality'));
            if (!hasDeltaliveTables)
                missingScenarios.push('Delta Live Tables');
            if (!hasJobScheduling)
                missingScenarios.push('Job Scheduling');
            if (!hasErrorHandling)
                missingScenarios.push('Error Handling');
            if (!hasPipelineOrchestration)
                missingScenarios.push('Pipeline Orchestration');
            if (!hasDataQuality)
                missingScenarios.push('Data Quality Expectations');
        }
        else if (topic === 'Incremental Data Processing') {
            requiredScenarios = [
                'Merge Operations',
                'Change Data Capture',
                'Streaming Processing',
                'Watermarking',
                'Exactly-Once Semantics'
            ];
            const hasMergeOperations = questions.some(q => q.subtopic.toLowerCase().includes('merge') ||
                q.questionText.toLowerCase().includes('merge') ||
                q.codeExample?.toLowerCase().includes('merge') ||
                q.tags.includes('merge-operations'));
            const hasCDC = questions.some(q => q.subtopic.toLowerCase().includes('change data capture') ||
                q.questionText.toLowerCase().includes('cdc') ||
                q.questionText.toLowerCase().includes('change data capture') ||
                q.tags.includes('cdc') ||
                q.tags.includes('change-data-capture'));
            const hasStreaming = questions.some(q => q.subtopic.toLowerCase().includes('streaming') ||
                q.questionText.toLowerCase().includes('stream') ||
                q.codeExample?.toLowerCase().includes('readstream') ||
                q.tags.includes('streaming'));
            const hasWatermarking = questions.some(q => q.questionText.toLowerCase().includes('watermark') ||
                q.codeExample?.toLowerCase().includes('watermark') ||
                q.tags.includes('watermarking'));
            const hasExactlyOnce = questions.some(q => q.questionText.toLowerCase().includes('exactly-once') ||
                q.questionText.toLowerCase().includes('exactly once') ||
                q.tags.includes('exactly-once'));
            if (!hasMergeOperations)
                missingScenarios.push('Merge Operations');
            if (!hasCDC)
                missingScenarios.push('Change Data Capture');
            if (!hasStreaming)
                missingScenarios.push('Streaming Processing');
            if (!hasWatermarking)
                missingScenarios.push('Watermarking');
            if (!hasExactlyOnce)
                missingScenarios.push('Exactly-Once Semantics');
        }
        const coveragePercentage = ((requiredScenarios.length - missingScenarios.length) / requiredScenarios.length) * 100;
        return {
            topic,
            requiredScenarios,
            missingScenarios,
            coveragePercentage,
            isValid: missingScenarios.length === 0
        };
    }
    /**
     * Generate questions with difficulty variation for study mode
     */
    async generateQuestionsWithDifficultyVariation(topic, totalQuestions, distribution) {
        // Default distribution: 30% easy, 50% medium, 20% hard
        const defaultDistribution = {
            easy: 0.3,
            medium: 0.5,
            hard: 0.2
        };
        const finalDistribution = distribution || defaultDistribution;
        const easyCount = Math.floor(totalQuestions * finalDistribution.easy);
        const mediumCount = Math.floor(totalQuestions * finalDistribution.medium);
        const hardCount = totalQuestions - easyCount - mediumCount; // Remaining questions
        const [easyQuestions, mediumQuestions, hardQuestions] = await Promise.all([
            this.questionService.searchQuestions({ topic, difficulty: 'easy' }, 1, easyCount * 2),
            this.questionService.searchQuestions({ topic, difficulty: 'medium' }, 1, mediumCount * 2),
            this.questionService.searchQuestions({ topic, difficulty: 'hard' }, 1, hardCount * 2)
        ]);
        // Shuffle and select required number from each difficulty
        const selectedQuestions = [
            ...this.shuffleArray(easyQuestions.questions).slice(0, easyCount),
            ...this.shuffleArray(mediumQuestions.questions).slice(0, mediumCount),
            ...this.shuffleArray(hardQuestions.questions).slice(0, hardCount)
        ];
        // Final shuffle of all selected questions
        return this.shuffleArray(selectedQuestions);
    }
    /**
     * Get comprehensive content coverage report for all topics
     */
    async getComprehensiveContentCoverageReport() {
        const topics = ['Production Pipelines', 'Incremental Data Processing'];
        const coverageReports = await Promise.all(topics.map(topic => this.validateContentCoverage(topic)));
        return coverageReports;
    }
    /**
     * Initialize question bank with content-specific questions
     */
    async initializeContentSpecificQuestions() {
        const [productionPipelineQuestions, incrementalProcessingQuestions] = await Promise.all([
            this.generateProductionPipelineQuestions(),
            this.generateIncrementalDataProcessingQuestions()
        ]);
        const coverageReport = await this.getComprehensiveContentCoverageReport();
        return {
            productionPipelineQuestions,
            incrementalProcessingQuestions,
            coverageReport
        };
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
exports.ContentSpecificQuestionService = ContentSpecificQuestionService;
//# sourceMappingURL=ContentSpecificQuestionService.js.map