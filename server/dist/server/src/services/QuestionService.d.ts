import { Question, ExamTopic, QuestionDifficulty, ExamType } from '../../../shared/types';
import { QuestionSearchFilters } from '../repositories/QuestionRepository';
export interface QuestionCreateRequest {
    topic: ExamTopic;
    subtopic: string;
    difficulty: QuestionDifficulty;
    questionText: string;
    codeExample?: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    documentationLinks?: string[];
    tags?: string[];
}
export interface QuestionUpdateRequest {
    topic?: ExamTopic;
    subtopic?: string;
    difficulty?: QuestionDifficulty;
    questionText?: string;
    codeExample?: string;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
    documentationLinks?: string[];
    tags?: string[];
}
export interface QuestionSearchResult {
    questions: Question[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export declare class QuestionService {
    private questionRepository;
    constructor();
    createQuestion(questionData: QuestionCreateRequest): Promise<Question>;
    getQuestionById(id: string): Promise<Question | null>;
    getQuestionsByIds(ids: string[]): Promise<Question[]>;
    updateQuestion(id: string, updateData: QuestionUpdateRequest): Promise<Question | null>;
    deleteQuestion(id: string): Promise<boolean>;
    searchQuestions(filters?: QuestionSearchFilters, page?: number, pageSize?: number): Promise<QuestionSearchResult>;
    getQuestionsByTopic(topic: ExamTopic, limit?: number): Promise<Question[]>;
    getQuestionsByDifficulty(difficulty: QuestionDifficulty, limit?: number): Promise<Question[]>;
    getQuestionsWithCodeExamples(limit?: number): Promise<Question[]>;
    getQuestionsByTags(tags: string[], limit?: number): Promise<Question[]>;
    getQuestionsForExam(examType: ExamType, questionCount?: number): Promise<Question[]>;
    getTopicStatistics(): Promise<{
        [topic: string]: {
            total: number;
            byDifficulty: {
                [difficulty: string]: number;
            };
        };
    }>;
    validateQuestionBank(): Promise<{
        isValid: boolean;
        issues: string[];
    }>;
    private validateTopicSpecificRequirements;
    private hasValidationCriticalFields;
    private shuffleArray;
}
//# sourceMappingURL=QuestionService.d.ts.map