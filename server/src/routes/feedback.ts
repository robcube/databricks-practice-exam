import express from 'express';
import { FeedbackService, FeedbackSubmissionRequest } from '../services/FeedbackService';

const router = express.Router();
const feedbackService = new FeedbackService();

/**
 * POST /api/feedback
 * Submit feedback for a question
 */
router.post('/', async (req, res) => {
  try {
    const { questionId, userId, feedbackType, message } = req.body;

    const request: FeedbackSubmissionRequest = {
      questionId,
      userId,
      feedbackType,
      message
    };

    const feedback = feedbackService.submitFeedback(request);

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(400).json({
      error: 'Failed to submit feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/question/:questionId
 * Get all feedback for a specific question
 */
router.get('/question/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const feedback = feedbackService.getQuestionFeedback(questionId);

    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });

  } catch (error) {
    console.error('Error getting question feedback:', error);
    res.status(400).json({
      error: 'Failed to get question feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/user/:userId
 * Get all feedback submitted by a specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const feedback = feedbackService.getUserFeedback(userId);

    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });

  } catch (error) {
    console.error('Error getting user feedback:', error);
    res.status(400).json({
      error: 'Failed to get user feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/analytics/:questionId
 * Get feedback analytics for a specific question
 */
router.get('/analytics/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const analytics = feedbackService.getQuestionFeedbackAnalytics(questionId);

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({
      error: 'Failed to get feedback analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/attention
 * Get questions that need attention based on feedback
 */
router.get('/attention', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 3;
    const questionsNeedingAttention = feedbackService.getQuestionsNeedingAttention(threshold);

    res.json({
      success: true,
      data: questionsNeedingAttention,
      count: questionsNeedingAttention.length,
      threshold
    });

  } catch (error) {
    console.error('Error getting questions needing attention:', error);
    res.status(500).json({
      error: 'Failed to get questions needing attention',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/statistics
 * Get overall feedback statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const statistics = feedbackService.getOverallFeedbackStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error getting feedback statistics:', error);
    res.status(500).json({
      error: 'Failed to get feedback statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/feedback/:feedbackId/status
 * Update feedback status (admin only)
 */
router.put('/:feedbackId/status', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({
        error: 'Valid status is required (pending, reviewed, resolved)'
      });
    }

    const updated = feedbackService.updateFeedbackStatus(feedbackId, status);

    if (!updated) {
      return res.status(404).json({
        error: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback status updated successfully'
    });

  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({
      error: 'Failed to update feedback status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/feedback/:feedbackId
 * Delete feedback
 */
router.delete('/:feedbackId', async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { userId, isAdmin } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    const deleted = feedbackService.deleteFeedback(feedbackId, userId, isAdmin || false);

    if (!deleted) {
      return res.status(404).json({
        error: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      res.status(403).json({
        error: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete feedback',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

export default router;