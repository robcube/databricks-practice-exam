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
            '001_create_questions_table.sql'
        ];
        for (const migration of migrations) {
            await this.runMigration(migration);
        }
    }
}
exports.MigrationRunner = MigrationRunner;
//# sourceMappingURL=migrationRunner.js.map