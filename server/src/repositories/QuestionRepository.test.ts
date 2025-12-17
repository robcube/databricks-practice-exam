import { QuestionRepository } from './QuestionRepository';
import { Question, ExamTopic } from '../../../shared/types';
import * as database from '../config/database';

// Mock the database module
jest.mock('../config/database');

describe('QuestionRepository', () => {
  let questionRepository: QuestionRepository;
  let mockQuery: jest.MockedFunction<typeof database.query>;

  beforeEach(() => {
    questionRepository = new QuestionRepository();
    mockQuery = database.query as jest.MockedFunction<typeof database.query>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a question and return it', async () => {
      const questionData = {
        topic: 'Databricks Lakehouse Platform' as ExamTopic,
        subtopic: 'Architecture',
        difficulty: 'easy' as const,
        questionText: 'What is Databricks Lakehouse Platform?',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 0,
        explanation: 'Databricks Lakehouse Platform combines data lakes and warehouses.'
      };

      const mockDbRow = {
        id: 'generated-id',
        topic: questionData.topic,
        subtopic: questionData.subtopic,
        difficulty: questionData.difficulty,
        question_text: questionData.questionText,
        code_example: null,
        options: JSON.stringify(questionData.options),
        correct_answer: questionData.correctAnswer,
        explanation: questionData.explanation,
        documentation_links: JSON.stringify([]),
        tags: JSON.stringify([]),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await questionRepository.create(questionData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO questions'),
        expect.arrayContaining([
          expect.any(String), // id
          questionData.topic,
          questionData.subtopic,
          questionData.difficulty,
          questionData.questionText,
          undefined, // code_example
          JSON.stringify(questionData.options),
          questionData.correctAnswer,
          questionData.explanation,
          JSON.stringify([]),
          JSON.stringify([]),
          expect.any(Date),
          expect.any(Date)
        ])
      );

      expect(result.topic).toBe(questionData.topic);
      expect(result.questionText).toBe(questionData.questionText);
      expect(result.options).toEqual(questionData.options);
    });
  });

  describe('findById', () => {
    it('should return question when found', async () => {
      const mockDbRow = {
        id: 'test-id',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Architecture',
        difficulty: 'easy',
        question_text: 'Test question',
        code_example: null,
        options: JSON.stringify(['A', 'B']),
        correct_answer: 0,
        explanation: 'Test explanation',
        documentation_links: JSON.stringify([]),
        tags: JSON.stringify([]),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValue({ rows: [mockDbRow] });

      const result = await questionRepository.findById('test-id');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM questions WHERE id = $1',
        ['test-id']
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id');
    });

    it('should return null when question not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await questionRepository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all questions without filters', async () => {
      const mockDbRows = [
        {
          id: 'q1',
          topic: 'Databricks Lakehouse Platform',
          subtopic: 'Architecture',
          difficulty: 'easy',
          question_text: 'Question 1',
          code_example: null,
          options: JSON.stringify(['A', 'B']),
          correct_answer: 0,
          explanation: 'Explanation 1',
          documentation_links: JSON.stringify([]),
          tags: JSON.stringify([]),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockDbRows });

      const result = await questionRepository.findAll();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM questions ORDER BY created_at DESC',
        []
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q1');
    });

    it('should apply topic filter', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await questionRepository.findAll({ topic: 'Production Pipelines' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM questions WHERE topic = $1 ORDER BY created_at DESC',
        ['Production Pipelines']
      );
    });

    it('should apply multiple filters', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await questionRepository.findAll({
        topic: 'Production Pipelines',
        difficulty: 'medium',
        hasCodeExample: true
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE topic = $1 AND difficulty = $2 AND code_example IS NOT NULL'),
        ['Production Pipelines', 'medium']
      );
    });

    it('should apply pagination', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await questionRepository.findAll({}, { limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 20]
      );
    });
  });

  describe('update', () => {
    it('should update existing question', async () => {
      const existingQuestion: Question = {
        id: 'test-id',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Architecture',
        difficulty: 'easy',
        questionText: 'Original question',
        options: ['A', 'B'],
        correctAnswer: 0,
        explanation: 'Original explanation',
        documentationLinks: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updateData = {
        questionText: 'Updated question text',
        explanation: 'Updated explanation'
      };

      const updatedDbRow = {
        id: 'test-id',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Architecture',
        difficulty: 'easy',
        question_text: 'Updated question text',
        code_example: null,
        options: JSON.stringify(['A', 'B']),
        correct_answer: 0,
        explanation: 'Updated explanation',
        documentation_links: JSON.stringify([]),
        tags: JSON.stringify([]),
        created_at: existingQuestion.createdAt,
        updated_at: new Date()
      };

      // Mock findById to return existing question
      mockQuery
        .mockResolvedValueOnce({ rows: [updatedDbRow] }) // findById call
        .mockResolvedValueOnce({ rows: [updatedDbRow] }); // update call

      const result = await questionRepository.update('test-id', updateData);

      expect(result).not.toBeNull();
      expect(result?.questionText).toBe('Updated question text');
      expect(result?.explanation).toBe('Updated explanation');
    });

    it('should return null when question not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await questionRepository.update('non-existent-id', {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete question and return true', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await questionRepository.delete('test-id');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM questions WHERE id = $1',
        ['test-id']
      );
      expect(result).toBe(true);
    });

    it('should return false when question not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await questionRepository.delete('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total count without filters', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });

      const result = await questionRepository.count();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM questions',
        []
      );
      expect(result).toBe(42);
    });

    it('should return filtered count', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '15' }] });

      const result = await questionRepository.count({ topic: 'Production Pipelines' });

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM questions WHERE topic = $1',
        ['Production Pipelines']
      );
      expect(result).toBe(15);
    });
  });
});