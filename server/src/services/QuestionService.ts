import { Question, ExamTopic, QuestionDifficulty, ExamType } from '../../../shared/types';
import { QuestionRepository, QuestionSearchFilters, QuestionSearchOptions } from '../repositories/QuestionRepository';
import { validateQuestion } from '../models/Question';

export interface QuestionCreateRequest {
  topic: ExamTopic;
  subtopic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  codeExample?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  documentationLinks?: string[];
  tags?: string[];
}

export interface QuestionUpdateRequest {
  topic?: ExamTopic;
  subtopic?: string;
  difficulty?: QuestionDifficulty;
  questionText?: string;
  codeExample?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  documentationLinks?: string[];
  tags?: string[];
}

export interface QuestionSearchResult {
  questions: Question[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class QuestionService {
  private questionRepository: QuestionRepository;

  constructor() {
    this.questionRepository = new QuestionRepository();
  }

  async createQuestion(questionData: QuestionCreateRequest): Promise<Question> {
    // Validate question data
    const validationErrors = validateQuestion(questionData);
    if (validationErrors.length > 0) {
      throw new Error(`Question validation failed: ${validationErrors.join(', ')}`);
    }

    // Ensure required fields for Production Pipelines and Incremental Data Processing
    this.validateTopicSpecificRequirements(questionData);

    return await this.questionRepository.create(questionData);
  }

  async getQuestionById(id: string): Promise<Question | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Question ID is required and must be a string');
    }

    return await this.questionRepository.findById(id);
  }

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('Question IDs array is required and must not be empty');
    }

    // Validate all IDs are strings
    if (!ids.every(id => typeof id === 'string' && id.trim().length > 0)) {
      throw new Error('All question IDs must be non-empty strings');
    }

    return await this.questionRepository.findByIds(ids);
  }

  async updateQuestion(id: string, updateData: QuestionUpdateRequest): Promise<Question | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Question ID is required and must be a string');
    }

    // If updating validation-critical fields, validate the complete updated question
    if (this.hasValidationCriticalFields(updateData)) {
      const existingQuestion = await this.questionRepository.findById(id);
      if (!existingQuestion) {
        return null;
      }

      const updatedQuestionData = { ...existingQuestion, ...updateData };
      const validationErrors = validateQuestion(updatedQuestionData);
      if (validationErrors.length > 0) {
        throw new Error(`Question validation failed: ${validationErrors.join(', ')}`);
      }

      this.validateTopicSpecificRequirements(updatedQuestionData);
    }

    return await this.questionRepository.update(id, updateData);
  }

  async deleteQuestion(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      throw new Error('Question ID is required and must be a string');
    }

    return await this.questionRepository.delete(id);
  }

  async searchQuestions(
    filters?: QuestionSearchFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<QuestionSearchResult> {
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (pageSize < 1 || pageSize > 100) {
      throw new Error('Page size must be between 1 and 100');
    }

    const offset = (page - 1) * pageSize;
    const options: QuestionSearchOptions = {
      limit: pageSize,
      offset: offset,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };

    const [questions, total] = await Promise.all([
      this.questionRepository.findAll(filters, options),
      this.questionRepository.count(filters)
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      questions,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async getQuestionsByTopic(topic: ExamTopic, limit?: number): Promise<Question[]> {
    return await this.questionRepository.findByTopic(topic, limit);
  }

  async getQuestionsByDifficulty(difficulty: QuestionDifficulty, limit?: number): Promise<Question[]> {
    return await this.questionRepository.findByDifficulty(difficulty, limit);
  }

  async getQuestionsWithCodeExamples(limit?: number): Promise<Question[]> {
    return await this.questionRepository.findWithCodeExamples(limit);
  }

  async getQuestionsByTags(tags: string[], limit?: number): Promise<Question[]> {
    if (!tags || tags.length === 0) {
      throw new Error('At least one tag is required');
    }
    return await this.questionRepository.findByTags(tags, limit);
  }

  async getQuestionsForExam(examType: ExamType, questionCount: number = 50): Promise<Question[]> {
    try {
      // For now, get a balanced selection of questions across all topics
      // This could be enhanced with adaptive selection based on user performance
      const questionsPerTopic = Math.floor(questionCount / 5); // 5 topics
      const remainingQuestions = questionCount % 5;

      const topics: ExamTopic[] = [
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python',
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
      ];

      const selectedQuestions: Question[] = [];

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const topicQuestionCount = questionsPerTopic + (i < remainingQuestions ? 1 : 0);
        
        const topicQuestions = await this.getQuestionsByTopic(topic, topicQuestionCount * 2); // Get more than needed for randomization
        
        // Shuffle and take the required number
        const shuffled = this.shuffleArray([...topicQuestions]);
        selectedQuestions.push(...shuffled.slice(0, topicQuestionCount));
      }

      // Final shuffle of all selected questions
      return this.shuffleArray(selectedQuestions);
    } catch (error) {
      console.warn('Database not available, using mock questions for exam');
      // Return mock questions when database is not available
      return this.getMockQuestionsForExam(questionCount);
    }
  }

  async getTopicStatistics(): Promise<{ [topic: string]: { total: number; byDifficulty: { [difficulty: string]: number } } }> {
    const allQuestions = await this.questionRepository.findAll();
    
    const stats: { [topic: string]: { total: number; byDifficulty: { [difficulty: string]: number } } } = {};
    
    allQuestions.forEach(question => {
      if (!stats[question.topic]) {
        stats[question.topic] = {
          total: 0,
          byDifficulty: { easy: 0, medium: 0, hard: 0 }
        };
      }
      
      stats[question.topic].total++;
      stats[question.topic].byDifficulty[question.difficulty]++;
    });
    
    return stats;
  }

  async validateQuestionBank(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check if we have questions for all topics
    const requiredTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];

    for (const topic of requiredTopics) {
      const topicQuestions = await this.getQuestionsByTopic(topic);
      if (topicQuestions.length === 0) {
        issues.push(`No questions found for topic: ${topic}`);
      } else if (topicQuestions.length < 5) {
        issues.push(`Insufficient questions for topic: ${topic} (${topicQuestions.length} found, minimum 5 recommended)`);
      }
    }

    // Check for Production Pipelines specific content
    const productionPipelineQuestions = await this.getQuestionsByTopic('Production Pipelines');
    const hasDeltaliveTables = productionPipelineQuestions.some(q => 
      q.questionText.toLowerCase().includes('delta live tables') || 
      q.codeExample?.toLowerCase().includes('delta live tables')
    );
    const hasJobScheduling = productionPipelineQuestions.some(q => 
      q.questionText.toLowerCase().includes('job') && q.questionText.toLowerCase().includes('schedul')
    );
    const hasErrorHandling = productionPipelineQuestions.some(q => 
      q.questionText.toLowerCase().includes('error') || 
      q.questionText.toLowerCase().includes('exception')
    );

    if (!hasDeltaliveTables) {
      issues.push('Production Pipelines topic missing Delta Live Tables scenarios');
    }
    if (!hasJobScheduling) {
      issues.push('Production Pipelines topic missing job scheduling scenarios');
    }
    if (!hasErrorHandling) {
      issues.push('Production Pipelines topic missing error handling scenarios');
    }

    // Check for Incremental Data Processing specific content
    const incrementalQuestions = await this.getQuestionsByTopic('Incremental Data Processing');
    const hasMergeOperations = incrementalQuestions.some(q => 
      q.questionText.toLowerCase().includes('merge') || 
      q.codeExample?.toLowerCase().includes('merge')
    );
    const hasCDC = incrementalQuestions.some(q => 
      q.questionText.toLowerCase().includes('change data capture') || 
      q.questionText.toLowerCase().includes('cdc')
    );
    const hasStreaming = incrementalQuestions.some(q => 
      q.questionText.toLowerCase().includes('stream') || 
      q.codeExample?.toLowerCase().includes('stream')
    );

    if (!hasMergeOperations) {
      issues.push('Incremental Data Processing topic missing merge operations scenarios');
    }
    if (!hasCDC) {
      issues.push('Incremental Data Processing topic missing change data capture scenarios');
    }
    if (!hasStreaming) {
      issues.push('Incremental Data Processing topic missing streaming scenarios');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private validateTopicSpecificRequirements(questionData: Partial<Question>): void {
    // Validate Production Pipelines questions have appropriate content
    if (questionData.topic === 'Production Pipelines') {
      const hasRelevantContent = 
        questionData.questionText?.toLowerCase().includes('delta live tables') ||
        questionData.questionText?.toLowerCase().includes('job') ||
        questionData.questionText?.toLowerCase().includes('pipeline') ||
        questionData.questionText?.toLowerCase().includes('error') ||
        questionData.codeExample?.toLowerCase().includes('dlt') ||
        questionData.codeExample?.toLowerCase().includes('pipeline');

      if (!hasRelevantContent) {
        throw new Error('Production Pipelines questions must include relevant scenarios (Delta Live Tables, job scheduling, error handling)');
      }
    }

    // Validate Incremental Data Processing questions have appropriate content
    if (questionData.topic === 'Incremental Data Processing') {
      const hasRelevantContent = 
        questionData.questionText?.toLowerCase().includes('merge') ||
        questionData.questionText?.toLowerCase().includes('incremental') ||
        questionData.questionText?.toLowerCase().includes('stream') ||
        questionData.questionText?.toLowerCase().includes('cdc') ||
        questionData.questionText?.toLowerCase().includes('change data capture') ||
        questionData.codeExample?.toLowerCase().includes('merge') ||
        questionData.codeExample?.toLowerCase().includes('stream');

      if (!hasRelevantContent) {
        throw new Error('Incremental Data Processing questions must include relevant scenarios (merge operations, CDC, streaming)');
      }
    }
  }

  private hasValidationCriticalFields(updateData: QuestionUpdateRequest): boolean {
    const criticalFields = ['questionText', 'options', 'correctAnswer', 'explanation', 'topic', 'difficulty'];
    return criticalFields.some(field => field in updateData);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getMockQuestionsForExam(questionCount: number): Question[] {
    const allQuestions: Question[] = [
      // Databricks Lakehouse Platform Questions
      {
        id: 'q_dlp_001',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Architecture Overview',
        difficulty: 'easy',
        questionText: 'What is the primary storage format used by Delta Lake in the Databricks Lakehouse Platform?',
        options: ['Parquet files with transaction logs', 'JSON files with metadata', 'Avro files with schemas', 'ORC files with indexes'],
        correctAnswer: 0,
        explanation: 'Delta Lake uses Parquet files for data storage combined with transaction logs for ACID transactions. This provides the performance benefits of Parquet with the reliability of traditional databases.',
        documentationLinks: ['https://docs.databricks.com/delta/index.html'],
        tags: ['delta-lake', 'parquet', 'architecture'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_002',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Compute Resources',
        difficulty: 'medium',
        questionText: 'Which cluster mode is most appropriate for interactive data exploration and ad-hoc analysis?',
        options: ['All-purpose clusters', 'Job clusters', 'SQL warehouses', 'Instance pools'],
        correctAnswer: 0,
        explanation: 'All-purpose clusters are designed for interactive workloads, data exploration, and development. They remain active until manually terminated and support multiple users and notebooks.',
        documentationLinks: ['https://docs.databricks.com/clusters/index.html'],
        tags: ['clusters', 'compute', 'interactive'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_003',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Unity Catalog',
        difficulty: 'hard',
        questionText: 'In Unity Catalog, what is the correct hierarchy for organizing data assets?',
        options: ['Metastore > Catalog > Schema > Table', 'Workspace > Catalog > Database > Table', 'Catalog > Database > Schema > Table', 'Metastore > Database > Schema > Table'],
        correctAnswer: 0,
        explanation: 'Unity Catalog uses a three-level namespace: Metastore (top level) > Catalog > Schema > Table/View. This provides fine-grained access control and data governance across workspaces.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/index.html'],
        tags: ['unity-catalog', 'governance', 'hierarchy'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_004',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Workspace Management',
        difficulty: 'easy',
        questionText: 'What is the primary purpose of Databricks Repos?',
        options: ['Version control integration for notebooks and code', 'Data storage and management', 'Cluster configuration management', 'User access control'],
        correctAnswer: 0,
        explanation: 'Databricks Repos provides Git integration for version control of notebooks, Python files, and other code assets, enabling collaborative development and CI/CD workflows.',
        documentationLinks: ['https://docs.databricks.com/repos/index.html'],
        tags: ['repos', 'version-control', 'git'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_005',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Cluster Configuration',
        difficulty: 'medium',
        questionText: 'Which cluster configuration is most cost-effective for scheduled batch jobs?',
        options: ['Job clusters with auto-termination', 'All-purpose clusters', 'High-concurrency clusters', 'Single-node clusters'],
        correctAnswer: 0,
        explanation: 'Job clusters are created for specific jobs and automatically terminate when the job completes, making them the most cost-effective option for scheduled batch processing.',
        documentationLinks: ['https://docs.databricks.com/clusters/configure.html'],
        tags: ['clusters', 'job-clusters', 'cost-optimization'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_006',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'DBFS',
        difficulty: 'medium',
        questionText: 'What is the recommended approach for accessing files in DBFS from Spark?',
        options: ['Use dbfs:/ prefix in file paths', 'Mount external storage first', 'Use /dbfs/ prefix in file paths', 'Access files directly without prefix'],
        correctAnswer: 0,
        explanation: 'When accessing DBFS from Spark APIs, use the dbfs:/ prefix. The /dbfs/ prefix is used for local file system access from driver nodes, not for Spark operations.',
        documentationLinks: ['https://docs.databricks.com/dbfs/index.html'],
        tags: ['dbfs', 'file-access', 'spark'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_007',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Delta Lake Features',
        difficulty: 'hard',
        questionText: 'What is the purpose of the _delta_log directory in a Delta table?',
        options: ['Stores transaction logs and metadata for ACID compliance', 'Contains backup copies of data files', 'Stores query execution plans', 'Contains user access logs'],
        correctAnswer: 0,
        explanation: 'The _delta_log directory contains JSON files that record every transaction made to the Delta table, enabling ACID properties, time travel, and metadata management.',
        documentationLinks: ['https://docs.databricks.com/delta/delta-intro.html'],
        tags: ['delta-lake', 'transaction-log', 'acid'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_008',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Cluster Policies',
        difficulty: 'medium',
        questionText: 'What is the primary purpose of cluster policies in Databricks?',
        options: ['Enforce governance and cost controls on cluster creation', 'Improve cluster performance', 'Enable cluster sharing', 'Automate cluster scaling'],
        correctAnswer: 0,
        explanation: 'Cluster policies allow administrators to enforce governance rules, cost controls, and security requirements when users create clusters, ensuring compliance with organizational standards.',
        documentationLinks: ['https://docs.databricks.com/administration-guide/clusters/policies.html'],
        tags: ['cluster-policies', 'governance', 'cost-control'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_009',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Secrets Management',
        difficulty: 'medium',
        questionText: 'What is the recommended way to store database passwords in Databricks?',
        options: ['Use Databricks Secrets with secret scopes', 'Store in notebook variables', 'Include in cluster configuration', 'Use environment variables'],
        correctAnswer: 0,
        explanation: 'Databricks Secrets provide secure storage for sensitive information like passwords and API keys, with secret scopes controlling access to different sets of secrets.',
        documentationLinks: ['https://docs.databricks.com/security/secrets/index.html'],
        tags: ['secrets', 'security', 'credentials'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_010',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Photon Engine',
        difficulty: 'medium',
        questionText: 'What type of workloads benefit most from Photon acceleration?',
        options: ['SQL queries and DataFrame operations', 'Machine learning training', 'Graph processing', 'Stream processing only'],
        correctAnswer: 0,
        explanation: 'Photon is optimized for SQL queries and DataFrame operations, providing significant performance improvements for analytical workloads and ETL processes.',
        documentationLinks: ['https://docs.databricks.com/compute/photon.html'],
        tags: ['photon', 'performance', 'sql-acceleration'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ELT with Spark SQL and Python Questions
      {
        id: 'q_elt_001',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'DataFrame Operations',
        difficulty: 'easy',
        questionText: 'Which method is used to remove duplicate rows from a DataFrame in PySpark?',
        codeExample: 'df = spark.table("source_table")\nresult = df._____()',
        options: ['distinct()', 'dropDuplicates()', 'unique()', 'deduplicate()'],
        correctAnswer: 1,
        explanation: 'The dropDuplicates() method removes duplicate rows from a DataFrame. The distinct() method also removes duplicates but dropDuplicates() allows specifying specific columns for deduplication.',
        documentationLinks: ['https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.dropDuplicates.html'],
        tags: ['pyspark', 'dataframe', 'deduplication'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_002',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'SQL Functions',
        difficulty: 'medium',
        questionText: 'What is the correct way to parse a JSON string column into individual columns using Spark SQL?',
        codeExample: 'SELECT customer_id, json_data FROM orders',
        options: ['json_extract(json_data, \'$.name\')', 'get_json_object(json_data, \'$.name\')', 'parse_json(json_data).name', 'json_data.name'],
        correctAnswer: 1,
        explanation: 'The get_json_object() function is the standard Spark SQL function for extracting values from JSON strings. It takes the JSON column and a JSONPath expression.',
        documentationLinks: ['https://spark.apache.org/docs/latest/api/sql/index.html#get_json_object'],
        tags: ['spark-sql', 'json', 'parsing'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_003',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Window Functions',
        difficulty: 'hard',
        questionText: 'Which window function would you use to assign a unique sequential number to rows within each partition?',
        codeExample: 'SELECT *, _____ OVER (PARTITION BY department ORDER BY salary DESC) as rank_num FROM employees',
        options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'NTILE()'],
        correctAnswer: 0,
        explanation: 'ROW_NUMBER() assigns unique sequential integers starting from 1 within each partition. Unlike RANK() and DENSE_RANK(), it never produces ties.',
        documentationLinks: ['https://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#window-functions'],
        tags: ['window-functions', 'ranking', 'spark-sql'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_004',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Data Types',
        difficulty: 'easy',
        questionText: 'Which Spark SQL data type should be used for storing JSON data?',
        options: ['STRING', 'BINARY', 'STRUCT', 'MAP'],
        correctAnswer: 0,
        explanation: 'JSON data should be stored as STRING type in Spark SQL. You can then use JSON functions like get_json_object() or from_json() to parse and extract values.',
        documentationLinks: ['https://spark.apache.org/docs/latest/sql-ref-datatypes.html'],
        tags: ['data-types', 'json', 'spark-sql'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_005',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'DataFrame Transformations',
        difficulty: 'medium',
        questionText: 'Which method creates a new DataFrame with additional columns based on existing columns?',
        codeExample: 'df._____(col("price") * col("quantity").alias("total"))',
        options: ['withColumn()', 'select()', 'transform()', 'mutate()'],
        correctAnswer: 1,
        explanation: 'The select() method creates a new DataFrame with specified columns, including computed columns. withColumn() adds a single column, while select() can add multiple columns at once.',
        documentationLinks: ['https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.select.html'],
        tags: ['dataframe', 'transformations', 'pyspark'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_006',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Aggregations',
        difficulty: 'medium',
        questionText: 'What is the correct way to perform aggregations on multiple columns in PySpark?',
        options: ['df.groupBy("category").agg(sum("amount"), avg("price"))', 'df.groupBy("category").sum("amount").avg("price")', 'df.aggregate("category", sum("amount"), avg("price"))', 'df.groupBy("category").apply(sum("amount"), avg("price"))'],
        correctAnswer: 0,
        explanation: 'The agg() method allows multiple aggregation functions to be applied in a single operation after groupBy(), making it more efficient than chaining individual aggregation methods.',
        documentationLinks: ['https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.agg.html'],
        tags: ['aggregations', 'groupby', 'pyspark'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_007',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Joins',
        difficulty: 'hard',
        questionText: 'Which join type should be used when you want to keep all records from the left DataFrame even if there is no match in the right DataFrame?',
        codeExample: 'df1.join(df2, df1.id == df2.id, "____")',
        options: ['left', 'right', 'inner', 'full'],
        correctAnswer: 0,
        explanation: 'A left join (or left outer join) keeps all records from the left DataFrame and includes matching records from the right DataFrame. Non-matching records from the right will have null values.',
        documentationLinks: ['https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html'],
        tags: ['joins', 'left-join', 'spark-sql'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_008',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Performance Optimization',
        difficulty: 'hard',
        questionText: 'What is the purpose of broadcast joins in Spark?',
        options: ['Optimize joins with small tables by broadcasting to all nodes', 'Enable cross-cluster joins', 'Improve write performance', 'Enable real-time streaming joins'],
        correctAnswer: 0,
        explanation: 'Broadcast joins optimize performance by broadcasting small tables to all executor nodes, eliminating the need for shuffling large datasets during join operations.',
        documentationLinks: ['https://spark.apache.org/docs/latest/sql-performance-tuning.html#broadcast-hint-for-sql-queries'],
        tags: ['broadcast-join', 'performance', 'optimization'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_009',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Partitioning',
        difficulty: 'medium',
        questionText: 'What is the recommended approach for partitioning Delta tables?',
        options: ['Partition by columns with low cardinality and even distribution', 'Partition by all available columns', 'Partition by high cardinality columns', 'Avoid partitioning entirely'],
        correctAnswer: 0,
        explanation: 'Effective partitioning uses columns with low cardinality (few distinct values) and even distribution to avoid small files and skewed partitions that can hurt performance.',
        documentationLinks: ['https://docs.databricks.com/delta/best-practices.html#choose-the-right-partition-column'],
        tags: ['partitioning', 'delta-lake', 'performance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_010',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'UDFs',
        difficulty: 'hard',
        questionText: 'What is a key limitation of Python UDFs compared to built-in Spark functions?',
        options: ['Cannot be optimized by Catalyst optimizer', 'Cannot process null values', 'Cannot return complex types', 'Cannot be used in SQL'],
        correctAnswer: 0,
        explanation: 'Python UDFs cannot be optimized by the Catalyst optimizer because they are black boxes to Spark, potentially leading to performance issues compared to built-in functions.',
        documentationLinks: ['https://spark.apache.org/docs/latest/sql-ref-functions-udf-scalar.html'],
        tags: ['udfs', 'performance', 'catalyst-optimizer'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_011',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Caching',
        difficulty: 'medium',
        questionText: 'When should you cache a DataFrame in Spark?',
        codeExample: 'df.cache()',
        options: ['When the DataFrame will be used multiple times', 'For all DataFrames to improve performance', 'Only for small DataFrames', 'Never, caching hurts performance'],
        correctAnswer: 0,
        explanation: 'Caching is beneficial when a DataFrame will be accessed multiple times, as it stores the computed result in memory to avoid recomputation on subsequent actions.',
        documentationLinks: ['https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-persistence'],
        tags: ['caching', 'performance', 'memory-management'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Incremental Data Processing Questions
      {
        id: 'q_idp_001',
        topic: 'Incremental Data Processing',
        subtopic: 'Structured Streaming',
        difficulty: 'easy',
        questionText: 'What is the default output mode for structured streaming when writing to a Delta table?',
        options: ['append', 'complete', 'update', 'overwrite'],
        correctAnswer: 0,
        explanation: 'The default output mode for structured streaming is "append", which adds new records to the target table. This is the most common mode for incremental data processing.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/index.html'],
        tags: ['structured-streaming', 'output-modes', 'delta'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_002',
        topic: 'Incremental Data Processing',
        subtopic: 'Change Data Capture',
        difficulty: 'medium',
        questionText: 'In a CDC scenario, which Delta Lake feature allows you to track all changes made to a table over time?',
        options: ['Change Data Feed', 'Time Travel', 'Schema Evolution', 'Optimize'],
        correctAnswer: 0,
        explanation: 'Change Data Feed (CDF) in Delta Lake captures row-level changes (inserts, updates, deletes) and makes them available for downstream processing, enabling efficient CDC workflows.',
        documentationLinks: ['https://docs.databricks.com/delta/delta-change-data-feed.html'],
        tags: ['cdc', 'change-data-feed', 'delta-lake'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_003',
        topic: 'Incremental Data Processing',
        subtopic: 'Merge Operations',
        difficulty: 'hard',
        questionText: 'What happens when a MERGE operation encounters a record that exists in the source but not in the target, and no WHEN NOT MATCHED clause is specified?',
        codeExample: 'MERGE INTO target t USING source s ON t.id = s.id\nWHEN MATCHED THEN UPDATE SET *',
        options: ['The record is inserted into target', 'The record is ignored', 'An error is thrown', 'The operation fails'],
        correctAnswer: 1,
        explanation: 'When no WHEN NOT MATCHED clause is specified, records that exist in source but not in target are simply ignored. The MERGE operation only processes the clauses that are explicitly defined.',
        documentationLinks: ['https://docs.databricks.com/delta/merge.html'],
        tags: ['merge', 'upsert', 'delta-lake'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_004',
        topic: 'Incremental Data Processing',
        subtopic: 'Watermarking',
        difficulty: 'medium',
        questionText: 'What is the purpose of watermarking in structured streaming?',
        codeExample: 'df.withWatermark("timestamp", "10 minutes")',
        options: ['Handle late-arriving data in event time processing', 'Optimize memory usage', 'Improve query performance', 'Enable schema evolution'],
        correctAnswer: 0,
        explanation: 'Watermarking in structured streaming defines how late data can arrive before being considered too late to process. It enables efficient stateful operations by allowing the engine to clean up old state.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/watermarking.html'],
        tags: ['structured-streaming', 'watermarking', 'late-data'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_005',
        topic: 'Incremental Data Processing',
        subtopic: 'Checkpointing',
        difficulty: 'hard',
        questionText: 'Why is checkpointing critical for structured streaming fault tolerance?',
        options: ['Stores processing progress and enables exactly-once semantics', 'Improves query performance', 'Reduces memory usage', 'Enables schema evolution'],
        correctAnswer: 0,
        explanation: 'Checkpointing stores the processing progress and state of a streaming query, enabling exactly-once processing guarantees and fault tolerance by allowing recovery from the last checkpoint.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/production.html'],
        tags: ['structured-streaming', 'checkpointing', 'fault-tolerance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_006',
        topic: 'Incremental Data Processing',
        subtopic: 'Auto Loader',
        difficulty: 'easy',
        questionText: 'What is the primary advantage of using Auto Loader for ingesting files?',
        options: ['Automatically processes new files as they arrive', 'Faster file processing speed', 'Better compression ratios', 'Automatic schema inference only'],
        correctAnswer: 0,
        explanation: 'Auto Loader automatically detects and processes new files as they are added to cloud storage, making it ideal for incremental data ingestion without manual intervention.',
        documentationLinks: ['https://docs.databricks.com/ingestion/auto-loader/index.html'],
        tags: ['auto-loader', 'incremental', 'file-ingestion'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_007',
        topic: 'Incremental Data Processing',
        subtopic: 'Delta Lake Time Travel',
        difficulty: 'medium',
        questionText: 'Which SQL syntax is used to query a Delta table as it existed at a specific timestamp?',
        options: ['SELECT * FROM table_name TIMESTAMP AS OF \'2023-01-01\'', 'SELECT * FROM table_name AT TIME \'2023-01-01\'', 'SELECT * FROM table_name VERSION \'2023-01-01\'', 'SELECT * FROM table_name AS OF \'2023-01-01\''],
        correctAnswer: 0,
        explanation: 'The TIMESTAMP AS OF clause allows querying a Delta table at a specific point in time, enabling time travel queries for historical data analysis.',
        documentationLinks: ['https://docs.databricks.com/delta/delta-batch.html#query-an-older-snapshot-of-a-table-time-travel'],
        tags: ['delta-lake', 'time-travel', 'versioning'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_008',
        topic: 'Incremental Data Processing',
        subtopic: 'Streaming Triggers',
        difficulty: 'medium',
        questionText: 'What does the "once" trigger do in structured streaming?',
        codeExample: 'df.writeStream.trigger(once=True)',
        options: ['Processes all available data and stops', 'Processes data continuously', 'Processes data every hour', 'Processes only new data'],
        correctAnswer: 0,
        explanation: 'The "once" trigger processes all available data in the stream and then stops, making it useful for batch-like processing of streaming data sources.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/triggers.html'],
        tags: ['structured-streaming', 'triggers', 'batch-processing'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_009',
        topic: 'Incremental Data Processing',
        subtopic: 'Schema Evolution',
        difficulty: 'hard',
        questionText: 'How does Delta Lake handle schema evolution when new columns are added to incoming data?',
        options: ['Automatically adds new columns if mergeSchema option is enabled', 'Rejects all data with new columns', 'Ignores new columns silently', 'Requires manual schema updates first'],
        correctAnswer: 0,
        explanation: 'Delta Lake can automatically evolve the schema when the mergeSchema option is set to true, allowing new columns to be added without breaking existing pipelines.',
        documentationLinks: ['https://docs.databricks.com/delta/delta-batch.html#automatic-schema-evolution'],
        tags: ['delta-lake', 'schema-evolution', 'mergeSchema'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_010',
        topic: 'Incremental Data Processing',
        subtopic: 'Optimize Operations',
        difficulty: 'hard',
        questionText: 'What is the primary benefit of running OPTIMIZE on a Delta table?',
        codeExample: 'OPTIMIZE table_name',
        options: ['Compacts small files into larger ones for better performance', 'Updates table statistics', 'Removes old versions', 'Repairs corrupted data'],
        correctAnswer: 0,
        explanation: 'OPTIMIZE compacts small files into larger ones, reducing the number of files and improving query performance by minimizing file overhead and enabling better parallelization.',
        documentationLinks: ['https://docs.databricks.com/delta/optimize.html'],
        tags: ['delta-lake', 'optimize', 'file-compaction'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_011',
        topic: 'Incremental Data Processing',
        subtopic: 'Streaming State',
        difficulty: 'hard',
        questionText: 'What happens to streaming state when a structured streaming query is restarted?',
        options: ['State is recovered from checkpoints', 'State is lost and rebuilt', 'State is stored in memory only', 'State is automatically backed up'],
        correctAnswer: 0,
        explanation: 'Structured streaming maintains state information in checkpoints, allowing queries to recover their state when restarted, ensuring exactly-once processing guarantees.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/production.html'],
        tags: ['structured-streaming', 'state-management', 'checkpoints'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_012',
        topic: 'Incremental Data Processing',
        subtopic: 'Vacuum Operations',
        difficulty: 'medium',
        questionText: 'What is the purpose of the VACUUM command in Delta Lake?',
        codeExample: 'VACUUM table_name RETAIN 168 HOURS',
        options: ['Remove old data files that are no longer referenced', 'Compress data files', 'Update table statistics', 'Repair corrupted files'],
        correctAnswer: 0,
        explanation: 'VACUUM removes old data files that are no longer referenced by the Delta table, helping to reduce storage costs while maintaining the ability to time travel within the retention period.',
        documentationLinks: ['https://docs.databricks.com/delta/vacuum.html'],
        tags: ['delta-lake', 'vacuum', 'storage-cleanup'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_013',
        topic: 'Incremental Data Processing',
        subtopic: 'Foreachbatch',
        difficulty: 'hard',
        questionText: 'What is the purpose of foreachBatch in structured streaming?',
        codeExample: 'df.writeStream.foreachBatch(process_batch)',
        options: ['Apply custom logic to each micro-batch', 'Improve streaming performance', 'Enable parallel processing', 'Reduce memory usage'],
        correctAnswer: 0,
        explanation: 'foreachBatch allows you to apply custom logic to each micro-batch in a streaming query, enabling complex operations that are not supported by standard streaming sinks.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/foreach.html'],
        tags: ['structured-streaming', 'foreachbatch', 'custom-logic'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Production Pipelines Questions
      {
        id: 'q_pp_001',
        topic: 'Production Pipelines',
        subtopic: 'Delta Live Tables',
        difficulty: 'easy',
        questionText: 'Which decorator is used to define a Delta Live Table in Python?',
        options: ['@dlt.table', '@delta.table', '@live.table', '@pipeline.table'],
        correctAnswer: 0,
        explanation: 'The @dlt.table decorator is used to define Delta Live Tables in Python. It automatically handles table creation, updates, and dependency management.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'decorators', 'python'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_002',
        topic: 'Production Pipelines',
        subtopic: 'Job Scheduling',
        difficulty: 'medium',
        questionText: 'What is the recommended approach for handling job failures in Databricks workflows?',
        options: ['Configure retry policies and email notifications', 'Use try-catch blocks in all code', 'Schedule jobs more frequently', 'Disable error handling'],
        correctAnswer: 0,
        explanation: 'Databricks workflows support built-in retry policies, timeout settings, and notification systems. This provides robust error handling without requiring code-level exception handling for infrastructure issues.',
        documentationLinks: ['https://docs.databricks.com/workflows/index.html'],
        tags: ['workflows', 'error-handling', 'scheduling'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_003',
        topic: 'Production Pipelines',
        subtopic: 'Error Handling',
        difficulty: 'hard',
        questionText: 'In Delta Live Tables, what is the purpose of the expect() function?',
        codeExample: '@dlt.table\ndef clean_data():\n    return dlt.read("raw_data").filter(dlt.expect("valid_email", "email IS NOT NULL"))',
        options: ['Data quality constraints and filtering', 'Exception handling', 'Performance optimization', 'Schema validation'],
        correctAnswer: 0,
        explanation: 'The expect() function in DLT defines data quality constraints. Records that fail the expectation can be dropped or quarantined, ensuring data quality in production pipelines.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/expectations.html'],
        tags: ['delta-live-tables', 'data-quality', 'expectations'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_004',
        topic: 'Production Pipelines',
        subtopic: 'Delta Live Tables',
        difficulty: 'medium',
        questionText: 'What is the difference between @dlt.table and @dlt.view in Delta Live Tables?',
        options: ['Tables persist data, views are computed on-demand', 'Tables are faster, views use less storage', 'Tables support streaming, views do not', 'No difference, they are aliases'],
        correctAnswer: 0,
        explanation: 'In DLT, @dlt.table creates materialized tables that persist data to storage, while @dlt.view creates logical views that are computed on-demand when referenced by downstream tables.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'tables', 'views'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_005',
        topic: 'Production Pipelines',
        subtopic: 'Pipeline Configuration',
        difficulty: 'hard',
        questionText: 'Which configuration setting controls the maximum number of parallel tasks in a Delta Live Tables pipeline?',
        options: ['pipelines.maxConcurrentTasks', 'spark.sql.adaptive.coalescePartitions.enabled', 'pipelines.parallelism', 'spark.databricks.delta.optimizeWrite.enabled'],
        correctAnswer: 0,
        explanation: 'The pipelines.maxConcurrentTasks setting controls how many tables can be processed in parallel within a DLT pipeline, affecting overall pipeline performance and resource utilization.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/settings.html'],
        tags: ['delta-live-tables', 'configuration', 'performance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_006',
        topic: 'Production Pipelines',
        subtopic: 'DLT Expectations',
        difficulty: 'easy',
        questionText: 'What happens to records that fail a DLT expectation with "drop invalid records" policy?',
        codeExample: '@dlt.expect_or_drop("valid_email", "email IS NOT NULL")',
        options: ['Records are removed from the output', 'Records are quarantined', 'Pipeline fails', 'Records are marked as invalid'],
        correctAnswer: 0,
        explanation: 'When using expect_or_drop(), records that fail the expectation are automatically removed from the output dataset, ensuring only valid data proceeds downstream.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/expectations.html'],
        tags: ['delta-live-tables', 'expectations', 'data-quality'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_007',
        topic: 'Production Pipelines',
        subtopic: 'Workflow Dependencies',
        difficulty: 'medium',
        questionText: 'How do you specify that one job should run only after another job completes successfully?',
        options: ['Configure task dependencies in the workflow', 'Use time-based scheduling', 'Run jobs in the same cluster', 'Use shared variables'],
        correctAnswer: 0,
        explanation: 'Databricks Workflows allow you to configure task dependencies, ensuring that downstream tasks only execute after upstream tasks complete successfully.',
        documentationLinks: ['https://docs.databricks.com/workflows/index.html'],
        tags: ['workflows', 'dependencies', 'task-orchestration'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_008',
        topic: 'Production Pipelines',
        subtopic: 'DLT Pipeline Modes',
        difficulty: 'medium',
        questionText: 'What is the difference between "Triggered" and "Continuous" pipeline modes in DLT?',
        options: ['Triggered runs once when started, Continuous runs indefinitely', 'Triggered is faster, Continuous is more reliable', 'Triggered uses less memory, Continuous uses less CPU', 'No difference, they are aliases'],
        correctAnswer: 0,
        explanation: 'Triggered pipelines run once when manually started or scheduled, while Continuous pipelines run indefinitely, processing new data as it arrives.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'pipeline-modes', 'continuous'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_009',
        topic: 'Production Pipelines',
        subtopic: 'Error Handling',
        difficulty: 'hard',
        questionText: 'Which DLT expectation function allows invalid records to be quarantined rather than dropped?',
        options: ['expect_or_fail()', 'expect_or_drop()', 'expect_all()', 'expect_or_quarantine()'],
        correctAnswer: 0,
        explanation: 'expect_or_fail() causes the pipeline to fail when invalid records are encountered, but when combined with quarantine settings, invalid records can be stored separately for analysis.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/expectations.html'],
        tags: ['delta-live-tables', 'expectations', 'quarantine'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_010',
        topic: 'Production Pipelines',
        subtopic: 'Pipeline Monitoring',
        difficulty: 'hard',
        questionText: 'What information is available in the DLT pipeline event log?',
        options: ['Data quality metrics, lineage, and execution details', 'Only error messages', 'Only performance metrics', 'Only data lineage information'],
        correctAnswer: 0,
        explanation: 'The DLT event log captures comprehensive information including data quality metrics, lineage information, execution details, and performance statistics for monitoring and debugging.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/observability.html'],
        tags: ['delta-live-tables', 'monitoring', 'event-log'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_011',
        topic: 'Production Pipelines',
        subtopic: 'DLT Testing',
        difficulty: 'medium',
        questionText: 'How can you test Delta Live Tables pipelines before production deployment?',
        options: ['Use development mode with sample data', 'Test in production with small datasets', 'Use unit tests only', 'Manual testing is sufficient'],
        correctAnswer: 0,
        explanation: 'DLT pipelines can be tested in development mode using sample data, allowing validation of logic, data quality rules, and pipeline structure before production deployment.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'testing', 'development'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_012',
        topic: 'Production Pipelines',
        subtopic: 'Job Clusters vs All-Purpose',
        difficulty: 'easy',
        questionText: 'What is the main cost advantage of job clusters over all-purpose clusters?',
        options: ['Automatically terminate when job completes', 'Use cheaper instance types', 'Share resources across jobs', 'Require less memory'],
        correctAnswer: 0,
        explanation: 'Job clusters automatically terminate when the associated job completes, eliminating idle time costs that can occur with all-purpose clusters that remain running.',
        documentationLinks: ['https://docs.databricks.com/clusters/configure.html'],
        tags: ['job-clusters', 'cost-optimization', 'auto-termination'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_013',
        topic: 'Production Pipelines',
        subtopic: 'Workflow Notifications',
        difficulty: 'easy',
        questionText: 'How can you be notified when a Databricks job fails?',
        options: ['Configure email notifications in job settings', 'Monitor logs manually', 'Use external monitoring tools only', 'Check job status periodically'],
        correctAnswer: 0,
        explanation: 'Databricks jobs support built-in email notifications that can be configured to alert on job success, failure, or both, providing immediate feedback on job status.',
        documentationLinks: ['https://docs.databricks.com/workflows/jobs/create-run-jobs.html'],
        tags: ['workflows', 'notifications', 'monitoring'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Data Governance Questions
      {
        id: 'q_dg_001',
        topic: 'Data Governance',
        subtopic: 'Access Control',
        difficulty: 'easy',
        questionText: 'Which Unity Catalog privilege is required to read data from a table?',
        options: ['SELECT', 'READ', 'ACCESS', 'VIEW'],
        correctAnswer: 0,
        explanation: 'The SELECT privilege in Unity Catalog grants the ability to read data from tables and views. This follows standard SQL privilege naming conventions.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/manage-privileges/index.html'],
        tags: ['unity-catalog', 'privileges', 'access-control'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_002',
        topic: 'Data Governance',
        subtopic: 'Data Lineage',
        difficulty: 'medium',
        questionText: 'How does Unity Catalog automatically capture data lineage information?',
        options: ['Through SQL query parsing and execution tracking', 'By manual annotation in notebooks', 'Through external lineage tools only', 'By scanning file system metadata'],
        correctAnswer: 0,
        explanation: 'Unity Catalog automatically captures lineage by parsing SQL queries and tracking data flow during execution. This provides automatic lineage without requiring manual intervention.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/data-lineage.html'],
        tags: ['unity-catalog', 'lineage', 'governance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_003',
        topic: 'Data Governance',
        subtopic: 'Data Classification',
        difficulty: 'hard',
        questionText: 'What is the purpose of column-level tags in Unity Catalog?',
        options: ['Classify sensitive data and apply policies', 'Improve query performance', 'Enable schema evolution', 'Reduce storage costs'],
        correctAnswer: 0,
        explanation: 'Column-level tags in Unity Catalog are used to classify sensitive data (PII, PHI, etc.) and automatically apply governance policies like access restrictions and audit logging.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/tags.html'],
        tags: ['unity-catalog', 'tags', 'classification', 'sensitive-data'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_004',
        topic: 'Data Governance',
        subtopic: 'Unity Catalog Privileges',
        difficulty: 'easy',
        questionText: 'Which privilege is required to create a new table in Unity Catalog?',
        options: ['CREATE TABLE on the schema', 'CREATE on the catalog', 'WRITE on the schema', 'INSERT on the catalog'],
        correctAnswer: 0,
        explanation: 'The CREATE TABLE privilege on a schema allows users to create new tables within that schema. This follows the principle of least privilege access.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/manage-privileges/index.html'],
        tags: ['unity-catalog', 'privileges', 'create-table'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_005',
        topic: 'Data Governance',
        subtopic: 'External Locations',
        difficulty: 'medium',
        questionText: 'What is the purpose of External Locations in Unity Catalog?',
        options: ['Define secure access to cloud storage paths', 'Store table metadata', 'Configure network access', 'Manage user authentication'],
        correctAnswer: 0,
        explanation: 'External Locations in Unity Catalog define secure, governed access to specific cloud storage paths, enabling controlled access to external data sources.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/manage-external-locations-and-credentials.html'],
        tags: ['unity-catalog', 'external-locations', 'cloud-storage'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_006',
        topic: 'Data Governance',
        subtopic: 'Data Masking',
        difficulty: 'medium',
        questionText: 'How can you implement column-level security in Unity Catalog?',
        options: ['Use dynamic views with conditional logic', 'Encrypt columns at rest', 'Use row-level security only', 'Apply table-level permissions'],
        correctAnswer: 0,
        explanation: 'Dynamic views in Unity Catalog can implement column-level security by using conditional logic to mask or filter sensitive columns based on user identity or group membership.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/create-views.html'],
        tags: ['unity-catalog', 'column-security', 'dynamic-views'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_007',
        topic: 'Data Governance',
        subtopic: 'Audit Logging',
        difficulty: 'hard',
        questionText: 'What types of activities are captured in Unity Catalog audit logs?',
        options: ['Data access, permission changes, and administrative actions', 'Only data access events', 'Only permission changes', 'Only failed operations'],
        correctAnswer: 0,
        explanation: 'Unity Catalog audit logs capture comprehensive activities including data access patterns, permission changes, administrative actions, and security events for compliance and monitoring.',
        documentationLinks: ['https://docs.databricks.com/administration-guide/account-settings/audit-logs.html'],
        tags: ['unity-catalog', 'audit-logs', 'compliance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_008',
        topic: 'Data Governance',
        subtopic: 'Service Principals',
        difficulty: 'hard',
        questionText: 'When should you use service principals instead of user accounts for data access?',
        options: ['For automated processes and applications', 'For interactive data analysis', 'For temporary access only', 'For external user access'],
        correctAnswer: 0,
        explanation: 'Service principals should be used for automated processes, applications, and CI/CD pipelines where human user accounts are not appropriate or secure.',
        documentationLinks: ['https://docs.databricks.com/administration-guide/users-groups/service-principals.html'],
        tags: ['service-principals', 'automation', 'security'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_009',
        topic: 'Data Governance',
        subtopic: 'Information Schema',
        difficulty: 'medium',
        questionText: 'How can you discover available tables and their schemas in Unity Catalog?',
        options: ['Query the information_schema views', 'Use DESCRIBE commands only', 'Check DBFS directly', 'Use external catalog tools'],
        correctAnswer: 0,
        explanation: 'Unity Catalog provides information_schema views that allow SQL-based discovery of catalogs, schemas, tables, columns, and their metadata through standard queries.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/information-schema.html'],
        tags: ['unity-catalog', 'information-schema', 'metadata'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_010',
        topic: 'Data Governance',
        subtopic: 'Row-Level Security',
        difficulty: 'hard',
        questionText: 'How can you implement row-level security in Unity Catalog?',
        options: ['Create views with WHERE clauses based on current_user()', 'Use table partitioning', 'Apply column-level permissions', 'Use external authorization systems only'],
        correctAnswer: 0,
        explanation: 'Row-level security can be implemented using views that include WHERE clauses with functions like current_user() or is_member() to filter rows based on user identity or group membership.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/create-views.html'],
        tags: ['unity-catalog', 'row-level-security', 'views'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_011',
        topic: 'Data Governance',
        subtopic: 'Catalog Explorer',
        difficulty: 'easy',
        questionText: 'What information can you find in the Unity Catalog Explorer?',
        options: ['Table schemas, lineage, and sample data', 'Only table names', 'Only permissions', 'Only usage statistics'],
        correctAnswer: 0,
        explanation: 'The Unity Catalog Explorer provides comprehensive information including table schemas, data lineage, sample data, usage statistics, and governance information in a unified interface.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/explore-data.html'],
        tags: ['unity-catalog', 'catalog-explorer', 'metadata'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Additional 50 Questions for Comprehensive Coverage

      // More Databricks Lakehouse Platform Questions
      {
        id: 'q_dlp_011',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'SQL Warehouses',
        difficulty: 'medium',
        questionText: 'What is the primary advantage of using SQL warehouses over all-purpose clusters for SQL workloads?',
        options: ['Optimized for SQL performance and cost efficiency', 'Support for Python and Scala', 'Better for machine learning workloads', 'Unlimited concurrent users'],
        correctAnswer: 0,
        explanation: 'SQL warehouses are specifically optimized for SQL workloads, providing better performance and cost efficiency for analytics queries compared to general-purpose clusters.',
        documentationLinks: ['https://docs.databricks.com/sql/admin/sql-endpoints.html'],
        tags: ['sql-warehouses', 'performance', 'cost-optimization'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_012',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Workspace Administration',
        difficulty: 'hard',
        questionText: 'Which workspace-level setting controls whether users can create their own clusters?',
        options: ['Cluster creation permissions', 'Admin settings > Workspace settings > Cluster creation', 'User access control lists', 'Cluster policies'],
        correctAnswer: 1,
        explanation: 'Workspace administrators can control cluster creation through Admin settings > Workspace settings, where they can restrict who can create clusters.',
        documentationLinks: ['https://docs.databricks.com/administration-guide/workspace/index.html'],
        tags: ['workspace-admin', 'cluster-permissions', 'governance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_013',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Instance Pools',
        difficulty: 'medium',
        questionText: 'What is the main benefit of using instance pools in Databricks?',
        options: ['Faster cluster startup times', 'Lower compute costs', 'Better security isolation', 'Automatic scaling'],
        correctAnswer: 0,
        explanation: 'Instance pools maintain a set of idle, ready-to-use instances, which significantly reduces cluster startup times by avoiding the instance provisioning delay.',
        documentationLinks: ['https://docs.databricks.com/clusters/instance-pools/index.html'],
        tags: ['instance-pools', 'performance', 'cluster-startup'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_014',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Databricks Runtime',
        difficulty: 'easy',
        questionText: 'What is Databricks Runtime for Machine Learning (DBR ML)?',
        options: ['A runtime with pre-installed ML libraries and optimizations', 'A separate product for ML workloads', 'A GPU-only runtime', 'A runtime for streaming only'],
        correctAnswer: 0,
        explanation: 'DBR ML is a variant of Databricks Runtime that comes with popular ML libraries pre-installed and optimized for machine learning workloads.',
        documentationLinks: ['https://docs.databricks.com/runtime/mlruntime.html'],
        tags: ['databricks-runtime', 'machine-learning', 'libraries'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dlp_015',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Notebooks',
        difficulty: 'medium',
        questionText: 'Which magic command is used to run SQL queries in a Python notebook?',
        codeExample: '_____ SELECT * FROM my_table',
        options: ['%sql', '%query', '%spark', '%run'],
        correctAnswer: 0,
        explanation: 'The %sql magic command allows you to run SQL queries directly in notebook cells, regardless of the notebook\'s default language.',
        documentationLinks: ['https://docs.databricks.com/notebooks/notebooks-use.html'],
        tags: ['notebooks', 'magic-commands', 'sql'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // More ELT with Spark SQL and Python Questions
      {
        id: 'q_elt_012',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Data Sources',
        difficulty: 'medium',
        questionText: 'Which format provides the best performance for analytical queries in Databricks?',
        options: ['Delta Lake', 'CSV', 'JSON', 'Avro'],
        correctAnswer: 0,
        explanation: 'Delta Lake provides the best performance for analytical queries due to its columnar Parquet format, indexing, caching, and optimization features.',
        documentationLinks: ['https://docs.databricks.com/delta/index.html'],
        tags: ['delta-lake', 'performance', 'file-formats'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_013',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Spark Configuration',
        difficulty: 'hard',
        questionText: 'Which Spark configuration controls the number of partitions when shuffling data?',
        options: ['spark.sql.shuffle.partitions', 'spark.default.parallelism', 'spark.sql.adaptive.coalescePartitions.enabled', 'spark.serializer'],
        correctAnswer: 0,
        explanation: 'spark.sql.shuffle.partitions controls the number of partitions used when shuffling data for joins and aggregations. The default is 200.',
        documentationLinks: ['https://docs.databricks.com/spark/latest/spark-sql/language-manual/sql-ref-syntax-aux-conf-mgmt-set.html'],
        tags: ['spark-config', 'shuffle', 'partitions'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_014',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Column Operations',
        difficulty: 'medium',
        questionText: 'How do you rename a column in a DataFrame using PySpark?',
        codeExample: 'df._____(\'old_name\', \'new_name\')',
        options: ['withColumnRenamed', 'renameColumn', 'alias', 'select'],
        correctAnswer: 0,
        explanation: 'The withColumnRenamed() method is used to rename columns in a DataFrame. It takes the old column name and new column name as parameters.',
        documentationLinks: ['https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.withColumnRenamed.html'],
        tags: ['pyspark', 'dataframe', 'column-operations'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_015',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'String Functions',
        difficulty: 'easy',
        questionText: 'Which SQL function is used to convert text to uppercase?',
        codeExample: 'SELECT _____(name) FROM customers',
        options: ['UPPER', 'UCASE', 'UPPERCASE', 'CAPS'],
        correctAnswer: 0,
        explanation: 'The UPPER() function converts all characters in a string to uppercase. This is a standard SQL function available in Spark SQL.',
        documentationLinks: ['https://spark.apache.org/docs/latest/api/sql/index.html#upper'],
        tags: ['spark-sql', 'string-functions', 'text-processing'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_016',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Date Functions',
        difficulty: 'medium',
        questionText: 'How do you extract the year from a date column in Spark SQL?',
        codeExample: 'SELECT _____(order_date) FROM orders',
        options: ['YEAR', 'EXTRACT_YEAR', 'DATE_PART', 'GET_YEAR'],
        correctAnswer: 0,
        explanation: 'The YEAR() function extracts the year component from a date or timestamp column in Spark SQL.',
        documentationLinks: ['https://spark.apache.org/docs/latest/api/sql/index.html#year'],
        tags: ['spark-sql', 'date-functions', 'time-series'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // More Incremental Data Processing Questions
      {
        id: 'q_idp_014',
        topic: 'Incremental Data Processing',
        subtopic: 'Delta Lake Constraints',
        difficulty: 'hard',
        questionText: 'What happens when you try to insert data that violates a CHECK constraint in Delta Lake?',
        codeExample: 'ALTER TABLE sales ADD CONSTRAINT valid_amount CHECK (amount > 0)',
        options: ['The operation fails and no data is inserted', 'Invalid rows are skipped', 'Invalid rows are inserted with NULL values', 'A warning is logged but data is inserted'],
        correctAnswer: 0,
        explanation: 'Delta Lake CHECK constraints are enforced strictly. If any row violates the constraint, the entire operation fails and no data is inserted.',
        documentationLinks: ['https://docs.databricks.com/delta/delta-constraints.html'],
        tags: ['delta-lake', 'constraints', 'data-quality'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_015',
        topic: 'Incremental Data Processing',
        subtopic: 'Streaming Aggregations',
        difficulty: 'hard',
        questionText: 'What is required when performing aggregations in structured streaming?',
        options: ['Watermarking for event-time aggregations', 'Checkpointing every 5 minutes', 'Using append output mode only', 'Partitioning by time'],
        correctAnswer: 0,
        explanation: 'Event-time aggregations in structured streaming require watermarking to handle late-arriving data and to allow the engine to clean up old state.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/watermarking.html'],
        tags: ['structured-streaming', 'aggregations', 'watermarking'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_016',
        topic: 'Incremental Data Processing',
        subtopic: 'Delta Lake Versioning',
        difficulty: 'medium',
        questionText: 'How long does Delta Lake retain historical versions by default?',
        options: ['30 days', '7 days', '90 days', 'Forever'],
        correctAnswer: 0,
        explanation: 'Delta Lake retains historical versions for 30 days by default. This can be configured using the delta.logRetentionDuration table property.',
        documentationLinks: ['https://docs.databricks.com/delta/delta-batch.html#data-retention'],
        tags: ['delta-lake', 'versioning', 'retention'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_017',
        topic: 'Incremental Data Processing',
        subtopic: 'Streaming Joins',
        difficulty: 'hard',
        questionText: 'What type of joins are supported between two streaming DataFrames?',
        options: ['Inner joins with watermarking', 'All join types', 'Only left outer joins', 'No joins are supported'],
        correctAnswer: 0,
        explanation: 'Stream-stream joins support inner joins and some outer joins, but require watermarking on both sides to bound the state and handle late data.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/stream-stream-joins.html'],
        tags: ['structured-streaming', 'joins', 'watermarking'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_018',
        topic: 'Incremental Data Processing',
        subtopic: 'Auto Loader Schema Evolution',
        difficulty: 'medium',
        questionText: 'How does Auto Loader handle schema evolution by default?',
        options: ['Automatically adds new columns', 'Fails on schema changes', 'Ignores new columns', 'Requires manual intervention'],
        correctAnswer: 0,
        explanation: 'Auto Loader automatically handles schema evolution by adding new columns to the target table when they appear in the source data.',
        documentationLinks: ['https://docs.databricks.com/ingestion/auto-loader/schema.html'],
        tags: ['auto-loader', 'schema-evolution', 'ingestion'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // More Production Pipelines Questions
      {
        id: 'q_pp_014',
        topic: 'Production Pipelines',
        subtopic: 'DLT Data Quality',
        difficulty: 'medium',
        questionText: 'What is the difference between expect() and expect_or_drop() in Delta Live Tables?',
        options: ['expect() logs violations, expect_or_drop() removes invalid records', 'expect() fails the pipeline, expect_or_drop() continues', 'No difference, they are aliases', 'expect() is for streaming, expect_or_drop() is for batch'],
        correctAnswer: 0,
        explanation: 'expect() logs data quality violations but allows records to pass through, while expect_or_drop() removes records that fail the expectation.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/expectations.html'],
        tags: ['delta-live-tables', 'data-quality', 'expectations'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_015',
        topic: 'Production Pipelines',
        subtopic: 'Workflow Parameters',
        difficulty: 'medium',
        questionText: 'How do you pass parameters to a Databricks job at runtime?',
        options: ['Job parameters in the job configuration', 'Environment variables only', 'Command line arguments', 'Notebook widgets only'],
        correctAnswer: 0,
        explanation: 'Databricks jobs support parameters that can be defined in the job configuration and passed to notebooks or JAR tasks at runtime.',
        documentationLinks: ['https://docs.databricks.com/workflows/jobs/create-run-jobs.html'],
        tags: ['workflows', 'parameters', 'job-configuration'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_016',
        topic: 'Production Pipelines',
        subtopic: 'DLT Pipeline Updates',
        difficulty: 'hard',
        questionText: 'What happens to downstream tables when you modify a DLT pipeline definition?',
        options: ['Affected tables are automatically refreshed', 'Manual refresh is required', 'Pipeline must be recreated', 'Changes are ignored'],
        correctAnswer: 0,
        explanation: 'Delta Live Tables automatically detects changes in pipeline definitions and refreshes affected tables and their downstream dependencies.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'pipeline-updates', 'dependencies'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_017',
        topic: 'Production Pipelines',
        subtopic: 'Job Monitoring',
        difficulty: 'easy',
        questionText: 'Where can you view the execution history of Databricks jobs?',
        options: ['Jobs UI > Job runs tab', 'Cluster logs only', 'Spark UI only', 'System tables only'],
        correctAnswer: 0,
        explanation: 'The Jobs UI provides a comprehensive view of job execution history, including run status, duration, and detailed logs for each job run.',
        documentationLinks: ['https://docs.databricks.com/workflows/jobs/monitor-job-runs.html'],
        tags: ['workflows', 'monitoring', 'job-history'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_018',
        topic: 'Production Pipelines',
        subtopic: 'DLT Materialized Views',
        difficulty: 'medium',
        questionText: 'What is the difference between a DLT table and a DLT materialized view?',
        options: ['Tables store data, materialized views are computed on-demand', 'No difference in DLT', 'Materialized views are faster', 'Tables support streaming, views do not'],
        correctAnswer: 0,
        explanation: 'In DLT, tables (@dlt.table) store data physically, while materialized views (@dlt.view) are computed on-demand when referenced by downstream tables.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'materialized-views', 'tables'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // More Data Governance Questions
      {
        id: 'q_dg_012',
        topic: 'Data Governance',
        subtopic: 'Unity Catalog Metastore',
        difficulty: 'hard',
        questionText: 'What is the relationship between Unity Catalog metastores and Databricks workspaces?',
        options: ['One metastore can be attached to multiple workspaces', 'Each workspace has its own metastore', 'Metastores are workspace-independent', 'One workspace can use multiple metastores'],
        correctAnswer: 0,
        explanation: 'A Unity Catalog metastore can be attached to multiple workspaces, allowing data sharing and consistent governance across workspaces in a region.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/index.html'],
        tags: ['unity-catalog', 'metastore', 'workspace'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_013',
        topic: 'Data Governance',
        subtopic: 'Data Lineage Tracking',
        difficulty: 'medium',
        questionText: 'Which operations are automatically tracked by Unity Catalog lineage?',
        options: ['SQL queries and DataFrame operations', 'Only SQL queries', 'Only notebook operations', 'Manual tracking required'],
        correctAnswer: 0,
        explanation: 'Unity Catalog automatically captures lineage for SQL queries, DataFrame operations, and Delta Live Tables, providing comprehensive data flow tracking.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/data-lineage.html'],
        tags: ['unity-catalog', 'lineage', 'tracking'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_014',
        topic: 'Data Governance',
        subtopic: 'Credential Management',
        difficulty: 'hard',
        questionText: 'What is the purpose of storage credentials in Unity Catalog?',
        options: ['Securely access cloud storage without exposing keys', 'Store database passwords', 'Manage user authentication', 'Configure network access'],
        correctAnswer: 0,
        explanation: 'Storage credentials in Unity Catalog provide secure access to cloud storage locations without exposing access keys or secrets to users.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/manage-external-locations-and-credentials.html'],
        tags: ['unity-catalog', 'storage-credentials', 'security'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_015',
        topic: 'Data Governance',
        subtopic: 'System Tables',
        difficulty: 'medium',
        questionText: 'What information is available in Unity Catalog system tables?',
        options: ['Audit logs, lineage, and usage analytics', 'Only table schemas', 'Only user permissions', 'Only query history'],
        correctAnswer: 0,
        explanation: 'Unity Catalog system tables provide comprehensive information including audit logs, data lineage, usage analytics, and governance metadata.',
        documentationLinks: ['https://docs.databricks.com/administration-guide/system-tables/index.html'],
        tags: ['unity-catalog', 'system-tables', 'analytics'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_dg_016',
        topic: 'Data Governance',
        subtopic: 'Data Classification',
        difficulty: 'medium',
        questionText: 'How can you automatically classify sensitive data in Unity Catalog?',
        options: ['Using data classification rules and tags', 'Manual tagging only', 'External tools only', 'Not supported'],
        correctAnswer: 0,
        explanation: 'Unity Catalog supports automatic data classification using rules that can detect and tag sensitive data like PII, PHI, and financial information.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/data-classification.html'],
        tags: ['unity-catalog', 'data-classification', 'sensitive-data'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Advanced Mixed Topics
      {
        id: 'q_adv_001',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Performance Optimization',
        difficulty: 'hard',
        questionText: 'Which technique provides the most significant performance improvement for large fact table queries?',
        options: ['Z-ordering on commonly filtered columns', 'Increasing cluster size', 'Using more partitions', 'Caching all tables'],
        correctAnswer: 0,
        explanation: 'Z-ordering optimizes data layout by co-locating related information, dramatically improving query performance for large tables with multiple filter conditions.',
        documentationLinks: ['https://docs.databricks.com/delta/optimize.html#z-ordering-multi-dimensional-clustering'],
        tags: ['z-ordering', 'performance', 'optimization'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_adv_002',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Advanced SQL',
        difficulty: 'hard',
        questionText: 'What is the purpose of the QUALIFY clause in Spark SQL?',
        codeExample: 'SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY date DESC) as rn FROM table QUALIFY rn = 1',
        options: ['Filter results based on window function results', 'Join qualification', 'Data quality checks', 'Schema validation'],
        correctAnswer: 0,
        explanation: 'QUALIFY allows filtering based on the results of window functions, eliminating the need for subqueries when working with analytical functions.',
        documentationLinks: ['https://docs.databricks.com/sql/language-manual/sql-ref-syntax-qry-select-qualify.html'],
        tags: ['spark-sql', 'qualify', 'window-functions'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_adv_003',
        topic: 'Incremental Data Processing',
        subtopic: 'Advanced Streaming',
        difficulty: 'hard',
        questionText: 'How do you handle exactly-once processing in structured streaming with external systems?',
        options: ['Use idempotent operations and transactional sinks', 'Increase checkpoint frequency', 'Use at-least-once processing', 'Disable checkpointing'],
        correctAnswer: 0,
        explanation: 'Exactly-once processing requires idempotent operations and transactional sinks that can handle duplicate writes gracefully during failure recovery.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/production.html'],
        tags: ['structured-streaming', 'exactly-once', 'fault-tolerance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_adv_004',
        topic: 'Production Pipelines',
        subtopic: 'Advanced DLT',
        difficulty: 'hard',
        questionText: 'What is the purpose of the @dlt.create_table() function in Delta Live Tables?',
        options: ['Create tables with custom properties and constraints', 'Create temporary tables', 'Create external tables only', 'Create views with materialization'],
        correctAnswer: 0,
        explanation: '@dlt.create_table() allows creating tables with specific properties, constraints, and configurations that cannot be expressed through the @dlt.table decorator.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/python-ref.html'],
        tags: ['delta-live-tables', 'create-table', 'advanced'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_adv_005',
        topic: 'Data Governance',
        subtopic: 'Advanced Security',
        difficulty: 'hard',
        questionText: 'How can you implement attribute-based access control (ABAC) in Unity Catalog?',
        options: ['Using dynamic views with session variables and functions', 'Only through external systems', 'Using table ACLs only', 'Not supported in Unity Catalog'],
        correctAnswer: 0,
        explanation: 'ABAC can be implemented using dynamic views that incorporate session variables, user attributes, and conditional logic to control data access based on context.',
        documentationLinks: ['https://docs.databricks.com/data-governance/unity-catalog/create-views.html'],
        tags: ['unity-catalog', 'abac', 'dynamic-views'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // TARGETED QUESTIONS FOR WEAK AREAS (Based on 42% Production Pipelines, 58% Incremental Data Processing)

      // PRODUCTION PIPELINES - CRITICAL FOCUS AREA (42% score)
      {
        id: 'q_pp_focus_001',
        topic: 'Production Pipelines',
        subtopic: 'DLT Advanced Expectations',
        difficulty: 'hard',
        questionText: 'What happens when you use expect_or_fail() with a constraint that fails in Delta Live Tables?',
        codeExample: '@dlt.expect_or_fail("positive_amount", "amount > 0")\ndef sales_clean():\n    return dlt.read("sales_raw")',
        options: ['Pipeline stops and fails immediately', 'Invalid records are quarantined', 'Invalid records are dropped silently', 'Pipeline continues with warnings'],
        correctAnswer: 0,
        explanation: 'expect_or_fail() causes the entire pipeline to stop and fail when any record violates the constraint, ensuring strict data quality enforcement.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/expectations.html'],
        tags: ['delta-live-tables', 'expectations', 'data-quality', 'pipeline-failure'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_focus_002',
        topic: 'Production Pipelines',
        subtopic: 'DLT Streaming Tables',
        difficulty: 'hard',
        questionText: 'How do you create a streaming Delta Live Table that processes data incrementally?',
        codeExample: '@dlt.table\ndef streaming_orders():\n    return (dlt.read_stream("orders_raw")\n           .select("*"))',
        options: ['Use dlt.read_stream() in the table definition', 'Add streaming=True parameter', 'Use @dlt.streaming_table decorator', 'Configure pipeline mode to streaming'],
        correctAnswer: 0,
        explanation: 'Use dlt.read_stream() instead of dlt.read() to create streaming tables that process data incrementally as it arrives.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'streaming', 'incremental-processing'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_focus_003',
        topic: 'Production Pipelines',
        subtopic: 'Job Cluster Configuration',
        difficulty: 'medium',
        questionText: 'What is the most cost-effective cluster configuration for a nightly ETL job that runs for 2 hours?',
        options: ['Job cluster with auto-termination', 'All-purpose cluster', 'Interactive cluster', 'Shared cluster'],
        correctAnswer: 0,
        explanation: 'Job clusters are created when the job starts and automatically terminate when complete, making them most cost-effective for scheduled batch jobs.',
        documentationLinks: ['https://docs.databricks.com/clusters/configure.html'],
        tags: ['job-clusters', 'cost-optimization', 'etl', 'scheduling'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_focus_004',
        topic: 'Production Pipelines',
        subtopic: 'Workflow Error Handling',
        difficulty: 'hard',
        questionText: 'How do you configure a Databricks job to retry failed tasks with exponential backoff?',
        options: ['Set max_retries and retry_on_timeout in job configuration', 'Use try-catch in notebook code', 'Configure cluster auto-restart', 'Use workflow dependencies'],
        correctAnswer: 0,
        explanation: 'Databricks jobs support built-in retry policies with configurable retry counts and timeout settings for robust error handling.',
        documentationLinks: ['https://docs.databricks.com/workflows/jobs/create-run-jobs.html'],
        tags: ['workflows', 'error-handling', 'retries', 'fault-tolerance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_focus_005',
        topic: 'Production Pipelines',
        subtopic: 'DLT Pipeline Refresh',
        difficulty: 'medium',
        questionText: 'What is the difference between "Full refresh" and "Refresh selection" in DLT pipelines?',
        options: ['Full refresh rebuilds all tables, Refresh selection updates only selected tables', 'Full refresh is faster', 'No difference in functionality', 'Full refresh only works with streaming'],
        correctAnswer: 0,
        explanation: 'Full refresh rebuilds all pipeline tables from scratch, while Refresh selection allows you to update only specific tables and their dependencies.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/updates.html'],
        tags: ['delta-live-tables', 'refresh', 'pipeline-updates'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_focus_006',
        topic: 'Production Pipelines',
        subtopic: 'DLT Dependencies',
        difficulty: 'hard',
        questionText: 'How does Delta Live Tables determine the execution order of tables in a pipeline?',
        options: ['Automatically based on table dependencies in the code', 'Alphabetical order', 'Order defined in pipeline configuration', 'Random execution order'],
        correctAnswer: 0,
        explanation: 'DLT automatically analyzes dependencies between tables based on dlt.read() and dlt.read_stream() calls to determine the correct execution order.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/index.html'],
        tags: ['delta-live-tables', 'dependencies', 'execution-order'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_focus_007',
        topic: 'Production Pipelines',
        subtopic: 'Job Monitoring',
        difficulty: 'medium',
        questionText: 'Which metric is most important for monitoring ETL job performance?',
        options: ['Job duration and success rate', 'CPU utilization only', 'Memory usage only', 'Network throughput only'],
        correctAnswer: 0,
        explanation: 'Job duration and success rate are key metrics for ETL monitoring, indicating both performance and reliability of data pipelines.',
        documentationLinks: ['https://docs.databricks.com/workflows/jobs/monitor-job-runs.html'],
        tags: ['monitoring', 'etl', 'performance', 'metrics'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_pp_focus_008',
        topic: 'Production Pipelines',
        subtopic: 'DLT Error Quarantine',
        difficulty: 'hard',
        questionText: 'How do you access quarantined records in Delta Live Tables?',
        options: ['Query the __quarantine suffix table', 'Check pipeline logs', 'Use SHOW QUARANTINE command', 'Access through Unity Catalog only'],
        correctAnswer: 0,
        explanation: 'DLT creates quarantine tables with __quarantine suffix containing records that failed expectations, allowing analysis of data quality issues.',
        documentationLinks: ['https://docs.databricks.com/delta-live-tables/expectations.html'],
        tags: ['delta-live-tables', 'quarantine', 'data-quality', 'error-handling'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // INCREMENTAL DATA PROCESSING - NEEDS WORK (58% score)
      {
        id: 'q_idp_focus_001',
        topic: 'Incremental Data Processing',
        subtopic: 'MERGE Performance',
        difficulty: 'hard',
        questionText: 'What is the most effective way to optimize MERGE operations on large Delta tables?',
        options: ['Partition both source and target on merge keys', 'Use broadcast joins', 'Increase cluster size', 'Disable auto-optimize'],
        correctAnswer: 0,
        explanation: 'Partitioning both source and target tables on merge keys reduces data shuffling and improves MERGE performance significantly.',
        documentationLinks: ['https://docs.databricks.com/delta/merge.html#performance-tuning'],
        tags: ['merge', 'performance', 'partitioning', 'optimization'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_focus_002',
        topic: 'Incremental Data Processing',
        subtopic: 'Streaming Deduplication',
        difficulty: 'hard',
        questionText: 'How do you handle duplicate records in structured streaming?',
        codeExample: 'df.writeStream\n  .option("checkpointLocation", "/path/to/checkpoint")\n  .trigger(processingTime="1 minute")',
        options: ['Use dropDuplicates() with watermarking', 'Use DISTINCT in SQL', 'Configure deduplication in checkpoint', 'Use unique constraints'],
        correctAnswer: 0,
        explanation: 'dropDuplicates() with watermarking allows efficient deduplication in streaming by maintaining state for a bounded time window.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/deduplication.html'],
        tags: ['structured-streaming', 'deduplication', 'watermarking'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_focus_003',
        topic: 'Incremental Data Processing',
        subtopic: 'CDC Implementation',
        difficulty: 'hard',
        questionText: 'What is the correct approach for implementing Change Data Capture with Delta Lake?',
        options: ['Enable Change Data Feed and use CDF functions', 'Use MERGE with audit columns', 'Compare snapshots manually', 'Use external CDC tools only'],
        correctAnswer: 0,
        explanation: 'Delta Lake Change Data Feed (CDF) automatically tracks changes and provides functions to query change data efficiently.',
        documentationLinks: ['https://docs.databricks.com/delta/delta-change-data-feed.html'],
        tags: ['cdc', 'change-data-feed', 'delta-lake'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_focus_004',
        topic: 'Incremental Data Processing',
        subtopic: 'Auto Loader File Notification',
        difficulty: 'medium',
        questionText: 'What is the advantage of using file notification mode in Auto Loader?',
        options: ['More efficient for large numbers of files', 'Works with any file system', 'Simpler configuration', 'Better for small files'],
        correctAnswer: 0,
        explanation: 'File notification mode uses cloud storage events to detect new files, making it more efficient than directory listing for large-scale ingestion.',
        documentationLinks: ['https://docs.databricks.com/ingestion/auto-loader/file-detection-modes.html'],
        tags: ['auto-loader', 'file-notification', 'cloud-storage', 'efficiency'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_focus_005',
        topic: 'Incremental Data Processing',
        subtopic: 'Streaming Window Operations',
        difficulty: 'hard',
        questionText: 'What is required when using sliding windows in structured streaming?',
        codeExample: 'df.groupBy(window(col("timestamp"), "10 minutes", "5 minutes"))',
        options: ['Watermarking to bound state size', 'Checkpointing every window', 'Partitioning by time', 'Using append mode only'],
        correctAnswer: 0,
        explanation: 'Sliding windows require watermarking to bound the amount of state maintained and to determine when old windows can be cleaned up.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/watermarking.html'],
        tags: ['structured-streaming', 'sliding-windows', 'watermarking', 'state-management'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_focus_006',
        topic: 'Incremental Data Processing',
        subtopic: 'Delta Lake Optimize',
        difficulty: 'medium',
        questionText: 'When should you run OPTIMIZE on a Delta table?',
        options: ['After many small file writes', 'Before every query', 'Only during maintenance windows', 'Never, it runs automatically'],
        correctAnswer: 0,
        explanation: 'OPTIMIZE should be run after many small file writes to compact files and improve query performance. It can be automated or run manually.',
        documentationLinks: ['https://docs.databricks.com/delta/optimize.html'],
        tags: ['delta-lake', 'optimize', 'file-compaction', 'performance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_idp_focus_007',
        topic: 'Incremental Data Processing',
        subtopic: 'Streaming Recovery',
        difficulty: 'hard',
        questionText: 'What happens when a structured streaming query fails and restarts?',
        options: ['Resumes from last checkpoint with exactly-once guarantees', 'Starts from beginning', 'Loses all progress', 'Requires manual intervention'],
        correctAnswer: 0,
        explanation: 'Structured streaming uses checkpoints to maintain exactly-once processing guarantees and automatically resumes from the last successful checkpoint.',
        documentationLinks: ['https://docs.databricks.com/structured-streaming/production.html'],
        tags: ['structured-streaming', 'fault-tolerance', 'checkpoints', 'exactly-once'],
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ELT WITH SPARK SQL AND PYTHON - IMPROVEMENT NEEDED (69% score)
      {
        id: 'q_elt_focus_001',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Complex Joins',
        difficulty: 'hard',
        questionText: 'What is the most efficient way to join a large fact table with multiple small dimension tables?',
        options: ['Use broadcast joins for small tables', 'Use sort-merge joins for all', 'Use nested loop joins', 'Avoid joins entirely'],
        correctAnswer: 0,
        explanation: 'Broadcasting small dimension tables eliminates shuffling of the large fact table, significantly improving join performance.',
        documentationLinks: ['https://docs.databricks.com/optimizations/joins.html'],
        tags: ['joins', 'broadcast', 'performance', 'optimization'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_focus_002',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Advanced Aggregations',
        difficulty: 'hard',
        questionText: 'How do you calculate running totals using window functions in Spark SQL?',
        codeExample: 'SELECT *, SUM(amount) OVER (...) as running_total FROM sales',
        options: ['ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'RANGE BETWEEN 1 PRECEDING AND 1 FOLLOWING', 'ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING', 'PARTITION BY amount'],
        correctAnswer: 0,
        explanation: 'ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW creates a running total by summing from the first row to the current row in the window.',
        documentationLinks: ['https://docs.databricks.com/sql/language-manual/sql-ref-syntax-qry-select.html#window-clause'],
        tags: ['window-functions', 'running-totals', 'aggregations', 'spark-sql'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_focus_003',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'DataFrame API Performance',
        difficulty: 'medium',
        questionText: 'Which DataFrame operation should be avoided for performance reasons?',
        codeExample: 'df.collect()\ndf.count()\ndf.show()\ndf.cache()',
        options: ['collect() on large datasets', 'count() operations', 'show() operations', 'cache() operations'],
        correctAnswer: 0,
        explanation: 'collect() brings all data to the driver node, which can cause out-of-memory errors and poor performance with large datasets.',
        documentationLinks: ['https://docs.databricks.com/optimizations/spark-performance.html'],
        tags: ['dataframe', 'performance', 'collect', 'best-practices'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_focus_004',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Catalyst Optimizer',
        difficulty: 'hard',
        questionText: 'Which operation can prevent Catalyst optimizer from pushing down filters?',
        options: ['Using Python UDFs in filter conditions', 'Using built-in functions', 'Using column expressions', 'Using SQL predicates'],
        correctAnswer: 0,
        explanation: 'Python UDFs are opaque to the Catalyst optimizer, preventing filter pushdown and other optimizations that could improve performance.',
        documentationLinks: ['https://docs.databricks.com/optimizations/catalyst-optimizer.html'],
        tags: ['catalyst-optimizer', 'udfs', 'filter-pushdown', 'performance'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q_elt_focus_005',
        topic: 'ELT with Spark SQL and Python',
        subtopic: 'Data Skew Handling',
        difficulty: 'hard',
        questionText: 'How do you handle data skew in Spark transformations?',
        options: ['Use salting or repartitioning strategies', 'Increase cluster size only', 'Use more partitions', 'Disable adaptive query execution'],
        correctAnswer: 0,
        explanation: 'Data skew can be handled by salting (adding random prefixes) or strategic repartitioning to distribute data more evenly across partitions.',
        documentationLinks: ['https://docs.databricks.com/optimizations/skew-join.html'],
        tags: ['data-skew', 'salting', 'repartitioning', 'performance'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Shuffle answer choices for each question to randomize correct answer positions
    const questionsWithShuffledAnswers = allQuestions.map(question => {
      const shuffledOptions = [...question.options];
      const correctOption = shuffledOptions[question.correctAnswer];
      
      // Shuffle the options array
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      
      // Find the new position of the correct answer
      const newCorrectAnswer = shuffledOptions.indexOf(correctOption);
      
      return {
        ...question,
        options: shuffledOptions,
        correctAnswer: newCorrectAnswer
      };
    });

    // Shuffle and return the requested number of questions
    const shuffled = this.shuffleArray(questionsWithShuffledAnswers);
    return shuffled.slice(0, questionCount);
  }
}