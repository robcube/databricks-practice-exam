"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProgressTrackingService_1 = require("../services/ProgressTrackingService");
const router = express_1.default.Router();
const progressTrackingService = new ProgressTrackingService_1.ProgressTrackingService();
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
    }
    catch (error) {
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
        const examResult = req.body;
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
    }
    catch (error) {
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
    }
    catch (error) {
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
        const sessionCount = recentSessionCount ? parseInt(recentSessionCount) : 3;
        if (isNaN(sessionCount) || sessionCount < 1) {
            return res.status(400).json({
                error: 'recentSessionCount must be a positive integer'
            });
        }
        const prioritization = await progressTrackingService.buildImprovementBasedPrioritization(userId, sessionCount);
        res.json({
            userId,
            prioritization,
            recentSessionCount: sessionCount
        });
    }
    catch (error) {
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
        const questionCount = totalQuestions ? parseInt(totalQuestions) : 60;
        if (isNaN(questionCount) || questionCount < 1) {
            return res.status(400).json({
                error: 'totalQuestions must be a positive integer'
            });
        }
        let customDist;
        if (customDistribution) {
            try {
                const distObj = JSON.parse(customDistribution);
                customDist = new Map(Object.entries(distObj));
            }
            catch (parseError) {
                return res.status(400).json({
                    error: 'customDistribution must be valid JSON object'
                });
            }
        }
        const config = await progressTrackingService.generateComprehensiveAssessmentConfig(questionCount, customDist);
        // Convert Map to object for JSON serialization
        const configResponse = {
            totalQuestions: config.totalQuestions,
            topicDistribution: Object.fromEntries(config.topicDistribution),
            includeAllDifficulties: config.includeAllDifficulties,
            balanceBySubtopic: config.balanceBySubtopic
        };
        res.json(configResponse);
    }
    catch (error) {
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
    }
    catch (error) {
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
 * GET /api/progress-tracking/:userId/topic-progress/:topic
 * Gets detailed progress data for a specific topic
 */
router.get('/:userId/topic-progress/:topic', async (req, res) => {
    try {
        const { userId, topic } = req.params;
        // Validate topic
        const validTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        if (!validTopics.includes(topic)) {
            return res.status(400).json({
                error: 'Invalid topic specified',
                validTopics
            });
        }
        const trends = await progressTrackingService.calculatePerformanceTrends(userId);
        const topicProgress = trends.find((t) => t.topic === topic);
        if (!topicProgress) {
            return res.status(404).json({
                error: `No progress data found for topic: ${topic}`
            });
        }
        res.json(topicProgress);
    }
    catch (error) {
        console.error('Error retrieving topic progress:', error);
        res.status(500).json({
            error: 'Failed to retrieve topic progress'
        });
    }
});
exports.default = router;
//# sourceMappingURL=progress-tracking.js.map