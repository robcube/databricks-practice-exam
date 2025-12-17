import { ExamResultModel, validateExamResult, validateTopicScore } from './ExamResult';
import { ExamResult, TopicScore, QuestionResponse } from '../../../shared/types';

describe('ExamResultModel', () => {
  const validQuestionResponses: QuestionResponse[] = [
    {
      questionId: 'q1',
      selectedAnswer: 0,
      isCorrect: true,
      timeSpent: 120,
      answeredAt: new Date()
    },
    {
      questionId: 'q2',
      selectedAnswer: 1,
      isCorrect: false,
      timeSpent: 180,
      answeredAt: new Date()
    }
  ];

  const validTopicBreakdown: TopicScore[] = [
    {
      topic: 'Databricks Lakehouse Platform',
      totalQuestions: 1,
      correctAnswers: 1,
      percentage: 100,
      averageTime: 120
    },
    {
      topic: 'Production Pipelines',
      totalQuestions: 1,
      correctAnswers: 0,
      percentage: 0,
      averageTime: 180
    }
  ];

  const validExamResultData: Partial<ExamResult> = {
    userId: 'user123',
    examType: 'practice',
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: new Date('2023-01-01T11:30:00Z'),
    totalQuestions: 2,
    correctAnswers: 1,
    timeSpent: 5400, // 90 minutes
    questions: validQuestionResponses,
    topicBreakdown: validTopicBreakdown
  };

  describe('constructor', () => {
    it('should create a valid exam result with required fields', () => {
      const examResult = new ExamResultModel(validExamResultData);
      
      expect(examResult.userId).toBe('user123');
      expect(examResult.examType).toBe('practice');
      expect(examResult.totalQuestions).toBe(2);
      expect(examResult.correctAnswers).toBe(1);
      expect(examResult.timeSpent).toBe(5400);
      expect(examResult.id).toBeDefined();
    });

    it('should generate an ID if not provided', () => {
      const examResult = new ExamResultModel(validExamResultData);
      expect(examResult.id).toMatch(/^exam_result_\d+_[a-z0-9]+$/);
    });

    it('should throw error for missing user ID', () => {
      expect(() => {
        new ExamResultModel({ ...validExamResultData, userId: '' });
      }).toThrow('ExamResult validation failed: User ID is required');
    });

    it('should throw error when end time is before start time', () => {
      expect(() => {
        new ExamResultModel({
          ...validExamResultData,
          startTime: new Date('2023-01-01T11:00:00Z'),
          endTime: new Date('2023-01-01T10:00:00Z')
        });
      }).toThrow('ExamResult validation failed: End time must be after start time');
    });

    it('should throw error for negative values', () => {
      expect(() => {
        new ExamResultModel({ ...validExamResultData, totalQuestions: -1 });
      }).toThrow('ExamResult validation failed: Total questions must be non-negative');
      
      expect(() => {
        new ExamResultModel({ ...validExamResultData, correctAnswers: -1 });
      }).toThrow('ExamResult validation failed: Correct answers must be between 0 and total questions');
      
      expect(() => {
        new ExamResultModel({ ...validExamResultData, timeSpent: -1 });
      }).toThrow('ExamResult validation failed: Time spent must be non-negative');
    });

    it('should throw error when correct answers exceed total questions', () => {
      expect(() => {
        new ExamResultModel({ 
          ...validExamResultData, 
          totalQuestions: 2, 
          correctAnswers: 3 
        });
      }).toThrow('ExamResult validation failed: Correct answers must be between 0 and total questions');
    });

    it('should throw error for invalid exam type', () => {
      expect(() => {
        new ExamResultModel({ ...validExamResultData, examType: 'invalid' as any });
      }).toThrow('ExamResult validation failed: Exam type must be practice or assessment');
    });

    it('should throw error when topic breakdown totals do not match', () => {
      const invalidTopicBreakdown: TopicScore[] = [
        {
          topic: 'Databricks Lakehouse Platform',
          totalQuestions: 3, // This doesn't match total questions (2)
          correctAnswers: 1,
          percentage: 33.33,
          averageTime: 120
        }
      ];

      expect(() => {
        new ExamResultModel({ 
          ...validExamResultData, 
          topicBreakdown: invalidTopicBreakdown 
        });
      }).toThrow('ExamResult validation failed: Topic breakdown total questions must match exam total questions');
    });

    it('should throw error when questions array length does not match total', () => {
      expect(() => {
        new ExamResultModel({ 
          ...validExamResultData, 
          totalQuestions: 5,
          correctAnswers: 1,
          questions: validQuestionResponses, // Only 2 questions
          topicBreakdown: [] // Empty to avoid topic breakdown validation error
        });
      }).toThrow('Questions array length must match total questions');
    });
  });

  describe('getOverallScore', () => {
    it('should calculate correct percentage score', () => {
      const examResult = new ExamResultModel(validExamResultData);
      expect(examResult.getOverallScore()).toBe(50); // 1 out of 2 = 50%
    });

    it('should return 0 for exam with no questions', () => {
      const examResult = new ExamResultModel({
        ...validExamResultData,
        totalQuestions: 0,
        correctAnswers: 0,
        questions: [],
        topicBreakdown: []
      });
      expect(examResult.getOverallScore()).toBe(0);
    });
  });

  describe('getAverageTimePerQuestion', () => {
    it('should calculate correct average time', () => {
      const examResult = new ExamResultModel(validExamResultData);
      expect(examResult.getAverageTimePerQuestion()).toBe(2700); // 5400 / 2 = 2700 seconds
    });

    it('should return 0 for exam with no questions', () => {
      const examResult = new ExamResultModel({
        ...validExamResultData,
        totalQuestions: 0,
        correctAnswers: 0,
        timeSpent: 0,
        questions: [],
        topicBreakdown: []
      });
      expect(examResult.getAverageTimePerQuestion()).toBe(0);
    });
  });

  describe('getWeakTopics', () => {
    it('should identify topics below threshold', () => {
      const examResult = new ExamResultModel(validExamResultData);
      const weakTopics = examResult.getWeakTopics(70);
      
      expect(weakTopics).toContain('Production Pipelines'); // 0%
      expect(weakTopics).not.toContain('Databricks Lakehouse Platform'); // 100%
    });

    it('should return empty array when all topics are above threshold', () => {
      const examResult = new ExamResultModel(validExamResultData);
      const weakTopics = examResult.getWeakTopics(0);
      
      expect(weakTopics).toEqual([]);
    });
  });

  describe('getStrongTopics', () => {
    it('should identify topics above threshold', () => {
      const examResult = new ExamResultModel(validExamResultData);
      const strongTopics = examResult.getStrongTopics(80);
      
      expect(strongTopics).toContain('Databricks Lakehouse Platform'); // 100%
      expect(strongTopics).not.toContain('Production Pipelines'); // 0%
    });
  });

  describe('updateEndTime', () => {
    it('should update end time and calculate time spent', () => {
      const examResult = new ExamResultModel({
        ...validExamResultData,
        endTime: undefined as any
      });
      
      examResult.updateEndTime();
      expect(examResult.endTime).toBeInstanceOf(Date);
      expect(examResult.timeSpent).toBeGreaterThan(0);
    });
  });

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      const examResult = new ExamResultModel(validExamResultData);
      const json = examResult.toJSON();
      
      expect(json).toEqual({
        id: examResult.id,
        userId: examResult.userId,
        examType: examResult.examType,
        startTime: examResult.startTime,
        endTime: examResult.endTime,
        totalQuestions: examResult.totalQuestions,
        correctAnswers: examResult.correctAnswers,
        topicBreakdown: examResult.topicBreakdown,
        timeSpent: examResult.timeSpent,
        questions: examResult.questions
      });
    });
  });
});

