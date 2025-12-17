-- Create exam_sessions table for Databricks Practice Exam System
-- This table stores active exam sessions for state persistence

CREATE TABLE IF NOT EXISTS exam_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('practice', 'assessment')),
    question_ids JSONB NOT NULL,
    current_question_index INTEGER NOT NULL DEFAULT 0 CHECK (current_question_index >= 0),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    time_remaining INTEGER NOT NULL CHECK (time_remaining >= 0), -- in seconds
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_question_ids_array CHECK (jsonb_array_length(question_ids) > 0),
    CONSTRAINT check_current_question_valid CHECK (current_question_index < jsonb_array_length(question_ids))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_is_completed ON exam_sessions(is_completed);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_start_time ON exam_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_updated_at ON exam_sessions(updated_at);

-- Create composite index for active session queries
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_active ON exam_sessions(user_id, is_completed, updated_at DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_exam_sessions_updated_at 
    BEFORE UPDATE ON exam_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();