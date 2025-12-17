-- Create study_goals table for Databricks Practice Exam System
-- This table stores user study goals and targets

CREATE TABLE IF NOT EXISTS study_goals (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    topic VARCHAR(100) NOT NULL CHECK (topic IN (
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python', 
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
    )),
    target_score INTEGER NOT NULL CHECK (target_score >= 0 AND target_score <= 100),
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_deadline_future CHECK (deadline IS NULL OR deadline > created_at)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_topic ON study_goals(topic);
CREATE INDEX IF NOT EXISTS idx_study_goals_deadline ON study_goals(deadline);
CREATE INDEX IF NOT EXISTS idx_study_goals_created_at ON study_goals(created_at);