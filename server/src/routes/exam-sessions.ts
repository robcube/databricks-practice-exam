import express from 'express';
import { ExamEngineService } from '../services/ExamEngineService';
import { QuestionService } from '../services/QuestionService';
import { ExamType } from '../../../shared/types';

const router = express.Router();
const examEngine = new ExamEngineService();
const questionService = new QuestionService();

/**
 * POST /api/exam-sessions
 * Start a new exam session
 */
router.post('/', async (req, res) => {
  try {
    const { userId, examType, questionCount = 50 } = req.body;

    if (!userId || !examType) {
      return res.status(400).json({
        error: 'userId and examType are required'
      });
    }

    if (!['practice', 'assessment'].includes(examType)) {
      return res.status(400).json({
        error: 'examType must be either "practice" or "assessment"'
      });
    }

    // Get questions for the exam
    const questions = await questionService.getQuestionsForExam(examType as ExamType, questionCount);
    
    if (questions.length === 0) {
      return res.status(500).json({
        error: 'No questions available for exam'
      });
    }

    const session = examEngine.startExamSession(userId, examType as ExamType, questions);

    res.status(201).json({
      sessionId: session.id,
      examType: session.examType,
      totalQuestions: session.questions.length,
      timeRemaining: session.timeRemaining,
      startTime: session.startTime
    });
  } catch (error) {
    console.error('Error starting exam session:', error);
    res.status(500).json({
      error: 'Failed to start exam session'
    });
  }
});

/**
 * GET /api/exam-sessions/:sessionId
 * Get current exam session state
 */
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = examEngine.getExamSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Exam session not found'
      });
    }

    // Don't send all questions, just current question
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const questionForClient = currentQuestion ? {
      id: currentQuestion.id,
      topic: currentQuestion.topic,
      subtopic: currentQuestion.subtopic,
      difficulty: currentQuestion.difficulty,
      questionText: currentQuestion.questionText,
      codeExample: currentQuestion.codeExample,
      options: currentQuestion.options,
      tags: currentQuestion.tags
      // Don't send correctAnswer or explanation during exam
    } : null;

    res.json({
      sessionId: session.id,
      examType: session.examType,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      timeRemaining: examEngine.getTimeRemaining(sessionId),
      isCompleted: session.isCompleted,
      isPaused: session.isPaused,
      isInReviewMode: examEngine.isInReviewMode(sessionId),
      currentQuestion: questionForClient,
      responses: session.responses.length // Just the count, not the actual responses
    });
  } catch (error) {
    console.error('Error getting exam session:', error);
    res.status(500).json({
      error: 'Failed to get exam session'
    });
  }
});

/**
 * POST /api/exam-sessions/:sessionId/answers
 * Submit an answer for the current question
 */
router.post('/:sessionId/answers', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, selectedAnswer } = req.body;

    if (questionId === undefined || selectedAnswer === undefined) {
      return res.status(400).json({
        error: 'questionId and selectedAnswer are required'
      });
    }

    if (typeof selectedAnswer !== 'number' || selectedAnswer < 0) {
      return res.status(400).json({
        error: 'selectedAnswer must be a non-negative number'
      });
    }

    const success = examEngine.submitAnswer(sessionId, questionId, selectedAnswer);

    if (!success) {
      return res.status(400).json({
        error: 'Failed to submit answer. Check session state and question ID.'
      });
    }

    const session = examEngine.getExamSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Exam session not found'
      });
    }

    res.json({
      success: true,
      currentQuestionIndex: session.currentQuestionIndex,
      isCompleted: session.isCompleted,
      timeRemaining: examEngine.getTimeRemaining(sessionId)
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      error: 'Failed to submit answer'
    });
  }
});

/**
 * POST /api/exam-sessions/:sessionId/pause
 * Pause the exam session
 */
router.post('/:sessionId/pause', (req, res) => {
  try {
    const { sessionId } = req.params;
    const success = examEngine.pauseExamSession(sessionId);

    if (!success) {
      return res.status(400).json({
        error: 'Failed to pause exam session'
      });
    }

    res.json({
      success: true,
      timeRemaining: examEngine.getTimeRemaining(sessionId)
    });
  } catch (error) {
    console.error('Error pausing exam session:', error);
    res.status(500).json({
      error: 'Failed to pause exam session'
    });
  }
});

/**
 * POST /api/exam-sessions/:sessionId/resume
 * Resume the exam session
 */
router.post('/:sessionId/resume', (req, res) => {
  try {
    const { sessionId } = req.params;
    const success = examEngine.resumeExamSession(sessionId);

    if (!success) {
      return res.status(400).json({
        error: 'Failed to resume exam session'
      });
    }

    res.json({
      success: true,
      timeRemaining: examEngine.getTimeRemaining(sessionId)
    });
  } catch (error) {
    console.error('Error resuming exam session:', error);
    res.status(500).json({
      error: 'Failed to resume exam session'
    });
  }
});

