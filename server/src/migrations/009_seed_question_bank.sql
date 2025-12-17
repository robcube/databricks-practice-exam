-- Seed comprehensive question bank for Databricks Practice Exam System
-- This migration adds realistic questions covering all five exam topics

-- Clear existing sample data and add comprehensive question bank
DELETE FROM questions WHERE id LIKE 'q_%';
DELETE FROM questions WHERE id IN ('q_001_dlp_basics', 'q_002_dlt_pipeline', 'q_003_merge_operation');

-- Databricks Lakehouse Platform Questions
INSERT INTO questions (
    id, topic, subtopic, difficulty, question_text, code_example, options, 
    correct_answer, explanation, documentation_links, tags
) VALUES 
(
    'q_dlp_001',
    'Databricks Lakehouse Platform',
    'Architecture Overview',
    'easy',
    'What is the primary storage format used by Delta Lake in the Databricks Lakehouse Platform?',
    NULL,
    '["Parquet files with transaction logs", "JSON files with metadata", "Avro files with schemas", "ORC files with indexes"]',
    0,
    'Delta Lake uses Parquet files for data storage combined with transaction logs for ACID transactions. This provides the performance benefits of Parquet with the reliability of traditional databases.',
    '["https://docs.databricks.com/delta/index.html"]',
    '["delta-lake", "parquet", "architecture"]'
),
(
    'q_dlp_002',
    'Databricks Lakehouse Platform',
    'Compute Resources',
    'medium',
    'Which cluster mode is most appropriate for interactive data exploration and ad-hoc analysis?',
    NULL,
    '["All-purpose clusters", "Job clusters", "SQL warehouses", "Instance pools"]',
    0,
    'All-purpose clusters are designed for interactive workloads, data exploration, and development. They remain active until manually terminated and support multiple users and notebooks.',
    '["https://docs.databricks.com/clusters/index.html"]',
    '["clusters", "compute", "interactive"]'
),
(
    'q_dlp_003',
    'Databricks Lakehouse Platform',
    'Unity Catalog',
    'hard',
    'In Unity Catalog, what is the correct hierarchy for organizing data assets?',
    NULL,
    '["Metastore > Catalog > Schema > Table", "Workspace > Catalog > Database > Table", "Catalog > Database > Schema > Table", "Metastore > Database > Schema > Table"]',
    0,
    'Unity Catalog uses a three-level namespace: Metastore (top level) > Catalog > Schema > Table/View. This provides fine-grained access control and data governance across workspaces.',
    '["https://docs.databricks.com/data-governance/unity-catalog/index.html"]',
    '["unity-catalog", "governance", "hierarchy"]'
),

-- ELT with Spark SQL and Python Questions
(
    'q_elt_001',
    'ELT with Spark SQL and Python',
    'DataFrame Operations',
    'easy',
    'Which method is used to remove duplicate rows from a DataFrame in PySpark?',
    'df = spark.table("source_table")\nresult = df._____()',
    '["distinct()", "dropDuplicates()", "unique()", "deduplicate()"]',
    1,
    'The dropDuplicates() method removes duplicate rows from a DataFrame. The distinct() method also removes duplicates but dropDuplicates() allows specifying specific columns for deduplication.',
    '["https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.dropDuplicates.html"]',
    '["pyspark", "dataframe", "deduplication"]'
),
(
    'q_elt_002',
    'ELT with Spark SQL and Python',
    'SQL Functions',
    'medium',
    'What is the correct way to parse a JSON string column into individual columns using Spark SQL?',
    'SELECT customer_id, json_data FROM orders',
    '["json_extract(json_data, ''$.name'')", "get_json_object(json_data, ''$.name'')", "parse_json(json_data).name", "json_data.name"]',
    1,
    'The get_json_object() function is the standard Spark SQL function for extracting values from JSON strings. It takes the JSON column and a JSONPath expression.',
    '["https://spark.apache.org/docs/latest/api/sql/index.html#get_json_object"]',
    '["spark-sql", "json", "parsing"]'
),
(
    'q_elt_003',
    'ELT with Spark SQL and Python',
    'Window Functions',
    'hard',
    'Which window function would you use to assign a unique sequential number to rows within each partition?',
    'SELECT *, _____ OVER (PARTITION BY department ORDER BY salary DESC) as rank_num FROM employees',
    '["ROW_NUMBER()", "RANK()", "DENSE_RANK()", "NTILE()"]',
    0,
    'ROW_NUMBER() assigns unique sequential integers starting from 1 within each partition. Unlike RANK() and DENSE_RANK(), it never produces ties.',
    '["https://spark.apache.org/docs/latest/sql-ref-functions-builtin.html#window-functions"]',
    '["window-functions", "ranking", "spark-sql"]'
),

