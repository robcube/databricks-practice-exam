import { AdaptiveQuestionService, AdaptiveExamConfig, PerformanceAnalysisResult } from './AdaptiveQuestionService';
import { ExamResult, ExamTopic, TopicScore, Question, QuestionDifficulty } from '../../../shared/types';

// Mock the QuestionRepository
jest.mock('../repositories/QuestionRepository', () => {
  return {
    QuestionRepository: jest.fn().mockImplementation(() => ({
      findByTopic: jest.fn(),
      findAll: jest.fn()
    }))
  };
});

describe('AdaptiveQuestionService', () => {
  let service: AdaptiveQuestionService;
  let mockQuestionRepository: any;

  beforeEach(() => {
    service = new AdaptiveQuestionService();
    mockQuestionRepository = (service as any).questionRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeUserPerformance', () => {
    it('should return balanced distribution for new users with no exam history', async () => {
      const result = await service.analyzeUserPerformance([]);

      expect(result.hasExamHistory).toBe(false);
      expect(result.weakAreas).toEqual([]);
      expect(result.strongAreas).toEqual([]);
      expect(result.recommendedAllocation).toHaveLength(5);
      
      // Check that questions are distributed evenly (12 questions per topic for 60 total)
      const totalQuestions = result.recommendedAllocation.reduce((sum, alloc) => sum + alloc.questionCount, 0);
      expect(totalQuestions).toBe(60);
    });

    it('should identify weak areas correctly based on threshold', async () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 85 },
          { topic: 'ELT with Spark SQL and Python', percentage: 65 }, // Below 70% threshold
          { topic: 'Incremental Data Processing', percentage: 60 }, // Below 70% threshold
          { topic: 'Production Pipelines', percentage: 75 },
          { topic: 'Data Governance', percentage: 90 }
        ])
      ];

      const result = await service.analyzeUserPerformance(examHistory);

      expect(result.hasExamHistory).toBe(true);
      expect(result.weakAreas).toContain('ELT with Spark SQL and Python');
      expect(result.weakAreas).toContain('Incremental Data Processing');
      expect(result.weakAreas).toHaveLength(2);
    });

    it('should identify strong areas correctly based on threshold', async () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 85 }, // Above 80% threshold
          { topic: 'ELT with Spark SQL and Python', percentage: 65 },
          { topic: 'Incremental Data Processing', percentage: 60 },
          { topic: 'Production Pipelines', percentage: 75 },
          { topic: 'Data Governance', percentage: 90 } // Above 80% threshold
        ])
      ];

      const result = await service.analyzeUserPerformance(examHistory);

      expect(result.strongAreas).toContain('Databricks Lakehouse Platform');
      expect(result.strongAreas).toContain('Data Governance');
      expect(result.strongAreas).toHaveLength(2);
    });

    it('should allocate 60% of questions to weak areas', async () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 85 },
          { topic: 'ELT with Spark SQL and Python', percentage: 65 }, // Weak area
          { topic: 'Incremental Data Processing', percentage: 60 }, // Weak area
          { topic: 'Production Pipelines', percentage: 75 },
          { topic: 'Data Governance', percentage: 90 }
        ])
      ];

      const result = await service.analyzeUserPerformance(examHistory);

      const weakAreaQuestions = result.recommendedAllocation
        .filter(alloc => result.weakAreas.includes(alloc.topic))
        .reduce((sum, alloc) => sum + alloc.questionCount, 0);

      // 60% of 60 questions = 36 questions for weak areas
      expect(weakAreaQuestions).toBe(36);
    });

    it('should use custom configuration when provided', async () => {
      const customConfig: Partial<AdaptiveExamConfig> = {
        totalQuestions: 40,
        weakAreaThreshold: 60,
        strongAreaThreshold: 85
      };

      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 70 }, // Above custom weak threshold
          { topic: 'ELT with Spark SQL and Python', percentage: 55 }, // Below custom weak threshold
          { topic: 'Incremental Data Processing', percentage: 90 }, // Above custom strong threshold
          { topic: 'Production Pipelines', percentage: 75 },
          { topic: 'Data Governance', percentage: 80 }
        ])
      ];

      const result = await service.analyzeUserPerformance(examHistory, customConfig);

      expect(result.weakAreas).toContain('ELT with Spark SQL and Python');
      expect(result.strongAreas).toContain('Incremental Data Processing');
      
      const totalQuestions = result.recommendedAllocation.reduce((sum, alloc) => sum + alloc.questionCount, 0);
      expect(totalQuestions).toBe(40);
    });
  });

  describe('generateAdaptiveQuestionSet', () => {
    beforeEach(() => {
      // Mock question repository to return sample questions
      mockQuestionRepository.findByTopic.mockImplementation((topic: ExamTopic, limit: number) => {
        return Promise.resolve(createMockQuestions(topic, Math.min(limit, 20)));
      });
    });

    it('should generate balanced question set for new users', async () => {
      const questions = await service.generateAdaptiveQuestionSet([]);

      expect(questions).toHaveLength(60);
      expect(mockQuestionRepository.findByTopic).toHaveBeenCalledTimes(5); // Once for each topic
    });

    it('should generate weighted question set for users with exam history', async () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 85 },
          { topic: 'ELT with Spark SQL and Python', percentage: 65 }, // Weak area
          { topic: 'Incremental Data Processing', percentage: 60 }, // Weak area
          { topic: 'Production Pipelines', percentage: 75 },
          { topic: 'Data Governance', percentage: 90 }
        ])
      ];

      const questions = await service.generateAdaptiveQuestionSet(examHistory);

      expect(questions).toHaveLength(60);
      expect(mockQuestionRepository.findByTopic).toHaveBeenCalledTimes(5);
      
      // Verify that weak areas get more questions (should be called with higher limits)
      const weakAreaCalls = mockQuestionRepository.findByTopic.mock.calls.filter(
        (call: any[]) => call[0] === 'ELT with Spark SQL and Python' || call[0] === 'Incremental Data Processing'
      );
      expect(weakAreaCalls.length).toBe(2);
    });
  });

  describe('calculatePerformanceTrends', () => {
    it('should return empty array for insufficient exam history', () => {
      const trends = service.calculatePerformanceTrends([]);
      expect(trends).toEqual([]);

      const singleExam = [createMockExamResult([
        { topic: 'Databricks Lakehouse Platform', percentage: 85 }
      ])];
      const trendsWithOne = service.calculatePerformanceTrends(singleExam);
      expect(trendsWithOne).toEqual([]);
    });

    it('should calculate improving trend correctly', () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 60 }
        ], new Date('2024-01-01')),
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 70 }
        ], new Date('2024-01-15')),
        createMockExamResult([
          { topic: 'Databricks Lakehouse Platform', percentage: 80 }
        ], new Date('2024-02-01'))
      ];

      const trends = service.calculatePerformanceTrends(examHistory);
      
      const platformTrend = trends.find(t => t.topic === 'Databricks Lakehouse Platform');
      expect(platformTrend).toBeDefined();
      expect(platformTrend!.trend).toBe('improving');
      expect(platformTrend!.scores).toEqual([60, 70, 80]);
    });

    it('should calculate declining trend correctly', () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'ELT with Spark SQL and Python', percentage: 80 }
        ], new Date('2024-01-01')),
        createMockExamResult([
          { topic: 'ELT with Spark SQL and Python', percentage: 70 }
        ], new Date('2024-01-15')),
        createMockExamResult([
          { topic: 'ELT with Spark SQL and Python', percentage: 60 }
        ], new Date('2024-02-01'))
      ];

      const trends = service.calculatePerformanceTrends(examHistory);
      
      const eltTrend = trends.find(t => t.topic === 'ELT with Spark SQL and Python');
      expect(eltTrend).toBeDefined();
      expect(eltTrend!.trend).toBe('declining');
    });

    it('should calculate stable trend for small changes', () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([
          { topic: 'Production Pipelines', percentage: 75 }
        ], new Date('2024-01-01')),
        createMockExamResult([
          { topic: 'Production Pipelines', percentage: 77 }
        ], new Date('2024-01-15')),
        createMockExamResult([
          { topic: 'Production Pipelines', percentage: 76 }
        ], new Date('2024-02-01'))
      ];

      const trends = service.calculatePerformanceTrends(examHistory);
      
      const pipelinesTrend = trends.find(t => t.topic === 'Production Pipelines');
      expect(pipelinesTrend).toBeDefined();
      expect(pipelinesTrend!.trend).toBe('stable');
    });
  });

  describe('generateStudyRecommendations', () => {
    it('should prioritize weak areas with high priority', () => {
      const performanceAnalysis: PerformanceAnalysisResult = {
        weakAreas: ['ELT with Spark SQL and Python', 'Incremental Data Processing'],
        strongAreas: ['Data Governance'],
        topicScores: new Map([
          ['ELT with Spark SQL and Python', 65],
          ['Incremental Data Processing', 60],
          ['Data Governance', 90],
          ['Databricks Lakehouse Platform', 75],
          ['Production Pipelines', 72]
        ]),
        hasExamHistory: true,
        recommendedAllocation: []
      };

      const trends = service.calculatePerformanceTrends([]);
      const recommendations = service.generateStudyRecommendations(performanceAnalysis, trends);

      const weakAreaRecommendations = recommendations.filter(r => 
        performanceAnalysis.weakAreas.includes(r.topic)
      );
      
      expect(weakAreaRecommendations.every(r => r.priority === 'high')).toBe(true);
      expect(weakAreaRecommendations.every(r => r.recommendedQuestions >= 20)).toBe(true);
    });

    it('should assign low priority to strong areas', () => {
      const performanceAnalysis: PerformanceAnalysisResult = {
        weakAreas: [],
        strongAreas: ['Data Governance', 'Databricks Lakehouse Platform'],
        topicScores: new Map([
          ['Data Governance', 90],
          ['Databricks Lakehouse Platform', 85]
        ]),
        hasExamHistory: true,
        recommendedAllocation: []
      };

      const trends = [
        {
          topic: 'Data Governance' as ExamTopic,
          scores: [85, 88, 90],
          dates: [new Date(), new Date(), new Date()],
          trend: 'improving' as const
        }
      ];

      const recommendations = service.generateStudyRecommendations(performanceAnalysis, trends);

      const strongAreaRecommendations = recommendations.filter(r => 
        performanceAnalysis.strongAreas.includes(r.topic)
      );
      
      expect(strongAreaRecommendations.some(r => r.priority === 'low')).toBe(true);
    });

    it('should include topic-specific focus areas for weak topics', () => {
      const performanceAnalysis: PerformanceAnalysisResult = {
        weakAreas: ['Production Pipelines', 'Incremental Data Processing'],
        strongAreas: [],
        topicScores: new Map([
          ['Production Pipelines', 65],
          ['Incremental Data Processing', 60]
        ]),
        hasExamHistory: true,
        recommendedAllocation: []
      };

      const recommendations = service.generateStudyRecommendations(performanceAnalysis, []);

      const pipelineRec = recommendations.find(r => r.topic === 'Production Pipelines');
      const incrementalRec = recommendations.find(r => r.topic === 'Incremental Data Processing');

      expect(pipelineRec!.focusAreas).toContain('Delta Live Tables configuration and management');
      expect(incrementalRec!.focusAreas).toContain('Merge operations and UPSERT patterns');
    });
  });

  describe('shouldReduceTopicAllocation', () => {
    it('should return false for users with no exam history', () => {
      const result = service.shouldReduceTopicAllocation('Data Governance', []);
      expect(result).toBe(false);
    });

    it('should return true when topic consistently scores above threshold', () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([{ topic: 'Data Governance', percentage: 85 }]),
        createMockExamResult([{ topic: 'Data Governance', percentage: 88 }]),
        createMockExamResult([{ topic: 'Data Governance', percentage: 82 }])
      ];

      const result = service.shouldReduceTopicAllocation('Data Governance', examHistory);
      expect(result).toBe(true);
    });

    it('should return false when topic scores below threshold', () => {
      const examHistory: ExamResult[] = [
        createMockExamResult([{ topic: 'ELT with Spark SQL and Python', percentage: 65 }]),
        createMockExamResult([{ topic: 'ELT with Spark SQL and Python', percentage: 70 }]),
        createMockExamResult([{ topic: 'ELT with Spark SQL and Python', percentage: 68 }])
      ];

      const result = service.shouldReduceTopicAllocation('ELT with Spark SQL and Python', examHistory);
      expect(result).toBe(false);
    });
  });
});

