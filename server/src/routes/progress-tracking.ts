import express from 'express';
import { ProgressTrackingService } from '../services/ProgressTrackingService';
import { ExamResult, ExamTopic } from '../../../shared/types';

const router = express.Router();
const progressTrackingService = new ProgressTrackingService();

/**
 * GET /api/progress-tracking/:userId/historical-data
 * Retrieves historical performance data for a user
 */
router.get('/:userId/historical-data', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const historicalData = await progressTrackingService.getHistoricalPerformanceData(userId);
    
    if (!historicalData) {
      return res.status(404).json({
        error: 'No historical performance data found for this user'
      });
    }
    
    res.json(historicalData);
  } catch (error) {
    console.error('Error retrieving historical performance data:', error);
    res.status(500).json({
      error: 'Failed to retrieve historical performance data'
    });
  }
});

/**
 * POST /api/progress-tracking/:userId/store-result
 * Stores a new exam result for historical tracking
 */
router.post('/:userId/store-result', async (req, res) => {
  try {
    const { userId } = req.params;
    const examResult: ExamResult = req.body;
    
    // Validate that the exam result belongs to the correct user
    if (examResult.userId !== userId) {
      return res.status(400).json({
        error: 'Exam result user ID does not match the provided user ID'
      });
    }
    
    await progressTrackingService.storeHistoricalPerformanceData(userId, examResult);
    
    res.status(201).json({
      message: 'Exam result stored successfully'
    });
  } catch (error) {
    console.error('Error storing exam result:', error);
    res.status(500).json({
      error: 'Failed to store exam result'
    });
  }
});

/**
 * GET /api/progress-tracking/:userId/performance-trends
 * Calculates and returns performance trends for all topics
 */
router.get('/:userId/performance-trends', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const trends = await progressTrackingService.calculatePerformanceTrends(userId);
    
    res.json({
      userId,
      trends,
      totalTopics: trends.length
    });
  } catch (error) {
    console.error('Error calculating performance trends:', error);
    res.status(500).json({
      error: 'Failed to calculate performance trends'
    });
  }
});

/**
 * GET /api/progress-tracking/:userId/improvement-prioritization
 * Gets improvement-based topic prioritization
 */
router.get('/:userId/improvement-prioritization', async (req, res) => {
  try {
    const { userId } = req.params;
    const { recentSessionCount } = req.query;
    
    const sessionCount = recentSessionCount ? parseInt(recentSessionCount as string) : 3;
    
    if (isNaN(sessionCount) || sessionCount < 1) {
      return res.status(400).json({
        error: 'recentSessionCount must be a positive integer'
      });
    }
    
    const prioritization = await progressTrackingService.buildImprovementBasedPrioritization(
      userId, 
      sessionCount
    );
    
    res.json({
      userId,
      prioritization,
      recentSessionCount: sessionCount
    });
  } catch (error) {
    console.error('Error building improvement prioritization:', error);
    res.status(500).json({
      error: 'Failed to build improvement prioritization'
    });
  }
});

/**
 * GET /api/progress-tracking/comprehensive-assessment-config
 * Generates configuration for comprehensive assessment
 */
router.get('/comprehensive-assessment-config', async (req, res) => {
  try {
    const { totalQuestions, customDistribution } = req.query;
    
    const questionCount = totalQuestions ? parseInt(totalQuestions as string) : 60;
    
    if (isNaN(questionCount) || questionCount < 1) {
      return res.status(400).json({
        error: 'totalQuestions must be a positive integer'
      });
    }
    
    let customDist: Map<ExamTopic, number> | undefined;
    
    if (customDistribution) {
      try {
        const distObj = JSON.parse(customDistribution as string);
        customDist = new Map(Object.entries(distObj)) as Map<ExamTopic, number>;
      } catch (parseError) {
        return res.status(400).json({
          error: 'customDistribution must be valid JSON object'
        });
      }
    }
    
    const config = await progressTrackingService.generateComprehensiveAssessmentConfig(
      questionCount,
      customDist
    );
    
    // Convert Map to object for JSON serialization
    const configResponse = {
      totalQuestions: config.totalQuestions,
      topicDistribution: Object.fromEntries(config.topicDistribution),
      includeAllDifficulties: config.includeAllDifficulties,
      balanceBySubtopic: config.balanceBySubtopic
    };
    
    res.json(configResponse);
  } catch (error) {
    console.error('Error generating comprehensive assessment config:', error);
    res.status(500).json({
      error: 'Failed to generate comprehensive assessment configuration'
    });
  }
});

/**
 * GET /api/progress-tracking/:userId/comprehensive-analytics
 * Generates comprehensive performance analytics
 */
router.get('/:userId/comprehensive-analytics', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const analytics = await progressTrackingService.generateComprehensiveAnalytics(userId);
    
    res.json(analytics);
  } catch (error) {
    console.error('Error generating comprehensive analytics:', error);
    
    if (error instanceof Error && error.message.includes('No historical data found')) {
      return res.status(404).json({
        error: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to generate comprehensive analytics'
    });
  }
});

/**
 * GET /api/progress-tracking/overall/:userId
 * Gets overall progress summary for the dashboard
 */