-- Incremental Data Processing Questions
(
    'q_idp_001',
    'Incremental Data Processing',
    'Structured Streaming',
    'easy',
    'What is the default output mode for structured streaming when writing to a Delta table?',
    NULL,
    '["append", "complete", "update", "overwrite"]',
    0,
    'The default output mode for structured streaming is "append", which adds new records to the target table. This is the most common mode for incremental data processing.',
    '["https://docs.databricks.com/structured-streaming/index.html"]',
    '["structured-streaming", "output-modes", "delta"]'
),
(
    'q_idp_002',
    'Incremental Data Processing',
    'Change Data Capture',
    'medium',
    'In a CDC scenario, which Delta Lake feature allows you to track all changes made to a table over time?',
    NULL,
    '["Change Data Feed", "Time Travel", "Schema Evolution", "Optimize"]',
    0,
    'Change Data Feed (CDF) in Delta Lake captures row-level changes (inserts, updates, deletes) and makes them available for downstream processing, enabling efficient CDC workflows.',
    '["https://docs.databricks.com/delta/delta-change-data-feed.html"]',
    '["cdc", "change-data-feed", "delta-lake"]'
),
(
    'q_idp_003',
    'Incremental Data Processing',
    'Merge Operations',
    'hard',
    'What happens when a MERGE operation encounters a record that exists in the source but not in the target, and no WHEN NOT MATCHED clause is specified?',
    'MERGE INTO target t USING source s ON t.id = s.id\nWHEN MATCHED THEN UPDATE SET *',
    '["The record is inserted into target", "The record is ignored", "An error is thrown", "The operation fails"]',
    1,
    'When no WHEN NOT MATCHED clause is specified, records that exist in source but not in target are simply ignored. The MERGE operation only processes the clauses that are explicitly defined.',
    '["https://docs.databricks.com/delta/merge.html"]',
    '["merge", "upsert", "delta-lake"]'
),

-- Production Pipelines Questions
(
    'q_pp_001',
    'Production Pipelines',
    'Delta Live Tables',
    'easy',
    'Which decorator is used to define a Delta Live Table in Python?',
    NULL,
    '["@dlt.table", "@delta.table", "@live.table", "@pipeline.table"]',
    0,
    'The @dlt.table decorator is used to define Delta Live Tables in Python. It automatically handles table creation, updates, and dependency management.',
    '["https://docs.databricks.com/delta-live-tables/index.html"]',
    '["delta-live-tables", "decorators", "python"]'
),
(
    'q_pp_002',
    'Production Pipelines',
    'Job Scheduling',
    'medium',
    'What is the recommended approach for handling job failures in Databricks workflows?',
    NULL,
    '["Configure retry policies and email notifications", "Use try-catch blocks in all code", "Schedule jobs more frequently", "Disable error handling"]',
    0,
    'Databricks workflows support built-in retry policies, timeout settings, and notification systems. This provides robust error handling without requiring code-level exception handling for infrastructure issues.',
    '["https://docs.databricks.com/workflows/index.html"]',
    '["workflows", "error-handling", "scheduling"]'
),
(
    'q_pp_003',
    'Production Pipelines',
    'Error Handling',
    'hard',
    'In Delta Live Tables, what is the purpose of the expect() function?',
    '@dlt.table\ndef clean_data():\n    return dlt.read("raw_data").filter(dlt.expect("valid_email", "email IS NOT NULL"))',
    '["Data quality constraints and filtering", "Exception handling", "Performance optimization", "Schema validation"]',
    0,
    'The expect() function in DLT defines data quality constraints. Records that fail the expectation can be dropped or quarantined, ensuring data quality in production pipelines.',
    '["https://docs.databricks.com/delta-live-tables/expectations.html"]',
    '["delta-live-tables", "data-quality", "expectations"]'
),

