import { QuestionService, QuestionCreateRequest } from './QuestionService';
import { QuestionRepository } from '../repositories/QuestionRepository';
import { Question, ExamTopic, QuestionDifficulty } from '../../../shared/types';

// Mock the repository
jest.mock('../repositories/QuestionRepository');

describe('QuestionService', () => {
  let questionService: QuestionService;
  let mockQuestionRepository: jest.Mocked<QuestionRepository>;

  beforeEach(() => {
    questionService = new QuestionService();
    mockQuestionRepository = new QuestionRepository() as jest.Mocked<QuestionRepository>;
    (questionService as any).questionRepository = mockQuestionRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuestion', () => {
    const validQuestionData: QuestionCreateRequest = {
      topic: 'Production Pipelines',
      subtopic: 'Delta Live Tables',
      difficulty: 'medium',
      questionText: 'What is the purpose of Delta Live Tables in production pipelines?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'Delta Live Tables provide declarative ETL for production data pipelines.',
      documentationLinks: ['https://docs.databricks.com/delta-live-tables/'],
      tags: ['delta-live-tables', 'pipeline']
    };

    it('should create a question with valid data', async () => {
      const expectedQuestion: Question = {
        id: 'test-id',
        ...validQuestionData,
        documentationLinks: validQuestionData.documentationLinks || [],
        tags: validQuestionData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockQuestionRepository.create.mockResolvedValue(expectedQuestion);

      const result = await questionService.createQuestion(validQuestionData);

      expect(mockQuestionRepository.create).toHaveBeenCalledWith(validQuestionData);
      expect(result).toEqual(expectedQuestion);
    });

    it('should throw error for invalid question data', async () => {
      const invalidQuestionData = {
        ...validQuestionData,
        questionText: 'Short' // Too short
      };

      await expect(questionService.createQuestion(invalidQuestionData))
        .rejects.toThrow('Question validation failed');
    });

    it('should validate Production Pipelines topic requirements', async () => {
      const invalidProductionQuestion = {
        ...validQuestionData,
        topic: 'Production Pipelines' as ExamTopic,
        questionText: 'What is the capital of France?', // Not relevant to Production Pipelines
        subtopic: 'Geography'
      };

      await expect(questionService.createQuestion(invalidProductionQuestion))
        .rejects.toThrow('Production Pipelines questions must include relevant scenarios');
    });

    it('should validate Incremental Data Processing topic requirements', async () => {
      const invalidIncrementalQuestion = {
        ...validQuestionData,
        topic: 'Incremental Data Processing' as ExamTopic,
        questionText: 'What is the capital of France?', // Not relevant to Incremental Data Processing
        subtopic: 'Geography'
      };

      await expect(questionService.createQuestion(invalidIncrementalQuestion))
        .rejects.toThrow('Incremental Data Processing questions must include relevant scenarios');
    });
  });

  describe('getQuestionById', () => {
    it('should return question when found', async () => {
      const expectedQuestion: Question = {
        id: 'test-id',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Architecture',
        difficulty: 'easy',
        questionText: 'What is Databricks?',
        options: ['Option A', 'Option B'],
        correctAnswer: 0,
        explanation: 'Databricks is a unified analytics platform.',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockQuestionRepository.findById.mockResolvedValue(expectedQuestion);

      const result = await questionService.getQuestionById('test-id');

      expect(mockQuestionRepository.findById).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(expectedQuestion);
    });

    it('should return null when question not found', async () => {
      mockQuestionRepository.findById.mockResolvedValue(null);

      const result = await questionService.getQuestionById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw error for invalid ID', async () => {
      await expect(questionService.getQuestionById(''))
        .rejects.toThrow('Question ID is required and must be a string');
    });
  });

  describe('searchQuestions', () => {
    it('should return paginated search results', async () => {
      const mockQuestions: Question[] = [
        {
          id: 'q1',
          topic: 'Databricks Lakehouse Platform',
          subtopic: 'Architecture',
          difficulty: 'easy',
          questionText: 'Question 1',
          options: ['A', 'B'],
          correctAnswer: 0,
          explanation: 'Explanation 1',
          documentationLinks: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockQuestionRepository.findAll.mockResolvedValue(mockQuestions);
      mockQuestionRepository.count.mockResolvedValue(1);

      const result = await questionService.searchQuestions({}, 1, 20);

      expect(result).toEqual({
        questions: mockQuestions,
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1
      });
    });

    it('should validate page parameters', async () => {
      await expect(questionService.searchQuestions({}, 0, 20))
        .rejects.toThrow('Page number must be greater than 0');

      await expect(questionService.searchQuestions({}, 1, 0))
        .rejects.toThrow('Page size must be between 1 and 100');

      await expect(questionService.searchQuestions({}, 1, 101))
        .rejects.toThrow('Page size must be between 1 and 100');
    });
  });

  describe('validateQuestionBank', () => {
    it('should identify missing topics', async () => {
      // Mock empty results for all topics
      mockQuestionRepository.findByTopic.mockResolvedValue([]);

      const result = await questionService.validateQuestionBank();

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('No questions found for topic: Databricks Lakehouse Platform');
      expect(result.issues).toContain('No questions found for topic: Production Pipelines');
    });

    it('should identify insufficient questions per topic', async () => {
      const mockQuestion: Question = {
        id: 'q1',
        topic: 'Production Pipelines',
        subtopic: 'Test',
        difficulty: 'easy',
        questionText: 'Test question',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Test explanation',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock insufficient questions (less than 5)
      mockQuestionRepository.findByTopic.mockImplementation((topic) => {
        if (topic === 'Production Pipelines') {
          return Promise.resolve([mockQuestion]); // Only 1 question
        }
        return Promise.resolve([]);
      });

      const result = await questionService.validateQuestionBank();

      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => 
        issue.includes('Insufficient questions for topic: Production Pipelines')
      )).toBe(true);
    });
  });

  describe('getQuestionsByTags', () => {
    it('should throw error for empty tags array', async () => {
      await expect(questionService.getQuestionsByTags([]))
        .rejects.toThrow('At least one tag is required');
    });

    it('should return questions with specified tags', async () => {
      const mockQuestions: Question[] = [];
      mockQuestionRepository.findByTags.mockResolvedValue(mockQuestions);

      const result = await questionService.getQuestionsByTags(['delta-live-tables']);

      expect(mockQuestionRepository.findByTags).toHaveBeenCalledWith(['delta-live-tables'], undefined);
      expect(result).toEqual(mockQuestions);
    });
  });
});