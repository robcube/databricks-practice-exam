import { Question, ExamTopic, QuestionDifficulty } from '../../../shared/types';
export declare class QuestionModel implements Question {
    id: string;
    topic: ExamTopic;
    subtopic: string;
    difficulty: QuestionDifficulty;
    questionText: string;
    codeExample?: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    documentationLinks: string[];
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    constructor(data: Partial<Question>);
    private generateId;
    private validate;
    private isValidCodeSyntax;
    updateExplanation(explanation: string): void;
    addDocumentationLink(link: string): void;
    addTag(tag: string): void;
    private isValidUrl;
    toJSON(): Question;
}
export declare const validateQuestion: (questionData: Partial<Question>) => string[];
//# sourceMappingURL=Question.d.ts.map