-- Data Governance Questions
(
    'q_dg_001',
    'Data Governance',
    'Access Control',
    'easy',
    'Which Unity Catalog privilege is required to read data from a table?',
    NULL,
    '["SELECT", "READ", "ACCESS", "VIEW"]',
    0,
    'The SELECT privilege in Unity Catalog grants the ability to read data from tables and views. This follows standard SQL privilege naming conventions.',
    '["https://docs.databricks.com/data-governance/unity-catalog/manage-privileges/index.html"]',
    '["unity-catalog", "privileges", "access-control"]'
),
(
    'q_dg_002',
    'Data Governance',
    'Data Lineage',
    'medium',
    'How does Unity Catalog automatically capture data lineage information?',
    NULL,
    '["Through SQL query parsing and execution tracking", "By manual annotation in notebooks", "Through external lineage tools only", "By scanning file system metadata"]',
    0,
    'Unity Catalog automatically captures lineage by parsing SQL queries and tracking data flow during execution. This provides automatic lineage without requiring manual intervention.',
    '["https://docs.databricks.com/data-governance/unity-catalog/data-lineage.html"]',
    '["unity-catalog", "lineage", "governance"]'
),
(
    'q_dg_003',
    'Data Governance',
    'Data Classification',
    'hard',
    'What is the purpose of column-level tags in Unity Catalog?',
    NULL,
    '["Classify sensitive data and apply policies", "Improve query performance", "Enable schema evolution", "Reduce storage costs"]',
    0,
    'Column-level tags in Unity Catalog are used to classify sensitive data (PII, PHI, etc.) and automatically apply governance policies like access restrictions and audit logging.',
    '["https://docs.databricks.com/data-governance/unity-catalog/tags.html"]',
    '["unity-catalog", "tags", "classification", "sensitive-data"]'
);

-- Add more questions for comprehensive coverage
INSERT INTO questions (
    id, topic, subtopic, difficulty, question_text, code_example, options, 
    correct_answer, explanation, documentation_links, tags
) VALUES 
-- Additional Production Pipelines questions
(
    'q_pp_004',
    'Production Pipelines',
    'Delta Live Tables',
    'medium',
    'What is the difference between @dlt.table and @dlt.view in Delta Live Tables?',
    NULL,
    '["Tables persist data, views are computed on-demand", "Tables are faster, views use less storage", "Tables support streaming, views do not", "No difference, they are aliases"]',
    0,
    'In DLT, @dlt.table creates materialized tables that persist data to storage, while @dlt.view creates logical views that are computed on-demand when referenced by downstream tables.',
    '["https://docs.databricks.com/delta-live-tables/index.html"]',
    '["delta-live-tables", "tables", "views"]'
),
(
    'q_pp_005',
    'Production Pipelines',
    'Pipeline Configuration',
    'hard',
    'Which configuration setting controls the maximum number of parallel tasks in a Delta Live Tables pipeline?',
    NULL,
    '["pipelines.maxConcurrentTasks", "spark.sql.adaptive.coalescePartitions.enabled", "pipelines.parallelism", "spark.databricks.delta.optimizeWrite.enabled"]',
    0,
    'The pipelines.maxConcurrentTasks setting controls how many tables can be processed in parallel within a DLT pipeline, affecting overall pipeline performance and resource utilization.',
    '["https://docs.databricks.com/delta-live-tables/settings.html"]',
    '["delta-live-tables", "configuration", "performance"]'
),

-- Additional Incremental Data Processing questions
(
    'q_idp_004',
    'Incremental Data Processing',
    'Watermarking',
    'medium',
    'What is the purpose of watermarking in structured streaming?',
    'df.withWatermark("timestamp", "10 minutes")',
    '["Handle late-arriving data in event time processing", "Optimize memory usage", "Improve query performance", "Enable schema evolution"]',
    0,
    'Watermarking in structured streaming defines how late data can arrive before being considered too late to process. It enables efficient stateful operations by allowing the engine to clean up old state.',
    '["https://docs.databricks.com/structured-streaming/watermarking.html"]',
    '["structured-streaming", "watermarking", "late-data"]'
),
(
    'q_idp_005',
    'Incremental Data Processing',
    'Checkpointing',
    'hard',
    'Why is checkpointing critical for structured streaming fault tolerance?',
    NULL,
    '["Stores processing progress and enables exactly-once semantics", "Improves query performance", "Reduces memory usage", "Enables schema evolution"]',
    0,
    'Checkpointing stores the processing progress and state of a streaming query, enabling exactly-once processing guarantees and fault tolerance by allowing recovery from the last checkpoint.',
    '["https://docs.databricks.com/structured-streaming/production.html"]',
    '["structured-streaming", "checkpointing", "fault-tolerance"]'
),

-- Additional Databricks Data Engineer Associate Exam Questions (50 more)

