"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressTrackingService = void 0;
const AdaptiveQuestionService_1 = require("./AdaptiveQuestionService");
class ProgressTrackingService {
    constructor() {
        this.adaptiveQuestionService = new AdaptiveQuestionService_1.AdaptiveQuestionService();
        this.historicalData = new Map();
    }
    /**
     * Implements historical performance data storage
     * Requirement 3.1: Store historical performance data
     */
    async storeHistoricalPerformanceData(userId, examResult) {
        let userData = this.historicalData.get(userId);
        if (!userData) {
            userData = {
                userId,
                examResults: [],
                totalExamsTaken: 0,
                averageScore: 0,
                bestScore: 0,
                worstScore: 100,
                totalTimeSpent: 0,
                averageTimePerExam: 0,
                createdAt: new Date(),
                lastUpdated: new Date()
            };
        }
        // Add the new exam result
        userData.examResults.push(examResult);
        userData.totalExamsTaken = userData.examResults.length;
        userData.totalTimeSpent += examResult.timeSpent;
        userData.averageTimePerExam = Math.round(userData.totalTimeSpent / userData.totalExamsTaken);
        userData.lastUpdated = new Date();
        // Calculate scores
        const scores = userData.examResults.map(exam => Math.round((exam.correctAnswers / exam.totalQuestions) * 100));
        userData.averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        userData.bestScore = Math.max(...scores);
        userData.worstScore = Math.min(...scores);
        this.historicalData.set(userId, userData);
    }
    /**
     * Retrieves historical performance data for a user
     * Requirement 3.1: Access stored historical performance data
     */
    async getHistoricalPerformanceData(userId) {
        return this.historicalData.get(userId) || null;
    }
    /**
     * Creates performance trend calculation algorithms
     * Requirement 3.2: Show performance trends for each topic over time
     */
    async calculatePerformanceTrendsBasic(userId) {
        const userData = this.historicalData.get(userId);
        if (!userData || userData.examResults.length === 0) {
            return [];
        }
        const allTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        const topicProgressData = [];
        for (const topic of allTopics) {
            const topicData = this.extractTopicDataFromHistory(userData.examResults, topic);
            if (topicData.scores.length > 0) {
                const trend = this.calculateTrendDirection(topicData.scores);
                const improvementRate = this.calculateImprovementRate(topicData.scores);
                topicProgressData.push({
                    topic,
                    examCount: topicData.scores.length,
                    scores: topicData.scores,
                    dates: topicData.dates,
                    averageScore: Math.round(topicData.scores.reduce((sum, score) => sum + score, 0) / topicData.scores.length),
                    bestScore: Math.max(...topicData.scores),
                    latestScore: topicData.scores[topicData.scores.length - 1],
                    trend,
                    improvementRate,
                    timeSpentTotal: topicData.totalTime,
                    averageTimePerQuestion: topicData.totalTime > 0 ? Math.round(topicData.totalTime / topicData.totalQuestions) : 0
                });
            }
        }
        return topicProgressData.sort((a, b) => b.improvementRate - a.improvementRate);
    }
    /**
     * Builds improvement-based topic prioritization
     * Requirement 3.4: Prioritize topics that have not improved in recent sessions
     */
    async buildImprovementBasedPrioritization(userId, recentSessionCount = 3) {
        const userData = this.historicalData.get(userId);
        if (!userData || userData.examResults.length < 2) {
            return [];
        }
        const topicProgressData = await this.calculatePerformanceTrends(userId);
        const prioritizations = [];
        for (const topicData of topicProgressData) {
            const recentScores = topicData.scores.slice(-recentSessionCount);
            const sessionsWithoutImprovement = this.countSessionsWithoutImprovement(recentScores);
            const lastImprovementDate = this.findLastImprovementDate(topicData.scores, topicData.dates);
            let priority = 1; // Default low priority
            let reasonForPriority = 'Stable performance';
            let recommendedAction = 'Continue regular practice';
            // High priority for declining or stagnant weak areas
            if (topicData.averageScore < 70) {
                if (topicData.trend === 'declining') {
                    priority = 5;
                    reasonForPriority = 'Weak area with declining performance';
                    recommendedAction = 'Immediate focused study required';
                }
                else if (sessionsWithoutImprovement >= 2) {
                    priority = 4;
                    reasonForPriority = 'Weak area with no recent improvement';
                    recommendedAction = 'Change study approach, focus on fundamentals';
                }
                else {
                    priority = 3;
                    reasonForPriority = 'Weak area requiring attention';
                    recommendedAction = 'Increase practice frequency';
                }
            }
            // Medium priority for topics with declining trends regardless of score
            else if (topicData.trend === 'declining') {
                priority = 3;
                reasonForPriority = 'Performance declining from good level';
                recommendedAction = 'Review recent mistakes and refresh knowledge';
            }
            // Lower priority for stable or improving areas
            else if (topicData.trend === 'improving') {
                priority = 1;
                reasonForPriority = 'Showing consistent improvement';
                recommendedAction = 'Maintain current study pace';
            }
            else if (topicData.averageScore >= 80) {
                priority = 1;
                reasonForPriority = 'Strong performance area';
                recommendedAction = 'Periodic review to maintain level';
            }
            prioritizations.push({
                topic: topicData.topic,
                priority,
                reasonForPriority,
                sessionsWithoutImprovement,
                lastImprovementDate,
                recommendedAction
            });
        }
        // Sort by priority (highest first), then by sessions without improvement
        return prioritizations.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return b.sessionsWithoutImprovement - a.sessionsWithoutImprovement;
        });
    }
    /**
     * Adds comprehensive assessment mode with proportional coverage
     * Requirement 3.5: Generate comprehensive exam covering all topics proportionally
     */
    async generateComprehensiveAssessmentConfig(totalQuestions = 60, customDistribution) {
        const allTopics = [
            'Databricks Lakehouse Platform',
            'ELT with Spark SQL and Python',
            'Incremental Data Processing',
            'Production Pipelines',
            'Data Governance'
        ];
        let topicDistribution;
        if (customDistribution) {
            // Validate that custom distribution adds up to totalQuestions
            const totalCustom = Array.from(customDistribution.values()).reduce((sum, count) => sum + count, 0);
            if (totalCustom !== totalQuestions) {
                throw new Error(`Custom distribution total (${totalCustom}) must equal totalQuestions (${totalQuestions})`);
            }
            topicDistribution = new Map(customDistribution);
        }
        else {
            // Default proportional distribution based on official exam weights
            // These percentages are based on typical Databricks certification exam structure
            const defaultWeights = new Map([
                ['Databricks Lakehouse Platform', 0.20], // 20%
                ['ELT with Spark SQL and Python', 0.25], // 25%
                ['Incremental Data Processing', 0.20], // 20%
                ['Production Pipelines', 0.20], // 20%
                ['Data Governance', 0.15] // 15%
            ]);
            topicDistribution = new Map();
            let remainingQuestions = totalQuestions;
            // Allocate questions based on weights
            for (const [topic, weight] of defaultWeights) {
                const questionsForTopic = Math.round(totalQuestions * weight);
                topicDistribution.set(topic, questionsForTopic);
                remainingQuestions -= questionsForTopic;
            }
            // Distribute any remaining questions to ensure exact total
            if (remainingQuestions !== 0) {
                const topics = Array.from(topicDistribution.keys());
                for (let i = 0; i < Math.abs(remainingQuestions); i++) {
                    const topic = topics[i % topics.length];
                    const currentCount = topicDistribution.get(topic);
                    topicDistribution.set(topic, currentCount + (remainingQuestions > 0 ? 1 : -1));
                }
            }
        }
        return {
            totalQuestions,
            topicDistribution,
            includeAllDifficulties: true,
            balanceBySubtopic: true
        };
    }
    /**
     * Generates comprehensive performance analytics combining all tracking data
     */
    async generateComprehensiveAnalytics(userId) {
        const userData = this.historicalData.get(userId);
        if (!userData) {
            throw new Error(`No historical data found for user ${userId}`);
        }
        const topicTrends = this.adaptiveQuestionService.calculatePerformanceTrends(userData.examResults);
        const performanceAnalysis = await this.adaptiveQuestionService.analyzeUserPerformance(userData.examResults);
        const studyRecommendations = this.adaptiveQuestionService.generateStudyRecommendations(performanceAnalysis, topicTrends);
        return {
            userId,
            weakAreas: performanceAnalysis.weakAreas,
            strongAreas: performanceAnalysis.strongAreas,
            overallProgress: userData.averageScore,
            topicTrends,
            recommendedStudyPlan: studyRecommendations
        };
    }
    // Private helper methods
    extractTopicDataFromHistory(examResults, topic) {
        const scores = [];
        const dates = [];
        let totalTime = 0;
        let totalQuestions = 0;
        examResults
            .sort((a, b) => a.endTime.getTime() - b.endTime.getTime())
            .forEach(exam => {
            const topicScore = exam.topicBreakdown.find(ts => ts.topic === topic);
            if (topicScore) {
                scores.push(topicScore.percentage);
                dates.push(exam.endTime);
                totalTime += topicScore.averageTime * topicScore.totalQuestions;
                totalQuestions += topicScore.totalQuestions;
            }
        });
        return { scores, dates, totalTime, totalQuestions };
    }
    calculateTrendDirection(scores) {
        if (scores.length < 2)
            return 'stable';
        // Use linear regression to determine trend
        const n = scores.length;
        const x = Array.from({ length: n }, (_, i) => i + 1);
        const y = scores;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        if (Math.abs(slope) < 1)
            return 'stable'; // Less than 1% change per exam is stable
        return slope > 0 ? 'improving' : 'declining';
    }
    calculateImprovementRate(scores) {
        if (scores.length < 2)
            return 0;
        const firstScore = scores[0];
        const lastScore = scores[scores.length - 1];
        const examCount = scores.length - 1;
        if (firstScore === 0)
            return 0;
        return Math.round(((lastScore - firstScore) / firstScore) * 100 / examCount * 100) / 100;
    }
    countSessionsWithoutImprovement(recentScores) {
        if (recentScores.length < 2)
            return 0;
        let count = 0;
        for (let i = 1; i < recentScores.length; i++) {
            if (recentScores[i] <= recentScores[i - 1]) {
                count++;
            }
            else {
                count = 0; // Reset count if there's improvement
            }
        }
        return count;
    }
    findLastImprovementDate(scores, dates) {
        for (let i = scores.length - 1; i > 0; i--) {
            if (scores[i] > scores[i - 1]) {
                return dates[i];
            }
        }
        return undefined;
    }
    /**
     * Calculate performance trends with additional parameters for analytics API
     */
    async calculatePerformanceTrends(userId, timeframe, topic, examType) {
        const userData = this.historicalData.get(userId);
        if (!userData || userData.examResults.length === 0) {
            return [];
        }
        let filteredResults = userData.examResults;
        // Filter by timeframe
        if (timeframe && timeframe !== 'all') {
            const now = new Date();
            let cutoffDate = new Date();
            switch (timeframe) {
                case 'week':
                    cutoffDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    cutoffDate.setMonth(now.getMonth() - 1);
                    break;
                case 'quarter':
                    cutoffDate.setMonth(now.getMonth() - 3);
                    break;
                case 'year':
                    cutoffDate.setFullYear(now.getFullYear() - 1);
                    break;
            }
            filteredResults = filteredResults.filter(exam => exam.endTime >= cutoffDate);
        }
        // Filter by exam type
        if (examType) {
            filteredResults = filteredResults.filter(exam => exam.examType === examType);
        }
        // If specific topic requested, filter topic breakdown
        if (topic) {
            return filteredResults.map(exam => {
                const topicScore = exam.topicBreakdown.find(ts => ts.topic === topic);
                return {
                    date: exam.endTime,
                    score: topicScore ? topicScore.percentage : 0,
                    examType: exam.examType
                };
            });
        }
        // Return overall trends
        return filteredResults.map(exam => ({
            date: exam.endTime,
            score: Math.round((exam.correctAnswers / exam.totalQuestions) * 100),
            examType: exam.examType,
            topicBreakdown: exam.topicBreakdown
        }));
    }
    /**
     * Identify weak areas based on performance threshold
     */
    async identifyWeakAreas(userId, threshold = 70) {
        const userData = this.historicalData.get(userId);
        if (!userData || userData.examResults.length === 0) {
            return [];
        }
        const topicProgressData = await this.calculatePerformanceTrends(userId);
        const weakAreas = [];
        // Calculate average performance per topic
        const topicPerformance = new Map();
        userData.examResults.forEach(exam => {
            exam.topicBreakdown.forEach(topic => {
                if (!topicPerformance.has(topic.topic)) {
                    topicPerformance.set(topic.topic, { scores: [], averageScore: 0 });
                }
                topicPerformance.get(topic.topic).scores.push(topic.percentage);
            });
        });
        // Calculate averages and identify weak areas
        topicPerformance.forEach((data, topic) => {
            const averageScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
            data.averageScore = averageScore;
            if (averageScore < threshold) {
                weakAreas.push({
                    topic,
                    averageScore: Math.round(averageScore),
                    examCount: data.scores.length,
                    latestScore: data.scores[data.scores.length - 1],
                    improvementNeeded: Math.round(threshold - averageScore)
                });
            }
        });
        return weakAreas.sort((a, b) => a.averageScore - b.averageScore);
    }
    /**
     * Get question bank coverage statistics
     */
    async getQuestionBankCoverage() {
        // This would typically query the actual question bank
        // For now, return mock data
        return {
            totalQuestions: 500,
            topicDistribution: {
                'Databricks Lakehouse Platform': 100,
                'ELT with Spark SQL and Python': 125,
                'Incremental Data Processing': 100,
                'Production Pipelines': 100,
                'Data Governance': 75
            },
            difficultyDistribution: {
                easy: 150,
                medium: 250,
                hard: 100
            },
            questionsWithCodeExamples: 200,
            lastUpdated: new Date()
        };
    }
}
exports.ProgressTrackingService = ProgressTrackingService;
//# sourceMappingURL=ProgressTrackingService.js.map