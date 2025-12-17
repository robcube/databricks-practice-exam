-- Create exam_results table for Databricks Practice Exam System
-- This table stores completed exam results and performance data

CREATE TABLE IF NOT EXISTS exam_results (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('practice', 'assessment')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_questions INTEGER NOT NULL CHECK (total_questions >= 0),
    correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
    time_spent INTEGER NOT NULL CHECK (time_spent >= 0), -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_end_after_start CHECK (end_time > start_time),
    CONSTRAINT check_correct_answers_valid CHECK (correct_answers <= total_questions)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_type ON exam_results(exam_type);
CREATE INDEX IF NOT EXISTS idx_exam_results_start_time ON exam_results(start_time);
CREATE INDEX IF NOT EXISTS idx_exam_results_created_at ON exam_results(created_at);

-- Create composite index for user performance queries
CREATE INDEX IF NOT EXISTS idx_exam_results_user_start ON exam_results(user_id, start_time DESC);