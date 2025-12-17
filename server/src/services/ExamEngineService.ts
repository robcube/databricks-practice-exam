import { ExamSession, Question, QuestionResponse, ExamType, ExamResult } from '../../../shared/types';
import { ExamResultModel } from '../models/ExamResult';

export interface ExamEngineConfig {
  timeLimit: number; // in seconds (default: 5400 = 90 minutes)
  autoSaveInterval: number; // in seconds (default: 30)
}

export interface ExamSessionState {
  session: ExamSession;
  timeRemaining: number;
  isActive: boolean;
  lastSaveTime: Date;
}

export class ExamEngineService {
  private activeSessions: Map<string, ExamSessionState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: ExamEngineConfig;

  constructor(config: Partial<ExamEngineConfig> = {}) {
    this.config = {
      timeLimit: config.timeLimit || 5400, // 90 minutes
      autoSaveInterval: config.autoSaveInterval || 30 // 30 seconds
    };
  }

  /**
   * Start a new exam session
   */
  public startExamSession(
    userId: string,
    examType: ExamType,
    questions: Question[]
  ): ExamSession {
    const sessionId = this.generateSessionId();
    const startTime = new Date();

    const session: ExamSession = {
      id: sessionId,
      userId,
      examType,
      questions,
      currentQuestionIndex: 0,
      responses: [],
      startTime,
      timeRemaining: this.config.timeLimit,
      isCompleted: false,
      isPaused: false
    };

    const sessionState: ExamSessionState = {
      session,
      timeRemaining: this.config.timeLimit,
      isActive: true,
      lastSaveTime: startTime
    };

    this.activeSessions.set(sessionId, sessionState);
    this.startTimer(sessionId);
    this.startAutoSave(sessionId);

    return session;
  }

  /**
   * Get current exam session
   */
  public getExamSession(sessionId: string): ExamSession | null {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      return null;
    }

