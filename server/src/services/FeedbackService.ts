import { QuestionFeedback } from '../../../shared/types';

export interface FeedbackSubmissionRequest {
  questionId: string;
  userId: string;
  feedbackType: 'incorrect' | 'unclear' | 'outdated' | 'suggestion';
  message: string;
}

export interface FeedbackAnalytics {
  questionId: string;
  totalFeedback: number;
  feedbackByType: {
    incorrect: number;
    unclear: number;
    outdated: number;
    suggestion: number;
  };
  averageRating?: number;
  commonIssues: string[];
}

export class FeedbackService {
  private feedbackStorage: Map<string, QuestionFeedback[]> = new Map();

  /**
   * Submit feedback for a question
   */
  public submitFeedback(request: FeedbackSubmissionRequest): QuestionFeedback {
    // Validate the request
    const validationErrors = this.validateFeedbackRequest(request);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid feedback request: ${validationErrors.join(', ')}`);
    }

    const feedback: QuestionFeedback = {
      id: this.generateFeedbackId(),
      questionId: request.questionId,
      userId: request.userId,
      feedbackType: request.feedbackType,
      message: request.message.trim(),
      createdAt: new Date()
    };

    // Store feedback (in real implementation, this would be saved to database)
    if (!this.feedbackStorage.has(request.questionId)) {
      this.feedbackStorage.set(request.questionId, []);
    }
    
    this.feedbackStorage.get(request.questionId)!.push(feedback);

    return feedback;
  }

  /**
   * Get all feedback for a specific question
   */
  public getQuestionFeedback(questionId: string): QuestionFeedback[] {
    if (!questionId || questionId.trim().length === 0) {
      throw new Error('Question ID is required');
    }

    return this.feedbackStorage.get(questionId) || [];
  }

  /**
   * Get feedback submitted by a specific user
   */
  public getUserFeedback(userId: string): QuestionFeedback[] {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    const allFeedback: QuestionFeedback[] = [];
    
    for (const feedbackList of this.feedbackStorage.values()) {
      const userFeedback = feedbackList.filter(feedback => feedback.userId === userId);
      allFeedback.push(...userFeedback);
    }

    return allFeedback.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get feedback analytics for a question
   */
  public getQuestionFeedbackAnalytics(questionId: string): FeedbackAnalytics {
    const feedback = this.getQuestionFeedback(questionId);
    
    const analytics: FeedbackAnalytics = {
      questionId,
      totalFeedback: feedback.length,
      feedbackByType: {
        incorrect: 0,
        unclear: 0,
        outdated: 0,
        suggestion: 0
      },
      commonIssues: []
    };

    // Count feedback by type
    feedback.forEach(fb => {
      analytics.feedbackByType[fb.feedbackType]++;
    });

    // Identify common issues (simplified - in real implementation would use NLP)
    const messages = feedback.map(fb => fb.message.toLowerCase());
    const commonWords = this.extractCommonIssues(messages);
    analytics.commonIssues = commonWords;

    return analytics;
  }

  /**
   * Get questions that need attention based on feedback
   */
  public getQuestionsNeedingAttention(threshold: number = 3): string[] {
    const questionsNeedingAttention: string[] = [];

    for (const [questionId, feedbackList] of this.feedbackStorage) {
      const incorrectFeedback = feedbackList.filter(fb => fb.feedbackType === 'incorrect').length;
      const unclearFeedback = feedbackList.filter(fb => fb.feedbackType === 'unclear').length;
      
      // Question needs attention if it has multiple incorrect or unclear feedback
      if (incorrectFeedback >= threshold || unclearFeedback >= threshold) {
        questionsNeedingAttention.push(questionId);
      }
    }

    return questionsNeedingAttention;
  }

  /**
   * Update feedback status (for admin use)
   */
  public updateFeedbackStatus(feedbackId: string, status: 'pending' | 'reviewed' | 'resolved'): boolean {
    for (const feedbackList of this.feedbackStorage.values()) {
      const feedback = feedbackList.find(fb => fb.id === feedbackId);
      if (feedback) {
        // In a real implementation, this would update the database
        // For now, we'll just return true to indicate success
        return true;
      }
    }
    return false;
  }

  /**
   * Delete feedback (for admin use or user's own feedback)
   */
  public deleteFeedback(feedbackId: string, requestingUserId: string, isAdmin: boolean = false): boolean {
    for (const [questionId, feedbackList] of this.feedbackStorage) {
      const feedbackIndex = feedbackList.findIndex(fb => fb.id === feedbackId);
      
      if (feedbackIndex !== -1) {
        const feedback = feedbackList[feedbackIndex];
        
        // Only allow deletion if user owns the feedback or is admin
        if (feedback.userId === requestingUserId || isAdmin) {
          feedbackList.splice(feedbackIndex, 1);
          return true;
        } else {
          throw new Error('Unauthorized: Cannot delete feedback that belongs to another user');
        }
      }
    }
    
    return false;
  }

  /**
   * Get feedback statistics across all questions
   */
  public getOverallFeedbackStatistics(): {
    totalFeedback: number;
    feedbackByType: { [key: string]: number };
    questionsWithFeedback: number;
    averageFeedbackPerQuestion: number;
  } {
    let totalFeedback = 0;
    const feedbackByType: { [key: string]: number } = {
      incorrect: 0,
      unclear: 0,
      outdated: 0,
      suggestion: 0
    };

    for (const feedbackList of this.feedbackStorage.values()) {
      totalFeedback += feedbackList.length;
      
      feedbackList.forEach(feedback => {
        feedbackByType[feedback.feedbackType]++;
      });
    }

    const questionsWithFeedback = this.feedbackStorage.size;
    const averageFeedbackPerQuestion = questionsWithFeedback > 0 ? 
      Math.round((totalFeedback / questionsWithFeedback) * 100) / 100 : 0;

    return {
      totalFeedback,
      feedbackByType,
      questionsWithFeedback,
      averageFeedbackPerQuestion
    };
  }

  // Private helper methods

  private generateFeedbackId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateFeedbackRequest(request: FeedbackSubmissionRequest): string[] {
    const errors: string[] = [];

    if (!request.questionId || request.questionId.trim().length === 0) {
      errors.push('Question ID is required');
    }

    if (!request.userId || request.userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    const validFeedbackTypes = ['incorrect', 'unclear', 'outdated', 'suggestion'];
    if (!request.feedbackType || !validFeedbackTypes.includes(request.feedbackType)) {
      errors.push('Valid feedback type is required (incorrect, unclear, outdated, suggestion)');
    }

    if (!request.message || request.message.trim().length === 0) {
      errors.push('Feedback message is required');
    } else if (request.message.trim().length < 10) {
      errors.push('Feedback message must be at least 10 characters long');
    } else if (request.message.trim().length > 1000) {
      errors.push('Feedback message must be less than 1000 characters');
    }

    return errors;
  }

  private extractCommonIssues(messages: string[]): string[] {
    if (messages.length === 0) return [];

    // Simple keyword extraction (in real implementation would use more sophisticated NLP)
    const commonKeywords = [
      'confusing', 'unclear', 'wrong', 'incorrect', 'outdated', 'missing',
      'typo', 'error', 'explanation', 'documentation', 'example', 'code'
    ];

    const issueCount: { [key: string]: number } = {};
    
    messages.forEach(message => {
      commonKeywords.forEach(keyword => {
        if (message.includes(keyword)) {
          issueCount[keyword] = (issueCount[keyword] || 0) + 1;
        }
      });
    });

    // Return keywords that appear in at least 20% of messages
    const threshold = Math.max(1, Math.floor(messages.length * 0.2));
    return Object.entries(issueCount)
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .map(([keyword, _]) => keyword)
      .slice(0, 5); // Top 5 issues
  }

  /**
   * Clear all feedback (for testing purposes)
   */
  public clearAllFeedback(): void {
    this.feedbackStorage.clear();
  }

  /**
   * Get total number of questions with feedback
   */
  public getQuestionsWithFeedbackCount(): number {
    return this.feedbackStorage.size;
  }
}