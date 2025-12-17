import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../config/database';

export class MigrationRunner {
  
  async runMigration(migrationFile: string): Promise<void> {
    try {
      const migrationPath = join(__dirname, '..', 'migrations', migrationFile);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        await query(statement);
      }
      
      console.log(`Migration ${migrationFile} executed successfully`);
    } catch (error) {
      console.error(`Migration ${migrationFile} failed:`, error);
      throw error;
    }
  }

  async runAllMigrations(): Promise<void> {
    const migrations = [
      '001_create_questions_table.sql',
      '002_create_users_table.sql',
      '003_create_study_goals_table.sql',
      '004_create_exam_results_table.sql',
      '005_create_topic_scores_table.sql',
      '006_create_question_responses_table.sql',
      '007_create_question_feedback_table.sql',
      '008_create_exam_sessions_table.sql',
      '009_seed_question_bank.sql',
      '010_performance_optimizations.sql'
    ];

    for (const migration of migrations) {
      await this.runMigration(migration);
    }
  }
}