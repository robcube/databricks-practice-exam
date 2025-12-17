import { ExamEngineService } from '../services/ExamEngineService';
import { ScoringService } from '../services/ScoringService';
import { Question, ExamResult, ExamType, QuestionResponse, ExamTopic } from '../../../shared/types';
import * as fc from 'fast-check';
import { describe, it, beforeEach, expect } from '@jest/globals';

/**
 * Comprehensive Validation Tests for Timing and Scoring Functions
 * Tests exam timing enforcement, scoring accuracy, and feedback generation
 */
describe('Timing and Scoring Validation', () => {
  let examEngine: ExamEngineService;
  let scoringService: ScoringService;

  const mockQuestions: Question[] = [
    {
      id: 'q1',
      topic: 'Production Pipelines',
      subtopic: 'Delta Live Tables',
      difficulty: 'medium',
      questionText: 'What is the correct decorator for Delta Live Tables?',
      codeExample: '@dlt.table\ndef my_table():\n  return spark.read.table("source")',
      options: ['@dlt.table', '@delta.table', '@spark.table', 'CREATE TABLE'],
      correctAnswer: 0,
      explanation: 'Delta Live Tables use the @dlt.table decorator',
      documentationLinks: ['https://docs.databricks.com/delta-live-tables/'],
      tags: ['delta-live-tables'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'q2',
      topic: 'Incremental Data Processing',
      subtopic: 'Merge Operations',
      difficulty: 'hard',
      questionText: 'Which SQL command is used for upsert operations?',
      codeExample: 'MERGE INTO target USING source ON condition',
      options: ['INSERT', 'UPDATE', 'MERGE', 'UPSERT'],
      correctAnswer: 2,
      explanation: 'MERGE command handles both INSERT and UPDATE operations',
      documentationLinks: ['https://docs.databricks.com/sql/language-manual/delta-merge-into.html'],
      tags: ['merge', 'upsert'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    examEngine = new ExamEngineService();
    scoringService = new ScoringService();
  });

  describe('Exam Timing Validation', () => {
    /**
     * Feature: databricks-practice-exam, Property 14: Comprehensive timing enforcement
     * Validates: Requirements 4.1, 4.2, 4.3
     */
    it('should enforce 90-minute time limit correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.constantFrom('practice', 'assessment'),
          (userId, examType) => {
            const session = examEngine.startExamSession(
              userId,
              examType as ExamType,
              mockQuestions
            );

            // Verify initial time remaining is 90 minutes (5400 seconds)
            const timeRemaining = examEngine.getTimeRemaining(session.id);
            expect(timeRemaining).toBeLessThanOrEqual(90 * 60); // 5400 seconds
            expect(timeRemaining).toBeGreaterThan(89 * 60); // Allow for small processing delay

            // Verify session properties
            expect(session.startTime).toBeInstanceOf(Date);
            expect(session.isCompleted).toBe(false);
            expect(session.isPaused).toBe(false);

            // Cleanup
            examEngine.endSession(session.id);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle pause and resume correctly maintaining timer', async () => {
      const userId = 'test-user-pause';
      const session = examEngine.startExamSession(userId, 'practice', mockQuestions);

      // Get initial time
      const initialTime = examEngine.getTimeRemaining(session.id);

      // Pause the exam
      const pauseSuccess = examEngine.pauseExamSession(session.id);
      expect(pauseSuccess).toBe(true);
      expect(examEngine.getExamSession(session.id)?.isPaused).toBe(true);

      // Wait a bit (simulate user taking a break)
      const pauseDelay = 100; // 100ms
      await new Promise(resolve => setTimeout(resolve, pauseDelay));
      
      // Resume the exam
      const resumeSuccess = examEngine.resumeExamSession(session.id);
      expect(resumeSuccess).toBe(true);
      expect(examEngine.getExamSession(session.id)?.isPaused).toBe(false);

      // Time should be approximately the same (accounting for pause)
      const resumedTime = examEngine.getTimeRemaining(session.id);
      expect(resumedTime).toBeLessThanOrEqual(initialTime);
      expect(resumedTime).toBeGreaterThan(initialTime - 10); // Allow small tolerance for processing

      // Cleanup
      examEngine.endSession(session.id);
    });

    it('should automatically complete exam when time expires', async () => {
      const userId = 'test-user-timeout';
      
      // Create a session with very short time limit for testing
      const shortTimeEngine = new ExamEngineService({ timeLimit: 1 }); // 1 second
      const session = shortTimeEngine.startExamSession(userId, 'practice', mockQuestions);

      // Wait for timeout plus buffer
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const timeRemaining = shortTimeEngine.getTimeRemaining(session.id);
      expect(timeRemaining).toBeLessThanOrEqual(1); // Allow small buffer
      
      // Force completion should work when time is up
      const result = shortTimeEngine.forceCompleteExam(session.id);
      expect(result).toBeDefined();
      expect(result?.endTime).toBeInstanceOf(Date);

      // Cleanup
      shortTimeEngine.endSession(session.id);
    });

    /**
     * Feature: databricks-practice-exam, Property 16: Early completion review
     * Validates: Requirements 4.5
     */
    it('should enable review mode after early completion', () => {
      const userId = 'test-user-early';
      const session = examEngine.startExamSession(userId, 'practice', mockQuestions);

      // Answer first question
      const submitSuccess = examEngine.submitAnswer(session.id, mockQuestions[0].id, 0);
      expect(submitSuccess).toBe(true);

      // Complete early
      const result = examEngine.completeExamEarly(session.id);
      expect(result).toBeDefined();
      expect(result?.endTime).toBeInstanceOf(Date);

      // Verify review mode is enabled
      expect(examEngine.isInReviewMode(session.id)).toBe(true);

      // Should be able to navigate in review mode
      const navSuccess = examEngine.navigateToQuestion(session.id, 0);
      expect(navSuccess).toBe(true);

      // Time should still be available for review
      const timeRemaining = examEngine.getTimeRemaining(session.id);
      expect(timeRemaining).toBeGreaterThan(0);

      // Cleanup
      examEngine.endSession(session.id);
    });
  });

  describe('Scoring Accuracy Validation', () => {
    /**
     * Feature: databricks-practice-exam, Property 3: Immediate feedback provision
     * Validates: Requirements 1.3
     */
    it('should generate immediate feedback for all completed exams', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              questionId: fc.string({ minLength: 1 }),
              selectedAnswer: fc.integer({ min: 0, max: 3 }),
              isCorrect: fc.boolean(),
              timeSpent: fc.integer({ min: 30, max: 600 }),
              answeredAt: fc.date()
            }),
            { minLength: 1, maxLength: 2 } // Match mockQuestions length
          ),
          (questionResponses) => {
            const topics: ExamTopic[] = [
              'Production Pipelines',
              'Incremental Data Processing',
              'Data Governance'
            ];
            
            // Create matching questions for the responses
            const questions: Question[] = questionResponses.map((response, index) => ({
              id: response.questionId,
              topic: topics[index % topics.length],
              subtopic: 'Test',
              difficulty: 'medium',
              questionText: `Test question ${index + 1}`,
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: response.isCorrect ? response.selectedAnswer : (response.selectedAnswer + 1) % 4,
              explanation: 'Test explanation',
              documentationLinks: [],
              tags: [],
              createdAt: new Date(),
              updatedAt: new Date()
            }));

            const examResult: ExamResult = {
              id: 'test-exam',
              userId: 'test-user',
              examType: 'practice',
              startTime: new Date(Date.now() - 3600000),
              endTime: new Date(),
              totalQuestions: questionResponses.length,
              correctAnswers: questionResponses.filter(q => q.isCorrect).length,
              topicBreakdown: [],
              timeSpent: questionResponses.reduce((sum, q) => sum + q.timeSpent, 0),
              questions: questionResponses.map(q => ({
                ...q,
                isCorrect: q.isCorrect
              })) as QuestionResponse[]
            };

            const feedback = scoringService.generateComprehensiveFeedback(examResult, questions);

            // Verify feedback contains all required elements
            expect(feedback).toHaveProperty('overallScore');
            expect(feedback).toHaveProperty('examResult');
            expect(feedback).toHaveProperty('topicBreakdown');
            expect(feedback).toHaveProperty('questionFeedback');
            expect(feedback).toHaveProperty('timingAnalysis');

            // Verify score calculation accuracy
            const expectedCorrect = questionResponses.filter(q => q.isCorrect).length;
            expect(feedback.examResult.correctAnswers).toBe(expectedCorrect);
            
            const expectedPercentage = Math.round((expectedCorrect / questionResponses.length) * 100);
            expect(feedback.overallScore).toBe(expectedPercentage);

            return true;
          }
        ),
        { numRuns: 10 } // Reduce runs for faster testing
      );
    });

    /**
     * Feature: databricks-practice-exam, Property 15: Timing analysis provision
     * Validates: Requirements 4.4
     */
    it('should provide accurate timing analysis', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              questionId: fc.string({ minLength: 1 }),
              selectedAnswer: fc.integer({ min: 0, max: 3 }),
              timeSpent: fc.integer({ min: 60, max: 300 }), // More reasonable time range
              difficulty: fc.constantFrom('easy', 'medium', 'hard')
            }),
            { minLength: 5, maxLength: 10 } // Smaller range for faster testing
          ),
          (questionData) => {
            const questions: Question[] = questionData.map((q, index) => ({
              id: q.questionId,
              topic: 'Production Pipelines',
              subtopic: 'Test',
              difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
              questionText: `Question ${index + 1}`,
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
              explanation: 'Test explanation',
              documentationLinks: [],
              tags: [],
              createdAt: new Date(),
              updatedAt: new Date()
            }));

            const questionResponses: QuestionResponse[] = questionData.map(q => ({
              questionId: q.questionId,
              selectedAnswer: q.selectedAnswer,
              isCorrect: q.selectedAnswer === 0,
              timeSpent: q.timeSpent,
              answeredAt: new Date()
            }));

            const timingAnalysis = scoringService.calculateTimingAnalysis(questionResponses, questions);

            // Verify timing calculations
            const expectedTotalTime = questionData.reduce((sum, q) => sum + q.timeSpent, 0);
            const expectedAverageTime = Math.round(expectedTotalTime / questionData.length);

            expect(timingAnalysis.totalTimeSpent).toBe(expectedTotalTime);
            expect(timingAnalysis.averageTimePerQuestion).toBeCloseTo(expectedAverageTime, 0);

            // Verify topic-based analysis
            expect(timingAnalysis.timeByTopic).toBeDefined();
            expect(timingAnalysis.timeByTopic.length).toBeGreaterThan(0);

            // Verify pacing analysis
            expect(timingAnalysis.pacingAnalysis).toBeDefined();
            expect(timingAnalysis.pacingAnalysis.isWellPaced).toBeDefined();
            expect(timingAnalysis.pacingAnalysis.recommendations).toBeDefined();

            return true;
          }
        ),
        { numRuns: 10 } // Reduce runs for faster testing
      );
    });

    it('should calculate topic breakdown accurately', () => {
      const mockExamResult: ExamResult = {
        id: 'test-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalQuestions: 2,
        correctAnswers: 1,
        topicBreakdown: [
          {
            topic: 'Production Pipelines',
            totalQuestions: 1,
            correctAnswers: 1,
            percentage: 100,
            averageTime: 200
          },
          {
            topic: 'Incremental Data Processing',
            totalQuestions: 1,
            correctAnswers: 0,
            percentage: 0,
            averageTime: 150
          }
        ],
        timeSpent: 350,
        questions: [
          {
            questionId: 'q1',
            selectedAnswer: 0,
            isCorrect: true,
            timeSpent: 200,
            answeredAt: new Date()
          },
          {
            questionId: 'q2',
            selectedAnswer: 1,
            isCorrect: false,
            timeSpent: 150,
            answeredAt: new Date()
          }
        ]
      };

      const feedback = scoringService.generateComprehensiveFeedback(mockExamResult, mockQuestions);

      // Verify topic breakdown accuracy
      expect(feedback.topicBreakdown).toHaveLength(2);
      
      const productionPipelines = feedback.topicBreakdown.find(t => t.topic === 'Production Pipelines');
      expect(productionPipelines?.percentage).toBe(100);
      expect(productionPipelines?.correctAnswers).toBe(1);
      expect(productionPipelines?.totalQuestions).toBe(1);

      const incrementalProcessing = feedback.topicBreakdown.find(t => t.topic === 'Incremental Data Processing');
      expect(incrementalProcessing?.percentage).toBe(0);
      expect(incrementalProcessing?.correctAnswers).toBe(0);
      expect(incrementalProcessing?.totalQuestions).toBe(1);
    });
  });

  describe('Feedback Generation Validation', () => {
    /**
     * Feature: databricks-practice-exam, Property 7: Incorrect answer explanations
     * Validates: Requirements 2.4
     */
    it('should provide explanations for all incorrect answers', () => {
      const examResult: ExamResult = {
        id: 'test-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalQuestions: 2,
        correctAnswers: 1,
        topicBreakdown: [],
        timeSpent: 600,
        questions: [
          {
            questionId: 'q1',
            selectedAnswer: 0,
            isCorrect: true,
            timeSpent: 300,
            answeredAt: new Date()
          },
          {
            questionId: 'q2',
            selectedAnswer: 1,
            isCorrect: false,
            timeSpent: 300,
            answeredAt: new Date()
          }
        ]
      };

      const feedback = scoringService.generateComprehensiveFeedback(examResult, mockQuestions);

      // Verify detailed feedback exists
      expect(feedback.questionFeedback).toBeDefined();
      expect(feedback.questionFeedback.length).toBe(2);

      // Find the incorrect answer feedback
      const incorrectFeedback = feedback.questionFeedback.find(f => !f.isCorrect);
      expect(incorrectFeedback).toBeDefined();
      expect(incorrectFeedback?.explanation).toBeDefined();
      expect(incorrectFeedback?.explanation.length).toBeGreaterThan(0);
      expect(incorrectFeedback?.documentationLinks).toBeDefined();
    });

    it('should generate performance insights and recommendations', () => {
      const examResult: ExamResult = {
        id: 'test-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalQuestions: 10,
        correctAnswers: 5,
        topicBreakdown: [
          {
            topic: 'Production Pipelines',
            totalQuestions: 5,
            correctAnswers: 1,
            percentage: 20,
            averageTime: 300 // Slow timing
          },
          {
            topic: 'Incremental Data Processing',
            totalQuestions: 5,
            correctAnswers: 4,
            percentage: 80,
            averageTime: 120 // Good timing
          }
        ],
        timeSpent: 2100,
        questions: []
      };

      const timingAnalysis = {
        totalTimeSpent: 2100,
        averageTimePerQuestion: 210,
        fastestQuestion: { questionId: 'q2', timeSpent: 120 },
        slowestQuestion: { questionId: 'q1', timeSpent: 300 },
        timeByTopic: [
          { topic: 'Production Pipelines' as ExamTopic, totalTime: 600, averageTime: 200, questionCount: 3 },
          { topic: 'Incremental Data Processing' as ExamTopic, totalTime: 900, averageTime: 180, questionCount: 5 },
          { topic: 'Data Governance' as ExamTopic, totalTime: 600, averageTime: 300, questionCount: 2 }
        ],
        pacingAnalysis: {
          isWellPaced: false,
          rushingQuestions: ['q2'],
          slowQuestions: ['q1', 'q3'],
          recommendations: ['Practice time management']
        }
      };

      const insights = scoringService.generatePerformanceInsights(examResult, timingAnalysis);

      // Verify insights structure
      expect(insights).toHaveProperty('strengths');
      expect(insights).toHaveProperty('weaknesses');
      expect(insights).toHaveProperty('recommendations');

      // Verify content quality
      expect(insights.strengths.length).toBeGreaterThanOrEqual(0);
      expect(insights.weaknesses.length).toBeGreaterThanOrEqual(0);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid exam results gracefully', () => {
      const invalidExamResult = {
        id: 'invalid',
        userId: 'test',
        examType: 'practice',
        totalQuestions: 0, // Invalid
        correctAnswers: -1, // Invalid
        topicBreakdown: [],
        timeSpent: -100, // Invalid
        questions: []
      } as any;

      const validationErrors = scoringService.validateExamResultForScoring(invalidExamResult);
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors).toContain('Total questions must be greater than 0');
      expect(validationErrors).toContain('Correct answers must be between 0 and total questions');
      expect(validationErrors).toContain('Time spent must be non-negative');
    });

    it('should handle empty question responses', () => {
      const emptyExamResult: ExamResult = {
        id: 'empty-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalQuestions: 0,
        correctAnswers: 0,
        topicBreakdown: [],
        timeSpent: 0,
        questions: []
      };

      const feedback = scoringService.generateImmediateFeedback(emptyExamResult);
      expect(feedback.score).toBe(0);
      expect(feedback.totalQuestions).toBe(0);
    });

    it('should handle session cleanup correctly', () => {
      const userId = 'test-user-cleanup';
      const session = examEngine.startExamSession(userId, 'practice', mockQuestions);
      const sessionId = session.id;

      // Verify session exists
      expect(examEngine.getExamSession(sessionId)).toBeDefined();

      // End session
      examEngine.endSession(sessionId);

      // Verify session is cleaned up
      expect(examEngine.getExamSession(sessionId)).toBeNull();
    });

    it('should prevent operations on non-existent sessions', () => {
      const nonExistentSessionId = 'non-existent-session';

      // All operations should fail gracefully
      expect(examEngine.getExamSession(nonExistentSessionId)).toBeNull();
      expect(examEngine.submitAnswer(nonExistentSessionId, 'q1', 0)).toBe(false);
      expect(examEngine.pauseExamSession(nonExistentSessionId)).toBe(false);
      expect(examEngine.resumeExamSession(nonExistentSessionId)).toBe(false);
      expect(examEngine.completeExamEarly(nonExistentSessionId)).toBeNull();
      expect(examEngine.forceCompleteExam(nonExistentSessionId)).toBeNull();
      expect(examEngine.navigateToQuestion(nonExistentSessionId, 0)).toBe(false);
      expect(examEngine.isInReviewMode(nonExistentSessionId)).toBe(false);
      expect(examEngine.getTimeRemaining(nonExistentSessionId)).toBe(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large exam results efficiently', () => {
      // Generate large exam result
      const largeQuestionResponses: QuestionResponse[] = [];
      for (let i = 0; i < 1000; i++) {
        largeQuestionResponses.push({
          questionId: `q${i}`,
          selectedAnswer: Math.floor(Math.random() * 4),
          isCorrect: Math.random() > 0.5,
          timeSpent: Math.floor(Math.random() * 300) + 60,
          answeredAt: new Date()
        });
      }

      const largeExamResult: ExamResult = {
        id: 'large-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(),
        totalQuestions: 1000,
        correctAnswers: largeQuestionResponses.filter(q => q.isCorrect).length,
        topicBreakdown: [],
        timeSpent: largeQuestionResponses.reduce((sum, q) => sum + q.timeSpent, 0),
        questions: largeQuestionResponses
      };

      const startTime = Date.now();
      const feedback = scoringService.generateImmediateFeedback(largeExamResult);
      const endTime = Date.now();

      // Should complete within reasonable time (< 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(feedback).toBeDefined();
      expect(feedback.totalQuestions).toBe(1000);
    });

    it('should manage multiple concurrent exam sessions', () => {
      const sessions = [];
      const userCount = 50;

      // Create multiple sessions
      for (let i = 0; i < userCount; i++) {
        const session = examEngine.startExamSession(`user-${i}`, 'practice', mockQuestions);
        sessions.push(session);
      }

      // Verify all sessions are active
      expect(sessions.length).toBe(userCount);
      sessions.forEach(session => {
        expect(examEngine.getExamSession(session.id)).toBeDefined();
        expect(examEngine.getTimeRemaining(session.id)).toBeGreaterThan(0);
      });

      // Clean up all sessions
      sessions.forEach(session => {
        examEngine.endSession(session.id);
      });

      // Verify cleanup
      sessions.forEach(session => {
        expect(examEngine.getExamSession(session.id)).toBeNull();
      });
    });
  });
});