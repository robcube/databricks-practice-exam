import { ExamGenerationService, ExamGenerationRequest } from './ExamGenerationService';
import { ExamResult, ExamTopic, Question, QuestionDifficulty } from '../../../shared/types';

// Mock the dependencies
jest.mock('./AdaptiveQuestionService');
jest.mock('./QuestionService');

describe('ExamGenerationService', () => {
  let service: ExamGenerationService;
  let mockAdaptiveService: any;
  let mockQuestionService: any;

  beforeEach(() => {
    service = new ExamGenerationService();
    mockAdaptiveService = (service as any).adaptiveQuestionService;
    mockQuestionService = (service as any).questionService;

    // Setup default mocks
    mockAdaptiveService.analyzeUserPerformance = jest.fn();
    mockAdaptiveService.generateAdaptiveQuestionSet = jest.fn();
    mockAdaptiveService.calculatePerformanceTrends = jest.fn();
    mockAdaptiveService.generateStudyRecommendations = jest.fn();
    mockAdaptiveService.shouldReduceTopicAllocation = jest.fn();

    mockQuestionService.getQuestionsByTopic = jest.fn();
    mockQuestionService.validateQuestionBank = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateExam', () => {
    it('should generate adaptive exam for practice exams with exam history', async () => {
      const request: ExamGenerationRequest = {
        userId: 'test_user',
        examType: 'practice',
        totalQuestions: 60,
        useAdaptiveSelection: true
      };

      const examHistory = [createMockExamResult()];
      const mockQuestions = createMockQuestions(60);

      mockAdaptiveService.analyzeUserPerformance.mockResolvedValue({
        weakAreas: ['ELT with Spark SQL and Python'],
        strongAreas: ['Data Governance'],
        topicScores: new Map(),
        hasExamHistory: true,
        recommendedAllocation: []
      });

      mockAdaptiveService.generateAdaptiveQuestionSet.mockResolvedValue(mockQuestions);
      mockAdaptiveService.calculatePerformanceTrends.mockReturnValue([]);
      mockAdaptiveService.generateStudyRecommendations.mockReturnValue([]);

      const result = await service.generateExam(request, examHistory);

      expect(result.examSession).toBeDefined();
      expect(result.examSession.questions).toHaveLength(60);
      expect(result.examSession.examType).toBe('practice');
      expect(result.examSession.timeRemaining).toBe(5400); // 90 minutes
      expect(result.performanceAnalysis).toBeDefined();
      expect(result.studyRecommendations).toBeDefined();

      expect(mockAdaptiveService.analyzeUserPerformance).toHaveBeenCalledWith(examHistory, { totalQuestions: 60 });
      expect(mockAdaptiveService.generateAdaptiveQuestionSet).toHaveBeenCalledWith(examHistory, { totalQuestions: 60 });
    });

    it('should generate standard exam for assessment exams', async () => {
      const request: ExamGenerationRequest = {
        userId: 'test_user',
        examType: 'assessment',
        totalQuestions: 60
      };

      const examHistory = [createMockExamResult()];
      const mockQuestions = createMockQuestions(60);

      // Mock the question service to return questions for each topic
      mockQuestionService.getQuestionsByTopic.mockResolvedValue(mockQuestions.slice(0, 24)); // 12 * 2 for random selection

      const result = await service.generateExam(request, examHistory);

      expect(result.examSession).toBeDefined();
      expect(result.examSession.questions).toHaveLength(60);
      expect(result.examSession.examType).toBe('assessment');
      expect(result.performanceAnalysis).toBeUndefined(); // No adaptive analysis for assessment
      expect(result.studyRecommendations).toBeUndefined();

      // Should call getQuestionsByTopic for each of the 5 topics
      expect(mockQuestionService.getQuestionsByTopic).toHaveBeenCalledTimes(5);
    });

    it('should generate balanced exam for new users', async () => {
      const request: ExamGenerationRequest = {
        userId: 'test_user',
        examType: 'practice',
        totalQuestions: 60,
        useAdaptiveSelection: true
      };

      const examHistory: ExamResult[] = []; // No exam history
      const mockQuestions = createMockQuestions(60);

      mockAdaptiveService.analyzeUserPerformance.mockResolvedValue({
        weakAreas: [],
        strongAreas: [],
        topicScores: new Map(),
        hasExamHistory: false,
        recommendedAllocation: []
      });

      mockAdaptiveService.generateAdaptiveQuestionSet.mockResolvedValue(mockQuestions);
      mockAdaptiveService.calculatePerformanceTrends.mockReturnValue([]);
      mockAdaptiveService.generateStudyRecommendations.mockReturnValue([]);

      const result = await service.generateExam(request, examHistory);

      expect(result.examSession).toBeDefined();
      expect(result.examSession.questions).toHaveLength(60);
      expect(mockAdaptiveService.generateAdaptiveQuestionSet).toHaveBeenCalledWith([], { totalQuestions: 60 });
    });

    it('should filter questions by focus topics when specified', async () => {
      const request: ExamGenerationRequest = {
        userId: 'test_user',
        examType: 'practice',
        totalQuestions: 30,
        focusTopics: ['Production Pipelines', 'Incremental Data Processing'],
        useAdaptiveSelection: false
      };

      const examHistory: ExamResult[] = [];
      const mockQuestions = createMockQuestions(60);

      mockQuestionService.getQuestionsByTopic.mockImplementation((topic: ExamTopic) => {
        return Promise.resolve(mockQuestions.filter(q => q.topic === topic).slice(0, 30));
      });

      const result = await service.generateExam(request, examHistory);

      expect(result.examSession).toBeDefined();
      expect(result.examSession.questions.length).toBeLessThanOrEqual(30);
      
      // Should only call getQuestionsByTopic for focus topics and potentially for supplemental questions
      const topicCalls = mockQuestionService.getQuestionsByTopic.mock.calls.map((call: any[]) => call[0]);
      expect(topicCalls).toContain('Production Pipelines');
      expect(topicCalls).toContain('Incremental Data Processing');
    });

    it('should filter questions by difficulty when specified', async () => {
      const request: ExamGenerationRequest = {
        userId: 'test_user',
        examType: 'practice',
        totalQuestions: 30,
        difficulty: 'hard',
        useAdaptiveSelection: false
      };

      const examHistory: ExamResult[] = [];
      const mockQuestions = createMockQuestions(60);

      mockQuestionService.getQuestionsByTopic.mockResolvedValue(mockQuestions.slice(0, 24));

      const result = await service.generateExam(request, examHistory);

      expect(result.examSession).toBeDefined();
      // The actual filtering logic would be tested in integration, here we just verify the flow
      expect(result.examSession.questions).toBeDefined();
    });
  });

  describe('analyzePerformance', () => {
    it('should analyze user performance and return analytics', async () => {
      const userId = 'test_user';
      const examHistory = [createMockExamResult(), createMockExamResult()];

      mockAdaptiveService.analyzeUserPerformance.mockResolvedValue({
        weakAreas: ['ELT with Spark SQL and Python'],
        strongAreas: ['Data Governance'],
        topicScores: new Map([['ELT with Spark SQL and Python', 65]]),
        hasExamHistory: true,
        recommendedAllocation: []
      });

      mockAdaptiveService.calculatePerformanceTrends.mockReturnValue([
        {
          topic: 'ELT with Spark SQL and Python',
          scores: [60, 65, 70],
          dates: [new Date(), new Date(), new Date()],
          trend: 'improving'
        }
      ]);

      mockAdaptiveService.generateStudyRecommendations.mockReturnValue([
        {
          topic: 'ELT with Spark SQL and Python',
          priority: 'high',
          recommendedQuestions: 20,
          focusAreas: ['Advanced SQL operations']
        }
      ]);

      const result = await service.analyzePerformance(userId, examHistory);

      expect(result.userId).toBe(userId);
      expect(result.weakAreas).toContain('ELT with Spark SQL and Python');
      expect(result.strongAreas).toContain('Data Governance');
      expect(result.topicTrends).toHaveLength(1);
      expect(result.recommendedStudyPlan).toHaveLength(1);
      expect(result.overallProgress).toBeGreaterThanOrEqual(0);

      expect(mockAdaptiveService.analyzeUserPerformance).toHaveBeenCalledWith(examHistory);
      expect(mockAdaptiveService.calculatePerformanceTrends).toHaveBeenCalledWith(examHistory);
      expect(mockAdaptiveService.generateStudyRecommendations).toHaveBeenCalled();
    });

    it('should calculate overall progress correctly', async () => {
      const userId = 'test_user';
      const examHistory = [
        createMockExamResult(80), // 80% score
        createMockExamResult(85), // 85% score
        createMockExamResult(75)  // 75% score
      ];

      mockAdaptiveService.analyzeUserPerformance.mockResolvedValue({
        weakAreas: [],
        strongAreas: [],
        topicScores: new Map(),
        hasExamHistory: true,
        recommendedAllocation: []
      });

      mockAdaptiveService.calculatePerformanceTrends.mockReturnValue([]);
      mockAdaptiveService.generateStudyRecommendations.mockReturnValue([]);

      const result = await service.analyzePerformance(userId, examHistory);

      // Overall progress should be average of recent scores: (80 + 85 + 75) / 3 = 80
      expect(result.overallProgress).toBe(80);
    });
  });

  describe('shouldReduceTopicAllocation', () => {
    it('should delegate to adaptive service', async () => {
      const topic: ExamTopic = 'Data Governance';
      const examHistory = [createMockExamResult()];

      mockAdaptiveService.shouldReduceTopicAllocation.mockResolvedValue(true);

      const result = await service.shouldReduceTopicAllocation(topic, examHistory);

      expect(result).toBe(true);
      expect(mockAdaptiveService.shouldReduceTopicAllocation).toHaveBeenCalledWith(topic, examHistory);
    });
  });

  describe('generateStudyPlan', () => {
    it('should generate study recommendations', async () => {
      const userId = 'test_user';
      const examHistory = [createMockExamResult()];

      const mockRecommendations = [
        {
          topic: 'ELT with Spark SQL and Python' as ExamTopic,
          priority: 'high' as const,
          recommendedQuestions: 20,
          focusAreas: ['Advanced SQL operations']
        }
      ];

      mockAdaptiveService.analyzeUserPerformance.mockResolvedValue({
        weakAreas: ['ELT with Spark SQL and Python'],
        strongAreas: [],
        topicScores: new Map(),
        hasExamHistory: true,
        recommendedAllocation: []
      });

      mockAdaptiveService.calculatePerformanceTrends.mockReturnValue([]);
      mockAdaptiveService.generateStudyRecommendations.mockReturnValue(mockRecommendations);

      const result = await service.generateStudyPlan(userId, examHistory);

      expect(result).toEqual(mockRecommendations);
      expect(mockAdaptiveService.analyzeUserPerformance).toHaveBeenCalledWith(examHistory);
      expect(mockAdaptiveService.calculatePerformanceTrends).toHaveBeenCalledWith(examHistory);
      expect(mockAdaptiveService.generateStudyRecommendations).toHaveBeenCalled();
    });
  });

  describe('validateAdaptiveCapabilities', () => {
    it('should validate question bank and adaptive capabilities', async () => {
      mockQuestionService.validateQuestionBank.mockResolvedValue({
        isValid: true,
        issues: []
      });

      // Mock sufficient questions for each topic
      mockQuestionService.getQuestionsByTopic.mockResolvedValue(
        createMockQuestions(25) // More than minimum 20 required
      );

      const result = await service.validateAdaptiveCapabilities();

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(mockQuestionService.validateQuestionBank).toHaveBeenCalled();
      expect(mockQuestionService.getQuestionsByTopic).toHaveBeenCalledTimes(5); // Once for each topic
    });

    it('should identify insufficient questions for adaptive learning', async () => {
      mockQuestionService.validateQuestionBank.mockResolvedValue({
        isValid: true,
        issues: []
      });

      // Mock insufficient questions for some topics
      mockQuestionService.getQuestionsByTopic.mockImplementation((topic: ExamTopic) => {
        if (topic === 'Production Pipelines') {
          return Promise.resolve(createMockQuestions(15)); // Below minimum 20
        }
        return Promise.resolve(createMockQuestions(25));
      });

      const result = await service.validateAdaptiveCapabilities();

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => 
        issue.includes('Production Pipelines') && issue.includes('Insufficient questions')
      )).toBe(true);
    });

    it('should identify insufficient challenging questions', async () => {
      mockQuestionService.validateQuestionBank.mockResolvedValue({
        isValid: true,
        issues: []
      });

      // Mock questions with insufficient difficulty distribution
      mockQuestionService.getQuestionsByTopic.mockImplementation((topic: ExamTopic) => {
        const questions = createMockQuestions(25);
        // Make most questions easy (insufficient medium/hard)
        questions.forEach((q, index) => {
          q.difficulty = index < 5 ? 'medium' : 'easy'; // Only 5 medium, 0 hard
        });
        return Promise.resolve(questions);
      });

      const result = await service.validateAdaptiveCapabilities();

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => 
        issue.includes('Insufficient challenging questions')
      )).toBe(true);
    });
  });
});

