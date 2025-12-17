-- Create topic_scores table for Databricks Practice Exam System
-- This table stores performance breakdown by topic for each exam

CREATE TABLE IF NOT EXISTS topic_scores (
    id SERIAL PRIMARY KEY,
    exam_result_id VARCHAR(255) NOT NULL,
    topic VARCHAR(100) NOT NULL CHECK (topic IN (
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python', 
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
    )),
    total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
    correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    average_time DECIMAL(8,2) NOT NULL CHECK (average_time >= 0), -- in seconds
    FOREIGN KEY (exam_result_id) REFERENCES exam_results(id) ON DELETE CASCADE,
    CONSTRAINT check_correct_answers_valid CHECK (correct_answers <= total_questions),
    UNIQUE(exam_result_id, topic)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_topic_scores_exam_result_id ON topic_scores(exam_result_id);
CREATE INDEX IF NOT EXISTS idx_topic_scores_topic ON topic_scores(topic);
CREATE INDEX IF NOT EXISTS idx_topic_scores_percentage ON topic_scores(percentage);

-- Create composite index for performance analysis
CREATE INDEX IF NOT EXISTS idx_topic_scores_topic_percentage ON topic_scores(topic, percentage DESC);