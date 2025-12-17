import { ExamSession, Question, ExamType, ExamResult } from '../../../shared/types';
export interface ExamEngineConfig {
    timeLimit: number;
    autoSaveInterval: number;
}
export interface ExamSessionState {
    session: ExamSession;
    timeRemaining: number;
    isActive: boolean;
    lastSaveTime: Date;
}
export declare class ExamEngineService {
    private activeSessions;
    private timers;
    private autoSaveTimers;
    private config;
    constructor(config?: Partial<ExamEngineConfig>);
    /**
     * Start a new exam session
     */
    startExamSession(userId: string, examType: ExamType, questions: Question[]): ExamSession;
    /**
     * Get current exam session
     */
    getExamSession(sessionId: string): ExamSession | null;
    /**
     * Submit an answer for the current question
     */
    submitAnswer(sessionId: string, questionId: string, selectedAnswer: number): boolean;
    /**
     * Navigate to a specific question (for review mode)
     */
    navigateToQuestion(sessionId: string, questionIndex: number): boolean;
    /**
     * Pause the exam session
     */
    pauseExamSession(sessionId: string): boolean;
    /**
     * Resume the exam session
     */
    resumeExamSession(sessionId: string): boolean;
    /**
     * Complete the exam early (allows review mode)
     */
    completeExamEarly(sessionId: string): ExamResult | null;
    /**
     * Force complete exam (called by timer or manual submission)
     */
    forceCompleteExam(sessionId: string): ExamResult | null;
    /**
     * Get time remaining for a session
     */
    getTimeRemaining(sessionId: string): number;
    /**
     * Check if session is in review mode
     */
    isInReviewMode(sessionId: string): boolean;
    /**
     * End session and cleanup
     */
    endSession(sessionId: string): void;
    /**
     * Get all active sessions for a user
     */
    getUserActiveSessions(userId: string): ExamSession[];
    private generateSessionId;
    private startTimer;
    private clearTimer;
    private startAutoSave;
    private clearAutoSaveTimer;
    private updateTimeRemaining;
    private handleTimeExpiry;
    private completeExam;
    private generateExamResult;
    private calculateTopicBreakdown;
    private calculateQuestionTime;
    private saveSessionState;
}
//# sourceMappingURL=ExamEngineService.d.ts.map