-- More Databricks Lakehouse Platform Questions
(
    'q_dlp_004',
    'Databricks Lakehouse Platform',
    'Workspace Management',
    'easy',
    'What is the primary purpose of Databricks Repos?',
    NULL,
    '["Version control integration for notebooks and code", "Data storage and management", "Cluster configuration management", "User access control"]',
    0,
    'Databricks Repos provides Git integration for version control of notebooks, Python files, and other code assets, enabling collaborative development and CI/CD workflows.',
    '["https://docs.databricks.com/repos/index.html"]',
    '["repos", "version-control", "git"]'
),
(
    'q_dlp_005',
    'Databricks Lakehouse Platform',
    'Cluster Configuration',
    'medium',
    'Which cluster configuration is most cost-effective for scheduled batch jobs?',
    NULL,
    '["Job clusters with auto-termination", "All-purpose clusters", "High-concurrency clusters", "Single-node clusters"]',
    0,
    'Job clusters are created for specific jobs and automatically terminate when the job completes, making them the most cost-effective option for scheduled batch processing.',
    '["https://docs.databricks.com/clusters/configure.html"]',
    '["clusters", "job-clusters", "cost-optimization"]'
),
(
    'q_dlp_006',
    'Databricks Lakehouse Platform',
    'DBFS',
    'medium',
    'What is the recommended approach for accessing files in DBFS from Spark?',
    NULL,
    '["Use dbfs:/ prefix in file paths", "Mount external storage first", "Use /dbfs/ prefix in file paths", "Access files directly without prefix"]',
    0,
    'When accessing DBFS from Spark APIs, use the dbfs:/ prefix. The /dbfs/ prefix is used for local file system access from driver nodes, not for Spark operations.',
    '["https://docs.databricks.com/dbfs/index.html"]',
    '["dbfs", "file-access", "spark"]'
),
(
    'q_dlp_007',
    'Databricks Lakehouse Platform',
    'Delta Lake Features',
    'hard',
    'What is the purpose of the _delta_log directory in a Delta table?',
    NULL,
    '["Stores transaction logs and metadata for ACID compliance", "Contains backup copies of data files", "Stores query execution plans", "Contains user access logs"]',
    0,
    'The _delta_log directory contains JSON files that record every transaction made to the Delta table, enabling ACID properties, time travel, and metadata management.',
    '["https://docs.databricks.com/delta/delta-intro.html"]',
    '["delta-lake", "transaction-log", "acid"]'
),

-- More ELT with Spark SQL and Python Questions
(
    'q_elt_004',
    'ELT with Spark SQL and Python',
    'Data Types',
    'easy',
    'Which Spark SQL data type should be used for storing JSON data?',
    NULL,
    '["STRING", "BINARY", "STRUCT", "MAP"]',
    0,
    'JSON data should be stored as STRING type in Spark SQL. You can then use JSON functions like get_json_object() or from_json() to parse and extract values.',
    '["https://spark.apache.org/docs/latest/sql-ref-datatypes.html"]',
    '["data-types", "json", "spark-sql"]'
),
(
    'q_elt_005',
    'ELT with Spark SQL and Python',
    'DataFrame Transformations',
    'medium',
    'Which method creates a new DataFrame with additional columns based on existing columns?',
    'df._____(col("price") * col("quantity").alias("total"))',
    '["withColumn()", "select()", "transform()", "mutate()"]',
    1,
    'The select() method creates a new DataFrame with specified columns, including computed columns. withColumn() adds a single column, while select() can add multiple columns at once.',
    '["https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.select.html"]',
    '["dataframe", "transformations", "pyspark"]'
),
(
    'q_elt_006',
    'ELT with Spark SQL and Python',
    'Aggregations',
    'medium',
    'What is the correct way to perform aggregations on multiple columns in PySpark?',
    NULL,
    '["df.groupBy("category").agg(sum("amount"), avg("price"))", "df.groupBy("category").sum("amount").avg("price")", "df.aggregate("category", sum("amount"), avg("price"))", "df.groupBy("category").apply(sum("amount"), avg("price"))"]',
    0,
    'The agg() method allows multiple aggregation functions to be applied in a single operation after groupBy(), making it more efficient than chaining individual aggregation methods.',
    '["https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.agg.html"]',
    '["aggregations", "groupby", "pyspark"]'
),
(
    'q_elt_007',
    'ELT with Spark SQL and Python',
    'Joins',
    'hard',
    'Which join type should be used when you want to keep all records from the left DataFrame even if there is no match in the right DataFrame?',
    'df1.join(df2, df1.id == df2.id, "____")',
    '["left", "right", "inner", "full"]',
    0,
    'A left join (or left outer join) keeps all records from the left DataFrame and includes matching records from the right DataFrame. Non-matching records from the right will have null values.',
    '["https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-join.html"]',
    '["joins", "left-join", "spark-sql"]'
),
(
    'q_elt_008',
    'ELT with Spark SQL and Python',
    'Performance Optimization',
    'hard',
    'What is the purpose of broadcast joins in Spark?',
    NULL,
    '["Optimize joins with small tables by broadcasting to all nodes", "Enable cross-cluster joins", "Improve write performance", "Enable real-time streaming joins"]',
    0,
    'Broadcast joins optimize performance by broadcasting small tables to all executor nodes, eliminating the need for shuffling large datasets during join operations.',
    '["https://spark.apache.org/docs/latest/sql-performance-tuning.html#broadcast-hint-for-sql-queries"]',
    '["broadcast-join", "performance", "optimization"]'
),

