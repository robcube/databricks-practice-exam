#!/usr/bin/env node

/**
 * Database Initialization Script for Databricks Practice Exam System
 * 
 * This script initializes the complete database schema including:
 * - All data model tables (users, questions, exam_results, etc.)
 * - Indexes for performance optimization
 * - Seed data for initial question bank
 * - Foreign key constraints and data validation
 */

import { testConnection, closePool } from '../config/database';
import { MigrationRunner } from '../utils/migrationRunner';

async function initializeDatabase(): Promise<void> {
  console.log('🚀 Starting database initialization...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to database. Please check your configuration.');
    }
    
    console.log('✅ Database connection successful');
    
    // Run all migrations
    console.log('📋 Running database migrations...');
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runAllMigrations();
    
    console.log('✅ All migrations completed successfully');
    console.log('🎉 Database initialization complete!');
    
    // Display summary
    console.log('\n📊 Database Schema Summary:');
    console.log('  ├── users - User accounts and authentication');
    console.log('  ├── study_goals - User study targets and deadlines');
    console.log('  ├── questions - Question bank with 20+ sample questions');
    console.log('  ├── exam_results - Completed exam performance data');
    console.log('  ├── topic_scores - Performance breakdown by topic');
    console.log('  ├── question_responses - Individual question answers');
    console.log('  ├── question_feedback - User feedback on questions');
    console.log('  └── exam_sessions - Active exam state persistence');
    
    console.log('\n🔧 Performance Optimizations:');
    console.log('  ├── Indexes on all foreign keys and query columns');
    console.log('  ├── Composite indexes for complex queries');
    console.log('  ├── GIN indexes for JSONB columns');
    console.log('  └── Full-text search indexes for question content');
    
    console.log('\n📝 Data Validation:');
    console.log('  ├── Email format validation');
    console.log('  ├── Topic and difficulty constraints');
    console.log('  ├── Score and percentage range checks');
    console.log('  └── Referential integrity with foreign keys');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await closePool();
    console.log('🔌 Database connection closed');
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✨ Database ready for Databricks Practice Exam System!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

export { initializeDatabase };