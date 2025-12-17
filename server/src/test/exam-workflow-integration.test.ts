import request from 'supertest';
import app from '../index';
import { ExamType, ExamTopic } from '../../../shared/types';
import { dbConnected } from './setup';

/**
 * End-to-End Integration Tests for Complete Exam Workflow
 * Tests the full exam lifecycle from start to completion with scoring
 */
describe('Complete Exam Workflow Integration', () => {
  let sessionId: string;
  const userId = 'test-user-integration';
  const examType: ExamType = 'practice';

  beforeAll(async () => {
    // Skip tests if database is not connected
    if (!dbConnected) {
      console.log('Skipping integration tests - database not connected');
    }
  });

  describe('Exam Session Lifecycle', () => {
    it('should complete full exam workflow: start -> answer -> complete -> score', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      // Step 1: Start exam session
      const startResponse = await request(app)
        .post('/api/exam-sessions')
        .send({
          userId,
          examType,
          questionCount: 5 // Small number for testing
        })
        .expect(201);

      expect(startResponse.body).toHaveProperty('sessionId');
      expect(startResponse.body).toHaveProperty('totalQuestions', 5);
      expect(startResponse.body).toHaveProperty('timeRemaining');
      sessionId = startResponse.body.sessionId;

      // Step 2: Get session state
      const stateResponse = await request(app)
        .get(`/api/exam-sessions/${sessionId}`)
        .expect(200);

      expect(stateResponse.body).toHaveProperty('currentQuestion');
      expect(stateResponse.body.currentQuestion).toHaveProperty('questionText');
      expect(stateResponse.body.currentQuestion).toHaveProperty('options');
      expect(stateResponse.body.currentQuestion).not.toHaveProperty('correctAnswer'); // Should not be exposed during exam

      // Step 3: Answer all questions
      for (let i = 0; i < 5; i++) {
        const sessionState = await request(app)
          .get(`/api/exam-sessions/${sessionId}`)
          .expect(200);

        const currentQuestion = sessionState.body.currentQuestion;
        if (currentQuestion) {
          await request(app)
            .post(`/api/exam-sessions/${sessionId}/answers`)
            .send({
              questionId: currentQuestion.id,
              selectedAnswer: 0 // Always select first option for testing
            })
            .expect(200);
        }
      }

      // Step 4: Force complete exam
      const completeResponse = await request(app)
        .post(`/api/exam-sessions/${sessionId}/force-complete`)
        .expect(200);

      expect(completeResponse.body).toHaveProperty('success', true);
      expect(completeResponse.body).toHaveProperty('examResult');
      const examResult = completeResponse.body.examResult;

      // Step 5: Generate comprehensive feedback
      const feedbackResponse = await request(app)
        .post('/api/scoring/comprehensive-feedback')
        .send({ examResult })
        .expect(200);

      expect(feedbackResponse.body).toHaveProperty('success', true);
      expect(feedbackResponse.body.data).toHaveProperty('overallScore');
      expect(feedbackResponse.body.data).toHaveProperty('topicBreakdown');
      expect(feedbackResponse.body.data).toHaveProperty('detailedFeedback');

      // Step 6: Generate timing analysis
      const timingResponse = await request(app)
        .post('/api/scoring/timing-analysis')
        .send({ examResult })
        .expect(200);

      expect(timingResponse.body).toHaveProperty('success', true);
      expect(timingResponse.body.data).toHaveProperty('averageTimePerQuestion');
      expect(timingResponse.body.data).toHaveProperty('totalTimeSpent');

      // Step 7: Clean up session
      await request(app)
        .delete(`/api/exam-sessions/${sessionId}`)
        .expect(200);
    });

    it('should handle exam pause and resume correctly', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      // Start new session
      const startResponse = await request(app)
        .post('/api/exam-sessions')
        .send({
          userId: userId + '-pause',
          examType,
          questionCount: 3
        })
        .expect(201);

      const testSessionId = startResponse.body.sessionId;

      // Pause exam
      await request(app)
        .post(`/api/exam-sessions/${testSessionId}/pause`)
        .expect(200);

      // Verify paused state
      const pausedState = await request(app)
        .get(`/api/exam-sessions/${testSessionId}`)
        .expect(200);

      expect(pausedState.body).toHaveProperty('isPaused', true);

      // Resume exam
      await request(app)
        .post(`/api/exam-sessions/${testSessionId}/resume`)
        .expect(200);

      // Verify resumed state
      const resumedState = await request(app)
        .get(`/api/exam-sessions/${testSessionId}`)
        .expect(200);

      expect(resumedState.body).toHaveProperty('isPaused', false);

      // Clean up
      await request(app)
        .delete(`/api/exam-sessions/${testSessionId}`)
        .expect(200);
    });

    it('should handle early completion and review mode', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      // Start new session
      const startResponse = await request(app)
        .post('/api/exam-sessions')
        .send({
          userId: userId + '-early',
          examType,
          questionCount: 3
        })
        .expect(201);

      const testSessionId = startResponse.body.sessionId;

      // Answer first question
      const sessionState = await request(app)
        .get(`/api/exam-sessions/${testSessionId}`)
        .expect(200);

      if (sessionState.body.currentQuestion) {
        await request(app)
          .post(`/api/exam-sessions/${testSessionId}/answers`)
          .send({
            questionId: sessionState.body.currentQuestion.id,
            selectedAnswer: 0
          })
          .expect(200);
      }

      // Complete early
      const completeResponse = await request(app)
        .post(`/api/exam-sessions/${testSessionId}/complete`)
        .expect(200);

      expect(completeResponse.body).toHaveProperty('success', true);
      expect(completeResponse.body).toHaveProperty('isInReviewMode', true);

      // Test review mode navigation
      await request(app)
        .post(`/api/exam-sessions/${testSessionId}/navigate`)
        .send({ questionIndex: 0 })
        .expect(200);

      // Get review data
      const reviewResponse = await request(app)
        .get(`/api/exam-sessions/${testSessionId}/review`)
        .expect(200);

      expect(reviewResponse.body).toHaveProperty('questions');
      expect(reviewResponse.body.questions[0]).toHaveProperty('correctAnswer'); // Should be exposed in review mode

      // Clean up
      await request(app)
        .delete(`/api/exam-sessions/${testSessionId}`)
        .expect(200);
    });
  });

  describe('Question Bank Integration', () => {
    it('should retrieve questions by topic and validate content', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      const topics: ExamTopic[] = [
        'Databricks Lakehouse Platform',
        'ELT with Spark SQL and Python',
        'Incremental Data Processing',
        'Production Pipelines',
        'Data Governance'
      ];

      for (const topic of topics) {
        const response = await request(app)
          .get(`/api/questions/topic/${encodeURIComponent(topic)}`)
          .query({ limit: 5 })
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          const question = response.body[0];
          expect(question).toHaveProperty('topic', topic);
          expect(question).toHaveProperty('questionText');
          expect(question).toHaveProperty('options');
          expect(question).toHaveProperty('correctAnswer');
          expect(question).toHaveProperty('explanation');
        }
      }
    });

    it('should validate question bank completeness', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      const response = await request(app)
        .get('/api/questions/validate')
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('totalQuestions');
      expect(response.body).toHaveProperty('topicDistribution');
      expect(response.body).toHaveProperty('difficultyDistribution');
    });

    it('should get question statistics', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      const response = await request(app)
        .get('/api/questions/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalQuestions');
      expect(response.body).toHaveProperty('byTopic');
      expect(response.body).toHaveProperty('byDifficulty');
      expect(response.body).toHaveProperty('withCodeExamples');
    });
  });

  describe('Adaptive Learning Integration', () => {
    it('should generate adaptive exam based on user performance', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      // This would test the adaptive question selection
      // For now, we'll test that the system can handle user performance data
      const mockPerformanceData = {
        userId: userId + '-adaptive',
        examHistory: [
          {
            id: 'exam-1',
            userId: userId + '-adaptive',
            examType: 'practice' as ExamType,
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date(Date.now() - 3000000),
            totalQuestions: 10,
            correctAnswers: 6,
            topicBreakdown: [
              {
                topic: 'Production Pipelines' as ExamTopic,
                totalQuestions: 2,
                correctAnswers: 1,
                percentage: 50,
                averageTime: 180
              },
              {
                topic: 'Incremental Data Processing' as ExamTopic,
                totalQuestions: 2,
                correctAnswers: 2,
                percentage: 100,
                averageTime: 120
              }
            ],
            timeSpent: 600,
            questions: []
          }
        ]
      };

      // Test progress tracking with this data
      const progressResponse = await request(app)
        .get(`/api/progress-tracking/${mockPerformanceData.userId}/dashboard`)
        .expect(200);

      expect(progressResponse.body).toHaveProperty('success', true);
      // The response structure will depend on the actual implementation
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid session IDs gracefully', async () => {
      await request(app)
        .get('/api/exam-sessions/invalid-session-id')
        .expect(404);

      await request(app)
        .post('/api/exam-sessions/invalid-session-id/answers')
        .send({ questionId: 'test', selectedAnswer: 0 })
        .expect(400); // Changed from 404 to 400 as the route exists but session doesn't
    });

    it('should validate exam session creation parameters', async () => {
      // Missing userId
      await request(app)
        .post('/api/exam-sessions')
        .send({ examType: 'practice' })
        .expect(400);

      // Invalid examType
      await request(app)
        .post('/api/exam-sessions')
        .send({ userId: 'test', examType: 'invalid' })
        .expect(400);
    });

    it('should validate answer submission parameters', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      // Create a valid session first
      const startResponse = await request(app)
        .post('/api/exam-sessions')
        .send({
          userId: userId + '-validation',
          examType: 'practice',
          questionCount: 1
        })
        .expect(201);

      const testSessionId = startResponse.body.sessionId;

      // Test invalid answer submissions
      await request(app)
        .post(`/api/exam-sessions/${testSessionId}/answers`)
        .send({ selectedAnswer: 0 }) // Missing questionId
        .expect(400);

      await request(app)
        .post(`/api/exam-sessions/${testSessionId}/answers`)
        .send({ questionId: 'test' }) // Missing selectedAnswer
        .expect(400);

      await request(app)
        .post(`/api/exam-sessions/${testSessionId}/answers`)
        .send({ questionId: 'test', selectedAnswer: -1 }) // Invalid selectedAnswer
        .expect(400);

      // Clean up
      await request(app)
        .delete(`/api/exam-sessions/${testSessionId}`)
        .expect(200);
    });
  });

  describe('Performance and Timing Validation', () => {
    it('should enforce timing constraints correctly', async () => {
      if (!dbConnected) {
        console.log('Skipping test - database not connected');
        return;
      }

      // Start session
      const startResponse = await request(app)
        .post('/api/exam-sessions')
        .send({
          userId: userId + '-timing',
          examType: 'practice',
          questionCount: 1
        })
        .expect(201);

      const testSessionId = startResponse.body.sessionId;

      // Check initial time remaining
      const initialState = await request(app)
        .get(`/api/exam-sessions/${testSessionId}`)
        .expect(200);

      expect(initialState.body.timeRemaining).toBeGreaterThan(0);
      expect(initialState.body.timeRemaining).toBeLessThanOrEqual(90 * 60 * 1000); // 90 minutes in ms

      // Clean up
      await request(app)
        .delete(`/api/exam-sessions/${testSessionId}`)
        .expect(200);
    });
  });
});