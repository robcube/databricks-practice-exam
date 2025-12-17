"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionService = void 0;
const QuestionRepository_1 = require("../repositories/QuestionRepository");
const Question_1 = require("../models/Question");
class QuestionService {
    constructor() {
        this.questionRepository = new QuestionRepository_1.QuestionRepository();
    }
    async createQuestion(questionData) {
        // Validate question data
        const validationErrors = (0, Question_1.validateQuestion)(questionData);
        if (validationErrors.length > 0) {
            throw new Error(`Question validation failed: ${validationErrors.join(', ')}`);
        }
        // Ensure required fields for Production Pipelines and Incremental Data Processing
        this.validateTopicSpecificRequirements(questionData);
        return await this.questionRepository.create(questionData);
    }
    async getQuestionById(id) {
        if (!id || typeof id !== 'string') {
            throw new Error('Question ID is required and must be a string');
        }
        return await this.questionRepository.findById(id);
    }
    async getQuestionsByIds(ids) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new Error('Question IDs array is required and must not be empty');
        }
        // Validate all IDs are strings
        if (!ids.every(id => typeof id === 'string' && id.trim().length > 0)) {
            throw new Error('All question IDs must be non-empty strings');
        }
        return await this.questionRepository.findByIds(ids);
    }
    async updateQuestion(id, updateData) {
        if (!id || typeof id !== 'string') {
            throw new Error('Question ID is required and must be a string');
        }
        // If updating validation-critical fields, validate the complete updated question
        if (this.hasValidationCriticalFields(updateData)) {
            const existingQuestion = await this.questionRepository.findById(id);
            if (!existingQuestion) {
                return null;
            }
            const updatedQuestionData = { ...existingQuestion, ...updateData };
            const validationErrors = (0, Question_1.validateQuestion)(updatedQuestionData);
            if (validationErrors.length > 0) {
                throw new Error(`Question validation failed: ${validationErrors.join(', ')}`);
            }
            this.validateTopicSpecificRequirements(updatedQuestionData);
        }
        return await this.questionRepository.update(id, updateData);
    }
    async deleteQuestion(id) {
        if (!id || typeof id !== 'string') {
            throw new Error('Question ID is required and must be a string');
        }
        return await this.questionRepository.delete(id);
    }
    async searchQuestions(filters, page = 1, pageSize = 20) {
        if (page < 1) {
            throw new Error('Page number must be greater than 0');
        }
        if (pageSize < 1 || pageSize > 100) {
            throw new Error('Page size must be between 1 and 100');
        }
        const offset = (page - 1) * pageSize;
        const options = {
            limit: pageSize,
            offset: offset,
            sortBy: 'createdAt',
            sortOrder: 'DESC'
        };
        const [questions, total] = await Promise.all([
            this.questionRepository.findAll(filters, options),
            this.questionRepository.count(filters)
        ]);
        const totalPages = Math.ceil(total / pageSize);
        return {
            questions,
            total,
            page,
            pageSize,
            totalPages
        };
    }
    async getQuestionsByTopic(topic, limit) {
        return await this.questionRepository.findByTopic(topic, limit);
    }
    async getQuestionsByDifficulty(difficulty, limit) {
        return await this.questionRepository.findByDifficulty(difficulty, limit);
    }
    async getQuestionsWithCodeExamples(limit) {
        return await this.questionRepository.findWithCodeExamples(limit);
    }
    async getQuestionsByTags(tags, limit) {
        if (!tags || tags.length === 0) {
            throw new Error('At least one tag is required');
        }
        return await this.questionRepository.findByTags(tags, limit);
    }
    async getQuestionsForExam(examType, questionCount = 50) {
        // For now, get a balanced selection of questions across all topics
        // This could be enhanced with adaptive selection based on user performance
        const questionsPerTopic = Math.floor(questionCount / 5); // 5 topics
        const remainingQuestions = questionCount % 5;
        const topics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        const selectedQuestions = [];
        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            const topicQuestionCount = questionsPerTopic + (i < remainingQuestions ? 1 : 0);
            const topicQuestions = await this.getQuestionsByTopic(topic, topicQuestionCount * 2); // Get more than needed for randomization
            // Shuffle and take the required number
            const shuffled = this.shuffleArray([...topicQuestions]);
            selectedQuestions.push(...shuffled.slice(0, topicQuestionCount));
        }
        // Final shuffle of all selected questions
        return this.shuffleArray(selectedQuestions);
    }
    async getTopicStatistics() {
        const allQuestions = await this.questionRepository.findAll();
        const stats = {};
        allQuestions.forEach(question => {
            if (!stats[question.topic]) {
                stats[question.topic] = {
                    total: 0,
                    byDifficulty: { easy: 0, medium: 0, hard: 0 }
                };
            }
            stats[question.topic].total++;
            stats[question.topic].byDifficulty[question.difficulty]++;
        });
        return stats;
    }
    async validateQuestionBank() {
        const issues = [];
        // Check if we have questions for all topics
        const requiredTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        for (const topic of requiredTopics) {
            const topicQuestions = await this.getQuestionsByTopic(topic);
            if (topicQuestions.length === 0) {
                issues.push(`No questions found for topic: ${topic}`);
            }
            else if (topicQuestions.length < 5) {
                issues.push(`Insufficient questions for topic: ${topic} (${topicQuestions.length} found, minimum 5 recommended)`);
            }
        }
        // Check for Production Pipelines specific content
        const productionPipelineQuestions = await this.getQuestionsByTopic('Production Pipelines');
        const hasDeltaliveTables = productionPipelineQuestions.some(q => q.questionText.toLowerCase().includes('delta live tables') ||
            q.codeExample?.toLowerCase().includes('delta live tables'));
        const hasJobScheduling = productionPipelineQuestions.some(q => q.questionText.toLowerCase().includes('job') && q.questionText.toLowerCase().includes('schedul'));
        const hasErrorHandling = productionPipelineQuestions.some(q => q.questionText.toLowerCase().includes('error') ||
            q.questionText.toLowerCase().includes('exception'));
        if (!hasDeltaliveTables) {
            issues.push('Production Pipelines topic missing Delta Live Tables scenarios');
        }
        if (!hasJobScheduling) {
            issues.push('Production Pipelines topic missing job scheduling scenarios');
        }
        if (!hasErrorHandling) {
            issues.push('Production Pipelines topic missing error handling scenarios');
        }
        // Check for Incremental Data Processing specific content
        const incrementalQuestions = await this.getQuestionsByTopic('Incremental Data Processing');
        const hasMergeOperations = incrementalQuestions.some(q => q.questionText.toLowerCase().includes('merge') ||
            q.codeExample?.toLowerCase().includes('merge'));
        const hasCDC = incrementalQuestions.some(q => q.questionText.toLowerCase().includes('change data capture') ||
            q.questionText.toLowerCase().includes('cdc'));
        const hasStreaming = incrementalQuestions.some(q => q.questionText.toLowerCase().includes('stream') ||
            q.codeExample?.toLowerCase().includes('stream'));
        if (!hasMergeOperations) {
            issues.push('Incremental Data Processing topic missing merge operations scenarios');
        }
        if (!hasCDC) {
            issues.push('Incremental Data Processing topic missing change data capture scenarios');
        }
        if (!hasStreaming) {
            issues.push('Incremental Data Processing topic missing streaming scenarios');
        }
        return {
            isValid: issues.length === 0,
            issues
        };
    }
    validateTopicSpecificRequirements(questionData) {
        // Validate Production Pipelines questions have appropriate content
        if (questionData.topic === 'Production Pipelines') {
            const hasRelevantContent = questionData.questionText?.toLowerCase().includes('delta live tables') ||
                questionData.questionText?.toLowerCase().includes('job') ||
                questionData.questionText?.toLowerCase().includes('pipeline') ||
                questionData.questionText?.toLowerCase().includes('error') ||
                questionData.codeExample?.toLowerCase().includes('dlt') ||
                questionData.codeExample?.toLowerCase().includes('pipeline');
            if (!hasRelevantContent) {
                throw new Error('Production Pipelines questions must include relevant scenarios (Delta Live Tables, job scheduling, error handling)');
            }
        }
        // Validate Incremental Data Processing questions have appropriate content
        if (questionData.topic === 'Incremental Data Processing') {
            const hasRelevantContent = questionData.questionText?.toLowerCase().includes('merge') ||
                questionData.questionText?.toLowerCase().includes('incremental') ||
                questionData.questionText?.toLowerCase().includes('stream') ||
                questionData.questionText?.toLowerCase().includes('cdc') ||
                questionData.questionText?.toLowerCase().includes('change data capture') ||
                questionData.codeExample?.toLowerCase().includes('merge') ||
                questionData.codeExample?.toLowerCase().includes('stream');
            if (!hasRelevantContent) {
                throw new Error('Incremental Data Processing questions must include relevant scenarios (merge operations, CDC, streaming)');
            }
        }
    }
    hasValidationCriticalFields(updateData) {
        const criticalFields = ['questionText', 'options', 'correctAnswer', 'explanation', 'topic', 'difficulty'];
        return criticalFields.some(field => field in updateData);
    }
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}
exports.QuestionService = QuestionService;
//# sourceMappingURL=QuestionService.js.map