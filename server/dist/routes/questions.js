"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const QuestionService_1 = require("../services/QuestionService");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const questionService = new QuestionService_1.QuestionService();
// Validation middleware
const validateQuestionCreate = [
    (0, express_validator_1.body)('topic').isIn([
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python',
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
    ]).withMessage('Invalid topic'),
    (0, express_validator_1.body)('subtopic').isLength({ min: 1 }).withMessage('Subtopic is required'),
    (0, express_validator_1.body)('difficulty').isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
    (0, express_validator_1.body)('questionText').isLength({ min: 10 }).withMessage('Question text must be at least 10 characters'),
    (0, express_validator_1.body)('options').isArray({ min: 2, max: 6 }).withMessage('Must have 2-6 options'),
    (0, express_validator_1.body)('correctAnswer').isInt({ min: 0 }).withMessage('Correct answer must be a valid index'),
    (0, express_validator_1.body)('explanation').isLength({ min: 10 }).withMessage('Explanation must be at least 10 characters'),
    (0, express_validator_1.body)('documentationLinks').optional().isArray(),
    (0, express_validator_1.body)('tags').optional().isArray()
];
const validateQuestionUpdate = [
    (0, express_validator_1.body)('topic').optional().isIn([
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python',
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
    ]).withMessage('Invalid topic'),
    (0, express_validator_1.body)('subtopic').optional().isLength({ min: 1 }).withMessage('Subtopic cannot be empty'),
    (0, express_validator_1.body)('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
    (0, express_validator_1.body)('questionText').optional().isLength({ min: 10 }).withMessage('Question text must be at least 10 characters'),
    (0, express_validator_1.body)('options').optional().isArray({ min: 2, max: 6 }).withMessage('Must have 2-6 options'),
    (0, express_validator_1.body)('correctAnswer').optional().isInt({ min: 0 }).withMessage('Correct answer must be a valid index'),
    (0, express_validator_1.body)('explanation').optional().isLength({ min: 10 }).withMessage('Explanation must be at least 10 characters'),
    (0, express_validator_1.body)('documentationLinks').optional().isArray(),
    (0, express_validator_1.body)('tags').optional().isArray()
];
const validateQuestionId = [
    (0, express_validator_1.param)('id').isLength({ min: 1 }).withMessage('Question ID is required')
];
const validateSearchParams = [
    (0, express_validator_1.query)('topic').optional().isIn([
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python',
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
    ]).withMessage('Invalid topic'),
    (0, express_validator_1.query)('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
    (0, express_validator_1.query)('hasCodeExample').optional().isBoolean().withMessage('hasCodeExample must be a boolean')
];
// Error handling middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
// Routes
// GET /api/questions - Search and filter questions
router.get('/', validateSearchParams, handleValidationErrors, async (req, res) => {
    try {
        const { topic, subtopic, difficulty, tags, hasCodeExample, searchText, page = '1', pageSize = '20' } = req.query;
        const filters = {};
        if (topic)
            filters.topic = topic;
        if (subtopic)
            filters.subtopic = subtopic;
        if (difficulty)
            filters.difficulty = difficulty;
        if (tags) {
            filters.tags = Array.isArray(tags) ? tags : [tags];
        }
        if (hasCodeExample !== undefined) {
            filters.hasCodeExample = hasCodeExample === 'true';
        }
        if (searchText)
            filters.searchText = searchText;
        const result = await questionService.searchQuestions(filters, parseInt(page), parseInt(pageSize));
        res.json(result);
    }
    catch (error) {
        console.error('Error searching questions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/questions/stats - Get question bank statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await questionService.getTopicStatistics();
        res.json(stats);
    }
    catch (error) {
        console.error('Error getting question statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/questions/validate - Validate question bank completeness
router.get('/validate', async (req, res) => {
    try {
        const validation = await questionService.validateQuestionBank();
        res.json(validation);
    }
    catch (error) {
        console.error('Error validating question bank:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/questions/topic/:topic - Get questions by topic
router.get('/topic/:topic', async (req, res) => {
    try {
        const { topic } = req.params;
        const { limit } = req.query;
        const questions = await questionService.getQuestionsByTopic(topic, limit ? parseInt(limit) : undefined);
        res.json(questions);
    }
    catch (error) {
        console.error('Error getting questions by topic:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/questions/difficulty/:difficulty - Get questions by difficulty
router.get('/difficulty/:difficulty', async (req, res) => {
    try {
        const { difficulty } = req.params;
        const { limit } = req.query;
        const questions = await questionService.getQuestionsByDifficulty(difficulty, limit ? parseInt(limit) : undefined);
        res.json(questions);
    }
    catch (error) {
        console.error('Error getting questions by difficulty:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/questions/with-code - Get questions with code examples
router.get('/with-code', async (req, res) => {
    try {
        const { limit } = req.query;
        const questions = await questionService.getQuestionsWithCodeExamples(limit ? parseInt(limit) : undefined);
        res.json(questions);
    }
    catch (error) {
        console.error('Error getting questions with code examples:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/questions/:id - Get question by ID
router.get('/:id', validateQuestionId, handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const question = await questionService.getQuestionById(id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json(question);
    }
    catch (error) {
        console.error('Error getting question by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/questions - Create new question
router.post('/', validateQuestionCreate, handleValidationErrors, async (req, res) => {
    try {
        const questionData = req.body;
        const question = await questionService.createQuestion(questionData);
        res.status(201).json(question);
    }
    catch (error) {
        console.error('Error creating question:', error);
        if (error instanceof Error && error.message.includes('validation failed')) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
// PUT /api/questions/:id - Update question
router.put('/:id', validateQuestionId, validateQuestionUpdate, handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const question = await questionService.updateQuestion(id, updateData);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json(question);
    }
    catch (error) {
        console.error('Error updating question:', error);
        if (error instanceof Error && error.message.includes('validation failed')) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
// DELETE /api/questions/:id - Delete question
router.delete('/:id', validateQuestionId, handleValidationErrors, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await questionService.deleteQuestion(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=questions.js.map