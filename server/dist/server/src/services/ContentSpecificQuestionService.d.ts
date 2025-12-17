import { Question, ExamTopic } from '../../../shared/types';
export interface ContentCoverageValidation {
    topic: ExamTopic;
    requiredScenarios: string[];
    missingScenarios: string[];
    coveragePercentage: number;
    isValid: boolean;
}
export interface DifficultyDistribution {
    easy: number;
    medium: number;
    hard: number;
}
export declare class ContentSpecificQuestionService {
    private questionService;
    constructor();
    /**
     * Generate Production Pipelines questions with required scenarios
     */
    generateProductionPipelineQuestions(): Promise<Question[]>;
    /**
     * Generate Incremental Data Processing questions with required scenarios
     */
    generateIncrementalDataProcessingQuestions(): Promise<Question[]>;
    /**
     * Validate content coverage for topic-specific question sets
     */
    validateContentCoverage(topic: ExamTopic): Promise<ContentCoverageValidation>;
    /**
     * Generate questions with difficulty variation for study mode
     */
    generateQuestionsWithDifficultyVariation(topic: ExamTopic, totalQuestions: number, distribution?: DifficultyDistribution): Promise<Question[]>;
    /**
     * Get comprehensive content coverage report for all topics
     */
    getComprehensiveContentCoverageReport(): Promise<ContentCoverageValidation[]>;
    /**
     * Initialize question bank with content-specific questions
     */
    initializeContentSpecificQuestions(): Promise<{
        productionPipelineQuestions: Question[];
        incrementalProcessingQuestions: Question[];
        coverageReport: ContentCoverageValidation[];
    }>;
    private shuffleArray;
}
//# sourceMappingURL=ContentSpecificQuestionService.d.ts.map