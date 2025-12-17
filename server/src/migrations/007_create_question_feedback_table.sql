-- Create question_feedback table for Databricks Practice Exam System
-- This table stores user feedback on questions for improvement

CREATE TABLE IF NOT EXISTS question_feedback (
    id VARCHAR(255) PRIMARY KEY,
    question_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('incorrect', 'unclear', 'outdated', 'suggestion')),
    message TEXT NOT NULL CHECK (LENGTH(message) >= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_question_feedback_question_id ON question_feedback(question_id);
CREATE INDEX IF NOT EXISTS idx_question_feedback_user_id ON question_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_question_feedback_feedback_type ON question_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_question_feedback_created_at ON question_feedback(created_at);

-- Create composite index for question feedback analysis
CREATE INDEX IF NOT EXISTS idx_question_feedback_question_type ON question_feedback(question_id, feedback_type);