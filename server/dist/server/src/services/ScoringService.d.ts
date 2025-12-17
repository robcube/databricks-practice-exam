import { ExamResult, Question, QuestionResponse, TopicScore, ExamTopic } from '../../../shared/types';
export interface FeedbackItem {
    questionId: string;
    questionText: string;
    selectedAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
    documentationLinks: string[];
    timeSpent: number;
    topic: ExamTopic;
}
export interface TimingAnalysis {
    totalTimeSpent: number;
    averageTimePerQuestion: number;
    fastestQuestion: {
        questionId: string;
        timeSpent: number;
    };
    slowestQuestion: {
        questionId: string;
        timeSpent: number;
    };
    timeByTopic: Array<{
        topic: ExamTopic;
        totalTime: number;
        averageTime: number;
        questionCount: number;
    }>;
    pacingAnalysis: {
        isWellPaced: boolean;
        rushingQuestions: string[];
        slowQuestions: string[];
        recommendations: string[];
    };
}
export interface ComprehensiveFeedback {
    examResult: ExamResult;
    overallScore: number;
    topicBreakdown: TopicScore[];
    questionFeedback: FeedbackItem[];
    timingAnalysis: TimingAnalysis;
    performanceInsights: {
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
    };
}
export declare class ScoringService {
    /**
     * Generate comprehensive feedback for a completed exam
     */
    generateComprehensiveFeedback(examResult: ExamResult, questions: Question[]): ComprehensiveFeedback;
    /**
     * Generate detailed feedback for each question
     */
    generateQuestionFeedback(responses: QuestionResponse[], questions: Question[]): FeedbackItem[];
    /**
     * Calculate comprehensive timing analysis
     */
    calculateTimingAnalysis(responses: QuestionResponse[], questions: Question[]): TimingAnalysis;
    /**
     * Analyze pacing patterns and provide recommendations
     */
    private analyzePacing;
    /**
     * Calculate time variance for pacing analysis
     */
    private calculateTimeVariance;
    /**
     * Generate performance insights and recommendations
     */
    generatePerformanceInsights(examResult: ExamResult, timingAnalysis: TimingAnalysis): {
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
    };
    /**
     * Calculate overall score percentage
     */
    calculateOverallScore(examResult: ExamResult): number;
    /**
     * Generate immediate feedback summary for quick review
     */
    generateImmediateFeedback(examResult: ExamResult): {
        score: number;
        passed: boolean;
        correctAnswers: number;
        totalQuestions: number;
        timeSpent: string;
        topPerformingTopic: string;
        weakestTopic: string;
    };
    /**
     * Validate exam result data before processing
     */
    validateExamResultForScoring(examResult: ExamResult): string[];
}
//# sourceMappingURL=ScoringService.d.ts.map