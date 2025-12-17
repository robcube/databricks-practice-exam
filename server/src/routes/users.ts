import express, { Request, Response, NextFunction } from 'express';
import { param, body, query as queryValidator, validationResult } from 'express-validator';
import { User as UserModel } from '../models/User';
import { ExamResultModel } from '../models/ExamResult';
import { authenticateToken, users } from './auth';

const router = express.Router();

// Validation middleware
const validateUserId = [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required')
];

const validateStudyGoal = [
  body('topic').isIn([
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ]).withMessage('Invalid topic'),
  body('targetScore').isInt({ min: 0, max: 100 }).withMessage('Target score must be between 0 and 100'),
  body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date')
];

// Error handling middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * GET /api/users/:userId
 * Get user profile by ID (admin or self only)
 */
router.get('/:userId', validateUserId, handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only access their own profile (in production, add admin role check)
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own profile.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        studyGoals: user.studyGoals,
        examHistory: user.examHistory
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      error: 'Failed to get user'
    });
  }
});

/**
 * GET /api/users/:userId/exam-history
 * Get user's exam history with optional filtering
 */
router.get('/:userId/exam-history', validateUserId, handleValidationErrors, authenticateToken, [
  queryValidator('examType').optional().isIn(['practice', 'assessment']).withMessage('Invalid exam type'),
  queryValidator('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  queryValidator('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;
    const { examType, limit = '20', offset = '0' } = req.query;

    // Users can only access their own exam history
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own exam history.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    let examHistory = user.examHistory;

    // Filter by exam type if specified
    if (examType) {
      examHistory = examHistory.filter((exam: any) => exam.examType === examType);
    }

    // Apply pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedHistory = examHistory
      .sort((a: any, b: any) => b.startTime.getTime() - a.startTime.getTime()) // Most recent first
      .slice(offsetNum, offsetNum + limitNum);

    res.json({
      examHistory: paginatedHistory,
      total: examHistory.length,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    console.error('Error getting exam history:', error);
    res.status(500).json({
      error: 'Failed to get exam history'
    });
  }
});

/**
 * POST /api/users/:userId/exam-results
 * Add exam result to user's history
 */
router.post('/:userId/exam-results', validateUserId, handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only add results to their own history
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only add results to your own history.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Create exam result from request body
    const examResult = new ExamResultModel(req.body);
    
    // Note: ExamResult validation is handled in the constructor
    // In a real implementation, you might want to add explicit validation here

    // Add to user's exam history
    user.addExamResult(examResult);

    res.status(201).json({
      message: 'Exam result added successfully',
      examResult: examResult.toJSON()
    });
  } catch (error) {
    console.error('Error adding exam result:', error);
    res.status(500).json({
      error: 'Failed to add exam result'
    });
  }
});

/**
 * GET /api/users/:userId/study-goals
 * Get user's study goals
 */
router.get('/:userId/study-goals', validateUserId, handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only access their own study goals
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own study goals.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      studyGoals: user.studyGoals
    });
  } catch (error) {
    console.error('Error getting study goals:', error);
    res.status(500).json({
      error: 'Failed to get study goals'
    });
  }
});

/**
 * POST /api/users/:userId/study-goals
 * Add a new study goal
 */
router.post('/:userId/study-goals', validateUserId, validateStudyGoal, handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only add study goals to their own profile
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only add study goals to your own profile.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const { topic, targetScore, deadline } = req.body;

    // Check if study goal for this topic already exists
    const existingGoal = user.studyGoals.find((goal: any) => goal.topic === topic);
    if (existingGoal) {
      return res.status(409).json({
        error: 'Study goal for this topic already exists'
      });
    }

    const studyGoal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      topic,
      targetScore,
      deadline: deadline ? new Date(deadline) : undefined,
      createdAt: new Date()
    };

    user.addStudyGoal(studyGoal);

    res.status(201).json({
      message: 'Study goal added successfully',
      studyGoal
    });
  } catch (error) {
    console.error('Error adding study goal:', error);
    res.status(500).json({
      error: 'Failed to add study goal'
    });
  }
});

/**
 * PUT /api/users/:userId/study-goals/:goalId
 * Update a study goal
 */
router.put('/:userId/study-goals/:goalId', validateUserId, [
  param('goalId').isLength({ min: 1 }).withMessage('Goal ID is required'),
  body('targetScore').optional().isInt({ min: 0, max: 100 }).withMessage('Target score must be between 0 and 100'),
  body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date'),
  // body('isCompleted').optional().isBoolean().withMessage('isCompleted must be a boolean')
], handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId, goalId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only update their own study goals
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only update your own study goals.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const goalIndex = user.studyGoals.findIndex((goal: any) => goal.id === goalId);
    if (goalIndex === -1) {
      return res.status(404).json({
        error: 'Study goal not found'
      });
    }

    const { targetScore, deadline } = req.body;
    const goal = user.studyGoals[goalIndex];

    if (targetScore !== undefined) {
      goal.targetScore = targetScore;
    }
    if (deadline !== undefined) {
      goal.deadline = new Date(deadline);
    }
    // Note: isCompleted is not part of the StudyGoal interface
    // This would need to be handled differently in a real implementation

    res.json({
      message: 'Study goal updated successfully',
      studyGoal: goal
    });
  } catch (error) {
    console.error('Error updating study goal:', error);
    res.status(500).json({
      error: 'Failed to update study goal'
    });
  }
});

/**
 * DELETE /api/users/:userId/study-goals/:goalId
 * Delete a study goal
 */
router.delete('/:userId/study-goals/:goalId', validateUserId, [
  param('goalId').isLength({ min: 1 }).withMessage('Goal ID is required')
], handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId, goalId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only delete their own study goals
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only delete your own study goals.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const goalIndex = user.studyGoals.findIndex((goal: any) => goal.id === goalId);
    if (goalIndex === -1) {
      return res.status(404).json({
        error: 'Study goal not found'
      });
    }

    user.studyGoals.splice(goalIndex, 1);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting study goal:', error);
    res.status(500).json({
      error: 'Failed to delete study goal'
    });
  }
});

/**
 * GET /api/users/:userId/performance-summary
 * Get user's performance summary across all topics
 */
router.get('/:userId/performance-summary', validateUserId, handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only access their own performance summary
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own performance summary.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Calculate performance summary from exam history
    const performanceSummary = user.calculatePerformanceSummary();

    res.json({
      performanceSummary
    });
  } catch (error) {
    console.error('Error getting performance summary:', error);
    res.status(500).json({
      error: 'Failed to get performance summary'
    });
  }
});

export default router;