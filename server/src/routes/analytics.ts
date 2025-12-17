import express, { Request, Response, NextFunction } from 'express';
import { param, query as queryValidator, validationResult } from 'express-validator';
import { authenticateToken, users } from './auth';
import { ProgressTrackingService } from '../services/ProgressTrackingService';
import { ExamTopic } from '../../../shared/types';

const router = express.Router();
const progressTrackingService = new ProgressTrackingService();

// Validation middleware
const validateUserId = [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required')
];

const validateAnalyticsParams = [
  queryValidator('timeframe').optional().isIn(['week', 'month', 'quarter', 'year', 'all']).withMessage('Invalid timeframe'),
  queryValidator('topic').optional().isIn([
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ]).withMessage('Invalid topic'),
  queryValidator('examType').optional().isIn(['practice', 'assessment']).withMessage('Invalid exam type')
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
 * GET /api/analytics/users/:userId/performance-trends
 * Get performance trends for a user over time
 * Implements Requirements 3.1, 3.2
 */
router.get('/users/:userId/performance-trends', validateUserId, validateAnalyticsParams, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;
    const { timeframe = 'month', topic, examType } = req.query;

    // Users can only access their own analytics
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own analytics.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Get performance trends from progress tracking service
    const trends = await progressTrackingService.calculatePerformanceTrends(
      userId,
      timeframe as string,
      topic as ExamTopic,
      examType as 'practice' | 'assessment'
    );

    res.json({
      userId,
      timeframe,
      topic: topic || 'all',
      examType: examType || 'all',
      trends
    });
  } catch (error) {
    console.error('Error getting performance trends:', error);
    res.status(500).json({
      error: 'Failed to get performance trends'
    });
  }
});

/**
 * GET /api/analytics/users/:userId/weak-areas
 * Identify user's weak areas based on performance data
 * Implements Requirements 1.1
 */
router.get('/users/:userId/weak-areas', validateUserId, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;
    const { threshold = '70' } = req.query;

    // Users can only access their own analytics
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own analytics.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const thresholdNum = parseInt(threshold as string);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      return res.status(400).json({
        error: 'Threshold must be a number between 0 and 100'
      });
    }

    // Identify weak areas using progress tracking service
    const weakAreas = await progressTrackingService.identifyWeakAreas(userId, thresholdNum);

    res.json({
      userId,
      threshold: thresholdNum,
      weakAreas
    });
  } catch (error) {
    console.error('Error identifying weak areas:', error);
    res.status(500).json({
      error: 'Failed to identify weak areas'
    });
  }
});

/**
 * GET /api/analytics/users/:userId/improvement-recommendations
 * Get personalized improvement recommendations
 * Implements Requirements 3.4
 */
router.get('/users/:userId/improvement-recommendations', validateUserId, handleValidationErrors, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;
    const { sessionCount = '5' } = req.query;

    // Users can only access their own analytics
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own analytics.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const sessionCountNum = parseInt(sessionCount as string);
    if (isNaN(sessionCountNum) || sessionCountNum < 1) {
      return res.status(400).json({
        error: 'Session count must be a positive integer'
      });
    }

    // Get improvement recommendations
    const recommendations = await progressTrackingService.buildImprovementBasedPrioritization(userId, sessionCountNum);

    res.json({
      userId,
      sessionCount: sessionCountNum,
      recommendations
    });
  } catch (error) {
    console.error('Error getting improvement recommendations:', error);
    res.status(500).json({
      error: 'Failed to get improvement recommendations'
    });
  }
});

/**
 * GET /api/analytics/users/:userId/topic-mastery
 * Get topic mastery levels for a user
 * Implements Requirements 3.3
 */
router.get('/users/:userId/topic-mastery', validateUserId, handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;
    const { masteryThreshold = '80' } = req.query;

    // Users can only access their own analytics
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own analytics.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const masteryThresholdNum = parseInt(masteryThreshold as string);
    if (isNaN(masteryThresholdNum) || masteryThresholdNum < 0 || masteryThresholdNum > 100) {
      return res.status(400).json({
        error: 'Mastery threshold must be a number between 0 and 100'
      });
    }

    // Calculate topic mastery from user's exam history
    const topicMastery = user.calculateTopicMastery(masteryThresholdNum);

    res.json({
      userId,
      masteryThreshold: masteryThresholdNum,
      topicMastery
    });
  } catch (error) {
    console.error('Error getting topic mastery:', error);
    res.status(500).json({
      error: 'Failed to get topic mastery'
    });
  }
});

/**
 * GET /api/analytics/users/:userId/study-efficiency
 * Analyze study efficiency and time management
 * Implements Requirements 4.4
 */
router.get('/users/:userId/study-efficiency', validateUserId, handleValidationErrors, authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Users can only access their own analytics
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own analytics.'
      });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Calculate study efficiency metrics
    const efficiency = user.calculateStudyEfficiency();

    res.json({
      userId,
      efficiency
    });
  } catch (error) {
    console.error('Error getting study efficiency:', error);
    res.status(500).json({
      error: 'Failed to get study efficiency'
    });
  }
});

/**
 * GET /api/analytics/question-bank/coverage
 * Get question bank coverage statistics
 * Implements Requirements 5.1
 */
router.get('/question-bank/coverage', authenticateToken, async (req: Request, res: Response) => {
  try {
    // This would typically require admin privileges, but for now allow any authenticated user
    const coverage = await progressTrackingService.getQuestionBankCoverage();

    res.json({
      coverage
    });
  } catch (error) {
    console.error('Error getting question bank coverage:', error);
    res.status(500).json({
      error: 'Failed to get question bank coverage'
    });
  }
});

/**
 * GET /api/analytics/system/usage-stats
 * Get system-wide usage statistics (admin only)
 */
router.get('/system/usage-stats', authenticateToken, (req: Request, res: Response) => {
  try {
    // In production, this would require admin role verification
    const stats = {
      totalUsers: users.size,
      activeUsers: Array.from(users.values()).filter(user => {
        const daysSinceLastLogin = (Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastLogin <= 30; // Active in last 30 days
      }).length,
      totalExams: Array.from(users.values()).reduce((total, user) => total + user.examHistory.length, 0),
      averageScore: Array.from(users.values()).reduce((total, user) => {
        const userAverage = user.examHistory.length > 0 
          ? user.examHistory.reduce((sum: number, exam: any) => sum + (exam.correctAnswers / exam.totalQuestions * 100), 0) / user.examHistory.length
          : 0;
        return total + userAverage;
      }, 0) / users.size || 0
    };

    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      error: 'Failed to get usage stats'
    });
  }
});

export default router;