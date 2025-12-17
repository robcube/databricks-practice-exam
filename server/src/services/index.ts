// Export all service classes and interfaces
export { QuestionService } from './QuestionService';
export { AdaptiveQuestionService } from './AdaptiveQuestionService';
export { ExamGenerationService } from './ExamGenerationService';
export { ScoringService } from './ScoringService';
export { FeedbackService } from './FeedbackService';
export { ProgressTrackingService } from './ProgressTrackingService';
export { ContentSpecificQuestionService } from './ContentSpecificQuestionService';

// Export service interfaces and types
export type { 
  QuestionCreateRequest, 
  QuestionUpdateRequest, 
  QuestionSearchResult 
} from './QuestionService';

export type { 
  QuestionAllocation, 
  AdaptiveExamConfig, 
  PerformanceAnalysisResult 
} from './AdaptiveQuestionService';

export type { 
  ExamGenerationRequest, 
  ExamGenerationResult 
} from './ExamGenerationService';

export type {
  FeedbackItem,
  TimingAnalysis,
  ComprehensiveFeedback
} from './ScoringService';

export type {
  FeedbackSubmissionRequest,
  FeedbackAnalytics
} from './FeedbackService';

export type {
  HistoricalPerformanceData,
  TopicProgressData,
  ComprehensiveAssessmentConfig,
  ImprovementPrioritization
} from './ProgressTrackingService';

export type {
  ContentCoverageValidation,
  DifficultyDistribution
} from './ContentSpecificQuestionService';