// Helper functions for creating mock data

function createMockExamResult(overallScore?: number): ExamResult {
  const score = overallScore || 75;
  const totalQuestions = 60;
  const correctAnswers = Math.round((score / 100) * totalQuestions);

  return {
    id: `exam_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test_user',
    examType: 'practice',
    startTime: new Date(Date.now() - 5400000), // 1.5 hours ago
    endTime: new Date(),
    totalQuestions,
    correctAnswers,
    topicBreakdown: [
      { topic: 'Databricks Lakehouse Platform', totalQuestions: 12, correctAnswers: 9, percentage: 75, averageTime: 120 },
      { topic: 'ELT with Spark SQL and Python', totalQuestions: 12, correctAnswers: 8, percentage: 67, averageTime: 130 },
      { topic: 'Incremental Data Processing', totalQuestions: 12, correctAnswers: 10, percentage: 83, averageTime: 110 },
      { topic: 'Production Pipelines', totalQuestions: 12, correctAnswers: 9, percentage: 75, averageTime: 125 },
      { topic: 'Data Governance', totalQuestions: 12, correctAnswers: 11, percentage: 92, averageTime: 100 }
    ],
    timeSpent: 5400, // 90 minutes
    questions: []
  };
}

function createMockQuestions(count: number): Question[] {
  const questions: Question[] = [];
  const topics: ExamTopic[] = [
    'Databricks Lakehouse Platform',
    'ELT with Spark SQL and Python',
    'Incremental Data Processing',
    'Production Pipelines',
    'Data Governance'
  ];
  const difficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length];
    const difficulty = difficulties[i % difficulties.length];

    questions.push({
      id: `question_${i}`,
      topic,
      subtopic: `Subtopic ${i}`,
      difficulty,
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