import { ScoringService } from './ScoringService';
import { ExamResult, Question, QuestionResponse, ExamTopic, TopicScore } from '../../../shared/types';

describe('ScoringService', () => {
  let scoringService: ScoringService;
  let mockExamResult: ExamResult;
  let mockQuestions: Question[];

  beforeEach(() => {
    scoringService = new ScoringService();

    // Create mock questions
    mockQuestions = [
      {
        id: 'q1',
        topic: 'Databricks Lakehouse Platform',
        subtopic: 'Architecture',
        difficulty: 'medium',
        questionText: 'What is the Databricks Lakehouse?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 1,
        explanation: 'The Databricks Lakehouse combines data lakes and data warehouses.',
        documentationLinks: ['https://docs.databricks.com/lakehouse'],
        tags: ['architecture', 'lakehouse'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q2',
        topic: 'Production Pipelines',
        subtopic: 'Delta Live Tables',
        difficulty: 'hard',
        questionText: 'How do you handle errors in Delta Live Tables?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 2,
        explanation: 'Error handling in DLT uses expectations and quarantine tables.',
        documentationLinks: ['https://docs.databricks.com/dlt/error-handling'],
        tags: ['dlt', 'error-handling'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q3',
        topic: 'Incremental Data Processing',
        subtopic: 'Merge Operations',
        difficulty: 'easy',
        questionText: 'What is a merge operation in Delta Lake?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0,
        explanation: 'Merge operations allow upserts in Delta Lake tables.',
        documentationLinks: ['https://docs.databricks.com/delta/merge'],
        tags: ['delta', 'merge'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Create mock exam result
    const responses: QuestionResponse[] = [
      {
        questionId: 'q1',
        selectedAnswer: 1,
        isCorrect: true,
        timeSpent: 120,
        answeredAt: new Date()
      },
      {
        questionId: 'q2',
        selectedAnswer: 1,
        isCorrect: false,
        timeSpent: 300,
        answeredAt: new Date()
      },
      {
        questionId: 'q3',
        selectedAnswer: 0,
        isCorrect: true,
        timeSpent: 60,
        answeredAt: new Date()
      }
    ];

    const topicBreakdown: TopicScore[] = [
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
        averageTime: 300
      },
      {
        topic: 'Incremental Data Processing',
        totalQuestions: 1,
        correctAnswers: 1,
        percentage: 100,
        averageTime: 60
      }
    ];

    mockExamResult = {
      id: 'exam_1',
      userId: 'user_1',
      examType: 'practice',
      startTime: new Date('2023-01-01T10:00:00Z'),
      endTime: new Date('2023-01-01T10:08:00Z'),
      totalQuestions: 3,
      correctAnswers: 2,
      topicBreakdown,
      timeSpent: 480,
      questions: responses
    };
  });

  describe('generateComprehensiveFeedback', () => {
    it('should generate comprehensive feedback for a completed exam', () => {
      const feedback = scoringService.generateComprehensiveFeedback(mockExamResult, mockQuestions);

      expect(feedback.examResult).toBe(mockExamResult);
      expect(feedback.overallScore).toBe(67); // 2/3 = 66.67% rounded to 67%
      expect(feedback.topicBreakdown).toBe(mockExamResult.topicBreakdown);
      expect(feedback.questionFeedback).toHaveLength(3);
      expect(feedback.timingAnalysis).toBeDefined();
      expect(feedback.performanceInsights).toBeDefined();
    });

    it('should throw error for invalid inputs', () => {
      expect(() => {
        scoringService.generateComprehensiveFeedback(null as any, mockQuestions);
      }).toThrow('Invalid exam result or questions data');

      expect(() => {
        scoringService.generateComprehensiveFeedback(mockExamResult, []);
      }).toThrow('Invalid exam result or questions data');

      expect(() => {
        scoringService.generateComprehensiveFeedback(mockExamResult, [mockQuestions[0]]);
      }).toThrow('Mismatch between exam result questions and provided questions');
    });
  });

  describe('generateQuestionFeedback', () => {
    it('should generate detailed feedback for each question', () => {
      const feedback = scoringService.generateQuestionFeedback(mockExamResult.questions, mockQuestions);

      expect(feedback).toHaveLength(3);
      
      expect(feedback[0]).toEqual({
        questionId: 'q1',
        questionText: 'What is the Databricks Lakehouse?',
        selectedAnswer: 1,
        correctAnswer: 1,
        isCorrect: true,
        explanation: 'The Databricks Lakehouse combines data lakes and data warehouses.',
        documentationLinks: ['https://docs.databricks.com/lakehouse'],
        timeSpent: 120,
        topic: 'Databricks Lakehouse Platform'
      });

      expect(feedback[1].isCorrect).toBe(false);
      expect(feedback[2].isCorrect).toBe(true);
    });

    it('should throw error when question not found', () => {
      const incompleteQuestions = [mockQuestions[0]]; // Only one question
      
      expect(() => {
        scoringService.generateQuestionFeedback(mockExamResult.questions, incompleteQuestions);
      }).toThrow('Question not found for response at index 1');
    });
  });

  describe('calculateTimingAnalysis', () => {
    it('should calculate comprehensive timing analysis', () => {
      const analysis = scoringService.calculateTimingAnalysis(mockExamResult.questions, mockQuestions);

      expect(analysis.totalTimeSpent).toBe(480); // 120 + 300 + 60
      expect(analysis.averageTimePerQuestion).toBe(160); // 480 / 3
      expect(analysis.fastestQuestion).toEqual({ questionId: 'q3', timeSpent: 60 });
      expect(analysis.slowestQuestion).toEqual({ questionId: 'q2', timeSpent: 300 });
      expect(analysis.timeByTopic).toHaveLength(3);
      expect(analysis.pacingAnalysis).toBeDefined();
    });

    it('should identify rushing and slow questions', () => {
      const rushingResponses: QuestionResponse[] = [
        {
          questionId: 'q1',
          selectedAnswer: 1,
          isCorrect: true,
          timeSpent: 15, // Too fast
          answeredAt: new Date()
        },
        {
          questionId: 'q2',
          selectedAnswer: 1,
          isCorrect: false,
          timeSpent: 400, // Too slow
          answeredAt: new Date()
        }
      ];

      const analysis = scoringService.calculateTimingAnalysis(rushingResponses, mockQuestions.slice(0, 2));

      expect(analysis.pacingAnalysis.rushingQuestions).toContain('q1');
      expect(analysis.pacingAnalysis.slowQuestions).toContain('q2');
      expect(analysis.pacingAnalysis.isWellPaced).toBe(false);
    });

    it('should throw error for empty responses', () => {
      expect(() => {
        scoringService.calculateTimingAnalysis([], mockQuestions);
      }).toThrow('No responses provided for timing analysis');
    });
  });

  describe('generatePerformanceInsights', () => {
    it('should generate appropriate insights for good performance', () => {
      const goodExamResult = {
        ...mockExamResult,
        correctAnswers: 3,
        topicBreakdown: mockExamResult.topicBreakdown.map(topic => ({
          ...topic,
          correctAnswers: topic.totalQuestions,
          percentage: 100
        }))
      };

      const timingAnalysis = scoringService.calculateTimingAnalysis(mockExamResult.questions, mockQuestions);
      const insights = scoringService.generatePerformanceInsights(goodExamResult, timingAnalysis);

      expect(insights.strengths).toContain('Excellent overall performance - you\'re well-prepared for the certification exam.');
      expect(insights.strengths.some(s => s.includes('Strong performance in:'))).toBe(true);
    });

    it('should identify weak areas and provide recommendations', () => {
      const timingAnalysis = scoringService.calculateTimingAnalysis(mockExamResult.questions, mockQuestions);
      const insights = scoringService.generatePerformanceInsights(mockExamResult, timingAnalysis);

      expect(insights.weaknesses.some(w => w.includes('Production Pipelines'))).toBe(true);
      expect(insights.recommendations.some(r => r.includes('Delta Live Tables'))).toBe(true);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate correct percentage score', () => {
      expect(scoringService.calculateOverallScore(mockExamResult)).toBe(67); // 2/3 = 66.67% rounded to 67%
    });

    it('should return 0 for exam with no questions', () => {
      const emptyExam = { ...mockExamResult, totalQuestions: 0, correctAnswers: 0 };
      expect(scoringService.calculateOverallScore(emptyExam)).toBe(0);
    });
  });

  describe('generateImmediateFeedback', () => {
    it('should generate immediate feedback summary', () => {
      const feedback = scoringService.generateImmediateFeedback(mockExamResult);

      expect(feedback.score).toBe(67);
      expect(feedback.passed).toBe(false); // Below 70%
      expect(feedback.correctAnswers).toBe(2);
      expect(feedback.totalQuestions).toBe(3);
      expect(feedback.timeSpent).toBe('8m'); // 480 seconds = 8 minutes
      expect(feedback.topPerformingTopic).toBe('Databricks Lakehouse Platform'); // 100%
      expect(feedback.weakestTopic).toBe('Production Pipelines'); // 0%
    });

    it('should format time correctly for hours and minutes', () => {
      const longExam = { ...mockExamResult, timeSpent: 3900 }; // 1 hour 5 minutes
      const feedback = scoringService.generateImmediateFeedback(longExam);
      expect(feedback.timeSpent).toBe('1h 5m');
    });
  });

  describe('validateExamResultForScoring', () => {
    it('should return no errors for valid exam result', () => {
      const errors = scoringService.validateExamResultForScoring(mockExamResult);
      expect(errors).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const invalidExam = {
        ...mockExamResult,
        id: '',
        userId: '',
        totalQuestions: 0
      };

      const errors = scoringService.validateExamResultForScoring(invalidExam);
      expect(errors).toContain('Exam result ID is required');
      expect(errors).toContain('User ID is required');
      expect(errors).toContain('Total questions must be greater than 0');
    });

    it('should validate question array consistency', () => {
      const invalidExam = {
        ...mockExamResult,
        questions: [mockExamResult.questions[0]] // Only 1 question instead of 3
      };

      const errors = scoringService.validateExamResultForScoring(invalidExam);
      expect(errors).toContain('Questions array must match total questions count');
    });

    it('should validate correct answers range', () => {
      const invalidExam = {
        ...mockExamResult,
        correctAnswers: 5 // More than total questions
      };

      const errors = scoringService.validateExamResultForScoring(invalidExam);
      expect(errors).toContain('Correct answers must be between 0 and total questions');
    });
  });
});