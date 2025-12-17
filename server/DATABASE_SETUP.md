# Database Setup Guide

This guide explains how to set up the PostgreSQL database for the Databricks Practice Exam System.

## Prerequisites

1. **PostgreSQL Installation**
   - Install PostgreSQL 12 or higher
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql postgresql-contrib`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Node.js Dependencies**
   - Ensure all npm dependencies are installed: `npm install`

## Database Setup Steps

### 1. Start PostgreSQL Service

**macOS (Homebrew):**
```bash
brew services start postgresql
```

**Ubuntu/Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
- Start PostgreSQL service from Services panel or pgAdmin

### 2. Create Database and User

Connect to PostgreSQL as superuser:
```bash
psql -U postgres
```

Create the database and user:
```sql
-- Create database
CREATE DATABASE databricks_practice_exam;

-- Create user (optional, you can use postgres user)
CREATE USER exam_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE databricks_practice_exam TO exam_user;

-- Exit psql
\q
```

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Update `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=databricks_practice_exam
DB_USER=postgres  # or exam_user if you created one
DB_PASSWORD=your_password_here
```

### 4. Initialize Database Schema

Run the database initialization script:
```bash
npm run db:init
```

This will:
- Test database connection
- Create all required tables
- Add indexes for performance
- Insert seed data with 20+ sample questions
- Set up data validation constraints

### 5. Verify Setup

Check that tables were created successfully:
```bash
psql -U postgres -d databricks_practice_exam -c "\dt"
```

You should see these tables:
- `users`
- `study_goals`
- `questions`
- `exam_results`
- `topic_scores`
- `question_responses`
- `question_feedback`
- `exam_sessions`

## Database Schema Overview

### Core Tables

1. **users** - User accounts and authentication
2. **questions** - Question bank with 20+ sample questions covering all 5 exam topics
3. **exam_results** - Completed exam performance data
4. **topic_scores** - Performance breakdown by topic for each exam
5. **question_responses** - Individual question answers within exams
6. **study_goals** - User-defined study targets and deadlines
7. **question_feedback** - User feedback on questions for improvement
8. **exam_sessions** - Active exam state for persistence and recovery

### Performance Features

- **Indexes**: Optimized for common query patterns
- **Constraints**: Data validation and referential integrity
- **Functions**: Built-in performance calculation utilities
- **JSONB Support**: Efficient storage for arrays and metadata

### Sample Data

The initialization includes realistic questions covering:
- **Databricks Lakehouse Platform** (3 questions)
- **ELT with Spark SQL and Python** (3 questions)
- **Incremental Data Processing** (5 questions)
- **Production Pipelines** (5 questions)
- **Data Governance** (3 questions)

## Troubleshooting

### Connection Issues

1. **PostgreSQL not running:**
   ```bash
   # Check status
   brew services list | grep postgresql  # macOS
   sudo systemctl status postgresql      # Linux
   
   # Start service
   brew services start postgresql        # macOS
   sudo systemctl start postgresql       # Linux
   ```

2. **Authentication failed:**
   - Check username/password in `.env`
   - Verify user exists: `psql -U postgres -c "\du"`
   - Reset password if needed

3. **Database doesn't exist:**
   ```bash
   createdb -U postgres databricks_practice_exam
   ```

### Migration Issues

1. **Re-run migrations:**
   ```bash
   npm run db:migrate
   ```

2. **Reset database completely:**
   ```bash
   # Drop and recreate database
   psql -U postgres -c "DROP DATABASE IF EXISTS databricks_practice_exam;"
   psql -U postgres -c "CREATE DATABASE databricks_practice_exam;"
   
   # Re-initialize
   npm run db:init
   ```

### Performance Issues

1. **Check indexes:**
   ```sql
   SELECT schemaname, tablename, indexname 
   FROM pg_indexes 
   WHERE schemaname = 'public';
   ```

2. **Analyze query performance:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM questions WHERE topic = 'Production Pipelines';
   ```

## Development Commands

- `npm run db:init` - Initialize complete database schema
- `npm run db:migrate` - Run migrations only
- `npm run db:reset` - Alias for db:init (full reset)

## Production Considerations

1. **Security:**
   - Use strong passwords
   - Enable SSL connections
   - Restrict network access
   - Regular security updates

2. **Performance:**
   - Monitor query performance
   - Regular VACUUM and ANALYZE
   - Consider connection pooling
   - Backup strategy

3. **Scaling:**
   - Read replicas for heavy read workloads
   - Partitioning for large tables
   - Connection pooling (PgBouncer)
   - Monitoring and alerting