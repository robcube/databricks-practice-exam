import { Router, Request, Response } from 'express';
import { QuestionService, QuestionCreateRequest, QuestionUpdateRequest } from '../services/QuestionService';
import { ExamTopic, QuestionDifficulty } from '../../../shared/types';
import { body, param, query as queryValidator, validationResult } from 'express-validator';

const router = Router();
const questionService = new QuestionService();

// Validation middleware
const validateQuestionCreate = [
  body('topic').isIn([
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ]).withMessage('Invalid topic'),
  body('subtopic').isLength({ min: 1 }).withMessage('Subtopic is required'),
  body('difficulty').isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
  body('questionText').isLength({ min: 10 }).withMessage('Question text must be at least 10 characters'),
  body('options').isArray({ min: 2, max: 6 }).withMessage('Must have 2-6 options'),
  body('correctAnswer').isInt({ min: 0 }).withMessage('Correct answer must be a valid index'),
  body('explanation').isLength({ min: 10 }).withMessage('Explanation must be at least 10 characters'),
  body('documentationLinks').optional().isArray(),
  body('tags').optional().isArray()
];

const validateQuestionUpdate = [
  body('topic').optional().isIn([
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ]).withMessage('Invalid topic'),
  body('subtopic').optional().isLength({ min: 1 }).withMessage('Subtopic cannot be empty'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
  body('questionText').optional().isLength({ min: 10 }).withMessage('Question text must be at least 10 characters'),
  body('options').optional().isArray({ min: 2, max: 6 }).withMessage('Must have 2-6 options'),
  body('correctAnswer').optional().isInt({ min: 0 }).withMessage('Correct answer must be a valid index'),
  body('explanation').optional().isLength({ min: 10 }).withMessage('Explanation must be at least 10 characters'),
  body('documentationLinks').optional().isArray(),
  body('tags').optional().isArray()
];

const validateQuestionId = [
  param('id').isLength({ min: 1 }).withMessage('Question ID is required')
];

const validateSearchParams = [
  queryValidator('topic').optional().isIn([
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ]).withMessage('Invalid topic'),
  queryValidator('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
  queryValidator('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  queryValidator('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  queryValidator('hasCodeExample').optional().isBoolean().withMessage('hasCodeExample must be a boolean')
];

// Error handling middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
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
router.get('/', validateSearchParams, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const {
      topic,
      subtopic,
      difficulty,
      tags,
      hasCodeExample,
      searchText,
      page = '1',
      pageSize = '20'
    } = req.query;

    const filters: any = {};
    if (topic) filters.topic = topic as ExamTopic;
    if (subtopic) filters.subtopic = subtopic as string;
    if (difficulty) filters.difficulty = difficulty as QuestionDifficulty;
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
    }
    if (hasCodeExample !== undefined) {
      filters.hasCodeExample = hasCodeExample === 'true';
    }
    if (searchText) filters.searchText = searchText as string;

    const result = await questionService.searchQuestions(
      filters,
      parseInt(page as string),
      parseInt(pageSize as string)
    );

    res.json(result);
  } catch (error) {
    console.error('Error searching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/stats - Get question bank statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await questionService.getTopicStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error getting question statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/validate - Validate question bank completeness
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const validation = await questionService.validateQuestionBank();
    res.json(validation);
  } catch (error) {
    console.error('Error validating question bank:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/topic/:topic - Get questions by topic
router.get('/topic/:topic', async (req: Request, res: Response) => {
  try {
    const { topic } = req.params;
    const { limit } = req.query;
    
    const questions = await questionService.getQuestionsByTopic(
      topic as ExamTopic,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(questions);
  } catch (error) {
    console.error('Error getting questions by topic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/difficulty/:difficulty - Get questions by difficulty
router.get('/difficulty/:difficulty', async (req: Request, res: Response) => {
  try {
    const { difficulty } = req.params;
    const { limit } = req.query;
    
    const questions = await questionService.getQuestionsByDifficulty(
      difficulty as QuestionDifficulty,
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(questions);
  } catch (error) {
    console.error('Error getting questions by difficulty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/with-code - Get questions with code examples
router.get('/with-code', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    
    const questions = await questionService.getQuestionsWithCodeExamples(
      limit ? parseInt(limit as string) : undefined
    );
    
    res.json(questions);
  } catch (error) {
    console.error('Error getting questions with code examples:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questions/study-mode - Get questions for study mode
router.post('/study-mode', async (req: Request, res: Response) => {
  try {
    const { topic, includeAnswers } = req.body;
    
    let questions;
    
    try {
      if (topic && topic !== 'all') {
        // Get questions for specific topic
        questions = await questionService.getQuestionsByTopic(topic as ExamTopic, 50);
      } else {
        // Get questions from all topics
        const result = await questionService.searchQuestions({}, 1, 50);
        questions = result.questions;
      }
    } catch (dbError) {
      console.warn('Database not available for study mode, using mock questions');
      // Fallback to mock questions when database is not available
      questions = await questionService.getQuestionsForExam('practice', 50);
    }
    
    // If includeAnswers is false, remove sensitive data
    if (!includeAnswers) {
      questions = questions.map(q => ({
        ...q,
        correctAnswer: undefined,
        explanation: undefined
      }));
    }
    
    res.json({ questions });
  } catch (error) {
    console.error('Error getting study mode questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questions/:id - Get question by ID
router.get('/:id', validateQuestionId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const question = await questionService.getQuestionById(id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Error getting question by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questions - Create new question
router.post('/', validateQuestionCreate, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const questionData: QuestionCreateRequest = req.body;
    const question = await questionService.createQuestion(questionData);
    
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    if (error instanceof Error && error.message.includes('validation failed')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// PUT /api/questions/:id - Update question
router.put('/:id', validateQuestionId, validateQuestionUpdate, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: QuestionUpdateRequest = req.body;
    
    const question = await questionService.updateQuestion(id, updateData);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    if (error instanceof Error && error.message.includes('validation failed')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// DELETE /api/questions/:id - Delete question
router.delete('/:id', validateQuestionId, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await questionService.deleteQuestion(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;