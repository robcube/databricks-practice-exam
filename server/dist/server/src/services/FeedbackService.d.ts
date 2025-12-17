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
export declare class FeedbackService {
    private feedbackStorage;
    /**
     * Submit feedback for a question
     */
    submitFeedback(request: FeedbackSubmissionRequest): QuestionFeedback;
    /**
     * Get all feedback for a specific question
     */
    getQuestionFeedback(questionId: string): QuestionFeedback[];
    /**
     * Get feedback submitted by a specific user
     */
    getUserFeedback(userId: string): QuestionFeedback[];
    /**
     * Get feedback analytics for a question
     */
    getQuestionFeedbackAnalytics(questionId: string): FeedbackAnalytics;
    /**
     * Get questions that need attention based on feedback
     */
    getQuestionsNeedingAttention(threshold?: number): string[];
    /**
     * Update feedback status (for admin use)
     */
    updateFeedbackStatus(feedbackId: string, status: 'pending' | 'reviewed' | 'resolved'): boolean;
    /**
     * Delete feedback (for admin use or user's own feedback)
     */
    deleteFeedback(feedbackId: string, requestingUserId: string, isAdmin?: boolean): boolean;
    /**
     * Get feedback statistics across all questions
     */
    getOverallFeedbackStatistics(): {
        totalFeedback: number;
        feedbackByType: {
            [key: string]: number;
        };
        questionsWithFeedback: number;
        averageFeedbackPerQuestion: number;
    };
    private generateFeedbackId;
    private validateFeedbackRequest;
    private extractCommonIssues;
    /**
     * Clear all feedback (for testing purposes)
     */
    clearAllFeedback(): void;
    /**
     * Get total number of questions with feedback
     */
    getQuestionsWithFeedbackCount(): number;
}
//# sourceMappingURL=FeedbackService.d.ts.map