describe('validateExamResult', () => {
  const validData = {
    userId: 'user123',
    examType: 'practice' as const,
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: new Date('2023-01-01T11:00:00Z'),
    totalQuestions: 0,
    correctAnswers: 0,
    timeSpent: 3600,
    questions: []
  };

  it('should return empty errors for valid exam result data', () => {
    const errors = validateExamResult(validData);
    expect(errors).toEqual([]);
  });

  it('should return errors for missing user ID', () => {
    const errors = validateExamResult({ ...validData, userId: '' });
    expect(errors).toContain('User ID is required and must be a non-empty string');
  });

  it('should return errors for invalid dates', () => {
    const errors = validateExamResult({
      ...validData,
      startTime: 'invalid' as any,
      endTime: 'invalid' as any
    });
    
    expect(errors).toContain('Start time must be a valid Date object');
    expect(errors).toContain('End time must be a valid Date object');
  });

  it('should return error when end time is before start time', () => {
    const errors = validateExamResult({
      ...validData,
      startTime: new Date('2023-01-01T11:00:00Z'),
      endTime: new Date('2023-01-01T10:00:00Z')
    });
    
    expect(errors).toContain('End time must be after start time');
  });

  it('should return errors for invalid numeric values', () => {
    const errors = validateExamResult({
      ...validData,
      totalQuestions: -1,
      correctAnswers: 10,
      timeSpent: -100
    });
    
    expect(errors).toContain('Total questions must be non-negative');
    expect(errors).toContain('Correct answers must be between 0 and total questions');
    expect(errors).toContain('Time spent must be non-negative');
  });

  it('should return error for invalid exam type', () => {
    const errors = validateExamResult({
      ...validData,
      examType: 'invalid' as any
    });
    
    expect(errors).toContain('Exam type must be practice or assessment');
  });
});

describe('validateTopicScore', () => {
  const validTopicScore = {
    topic: 'Databricks Lakehouse Platform' as const,
    totalQuestions: 5,
    correctAnswers: 3,
    percentage: 60,
    averageTime: 120
  };

  it('should return empty errors for valid topic score', () => {
    const errors = validateTopicScore(validTopicScore);
    expect(errors).toEqual([]);
  });

  it('should return errors for invalid topic', () => {
    const errors = validateTopicScore({
      ...validTopicScore,
      topic: 'Invalid Topic' as any
    });
    
    expect(errors).toContain('Topic must be one of the valid exam topics');
  });

  it('should return errors for invalid numeric values', () => {
    const errors = validateTopicScore({
      ...validTopicScore,
      totalQuestions: -1,
      correctAnswers: -1,
      percentage: 150,
      averageTime: -10
    });
    
    expect(errors).toContain('Total questions must be a non-negative number');
    expect(errors).toContain('Correct answers must be a non-negative number');
    expect(errors).toContain('Percentage must be a number between 0 and 100');
    expect(errors).toContain('Average time must be a non-negative number');
  });

  it('should return error when correct answers exceed total questions', () => {
    const errors = validateTopicScore({
      ...validTopicScore,
      totalQuestions: 3,
      correctAnswers: 5
    });
    
    expect(errors).toContain('Correct answers cannot exceed total questions');
  });
});