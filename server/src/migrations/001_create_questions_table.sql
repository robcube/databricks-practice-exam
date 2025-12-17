-- Create questions table for Databricks Practice Exam System
-- This table stores all exam questions with topic categorization and metadata

CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(255) PRIMARY KEY,
    topic VARCHAR(100) NOT NULL CHECK (topic IN (
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python', 
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
    )),
    subtopic VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text TEXT NOT NULL CHECK (LENGTH(question_text) >= 10),
    code_example TEXT,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0),
    explanation TEXT NOT NULL CHECK (LENGTH(explanation) >= 10),
    documentation_links JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_subtopic ON questions(subtopic);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_questions_updated_at ON questions(updated_at);

-- Create GIN index for JSONB columns to support tag searches
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_questions_documentation_links ON questions USING GIN(documentation_links);

-- Create full-text search index for question content
CREATE INDEX IF NOT EXISTS idx_questions_search ON questions USING GIN(
    to_tsvector('english', question_text || ' ' || explanation || ' ' || subtopic)
);

-- Add constraint to ensure options array has at least 2 elements
ALTER TABLE questions ADD CONSTRAINT check_options_count 
    CHECK (jsonb_array_length(options) >= 2 AND jsonb_array_length(options) <= 6);

-- Add constraint to ensure correct_answer is valid for the options array
ALTER TABLE questions ADD CONSTRAINT check_correct_answer_valid 
    CHECK (correct_answer < jsonb_array_length(options));

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample questions for testing
INSERT INTO questions (
    id, topic, subtopic, difficulty, question_text, code_example, options, 
    correct_answer, explanation, documentation_links, tags
) VALUES 
(
    'q_001_dlp_basics',
    'Databricks Lakehouse Platform',
    'Architecture Overview',
    'easy',
    'What is the primary benefit of the Databricks Lakehouse Platform compared to traditional data warehouses?',
    NULL,
    '["Combines the best of data lakes and data warehouses", "Only supports structured data", "Requires separate systems for analytics and ML", "Limited to batch processing only"]',
    0,
    'The Databricks Lakehouse Platform combines the flexibility and cost-effectiveness of data lakes with the performance and reliability of data warehouses, enabling unified analytics and ML on all data types.',
    '["https://docs.databricks.com/lakehouse/index.html"]',
    '["architecture", "lakehouse", "basics"]'
),
(
    'q_002_dlt_pipeline',
    'Production Pipelines',
    'Delta Live Tables',
    'medium',
    'Which Delta Live Tables function is used to create a streaming table that processes data incrementally?',
    'import dlt\n\n@dlt.table\ndef my_table():\n    return spark.readStream.table("source_table")',
    '["dlt.table()", "dlt.view()", "dlt.streaming_table()", "dlt.create_table()"]',
    0,
    'The @dlt.table decorator is used to create Delta Live Tables. When combined with readStream, it creates a streaming table that processes data incrementally. The dlt.streaming_table() function does not exist.',
    '["https://docs.databricks.com/delta-live-tables/index.html"]',
    '["delta-live-tables", "streaming", "pipeline"]'
),
(
    'q_003_merge_operation',
    'Incremental Data Processing',
    'Merge Operations',
    'hard',
    'In a Delta Lake MERGE operation, what happens when a record exists in both source and target tables but no WHEN MATCHED clause is specified?',
    'MERGE INTO target_table t\nUSING source_table s\nON t.id = s.id\nWHEN NOT MATCHED THEN INSERT *',
    '["The record is updated with source values", "The record is deleted from target", "The record remains unchanged in target", "An error is thrown"]',
    2,
    'When no WHEN MATCHED clause is specified in a MERGE operation, records that exist in both source and target tables remain unchanged in the target table. Only the WHEN NOT MATCHED clause will be executed for new records.',
    '["https://docs.databricks.com/delta/merge.html"]',
    '["merge", "delta-lake", "incremental", "upsert"]'
);