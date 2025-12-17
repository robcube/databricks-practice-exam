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
  });
});