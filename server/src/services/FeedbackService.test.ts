import { FeedbackService, FeedbackSubmissionRequest } from './FeedbackService';

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;

  beforeEach(() => {
    feedbackService = new FeedbackService();
  });

  describe('submitFeedback', () => {
    it('should successfully submit valid feedback', () => {
      const request: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'This question is confusing and needs better explanation.'
      };

      const feedback = feedbackService.submitFeedback(request);

      expect(feedback.id).toBeDefined();
      expect(feedback.questionId).toBe('q1');
      expect(feedback.userId).toBe('user1');
      expect(feedback.feedbackType).toBe('unclear');
      expect(feedback.message).toBe('This question is confusing and needs better explanation.');
      expect(feedback.createdAt).toBeInstanceOf(Date);
    });

    it('should trim whitespace from message', () => {
      const request: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'suggestion',
        message: '  This is a suggestion with extra spaces  '
      };

      const feedback = feedbackService.submitFeedback(request);
      expect(feedback.message).toBe('This is a suggestion with extra spaces');
    });

    it('should throw error for invalid feedback request', () => {
      const invalidRequest: FeedbackSubmissionRequest = {
        questionId: '',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'Short'
      };

      expect(() => {
        feedbackService.submitFeedback(invalidRequest);
      }).toThrow('Invalid feedback request');
    });

    it('should validate message length', () => {
      const shortMessageRequest: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'Short'
      };

      expect(() => {
        feedbackService.submitFeedback(shortMessageRequest);
      }).toThrow('Feedback message must be at least 10 characters long');

      const longMessageRequest: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'A'.repeat(1001)
      };

      expect(() => {
        feedbackService.submitFeedback(longMessageRequest);
      }).toThrow('Feedback message must be less than 1000 characters');
    });

    it('should validate feedback type', () => {
      const invalidTypeRequest: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'invalid' as any,
        message: 'This is a valid message length.'
      };

      expect(() => {
        feedbackService.submitFeedback(invalidTypeRequest);
      }).toThrow('Valid feedback type is required');
    });
  });

  describe('getQuestionFeedback', () => {
    it('should return feedback for a specific question', () => {
      const request: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'This question needs clarification.'
      };

      feedbackService.submitFeedback(request);
      const feedback = feedbackService.getQuestionFeedback('q1');

      expect(feedback).toHaveLength(1);
      expect(feedback[0].questionId).toBe('q1');
    });

    it('should return empty array for question with no feedback', () => {
      const feedback = feedbackService.getQuestionFeedback('nonexistent');
      expect(feedback).toHaveLength(0);
    });

    it('should throw error for empty question ID', () => {
      expect(() => {
        feedbackService.getQuestionFeedback('');
      }).toThrow('Question ID is required');
    });
  });

  describe('getUserFeedback', () => {
    it('should return all feedback submitted by a user', () => {
      const requests: FeedbackSubmissionRequest[] = [
        {
          questionId: 'q1',
          userId: 'user1',
          feedbackType: 'unclear',
          message: 'First feedback message.'
        },
        {
          questionId: 'q2',
          userId: 'user1',
          feedbackType: 'incorrect',
          message: 'Second feedback message.'
        },
        {
          questionId: 'q1',
          userId: 'user2',
          feedbackType: 'suggestion',
          message: 'Different user feedback.'
        }
      ];

      requests.forEach(request => feedbackService.submitFeedback(request));

      const user1Feedback = feedbackService.getUserFeedback('user1');
      expect(user1Feedback).toHaveLength(2);
      expect(user1Feedback.every(fb => fb.userId === 'user1')).toBe(true);

      const user2Feedback = feedbackService.getUserFeedback('user2');
      expect(user2Feedback).toHaveLength(1);
      expect(user2Feedback[0].userId).toBe('user2');
    });

    it('should return feedback sorted by creation date (newest first)', async () => {
      const request1: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'First feedback message.'
      };

      const request2: FeedbackSubmissionRequest = {
        questionId: 'q2',
        userId: 'user1',
        feedbackType: 'incorrect',
        message: 'Second feedback message.'
      };

      const feedback1 = feedbackService.submitFeedback(request1);
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const feedback2 = feedbackService.submitFeedback(request2);
      
      const userFeedback = feedbackService.getUserFeedback('user1');
      expect(userFeedback).toHaveLength(2);
      expect(userFeedback[0].createdAt.getTime()).toBeGreaterThanOrEqual(userFeedback[1].createdAt.getTime());
    });

    it('should throw error for empty user ID', () => {
      expect(() => {
        feedbackService.getUserFeedback('');
      }).toThrow('User ID is required');
    });
  });

  describe('getQuestionFeedbackAnalytics', () => {
    it('should calculate correct analytics for question feedback', () => {
      const requests: FeedbackSubmissionRequest[] = [
        {
          questionId: 'q1',
          userId: 'user1',
          feedbackType: 'unclear',
          message: 'This is confusing and unclear.'
        },
        {
          questionId: 'q1',
          userId: 'user2',
          feedbackType: 'unclear',
          message: 'Very confusing question.'
        },
        {
          questionId: 'q1',
          userId: 'user3',
          feedbackType: 'incorrect',
          message: 'The answer seems wrong.'
        }
      ];

      requests.forEach(request => feedbackService.submitFeedback(request));

      const analytics = feedbackService.getQuestionFeedbackAnalytics('q1');

      expect(analytics.questionId).toBe('q1');
      expect(analytics.totalFeedback).toBe(3);
      expect(analytics.feedbackByType.unclear).toBe(2);
      expect(analytics.feedbackByType.incorrect).toBe(1);
      expect(analytics.feedbackByType.outdated).toBe(0);
      expect(analytics.feedbackByType.suggestion).toBe(0);
      expect(analytics.commonIssues).toContain('confusing');
    });

    it('should return empty analytics for question with no feedback', () => {
      const analytics = feedbackService.getQuestionFeedbackAnalytics('nonexistent');

      expect(analytics.questionId).toBe('nonexistent');
      expect(analytics.totalFeedback).toBe(0);
      expect(analytics.feedbackByType.unclear).toBe(0);
      expect(analytics.commonIssues).toHaveLength(0);
    });
  });

  describe('getQuestionsNeedingAttention', () => {
    it('should identify questions with multiple incorrect feedback', () => {
      // Add multiple incorrect feedback for q1
      for (let i = 0; i < 4; i++) {
        feedbackService.submitFeedback({
          questionId: 'q1',
          userId: `user${i}`,
          feedbackType: 'incorrect',
          message: `This answer is wrong - feedback ${i}.`
        });
      }

      // Add some unclear feedback for q2 (but not enough to trigger threshold)
      feedbackService.submitFeedback({
        questionId: 'q2',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'This question is unclear.'
      });

      const questionsNeedingAttention = feedbackService.getQuestionsNeedingAttention(3);
      expect(questionsNeedingAttention).toContain('q1');
      expect(questionsNeedingAttention).not.toContain('q2');
    });

    it('should identify questions with multiple unclear feedback', () => {
      // Add multiple unclear feedback for q2
      for (let i = 0; i < 3; i++) {
        feedbackService.submitFeedback({
          questionId: 'q2',
          userId: `user${i}`,
          feedbackType: 'unclear',
          message: `This question is unclear - feedback ${i}.`
        });
      }

      const questionsNeedingAttention = feedbackService.getQuestionsNeedingAttention(3);
      expect(questionsNeedingAttention).toContain('q2');
    });
  });

  describe('deleteFeedback', () => {
    it('should allow user to delete their own feedback', () => {
      const request: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'This question needs clarification.'
      };

      const feedback = feedbackService.submitFeedback(request);
      const deleted = feedbackService.deleteFeedback(feedback.id, 'user1');

      expect(deleted).toBe(true);
      expect(feedbackService.getQuestionFeedback('q1')).toHaveLength(0);
    });

    it('should allow admin to delete any feedback', () => {
      const request: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'This question needs clarification.'
      };

      const feedback = feedbackService.submitFeedback(request);
      const deleted = feedbackService.deleteFeedback(feedback.id, 'admin', true);

      expect(deleted).toBe(true);
      expect(feedbackService.getQuestionFeedback('q1')).toHaveLength(0);
    });

    it('should not allow user to delete other users feedback', () => {
      const request: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'This question needs clarification.'
      };

      const feedback = feedbackService.submitFeedback(request);

      expect(() => {
        feedbackService.deleteFeedback(feedback.id, 'user2');
      }).toThrow('Unauthorized: Cannot delete feedback that belongs to another user');
    });

    it('should return false for non-existent feedback', () => {
      const deleted = feedbackService.deleteFeedback('nonexistent', 'user1');
      expect(deleted).toBe(false);
    });
  });

  describe('getOverallFeedbackStatistics', () => {
    it('should calculate correct overall statistics', () => {
      const requests: FeedbackSubmissionRequest[] = [
        {
          questionId: 'q1',
          userId: 'user1',
          feedbackType: 'unclear',
          message: 'This question is unclear.'
        },
        {
          questionId: 'q1',
          userId: 'user2',
          feedbackType: 'incorrect',
          message: 'Wrong answer provided.'
        },
        {
          questionId: 'q2',
          userId: 'user1',
          feedbackType: 'suggestion',
          message: 'Consider adding more examples.'
        }
      ];

      requests.forEach(request => feedbackService.submitFeedback(request));

      const stats = feedbackService.getOverallFeedbackStatistics();

      expect(stats.totalFeedback).toBe(3);
      expect(stats.feedbackByType.unclear).toBe(1);
      expect(stats.feedbackByType.incorrect).toBe(1);
      expect(stats.feedbackByType.suggestion).toBe(1);
      expect(stats.questionsWithFeedback).toBe(2);
      expect(stats.averageFeedbackPerQuestion).toBe(1.5);
    });

    it('should return zero statistics when no feedback exists', () => {
      const stats = feedbackService.getOverallFeedbackStatistics();

      expect(stats.totalFeedback).toBe(0);
      expect(stats.questionsWithFeedback).toBe(0);
      expect(stats.averageFeedbackPerQuestion).toBe(0);
    });
  });

  describe('updateFeedbackStatus', () => {
    it('should update feedback status successfully', () => {
      const request: FeedbackSubmissionRequest = {
        questionId: 'q1',
        userId: 'user1',
        feedbackType: 'unclear',
        message: 'This question needs clarification.'
      };

      const feedback = feedbackService.submitFeedback(request);
      const updated = feedbackService.updateFeedbackStatus(feedback.id, 'reviewed');

      expect(updated).toBe(true);
    });

    it('should return false for non-existent feedback', () => {
      const updated = feedbackService.updateFeedbackStatus('nonexistent', 'reviewed');
      expect(updated).toBe(false);
    });
  });
});