"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const database_1 = require("../config/database");
class MigrationRunner {
    async runMigration(migrationFile) {
        try {
            const migrationPath = (0, path_1.join)(__dirname, '..', 'migrations', migrationFile);
            const migrationSQL = (0, fs_1.readFileSync)(migrationPath, 'utf8');
            // Split by semicolon and execute each statement
            const statements = migrationSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);
            for (const statement of statements) {
                await (0, database_1.query)(statement);
            }
            console.log(`Migration ${migrationFile} executed successfully`);
        }
        catch (error) {
            console.error(`Migration ${migrationFile} failed:`, error);
            throw error;
        }
    }
    async runAllMigrations() {
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
exports.MigrationRunner = MigrationRunner;
//# sourceMappingURL=migrationRunner.js.map