-- More Incremental Data Processing Questions
(
    'q_idp_006',
    'Incremental Data Processing',
    'Auto Loader',
    'easy',
    'What is the primary advantage of using Auto Loader for ingesting files?',
    NULL,
    '["Automatically processes new files as they arrive", "Faster file processing speed", "Better compression ratios", "Automatic schema inference only"]',
    0,
    'Auto Loader automatically detects and processes new files as they are added to cloud storage, making it ideal for incremental data ingestion without manual intervention.',
    '["https://docs.databricks.com/ingestion/auto-loader/index.html"]',
    '["auto-loader", "incremental", "file-ingestion"]'
),
(
    'q_idp_007',
    'Incremental Data Processing',
    'Delta Lake Time Travel',
    'medium',
    'Which SQL syntax is used to query a Delta table as it existed at a specific timestamp?',
    NULL,
    '["SELECT * FROM table_name TIMESTAMP AS OF ''2023-01-01''", "SELECT * FROM table_name AT TIME ''2023-01-01''", "SELECT * FROM table_name VERSION ''2023-01-01''", "SELECT * FROM table_name AS OF ''2023-01-01''"]',
    0,
    'The TIMESTAMP AS OF clause allows querying a Delta table at a specific point in time, enabling time travel queries for historical data analysis.',
    '["https://docs.databricks.com/delta/delta-batch.html#query-an-older-snapshot-of-a-table-time-travel"]',
    '["delta-lake", "time-travel", "versioning"]'
),
(
    'q_idp_008',
    'Incremental Data Processing',
    'Streaming Triggers',
    'medium',
    'What does the "once" trigger do in structured streaming?',
    'df.writeStream.trigger(once=True)',
    '["Processes all available data and stops", "Processes data continuously", "Processes data every hour", "Processes only new data"]',
    0,
    'The "once" trigger processes all available data in the stream and then stops, making it useful for batch-like processing of streaming data sources.',
    '["https://docs.databricks.com/structured-streaming/triggers.html"]',
    '["structured-streaming", "triggers", "batch-processing"]'
),
(
    'q_idp_009',
    'Incremental Data Processing',
    'Schema Evolution',
    'hard',
    'How does Delta Lake handle schema evolution when new columns are added to incoming data?',
    NULL,
    '["Automatically adds new columns if mergeSchema option is enabled", "Rejects all data with new columns", "Ignores new columns silently", "Requires manual schema updates first"]',
    0,
    'Delta Lake can automatically evolve the schema when the mergeSchema option is set to true, allowing new columns to be added without breaking existing pipelines.',
    '["https://docs.databricks.com/delta/delta-batch.html#automatic-schema-evolution"]',
    '["delta-lake", "schema-evolution", "mergeSchema"]'
),
(
    'q_idp_010',
    'Incremental Data Processing',
    'Optimize Operations',
    'hard',
    'What is the primary benefit of running OPTIMIZE on a Delta table?',
    'OPTIMIZE table_name',
    '["Compacts small files into larger ones for better performance", "Updates table statistics", "Removes old versions", "Repairs corrupted data"]',
    0,
    'OPTIMIZE compacts small files into larger ones, reducing the number of files and improving query performance by minimizing file overhead and enabling better parallelization.',
    '["https://docs.databricks.com/delta/optimize.html"]',
    '["delta-lake", "optimize", "file-compaction"]'
),