    // Update time remaining based on elapsed time
    this.updateTimeRemaining(sessionId);
    return { ...sessionState.session };
  }

  /**
   * Submit an answer for the current question
   */
  public submitAnswer(
    sessionId: string,
    questionId: string,
    selectedAnswer: number
  ): boolean {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState || sessionState.session.isCompleted || sessionState.session.isPaused) {
      return false;
    }

    const session = sessionState.session;
    const currentQuestion = session.questions[session.currentQuestionIndex];
    
    if (!currentQuestion || currentQuestion.id !== questionId) {
      return false;
    }

    const response: QuestionResponse = {
      questionId,
      selectedAnswer,
      isCorrect: selectedAnswer === currentQuestion.correctAnswer,
      timeSpent: this.calculateQuestionTime(sessionState),
      answeredAt: new Date()
    };

    session.responses.push(response);
    session.currentQuestionIndex++;

    // Check if exam is completed
    if (session.currentQuestionIndex >= session.questions.length) {
      this.completeExam(sessionId);
    }

    this.saveSessionState(sessionId);
    return true;
  }

  /**
   * Navigate to a specific question (for review mode)
   */
  public navigateToQuestion(sessionId: string, questionIndex: number): boolean {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      return false;
    }

    const session = sessionState.session;
    
    // Only allow navigation in review mode (after completion or during early completion review)
    if (!session.isCompleted && session.currentQuestionIndex < session.questions.length) {
      return false;
    }

    if (questionIndex < 0 || questionIndex >= session.questions.length) {
      return false;
    }

    session.currentQuestionIndex = questionIndex;
    this.saveSessionState(sessionId);
    return true;
  }

  /**
   * Pause the exam session
   */
  public pauseExamSession(sessionId: string): boolean {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState || sessionState.session.isCompleted) {
      return false;
    }

    // Update time remaining before pausing
    this.updateTimeRemaining(sessionId);
    
    sessionState.session.isPaused = true;
    sessionState.isActive = false;

    // Clear timers but keep session state
    this.clearTimer(sessionId);
    this.clearAutoSaveTimer(sessionId);

    this.saveSessionState(sessionId);
    return true;
  }

  /**
   * Resume the exam session
   */
  public resumeExamSession(sessionId: string): boolean {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState || sessionState.session.isCompleted) {
      return false;
    }

    sessionState.session.isPaused = false;
    sessionState.isActive = true;
    sessionState.lastSaveTime = new Date();

    // Restart timers with remaining time
    this.startTimer(sessionId);
    this.startAutoSave(sessionId);

    this.saveSessionState(sessionId);
    return true;
  }

  /**
   * Complete the exam early (allows review mode)
   */
  public completeExamEarly(sessionId: string): ExamResult | null {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState || sessionState.session.isCompleted) {
      return null;
    }

    // Mark as completed but keep session active for review
    sessionState.session.isCompleted = true;
    
    // Stop the main timer but keep auto-save for review mode
    this.clearTimer(sessionId);

    const examResult = this.generateExamResult(sessionState.session);
    this.saveSessionState(sessionId);

    return examResult;
  }

  /**
   * Force complete exam (called by timer or manual submission)
   */
  public forceCompleteExam(sessionId: string): ExamResult | null {
    return this.completeExam(sessionId);
  }

  /**
   * Get time remaining for a session
   */
  public getTimeRemaining(sessionId: string): number {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      return 0;
    }

    this.updateTimeRemaining(sessionId);
    return Math.max(0, sessionState.timeRemaining);
  }

  /**
   * Check if session is in review mode
   */
  public isInReviewMode(sessionId: string): boolean {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      return false;
    }

    return sessionState.session.isCompleted && sessionState.timeRemaining > 0;
  }

  /**
   * End session and cleanup
   */
  public endSession(sessionId: string): void {
    this.clearTimer(sessionId);
    this.clearAutoSaveTimer(sessionId);
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  public getUserActiveSessions(userId: string): ExamSession[] {
    const userSessions: ExamSession[] = [];
    
    for (const [sessionId, sessionState] of this.activeSessions) {
      if (sessionState.session.userId === userId) {
        this.updateTimeRemaining(sessionId);
        userSessions.push({ ...sessionState.session });
      }
    }

    return userSessions;
  }

  // Private methods

  private generateSessionId(): string {
    return `exam_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startTimer(sessionId: string): void {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState || sessionState.session.isCompleted) {
      return;
    }

    // Clear existing timer
    this.clearTimer(sessionId);

    // Set timer for remaining time
    const timer = setTimeout(() => {
      this.handleTimeExpiry(sessionId);
    }, sessionState.timeRemaining * 1000);

    this.timers.set(sessionId, timer);
  }

  private clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }

  private startAutoSave(sessionId: string): void {
    const autoSaveTimer = setInterval(() => {
      this.saveSessionState(sessionId);
    }, this.config.autoSaveInterval * 1000);

    this.autoSaveTimers.set(sessionId, autoSaveTimer);
  }

  private clearAutoSaveTimer(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  private updateTimeRemaining(sessionId: string): void {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState || !sessionState.isActive || sessionState.session.isPaused || sessionState.session.isCompleted) {
      return;
    }

    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - sessionState.lastSaveTime.getTime()) / 1000);
    
    sessionState.timeRemaining = Math.max(0, sessionState.timeRemaining - elapsedSeconds);
    sessionState.session.timeRemaining = sessionState.timeRemaining;
    sessionState.lastSaveTime = now;

    // Auto-complete if time runs out
    if (sessionState.timeRemaining <= 0 && !sessionState.session.isCompleted) {
      this.handleTimeExpiry(sessionId);
    }
  }

  private handleTimeExpiry(sessionId: string): void {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      return;
    }

    // Force complete the exam
    this.completeExam(sessionId);
  }

  private completeExam(sessionId: string): ExamResult | null {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      return null;
    }

    sessionState.session.isCompleted = true;
    sessionState.isActive = false;

    // Clear timers
    this.clearTimer(sessionId);
    this.clearAutoSaveTimer(sessionId);

    const examResult = this.generateExamResult(sessionState.session);
    this.saveSessionState(sessionId);

    return examResult;
  }

  private generateExamResult(session: ExamSession): ExamResult {
    const endTime = new Date();
    // Ensure endTime is at least 1 second after startTime to avoid validation errors
    if (endTime.getTime() <= session.startTime.getTime()) {
      endTime.setTime(session.startTime.getTime() + 1000);
    }
    
    const timeSpent = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);
    
    // Create responses for all questions, filling in unanswered ones
    const allResponses: QuestionResponse[] = [];
    for (let i = 0; i < session.questions.length; i++) {
      const existingResponse = session.responses[i];
      if (existingResponse) {
        allResponses.push(existingResponse);
      } else {
        // Create a default response for unanswered questions
        allResponses.push({
          questionId: session.questions[i].id,
          selectedAnswer: -1, // Indicates no answer selected
          isCorrect: false,
          timeSpent: 0,
          answeredAt: endTime
        });
      }
    }
    
    const examResultData = {
      userId: session.userId,
      examType: session.examType,
      startTime: session.startTime,
      endTime: endTime,
      totalQuestions: session.questions.length,
      correctAnswers: session.responses.filter(r => r.isCorrect).length,
      topicBreakdown: this.calculateTopicBreakdown(session),
      timeSpent: timeSpent,
      questions: allResponses
    };

    return new ExamResultModel(examResultData).toJSON();
  }

  private calculateTopicBreakdown(session: ExamSession) {
    const topicMap = new Map();
    
    session.questions.forEach((question, index) => {
      const response = session.responses[index];
      const topic = question.topic;
      
      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          topic,
          totalQuestions: 0,
          correctAnswers: 0,
          totalTime: 0
        });
      }
      
      const topicData = topicMap.get(topic);
      topicData.totalQuestions++;
      
      // Only count time and correctness if there's a response
      if (response) {
        topicData.totalTime += response.timeSpent || 0;
        if (response.isCorrect) {
          topicData.correctAnswers++;
        }
      }
    });

    return Array.from(topicMap.values()).map(topic => ({
      ...topic,
      percentage: topic.totalQuestions > 0 ? Math.round((topic.correctAnswers / topic.totalQuestions) * 100) : 0,
      averageTime: topic.totalQuestions > 0 ? Math.round(topic.totalTime / topic.totalQuestions) : 0
    }));
  }

  private calculateQuestionTime(sessionState: ExamSessionState): number {
    // Calculate time spent on current question
    const now = new Date();
    const questionStartTime = sessionState.lastSaveTime;
    return Math.floor((now.getTime() - questionStartTime.getTime()) / 1000);
  }

  private saveSessionState(sessionId: string): void {
    // In a real implementation, this would save to database
    // For now, we just update the in-memory state
    const sessionState = this.activeSessions.get(sessionId);
    if (sessionState) {
      sessionState.lastSaveTime = new Date();
    }
  }
}