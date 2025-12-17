import express from 'express';
import { ScoringService } from '../services/ScoringService';
import { QuestionService } from '../services/QuestionService';
import { ExamResult } from '../../../shared/types';

const router = express.Router();
const scoringService = new ScoringService();
const questionService = new QuestionService();

/**
 * POST /api/scoring/comprehensive-feedback
 * Generate comprehensive feedback for a completed exam
 */
router.post('/comprehensive-feedback', async (req, res) => {
  try {
    const { examResult } = req.body;

    if (!examResult) {
      return res.status(400).json({
        error: 'Exam result is required'
      });
    }

    // Validate exam result
    const validationErrors = scoringService.validateExamResultForScoring(examResult);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid exam result',
        details: validationErrors
      });
    }

    // Get questions for the exam
    const questionIds = examResult.questions.map((q: any) => q.questionId);
    const questions = await questionService.getQuestionsByIds(questionIds);

    if (questions.length !== questionIds.length) {
      return res.status(400).json({
        error: 'Some questions could not be found'
      });
    }

    // Generate comprehensive feedback
    const feedback = scoringService.generateComprehensiveFeedback(examResult, questions);

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error generating comprehensive feedback:', error);
    res.status(500).json({
      error: 'Failed to generate comprehensive feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/scoring/immediate-feedback
 * Generate immediate feedback summary for quick review
 */
router.post('/immediate-feedback', async (req, res) => {
  try {
    const { examResult } = req.body;

    if (!examResult) {
      return res.status(400).json({
        error: 'Exam result is required'
      });
    }

    // Validate exam result
    const validationErrors = scoringService.validateExamResultForScoring(examResult);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid exam result',
        details: validationErrors
      });
    }

    // Generate immediate feedback
    const feedback = scoringService.generateImmediateFeedback(examResult);

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error generating immediate feedback:', error);
    res.status(500).json({
      error: 'Failed to generate immediate feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/scoring/timing-analysis
 * Generate detailed timing analysis for an exam
 */
router.post('/timing-analysis', async (req, res) => {
  try {
    const { examResult } = req.body;

    if (!examResult) {
      return res.status(400).json({
        error: 'Exam result is required'
      });
    }

    // Get questions for the exam
    const questionIds = examResult.questions.map((q: any) => q.questionId);
    const questions = await questionService.getQuestionsByIds(questionIds);

    if (questions.length !== questionIds.length) {
      return res.status(400).json({
        error: 'Some questions could not be found'
      });
    }

    // Generate timing analysis
    const timingAnalysis = scoringService.calculateTimingAnalysis(examResult.questions, questions);

    res.json({
      success: true,
      data: timingAnalysis
    });

  } catch (error) {
    console.error('Error generating timing analysis:', error);
    res.status(500).json({
      error: 'Failed to generate timing analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/scoring/performance-insights
 * Generate performance insights and recommendations
 */
router.post('/performance-insights', async (req, res) => {
  try {
    const { examResult } = req.body;

    if (!examResult) {
      return res.status(400).json({
        error: 'Exam result is required'
      });
    }

    // Get questions for timing analysis
    const questionIds = examResult.questions.map((q: any) => q.questionId);
    const questions = await questionService.getQuestionsByIds(questionIds);

    // Generate timing analysis first
    const timingAnalysis = scoringService.calculateTimingAnalysis(examResult.questions, questions);
    
    // Generate performance insights
    const insights = scoringService.generatePerformanceInsights(examResult, timingAnalysis);

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Error generating performance insights:', error);
    res.status(500).json({
      error: 'Failed to generate performance insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/scoring/validate/:examResultId
 * Validate an exam result for scoring
 */
router.get('/validate/:examResultId', async (req, res) => {
  try {
    const { examResultId } = req.params;

    // In a real implementation, this would fetch the exam result from database
    // For now, we'll return a validation endpoint structure
    res.json({
      success: true,
      message: 'Validation endpoint - exam result would be fetched and validated here',
      examResultId
    });

  } catch (error) {
    console.error('Error validating exam result:', error);
    res.status(500).json({
      error: 'Failed to validate exam result',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;