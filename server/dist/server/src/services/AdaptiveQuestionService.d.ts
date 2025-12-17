import { Question, ExamResult, ExamTopic, TopicTrend, StudyRecommendation } from '../../../shared/types';
export interface QuestionAllocation {
    topic: ExamTopic;
    questionCount: number;
    priority: 'high' | 'medium' | 'low';
    averageScore: number;
}
export interface AdaptiveExamConfig {
    totalQuestions: number;
    weakAreaThreshold: number;
    strongAreaThreshold: number;
    weakAreaAllocationPercentage: number;
    balancedDistribution: boolean;
}
export interface PerformanceAnalysisResult {
    weakAreas: ExamTopic[];
    strongAreas: ExamTopic[];
    topicScores: Map<ExamTopic, number>;
    hasExamHistory: boolean;
    recommendedAllocation: QuestionAllocation[];
}
export declare class AdaptiveQuestionService {
    private questionRepository;
    private defaultConfig;
    constructor();
    /**
     * Analyzes user performance to identify weak and strong areas
     * Implements Requirements 1.1, 3.3, 3.4
     */
    analyzeUserPerformance(examHistory: ExamResult[], config?: Partial<AdaptiveExamConfig>): Promise<PerformanceAnalysisResult>;
    /**
     * Generates adaptive question selection based on user performance
     * Implements Requirements 1.2, 1.5
     */
    generateAdaptiveQuestionSet(examHistory: ExamResult[], config?: Partial<AdaptiveExamConfig>): Promise<Question[]>;
    /**
     * Calculates performance trends over time
     * Implements Requirement 3.2
     */
    calculatePerformanceTrends(examHistory: ExamResult[]): TopicTrend[];
    /**
     * Generates study recommendations based on performance analysis
     * Implements Requirement 3.4
     */
    generateStudyRecommendations(performanceAnalysis: PerformanceAnalysisResult, trends: TopicTrend[]): StudyRecommendation[];
    /**
     * Checks if topic allocation should be reduced based on performance
     * Implements Requirement 3.3
     */
    shouldReduceTopicAllocation(topic: ExamTopic, examHistory: ExamResult[]): boolean;
    private getRecentResults;
    private calculateAverageTopicScores;
    private calculateQuestionAllocation;
    private generateBalancedQuestionSet;
    private generateWeightedQuestionSet;
    private getBalancedDistributionForNewUser;
    private getTopicScoreFromExam;
    private calculateTrendDirection;
    private getTopicSpecificFocusAreas;
    private selectRandomQuestions;
    private shuffleArray;
}
//# sourceMappingURL=AdaptiveQuestionService.d.ts.map