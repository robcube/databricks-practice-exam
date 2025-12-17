import { ExamResult, ExamSession, ExamType, ExamTopic, PerformanceAnalytics, StudyRecommendation } from '../../../shared/types';
export interface ExamGenerationRequest {
    userId: string;
    examType: ExamType;
    totalQuestions?: number;
    focusTopics?: ExamTopic[];
    difficulty?: 'mixed' | 'easy' | 'medium' | 'hard';
    useAdaptiveSelection?: boolean;
}
export interface ExamGenerationResult {
    examSession: ExamSession;
    performanceAnalysis?: PerformanceAnalytics;
    studyRecommendations?: StudyRecommendation[];
}
export declare class ExamGenerationService {
    private adaptiveQuestionService;
    private questionService;
    constructor();
    /**
     * Generates a new exam session based on user performance and preferences
     * Implements Requirements 1.1, 1.2, 1.5
     */
    generateExam(request: ExamGenerationRequest, userExamHistory: ExamResult[]): Promise<ExamGenerationResult>;
    /**
     * Analyzes user performance and provides recommendations
     * Implements Requirements 3.1, 3.2, 3.4
     */
    analyzePerformance(userId: string, examHistory: ExamResult[]): Promise<PerformanceAnalytics>;
    /**
     * Checks if a topic should have reduced allocation in future exams
     * Implements Requirement 3.3
     */
    shouldReduceTopicAllocation(topic: ExamTopic, examHistory: ExamResult[]): Promise<boolean>;
    /**
     * Generates study recommendations for improvement
     * Implements Requirement 3.4
     */
    generateStudyPlan(userId: string, examHistory: ExamResult[]): Promise<StudyRecommendation[]>;
    /**
     * Validates that the question bank supports adaptive learning requirements
     */
    validateAdaptiveCapabilities(): Promise<{
        isValid: boolean;
        issues: string[];
    }>;
    private generateStandardQuestionSet;
    private generateProportionalQuestionSet;
    private generateBalancedQuestionSet;
    private filterQuestionsByTopics;
    private filterQuestionsByDifficulty;
    private calculateOverallProgress;
    private selectRandomQuestions;
    private shuffleArray;
    private generateSessionId;
}
//# sourceMappingURL=ExamGenerationService.d.ts.map