router.get('/overall/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    try {
      const analytics = await progressTrackingService.generateComprehensiveAnalytics(userId);
      
      // Transform to match frontend expectations
      const overallProgress = {
        totalExams: analytics.topicTrends.length > 0 ? analytics.topicTrends[0].scores.length : 0,
        averageScore: analytics.overallProgress || 0,
        totalTimeSpent: 0, // Would need to calculate from historical data
        strongestTopic: analytics.strongAreas[0] || 'N/A',
        weakestTopic: analytics.weakAreas[0] || 'N/A',
        improvementRate: 0 // Calculate from trends if needed
      };
      
      res.json({ data: overallProgress });
    } catch (analyticsError) {
      // If no data found, return default values for new users
      if (analyticsError instanceof Error && analyticsError.message.includes('No historical data found')) {
        const defaultProgress = {
          totalExams: 0,
          averageScore: 0,
          totalTimeSpent: 0,
          strongestTopic: 'N/A',
          weakestTopic: 'N/A',
          improvementRate: 0
        };
        
        res.json({ data: defaultProgress });
      } else {
        throw analyticsError;
      }
    }
  } catch (error) {
    console.error('Error retrieving overall progress:', error);
    res.status(500).json({
      error: 'Failed to retrieve overall progress'
    });
  }
});

/**
 * GET /api/progress-tracking/topics/:userId
 * Gets topic-specific progress data for the dashboard
 */
router.get('/topics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    try {
      const trends = await progressTrackingService.calculatePerformanceTrends(userId);
      
      // Transform to match frontend expectations
      const topicProgress = trends.map((trend: any) => ({
        topic: trend.topic,
        totalQuestions: trend.examCount * 10, // Estimate
        correctAnswers: Math.round(trend.averageScore * trend.examCount * 10 / 100),
        percentage: trend.averageScore,
        averageTime: trend.averageTimePerQuestion || 120,
        trend: trend.trend,
        lastAttempt: new Date() // Use actual date from data if available
      }));
      
      res.json({ data: topicProgress });
    } catch (trendsError) {
      // If no data found, return empty array for new users
      res.json({ data: [] });
    }
  } catch (error) {
    console.error('Error retrieving topic progress:', error);
    res.status(500).json({
      error: 'Failed to retrieve topic progress'
    });
  }
});

/**
 * GET /api/progress-tracking/recommendations/:userId
 * Gets study recommendations for the dashboard
 */
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const prioritization = await progressTrackingService.buildImprovementBasedPrioritization(userId);
    
    if (prioritization.length === 0) {
      // If no data found, return default recommendations for new users
      const defaultRecommendations = [
        {
          topic: 'Databricks Lakehouse Platform',
          priority: 'medium' as const,
          recommendedQuestions: 10,
          focusAreas: ['Start with fundamentals'],
          estimatedStudyTime: 30
        },
        {
          topic: 'ELT with Spark SQL and Python',
          priority: 'medium' as const,
          recommendedQuestions: 10,
          focusAreas: ['Practice SQL queries'],
          estimatedStudyTime: 30
        },
        {
          topic: 'Incremental Data Processing',
          priority: 'medium' as const,
          recommendedQuestions: 8,
          focusAreas: ['Learn merge operations'],
          estimatedStudyTime: 25
        }
      ];
      
      res.json({ data: defaultRecommendations });
    } else {
      // Transform to match frontend expectations
      const recommendations = prioritization.map(item => ({
        topic: item.topic,
        priority: item.priority >= 4 ? 'high' : item.priority >= 2 ? 'medium' : 'low',
        recommendedQuestions: Math.max(5, item.priority * 3),
        focusAreas: [item.reasonForPriority],
        estimatedStudyTime: item.priority * 15 // minutes
      }));
      
      res.json({ data: recommendations });
    }
  } catch (error) {
    console.error('Error retrieving recommendations:', error);
    res.status(500).json({
      error: 'Failed to retrieve recommendations'
    });
  }
});

/**
 * GET /api/progress-tracking/:userId/topic-progress/:topic
 * Gets detailed progress data for a specific topic
 */
router.get('/:userId/topic-progress/:topic', async (req, res) => {
  try {
    const { userId, topic } = req.params;
    
    // Validate topic
    const validTopics: ExamTopic[] = [
      'Databricks Lakehouse Platform',
      'ELT with Spark SQL and Python',
      'Incremental Data Processing',
      'Production Pipelines',
      'Data Governance'
    ];
    
    if (!validTopics.includes(topic as ExamTopic)) {
      return res.status(400).json({
        error: 'Invalid topic specified',
        validTopics
      });
    }
    
    const trends = await progressTrackingService.calculatePerformanceTrends(userId);
    const topicProgress = trends.find((t: any) => t.topic === topic);
    
    if (!topicProgress) {
      return res.status(404).json({
        error: `No progress data found for topic: ${topic}`
      });
    }
    
    res.json(topicProgress);
  } catch (error) {
    console.error('Error retrieving topic progress:', error);
    res.status(500).json({
      error: 'Failed to retrieve topic progress'
    });
  }
});

export default router;