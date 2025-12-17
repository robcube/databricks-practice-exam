import { ContentSpecificQuestionService, ContentCoverageValidation, DifficultyDistribution } from './ContentSpecificQuestionService';
import { QuestionService } from './QuestionService';
import { Question, ExamTopic } from '../../../shared/types';

// Mock the QuestionService
jest.mock('./QuestionService');

describe('ContentSpecificQuestionService', () => {
  let service: ContentSpecificQuestionService;
  let mockQuestionService: jest.Mocked<QuestionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContentSpecificQuestionService();
    mockQuestionService = jest.mocked(new QuestionService());
    (service as any).questionService = mockQuestionService;
  });

  describe('generateProductionPipelineQuestions', () => {
    it('should create Production Pipelines questions with required scenarios', async () => {
      const mockQuestion: Question = {
        id: 'test-id',
        topic: 'Production Pipelines',
        subtopic: 'Delta Live Tables',
        difficulty: 'medium',
        questionText: 'Test question',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Test explanation',
        documentationLinks: [],
        tags: ['delta-live-tables'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockQuestionService.createQuestion.mockResolvedValue(mockQuestion);

      const questions = await service.generateProductionPipelineQuestions();

      expect(questions).toHaveLength(6); // Should create 6 questions based on the implementation
      expect(mockQuestionService.createQuestion).toHaveBeenCalledTimes(6);
      
      // Verify that questions cover required scenarios
      const createCalls = mockQuestionService.createQuestion.mock.calls;
      const subtopics = createCalls.map(call => call[0].subtopic);
      
      expect(subtopics).toContain('Delta Live Tables');
      expect(subtopics).toContain('Job Scheduling');
      expect(subtopics).toContain('Error Handling');
    });

    it('should handle creation errors gracefully', async () => {
      const mockQuestion: Question = {
        id: 'test-id',
        topic: 'Production Pipelines',
        subtopic: 'Delta Live Tables',
        difficulty: 'medium',
        questionText: 'Test question',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Test explanation',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockQuestionService.createQuestion
        .mockResolvedValueOnce(mockQuestion)
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce(mockQuestion)
        .mockResolvedValueOnce(mockQuestion)
        .mockResolvedValueOnce(mockQuestion)
        .mockResolvedValueOnce(mockQuestion);

      const questions = await service.generateProductionPipelineQuestions();

      expect(questions).toHaveLength(5); // Should return only successful creations (5 out of 6)
    });
  });

  describe('generateIncrementalDataProcessingQuestions', () => {
    it('should create Incremental Data Processing questions with required scenarios', async () => {
      const mockQuestion: Question = {
        id: 'test-id',
        topic: 'Incremental Data Processing',
        subtopic: 'Merge Operations',
        difficulty: 'medium',
        questionText: 'Test question',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        explanation: 'Test explanation',
        documentationLinks: [],
        tags: ['merge-operations'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockQuestionService.createQuestion.mockResolvedValue(mockQuestion);

      const questions = await service.generateIncrementalDataProcessingQuestions();

      expect(questions).toHaveLength(6); // Should create 6 questions based on the implementation
      expect(mockQuestionService.createQuestion).toHaveBeenCalledTimes(6);
      
      // Verify that questions cover required scenarios
      const createCalls = mockQuestionService.createQuestion.mock.calls;
      const subtopics = createCalls.map(call => call[0].subtopic);
      
      expect(subtopics).toContain('Merge Operations');
      expect(subtopics).toContain('Change Data Capture');
      expect(subtopics).toContain('Streaming');
    });
  });

  describe('validateContentCoverage', () => {
    it('should validate Production Pipelines content coverage correctly', async () => {
      const mockQuestions: Question[] = [
        {
          id: '1',
          topic: 'Production Pipelines',
          subtopic: 'Delta Live Tables',
          difficulty: 'medium',
          questionText: 'Question about Delta Live Tables',
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          tags: ['delta-live-tables'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          topic: 'Production Pipelines',
          subtopic: 'Job Scheduling',
          difficulty: 'medium',
          questionText: 'Question about job scheduling',
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          tags: ['job-scheduling'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockQuestionService.getQuestionsByTopic.mockResolvedValue(mockQuestions);

      const validation = await service.validateContentCoverage('Production Pipelines');

      expect(validation.topic).toBe('Production Pipelines');
      expect(validation.requiredScenarios).toContain('Delta Live Tables');
      expect(validation.requiredScenarios).toContain('Job Scheduling');
      expect(validation.missingScenarios).toContain('Error Handling'); // Not covered in mock data
      expect(validation.coveragePercentage).toBe(40); // 2 out of 5 scenarios covered
      expect(validation.isValid).toBe(false);
    });

    it('should validate Incremental Data Processing content coverage correctly', async () => {
      const mockQuestions: Question[] = [
        {
          id: '1',
          topic: 'Incremental Data Processing',
          subtopic: 'Merge Operations',
          difficulty: 'medium',
          questionText: 'Question about merge operations',
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          tags: ['merge-operations'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          topic: 'Incremental Data Processing',
          subtopic: 'Change Data Capture',
          difficulty: 'medium',
          questionText: 'Question about CDC',
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          tags: ['cdc'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          topic: 'Incremental Data Processing',
          subtopic: 'Streaming',
          difficulty: 'medium',
          questionText: 'Question about streaming with watermark',
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          tags: ['streaming', 'watermarking'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockQuestionService.getQuestionsByTopic.mockResolvedValue(mockQuestions);

      const validation = await service.validateContentCoverage('Incremental Data Processing');

      expect(validation.topic).toBe('Incremental Data Processing');
      expect(validation.requiredScenarios).toContain('Merge Operations');
      expect(validation.requiredScenarios).toContain('Change Data Capture');
      expect(validation.requiredScenarios).toContain('Streaming Processing');
      expect(validation.missingScenarios).toContain('Exactly-Once Semantics'); // Not covered in mock data
      expect(validation.coveragePercentage).toBe(80); // 4 out of 5 scenarios covered
      expect(validation.isValid).toBe(false);
    });

    it('should return 100% coverage when all scenarios are present', async () => {
      const mockQuestions: Question[] = [
        {
          id: '1',
          topic: 'Production Pipelines',
          subtopic: 'Delta Live Tables',
          questionText: 'Delta Live Tables question',
          tags: ['delta-live-tables'],
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          difficulty: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          topic: 'Production Pipelines',
          subtopic: 'Job Scheduling',
          questionText: 'Job scheduling question',
          tags: ['job-scheduling'],
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          difficulty: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          topic: 'Production Pipelines',
          subtopic: 'Error Handling',
          questionText: 'Error handling question',
          tags: ['error-handling'],
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          difficulty: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '4',
          topic: 'Production Pipelines',
          subtopic: 'Pipeline Orchestration',
          questionText: 'Pipeline orchestration question',
          tags: ['pipeline-orchestration'],
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          difficulty: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '5',
          topic: 'Production Pipelines',
          subtopic: 'Data Quality',
          questionText: 'Data quality expectations question',
          tags: ['data-quality'],
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation',
          documentationLinks: [],
          difficulty: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockQuestionService.getQuestionsByTopic.mockResolvedValue(mockQuestions);

      const validation = await service.validateContentCoverage('Production Pipelines');

      expect(validation.coveragePercentage).toBe(100);
      expect(validation.isValid).toBe(true);
      expect(validation.missingScenarios).toHaveLength(0);
    });
  });

  describe('generateQuestionsWithDifficultyVariation', () => {
    it('should generate questions with default difficulty distribution', async () => {
      const mockEasyQuestions = Array(10).fill(null).map((_, i) => ({
        id: `easy-${i}`,
        topic: 'Production Pipelines' as ExamTopic,
        difficulty: 'easy' as const,
        subtopic: 'Test',
        questionText: 'Test',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Test',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const mockMediumQuestions = Array(10).fill(null).map((_, i) => ({
        id: `medium-${i}`,
        topic: 'Production Pipelines' as ExamTopic,
        difficulty: 'medium' as const,
        subtopic: 'Test',
        questionText: 'Test',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Test',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const mockHardQuestions = Array(10).fill(null).map((_, i) => ({
        id: `hard-${i}`,
        topic: 'Production Pipelines' as ExamTopic,
        difficulty: 'hard' as const,
        subtopic: 'Test',
        questionText: 'Test',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Test',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockQuestionService.searchQuestions
        .mockResolvedValueOnce({
          questions: mockEasyQuestions,
          total: 10,
          page: 1,
          pageSize: 6,
          totalPages: 1
        })
        .mockResolvedValueOnce({
          questions: mockMediumQuestions,
          total: 10,
          page: 1,
          pageSize: 10,
          totalPages: 1
        })
        .mockResolvedValueOnce({
          questions: mockHardQuestions,
          total: 10,
          page: 1,
          pageSize: 4,
          totalPages: 1
        });

      const questions = await service.generateQuestionsWithDifficultyVariation('Production Pipelines', 10);

      expect(questions).toHaveLength(10);
      
      // Check distribution (30% easy, 50% medium, 20% hard for 10 questions = 3, 5, 2)
      const easyCount = questions.filter(q => q.difficulty === 'easy').length;
      const mediumCount = questions.filter(q => q.difficulty === 'medium').length;
      const hardCount = questions.filter(q => q.difficulty === 'hard').length;

      expect(easyCount).toBe(3);
      expect(mediumCount).toBe(5);
      expect(hardCount).toBe(2);
    });

    it('should generate questions with custom difficulty distribution', async () => {
      const customDistribution: DifficultyDistribution = {
        easy: 0.5,
        medium: 0.3,
        hard: 0.2
      };

      const mockQuestions = Array(20).fill(null).map((_, i) => ({
        id: `question-${i}`,
        topic: 'Production Pipelines' as ExamTopic,
        difficulty: 'easy' as const,
        subtopic: 'Test',
        questionText: 'Test',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Test',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockQuestionService.searchQuestions.mockResolvedValue({
        questions: mockQuestions,
        total: 20,
        page: 1,
        pageSize: 20,
        totalPages: 1
      });

      const questions = await service.generateQuestionsWithDifficultyVariation(
        'Production Pipelines', 
        10, 
        customDistribution
      );

      expect(questions).toHaveLength(10);
      expect(mockQuestionService.searchQuestions).toHaveBeenCalledTimes(3);
    });
  });

  describe('getComprehensiveContentCoverageReport', () => {
    it('should return coverage reports for both Production Pipelines and Incremental Data Processing', async () => {
      const mockValidation: ContentCoverageValidation = {
        topic: 'Production Pipelines',
        requiredScenarios: ['Delta Live Tables'],
        missingScenarios: [],
        coveragePercentage: 100,
        isValid: true
      };

      mockQuestionService.getQuestionsByTopic.mockResolvedValue([]);
      
      // Mock the validateContentCoverage method
      jest.spyOn(service, 'validateContentCoverage').mockResolvedValue(mockValidation);

      const reports = await service.getComprehensiveContentCoverageReport();

      expect(reports).toHaveLength(2);
      expect(service.validateContentCoverage).toHaveBeenCalledWith('Production Pipelines');
      expect(service.validateContentCoverage).toHaveBeenCalledWith('Incremental Data Processing');
    });
  });

  describe('initializeContentSpecificQuestions', () => {
    it('should initialize questions for both topics and return coverage report', async () => {
      const mockQuestion: Question = {
        id: 'test-id',
        topic: 'Production Pipelines',
        subtopic: 'Test',
        difficulty: 'medium',
        questionText: 'Test question',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Test explanation',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockQuestionService.createQuestion.mockResolvedValue(mockQuestion);
      mockQuestionService.getQuestionsByTopic.mockResolvedValue([]);

      const result = await service.initializeContentSpecificQuestions();

      expect(result.productionPipelineQuestions).toBeDefined();
      expect(result.incrementalProcessingQuestions).toBeDefined();
      expect(result.coverageReport).toBeDefined();
      expect(result.coverageReport).toHaveLength(2);
    });
  });
});