-- More Production Pipelines Questions
(
    'q_pp_006',
    'Production Pipelines',
    'DLT Expectations',
    'easy',
    'What happens to records that fail a DLT expectation with "drop invalid records" policy?',
    '@dlt.expect_or_drop("valid_email", "email IS NOT NULL")',
    '["Records are removed from the output", "Records are quarantined", "Pipeline fails", "Records are marked as invalid"]',
    0,
    'When using expect_or_drop(), records that fail the expectation are automatically removed from the output dataset, ensuring only valid data proceeds downstream.',
    '["https://docs.databricks.com/delta-live-tables/expectations.html"]',
    '["delta-live-tables", "expectations", "data-quality"]'
),
(
    'q_pp_007',
    'Production Pipelines',
    'Workflow Dependencies',
    'medium',
    'How do you specify that one job should run only after another job completes successfully?',
    NULL,
    '["Configure task dependencies in the workflow", "Use time-based scheduling", "Run jobs in the same cluster", "Use shared variables"]',
    0,
    'Databricks Workflows allow you to configure task dependencies, ensuring that downstream tasks only execute after upstream tasks complete successfully.',
    '["https://docs.databricks.com/workflows/index.html"]',
    '["workflows", "dependencies", "task-orchestration"]'
),
(
    'q_pp_008',
    'Production Pipelines',
    'DLT Pipeline Modes',
    'medium',
    'What is the difference between "Triggered" and "Continuous" pipeline modes in DLT?',
    NULL,
    '["Triggered runs once when started, Continuous runs indefinitely", "Triggered is faster, Continuous is more reliable", "Triggered uses less memory, Continuous uses less CPU", "No difference, they are aliases"]',
    0,
    'Triggered pipelines run once when manually started or scheduled, while Continuous pipelines run indefinitely, processing new data as it arrives.',
    '["https://docs.databricks.com/delta-live-tables/index.html"]',
    '["delta-live-tables", "pipeline-modes", "continuous"]'
),
(
    'q_pp_009',
    'Production Pipelines',
    'Error Handling',
    'hard',
    'Which DLT expectation function allows invalid records to be quarantined rather than dropped?',
    NULL,
    '["expect_or_fail()", "expect_or_drop()", "expect_all()", "expect_or_quarantine()"]',
    0,
    'expect_or_fail() causes the pipeline to fail when invalid records are encountered, but when combined with quarantine settings, invalid records can be stored separately for analysis.',
    '["https://docs.databricks.com/delta-live-tables/expectations.html"]',
    '["delta-live-tables", "expectations", "quarantine"]'
),
(
    'q_pp_010',
    'Production Pipelines',
    'Pipeline Monitoring',
    'hard',
    'What information is available in the DLT pipeline event log?',
    NULL,
    '["Data quality metrics, lineage, and execution details", "Only error messages", "Only performance metrics", "Only data lineage information"]',
    0,
    'The DLT event log captures comprehensive information including data quality metrics, lineage information, execution details, and performance statistics for monitoring and debugging.',
    '["https://docs.databricks.com/delta-live-tables/observability.html"]',
    '["delta-live-tables", "monitoring", "event-log"]'
),

-- More Data Governance Questions
(
    'q_dg_004',
    'Data Governance',
    'Unity Catalog Privileges',
    'easy',
    'Which privilege is required to create a new table in Unity Catalog?',
    NULL,
    '["CREATE TABLE on the schema", "CREATE on the catalog", "WRITE on the schema", "INSERT on the catalog"]',
    0,
    'The CREATE TABLE privilege on a schema allows users to create new tables within that schema. This follows the principle of least privilege access.',
    '["https://docs.databricks.com/data-governance/unity-catalog/manage-privileges/index.html"]',
    '["unity-catalog", "privileges", "create-table"]'
),
(
    'q_dg_005',
    'Data Governance',
    'External Locations',
    'medium',
    'What is the purpose of External Locations in Unity Catalog?',
    NULL,
    '["Define secure access to cloud storage paths", "Store table metadata", "Configure network access", "Manage user authentication"]',
    0,
    'External Locations in Unity Catalog define secure, governed access to specific cloud storage paths, enabling controlled access to external data sources.',
    '["https://docs.databricks.com/data-governance/unity-catalog/manage-external-locations-and-credentials.html"]',
    '["unity-catalog", "external-locations", "cloud-storage"]'
),
(
    'q_dg_006',
    'Data Governance',
    'Data Masking',
    'medium',
    'How can you implement column-level security in Unity Catalog?',
    NULL,
    '["Use dynamic views with conditional logic", "Encrypt columns at rest", "Use row-level security only", "Apply table-level permissions"]',
    0,
    'Dynamic views in Unity Catalog can implement column-level security by using conditional logic to mask or filter sensitive columns based on user identity or group membership.',
    '["https://docs.databricks.com/data-governance/unity-catalog/create-views.html"]',
    '["unity-catalog", "column-security", "dynamic-views"]'
),
(
    'q_dg_007',
    'Data Governance',
    'Audit Logging',
    'hard',
    'What types of activities are captured in Unity Catalog audit logs?',
    NULL,
    '["Data access, permission changes, and administrative actions", "Only data access events", "Only permission changes", "Only failed operations"]',
    0,
    'Unity Catalog audit logs capture comprehensive activities including data access patterns, permission changes, administrative actions, and security events for compliance and monitoring.',
    '["https://docs.databricks.com/administration-guide/account-settings/audit-logs.html"]',
    '["unity-catalog", "audit-logs", "compliance"]'
),
(
    'q_dg_008',
    'Data Governance',
    'Service Principals',
    'hard',
    'When should you use service principals instead of user accounts for data access?',
    NULL,
    '["For automated processes and applications", "For interactive data analysis", "For temporary access only", "For external user access"]',
    0,
    'Service principals should be used for automated processes, applications, and CI/CD pipelines where human user accounts are not appropriate or secure.',
    '["https://docs.databricks.com/administration-guide/users-groups/service-principals.html"]',
    '["service-principals", "automation", "security"]'
),

