-- Performance optimizations and additional indexes for Databricks Practice Exam System
-- This migration adds specialized indexes for common query patterns

-- Create materialized view for user performance summary (if supported)
-- Note: PostgreSQL supports materialized views for better performance on complex aggregations

-- Add partial indexes for active sessions (only index non-completed sessions)
CREATE INDEX IF NOT EXISTS idx_exam_sessions_active 
    ON exam_sessions(user_id, updated_at DESC) 
    WHERE is_completed = FALSE;

-- Add expression index for email domain analysis
CREATE INDEX IF NOT EXISTS idx_users_email_domain 
    ON users(LOWER(SPLIT_PART(email, '@', 2)));

-- Add index for recent exam results (last 30 days)
CREATE INDEX IF NOT EXISTS idx_exam_results_recent 
    ON exam_results(user_id, start_time DESC) 
    WHERE start_time >= CURRENT_DATE - INTERVAL '30 days';

-- Add index for weak topic identification (scores below 70%)
CREATE INDEX IF NOT EXISTS idx_topic_scores_weak 
    ON topic_scores(topic, exam_result_id) 
    WHERE percentage < 70;

-- Add index for question difficulty distribution
CREATE INDEX IF NOT EXISTS idx_questions_topic_difficulty 
    ON questions(topic, difficulty, created_at);

-- Add covering index for question selection queries
CREATE INDEX IF NOT EXISTS idx_questions_selection 
    ON questions(topic, difficulty, id) 
    INCLUDE (question_text, options, correct_answer);

-- Add index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_users_activity 
    ON users(last_login_at DESC, created_at) 
    WHERE last_login_at >= CURRENT_DATE - INTERVAL '7 days';

-- Add constraint to ensure exam sessions don't exceed maximum time (90 minutes = 5400 seconds)
ALTER TABLE exam_sessions 
ADD CONSTRAINT check_time_remaining_valid 
CHECK (time_remaining <= 5400);

-- Add constraint to ensure reasonable time spent per question (max 10 minutes = 600 seconds)
ALTER TABLE question_responses 
ADD CONSTRAINT check_time_spent_reasonable 
CHECK (time_spent <= 600);

-- Add constraint to ensure exam results have reasonable duration (max 2 hours = 7200 seconds)
ALTER TABLE exam_results 
ADD CONSTRAINT check_exam_duration_reasonable 
CHECK (time_spent <= 7200);

-- Create function to calculate user performance statistics
CREATE OR REPLACE FUNCTION calculate_user_performance_stats(user_id_param VARCHAR)
RETURNS TABLE(
    total_exams INTEGER,
    avg_score DECIMAL(5,2),
    best_score DECIMAL(5,2),
    worst_score DECIMAL(5,2),
    avg_time_per_question DECIMAL(8,2),
    weak_topics TEXT[],
    strong_topics TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH exam_stats AS (
        SELECT 
            COUNT(*) as total_exams,
            AVG(CAST(correct_answers AS DECIMAL) / total_questions * 100) as avg_score,
            MAX(CAST(correct_answers AS DECIMAL) / total_questions * 100) as best_score,
            MIN(CAST(correct_answers AS DECIMAL) / total_questions * 100) as worst_score,
            AVG(CAST(time_spent AS DECIMAL) / total_questions) as avg_time_per_question
        FROM exam_results 
        WHERE user_id = user_id_param
    ),
    topic_performance AS (
        SELECT 
            ts.topic,
            AVG(ts.percentage) as avg_percentage
        FROM topic_scores ts
        JOIN exam_results er ON ts.exam_result_id = er.id
        WHERE er.user_id = user_id_param
        GROUP BY ts.topic
    )
    SELECT 
        es.total_exams::INTEGER,
        es.avg_score,
        es.best_score,
        es.worst_score,
        es.avg_time_per_question,
        ARRAY(SELECT topic FROM topic_performance WHERE avg_percentage < 70) as weak_topics,
        ARRAY(SELECT topic FROM topic_performance WHERE avg_percentage >= 80) as strong_topics
    FROM exam_stats es;
END;
$$ LANGUAGE plpgsql;

-- Create function to get adaptive question allocation
CREATE OR REPLACE FUNCTION get_adaptive_question_allocation(user_id_param VARCHAR)
RETURNS TABLE(
    topic VARCHAR(100),
    allocation_percentage INTEGER,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_performance AS (
        SELECT 
            ts.topic,
            AVG(ts.percentage) as avg_score,
            COUNT(*) as exam_count
        FROM topic_scores ts
        JOIN exam_results er ON ts.exam_result_id = er.id
        WHERE er.user_id = user_id_param
        AND er.start_time >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY ts.topic
    ),
    topic_priorities AS (
        SELECT 
            topic,
            CASE 
                WHEN avg_score < 50 THEN 30  -- High priority for very weak areas
                WHEN avg_score < 70 THEN 20  -- Medium-high priority for weak areas
                WHEN avg_score < 80 THEN 15  -- Medium priority for moderate areas
                ELSE 10                      -- Low priority for strong areas
            END as base_allocation,
            CASE 
                WHEN avg_score < 50 THEN 'Critical weak area - needs immediate attention'
                WHEN avg_score < 70 THEN 'Below target - requires focused practice'
                WHEN avg_score < 80 THEN 'Approaching mastery - maintain practice'
                ELSE 'Strong area - light maintenance'
            END as reason
        FROM recent_performance
    ),
    normalized_allocation AS (
        SELECT 
            topic,
            ROUND(base_allocation * 100.0 / SUM(base_allocation) OVER()) as allocation_percentage,
            reason
        FROM topic_priorities
    )
    SELECT * FROM normalized_allocation
    UNION ALL
    -- Add default allocation for topics with no history
    SELECT 
        t.topic_name::VARCHAR(100),
        20 as allocation_percentage,
        'No performance history - balanced allocation' as reason
    FROM (VALUES 
        ('Databricks Lakehouse Platform'),
        ('ELT with Spark SQL and Python'),
        ('Incremental Data Processing'),
        ('Production Pipelines'),
        ('Data Governance')
    ) AS t(topic_name)
    WHERE t.topic_name NOT IN (SELECT topic FROM recent_performance);
END;
$$ LANGUAGE plpgsql;