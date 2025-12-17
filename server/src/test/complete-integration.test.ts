import request from 'supertest';
import app from '../index';
import { ExamEngineService } from '../services/ExamEngineService';
import { ScoringService } from '../services/ScoringService';
import { AdaptiveQuestionService } from '../services/AdaptiveQuestionService';
import { ExamType, ExamTopic, Question, ExamResult } from '../../../shared/types';

/**
 * Complete Integration Tests for Databricks Practice Exam System
 * Tests the full application workflow without requiring database connectivity
 */
describe('Complete Application Integration', () => {
  let examEngine: ExamEngineService;
  let scoringService: ScoringService;
  let adaptiveService: AdaptiveQuestionService;

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
    },
    {
      id: 'q3',
      topic: 'Data Governance',
      subtopic: 'Unity Catalog',
      difficulty: 'easy',
      questionText: 'What is Unity Catalog used for?',
      options: ['Data governance', 'Query optimization', 'Cluster management', 'Job scheduling'],
      correctAnswer: 0,
      explanation: 'Unity Catalog provides centralized data governance',
      documentationLinks: ['https://docs.databricks.com/unity-catalog/'],
      tags: ['unity-catalog', 'governance'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    examEngine = new ExamEngineService();
    scoringService = new ScoringService();
    adaptiveService = new AdaptiveQuestionService();
  });

  describe('End-to-End Exam Workflow', () => {
    it('should complete full exam lifecycle: start -> answer -> score -> feedback', () => {
      const userId = 'integration-test-user';
      const examType: ExamType = 'practice';

      // Step 1: Start exam session
      const session = examEngine.startExamSession(userId, examType, mockQuestions);
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.examType).toBe(examType);
      expect(session.questions).toHaveLength(3);
      expect(session.isCompleted).toBe(false);

      // Step 2: Verify initial state
      const initialState = examEngine.getExamSession(session.id);
      expect(initialState).toBeDefined();
      expect(initialState!.currentQuestionIndex).toBe(0);
      expect(examEngine.getTimeRemaining(session.id)).toBeGreaterThan(0);

      // Step 3: Answer all questions
      const answers = [0, 2, 0]; // Correct, Correct, Correct
      answers.forEach((answer, index) => {
        const success = examEngine.submitAnswer(session.id, mockQuestions[index].id, answer);
        expect(success).toBe(true);
      });

      // Step 4: Force complete exam
      const examResult = examEngine.forceCompleteExam(session.id);
      expect(examResult).toBeDefined();
      expect(examResult!.totalQuestions).toBe(3);
      expect(examResult!.correctAnswers).toBe(3);
      expect(examResult!.questions).toHaveLength(3);

      // Step 5: Generate scoring feedback
      const feedback = scoringService.generateImmediateFeedback(examResult!);
      expect(feedback).toBeDefined();
      expect(feedback.score).toBe(100); // 3/3 = 100%
      expect(feedback.totalQuestions).toBe(3);
      expect(feedback.correctAnswers).toBe(3);

      // Step 6: Generate comprehensive feedback
      const comprehensiveFeedback = scoringService.generateComprehensiveFeedback(examResult!, mockQuestions);
      expect(comprehensiveFeedback).toBeDefined();
      expect(comprehensiveFeedback.overallScore).toBe(100);
      expect(comprehensiveFeedback.topicBreakdown).toBeDefined();

      // Step 7: Clean up
      examEngine.endSession(session.id);
      expect(examEngine.getExamSession(session.id)).toBeNull();
    });

    it('should handle exam pause and resume correctly', () => {
      const userId = 'pause-test-user';
      const session = examEngine.startExamSession(userId, 'practice', mockQuestions);

      // Get initial time
      const initialTime = examEngine.getTimeRemaining(session.id);
      expect(initialTime).toBeGreaterThan(0);

      // Pause exam
      const pauseSuccess = examEngine.pauseExamSession(session.id);
      expect(pauseSuccess).toBe(true);
      expect(examEngine.getExamSession(session.id)?.isPaused).toBe(true);

      // Resume exam
      const resumeSuccess = examEngine.resumeExamSession(session.id);
      expect(resumeSuccess).toBe(true);
      expect(examEngine.getExamSession(session.id)?.isPaused).toBe(false);

      // Time should still be available
      const resumedTime = examEngine.getTimeRemaining(session.id);
      expect(resumedTime).toBeGreaterThan(0);

      examEngine.endSession(session.id);
    });

    it('should handle early completion and review mode', () => {
      const userId = 'early-completion-user';
      const session = examEngine.startExamSession(userId, 'practice', mockQuestions);

      // Answer first question
      const submitSuccess = examEngine.submitAnswer(session.id, mockQuestions[0].id, 0);
      expect(submitSuccess).toBe(true);

      // Complete early
      const result = examEngine.completeExamEarly(session.id);
      expect(result).toBeDefined();
      expect(result!.endTime).toBeInstanceOf(Date);

      // Verify review mode
      expect(examEngine.isInReviewMode(session.id)).toBe(true);

      // Should be able to navigate in review mode
      const navSuccess = examEngine.navigateToQuestion(session.id, 0);
      expect(navSuccess).toBe(true);

      examEngine.endSession(session.id);
    });
  });

  describe('Adaptive Learning Integration', () => {
    it('should analyze performance and generate adaptive recommendations', async () => {
      const mockExamHistory: ExamResult[] = [
        {
          id: 'exam-1',
          userId: 'adaptive-user',
          examType: 'practice',
          startTime: new Date(Date.now() - 86400000),
          endTime: new Date(Date.now() - 86400000 + 1800000),
          totalQuestions: 10,
          correctAnswers: 4,
          topicBreakdown: [
            {
              topic: 'Production Pipelines',
              totalQuestions: 5,
              correctAnswers: 1,
              percentage: 20,
              averageTime: 200
            },
            {
              topic: 'Incremental Data Processing',
              totalQuestions: 5,
              correctAnswers: 3,
              percentage: 60,
              averageTime: 180
            }
          ],
          timeSpent: 1800,
          questions: []
        }
      ];

      // Analyze performance
      const analysis = await adaptiveService.analyzeUserPerformance(mockExamHistory);
      expect(analysis).toBeDefined();
      expect(analysis.weakAreas).toContain('Production Pipelines');
      expect(analysis.strongAreas).not.toContain('Production Pipelines');

      // Note: Skip adaptive question generation test due to database dependency
      // In a real environment with database, this would work:
      // const adaptiveQuestions = await adaptiveService.generateAdaptiveQuestionSet(mockExamHistory, { totalQuestions: 10 });
      console.log('Adaptive question generation requires database - skipping in integration test');
    });
  });

  describe('Scoring and Feedback Integration', () => {
    it('should generate accurate timing analysis', () => {
      const mockQuestionResponses = [
        {
          questionId: 'q1',
          selectedAnswer: 0,
          isCorrect: true,
          timeSpent: 120,
          topic: 'Production Pipelines',
          answeredAt: new Date()
        },
        {
          questionId: 'q2',
          selectedAnswer: 1,
          isCorrect: false,
          timeSpent: 300,
          topic: 'Incremental Data Processing',
          answeredAt: new Date()
        }
      ];

      const timingAnalysis = scoringService.calculateTimingAnalysis(mockQuestionResponses, mockQuestions);
      expect(timingAnalysis).toBeDefined();
      expect(timingAnalysis.totalTimeSpent).toBe(420);
      expect(timingAnalysis.averageTimePerQuestion).toBe(210);
      expect(timingAnalysis.slowestQuestion.questionId).toBe('q2');
      expect(timingAnalysis.fastestQuestion.questionId).toBe('q1');
    });

    it('should generate performance insights', () => {
      const mockExamResult: ExamResult = {
        id: 'insights-exam',
        userId: 'insights-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        totalQuestions: 3,
        correctAnswers: 2,
        topicBreakdown: [
          {
            topic: 'Production Pipelines',
            totalQuestions: 1,
            correctAnswers: 1,
            percentage: 100,
            averageTime: 120
          },
          {
            topic: 'Incremental Data Processing',
            totalQuestions: 1,
            correctAnswers: 0,
            percentage: 0,
            averageTime: 300
          },
          {
            topic: 'Data Governance',
            totalQuestions: 1,
            correctAnswers: 1,
            percentage: 100,
            averageTime: 90
          }
        ],
        timeSpent: 510,
        questions: []
      };

      const timingAnalysis = {
        totalTimeSpent: 510,
        averageTimePerQuestion: 170,
        fastestQuestion: { questionId: 'q3', timeSpent: 90 },
        slowestQuestion: { questionId: 'q2', timeSpent: 300 },
        timeByTopic: [
          { topic: 'Production Pipelines' as ExamTopic, totalTime: 120, averageTime: 120, questionCount: 1 },
          { topic: 'Incremental Data Processing' as ExamTopic, totalTime: 300, averageTime: 300, questionCount: 1 },
          { topic: 'Data Governance' as ExamTopic, totalTime: 90, averageTime: 90, questionCount: 1 }
        ],
        pacingAnalysis: {
          isWellPaced: true,
          rushingQuestions: [],
          slowQuestions: ['q2'],
          recommendations: ['Focus on time management for Incremental Data Processing']
        }
      };

      const insights = scoringService.generatePerformanceInsights(mockExamResult, timingAnalysis);
      expect(insights).toBeDefined();
      expect(insights.strengths.some(s => s.includes('Production Pipelines'))).toBe(true);
      expect(insights.weaknesses.some(w => w.includes('Incremental Data Processing'))).toBe(true);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid session operations gracefully', () => {
      const invalidSessionId = 'non-existent-session';

      // All operations should fail gracefully
      expect(examEngine.getExamSession(invalidSessionId)).toBeNull();
      expect(examEngine.submitAnswer(invalidSessionId, 'q1', 0)).toBe(false);
      expect(examEngine.pauseExamSession(invalidSessionId)).toBe(false);
      expect(examEngine.resumeExamSession(invalidSessionId)).toBe(false);
      expect(examEngine.completeExamEarly(invalidSessionId)).toBeNull();
      expect(examEngine.forceCompleteExam(invalidSessionId)).toBeNull();
      expect(examEngine.navigateToQuestion(invalidSessionId, 0)).toBe(false);
      expect(examEngine.isInReviewMode(invalidSessionId)).toBe(false);
      expect(examEngine.getTimeRemaining(invalidSessionId)).toBe(0);
    });

    it('should validate exam results for scoring', () => {
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

    it('should handle empty exam results', () => {
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
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent exam sessions', () => {
      const sessions = [];
      const userCount = 10;

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

    it('should process large exam results efficiently', () => {
      // Generate large exam result
      const largeQuestionResponses = [];
      for (let i = 0; i < 100; i++) {
        largeQuestionResponses.push({
          questionId: `q${i}`,
          selectedAnswer: Math.floor(Math.random() * 4),
          isCorrect: Math.random() > 0.5,
          timeSpent: Math.floor(Math.random() * 300) + 60,
          topic: 'Production Pipelines',
          answeredAt: new Date()
        });
      }

      const largeExamResult: ExamResult = {
        id: 'large-exam',
        userId: 'test-user',
        examType: 'practice',
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(),
        totalQuestions: 100,
        correctAnswers: largeQuestionResponses.filter(q => q.isCorrect).length,
        topicBreakdown: [],
        timeSpent: largeQuestionResponses.reduce((sum, q) => sum + q.timeSpent, 0),
        questions: largeQuestionResponses
      };

      const startTime = Date.now();
      const feedback = scoringService.generateImmediateFeedback(largeExamResult);
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(feedback).toBeDefined();
      expect(feedback.totalQuestions).toBe(100);
    });
  });

  describe('API Health Check', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should respond to API root endpoint', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Databricks Practice Exam API');
    });

    it('should handle 404 for non-existent routes', async () => {
      await request(app)
        .get('/non-existent-route')
        .expect(404);
    });
  });
});