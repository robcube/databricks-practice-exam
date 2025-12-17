-- Create question_responses table for Databricks Practice Exam System
-- This table stores individual question responses within exams

CREATE TABLE IF NOT EXISTS question_responses (
    id SERIAL PRIMARY KEY,
    exam_result_id VARCHAR(255) NOT NULL,
    question_id VARCHAR(255) NOT NULL,
    selected_answer INTEGER NOT NULL CHECK (selected_answer >= 0),
    is_correct BOOLEAN NOT NULL,
    time_spent INTEGER NOT NULL CHECK (time_spent >= 0), -- in seconds
    answered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY (exam_result_id) REFERENCES exam_results(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_question_responses_exam_result_id ON question_responses(exam_result_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_question_id ON question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_question_responses_is_correct ON question_responses(is_correct);
CREATE INDEX IF NOT EXISTS idx_question_responses_answered_at ON question_responses(answered_at);

-- Create composite index for performance analysis
CREATE INDEX IF NOT EXISTS idx_question_responses_question_correct ON question_responses(question_id, is_correct);