-- Additional Advanced Questions
(
    'q_dlp_008',
    'Databricks Lakehouse Platform',
    'Cluster Policies',
    'medium',
    'What is the primary purpose of cluster policies in Databricks?',
    NULL,
    '["Enforce governance and cost controls on cluster creation", "Improve cluster performance", "Enable cluster sharing", "Automate cluster scaling"]',
    0,
    'Cluster policies allow administrators to enforce governance rules, cost controls, and security requirements when users create clusters, ensuring compliance with organizational standards.',
    '["https://docs.databricks.com/administration-guide/clusters/policies.html"]',
    '["cluster-policies", "governance", "cost-control"]'
),
(
    'q_elt_009',
    'ELT with Spark SQL and Python',
    'Partitioning',
    'medium',
    'What is the recommended approach for partitioning Delta tables?',
    NULL,
    '["Partition by columns with low cardinality and even distribution", "Partition by all available columns", "Partition by high cardinality columns", "Avoid partitioning entirely"]',
    0,
    'Effective partitioning uses columns with low cardinality (few distinct values) and even distribution to avoid small files and skewed partitions that can hurt performance.',
    '["https://docs.databricks.com/delta/best-practices.html#choose-the-right-partition-column"]',
    '["partitioning", "delta-lake", "performance"]'
),
(
    'q_idp_011',
    'Incremental Data Processing',
    'Streaming State',
    'hard',
    'What happens to streaming state when a structured streaming query is restarted?',
    NULL,
    '["State is recovered from checkpoints", "State is lost and rebuilt", "State is stored in memory only", "State is automatically backed up"]',
    0,
    'Structured streaming maintains state information in checkpoints, allowing queries to recover their state when restarted, ensuring exactly-once processing guarantees.',
    '["https://docs.databricks.com/structured-streaming/production.html"]',
    '["structured-streaming", "state-management", "checkpoints"]'
),
(
    'q_pp_011',
    'Production Pipelines',
    'DLT Testing',
    'medium',
    'How can you test Delta Live Tables pipelines before production deployment?',
    NULL,
    '["Use development mode with sample data", "Test in production with small datasets", "Use unit tests only", "Manual testing is sufficient"]',
    0,
    'DLT pipelines can be tested in development mode using sample data, allowing validation of logic, data quality rules, and pipeline structure before production deployment.',
    '["https://docs.databricks.com/delta-live-tables/index.html"]',
    '["delta-live-tables", "testing", "development"]'
),
(
    'q_dg_009',
    'Data Governance',
    'Information Schema',
    'medium',
    'How can you discover available tables and their schemas in Unity Catalog?',
    NULL,
    '["Query the information_schema views", "Use DESCRIBE commands only", "Check DBFS directly", "Use external catalog tools"]',
    0,
    'Unity Catalog provides information_schema views that allow SQL-based discovery of catalogs, schemas, tables, columns, and their metadata through standard queries.',
    '["https://docs.databricks.com/data-governance/unity-catalog/information-schema.html"]',
    '["unity-catalog", "information-schema", "metadata"]'
),

