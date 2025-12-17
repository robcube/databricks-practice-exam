// Export all data models and validation functions
export { User, validateUser } from './User';
export { QuestionModel, validateQuestion } from './Question';
export { ExamResultModel, validateExamResult, validateTopicScore } from './ExamResult';

// Re-export shared types for convenience
export * from '../../../shared/types';