// Helper functions for creating mock data

function createMockExamResult(topicBreakdown: Partial<TopicScore>[], endTime?: Date): ExamResult {
  const fullTopicBreakdown: TopicScore[] = topicBreakdown.map(topic => ({
    topic: topic.topic!,
    totalQuestions: 12,
    correctAnswers: Math.round((topic.percentage! / 100) * 12),
    percentage: topic.percentage!,
    averageTime: 120
  }));

  return {
    id: `exam_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test_user',
    examType: 'practice',
    startTime: new Date(endTime ? endTime.getTime() - 5400000 : Date.now() - 5400000), // 1.5 hours ago
    endTime: endTime || new Date(),
    totalQuestions: 60,
    correctAnswers: fullTopicBreakdown.reduce((sum, topic) => sum + topic.correctAnswers, 0),
    topicBreakdown: fullTopicBreakdown,
    timeSpent: 5400, // 90 minutes
    questions: []
  };
}

function createMockQuestions(topic: ExamTopic, count: number): Question[] {
  const questions: Question[] = [];
  const difficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

  for (let i = 0; i < count; i++) {
    questions.push({
      id: `question_${topic}_${i}`,
      topic,
      subtopic: `Subtopic ${i}`,
      difficulty: difficulties[i % 3],
      questionText: `Sample question ${i} for ${topic}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: `Explanation for question ${i}`,
      documentationLinks: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return questions;
}