import { ExamResult, ExamTopic, PerformanceAnalytics } from '../../../shared/types';
export interface HistoricalPerformanceData {
    userId: string;
    examResults: ExamResult[];
    totalExamsTaken: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    totalTimeSpent: number;
    averageTimePerExam: number;
    createdAt: Date;
    lastUpdated: Date;
}
export interface TopicProgressData {
    topic: ExamTopic;
    examCount: number;
    scores: number[];
    dates: Date[];
    averageScore: number;
    bestScore: number;
    latestScore: number;
    trend: 'improving' | 'declining' | 'stable';
    improvementRate: number;
    timeSpentTotal: number;
    averageTimePerQuestion: number;
}
export interface ComprehensiveAssessmentConfig {
    totalQuestions: number;
    topicDistribution: Map<ExamTopic, number>;
    includeAllDifficulties: boolean;
    balanceBySubtopic: boolean;
}
export interface ImprovementPrioritization {
    topic: ExamTopic;
    priority: number;
    reasonForPriority: string;
    sessionsWithoutImprovement: number;
    lastImprovementDate?: Date;
    recommendedAction: string;
}
export declare class ProgressTrackingService {
    private adaptiveQuestionService;
    private historicalData;
    constructor();
    /**
     * Implements historical performance data storage
     * Requirement 3.1: Store historical performance data
     */
    storeHistoricalPerformanceData(userId: string, examResult: ExamResult): Promise<void>;
    /**
     * Retrieves historical performance data for a user
     * Requirement 3.1: Access stored historical performance data
     */
    getHistoricalPerformanceData(userId: string): Promise<HistoricalPerformanceData | null>;
    /**
     * Creates performance trend calculation algorithms
     * Requirement 3.2: Show performance trends for each topic over time
     */
    calculatePerformanceTrendsBasic(userId: string): Promise<TopicProgressData[]>;
    /**
     * Builds improvement-based topic prioritization
     * Requirement 3.4: Prioritize topics that have not improved in recent sessions
     */
    buildImprovementBasedPrioritization(userId: string, recentSessionCount?: number): Promise<ImprovementPrioritization[]>;
    /**
     * Adds comprehensive assessment mode with proportional coverage
     * Requirement 3.5: Generate comprehensive exam covering all topics proportionally
     */
    generateComprehensiveAssessmentConfig(totalQuestions?: number, customDistribution?: Map<ExamTopic, number>): Promise<ComprehensiveAssessmentConfig>;
    /**
     * Generates comprehensive performance analytics combining all tracking data
     */
    generateComprehensiveAnalytics(userId: string): Promise<PerformanceAnalytics>;
    private extractTopicDataFromHistory;
    private calculateTrendDirection;
    private calculateImprovementRate;
    private countSessionsWithoutImprovement;
    private findLastImprovementDate;
    /**
     * Calculate performance trends with additional parameters for analytics API
     */
    calculatePerformanceTrends(userId: string, timeframe?: string, topic?: ExamTopic, examType?: 'practice' | 'assessment'): Promise<any>;
    /**
     * Identify weak areas based on performance threshold
     */
    identifyWeakAreas(userId: string, threshold?: number): Promise<any>;
    /**
     * Get question bank coverage statistics
     */
    getQuestionBankCoverage(): Promise<any>;
}
//# sourceMappingURL=ProgressTrackingService.d.ts.map