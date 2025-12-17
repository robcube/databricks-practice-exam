import { ExamEngineService } from './ExamEngineService';
import { Question, ExamType, ExamTopic } from '../../../shared/types';

describe('ExamEngineService', () => {
  let examEngine: ExamEngineService;
  let mockQuestions: Question[];

  beforeEach(() => {
    examEngine = new ExamEngineService({ timeLimit: 60, autoSaveInterval: 5 }); // 1 minute for testing
    
    mockQuestions = [
      {
        id: 'q1',
        topic: 'Databricks Lakehouse Platform' as ExamTopic,
        subtopic: 'Architecture',
        difficulty: 'medium',
        questionText: 'What is Delta Lake?',
        options: ['A storage format', 'A database', 'A query engine', 'A visualization tool'],
        correctAnswer: 0,
        explanation: 'Delta Lake is an open-source storage format.',
        documentationLinks: ['https://docs.databricks.com/delta/'],
        tags: ['delta-lake', 'storage'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'q2',
        topic: 'ELT with Spark SQL and Python' as ExamTopic,
        subtopic: 'SQL',
        difficulty: 'easy',
        questionText: 'Which SQL command creates a table?',
        options: ['SELECT', 'CREATE TABLE', 'INSERT', 'UPDATE'],
        correctAnswer: 1,
        explanation: 'CREATE TABLE is used to create new tables.',
        documentationLinks: ['https://docs.databricks.com/sql/'],
        tags: ['sql', 'ddl'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  });

  afterEach(() => {
    // Clean up any active sessions
    const sessions = examEngine.getUserActiveSessions('test-user');
    sessions.forEach(session => {
      examEngine.endSession(session.id);
    });
  });

  describe('startExamSession', () => {
    it('should create a new exam session with correct initial state', () => {
      const session = examEngine.startExamSession('test-user', 'practice', mockQuestions);

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('test-user');
      expect(session.examType).toBe('practice');
      expect(session.questions).toEqual(mockQuestions);
      expect(session.currentQuestionIndex).toBe(0);
      expect(session.responses).toEqual([]);
      expect(session.timeRemaining).toBe(60);
      expect(session.isCompleted).toBe(false);
      expect(session.isPaused).toBe(false);
      expect(session.startTime).toBeInstanceOf(Date);
    });

    it('should start with default time limit when not specified', () => {
      const defaultEngine = new ExamEngineService();
      const session = defaultEngine.startExamSession('test-user', 'practice', mockQuestions);

      expect(session.timeRemaining).toBe(5400); // 90 minutes
      
      defaultEngine.endSession(session.id);
    });
  });

  describe('getExamSession', () => {
    it('should return the current exam session', () => {
      const originalSession = examEngine.startExamSession('test-user', 'practice', mockQuestions);
      const retrievedSession = examEngine.getExamSession(originalSession.id);

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.id).toBe(originalSession.id);
      expect(retrievedSession!.userId).toBe('test-user');
    });

    it('should return null for non-existent session', () => {
      const session = examEngine.getExamSession('non-existent');
      expect(session).toBeNull();
    });
  });

  describe('submitAnswer', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = examEngine.startExamSession('test-user', 'practice', mockQuestions);
      sessionId = session.id;
    });

    it('should accept correct answer and advance to next question', () => {
      const success = examEngine.submitAnswer(sessionId, 'q1', 0); // Correct answer
      expect(success).toBe(true);

      const session = examEngine.getExamSession(sessionId);
      expect(session!.currentQuestionIndex).toBe(1);
      expect(session!.responses).toHaveLength(1);
      expect(session!.responses[0].isCorrect).toBe(true);
      expect(session!.responses[0].selectedAnswer).toBe(0);
    });

    it('should accept incorrect answer and mark as wrong', () => {
      const success = examEngine.submitAnswer(sessionId, 'q1', 2); // Incorrect answer
      expect(success).toBe(true);

      const session = examEngine.getExamSession(sessionId);
      expect(session!.responses[0].isCorrect).toBe(false);
      expect(session!.responses[0].selectedAnswer).toBe(2);
    });

    it('should complete exam when all questions are answered', () => {
      examEngine.submitAnswer(sessionId, 'q1', 0);
      examEngine.submitAnswer(sessionId, 'q2', 1);

      const session = examEngine.getExamSession(sessionId);
      expect(session!.isCompleted).toBe(true);
      expect(session!.responses).toHaveLength(2);
    });

    it('should reject answer for wrong question ID', () => {
      const success = examEngine.submitAnswer(sessionId, 'wrong-id', 0);
      expect(success).toBe(false);

      const session = examEngine.getExamSession(sessionId);
      expect(session!.currentQuestionIndex).toBe(0);
      expect(session!.responses).toHaveLength(0);
    });

    it('should reject answer when session is paused', () => {
      examEngine.pauseExamSession(sessionId);
      const success = examEngine.submitAnswer(sessionId, 'q1', 0);
      expect(success).toBe(false);
    });
  });

  describe('pauseExamSession and resumeExamSession', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = examEngine.startExamSession('test-user', 'practice', mockQuestions);
      sessionId = session.id;
    });

    it('should pause and resume exam session', () => {
      // Pause
      const pauseSuccess = examEngine.pauseExamSession(sessionId);
      expect(pauseSuccess).toBe(true);

      let session = examEngine.getExamSession(sessionId);
      expect(session!.isPaused).toBe(true);

      // Resume
      const resumeSuccess = examEngine.resumeExamSession(sessionId);
      expect(resumeSuccess).toBe(true);

      session = examEngine.getExamSession(sessionId);
      expect(session!.isPaused).toBe(false);
    });

    it('should not allow pausing completed exam', () => {
      // Complete the exam first
      examEngine.submitAnswer(sessionId, 'q1', 0);
      examEngine.submitAnswer(sessionId, 'q2', 1);

      const success = examEngine.pauseExamSession(sessionId);
      expect(success).toBe(false);
    });
  });

  describe('completeExamEarly', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = examEngine.startExamSession('test-user', 'practice', mockQuestions);
      sessionId = session.id;
    });

    it('should allow early completion and enable review mode', () => {
      // Answer first question
      examEngine.submitAnswer(sessionId, 'q1', 0);

      const result = examEngine.completeExamEarly(sessionId);
      expect(result).toBeDefined();
      expect(result!.totalQuestions).toBe(2);
      expect(result!.correctAnswers).toBe(1);

      const session = examEngine.getExamSession(sessionId);
      expect(session!.isCompleted).toBe(true);
      expect(examEngine.isInReviewMode(sessionId)).toBe(true);
    });

    it('should not allow early completion of already completed exam', () => {
      // Complete normally first
      examEngine.submitAnswer(sessionId, 'q1', 0);
      examEngine.submitAnswer(sessionId, 'q2', 1);

      const result = examEngine.completeExamEarly(sessionId);
      expect(result).toBeNull();
    });
  });

  describe('navigateToQuestion', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = examEngine.startExamSession('test-user', 'practice', mockQuestions);
      sessionId = session.id;
      
      // Complete exam to enable review mode
      examEngine.submitAnswer(sessionId, 'q1', 0);
      examEngine.submitAnswer(sessionId, 'q2', 1);
    });

    it('should allow navigation in review mode', () => {
      const success = examEngine.navigateToQuestion(sessionId, 0);
      expect(success).toBe(true);

      const session = examEngine.getExamSession(sessionId);
      expect(session!.currentQuestionIndex).toBe(0);
    });

    it('should reject invalid question index', () => {
      const success = examEngine.navigateToQuestion(sessionId, 5);
      expect(success).toBe(false);
    });
  });

  describe('getTimeRemaining', () => {
    it('should return correct time remaining', () => {
      const session = examEngine.startExamSession('test-user', 'practice', mockQuestions);
      const timeRemaining = examEngine.getTimeRemaining(session.id);
      
      expect(timeRemaining).toBeLessThanOrEqual(60);
      expect(timeRemaining).toBeGreaterThan(55); // Should be close to 60
    });

    it('should return 0 for non-existent session', () => {
      const timeRemaining = examEngine.getTimeRemaining('non-existent');
      expect(timeRemaining).toBe(0);
    });
  });

  describe('getUserActiveSessions', () => {
    it('should return all active sessions for a user', () => {
      const session1 = examEngine.startExamSession('user1', 'practice', mockQuestions);
      const session2 = examEngine.startExamSession('user1', 'assessment', mockQuestions);
      const session3 = examEngine.startExamSession('user2', 'practice', mockQuestions);

      const user1Sessions = examEngine.getUserActiveSessions('user1');
      const user2Sessions = examEngine.getUserActiveSessions('user2');

      expect(user1Sessions).toHaveLength(2);
      expect(user2Sessions).toHaveLength(1);
      expect(user1Sessions.map(s => s.id)).toContain(session1.id);
      expect(user1Sessions.map(s => s.id)).toContain(session2.id);
      expect(user2Sessions[0].id).toBe(session3.id);

      // Cleanup
      examEngine.endSession(session1.id);
      examEngine.endSession(session2.id);
      examEngine.endSession(session3.id);
    });

    it('should return empty array for user with no sessions', () => {
      const sessions = examEngine.getUserActiveSessions('no-sessions-user');
      expect(sessions).toEqual([]);
    });
  });

  describe('time expiry handling', () => {
    it('should auto-complete exam when time expires', (done) => {
      // Use very short time limit for testing
      const shortTimeEngine = new ExamEngineService({ timeLimit: 1, autoSaveInterval: 1 });
      const session = shortTimeEngine.startExamSession('test-user', 'practice', mockQuestions);

      // Wait for time to expire
      setTimeout(() => {
        try {
          const updatedSession = shortTimeEngine.getExamSession(session.id);
          expect(updatedSession!.isCompleted).toBe(true);
          
          const timeRemaining = shortTimeEngine.getTimeRemaining(session.id);
          expect(timeRemaining).toBeLessThanOrEqual(1); // Should be 0 or very close to 0
          
          shortTimeEngine.endSession(session.id);
          done();
        } catch (error) {
          shortTimeEngine.endSession(session.id);
          done(error);
        }
      }, 2000); // Wait 2 seconds to ensure timer has expired
    }, 10000); // Increase test timeout to 10 seconds
  });

  describe('endSession', () => {
    it('should clean up session and timers', () => {
      const session = examEngine.startExamSession('test-user', 'practice', mockQuestions);
      
      examEngine.endSession(session.id);
      
      const retrievedSession = examEngine.getExamSession(session.id);
      expect(retrievedSession).toBeNull();
    });
  });
});