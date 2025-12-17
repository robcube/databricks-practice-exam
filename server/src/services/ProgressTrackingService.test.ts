import { ProgressTrackingService, HistoricalPerformanceData, TopicProgressData, ImprovementPrioritization } from './ProgressTrackingService';
import { ExamResult, ExamTopic, TopicScore, ExamType } from '../../../shared/types';
import { describe, it, beforeEach } from '@jest/globals';

describe('ProgressTrackingService', () => {
  let progressTrackingService: ProgressTrackingService;
  let mockExamResults: ExamResult[];

  beforeEach(() => {
    progressTrackingService = new ProgressTrackingService();
    
    // Create mock exam results for testing
    mockExamResults = [
      createMockExamResult('exam1', 'user1', new Date('2024-01-01'), 60, 42, [
        { topic: 'Databricks Lakehouse Platform', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 90 },
        { topic: 'ELT with Spark SQL and Python', totalQuestions: 15, correctAnswers: 12, percentage: 80, averageTime: 85 },
        { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 7, percentage: 58, averageTime: 95 },
        { topic: 'Production Pipelines', totalQuestions: 12, correctAnswers: 9, percentage: 75, averageTime: 88 },
        { topic: 'Data Governance', totalQuestions: 9, correctAnswers: 6, percentage: 67, averageTime: 92 }
      ]),
      createMockExamResult('exam2', 'user1', new Date('2024-01-15'), 60, 48, [
        { topic: 'Databricks Lakehouse Platform', totalQuestions: 12, correctAnswers: 10, percentage: 83, averageTime: 85 },
        { topic: 'ELT with Spark SQL and Python', totalQuestions: 15, correctAnswers: 13, percentage: 87, averageTime: 80 },
        { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 90 },
        { topic: 'Production Pipelines', totalQuestions: 12, correctAnswers: 10, percentage: 83, averageTime: 82 },
        { topic: 'Data Governance', totalQuestions: 9, correctAnswers: 7, percentage: 78, averageTime: 88 }
      ]),
      createMockExamResult('exam3', 'user1', new Date('2024-02-01'), 60, 51, [
        { topic: 'Databricks Lakehouse Platform', totalQuestions: 12, correctAnswers: 11, percentage: 92, averageTime: 80 },
        { topic: 'ELT with Spark SQL and Python', totalQuestions: 15, correctAnswers: 14, percentage: 93, averageTime: 75 },
        { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 88 },
        { topic: 'Production Pipelines', totalQuestions: 12, correctAnswers: 11, percentage: 92, averageTime: 78 },
        { topic: 'Data Governance', totalQuestions: 9, correctAnswers: 7, percentage: 78, averageTime: 85 }
      ])
    ];
  });

  describe('storeHistoricalPerformanceData', () => {
    it('should store first exam result for new user', async () => {
      const examResult = mockExamResults[0];
      
      await progressTrackingService.storeHistoricalPerformanceData('user1', examResult);
      
      const historicalData = await progressTrackingService.getHistoricalPerformanceData('user1');
      
      expect(historicalData).toBeDefined();
      expect(historicalData!.userId).toBe('user1');
      expect(historicalData!.totalExamsTaken).toBe(1);
      expect(historicalData!.examResults).toHaveLength(1);
      expect(historicalData!.averageScore).toBe(70); // 42/60 = 70%
      expect(historicalData!.bestScore).toBe(70);
      expect(historicalData!.worstScore).toBe(70);
    });

    it('should accumulate multiple exam results correctly', async () => {
      await progressTrackingService.storeHistoricalPerformanceData('user1', mockExamResults[0]);
      await progressTrackingService.storeHistoricalPerformanceData('user1', mockExamResults[1]);
      await progressTrackingService.storeHistoricalPerformanceData('user1', mockExamResults[2]);
      
      const historicalData = await progressTrackingService.getHistoricalPerformanceData('user1');
      
      expect(historicalData!.totalExamsTaken).toBe(3);
      expect(historicalData!.examResults).toHaveLength(3);
      expect(historicalData!.averageScore).toBe(78); // (70 + 80 + 85) / 3 = 78.33 -> 78
      expect(historicalData!.bestScore).toBe(85);
      expect(historicalData!.worstScore).toBe(70);
      expect(historicalData!.totalTimeSpent).toBe(16200); // 5400 * 3
    });

    it('should update timestamps correctly', async () => {
      const beforeStore = new Date();
      await progressTrackingService.storeHistoricalPerformanceData('user1', mockExamResults[0]);
      const afterStore = new Date();
      
      const historicalData = await progressTrackingService.getHistoricalPerformanceData('user1');
      
      expect(historicalData!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeStore.getTime());
      expect(historicalData!.createdAt.getTime()).toBeLessThanOrEqual(afterStore.getTime());
      expect(historicalData!.lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeStore.getTime());
      expect(historicalData!.lastUpdated.getTime()).toBeLessThanOrEqual(afterStore.getTime());
    });
  });

  describe('getHistoricalPerformanceData', () => {
    it('should return null for non-existent user', async () => {
      const historicalData = await progressTrackingService.getHistoricalPerformanceData('nonexistent');
      expect(historicalData).toBeNull();
    });

    it('should return stored data for existing user', async () => {
      await progressTrackingService.storeHistoricalPerformanceData('user1', mockExamResults[0]);
      
      const historicalData = await progressTrackingService.getHistoricalPerformanceData('user1');
      
      expect(historicalData).toBeDefined();
      expect(historicalData!.userId).toBe('user1');
    });
  });

  describe('calculatePerformanceTrends', () => {
    it('should return empty array for user with no exam history', async () => {
      const trends = await progressTrackingService.calculatePerformanceTrends('nonexistent');
      expect(trends).toEqual([]);
    });

    it('should calculate trends correctly for user with exam history', async () => {
      // Store exam results
      for (const examResult of mockExamResults) {
        await progressTrackingService.storeHistoricalPerformanceData('user1', examResult);
      }
      
      const trends = await progressTrackingService.calculatePerformanceTrendsBasic('user1');
      
      expect(trends).toHaveLength(5); // All 5 topics
      
      // Check Databricks Lakehouse Platform trend (67 -> 83 -> 92 = improving)
      const platformTrend = trends.find((t: any) => t.topic === 'Databricks Lakehouse Platform');
      expect(platformTrend).toBeDefined();
      expect(platformTrend!.trend).toBe('improving');
      expect(platformTrend!.scores).toEqual([67, 83, 92]);
      expect(platformTrend!.averageScore).toBe(81); // (67 + 83 + 92) / 3 = 80.67 -> 81
      expect(platformTrend!.bestScore).toBe(92);
      expect(platformTrend!.latestScore).toBe(92);
      
      // Check Incremental Data Processing trend (58 -> 67 -> 67 = improving overall)
      const incrementalTrend = trends.find((t: any) => t.topic === 'Incremental Data Processing');
      expect(incrementalTrend).toBeDefined();
      expect(incrementalTrend!.trend).toBe('improving'); // 58->67 is improvement, 67->67 is stable, overall improving
      expect(incrementalTrend!.scores).toEqual([58, 67, 67]);
    });

    it('should calculate improvement rates correctly', async () => {
      for (const examResult of mockExamResults) {
        await progressTrackingService.storeHistoricalPerformanceData('user1', examResult);
      }
      
      const trends = await progressTrackingService.calculatePerformanceTrends('user1');
      
      // Verify we have trend data
      expect(trends.length).toBeGreaterThan(0);
      
      // Check that scores are calculated correctly
      const firstExam = trends[0];
      expect(firstExam).toHaveProperty('score');
      expect(firstExam).toHaveProperty('date');
      expect(firstExam).toHaveProperty('examType');
    });
  });

  describe('buildImprovementBasedPrioritization', () => {
    it('should return empty array for user with insufficient history', async () => {
      await progressTrackingService.storeHistoricalPerformanceData('user1', mockExamResults[0]);
      
      const prioritization = await progressTrackingService.buildImprovementBasedPrioritization('user1');
      expect(prioritization).toEqual([]);
    });

    it('should prioritize weak areas with declining performance', async () => {
      // Create exam results showing declining performance in a weak area
      const decliningResults = [
        createMockExamResult('exam1', 'user1', new Date('2024-01-01'), 60, 42, [
          { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 95 }
        ]),
        createMockExamResult('exam2', 'user1', new Date('2024-01-15'), 60, 42, [
          { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 7, percentage: 58, averageTime: 100 }
        ]),
        createMockExamResult('exam3', 'user1', new Date('2024-02-01'), 60, 42, [
          { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 6, percentage: 50, averageTime: 105 }
        ])
      ];

      for (const examResult of decliningResults) {
        await progressTrackingService.storeHistoricalPerformanceData('user1', examResult);
      }
      
      const prioritization = await progressTrackingService.buildImprovementBasedPrioritization('user1');
      
      expect(prioritization).toHaveLength(1);
      expect(prioritization[0].topic).toBe('Incremental Data Processing');
      expect(prioritization[0].priority).toBe(5); // Highest priority for weak declining area
      expect(prioritization[0].reasonForPriority).toBe('Weak area with declining performance');
      expect(prioritization[0].recommendedAction).toBe('Immediate focused study required');
    });

    it('should identify topics without recent improvement', async () => {
      // Create results showing stagnant performance in weak area
      const stagnantResults = [
        createMockExamResult('exam1', 'user1', new Date('2024-01-01'), 60, 42, [
          { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 95 }
        ]),
        createMockExamResult('exam2', 'user1', new Date('2024-01-15'), 60, 42, [
          { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 95 }
        ]),
        createMockExamResult('exam3', 'user1', new Date('2024-02-01'), 60, 42, [
          { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 95 }
        ])
      ];

      for (const examResult of stagnantResults) {
        await progressTrackingService.storeHistoricalPerformanceData('user1', examResult);
      }
      
      const prioritization = await progressTrackingService.buildImprovementBasedPrioritization('user1', 3);
      
      expect(prioritization[0].sessionsWithoutImprovement).toBe(2);
      expect(prioritization[0].priority).toBe(4); // High priority for stagnant weak area
    });
  });

  describe('generateComprehensiveAssessmentConfig', () => {
    it('should generate default proportional distribution', async () => {
      const config = await progressTrackingService.generateComprehensiveAssessmentConfig(60);
      
      expect(config.totalQuestions).toBe(60);
      expect(config.includeAllDifficulties).toBe(true);
      expect(config.balanceBySubtopic).toBe(true);
      
      // Check that all topics are included
      const allTopics: ExamTopic[] = [
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python',
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
      ];
      
      for (const topic of allTopics) {
        expect(config.topicDistribution.has(topic)).toBe(true);
        expect(config.topicDistribution.get(topic)!).toBeGreaterThan(0);
      }
      
      // Check that total adds up correctly
      const totalAllocated = Array.from(config.topicDistribution.values())
        .reduce((sum, count) => sum + count, 0);
      expect(totalAllocated).toBe(60);
    });

    it('should accept custom distribution', async () => {
      const customDistribution = new Map<ExamTopic, number>([
        ['Databricks Lakehouse Platform', 15],
        ['ELT with Spark SQL and Python', 15],
        ['Incremental Data Processing', 15],
        ['Production Pipelines', 15],
        ['Data Governance', 0]
      ]);
      
      const config = await progressTrackingService.generateComprehensiveAssessmentConfig(60, customDistribution);
      
      expect(config.topicDistribution.get('Data Governance')).toBe(0);
      expect(config.topicDistribution.get('Databricks Lakehouse Platform')).toBe(15);
    });

    it('should throw error for invalid custom distribution', async () => {
      const invalidDistribution = new Map<ExamTopic, number>([
        ['Databricks Lakehouse Platform', 30],
        ['ELT with Spark SQL and Python', 20]
      ]);
      
      await expect(
        progressTrackingService.generateComprehensiveAssessmentConfig(60, invalidDistribution)
      ).rejects.toThrow('Custom distribution total (50) must equal totalQuestions (60)');
    });
  });

  describe('generateComprehensiveAnalytics', () => {
    it('should throw error for user with no data', async () => {
      await expect(
        progressTrackingService.generateComprehensiveAnalytics('nonexistent')
      ).rejects.toThrow('No historical data found for user nonexistent');
    });

    it('should generate comprehensive analytics for user with data', async () => {
      for (const examResult of mockExamResults) {
        await progressTrackingService.storeHistoricalPerformanceData('user1', examResult);
      }
      
      const analytics = await progressTrackingService.generateComprehensiveAnalytics('user1');
      
      expect(analytics.userId).toBe('user1');
      expect(analytics.weakAreas).toBeDefined();
      expect(analytics.strongAreas).toBeDefined();
      expect(analytics.overallProgress).toBe(78); // Average score from historical data
      expect(analytics.topicTrends).toBeDefined();
      expect(analytics.recommendedStudyPlan).toBeDefined();
    });
  });

  // Helper function to create mock exam results
  function createMockExamResult(
    id: string,
    userId: string,
    endTime: Date,
    totalQuestions: number,
    correctAnswers: number,
    topicBreakdown: TopicScore[]
  ): ExamResult {
    const startTime = new Date(endTime.getTime() - 5400000); // 90 minutes earlier
    
    return {
      id,
      userId,
      examType: 'practice' as ExamType,
      startTime,
      endTime,
      totalQuestions,
      correctAnswers,
      topicBreakdown,
      timeSpent: 5400, // 90 minutes in seconds
      questions: [] // Simplified for testing
    };
  }
});