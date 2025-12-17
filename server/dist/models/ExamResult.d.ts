import { ExamResult, ExamType, TopicScore, QuestionResponse, ExamTopic } from '../../../shared/types';
export declare class ExamResultModel implements ExamResult {
    id: string;
    userId: string;
    examType: ExamType;
    startTime: Date;
    endTime: Date;
    totalQuestions: number;
    correctAnswers: number;
    topicBreakdown: TopicScore[];
    timeSpent: number;
    questions: QuestionResponse[];
    constructor(data: Partial<ExamResult>);
    private generateId;
    private validate;
    calculateTopicBreakdown(): TopicScore[];
    getOverallScore(): number;
    getAverageTimePerQuestion(): number;
    getWeakTopics(threshold?: number): ExamTopic[];
    getStrongTopics(threshold?: number): ExamTopic[];
    updateEndTime(): void;
    toJSON(): ExamResult;
}
export declare const validateExamResult: (examData: Partial<ExamResult>) => string[];
export declare const validateTopicScore: (topicScore: Partial<TopicScore>) => string[];
//# sourceMappingURL=ExamResult.d.ts.map