-- Final set of questions to reach 50 additional
(
    'q_dlp_009',
    'Databricks Lakehouse Platform',
    'Secrets Management',
    'medium',
    'What is the recommended way to store database passwords in Databricks?',
    NULL,
    '["Use Databricks Secrets with secret scopes", "Store in notebook variables", "Include in cluster configuration", "Use environment variables"]',
    0,
    'Databricks Secrets provide secure storage for sensitive information like passwords and API keys, with secret scopes controlling access to different sets of secrets.',
    '["https://docs.databricks.com/security/secrets/index.html"]',
    '["secrets", "security", "credentials"]'
),
(
    'q_elt_010',
    'ELT with Spark SQL and Python',
    'UDFs',
    'hard',
    'What is a key limitation of Python UDFs compared to built-in Spark functions?',
    NULL,
    '["Cannot be optimized by Catalyst optimizer", "Cannot process null values", "Cannot return complex types", "Cannot be used in SQL"]',
    0,
    'Python UDFs cannot be optimized by the Catalyst optimizer because they are black boxes to Spark, potentially leading to performance issues compared to built-in functions.',
    '["https://spark.apache.org/docs/latest/sql-ref-functions-udf-scalar.html"]',
    '["udfs", "performance", "catalyst-optimizer"]'
),
(
    'q_idp_012',
    'Incremental Data Processing',
    'Vacuum Operations',
    'medium',
    'What is the purpose of the VACUUM command in Delta Lake?',
    'VACUUM table_name RETAIN 168 HOURS',
    '["Remove old data files that are no longer referenced", "Compress data files", "Update table statistics", "Repair corrupted files"]',
    0,
    'VACUUM removes old data files that are no longer referenced by the Delta table, helping to reduce storage costs while maintaining the ability to time travel within the retention period.',
    '["https://docs.databricks.com/delta/vacuum.html"]',
    '["delta-lake", "vacuum", "storage-cleanup"]'
),
(
    'q_pp_012',
    'Production Pipelines',
    'Job Clusters vs All-Purpose',
    'easy',
    'What is the main cost advantage of job clusters over all-purpose clusters?',
    NULL,
    '["Automatically terminate when job completes", "Use cheaper instance types", "Share resources across jobs", "Require less memory"]',
    0,
    'Job clusters automatically terminate when the associated job completes, eliminating idle time costs that can occur with all-purpose clusters that remain running.',
    '["https://docs.databricks.com/clusters/configure.html"]',
    '["job-clusters", "cost-optimization", "auto-termination"]'
),
(
    'q_dg_010',
    'Data Governance',
    'Row-Level Security',
    'hard',
    'How can you implement row-level security in Unity Catalog?',
    NULL,
    '["Create views with WHERE clauses based on current_user()", "Use table partitioning", "Apply column-level permissions", "Use external authorization systems only"]',
    0,
    'Row-level security can be implemented using views that include WHERE clauses with functions like current_user() or is_member() to filter rows based on user identity or group membership.',
    '["https://docs.databricks.com/data-governance/unity-catalog/create-views.html"]',
    '["unity-catalog", "row-level-security", "views"]'
),
(
    'q_dlp_010',
    'Databricks Lakehouse Platform',
    'Photon Engine',
    'medium',
    'What type of workloads benefit most from Photon acceleration?',
    NULL,
    '["SQL queries and DataFrame operations", "Machine learning training", "Graph processing", "Stream processing only"]',
    0,
    'Photon is optimized for SQL queries and DataFrame operations, providing significant performance improvements for analytical workloads and ETL processes.',
    '["https://docs.databricks.com/compute/photon.html"]',
    '["photon", "performance", "sql-acceleration"]'
),
(
    'q_elt_011',
    'ELT with Spark SQL and Python',
    'Caching',
    'medium',
    'When should you cache a DataFrame in Spark?',
    'df.cache()',
    '["When the DataFrame will be used multiple times", "For all DataFrames to improve performance", "Only for small DataFrames", "Never, caching hurts performance"]',
    0,
    'Caching is beneficial when a DataFrame will be accessed multiple times, as it stores the computed result in memory to avoid recomputation on subsequent actions.',
    '["https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-persistence"]',
    '["caching", "performance", "memory-management"]'
),
(
    'q_idp_013',
    'Incremental Data Processing',
    'Foreachbatch',
    'hard',
    'What is the purpose of foreachBatch in structured streaming?',
    'df.writeStream.foreachBatch(process_batch)',
    '["Apply custom logic to each micro-batch", "Improve streaming performance", "Enable parallel processing", "Reduce memory usage"]',
    0,
    'foreachBatch allows you to apply custom logic to each micro-batch in a streaming query, enabling complex operations that are not supported by standard streaming sinks.',
    '["https://docs.databricks.com/structured-streaming/foreach.html"]',
    '["structured-streaming", "foreachbatch", "custom-logic"]'
),
(
    'q_pp_013',
    'Production Pipelines',
    'Workflow Notifications',
    'easy',
    'How can you be notified when a Databricks job fails?',
    NULL,
    '["Configure email notifications in job settings", "Monitor logs manually", "Use external monitoring tools only", "Check job status periodically"]',
    0,
    'Databricks jobs support built-in email notifications that can be configured to alert on job success, failure, or both, providing immediate feedback on job status.',
    '["https://docs.databricks.com/workflows/jobs/create-run-jobs.html"]',
    '["workflows", "notifications", "monitoring"]'
),
(
    'q_dg_011',
    'Data Governance',
    'Catalog Explorer',
    'easy',
    'What information can you find in the Unity Catalog Explorer?',
    NULL,
    '["Table schemas, lineage, and sample data", "Only table names", "Only permissions", "Only usage statistics"]',
    0,
    'The Unity Catalog Explorer provides comprehensive information including table schemas, data lineage, sample data, usage statistics, and governance information in a unified interface.',
    '["https://docs.databricks.com/data-governance/unity-catalog/explore-data.html"]',
    '["unity-catalog", "catalog-explorer", "metadata"]'
);