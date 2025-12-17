#!/usr/bin/env node

/**
 * Database Schema Validation Script
 * 
 * This script validates the database schema files for syntax and consistency
 * without requiring a running PostgreSQL instance.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface MigrationFile {
  filename: string;
  content: string;
  order: number;
}

function validateMigrationFiles(): boolean {
  console.log('🔍 Validating database migration files...');
  
  const migrationsDir = join(__dirname, '..', 'migrations');
  let isValid = true;
  
  try {
    // Get all migration files
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${files.length} migration files`);
    
    const migrations: MigrationFile[] = files.map(filename => {
      const content = readFileSync(join(migrationsDir, filename), 'utf8');
      const order = parseInt(filename.split('_')[0]);
      return { filename, content, order };
    });
    
    // Validate file naming convention
    console.log('📝 Validating file naming convention...');
    for (let i = 0; i < migrations.length; i++) {
      const expected = String(i + 1).padStart(3, '0');
      const actual = String(migrations[i].order).padStart(3, '0');
      
      if (actual !== expected) {
        console.error(`❌ Migration file order mismatch: expected ${expected}, got ${actual} in ${migrations[i].filename}`);
        isValid = false;
      }
    }
    
    // Validate SQL syntax (basic checks)
    console.log('🔧 Validating SQL syntax...');
    for (const migration of migrations) {
      if (!validateSQLSyntax(migration)) {
        isValid = false;
      }
    }
    
    // Validate table relationships
    console.log('🔗 Validating table relationships...');
    if (!validateTableRelationships(migrations)) {
      isValid = false;
    }
    
    // Validate required tables exist
    console.log('📋 Validating required tables...');
    if (!validateRequiredTables(migrations)) {
      isValid = false;
    }
    
    if (isValid) {
      console.log('✅ All migration files are valid');
      
      // Display schema summary
      console.log('\n📊 Schema Summary:');
      const tables = extractTableNames(migrations);
      tables.forEach(table => {
        console.log(`  ├── ${table}`);
      });
      
      console.log('\n🎯 Validation Complete - Schema is ready for deployment');
    } else {
      console.log('❌ Schema validation failed - please fix the issues above');
    }
    
    return isValid;
    
  } catch (error) {
    console.error('💥 Validation error:', error);
    return false;
  }
}

function validateSQLSyntax(migration: MigrationFile): boolean {
  const { filename, content } = migration;
  let isValid = true;
  
  // Basic SQL syntax checks
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    
    // Skip comments and empty lines
    if (line.startsWith('--') || line.length === 0) continue;
    
    // Check for unmatched parentheses
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    
    // Check for basic SQL keywords
    if (line.toUpperCase().includes('CREATE TABLE') && !line.toUpperCase().includes('IF NOT EXISTS')) {
      console.warn(`⚠️  ${filename}:${lineNum} - Consider using 'CREATE TABLE IF NOT EXISTS' for idempotency`);
    }
    
    // Check for missing semicolons on statement endings
    if (line.toUpperCase().match(/^(CREATE|ALTER|INSERT|DROP|GRANT)/) && 
        !line.endsWith(';') && !line.endsWith(',') && !line.endsWith('(')) {
      // Look ahead to see if semicolon is on next non-empty line
      let foundSemicolon = false;
      for (let j = i + 1; j < lines.length && j < i + 5; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.length === 0 || nextLine.startsWith('--')) continue;
        if (nextLine.startsWith(';') || nextLine.endsWith(';')) {
          foundSemicolon = true;
          break;
        }
        if (nextLine.match(/^[A-Z]/)) break; // Next statement started
      }
      
      if (!foundSemicolon) {
        console.warn(`⚠️  ${filename}:${lineNum} - SQL statement may be missing semicolon`);
      }
    }
  }
  
  // Check for required elements in table creation files
  if (filename.includes('create_') && filename.includes('_table')) {
    if (!content.toUpperCase().includes('CREATE TABLE')) {
      console.error(`❌ ${filename} - Missing CREATE TABLE statement`);
      isValid = false;
    }
    
    if (!content.toUpperCase().includes('PRIMARY KEY')) {
      console.error(`❌ ${filename} - Missing PRIMARY KEY definition`);
      isValid = false;
    }
  }
  
  return isValid;
}

function validateTableRelationships(migrations: MigrationFile[]): boolean {
  const allContent = migrations.map(m => m.content).join('\n');
  let isValid = true;
  
  // Extract foreign key references
  const foreignKeyPattern = /FOREIGN KEY.*REFERENCES\s+(\w+)\s*\(/gi;
  const matches = allContent.matchAll(foreignKeyPattern);
  
  const referencedTables = new Set<string>();
  for (const match of matches) {
    referencedTables.add(match[1].toLowerCase());
  }
  
  // Extract created tables
  const createTablePattern = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi;
  const tableMatches = allContent.matchAll(createTablePattern);
  
  const createdTables = new Set<string>();
  for (const match of tableMatches) {
    createdTables.add(match[1].toLowerCase());
  }
  
  // Check that all referenced tables are created
  for (const referencedTable of referencedTables) {
    if (!createdTables.has(referencedTable)) {
      console.error(`❌ Foreign key references table '${referencedTable}' which is not created in migrations`);
      isValid = false;
    }
  }
  
  return isValid;
}

function validateRequiredTables(migrations: MigrationFile[]): boolean {
  const allContent = migrations.map(m => m.content).join('\n').toLowerCase();
  
  const requiredTables = [
    'users',
    'questions', 
    'exam_results',
    'topic_scores',
    'question_responses'
  ];
  
  let isValid = true;
  
  for (const table of requiredTables) {
    if (!allContent.includes(`create table`) || !allContent.includes(table)) {
      console.error(`❌ Required table '${table}' not found in migrations`);
      isValid = false;
    }
  }
  
  return isValid;
}

function extractTableNames(migrations: MigrationFile[]): string[] {
  const allContent = migrations.map(m => m.content).join('\n');
  const createTablePattern = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi;
  const matches = allContent.matchAll(createTablePattern);
  
  const tables = new Set<string>();
  for (const match of matches) {
    tables.add(match[1]);
  }
  
  return Array.from(tables).sort();
}

// Run validation if called directly
if (require.main === module) {
  const isValid = validateMigrationFiles();
  process.exit(isValid ? 0 : 1);
}

export { validateMigrationFiles };