/**
 * POST /api/exam-sessions/:sessionId/complete
 * Complete the exam early (enables review mode)
 */
router.post('/:sessionId/complete', (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = examEngine.completeExamEarly(sessionId);

    if (!result) {
      return res.status(400).json({
        error: 'Failed to complete exam early'
      });
    }

    res.json({
      success: true,
      examResult: result,
      isInReviewMode: examEngine.isInReviewMode(sessionId),
      timeRemaining: examEngine.getTimeRemaining(sessionId)
    });
  } catch (error) {
    console.error('Error completing exam early:', error);
    res.status(500).json({
      error: 'Failed to complete exam early'
    });
  }
});

/**
 * POST /api/exam-sessions/:sessionId/force-complete
 * Force complete the exam (called by timer expiry or final submission)
 */
router.post('/:sessionId/force-complete', (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = examEngine.forceCompleteExam(sessionId);

    if (!result) {
      return res.status(400).json({
        error: 'Failed to force complete exam'
      });
    }

    res.json({
      success: true,
      examResult: result
    });
  } catch (error) {
    console.error('Error force completing exam:', error);
    res.status(500).json({
      error: 'Failed to force complete exam'
    });
  }
});

/**
 * POST /api/exam-sessions/:sessionId/navigate
 * Navigate to a specific question (review mode only)
 */
router.post('/:sessionId/navigate', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionIndex } = req.body;

    if (typeof questionIndex !== 'number' || questionIndex < 0) {
      return res.status(400).json({
        error: 'questionIndex must be a non-negative number'
      });
    }

    const success = examEngine.navigateToQuestion(sessionId, questionIndex);

    if (!success) {
      return res.status(400).json({
        error: 'Failed to navigate to question. Check if session is in review mode and index is valid.'
      });
    }

    const session = examEngine.getExamSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Exam session not found'
      });
    }

    // In review mode, we can send the full question with answers
    const currentQuestion = session.questions[session.currentQuestionIndex];
    const questionForClient = currentQuestion ? {
      ...currentQuestion,
      // Include correct answer and explanation in review mode
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      documentationLinks: currentQuestion.documentationLinks
    } : null;

    res.json({
      success: true,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestion: questionForClient,
      userResponse: session.responses[session.currentQuestionIndex] || null
    });
  } catch (error) {
    console.error('Error navigating to question:', error);
    res.status(500).json({
      error: 'Failed to navigate to question'
    });
  }
});

/**
 * GET /api/exam-sessions/:sessionId/review
 * Get full exam review data (review mode only)
 */
router.get('/:sessionId/review', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!examEngine.isInReviewMode(sessionId)) {
      return res.status(400).json({
        error: 'Session is not in review mode'
      });
    }

    const session = examEngine.getExamSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Exam session not found'
      });
    }

    // In review mode, send all questions with answers and explanations
    const questionsWithAnswers = session.questions.map((question, index) => ({
      ...question,
      userResponse: session.responses[index] || null
    }));

    res.json({
      sessionId: session.id,
      examType: session.examType,
      totalQuestions: session.questions.length,
      timeRemaining: examEngine.getTimeRemaining(sessionId),
      questions: questionsWithAnswers,
      responses: session.responses
    });
  } catch (error) {
    console.error('Error getting exam review:', error);
    res.status(500).json({
      error: 'Failed to get exam review'
    });
  }
});

/**
 * DELETE /api/exam-sessions/:sessionId
 * End and cleanup exam session
 */
router.delete('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    examEngine.endSession(sessionId);

    res.json({
      success: true,
      message: 'Exam session ended successfully'
    });
  } catch (error) {
    console.error('Error ending exam session:', error);
    res.status(500).json({
      error: 'Failed to end exam session'
    });
  }
});

/**
 * GET /api/users/:userId/exam-sessions
 * Get all active exam sessions for a user
 */
router.get('/users/:userId/sessions', (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = examEngine.getUserActiveSessions(userId);

    const sessionsForClient = sessions.map(session => ({
      sessionId: session.id,
      examType: session.examType,
      totalQuestions: session.questions.length,
      currentQuestionIndex: session.currentQuestionIndex,
      timeRemaining: examEngine.getTimeRemaining(session.id),
      isCompleted: session.isCompleted,
      isPaused: session.isPaused,
      isInReviewMode: examEngine.isInReviewMode(session.id),
      startTime: session.startTime
    }));

    res.json({
      sessions: sessionsForClient
    });
  } catch (error) {
    console.error('Error getting user exam sessions:', error);
    res.status(500).json({
      error: 'Failed to get user exam sessions'
    });
  }
});

export default router;