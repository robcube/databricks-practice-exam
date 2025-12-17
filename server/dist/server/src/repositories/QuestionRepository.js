"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionRepository = void 0;
const database_1 = require("../config/database");
const Question_1 = require("../models/Question");
class QuestionRepository {
    async create(questionData) {
        const question = new Question_1.QuestionModel(questionData);
        const insertQuery = `
      INSERT INTO questions (
        id, topic, subtopic, difficulty, question_text, code_example,
        options, correct_answer, explanation, documentation_links, tags,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
        const values = [
            question.id,
            question.topic,
            question.subtopic,
            question.difficulty,
            question.questionText,
            question.codeExample,
            JSON.stringify(question.options),
            question.correctAnswer,
            question.explanation,
            JSON.stringify(question.documentationLinks),
            JSON.stringify(question.tags),
            question.createdAt,
            question.updatedAt
        ];
        const result = await (0, database_1.query)(insertQuery, values);
        return this.mapRowToQuestion(result.rows[0]);
    }
    async findById(id) {
        const selectQuery = 'SELECT * FROM questions WHERE id = $1';
        const result = await (0, database_1.query)(selectQuery, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToQuestion(result.rows[0]);
    }
    async findByIds(ids) {
        if (ids.length === 0) {
            return [];
        }
        // Create placeholders for the IN clause
        const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
        const selectQuery = `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY created_at DESC`;
        const result = await (0, database_1.query)(selectQuery, ids);
        return result.rows.map((row) => this.mapRowToQuestion(row));
    }
    async findAll(filters, options) {
        let selectQuery = 'SELECT * FROM questions';
        const conditions = [];
        const values = [];
        let paramCount = 0;
        // Apply filters
        if (filters) {
            if (filters.topic) {
                conditions.push(`topic = $${++paramCount}`);
                values.push(filters.topic);
            }
            if (filters.subtopic) {
                conditions.push(`subtopic ILIKE $${++paramCount}`);
                values.push(`%${filters.subtopic}%`);
            }
            if (filters.difficulty) {
                conditions.push(`difficulty = $${++paramCount}`);
                values.push(filters.difficulty);
            }
            if (filters.hasCodeExample !== undefined) {
                if (filters.hasCodeExample) {
                    conditions.push('code_example IS NOT NULL');
                }
                else {
                    conditions.push('code_example IS NULL');
                }
            }
            if (filters.tags && filters.tags.length > 0) {
                conditions.push(`tags::jsonb ?| $${++paramCount}`);
                values.push(filters.tags);
            }
            if (filters.searchText) {
                conditions.push(`(
          question_text ILIKE $${++paramCount} OR 
          explanation ILIKE $${paramCount} OR 
          subtopic ILIKE $${paramCount}
        )`);
                values.push(`%${filters.searchText}%`);
            }
        }
        if (conditions.length > 0) {
            selectQuery += ' WHERE ' + conditions.join(' AND ');
        }
        // Apply sorting
        if (options?.sortBy) {
            const sortColumn = this.mapSortColumn(options.sortBy);
            const sortOrder = options.sortOrder || 'DESC';
            selectQuery += ` ORDER BY ${sortColumn} ${sortOrder}`;
        }
        else {
            selectQuery += ' ORDER BY created_at DESC';
        }
        // Apply pagination
        if (options?.limit) {
            selectQuery += ` LIMIT $${++paramCount}`;
            values.push(options.limit);
        }
        if (options?.offset) {
            selectQuery += ` OFFSET $${++paramCount}`;
            values.push(options.offset);
        }
        const result = await (0, database_1.query)(selectQuery, values);
        return result.rows.map((row) => this.mapRowToQuestion(row));
    }
    async update(id, updateData) {
        const existingQuestion = await this.findById(id);
        if (!existingQuestion) {
            return null;
        }
        // Create updated question model for validation
        const updatedQuestion = new Question_1.QuestionModel({
            ...existingQuestion,
            ...updateData,
            id: existingQuestion.id, // Preserve original ID
            updatedAt: new Date()
        });
        const updateQuery = `
      UPDATE questions SET
        topic = $2,
        subtopic = $3,
        difficulty = $4,
        question_text = $5,
        code_example = $6,
        options = $7,
        correct_answer = $8,
        explanation = $9,
        documentation_links = $10,
        tags = $11,
        updated_at = $12
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            id,
            updatedQuestion.topic,
            updatedQuestion.subtopic,
            updatedQuestion.difficulty,
            updatedQuestion.questionText,
            updatedQuestion.codeExample,
            JSON.stringify(updatedQuestion.options),
            updatedQuestion.correctAnswer,
            updatedQuestion.explanation,
            JSON.stringify(updatedQuestion.documentationLinks),
            JSON.stringify(updatedQuestion.tags),
            updatedQuestion.updatedAt
        ];
        const result = await (0, database_1.query)(updateQuery, values);
        return this.mapRowToQuestion(result.rows[0]);
    }
    async delete(id) {
        const deleteQuery = 'DELETE FROM questions WHERE id = $1';
        const result = await (0, database_1.query)(deleteQuery, [id]);
        return result.rowCount > 0;
    }
    async count(filters) {
        let countQuery = 'SELECT COUNT(*) FROM questions';
        const conditions = [];
        const values = [];
        let paramCount = 0;
        // Apply same filters as findAll
        if (filters) {
            if (filters.topic) {
                conditions.push(`topic = $${++paramCount}`);
                values.push(filters.topic);
            }
            if (filters.subtopic) {
                conditions.push(`subtopic ILIKE $${++paramCount}`);
                values.push(`%${filters.subtopic}%`);
            }
            if (filters.difficulty) {
                conditions.push(`difficulty = $${++paramCount}`);
                values.push(filters.difficulty);
            }
            if (filters.hasCodeExample !== undefined) {
                if (filters.hasCodeExample) {
                    conditions.push('code_example IS NOT NULL');
                }
                else {
                    conditions.push('code_example IS NULL');
                }
            }
            if (filters.tags && filters.tags.length > 0) {
                conditions.push(`tags::jsonb ?| $${++paramCount}`);
                values.push(filters.tags);
            }
            if (filters.searchText) {
                conditions.push(`(
          question_text ILIKE $${++paramCount} OR 
          explanation ILIKE $${paramCount} OR 
          subtopic ILIKE $${paramCount}
        )`);
                values.push(`%${filters.searchText}%`);
            }
        }
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const result = await (0, database_1.query)(countQuery, values);
        return parseInt(result.rows[0].count);
    }
    async findByTopic(topic, limit) {
        return this.findAll({ topic }, { limit });
    }
    async findByDifficulty(difficulty, limit) {
        return this.findAll({ difficulty }, { limit });
    }
    async findByTags(tags, limit) {
        return this.findAll({ tags }, { limit });
    }
    async findWithCodeExamples(limit) {
        return this.findAll({ hasCodeExample: true }, { limit });
    }
    mapRowToQuestion(row) {
        return {
            id: row.id,
            topic: row.topic,
            subtopic: row.subtopic,
            difficulty: row.difficulty,
            questionText: row.question_text,
            codeExample: row.code_example,
            options: JSON.parse(row.options),
            correctAnswer: row.correct_answer,
            explanation: row.explanation,
            documentationLinks: JSON.parse(row.documentation_links),
            tags: JSON.parse(row.tags),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    mapSortColumn(sortBy) {
        const columnMap = {
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'difficulty': 'difficulty',
            'topic': 'topic'
        };
        return columnMap[sortBy] || 'created_at';
    }
}
exports.QuestionRepository = QuestionRepository;
//# sourceMappingURL=QuestionRepository.js.map